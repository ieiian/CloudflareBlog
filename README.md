# 🖥️ Terminal Blog

一个运行在 **Cloudflare Pages** 上的终端风格博客系统，使用 **Cloudflare KV** 作为存储后端。

基于终端/黑客风格 UI 设计，支持 Markdown 文章编写、标签分类、管理后台。

## 📁 项目结构

```
blog_1/
├── public/
│   └── index.html                  # 终端风格 SPA 前端
├── functions/api/
│   ├── stats.js                    # GET  /api/stats        — 博客统计
│   ├── posts.js                    # GET  /api/posts         — 文章列表（分页+标签过滤）
│   ├── tags.js                     # GET  /api/tags          — 标签列表
│   ├── auth/
│   │   ├── login.js                # POST /api/auth/login    — 管理员登录
│   │   ├── verify.js               # GET  /api/auth/verify   — 验证登录状态
│   │   └── logout.js               # POST /api/auth/logout   — 退出登录
│   └── post/
│       ├── index.js                # POST /api/post          — 创建/更新文章（需认证）
│       └── [slug].js               # GET  /api/post/:slug    — 获取文章
│                                   # DELETE /api/post/:slug  — 删除文章（需认证）
├── scripts/
│   └── seed.js                     # 种子数据写入脚本
├── wrangler.toml                   # Cloudflare 配置
├── package.json
└── README.md
```

## 🚀 快速开始

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

### 4. 部署到 Cloudflare Pages

```bash
npm run deploy
```

## 🔐 管理员认证

管理面板（点击 [管理] 或绿色圆点进入）需要管理员帐号密码登录。

### 默认帐号密码

| 字段 | 默认值 |
|------|--------|
| 用户名 | `admin` |
| 密码   | `admin123` |

### 自定义帐号密码

有三种方式可以自定义管理员帐号密码，设置后**默认帐号密码将失效**：

#### 方式一：Cloudflare Dashboard 设置环境变量（✅ 推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → 选择你的 Pages 项目
3. 点击 **Settings** → **Environment variables**
4. 添加以下变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `ADMIN_USER` | 管理员用户名 | `myadmin` |
| `ADMIN_PASS` | 管理员密码 | `my-strong-password` |

5. 设置完成后重新部署项目即可生效

#### 方式二：Wrangler Secret（✅ 推荐，更安全）

```bash
# 设置用户名
npx wrangler pages secret put ADMIN_USER --project-name terminal-blog
# 按提示输入用户名

# 设置密码
npx wrangler pages secret put ADMIN_PASS --project-name terminal-blog
# 按提示输入密码
```

#### 方式三：wrangler.toml 配置（⚠️ 不推荐，会暴露在代码仓库中）

编辑 `wrangler.toml`，取消注释并修改：

```toml
[vars]
ADMIN_USER = "your-username"
ADMIN_PASS = "your-password"
```

### 认证机制说明

- 登录成功后，服务端生成一个 **UUID 令牌**，存储在 Cloudflare KV 中（24小时过期）
- 前端将令牌保存在 `localStorage` 中，每次管理操作自动附带
- 文章的 **读取**（GET）无需认证，**创建/编辑/删除**（POST/DELETE）需要认证
- 登录页面使用终端风格 UI，支持 Enter 键快捷登录

### 本地开发自定义帐号密码

本地开发时可通过命令行参数传递：

```bash
npx wrangler pages dev public --kv BLOG_KV --binding ADMIN_USER=myuser --binding ADMIN_PASS=mypass
```

或在 `wrangler.toml` 中临时设置：

```toml
[vars]
ADMIN_USER = "local-admin"
ADMIN_PASS = "local-pass"
```

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
- **后端**: Cloudflare Pages Functions（基于 Workers Runtime）
- **存储**: Cloudflare KV（键值对存储）
- **认证**: UUID Token + KV Session（24小时过期）
- **样式**: 绿色磷光终端、CRT 扫描线效果、ASCII 艺术

## 📝 文章格式

文章使用 Markdown 格式，支持以下语法：

- 标题（h1-h3）
- 粗体、斜体
- 代码块和行内代码
- 链接和图片
- 引用块
- 列表
- 水平线

## 📄 License

MIT