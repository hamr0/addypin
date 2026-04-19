# addypin home-server ops

Three pieces of infrastructure live on the home server (fedora), outside
the VPS, so backups and uptime alerts survive a total VPS loss.

## 1. Nightly backup — `addypin-backup.{sh,service,timer}`

Pulls the SQLite DB (+WAL sidecars) and a tar of `/etc/letsencrypt/` from
the VPS every night at 03:15 local. Rotates out anything older than 30
days. On success, pings the Kuma "push" monitor so Kuma's watchdog
resets. If the job fails or the machine was off, Kuma misses the ping
and emails you within its grace window.

### Install

```bash
# One-time SSH key for this job (no passphrase, so systemd can use it):
ssh-keygen -t ed25519 -f ~/.ssh/addypin_vps -N ""
ssh-copy-id -i ~/.ssh/addypin_vps.pub root@<vps-ip>

# Copy the three files into place:
sudo install -m 755 addypin-backup.sh     /usr/local/bin/
sudo install -m 644 addypin-backup.service /etc/systemd/system/
sudo install -m 644 addypin-backup.timer   /etc/systemd/system/

# /etc/default/addypin-backup (the `EnvironmentFile=-` in the unit):
sudo tee /etc/default/addypin-backup <<EOF
VPS_HOST=155.94.144.191
VPS_USER=root
SSH_KEY=$HOME/.ssh/addypin_vps
BACKUP_ROOT=$HOME/addypin-backups
KEEP_DAYS=30
KUMA_PUSH_URL=https://kuma.yourhost.lan/api/push/ABCDEFG?status=up&msg=OK&ping=
EOF

# Replace %i in the .service with your username before enabling:
sudo sed -i "s/User=%i/User=$USER/" /etc/systemd/system/addypin-backup.service

sudo systemctl daemon-reload
sudo systemctl enable --now addypin-backup.timer
systemctl list-timers addypin-backup.timer
```

### Manual run (smoke test before enabling)

```bash
sudo -u $USER /usr/local/bin/addypin-backup.sh
ls -la ~/addypin-backups/daily/$(date -u +%F)/
```

Expected output — three `addypin.db*` files + `letsencrypt.tar.gz`,
each non-empty. Total size ~500 KB today.

### Restore drill (do this at least once)

```bash
# From a backup dir:
cd ~/addypin-backups/daily/2026-04-19
scp addypin.db* root@<vps-ip>:/var/lib/addypin/
ssh root@<vps-ip> 'chown addypin:addypin /var/lib/addypin/addypin.db* && systemctl restart addypin'
# /etc/letsencrypt/ restore only needed on a fresh-VPS rebuild:
#   scp letsencrypt.tar.gz root@<new-vps>:/tmp/
#   ssh root@<new-vps> 'tar -xzf /tmp/letsencrypt.tar.gz -C /etc && certbot renew --dry-run'
```

⚠️ Restoring the DB without also having `ADDYPIN_DATA_KEY` from
`pass addypin/prod/data_key` gets you a brick. The key is the one
thing that isn't in this backup — by design.

## 2. Uptime watchdog — Kuma HTTP monitor (pull)

Completely configured in Kuma's UI. No files in this repo.

1. Kuma → Add New Monitor → **Monitor Type: HTTP(s)**
2. URL: `https://addypin.com/api/health`
3. Interval: `60s` (or 300s — 5 min is plenty)
4. Accepted Status Codes: `200`
5. Max. Retries: `2` (avoid alerting on a single flaky probe)
6. Notification: your email / Telegram / whatever you have wired in Kuma
7. Save.

Kuma now pings the VPS every minute from the home server. If addypin
is down *or* the VPS is dead *or* DNS breaks *or* the cert expires
(TLS error = non-200), Kuma alerts you.

## 3. Backup heartbeat — Kuma Push monitor

1. Kuma → Add New Monitor → **Monitor Type: Push**
2. Name: `addypin-backup`
3. Heartbeat Interval: `86400` (24 h) + Grace Period `3600` (1 h)
4. Save — Kuma displays a push URL like
   `https://kuma.yourhost.lan/api/push/ABCDEFG?status=up&msg=OK&ping=`
5. Paste that URL into `/etc/default/addypin-backup` as `KUMA_PUSH_URL`.

The backup script appends `&msg=backup_2026-04-19_124K` so the history
in Kuma shows the date + size of each snapshot.

If the backup fails, is skipped, or the home server was off past the
grace window, Kuma alerts you.

## Why this split

- **Site uptime** (Kuma pull): catches VPS-down, DNS-broken, cert-expired.
  Survives the VPS being completely off.
- **Backup heartbeat** (Kuma push): catches silent backup failures —
  cron still runs but rsync errors, or ssh key expired, or disk full.
  A pull-only check would miss this entirely.
- **On-VPS health-check.sh** (`ops/health-check.sh`): catches
  process-level issues that are invisible from the outside — systemd
  unit inactive, mailq backed up, journal error spikes, disk >85%,
  cert <14 days remaining. Emails via local Postfix to gmail.

Three layers, each catches what the others miss.
