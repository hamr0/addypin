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

// Expiry tick: runs reminders (24h before expiry) and cleans up pins
// past their 72h window. Called at boot and hourly. Both phases are
// transactional/idempotent — overlapping ticks are safe.
const REMINDER_WINDOW_SEC = 24 * 60 * 60; // remind when <= 24h remaining
const CONFIRM_TTL_SEC = 72 * 60 * 60;

async function sweep() {
    const nowSec = Math.floor(Date.now() / 1000);

    // 1. reminders — only runs once mailer is ready (see bottom of file).
    if (mailerReady) {
        try {
            const due = db.listPinsNeedingReminder(nowSec, REMINDER_WINDOW_SEC);
            for (const p of due) {
                try {
                    const email = crypto.decryptEmail(p.emailCiphertext, p.emailIv);
                    const token = crypto.signToken({ shortcode: p.shortcode, action: 'confirm' }, CONFIRM_TTL_SEC);
                    const confirmUrl = `${cfg.baseUrl.replace(/\/$/, '')}/confirm?token=${encodeURIComponent(token)}`;
                    const hoursLeft = Math.max(1, Math.round((p.expiresAt - nowSec) / 3600));
                    await mailer.sendExpiryReminder({ to: email, shortcode: p.shortcode, confirmUrl, hoursLeft });
                    db.markReminderSent(p.shortcode, nowSec);
                    console.log(`[reminder] sent for ${p.shortcode} (${hoursLeft}h left)`);
                } catch (e) {
                    console.error(`[reminder] ${p.shortcode}: ${e.message}`);
                }
            }
        } catch (e) {
            console.error(`[reminder] pass: ${e.message}`);
        }
    }

    // 2. cleanup
    try {
        const n = db.cleanupExpired(nowSec);
        if (n > 0) console.log(`[cleanup] retired ${n} expired unconfirmed pin(s)`);
    } catch (e) {
        console.error(`[cleanup] ${e.message}`);
    }
}
let mailerReady = false;
// kick off initial sweep on next tick so mailer can be created first
setImmediate(() => { sweep(); });
setInterval(sweep, 60 * 60 * 1000).unref();

// Pick the mail transport at boot. msmtp on the VPS, console fallback in dev.
const transport = pickTransport();
const mailer = createMailer({
    from: cfg.mailFromAddress,
    fromName: cfg.mailFromName,
    transport,
});
mailerReady = true;

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
