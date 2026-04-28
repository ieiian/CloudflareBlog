#!/usr/bin/env node
// ============================================================
// 构建独立 worker.js（包含内嵌 HTML）
// 用法: node scripts/build-worker.js
// 输出: dist/worker.js
// ============================================================

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

// 读取 index.html
const htmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.error('❌ 找不到 public/index.html');
    process.exit(1);
}
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// 读取 _worker.js（API 逻辑）
const workerPath = path.join(publicDir, '_worker.js');
if (!fs.existsSync(workerPath)) {
    console.error('❌ 找不到 public/_worker.js');
    process.exit(1);
}
let workerCode = fs.readFileSync(workerPath, 'utf-8');

// 移除 _worker.js 的前几行注释和末尾的 export default 块
// 提取 export default 之前的所有函数定义
const exportIndex = workerCode.indexOf('export default {');
if (exportIndex === -1) {
    console.error('❌ _worker.js 中找不到 export default');
    process.exit(1);
}
const apiCode = workerCode.substring(0, exportIndex).trim();

// 转义 HTML 中的反引号和 ${} 模板字符串语法
const escapedHtml = htmlContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

// 构建独立 worker.js
const standaloneWorker = `// ============================================================
// Terminal Blog - Standalone Cloudflare Worker
// ============================================================
// 此文件由 scripts/build-worker.js 自动生成
// 修改源码请编辑 public/index.html 和 public/_worker.js
//
// 部署方式：Cloudflare Workers
//   1. 在 Cloudflare Dashboard → Workers & Pages → Create Worker
//   2. 将此文件完整复制到编辑器中
//   3. 在 Settings → Variables and Secrets 中添加：
//      - BLOG_KV (KV Namespace binding)
//      - ADMIN_USER (可选，默认 admin)
//      - ADMIN_PASS (可选，默认 admin123)
// ============================================================

// ==================== HTML 页面 ====================
const HTML_CONTENT = \`${escapedHtml}\`;

${apiCode}

// ==================== 主入口 ====================
export default {
    async fetch(request, env, ctx) {
        var url = new URL(request.url);
        var pathname = url.pathname;

        // API 路由
        if (pathname.startsWith('/api/')) {
            try {
                return await handleAPI(request, env, pathname);
            } catch (err) {
                return jsonResponse({ error: err.message }, 500);
            }
        }

        // 所有非 API 路由返回 HTML 页面
        return new Response(HTML_CONTENT, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }
};
`;

// 创建 dist 目录
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 写入 worker.js
const outputPath = path.join(distDir, 'worker.js');
fs.writeFileSync(outputPath, standaloneWorker, 'utf-8');

const sizeKB = (Buffer.byteLength(standaloneWorker, 'utf-8') / 1024).toFixed(1);
console.log(`✅ 独立 worker.js 已生成: dist/worker.js (${sizeKB} KB)`);
console.log('');
console.log('📋 部署步骤：');
console.log('   1. 打开 Cloudflare Dashboard → Workers & Pages → Create');
console.log('   2. 选择 "Hello World" 或 "Create Worker"');
console.log('   3. 将 dist/worker.js 的完整内容复制到编辑器');
console.log('   4. Save and Deploy');
console.log('   5. Settings → Bindings → Add:');
console.log('      - Variable name: BLOG_KV');
console.log('      - KV namespace: 选择你的 namespace');
console.log('   6. (可选) Settings → Variables:');
console.log('      - ADMIN_USER = 你的用户名');
console.log('      - ADMIN_PASS = 你的密码');