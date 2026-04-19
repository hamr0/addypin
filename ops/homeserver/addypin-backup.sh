#!/bin/bash
# Nightly addypin backup runner — lives on the home server.
#
# Pulls the SQLite DB (with its -shm/-wal sidecars) and a tarball of
# /etc/letsencrypt/ from the VPS into a date-stamped directory under
# BACKUP_ROOT. Rotates old directories past KEEP_DAYS.
#
# On success, pings the Kuma push URL so Kuma's watchdog resets.
# On failure, exits non-zero and does NOT ping — Kuma flags missed
# heartbeat within its grace window and emails you.
#
# Deploy:
#   cp addypin-backup.sh           /usr/local/bin/
#   cp addypin-backup.service      /etc/systemd/system/
#   cp addypin-backup.timer        /etc/systemd/system/
#   chmod 755 /usr/local/bin/addypin-backup.sh
#   systemctl enable --now addypin-backup.timer
#
# First-time SSH key setup:
#   ssh-keygen -t ed25519 -f ~/.ssh/addypin_vps -N ""   # no passphrase
#   ssh-copy-id -i ~/.ssh/addypin_vps.pub root@<vps-ip> # push pubkey
#   (or paste ~/.ssh/addypin_vps.pub into VPS /root/.ssh/authorized_keys)

set -eu
set -o pipefail

# ── config (override via /etc/default/addypin-backup) ────────────────────
VPS_HOST="${VPS_HOST:-155.94.144.191}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/addypin_vps}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/addypin-backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
KUMA_PUSH_URL="${KUMA_PUSH_URL:-}"  # e.g. https://kuma.example.com/api/push/XYZABC?status=up&msg=OK&ping=

# ── run ──────────────────────────────────────────────────────────────────
DATE="$(date -u +%F)"
DEST="${BACKUP_ROOT}/daily/${DATE}"
mkdir -p "$DEST"

SSH="ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
RSYNC="rsync -az --timeout=60 -e $SSH"

echo "[$(date -Iseconds)] backup → $DEST"

# 1. DB file + WAL sidecars. SQLite is in WAL mode, so copying all three
#    gives a crash-consistent snapshot. Keep timing tight — addypin
#    doesn't stop writes, but the window is milliseconds.
$RSYNC "${VPS_USER}@${VPS_HOST}:/var/lib/addypin/addypin.db*" "$DEST/"

# 2. Let's Encrypt state. Tar on the remote so we capture symlinks.
$SSH "${VPS_USER}@${VPS_HOST}" 'tar -czf - -C /etc letsencrypt' > "$DEST/letsencrypt.tar.gz"

# 3. Sanity check: DB file exists and is non-empty.
if [ ! -s "$DEST/addypin.db" ]; then
    echo "FAIL: addypin.db missing or empty in $DEST" >&2
    exit 1
fi

# 4. Rotate: drop anything older than KEEP_DAYS.
find "${BACKUP_ROOT}/daily" -mindepth 1 -maxdepth 1 -type d -mtime +"${KEEP_DAYS}" \
    -print -exec rm -rf {} +

# 5. Ping Kuma (push monitor). If no URL configured, skip silently.
if [ -n "$KUMA_PUSH_URL" ]; then
    SIZE=$(du -sh "$DEST" | cut -f1)
    curl -fsS --max-time 10 "${KUMA_PUSH_URL}&msg=backup_${DATE}_${SIZE}" >/dev/null \
        || echo "WARN: Kuma ping failed (backup still succeeded)" >&2
fi

echo "[$(date -Iseconds)] done ($(du -sh "$DEST" | cut -f1))"
