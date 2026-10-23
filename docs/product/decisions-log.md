# Decisions log

One line per material architectural/product call, with the date and
a pointer to where the reasoning lives. Not a diary — only
decisions that would surprise a future reader or that someone might
try to revisit.

## 2026-04-20

- **SPF tightened to `-all`.** After 24 h of DKIM-signed traffic with
  zero bounces, flipped `~all` → `-all` on the `addypin.com` TXT.
  mail-tester held 10/10 post-tighten. → `03-logs/m10-deploy-log.md`
  Phase 3h.
- **Naver + Neshan added to map portfolio; HERE + 2GIS dropped.**
  Coverage over clutter — filled Korea + Iran gaps, removed dead
  weight. Grid stayed at 12. → `CHANGELOG.md` [2.0.2]. Activity-
  specialist apps (Komoot, Strava, AllTrails) explicitly excluded
  because they share routes, not points.
- **Git-based deploy replaces rsync.** Added a read-only GitHub
  deploy key on the VPS (`addypin-vps-deploy`). Canonical deploy is
  `cd /opt/addypin && sudo -u addypin git pull && systemctl
  restart addypin`. Rsync stays available for out-of-band hotfixes.
- **VPS SSH hardened.** `/root/.ssh/authorized_keys` pruned 18 → 2,
  `PasswordAuthentication no`. RackNerd VNC console is the break-
  glass. → `CHANGELOG.md` [2.0.2].
- **Single-use magic links.** New `consumed_tokens` table enforces
  first-click-wins on login URLs. Prevents replay within the 15-min
  TTL. → `01-product/prd.md` §7.
- **Unconfirmed pins are now publicly resolvable.** Changed from
  "confirm-gates-activation" to "confirm-claims-ownership". Pin is
  live the moment it's created; confirmation turns the 72 h
  temporary pin into a permanent one. → `01-product/prd.md` §5, §6.
  Motivation: users share before checking email; the original
  "unconfirmed = 404" produced bad UX.
- **24h reminder email added.** Expiry worker sends a reminder at
  ≤24 h remaining. Required storing the owner email as AES-GCM
  ciphertext for the unconfirmed 72 h window (nulled on confirm).
  Accepted a small reversible-PII window in exchange for the
  feature. → `01-product/prd.md` §7 (risk table).
- **All outbound from `noreply@addypin.com` with display name
  "addypin".** Considered: using `login@` so replies loop back to a
  magic link. Rejected for clarity (`noreply@` signals "don't reply"
  up front; `login@` cleverness confuses recipients replying to a
  SHORTCODE@ auto-reply). → conversation log.

## 2026-04-19

- **M10 shipped.** VPS cutover complete: Postfix + OpenDKIM + nginx +
  systemd + health monitor + off-VPS backup all live. mail-tester
  10/10. → `03-logs/m10-deploy-log.md`.
- **Home-server (federver) owns backup + uptime monitoring.** Not a
  laptop cron (laptop sleeps), not a paid SaaS (Healthchecks.io was
  considered and passed over since the federver was already there
  running Kuma). Three monitoring layers — Kuma pull for site uptime,
  Kuma push for backup heartbeat, on-VPS ops/health-check.sh for
  process-level signals.
- **Nuke-and-rebuild, not surgical v1 removal.** Cleaner end state,
  4.3 GB freed. `/etc/letsencrypt/` preserved across the wipe to
  keep TLS valid without re-validation. → `03-logs/m10-deploy-log.md`
  Phase 2.
- **Branches reshaped.** `main` = v2 rewrite. `v1` = archived
  pre-rewrite state (read-only reference). `staging` and
  `feature/15-maps` deleted as stale v1-era cruft.

## Pre-2026-04-19 (during the v1→v2 rewrite)

- **Postgres → SQLite (`node:sqlite`).** Pin volume is tiny
  (<1M rows ever); one file; backups are `cp`. Postgres solved
  problems we didn't have. → `01-product/prd.md` §9.
- **Resend → msmtp + local Postfix + OpenDKIM.** Zero SaaS in the
  mail path. OpenDKIM setup lifted from the gitdone project as a
  known-good baseline. → `01-product/prd.md` §14.
- **Resend inbound webhook → Postfix pipe transport.** One-shot
  `node server/inbound-cli.js` per message, invoked by Postfix via
  `/opt/addypin/ops/inbound-wrapper.sh`. No long-running daemon,
  no webhook endpoint to secure. → `01-product/prd.md` §9.
- **React → plain HTML + vanilla JS + Leaflet (CDN).** Four HTML
  files, no build step, no framework. v1 used React; v2 didn't
  need it. → `01-product/prd.md` §9.
- **Docker → systemd unit.** `ProtectSystem=strict`, `ProtectHome`,
  `PrivateTmp`. No Docker, no Compose, no Kubernetes.
- **HMAC-fingerprinted owner email, not salted hash.** Salted hashes
  break indexed lookup (login flow needs "given email, find pins").
  HMAC with a single server key gives one-way + O(log n) indexed
  lookup. Threat trade is documented. → `01-product/prd.md` §4.
- **Shortcodes never reusable.** `retired_shortcodes` table is
  consulted at create time. Once a code is used, it's burned.
  Prevents the "stale link redirects to a stranger's pin" failure
  mode. → `01-product/prd.md` §6, §2.
- **No usage analytics, no event pipeline, no user-visible
  timestamps.** Minimum data posture. Explicit non-goal.
  → `01-product/prd.md` §2.
- **POC first, throw away.** The 15-min proof validated the four
  core claims (AES-GCM round-trip, HMAC lookup, signed tokens,
  shortcode→decrypt) before M1 started. File was deleted after.
  → `01-product/prd.md` §11.

---

**Adding entries:** one-liner + date + pointer. If you find yourself
writing a paragraph, the explanation probably belongs in the PRD or a
log — link to it instead. This file should scan quickly.
