import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapLinks, APPS } from './maplinks.js';

test('returns 12 providers', () => {
    const links = mapLinks(37.7749, -122.4194);
    assert.equal(Object.keys(links).length, 12);
    assert.equal(APPS.length, 12);
});

test('every value is an https URL', () => {
    const links = mapLinks(0, 0);
    for (const [name, url] of Object.entries(links)) {
        assert.ok(url.startsWith('https://'), `${name} → ${url}`);
        assert.doesNotThrow(() => new URL(url), `${name} → ${url}`);
    }
});

test('every URL embeds the coordinate (no leftover placeholders)', () => {
    const links = mapLinks(37.7749, -122.4194);
    for (const [name, url] of Object.entries(links)) {
        assert.ok(!url.includes('{lat}'), `${name} has unreplaced {lat}`);
        assert.ok(!url.includes('{lon}'), `${name} has unreplaced {lon}`);
    }
});

test('non-China inputs use WGS84 verbatim for all apps including Chinese ones', () => {
    // SF — outside China bbox. Both Baidu/Amap should embed 37.7749 / -122.4194.
    const links = mapLinks(37.7749, -122.4194);
    assert.ok(links['Baidu Maps'].includes('37.7749'));
    assert.ok(links['Baidu Maps'].includes('-122.4194'));
    assert.ok(links['Amap (Gaode)'].includes('37.7749'));
    assert.ok(links['Amap (Gaode)'].includes('-122.4194'));
});

test('China inputs trigger GCJ-02 shift for Chinese apps only', () => {
    // Beijing — inside bbox. Baidu/Amap should NOT embed the original WGS coords.
    const lat = 39.9087, lon = 116.3975;
    const links = mapLinks(lat, lon);
    assert.ok(!links['Baidu Maps'].includes(`${lat},${lon}`),
              'Baidu should embed converted coords, not raw WGS');
    assert.ok(!links['Amap (Gaode)'].includes(`${lon},${lat}`),
              'Amap should embed converted coords, not raw WGS');
    // But Western apps still get the original
    assert.ok(links['Google Maps'].includes(`${lat},${lon}`),
              'Google should embed WGS coords as-is');
    assert.ok(links['Apple Maps'].includes(`${lat},${lon}`),
              'Apple should embed WGS coords as-is');
});

test('coordinate-order apps put lon first when configured', () => {
    // Yandex / 2GIS / Amap use 'lon,lat' order.
    const links = mapLinks(37.7749, -122.4194);
    assert.match(links['Yandex Maps'], /ll=-122\.4194,37\.7749/);
    assert.match(links['2GIS'],        /center=-122\.4194,37\.7749/);
});

test('handles edges and zero', () => {
    assert.doesNotThrow(() => mapLinks(0, 0));
    assert.doesNotThrow(() => mapLinks(-90, -180));
    assert.doesNotThrow(() => mapLinks(90, 180));
});

test('rejects non-finite inputs', () => {
    assert.throws(() => mapLinks(NaN, 0));
    assert.throws(() => mapLinks(0, Infinity));
    assert.throws(() => mapLinks('37', -122));
    assert.throws(() => mapLinks(null, 0));
});

test('object key order matches APPS array order (stable for UI)', () => {
    const links = mapLinks(0, 0);
    const expectedOrder = APPS.map(a => a.name);
    assert.deepEqual(Object.keys(links), expectedOrder);
});
