# addypin

Turn a GPS coordinate into a short, memorable link.

```
https://addypin.com/HOUSE1          ← resolves to lat/lng + 12 map-app buttons
HOUSE1@addypin.com                   ← email it, get an auto-reply with the same
```

No accounts. No tracking. No app to install. Create a pin, share the
shortcode, done. Anyone with the code can open the location; only you
(as the creator) can edit or delete it via a magic-link login.

---

## Why v2 is a clean rewrite

v1 shipped, served users, and taught us what the product actually
needed. It also accumulated the usual tax: Postgres, Docker Compose,
React + Vite, a Resend-backed email pipeline, Umami analytics,
Clerk-style auth scaffolding, CI/CD pipelines, a dozen middleware
layers, and a 400-line nginx config. Most of that existed to solve
problems we didn't have.

v2 is a bet in the opposite direction. Every runtime dependency has to
earn its place. Every line of code has to have a reason someone can
point at. If the Node stdlib can do it in under 100 lines, we don't
pull in a library. If a SaaS can be replaced with a system binary and
a config file, we replace it. The rewrite is on a new `main` branch;
v1 is preserved on the `v1` branch for reference only.

The spec is [`docs/01-product/prd.md`](docs/01-product/prd.md) — read
that first if you want the full rationale. What follows is just the
architecture and the reasoning behind the stack.

---

## Architecture, in one picture

```
    browser  ──HTTPS──►  nginx  ──HTTP─►  systemd: addypin.service (Node 22)
                          │                          │
                          │                          ├─ node:http router
                          │                          ├─ node:sqlite (one file)
                          │                          ├─ node:crypto (AES-GCM, HMAC)
                          │                          └─ child_process ──► msmtp
                          │                                                  │
                          │                                                  ▼
                          │                                      Postfix on 127.0.0.1:25
                          │                                                  │
                          │                                                  ▼
                          │                                       OpenDKIM signs (s=addypin2026)
                          │                                                  │
                          │                                                  ▼
                          │                                            public MX
                          │
 inbound MX addypin.com ──► Postfix ──transport_maps──► pipe: inbound-wrapper.sh
                                                              │
                                                              ▼
                                                     node server/inbound-cli.js
                                                              │
                                                              ▼
                                                       same SQLite file
```

One box. One Node process. One SQLite file. One nginx in front. Postfix
for mail in+out. systemd for process supervision. That's the whole
production surface.

---

## The stack (and why)

| Layer | Choice | Why not the usual thing |
|---|---|---|
| Runtime | Node.js 22 | Because `node:sqlite` + `node:http` + `node:crypto` remove three dependencies. TypeScript adds nothing here — plain ESM with JSDoc where it matters. |
| HTTP | `node:http` + a tiny router | Express/Fastify were overkill for ~20 routes. The router is 80 lines and you can read it in two minutes. |
| DB | `better-sqlite3`-ish via `node:sqlite` (built-in, experimental flag) | Pins are ~1 KB each. We're not going to have 100 M rows. Postgres solves problems we don't have. One `.db` file = one-command backups. |
| Crypto | `node:crypto` stdlib | AES-256-GCM for coords, HMAC-SHA256 for email fingerprints, HMAC-SHA256 for magic-link tokens. No key rotation story because we're not claiming to need one. See PRD §4. |
| Frontend | Plain HTML + vanilla JS + Leaflet (CDN) | Four HTML files. No build step, no bundler, no framework. Leaflet is 42 KB and it's the only page dep. |
| Maps search | OpenStreetMap Nominatim (public API) | Rate-limited, but free, and never phones home per-user. We also add +11 map-app deep links via a pure `mapLinks(lat, lng)` function. |
| Outbound mail | `msmtp` → local Postfix → OpenDKIM sign → public MX | Replaces Resend ($). DKIM=pass, SPF=pass, DMARC=pass end-to-end (mail-tester 10/10). |
| Inbound mail | Postfix `transport_maps` → pipe → `node server/inbound-cli.js` | Replaces Resend's paid inbound webhook. Three local-part handlers: `login@`, `resend@`, any 6-char shortcode. Anything else silently drops. |
| Process supervision | systemd unit | No Docker, no Compose, no PM2. `systemctl restart addypin`. |
| Reverse proxy | nginx + Let's Encrypt (certbot webroot) | Handles TLS termination and the HTTP→HTTPS redirect. Also the wildcard cert for future `SHORTCODE.addypin.com` subdomains (v2.1). |
| Secrets (dev) | `pass` (GPG password-store), never on disk | `./dev.sh` reads three required keys + config values from pass. First run generates anything missing. |
| Secrets (prod) | systemd `EnvironmentFile=/etc/addypin/env` mode 640 | Three 32-byte hex keys: `ADDYPIN_DATA_KEY` (AES), `ADDYPIN_EMAIL_KEY` (HMAC), `ADDYPIN_SIGNING_KEY` (HMAC). Losing `DATA_KEY` bricks the DB — backed up in `pass` under `addypin/prod/*`. |
| Ops monitor | `ops/health-check.sh` + `ops/systemd/addypin-health.{service,timer}` | 15-min oneshot. Checks units, disk, local API, mailq, journal errors, cert expiry, DB sanity. Emails on failure via local Postfix (DKIM-signed). |
| Deploy | `git pull && npm ci && systemctl restart addypin` | Manual on purpose. Automation comes later if it hurts. |

---

## Data at rest

Two tables, one auxiliary. Minimum data, always:

```sql
CREATE TABLE pins (
    shortcode               TEXT PRIMARY KEY,     -- 6 uppercase alnum
    coords_ciphertext       BLOB NOT NULL,        -- AES-256-GCM
    coords_iv               BLOB NOT NULL,
    owner_email_fingerprint BLOB NOT NULL,        -- HMAC-SHA256 (one-way)
    owner_email_ciphertext  BLOB,                 -- only while unconfirmed
    owner_email_iv          BLOB,                 -- (both nulled on confirm)
    reminder_sent_at        INTEGER,              -- NULL until 48h reminder fires
    status                  TEXT NOT NULL,        -- 'unconfirmed' | 'confirmed'
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL,
    expires_at              INTEGER               -- NULL for confirmed
);

CREATE TABLE retired_shortcodes (    -- once retired, never reused
    shortcode  TEXT PRIMARY KEY,
    retired_at INTEGER NOT NULL
);

CREATE TABLE consumed_tokens (       -- magic-link single-use enforcement
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);
```

An attacker who exfiltrates `addypin.db` sees opaque blobs and nothing
more — no coords, no owner emails, no labels. Only a full server
compromise (which gets the env-var keys) recovers plaintext. That
tradeoff is deliberate and documented in PRD §7.

---

## Pin lifecycle

```
POST /api/pins (lat, lng, email [, shortcode])
        │
        ▼
  status = unconfirmed
  email encrypted + stored
  expires_at = now + 72h
        │
        ├─ user clicks /confirm?token=... ──┐
        │                                   ▼
        │                            status = confirmed
        │                            email nulled, reminder_sent_at nulled
        │                            permanent until owner deletes
        │
        ├─ user waits 48h ──►  expiry worker sends reminder
        │                      (marks reminder_sent_at so it only fires once)
        │
        └─ user never confirms ──►  72h passes
                                    shortcode → retired_shortcodes
                                    pin row deleted
                                    email gone with it
```

During the 72h window the pin is **publicly resolvable** — visiting
`/HOUSE1` or emailing `HOUSE1@addypin.com` works. Confirmation is
about claiming permanent ownership, not activating the pin.

---

## Local dev

```bash
./dev.sh            # starts node --watch, reads secrets from `pass`
./dev.sh --no-watch # same, no auto-restart
npm test            # 182 tests, no env needed — uses :memory: SQLite
npm start           # production-style run; expects env set externally
```

`./dev.sh` will prompt for GPG once per shell session to unlock the
password store. On first run it generates any missing keys and stashes
them back into `pass` under `addypin/server/*`.

---

## Documentation map

Five tiers under `docs/`:

| Path | What's in it |
|---|---|
| [`docs/00-context/`](docs/00-context/) | Infra snapshot, VPS state, assumptions |
| [`docs/01-product/`](docs/01-product/) | PRD — the source of truth for scope and design |
| [`docs/02-features/`](docs/02-features/) | Per-feature specs |
| [`docs/03-logs/`](docs/03-logs/) | Decision logs, deployment journals, incident notes |
| [`docs/04-process/`](docs/04-process/) | Workflow, deploy runbook, milestone tracking |

Start at [`docs/01-product/prd.md`](docs/01-product/prd.md), then
[`docs/03-logs/m10-deploy-log.md`](docs/03-logs/m10-deploy-log.md) for
the rollout history.

---

## What v2 deliberately does not have

- No accounts, no passwords, no OAuth
- No tracking, no analytics, no event pipeline
- No labels, tags, categories, or metadata on pins
- No user-visible timestamps, last-opened counters, or view stats
- No push notifications
- No mobile app
- No API key / rate-limit-per-token model (public lookups are rate-limited per IP only)
- No admin panel (shell into the VPS if you need to operate on the DB)
- No CI/CD pipeline (manual deploy)
- No Docker, no Kubernetes, no Terraform

Every one of those was on the table and was cut. The absence is the
feature.
