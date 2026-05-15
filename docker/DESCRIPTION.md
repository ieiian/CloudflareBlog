# Terminal Blog

一个仅保留本地运行和 Docker 运行方式的终端风格博客系统。前端使用 HTML + CSS + Vanilla JavaScript，后端使用本地 Node.js 服务，数据保存到外部 MySQL 数据库。

## Docker Compose（只运行博客服务）

```yaml
services:
  terminal-blog:
    image: ieiian/terminal-blog:latest
    container_name: terminal-blog
    ports:
      - "8788:8788"
    env_file:
      - .env
    volumes:
      - ./Markdown:/app/Markdown
      - ./download:/app/download
    restart: unless-stopped
```

请先准备可访问的 MySQL 数据库，并在 `.env` 中设置连接参数。若 MySQL 跑在宿主机上，Docker Desktop 通常可用 `host.docker.internal` 作为 `MYSQL_HOST`。

## .env 示例

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

## MySQL 初始化示例

```sql
CREATE DATABASE terminal_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'%' IDENTIFIED BY 'CHANGE_ME_PASSWORD';
GRANT ALL PRIVILEGES ON terminal_blog.* TO 'blog_user'@'%';
FLUSH PRIVILEGES;
```

博客服务启动时会自动创建 `posts`、`post_tags` 和 `sessions` 表。

## 运行

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

访问 http://localhost:8788

## Docker Run

```bash
docker build -t terminal-blog:latest -f docker/Dockerfile .

docker run -d \
  --name terminal-blog \
  --env-file .env \
  -p 8788:8788 \
  -v "$(pwd)/Markdown:/app/Markdown" \
  -v "$(pwd)/download:/app/download" \
  terminal-blog:latest
```

## 管理命令

```bash
docker logs -f terminal-blog
docker stop terminal-blog
docker rm terminal-blog
docker rm -f terminal-blog
```

## 导入与维护

```bash
npm run seed
npm run import
npm run reset
```

也可以通过环境变量覆盖目标地址和管理员账号：

```bash
SEED_URL=http://localhost:8788 ADMIN_USER=myuser ADMIN_PASS=mypassword npm run import
```

## 技术栈

- 前端：HTML + CSS + Vanilla JavaScript
- 后端：本地 Node.js API
- 容器运行时：Docker
- 存储：MySQL 关系表
