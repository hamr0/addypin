# addypin

**Drop a pin, get a link.**

```
https://HOUSE1.addypin.com           ← resolves to lat/lng + 12 map-app buttons
HOUSE1@addypin.com                   ← email it, get an auto-reply with the same
```

(`https://addypin.com/HOUSE1` also resolves to the same page — old links keep working.)

## What it solves

Sharing a precise place over text, email, or voice is still awkward in
2026. Coordinates are ugly, Google/Apple/Waze share links are long
and only open in the app they came from, and permanent "place URLs"
usually require an account, a pin drop in someone else's app, or a
third-party URL shortener that phones home on every click.

addypin replaces that with a **six-character handle** you can say out
loud. `HOUSE1` is the dirt road entrance to a rental with no street
address. `BBQ22` is the parking lot behind the church. `CLINIC` is
the obscure clinic door between two storefronts. The recipient opens
it in **whatever map app they already use** — Google, Apple, Waze,
Baidu, Yandex, Naver, Neshan, whatever — because addypin translates
the same coords into a deep link for each of the twelve big map
apps on the planet.

Same short link works as an email address, so someone who only has
SMS or a paper flyer can just email the shortcode and get the
location back. No accounts. No tracking. No app to install. No
shortcode is ever reused after a pin is retired, so a stale link can
never silently redirect to a stranger's location.

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
| DB | `node:sqlite` (built-in, experimental flag) | Pins are ~1 KB each. We're not going to have 100 M rows. Postgres solves problems we don't have. One `.db` file = one-command backups. As of `knowless@0.2.0` both addypin and knowless use `node:sqlite`, so the runtime tree has zero native deps. |
| Crypto | `node:crypto` stdlib | AES-256-GCM for coords + the encrypted-email blob in the unconfirmed window. Handle derivation + magic-link token signing live in knowless (HMAC-SHA256). No key rotation story because we're not claiming to need one. See PRD §4. |
| Auth + auth-mail | [`knowless`](https://github.com/hamr0/knowless) | Replaces ~1,150 LOC of bespoke magic-link plumbing (signed tokens, sessions table, mailers) with one library. Sham-work timing equivalence on POST /login (CI-tested `< 1ms` delta) and SHA-256-hashed-at-rest tokens are wins addypin couldn't justify implementing itself but inherits for free. One transitive runtime dep (`nodemailer`); knowless ships its own SQLite at `data/knowless.db` via `node:sqlite`. |
| Frontend | Plain HTML + vanilla JS + Leaflet (CDN) | Four HTML files. No build step, no bundler, no framework. Leaflet is 42 KB and it's the only page dep. |
| Maps search | OpenStreetMap Nominatim (public API) | Rate-limited, but free, and never phones home per-user. We also add +11 map-app deep links via a pure `mapLinks(lat, lng)` function. |
| Outbound mail (non-auth) | `msmtp` → local Postfix → OpenDKIM sign → public MX | Replaces Resend ($). Only the `SHORTCODE@` auto-reply is left on this path; auth mail moved to knowless's nodemailer (same Postfix, different SMTP submitter). DKIM=pass, SPF=pass, DMARC=pass end-to-end (mail-tester 10/10). |
| Inbound mail | Postfix `transport_maps` → pipe → `node server/inbound-cli.js` | Replaces Resend's paid inbound webhook. Three local-part handlers: `login@`, `resend@`, any 6-char shortcode. Anything else silently drops. |
| Process supervision | systemd unit | No Docker, no Compose, no PM2. `systemctl restart addypin`. |
| Reverse proxy | nginx + Let's Encrypt wildcard (`certbot --dns-route53`) | Handles TLS termination, HTTP→HTTPS redirect, and two HTTPS server blocks: the apex (`addypin.com`) and a wildcard (`*.addypin.com`) that rewrites `/` → `/SHORTCODE` so `https://F5J6KK.addypin.com/` and `https://addypin.com/F5J6KK` both serve the same `pin.html`. Wildcard cert via DNS-01 (Route 53), automated by certbot's systemd timer. |
| Secrets (dev) | `pass` (GPG password-store), never on disk | `./dev.sh` reads two required keys + config values from pass. First run generates anything missing; legacy `email_key` entry auto-migrates to `knowless_secret`. |
| Secrets (prod) | systemd `EnvironmentFile=/etc/addypin/env` mode 640 | Two 32-byte hex keys: `ADDYPIN_DATA_KEY` (AES, coords + encrypted-email-while-unconfirmed) and `KNOWLESS_SECRET` (HMAC, handle derivation + cookie signing). Losing `DATA_KEY` bricks the DB; losing `KNOWLESS_SECRET` invalidates every existing handle and session. Backed up in `pass` under `addypin/prod/*`. |
| Ops monitor | `ops/health-check.sh` + `ops/systemd/addypin-health.{service,timer}` | 15-min oneshot. Checks units, disk, local API, mailq, journal errors, cert expiry, DB sanity. Emails on failure via local Postfix (DKIM-signed). |
| Deploy | `ssh root@vps 'cd /opt/addypin && sudo -u addypin git pull && systemctl restart addypin'` | VPS has a read-only GitHub deploy key; the `addypin` user pulls from `github.com/hamr0/addypin` directly. Manual on purpose. |

---

## Data at rest

Two tables, one auxiliary. Minimum data, always:

```sql
CREATE TABLE pins (
    shortcode               TEXT PRIMARY KEY,     -- 6 uppercase alnum
    coords_ciphertext       BLOB NOT NULL,        -- AES-256-GCM
    coords_iv               BLOB NOT NULL,
    owner_handle            TEXT NOT NULL,        -- knowless handle: HMAC-SHA256 hex (one-way)
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
