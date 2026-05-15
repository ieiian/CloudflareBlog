# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install            # Install dependencies (Wrangler only)
npm run build          # Merge public/index.html + public/_worker.api.js → _worker.js
npm run dev            # Local Workers dev server on port 8788
npm run dev:pages      # Local Pages dev server with KV binding on port 8788
npm run seed           # POST 5 sample articles to the configured API (default localhost:8788)
npm run reset          # Clear blog KV indexes and reset post:nextId to 10001
npm run import         # Import all .md files from Markdown/ into the running API
npm run deploy         # Deploy _worker.js to Cloudflare Workers
npm run deploy:pages   # Deploy public/ to Cloudflare Pages with KV binding
```

There are no configured lint or test scripts in `package.json`. When changing source under `public/`, run `npm run build` before local dev, deploy, or committing generated output, because `_worker.js` is regenerated from the source files.

Scripts that call the API default to `http://localhost:8788`; override with `SEED_URL=...`. Admin credentials default to `ADMIN_USER=admin` and `ADMIN_PASS=admin123`, and can be overridden via environment variables.

## Architecture

This is a terminal/hacker-themed blog SPA deployed on Cloudflare Workers or Cloudflare Pages. The app is intentionally small: `public/index.html` contains the full frontend HTML, CSS, and vanilla JavaScript, while `public/_worker.api.js` contains API handlers and KV persistence. The generated root `_worker.js` combines both and is the deployment entrypoint.

**Edit source files, not generated output:**
- `public/index.html` — SPA frontend, terminal-style UI, client-side router, admin panel, markdown preview/rendering, auth token handling, import/export UI, and locked-post UI.
- `public/_worker.api.js` — API router exported as `handleAPI(request, env, pathname)`, Cloudflare KV CRUD, markdown-to-HTML conversion on write/import, auth sessions, visibility toggles, post locking, JSON import/export, and reset helpers.
- `scripts/build-worker.js` — reads both source files, embeds escaped HTML as `HTML_CONTENT`, appends the API code, and writes root `_worker.js`.
- `_worker.js` — generated deployment artifact. Do not edit manually.

**Runtime routing in generated `_worker.js`:**
- `/api/*` is dispatched to `handleAPI()`.
- `/\d{5,}/` serves the SPA for numeric short article URLs such as `/10001/`.
- In Pages deployments, non-API static requests prefer `env.ASSETS.fetch()` and fall back to the SPA for client-side routing.
- In Workers deployments, non-API requests return the embedded `HTML_CONTENT`.

**Deployment modes:**
- Workers: deploys root `_worker.js` via `wrangler deploy`.
- Pages: deploys `public/` via `wrangler pages deploy public --kv BLOG_KV`; generated worker logic supports `env.ASSETS`.
- Docker: `docker/Dockerfile` installs dependencies inside Linux, runs `npm run build` during image build, and starts `wrangler dev --local --ip 0.0.0.0 --port ${PORT}` so runtime behavior matches local Workers dev. Persist local KV state by mounting `/app/.wrangler/state`.

## KV Data Model

| Key | Value | Notes |
|---|---|---|
| `post:index` | JSON array of post metadata | Entries include `id`, `title`, `tags`, `date`, `size`, `contentLength`, `hidden`, optional `locked`, and `createdAt` on create/import |
| `post:<id>` | Full JSON post | Includes markdown `content`, generated `htmlContent`, `readTime`, visibility, and lock fields |
| `post:nextId` | Integer string | Auto-increment counter; starts at 10001 |
| `tags:index` | `{tags: [{name, count}]}` | Computed from visible posts only |
| `session:<token>` | `{username, createdAt}` | Login session with 24h TTL |

## Key Behaviors

Posts are identified by numeric ID only; there is no slug-based article routing in the current API. Public URLs are `/:id/`, for example `/10001/`.

New posts are hidden by default and must be toggled public from the admin panel. Public post and tag listings filter hidden posts; admin listings use `admin=true`.

Posts can be locked with a per-post password. Admins can fetch locked content with a valid Bearer token; public visitors must pass the lock password flow.

Markdown conversion happens server-side in `public/_worker.api.js` when posts are created, updated, or imported, and the generated HTML is stored in `htmlContent`. The frontend also loads `marked` from a CDN for preview/display parsing and custom code-copy rendering.

Tag indexes are recalculated from visible posts after create, delete, toggle visibility, and JSON import. Check this behavior when changing mutation paths.

Admin auth uses `ADMIN_USER` and `ADMIN_PASS` environment variables, defaulting to `admin` and `admin123`. Login returns a UUID Bearer token stored in KV under `session:<token>` for 24 hours. The frontend stores the token in browser storage.

The Node import script reads Markdown files from `Markdown/`, parses YAML-like frontmatter, sorts by date ascending, skips existing titles, and posts new articles to the running API. Markdown frontmatter format:

```yaml
---
title: 文章标题
date: 2024-01-15
tags: ["技术", "教程"]
hidden: true
---
# Markdown content here
```

The JSON import/export UI uses `/api/export` and `/api/import`. Imported JSON posts receive new numeric IDs.

## Known Implementation Notes

`public/_worker.api.js` has two different markdown renderers in practice: server-side `markdownToHtml()` and the frontend `marked` renderer in `public/index.html`. If output differs between saved content and preview, check both.

The API import handler currently pushes a generated `postId` into `indexData` before pushing the full index entry; this can leave a numeric item inside the metadata array. Be careful around `/api/import`, tag recalculation, and any code that assumes every `post:index` entry is an object.

`README.md` and older `INDEX.md` content may mention stale slug-based routes or older Docker/miniflare details. Prefer source code, `docker/Dockerfile`, and this file as the current reference.
