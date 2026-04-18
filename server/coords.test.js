import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wgs84ToGcj02, isInChina } from './coords.js';

// ─── isInChina ──────────────────────────────────────────────────────────────

test('isInChina includes mainland cities', () => {
    assert.equal(isInChina(39.9042, 116.4074), true);  // Beijing
    assert.equal(isInChina(31.2304, 121.4737), true);  // Shanghai
    assert.equal(isInChina(23.1291, 113.2644), true);  // Guangzhou
    assert.equal(isInChina(43.8256, 87.6168), true);   // Urumqi (far west)
});

test('isInChina excludes outside-mainland points', () => {
    assert.equal(isInChina(37.7749, -122.4194), false); // SF
    assert.equal(isInChina(35.6762, 139.6503), false);  // Tokyo (lon > 135)
    assert.equal(isInChina(1.3521, 103.8198), false);   // Singapore (lat < 18)
    assert.equal(isInChina(-33.8688, 151.2093), false); // Sydney
});

// ─── wgs84ToGcj02 ───────────────────────────────────────────────────────────

test('non-China coordinates pass through unchanged', () => {
    const r = wgs84ToGcj02(37.7749, -122.4194);
    assert.equal(r.converted, false);
    assert.equal(r.system, 'WGS84');
    assert.equal(r.lat, 37.7749);
    assert.equal(r.lon, -122.4194);
});

test('China coordinates are shifted (Beijing reference)', () => {
    // Tiananmen Square WGS84 ≈ 39.9087, 116.3975
    // Expected GCJ-02 ≈ 39.9101, 116.4036 (shift ≈ 100-600m, expected for GCJ-02)
    const r = wgs84ToGcj02(39.9087, 116.3975);
    assert.equal(r.converted, true);
    assert.equal(r.system, 'GCJ-02');
    assert.notEqual(r.lat, 39.9087);
    assert.notEqual(r.lon, 116.3975);
    // Sanity bounds: shift is in the expected direction and magnitude (< 0.01°)
    assert.ok(Math.abs(r.lat - 39.9087) < 0.01, `lat shift too big: ${r.lat - 39.9087}`);
    assert.ok(Math.abs(r.lon - 116.3975) < 0.01, `lon shift too big: ${r.lon - 116.3975}`);
});

test('Shanghai shift sanity', () => {
    const r = wgs84ToGcj02(31.2304, 121.4737);
    assert.equal(r.converted, true);
    assert.ok(Math.abs(r.lat - 31.2304) > 0.0001, 'lat should shift');
    assert.ok(Math.abs(r.lon - 121.4737) > 0.0001, 'lon should shift');
});

test('rounds to 6 decimal places', () => {
    const r = wgs84ToGcj02(37.77491234567, -122.41941234567);
    assert.equal(r.lat.toString().split('.')[1].length <= 6, true);
    assert.equal(r.lon.toString().split('.')[1].length <= 6, true);
});

test('boundary: just outside China returns unconverted', () => {
    // 17.99°N, just south of bbox
    const r = wgs84ToGcj02(17.99, 100);
    assert.equal(r.converted, false);
});

test('boundary: just inside China returns converted', () => {
    const r = wgs84ToGcj02(18.01, 100);
    assert.equal(r.converted, true);
});
