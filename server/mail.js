import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

// createMailer({ from, transport }) → { sendConfirmation }
//
// `transport` is required: an async (to, subject, body) → void function.
// We expose two shipping transports:
//   - msmtpTransport: shells out to /usr/bin/msmtp via child_process.
//                     Used in production (and locally if msmtp is
//                     installed).
//   - consoleTransport: prints the message to stdout. Dev convenience
//                       so the create-pin flow works without a mail
//                       binary configured.
// The factory pattern lets tests inject a capturing transport.
export function createMailer({ from, fromName = '', transport }) {
    if (typeof from !== 'string' || !from.includes('@')) {
        throw new Error('from must be an email address');
    }
    if (typeof transport !== 'function') {
        throw new Error('transport must be a function');
    }

    async function sendConfirmation({ to, shortcode, confirmUrl }) {
        const subject = `Confirm your addypin: ${shortcode}`;
        const body = [
            `Click to confirm and keep your pin:`,
            ``,
            confirmUrl,
            ``,
            `Once confirmed, the pin is yours permanently. You can edit or delete it anytime by emailing login@addypin.com.`,
            ``,
            `If you did not create this pin, ignore this email — it auto-deletes within 72 hours.`,
        ].join('\n');
        await transport(to, subject, body);
    }

    async function sendLogin({ to, loginUrl }) {
        const subject = `Your addypin login link`;
        const body = [
            `Click to log in and manage your pins:`,
            ``,
            loginUrl,
            ``,
            `This link expires in 15 minutes and can only be used once.`,
            ``,
            `If you didn't request this, ignore the email — no action is needed.`,
        ].join('\n');
        await transport(to, subject, body);
    }

    // Auto-reply to SHORTCODE@addypin.com with the coordinates and a list of
    // map-app deep links. `links` is the ordered array mapLinks() returns.
    // `address` (optional) is a human-readable reverse-geocoded string —
    // included as a "Near: ..." line when present. Falls back to coords-only
    // when null/empty (geocoding failed, degraded gracefully).
    async function sendShortcodeReply({ to, shortcode, lat, lng, address, links, webUrl }) {
        const subject = `Re: ${shortcode}`;
        const linkLines = links.map((l) => `  ${l.name.padEnd(18)} ${l.url}`).join('\n');
        const lines = [`${shortcode} is at ${lat.toFixed(6)}, ${lng.toFixed(6)}.`];
        if (address) lines.push(`Near: ${address}`);
        lines.push('', 'Open in your map app:', linkLines, '', `Web: ${webUrl}`);
        await transport(to, subject, lines.join('\n'));
    }

    async function sendExpiryReminder({ to, shortcode, confirmUrl, hoursLeft }) {
        const subject = `Your addypin expires in ${hoursLeft}h: ${shortcode}`;
        const body = [
            `Reminder — the pin "${shortcode}" will expire in about ${hoursLeft} hours`,
            `and will be permanently deleted if it isn't confirmed first.`,
            ``,
            `Confirm and keep it forever:`,
            ``,
            confirmUrl,
            ``,
            `After expiry the shortcode is retired and cannot be reused —`,
            `nobody will be able to claim the same code later.`,
        ].join('\n');
        await transport(to, subject, body);
    }

    return { sendConfirmation, sendLogin, sendShortcodeReply, sendExpiryReminder };
}

// Format an RFC-5322 message and pipe it into msmtp's stdin.
// msmtp reads To/From/Subject from headers when invoked with
// --read-recipients (or the recipient as a positional arg).
export function msmtpTransport({ from, fromName = '', bin = 'msmtp' }) {
    const fromHeader = fromName ? `"${escapeQuoted(fromName)}" <${from}>` : from;
    const fromDomain = from.split('@')[1] || 'localhost';

    return async function send(to, subject, body) {
        const message = [
            `From: ${fromHeader}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${fromDomain}>`,
            `MIME-Version: 1.0`,
            `Content-Type: text/plain; charset=utf-8`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            body,
        ].join('\r\n');

        await new Promise((resolve, reject) => {
            const child = spawn(bin, ['--from', from, to], { stdio: ['pipe', 'ignore', 'pipe'] });
            let stderr = '';
            child.stderr.on('data', (d) => { stderr += d; });
            child.on('error', reject); // ENOENT here if `bin` isn't on PATH
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`msmtp exited ${code}: ${stderr.trim()}`));
            });
            child.stdin.write(message);
            child.stdin.end();
        });
    };
}

// Dev fallback: log the message instead of sending it.
// Use when msmtp isn't installed or when iterating locally.
export function consoleTransport() {
    return async function send(to, subject, body) {
        const sep = '─'.repeat(60);
        console.log(`\n${sep}\n📧 EMAIL (would send via real transport)\n${sep}`);
        console.log(`To:      ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`${sep}`);
        console.log(body);
        console.log(`${sep}\n`);
    };
}

function escapeQuoted(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
