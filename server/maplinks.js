// Pure function: (lat, lng) → { provider: deep-link URL }.
// Ported verbatim from archive/v1/server/routes.ts. 13 providers.
//
// Notes:
//   - No URL encoding beyond what each provider expects in its scheme.
//   - Sygic and Badger are landing-page links, not coordinate links.
//     Carried over from v1; they are listed but do not navigate to a
//     specific location. v2 may drop them later.

export function mapLinks(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        !Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('lat and lng must be finite numbers');
    }
    return {
        'Google Maps':   `https://www.google.com/maps?q=${lat},${lng}`,
        'Apple Maps':    `https://maps.apple.com/?q=${lat},${lng}`,
        'Waze':          `https://waze.com/ul?q=${lat}%2C${lng}&navigate=yes`,
        'HERE WeGo':     `https://wego.here.com/directions/mix//${lat},${lng}`,
        'MapQuest':      `https://www.mapquest.com/directions/to/us/${lat},${lng}`,
        'Maps.me':       `https://maps.me/map/${lat},${lng}`,
        'OpenStreetMap': `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
        'Bing Maps':     `https://www.bing.com/maps?q=${lat},${lng}`,
        'TomTom':        `https://www.tomtom.com/en_us/maps/map?lat=${lat}&lng=${lng}`,
        'Citymapper':    `https://citymapper.com/directions?endcoord=${lat}%2C${lng}`,
        'OsmAnd':        `https://osmand.net/map#16/${lat}/${lng}`,
        'Sygic Maps':    `https://www.sygic.com/en/gps-navigation-maps/sygic-maps`,
        'Badger Maps':   `https://www.badgermapping.com/`,
    };
}
