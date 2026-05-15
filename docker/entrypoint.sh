#!/bin/sh
set -eu

: "${ADMIN_USER:=admin}"
: "${ADMIN_PASS:=admin123}"
: "${PORT:=8788}"

cat > /app/.dev.vars <<EOF_VARS
ADMIN_USER="$ADMIN_USER"
ADMIN_PASS="$ADMIN_PASS"
EOF_VARS

echo "Starting Terminal Blog on 0.0.0.0:${PORT}"
echo "Admin user: ${ADMIN_USER}"
echo "Wrangler vars written to /app/.dev.vars"

exec ./node_modules/.bin/wrangler dev _worker.js \
  --local \
  --ip 0.0.0.0 \
  --port "$PORT" \
  --persist-to /app/.wrangler/state \
  --show-interactive-dev-session false
