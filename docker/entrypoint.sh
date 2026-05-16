#!/bin/sh
set -eu

# 读取环境变量（docker-compose.yml 传入的），使用默认值
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"
PORT="${PORT:-8788}"
SITE_TITLE="${SITE_TITLE:-TerminalBlog}"
WELCOME_MESSAGE="${WELCOME_MESSAGE:-欢迎来到我的终端博客。这里用代码记录世界，用键盘书写思考。}"
SITE_URL="${SITE_URL:-https://myURL.com}"
ICP_NUMBER="${ICP_NUMBER:-ICP粤B12345678号}"

# 生成 .dev.vars（供 Wrangler 运行时使用）
cat > /app/.dev.vars <<EOF_VARS
ADMIN_USER=$ADMIN_USER
ADMIN_PASS=$ADMIN_PASS
EOF_VARS

# 动态更新 _worker.js 中的站点配置（运行时覆盖构建时配置）
# 使用 sed 替换 config.js 中的配置值
sed -i "s/siteTitle: '[^']*'/siteTitle: '$SITE_TITLE'/" /app/_worker.js
sed -i "s/welcomeMessage: '[^']*'/welcomeMessage: '$WELCOME_MESSAGE'/" /app/_worker.js
sed -i "s|siteUrl: '[^']*'|siteUrl: '$SITE_URL'|" /app/_worker.js
sed -i "s|icpNumber: '[^']*'|icpNumber: '$ICP_NUMBER'|" /app/_worker.js

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