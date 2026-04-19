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
// See docs/00-context/infra-snapshot.md for the full Postfix config.

import fs from 'node:fs';
import path from 'node:path';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createMailer, msmtpTransport, consoleTransport } from './mail.js';
import { handleInbound } from './inbound.js';
import { execSync } from 'node:child_process';

loadDotenv();

const cfg = {
    dataDir: process.env.DATA_DIR || './data',
    baseUrl: process.env.BASE_URL || '',
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@addypin.com',
    mailFromName: process.env.MAIL_FROM_NAME || 'addypin',
    dataKey: hexKey('ADDYPIN_DATA_KEY'),
    emailKey: hexKey('ADDYPIN_EMAIL_KEY'),
    signingKey: hexKey('ADDYPIN_SIGNING_KEY'),
};

const db = createDb({ path: path.join(cfg.dataDir, 'addypin.db') });
const cryptoMod = createCrypto({
    dataKey: cfg.dataKey, emailKey: cfg.emailKey, signingKey: cfg.signingKey,
});
const mailer = createMailer({
    from: cfg.mailFromAddress, fromName: cfg.mailFromName, transport: pickTransport(),
});

const raw = await readStdin();
let result;
try {
    result = await handleInbound({
        raw, db, crypto: cryptoMod, mailer,
        baseUrl: cfg.baseUrl || 'https://addypin.com',
        // No in-process rate limiters — CLI is one-shot per message, so
        // in-memory buckets reset every invocation. Postfix's own queue
        // and upstream delivery limits cap real abuse volume.
        limiters: undefined,
    });
    log('inbound', result);
} catch (e) {
    log('inbound_error', { message: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') });
} finally {
    db.close();
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
