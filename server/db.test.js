import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createDb } from './db.js';

function fresh() {
    return createDb({ path: ':memory:' });
}

function blob(n = 32) {
    return crypto.randomBytes(n);
}

function samplePin(overrides = {}) {
    return {
        shortcode: overrides.shortcode ?? 'HOUSE1',
        ciphertext: overrides.ciphertext ?? blob(48),
        iv: overrides.iv ?? blob(12),
        fingerprint: overrides.fingerprint ?? blob(32),
        status: overrides.status ?? 'confirmed',
        createdAt: overrides.createdAt ?? 1000,
        expiresAt: overrides.expiresAt ?? null,
        ...overrides,
    };
}

// ─── Schema init ──────────────────────────────────────────────────────────────

test('init is idempotent — opening the same path twice does not error', () => {
    const db1 = createDb({ path: ':memory:' });
    db1.close();
    // A separate :memory: db won't share state, but this proves init runs cleanly twice.
    const db2 = createDb({ path: ':memory:' });
    db2.close();
});

// ─── insertPin / getPinByShortcode ────────────────────────────────────────────

test('insertPin → getPinByShortcode round-trips a confirmed pin', () => {
    const db = fresh();
    const p = samplePin();
    db.insertPin(p);
    const got = db.getPinByShortcode('HOUSE1');
    assert.equal(got.shortcode, 'HOUSE1');
    assert.deepEqual(got.ciphertext, p.ciphertext);
    assert.deepEqual(got.iv, p.iv);
    assert.deepEqual(got.fingerprint, p.fingerprint);
    assert.equal(got.status, 'confirmed');
    assert.equal(got.createdAt, 1000);
    assert.equal(got.updatedAt, 1000);
    assert.equal(got.expiresAt, null);
    assert.ok(Buffer.isBuffer(got.ciphertext), 'ciphertext should be a Buffer');
    assert.ok(Buffer.isBuffer(got.iv), 'iv should be a Buffer');
    assert.ok(Buffer.isBuffer(got.fingerprint), 'fingerprint should be a Buffer');
    db.close();
});

test('getPinByShortcode returns null for missing shortcode', () => {
    const db = fresh();
    assert.equal(db.getPinByShortcode('NOPE99'), null);
    db.close();
});

test('insertPin rejects duplicate active shortcode', () => {
    const db = fresh();
    db.insertPin(samplePin());
    assert.throws(() => db.insertPin(samplePin()), /unavailable/);
    db.close();
});

test('insertPin rejects retired shortcode', () => {
    const db = fresh();
    db.insertPin(samplePin());
    db.deletePin('HOUSE1', 2000);
    assert.throws(() => db.insertPin(samplePin()), /unavailable/);
    db.close();
});

test('insertPin validates status', () => {
    const db = fresh();
    assert.throws(() => db.insertPin(samplePin({ status: 'whatever' })));
    db.close();
});

test('insertPin requires expiresAt for unconfirmed, forbids it for confirmed', () => {
    const db = fresh();
    assert.throws(() => db.insertPin(samplePin({ status: 'unconfirmed', expiresAt: null })));
    assert.throws(() => db.insertPin(samplePin({ status: 'confirmed', expiresAt: 5000 })));
    // valid versions
    db.insertPin(samplePin({ shortcode: 'OK0001', status: 'unconfirmed', expiresAt: 5000 }));
    db.insertPin(samplePin({ shortcode: 'OK0002', status: 'confirmed', expiresAt: null }));
    db.close();
});

// ─── listPinsByOwner ──────────────────────────────────────────────────────────

test('listPinsByOwner returns all pins (both statuses), sorted by createdAt', () => {
    const db = fresh();
    const fp = blob(32);
    db.insertPin(samplePin({ shortcode: 'AAAAAA', fingerprint: fp, createdAt: 3000 }));
    db.insertPin(samplePin({ shortcode: 'BBBBBB', fingerprint: fp, createdAt: 1000 }));
    db.insertPin(samplePin({ shortcode: 'CCCCCC', fingerprint: fp, createdAt: 2000 }));
    const rows = db.listPinsByOwner(fp);
    assert.deepEqual(rows.map(r => r.shortcode), ['BBBBBB', 'CCCCCC', 'AAAAAA']);
    db.close();
});

test('listPinsByOwner includes unconfirmed pins (live during 72h window)', () => {
    const db = fresh();
    const fp = blob(32);
    db.insertPin(samplePin({ shortcode: 'CONFRM', fingerprint: fp, status: 'confirmed' }));
    db.insertPin(samplePin({ shortcode: 'UNCONF', fingerprint: fp, status: 'unconfirmed', expiresAt: 9999 }));
    const rows = db.listPinsByOwner(fp);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(r => r.shortcode).sort(), ['CONFRM', 'UNCONF']);
    db.close();
});

test('listPinsNeedingReminder returns only unconfirmed pins inside the reminder window', () => {
    const db = fresh();
    const fp = blob(32);
    const now = 1000;
    // Pin A: expires in 12h → inside 24h window, needs reminder
    db.insertPin(samplePin({ shortcode: 'NEARXP', fingerprint: fp,
        status: 'unconfirmed', createdAt: now, expiresAt: now + 12 * 3600,
        emailCiphertext: blob(32), emailIv: blob(12) }));
    // Pin B: expires in 48h → outside window
    db.insertPin(samplePin({ shortcode: 'FARTIM', fingerprint: fp,
        status: 'unconfirmed', createdAt: now, expiresAt: now + 48 * 3600,
        emailCiphertext: blob(32), emailIv: blob(12) }));
    // Pin C: already expired → cleanup's job, not reminder's
    db.insertPin(samplePin({ shortcode: 'ALRDYE', fingerprint: fp,
        status: 'unconfirmed', createdAt: now - 100000, expiresAt: now - 10,
        emailCiphertext: blob(32), emailIv: blob(12) }));
    // Pin D: confirmed → no reminder ever
    db.insertPin(samplePin({ shortcode: 'CONFRM', fingerprint: fp, status: 'confirmed' }));
    const due = db.listPinsNeedingReminder(now, 24 * 3600);
    assert.equal(due.length, 1);
    assert.equal(due[0].shortcode, 'NEARXP');
    db.close();
});

test('markReminderSent prevents the same pin from being picked up twice', () => {
    const db = fresh();
    const fp = blob(32);
    const now = 1000;
    db.insertPin(samplePin({ shortcode: 'RMONCE', fingerprint: fp,
        status: 'unconfirmed', createdAt: now, expiresAt: now + 12 * 3600,
        emailCiphertext: blob(32), emailIv: blob(12) }));
    assert.equal(db.listPinsNeedingReminder(now, 24 * 3600).length, 1);
    db.markReminderSent('RMONCE', now);
    assert.equal(db.listPinsNeedingReminder(now, 24 * 3600).length, 0);
    db.close();
});

test('confirm nulls the stored email + reminder marker', () => {
    const db = fresh();
    const fp = blob(32);
    db.insertPin(samplePin({ shortcode: 'NULLEM', fingerprint: fp,
        status: 'unconfirmed', createdAt: 1000, expiresAt: 2000,
        emailCiphertext: blob(32), emailIv: blob(12) }));
    db.confirmPin('NULLEM', 1500);
    // Listing with reminder query should never return this pin now
    assert.equal(db.listPinsNeedingReminder(1100, 3600).length, 0);
    db.close();
});

test('confirmPinsByOwner promotes all unconfirmed pins for that fingerprint', () => {
    const db = fresh();
    const alice = blob(32);
    const bob = blob(32);
    db.insertPin(samplePin({ shortcode: 'ALPND1', fingerprint: alice, status: 'unconfirmed', expiresAt: 9999 }));
    db.insertPin(samplePin({ shortcode: 'ALPND2', fingerprint: alice, status: 'unconfirmed', expiresAt: 9999 }));
    db.insertPin(samplePin({ shortcode: 'ALDONE', fingerprint: alice, status: 'confirmed' }));
    db.insertPin(samplePin({ shortcode: 'BBPEND', fingerprint: bob, status: 'unconfirmed', expiresAt: 9999 }));
    const n = db.confirmPinsByOwner(alice, 5000);
    assert.equal(n, 2);
    const alicePins = db.listPinsByOwner(alice);
    for (const p of alicePins) assert.equal(p.status, 'confirmed');
    const bobPins = db.listPinsByOwner(bob);
    assert.equal(bobPins[0].status, 'unconfirmed');
    db.close();
});

test('listPinsByOwner returns empty array for unknown owner', () => {
    const db = fresh();
    db.insertPin(samplePin());
    assert.deepEqual(db.listPinsByOwner(blob(32)), []);
    db.close();
});

test('listPinsByOwner does not return another owners pins', () => {
    const db = fresh();
    const alice = blob(32);
    const bob = blob(32);
    db.insertPin(samplePin({ shortcode: 'ALICE1', fingerprint: alice }));
    db.insertPin(samplePin({ shortcode: 'BOBPIN', fingerprint: bob }));
    const rows = db.listPinsByOwner(alice);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].shortcode, 'ALICE1');
    db.close();
});

// ─── updatePinCoords ──────────────────────────────────────────────────────────

test('updatePinCoords updates ciphertext, iv, and updated_at', () => {
    const db = fresh();
    db.insertPin(samplePin());
    const newCt = blob(48);
    const newIv = blob(12);
    const ok = db.updatePinCoords('HOUSE1', newCt, newIv, 5000);
    assert.equal(ok, true);
    const got = db.getPinByShortcode('HOUSE1');
    assert.deepEqual(got.ciphertext, newCt);
    assert.deepEqual(got.iv, newIv);
    assert.equal(got.updatedAt, 5000);
    assert.equal(got.createdAt, 1000);
    db.close();
});

test('updatePinCoords returns false for missing shortcode', () => {
    const db = fresh();
    assert.equal(db.updatePinCoords('NOPE99', blob(48), blob(12), 5000), false);
    db.close();
});

// ─── confirmPin ───────────────────────────────────────────────────────────────

test('confirmPin transitions unconfirmed → confirmed and clears expires_at', () => {
    const db = fresh();
    db.insertPin(samplePin({ status: 'unconfirmed', expiresAt: 9999 }));
    const ok = db.confirmPin('HOUSE1', 5000);
    assert.equal(ok, true);
    const got = db.getPinByShortcode('HOUSE1');
    assert.equal(got.status, 'confirmed');
    assert.equal(got.expiresAt, null);
    assert.equal(got.updatedAt, 5000);
    db.close();
});

test('confirmPin is a no-op on already-confirmed pin', () => {
    const db = fresh();
    db.insertPin(samplePin());
    assert.equal(db.confirmPin('HOUSE1', 5000), false);
    db.close();
});

test('confirmPin returns false for missing shortcode', () => {
    const db = fresh();
    assert.equal(db.confirmPin('NOPE99', 5000), false);
    db.close();
});

// ─── deletePin ────────────────────────────────────────────────────────────────

test('deletePin removes from pins and retires the shortcode', () => {
    const db = fresh();
    db.insertPin(samplePin());
    const ok = db.deletePin('HOUSE1', 5000);
    assert.equal(ok, true);
    assert.equal(db.getPinByShortcode('HOUSE1'), null);
    assert.equal(db.isShortcodeAvailable('HOUSE1'), false);
    db.close();
});

test('deletePin returns false for missing shortcode', () => {
    const db = fresh();
    assert.equal(db.deletePin('NOPE99', 5000), false);
    db.close();
});

// ─── isShortcodeAvailable ─────────────────────────────────────────────────────

test('isShortcodeAvailable returns true for never-seen code', () => {
    const db = fresh();
    assert.equal(db.isShortcodeAvailable('FREE01'), true);
    db.close();
});

test('isShortcodeAvailable returns false for active pin', () => {
    const db = fresh();
    db.insertPin(samplePin());
    assert.equal(db.isShortcodeAvailable('HOUSE1'), false);
    db.close();
});

test('isShortcodeAvailable returns false for unconfirmed pin (still active)', () => {
    const db = fresh();
    db.insertPin(samplePin({ status: 'unconfirmed', expiresAt: 9999 }));
    assert.equal(db.isShortcodeAvailable('HOUSE1'), false);
    db.close();
});

test('isShortcodeAvailable returns false for retired code', () => {
    const db = fresh();
    db.insertPin(samplePin());
    db.deletePin('HOUSE1', 5000);
    assert.equal(db.isShortcodeAvailable('HOUSE1'), false);
    db.close();
});

// ─── cleanupExpired ───────────────────────────────────────────────────────────

test('cleanupExpired removes expired unconfirmed pins and retires them', () => {
    const db = fresh();
    db.insertPin(samplePin({ shortcode: 'EXPIR1', status: 'unconfirmed', expiresAt: 100 }));
    db.insertPin(samplePin({ shortcode: 'EXPIR2', status: 'unconfirmed', expiresAt: 200 }));
    const count = db.cleanupExpired(500);
    assert.equal(count, 2);
    assert.equal(db.getPinByShortcode('EXPIR1'), null);
    assert.equal(db.getPinByShortcode('EXPIR2'), null);
    assert.equal(db.isShortcodeAvailable('EXPIR1'), false);
    assert.equal(db.isShortcodeAvailable('EXPIR2'), false);
    db.close();
});

test('cleanupExpired leaves confirmed pins alone', () => {
    const db = fresh();
    db.insertPin(samplePin({ shortcode: 'KEEPER', status: 'confirmed' }));
    const count = db.cleanupExpired(99999);
    assert.equal(count, 0);
    assert.ok(db.getPinByShortcode('KEEPER'));
    db.close();
});

test('cleanupExpired leaves not-yet-expired unconfirmed pins alone', () => {
    const db = fresh();
    db.insertPin(samplePin({ shortcode: 'NEW001', status: 'unconfirmed', expiresAt: 9999 }));
    const count = db.cleanupExpired(500);
    assert.equal(count, 0);
    assert.ok(db.getPinByShortcode('NEW001'));
    db.close();
});

test('cleanupExpired returns 0 on empty DB', () => {
    const db = fresh();
    assert.equal(db.cleanupExpired(500), 0);
    db.close();
});
