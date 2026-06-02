import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRouter } from './router.js';
import { mapLinks } from './maplinks.js';
import {
    normalizeShortcode, isValidShortcode, isBlocklisted,
    generateAvailableShortcode,
} from './shortcode.js';

const UNCONFIRMED_TTL_SEC = 72 * 60 * 60; // 72 hours

// Default web/ lives next to server/ at the repo root.
const DEFAULT_WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web');

const STATIC_FILES = new Map([
    ['/',            { file: 'index.html', type: 'text/html; charset=utf-8' }],
    ['/logo.png',    { file: 'logo.png',   type: 'image/png' }],
    ['/og.png',      { file: 'og.png',     type: 'image/png' }],
    ['/favicon.svg', { file: 'favicon.svg', type: 'image/svg+xml' }],
    ['/favicon.ico', { file: 'favicon.svg', type: 'image/svg+xml' }],
    ['/robots.txt',  { file: 'robots.txt',  type: 'text/plain; charset=utf-8' }],
    ['/llms.txt',    { file: 'llms.txt',    type: 'text/plain; charset=utf-8' }],
    ['/sitemap.xml', { file: 'sitemap.xml', type: 'application/xml; charset=utf-8' }],
]);

// Build an http.Server given the wired modules. Pure construction —
// the caller decides when to listen() and on which port. This shape
// lets integration tests spin up an ephemeral server per test.
export function createServer({ db, crypto, limiters, mailer, auth, baseUrl = '', webDir = DEFAULT_WEB_DIR, now = () => Date.now(), capture = () => {} }) {
    const router = createRouter();

    // Resolve the requesting session's handle and, as a side effect,
    // promote any pins still flagged 'unconfirmed' that this handle
    // owns. The promotion is the integration's binding mechanism for
    // pin-creation magic links: clicking the confirmation link sets a
    // session cookie, the next authenticated request walks through here,
    // and the pending pin flips to confirmed. The UPDATE is indexed and
    // idempotent (zero rows when the user has nothing pending), so the
    // overhead on hot management endpoints is negligible. Returns the
    // handle string, or null if the request isn't authenticated.
    function maybePromotePending(req) {
        if (!auth) return null;
        const handle = auth.handleFromRequest(req);
        if (!handle) return null;
        db.confirmPinsByOwner(handle, Math.floor(now() / 1000));
        return handle;
    }

    // ─── Routes ────────────────────────────────────────────────────────────────

    router.get('/api/health', (_req, _params, _body) => json(200, { ok: true }));

    // Static assets — must be registered before the catch-all /:shortcode below.
    for (const [route, asset] of STATIC_FILES) {
        router.get(route, () => serveStatic(webDir, asset.file, asset.type));
    }

    // Map-app logos (web/maplogos/<file>). Filename whitelist prevents path
    // traversal and rules out unexpected asset types.
    const LOGO_TYPES = { png: 'image/png', ico: 'image/x-icon', svg: 'image/svg+xml' };
    router.get('/maplogos/:filename', (_req, params) => {
        const f = params.filename;
        const m = /^([a-z0-9]+)\.(png|ico|svg)$/i.exec(f);
        if (!m) return text(404, 'not found');
        return serveStatic(path.join(webDir, 'maplogos'), f, LOGO_TYPES[m[2].toLowerCase()]);
    });

    router.post('/api/pins', async (req, _params, body) => {
        if (!limiters.create.take(clientIp(req))) {
            return json(429, { error: 'rate_limited' });
        }
        const { lat, lng, shortcode: requested, email } = body || {};
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            !Number.isFinite(lat) || !Number.isFinite(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return json(400, { error: 'invalid_coords' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return json(400, { error: 'invalid_email' });
        }

        let shortcode;
        if (requested != null) {
            shortcode = normalizeShortcode(requested);
            if (!isValidShortcode(shortcode)) return json(400, { error: 'invalid_shortcode' });
            if (isBlocklisted(shortcode)) return json(409, { error: 'shortcode_reserved' });
            if (!db.isShortcodeAvailable(shortcode)) return json(409, { error: 'shortcode_taken' });
        } else {
            try {
                shortcode = generateAvailableShortcode((c) => db.isShortcodeAvailable(c));
            } catch {
                return json(503, { error: 'shortcode_pool_unavailable' });
            }
        }

        // knowless rejects emails that fail its strict ASCII regex. Mirror
        // the same gate so we don't insert a pin we can't email about.
        // Both auth.deriveHandle (v0.1.9+) and auth.startLogin call
        // normalize() internally — pass the raw email and let knowless own
        // the canonical form.
        let ownerHandle;
        try {
            ownerHandle = auth.deriveHandle(email);
        } catch {
            return json(400, { error: 'invalid_email' });
        }

        const { ciphertext, iv } = crypto.encryptCoords(lat, lng);
        // Encrypted owner email is stored ONLY during the 72h unconfirmed
        // window so the expiry worker can send a 48h reminder. On confirm
        // (see db.confirmPin / confirmPinsByOwner) it's nulled out —
        // confirmed pins never hold reversible PII.
        const emailEnc = crypto.encryptEmail(email);
        const nowSec = Math.floor(now() / 1000);

        db.insertPin({
            shortcode, ciphertext, iv, ownerHandle,
            emailCiphertext: emailEnc.ciphertext,
            emailIv: emailEnc.iv,
            status: 'unconfirmed',
            createdAt: nowSec,
            expiresAt: nowSec + UNCONFIRMED_TTL_SEC,
        });

        // Fire the confirmation magic link via knowless. Click → /auth/callback
        // → cookie set → redirect to /SHORTCODE?confirmed=1. /manage's
        // promotion sweep then flips the pending pin to confirmed when the
        // user navigates there. Failure here is logged but does NOT fail
        // the request — the pin exists, dies in 72h if never confirmed
        // (recovery via resend@ inbound flow).
        const nextUrl = `${effectiveBaseUrl(req, baseUrl)}/${shortcode}?confirmed=1`;
        auth.startLogin({
            email,
            nextUrl,
            sourceIp: clientIp(req),
            subjectOverride: `Confirm your addypin: ${shortcode}`,
            // AF-26: phrase the body to match the subject. Without this, the
            // recipient sees "Click to sign in:" under a "Confirm your addypin"
            // subject — link works, body reads as cut off.
            bodyOverride: ({ url }) =>
                `Confirm your addypin "${shortcode}":\n\n` +
                `${url}\n\n` +
                `This link expires in 15 minutes. If you didn't request this,\n` +
                `ignore this email - the pin will auto-delete in 72 hours.\n`,
        }).catch((err) => {
            console.error(`[auth] startLogin failed for ${shortcode}: ${err.message}`);
            capture(err, { where: 'auth-startlogin-confirm', shortcode });
        });

        return json(201, { shortcode });
    });

    router.get('/api/pins/:shortcode', (req, params) => {
        if (!limiters.lookup.take(clientIp(req))) {
            return json(429, { error: 'rate_limited' });
        }
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin) return json(404, { error: 'not_found' });
        const { lat, lng } = crypto.decryptCoords(pin.ciphertext, pin.iv);
        return json(200, { lat, lng, mapLinks: mapLinks(lat, lng) });
    });

    // ─── M7: login + manage ────────────────────────────────────────────────

    // Always returns 202 — no email enumeration. If the submitted email
    // actually owns at least one confirmed pin, a magic link is emailed
    // via knowless. Rate-limited per derived handle (3/hr) so the login
    // endpoint can't be weaponized for targeted email probing.
    router.post('/api/login', async (_req, _params, body) => {
        const email = body?.email;
        if (typeof email !== 'string' || !email.includes('@')) {
            return json(400, { error: 'invalid_email' });
        }
        let handle;
        try {
            handle = auth.deriveHandle(email);
        } catch {
            return json(202, {}); // knowless's strict normalize; treat as silent miss
        }
        if (limiters.login && !limiters.login.take(handle)) {
            return json(202, {}); // silent rate-limit
        }
        const pins = db.listPinsByOwner(handle);
        if (pins.length === 0) return json(202, {}); // silent no-op
        auth.startLogin({
            email,
            nextUrl: `${effectiveBaseUrl(_req, baseUrl)}/manage`,
            sourceIp: clientIp(_req),
        }).catch((err) => {
            console.error(`[auth] startLogin failed: ${err.message}`);
            capture(err, { where: 'auth-startlogin' });
        });
        return json(202, {});
    });

    // /manage is the owner-facing entry point. Two modes:
    //   - with cookie   → promote any pending pins owned by the session
    //                     handle, serve manage.html
    //   - without       → serve manage.html anyway; the page shows a
    //                     login form inline (POSTs to /api/login)
    // Magic-link redemption now lives at /auth/callback (knowless),
    // which always 302s here on success.
    router.get('/manage', (req) => {
        if (!limiters.read.take(clientIp(req))) return text(429, 'rate limited');
        maybePromotePending(req);
        return serveStatic(webDir, 'manage.html', 'text/html; charset=utf-8');
    });

    // Pins owned by the current session. 401 if no valid cookie —
    // the manage.html page uses this signal to swap to the login form.
    // Per-IP throttle runs first: it's the heaviest authenticated read
    // (promotion sweep + decrypt-all), and gating before the sweep keeps a
    // throttled request from doing any DB work.
    router.get('/api/me/pins', (req) => {
        if (!limiters.read.take(clientIp(req))) return json(429, { error: 'rate_limited' });
        const handle = maybePromotePending(req);
        if (!handle) return json(401, { error: 'unauthorized' });
        const rows = db.listPinsByOwner(handle);
        const out = rows.map((p) => {
            const { lat, lng } = crypto.decryptCoords(p.ciphertext, p.iv);
            return { shortcode: p.shortcode, lat, lng, createdAt: p.createdAt };
        });
        return json(200, { pins: out });
    });

    router.patch('/api/pins/:shortcode', (req, params, body) => {
        const handle = maybePromotePending(req);
        if (!handle) return json(401, { error: 'unauthorized' });
        // Authenticated, but still bounded: a valid session shouldn't be able
        // to hammer pin writes (or probe ownership across shortcodes) without
        // limit. Keyed by handle — the authenticated principal — not IP, so a
        // shared NAT egress doesn't penalise unrelated owners.
        if (!limiters.manage.take(handle)) return json(429, { error: 'rate_limited' });
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin) return json(404, { error: 'not_found' });
        if (pin.ownerHandle !== handle) return json(403, { error: 'forbidden' });

        const { lat, lng } = body || {};
        if (typeof lat !== 'number' || typeof lng !== 'number' ||
            !Number.isFinite(lat) || !Number.isFinite(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return json(400, { error: 'invalid_coords' });
        }
        const enc = crypto.encryptCoords(lat, lng);
        const nowSec = Math.floor(now() / 1000);
        db.updatePinCoords(code, enc.ciphertext, enc.iv, nowSec);
        return json(200, { shortcode: code, lat, lng });
    });

    router.delete('/api/pins/:shortcode', (req, params) => {
        const handle = maybePromotePending(req);
        if (!handle) return json(401, { error: 'unauthorized' });
        if (!limiters.manage.take(handle)) return json(429, { error: 'rate_limited' });
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin) return json(404, { error: 'not_found' });
        if (pin.ownerHandle !== handle) return json(403, { error: 'forbidden' });
        db.deletePin(code, Math.floor(now() / 1000));
        return { status: 204, headers: {}, body: '' };
    });

    // /edit/:code → owner-only map-based editor. Ownership is enforced
    // by the /api/me/pins call the page makes on load, so we can serve
    // the HTML unconditionally here.
    router.get('/edit/:shortcode', (_req, params) => {
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return text(404, 'Not found');
        return serveStatic(webDir, 'edit.html', 'text/html; charset=utf-8');
    });

    // /:shortcode → the pin viewer page. We serve the same HTML for any
    // (syntactically valid) shortcode and let the page itself fetch
    // /api/pins/:code, which renders coords + map-link buttons or a 404
    // panel. This keeps the server stateless about page state and means
    // the same HTML caches well at any reverse proxy layer.
    router.get('/:shortcode', (_req, params) => {
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return text(404, 'Not found');
        return serveStatic(webDir, 'pin.html', 'text/html; charset=utf-8');
    });

    // ─── Server glue ───────────────────────────────────────────────────────────

    // knowless handlers expect raw (req, res) and write the response
    // themselves — they don't fit addypin's router (which returns response
    // objects). Mount them by short-circuiting the router for these
    // exact path/method pairs.
    const knowlessRoutes = auth ? [
        { method: 'GET',  path: '/auth/callback', handler: auth.callback },
        { method: 'POST', path: '/api/logout',    handler: auth.logout   },
    ] : [];

    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');

            const knowlessMatch = knowlessRoutes.find(
                (r) => r.method === req.method && r.path === url.pathname,
            );
            if (knowlessMatch) {
                await knowlessMatch.handler(req, res);
                return;
            }

            // HEAD ≡ GET per HTTP spec, just no body. Route on GET, drop body in send().
            const isHead = req.method === 'HEAD';
            const matchMethod = isHead ? 'GET' : req.method;
            const m = router.match(matchMethod, url.pathname);
            if (!m) return send(res, json(404, { error: 'not_found' }), isHead);

            let body = null;
            if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
                body = await readJson(req);
            }
            const query = Object.fromEntries(url.searchParams);
            const out = await m.handler(req, m.params, body, query);
            send(res, out, isHead);
        } catch (err) {
            console.error('[http]', err.stack || err.message);
            // Redact the query string before logging: magic-link tokens ride
            // in /auth/callback?token=… — flightlog records exactly what we
            // pass and ships no redactor, so stripping it is on us.
            capture(err, { where: 'http', method: req.method, path: (req.url || '').split('?')[0] });
            send(res, json(500, { error: 'internal_error' }));
        }
    });

    return server;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function json(status, obj) {
    // X-Robots-Tag: noindex on every JSON response. The API is intentionally
    // NOT Disallow-ed in robots.txt (a Disallow-ed page is never fetched, so a
    // noindex on it is never seen — the two cancel). Left crawlable, this header
    // keeps the public coords lookup (/api/pins/:code) out of search the way
    // pin-page HTML uses <meta name="robots">. Owner data (/api/me/pins, PATCH/
    // DELETE) is protected by its auth gate (401/403), not by this header.
    // See docs/04-process/privacy-seo.md, Tier 2.5.
    return {
        status,
        headers: { 'content-type': 'application/json', 'x-robots-tag': 'noindex' },
        body: JSON.stringify(obj),
    };
}

function text(status, str) {
    return { status, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: str };
}

function send(res, { status, headers, body }, isHead = false) {
    res.writeHead(status, headers);
    if (isHead) res.end();
    else res.end(body);
}

async function readJson(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > 64 * 1024) throw new Error('payload too large');
        chunks.push(chunk);
    }
    if (total === 0) return null;
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        return null;
    }
}

// The client IP we key per-IP rate limits on. MUST be a value the remote
// client cannot forge, or the limits are trivially evaded by rotating it.
//
// nginx sets `X-Real-IP $remote_addr` with proxy_set_header, which *replaces*
// any client-supplied value — so it's the true TCP peer and is not spoofable.
// Prefer it. (Sound only because the process binds to loopback and is reachable
// solely through nginx; see PRD §8 / cfg.host.)
//
// XFF here is `$proxy_add_x_forwarded_for` (append): nginx tacks the real peer
// onto whatever the client sent, so the *rightmost* token is nginx's and the
// leftmost is attacker-controlled. Never key off the leftmost. We read the
// rightmost only as a fallback for the (non-production) case where X-Real-IP
// is absent.
function clientIp(req) {
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.trim().length > 0) {
        return real.trim();
    }
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim().length > 0) {
        const parts = fwd.split(',');
        return parts[parts.length - 1].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

// Prefer an explicitly-configured BASE_URL (production: https://addypin.com).
// If unset, fall back to the request's own scheme + Host header — works for
// localhost dev without any extra config.
function effectiveBaseUrl(req, configured) {
    if (configured) return configured.replace(/\/$/, '');
    const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
    const host = req.headers.host || 'localhost';
    return `${proto}://${host}`;
}

// Read a static asset off disk. Files are tiny (< 50 KB) and the OS
// page cache makes repeat reads effectively free, so the simplest
// thing — readFileSync on every request — is the right shape for v2.
// If hot-path latency ever matters, swap to a startup-time Map<path, Buffer>.
function serveStatic(webDir, file, contentType) {
    try {
        const body = fs.readFileSync(path.join(webDir, file));
        return { status: 200, headers: { 'content-type': contentType }, body };
    } catch (e) {
        if (e.code === 'ENOENT') {
            return { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' };
        }
        throw e;
    }
}
