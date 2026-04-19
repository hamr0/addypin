import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from './http.js';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createMailer } from './mail.js';
import { createRateLimiter } from './ratelimit.js';

let server, baseUrl, db, cryptoMod, sentEmails;

function generousLimiters() {
    return {
        create: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        lookup: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        login:  createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
    };
}

before(async () => {
    db = createDb({ path: ':memory:' });
    cryptoMod = createCrypto({
        dataKey: crypto.randomBytes(32),
        emailKey: crypto.randomBytes(32),
        signingKey: crypto.randomBytes(32),
    });
    sentEmails = [];
    const mailer = createMailer({
        from: 'noreply@addypin.com',
        transport: async (to, subject, body) => { sentEmails.push({ to, subject, body }); },
    });
    server = createServer({ db, crypto: cryptoMod, limiters: generousLimiters(), mailer });
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
    assert.equal(r.body.mapLinks.length, 12);
    const google = r.body.mapLinks.find(l => l.id === 'google');
    assert.ok(google.url.includes('37.7749'));
    assert.equal(google.icon, '/maplogos/google.ico');
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

test('GET /edit/:shortcode serves the editor HTML for any valid code', async () => {
    // Ownership is enforced client-side via /api/me/pins; the server serves
    // the HTML shell unconditionally.
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

test('GET /favicon.svg serves the favicon', async () => {
    const res = await fetch(baseUrl + '/favicon.svg');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/svg+xml');
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

// ─── Rate limiting ──────────────────────────────────────────────────────────

// ─── helper: create a confirmed pin and return the session cookie for its owner.
async function createConfirmedPinAndLogin(shortcode, email) {
    await req('POST', '/api/pins', { lat: 10, lng: 20, email, shortcode });
    await new Promise((r) => setTimeout(r, 30));
    const confirmUrl = sentEmails.at(-1).body.match(/\/confirm\?token=([^\s]+)/)[1];
    const res = await fetch(baseUrl + `/confirm?token=${confirmUrl}`, { redirect: 'manual' });
    return extractCookie(res.headers.get('set-cookie'));
}

function extractCookie(setCookieHeader) {
    const m = /(addypin_session=[^;]+)/.exec(setCookieHeader || '');
    return m ? m[1] : '';
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

// ─── M6: confirmation email + /confirm route ───────────────────────────────

test('POST /api/pins fires a confirmation email with a magic link', async () => {
    const r = await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'maria@example.com', shortcode: 'EMTST1' });
    assert.equal(r.status, 201);
    // sendConfirmation is fired but not awaited by the route — give it a tick.
    await new Promise((res) => setTimeout(res, 30));
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'maria@example.com');
    assert.match(sentEmails[0].subject, /EMTST1/);
    assert.match(sentEmails[0].body, /\/confirm\?token=/);
});

test('GET /confirm with a valid token confirms the pin, sets a cookie, and redirects', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'CFM001' });
    await new Promise((res) => setTimeout(res, 30));
    // Pull the URL out of the captured email.
    const m = sentEmails.at(-1).body.match(/\/confirm\?token=([^\s]+)/);
    assert.ok(m, 'no confirm URL in email');
    const tokenEncoded = m[1];

    const res = await fetch(baseUrl + `/confirm?token=${tokenEncoded}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.match(res.headers.get('location'), /^\/CFM001/);

    const cookie = res.headers.get('set-cookie');
    assert.ok(cookie, 'no Set-Cookie header');
    assert.match(cookie, /addypin_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=2592000/); // 30 days

    // Pin should be confirmed in the DB now.
    const pin = db.getPinByShortcode('CFM001');
    assert.equal(pin.status, 'confirmed');
    assert.equal(pin.expiresAt, null);
});

test('GET /confirm is idempotent (re-clicking same link still 302s)', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'CFMIDM' });
    await new Promise((res) => setTimeout(res, 30));
    const tokenEncoded = sentEmails.at(-1).body.match(/\/confirm\?token=([^\s]+)/)[1];

    const r1 = await fetch(baseUrl + `/confirm?token=${tokenEncoded}`, { redirect: 'manual' });
    assert.equal(r1.status, 302);
    const r2 = await fetch(baseUrl + `/confirm?token=${tokenEncoded}`, { redirect: 'manual' });
    assert.equal(r2.status, 302);
    // Pin still confirmed (no error).
    assert.equal(db.getPinByShortcode('CFMIDM').status, 'confirmed');
});

test('GET /confirm with no token returns 400', async () => {
    const res = await fetch(baseUrl + '/confirm', { redirect: 'manual' });
    assert.equal(res.status, 400);
});

test('GET /confirm with a malformed token returns 400', async () => {
    const res = await fetch(baseUrl + '/confirm?token=not.a.real.token', { redirect: 'manual' });
    assert.equal(res.status, 400);
});

test('GET /confirm with a token signed by a different key returns 400', async () => {
    const otherCrypto = createCrypto({
        dataKey: crypto.randomBytes(32),
        emailKey: crypto.randomBytes(32),
        signingKey: crypto.randomBytes(32),
    });
    const tok = otherCrypto.signToken({ shortcode: 'WHATEV', action: 'confirm' }, 600);
    const res = await fetch(baseUrl + `/confirm?token=${encodeURIComponent(tok)}`, { redirect: 'manual' });
    assert.equal(res.status, 400);
});

test('GET /confirm for a deleted pin returns 404', async () => {
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'a@b.com', shortcode: 'GONE01' });
    await new Promise((res) => setTimeout(res, 30));
    const tokenEncoded = sentEmails.at(-1).body.match(/\/confirm\?token=([^\s]+)/)[1];
    // Delete the pin (simulating an expiry sweep that retired the shortcode).
    db.deletePin('GONE01', Math.floor(Date.now() / 1000));
    const res = await fetch(baseUrl + `/confirm?token=${tokenEncoded}`, { redirect: 'manual' });
    assert.equal(res.status, 404);
});

test('mailer failure does not fail pin creation', async () => {
    // Spin up an isolated server whose mailer always throws.
    const tightDb = createDb({ path: ':memory:' });
    const angryMailer = createMailer({
        from: 'noreply@addypin.com',
        transport: async () => { throw new Error('smtp down'); },
    });
    const tightServer = createServer({
        db: tightDb, crypto: cryptoMod,
        limiters: generousLimiters(), mailer: angryMailer,
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

// ─── M7: login + /manage + edit/delete ────────────────────────────────────

test('POST /api/login sends a login email when the address owns confirmed pins', async () => {
    await createConfirmedPinAndLogin('LOGIN1', 'loginuser@example.com');
    sentEmails.length = 0; // only the confirmation was there; clear for clean assertion
    const r = await req('POST', '/api/login', { email: 'loginuser@example.com' });
    assert.equal(r.status, 202);
    await new Promise((res) => setTimeout(res, 30));
    assert.equal(sentEmails.length, 1);
    assert.match(sentEmails[0].subject, /login link/i);
    assert.match(sentEmails[0].body, /\/manage\?token=/);
});

test('POST /api/login is silent (no email) when the address owns nothing', async () => {
    sentEmails.length = 0;
    const r = await req('POST', '/api/login', { email: 'stranger@nowhere.com' });
    assert.equal(r.status, 202); // same status as success — no enumeration
    await new Promise((res) => setTimeout(res, 30));
    assert.equal(sentEmails.length, 0);
});

test('POST /api/login rejects malformed email with 400', async () => {
    const r = await req('POST', '/api/login', { email: 'noatsign' });
    assert.equal(r.status, 400);
});

test('GET /manage?token=<login> sets a session cookie and 302s to /manage', async () => {
    await createConfirmedPinAndLogin('LGNTST', 'lg@example.com');
    sentEmails.length = 0;
    await req('POST', '/api/login', { email: 'lg@example.com' });
    await new Promise((res) => setTimeout(res, 30));
    const tokenMatch = sentEmails[0].body.match(/\/manage\?token=([^\s]+)/);
    assert.ok(tokenMatch, 'login URL missing in email');
    const res = await fetch(baseUrl + `/manage?token=${tokenMatch[1]}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/manage');
    assert.match(res.headers.get('set-cookie'), /addypin_session=/);
});

test('GET /manage?token=<invalid> returns 400', async () => {
    const res = await fetch(baseUrl + '/manage?token=not.a.real', { redirect: 'manual' });
    assert.equal(res.status, 400);
});

test('GET /manage without token or cookie serves manage.html (client handles login)', async () => {
    const res = await fetch(baseUrl + '/manage');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /<!doctype html>/i);
    assert.match(body, /manage/i);
});

test('GET /api/me/pins returns 401 without a session cookie', async () => {
    const r = await reqWithCookie('GET', '/api/me/pins', '');
    assert.equal(r.status, 401);
});

test('GET /api/me/pins returns the session owner\'s confirmed pins', async () => {
    const cookie = await createConfirmedPinAndLogin('MINEEE', 'mine@example.com');
    // Add a second pin for the same owner.
    await req('POST', '/api/pins', { lat: 1, lng: 2, email: 'mine@example.com', shortcode: 'MINEE2' });
    await new Promise((r) => setTimeout(r, 30));
    db.confirmPin('MINEE2', Math.floor(Date.now() / 1000));

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

test('GET /api/me/pins excludes another user\'s pins', async () => {
    const aliceCookie = await createConfirmedPinAndLogin('ALICE1', 'alice.mine@example.com');
    await createConfirmedPinAndLogin('BOBBY1', 'bobby.mine@example.com');

    const r = await reqWithCookie('GET', '/api/me/pins', aliceCookie);
    const codes = r.body.pins.map((p) => p.shortcode);
    assert.ok(codes.includes('ALICE1'));
    assert.ok(!codes.includes('BOBBY1'));
});

test('PATCH /api/pins/:code updates coords for the owner', async () => {
    const cookie = await createConfirmedPinAndLogin('PCHTST', 'patcher@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/PCHTST', cookie, { lat: 40.7128, lng: -74.006 });
    assert.equal(r.status, 200);
    assert.equal(r.body.lat, 40.7128);

    // Verify the public lookup reflects the change.
    const lookup = await req('GET', '/api/pins/PCHTST');
    assert.equal(lookup.body.lat, 40.7128);
    assert.equal(lookup.body.lng, -74.006);
});

test('PATCH /api/pins/:code returns 401 without session', async () => {
    await createConfirmedPinAndLogin('PATCH2', 'p2@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/PATCH2', '', { lat: 1, lng: 2 });
    assert.equal(r.status, 401);
});

test('PATCH /api/pins/:code returns 403 when session owns a different pin', async () => {
    const aliceCookie = await createConfirmedPinAndLogin('OWN001', 'alice.own@example.com');
    await createConfirmedPinAndLogin('NOTOUR', 'bob.own@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/NOTOUR', aliceCookie, { lat: 1, lng: 2 });
    assert.equal(r.status, 403);
});

test('PATCH /api/pins/:code rejects invalid coords with 400', async () => {
    const cookie = await createConfirmedPinAndLogin('BADCOR', 'bad@example.com');
    const r = await reqWithCookie('PATCH', '/api/pins/BADCOR', cookie, { lat: 999, lng: 0 });
    assert.equal(r.status, 400);
});

test('DELETE /api/pins/:code removes the pin, retires the shortcode', async () => {
    const cookie = await createConfirmedPinAndLogin('DELTST', 'del@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/DELTST', cookie);
    assert.equal(r.status, 204);
    // Lookup 404s (pin gone).
    const lookup = await req('GET', '/api/pins/DELTST');
    assert.equal(lookup.status, 404);
    // Trying to re-create with the same shortcode is blocked (retired).
    const recreate = await req('POST', '/api/pins', {
        lat: 1, lng: 2, email: 'someone@new.com', shortcode: 'DELTST',
    });
    assert.equal(recreate.status, 409);
    assert.equal(recreate.body.error, 'shortcode_taken');
});

test('DELETE /api/pins/:code returns 401 without session', async () => {
    await createConfirmedPinAndLogin('DELAUT', 'da@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/DELAUT', '');
    assert.equal(r.status, 401);
});

test('DELETE /api/pins/:code returns 403 when session does not own the pin', async () => {
    const aliceCookie = await createConfirmedPinAndLogin('AL0001', 'alice.del@example.com');
    await createConfirmedPinAndLogin('BO0001', 'bob.del@example.com');
    const r = await reqWithCookie('DELETE', '/api/pins/BO0001', aliceCookie);
    assert.equal(r.status, 403);
});

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
