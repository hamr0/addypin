// POC — throwaway per AGENT_RULES §POC.
// Validates the four claims from docs/01-product/prd.md §11.
//
// Run:  node --experimental-sqlite poc/poc.js
//
// Expected output: four lines, each ending PASS.
// If any line says FAIL, the design assumption is wrong — stop and rethink.

const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

// Three independent server secrets (in production: env vars).
const DATA_KEY  = crypto.randomBytes(32);  // AES-256 key for coord ciphertext
const EMAIL_KEY = crypto.randomBytes(32);  // HMAC key for email fingerprints
const TOKEN_KEY = crypto.randomBytes(32);  // HMAC key for signed magic-link tokens

let failed = 0;
const check = (label, ok) => {
    console.log(`[${label}] ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) failed++;
};

// ─── Claim 1: AES-256-GCM encrypts and decrypts a "lat,lng" string round-trip ──────────

function encryptCoords(lat, lng) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv);
    const body = Buffer.concat([cipher.update(`${lat},${lng}`, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext: Buffer.concat([body, tag]), iv };
}
function decryptCoords(ciphertext, iv) {
    const tag = ciphertext.subarray(ciphertext.length - 16);
    const body = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', DATA_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

{
    const enc = encryptCoords(37.7749, -122.4194);
    const round = decryptCoords(enc.ciphertext, enc.iv);
    check('1 AES-GCM round-trip', round === '37.7749,-122.4194');

    // Tamper check: flipping one byte must cause auth failure.
    const tampered = Buffer.from(enc.ciphertext);
    tampered[0] ^= 0x01;
    let tamperCaught = false;
    try { decryptCoords(tampered, enc.iv); } catch { tamperCaught = true; }
    check('1b AES-GCM tamper detected', tamperCaught);
}

// ─── Claim 2: HMAC-SHA256 fingerprint is deterministic across emails & case ────────────

function fingerprint(email) {
    return crypto.createHmac('sha256', EMAIL_KEY)
        .update(email.trim().toLowerCase(), 'utf8')
        .digest();
}

{
    const a = fingerprint('Maria@Gmail.COM ');
    const b = fingerprint('maria@gmail.com');
    const c = fingerprint('bob@example.com');
    check('2 HMAC deterministic + case-insensitive', a.equals(b));
    check('2b HMAC distinct for different emails', !a.equals(c));
}

// ─── Claim 3: SQLite finds all pins for one owner via an indexed fingerprint lookup ────

const db = new DatabaseSync(':memory:');
db.exec(`
    CREATE TABLE pins (
        shortcode               TEXT PRIMARY KEY,
        coords_ciphertext       BLOB NOT NULL,
        coords_iv               BLOB NOT NULL,
        owner_email_fingerprint BLOB NOT NULL,
        status                  TEXT NOT NULL,
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL,
        expires_at              INTEGER
    );
    CREATE INDEX idx_owner_fp ON pins (owner_email_fingerprint);
`);

{
    const maria = fingerprint('maria@gmail.com');
    const bob   = fingerprint('bob@example.com');
    const now   = Math.floor(Date.now() / 1000);
    const insert = db.prepare(
        `INSERT INTO pins VALUES (?, ?, ?, ?, 'confirmed', ?, ?, NULL)`
    );

    for (const code of ['HOUSE1', 'WORK22', 'CAFE07']) {
        const e = encryptCoords(37.7749, -122.4194);
        insert.run(code, e.ciphertext, e.iv, maria, now, now);
    }
    const eBob = encryptCoords(40.7128, -74.0060);
    insert.run('BOBPIN', eBob.ciphertext, eBob.iv, bob, now, now);

    const rows = db.prepare(
        `SELECT shortcode FROM pins WHERE owner_email_fingerprint = ? ORDER BY shortcode`
    ).all(maria);
    const codes = rows.map(r => r.shortcode);
    check('3 Indexed lookup by fingerprint', JSON.stringify(codes) === JSON.stringify(['CAFE07', 'HOUSE1', 'WORK22']));

    // Also confirm the index is actually used, not a full scan.
    const plan = db.prepare(
        `EXPLAIN QUERY PLAN SELECT shortcode FROM pins WHERE owner_email_fingerprint = ?`
    ).all(maria);
    const planText = plan.map(r => r.detail).join(' | ');
    check('3b Query uses idx_owner_fp (not SCAN)', planText.includes('idx_owner_fp'));
}

// ─── Claim 4: Signed magic-link tokens verify valid, reject expired, reject tampered ───

function signToken(payload, ttlSec) {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    const bodyB64 = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const sig = crypto.createHmac('sha256', TOKEN_KEY).update(bodyB64).digest('base64url');
    return `${bodyB64}.${sig}`;
}
function verifyToken(token) {
    const [bodyB64, sig] = (token || '').split('.');
    if (!bodyB64 || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_KEY).update(bodyB64).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const body = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
    if (body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
}

{
    const good     = signToken({ shortcode: 'HOUSE1', action: 'confirm' }, 60);
    const expired  = signToken({ shortcode: 'HOUSE1', action: 'confirm' }, -1);
    const tampered = good.slice(0, -4) + 'AAAA';
    const garbage  = 'not-a-token';

    const vGood     = verifyToken(good);
    const vExpired  = verifyToken(expired);
    const vTampered = verifyToken(tampered);
    const vGarbage  = verifyToken(garbage);

    check('4 Valid token verifies',      vGood !== null && vGood.shortcode === 'HOUSE1');
    check('4b Expired token rejected',   vExpired === null);
    check('4c Tampered token rejected',  vTampered === null);
    check('4d Garbage token rejected',   vGarbage === null);
}

console.log(`\n${failed === 0 ? '✓ All POC claims hold.' : `✗ ${failed} failure(s).`} ` +
            `Throw this file away before Milestone 1.`);
process.exit(failed === 0 ? 0 : 1);
