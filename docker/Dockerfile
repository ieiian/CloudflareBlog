# Terminal Blog - Docker 发布镜像
# 构建流程与本地运行保持一致：npm ci -> npm run build -> wrangler dev

FROM node:22-bookworm-slim

WORKDIR /app

ENV ADMIN_USER=admin \
    ADMIN_PASS=admin123 \
    PORT=8788

# 只在容器内安装依赖，确保 Wrangler/workerd 使用 Linux 平台二进制；不要复制宿主机 node_modules。
# 使用 Debian slim 而不是 Alpine：workerd Linux 二进制依赖 glibc，在 musl/Alpine 下可能表现为 ENOENT。
# 不要使用 --omit=optional：workerd 的平台二进制通过 optionalDependencies 安装，省略会导致容器启动时报 ENOENT。
# 安装 devDependencies，因为 wrangler 是运行容器所需的本地开发服务器依赖；NODE_ENV 在安装后再设为 production。
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund \
    && test -x node_modules/.bin/wrangler \
    && test -x node_modules/@cloudflare/workerd-linux-64/bin/workerd \
    && node_modules/@cloudflare/workerd-linux-64/bin/workerd --version \
    && rm -rf /root/.npm

# 在镜像构建阶段生成 _worker.js，避免依赖宿主机上可能过期的构建产物。
COPY public ./public
COPY scripts ./scripts
COPY wrangler.toml ./wrangler.toml
RUN npm run build

# 复制容器入口脚本；入口脚本会把 Docker 环境变量转换成 Wrangler vars，确保 Worker env.ADMIN_USER/env.ADMIN_PASS 生效。
COPY docker/entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production

# Wrangler 本地 KV/运行状态持久化目录。挂载该目录即可保留文章数据。
RUN mkdir -p /app/.wrangler/state
VOLUME ["/app/.wrangler/state"]

EXPOSE 8788

# 使用 Wrangler 本地运行时启动生成后的 _worker.js，与本地 npm run dev 保持一致。
# 入口脚本生成 .dev.vars，把容器环境变量注入 Worker runtime env。
CMD ["/app/docker-entrypoint.sh"]

