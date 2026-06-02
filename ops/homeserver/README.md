# addypin home-server ops

Two pieces of infrastructure live on the home server (fedora), outside the
VPS, so backups and uptime alerts survive a total VPS loss. Both are driven
by [`pulselog`](https://github.com/hamr0/pulselog) reading one config file,
`ops/homeserver/pulselog.config.json` — the `--backup` flag runs the backup
section, no flag runs the health `checks`. This replaces the old hand-rolled
`addypin-backup.sh` **and** the two Uptime-Kuma monitors with one OSS CLI.

| Was | Now |
|-----|-----|
| `addypin-backup.sh` (rsync/tar + manual rotation) | `pulselog --backup` + `addypin-pull.sh` (command source) |
| Kuma **pull** HTTP monitor (site uptime) | pulselog `http` + `ssl` checks against `addypin.com` |
| Kuma **push** monitor (backup heartbeat) | pulselog `file-age` check on the backup dir |

## Prerequisites

- **Node ≥ 18** (the `command`-based backup doesn't use pulselog's bundled
  sqlite engine, so 22.5 isn't required here) and `pulselog`:
  ```bash
  sudo npm i -g pulselog
  command -v pulselog          # note the path; the units assume /usr/local/bin/pulselog
  ```
- **A mailer** for the alert/failure emails. pulselog sends via `mail` →
  `sendmail`; on a box with no MTA, install the msmtp → Gmail shim from the
  pulselog README (`msmtp` + `msmtp-mta`, a `0600` `~/.msmtprc`). Keep the
  config's `from` equal to the authenticated Gmail address (it's already set
  to `avoidaccess@gmail.com`) so Gmail DKIM-signs and alignment holds.
- **An SSH key** authorized on the VPS for the backup pull (no passphrase, so
  systemd can use it non-interactively):
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/addypin_vps -N ""
  ssh-copy-id -i ~/.ssh/addypin_vps.pub root@<vps-ip>
  ```

## Install

```bash
# 1. Config + pull wrapper into place.
sudo install -d /etc/addypin
sudo install -m 644 pulselog.config.json /etc/addypin/pulselog.config.json
sudo install -m 755 addypin-pull.sh      /usr/local/bin/addypin-pull.sh

# 2. Point the config's paths at this user's home (the three REPLACE_ME's →
#    the backup dir, history, health.jsonl, and file-age check path).
sudo sed -i "s#/home/REPLACE_ME#$HOME#g" /etc/addypin/pulselog.config.json
mkdir -p "$HOME/addypin-backups"

# 3. Backup pull config (the EnvironmentFile=- in addypin-backup.service):
sudo tee /etc/default/addypin-backup <<EOF
VPS_HOST=155.94.144.191
VPS_USER=root
SSH_KEY=$HOME/.ssh/addypin_vps
EOF

# 4. Units. Both use a User=%i template — instantiate with your username.
sudo install -m 644 addypin-backup.service /etc/systemd/system/
sudo install -m 644 addypin-backup.timer   /etc/systemd/system/
sudo install -m 644 addypin-watch.service  /etc/systemd/system/
sudo install -m 644 addypin-watch.timer    /etc/systemd/system/
sudo sed -i "s/User=%i/User=$USER/" /etc/systemd/system/addypin-backup.service \
                                    /etc/systemd/system/addypin-watch.service

sudo systemctl daemon-reload
sudo systemctl enable --now addypin-backup.timer addypin-watch.timer
systemctl list-timers 'addypin-*'
```

## Smoke test before trusting it

```bash
# Backup: produces one archive in ~/addypin-backups and a backup.jsonl line.
sudo /usr/local/bin/pulselog --backup --config /etc/addypin/pulselog.config.json
ls -la ~/addypin-backups/addypin-backup-*.tar.gz       # newest is non-empty
tar -tzf ~/addypin-backups/addypin-backup-*.tar.gz | head   # addypin.db* + letsencrypt.tar.gz

# Watch: silent + exit 0 when the site is up and a fresh backup exists.
/usr/local/bin/pulselog --config /etc/addypin/pulselog.config.json; echo "exit=$?"
```

## Restore drill (do this at least once)

```bash
# Extract the newest archive, then push the DB back to the VPS.
cd ~/addypin-backups
tar -xzf "$(ls -t addypin-backup-*.tar.gz | head -1)" -C /tmp/restore
scp /tmp/restore/addypin.db* root@<vps-ip>:/var/lib/addypin/
ssh root@<vps-ip> 'chown addypin:addypin /var/lib/addypin/addypin.db* && systemctl restart addypin'
# /etc/letsencrypt/ restore only needed on a fresh-VPS rebuild:
#   scp /tmp/restore/letsencrypt.tar.gz root@<new-vps>:/tmp/
#   ssh root@<new-vps> 'tar -xzf /tmp/letsencrypt.tar.gz -C /etc && certbot renew --dry-run'
```

⚠️ Restoring the DB without also having `ADDYPIN_DATA_KEY` from
`pass addypin/prod/data_key` gets you a brick. The key is the one thing that
isn't in this backup — by design.

## Why this split

- **Site uptime** (pulselog `http` + `ssl` from the home server): catches
  VPS-down, DNS-broken, cert-expired. Survives the VPS being completely off —
  the on-VPS health check can't email when the VPS itself is down.
- **Backup heartbeat** (pulselog `file-age` on the archive dir): catches a
  silent backup failure — the timer fired but the pull errored, the SSH key
  expired, or the disk filled. A pull-only uptime check would miss this. A
  failed `--backup` publishes no new archive, so the next watch run sees a
  stale dir and alerts. (`maxAgeHours: 30` gives the daily 03:15 job margin.)
- **On-VPS health** (`ops/pulselog/health.config.json` via the VPS's
  `addypin-health.timer`): catches process-level issues invisible from
  outside — systemd unit inactive, mailq backed up, disk >85%, cert <14 days,
  DB truncated. Emails via local Postfix → OpenDKIM to gmail.

Three layers, each catches what the others miss.
