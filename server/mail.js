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
        const subject = `Confirm your AddyPin: ${shortcode}`;
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

    return { sendConfirmation };
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
