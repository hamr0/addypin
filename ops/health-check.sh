#!/bin/bash
# addypin health check — runs from systemd timer, emails ALERT_TO on degradation.
# Exit 0 always; alert by sending mail. Silent on green.
#
# Override any variable via /etc/default/addypin-health (EnvironmentFile in the .service unit).

set -u

ALERT_TO="${ADDYPIN_ALERT_TO:-avoidaccess@gmail.com}"
ALERT_FROM="${ADDYPIN_ALERT_FROM:-alerts@addypin.com}"
HOST="$(hostname -f 2>/dev/null || hostname)"

DATA_DIR="${ADDYPIN_DATA_DIR:-/var/lib/addypin}"
DISK_THRESHOLD="${ADDYPIN_DISK_THRESHOLD:-85}"
HEALTH_URL="${ADDYPIN_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
MAILQ_THRESHOLD="${ADDYPIN_MAILQ_THRESHOLD:-50}"
CERT_WARN_DAYS="${ADDYPIN_CERT_WARN_DAYS:-14}"
CERT_DOMAINS="${ADDYPIN_CERT_DOMAINS:-addypin.com}"
UNITS="${ADDYPIN_UNITS:-addypin.service postfix.service nginx.service}"

ALERTS=()
add() { ALERTS+=("$1"); }

# 1. systemd unit health
for u in $UNITS; do
  state=$(systemctl is-failed "$u" 2>/dev/null || true)
  if [ "$state" = "failed" ]; then
    add "UNIT FAILED: $u"
  fi
  active=$(systemctl is-active "$u" 2>/dev/null || true)
  if [ "$active" != "active" ] && [ "$state" != "failed" ]; then
    add "UNIT INACTIVE: $u ($active)"
  fi
done

# 2. local API health
if ! curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
  add "API DOWN: $HEALTH_URL"
fi

# 3. disk space (root + data dir)
for d in / "$DATA_DIR"; do
  [ -d "$d" ] || continue
  pct=$(df -P "$d" | awk 'NR==2 {gsub("%",""); print $5}')
  if [ -n "$pct" ] && [ "$pct" -ge "$DISK_THRESHOLD" ]; then
    add "DISK ${pct}% on $d (threshold ${DISK_THRESHOLD}%)"
  fi
done

# 4. postfix mail queue
if command -v mailq >/dev/null 2>&1; then
  deferred=$(mailq 2>/dev/null | awk '/^-- [0-9]+ Kbytes in ([0-9]+) Request/ {print $5}' | tail -1)
  deferred="${deferred:-0}"
  if [ "$deferred" -ge "$MAILQ_THRESHOLD" ]; then
    add "MAIL QUEUE: $deferred deferred (threshold $MAILQ_THRESHOLD)"
  fi
fi

# 5. recent errors in journal (last hour)
errs=$(journalctl -u addypin.service --since '1 hour ago' -p err --no-pager -q 2>/dev/null | wc -l)
if [ "$errs" -gt 0 ]; then
  add "LOG ERRORS (addypin.service): $errs in last hour"
fi

# 6. TLS cert expiry
for domain in $CERT_DOMAINS; do
  end=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  [ -z "$end" ] && { add "CERT CHECK FAILED: $domain unreachable"; continue; }
  end_ts=$(date -d "$end" +%s 2>/dev/null) || continue
  now_ts=$(date +%s)
  days=$(( (end_ts - now_ts) / 86400 ))
  if [ "$days" -lt "$CERT_WARN_DAYS" ]; then
    add "CERT EXPIRY: $domain in $days days"
  fi
done

# 7. DB file sanity (exists, non-empty, readable by addypin)
DB_FILE="$DATA_DIR/addypin.db"
if [ -f "$DB_FILE" ]; then
  sz=$(stat -c%s "$DB_FILE" 2>/dev/null || echo 0)
  if [ "$sz" -lt 1024 ]; then
    add "DB SUSPICIOUS: $DB_FILE is only $sz bytes"
  fi
fi

# Emit alert email if any
if [ "${#ALERTS[@]}" -gt 0 ]; then
  {
    echo "From: $ALERT_FROM"
    echo "To: $ALERT_TO"
    echo "Subject: [addypin/$HOST] ${#ALERTS[@]} alert(s)"
    echo "Content-Type: text/plain; charset=utf-8"
    echo
    echo "Host: $HOST"
    echo "Time: $(date -u +%FT%TZ)"
    echo
    for a in "${ALERTS[@]}"; do echo " - $a"; done
    echo
    echo "--"
    echo "addypin-health.timer ($(basename "$0"))"
  } | /usr/sbin/sendmail -t -i
fi

exit 0
