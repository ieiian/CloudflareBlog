#!/usr/bin/env node
// ============================================================
// 构建 _worker.js（内嵌 HTML + API，支持 Pages 和 Workers 部署）
// 用法: node scripts/build-worker.js
// 输出: _worker.js（根目录）
// ============================================================

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// 读取 index.html
const htmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.error('❌ 找不到 public/index.html');
    process.exit(1);
}
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// 读取 _worker.api.js（API 逻辑）
const apiPath = path.join(publicDir, '_worker.api.js');
if (!fs.existsSync(apiPath)) {
    console.error('❌ 找不到 public/_worker.api.js');
    process.exit(1);
}
let apiCode = fs.readFileSync(apiPath, 'utf-8');

// 转义 HTML 中的反引号和 ${} 模板字符串语法
const escapedHtml = htmlContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

// 构建根目录 _worker.js
const workerContent = `// ============================================================
// Terminal Blog - Cloudflare Worker (单文件，支持 Pages 和 Workers 部署)
// 此文件由 scripts/build-worker.js 自动生成，请勿手动编辑
// 修改源码请编辑 public/index.html 和 public/_worker.api.js
// ============================================================

const HTML_CONTENT = \`${escapedHtml}\`;

${apiCode}

// ==================== 主入口 ====================
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        var pathname = url.pathname;

        // API 路由和下载路由
        if (pathname.startsWith('/api/') || pathname.startsWith('/download/')) {
            try {
                return await handleAPI(request, env, pathname);
            } catch (err) {
                return jsonResponse({ error: err.message }, 500);
            }
        }

        // 短 URL 路由：/<数字ID> → 返回 SPA 页面，由前端处理
        if (/^\\\/\\d{5,}\\\/?$/.test(pathname)) {
            if (env.ASSETS) {
                return env.ASSETS.fetch(new Request(new URL('/', url).href));
            }
            return new Response(HTML_CONTENT, {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' }
            });
        }

        // Pages 部署：优先使用 ASSETS 绑定提供静态文件
        if (env.ASSETS) {
            var response = await env.ASSETS.fetch(request);
            if (response.status !== 404) return response;
            return env.ASSETS.fetch(new Request(new URL('/', url).href));
        }

        // Workers 部署：直接返回内嵌 HTML
        return new Response(HTML_CONTENT, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }
};
`;

// 写入根目录 _worker.js
const outputPath = path.join(rootDir, '_worker.js');
fs.writeFileSync(outputPath, workerContent, 'utf-8');

const sizeKB = (Buffer.byteLength(workerContent, 'utf-8') / 1024).toFixed(1);
console.log(`✅ _worker.js 已生成 (${sizeKB} KB)`);
console.log('');
console.log('📋 部署方式：');
console.log('');
console.log('  方式一：Cloudflare Pages');
console.log('    wrangler pages deploy public --kv BLOG_KV');
console.log('    （在 Pages Settings → Functions → Advanced → _worker.js 导入）');
console.log('');
console.log('  方式二：Cloudflare Workers');
console.log('    wrangler deploy');
console.log('    （直接部署根目录 _worker.js）');