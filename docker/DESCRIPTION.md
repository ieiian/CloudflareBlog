# Terminal Blog

一个基于 Cloudflare Workers + KV 的终端风格博客系统，使用单个 `_worker.js` 文件部署。Docker 镜像使用 Wrangler 本地运行时启动生成后的 Worker，构建阶段会在容器内执行 `npm ci` 和 `npm run build`，确保与本地 `npm run dev` 行为一致。

## 快速开始

### Docker Compose（推荐）

```yaml
services:
  terminal-blog:
    image: ieiian/terminal-blog:latest
    container_name: terminal-blog
    ports:
      - "8788:8788"
    volumes:
      - blog-wrangler-state:/app/.wrangler/state
    environment:
      ADMIN_USER: ${ADMIN_USER:-admin}
      ADMIN_PASS: ${ADMIN_PASS:-admin123}
      PORT: ${PORT:-8788}
    restart: unless-stopped

volumes:
  blog-wrangler-state:
```

启动：

```bash
docker compose up -d
```

访问 http://localhost:8788

### Docker Run

```bash
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-wrangler-state:/app/.wrangler/state \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=admin123 \
  ieiian/terminal-blog:latest
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USER` | 管理员用户名 | `admin` |
| `ADMIN_PASS` | 管理员密码 | `admin123` |
| `PORT` | 容器内监听端口 | `8788` |

## 持久化数据

| 路径 | 说明 |
|------|------|
| `/app/.wrangler/state` | Wrangler 本地 KV/运行状态目录；挂载 Docker Volume 可保留文章数据 |

## 管理命令

```bash
# 查看日志
docker logs -f terminal-blog

# 停止容器
docker stop terminal-blog

# 删除容器
docker rm terminal-blog

# 删除持久化数据（慎用）
docker volume rm blog-wrangler-state
```

## 从源码构建

```bash
git clone https://github.com/ieiian/CloudflareBlog.git
cd CloudflareBlog

docker build -t terminal-blog:latest -f docker/Dockerfile .

docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-wrangler-state:/app/.wrangler/state \
  terminal-blog:latest
```

## 导入与维护

项目内的 `npm run seed`、`npm run import`、`npm run reset` 默认访问 `http://localhost:8788`，可在宿主机上运行这些命令管理正在运行的容器实例：

```bash
npm run seed
npm run import
npm run reset
```

也可以通过环境变量覆盖目标地址和管理员账号：

```bash
SEED_URL=http://your-domain.com ADMIN_USER=myuser ADMIN_PASS=mypassword npm run import
```

## 默认访问

- 地址：http://localhost:8788
- 用户名：admin
- 密码：admin123

## 技术栈

- 前端：HTML + CSS + Vanilla JavaScript
- 后端：Cloudflare Workers API
- 本地容器运行时：Wrangler dev / workerd
- 存储：Cloudflare KV（Wrangler 本地持久化模拟）
