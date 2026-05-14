# Terminal Blog

一个基于 Cloudflare Workers + KV 的终端风格博客系统，使用单个 `_worker.js` 文件部署。基于 miniflare v2 模拟 Workers + KV 环境，可在任何服务器上一键部署。

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
      - blog-kv:/app/.kv
      - ./download:/app/download
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASS=admin123
    restart: unless-stopped

volumes:
  blog-kv:
```

```bash
docker compose up -d
```

访问 http://localhost:8788

### Docker Run

```bash
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-kv:/app/.kv \
  -v ./download:/app/download \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=admin123 \
  ieiian/terminal-blog:latest
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USER` | 管理员用户名 | `admin` |
| `ADMIN_PASS` | 管理员密码 | `admin123` |
| `PORT` | 端口号 | `8788` |

### 自定义管理员密码

```bash
# Docker Compose
ADMIN_USER=myuser ADMIN_PASS=mypassword docker compose up -d

# Docker Run
docker run -d \
  -p 8788:8788 \
  -e ADMIN_USER=myuser \
  -e ADMIN_PASS=mypassword \
  ieiian/terminal-blog:latest
```

## 挂载目录

| 路径 | 说明 |
|------|------|
| `/app/.kv` | KV 数据持久化目录 |
| `/app/download` | 下载文件夹，用于转存文件 |

### 本地 download 文件夹

```bash
# 创建本地 download 目录
mkdir -p download

# 运行容器（download 目录会持久化到本地）
docker run -d \
  -p 8788:8788 \
  -v $(pwd)/download:/app/download \
  ieiian/terminal-blog:latest
```

## 管理命令

```bash
# 查看日志
docker logs -f terminal-blog

# 停止
docker compose down
# 或
docker stop terminal-blog

# 停止并清除所有数据
docker compose down -v

# 更新到最新版本
docker compose pull && docker compose up -d
```

## 导入文章

将 Markdown 文件放入 `Markdown/` 目录，然后使用 import 脚本导入。

### 前置准备

1. 启动博客容器
2. 确保 Markdown 文件准备好（带 YAML frontmatter）：

```markdown
---
title: 我的文章标题
date: 2024-01-15
tags: ["技术", "教程"]
---
# Markdown 内容...
```

### 使用 import 脚本

在宿主机上运行（博客运行在 localhost:8788）：

```bash
# 默认参数
npm run import

# 自定义目标地址
SEED_URL=http://your-domain.com npm run import

# 自定义管理员账号
ADMIN_USER=myuser ADMIN_PASS=mypassword npm run import
```

### 功能说明

- 按日期排序导入（先旧后新）
- 按标题去重，已存在的文章会被跳过
- 所有文章自动分配新的 ID
- 支持 `hidden` 字段控制文章可见性

### import 脚本命令

```bash
npm run import          # 使用默认配置导入
SEED_URL=http://example.com npm run import   # 指定博客地址
ADMIN_USER=user ADMIN_PASS=pass npm run import  # 指定管理员账号
```

## 重置数据

清除所有 KV 数据（慎用）：

```bash
npm run reset
# 或指定地址
SEED_URL=http://your-domain.com npm run reset
```

## 填充种子数据

导入 5 篇示例文章：

```bash
npm run seed
# 或指定地址
SEED_URL=http://your-domain.com npm run seed
```

## 从源码构建

```bash
# 1. 克隆项目
git clone https://github.com/ieiian/terminal-blog.git
cd terminal-blog

# 2. 构建 worker
npm install
npm run build

# 3. 构建 Docker 镜像
docker build -f docker/Dockerfile -t terminal-blog .

# 4. 运行
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-kv:/app/.kv \
  -v $(pwd)/download:/app/download \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=admin123 \
  terminal-blog
```

## 默认访问

- 地址：http://localhost:8788
- 用户名：admin
- 密码：admin123

## 技术栈

- 前端：HTML + CSS + Vanilla JavaScript
- 后端：Cloudflare Workers API（模拟）
- 存储：Cloudflare KV（miniflare 模拟）
- 运行时：miniflare v2（Node.js）