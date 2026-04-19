# Federver-side install log — addypin backup

What was actually done to get `addypin-backup.{sh,service,timer}` running on
the fedora home server (`federver`, `192.168.178.180`, user `ahassan`).
Use this the next time you rebuild federver.

## Prerequisites

- federver reachable on LAN at `192.168.178.180`
- VPS root password available (stored in `pass addypin/ssh/password`)
- Kuma already running on federver at `http://federver:3001`
- The repo pulled at `/mnt/data/data/My Docs/PycharmProjects/addypin`
  (survives OS reinstall because `/mnt/data` is the HDD)

## Step 1 — SSH key federver → VPS

On federver:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/addypin_vps -N "" -C "addypin-backup@federver"
ssh-copy-id -i ~/.ssh/addypin_vps.pub root@155.94.144.191
# test
ssh -i ~/.ssh/addypin_vps root@155.94.144.191 'hostname && ls /var/lib/addypin/'
```

## Step 2 — Install units and env file

From `ops/homeserver/` in the repo:

```bash
sudo install -m 755 addypin-backup.sh      /usr/local/bin/
sudo install -m 644 addypin-backup.service /etc/systemd/system/
sudo install -m 644 addypin-backup.timer   /etc/systemd/system/

sudo tee /etc/default/addypin-backup >/dev/null <<EOF
VPS_HOST=155.94.144.191
VPS_USER=root
SSH_KEY=/home/ahassan/.ssh/addypin_vps
BACKUP_ROOT=/mnt/data/data/addypin-backups
KEEP_DAYS=30
KUMA_PUSH_URL=
EOF

sudo sed -i "s/User=%i/User=ahassan/" /etc/systemd/system/addypin-backup.service
sudo -u ahassan mkdir -p /mnt/data/data/addypin-backups/daily
sudo systemctl daemon-reload
sudo systemctl enable --now addypin-backup.timer
```

`BACKUP_ROOT` is `/mnt/data/...` (not `$HOME/...` as the upstream README
suggests) so backups survive a fedora reinstall.

## Step 3 — Kuma monitors

Both created in the Kuma UI (`http://federver:3001`):

1. **HTTP(s) monitor** — pulls addypin site health.
   - URL: `https://addypin.com/api/health`
   - Interval: 60s, Retries: 2, Accepted: 200
2. **Push monitor** — backup heartbeat.
   - Name: `addypin-backup`
   - Heartbeat: 86400s, Grace: 3600s
   - Kuma generates a push URL — paste it into the env file:
     ```bash
     sudo sed -i "s|^KUMA_PUSH_URL=.*|KUMA_PUSH_URL=<the-url>|" /etc/default/addypin-backup
     ```

## Step 4 — Smoke test

```bash
sudo systemctl start addypin-backup
sudo journalctl -u addypin-backup -n 10 --no-pager
ls -la /mnt/data/data/addypin-backups/daily/$(date -u +%F)/
```

Expected: ~650 KB total, four files (`addypin.db`, `addypin.db-shm`,
`addypin.db-wal`, `letsencrypt.tar.gz`). Kuma push monitor flips green
with `msg=backup_<date>_<size>`.

## Known issue — rsync 3.4 "Unexpected remote arg"

The upstream script used `rsync` to pull the DB files. With rsync 3.4.1 on
both sides, the sender rejects remote paths with:

```
Unexpected remote arg: root@155.94.144.191:/var/lib/addypin/addypin.db
rsync error: syntax or usage error (code 1) at main.c(1499) [sender=3.4.1]
```

Tried `--old-args` and include/exclude patterns — both still failed. Fix:
drop rsync for the DB files, use `ssh + tar` (same pattern already used
for `/etc/letsencrypt/`). The files are ~160 KB total; rsync's delta
transfer gives nothing here.

Patched block in `addypin-backup.sh`:

```bash
$SSH "${VPS_USER}@${VPS_HOST}" \
    'tar -cf - -C /var/lib/addypin addypin.db addypin.db-shm addypin.db-wal' \
    | tar -xf - -C "$DEST/"
```

If rsync 3.4 ever fixes arg handling, this can revert.

## Recreate from scratch

On a fresh federver:

1. `git clone` addypin repo under `/mnt/data/data/.../addypin` (or wherever).
2. Run Step 1 (keygen + copy to VPS).
3. Run Step 2 (install units + env file).
4. Run Step 3 (Kuma monitors + push URL).
5. Run Step 4 (smoke test).

Total time: ~10 minutes once the VPS password is in hand.
