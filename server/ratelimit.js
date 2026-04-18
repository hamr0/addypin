// In-process token-bucket rate limiter. Per-key bucket, lazy refill.
//
// On restart, all counters reset. Acceptable for v2 scale per PRD §8.
//
// Usage:
//   const limiter = createRateLimiter({ capacity: 5, refillPerSec: 5/3600 });
//   if (!limiter.take(ip)) return 429;

export function createRateLimiter({ capacity, refillPerSec, now = () => Date.now() }) {
    if (typeof capacity !== 'number' || capacity <= 0 || !Number.isFinite(capacity)) {
        throw new Error('capacity must be a positive finite number');
    }
    if (typeof refillPerSec !== 'number' || refillPerSec <= 0 || !Number.isFinite(refillPerSec)) {
        throw new Error('refillPerSec must be a positive finite number');
    }
    const buckets = new Map();

    function take(key, n = 1) {
        const t = now();
        let b = buckets.get(key);
        if (!b) {
            b = { tokens: capacity, lastRefill: t };
            buckets.set(key, b);
        } else {
            const elapsedSec = (t - b.lastRefill) / 1000;
            b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
            b.lastRefill = t;
        }
        if (b.tokens >= n) {
            b.tokens -= n;
            return true;
        }
        return false;
    }

    function reset(key) {
        buckets.delete(key);
    }

    function size() {
        return buckets.size;
    }

    // Periodically clear buckets that have been full for a while —
    // avoids unbounded growth when many distinct keys hit the limiter
    // once and never return.
    function gc() {
        const t = now();
        // After 2× the full-refill window of inactivity, the bucket is
        // definitionally back at capacity — drop it. No need to refill
        // first; we only care about the elapsed time.
        const idleMs = (capacity / refillPerSec) * 1000 * 2;
        for (const [k, b] of buckets) {
            if ((t - b.lastRefill) > idleMs) buckets.delete(k);
        }
    }

    return { take, reset, size, gc };
}
