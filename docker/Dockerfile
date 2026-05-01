# Terminal Blog - Docker 部署（多阶段构建，最小镜像）
# Stage 1: 安装依赖
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install --save miniflare@2 && npm cache clean --force

# Stage 2: 运行时（精简）
FROM node:20-alpine
WORKDIR /app

# 只复制安装好的 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制已构建的 worker
COPY _worker.js .

# KV 持久化目录
RUN mkdir -p .kv
VOLUME ["/app/.kv"]

# 暴露端口
EXPOSE 8788

# 环境变量（可通过 docker run -e 覆盖）
ENV ADMIN_USER=admin
ENV ADMIN_PASS=admin123
ENV PORT=8788

# 启动 miniflare
CMD ["npx", "miniflare", \
     "_worker.js", \
     "--modules", \
     "--kv", "BLOG_KV", \
     "--kv-persist", ".kv", \
     "--port", "8788", \
     "--host", "0.0.0.0"]