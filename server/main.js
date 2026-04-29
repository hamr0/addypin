// Production entry point. Loads env, wires modules, listens.
// Run via:  npm start    (which sets --experimental-sqlite for now)

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { knowless } from 'knowless';
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
    mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'auth@addypin.com',
    mailFromName: process.env.MAIL_FROM_NAME || 'addypin',
    dataKey: hexKey('ADDYPIN_DATA_KEY'),
    // KNOWLESS_SECRET is the renamed ADDYPIN_EMAIL_KEY: the same
    // 32-byte HMAC secret that handles owner-email derivation. v0.1.6
    // hex-decodes it before HMAC, so the secret bytes match what
    // crypto.fingerprint produced under the previous shape.
    knowlessSecret: process.env.KNOWLESS_SECRET || process.env.ADDYPIN_EMAIL_KEY,
};

if (!cfg.knowlessSecret || !/^[0-9a-f]{64}$/i.test(cfg.knowlessSecret)) {
    throw new Error('KNOWLESS_SECRET (or legacy ADDYPIN_EMAIL_KEY) must be 64 hex chars');
}

fs.mkdirSync(cfg.dataDir, { recursive: true });

const db = createDb({ path: path.join(cfg.dataDir, 'addypin.db') });
const crypto = createCrypto({ dataKey: cfg.dataKey });

// knowless owns: magic-link mail, sessions, tokens, handle derivation.
// Mounted on /login, /auth/callback, /logout. POST /api/login is a
// thin JSON wrapper around auth.startLogin in http.js so addypin's
// existing API contract (202 JSON) is preserved.
const auth = knowless({
    secret: cfg.knowlessSecret,
    baseUrl: cfg.baseUrl || `http://localhost:${cfg.port}`,
    from: cfg.mailFromAddress,
    fromName: cfg.mailFromName,  // AF-27: From: addypin <noreply@addypin.com>
    dbPath: path.join(cfg.dataDir, 'knowless.db'),
    cookieName: 'addypin_session',
    cookieDomain: hostnameOf(cfg.baseUrl) || undefined,
    cookieSecure: process.env.NODE_ENV === 'production',
    sessionTtlSeconds: 30 * 24 * 60 * 60,
    tokenTtlSeconds: 15 * 60,
    subject: 'Your addypin login link',  // factory default; pin-creation
                                          // and expiry-reminder paths
                                          // override via subjectOverride.
    bodyFooter: "feedback@addypin.com | we don't keep your email, only a one-way fingerprint",
    // Reminder/confirmation mails shouldn't carry a "Last sign-in"
    // line — they're not login UX. Off everywhere keeps all three
    // outbound shapes uniform.
    includeLastLoginInEmail: false,
    smtpHost: 'localhost',
    smtpPort: 25,
    openRegistration: true,
    trustedProxies: ['127.0.0.1', '::1'],
    devLogMagicLinks: process.env.NODE_ENV !== 'production',
    // In dev all traffic comes from 127.0.0.1 and the default per-IP
    // caps (30 logins/hr, 3 new handles/hr) starve testing within
    // minutes. Disable them locally; production keeps the defaults.
    ...(process.env.NODE_ENV !== 'production' ? {
        maxLoginRequestsPerIpPerHour: 0,
        maxNewHandlesPerIpPerHour: 0,
    } : {}),
    // On magic-link replay or invalid token, knowless 302s to loginPath
    // (default /login). addypin doesn't mount /login (we wrap startLogin
    // in /api/login instead), so let replays fall to /manage — the page
    // either shows the user's pins (if their session is still valid) or
    // the inline login form. No dead-end 404.
    failureRedirect: '/manage',
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

async function sweep() {
    const nowSec = Math.floor(Date.now() / 1000);

    // 1. reminders — fire a fresh magic link with an expiry-flavored
    //    subject. Click → /auth/callback → /manage promotes any pending
    //    pins owned by this handle. Drop reminder mail (no separate
    //    informational mail) — the subject conveys urgency.
    try {
        const due = db.listPinsNeedingReminder(nowSec, REMINDER_WINDOW_SEC);
        for (const p of due) {
            try {
                const email = crypto.decryptEmail(p.emailCiphertext, p.emailIv);
                const hoursLeft = Math.max(1, Math.round((p.expiresAt - nowSec) / 3600));
                await auth.startLogin({
                    email,
                    nextUrl: `${(cfg.baseUrl || '').replace(/\/$/, '')}/manage`,
                    sourceIp: '127.0.0.1',
                    subjectOverride: `Your addypin expires in ${hoursLeft}h: ${p.shortcode}`,
                    // AF-26: body matches subject. Without this, the body
                    // reads "Click to sign in:" under an expiry-warning
                    // subject — confuses the user into thinking it's a
                    // login attempt they didn't make.
                    bodyOverride: ({ url }) =>
                        `Your addypin "${p.shortcode}" expires in ${hoursLeft} hours.\n\n` +
                        `Click to confirm and keep it permanent:\n\n` +
                        `${url}\n\n` +
                        `If you do nothing, the pin and shortcode will be\n` +
                        `retired automatically. The shortcode can never be\n` +
                        `reused after retirement.\n`,
                });
                db.markReminderSent(p.shortcode, nowSec);
                console.log(`[reminder] sent for ${p.shortcode} (${hoursLeft}h left)`);
            } catch (e) {
                console.error(`[reminder] ${p.shortcode}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(`[reminder] pass: ${e.message}`);
    }

    // 2. cleanup
    try {
        const n = db.cleanupExpired(nowSec);
        if (n > 0) console.log(`[cleanup] retired ${n} expired unconfirmed pin(s)`);
    } catch (e) {
        console.error(`[cleanup] ${e.message}`);
    }
}
setImmediate(() => { sweep(); });
setInterval(sweep, 60 * 60 * 1000).unref();

// addypin still owns non-auth outbound: the SHORTCODE@ auto-reply
// (lookup-via-email). msmtp on the VPS, console fallback locally.
const transport = pickTransport();
const mailer = createMailer({
    from: cfg.mailFromAddress,
    fromName: cfg.mailFromName,
    transport,
});

const server = createServer({ db, crypto, limiters, mailer, auth, baseUrl: cfg.baseUrl });
server.listen(cfg.port, () => {
    console.log(`addypin listening on :${cfg.port}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        console.log(`${sig} received, shutting down`);
        server.close(() => { auth.close(); db.close(); process.exit(0); });
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

// Returns the hostname of a URL string, or null if input is empty/invalid.
// Used to derive cookieDomain for knowless from BASE_URL when one is set.
function hostnameOf(url) {
    if (!url) return null;
    try { return new URL(url).hostname; } catch { return null; }
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
