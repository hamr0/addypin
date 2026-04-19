import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { handleInbound, parseRfc5322, extractEmail, extractLocalPart } from './inbound.js';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createMailer } from './mail.js';
import { createRateLimiter } from './ratelimit.js';

// ─── shared setup ──────────────────────────────────────────────────────────

function freshDeps() {
    const db = createDb({ path: ':memory:' });
    const cryptoMod = createCrypto({
        dataKey: crypto.randomBytes(32),
        emailKey: crypto.randomBytes(32),
        signingKey: crypto.randomBytes(32),
    });
    const sent = [];
    const mailer = createMailer({
        from: 'noreply@addypin.com',
        transport: async (to, subject, body) => { sent.push({ to, subject, body }); },
    });
    const limiters = {
        login: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
        resend: createRateLimiter({ capacity: 1000, refillPerSec: 1000 }),
    };
    return { db, crypto: cryptoMod, mailer, sent, limiters, baseUrl: 'https://addypin.com' };
}

// Build a minimal RFC-5322 message.
function msg({ from, to, subject = '', body = '' }) {
    return [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Date: Sun, 19 Apr 2026 10:00:00 +0000`,
        `Message-ID: <test@example.com>`,
        ``,
        body,
    ].join('\r\n');
}

// Create a confirmed pin owned by `email` with shortcode `code`.
function confirmedPin(db, cryptoMod, { code, email, lat = 1, lng = 2 }) {
    const enc = cryptoMod.encryptCoords(lat, lng);
    const fp = cryptoMod.fingerprint(email);
    const now = Math.floor(Date.now() / 1000);
    db.insertPin({
        shortcode: code, ciphertext: enc.ciphertext, iv: enc.iv,
        fingerprint: fp, status: 'confirmed', createdAt: now, expiresAt: null,
    });
}

// Create an unconfirmed pin (within the 72h window) owned by `email`.
function unconfirmedPin(db, cryptoMod, { code, email, lat = 1, lng = 2 }) {
    const enc = cryptoMod.encryptCoords(lat, lng);
    const fp = cryptoMod.fingerprint(email);
    const now = Math.floor(Date.now() / 1000);
    db.insertPin({
        shortcode: code, ciphertext: enc.ciphertext, iv: enc.iv,
        fingerprint: fp, status: 'unconfirmed', createdAt: now, expiresAt: now + 72 * 3600,
    });
}

// ─── parseRfc5322 + helpers ────────────────────────────────────────────────

test('parseRfc5322 extracts From/To/Subject', () => {
    const r = parseRfc5322([
        'From: Alice <alice@example.com>',
        'To: login@addypin.com',
        'Subject: anything',
        '',
        'body text',
    ].join('\r\n'));
    assert.equal(r.headers.from, 'Alice <alice@example.com>');
    assert.equal(r.headers.to, 'login@addypin.com');
    assert.equal(r.headers.subject, 'anything');
});

test('parseRfc5322 unfolds header continuation lines', () => {
    const r = parseRfc5322([
        'From: alice@example.com',
        'Subject: multi',
        ' line subject',
        '\tcontinued',
        'To: login@addypin.com',
        '',
    ].join('\r\n'));
    assert.equal(r.headers.subject, 'multi line subject continued');
});

test('parseRfc5322 handles LF-only line endings', () => {
    const r = parseRfc5322('From: a@b.com\nTo: login@addypin.com\nSubject: hi\n\nbody');
    assert.equal(r.headers.from, 'a@b.com');
    assert.equal(r.headers.to, 'login@addypin.com');
});

test('parseRfc5322 returns null for garbage', () => {
    assert.equal(parseRfc5322(''), null);
    assert.equal(parseRfc5322(null), null);
    assert.equal(parseRfc5322(42), null);
});

test('extractEmail pulls the address out of an angle-form header', () => {
    assert.equal(extractEmail('"Alice Q." <alice@b.com>'), 'alice@b.com');
    assert.equal(extractEmail('alice@b.com'), 'alice@b.com');
    assert.equal(extractEmail('  a@b.com  '), 'a@b.com');
    assert.equal(extractEmail('nothing'), null);
    assert.equal(extractEmail(null), null);
});

test('extractEmail lowercases the address', () => {
    assert.equal(extractEmail('Alice@EXAMPLE.COM'), 'alice@example.com');
});

test('extractLocalPart returns the part before @', () => {
    assert.equal(extractLocalPart('user@example.com'), 'user');
    assert.equal(extractLocalPart('HOUSE1@addypin.com'), 'HOUSE1');
    assert.equal(extractLocalPart('noatsign'), '');
});

// ─── login@ ────────────────────────────────────────────────────────────────

test('login@ with pins sends a login email', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'LGN001', email: 'alice@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'alice@example.com', to: 'login@addypin.com' }),
        ...d,
    });
    assert.equal(r.action, 'sent');
    assert.equal(r.type, 'login');
    assert.equal(d.sent.length, 1);
    assert.equal(d.sent[0].to, 'alice@example.com');
    assert.match(d.sent[0].subject, /login link/i);
    assert.match(d.sent[0].body, /\/manage\?token=/);
});

test('login@ with NO pins is silently dropped (no enumeration)', async () => {
    const d = freshDeps();
    const r = await handleInbound({
        raw: msg({ from: 'stranger@example.com', to: 'login@addypin.com' }),
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'no_pins');
    assert.equal(d.sent.length, 0);
});

test('login@ handles "Display Name <addr>" in From', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'LGN002', email: 'maria@example.com' });
    const r = await handleInbound({
        raw: msg({ from: '"Maria Q." <maria@example.com>', to: 'login@addypin.com' }),
        ...d,
    });
    assert.equal(r.action, 'sent');
});

test('login@ is rate-limited per fingerprint', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'LGN003', email: 'rate@example.com' });
    d.limiters.login = createRateLimiter({ capacity: 2, refillPerSec: 0.00001 });
    for (let i = 0; i < 2; i++) {
        const r = await handleInbound({
            raw: msg({ from: 'rate@example.com', to: 'login@addypin.com' }), ...d,
        });
        assert.equal(r.action, 'sent');
    }
    const r = await handleInbound({
        raw: msg({ from: 'rate@example.com', to: 'login@addypin.com' }), ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'rate_limited');
});

// ─── SHORTCODE@ ────────────────────────────────────────────────────────────

test('SHORTCODE@ replies with coords + map links for a confirmed pin', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'MAPPIN', email: 'o@example.com', lat: 37.7749, lng: -122.4194 });
    const r = await handleInbound({
        raw: msg({ from: 'visitor@example.com', to: 'MAPPIN@addypin.com' }),
        ...d,
    });
    assert.equal(r.action, 'sent');
    assert.equal(r.type, 'shortcode_reply');
    assert.equal(d.sent[0].to, 'visitor@example.com');
    assert.match(d.sent[0].subject, /^Re: MAPPIN$/);
    assert.match(d.sent[0].body, /37\.774900/);
    assert.match(d.sent[0].body, /Google Maps/);
    assert.match(d.sent[0].body, /addypin\.com\/MAPPIN/);
});

test('SHORTCODE@ is case-insensitive on the local part', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'CASECA', email: 'o@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'v@example.com', to: 'caseca@addypin.com' }), ...d,
    });
    assert.equal(r.action, 'sent');
});

test('SHORTCODE@ drops silently for unconfirmed pins', async () => {
    const d = freshDeps();
    unconfirmedPin(d.db, d.crypto, { code: 'UNCNFX', email: 'o@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'v@example.com', to: 'UNCNFX@addypin.com' }), ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'no_such_pin');
    assert.equal(d.sent.length, 0);
});

test('SHORTCODE@ drops for unknown pins', async () => {
    const d = freshDeps();
    const r = await handleInbound({
        raw: msg({ from: 'v@example.com', to: 'NOEXIST@addypin.com' }), ...d,
    });
    assert.equal(r.action, 'drop');
});

// ─── resend@ ───────────────────────────────────────────────────────────────

test('resend@ reissues a confirmation email to the owner', async () => {
    const d = freshDeps();
    unconfirmedPin(d.db, d.crypto, { code: 'RESND1', email: 'owner@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'owner@example.com', to: 'resend@addypin.com', subject: 'RESND1' }),
        ...d,
    });
    assert.equal(r.action, 'sent');
    assert.equal(r.type, 'resend');
    assert.equal(d.sent[0].to, 'owner@example.com');
    assert.match(d.sent[0].subject, /RESND1/);
    assert.match(d.sent[0].body, /\/confirm\?token=/);
});

test('resend@ drops when sender does not own the pin', async () => {
    const d = freshDeps();
    unconfirmedPin(d.db, d.crypto, { code: 'NOTMYN', email: 'owner@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'stranger@example.com', to: 'resend@addypin.com', subject: 'NOTMYN' }),
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'sender_not_owner');
});

test('resend@ drops when pin is already confirmed', async () => {
    const d = freshDeps();
    confirmedPin(d.db, d.crypto, { code: 'DONE01', email: 'owner@example.com' });
    const r = await handleInbound({
        raw: msg({ from: 'owner@example.com', to: 'resend@addypin.com', subject: 'DONE01' }),
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'pin_already_confirmed');
});

test('resend@ drops when subject is not a valid shortcode', async () => {
    const d = freshDeps();
    const r = await handleInbound({
        raw: msg({ from: 'x@example.com', to: 'resend@addypin.com', subject: 'garbage?' }),
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'invalid_subject_code');
});

test('resend@ is rate-limited per shortcode', async () => {
    const d = freshDeps();
    unconfirmedPin(d.db, d.crypto, { code: 'RLIM01', email: 'owner@example.com' });
    d.limiters.resend = createRateLimiter({ capacity: 2, refillPerSec: 0.00001 });
    for (let i = 0; i < 2; i++) {
        const r = await handleInbound({
            raw: msg({ from: 'owner@example.com', to: 'resend@addypin.com', subject: 'RLIM01' }),
            ...d,
        });
        assert.equal(r.action, 'sent');
    }
    const r = await handleInbound({
        raw: msg({ from: 'owner@example.com', to: 'resend@addypin.com', subject: 'RLIM01' }),
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'rate_limited');
});

// ─── unknown / malformed ───────────────────────────────────────────────────

test('unknown local-part (non-shortcode, non-reserved) drops silently', async () => {
    const d = freshDeps();
    const r = await handleInbound({
        raw: msg({ from: 'x@example.com', to: 'hello@addypin.com' }), ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'unknown_route');
});

test('missing From header drops', async () => {
    const d = freshDeps();
    const r = await handleInbound({
        raw: 'To: login@addypin.com\r\nSubject: hi\r\n\r\nbody',
        ...d,
    });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'missing_from_or_to');
});

test('garbage message drops with invalid_message', async () => {
    const d = freshDeps();
    const r = await handleInbound({ raw: '', ...d });
    assert.equal(r.action, 'drop');
    assert.equal(r.reason, 'invalid_message');
});
