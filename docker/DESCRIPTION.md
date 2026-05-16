# Terminal Blog

一个基于 Cloudflare Workers + KV 的终端风格博客系统，使用单个 `_worker.js` 文件部署。Docker 镜像在构建阶段于容器内执行 `npm ci` 和 `npm run build`，运行时使用 Wrangler dev / workerd 启动生成后的 Worker，因此行为尽量与本地 `npm run dev` 保持一致。

## 快速开始

### Docker Compose（推荐）

```yaml
services:
  terminal-blog:
    image: ieiian/terminal-blog:latest
    container_name: terminal-blog
    build:
      args:
        SITE_TITLE: "我的博客"
        WELCOME_MESSAGE: "欢迎访问我的博客"
        SITE_URL: "example.com"
        ICP_NUMBER: "粤ICP备XXXXXXXX号"
    ports:
      - "8788:8788"
    volumes:
      # 必选：持久化 Wrangler 本地 KV 数据，否则删除容器后文章数据会丢失
      - blog-wrangler-state:/app/.wrangler/state
      # 可选：把宿主机 Markdown 目录映射进容器，便于 docker exec terminal-blog npm run import
      - ./Markdown:/app/Markdown
      # 可选：预留下载/导出文件目录；当前博客 UI 主要通过浏览器下载 JSON 导出文件
      - ./download:/app/download
    environment:
      ADMIN_USER: ${ADMIN_USER:-admin}
      ADMIN_PASS: ${ADMIN_PASS:-admin123}
      PORT: ${PORT:-8788}
    restart: unless-stopped

volumes:
  blog-wrangler-state:
```

如果使用仓库自带的 `docker/docker-compose.yml`，从项目根目录运行：

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

如果使用上面的独立 compose 文件，运行：

```bash
mkdir -p Markdown download
docker compose up -d
```

访问 http://localhost:8788

### Docker Run

```bash
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-wrangler-state:/app/.wrangler/state \
  -v "$(pwd)/Markdown:/app/Markdown" \
  -v "$(pwd)/download:/app/download" \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=admin123 \
  ieiian/terminal-blog:latest
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USER` | 管理员用户名；容器入口脚本会写入 `/app/.dev.vars` 供 Worker 的 `env.ADMIN_USER` 使用 | `admin` |
| `ADMIN_PASS` | 管理员密码；容器入口脚本会写入 `/app/.dev.vars` 供 Worker 的 `env.ADMIN_PASS` 使用 | `admin123` |
| `PORT` | 容器内监听端口；通常保持 8788，只改宿主机端口映射即可 | `8788` |
| `SITE_TITLE` | 网站标题（显示在标题栏） | `TerminalBlog` |
| `WELCOME_MESSAGE` | 欢迎语 | `欢迎来到我的终端博客。这里用代码记录世界，用键盘书写思考。` |
| `SITE_URL` | 网站地址（用于页脚显示，不带协议） | 空 |
| `ICP_NUMBER` | ICP 备案号 | 空 |

自定义管理员账号和站点配置：

```bash
docker run -d \
  --name terminal-blog \
  -p 8788:8788 \
  -v blog-wrangler-state:/app/.wrangler/state \
  -e ADMIN_USER=myuser \
  -e ADMIN_PASS=mypassword \
  -e SITE_TITLE="我的博客" \
  -e WELCOME_MESSAGE="欢迎访问我的博客" \
  -e SITE_URL=example.com \
  -e ICP_NUMBER="粤ICP备XXXXXXXX号" \
  ieiian/terminal-blog:latest
```

## 持久化与映射目录

| 容器路径 | 建议映射 | 必选 | 说明 |
|------|------|------|------|
| `/app/.wrangler/state` | Docker volume，例如 `blog-wrangler-state:/app/.wrangler/state` | 是 | Wrangler 本地 KV/运行状态目录；文章、索引、session 等本地数据存放在这里 |
| `/app/Markdown` | 绑定宿主机目录，例如 `./Markdown:/app/Markdown` | 可选 | 容器内执行 `npm run import` 时会读取这个目录下的 `.md` 文件 |
| `/app/download` | 绑定宿主机目录，例如 `./download:/app/download` | 可选 | 预留给下载/导出类文件；当前 JSON 导出主要由浏览器保存到客户端 |

注意：如果只通过网页后台写文章、导入/导出 JSON，不映射 `Markdown` 和 `download` 也可以正常运行。若要在容器内执行 `npm run import`，请映射 `/app/Markdown`。

## 管理命令

```bash
# 查看日志
docker logs -f terminal-blog

# 停止容器
docker stop terminal-blog

# 删除容器
docker rm terminal-blog

# 停止并删除容器
docker rm -f terminal-blog

# 删除持久化数据（慎用，会清空本地 KV 数据）
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
  -v "$(pwd)/Markdown:/app/Markdown" \
  -v "$(pwd)/download:/app/download" \
  terminal-blog:latest
```

## 导入与维护

宿主机安装 Node 依赖后，可直接管理正在运行的容器实例；这些脚本默认访问 `http://localhost:8788`：

```bash
npm run seed
npm run import
npm run reset
```

也可以通过环境变量覆盖目标地址和管理员账号：

```bash
SEED_URL=http://your-domain.com ADMIN_USER=myuser ADMIN_PASS=mypassword npm run import
```

如果想在容器内导入 Markdown 文件，请先映射 `/app/Markdown`，然后执行：

```bash
docker exec terminal-blog npm run import
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
