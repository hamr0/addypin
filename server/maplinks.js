// Pure function: (lat, lng) → { provider: deep-link URL }.
//
// 12-app curated portfolio ported from the feature/15-maps branch
// (commit 8249a59c). Each app's URL was researched + validated. The
// translation across Western, Chinese, Russian, Indian, and African
// stacks is the product's geographic moat — see docs/01-product/prd.md.
//
// Chinese maps (Baidu, Amap) require WGS84 → GCJ-02 conversion;
// see ./coords.js. The conversion is a no-op outside China.

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

    // Regional champions — developing nations
    { id: 'mappls',  name: 'Mappls',          icon: 'mappls.png', darkBg: true,
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
    { id: '2gis',    name: '2GIS',            icon: '2gis.png',
      url: 'https://2gis.com/?center={lon},{lat}&zoom=15',
      requiresConversion: false },

    // Offline / data-constrained
    { id: 'osmand',  name: 'OsmAnd',          icon: 'osmand.ico',
      url: 'https://osmand.net/map#{lat}/{lon}/15',
      requiresConversion: false },
    { id: 'here',    name: 'HERE WeGo',       icon: 'here.png',
      url: 'https://share.here.com/l/{lat},{lon}',
      requiresConversion: false },

    // Public transit specialist
    { id: 'moovit',  name: 'Moovit',          icon: 'moovit.png',
      url: 'https://moovitapp.com/?to={lat},{lon}',
      requiresConversion: false },

    // Strategic — Africa, MENA, LatAm
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
