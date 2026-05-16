#!/bin/sh
set -eu

: "${ADMIN_USER:=admin}"
: "${ADMIN_PASS:=admin123}"
: "${PORT:=8788}"

cat > /app/.dev.vars <<EOF_VARS
ADMIN_USER="$ADMIN_USER"
ADMIN_PASS="$ADMIN_PASS"
EOF_VARS

mkdir -p /app/download

echo "Starting Terminal Blog on 0.0.0.0:${PORT}"
echo "Admin user: ${ADMIN_USER}"
echo "Wrangler vars written to /app/.dev.vars"
echo "Static file server on 0.0.0.0:8789 (serve /app/download)"

# 启动静态文件服务器（监听 8789，供 /download/* 使用）
npx serve /app/download -l 8789 &

# 启动 Worker
exec ./node_modules/.bin/wrangler dev _worker.js \
  --local \
  --ip 0.0.0.0 \
  --port "$PORT" \
  --persist-to /app/.wrangler/state \
  --show-interactive-dev-session false