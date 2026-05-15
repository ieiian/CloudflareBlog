# Terminal Blog - Docker 发布镜像
# 构建流程与本地运行保持一致：npm ci -> node scripts/server.js

FROM node:22-bookworm-slim

WORKDIR /app

ENV ADMIN_USER=admin \
    ADMIN_PASS=admin123 \
    PORT=8788 \
    MYSQL_HOST=127.0.0.1 \
    MYSQL_PORT=3306 \
    MYSQL_DATABASE=terminal_blog \
    MYSQL_USER=blog_user \
    MYSQL_PASSWORD=CHANGE_ME_PASSWORD

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && rm -rf /root/.npm

COPY public ./public
COPY scripts ./scripts
COPY .env ./.env
COPY docker/entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 8788

CMD ["/app/docker-entrypoint.sh"]
