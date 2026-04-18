import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCrypto } from './crypto.js';

function fresh() {
    return {
        dataKey: crypto.randomBytes(32),
        emailKey: crypto.randomBytes(32),
        signingKey: crypto.randomBytes(32),
    };
}

// ─── createCrypto validation ──────────────────────────────────────────────────

test('createCrypto rejects wrong-size keys', () => {
    const k = fresh();
    assert.throws(() => createCrypto({ ...k, dataKey: crypto.randomBytes(16) }));
    assert.throws(() => createCrypto({ ...k, emailKey: crypto.randomBytes(64) }));
    assert.throws(() => createCrypto({ ...k, signingKey: Buffer.alloc(0) }));
});

test('createCrypto rejects non-Buffer keys', () => {
    const k = fresh();
    assert.throws(() => createCrypto({ ...k, dataKey: 'a'.repeat(64) }));
    assert.throws(() => createCrypto({ ...k, emailKey: null }));
    assert.throws(() => createCrypto({ ...k, signingKey: undefined }));
});

// ─── encryptCoords / decryptCoords ────────────────────────────────────────────

test('encrypt/decrypt round-trips a typical coordinate', () => {
    const c = createCrypto(fresh());
    const { ciphertext, iv } = c.encryptCoords(37.7749, -122.4194);
    const out = c.decryptCoords(ciphertext, iv);
    assert.equal(out.lat, 37.7749);
    assert.equal(out.lng, -122.4194);
});

test('encrypt/decrypt round-trips edge coordinates', () => {
    const c = createCrypto(fresh());
    for (const [lat, lng] of [[0, 0], [90, 180], [-90, -180], [0.1, 0.2], [-0.000001, 0.000001]]) {
        const { ciphertext, iv } = c.encryptCoords(lat, lng);
        const out = c.decryptCoords(ciphertext, iv);
        assert.equal(out.lat, lat);
        assert.equal(out.lng, lng);
    }
});

test('encryptCoords uses a fresh IV per call (non-deterministic output)', () => {
    const c = createCrypto(fresh());
    const a = c.encryptCoords(1, 2);
    const b = c.encryptCoords(1, 2);
    assert.notDeepEqual(a.iv, b.iv);
    assert.notDeepEqual(a.ciphertext, b.ciphertext);
});

test('encryptCoords rejects non-finite or non-number inputs', () => {
    const c = createCrypto(fresh());
    assert.throws(() => c.encryptCoords(NaN, 0));
    assert.throws(() => c.encryptCoords(0, Infinity));
    assert.throws(() => c.encryptCoords(-Infinity, 0));
    assert.throws(() => c.encryptCoords('hi', 0));
    assert.throws(() => c.encryptCoords(0, null));
    assert.throws(() => c.encryptCoords(undefined, 0));
});

test('decryptCoords rejects tampered ciphertext', () => {
    const c = createCrypto(fresh());
    const { ciphertext, iv } = c.encryptCoords(1, 2);
    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 1;
    assert.throws(() => c.decryptCoords(tampered, iv));
});

test('decryptCoords rejects tampered auth tag', () => {
    const c = createCrypto(fresh());
    const { ciphertext, iv } = c.encryptCoords(1, 2);
    const tampered = Buffer.from(ciphertext);
    tampered[tampered.length - 1] ^= 1;
    assert.throws(() => c.decryptCoords(tampered, iv));
});

test('decryptCoords rejects wrong IV', () => {
    const c = createCrypto(fresh());
    const { ciphertext } = c.encryptCoords(1, 2);
    assert.throws(() => c.decryptCoords(ciphertext, crypto.randomBytes(12)));
});

test('decryptCoords rejects malformed inputs', () => {
    const c = createCrypto(fresh());
    assert.throws(() => c.decryptCoords('not a buffer', crypto.randomBytes(12)));
    assert.throws(() => c.decryptCoords(Buffer.alloc(10), crypto.randomBytes(12))); // too short
    assert.throws(() => c.decryptCoords(Buffer.alloc(32), Buffer.alloc(8))); // bad iv length
    assert.throws(() => c.decryptCoords(Buffer.alloc(32), 'not a buffer'));
});

test('decryptCoords with a different dataKey fails', () => {
    const keys = fresh();
    const a = createCrypto(keys);
    const b = createCrypto({ ...keys, dataKey: crypto.randomBytes(32) });
    const { ciphertext, iv } = a.encryptCoords(5, 5);
    assert.throws(() => b.decryptCoords(ciphertext, iv));
});

// ─── fingerprint ──────────────────────────────────────────────────────────────

test('fingerprint is deterministic', () => {
    const c = createCrypto(fresh());
    const a = c.fingerprint('maria@gmail.com');
    const b = c.fingerprint('maria@gmail.com');
    assert.deepEqual(a, b);
    assert.equal(a.length, 32);
});

test('fingerprint normalizes case and whitespace', () => {
    const c = createCrypto(fresh());
    const a = c.fingerprint('Maria@Gmail.COM');
    const b = c.fingerprint('maria@gmail.com');
    const d = c.fingerprint('  MARIA@gmail.com\t');
    assert.deepEqual(a, b);
    assert.deepEqual(a, d);
});

test('fingerprint differs across distinct emails', () => {
    const c = createCrypto(fresh());
    assert.notDeepEqual(c.fingerprint('a@x.com'), c.fingerprint('b@x.com'));
});

test('fingerprint differs across distinct emailKeys (same email)', () => {
    const keys = fresh();
    const a = createCrypto(keys);
    const b = createCrypto({ ...keys, emailKey: crypto.randomBytes(32) });
    assert.notDeepEqual(a.fingerprint('u@x.com'), b.fingerprint('u@x.com'));
});

test('fingerprint rejects bad input', () => {
    const c = createCrypto(fresh());
    assert.throws(() => c.fingerprint(''));
    assert.throws(() => c.fingerprint('no-at-sign'));
    assert.throws(() => c.fingerprint(null));
    assert.throws(() => c.fingerprint(undefined));
    assert.throws(() => c.fingerprint(42));
    assert.throws(() => c.fingerprint({}));
});

// ─── signToken / verifyToken ──────────────────────────────────────────────────

test('signToken/verifyToken round-trips payload', () => {
    const c = createCrypto(fresh());
    const token = c.signToken({ shortcode: 'HOUSE1', action: 'confirm' }, 60);
    const v = c.verifyToken(token);
    assert.equal(v.shortcode, 'HOUSE1');
    assert.equal(v.action, 'confirm');
    assert.equal(typeof v.exp, 'number');
});

test('verifyToken returns null for expired tokens', () => {
    const c = createCrypto(fresh());
    const token = c.signToken({ x: 1 }, -1);
    assert.equal(c.verifyToken(token), null);
});

test('verifyToken returns null for tampered signature', () => {
    const c = createCrypto(fresh());
    const token = c.signToken({ x: 1 }, 60);
    const tampered = token.slice(0, -4) + 'AAAA';
    assert.equal(c.verifyToken(tampered), null);
});

test('verifyToken returns null for tampered body', () => {
    const c = createCrypto(fresh());
    const token = c.signToken({ x: 1 }, 60);
    const idx = 2;
    const replacement = token[idx] === 'A' ? 'B' : 'A';
    const tampered = token.slice(0, idx) + replacement + token.slice(idx + 1);
    assert.equal(c.verifyToken(tampered), null);
});

test('verifyToken rejects token signed with a different signingKey', () => {
    const keys = fresh();
    const a = createCrypto(keys);
    const b = createCrypto({ ...keys, signingKey: crypto.randomBytes(32) });
    const token = a.signToken({ x: 1 }, 60);
    assert.equal(b.verifyToken(token), null);
});

test('verifyToken handles malformed input', () => {
    const c = createCrypto(fresh());
    for (const bad of [null, undefined, 0, 123, {}, [], '', '.', 'no-dot-here', '.onlydot', 'onlydot.', 'not-base64url!@#.sig']) {
        assert.equal(c.verifyToken(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
});

test('signToken overrides caller-supplied exp with server-computed value', () => {
    const c = createCrypto(fresh());
    const farFuture = 99_999_999_999;
    const token = c.signToken({ exp: farFuture, x: 1 }, 60);
    const v = c.verifyToken(token);
    assert.notEqual(v.exp, farFuture);
    assert(v.exp < farFuture);
    assert.equal(v.x, 1);
});

test('signToken rejects bad payload/ttl', () => {
    const c = createCrypto(fresh());
    assert.throws(() => c.signToken(null, 60));
    assert.throws(() => c.signToken('not-an-object', 60));
    assert.throws(() => c.signToken([], 60));
    assert.throws(() => c.signToken({ x: 1 }, NaN));
    assert.throws(() => c.signToken({ x: 1 }, Infinity));
    assert.throws(() => c.signToken({ x: 1 }, 'soon'));
});
