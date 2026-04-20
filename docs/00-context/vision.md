# Vision — what addypin is and isn't

## The pitch

**Drop a pin, get a link.**

A six-character shortcode (`HOUSE1`, `BBQ22`, `CLINIC`) that opens the
same coordinates in whatever map app the recipient already uses —
Google, Apple, Waze, Baidu, Yandex, Naver, Neshan, OsmAnd, Moovit,
Mappls, Amap, Yango. Short enough to say out loud. Works as both a
web URL (`addypin.com/HOUSE1`) and an email address
(`HOUSE1@addypin.com`).

## Who it's for

Not "everyone who shares a map pin." Specifically:

- **Hosts** giving directions to vacation rentals, clinics, venues
  that don't have clean street addresses
- **Event/meetup organizers** — "parking lot behind the church"
- **Cross-language situations** — tourist → driver, "open this
  link in whatever map app you have"
- **Field workers, rescue teams** marking spots that have no address
- **Informal directions** — the big tree at the park entrance, the
  specific door between two storefronts

In every case the value prop is: **memorable short handle +
recipient opens in their existing map app + no account/tracking/install.**

## What problem it solves

Sharing a precise location over text, email, or voice is still
awkward in 2026:

- Raw coordinates are ugly and hard to say
- Native share links (Google Maps, Apple Maps, Waze) are long and
  only open in the app they came from
- Permanent "place URLs" usually require an account, pin-drop in
  someone else's app, or a third-party URL shortener that phones
  home on every click

addypin replaces all of that with a 6-character handle plus a
translation layer across 12 map apps. That's the whole product.

## Non-goals (explicit — these were considered and cut)

- No accounts, passwords, OAuth
- No usage analytics, tracking, event pipeline
- No social features (comments, likes, feeds, shares-back)
- No pin labels, tags, categories, or metadata
- No user-visible timestamps or view counts
- No mobile app
- No admin panel
- No CI/CD pipeline (manual deploy — automate when it hurts)
- No Docker, no Kubernetes, no Terraform
- No E2E encryption (server must decrypt to serve lookups; see
  [`01-product/prd.md`](../01-product/prd.md) §7)
- No activity-specialist map apps (Komoot, AllTrails, Strava). They
  share routes, not points — different product.

## How success looks

- A Korean tourist pastes `addypin.com/HOTEL1` into a taxi driver's
  browser. Driver taps "Naver Map" button. Arrives.
- A restaurant host replies to a reservation with "we're at
  addypin.com/BISTRO". Guest opens it, clicks Apple Maps, arrives.
- A BBQ organizer texts "addypin.com/BBQ22" to 20 people. Nobody
  asks "which Google Maps link do I use?"

If those three stories work without friction on any phone, any map
app, any country — the product is doing its job.

## Related docs

- [`01-product/prd.md`](../01-product/prd.md) — the technical spec
  and threat model (source of truth for scope)
- [`00-context/system-state.md`](system-state.md) — what's running on
  the VPS right now
- [`00-context/assumptions.md`](assumptions.md) — the rules we
  committed to follow during the v2 rewrite
