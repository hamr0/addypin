// CLI entry point for Postfix pipe transport.
//
// Postfix pipes the full RFC-5322 message to this script's stdin. The
// process reads everything, dispatches via handleInbound, logs the
// outcome (single line to stderr, consumed by journald), and exits 0.
// We never bounce — postfix sees success and stops trying.
//
// Used from the VPS's Postfix master.cf as:
//
//   addypin   unix  -       n       n       -       -       pipe
//     flags=DRhu user=addypin
//     argv=/usr/bin/env node --experimental-sqlite
//          /opt/addypin/server/inbound-cli.js
//
// Wrapper script shape (loads the env from the system `.env` or pass):
//
//   /opt/addypin/inbound-wrapper.sh  →  sources env, execs node on this file
//
// See docs/00-context/system-state.md for the full Postfix config.

import fs from 'node:fs';
import path from 'node:path';
import { knowless } from 'knowless';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createMailer, msmtpTransport, consoleTransport } from './mail.js';
import { handleInbound } from './inbound.js';
import { execSync } from 'node:child_process';

loadDotenv();

const cfg = {
    dataDir: process.env.DATA_DIR || './data',
    baseUrl: process.env.BASE_URL || '',
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'auth@addypin.com',
    mailFromName: process.env.MAIL_FROM_NAME || 'addypin',
    dataKey: hexKey('ADDYPIN_DATA_KEY'),
    knowlessSecret: process.env.KNOWLESS_SECRET || process.env.ADDYPIN_EMAIL_KEY,
};
if (!cfg.knowlessSecret || !/^[0-9a-f]{64}$/i.test(cfg.knowlessSecret)) {
    throw new Error('KNOWLESS_SECRET (or legacy ADDYPIN_EMAIL_KEY) must be 64 hex chars');
}

const db = createDb({ path: path.join(cfg.dataDir, 'addypin.db') });
const cryptoMod = createCrypto({ dataKey: cfg.dataKey });
const mailer = createMailer({
    from: cfg.mailFromAddress, fromName: cfg.mailFromName, transport: pickTransport(),
});

// One-shot knowless instance for this delivery. Same DB file as the
// long-running web process; better-sqlite3's WAL mode tolerates this.
// maxLoginRequestsPerIpPerHour=0 disables the per-IP cap because every
// inbound call originates from 127.0.0.1 and would starve the bucket.
// Postfix already gates incoming volume upstream.
const auth = knowless({
    secret: cfg.knowlessSecret,
    baseUrl: cfg.baseUrl || 'https://addypin.com',
    from: cfg.mailFromAddress,
    dbPath: path.join(cfg.dataDir, 'knowless.db'),
    smtpHost: 'localhost',
    smtpPort: 25,
    openRegistration: true,
    bodyFooter: "feedback@addypin.com | we don't keep your email, only a one-way fingerprint",
    includeLastLoginInEmail: false,
    subject: 'Your addypin login link',
    maxLoginRequestsPerIpPerHour: 0,
});

const raw = await readStdin();
let result;
try {
    result = await handleInbound({
        raw, db, crypto: cryptoMod, mailer, auth,
        baseUrl: cfg.baseUrl || 'https://addypin.com',
        reverseGeocode: nominatimReverse,
        // No in-process rate limiters — CLI is one-shot per message, so
        // in-memory buckets reset every invocation. Postfix's own queue
        // and upstream delivery limits cap real abuse volume.
        limiters: undefined,
    });
    log('inbound', result);
} catch (e) {
    log('inbound_error', { message: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') });
} finally {
    auth.close();
    db.close();
}

// Best-effort reverse geocode for SHORTCODE@ replies. 5s timeout. If the
// Nominatim call fails, the reply still goes out — just without "Near:".
async function nominatimReverse(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18`;
    const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
            'User-Agent': `addypin/2.0 (${cfg.mailFromAddress})`,
            'Accept-Language': 'en',
        },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
}

// Always exit 0. A non-zero exit causes Postfix to requeue, which for
// an intentional drop (unknown route, no enumeration) would loop forever.
process.exit(0);

// ─── helpers ────────────────────────────────────────────────────────────────

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

function log(kind, data) {
    // Single-line JSON for journald ingestion. stderr so it doesn't
    // confuse any downstream pipes.
    console.error(JSON.stringify({ t: new Date().toISOString(), kind, ...data }));
}

function loadDotenv() {
    try {
        const text = fs.readFileSync('.env', 'utf8');
        for (const line of text.split('\n')) {
            const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (!m) continue;
            if (process.env[m[1]] == null) process.env[m[1]] = m[2];
        }
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
}

function hexKey(name) {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is required`);
    if (!/^[0-9a-f]{64}$/i.test(v)) throw new Error(`${name} must be 64 hex chars`);
    return Buffer.from(v, 'hex');
}

function pickTransport() {
    try {
        execSync('command -v msmtp', { stdio: 'ignore' });
        return msmtpTransport({ from: cfg.mailFromAddress, fromName: cfg.mailFromName });
    } catch {
        return consoleTransport();
    }
}
