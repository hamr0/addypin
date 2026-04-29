import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createCrypto } from './crypto.js';

function fresh() {
    return { dataKey: crypto.randomBytes(32) };
}

// ─── createCrypto validation ──────────────────────────────────────────────────

test('createCrypto rejects wrong-size keys', () => {
    assert.throws(() => createCrypto({ dataKey: crypto.randomBytes(16) }));
    assert.throws(() => createCrypto({ dataKey: crypto.randomBytes(64) }));
    assert.throws(() => createCrypto({ dataKey: Buffer.alloc(0) }));
});

test('createCrypto rejects non-Buffer keys', () => {
    assert.throws(() => createCrypto({ dataKey: 'a'.repeat(64) }));
    assert.throws(() => createCrypto({ dataKey: null }));
    assert.throws(() => createCrypto({ dataKey: undefined }));
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
    assert.throws(() => c.decryptCoords(Buffer.alloc(10), crypto.randomBytes(12)));
    assert.throws(() => c.decryptCoords(Buffer.alloc(32), Buffer.alloc(8)));
    assert.throws(() => c.decryptCoords(Buffer.alloc(32), 'not a buffer'));
});

test('decryptCoords with a different dataKey fails', () => {
    const a = createCrypto(fresh());
    const b = createCrypto(fresh());
    const { ciphertext, iv } = a.encryptCoords(5, 5);
    assert.throws(() => b.decryptCoords(ciphertext, iv));
});

// ─── encryptEmail / decryptEmail ──────────────────────────────────────────────
// Used for the 72h reminder window: addypin keeps an encrypted copy of
// the owner email on unconfirmed pins so the sweeper can compose the
// pre-expiry reminder. Confirmed pins null these columns.

test('encrypt/decrypt round-trips an email', () => {
    const c = createCrypto(fresh());
    const { ciphertext, iv } = c.encryptEmail('alice@example.com');
    assert.equal(c.decryptEmail(ciphertext, iv), 'alice@example.com');
});

test('encryptEmail rejects non-string input', () => {
    const c = createCrypto(fresh());
    assert.throws(() => c.encryptEmail(null));
    assert.throws(() => c.encryptEmail(42));
});

test('decryptEmail rejects tampered ciphertext', () => {
    const c = createCrypto(fresh());
    const { ciphertext, iv } = c.encryptEmail('a@b.com');
    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 1;
    assert.throws(() => c.decryptEmail(tampered, iv));
});
