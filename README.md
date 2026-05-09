# addypin

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.2-2a4f8c" alt="version 2.0.2">
  <img src="https://img.shields.io/badge/license-Apache%202.0-2a4f8c" alt="license: Apache 2.0">
</p>

**Drop a pin, get a link.**

```
https://HOUSE1.addypin.com    →  lat/lng + 12 map-app deep links
HOUSE1@addypin.com            →  email it, get the same back
```

Six-character handle, sayable out loud. Works as URL or email address.
Path form (`addypin.com/HOUSE1`) also resolves — old links don't break.
No accounts, no tracking, no app. Retired shortcodes are never reused,
so a stale link can't silently redirect to someone else's location.

v2 is a clean rewrite on `main`. v1 lives on the `v1` branch for
reference. Source of truth: [`docs/01-product/prd.md`](docs/01-product/prd.md).

---

## Architecture

```
browser ──HTTPS──► nginx ──HTTP──► systemd: addypin.service (Node 22)
                                     ├─ node:http router
                                     ├─ node:sqlite (data/addypin.db)
                                     ├─ node:crypto (AES-GCM, HMAC)
                                     ├─ knowless (auth, sessions, magic-mail)
                                     │     └─ data/knowless.db (node:sqlite)
                                     └─ child_process → msmtp ─┐
                                                               ▼
                                            Postfix (127.0.0.1:25)
                                                    │
                                                    ▼
                                          OpenDKIM signs (s=addypin2026)
                                                    │
                                                    ▼
                                                public MX

inbound MX ──► Postfix ──transport_maps──► pipe: ops/inbound-wrapper.sh
                                                    │
                                                    ▼
                                          node server/inbound-cli.js
```

One box, one Node process, two SQLite files, nginx in front, Postfix
for mail in+out, systemd for supervision.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 | `node:sqlite` + `node:http` + `node:crypto` are stdlib. Plain ESM, JSDoc, no TypeScript. |
| HTTP | `node:http` + 80-line router | Express was overkill for ~20 routes. |
| DB | `node:sqlite` (experimental flag) | One `.db` file, one-command backup. Zero native deps in the runtime tree as of `knowless@0.2.0`. |
| Crypto | `node:crypto` | AES-256-GCM (coords, unconfirmed-window email). HMAC-SHA256 lives in knowless. PRD §4. |
| Auth + auth-mail | [`knowless`](https://github.com/hamr0/knowless) | Magic-link plumbing, sham-work timing equivalence (`<1ms` CI-tested), SHA-256-hashed tokens. One transitive (`nodemailer`). Own SQLite at `data/knowless.db`. |
| Frontend | HTML + vanilla JS + Leaflet (CDN) | Four files. No build step. Leaflet is the only page dep. |
| Maps search | OpenStreetMap Nominatim | Free, rate-limited, no per-user phone-home. +11 deep links via `mapLinks(lat, lng)`. |
| Outbound mail (non-auth) | `msmtp` → Postfix → OpenDKIM → public MX | Only the `SHORTCODE@` auto-reply remains here; auth mail moved to knowless's nodemailer (same Postfix). DKIM/SPF/DMARC pass; mail-tester 10/10. |
| Inbound mail | Postfix `transport_maps` → pipe → `inbound-cli.js` | Three handlers: `login@`, `resend@`, any 6-char shortcode. Else: drop. |
| Process | systemd unit | No Docker, no PM2. `systemctl restart addypin`. |
| Reverse proxy | nginx + Let's Encrypt wildcard (`certbot --dns-route53`) | Two HTTPS server blocks: apex and `*.addypin.com` (rewrites `/` → `/SHORTCODE` so subdomain and path resolve to the same `pin.html`). DNS-01 via Route 53, auto-renewed by `certbot-renew.timer`. |
| Secrets (dev) | `pass` (GPG) | `./dev.sh` reads keys at use-time; first run generates any missing. |
| Secrets (prod) | systemd `EnvironmentFile=/etc/addypin/env` (mode 640) | Two 32-byte keys: `ADDYPIN_DATA_KEY` (AES) + `KNOWLESS_SECRET` (HMAC). DATA_KEY loss bricks the DB; KNOWLESS_SECRET loss invalidates all handles + sessions. |
| Ops monitor | `ops/health-check.sh` + systemd timer | 15-min oneshot: units, disk, API, mailq, journal errors, cert expiry, DB sanity. Mails on failure. |
| Deploy | `git pull && systemctl restart addypin` over SSH | Read-only GitHub deploy key on the VPS. Manual on purpose. |

---

## Data at rest

```sql
CREATE TABLE pins (
    shortcode               TEXT PRIMARY KEY,     -- 6 uppercase alnum
    coords_ciphertext       BLOB NOT NULL,        -- AES-256-GCM
    coords_iv               BLOB NOT NULL,
    owner_handle            TEXT NOT NULL,        -- HMAC-SHA256 (one-way)
    owner_email_ciphertext  BLOB,                 -- only while unconfirmed
    owner_email_iv          BLOB,                 -- (both nulled on confirm)
    reminder_sent_at        INTEGER,
    status                  TEXT NOT NULL,        -- 'unconfirmed' | 'confirmed'
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    expires_at              INTEGER               -- NULL for confirmed
);

CREATE TABLE retired_shortcodes (shortcode TEXT PRIMARY KEY, retired_at INTEGER NOT NULL);
CREATE TABLE consumed_tokens   (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
```

DB exfiltration alone leaks no coords, emails, or labels — env-var keys
are required to recover plaintext. PRD §7 documents the threat model.

---

## Pin lifecycle

```
POST /api/pins (lat, lng, email [, shortcode])
       │
       ▼
  status=unconfirmed, email encrypted, expires_at = now + 72h
       │
       ├─ user clicks /confirm?token=…  →  status=confirmed, email + reminder_sent_at nulled, permanent
       ├─ 48h passes                    →  expiry worker sends reminder (sets reminder_sent_at)
       └─ 72h passes, no confirm        →  shortcode → retired_shortcodes; row deleted
```

Pins are publicly resolvable from creation. Confirmation claims
ownership; it doesn't activate the pin.

---

## Local dev

```bash
./dev.sh            # node --watch, reads secrets from `pass`
./dev.sh --no-watch # same, no auto-restart
npm test            # all tests, in-memory SQLite, no env needed
npm start           # prod-style run; env set externally
npm run stats       # one-shot: prints "pins=N customers=M" against data/addypin.db
npm run stats:log   # same, polling every 10 min; redirect + nohup to background-log
```

GPG prompts once per shell session. Missing keys are generated on first
run and stashed back into `pass` under `addypin/server/*`.

---

## Docs

| Path | Contents |
|---|---|
| [`docs/00-context/`](docs/00-context/) | Infra snapshot, VPS state |
| [`docs/01-product/`](docs/01-product/) | PRD — source of truth |
| [`docs/02-features/`](docs/02-features/) | Per-feature specs |
| [`docs/03-logs/`](docs/03-logs/) | Decision logs, deploy journals |
| [`docs/04-process/`](docs/04-process/) | Workflow, deploy runbook |

Start at the PRD; [`docs/03-logs/m10-deploy-log.md`](docs/03-logs/m10-deploy-log.md)
covers the v2 rollout.

---

## Not in v2

No accounts, passwords, OAuth, tracking, analytics, event pipeline,
labels, tags, timestamps-shown-to-users, view counters, push, mobile
app, API keys, admin panel, CI/CD, Docker, Kubernetes, Terraform.
The absence is the feature.
