# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run build          # Merge public/index.html + public/_worker.api.js → _worker.js
npm run dev            # Local Workers dev server (port 8788)
npm run dev:pages      # Local Pages dev server with KV binding (port 8788)
npm run seed           # POST 5 sample articles to localhost:8788 API
npm run deploy         # Deploy _worker.js to Cloudflare Workers
npm run deploy:pages   # Deploy public/ to Cloudflare Pages with KV binding
```

After editing any source file in `public/`, always run `npm run build` before dev or deploy — the build script regenerates `_worker.js` from the source files.

## Architecture

This is a terminal/hacker-themed blog SPA deployed as a single `_worker.js` file on Cloudflare Workers (or Cloudflare Pages). Zero external frontend dependencies. Storage is Cloudflare KV.

**Source files** (edit these):
- `public/index.html` — Full SPA frontend: HTML + CSS (~580 lines, terminal green-on-black theme) + vanilla JS (~880 lines, custom markdown parser, client-side router, admin panel, auth)
- `public/_worker.api.js` — API handlers exported as `handleAPI(request, env, pathname)` — routing, KV CRUD, markdown→HTML conversion, auth

**Generated file** (do not edit):
- `_worker.js` — Build output. `scripts/build-worker.js` reads both source files, escapes the HTML into a template literal `const HTML_CONTENT`, appends the API code, and adds a `fetch()` entry point that routes `/api/*` → `handleAPI()` and all other paths → serves either `HTML_CONTENT` (Workers) or `env.ASSETS.fetch()` (Pages).

**Deployment modes:**
- Workers: The single `_worker.js` serves HTML and API. Uses `wrangler deploy`.
- Pages: `public/` directory is deployed; `env.ASSETS` handles static files. Uses `wrangler pages deploy public --kv BLOG_KV`.
- Docker: Runs miniflare v2 (local Workers emulator) in Node 20 Alpine. KV data persisted via Docker volume at `/app/.kv`. Published as `ieiian/terminal-blog`.

**Routing** (in the generated `fetch` entry point):
- `/api/*` → `handleAPI()`
- `/\d{5,}/` → Serves SPA (short URL for article IDs ≥ 10001)
- Everything else → HTML_CONTENT (SPA handles client-side routing)

## KV Data Model

| Key | Value | Notes |
|---|---|---|
| `post:index` | JSON array of post metadata | Each entry: slug, title, tags, date, size, contentLength, hidden, id, createdAt |
| `post:<slug>` | Full JSON post | Includes `content` (markdown), `htmlContent`, `readTime` |
| `post:nextId` | Integer string | Auto-increment counter, starts at 10001 |
| `post:id:<id>` | Slug string | Reverse lookup: numeric ID → slug |
| `tags:index` | `{tags: [{name, count}]}` | Computed from visible posts only |
| `session:<token>` | `{username, createdAt}` | 24h TTL |

## Key Behaviors

- **New posts are hidden by default** — must be toggled to public via admin panel
- **Posts have sequential numeric IDs** (10001+) for shareable short URLs like `/10001/`
- **Markdown → HTML conversion happens server-side** on create/import, stored in `htmlContent` field
- **Sort order**: Posts sorted by `createdAt` descending (newest first). Hidden posts filtered from public views.
- **Auth**: Simple username/password via env vars `ADMIN_USER`/`ADMIN_PASS` (default `admin`/`admin123`). Login returns a UUID Bearer token stored in KV with 24h TTL. Admin endpoints call `verifyAuth()`.
- **Tag index** is recalculated from visible posts after every mutation (create, delete, toggle visibility, import)
- **Import preserves existing IDs and dates** for matching slugs; generates new IDs for new slugs
