# CLAUDE.md

addypin is a location sharing service that turns GPS coordinates into short, memorable links. Users drop pins on a map and share them as web links (`ABC123.addypin.com`) or email addresses (`ABC123@addypin.com`).

**You are working on v2 — a clean rewrite on the `main` branch.** v1 is preserved on the `v1` branch for reference only. Do not build on it. The v2 design lives in [`docs/01-product/prd.md`](docs/01-product/prd.md) and is the source of truth for scope, data model, endpoints, and threat model.

## Dev Rules

**POC first.** Always validate logic with a ~15min proof-of-concept before building. Cover happy path + common edges. POC works → design properly → build with tests. Never ship the POC.

**Build incrementally.** Break work into small independent modules. One piece at a time, each must work on its own before integrating.

**Dependency hierarchy — follow strictly:** vanilla language → standard library → external (only when stdlib can't do it in <100 lines). External deps must be maintained, lightweight, and widely adopted. Exception: always use vetted libraries for security-critical code (crypto, auth, sanitization).

**Lightweight over complex.** Fewer moving parts, fewer deps, less config. Express over NestJS, plain HTML over React unless the UI genuinely needs a framework. Simple > clever. Readable > elegant.

**Open-source only.** No SaaS in the critical path. Every runtime dependency must be OSS or self-hosted. No Resend, no Postmark, no Umami, no Docker.

**Every line must have a purpose.** No speculative code, no premature abstractions.

For full development and testing standards, see `.claude/memory/AGENT_RULES.md`.

## Tech stack

- **Runtime:** Node.js 22 (`engines.node >=22.5.0`)
- **Web framework:** Native `node:http` + ~80-line custom router
- **DB:** `node:sqlite` (`--experimental-sqlite`) — `data/addypin.db` for pins, `data/knowless.db` for handles/tokens/sessions. Both via the same driver as of `knowless@0.2.0`; files stay separate so the two domains have independent backup/wipe/migration lifecycles.
- **Crypto:** `node:crypto` stdlib (AES-256-GCM for coords + the encrypted-email blob in the unconfirmed window)
- **Auth + auth-mail:** [`knowless`](https://github.com/hamr0/knowless) (since M11, on `0.2.0` since the cutover). Owns magic-link round-trip, sham-work timing equivalence, single-use SHA-256-hashed token store, session cookies, and SMTP submission for auth mail. One transitive runtime dep (`nodemailer`) — zero native compiles in the tree.
- **Frontend:** Plain HTML + vanilla JS + Leaflet (CDN). No React, no Vite, no Tailwind build step.
- **Email out (non-auth):** `msmtp` system binary via `child_process` for the `SHORTCODE@` auto-reply.
- **Email in:** Postfix `virtual_alias_maps` → pipe transport to a Node script (instantiates its own knowless instance per message).
- **Process:** systemd unit on the VPS. No Docker, no Compose.
- **Reverse proxy:** nginx + Let's Encrypt wildcard cert (`certbot --dns-route53`, auto-renewed). Two HTTPS server blocks: apex (`addypin.com`) and `*.addypin.com` (rewrites `/` → `/SHORTCODE` so subdomain and path forms both serve `pin.html`).

## Commands

```bash
./dev.sh            # Start local dev server with --watch (canonical local-dev path)
./dev.sh --no-watch # Same, no auto-restart
npm test            # Run all tests (no env vars needed)
npm start           # Production-style run; expects env vars set externally
```

**Secrets live in `pass`, never on disk.** `dev.sh` reads two required keys (`addypin/server/data_key`, `addypin/server/knowless_secret`) and four optional values from the password store. On first run, any missing key is generated, inserted into `pass`, and used. `pass` prompts your GPG agent on first call per shell session. The legacy `addypin/server/email_key` entry is auto-migrated to `knowless_secret` on first run after M11 — same hex, new name.

Production / VPS uses environment variables loaded from a systemd `EnvironmentFile=` (or `.env` next to `main.js`). The shape is documented in `.env.example`. Never commit a real `.env`.

## Project layout (target)

| Path | Purpose |
|------|---------|
| `docs/` | Documentation, 5-tier hierarchy ([docs/README.md](docs/README.md)) |
| `server/` | Node backend (crypto, db, http, email) |
| `web/` | Static HTML + JS + CSS + Leaflet |
| `ops/` | Deploy artifacts: inbound wrapper, health-check, systemd units |
| `data/` | Runtime SQLite file (gitignored) |

## Key constraints

1. **Minimum data.** Only lat/lng is stored per pin (encrypted). No labels. No analytics. No session table.
2. **Encrypted coords, HMAC-derived owner handles.** Two server-held secrets in env vars: `ADDYPIN_DATA_KEY` (AES-256, coords + unconfirmed-window email) and `KNOWLESS_SECRET` (HMAC, handle derivation + cookie signing). See PRD §4.
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

**Always deploy via `./ops/deploy.sh`.** Don't ssh into the VPS to `git pull` by hand, and don't tell the user to do it themselves — the script reads SSH host/user/key from `pass` (`addypin/ssh/{host,user,private_key}`), runs pre-flight (on main, clean tree, in sync with origin, `npm test` green), pulls + restarts on the VPS, and smoke-tests `https://addypin.com/`. Full runbook: [`docs/04-process/deploy.md`](docs/04-process/deploy.md). No Docker, no CI/CD pipeline in v2.0.

## Important notes

- **v1 code is on the `v1` branch** — check it out if you need to reference the old implementation. Do not merge from it.
- **Never reintroduce** Postgres, Docker, Resend, Umami, React, or any paid SaaS without a PRD amendment.
- **Shortcodes are 6 uppercase alphanumeric characters.** Case-insensitive at input, stored uppercase. User-chosen or server-generated.
- Nginx handles SSL termination via the wildcard cert at `/etc/letsencrypt/live/addypin.com-0001/`. Wildcard renewal uses the `certbot-dns-route53` plugin — AWS creds at `/root/.aws/credentials` (chmod 600), IAM creds in `pass` at `addypin/prod/aws_r53_ssl_key` and `addypin/prod/aws_r53_ssl`. VPS infra: [`docs/00-context/system-state.md`](docs/00-context/system-state.md).

## Current state (2026-04-29)

M1–M11 shipped. Live `https://addypin.com` and `https://SHORTCODE.addypin.com` both resolve, knowless@0.2.0 backs the auth flow, wildcard cert renewed (auto-renewal via `certbot-renew.timer`). Path-based URLs (`addypin.com/SHORTCODE`) still resolve so old links don't break. Pending tail: tighten the IAM policy from `AmazonRoute53FullAccess` to a scoped inline policy on hosted zone `Z1CHOY92OEU194`; off-VPS backup/watchdog.
