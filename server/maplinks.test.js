import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapLinks, APPS } from './maplinks.js';

test('returns 12 entries in the canonical APPS order', () => {
    const links = mapLinks(37.7749, -122.4194);
    assert.equal(links.length, 12);
    assert.equal(APPS.length, 12);
    assert.deepEqual(links.map(l => l.id), APPS.map(a => a.id));
});

test('every entry has id, name, icon, url', () => {
    const links = mapLinks(0, 0);
    for (const l of links) {
        assert.equal(typeof l.id, 'string');
        assert.equal(typeof l.name, 'string');
        assert.equal(typeof l.url, 'string');
        assert.equal(typeof l.icon, 'string');
        assert.match(l.icon, /^\/maplogos\/[a-z0-9]+\.(png|ico)$/);
    }
});

test('every URL is a valid https URL with no leftover placeholders', () => {
    const links = mapLinks(37.7749, -122.4194);
    for (const l of links) {
        assert.ok(l.url.startsWith('https://'), `${l.name} → ${l.url}`);
        assert.doesNotThrow(() => new URL(l.url), `${l.name} → ${l.url}`);
        assert.ok(!l.url.includes('{lat}'), `${l.name} has unreplaced {lat}`);
        assert.ok(!l.url.includes('{lon}'), `${l.name} has unreplaced {lon}`);
    }
});

test('non-China inputs use WGS84 verbatim for all apps including Chinese ones', () => {
    const links = mapLinks(37.7749, -122.4194);
    const baidu = links.find(l => l.id === 'baidu');
    const amap  = links.find(l => l.id === 'amap');
    assert.ok(baidu.url.includes('37.7749'));
    assert.ok(baidu.url.includes('-122.4194'));
    assert.ok(amap.url.includes('37.7749'));
    assert.ok(amap.url.includes('-122.4194'));
});

test('China inputs trigger GCJ-02 shift for Chinese apps only', () => {
    const lat = 39.9087, lon = 116.3975;
    const links = mapLinks(lat, lon);
    const baidu  = links.find(l => l.id === 'baidu');
    const amap   = links.find(l => l.id === 'amap');
    const google = links.find(l => l.id === 'google');
    const apple  = links.find(l => l.id === 'apple');
    assert.ok(!baidu.url.includes(`${lat},${lon}`),
              'Baidu should embed converted coords, not raw WGS');
    assert.ok(!amap.url.includes(`${lon},${lat}`),
              'Amap should embed converted coords, not raw WGS');
    assert.ok(google.url.includes(`${lat},${lon}`),
              'Google should embed WGS coords as-is');
    assert.ok(apple.url.includes(`${lat},${lon}`),
              'Apple should embed WGS coords as-is');
});

test('lon-first apps put lon before lat in the URL', () => {
    const links = mapLinks(37.7749, -122.4194);
    const yandex = links.find(l => l.id === 'yandex');
    const twogis = links.find(l => l.id === '2gis');
    assert.match(yandex.url, /ll=-122\.4194,37\.7749/);
    assert.match(twogis.url, /center=-122\.4194,37\.7749/);
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
