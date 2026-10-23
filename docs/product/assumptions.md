# Assumptions, constraints, and rules we committed to

These are the rules the v2 rewrite committed to. They aren't
suggestions — each one has a reason, and drifting from them silently
is what got v1 bloated in the first place. Revisit explicitly if a
new feature can't be built under these rules; don't just relax a
rule because it's in the way.

## Engineering rules

### Dependency hierarchy (strict)

1. **Vanilla language** first — JS syntax, built-in types.
2. **Standard library** second — `node:http`, `node:sqlite`,
   `node:crypto`, `node:child_process`.
3. **External package** only when stdlib genuinely can't do it in
   <100 lines, AND the package is maintained, lightweight, widely
   adopted. No micro-deps.

**Exception:** security-critical code (crypto, auth, sanitization)
always uses vetted libraries even when stdlib is close — the stakes
don't tolerate a homegrown HMAC implementation.

### POC first

Always validate the core logic with a ~15-min proof-of-concept
before building. Cover happy path + common edges. POC works →
design properly → build with tests. Never ship the POC. The v2 POC
validated: AES-GCM coord round-trip, HMAC-indexed email lookup,
signed-token verify+TTL, shortcode→decrypt→response.

### Build incrementally

Break work into small independent modules. One piece at a time,
each working on its own before integrating. Milestones M1–M10 were
each shipped and tested before the next one started.

### Every line has a purpose

No speculative code. No premature abstractions. No feature flags
for hypothetical futures. No "might need this later" scaffolding.
Three similar lines is better than a premature abstraction. If a
helper is only used once, inline it.

### Lightweight over complex

Fewer moving parts, fewer dependencies, less config. Express over
NestJS, plain HTML over React, SQLite over Postgres, msmtp over
Resend. Simple > clever. Readable > elegant.

## Non-functional constraints

### Open-source only, no SaaS in the critical path

Every runtime dependency is OSS or self-hosted. No Resend, no
Postmark, no Umami, no Docker Hub dependency, no Auth0. The
product must work offline-of-every-vendor. v1 violated this with
Resend; v2 replaced it with msmtp + local Postfix + OpenDKIM.

### Minimum data

Per-pin storage is: encrypted lat/lng, HMAC fingerprint of owner
email, timestamps, status. That's it. No labels, no tags, no
analytics, no session table, no rate-limit table. An attacker
who steals the DB file sees opaque blobs for ~everything they
care about.

### Secrets live in `pass`, never on disk

Local dev: `pass show addypin/server/*` via `./dev.sh`. Production:
`/etc/addypin/env` mode 640 on the VPS, read by the systemd unit's
`EnvironmentFile=`. Three keys — `ADDYPIN_DATA_KEY`,
`ADDYPIN_EMAIL_KEY`, `ADDYPIN_SIGNING_KEY` — plus config. A DR copy
of the VPS keys lives at `pass addypin/prod/*` because losing
`ADDYPIN_DATA_KEY` bricks the DB backup.

### Shortcodes never reuse

Deleted or expired codes go into `retired_shortcodes` and cannot
be reclaimed by anyone, including the original owner. Prevents a
stale link from silently redirecting to a stranger's pin.

### Manual deploy

`ssh root@vps 'cd /opt/addypin && sudo -u addypin git pull &&
systemctl restart addypin'`. No CI/CD pipeline. Automate only if
it hurts; so far it hasn't.

### Plain-text emails forever

Outbound mail is always `text/plain; charset=utf-8`. No HTML
templates, no CSS inlining, no multipart/alternative. See memory
`feedback_plaintext_email` for the full rationale. If a future
feature genuinely needs HTML (a marketing campaign, not a
transactional mail), revisit explicitly.

## Risks we accepted

| Risk | Mitigation |
|---|---|
| Full server compromise → all data decryptable | Explicit non-goal. No E2E. Server has to decrypt to serve public lookups. |
| Unconfirmed pin holds encrypted email for 72 h | Accepted for the 48h reminder feature. Nulled on confirm; worst-case window is 72 h per pin. |
| Outbound deliverability from a new sending domain | Accepted. SPF/DKIM/DMARC all pass (mail-tester 10/10). Microsoft's reputation system is slower than Gmail's; expect 2–4 weeks of MSN junk folder before trust accrues. |
| SQLite single-file DB vs. Postgres | Accepted. At product scale (<1M pins) SQLite is not the bottleneck. WAL mode handles concurrent reads fine; writes are sequential and short. |
| Magic-link email interception | Accepted. Same threat model as any "forgot password" flow. Single-use enforcement (via `consumed_tokens`) narrows but doesn't close the window. |

## What would cause us to revisit

- Any new user count that pressures SQLite (>10k pins/day ingestion)
- A provider-level block that makes msmtp → Postfix outbound untenable
- A feature genuinely requiring HTML email (we'd add multipart, not
  replace plain)
- A product pivot toward route-sharing (Komoot/Strava/AllTrails
  territory) — that's a different product, not a wider map grid
