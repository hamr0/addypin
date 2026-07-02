#!/bin/bash
# pulselog fallback alert sink for addypin (pulselog >= 0.7.0 `alert.fallback` /
# `digest.fallback`). Delivers the alert over an INDEPENDENT mail path so a
# failure of the primary Postfix -> direct-to-Gmail:25 hop (SPF/DKIM/PTR/IP
# reputation — the exact 2026-07 incident) can't also swallow the alert about it.
#
# pulselog invokes this with the rendered alert body on STDIN and the subject in
# $PULSELOG_SUBJECT (no shell, no args). We wrap them into a minimal text/plain
# message and hand it to msmtp's `gmail` account — authenticated SMTP submission
# to smtp.gmail.com:587, which Gmail relays + DKIM-signs. That account MUST be
# distinct from the default `localhost` account in ~/.msmtprc, which relays to
# the very Postfix that may be the thing that's broken.
#
# Plain-text only (addypin outbound mail is text/plain, always). Best-effort:
# pulselog treats a non-zero exit as "fallback failed" and records it, never
# fatal — but we still want a clean handoff, so this exits with msmtp's status.
#
# One-time setup (per host running pulselog as this user): add a `gmail` account
# to the runtime user's ~/.msmtprc (0600). See docs/04-process/observability-playbook.md
# and ops/homeserver/README.md.
set -euo pipefail

TO="${FALLBACK_TO:-avoidaccess@gmail.com}"
FROM="${FALLBACK_FROM:-avoidaccess@gmail.com}"   # align with the gmail account's authenticated identity
SUBJECT="${PULSELOG_SUBJECT:-addypin alert}"
ACCOUNT="${FALLBACK_MSMTP_ACCOUNT:-gmail}"
MSMTPRC="${FALLBACK_MSMTPRC:-${HOME:-/home/addypin}/.msmtprc}"

# Header-injection guard: strip CR/LF from anything that lands in a header line
# (same discipline pulselog applies to its own to/from/subject).
strip() { printf '%s' "$1" | tr -d '\r\n'; }
TO=$(strip "$TO"); FROM=$(strip "$FROM"); SUBJECT=$(strip "$SUBJECT")

{
    printf 'From: %s\n' "$FROM"
    printf 'To: %s\n' "$TO"
    printf 'Subject: %s\n' "$SUBJECT"
    printf 'Content-Type: text/plain; charset=utf-8\n'
    printf '\n'
    cat                      # alert body from pulselog, on stdin
} | msmtp --file="$MSMTPRC" --account="$ACCOUNT" "$TO"
