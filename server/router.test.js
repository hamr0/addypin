import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRouter } from './router.js';

test('matches static path', () => {
    const r = createRouter();
    const handler = () => 'ok';
    r.get('/health', handler);
    const m = r.match('GET', '/health');
    assert.equal(m.handler, handler);
    assert.deepEqual(m.params, {});
});

test('extracts named params', () => {
    const r = createRouter();
    r.get('/api/pins/:shortcode', () => {});
    const m = r.match('GET', '/api/pins/HOUSE1');
    assert.deepEqual(m.params, { shortcode: 'HOUSE1' });
});

test('extracts multiple params', () => {
    const r = createRouter();
    r.get('/users/:uid/pins/:pid', () => {});
    const m = r.match('GET', '/users/abc/pins/HOUSE1');
    assert.deepEqual(m.params, { uid: 'abc', pid: 'HOUSE1' });
});

test('decodes percent-encoded params', () => {
    const r = createRouter();
    r.get('/echo/:val', () => {});
    const m = r.match('GET', '/echo/hello%20world');
    assert.equal(m.params.val, 'hello world');
});

test('returns null on method mismatch', () => {
    const r = createRouter();
    r.get('/x', () => {});
    assert.equal(r.match('POST', '/x'), null);
});

test('returns null on path mismatch', () => {
    const r = createRouter();
    r.get('/x/:a', () => {});
    assert.equal(r.match('GET', '/y/foo'), null);
    assert.equal(r.match('GET', '/x/foo/extra'), null);
});

test('does not match across slash boundaries', () => {
    const r = createRouter();
    r.get('/api/:name', () => {});
    assert.equal(r.match('GET', '/api/foo/bar'), null);
});

test('first matching route wins', () => {
    const r = createRouter();
    const a = () => 'a';
    const b = () => 'b';
    r.get('/x', a);
    r.get('/x', b);
    assert.equal(r.match('GET', '/x').handler, a);
});

test('supports POST/PATCH/DELETE', () => {
    const r = createRouter();
    r.post('/p', () => 'p');
    r.patch('/q', () => 'q');
    r.delete('/r', () => 'r');
    assert.ok(r.match('POST', '/p'));
    assert.ok(r.match('PATCH', '/q'));
    assert.ok(r.match('DELETE', '/r'));
});
