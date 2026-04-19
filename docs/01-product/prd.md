# AddyPin v2 — Product Requirements

**Status:** In build · **Branch:** `v2-rewrite` (pushed to `origin/v2-rewrite`) · **Last updated:** 2026-04-19

## Implementation status (as of 2026-04-19)

| Milestone | Scope | Status |
|---|---|---|
| M1 | Scaffold (`package.json`, `.env.example`, layout) | ✅ shipped |
| M2 | Crypto module (AES-GCM, HMAC fingerprint, signed tokens) | ✅ shipped |
| M3 | DB module (SQLite, `pins` + `retired_shortcodes`) | ✅ shipped |
| M4 | Web server core (`node:http`, routes, rate limit, shortcode) | ✅ shipped |
| M5 | Frontend (Variant G — mono overlay + Nominatim search + 12 map buttons with logos) | ✅ shipped |
| M6 | Email out + `/confirm` flow (msmtp or console transport, signed 30d cookie) | ✅ shipped |
| M7 | Magic-link login + `/manage` + edit/delete | pending |
| M8 | Email in (Postfix pipe, `login@`/`SHORTCODE@`/`resend@`) | pending |
| M9 | Expiry cleanup worker | pending |
| M10 | Deploy to VPS + ops must-haves (§14) | pending |

No runtime dependencies have been added at any milestone. `node:sqlite` + `node:crypto` + `node:http` cover every need the design calls for.

## Cutover plan

Production DNS, v1 container, and data all remain untouched until M10 ships. When M10 is signed off:
1. Rename default branch from `main` to `main-v1-archive` (preserves v1 history).
2. Promote `v2-rewrite` to `main` (and set as default on GitHub).
3. Cut over `addypin.com` DNS to the new v2 service on the VPS.

v1 data (pins in Postgres) is **not migrated**. Per product direction, the v2 release is a clean slate — users re-create pins. This is a deliberate product call, not a technical limitation.

AddyPin turns a GPS coordinate into a short, memorable link (`HOUSE1.addypin.com`) and a matching email address (`HOUSE1@addypin.com`). Both resolve to the same coordinates and map-app shortcuts. No accounts, no tracking, no feed — just a pin and a link.

v2 is a clean rewrite. v1 worked but became over-engineered (Postgres, analytics tables, layered middleware, Docker Compose, CI/CD pipelines). v2 removes everything that is not required to do the one job.

---

## 1. Problem

Sharing a precise location over text or email is painful. Coordinates are ugly, map-app links are long and platform-specific, and permanent URLs usually require an account. AddyPin gives a person-to-person memorable handle for a place, with no signup friction.

## 2. Non-goals

Explicit list of things v2 will **not** do. Each of these was in v1.

- **No usage analytics.** No event tracking, no daily stats tables, no Umami. Server logs go to stdout, rotated by the OS, nothing else.
- **No public directory, feed, or discovery.** Pins are not listed anywhere. A shortcode is the only way in.
- **No social features.** No comments, likes, follows, shares-back.
- **No map tiles we host.** OpenStreetMap + Leaflet, client-side only.
- **No Postgres, no Docker Compose, no multi-service infra.** Single binary or single Node process + a SQLite file.
- **No SaaS / paid services in the critical path.** Every runtime dependency (email send, email receive, DB, hosting, monitoring) must be OSS or self-hosted. Resend, Postmark, Umami, and similar are out.
- **No shortcode re-use, ever.** Once a shortcode is retired (pin deleted or expired unconfirmed), it stays retired permanently. Prevents a freed code from pointing to a new, stranger's pin after someone still holds the old link.
- **No Docker, no containerization.** Single Node process, systemd unit, nginx reverse proxy, Postfix for mail. All on bare metal / VPS.
- **No CI/CD pipeline in v1.** Manual deploy to the VPS via `rsync` or `git pull`. Automate later only if it hurts.
- **No user accounts / passwords / OAuth.** Identity is a verified email via magic link. Nothing to store beyond a hash.
- **No end-to-end encryption.** Server must be able to decrypt coords to serve public lookups. Threat model in §7.

## 3. User stories

- **As a visitor**, I open `addypin.com`, drop a pin on a map, optionally type a custom code (`HOUSE1`), and enter my email. I get back a link + matching email address, plus a confirmation email with a magic link I must click to keep the pin.
- **As a link recipient**, I click `HOUSE1.addypin.com` and see a map at those coordinates plus buttons to open in Google Maps / Apple Maps / Waze / etc. Nothing else — no label, no owner info, no timestamp.
- **As an email sender**, I email `HOUSE1@addypin.com` and receive an auto-reply with the same map links.
- **As a pin owner**, I log in by either (a) entering my email on the web and clicking the magic link in the reply, or (b) emailing `login@addypin.com` and clicking the magic link in the reply. Either way I land on a page listing every pin I own, where I can edit coords or delete.
- **As a pin owner**, once I have confirmed the pin (clicked its confirmation magic link), the pin is permanent. I own it until I delete it.
- **As someone who never confirmed**, my pin auto-expires 72 hours after creation. Confirmation must happen inside that window.

## 4. Data model

Single SQLite file: `data/addypin.db`. Two tables.

```sql
CREATE TABLE pins (
    shortcode              TEXT PRIMARY KEY,       -- 6-char, uppercased, user-chosen or generated
    coords_ciphertext      BLOB NOT NULL,          -- AES-256-GCM("lat,lng"), server key
    coords_iv              BLOB NOT NULL,          -- per-row 12-byte nonce
    owner_email_fingerprint BLOB NOT NULL,         -- HMAC-SHA256(server_key, lowercase_email) — see below
    status                 TEXT NOT NULL,          -- 'unconfirmed' | 'confirmed'
    created_at             INTEGER NOT NULL,       -- unix seconds
    updated_at             INTEGER NOT NULL,
    expires_at             INTEGER                 -- unix seconds, NULL once confirmed
);
CREATE INDEX idx_owner_fp ON pins (owner_email_fingerprint);
CREATE INDEX idx_expires  ON pins (expires_at) WHERE expires_at IS NOT NULL;

-- Tombstone for retired shortcodes. A shortcode is retired the moment
-- its pin is deleted or its unconfirmed expiry elapses. Retired codes
-- are permanent — never reusable.
CREATE TABLE retired_shortcodes (
    shortcode   TEXT PRIMARY KEY,
    retired_at  INTEGER NOT NULL                   -- unix seconds
);
```

Notes:
- **Two separate server secrets, two env vars:** `ADDYPIN_DATA_KEY` (AES-256 key for coords) and `ADDYPIN_EMAIL_KEY` (HMAC key for email fingerprints). Compromising one does not compromise the other.
- **No label column.** Minimal data, minimal exposure. The encrypted blob is exactly `"lat,lng"` — nothing else.
- **No users table, no sessions table, no analytics table, no rate-limit table.** Sessions are signed cookies; rate-limit state is in-process.
- **Email is not stored.** Only the HMAC fingerprint is. We cannot send mail to a historical owner — we only have the fingerprint, not the email. This is fine: every outgoing email is triggered by an action where the email is known (login form, inbound email to `login@`, or the confirmation email at creation time).

**Why HMAC instead of salted argon2id (answer to the fair question):**
A per-row salted hash (argon2id) is what password storage uses. It is the gold standard for "we never need to query by this value." The problem: we *do* need to query by it — the login flow is "given this email, show me their pins." With per-row salts, every row hashes differently, so finding the matches requires hashing the candidate email with every row's salt, i.e. a full table scan on every login. Doesn't scale past a few hundred pins.

HMAC solves this: it's still a one-way hash, but the "salt" is a single server secret (the `ADDYPIN_EMAIL_KEY` env var) shared across all rows. Same email → same fingerprint → O(log n) indexed lookup.

Threat implications:
- **DB-only leak:** attacker sees 32-byte opaque fingerprints. Cannot reverse without the HMAC key (which is not in the DB). No email exposure.
- **DB + env-var leak (full server compromise):** attacker can test `"is user@example.com in this DB?"` by computing its HMAC and searching. This is the accepted cost of an O(1) login lookup. Full server compromise was already out of scope in §7.

If this still feels like too much exposure, the only real alternative is to drop the email column entirely and accept that users can only log in via the exact confirmation email they received when they created the pin (no "forgot my shortcode" recovery). Flag in §12 if you want to switch.

## 5. Endpoints

### Web (minimum viable UI)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Landing + map. Drop a pin, pick custom shortcode (optional), enter email (required to own the pin). |
| POST | `/api/pins` | Create pin. Body: `{lat, lng, shortcode?, email}`. Returns `{shortcode}`. Triggers confirmation email. Rate-limited. Pin starts `status='unconfirmed'`, `expires_at = now + 72h`. |
| GET | `/api/pins/:shortcode` | Public lookup. Returns `{lat, lng, mapLinks}`. **Nothing else.** Returns 404 for unconfirmed, expired, or non-existent pins. |
| GET | `/:shortcode` | HTML page showing the map + map-app shortcut buttons. Subdomain `:shortcode.addypin.com` resolves to the same handler. |
| POST | `/api/login` | Body: `{email}`. Always returns 202 (no email enumeration). Sends magic link if the email has any confirmed pins, silently drops otherwise. Rate-limited. |
| GET | `/manage?token=...` | Magic-link landing. Validates token, sets signed cookie, redirects to `/manage`. |
| GET | `/manage` | Lists confirmed pins owned by the cookie's email fingerprint. |
| PATCH | `/api/pins/:shortcode` | Owner edits lat/lng. Requires owner cookie. |
| DELETE | `/api/pins/:shortcode` | Owner deletes pin. Requires owner cookie. Shortcode enters 24h cooldown before reusable. |
| GET | `/confirm?token=...` | Confirmation magic link (from the creation email). Marks pin `status='confirmed'`, `expires_at=NULL`. Same token also logs the user into `/manage`. Token TTL 72 h (same as pin life). |

### Email triggers

**Inbound:** Postfix pipe transport. `virtual_alias_maps` maps `*@addypin.com` to a single local mailbox (`addypin@localhost`), whose `.forward` pipes each incoming message to a long-running Node process over a local Unix socket (or a one-shot CLI invocation — decide during POC). The VPS already runs Postfix as the addypin.com MX, so no new mail server to stand up.

**Outbound:** `msmtp` (system binary) invoked via `child_process`. Sends through `mail.addypin.com`'s local submission port. Zero external SMTP relay. Existing DKIM signing on Postfix is reused.

Both paths are OSS, zero SaaS, no Resend.

| To | Behavior |
|----|----------|
| `login@addypin.com` | Reply with magic link to `/manage?token=...`. Token is signed, 15-min TTL, single-use. Silently drops if the sender has no confirmed pins (no email enumeration). |
| `SHORTCODE@addypin.com` | Auto-reply with coords + map links for that pin. Silently drops if pin is unconfirmed, expired, or the shortcode is retired. |
| `resend@addypin.com` with subject `SHORTCODE` | If sender's email HMAC matches the pin owner AND pin is still unconfirmed (within the 72 h window), regenerates the confirmation token and resends the creation email. Silently drops otherwise. Rate-limited per shortcode. |
| anything else | Silently drop. No bounces, no NDRs. |

### Map-link shortcuts

Reuse v1's map-link logic verbatim. 15 known providers (Google Maps, Apple Maps, Waze, OsmAnd, Organic Maps, etc.). Pure function: `(lat, lng) → { provider: url }`. Port the file from `archive/v1/`.

## 6. Shortcode rules

- **Length:** exactly 6 characters.
- **Alphabet:** `A–Z` and `0–9`. Case-insensitive input, stored uppercase.
- **User-chosen** at creation. If omitted, server generates a random 6-char code.
- **Uniqueness:** enforced by PRIMARY KEY on `pins`. Also checked against `retired_shortcodes` table at creation — **retired codes are never reusable** (even by the original owner). This trades off one convenience (user can't re-claim their own old code) for a hard guarantee that a stale link can never silently redirect to a stranger's pin.
- **Collision UX:** on collision, UI shows "`HOUSE1` is taken. Try `HOUSE2`?" where the suggestion is the next available numeric/alphabetic increment (`HOUSE1` → `HOUSE2` → `HOUSE3` → `HOUSE0` → `HOUSEA`…). User can accept the suggestion or type their own. If their own also collides, the loop repeats.
- **Blocklist:** small file (`server/blocklist.txt`, ~200 entries) covering offensive words and high-risk impersonation (`GOOGLE`, `POLICE`, `AMAZON`, etc.). Rejected at creation.
- **Reserved:** subdomain-like codes (`WWW`, `API`, `MAIL`, `SMTP`, `IMAP`, `ADMIN`, `LOGIN`, `ABOUT`, etc.) are rejected. List lives in the same blocklist file.

## 7. Threat model

**In scope (what we protect against):**
- **DB file theft / backup leak.** Attacker with `addypin.db` sees: shortcodes, encrypted blobs, email HMACs, salts, timestamps. They cannot recover coords (no AES key) or emails (HMAC is one-way, key is separate).
- **Casual DB inspection.** Same protection.
- **Email enumeration from public endpoints.** `GET /api/pins/:shortcode` never reveals the owner. No endpoint returns a list of emails.

**Out of scope (accepted risks):**
- **Server compromise.** Attacker with root on the VPS has both the AES key and the HMAC key (env vars) — they can decrypt everything. We accept this; see non-goals for why we are not doing E2E.
- **Traffic analysis.** A network attacker watching requests to `/api/pins/XYZ123` learns the shortcode exists. Acceptable — shortcodes are already meant to be shared.
- **Magic-link email interception.** Anyone with access to the owner's email inbox can log in. This is the same security model as every consumer service that supports "forgot password."

## 8. Rate limiting

In-process token bucket. No Redis. Limits applied per IP:
- `POST /api/pins`: 5 per hour, 20 per day.
- `GET /api/pins/:shortcode`: 300 per 15 min (lookups are cheap, don't over-constrain).
- `POST /api/login`: 3 per hour per email fingerprint.
- `login@addypin.com` (inbound email): 3 per hour per sender fingerprint.
- `resend@addypin.com` (inbound email): 3 per hour per shortcode.

On restart, counters reset. Acceptable for v2 scale (~hundreds of requests/day). If the VPS is ever DDoS'd, nginx-level connection limits are the outer ring before any of these fire.

## 9. Tech stack (target)

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 20 | Matches v1; unchanged in skill set. Candidate for Go later if desired. |
| Web framework | Express (minimal) or native `http` | No NestJS, no Fastify plugins. Stdlib-first per AGENT_RULES. |
| DB | SQLite via `better-sqlite3` | Synchronous, zero-config, single-file. |
| Crypto | Node `crypto` stdlib (AES-256-GCM, HMAC, Argon2 via `@node-rs/argon2`) | Vetted libs, stdlib where possible. |
| Frontend | Plain HTML + vanilla JS + Leaflet | No React, no Vite, no Tailwind build. v1 used React; v2 does not need it. One page, one form, one map. |
| Email out | `msmtp` (system binary) via `child_process` | OSS, zero-dep, already on the VPS. No SaaS relay. |
| Email in | Postfix pipe transport → Node script | Postfix already runs on the VPS as the MX for addypin.com. Use `virtual_alias_maps` + `.forward` pipe. True catch-all, zero polling latency. |
| Session | Signed cookie (HMAC using a third env-var secret) | Absolute 30-day TTL, non-rolling. No session table. |
| Process mgmt | systemd unit on the VPS | No Docker, no Compose. One Node process, one SQLite file, one nginx reverse proxy. |

Revisit if the POC (§11) reveals any of these are wrong.

## 10. Success criteria

- Fresh VM → fully running AddyPin in under 10 minutes of commands.
- Whole repo compiles and ships in one binary-equivalent artifact (tarball or single Node process).
- Create → share → resolve round-trip works from a cold cache in under 300 ms on the VPS.
- Total server code under 1,500 LOC (excluding third-party and the frontend HTML/JS).
- DB backup is one file copy.

## 11. POC (before any production code)

Per AGENT_RULES, build a ~15-min proof first. Must validate:

1. Create a pin → encrypt coords → write row to a SQLite file.
2. Read by shortcode → decrypt → return coords. No auth.
3. Compute email HMAC → query pins by HMAC → list them. (Login path.)
4. Sign a magic-link token, verify it, reject expired.

If those four work end-to-end in a single `poc.js` file with hardcoded keys, the design is sound. Throw the POC away after.

## 12. Open questions

All resolved as of 2026-04-18:

- ~~Confirmation magic-link TTL.~~ **Resolved:** one token, 72 h TTL, same as pin life.
- ~~HMAC acceptance.~~ **Resolved:** HMAC-based email fingerprints (§4) accepted.
- ~~IMAP credentials.~~ **Resolved:** no IMAP. Mail is self-hosted on `mail.addypin.com` (confirmed via `dig MX`). Postfix pipe transport used instead. See §5.
- ~~Confirmation resend UX.~~ **Resolved:** inbound-email trigger `resend@addypin.com` with subject = shortcode. No new web endpoint.

Remaining items for the build phase (not blockers):

- **SPF record cleanup.** Current TXT record includes `_spf.resend.com` from v1. Remove that include when v2 ships. Tighten `~all` to `-all` once DKIM on self-hosted Postfix is confirmed working.
- **DKIM key continuity.** Confirm the existing DKIM selector on `mail.addypin.com` still signs outbound msmtp messages. If not, rotate.
- **Postfix pipe invocation style.** Long-running Node process listening on a Unix socket, or one-shot `node script.js` per message? POC should test both and pick lower-latency.

## 14. Deploy / operations must-haves (M10)

Non-negotiable for production cutover. Each item replicates something v1 has running today — we lose it if we don't re-do it on the v2 service:

- **VPS cutover: nuke vs preserve.** Wipe the VPS to a clean OS instead of surgically removing v1 (simpler, less leftover-surface to audit). Back up `/etc/letsencrypt/` (certbot state + cert files) off-VPS before the wipe and restore after — this preserves TLS with no re-validation. Also back up: pass store excerpt for VPS creds, DKIM selector key for `mail.addypin.com`, any manually-placed `/etc/ssl/` certs. Nuke everything else: docker containers + volumes + network bridges, Postgres, v1 app dirs, nginx configs, old systemd units, all old crons.
- **TLS renewal cron.** After cutover, certbot's systemd timer resumes automatically since `/etc/letsencrypt/` is preserved. Verify with `certbot renew --dry-run` before pointing DNS. Cron also fires a renewal attempt daily as a belt-and-braces fallback.
- **Backups (rebuild fresh, not restore old).** Nightly copy of `data/addypin.db` + `/etc/letsencrypt/` off the VPS (rsync to an external host). One file for the DB, ~1 MB for certbot state — cheap. Include the three env-var secrets (in `pass`, not the backup) in the restore runbook — losing `ADDYPIN_DATA_KEY` means the DB backup is a brick.
- **Disk-space watch (new cron).** Every 30 min, check `df /` + `df ${DATA_DIR}`. Email-to-self via msmtp when either drops below 15% free. SQLite WAL can grow silently under load; early warning beats a surprise.
- **API health cron (new, on-VPS).** Every 5 min: `curl -fsS http://127.0.0.1:3000/api/health || alert`. Catches process crashes that didn't re-start cleanly. Complements the external uptime probe below.
- **External uptime watchdog.** External HTTP probe of `https://addypin.com/api/health` every 1–5 min (a separate host, a Healthchecks.io-style free service, or a second cheap VPS). If non-200 for N minutes, alert. This is the only check that survives the VPS being fully down.
- **Log retention.** `journalctl` for the systemd unit; keep at least 14 days, rotate beyond. stdout is the only log stream we emit.
- **Process manager.** systemd unit that restarts on crash, starts on boot, drops privileges to a non-root user. Not Docker.
- **Service identity/DKIM.** The existing DKIM selector on `mail.addypin.com` must still sign outbound msmtp from the new service (see `docs/00-context/infra-snapshot.md`). Verify before cutover.
- **Nginx config.** Reverse proxy + HTTP→HTTPS redirect + wildcard-cert → v2 app port. The subdomain-per-shortcode lookup (`HOUSE1.addypin.com`) is v2.1 work; for v2.0 only the apex is served.
- **Rollback plan.** Keep the v1 service running on a different port during cutover. If v2 misbehaves in the first 24 h, flip nginx back. Delete v1 only after a stable week.

## 13. Out for later (v2.1+)

- Custom domains on shortcodes.
- Pin expiry option for privacy-conscious users.
- Signed audit log of edits (git-style append-only) for the tamper-evidence idea that got cut from v2.
- Go rewrite of the server if Node proves heavy.
- **Korea map coverage.** Add Naver Map (or KakaoMap) to the 12-app portfolio in `server/maplinks.js`. Korea is the only major region currently uncovered — Google Maps is legally limited there (no driving/transit directions due to data export restrictions), so the local apps dominate. URL pattern needs validation; the existing `mapLinks()` function takes one new entry, no other changes.
- **Mappls UX caveat.** The canonical Mappls share URL (`https://maps.mappls.com/direction?destination={lat},{lon}`) opens in directions mode — the user is asked for an origin before seeing the destination. Verified across 12+ public repos via GitHub code search; this is the product's intentional default (delivery-driver focus). No `/place/`, `/@lat,lng`, `/marker`, or other place-view URL exists. Alternatives: switch to `/embed?lat=X&lng=Y&zoom=15` (lighter chrome, iframe-style) if a place view becomes essential. v2 ships with the canonical URL; revisit only if Mappls publishes a non-directions place URL.
