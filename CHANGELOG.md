# Changelog

All notable changes to addypin. Format loosely follows [Keep a
Changelog](https://keepachangelog.com/). Dates are `YYYY-MM-DD`.

## [Unreleased]

## [2.0.17] — 2026-06-02

### Added

- **Discoverability (declarative open-web only).** Completed Tier-1 head tags
  and AI-crawler policy per the privacy-respecting discoverability playbook —
  no analytics, no scripts, nothing that calls home.
  - `web/og.png` (1200×630, the addypin mark + tagline on the `--ink` brand
    bg) served at `/og.png`; `index.html` now emits `og:image` (+ width/height/
    alt, absolute URL) and `twitter:card` upgraded `summary` → `summary_large_image`
    so chat/Slack/Discord unfurls render a banner, not the compact chain-icon card.
  - `<html lang="en">`, JSON-LD (`SoftwareApplication` + `WebSite`,
    `application/ld+json` — parsed, not executed), `sitemap.xml` switched to
    `<lastmod>` (dropping `<changefreq>`/`<priority>`, which Google ignores),
    and a curated `/llms.txt` agent index with the privacy invariant up top.
  - `robots.txt` now **names the AI crawlers explicitly and classifies them**
    — cite-live/retrieval (`Claude-User`, `Claude-SearchBot`, `OAI-SearchBot`,
    `ChatGPT-User`, `PerplexityBot`) and training (`ClaudeBot`, `GPTBot`), all
    allow-all on the PII-free marketing surface. (Note: `ClaudeBot` is
    Anthropic's *training* crawler, not retrieval — the cite-live Anthropic bots
    are `Claude-User`/`Claude-SearchBot`.) On the record, not the implicit `*`.
  - **Corrected the PII model** (per the playbook's refined Tier 2.5): the
    control is **auth-gating**, not `robots.txt`. Owner endpoints already
    return 401/403 to anonymous requests. The old `Disallow: /api/ /auth/
    /manage /edit/` lines were dropped — they were a no-op trap, since those
    pages are `noindex` and a `Disallow`-ed page is never fetched, so its
    `noindex` is never seen. Out-of-search is now enforced by `noindex` while
    leaving pages crawlable: `<meta name="robots">` on pin/manage/edit HTML and
    a new `X-Robots-Tag: noindex` header on every JSON response (covers the
    public, by-design coords lookup `/api/pins/:code`).

- **flightlog (`^0.4.0`) — in-app crash recorder.** `install()` at the top
  of `server/main.js` (sink `${DATA_DIR}/errors.jsonl`, `exitOnUncaught`
  default so systemd restarts clean) and `server/inbound-cli.js` (own
  `errors-inbound.jsonl`, `bootCheck:false` + `exitOnUncaught:false` +
  `captureSync` so a broken error sink never defers mail and the pipe keeps
  its "always exit 0" contract). Catch-boundary `console.error`s now also
  `capture(err, { where })`. The HTTP 500 path strips the query string
  (`req.url.split('?')[0]`) before logging — magic-link tokens ride in
  `/auth/callback?token=…` and flightlog ships no redactor by design.
- **pulselog (`^0.4.1`) — external watcher**, replacing three hand-rolled
  pieces:
  - **Health** — `ops/pulselog/health.config.json` + the existing
    `addypin-health.timer` (15 min) now run `pulselog`, replacing
    `ops/health-check.sh`. Same coverage (units, API, disk ×2, cert, mailq,
    DB size) via native check types plus two `command` escape hatches; the
    journal-error check is dropped in favour of the flightlog rollup.
  - **Weekly digest** — `pulselog --digest` reads the two numbers from
    `server/stats.js --metrics-json`, appends one snapshot/week to
    `${DATA_DIR}/stats.jsonl`, and mails the WoW table (Sun 09:00 UTC), with
    a flightlog error rollup (counts + names only). Replaces `server/digest.js`.
  - **Home-server backup + watch** — `ops/homeserver/pulselog.config.json`
    drives `pulselog --backup` (via the `addypin-pull.sh` command source) and
    an `addypin-watch.timer` (site `http`/`ssl` + backup `file-age`), replacing
    `addypin-backup.sh` and both Uptime-Kuma monitors.

### Removed

- `ops/health-check.sh`, `server/digest.js`, `ops/homeserver/addypin-backup.sh`,
  the `addypin-stats.{service,timer}` daily-snapshot pair (the digest run now
  *is* the weekly snapshot), and the `stats:log` npm script.

### Changed

- `server/stats.js` slimmed to two modes: a human line and `--metrics-json`
  (the digest's metricsCommand). The `--watch`/`stats.log` path is gone.
- One-shot `ops/pulselog/migrate-stats-log.mjs` converts a legacy `stats.log`
  into `stats.jsonl` so the first digest keeps its WoW history.

## [2.0.16] — 2026-05-24

### Changed

- **knowless 1.1.6 → 1.1.9.** One code change across the span; the rest
  is documentation. No addypin change required — surface-equivalent for
  how addypin embeds the library.
  - **1.1.9 — `createMailer` validates `from` is a bare address at
    boot.** It now rejects `<` / `>` and CR/LF in `from`, failing fast
    at startup instead of emitting a malformed Message-ID / leaning on
    nodemailer's lenient envelope parsing at first send. addypin already
    passes a bare `MAIL_FROM_ADDRESS` (`auth@addypin.com`) with the
    display name in the separate `MAIL_FROM_NAME` (`addypin`) — the
    AF-27 shape it's used since 0.2.3 — so both factories
    (`server/main.js`, `server/inbound-cli.js`) pass the new check
    unchanged. The bug this fixes only bit adopters who stuffed a
    display-format value (`Name <addr>`) into the bare-`from` slot via
    the standalone server's `KNOWLESS_FROM`; addypin never uses that
    env var or the standalone runner.
  - **1.1.7, 1.1.8 — documentation-only** (threat-model wording;
    forward-auth identity-header name; Node ≥22.5 floor correction).
    1.1.7 was never published to npm — the registry goes 1.1.6 → 1.1.8
    → 1.1.9.
  Verified: `npm test` 176/176 green; boot smoke clean (knowless factory
  constructs, `addypin listening`); direct probe confirms bare `from`
  accepted and display-format rejected.

### Fixed

- **Pin page "more maps" toggle now reflects its state.** The
  `<details>` summary on `web/pin.html` read `Show N more` in both the
  collapsed and expanded states. It now flips to `Show N less` when
  open (via a `toggle` listener), matching the chevron that already
  rotates — so the control no longer invites a click that does the
  opposite of what it says.

## [2.0.15] — 2026-05-22

### Security

- **Key per-IP rate limits on a non-spoofable client IP.** `clientIp()`
  previously read the *leftmost* `X-Forwarded-For` token. nginx forwards
  XFF with `$proxy_add_x_forwarded_for` (append), so that token is
  whatever the client sent — an attacker could rotate it to mint fresh
  rate-limit buckets and evade the per-IP limits (`create`, `lookup`,
  `read`) entirely. Loopback binding (2.0.14) did not prevent this, since
  the attack flows *through* nginx, not around it. `clientIp()` now reads
  `X-Real-IP` (nginx sets it to `$remote_addr` via `proxy_set_header`,
  replacing any client value), falling back to the *rightmost* XFF token,
  then the socket address. Verified against the live nginx config. Adds
  two regression tests (spoofed-leftmost XFF, rightmost fallback).

### Docs

- PRD §8 corrected: documents `X-Real-IP` as the keying source and why
  the leftmost XFF token must not be trusted under the append config.

## [2.0.14] — 2026-05-22

### Security

- **Bind to loopback by default.** `server/main.js` now listens on
  `127.0.0.1` (override via the new `HOST` env var) instead of `0.0.0.0`.
  nginx proxies to `127.0.0.1:3000` and `docs/00-context/system-state.md`
  already described the service as loopback-only — the code now matches
  that documented posture. Closes incidental LAN/external reachability of
  the Node port, which is what makes trusting `X-Forwarded-For` for
  per-IP rate-limit keying sound by construction. Set `HOST=0.0.0.0` only
  to knowingly expose the port (e.g. LAN/device testing).
- **Rate-limit authenticated pin writes.** `PATCH`/`DELETE
  /api/pins/:shortcode` now throttle at 60/hr **per owner handle** (were
  unbounded). Caps a valid session from pounding pin writes or probing
  ownership across shortcodes; keyed on the session principal so a shared
  NAT egress doesn't penalise unrelated owners.
- **Rate-limit owner-facing reads.** `GET /api/me/pins` and `GET /manage`
  now throttle at 300/15 min **per IP** — `/api/me/pins` is the heaviest
  authenticated read (promotion sweep + decrypt-all). Keyed per IP to
  blunt bots/DoS rather than budget a single owner, and gated before the
  promotion sweep so a rejected request does no DB work.

### Docs

- PRD §8 documents the new write/read rate limits and the loopback/XFF
  rationale; `.env.example` documents the new `HOST` variable.

### Changed

- **Repo turned public; README rewritten for a public audience.**
  Dropped the architecture diagram, stack table, schema, lifecycle,
  local-dev section, docs index, and "not in v2" list — none of that
  is useful to someone landing on the GitHub page from
  [addypin.com](https://addypin.com). The new README is product-only:
  what it does, who it's for (regions with weak addressing; people
  bridging Google/Apple/Waze ↔ Yandex/Baidu/Amap/Naver/Mappls/Neshan;
  pins crossing the WGS-84 ↔ GCJ-02 boundary into Chinese apps), and
  the link. Internals stay in `docs/` and `CLAUDE.md` for contributors;
  the README no longer points at them.

---

## [2.0.13] — 2026-05-10

### Changed

- **knowless 0.2.3 → 1.1.6.** Spans upstream's walk-away release
  (v1.0.0, byte-equivalent to 0.2.3) and the four v1.1.x bug-fix
  drops. No API changes for addypin — surface-equivalent. Effective
  changes here:
  - **AF-28: trusted-proxy XFF/X-Real-IP fix (knowless 1.1.0).**
    `trustedProxies: ['127.0.0.1', '::1']` in `server/main.js` and
    `server/inbound-cli.js` was silently inert before — knowless's
    handler path pre-built the trusted-peer set into the wrong shape
    and `determineSourceIp` discarded it, so per-IP rate limits
    bucketed everything as 127.0.0.1 (the nginx loopback). Now the
    config is honored. nginx already forwards `X-Forwarded-For` and
    `X-Real-IP` on both the apex and wildcard server blocks
    (`/etc/nginx/conf.d/addypin.conf` lines 185, 228, 241), so the
    fix takes effect at deploy: `maxLoginRequestsPerIpPerHour` and
    `maxNewHandlesPerIpPerHour` now bucket on real client IPs
    instead of starving on a single shared one.
  - **AF-30: factory `subject` validated at startup (knowless 1.1.0).**
    The `subject: 'Your addypin login link'` config in both
    factories is now checked at boot (was first-send before). Same
    rules as `subjectOverride` (ASCII, ≤60 chars, no CR/LF).
    addypin's value passes; the change just moves a latent
    fail-at-first-mail into a fail-at-boot.
  - **`onTransportFailure` default now stderr (knowless 1.1.4).**
    Previously a no-op; SMTP submission failures from knowless
    (`localhost:25` unreachable, Postfix queue full, etc.) were
    swallowed silently. Now they print
    `[knowless] mail submit failed: <message>` to stderr →
    journald. addypin doesn't override the hook, so this lands for
    free without code changes.
  - Other v1.1.0 fixes (AF-29 CR/LF in `validateSubject`, AF-31
    trailing-newline in `validateBodyFooter`) don't touch addypin's
    code path. v1.1.1–1.1.3 and 1.1.5–1.1.6 are documentation-only.
  Verified end-to-end on prod after deploy: service `active`, `GET /`
  → 200, `POST /api/login` → 202, journal clean.

### Fixed

- **`ops/deploy.sh` now runs `npm ci --omit=dev` before
  `systemctl restart`.** Surfaced by the knowless bump above:
  `git pull` placed the new `package.json` on the VPS but
  `node_modules/knowless` stayed at 0.2.3, so the restart loaded
  stale code. The first deploy of the bump appeared green
  (smoke 200) but was actually still on the old version — caught
  only by sshing in to grep the installed package version. Any
  future dep change (or transitive lockfile change) would have hit
  the same gap silently. `npm ci` is idempotent and ~1s when
  nothing changed, so always running it is the right trade vs
  gating on a lockfile diff. One-line addition between the
  `git pull --ff-only` and `systemctl restart addypin` in the
  remote heredoc.

---

## [2.0.12] — 2026-05-04

### Added

- **Privacy-respecting discoverability — tier 1 head tags + robots/sitemap.**
  Per the playbook in `docs/04-process/privacy-seo.md`. Landing
  page (`web/index.html`) now ships a descriptive `<title>`,
  privacy-stance `<meta description>` ("…no accounts, no tracking,
  open source"), `<link rel="canonical">` to the apex, OpenGraph
  set (`og:type/title/description/url/site_name`), `twitter:card`
  summary, and `<meta name="theme-color">`. Pin viewer (`pin.html`),
  manage (`manage.html`), and edit (`edit.html`) get
  `<meta name="robots" content="noindex, nofollow">` so search
  engines don't harvest individual pin URLs / coordinates — pins
  stay reachable by anyone with the link, just not enumerable via
  Google. New static files served from `web/`: `robots.txt`
  (sitemap reference + disallow `/api/`, `/auth/`, `/manage`,
  `/edit/`) and `sitemap.xml` (single entry: the apex). Both wired
  into `server/http.js`'s `STATIC_FILES` map. JSON-LD skipped on
  principle for now; `og:image` deferred (design task). No
  analytics, no tag manager, no third-party JS — declarative
  machine-readability only. Two new tests in `server/http.test.js`
  cover the static-file routes.

---

## [2.0.11] — 2026-05-03

### Added

- **Weekly stats digest email (`server/digest.js` + Sun 09:00 timer).**
  Reads `${DATA_DIR}/stats.log` (one snapshot per day from the
  daily timer), buckets entries into the last 4 weeks relative to
  "now", picks the latest snapshot in each bucket, and mails
  **one row per week** with a week-over-week delta — not a 28-line
  raw dump. Sample row:
  `2026-04-30  pins=5 customers=2  (+1 pins, +0 customers WoW)`.
  Pipes through msmtp out the same Postfix → OpenDKIM path as the
  `SHORTCODE@` auto-reply (so DKIM/SPF/DMARC pass — no separate
  deliverability story). Recipient hard-coded to
  `avoidaccess@gmail.com`; From / From-name come from
  `/etc/addypin/env` (`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`) so the
  digest matches user-facing mail's `From: addypin <…>` shape.
  systemd unit pair `ops/systemd/addypin-stats-digest.{service,timer}`,
  fires every Sunday at 09:00 UTC with `Persistent=true` and the
  same hardening flags as `addypin-stats.service`. Uses
  `msmtpTransport` from `server/mail.js` — no local copy of the
  msmtp plumbing. No new deps. If `stats.log` is empty or missing,
  the script exits 0 silently rather than mailing an empty digest.

### Fixed

- **`digest.js` deduplication.** Replaced the local `sendViaMsmtp`
  copy with an import of `msmtpTransport` from `server/mail.js`.
  The duplicate would have diverged silently from any future fixes
  to the shared transport (header changes, error handling, etc.).
- **`digest.js` `from` fallback.** Changed `'auth@addypin.com'`
  (the magic-link sender) to `'noreply@addypin.com'` to match
  `.env.example`. Only matters when no `MAIL_FROM_ADDRESS` env var
  is set.
- **`addypin-stats-digest.timer` timezone.** Added `UTC` to
  `OnCalendar` (`Sun *-*-* 09:00:00 UTC`) so the Sunday-morning
  digest fires at a fixed wall-clock time regardless of the VPS
  locale or DST transitions.

---

## [2.0.10] — 2026-04-30

### Added

- **Stats counter (`server/stats.js`) + daily VPS log — live.**
  Read-only operator script. No decryption, no env vars beyond
  `DATA_DIR`, no new deps. Prints `pins=N customers=M` to stdout
  (confirmed pins + distinct `owner_handle` set). Local:
  `npm run stats` (one-shot) or `npm run stats:log` (10-min polling).
  VPS: `ops/systemd/addypin-stats.{service,timer}` — oneshot unit
  fires daily, reads `/etc/addypin/env` so `DATA_DIR=/var/lib/addypin`
  flows through to both the db read path and the log write path
  (`${DATA_DIR}/stats.log`). Hardening flags mirror `addypin.service`
  (`NoNewPrivileges`, `ProtectSystem=strict`,
  `ReadWritePaths=/var/lib/addypin`, etc.); shell-redirect via
  `/bin/sh -c` because RHEL 8 ships systemd 239 and
  `StandardOutput=append:` (240+) isn't available. Deployed and
  enabled on the VPS 2026-04-30 — first datapoint
  `2026-04-30T19:25:33Z pins=5 customers=2`, next fire midnight EDT
  with `Persistent=true` so a downed VPS catches up on boot. Doesn't
  add a stats table, an event pipeline, or any per-user dimension —
  PRD §2 "no usage analytics" line still holds.

### Fixed

- **`stats.js` missing-DB guard.** Added an `fs.existsSync` check
  before `new DatabaseSync(…, { readOnly: true })`. Previously a
  fresh deploy before any pins were created would crash with an
  opaque SQLite error; now it exits 0 with a clear message.

---

## [2.0.9] — 2026-04-29

### Changed

- **Outbound mail polish (knowless 0.2.1 → 0.2.3).** Three knowless
  upgrades close gaps that surfaced from the v0.2.0 cutover:
  - **`bodyOverride` (AF-26, knowless 0.2.2).** `auth.startLogin` now
    accepts a per-call body template alongside `subjectOverride`.
    Pin-creation (`server/http.js`), 48 h expiry-reminder
    (`server/main.js`), and the `resend@` confirmation
    (`server/inbound.js`) all pass tailored bodies so the recipient's
    email doesn't say "Click to sign in:" under a "Confirm your
    addypin" subject. Plain login flow (`POST /api/login`, `login@`
    inbound) keeps the default body — that path actually IS sign-in.
  - **`fromName` (AF-27, knowless 0.2.3).** Wired
    `fromName: cfg.mailFromName` into both knowless factories. Inbox
    preview now reads `addypin` instead of `noreply@addypin.com`.
    knowless splits the conflated `from` field internally — RFC 5322
    `From:` header gets the display name, SMTP envelope sender stays
    bare per RFC 5321.
  - **Footer reads complete.** Static footer extended from
    `feedback@addypin.com | we don't keep your email` to
    `…we don't keep your email, only a one-way fingerprint`. The
    earlier truncation read as cut off mid-sentence. Applied to
    `server/main.js`, `server/inbound-cli.js`, and `server/mail.js`
    so all four outbound types match.
- **`SHORTCODE@` auto-reply uses the canonical subdomain URL.** The
  `Web:` line in the lookup-via-email reply now reads
  `https://CODE.addypin.com` instead of `https://addypin.com/CODE`
  — matches the email alias shape and what `web/index.html`
  advertises after pin creation. New `canonicalPinUrl()` helper in
  `server/inbound.js` picks subdomain on real hosts and path on
  localhost dev (since `*.localhost` won't resolve without
  `/etc/hosts` hacks).
- **`pin.html`: home link escapes to apex on shortcode subdomains.**
  On `F5J6KK.addypin.com` the wildcard nginx block rewrites `/` to
  `/F5J6KK`, so the relative `href="/"` on the brand logo and the
  404 "create one" link looped back to the same pin page. Detect
  the shortcode-subdomain shape and rewrite both anchors to
  `https://addypin.com/` on script load.
- **`pin.html`: Copy URL produces the canonical subdomain shape.**
  Visitors arriving via the post-confirm redirect (`/CODE?confirmed=1`)
  or any path-based link were copying the non-canonical form.
  Build the URL from the shortcode + base domain so the clipboard
  always gets `https://CODE.addypin.com/` on real hosts.

---

## [2.0.8] — 2026-04-29

### Added

- **Subdomain-per-shortcode is live (`F5J6KK.addypin.com`).** PRD §14
  flagged it as v2.1 work; ended up shipping in v2.0 cleanup once the
  cert was sorted. Two HTTPS server blocks in nginx: apex and a
  wildcard `~^(?<sc>[A-Za-z0-9]{6})\.addypin\.com$` (regex quoted —
  nginx 1.14 on RHEL 8 rejects the `$` anchor unquoted). The wildcard
  block internally rewrites `/` → `/SHORTCODE` before `proxy_pass`,
  so the existing `GET /:shortcode` route serves `pin.html`
  unchanged. Sub-paths (`/api/pins/X`, `/maplogos/*`) pass through.
  `web/pin.html` falls back to `location.hostname` for shortcode
  derivation when the path is `/`. The success screen on
  `web/index.html` advertises `SHORTCODE.host` on real domains and
  `host/SHORTCODE` on `localhost` (since `*.localhost` won't resolve
  without /etc/hosts hacks). Old `addypin.com/SHORTCODE` URLs keep
  working — the byte-identical `pin.html` is served either way, so
  no shared link, bookmark, QR code, or printed flyer breaks.

---

## [2.0.7] — 2026-04-29

### Changed

- **knowless 0.1.10 → 0.2.0.** Upstream swapped `better-sqlite3` →
  `node:sqlite`, eliminating the only native compile in the tree.
  Lockfile sheds 38 transitives (`prebuild-install`, `node-gyp`,
  `tar-fs`, etc.). Long-LTS distros (RHEL 8/9, Alma, Rocky, Amazon
  Linux 2) install vanilla — no C++20 toolchain required. Bumped
  `engines.node` floor to `>=22.5.0` (knowless's `node:sqlite`
  requirement). knowless's public surface is unchanged: no addypin
  code edits needed. Discovered the hard way during the M11 VPS
  cutover when stock g++ 8.5 / glibc 2.28 on RHEL 8 couldn't build
  `better-sqlite3@11.10.0`'s C++20 sources or run its prebuilt
  binary; this upgrade closes that whole class of install failure.
- **M11 production cutover.** Live VPS now runs the knowless-backed
  build (`addypin → knowless@0.2.0 → nodemailer`, three packages
  total, zero native deps). End-to-end smoke verified: pin creation
  → magic-link via knowless → Postfix submission to localhost:25 →
  OpenDKIM signing → Gmail relay (`status=sent`). `BASE_URL` and
  `NODE_ENV=production` added to `/etc/addypin/env` so cookie
  `Secure` flag is set and magic links render as
  `https://addypin.com/auth/callback?t=…`.

### Fixed

- **Wildcard cert renewal.** The `*.addypin.com` cert
  (`addypin.com-0001` lineage) had silently expired on 2025-12-02 —
  no DNS plugin was installed, so certbot's auto-renew couldn't
  satisfy the DNS-01 challenge that wildcards require, and the
  failure had no visible blast radius until subdomain serving became
  load-bearing today. Installed `python3-certbot-dns-route53`,
  staged AWS IAM credentials at `/root/.aws/credentials` (chmod 600),
  forced renewal, verified `certbot renew --dry-run`. New expiry
  2026-07-28; auto-renewals resume via `certbot-renew.timer`. IAM
  user has `AmazonRoute53FullAccess` for now — should tighten to a
  scoped inline policy on hosted zone `Z1CHOY92OEU194` when there's
  time. Credential halves stored in `pass` at
  `addypin/prod/aws_r53_ssl_key` (access key id) and
  `addypin/prod/aws_r53_ssl` (secret).

---

## [2.0.6] — 2026-04-29

### Changed

- **M11 — Replaced bespoke auth/sessions/auth-mail with [`knowless`](https://github.com/hamr0/knowless).**
  knowless now owns the magic-link round-trip: handle derivation
  (HMAC), sham-work timing equivalence, single-use SHA-256-hashed
  token store, session cookie signing, magic-link mail composition,
  and SMTP submission. addypin keeps everything pin-shaped (CRUD,
  lookup, shortcode retirement, the 48 h reminder, the `SHORTCODE@`
  auto-reply). User-visible behavior is preserved: drop-pin-confirm
  cycle, `/api/login` 202-JSON contract, email-in `login@`/`resend@`,
  the 48 h reminder, `/manage` UI, edit/delete. Net delta: ~1,150 LOC
  removed from `server/`, ~50 LOC added; one new transitive runtime
  dep (`nodemailer`) via knowless. Threat-model gains
  documented in PRD §7: timing equivalence on `/api/login` and
  `/api/pins` is now a real property (knowless ships a CI test
  asserting `< 1ms` delta), and DB-leak no longer exposes live
  tokens (hashed at rest). Schema changes: `pins.owner_email_fingerprint
  BLOB` → `pins.owner_handle TEXT`, `consumed_tokens` table dropped.
  Pass entry `addypin/server/email_key` auto-migrates to
  `addypin/server/knowless_secret` on first dev.sh run after upgrade.
  Manage UI now shows "Signed in as `<email>`" — sourced from
  `localStorage` (the user typed it on the form), since the server
  can't know it post-confirm. Pinned at `knowless@0.2.0` (see the
  `knowless 0.1.10 → 0.2.0` entry above for the in-flight bump).

### Added

- **Geolocation accuracy signal on the create + edit pages.** When a
  user taps the locate (crosshair) button, the browser's reported
  accuracy radius is now drawn as a red dashed circle around the
  pin, with a matching red `±N m · tap exact spot` line in the
  bottom panel. Protects against the IP-fix-on-desktop case where
  `navigator.geolocation` returns a 30 km guess that the user
  silently confirms as their pin. Triggered only by the locate
  button — search results and manual map clicks are user picks, not
  browser guesses, so they paint nothing. Any refine action (click,
  drag, search, re-locate) clears the signal.
- **Feedback channel + signed footer on every outbound email.**
  New Postfix alias `feedback@addypin.com → avoidaccess@gmail.com`
  (alongside the existing `postmaster@` and `abuse@` RFC-2142
  contacts — kept separate so deliverability/abuse mailbox stays
  clean). All four outbound message types (pin confirmation, login
  magic link, expiry reminder, shortcode auto-reply) now end with
  the standard `-- ` sig delimiter plus one line:
  `feedback@addypin.com · we don't keep your email, only a one-way
  fingerprint`. Privacy claim is accurate everywhere — for owner-
  facing mails the HMAC fingerprint is the only stored artifact;
  for the looker-upper auto-reply nothing is stored at all (which
  the "only a fingerprint" wording bounds correctly).
- **`ops/deploy.sh` + `docs/04-process/deploy.md`.** Manual deploy
  is no longer a tribal-knowledge incantation — one script enforces
  the gate (on `main`, clean tree, in sync with origin, tests
  green) before SSHing the VPS and refusing to deploy onto a dirty
  remote tree. Killed the prior failure mode where the VPS drifted
  onto an orphan local branch with a hot-patched `web/index.html`
  that was never reconciled with `origin/main`.

---

## [2.0.5] — 2026-04-29

### Fixed

- **VPS branch reconciled.** Live box was on a local `v2-rewrite`
  branch (renamed to `main` upstream months ago) with the success-
  panel redesign hot-patched into `web/index.html` directly on
  prod. Working-tree contents already matched `origin/main`, so
  `git checkout -f -B main origin/main` absorbed cleanly. Stale
  `v2-rewrite` branch deleted. Live HEAD now tracks `origin/main`
  the way the docs always claimed it did.

### Changed

- **Pin lookup page: collapsed map-app list.** The 12-app grid was
  dominating the viewport on mobile. Now Google Maps + Apple Maps
  render up-front and the remaining 10 apps live behind a native
  `<details>` disclosure ("Show 10 more ▾", chevron rotates on open).
  No JS framework, no dependency — just the browser's built-in
  widget.
- **iOS Apple Maps deep link.** On iOS the Apple Maps tile now uses
  `maps://?q=lat,lng` instead of `https://maps.apple.com/...` so the
  native Maps.app actually launches when the click originates from
  an in-app browser (Mail, Slack, etc.) where universal-link routing
  is suppressed. Other tiles unchanged — `https://` URLs already
  hand off to native apps via universal links on the happy path,
  and there's no clean per-app override that works without an app
  installed.

---

## [2.0.4] — 2026-04-20

### Added

- RFC-2142 mail contacts: `postmaster@addypin.com` and
  `abuse@addypin.com` now forward to `avoidaccess@gmail.com` via
  Postfix `virtual_alias_maps` (preempts the pipe transport).
  Needed for Microsoft SNDS signup verification and any future
  abuse-contact workflow from receivers.
- Deliverability-reputation dashboards enrolled:
  - **Microsoft SNDS + JMRP** — verified via `abuse@addypin.com`.
    Populates per-IP reputation data; JMRP emails our abuse contact
    on every user-side junk-mark. ~days to start seeing data.
  - **Google Postmaster Tools** — verified via a second apex TXT
    (`google-site-verification=...`), coexisting with the SPF TXT
    as separate quoted strings on the same record. Shows Gmail-side
    reputation, spam-complaint rate, and auth pass rates.

### Fixed

- Postfix pipe wrapper path on the VPS. During the git-based-deploy
  switchover, the wrapper moved from `/opt/addypin/inbound-wrapper.sh`
  (historical, outside the repo tree) into `/opt/addypin/ops/inbound-wrapper.sh`
  (where it lives in the repo). `master.cf` still pointed at the old
  path and every inbound email deferred with `execvp: No such file or
  directory`. Fixed `master.cf`, flushed queue, two stuck messages
  processed. Docs updated so the path stays in sync going forward.

---

## [2.0.3] — 2026-04-20

### Changed

- **Success panel redesign.** After creating a pin:
  - "Drop another pin" button moved from a standalone bottom row
    into the top banner, next to "Manage my pins →". Only shows in
    the success state.
  - Web + email link rows collapsed into two side-by-side tap-to-copy
    cards (stacked on mobile). Entire card is the click target — the
    separate "COPY" button is gone. Cards flash `✓ COPIED` inline on
    successful clipboard write.
  - Confirmation note compressed to one small uppercase line
    (`TAP TO COPY · MAGIC LINK IN INBOX · 72H TO CONFIRM`).
  - Net vertical-space reduction: ~40%.

---

## [2.0.2] — 2026-04-20

### Added

- **Naver Map** in the map-app portfolio — fills the Korea gap
  (Google Maps is legally limited there for driving/transit, so
  Koreans default to Naver). URL relies on Naver's reverse-geocode
  and lands cleanly for Korea points; blank-card for non-Korea is an
  accepted tradeoff.
- **Neshan** in the portfolio — fills the Iran gap (Google has thin
  Iran street data). Clean coord→marker URL via `nshn.ir`.
- Git-based deploy to the VPS: a dedicated **read-only ed25519
  deploy key** (`addypin-vps-deploy`) authorizes
  `/opt/addypin` as `addypin` user to `git pull` from
  `github.com/hamr0/addypin` directly. Replaces the previous
  rsync-only workflow. Private half of the key is DR-archived in
  pass under `addypin/vps/github_deploy_key`.

### Changed

- VPS `/root/.ssh/authorized_keys` pruned **18 → 2**. Kept only
  `hamr@chaotic` (laptop) and `addypin-backup@federver` (home
  server). Every other entry was v1-era (GitHub Actions runners,
  Replit scaffolding, stale host keys from previous RackNerd VPSes,
  temporary session keys). Old file archived on-box as
  `authorized_keys.v1-cruft-2026-04-20`.
- **SSH password authentication disabled** on the VPS
  (`PasswordAuthentication no` in `/etc/ssh/sshd_config`). Key-only
  auth going forward. Recovery path if keys are ever lost is the
  RackNerd web VNC console (hypervisor-level, independent of SSH) +
  the VPS root password stashed in pass.
- Pass tree cleanup:
  - Added `addypin/vps/github_deploy_key` (private half of the new
    VPS deploy key).
  - Fixed `addypin/github/git_url` to point at `hamr0/addypin`
    instead of the old `amrhas82/addypin` path.
  - Removed `addypin/ssh/authorized_keys` (stale 1-line snapshot;
    live VPS has the canonical copy).
  - Removed `addypin/ssh/password` (password auth disabled —
    irrelevant).

### Removed

- **HERE WeGo** from the map portfolio — legacy Nokia-era,
  migrated-away user base, <1% realistic tap share.
- **2GIS** — overlapped with Yandex for the 99% of non-CIS traffic.
  Kept Yandex as the CIS generalist.
- Stale `staging` branch on GitHub (v1-era continued-work, never
  shipped, dead since the v2 rewrite).
- Stale `feature/15-maps` branch (research scaffolding for the
  v1-era 15→12 map portfolio refinement; the current maplinks.js
  is the clean outcome).

---

## [2.0.1] — 2026-04-20

### Added

- Home-server backup pipeline (`ops/homeserver/`): daily at 03:15
  local, pulls SQLite DB + WAL sidecars + `/etc/letsencrypt/` from
  the VPS, rotates 30 days, pings Kuma on success.
- Kuma-based monitoring: HTTP pull for site uptime, Push for backup
  heartbeat. First full run 2026-04-19: 656 KB, 10 s wall, both
  monitors green.

### Changed

- SPF hardened from `~all` to `-all` on `addypin.com` TXT record
  after 24 h of clean DKIM-aligned traffic. mail-tester remains
  **10/10** post-tighten. M10 fully shipped.

### Fixed

- `addypin-backup.sh` uses `ssh … | tar … | tar -xf -` instead of
  rsync's source-side glob; rsync 3.4 on fedora refused the glob
  through the restricted shell.

---

## [2.0.0] — 2026-04-19

The v2 rewrite. Entirely new codebase on the `main` branch; v1 is
preserved on the `v1` branch for reference only.

### Product

- **Added**: short-code links (`addypin.com/HOUSE1`), email aliases
  (`HOUSE1@addypin.com`), and twelve map-app deep links per pin
  (Google, Apple, Waze, OsmAnd, Organic Maps, Here, TomTom, Yandex,
  Yango, Mappls, Baidu, Amap).
- **Added**: magic-link login. No passwords, no OAuth. Email your
  address or hit `login@addypin.com`, click the link, land on
  `/manage` with a 30-day signed cookie.
- **Added**: single-use magic links (`consumed_tokens` table). Reuse
  after first click returns "already used."
- **Added**: unconfirmed pins are live the moment they're created —
  publicly resolvable for 72h. Confirmation claims permanent
  ownership; no separate "activation" gate.
- **Added**: 24h-before-expiry reminder email. Expiry worker pass
  wakes unconfirmed pins between 48–72h, emails the owner, marks
  `reminder_sent_at` so each pin only fires once.
- **Added**: auto-confirm on login. Clicking a magic link promotes
  every still-pending pin under that email fingerprint to confirmed
  (same proof of ownership the confirmation link requires).
- **Added**: reverse-geocoded "Near: ..." line in `SHORTCODE@` email
  replies (best-effort via Nominatim; gracefully drops the line on
  failure).
- **Added**: opt-in "use my location" crosshair button on the
  homepage. Pure `navigator.geolocation` — no background tracking.
- **Added**: `/manage` page with edit/delete per pin; edit is a
  one-line map + coords + save/cancel panel.
- **Changed**: every outbound email is `text/plain; charset=utf-8`.
  No HTML templates, no CSS — by design, documented in memory.
- **Removed**: accounts, passwords, OAuth, analytics, tracking,
  labels, tags, timestamps-in-UI, view counts, admin UI.

### Architecture

- **Changed**: Node 22 replaces Node 20. `node:sqlite` +
  `node:crypto` + `node:http` cover every stdlib need — no Express,
  no Fastify, no better-sqlite3 package.
- **Changed**: SQLite replaces Postgres. One file (`data/addypin.db`),
  two primary tables, WAL mode. Backup = `cp`.
- **Changed**: `msmtp` → local Postfix → OpenDKIM replaces Resend.
  Zero SaaS in the mail path. mail-tester scores 10/10.
- **Changed**: Postfix pipe transport replaces Resend inbound webhook.
  `virtual_alias` isn't used — transport-map routes everything to a
  Node one-shot per message via `inbound-wrapper.sh`.
- **Changed**: systemd unit replaces Docker Compose.
  `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
  `ReadWritePaths=/var/lib/addypin /var/log/addypin`.
- **Changed**: nginx config reduced to TLS termination +
  HTTP→HTTPS + single `proxy_pass` + webroot for certbot.
- **Removed**: Docker, Docker Compose, Kubernetes, Terraform, Vite,
  React, Clerk, Resend, Umami, GitHub Actions CI.

### Security

- **Added**: AES-256-GCM encryption of stored coordinates
  (`ADDYPIN_DATA_KEY`).
- **Added**: HMAC-SHA256 email fingerprints for owner lookup
  (`ADDYPIN_EMAIL_KEY`). Emails are never stored in plaintext — the
  one exception is during the 72h unconfirmed window, where an
  AES-GCM ciphertext is held so the 48h reminder can be sent.
  Nulled on confirm.
- **Added**: HMAC-SHA256 signed tokens for magic links, confirm
  links, and session cookies (`ADDYPIN_SIGNING_KEY`).
- **Added**: `Secure; HttpOnly; SameSite=Lax` session cookies.
- **Added**: single-use magic-link enforcement (see above).
- **Added**: `shortcode_reserved` blocklist — never-reusable codes
  (`ADMIN`, `LOGIN`, `RESEND`, etc.) refuse at POST time.
- **Added**: retired-shortcode table — once a pin is deleted or
  expires, its code is retired permanently and cannot be reclaimed.
- **Added**: per-IP rate limits on create, lookup, and login-email
  submission (token-bucket in memory).

### Ops

- **Added**: `ops/health-check.sh` + systemd oneshot + 15-min timer.
  Checks systemd units, local API, disk, mailq, journal errors, TLS
  expiry, DB sanity. Alerts via local Postfix to gmail on failure.
- **Added**: `ops/inbound-wrapper.sh` — Postfix pipe entry, sources
  env and execs the Node CLI on stdin.
- **Added**: `docs/03-logs/m10-deploy-log.md` — phase-by-phase
  deployment journal (backup → nuke → foundation → code →
  cert → Postfix → OpenDKIM → DNS → monitor).
- **Changed**: VPS was nuked and rebuilt from a clean AlmaLinux
  install rather than surgically removing v1. 4.3 GB freed.
  `/etc/letsencrypt/` preserved through the wipe so TLS kept
  working without re-validation.
- **Added**: DKIM selector `addypin2026` (`addypin2026._domainkey`
  TXT published in Route 53). SPF tightened to drop Resend include.
- **Added**: VPS key disaster-recovery archive under `addypin/prod/*`
  in `pass`. Losing `ADDYPIN_DATA_KEY` bricks the DB, so this is
  the only copy that survives a VPS loss.

### Documentation

- **Added**: this CHANGELOG.
- **Added**: a proper root `README.md` — architecture diagram, stack
  table with reasoning, data model, lifecycle, local dev, philosophy.
- **Added**: five-tier `docs/` hierarchy
  (00-context, 01-product, 02-features, 03-logs, 04-process).
- **Changed**: `docs/01-product/prd.md` refreshed end-to-end.
- **Changed**: dropped all `AddyPin` / `ADDYPIN` brand casings in
  user-visible strings. The wordmark is always lowercase `addypin`.

---

## [1.x] — archived

v1 shipped and served users. Its codebase lives on the `v1` branch
for historical reference and is not maintained. Rollback to v1 is
not supported — v2's data model is incompatible and no migration
was performed (clean-slate cutover was a deliberate product call).
