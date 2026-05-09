#!/usr/bin/env bash
# deploy.sh — push current main to the VPS and restart the service.
#
# Run from the laptop (this repo's root). Pre-flight checks fail loudly
# so we never deploy a dirty / behind / untested working tree.
#
# Usage:
#   ./ops/deploy.sh                 # full pre-flight + deploy
#   ./ops/deploy.sh --skip-tests    # skip `npm test` (use sparingly)
#   ./ops/deploy.sh --dry-run       # show what would happen, don't ssh
#
# Secrets come from `pass`. SSH key is materialized to a tempfile,
# used, and shredded — never written to a real path.

set -euo pipefail

SKIP_TESTS=0
DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --skip-tests) SKIP_TESTS=1 ;;
        --dry-run)    DRY_RUN=1 ;;
        *) echo "unknown arg: $arg" >&2; exit 2 ;;
    esac
done

cd "$(dirname "$0")/.."
ROOT=$(pwd)

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
cyan()   { printf '\033[36m%s\033[0m\n' "$*"; }
fail()   { red "✗ $*"; exit 1; }

# ─── pre-flight ────────────────────────────────────────────────────────────
cyan "→ pre-flight"

# 1. on main
branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || fail "not on main (currently on $branch)"

# 2. clean tree
[ -z "$(git status --porcelain)" ] || fail "working tree dirty — commit or stash first"

# 3. in sync with origin/main
git fetch -q origin main
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse origin/main)
[ "$local_sha" = "$remote_sha" ] || fail "local main and origin/main diverge — push or pull first"

# 4. tests green
if [ "$SKIP_TESTS" = "0" ]; then
    cyan "→ npm test"
    npm test --silent >/tmp/addypin-deploy-test.log 2>&1 || {
        red "tests failed — see /tmp/addypin-deploy-test.log"
        tail -30 /tmp/addypin-deploy-test.log
        exit 1
    }
    green "✓ tests green"
fi

green "✓ pre-flight ok ($(git log -1 --oneline))"

if [ "$DRY_RUN" = "1" ]; then
    cyan "→ dry-run: would deploy $local_sha to VPS and restart addypin.service"
    exit 0
fi

# ─── ssh + deploy ──────────────────────────────────────────────────────────
cyan "→ deploying"

SSH_HOST=$(pass show addypin/ssh/host | head -1)
SSH_USER=$(pass show addypin/ssh/user | head -1)

KEY=$(mktemp)
trap 'shred -u "$KEY" 2>/dev/null || rm -f "$KEY"' EXIT
{
    echo '-----BEGIN OPENSSH PRIVATE KEY-----'
    pass show addypin/ssh/private_key | grep '^username:' | sed 's/^username: //' | fold -w 70
    echo '-----END OPENSSH PRIVATE KEY-----'
} > "$KEY"
chmod 600 "$KEY"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes \
    "$SSH_USER@$SSH_HOST" bash <<EOF
set -euo pipefail
cd /opt/addypin
sudo -u addypin git fetch --quiet origin main
sudo -u addypin git diff --quiet HEAD origin/main -- || {
    # Working-tree changes that diverge from origin block the deploy.
    if [ -n "\$(sudo -u addypin git status --porcelain)" ]; then
        echo "VPS working tree dirty — refuse to deploy" >&2
        sudo -u addypin git status --porcelain >&2
        exit 1
    fi
}
sudo -u addypin git pull --ff-only origin main
sudo -u addypin npm ci --omit=dev --silent
sudo systemctl restart addypin
sleep 1
sudo systemctl is-active addypin
sudo -u addypin git log -1 --oneline
EOF

# ─── post-deploy smoke ─────────────────────────────────────────────────────
cyan "→ smoke test"
code=$(curl -sS -o /dev/null -w "%{http_code}" https://addypin.com/)
[ "$code" = "200" ] || fail "homepage returned $code (expected 200)"
green "✓ https://addypin.com/ → 200"

green "✓ deploy complete: $local_sha"
