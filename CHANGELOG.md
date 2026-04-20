# Changelog

All notable changes to addypin. Format loosely follows [Keep a
Changelog](https://keepachangelog.com/). Dates are `YYYY-MM-DD`.

## [Unreleased]

### Added

- **Naver Map** in the map-app portfolio — fills the Korea gap
  (Google Maps is legally limited there for driving/transit, so
  Koreans default to Naver). URL relies on Naver's reverse-geocode
  and lands cleanly for Korea points; blank-card for non-Korea is an
  accepted tradeoff.
- **Neshan** in the portfolio — fills the Iran gap (Google has thin
  Iran street data). Clean coord→marker URL via `nshn.ir`.

### Removed

- **HERE WeGo** — legacy Nokia-era, migrated-away user base, <1%
  realistic tap share. Dead weight in the grid.
- **2GIS** — overlapped with Yandex for the 99% of non-CIS traffic.
  Kept Yandex as the CIS generalist.
- Stale `staging` branch on GitHub (was v1-era continued-work, never
  shipped, dead since the v2 rewrite).

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
