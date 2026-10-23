---
title: Observability playbook - monitoring stack blueprint
theme: monitoring-blueprint
sources:
  - docs/archive/observability-playbook.md
---

# Observability playbook: monitoring stack blueprint

A generic, copy-into-any-project setup for **error capture, health checks, a weekly growth digest, local backups, and off-box watchdogs** — using [`flightlog`](https://github.com/hamr0/flightlog) and [`pulselog`](https://github.com/hamr0/pulselog). Zero paid SaaS, zero production dependencies, no Docker. Everything is a systemd timer + one JSONL line per event. (docs/archive/observability-playbook.md:3-8)

> **How to use this doc.** Replace every `<PLACEHOLDER>` with your project's value. The running example is an app called `<APP>` on host `<VPS_IP>`, served at `<DOMAIN>`, running as the unprivileged user `<APP_USER>`, with code at `<APP_DIR>` (e.g. `/opt/<APP>`) and runtime state at `<DATA_DIR>` (e.g. `/var/lib/<APP>`). Alerts go to `<OPERATOR_EMAIL>`. (docs/archive/observability-playbook.md:10-14)

| Placeholder | Meaning | Example |
|---|---|---|
| `<APP>` | app / project name | `myapp` |
| `<APP_USER>` | unprivileged service user | `myapp` |
| `<APP_DIR>` | deployed code dir | `/opt/myapp` |
| `<DATA_DIR>` | runtime state (DB, `*.jsonl`) | `/var/lib/myapp` |
| `<DOMAIN>` | public domain | `myapp.com` |
| `<VPS_IP>` | VPS public IP | `203.0.113.10` |
| `<MAIL_HOST>` | HELO / rDNS name for mail | `mail.myapp.com` |
| `<DKIM_SELECTOR>` | OpenDKIM selector | `myapp2026` |
| `<OPERATOR_EMAIL>` | where alerts land | `you@gmail.com` |
(docs/archive/observability-playbook.md:16-26)

This core page covers the architecture and the prerequisites; the sibling pages (see "Related pages") cover each layer in detail.

## Architecture: four independent layers

Each layer catches what the others miss. Layers 1-3 live on the VPS; layer 4 lives on a **separate always-on box** (a home server, a second cheap VPS) so it survives the VPS being fully down. (docs/archive/observability-playbook.md:32-34)

```
                          ┌──────────────────────── VPS (<VPS_IP>) ────────────────────────┐
  app throws  ──▶ (1) flightlog  ──▶  <DATA_DIR>/errors.jsonl                                │
                          │                                                                  │
  every 15m  ──▶ (2) pulselog health   (systemd timer)  ── silent on green, emails on fail   │
  weekly     ──▶ (3) pulselog digest   (systemd timer)  ── stats + error rollup email        │
                          └──────────────────────────────────────────────────────────────────┘
                                                        ▲ reads maillog / DB over SSH
  ┌──────────── backup host (home server / 2nd VPS) ───┼───────────────────────────────────┐
  daily      ──▶ pulselog --backup   (systemd timer)   │  curated DB + certs, rotated        │
  every 5m   ──▶ (4) pulselog watch  (systemd timer) ──┘  uptime + cert + backup-fresh       │
                                                          + mail-delivery (optional)          │
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```
(docs/archive/observability-playbook.md:36-49)

### Layer summary

| # | Layer | Runs where | Cadence | Catches |
|---|-------|-----------|---------|---------|
| 1 | **flightlog** | in-app | on error | uncaught exceptions, rejections, `capture()`d errors → `errors.jsonl` |
| 2 | **pulselog health** | VPS | 15 min | unit down, API 5xx, disk full, cert expiring, mail queue backed up |
| 3 | **pulselog digest** | VPS | weekly | growth metrics (WoW) + "≥N of the same error this week" |
| 4 | **pulselog watch + backup** | off-box | 5 min / daily | site down, cert expired, stale/failed backup, **mail delivery broken** |

(docs/archive/observability-playbook.md:51-56)

- Layer 1 (flightlog) runs in-app and records errors to `errors.jsonl`. (docs/archive/observability-playbook.md:38, 53)
- Layers 2 and 3 are systemd timers on the VPS: health is silent on green and emails on failure; digest sends a stats and error-rollup email. (docs/archive/observability-playbook.md:40-41)
- Layer 4 runs from the backup host: a daily `pulselog --backup` (curated DB + certs, rotated) and a 5-minute `pulselog watch` checking uptime, cert, backup freshness, and optionally mail delivery. (docs/archive/observability-playbook.md:45-47)
- The watcher reads maillog / DB over SSH from the VPS. (docs/archive/observability-playbook.md:43)

Everything writes the **same JSONL dialect** (`{"ts","kind","app",…}`), so one `tail`/`jq` spans errors, health, stats, and backups. (docs/archive/observability-playbook.md:58-59)

## Prerequisites

- **Node.js**: flightlog needs ≥18 (ESM `import`) or ≥22.12 for CommonJS `require`. pulselog's `command`/`http`/backup modes need only Node ≥18; its bundled SQLite metric helpers need ≥22.5 (`--experimental-sqlite`). Match your app's runtime. (docs/archive/observability-playbook.md:65-68)
- **Install** (as runtime deps, so `npm ci --omit=dev` on the server still gets them): (docs/archive/observability-playbook.md:69-70)
  ```bash
  npm i flightlog pulselog          # in-app + on-VPS
  sudo npm i -g pulselog            # on the backup host (invoked as a CLI)
  ```
  (docs/archive/observability-playbook.md:71-74)
- **A mailer.** pulselog and your app send via `sendmail`. Have a working MTA (Postfix + OpenDKIM) **or** a `sendmail` shim (`msmtp` + `msmtp-mta`). This is the step everyone skips and then silently loses every alert. See [mail-deliverability.md](mail-deliverability.md) (SPF, DKIM, PTR). (docs/archive/observability-playbook.md:75-77)
- **A dedicated service user** (`<APP_USER>`) the app + timers run as. Keep it unprivileged: it will NOT be able to read `/var/log/maillog`; that matters for the off-box watchdog in [offbox-backup-watch.md](offbox-backup-watch.md) and the checks in [verify-and-troubleshoot.md](verify-and-troubleshoot.md). (docs/archive/observability-playbook.md:78-80)

## Related pages

- [Mail deliverability](mail-deliverability.md)
- [App capture and metrics](app-capture-and-metrics.md)
- [Health and digest](health-and-digest.md)
- [Units, security and layout](units-security-layout.md)
- [Off-box backup and watch](offbox-backup-watch.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
