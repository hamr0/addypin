import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMailer, consoleTransport, msmtpTransport } from './mail.js';

// ─── createMailer factory validation ────────────────────────────────────────

test('createMailer rejects bad config', () => {
    assert.throws(() => createMailer({ from: 'noatsign', transport: () => {} }));
    assert.throws(() => createMailer({ from: 'a@b.com', transport: 'nope' }));
    assert.throws(() => createMailer({ from: '', transport: () => {} }));
});

// ─── sendConfirmation ───────────────────────────────────────────────────────

test('sendConfirmation passes the right args to the transport', async () => {
    const sent = [];
    const m = createMailer({
        from: 'noreply@addypin.com',
        transport: async (to, subject, body) => { sent.push({ to, subject, body }); },
    });
    await m.sendConfirmation({
        to: 'alice@example.com',
        shortcode: 'HOUSE1',
        confirmUrl: 'http://localhost:3000/confirm?token=abc.def',
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'alice@example.com');
    assert.match(sent[0].subject, /HOUSE1/);
    assert.match(sent[0].body, /confirm\?token=abc\.def/);
    assert.match(sent[0].body, /72 hours/);
});

test('sendConfirmation propagates transport errors', async () => {
    const m = createMailer({
        from: 'noreply@addypin.com',
        transport: async () => { throw new Error('smtp down'); },
    });
    await assert.rejects(
        m.sendConfirmation({ to: 'a@b.com', shortcode: 'XYZ123', confirmUrl: 'x' }),
        /smtp down/,
    );
});

// ─── consoleTransport ───────────────────────────────────────────────────────

test('consoleTransport completes without throwing', async () => {
    const t = consoleTransport();
    // Silence stdout for this test by swapping console.log briefly.
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

// We deliberately don't run a "successful msmtp send" unit test — there's no
// non-msmtp binary that mimics msmtp's CLI shape closely enough to be useful
// without becoming testing-the-mock. The real binary is exercised by the
// end-to-end smoke against a configured VPS.
