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
    { id: 'google',  name: 'Google Maps', url: 'https://www.google.com/maps?q={lat},{lon}',
      order: 'lat,lon', requiresConversion: false },
    { id: 'apple',   name: 'Apple Maps',  url: 'https://maps.apple.com/?q={lat},{lon}',
      order: 'lat,lon', requiresConversion: false },
    { id: 'waze',    name: 'Waze',        url: 'https://waze.com/ul?ll={lat},{lon}&navigate=yes',
      order: 'lat,lon', requiresConversion: false },

    // Regional champions — developing nations
    { id: 'mappls',  name: 'Mappls (MapmyIndia)',
      url: 'https://maps.mappls.com/direction?destination={lat},{lon}',
      order: 'lat,lon', requiresConversion: false },
    { id: 'baidu',   name: 'Baidu Maps',
      url: 'https://map.baidu.com/?latlng={lat},{lon}&l=15&tn=B_NORMAL_MAP',
      order: 'lat,lon', requiresConversion: true },
    { id: 'amap',    name: 'Amap (Gaode)',
      url: 'https://uri.amap.com/marker?position={lon},{lat}',
      order: 'lon,lat', requiresConversion: true },
    { id: 'yandex',  name: 'Yandex Maps',
      url: 'https://yandex.com/maps/?ll={lon},{lat}&z=15',
      order: 'lon,lat', requiresConversion: false },
    { id: '2gis',    name: '2GIS',
      url: 'https://2gis.com/?center={lon},{lat}&zoom=15',
      order: 'lon,lat', requiresConversion: false },

    // Offline / data-constrained
    { id: 'osmand',  name: 'OsmAnd',     url: 'https://osmand.net/map#{lat}/{lon}/15',
      order: 'lat,lon', requiresConversion: false },
    { id: 'here',    name: 'HERE WeGo',  url: 'https://share.here.com/l/{lat},{lon}',
      order: 'lat,lon', requiresConversion: false },

    // Public transit specialist
    { id: 'moovit',  name: 'Moovit',     url: 'https://moovitapp.com/?to={lat},{lon}',
      order: 'lat,lon', requiresConversion: false },

    // Strategic — Africa, MENA, LatAm
    { id: 'yango',   name: 'Yango Maps', url: 'https://maps.yango.com/?ll={lon},{lat}&z=15',
      order: 'lon,lat', requiresConversion: false },
];

// Build the { name → url } map for a single coordinate.
// Chinese-system apps get the GCJ-02 conversion automatically; the
// converter is a no-op outside the China bbox so non-China inputs are
// unchanged for those apps too (just the same lat/lon back).
export function mapLinks(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        !Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('lat and lng must be finite numbers');
    }
    const gcj = wgs84ToGcj02(lat, lng);
    const out = {};
    for (const app of APPS) {
        const c = app.requiresConversion ? gcj : { lat, lon: lng };
        out[app.name] = app.url
            .replace('{lat}', String(c.lat))
            .replace('{lon}', String(c.lon));
    }
    return out;
}
