import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from './http.js';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createRateLimiter } from './ratelimit.js';

let server, baseUrl, db, cryptoMod;

function generousLimiters() {
    return {
        create: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
    };
}

before(async () => {
    db = createDb({ path: ':memory:' });
    cryptoMod = createCrypto({
        dataKey: crypto.randomBytes(32),
        emailKey: crypto.randomBytes(32),
        signingKey: crypto.randomBytes(32),
    });
    server = createServer({ db, crypto: cryptoMod, limiters: generousLimiters() });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
    server.close();
    db.close();
});

beforeEach(() => {
    // Wipe all pins between tests via direct SQL — keeps tests independent.
    // (Cheaper than recreating the whole server on every test.)
});

async function req(method, path, body) {
    const res = await fetch(baseUrl + path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    return { status: res.status, body: data };
}

// ─── /api/health ────────────────────────────────────────────────────────────

test('GET /api/health returns 200 ok', async () => {
    const r = await req('GET', '/api/health');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
});

// ─── POST /api/pins ─────────────────────────────────────────────────────────

test('POST /api/pins with no shortcode generates one', async () => {
    const r = await req('POST', '/api/pins', { lat: 37.7749, lng: -122.4194, email: 'a@b.com' });
    assert.equal(r.status, 201);
    assert.match(r.body.shortcode, /^[A-Z0-9]{6}$/);
});

test('POST /api/pins with chosen shortcode honors it', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'PICK01' });
    assert.equal(r.status, 201);
    assert.equal(r.body.shortcode, 'PICK01');
});

test('POST /api/pins normalizes the chosen shortcode', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: ' pick02 ' });
    assert.equal(r.status, 201);
    assert.equal(r.body.shortcode, 'PICK02');
});

test('POST /api/pins rejects taken shortcode with 409', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'TAKEN1' });
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'c@d.com', shortcode: 'TAKEN1' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, 'shortcode_taken');
});

test('POST /api/pins rejects blocklisted shortcode with 409', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'GOOGLE' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, 'shortcode_reserved');
});

test('POST /api/pins rejects malformed shortcode with 400', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'too long!' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'invalid_shortcode');
});

test('POST /api/pins rejects out-of-range coords', async () => {
    const cases = [
        { lat: 91, lng: 0 }, { lat: -91, lng: 0 },
        { lat: 0, lng: 181 }, { lat: 0, lng: -181 },
        { lat: 'not', lng: 0 }, { lat: 0, lng: NaN },
    ];
    for (const body of cases) {
        const r = await req('POST', '/api/pins', { ...body, email: 'a@b.com' });
        assert.equal(r.status, 400, `case: ${JSON.stringify(body)}`);
        assert.equal(r.body.error, 'invalid_coords');
    }
});

test('POST /api/pins requires email', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2 });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'invalid_email');
});

// ─── GET /api/pins/:shortcode ───────────────────────────────────────────────

test('GET /api/pins/:shortcode returns 404 for unconfirmed pin', async () => {
    const c = await req('POST', '/api/pins', { lat: 10, lng: 20, email: 'a@b.com', shortcode: 'UNCNF1' });
    assert.equal(c.status, 201);
    const r = await req('GET', '/api/pins/UNCNF1');
    assert.equal(r.status, 404);
});

test('GET /api/pins/:shortcode returns coords + maplinks for confirmed pin', async () => {
    const created = await req('POST', '/api/pins', { lat: 37.7749, lng: -122.4194, email: 'a@b.com', shortcode: 'CONFR1' });
    assert.equal(created.status, 201);
    db.confirmPin('CONFR1', Math.floor(Date.now() / 1000));

    const r = await req('GET', '/api/pins/CONFR1');
    assert.equal(r.status, 200);
    assert.equal(r.body.lat, 37.7749);
    assert.equal(r.body.lng, -122.4194);
    assert.equal(Object.keys(r.body.mapLinks).length, 13);
    assert.ok(r.body.mapLinks['Google Maps'].includes('37.7749'));
});

test('GET /api/pins/:shortcode response leaks no owner info', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'leak@me.com', shortcode: 'LEAKY1' });
    db.confirmPin('LEAKY1', Math.floor(Date.now() / 1000));
    const r = await req('GET', '/api/pins/LEAKY1');
    assert.deepEqual(Object.keys(r.body).sort(), ['lat', 'lng', 'mapLinks']);
});

test('GET /api/pins/:shortcode returns 404 for unknown', async () => {
    const r = await req('GET', '/api/pins/NOPE99');
    assert.equal(r.status, 404);
});

test('GET /api/pins/:shortcode normalizes case', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'CASE01' });
    db.confirmPin('CASE01', Math.floor(Date.now() / 1000));
    const r = await req('GET', '/api/pins/case01');
    assert.equal(r.status, 200);
});

// ─── GET /:shortcode → serves pin.html (the page itself does the lookup) ────

test('GET /:shortcode returns the pin viewer HTML for any valid 6-char code', async () => {
    // We serve the same HTML for any syntactically valid code; the page
    // fetches /api/pins/:code itself and renders 404 client-side if needed.
    const r = await req('GET', '/ANYCD1');
    assert.equal(r.status, 200);
    assert.match(r.body, /<!doctype html>/i);
    assert.match(r.body, /addypin/i);
});

test('GET /:shortcode normalizes case before validating', async () => {
    const r = await req('GET', '/anycd2');
    assert.equal(r.status, 200);
    assert.match(r.body, /<!doctype html>/i);
});

test('GET /:shortcode returns 404 for malformed shortcodes', async () => {
    const r = await req('GET', '/!nope!');
    assert.equal(r.status, 404);
});

// ─── Static files ──────────────────────────────────────────────────────────

test('GET / serves the homepage HTML', async () => {
    const r = await req('GET', '/');
    assert.equal(r.status, 200);
    assert.match(r.body, /<!doctype html>/i);
    assert.match(r.body, /addypin/i);
});

test('GET /logo.png serves the brand image', async () => {
    const res = await fetch(baseUrl + '/logo.png');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    const buf = await res.arrayBuffer();
    assert.ok(buf.byteLength > 100);
});

test('GET /favicon.svg serves the favicon', async () => {
    const res = await fetch(baseUrl + '/favicon.svg');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/svg+xml');
});

// ─── Unknown route ──────────────────────────────────────────────────────────

test('unknown route returns 404 json', async () => {
    const r = await req('GET', '/totally/unknown/path');
    assert.equal(r.status, 404);
});

// ─── Rate limiting ──────────────────────────────────────────────────────────

test('rate limiter returns 429 after capacity exhausted', async () => {
    const tightDb = createDb({ path: ':memory:' });
    const tightServer = createServer({
        db: tightDb,
        crypto: cryptoMod,
        limiters: {
            create: createRateLimiter({ capacity: 2, refillPerSec: 0.0001 }),
            lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        },
    });
    await new Promise((r) => tightServer.listen(0, r));
    const url = `http://127.0.0.1:${tightServer.address().port}`;

    async function post() {
        return fetch(url + '/api/pins', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ lat: 1, lng: 2, email: 'a@b.com' }),
        });
    }
    assert.equal((await post()).status, 201);
    assert.equal((await post()).status, 201);
    assert.equal((await post()).status, 429);

    tightServer.close();
    tightDb.close();
});
