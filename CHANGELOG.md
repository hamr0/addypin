# Changelog

All notable changes to addypin. Format loosely follows [Keep a
Changelog](https://keepachangelog.com/). Dates are `YYYY-MM-DD`.

## [Unreleased]

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

- **`digest.js` deduplication.** Replaced the local `sendViaMsmtp`
  copy with an import of `msmtpTransport` from `server/mail.js`.
  The duplicate would have diverged silently from any future fixes
  to the shared transport (header changes, error handling, etc.).
- **`digest.js` `from` fallback.** Changed `'auth@addypin.com'`
  (the magic-link sender) to `'noreply@addypin.com'` to match
  `.env.example`. Only matters when no `MAIL_FROM_ADDRESS` env var
  is set.
- **`stats.js` missing-DB guard.** Added an `fs.existsSync` check
  before `new DatabaseSync(…, { readOnly: true })`. Previously a
  fresh deploy before any pins were created would crash with an
  opaque SQLite error; now it exits 0 with a clear message.
- **`addypin-stats-digest.timer` timezone.** Added `UTC` to
  `OnCalendar` (`Sun *-*-* 09:00:00 UTC`) so the Sunday-morning
  digest fires at a fixed wall-clock time regardless of the VPS
  locale or DST transitions.

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
