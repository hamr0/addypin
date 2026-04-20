// Pure function: (lat, lng) → { provider: deep-link URL }.
//
// Curated 12-app portfolio. Each URL was researched + validated.
// The translation across Western, Chinese, Russian, Indian, Korean,
// Iranian, and African stacks is the product's geographic moat —
// see docs/01-product/prd.md §13.
//
// Chinese maps (Baidu, Amap) require WGS84 → GCJ-02 conversion;
// see ./coords.js. The conversion is a no-op outside China.
//
// Known caveats:
// - Mappls opens in directions-mode, not place-view (no known marker URL).
// - Naver's web product is place-centric; coord URLs rely on a
//   server-side reverse-geocode, which lands cleanly inside Korea
//   but may show a blank card for non-Korea points. Accepted
//   tradeoff to cover the Korea gap (Google Maps is legally limited
//   there). Koreans sharing Korea pins is the dominant use case.

import { wgs84ToGcj02 } from './coords.js';

export const APPS = [
    // Global standards
    { id: 'google',  name: 'Google Maps',     icon: 'google.ico',
      url: 'https://www.google.com/maps?q={lat},{lon}',
      requiresConversion: false },
    { id: 'apple',   name: 'Apple Maps',      icon: 'apple.png', darkBg: true,
      url: 'https://maps.apple.com/?q={lat},{lon}',
      requiresConversion: false },
    { id: 'waze',    name: 'Waze',            icon: 'waze.ico',
      url: 'https://waze.com/ul?ll={lat},{lon}&navigate=yes',
      requiresConversion: false },

    // Regional champions — markets where Google Maps is thin or restricted
    { id: 'mappls',  name: 'Mappls',          icon: 'mappls.png',
      url: 'https://maps.mappls.com/direction?destination={lat},{lon}',
      requiresConversion: false },
    { id: 'baidu',   name: 'Baidu Maps',      icon: 'baidu.ico',
      url: 'https://map.baidu.com/?latlng={lat},{lon}&l=15&tn=B_NORMAL_MAP',
      requiresConversion: true },
    { id: 'amap',    name: 'Amap',            icon: 'amap.ico',
      url: 'https://uri.amap.com/marker?position={lon},{lat}',
      requiresConversion: true },
    { id: 'yandex',  name: 'Yandex Maps',     icon: 'yandex.png',
      url: 'https://yandex.com/maps/?ll={lon},{lat}&z=15',
      requiresConversion: false },
    { id: 'naver',   name: 'Naver Map',       icon: 'naver.png',
      url: 'https://map.naver.com/p/search/{lat},{lon}',
      requiresConversion: false },
    { id: 'neshan',  name: 'Neshan',          icon: 'neshan.png',
      url: 'https://nshn.ir/?lat={lat}&lng={lon}',
      requiresConversion: false },

    // Offline / data-constrained
    { id: 'osmand',  name: 'OsmAnd',          icon: 'osmand.ico',
      url: 'https://osmand.net/map#{lat}/{lon}/15',
      requiresConversion: false },

    // Public transit specialist
    { id: 'moovit',  name: 'Moovit',          icon: 'moovit.png',
      url: 'https://moovitapp.com/?to={lat},{lon}',
      requiresConversion: false },

    // Africa, MENA, LatAm ride-share
    { id: 'yango',   name: 'Yango Maps',      icon: 'yango.png', darkBg: true,
      url: 'https://maps.yango.com/?ll={lon},{lat}&z=15',
      requiresConversion: false },
];

// Build an ordered array of {id, name, icon, url} for a single coordinate.
// Chinese-system apps get the GCJ-02 conversion automatically; the
// converter is a no-op outside the China bbox so non-China inputs are
// unchanged for those apps too (just the same lat/lon back).
//
// Array (not object) so callers preserve order and can iterate without
// Object.entries dance.
export function mapLinks(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        !Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('lat and lng must be finite numbers');
    }
    const gcj = wgs84ToGcj02(lat, lng);
    return APPS.map(app => {
        const c = app.requiresConversion ? gcj : { lat, lon: lng };
        const url = app.url.replace('{lat}', String(c.lat)).replace('{lon}', String(c.lon));
        return {
            id: app.id, name: app.name, url,
            icon: `/maplogos/${app.icon}`,
            darkBg: !!app.darkBg,  // logos that are white-on-transparent need a dark pad
        };
    });
}
