# CLAUDE.md

AddyPin is a location sharing service that turns GPS coordinates into short, memorable links. Users drop pins on a map and share them as web links (`ABC123.addypin.com`) or email addresses (`ABC123@addypin.com`).

**You are working on v2 — a clean rewrite.** v1 is archived under `archive/v1/` as reference only. Do not build on it. The v2 design lives in [`docs/01-product/prd.md`](docs/01-product/prd.md) and is the source of truth for scope, data model, endpoints, and threat model.

The live production site (`addypin.com`) still runs v1 at this moment. v2 will cut over only once built, tested, and validated.

## Dev Rules

**POC first.** Always validate logic with a ~15min proof-of-concept before building. Cover happy path + common edges. POC works → design properly → build with tests. Never ship the POC.

**Build incrementally.** Break work into small independent modules. One piece at a time, each must work on its own before integrating.

**Dependency hierarchy — follow strictly:** vanilla language → standard library → external (only when stdlib can't do it in <100 lines). External deps must be maintained, lightweight, and widely adopted. Exception: always use vetted libraries for security-critical code (crypto, auth, sanitization).

**Lightweight over complex.** Fewer moving parts, fewer deps, less config. Express over NestJS, plain HTML over React unless the UI genuinely needs a framework. Simple > clever. Readable > elegant.

**Open-source only.** No SaaS in the critical path. Every runtime dependency must be OSS or self-hosted. No Resend, no Postmark, no Umami, no Docker.

**Every line must have a purpose.** No speculative code, no premature abstractions.

For full development and testing standards, see `.claude/memory/AGENT_RULES.md`.

## Tech stack (v2 target)

- **Runtime:** Node.js 20
- **Web framework:** Minimal Express (or native `node:http` if it fits)
- **DB:** SQLite via `better-sqlite3` — one file, two tables
- **Crypto:** `node:crypto` stdlib (AES-256-GCM, HMAC-SHA256)
- **Frontend:** Plain HTML + vanilla JS + Leaflet (CDN). No React, no Vite, no Tailwind build step.
- **Email out:** `msmtp` system binary via `child_process`
- **Email in:** Postfix `virtual_alias_maps` → pipe transport to a Node script
- **Process:** systemd unit on the VPS. No Docker, no Compose.
- **Reverse proxy:** Existing nginx with Let's Encrypt wildcard cert for `*.addypin.com`.

## Commands

```bash
./dev.sh            # Start local dev server with --watch (canonical local-dev path)
./dev.sh --no-watch # Same, no auto-restart
npm test            # Run all tests (no env vars needed)
npm start           # Production-style run; expects env vars set externally
```

**Secrets live in `pass`, never on disk.** `dev.sh` reads three required keys and four optional values from the password store under `addypin/server/*` (paths in `dev.sh`). On first run, any missing key is generated, inserted into `pass`, and used. `pass` prompts your GPG agent on first call per shell session.

Production / VPS uses environment variables loaded from a systemd `EnvironmentFile=` (or `.env` next to `main.js`). The shape is documented in `.env.example`. Never commit a real `.env`.

## Project layout (target)

| Path | Purpose |
|------|---------|
| `archive/v1/` | v1 reference only — do not edit |
| `docs/` | Documentation, 5-tier hierarchy ([docs/README.md](docs/README.md)) |
| `server/` | Node backend (crypto, db, http, email) — does not exist yet |
| `web/` | Static HTML + JS + CSS + Leaflet — does not exist yet |
| `data/` | Runtime SQLite file (gitignored) — does not exist yet |
| `poc/` | Throwaway proof-of-concept (§11 of PRD) — does not exist yet |

## Key constraints

1. **Minimum data.** Only lat/lng is stored per pin (encrypted). No labels. No analytics. No session table.
2. **Encrypted coords, HMAC-fingerprinted owner email.** Two server-held secrets in env vars: `ADDYPIN_DATA_KEY` (AES-256) and `ADDYPIN_EMAIL_KEY` (HMAC). See PRD §4.
3. **Shortcodes are never reusable.** Deleted or expired codes are retired permanently (see PRD §6 + `retired_shortcodes` table).
4. **Pin expiry.** Unconfirmed pins live 72 h, then auto-delete. Confirmed pins are permanent until owner deletes them.
5. **All management via magic link.** No passwords, no OAuth. Login flow: enter email on web form OR email `login@addypin.com` → magic link sent → click → land on `/manage` with a 30-day signed cookie.
6. **Public lookup returns only `{lat, lng, mapLinks}`.** No owner info, no timestamps, no labels. Minimum exposure.

## Threat model summary (PRD §7)

| Attack | Protected? |
|--------|-----------|
| DB file theft / backup leak | Yes. Attacker sees opaque blobs, cannot recover coords or emails without env-var keys. |
| Casual DB inspection | Yes. |
| Email enumeration via public endpoints | Yes. Shortcode lookup never reveals owner; `POST /api/login` always returns 202. |
| Full server compromise (root on VPS) | Accepted risk. Attacker with env vars can decrypt everything. This is why we're not doing E2E encryption — PRD §2 non-goals. |

## Deployment (v2 target)

Manual: `git pull && npm ci && systemctl restart addypin` on the VPS. No Docker, no GitHub Actions pipeline in v2.0. Automate later only if it hurts.

## Important notes

- **Never edit files under `archive/v1/`.** Reference only.
- **Never reintroduce** Postgres, Docker, Resend, Umami, React, or any paid SaaS without a PRD amendment.
- **Shortcodes are 6 uppercase alphanumeric characters.** Case-insensitive at input, stored uppercase. User-chosen or server-generated.
- Nginx handles SSL termination (Let's Encrypt wildcard). VPS infra is documented at [`docs/00-context/infra-snapshot.md`](docs/00-context/infra-snapshot.md).

## Current state (2026-04-18)

v2 rewrite is on branch `v2-rewrite`. PRD is written and agreed. POC has not started yet. When continuing, the next step per AGENT_RULES is to build the ~15-min POC in `poc/poc.js` validating the four claims in PRD §11, then throw it away and start Milestone 1.
