// WGS84 → GCJ-02 coordinate conversion.
//
// GCJ-02 is the obfuscated coordinate system used by Chinese mapping
// services (Baidu, Amap). Standard GPS (WGS84) lat/lng will not align
// with the map there — buildings shift hundreds of meters. The
// transform below is the well-known reverse-engineered shift based on
// the Krasovsky 1940 ellipsoid.
//
// Ported from archive/v1's shared/coordinateConverter.ts on the
// feature/15-maps branch. Same math, no semantic changes.
//
// Hong Kong, Macau, and Taiwan use standard WGS84 — they are excluded
// from the conversion by the bounding box.

const PI = Math.PI;
const A = 6378245.0;                // Krasovsky 1940 semi-major axis (m)
const EE = 0.00669342162296594323;  // Eccentricity squared

function transformLat(x, y) {
    let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
    r += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
    return r;
}

function transformLon(x, y) {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
    r += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
    r += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
    return r;
}

export function isInChina(lat, lon) {
    return lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135;
}

function round6(v) { return Number(v.toFixed(6)); }

// Returns { lat, lon, converted, system }. Outside the China mainland
// bbox the coordinates are returned unchanged with converted=false.
export function wgs84ToGcj02(lat, lon) {
    if (!isInChina(lat, lon)) {
        return { lat: round6(lat), lon: round6(lon), converted: false, system: 'WGS84' };
    }
    let dLat = transformLat(lon - 105, lat - 35);
    let dLon = transformLon(lon - 105, lat - 35);
    const radLat = (lat / 180) * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
    dLon = (dLon * 180) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
    return {
        lat: round6(lat + dLat),
        lon: round6(lon + dLon),
        converted: true,
        system: 'GCJ-02',
    };
}
