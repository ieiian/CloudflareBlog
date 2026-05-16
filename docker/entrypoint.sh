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

# 预安装 serve 包（在镜像构建时已完成，这里仅做检查）
if [ ! -f node_modules/.bin/serve ]; then
    echo "Installing serve..."
    npm install --no-save serve@14
fi

# 启动静态文件服务器（后台运行，不阻塞）
echo "Starting static file server on port 8789..."
node_modules/.bin/serve /app/download -l 8789 &
SERVE_PID=$!

# 给静态服务器一点时间启动（异步，不等待就绪）
sleep 3
echo "Static file server started (PID: $SERVE_PID)"

# 启动 Worker
exec ./node_modules/.bin/wrangler dev _worker.js \
  --local \
  --ip 0.0.0.0 \
  --port "$PORT" \
  --persist-to /app/.wrangler/state \
  --show-interactive-dev-session false