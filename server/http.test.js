import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from './http.js';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createMailer } from './mail.js';
import { createRateLimiter } from './ratelimit.js';

let server, baseUrl, db, cryptoMod, sentEmails, auth;

function generousLimiters() {
    return {
        create: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        login:  createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        manage: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        read:   createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
    };
}

// Stand-in for knowless. Implements the surface http.js touches:
// deriveHandle, startLogin, handleFromRequest, callback, logout. The
// shape doesn't need to match knowless byte-for-byte — addypin treats
// `auth` as a black box. Tests assert on the call records this exposes.
function makeMockAuth() {
    const startLoginCalls = [];
    function handleFor(email) {
        return crypto.createHash('sha256')
            .update(email.trim().toLowerCase(), 'utf8')
            .digest('hex');
    }
    return {
        deriveHandle: (email) => {
            if (typeof email !== 'string' || !email.includes('@')) {
                throw new Error('invalid email');
            }
            return handleFor(email);
        },
        startLogin: async (opts) => { startLoginCalls.push(opts); },
        handleFromRequest: (req) => {
            const cookieHeader = req.headers.cookie;
            if (typeof cookieHeader !== 'string') return null;
            const m = /addypin_session=([a-f0-9]{64})/.exec(cookieHeader);
            return m ? m[1] : null;
        },
        // Mock callback: token is base64url(email).base64url(nextUrl). Sets
        // a cookie keyed to the email's handle, redirects to nextUrl. This
        // mirrors knowless's behavior without needing a real token store.
        callback: async (req, res) => {
            const url = new URL(req.url, 'http://localhost');
            const t = url.searchParams.get('t');
            if (!t) { res.writeHead(302, { location: '/login' }); res.end(); return; }
            const [emailB64, nextB64] = t.split('.');
            const email = Buffer.from(emailB64, 'base64url').toString('utf8');
            const nextUrl = nextB64 ? Buffer.from(nextB64, 'base64url').toString('utf8') : '/manage';
            const handle = handleFor(email);
            res.writeHead(302, {
                location: nextUrl,
                'set-cookie': `addypin_session=${handle}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
            });
            res.end();
        },
        logout: async (req, res) => {
            res.writeHead(200, {
                'set-cookie': 'addypin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
                'content-type': 'text/plain',
            });
            res.end('ok');
        },
        startLoginCalls,
        handleFor,
        close: () => {},
    };
}

// Build a cookie that the mock auth will accept as "logged in as <email>".
function cookieFor(email) {
    const h = crypto.createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');
    return `addypin_session=${h}`;
}

before(async () => {
    db = createDb({ path: ':memory:' });
    cryptoMod = createCrypto({ dataKey: crypto.randomBytes(32) });
    sentEmails = [];
    const mailer = createMailer({
        from: 'auth@addypin.com',
        transport: async (to, subject, body) => { sentEmails.push({ to, subject, body }); },
    });
    auth = makeMockAuth();
    server = createServer({ db, crypto: cryptoMod, limiters: generousLimiters(), mailer, auth });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
});

after(() => {
    server.close();
    db.close();
});

beforeEach(() => {
    sentEmails.length = 0;
    auth.startLoginCalls.length = 0;
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

async function reqWithCookie(method, path, cookie, body) {
    const headers = { cookie };
    if (body) headers['content-type'] = 'application/json';
    const res = await fetch(baseUrl + path, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
        redirect: 'manual',
    });
    const ct = res.headers.get('content-type') || '';
    const data = res.status === 204 ? null : (ct.includes('json') ? await res.json() : await res.text());
    return { status: res.status, body: data, setCookie: res.headers.get('set-cookie') };
}

// Helper: insert a confirmed pin owned by `email` and return the cookie
// that authenticates as that owner. Bypasses the magic-link round-trip
// (those flows are tested separately).
function seedConfirmedPin(shortcode, email, lat = 1, lng = 2) {
    const handle = auth.handleFor(email);
    const { ciphertext, iv } = cryptoMod.encryptCoords(lat, lng);
    const nowSec = Math.floor(Date.now() / 1000);
    db.insertPin({
        shortcode, ciphertext, iv, ownerHandle: handle,
        status: 'confirmed', createdAt: nowSec, expiresAt: null,
    });
    return cookieFor(email);
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

test('POST /api/pins fires auth.startLogin with shortcode-flavored subject', async () => {
    auth.startLoginCalls.length = 0;
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'maria@example.com', shortcode: 'EMTST1' });
    assert.equal(r.status, 201);
    await new Promise((res) => setImmediate(res));
    assert.equal(auth.startLoginCalls.length, 1);
    const call = auth.startLoginCalls[0];
    assert.equal(call.email, 'maria@example.com');
    assert.match(call.subjectOverride, /EMTST1/);
    assert.match(call.nextUrl, /\/EMTST1\?confirmed=1$/);
});

test('startLogin failure does not fail pin creation', async () => {
    // Spin up an isolated server whose mock auth always rejects startLogin.
    const tightDb = createDb({ path: ':memory:' });
    const angryAuth = makeMockAuth();
    angryAuth.startLogin = async () => { throw new Error('mail down'); };
    const tightServer = createServer({
        db: tightDb, crypto: cryptoMod, limiters: generousLimiters(),
        mailer: undefined, auth: angryAuth,
    });
    await new Promise((r) => tightServer.listen(0, r));
    const url = `http://127.0.0.1:${tightServer.address().port}`;

    const r = await fetch(url + '/api/pins', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lat: 1, lng: 2, email: 'a@b.com', shortcode: 'MAILDN' }),
    });
    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.shortcode, 'MAILDN');

    tightServer.close();
    tightDb.close();
});

// ─── GET /api/pins/:shortcode ───────────────────────────────────────────────

test('GET /api/pins/:shortcode resolves unconfirmed pins (live during 72h window)', async () => {
    const c = await req('POST', '/api/pins', { lat: 10, lng: 20, email: 'a@b.com', shortcode: 'UNCNF1' });
    assert.equal(c.status, 201);
    const r = await req('GET', '/api/pins/UNCNF1');
    assert.equal(r.status, 200);
    assert.equal(r.body.lat, 10);
    assert.equal(r.body.lng, 20);
    assert.ok(Array.isArray(r.body.mapLinks));
});

test('GET /api/pins/:shortcode returns coords + maplinks for confirmed pin', async () => {
    seedConfirmedPin('CONFR1', 'a@b.com', 37.7749, -122.4194);
    const r = await req('GET', '/api/pins/CONFR1');
    assert.equal(r.status, 200);
    assert.equal(r.body.lat, 37.7749);
    assert.equal(r.body.lng, -122.4194);
    assert.equal(r.body.mapLinks.length, 12);
    const google = r.body.mapLinks.find(l => l.id === 'google');
    assert.ok(google.url.includes('37.7749'));
    assert.equal(google.icon, '/maplogos/google.ico');
});

test('GET /api/pins/:shortcode response leaks no owner info', async () => {
    seedConfirmedPin('LEAKY1', 'leak@me.com');
    const r = await req('GET', '/api/pins/LEAKY1');
    assert.deepEqual(Object.keys(r.body).sort(), ['lat', 'lng', 'mapLinks']);
});

test('GET /api/pins/:shortcode returns 404 for unknown', async () => {
    const r = await req('GET', '/api/pins/NOPE99');
    assert.equal(r.status, 404);
});

test('GET /api/pins/:shortcode normalizes case', async () => {
    seedConfirmedPin('CASE01', 'a@b.com');
    const r = await req('GET', '/api/pins/case01');
    assert.equal(r.status, 200);
});

// ─── GET /:shortcode → serves pin.html (page does the lookup) ───────────────

test('GET /:shortcode returns the pin viewer HTML for any valid 6-char code', async () => {
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

test('GET /edit/:shortcode serves the editor HTML for any valid code', async () => {
    const r = await req('GET', '/edit/ANYCD3');
    assert.equal(r.status, 200);
    assert.match(r.body, /<!doctype html>/i);
    assert.match(r.body, /editing/i);
});

test('GET /edit/:shortcode returns 404 for malformed shortcodes', async () => {
    const r = await req('GET', '/edit/!nope!');
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

test('GET /favicon.svg returns 404 (we use /logo.png directly)', async () => {
    const res = await fetch(baseUrl + '/favicon.svg');
    assert.equal(res.status, 404);
});

test('GET /robots.txt serves with text/plain and references the sitemap', async () => {
    const res = await fetch(baseUrl + '/robots.txt');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/plain/);
    const body = await res.text();
    assert.match(body, /Sitemap: https:\/\/addypin\.com\/sitemap\.xml/);
});

test('GET /sitemap.xml serves XML listing the apex URL', async () => {
    const res = await fetch(baseUrl + '/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /xml/);
    const body = await res.text();
    assert.match(body, /<loc>https:\/\/addypin\.com\/<\/loc>/);
});

test('GET /maplogos/<file> serves a real logo with correct content-type', async () => {
    const res = await fetch(baseUrl + '/maplogos/google.ico');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/x-icon');
    const buf = await res.arrayBuffer();
    assert.ok(buf.byteLength > 100);
});

test('GET /maplogos/ rejects path traversal and unknown extensions', async () => {
    for (const path of ['/maplogos/../package.json', '/maplogos/x.exe', '/maplogos/../../etc/passwd', '/maplogos/foo']) {
        const res = await fetch(baseUrl + path);
        assert.equal(res.status, 404, `expected 404 for ${path}`);
    }
});

// ─── Unknown route ──────────────────────────────────────────────────────────

test('unknown route returns 404 json', async () => {
    const r = await req('GET', '/totally/unknown/path');
    assert.equal(r.status, 404);
});

// ─── M7: login + manage + edit/delete ──────────────────────────────────────

test('POST /api/login fires auth.startLogin when the address owns confirmed pins', async () => {
    seedConfirmedPin('LOGIN1', 'loginuser@example.com');
    const r = await req('POST', '/api/login', { email: 'loginuser@example.com' });
    assert.equal(r.status, 202);
    await new Promise((res) => setImmediate(res));
    assert.equal(auth.startLoginCalls.length, 1);
    assert.equal(auth.startLoginCalls[0].email, 'loginuser@example.com');
    assert.match(auth.startLoginCalls[0].nextUrl, /\/manage$/);
});

test('POST /api/login is silent (no startLogin) when the address owns nothing', async () => {
    auth.startLoginCalls.length = 0;
    const r = await req('POST', '/api/login', { email: 'stranger@nowhere.com' });
    assert.equal(r.status, 202);
    await new Promise((res) => setImmediate(res));
    assert.equal(auth.startLoginCalls.length, 0);
});

test('POST /api/login rejects malformed email with 400', async () => {
    const r = await req('POST', '/api/login', { email: 'noatsign' });
    assert.equal(r.status, 400);
});

test('GET /auth/callback (mock) sets a session cookie and redirects to nextUrl', async () => {
    const email = 'callback@example.com';
    const t = Buffer.from(email).toString('base64url') + '.' + Buffer.from('/manage').toString('base64url');
    const res = await fetch(baseUrl + `/auth/callback?t=${encodeURIComponent(t)}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/manage');
    assert.match(res.headers.get('set-cookie'), /addypin_session=[a-f0-9]{64}/);
});

test('GET /manage with an authenticated session promotes pending pins owned by handle', async () => {
    const email = 'autocf@example.com';
    // Create an unconfirmed pin under that email.
    const create = await req('POST', '/api/pins', { lat: 40, lng: -74, email, shortcode: 'AUTOCF' });
    assert.equal(create.status, 201);
    assert.equal(db.getPinByShortcode('AUTOCF').status, 'unconfirmed');

    // Visit /manage with the cookie that authenticates as that email.
    const r = await reqWithCookie('GET', '/manage', cookieFor(email));
    assert.equal(r.status, 200);

    // Pin is now confirmed.
    const pin = db.getPinByShortcode('AUTOCF');
    assert.equal(pin.status, 'confirmed');
    assert.equal(pin.expiresAt, null);
});

test('GET /manage without cookie serves manage.html (client handles login)', async () => {
    const res = await fetch(baseUrl + '/manage');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /<!doctype html>/i);
    assert.match(body, /manage/i);
});

test('POST /api/logout clears the session cookie', async () => {
    const r = await reqWithCookie('POST', '/api/logout', cookieFor('logger@example.com'));
    // Mock auth.logout returns 200 with cleared cookie. Real knowless behavior
    // is equivalent: addypin's contract is "cookie cleared, success status."
    assert.ok(r.status === 200 || r.status === 204);
    assert.match(r.setCookie, /addypin_session=;/);
});

test('GET /api/me/pins returns 401 without a session cookie', async () => {
    const r = await reqWithCookie('GET', '/api/me/pins', '');
    assert.equal(r.status, 401);
});

test("GET /api/me/pins returns the session owner's confirmed pins", async () => {
    const cookie = seedConfirmedPin('MINEEE', 'mine@example.com', 10, 20);
    seedConfirmedPin('MINEE2', 'mine@example.com', 1, 2);

    const r = await reqWithCookie('GET', '/api/me/pins', cookie);
    assert.equal(r.status, 200);
    const codes = r.body.pins.map((p) => p.shortcode).sort();
    assert.ok(codes.includes('MINEEE'));
    assert.ok(codes.includes('MINEE2'));
    for (const p of r.body.pins) {
        assert.equal(typeof p.lat, 'number');
        assert.equal(typeof p.lng, 'number');
    }
});

test("GET /api/me/pins excludes another user's pins", async () => {
    const aliceCookie = seedConfirmedPin('ALICE1', 'alice.mine@example.com');
    seedConfirmedPin('BOBBY1', 'bobby.mine@example.com');

    const r = await reqWithCookie('GET', '/api/me/pins', aliceCookie);
    const codes = r.body.pins.map((p) => p.shortcode);
    assert.ok(codes.includes('ALICE1'));
    assert.ok(!codes.includes('BOBBY1'));
});

test('PATCH /api/pins/:code updates coords for the owner', async () => {
    const cookie = seedConfirmedPin('PCHTST', 'patcher@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/PCHTST', cookie, { lat: 40.7128, lng: -74.006 });
    assert.equal(r.status, 200);
    assert.equal(r.body.lat, 40.7128);

    const lookup = await req('GET', '/api/pins/PCHTST');
    assert.equal(lookup.body.lat, 40.7128);
    assert.equal(lookup.body.lng, -74.006);
});

test('PATCH /api/pins/:code returns 401 without session', async () => {
    seedConfirmedPin('PATCH2', 'p2@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/PATCH2', '', { lat: 1, lng: 2 });
    assert.equal(r.status, 401);
});

test('PATCH /api/pins/:code returns 403 when session owns a different pin', async () => {
    const aliceCookie = seedConfirmedPin('OWN001', 'alice.own@example.com');
    seedConfirmedPin('NOTOUR', 'bob.own@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/NOTOUR', aliceCookie, { lat: 1, lng: 2 });
    assert.equal(r.status, 403);
});

test('PATCH /api/pins/:code rejects invalid coords with 400', async () => {
    const cookie = seedConfirmedPin('BADCOR', 'bad@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/BADCOR', cookie, { lat: 999, lng: 0 });
    assert.equal(r.status, 400);
});

test('DELETE /api/pins/:code removes the pin, retires the shortcode', async () => {
    const cookie = seedConfirmedPin('DELTST', 'del@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/DELTST', cookie);
    assert.equal(r.status, 204);
    const lookup = await req('GET', '/api/pins/DELTST');
    assert.equal(lookup.status, 404);
    const recreate = await req('POST', '/api/pins', {
        lat: 1, lng: 2, email: 'someone@new.com', shortcode: 'DELTST',
    });
    assert.equal(recreate.status, 409);
    assert.equal(recreate.body.error, 'shortcode_taken');
});

test('DELETE /api/pins/:code returns 401 without session', async () => {
    seedConfirmedPin('DELAUT', 'da@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/DELAUT', '');
    assert.equal(r.status, 401);
});

test('DELETE /api/pins/:code returns 403 when session does not own the pin', async () => {
    const aliceCookie = seedConfirmedPin('AL0001', 'alice.del@example.com');
    seedConfirmedPin('BO0001', 'bob.del@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/BO0001', aliceCookie);
    assert.equal(r.status, 403);
});

test('rate limiter returns 429 after capacity exhausted', async () => {
    const tightDb = createDb({ path: ':memory:' });
    const tightAuth = makeMockAuth();
    const tightServer = createServer({
        db: tightDb,
        crypto: cryptoMod,
        auth: tightAuth,
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

test('manage limiter returns 429 on authenticated writes after capacity exhausted', async () => {
    const tightDb = createDb({ path: ':memory:' });
    const tightAuth = makeMockAuth();
    const tightServer = createServer({
        db: tightDb,
        crypto: cryptoMod,
        auth: tightAuth,
        limiters: {
            create: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
            lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
            // capacity 2, effectively no refill within the test window.
            manage: createRateLimiter({ capacity: 2, refillPerSec: 0.0001 }),
        },
    });
    await new Promise((r) => tightServer.listen(0, r));
    const url = `http://127.0.0.1:${tightServer.address().port}`;

    // Seed two confirmed pins owned by the same handle, plus the cookie.
    const email = 'manage.limit@example.com';
    const handle = tightAuth.handleFor(email);
    const nowSec = Math.floor(Date.now() / 1000);
    for (const code of ['MGLIM1', 'MGLIM2']) {
        const { ciphertext, iv } = cryptoMod.encryptCoords(1, 2);
        tightDb.insertPin({ shortcode: code, ciphertext, iv, ownerHandle: handle,
            status: 'confirmed', createdAt: nowSec, expiresAt: null });
    }
    const cookie = cookieFor(email);

    async function patch(code) {
        return fetch(url + `/api/pins/${code}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ lat: 3, lng: 4 }),
        });
    }
    assert.equal((await patch('MGLIM1')).status, 200);
    assert.equal((await patch('MGLIM2')).status, 200);
    // Third write by the same handle is throttled — even though it's a
    // valid, authenticated, owned request.
    assert.equal((await patch('MGLIM1')).status, 429);

    tightServer.close();
    tightDb.close();
});

test('read limiter returns 429 per IP on owner-facing reads after capacity exhausted', async () => {
    const tightDb = createDb({ path: ':memory:' });
    const tightAuth = makeMockAuth();
    const tightServer = createServer({
        db: tightDb,
        crypto: cryptoMod,
        auth: tightAuth,
        limiters: {
            create: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
            lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
            manage: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
            // capacity 2, effectively no refill within the test window.
            read:   createRateLimiter({ capacity: 2, refillPerSec: 0.0001 }),
        },
    });
    await new Promise((r) => tightServer.listen(0, r));
    const url = `http://127.0.0.1:${tightServer.address().port}`;

    const email = 'read.limit@example.com';
    const handle = tightAuth.handleFor(email);
    const nowSec = Math.floor(Date.now() / 1000);
    const { ciphertext, iv } = cryptoMod.encryptCoords(1, 2);
    tightDb.insertPin({ shortcode: 'RDLIM1', ciphertext, iv, ownerHandle: handle,
        status: 'confirmed', createdAt: nowSec, expiresAt: null });
    const cookie = `addypin_session=${handle}`;

    const me = () => fetch(url + '/api/me/pins', { headers: { cookie } }).then((r) => r.status);
    // First two authenticated reads succeed; the third from the same IP is
    // throttled — the read limiter is per IP, not per session.
    assert.equal(await me(), 200);
    assert.equal(await me(), 200);
    assert.equal(await me(), 429);

    tightServer.close();
    tightDb.close();
});
