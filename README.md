# 🖥️ Terminal Blog

一个运行在 **Cloudflare** 上的终端风格博客系统，使用 **Cloudflare KV** 作为存储后端。

基于终端/黑客风格 UI 设计，支持 Markdown 文章编写、标签分类、管理后台。

## 🚀 两种部署方式

### 方式一：Cloudflare Pages（推荐）

使用 `public/` 目录中的 `_worker.js` + `index.html`，通过 ASSETS 绑定提供静态文件。

### 方式二：Cloudflare Workers（单文件）

运行 `npm run build-worker` 生成 `dist/worker.js`（内嵌 HTML），直接复制到 Workers 编辑器即可部署。

## 📁 项目结构

```
├── public/
│   ├── index.html              # 终端风格 SPA 前端
│   └── _worker.js              # Pages Worker（API 路由，Pages 部署用）
├── scripts/
│   ├── seed.js                 # 种子数据写入脚本
│   └── build-worker.js         # 构建独立 worker.js 的脚本
├── dist/
│   └── worker.js               # 构建产物（独立 Worker，含内嵌 HTML）
├── wrangler.toml               # Cloudflare 配置
├── package.json
└── README.md
```

## 📦 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

访问 http://localhost:8788 查看博客。

### 3. 写入种子数据

```bash
npm run seed
```

写入 5 篇示例文章到本地 KV。

### 4. 部署

#### Cloudflare Pages

```bash
npm run deploy
```

或在 Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets 上传 `public/` 目录。

部署后，进入 **Settings → Bindings → Add**：
- Variable name: `BLOG_KV`
- KV namespace: 选择你创建的 KV namespace

#### Cloudflare Workers（单文件部署）

```bash
npm run build-worker
```

1. 打开 Cloudflare Dashboard → Workers & Pages → Create Worker
2. 将 `dist/worker.js` 的完整内容复制到编辑器中
3. Save and Deploy
4. Settings → Bindings → Add：
   - Variable name: `BLOG_KV`
   - KV namespace: 选择你的 namespace

## 🔐 管理员认证

管理面板（点击 [管理] 或绿色圆点进入）需要管理员帐号密码登录。

### 默认帐号密码

| 字段 | 默认值 |
|------|--------|
| 用户名 | `admin` |
| 密码   | `admin123` |

### 自定义帐号密码

#### 方式一：Cloudflare Dashboard 设置环境变量（✅ 推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入项目 → **Settings** → **Environment variables**（Pages）或 **Variables and Secrets**（Workers）
3. 添加变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `ADMIN_USER` | 管理员用户名 | `myadmin` |
| `ADMIN_PASS` | 管理员密码 | `my-strong-password` |

#### 方式二：Wrangler Secret（更安全）

```bash
# Pages 项目
npx wrangler pages secret put ADMIN_USER --project-name terminal-blog
npx wrangler pages secret put ADMIN_PASS --project-name terminal-blog

# Workers 项目
npx wrangler secret put ADMIN_USER
npx wrangler secret put ADMIN_PASS
```

#### 方式三：wrangler.toml 配置（⚠️ 不推荐，会暴露在代码仓库中）

```toml
[vars]
ADMIN_USER = "your-username"
ADMIN_PASS = "your-password"
```

### 认证机制说明

- 登录成功后，服务端生成 UUID 令牌，存储在 Cloudflare KV 中（24小时过期）
- 前端将令牌保存在 `localStorage` 中，每次管理操作自动附带
- 文章的**读取**（GET）无需认证，**创建/编辑/删除**（POST/DELETE）需要认证

## 📡 API 文档

### 公开接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 博客统计信息 |
| GET | `/api/posts?page=1&limit=10` | 文章列表（支持 `tag` 参数过滤） |
| GET | `/api/tags` | 标签列表 |
| GET | `/api/post/:slug` | 获取单篇文章 |

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（返回 token） |
| GET | `/api/auth/verify` | 验证 token 有效性 |
| POST | `/api/auth/logout` | 退出登录 |

### 管理接口（需要 Bearer Token 认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/post` | 创建/更新文章 |
| DELETE | `/api/post/:slug` | 删除文章 |

请求时需要在 Header 中附带：`Authorization: Bearer <token>`

## 🛠️ 技术栈

- **前端**: 原生 HTML/CSS/JS，终端风格 UI，SPA 路由
- **后端**: Cloudflare Workers Runtime（Pages Functions / Standalone Worker）
- **存储**: Cloudflare KV（键值对存储）
- **认证**: UUID Token + KV Session（24小时过期）
- **样式**: 绿色磷光终端、CRT 扫描线效果、ASCII 艺术

## 📝 文章格式

文章使用 Markdown 格式，支持：标题（h1-h3）、粗体/斜体、代码块和行内代码、链接和图片、引用块、列表、水平线。

## 📄 License

MIT