---
title: Off-box backup host: local backup and watch
theme: offbox-backup-watch
sources:
  - docs/archive/observability-playbook.md
---

# Off-box backup host: local backup and watch

Optional but recommended (docs/archive/observability-playbook.md:386-386). It runs on a separate always-on machine; one config drives both modes: `--backup` runs the backup section, no flag runs the `checks` (docs/archive/observability-playbook.md:388-390). This is the only layer that survives the VPS being completely down (docs/archive/observability-playbook.md:389-390).

## Config

`/etc/<APP>/pulselog.config.json` on the backup host (docs/archive/observability-playbook.md:392-392):

```json
{
  "output": { "file": "/home/<USER>/<APP>-backups/health.jsonl", "maxBytes": 5000000 },
  "alert":  { "email": "<OPERATOR_EMAIL>", "from": "<OPERATOR_EMAIL>", "app": "<APP>-offbox" },
  "retry":  { "retries": 2, "retryDelayMs": 2000 },
  "checks": [
    { "type": "http",     "name": "site",        "url": "https://<DOMAIN>/health", "expectStatus": 200, "timeoutMs": 10000 },
    { "type": "ssl",      "name": "cert",        "host": "<DOMAIN>", "port": 443, "warnDays": 14 },
    { "type": "file-age", "name": "backup-fresh","path": "/home/<USER>/<APP>-backups", "maxAgeHours": 30, "pattern": ".tar.gz" },
    { "type": "command",  "name": "mail-delivery","command": "/usr/local/bin/<APP>-mail-check.sh", "timeoutMs": 20000 }
  ],
  "backup": {
    "app": "<APP>", "dir": "/home/<USER>/<APP>-backups", "name": "<APP>-backup",
    "command": "/usr/local/bin/<APP>-pull.sh", "timeoutMs": 600000,
    "keepLast": 7, "keepDays": 30, "minBytes": 1024,
    "history": "/home/<USER>/<APP>-backups/backup.jsonl",
    "email": "<OPERATOR_EMAIL>", "from": "<OPERATOR_EMAIL>"
  }
}
```

## Pull script

The pull script is the "fetch the sources" step; pulselog owns staging, tar, size-floor, atomic publish, rotation, the JSONL line and the failure email (docs/archive/observability-playbook.md:414-415).

```bash
#!/bin/bash
# /usr/local/bin/<APP>-pull.sh   (config via /etc/default/<APP>-backup)
set -euo pipefail
VPS_HOST="${VPS_HOST:-<VPS_IP>}"; VPS_USER="${VPS_USER:-root}"; SSH_KEY="${SSH_KEY:-$HOME/.ssh/<APP>_vps}"
: "${PULSELOG_STAGE:?must be invoked by pulselog --backup}"
SSH="ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
# DB + WAL sidecars = crash-consistent snapshot (SQLite WAL mode)
$SSH "$VPS_USER@$VPS_HOST" 'tar -cf - -C <DATA_DIR> <APP>.db <APP>.db-shm <APP>.db-wal' | tar -xf - -C "$PULSELOG_STAGE/"
$SSH "$VPS_USER@$VPS_HOST" 'tar -czf - -C /etc letsencrypt' > "$PULSELOG_STAGE/letsencrypt.tar.gz"
test -s "$PULSELOG_STAGE/<APP>.db"    # fail loud if the DB pull came back empty
```

The DB plus WAL sidecars give a crash-consistent snapshot under SQLite WAL mode (docs/archive/observability-playbook.md:423-424). The final `test -s` fails loudly if the DB pull came back empty (docs/archive/observability-playbook.md:426-426).

## Mail-delivery watchdog (why it must be off-box)

It verifies that the VPS can still get mail to the recipient, and it cannot live on the VPS for two reasons (docs/archive/observability-playbook.md:429-432):

1. Permissions: the on-VPS health check runs as unprivileged `<APP_USER>`, which can't read root-owned `/var/log/maillog` (docs/archive/observability-playbook.md:433-434).
2. Circular alerting: the failure it detects is "mail is broken", so its own alert would ride the same broken path and bounce (docs/archive/observability-playbook.md:435-437).

The backup host has an independent mail path and already has SSH into the VPS (docs/archive/observability-playbook.md:439-439). The script keys on the latest delivery outcome so a stale bounce can't stick it red (docs/archive/observability-playbook.md:440-440):

```bash
#!/bin/bash
# /usr/local/bin/<APP>-mail-check.sh   (env from /etc/default/<APP>-backup)
set -euo pipefail
VPS_HOST="${VPS_HOST:-<VPS_IP>}"; VPS_USER="${VPS_USER:-root}"; SSH_KEY="${SSH_KEY:-$HOME/.ssh/<APP>_vps}"
RECIPIENT="${MAIL_CHECK_RECIPIENT:-<OPERATOR_EMAIL>}"
last=$(ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" \
  "grep -h 'to=<$RECIPIENT>' /var/log/maillog 2>/dev/null | grep -oE 'status=(sent|bounced)' | tail -1" \
  2>/dev/null || true)
[ "$last" != "status=bounced" ]   # green if sent or no attempts; red only if the latest bounced
```

It is green if sent or no attempts, red only if the latest bounced (docs/archive/observability-playbook.md:450-450).

## Units

Both are `Type=oneshot`, `User=<the human user>` (docs/archive/observability-playbook.md:453-453).

```ini
# /etc/default/<APP>-backup  — single source of VPS coordinates
VPS_HOST=<VPS_IP>
VPS_USER=root
SSH_KEY=/home/<USER>/.ssh/<APP>_vps
```
```ini
# <APP>-watch.service  (every 5 min via <APP>-watch.timer)
[Service]
Type=oneshot
User=<USER>
EnvironmentFile=-/etc/default/<APP>-backup
ExecStart=/usr/local/bin/pulselog --config /etc/<APP>/pulselog.config.json
```
```ini
# <APP>-backup.service  (daily via <APP>-backup.timer)
[Service]
Type=oneshot
User=<USER>
EnvironmentFile=/etc/default/<APP>-backup
ExecStart=/usr/local/bin/pulselog --backup --config /etc/<APP>/pulselog.config.json
```

The backup host's own alerts need a working mailer too. The simplest is `msmtp` to Gmail, which makes Gmail sign the mail with clean reputation; set the config `from` to the authenticated Gmail address (docs/archive/observability-playbook.md:477-479).

Back to the overview: [observability playbook](observability-playbook.md)
