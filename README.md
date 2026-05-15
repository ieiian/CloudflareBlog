# Terminal Blog - 终端风格博客

一个仅保留本地运行和 Docker 运行方式的终端风格博客系统。前端是 `public/index.html` 中的单页应用，后端是本地 Node.js 服务，数据保存到 MySQL 数据库。

## 项目结构

```
public/
├── index.html          # 终端风格 SPA 前端
└── _worker.api.js      # API 逻辑
scripts/
├── server.js           # 本地 Node.js 服务入口，连接 MySQL
├── seed.js             # 种子数据脚本
├── reset.js            # 重置数据脚本
└── import.js           # Markdown 导入脚本
docker/
├── Dockerfile          # Docker 镜像构建文件
├── docker-compose.yml  # Docker Compose 配置，只运行 blog 服务
└── entrypoint.sh       # 容器启动脚本
.env                    # 本地和 Docker 共用配置
package.json            # npm 脚本
```

## MySQL 准备

本项目不再使用 KV 或本地 JSON 文件，启动时会自动在 MySQL 中创建关系表：`posts`、`post_tags` 和 `sessions`。

先准备本地 MySQL 数据库和账号，示例：

```sql
CREATE DATABASE terminal_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'%' IDENTIFIED BY 'CHANGE_ME_PASSWORD';
GRANT ALL PRIVILEGES ON terminal_blog.* TO 'blog_user'@'%';
FLUSH PRIVILEGES;
```

然后修改主目录 `.env` 中的占位参数：

```env
PORT=8788
HOST=0.0.0.0

ADMIN_USER=admin
ADMIN_PASS=admin123

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=terminal_blog
MYSQL_USER=blog_user
MYSQL_PASSWORD=CHANGE_ME_PASSWORD
MYSQL_CONNECTION_LIMIT=10
MYSQL_FIRST_POST_ID=10001
```

## 快速开始

### 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:8788

### 填充、导入和重置数据

先启动本地服务，然后在另一个终端运行：

```bash
npm run seed     # 写入 5 篇示例文章
npm run import   # 导入 Markdown/ 目录下的 .md 文件
npm run reset    # 清空文章、标签和 session，并重置自增 ID
```

脚本默认请求 `http://localhost:8788`，可用 `SEED_URL` 指向其他本地或 Docker 地址：

```bash
SEED_URL=http://localhost:3000 npm run seed
```

## Docker 运行

Docker 配置只运行博客服务，不内置 MySQL。请先确认 `.env` 中的 `MYSQL_HOST` 是容器可访问的数据库地址。若 MySQL 跑在宿主机上，Docker Desktop 通常可用 `host.docker.internal`。

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

访问 http://localhost:8788

### Docker Run

```bash
docker build -t terminal-blog -f docker/Dockerfile .

docker run -d \
  --name terminal-blog \
  --env-file .env \
  -p 8788:8788 \
  -v "$(pwd)/Markdown:/app/Markdown" \
  -v "$(pwd)/download:/app/download" \
  terminal-blog
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `8788` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `ADMIN_USER` | 管理员用户名 | `admin` |
| `ADMIN_PASS` | 管理员密码 | `admin123` |
| `MYSQL_HOST` | MySQL 地址 | `127.0.0.1` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_DATABASE` | MySQL 数据库名 | `terminal_blog` |
| `MYSQL_USER` | MySQL 用户名 | `blog_user` |
| `MYSQL_PASSWORD` | MySQL 密码 | `CHANGE_ME_PASSWORD` |
| `MYSQL_CONNECTION_LIMIT` | MySQL 连接池大小 | `10` |
| `MYSQL_FIRST_POST_ID` | 文章 ID 初始值 | `10001` |
| `SEED_URL` | seed/import/reset 脚本请求地址 | `http://localhost:8788` |

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地服务 |
| `npm start` | 启动本地服务 |
| `npm run seed` | 填充种子数据 |
| `npm run import` | 导入 Markdown 文章 |
| `npm run reset` | 重置 MySQL 中的博客数据 |

## 开发说明

- 修改前端：编辑 `public/index.html`
- 修改 API：编辑 `public/_worker.api.js`
- 修改本地服务和 MySQL 访问层：编辑 `scripts/server.js`
- 服务启动时会自动建表，但不会自动创建数据库或数据库账号。
