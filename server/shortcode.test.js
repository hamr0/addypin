import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeShortcode, isValidShortcode, isBlocklisted,
    generateShortcode, generateAvailableShortcode, suggestNext,
} from './shortcode.js';

// ─── normalize / validate ────────────────────────────────────────────────────

test('normalizeShortcode trims and uppercases', () => {
    assert.equal(normalizeShortcode(' house1 '), 'HOUSE1');
    assert.equal(normalizeShortcode('house1'), 'HOUSE1');
    assert.equal(normalizeShortcode('HOUSE1'), 'HOUSE1');
});

test('normalizeShortcode returns null for non-strings', () => {
    assert.equal(normalizeShortcode(null), null);
    assert.equal(normalizeShortcode(123), null);
    assert.equal(normalizeShortcode(undefined), null);
});

test('isValidShortcode accepts 6 uppercase alphanumeric only', () => {
    assert.equal(isValidShortcode('HOUSE1'), true);
    assert.equal(isValidShortcode('A1B2C3'), true);
    assert.equal(isValidShortcode('000000'), true);
    assert.equal(isValidShortcode('HOUSE'), false);   // too short
    assert.equal(isValidShortcode('HOUSE12'), false); // too long
    assert.equal(isValidShortcode('house1'), false);  // lowercase
    assert.equal(isValidShortcode('HOUSE!'), false);  // symbol
    assert.equal(isValidShortcode(''), false);
    assert.equal(isValidShortcode(null), false);
});

// ─── blocklist ──────────────────────────────────────────────────────────────

test('isBlocklisted catches reserved routing names', () => {
    assert.equal(isBlocklisted('LOGIN0'), true);
    assert.equal(isBlocklisted('MANAGE'), true);
    assert.equal(isBlocklisted('CONFRM'), true);
});

test('isBlocklisted catches brand impersonation', () => {
    assert.equal(isBlocklisted('GOOGLE'), true);
    assert.equal(isBlocklisted('POLICE'), true);
});

test('isBlocklisted returns false for ordinary codes', () => {
    assert.equal(isBlocklisted('HOUSE1'), false);
    assert.equal(isBlocklisted('A1B2C3'), false);
});

// ─── generateShortcode ─────────────────────────────────────────────────────

test('generateShortcode returns a 6-char uppercase alphanumeric code', () => {
    for (let i = 0; i < 100; i++) {
        const code = generateShortcode();
        assert.ok(isValidShortcode(code), `bad code: ${code}`);
    }
});

test('generateShortcode is non-trivially random (low collision rate)', () => {
    const seen = new Set();
    for (let i = 0; i < 1000; i++) seen.add(generateShortcode());
    // 36^6 = 2.2B; collisions in 1000 samples should be near zero.
    assert.ok(seen.size >= 999, `unexpected collisions: ${1000 - seen.size}`);
});

// ─── generateAvailableShortcode ────────────────────────────────────────────

test('generateAvailableShortcode skips unavailable and blocklisted codes', () => {
    let calls = 0;
    const taken = new Set(['HOUSE1', 'HOUSE2']);
    const isAvailable = (code) => { calls++; return !taken.has(code); };
    const code = generateAvailableShortcode(isAvailable);
    assert.ok(isValidShortcode(code));
    assert.ok(!taken.has(code));
    assert.ok(!isBlocklisted(code));
});

test('generateAvailableShortcode throws if predicate always false', () => {
    assert.throws(() => generateAvailableShortcode(() => false, 5));
});

// ─── suggestNext ───────────────────────────────────────────────────────────

test('suggestNext bumps the last char in ALPHABET order', () => {
    assert.equal(suggestNext('HOUSE1'), 'HOUSE2');
    assert.equal(suggestNext('HOUSE9'), 'HOUSEA');
    assert.equal(suggestNext('HOUSEY'), 'HOUSEZ');
    assert.equal(suggestNext('HOUSEZ'), 'HOUSE0'); // wraps to '0'
    assert.equal(suggestNext('AAAA0A'), 'AAAA0B');
});

test('suggestNext returns null for invalid input', () => {
    assert.equal(suggestNext('house1'), null);    // lowercase
    assert.equal(suggestNext('TOOLONG'), null);
    assert.equal(suggestNext(null), null);
});
