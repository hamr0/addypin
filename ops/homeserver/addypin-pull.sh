#!/bin/bash
# Pull addypin state from the VPS into $PULSELOG_STAGE for `pulselog --backup`.
#
# pulselog owns the envelope (fresh 0700 stage → tar → chmod 0600 → size
# floor → atomic publish → retention → one kind:"backup" JSONL line, and an
# alert email on failure). This script is only the "fetch the sources" step,
# the command source in ops/homeserver/pulselog.config.json. It replaces the
# hand-rolled rotation + Kuma ping the old addypin-backup.sh carried.
#
# A non-zero exit aborts the whole run: no publish, no rotation, a
# status:"fail" line, exit 1 (which the systemd unit surfaces). The prior
# good archive is never touched.
#
# Config via /etc/default/addypin-backup (same file the old script used).
set -euo pipefail

VPS_HOST="${VPS_HOST:-155.94.144.191}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/addypin_vps}"

# pulselog exports $PULSELOG_STAGE (a fresh 0700 dir) but does NOT cd into it.
# Always write by this absolute path, never by cwd.
: "${PULSELOG_STAGE:?must be invoked by pulselog --backup (PULSELOG_STAGE unset)}"

SSH="ssh -i $SSH_KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

# 1. DB file + WAL sidecars. SQLite is in WAL mode, so capturing all three
#    is a crash-consistent snapshot. The window is milliseconds.
$SSH "${VPS_USER}@${VPS_HOST}" 'tar -cf - -C /var/lib/addypin addypin.db addypin.db-shm addypin.db-wal' \
  | tar -xf - -C "$PULSELOG_STAGE/"

# 2. Let's Encrypt state. Tar on the remote so symlinks are preserved.
$SSH "${VPS_USER}@${VPS_HOST}" 'tar -czf - -C /etc letsencrypt' > "$PULSELOG_STAGE/letsencrypt.tar.gz"

# 3. Crown-jewel assertion. minBytes floors the WHOLE archive, not each
#    source, so a fat letsencrypt tar could mask an empty DB. Fail loud if
#    the DB pull came back empty → no publish, no rotation, exit 1.
test -s "$PULSELOG_STAGE/addypin.db"
