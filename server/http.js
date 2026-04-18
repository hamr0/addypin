import http from 'node:http';
import { createRouter } from './router.js';
import { mapLinks } from './maplinks.js';
import {
    normalizeShortcode, isValidShortcode, isBlocklisted,
    generateAvailableShortcode,
} from './shortcode.js';

const UNCONFIRMED_TTL_SEC = 72 * 60 * 60; // 72 hours

// Build an http.Server given the wired modules. Pure construction —
// the caller decides when to listen() and on which port. This shape
// lets integration tests spin up an ephemeral server per test.
export function createServer({ db, crypto, limiters, now = () => Date.now() }) {
    const router = createRouter();

    // ─── Routes ────────────────────────────────────────────────────────────────

    router.get('/api/health', (_req, _params, _body) => json(200, { ok: true }));

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

        return json(201, { shortcode });
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

    router.get('/:shortcode', (_req, params) => {
        const code = normalizeShortcode(params.shortcode);
        if (!isValidShortcode(code)) return text(404, 'Not found');
        const pin = db.getPinByShortcode(code);
        if (!pin || pin.status !== 'confirmed') return text(404, 'Not found');
        // Milestone 5 will replace this with a real HTML page.
        return text(200, `${code}\nSee /api/pins/${code}\n`);
    });

    // ─── Server glue ───────────────────────────────────────────────────────────

    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url, 'http://localhost');
            const m = router.match(req.method, url.pathname);
            if (!m) return send(res, json(404, { error: 'not_found' }));

            let body = null;
            if (req.method !== 'GET' && req.method !== 'DELETE') {
                body = await readJson(req);
            }
            const out = await m.handler(req, m.params, body);
            send(res, out);
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

function send(res, { status, headers, body }) {
    res.writeHead(status, headers);
    res.end(body);
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
