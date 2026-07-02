#!/bin/bash
# Detect a VPS→Gmail mail-delivery regression from OFF the VPS.
#
# The weekly stats digest and the on-VPS health alerts leave the VPS via
# Postfix → OpenDKIM straight to Gmail. If SPF / DKIM / forward-confirmed
# reverse DNS ever break again (the classic trap: the `mail.addypin.com` A
# record gets re-proxied through Cloudflare, so it stops resolving to the
# sending IP), Gmail bounces every message — and nothing on the VPS can warn
# you, for two reasons:
#   1. The on-VPS health check runs as the unprivileged `addypin` user, which
#      cannot read root-owned /var/log/maillog.
#   2. Even if it could, its own alert would ride the same broken mail path
#      and bounce too — it can't page you for the one thing it detects.
# So this check lives on the home server, whose msmtp→Gmail path is
# independent (Gmail-signed, clean reputation), and reads the VPS maillog over
# the existing backup SSH key (root, unrestricted — same key addypin-pull.sh
# uses). Run by pulselog as a `command` check from ops/homeserver/pulselog.config.json.
#
# Logic: inspect the LATEST delivery attempt to the alert recipient. Exit 0
# (green) if it was accepted (status=sent) or there were no attempts at all;
# exit 1 (red → pulselog emails the alert) if the most recent attempt bounced.
# Stateless: a lone transient bounce that later succeeds reads green, a
# persistent regression (every send bouncing) reads red. No time-window
# parsing, so a days-old bounce can't stick the check red once mail recovers.
#
# Config via /etc/default/addypin-backup (the same EnvironmentFile the backup
# job reads), so the VPS host/user/key live in exactly one place.
set -euo pipefail

VPS_HOST="${VPS_HOST:-155.94.144.191}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/addypin_vps}"
RECIPIENT="${MAIL_CHECK_RECIPIENT:-avoidaccess@gmail.com}"

# `|| true`: an SSH failure (VPS down, key trouble) leaves $last empty, which
# reads green here — VPS-down is already the http/ssl checks' job, and we don't
# want this check to double-alert on it. A real bounce still sets status=bounced.
last=$(ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 \
    "${VPS_USER}@${VPS_HOST}" \
    "grep -h 'to=<${RECIPIENT}>' /var/log/maillog 2>/dev/null | grep -oE 'status=(sent|bounced)' | tail -1" \
    2>/dev/null || true)

[ "$last" != "status=bounced" ]
