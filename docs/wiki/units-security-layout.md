---
title: systemd units, security notes and file inventory
theme: units-security-layout
sources:
  - docs/archive/observability-playbook.md
---

# systemd units, security notes and file inventory

Covers the VPS systemd units, the security and privacy notes, and the minimal file inventory (docs/archive/observability-playbook.md:307-385) (docs/archive/observability-playbook.md:531-579) (docs/archive/observability-playbook.md:580-603).

## systemd units (VPS)

Health check, every 15 min (docs/archive/observability-playbook.md:309). The service is a oneshot that runs pulselog against the config (docs/archive/observability-playbook.md:311-321):
```ini
# /etc/systemd/system/<APP>-health.service
[Unit]
Description=<APP> health check (pulselog)
After=network-online.target
[Service]
Type=oneshot
User=<APP_USER>
Group=<APP_USER>
ExecStart=/usr/bin/node <APP_DIR>/node_modules/pulselog/bin/pulselog.js --config <APP_DIR>/pulselog.config.json
Nice=10
```
Its timer (docs/archive/observability-playbook.md:322-333):
```ini
# /etc/systemd/system/<APP>-health.timer
[Unit]
Description=Run <APP> health check every 15 minutes
[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
AccuracySec=1min
Persistent=true
[Install]
WantedBy=timers.target
```

Digest, weekly on Sunday at 09:00 UTC (docs/archive/observability-playbook.md:335). The sandbox directives and their comments are part of the unit (docs/archive/observability-playbook.md:337-356):
```ini
# /etc/systemd/system/<APP>-stats-digest.service
[Unit]
Description=<APP> weekly stats digest (pulselog --digest)
After=network-online.target
[Service]
Type=oneshot
User=<APP_USER>
Group=<APP_USER>
WorkingDirectory=<APP_DIR>
EnvironmentFile=/etc/<APP>/env       # so stats.js sees DB_PATH/DATA_DIR
ExecStart=/usr/bin/node <APP_DIR>/node_modules/pulselog/bin/pulselog.js --digest --config <APP_DIR>/pulselog.config.json
# NoNewPrivileges disables postdrop's setgid bit, so sendmail needs the group;
# ProtectHome=read-only (not true) so the fallback sink can read ~/.msmtprc.
NoNewPrivileges=true
SupplementaryGroups=postdrop
ProtectSystem=true
ProtectHome=read-only
PrivateTmp=true
Nice=10
```
If you use `ProtectSystem=strict` instead, also add
`ReadWritePaths=/var/spool/postfix/maildrop`. (docs/archive/observability-playbook.md:357-358)
```ini
# /etc/systemd/system/<APP>-stats-digest.timer
[Unit]
Description=Send the <APP> weekly stats digest every Sunday
[Timer]
OnCalendar=Sun *-*-* 09:00:00 UTC
AccuracySec=15min
Persistent=true
[Install]
WantedBy=timers.target
```
(timer: docs/archive/observability-playbook.md:359-369)

Enable (docs/archive/observability-playbook.md:371-376):
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now <APP>-health.timer <APP>-stats-digest.timer
systemctl list-timers '<APP>-*'
```

Deploy gotcha: a deploy script that only does `git pull` + `npm ci` + `systemctl restart <APP>` does not install or reload these unit files or the config. Do that by hand when you add or change them (`daemon-reload`). Make sure `pulselog` is a runtime dep so `npm ci --omit=dev` installs `node_modules/pulselog/bin/pulselog.js`. (docs/archive/observability-playbook.md:378-382)

## Security and privacy notes

- **Config-ownership gate (pulselog 0.4.0 and later):** the CLI refuses a config that is group/world-writable or owned by a third party, because it drives command execution. A config that is root-owned and readable by a non-root service user is fine (0.4.1). Keep configs `0644 root` or owned by the running user. (docs/archive/observability-playbook.md:533-536)
- **Alert and digest mail is plain `sendmail`, unsigned by pulselog itself.** Deliverability rides entirely on your MTA ([mail-deliverability.md](mail-deliverability.md)). Keep a secondary signal: the JSONL lines, the off-box `file-age` dead-man's-switch ([offbox-backup-watch.md](offbox-backup-watch.md)), and a fallback sink. (docs/archive/observability-playbook.md:537-540)
- **Fallback alert sink (pulselog 0.7.0 and later):** add `fallback` to `alert`/`digest`/`backup`. It is a `command` (no shell) that gets the alert body on stdin and the subject as `PULSELOG_SUBJECT`, over a path independent of the primary MTA. (docs/archive/observability-playbook.md:541-545)
  - `when: "always"` (default) also survives an async bounce after a clean local handoff, which is what broken SPF/DKIM/PTR looks like: `sendmail` returns 0 and Gmail bounces later. `when: "on-primary-failure"` fires only when the local handoff fails. (docs/archive/observability-playbook.md:545-548)
  - Use `always` for health alerts (silent on green, so no duplicate mail) and `on-primary-failure` for the digest (avoids a duplicate weekly email). A broken sink is recorded in the JSONL, never fatal. (docs/archive/observability-playbook.md:563-567)
  - Hung-sendmail guard (pulselog 0.8.0 and later): the primary send is bounded by `mailTimeoutMs` (optional on `alert`/`digest`/`backup`, default 30000). On timeout pulselog kills the whole process group and the fallback fires, so `on-primary-failure` now covers a hung sendmail. When a send was attempted and every delivery path failed, health and digest exit 1, so the systemd unit shows failed. (Before 0.8.0 the primary send had no timeout, so a hung sendmail never reported failure. The old verification workaround is retired: use `--test-alert` through the real unit, see [verify and troubleshoot](verify-and-troubleshoot.md).)
```jsonc
"alert": {
  "email": "you@example.com",
  "fallback": {
    "when": "always",
    // independent path — e.g. authenticated msmtp submission (Gmail-signed),
    // NOT the same localhost/Postfix account that may be the broken thing:
    "command": "/opt/<APP>/ops/fallback-notify.sh",
    "timeoutMs": 15000
    // or a push channel:  "command": "curl",
    //   "args": ["-m","10","-fsS","-d","@-","https://ntfy.sh/<secret-topic>"]
  }
}
```
(config example: docs/archive/observability-playbook.md:549-562)
- **Error messages and stacks never leave the box** via the digest, only counts and group names. Don't defeat this by putting PII in the flightlog `where`/`name`. (docs/archive/observability-playbook.md:571-572)
- **flightlog `context` is not clobber-protected:** pass allow-listed fields, never a raw request/payload object ([app-capture-and-metrics.md](app-capture-and-metrics.md)). (docs/archive/observability-playbook.md:573-574)
- Both tools write JSONL `0600`. Back up `errors.jsonl`/`stats.jsonl` if you want history to survive a rebuild; neither is in the DB backup by default. (docs/archive/observability-playbook.md:575-576)

## Minimal file inventory (docs/archive/observability-playbook.md:580-599)

```
<APP_DIR>/
  bin/stats.js                  # your only custom code: prints {"metric":N,...}
  pulselog.config.json          # health + digest sections
  node_modules/{flightlog,pulselog}
/etc/<APP>/env                  # DB_PATH/DATA_DIR for the digest's stats.js
/etc/systemd/system/
  <APP>-health.{service,timer}
  <APP>-stats-digest.{service,timer}
<DATA_DIR>/
  errors.jsonl  health.jsonl  stats.jsonl

# backup host
/etc/<APP>/pulselog.config.json
/etc/default/<APP>-backup
/usr/local/bin/{<APP>-pull.sh,<APP>-mail-check.sh}
/etc/systemd/system/<APP>-{watch,backup}.{service,timer}
```

Mental model: flightlog records errors, pulselog watches health, trends and backups, and mail carries the alerts. The mail path ([mail-deliverability.md](mail-deliverability.md)) is the part that will bite you, so verify it first and watch it from off-box. (docs/archive/observability-playbook.md:601-603)

Back to the overview: [observability playbook](observability-playbook.md)
