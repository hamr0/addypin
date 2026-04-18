import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapLinks } from './maplinks.js';

test('returns 13 providers', () => {
    const links = mapLinks(37.7749, -122.4194);
    assert.equal(Object.keys(links).length, 13);
});

test('every value is an https URL', () => {
    const links = mapLinks(0, 0);
    for (const [name, url] of Object.entries(links)) {
        assert.ok(url.startsWith('https://'), `${name} → ${url}`);
        assert.doesNotThrow(() => new URL(url), `${name} → ${url}`);
    }
});

test('coordinate-bearing providers embed the lat/lng', () => {
    const links = mapLinks(37.7749, -122.4194);
    const coordBearing = ['Google Maps', 'Apple Maps', 'Waze', 'HERE WeGo',
                          'MapQuest', 'Maps.me', 'OpenStreetMap', 'Bing Maps',
                          'TomTom', 'Citymapper', 'OsmAnd'];
    for (const name of coordBearing) {
        assert.ok(links[name].includes('37.7749'), `${name} should include lat`);
        assert.ok(links[name].includes('122.4194') || links[name].includes('122%2E4194'),
                  `${name} should include lng`);
    }
});

test('rejects non-finite or non-number inputs', () => {
    assert.throws(() => mapLinks(NaN, 0));
    assert.throws(() => mapLinks(0, Infinity));
    assert.throws(() => mapLinks('37', -122));
    assert.throws(() => mapLinks(null, 0));
});

test('handles negative and zero coordinates', () => {
    assert.doesNotThrow(() => mapLinks(0, 0));
    assert.doesNotThrow(() => mapLinks(-90, -180));
    assert.doesNotThrow(() => mapLinks(90, 180));
});
