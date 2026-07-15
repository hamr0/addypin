#!/usr/bin/env bash
# Lock origin :443 to Cloudflare's ranges in firewalld. Run ON the VPS as root.
# Idempotent: safe to re-run to update the range list. Runtime-first, with a
# 10-minute deadman that reverts to the persisted config unless we commit.
#
# ┌─ PRECONDITION (load-bearing) ──────────────────────────────────────────────┐
# │ EVERY vhost on :443 on this box must be behind Cloudflare. If any vhost ever │
# │ goes grey-cloud (resolves direct to the origin), REMOVE this lock first with │
# │ --unlock, or that vhost is cut off. As of 2026-07-15 both addypin and        │
# │ ingest.late.fyi are orange. See ./README.md.                                 │
# └─────────────────────────────────────────────────────────────────────────────┘
#
# Keep V4/V6 below in sync with ops/nginx/00-cloudflare-realip.conf — the same
# list feeds real_ip, the geo origin-lock guard, and this firewall allow-list.
#
# Usage:
#   sudo ./cf-lock-443.sh --dry-run   # print the rules it would apply, change nothing
#   sudo ./cf-lock-443.sh --apply     # apply (runtime), smoke-test, persist or roll back
#   sudo ./cf-lock-443.sh --unlock    # restore the blanket https service, drop the lock
set -uo pipefail
FW=/usr/bin/firewall-cmd
ORIGIN=155.94.144.191   # origin's own IP — allowed so on-box health checks work

# Cloudflare published ranges — https://www.cloudflare.com/ips  (verified 2026-07-15)
V4=(173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18
    108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17
    162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22)
V6=(2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32
    2a06:98c0::/29 2c0f:f248::/32)

rule_v4(){ echo "rule priority=\"-1\" family=\"ipv4\" source address=\"$1\" port port=\"443\" protocol=\"tcp\" accept"; }
rule_v6(){ echo "rule priority=\"-1\" family=\"ipv6\" source address=\"$1\" port port=\"443\" protocol=\"tcp\" accept"; }
DROP4='rule priority="1" family="ipv4" port port="443" protocol="tcp" drop'
DROP6='rule priority="1" family="ipv6" port port="443" protocol="tcp" drop'

print_rules(){
  echo "# remove blanket https service; add CF-only accepts + self; drop the rest"
  for r in "${V4[@]}"; do rule_v4 "$r"; done
  for r in "${V6[@]}"; do rule_v6 "$r"; done
  rule_v4 "$ORIGIN"
  echo "$DROP4"; echo "$DROP6"
}

# Remove every :443 rich rule this script manages (idempotency), leaving other
# ports' rich rules alone.
clear_443(){
  $FW --list-rich-rules 2>/dev/null | grep 'port="443"' | while IFS= read -r r; do
    [ -n "$r" ] && $FW --remove-rich-rule="$r" >/dev/null 2>&1
  done
}

case "${1:-}" in
  --dry-run) print_rules; exit 0 ;;

  --unlock)
    echo "Removing :443 lock, restoring blanket https service..."
    clear_443
    $FW --query-service=https >/dev/null 2>&1 || $FW --add-service=https >/dev/null
    $FW --runtime-to-permanent >/dev/null
    echo "Unlocked. :443 is open to all sources again ($($FW --list-services))."
    exit 0 ;;

  --apply) : ;;  # fall through
  *) echo "usage: $0 --dry-run | --apply | --unlock"; exit 2 ;;
esac

# --- apply ---
TS=$(date +%Y%m%d-%H%M%S)
$FW --list-all > "/root/fw-backup-${TS}.txt"; echo "backup: /root/fw-backup-${TS}.txt"

# Deadman: revert runtime->permanent in 10 min UNLESS committed.
rm -f /run/addypin-fw-commit
setsid bash -c 'sleep 600; [ -f /run/addypin-fw-commit ] && exit 0; /usr/bin/firewall-cmd --reload' </dev/null >/dev/null 2>&1 &
echo "deadman armed (10 min)"

clear_443
# accepts BEFORE removing https, so :443 is never closed to CF mid-change
for r in "${V4[@]}"; do $FW --add-rich-rule="$(rule_v4 "$r")" >/dev/null; done
for r in "${V6[@]}"; do $FW --add-rich-rule="$(rule_v6 "$r")" >/dev/null; done
$FW --add-rich-rule="$(rule_v4 "$ORIGIN")" >/dev/null
$FW --query-service=https >/dev/null 2>&1 && $FW --remove-service=https >/dev/null
$FW --add-rich-rule="$DROP4" >/dev/null
$FW --add-rich-rule="$DROP6" >/dev/null
echo "applied: ${#V4[@]} v4 + ${#V6[@]} v6 + self accepts, https removed, drops added"
echo "services now: $($FW --list-services)   (https should be gone)"

# Smoke from the box: the CF path must still serve. (The direct-origin-is-blocked
# check must be run from an EXTERNAL, non-CF host — from here the origin is 'self'.)
sleep 2
A=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 https://addypin.com/api/health || echo 000)
I=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 https://ingest.late.fyi/health || echo 000)
echo "addypin via CF: $A   ingest via CF: $I   (both want 200)"

if [ "$A" = "200" ] && [ "$I" = "200" ]; then
  $FW --runtime-to-permanent >/dev/null && touch /run/addypin-fw-commit
  echo "PERSISTED. Deadman disarmed. Now verify from an external host:"
  echo "  curl -k --max-time 8 https://${ORIGIN}/    # expect timeout (dropped)"
else
  echo "SMOKE FAILED (CF path not 200) — rolling back now."
  $FW --reload
  exit 1
fi
