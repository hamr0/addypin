// Production entry point. Loads env, wires modules, listens.
// Run via:  npm start    (which sets --experimental-sqlite for now)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createDb } from './db.js';
import { createCrypto } from './crypto.js';
import { createRateLimiter } from './ratelimit.js';
import { createServer } from './http.js';
import { createMailer, msmtpTransport, consoleTransport } from './mail.js';

loadDotenv();

const cfg = {
    port: parseInt(process.env.PORT || '3000', 10),
    dataDir: process.env.DATA_DIR || './data',
    baseUrl: process.env.BASE_URL || '',
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@addypin.com',
    mailFromName: process.env.MAIL_FROM_NAME || 'addypin',
    dataKey: hexKey('ADDYPIN_DATA_KEY'),
    emailKey: hexKey('ADDYPIN_EMAIL_KEY'),
    signingKey: hexKey('ADDYPIN_SIGNING_KEY'),
};

fs.mkdirSync(cfg.dataDir, { recursive: true });

const db = createDb({ path: path.join(cfg.dataDir, 'addypin.db') });
const crypto = createCrypto({
    dataKey: cfg.dataKey,
    emailKey: cfg.emailKey,
    signingKey: cfg.signingKey,
});

// Per PRD §8.
const limiters = {
    create: createRateLimiter({ capacity: 5, refillPerSec: 5 / 3600 }),    // 5/hr per IP
    lookup: createRateLimiter({ capacity: 300, refillPerSec: 300 / 900 }), // 300/15min per IP
    login:  createRateLimiter({ capacity: 3, refillPerSec: 3 / 3600 }),    // 3/hr per email fp
};
setInterval(() => {
    limiters.create.gc(); limiters.lookup.gc(); limiters.login.gc();
}, 5 * 60 * 1000).unref();

// Pick the mail transport at boot. msmtp on the VPS, console fallback in dev.
const transport = pickTransport();
const mailer = createMailer({
    from: cfg.mailFromAddress,
    fromName: cfg.mailFromName,
    transport,
});

const server = createServer({ db, crypto, limiters, mailer, baseUrl: cfg.baseUrl });
server.listen(cfg.port, () => {
    console.log(`addypin listening on :${cfg.port}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        console.log(`${sig} received, shutting down`);
        server.close(() => { db.close(); process.exit(0); });
    });
}

// ─── env loading (no dotenv dependency) ────────────────────────────────────────

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
    if (!v) throw new Error(`${name} is required (see .env.example)`);
    if (!/^[0-9a-f]{64}$/i.test(v)) throw new Error(`${name} must be 64 hex chars`);
    return Buffer.from(v, 'hex');
}

function pickTransport() {
    try {
        execSync('command -v msmtp', { stdio: 'ignore' });
        console.log('mail: msmtp found, using it for outbound');
        return msmtpTransport({ from: cfg.mailFromAddress, fromName: cfg.mailFromName });
    } catch {
        console.log('mail: msmtp NOT found, falling back to console transport (no real emails)');
        return consoleTransport();
    }
}
