import crypto from 'node:crypto';
import { BLOCKLIST } from './blocklist.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LENGTH = 6;
const PATTERN = /^[A-Z0-9]{6}$/;

export function normalizeShortcode(s) {
    if (typeof s !== 'string') return null;
    return s.trim().toUpperCase();
}

export function isValidShortcode(s) {
    return typeof s === 'string' && PATTERN.test(s);
}

export function isBlocklisted(s) {
    return BLOCKLIST.has(s);
}

export function generateShortcode() {
    // Uniform sample over 36 characters using rejection sampling on
    // crypto.randomBytes, so distribution is unbiased even though
    // 256 mod 36 ≠ 0.
    const chars = [];
    while (chars.length < LENGTH) {
        const buf = crypto.randomBytes(LENGTH * 2);
        for (const byte of buf) {
            if (byte >= 252) continue; // 252 = floor(256/36)*36
            chars.push(ALPHABET[byte % 36]);
            if (chars.length === LENGTH) break;
        }
    }
    return chars.join('');
}

// Generate a shortcode that passes isAvailable(). Caller supplies the
// availability predicate (typically db.isShortcodeAvailable). Throws
// if it can't find one in `attempts` tries — at which point the
// shortcode space is either exhausted (impossibly huge) or the
// predicate is misbehaving.
export function generateAvailableShortcode(isAvailable, attempts = 50) {
    for (let i = 0; i < attempts; i++) {
        const code = generateShortcode();
        if (isBlocklisted(code)) continue;
        if (isAvailable(code)) return code;
    }
    throw new Error(`could not find an available shortcode in ${attempts} attempts`);
}

// Suggest the next sequential variant of a base code. Used by the
// collision UX in PRD §6: user types HOUSE1, taken → suggest HOUSE2,
// HOUSE3, … HOUSEZ. Strategy: bump the last alphanumeric position
// using ALPHABET order. If the suggestion is also unavailable, the
// caller can call again with the suggestion as the new base.
export function suggestNext(base) {
    if (!isValidShortcode(base)) return null;
    const last = base[base.length - 1];
    const idx = ALPHABET.indexOf(last);
    if (idx === -1) return null;
    const nextIdx = (idx + 1) % ALPHABET.length;
    return base.slice(0, -1) + ALPHABET[nextIdx];
}
