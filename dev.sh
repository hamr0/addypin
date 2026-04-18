#!/usr/bin/env bash
# dev.sh — start the local AddyPin dev server.
#
# Secrets come from `pass` (https://www.passwordstore.org). Nothing is
# persisted to disk under the repo. `pass` prompts your GPG agent on
# first use per shell session; subsequent calls are silent until the
# agent's cache expires.
#
# On first run, any missing key/value is generated, inserted into `pass`,
# and used. Re-runs just read from `pass`.
#
# Usage:
#   ./dev.sh             # start the dev server with --watch
#   ./dev.sh --no-watch  # start without --watch (production-ish)

set -euo pipefail

# ─── pass entry paths ───────────────────────────────────────────────────────
DATA_KEY_PATH=addypin/server/data_key            # required, 32-byte hex
EMAIL_KEY_PATH=addypin/server/email_key          # required, 32-byte hex
SIGNING_KEY_PATH=addypin/server/signing_key      # required, 32-byte hex

PORT_PATH=addypin/server/port                    # optional, default 3000
DATA_DIR_PATH=addypin/server/data_dir            # optional, default ./data
MAIL_FROM_ADDR_PATH=addypin/server/mail_from_address  # optional
MAIL_FROM_NAME_PATH=addypin/server/mail_from_name     # optional

# ─── prerequisites ──────────────────────────────────────────────────────────
command -v pass    >/dev/null || { echo "pass not installed: https://www.passwordstore.org" >&2; exit 1; }
command -v openssl >/dev/null || { echo "openssl not installed (needed for first-run key generation)" >&2; exit 1; }
command -v node    >/dev/null || { echo "node not installed (need >= 22)" >&2; exit 1; }

# ─── helpers ────────────────────────────────────────────────────────────────
ensure_hex_key() {
    local path="$1"
    if ! pass show "$path" >/dev/null 2>&1; then
        echo "→ generating $path (first run)" >&2
        local v; v=$(openssl rand -hex 32)
        printf '%s\n' "$v" | pass insert -e "$path" >/dev/null
    fi
    pass show "$path" | head -1
}

with_default() {
    pass show "$1" 2>/dev/null | head -1 || printf '%s' "$2"
}

# ─── load secrets + config ──────────────────────────────────────────────────
export ADDYPIN_DATA_KEY=$(ensure_hex_key "$DATA_KEY_PATH")
export ADDYPIN_EMAIL_KEY=$(ensure_hex_key "$EMAIL_KEY_PATH")
export ADDYPIN_SIGNING_KEY=$(ensure_hex_key "$SIGNING_KEY_PATH")

export PORT=$(with_default "$PORT_PATH" 3000)
export DATA_DIR=$(with_default "$DATA_DIR_PATH" ./data)
export MAIL_FROM_ADDRESS=$(with_default "$MAIL_FROM_ADDR_PATH" noreply@addypin.com)
export MAIL_FROM_NAME=$(with_default "$MAIL_FROM_NAME_PATH" addypin)

# ─── run ────────────────────────────────────────────────────────────────────
WATCH_FLAG="--watch"
[[ "${1:-}" == "--no-watch" ]] && WATCH_FLAG=""

echo "addypin → http://localhost:${PORT}  (data: ${DATA_DIR})"
exec node --experimental-sqlite ${WATCH_FLAG} server/main.js
