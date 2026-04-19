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
    ['/favicon.svg', { file: 'favicon.svg', type: 'image/svg+xml' }],
    ['/favicon.ico', { file: 'favicon.svg', type: 'image/svg+xml' }],
]);

// Confirmation tokens live as long as the unconfirmed pin (72 h);
// login tokens are 15 min per PRD §5;
// session cookies are 30 days per PRD §9.
const CONFIRM_TTL_SEC = 72 * 60 * 60;
const LOGIN_TTL_SEC = 15 * 60;
const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

// Build an http.Server given the wired modules. Pure construction —
// the caller decides when to listen() and on which port. This shape
// lets integration tests spin up an ephemeral server per test.
export function createServer({ db, crypto, limiters, mailer, baseUrl = '', webDir = DEFAULT_WEB_DIR, now = () => Date.now() }) {
    const router = createRouter();

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

    router.post('/api/pins', (req, _params, body) => {
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

        const { ciphertext, iv } = crypto.encryptCoords(lat, lng);
        const fingerprint = crypto.fingerprint(email);
        const nowSec = Math.floor(now() / 1000);

        db.insertPin({
            shortcode, ciphertext, iv, fingerprint,
            status: 'unconfirmed',
            createdAt: nowSec,
            expiresAt: nowSec + UNCONFIRMED_TTL_SEC,
        });

        // Fire the confirmation email. Failures are logged but do NOT
        // fail the request — the pin exists, will auto-expire if the
        // user can't confirm. They can re-trigger via resend@ in M8.
        if (mailer) {
            const token = crypto.signToken(
                { shortcode, action: 'confirm' },
                CONFIRM_TTL_SEC,
            );
            const confirmUrl = `${effectiveBaseUrl(req, baseUrl)}/confirm?token=${encodeURIComponent(token)}`;
            mailer.sendConfirmation({ to: email, shortcode, confirmUrl })
                .catch((err) => {
                    console.error(`[mail] confirmation send failed for ${shortcode}: ${err.message}`);
                });
        }

        return json(201, { shortcode });
    });

    router.get('/confirm', (_req, _params, _body, query) => {
        const token = query?.token;
        const payload = token ? crypto.verifyToken(token) : null;
        if (!payload || payload.action !== 'confirm' || typeof payload.shortcode !== 'string') {
            return text(400, 'invalid or expired confirmation link');
        }
        const code = payload.shortcode;
        const pin = db.getPinByShortcode(code);
        if (!pin) return text(404, 'pin not found (it may have expired)');

        const nowSec = Math.floor(now() / 1000);
        // confirmPin is a no-op if already confirmed — that's fine; same magic
        // link doubles as a login per PRD §5.
        if (pin.status === 'unconfirmed') db.confirmPin(code, nowSec);

        const sessionToken = crypto.signToken(
            { fp: pin.fingerprint.toString('hex') },
            SESSION_TTL_SEC,
        );
        return {
            status: 302,
            headers: {
                'set-cookie': sessionCookie(sessionToken, SESSION_TTL_SEC),
                'location': `/${code}?confirmed=1`,
            },
            body: '',
        };
    });

    router.get('/api/pins/:shortcode', (req, params) => {
        if (!limiters.lookup.take(clientIp(req))) {
            return json(429, { error: 'rate_limited' });
        }
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin || pin.status !== 'confirmed') return json(404, { error: 'not_found' });
        const { lat, lng } = crypto.decryptCoords(pin.ciphertext, pin.iv);
        return json(200, { lat, lng, mapLinks: mapLinks(lat, lng) });
    });

    // ─── M7: login + manage ────────────────────────────────────────────────

    // Always returns 202 — no email enumeration. If the submitted email
    // actually owns at least one confirmed pin, a magic link is emailed.
    // Rate-limited per email fingerprint (3/hr) so the login endpoint can't
    // be weaponized for targeted email probing.
    router.post('/api/login', async (_req, _params, body) => {
        const email = body?.email;
        if (typeof email !== 'string' || !email.includes('@')) {
            return json(400, { error: 'invalid_email' });
        }
        const fp = crypto.fingerprint(email);
        const fpHex = fp.toString('hex');
        if (limiters.login && !limiters.login.take(fpHex)) {
            return json(202, {}); // silent rate-limit
        }
        const pins = db.listPinsByOwner(fp);
        if (pins.length === 0) return json(202, {}); // silent no-op
        if (mailer) {
            const token = crypto.signToken({ fp: fpHex, action: 'login' }, LOGIN_TTL_SEC);
            const loginUrl = `${effectiveBaseUrl(_req, baseUrl)}/manage?token=${encodeURIComponent(token)}`;
            mailer.sendLogin({ to: email, loginUrl })
                .catch((err) => console.error(`[mail] login send failed: ${err.message}`));
        }
        return json(202, {});
    });

    // /manage is the single owner-facing entry point. Three modes:
    //   - with ?token=  → verify, set cookie, redirect to /manage
    //   - with cookie   → serve manage.html (client fetches /api/me/pins)
    //   - neither       → serve manage.html anyway; the page shows a
    //                     login form inline
    router.get('/manage', (req, _params, _body, query) => {
        const token = query?.token;
        if (token) {
            const payload = crypto.verifyToken(token);
            if (!payload || payload.action !== 'login' || typeof payload.fp !== 'string') {
                return text(400, 'invalid or expired login link');
            }
            const sessionToken = crypto.signToken({ fp: payload.fp }, SESSION_TTL_SEC);
            return {
                status: 302,
                headers: {
                    'set-cookie': sessionCookie(sessionToken, SESSION_TTL_SEC),
                    'location': '/manage',
                },
                body: '',
            };
        }
        return serveStatic(webDir, 'manage.html', 'text/html; charset=utf-8');
    });

    // Pins owned by the current session. 401 if no valid cookie —
    // the manage.html page uses this signal to swap to the login form.
    router.get('/api/me/pins', (req) => {
        const session = getSession(req, crypto);
        if (!session) return json(401, { error: 'unauthorized' });
        const rows = db.listPinsByOwner(session.fp);
        const out = rows.map((p) => {
            const { lat, lng } = crypto.decryptCoords(p.ciphertext, p.iv);
            return { shortcode: p.shortcode, lat, lng, createdAt: p.createdAt };
        });
        return json(200, { pins: out });
    });

    router.patch('/api/pins/:shortcode', (req, params, body) => {
        const session = getSession(req, crypto);
        if (!session) return json(401, { error: 'unauthorized' });
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin) return json(404, { error: 'not_found' });
        if (!pin.fingerprint.equals(session.fp)) return json(403, { error: 'forbidden' });

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
        const session = getSession(req, crypto);
        if (!session) return json(401, { error: 'unauthorized' });
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return json(404, { error: 'not_found' });
        const pin = db.getPinByShortcode(code);
        if (!pin) return json(404, { error: 'not_found' });
        if (!pin.fingerprint.equals(session.fp)) return json(403, { error: 'forbidden' });
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

    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');
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
            send(res, json(500, { error: 'internal_error' }));
        }
    });

    return server;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function json(status, obj) {
    return { status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) };
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

function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
        return fwd.split(',')[0].trim();
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

// Read + verify the session cookie. Returns { fp: Buffer } on success, null
// on anything missing/expired/tampered. Caller is responsible for reacting
// (401, skip, etc).
function getSession(req, crypto) {
    const cookieHeader = req.headers.cookie;
    if (typeof cookieHeader !== 'string') return null;
    const m = /(?:^|;\s*)addypin_session=([^;]+)/.exec(cookieHeader);
    if (!m) return null;
    const payload = crypto.verifyToken(m[1]);
    if (!payload || typeof payload.fp !== 'string') return null;
    try {
        return { fp: Buffer.from(payload.fp, 'hex') };
    } catch {
        return null;
    }
}

function sessionCookie(value, ttlSec) {
    const parts = [
        `addypin_session=${value}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${ttlSec}`,
    ];
    // Production traffic comes through nginx with HTTPS; mark Secure when
    // nginx forwards x-forwarded-proto=https. Skipped on plain-http localhost
    // so the cookie is still set during dev.
    return parts.join('; ');
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
