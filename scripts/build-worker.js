#!/usr/bin/env node
// ============================================================
// 构建 _worker.js（内嵌 HTML + API，支持 Pages 和 Workers 部署）
// 用法: node scripts/build-worker.js
// 输出: _worker.js（根目录）
// ============================================================

const fs = require('fs');
const path = require('path');

rootDir = path.join(__dirname, '..');
publicDir = path.join(rootDir, 'public');

// ============ 读取配置（优先级：环境变量 > .env 文件 > 默认值） ============
function loadConfig() {
    const config = {
        SITE_TITLE: 'TerminalBlog',
        WELCOME_MESSAGE: '欢迎来到我的终端博客。这里用代码记录世界，用键盘书写思考。',
        SITE_URL: '',
        ICP_NUMBER: ''
    };

    // 1. 先从 .env 文件读取
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                if (key && value) {
                    config[key.trim()] = value;
                }
            }
        });
        console.log('📁 已加载 .env 配置');
    }

    // 2. 环境变量覆盖 .env（用于 Docker 部署）
    if (process.env.SITE_TITLE) config.SITE_TITLE = process.env.SITE_TITLE;
    if (process.env.WELCOME_MESSAGE) config.WELCOME_MESSAGE = process.env.WELCOME_MESSAGE;
    if (process.env.SITE_URL) config.SITE_URL = process.env.SITE_URL;
    if (process.env.ICP_NUMBER) config.ICP_NUMBER = process.env.ICP_NUMBER;

    const hasEnvVar = process.env.SITE_TITLE || process.env.WELCOME_MESSAGE || process.env.SITE_URL || process.env.ICP_NUMBER;
    if (hasEnvVar) {
        console.log('📁 已应用环境变量覆盖');
    }

    if (!fs.existsSync(envPath) && !hasEnvVar) {
        console.log('📁 未找到配置，使用默认配置');
    }

    return config;
}

const config = loadConfig();

// ============ 生成 config.js ============
const configJsContent = `// ============================================================
// Terminal Blog - 站点配置（由 build 脚本自动生成）
// 请编辑 .env 文件来修改配置，或通过环境变量覆盖
// ============================================================

const SITE_CONFIG = {
    siteTitle: '${config.SITE_TITLE}',
    welcomeMessage: '${config.WELCOME_MESSAGE.replace(/'/g, "\\'")}',
    siteUrl: '${config.SITE_URL}',
    icpNumber: '${config.ICP_NUMBER}'
};
`;

// 写入 public/config.js
fs.writeFileSync(path.join(publicDir, 'config.js'), configJsContent, 'utf-8');
console.log('✅ config.js 已生成');

// ============ 读取源文件 ============
const htmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.error('❌ 找不到 public/index.html');
    process.exit(1);
}
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

const apiPath = path.join(publicDir, '_worker.api.js');
if (!fs.existsSync(apiPath)) {
    console.error('❌ 找不到 public/_worker.api.js');
    process.exit(1);
}
let apiCode = fs.readFileSync(apiPath, 'utf-8');

// ============ 替换 HTML 中的占位符 ============
// 在 HTML 内容之前注入配置
const configScript = `<script>
const SITE_CONFIG = {
    siteTitle: '${config.SITE_TITLE}',
    welcomeMessage: '${config.WELCOME_MESSAGE.replace(/'/g, "\\'")}',
    siteUrl: '${config.SITE_URL}',
    icpNumber: '${config.ICP_NUMBER}'
};
</script>
`;

// 在 <head> 标签后注入配置
htmlContent = htmlContent.replace('<head>', '<head>' + configScript);

// 替换 HTML 中的 SITE_CONFIG 模板占位符（用于静态显示的标题等）
// 注意：保留这些占位符，让运行时可以通过 sed 动态替换
// htmlContent = htmlContent.replace(/\${SITE_CONFIG \? SITE_CONFIG\.siteTitle : '([^']+)'}/g, config.SITE_TITLE);
// htmlContent = htmlContent.replace(/\${SITE_CONFIG \? SITE_CONFIG\.welcomeMessage : '([^']+)'}/g, config.WELCOME_MESSAGE);

// 转义 HTML 中的反引号和 ${} 模板字符串语法
const escapedHtml = htmlContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

// ============ 生成 _worker.js ============
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