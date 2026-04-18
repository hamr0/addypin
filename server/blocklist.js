// Reserved/blocked shortcodes. Stored uppercase. Two categories:
//
//   1. Routing reservations — codes that would clash with subdomains
//      or routes (`WWW.addypin.com`, `MAIL@addypin.com`, etc.).
//   2. Brand impersonation — well-known names that a stranger should
//      not be able to claim, since the public lookup page would imply
//      legitimacy.
//
// This is intentionally short. v1 is "reduce surprise," not "police
// language." Add entries when the lack of one causes a real problem.

export const BLOCKLIST = new Set([
    // Routing / system
    'WWW000', 'API000', 'MAIL00', 'SMTP00', 'IMAP00', 'POP300',
    'ADMIN0', 'LOGIN0', 'LOGOUT', 'SIGNUP', 'SIGNIN',
    'ROOT00', 'STATUS', 'HEALTH', 'DEBUG0', 'CONFIG',
    'ABOUT0', 'HELP00', 'TERMS0', 'LEGAL0', 'PRIVCY',
    'SEARCH', 'STATIC', 'ASSETS', 'PUBLIC',
    'CONFRM', 'MANAGE', 'RESEND', 'VERIFY',

    // Brand impersonation (sample — extend as needed)
    'GOOGLE', 'APPLE0', 'AMAZON', 'NETFLX', 'TESLA0',
    'POLICE', 'FBI000', 'CIA000', 'NSA000',
    'PAYPAL', 'STRIPE', 'VENMO0',
    'TWTTER', 'TWITER', 'FBOOK0', 'INSTGM',
    'OPENAI', 'CHATGT', 'CLAUDE',
]);

// 6-character versions enforced by the regex in shortcode.js. Six-char
// brand names like 'GOOGLE' fit; shorter names are padded with '0' to
// reach length 6, which is hostile to vanity adoption — the goal is to
// reserve the obvious squat targets, not every variant.
