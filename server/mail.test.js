import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMailer, consoleTransport, msmtpTransport } from './mail.js';

// addypin's mail.js is now slim — knowless owns auth + reminder mail
// (via auth.startLogin with subjectOverride). The remaining sender is
// the SHORTCODE@ auto-reply, a pin-lookup feature, not auth.

// ─── createMailer factory validation ────────────────────────────────────────

test('createMailer rejects bad config', () => {
    assert.throws(() => createMailer({ from: 'noatsign', transport: () => {} }));
    assert.throws(() => createMailer({ from: 'a@b.com', transport: 'nope' }));
    assert.throws(() => createMailer({ from: '', transport: () => {} }));
});

// ─── sendShortcodeReply ─────────────────────────────────────────────────────

test('sendShortcodeReply passes the right args to the transport', async () => {
    const sent = [];
    const m = createMailer({
        from: 'auth@addypin.com',
        transport: async (to, subject, body) => { sent.push({ to, subject, body }); },
    });
    await m.sendShortcodeReply({
        to: 'alice@example.com',
        shortcode: 'HOUSE1',
        lat: 37.7749,
        lng: -122.4194,
        address: 'San Francisco, CA',
        links: [{ name: 'Google Maps', url: 'https://maps.google.com/' }],
        webUrl: 'https://addypin.com/HOUSE1',
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'alice@example.com');
    assert.match(sent[0].subject, /HOUSE1/);
    assert.match(sent[0].body, /37\.774900/);
    assert.match(sent[0].body, /San Francisco/);
    assert.match(sent[0].body, /maps\.google\.com/);
    assert.match(sent[0].body, /addypin\.com\/HOUSE1/);
});

test('sendShortcodeReply omits Near: line when address is null', async () => {
    const sent = [];
    const m = createMailer({
        from: 'auth@addypin.com',
        transport: async (to, subject, body) => { sent.push(body); },
    });
    await m.sendShortcodeReply({
        to: 'a@b.com', shortcode: 'ABC123', lat: 1, lng: 2,
        address: null, links: [], webUrl: 'https://w/',
    });
    assert.doesNotMatch(sent[0], /Near:/);
});

test('every outbound message carries the feedback + privacy footer', async () => {
    const sent = [];
    const m = createMailer({
        from: 'auth@addypin.com',
        transport: async (to, subject, body) => { sent.push(body); },
    });
    await m.sendShortcodeReply({
        to: 'a@b.com', shortcode: 'ABC123', lat: 1, lng: 2,
        address: null, links: [{ name: 'Google Maps', url: 'https://g/' }], webUrl: 'https://w/',
    });
    assert.match(sent[0], /\n-- \nfeedback@addypin\.com/, 'sig-delim + feedback contact');
    assert.match(sent[0], /we don't keep your email/);
});

test('sendShortcodeReply propagates transport errors', async () => {
    const m = createMailer({
        from: 'auth@addypin.com',
        transport: async () => { throw new Error('smtp down'); },
    });
    await assert.rejects(
        m.sendShortcodeReply({
            to: 'a@b.com', shortcode: 'XYZ123', lat: 0, lng: 0,
            address: null, links: [], webUrl: 'https://w/',
        }),
        /smtp down/,
    );
});

// ─── consoleTransport ───────────────────────────────────────────────────────

test('consoleTransport completes without throwing', async () => {
    const t = consoleTransport();
    const orig = console.log; let captured = '';
    console.log = (...a) => { captured += a.join(' ') + '\n'; };
    try {
        await t('a@b.com', 'Hi', 'body text');
    } finally { console.log = orig; }
    assert.match(captured, /a@b\.com/);
    assert.match(captured, /Hi/);
    assert.match(captured, /body text/);
});

// ─── msmtpTransport (without actually invoking msmtp) ───────────────────────

test('msmtpTransport returns a function', () => {
    const t = msmtpTransport({ from: 'a@b.com' });
    assert.equal(typeof t, 'function');
});

test('msmtpTransport rejects when binary is missing (ENOENT)', async () => {
    const t = msmtpTransport({ from: 'a@b.com', bin: '/nonexistent/no-such-binary-9f8c1' });
    await assert.rejects(t('to@example.com', 'subj', 'body'), (err) => err.code === 'ENOENT' || /ENOENT/.test(err.message));
});
