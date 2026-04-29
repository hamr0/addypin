// Inbound email dispatcher. Pure logic — parses an RFC-5322 message
// from a string and routes to one of the three handlers based on the
// local-part of the To: header:
//
//     login@addypin.com     → emit a login magic link (M7 /manage flow)
//     SHORTCODE@addypin.com → auto-reply with coords + map-app links
//     resend@addypin.com    → subject line is a shortcode; regenerate
//                             the confirmation token and resend the
//                             creation email
//     anything else         → silent drop (per PRD §5)
//
// Inputs are injected: db, crypto, mailer, baseUrl, limiters. This lets
// the tests exercise the full dispatch without real IO.
//
// Returned value is always a status object {action, reason?} — never
// throws on malformed mail. Silent drops are the default outcome for
// anything we don't recognize (no bounce, no NDR).

import { normalizeShortcode, isValidShortcode } from './shortcode.js';
import { mapLinks } from './maplinks.js';

export async function handleInbound({ raw, db, crypto, mailer, auth, baseUrl, limiters, reverseGeocode, now = () => Date.now() }) {
    const msg = parseRfc5322(raw);
    if (!msg) return drop('invalid_message');

    const from = extractEmail(msg.headers.from);
    const to = extractEmail(msg.headers.to);
    if (!from || !to) return drop('missing_from_or_to');

    const localPart = extractLocalPart(to).toLowerCase();

    if (localPart === 'login') {
        return handleLogin({ from, db, auth, baseUrl, limiters });
    }
    if (localPart === 'resend') {
        const subject = (msg.headers.subject || '').trim();
        return handleResend({ from, subjectCode: subject, db, auth, baseUrl, limiters });
    }
    // Otherwise treat the local part as a candidate shortcode.
    const code = normalizeShortcode(localPart);
    if (isValidShortcode(code)) {
        return handleShortcode({ from, code, baseUrl, db, crypto, mailer, reverseGeocode });
    }
    return drop('unknown_route');
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function handleLogin({ from, db, auth, baseUrl, limiters }) {
    let handle;
    try { handle = auth.deriveHandle(from); }
    catch { return drop('invalid_email'); } // knowless's strict normalize

    if (limiters?.login && !limiters.login.take(handle)) return drop('rate_limited');

    const pins = db.listPinsByOwner(handle);
    if (pins.length === 0) return drop('no_pins'); // silent — no enumeration

    await auth.startLogin({
        email: from,
        nextUrl: `${normalizeBase(baseUrl)}/manage`,
        sourceIp: '127.0.0.1', // inbound mail; no requesting IP
    });
    return { action: 'sent', type: 'login' };
}

async function handleResend({ from, subjectCode, db, auth, baseUrl, limiters }) {
    const code = normalizeShortcode(subjectCode);
    if (!isValidShortcode(code)) return drop('invalid_subject_code');
    if (limiters?.resend && !limiters.resend.take(code)) return drop('rate_limited');

    const pin = db.getPinByShortcode(code);
    if (!pin) return drop('no_such_pin');
    if (pin.status !== 'unconfirmed') return drop('pin_already_confirmed');

    let handle;
    try { handle = auth.deriveHandle(from); }
    catch { return drop('invalid_email'); }
    if (pin.ownerHandle !== handle) return drop('sender_not_owner');

    // Re-trigger the same confirmation magic-link flow as pin creation.
    // The pin's own expires_at isn't reset — a resend just gives the
    // owner a fresh login link; clicking promotes the pending pin via
    // the /:shortcode handler's promotion path.
    await auth.startLogin({
        email: from,
        nextUrl: `${normalizeBase(baseUrl)}/${code}?confirmed=1`,
        sourceIp: '127.0.0.1',
        subjectOverride: `Confirm your addypin: ${code}`,
        bodyOverride: ({ url }) =>
            `Confirm your addypin "${code}":\n\n` +
            `${url}\n\n` +
            `This link expires in 15 minutes. If you didn't request this,\n` +
            `ignore this email - the pin will auto-delete in 72 hours.\n`,
    });
    return { action: 'sent', type: 'resend' };
}

async function handleShortcode({ from, code, baseUrl, db, crypto, mailer, reverseGeocode }) {
    const pin = db.getPinByShortcode(code);
    if (!pin) return drop('no_such_pin');
    const { lat, lng } = crypto.decryptCoords(pin.ciphertext, pin.iv);
    const links = mapLinks(lat, lng);
    const webUrl = canonicalPinUrl(baseUrl, code);
    // Reverse-geocode is best-effort: if Nominatim is down, slow, or returns
    // nothing, we still send the reply — just without the "Near:" line.
    let address = null;
    if (typeof reverseGeocode === 'function') {
        try { address = await reverseGeocode(lat, lng); } catch { /* graceful */ }
    }
    await mailer.sendShortcodeReply({ to: from, shortcode: code, lat, lng, address, links, webUrl });
    return { action: 'sent', type: 'shortcode_reply' };
}

function drop(reason) { return { action: 'drop', reason }; }
function normalizeBase(b) { return (b || '').replace(/\/$/, '') || 'https://addypin.com'; }

// Canonical share URL for a pin. On real hosts, prefer the subdomain
// shape (`https://CODE.addypin.com`) — matches the inbox-side email
// alias `CODE@addypin.com` and what web/index.html now advertises.
// Local dev falls back to path-based since `*.localhost` won't resolve.
function canonicalPinUrl(baseUrl, code) {
    const base = normalizeBase(baseUrl);
    try {
        const u = new URL(base);
        const isLocal = /^(localhost|127\.|\[)/.test(u.hostname);
        if (isLocal) return `${base}/${code}`;
        const baseDomain = u.hostname.replace(/^www\./, '');
        return `${u.protocol}//${code}.${baseDomain}`;
    } catch {
        return `${base}/${code}`;
    }
}

// ─── RFC-5322 parsing (just enough) ─────────────────────────────────────────
// We only need to read From / To / Subject. Body is ignored. Header
// continuation lines (folded headers per RFC 5322 §2.2.3) are unfolded
// by joining on whitespace. Values are decoded from `=?utf-8?B?...?=`
// encoded-word form minimally — we leave richer cases to future iteration
// since the values we care about (email addresses, shortcodes) are ASCII.

export function parseRfc5322(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return null;
    const headerEnd = raw.search(/\r?\n\r?\n/);
    const headerBlock = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
    const rawLines = headerBlock.split(/\r?\n/);

    // Unfold header continuation lines.
    const lines = [];
    for (const line of rawLines) {
        if (/^[ \t]/.test(line) && lines.length > 0) {
            lines[lines.length - 1] += ' ' + line.trim();
        } else {
            lines.push(line);
        }
    }

    const headers = {};
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx < 1) continue;
        const name = line.slice(0, idx).toLowerCase().trim();
        const value = line.slice(idx + 1).trim();
        // Last occurrence wins (simplification; shouldn't matter for our fields).
        headers[name] = value;
    }
    return { headers };
}

// "Alice <a@b.com>" → "a@b.com"    "a@b.com" → "a@b.com"    undefined → null
export function extractEmail(value) {
    if (typeof value !== 'string') return null;
    const angle = value.match(/<([^>]+)>/);
    const addr = (angle ? angle[1] : value).trim();
    return addr.includes('@') ? addr.toLowerCase() : null;
}

// "user@addypin.com" → "user"    "addypin.com" → ""
export function extractLocalPart(email) {
    if (typeof email !== 'string') return '';
    const at = email.indexOf('@');
    return at === -1 ? '' : email.slice(0, at);
}
