// Stress test for the POC.
// Validates the four claims hold at realistic + pessimistic scale,
// and surfaces latency numbers so we know whether the design can
// actually serve traffic without surprises.
//
// Run:  node --experimental-sqlite poc/stress.js

const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_KEY  = crypto.randomBytes(32);
const EMAIL_KEY = crypto.randomBytes(32);
const TOKEN_KEY = crypto.randomBytes(32);

// Dataset shape — deliberately larger than v2 is likely to need in year 1.
const USERS      = 1000;
const PINS_TOTAL = 50000;     // ~50 pins/user average
const LOOKUPS    = 1000;
const DECRYPTS   = 1000;
const IV_SAMPLES = 200000;    // paranoid — check for collisions in many IVs

let failed = 0;
const check = (label, ok, detail = '') => {
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? '  ' + detail : ''}`);
    if (!ok) failed++;
};

const ns = () => process.hrtime.bigint();
const ms = (start) => Number(ns() - start) / 1e6;

// ─── Setup ─────────────────────────────────────────────────────────────────────────────

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
function fingerprint(email) {
    return crypto.createHmac('sha256', EMAIL_KEY)
        .update(email.trim().toLowerCase(), 'utf8')
        .digest();
}

const emails = Array.from({ length: USERS }, (_, i) => `user${i}@example.com`);
const fps = emails.map(fingerprint);

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

// ─── Scale test: 50k pins across 1k users ──────────────────────────────────────────────

const insert = db.prepare(
    `INSERT INTO pins VALUES (?, ?, ?, ?, 'confirmed', ?, ?, NULL)`
);
const ownershipByOwner = new Map();   // fp hex → expected shortcodes[]
const now = Math.floor(Date.now() / 1000);

{
    let t = ns();
    db.exec('BEGIN');
    for (let i = 0; i < PINS_TOTAL; i++) {
        const userIdx = Math.floor(Math.random() * USERS);
        const shortcode = i.toString(36).toUpperCase().padStart(6, '0').slice(0, 6) + '_' + i;
        const e = encryptCoords(37 + Math.random(), -122 + Math.random());
        insert.run(shortcode, e.ciphertext, e.iv, fps[userIdx], now, now);

        const key = fps[userIdx].toString('hex');
        if (!ownershipByOwner.has(key)) ownershipByOwner.set(key, []);
        ownershipByOwner.get(key).push(shortcode);
    }
    db.exec('COMMIT');
    const totalMs = ms(t);
    const perOpMs = totalMs / PINS_TOTAL;
    check(
        `Insert ${PINS_TOTAL} pins in a transaction`,
        totalMs < 60000,
        `total=${totalMs.toFixed(0)}ms  per-insert=${perOpMs.toFixed(3)}ms  (${Math.round(PINS_TOTAL / (totalMs / 1000))}/s)`
    );
}

// Count-sanity: total rows match
{
    const row = db.prepare('SELECT COUNT(*) AS c FROM pins').get();
    check('Row count matches inserts', row.c === PINS_TOTAL, `rows=${row.c}`);
}

// ─── Lookup latency at scale ───────────────────────────────────────────────────────────

{
    const select = db.prepare(
        `SELECT shortcode FROM pins WHERE owner_email_fingerprint = ? ORDER BY shortcode`
    );

    const samples = [];
    let mismatches = 0;
    for (let i = 0; i < LOOKUPS; i++) {
        const userIdx = Math.floor(Math.random() * USERS);
        const fp = fps[userIdx];
        const expected = new Set(ownershipByOwner.get(fp.toString('hex')) || []);

        const t = ns();
        const rows = select.all(fp);
        samples.push(ms(t));

        // Sanity: every returned row must belong to this owner
        if (rows.length !== expected.size) mismatches++;
        else {
            for (const r of rows) if (!expected.has(r.shortcode)) { mismatches++; break; }
        }
    }
    samples.sort((a, b) => a - b);
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    const p50 = samples[Math.floor(samples.length * 0.50)];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p99 = samples[Math.floor(samples.length * 0.99)];
    const max = samples[samples.length - 1];

    check(
        `${LOOKUPS} fingerprint lookups, all correct`,
        mismatches === 0,
        `mismatches=${mismatches}`
    );
    check(
        'Lookup p99 < 5 ms at 50k rows',
        p99 < 5,
        `avg=${avg.toFixed(3)}ms p50=${p50.toFixed(3)}ms p95=${p95.toFixed(3)}ms p99=${p99.toFixed(3)}ms max=${max.toFixed(3)}ms`
    );

    // Plan still uses the index (not a SCAN) at scale
    const plan = db.prepare(
        `EXPLAIN QUERY PLAN SELECT shortcode FROM pins WHERE owner_email_fingerprint = ?`
    ).all(fps[0]);
    const planText = plan.map(r => r.detail).join(' | ');
    check('Query plan uses idx_owner_fp at scale', planText.includes('idx_owner_fp'), `plan="${planText}"`);
}

// ─── Decrypt latency ──────────────────────────────────────────────────────────────────

{
    const rows = db.prepare(
        `SELECT coords_ciphertext, coords_iv FROM pins ORDER BY RANDOM() LIMIT ${DECRYPTS}`
    ).all();

    const samples = [];
    let decryptErrors = 0;
    for (const row of rows) {
        const t = ns();
        try {
            const plaintext = decryptCoords(row.coords_ciphertext, row.coords_iv);
            if (!plaintext.includes(',')) decryptErrors++;
        } catch { decryptErrors++; }
        samples.push(ms(t));
    }
    samples.sort((a, b) => a - b);
    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    const p99 = samples[Math.floor(samples.length * 0.99)];

    check(
        `${DECRYPTS} AES-GCM decrypts all succeed`,
        decryptErrors === 0,
        `errors=${decryptErrors}`
    );
    check(
        'Decrypt p99 < 1 ms',
        p99 < 1,
        `avg=${avg.toFixed(4)}ms p99=${p99.toFixed(4)}ms`
    );
}

// ─── IV uniqueness under volume ────────────────────────────────────────────────────────

{
    const seen = new Set();
    let collisions = 0;
    for (let i = 0; i < IV_SAMPLES; i++) {
        const iv = crypto.randomBytes(12).toString('hex');
        if (seen.has(iv)) collisions++;
        seen.add(iv);
    }
    check(
        `No IV collisions across ${IV_SAMPLES.toLocaleString()} random 96-bit IVs`,
        collisions === 0,
        `collisions=${collisions}`
    );
}

// ─── Token sign/verify at volume ───────────────────────────────────────────────────────

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
    const N = 100000;
    let bad = 0;
    const t = ns();
    for (let i = 0; i < N; i++) {
        const tok = signToken({ shortcode: 'HOUSE' + (i % 10), action: 'confirm' }, 60);
        const v = verifyToken(tok);
        if (!v || v.action !== 'confirm') bad++;
    }
    const total = ms(t);
    check(
        `${N.toLocaleString()} token sign+verify round-trips succeed`,
        bad === 0,
        `bad=${bad}`
    );
    check(
        'Token sign+verify ≥ 20k/s',
        (N / (total / 1000)) >= 20000,
        `rate=${Math.round(N / (total / 1000))}/s total=${total.toFixed(0)}ms`
    );
}

// ─── Summary ───────────────────────────────────────────────────────────────────────────

console.log();
if (failed === 0) {
    console.log('✓ POC holds under stress. Design is sound for Milestone 1.');
    process.exit(0);
} else {
    console.log(`✗ ${failed} stress check(s) failed. Stop and rethink before Milestone 1.`);
    process.exit(1);
}
