import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './ratelimit.js';

// Controllable clock so tests don't rely on wall time.
function fakeClock(start = 0) {
    let t = start;
    return {
        now: () => t,
        advance: (ms) => { t += ms; },
    };
}

test('first N takes succeed up to capacity', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 3, refillPerSec: 1, now: c.now });
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), false);
});

test('refill restores tokens over time', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 2, refillPerSec: 1, now: c.now });
    lim.take('a'); lim.take('a');
    assert.equal(lim.take('a'), false);
    c.advance(1000); // 1s → 1 token back
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), false);
});

test('refill never exceeds capacity', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 2, refillPerSec: 1, now: c.now });
    lim.take('a');
    c.advance(60_000); // a minute of refill, capped at 2
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('a'), false);
});

test('keys are isolated', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 1, refillPerSec: 1, now: c.now });
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('b'), true);
    assert.equal(lim.take('a'), false);
    assert.equal(lim.take('b'), false);
});

test('reset clears one key only', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 1, refillPerSec: 1, now: c.now });
    lim.take('a'); lim.take('b');
    lim.reset('a');
    assert.equal(lim.take('a'), true);
    assert.equal(lim.take('b'), false);
});

test('rejects bad config', () => {
    assert.throws(() => createRateLimiter({ capacity: 0, refillPerSec: 1 }));
    assert.throws(() => createRateLimiter({ capacity: -1, refillPerSec: 1 }));
    assert.throws(() => createRateLimiter({ capacity: NaN, refillPerSec: 1 }));
    assert.throws(() => createRateLimiter({ capacity: 5, refillPerSec: 0 }));
});

test('gc removes long-idle full buckets', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 2, refillPerSec: 1, now: c.now });
    lim.take('idle');                 // 1 of 2 used
    c.advance(2000);                  // refilled to capacity
    assert.equal(lim.size(), 1);
    c.advance(60_000);                // long idle
    lim.gc();
    assert.equal(lim.size(), 0);
});

test('take(n) consumes n tokens at once', () => {
    const c = fakeClock();
    const lim = createRateLimiter({ capacity: 5, refillPerSec: 1, now: c.now });
    assert.equal(lim.take('a', 3), true);
    assert.equal(lim.take('a', 3), false);
    assert.equal(lim.take('a', 2), true);
});
