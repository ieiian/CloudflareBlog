# Terminal Blog - 终端风格博客

一个基于 Cloudflare Workers + KV 的终端风格博客系统，使用单个 `_worker.js` 文件部署。

## 🏗️ 项目结构

```
public/
├── index.html          # 终端风格 SPA 前端（源文件）
└── _worker.api.js      # API 逻辑（源文件）
scripts/
├── seed.js             # 种子数据脚本
└── build-worker.js     # 构建 _worker.js
_worker.js              # ⭐ 自动生成的部署文件（HTML + API 合并）
wrangler.toml           # Cloudflare 配置
package.json            # npm 脚本
```

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 生成 _worker.js
npm run build

# 3. 启动本地开发服务器（Workers 模式）
npm run dev

# 4. （可选）填充种子数据
npm run seed
```

访问 http://localhost:8788

### 部署到 Cloudflare Workers

```bash
# 1. 构建
npm run build

# 2. 登录 Cloudflare
npx wrangler login

# 3. 创建 KV Namespace
npx wrangler kv namespace create BLOG_KV

# 4. 更新 wrangler.toml 中的 KV id

# 5. 部署
npm run deploy
```

### 部署到 Cloudflare Pages

```bash
npm run deploy:pages
```

### Docker 部署

使用 Docker 可在任何服务器上部署，基于 miniflare v2 模拟 Workers + KV 环境。

```bash
# 1. 构建 _worker.js
npm run build

# 2. 构建 Docker 镜像（从项目根目录）
docker build -t terminal-blog -f docker/Dockerfile .

# 3. 运行（KV 数据持久化到 Docker Volume）
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-kv:/app/.kv \
  terminal-blog

# 4. （可选）自定义管理员密码
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-kv:/app/.kv \
  -e ADMIN_USER=myuser \
  -e ADMIN_PASS=mypassword \
  terminal-blog
```

访问 http://localhost:8788

**Docker Compose 部署（推荐）：**

```bash
# 1. 构建 _worker.js
npm run build

# 2. 一键启动
docker compose -f docker/docker-compose.yml up -d

# 3. （可选）自定义管理员密码
ADMIN_USER=myuser ADMIN_PASS=mypassword docker compose -f docker/docker-compose.yml up -d
```

访问 http://localhost:8788

**Docker / Docker Compose 管理命令：**

```bash
# 查看日志
docker logs terminal-blog
# 或
docker compose -f docker/docker-compose.yml logs -f

# 停止
docker stop terminal-blog
# 或
docker compose -f docker/docker-compose.yml down

# 删除并清除数据
docker compose -f docker/docker-compose.yml down -v
```

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USER` | 管理员用户名 | `admin` |
| `ADMIN_PASS` | 管理员密码 | `admin123` |

## 📋 命令

| 命令 | 说明 |
|------|------|
| `npm run build` | 生成 `_worker.js` |
| `npm run dev` | Workers 模式本地开发 |
| `npm run dev:pages` | Pages 模式本地开发 |
| `npm run deploy` | 部署到 Workers |
| `npm run deploy:pages` | 部署到 Pages |
| `npm run seed` | 填充种子数据 |

## 🔧 开发说明

- 修改前端：编辑 `public/index.html`
- 修改 API：编辑 `public/_worker.api.js`
- 修改后运行 `npm run build` 重新生成 `_worker.js`
- `_worker.js` 是自动生成的，提交到 git 以便直接部署