// ============================================================
// Terminal Blog - Cloudflare Worker (单文件，支持 Pages 和 Workers 部署)
// 此文件由 scripts/build-worker.js 自动生成，请勿手动编辑
// 修改源码请编辑 public/index.html 和 public/_worker.api.js
// ============================================================

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal Blog</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --bg: #0d1117;
            --bg-card: #161b22;
            --bg-header: #1a1f29;
            --green: #00ff41;
            --green-dim: #00cc33;
            --cyan: #00e5ff;
            --yellow: #ffd700;
            --red: #ff6b6b;
            --purple: #d2a8ff;
            --orange: #ffa657;
            --gray: #8b949e;
            --gray-dim: #484f58;
            --border: #30363d;
            --text: #c9d1d9;
        }

        body {
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            font-size: 14px;
        }

        /* Scanline effect */
        body::after {
            content: '';
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 65, 0.015) 2px,
                rgba(0, 255, 65, 0.015) 4px
            );
            pointer-events: none;
            z-index: 9999;
        }

        /* Blinking cursor */
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        .cursor {
            display: inline-block;
            width: 8px;
            height: 16px;
            background: var(--green);
            animation: blink 1s step-end infinite;
            vertical-align: middle;
            margin-left: 2px;
        }

        /* Typing animation */
        @keyframes typing {
            from { width: 0; }
            to { width: 100%; }
        }

        /* Terminal window */
        .terminal {
            max-width: 900px;
            margin: 30px auto;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        /* Title bar */
        .title-bar {
            background: var(--bg-header);
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--border);
            user-select: none;
        }
        .title-bar .dot {
            width: 12px; height: 12px;
            border-radius: 50%;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .title-bar .dot:hover { opacity: 0.8; }
        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }
        .title-bar .title {
            flex: 1;
            text-align: center;
            font-size: 0.8em;
            color: var(--gray);
        }

        /* Terminal body */
        .term-body {
            background: var(--bg);
            padding: 24px;
        }

        /* Command prompt */
        .prompt {
            margin-bottom: 8px;
        }
        .prompt .user {
            color: var(--green);
            font-weight: 600;
        }
        .prompt .path {
            color: var(--cyan);
        }
        .prompt .symbol {
            color: var(--gray);
        }
        .prompt .cmd {
            color: var(--text);
        }

        /* Output */
        .output {
            margin: 12px 0 20px;
            padding-left: 0;
        }
        .output p {
            margin-bottom: 6px;
        }

        /* ASCII art */
        .ascii-art {
            color: var(--green);
            font-size: 0.7em;
            line-height: 1.2;
            margin: 20px 0;
            white-space: pre;
            text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
        }

        /* Separator */
        .sep {
            color: var(--gray-dim);
            margin: 20px 0;
            font-size: 0.85em;
        }

        /* Post listing */
        .ls-output {
            margin: 12px 0;
        }
        .ls-row {
            display: grid;
            grid-template-columns: 100px 80px 1fr 80px;
            gap: 12px;
            padding: 6px 0;
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
            font-size: 0.9em;
        }
        @media (max-width: 600px) {
            .ls-row {
                grid-template-columns: 1fr 80px;
            }
            .ls-row .perm, .ls-row .size { display: none; }
            .ls-row.header span:nth-child(1),
            .ls-row.header span:nth-child(2) { display: none; }
        }
        .ls-row.header {
            color: var(--gray-dim);
            font-weight: 600;
            border-bottom: 1px solid var(--border);
            padding-bottom: 10px;
            margin-bottom: 4px;
        }
        .ls-row .perm { color: var(--gray); }
        .ls-row .size { color: var(--orange); }
        .ls-row .name a {
            color: var(--cyan);
            text-decoration: none;
            transition: color 0.2s;
        }
        .ls-row .name a:hover {
            color: var(--green);
            text-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
        }
        .ls-row .date-col { color: var(--gray); }

        /* Post detail card */
        .post-detail {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            margin: 16px 0;
            overflow: hidden;
        }
        .post-detail .file-header {
            background: var(--bg-header);
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            font-size: 0.8em;
            border-bottom: 1px solid var(--border);
        }
        .post-detail .file-header .filename {
            color: var(--cyan);
        }
        .post-detail .file-header .lang {
            color: var(--purple);
        }
        .post-detail .file-body {
            padding: 20px;
        }
        .post-detail .file-body h2 {
            color: var(--green);
            font-size: 1.3em;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .post-detail .file-body .meta-line {
            color: var(--gray);
            font-size: 0.8em;
            margin-bottom: 16px;
        }
        .post-detail .file-body .meta-line .tag {
            color: var(--yellow);
        }
        .post-detail .file-body .meta-line .date-highlight {
            color: var(--orange);
        }
        .post-detail .file-body .content-text {
            color: var(--text);
            font-size: 0.9em;
            line-height: 1.8;
            margin-bottom: 16px;
            white-space: pre-wrap;
        }

        /* Markdown rendered content */
        .post-content {
            color: var(--text);
            font-size: 0.9em;
            line-height: 1.9;
        }
        .post-content h1 { color: var(--green); margin: 24px 0 12px; font-size: 1.4em; }
        .post-content h2 { color: var(--green); margin: 20px 0 10px; font-size: 1.2em; }
        .post-content h3 { color: var(--cyan); margin: 16px 0 8px; font-size: 1.05em; }
        .post-content p { margin-bottom: 12px; }
        .post-content a { color: var(--cyan); text-decoration: none; }
        .post-content a:hover { text-decoration: underline; color: var(--green); }
        .post-content code {
            background: var(--bg-header);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            color: var(--orange);
        }
        .post-content pre {
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 4px;
            padding: 16px;
            margin: 12px 0;
            overflow-x: auto;
            font-size: 1em;
        }
        .post-content .code-block {
            position: relative;
        }
        .post-content .code-block:hover .copy-btn {
            opacity: 1;
        }
        .post-content .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--gray);
            font-family: inherit;
            font-size: 12px;
            padding: 4px 10px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s, color 0.2s;
            z-index: 1;
        }
        .post-content .copy-btn:hover {
            color: var(--green);
            border-color: var(--green);
        }
        .post-content .copy-btn.copied {
            color: var(--green);
        }

        /* Dark scrollbar */
        * {
            scrollbar-width: thin;
            scrollbar-color: var(--border) var(--bg-card);
        }
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: var(--bg-card);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: var(--gray-dim);
        }
        ::-webkit-scrollbar-corner {
            background: var(--bg-card);
        }
        .post-content pre code {
            background: none;
            padding: 0;
            color: var(--text);
        }
        .post-content blockquote {
            border-left: 3px solid var(--green);
            padding-left: 16px;
            margin: 12px 0;
            color: var(--gray);
        }
        .post-content ul, .post-content ol {
            padding-left: 24px;
            margin-bottom: 12px;
        }
        .post-content li { margin-bottom: 4px; }
        .post-content img {
            max-width: 100%;
            border-radius: 4px;
            border: 1px solid var(--border);
        }
        .post-content hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 20px 0;
        }

        /* Back link */
        .back-link {
            color: var(--green);
            text-decoration: none;
            font-size: 0.85em;
            display: inline-block;
            margin-top: 12px;
        }
        .back-link:hover { text-decoration: underline; }

        /* Tags section */
        .tags-section {
            margin: 20px 0;
        }
        .tag-item {
            display: inline-block;
            padding: 4px 12px;
            margin: 4px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.8em;
            color: var(--text);
            text-decoration: none;
            transition: all 0.2s;
            cursor: pointer;
        }
        .tag-item:hover, .tag-item.active {
            border-color: var(--green);
            color: var(--green);
            background: rgba(0, 255, 65, 0.05);
        }
        .tag-item .count {
            color: var(--gray-dim);
            margin-left: 4px;
        }

        /* Status bar */
        .status-bar {
            background: var(--bg-header);
            border-top: 1px solid var(--border);
            padding: 6px 16px;
            display: flex;
            justify-content: space-between;
            font-size: 0.75em;
            color: var(--gray);
        }
        .status-bar .branch { color: var(--green); }
        .status-bar .mode { color: var(--cyan); }

        /* System info */
        .sysinfo {
            color: var(--gray);
            font-size: 0.8em;
            margin: 12px 0;
        }
        .sysinfo .highlight {
            color: var(--green);
        }
        .sysinfo .warn {
            color: var(--yellow);
        }

        /* Footer terminal */
        .term-footer {
            max-width: 900px;
            margin: 0 auto 30px;
            text-align: center;
            font-size: 0.75em;
            color: var(--gray-dim);
        }
        .term-footer a {
            color: var(--gray);
            text-decoration: none;
        }
        .term-footer a:hover { color: var(--green); }

        /* Highlight effect */
        .glow {
            text-shadow: 0 0 10px currentColor;
        }

        /* Loading */
        .loading {
            color: var(--green);
            font-size: 0.85em;
        }
        .loading::after {
            content: '...';
            animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }

        /* Error */
        .error-text {
            color: var(--red);
            font-size: 0.85em;
        }

        /* Pagination */
        .pagination {
            margin: 16px 0;
            display: flex;
            gap: 8px;
        }
        .pagination a {
            color: var(--cyan);
            text-decoration: none;
            padding: 4px 12px;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.8em;
            cursor: pointer;
            transition: all 0.2s;
        }
        .pagination a:hover {
            border-color: var(--green);
            color: var(--green);
        }
        .pagination a.active {
            background: var(--green);
            color: var(--bg);
            border-color: var(--green);
        }
        .pagination a.disabled {
            opacity: 0.3;
            pointer-events: none;
        }

        /* Admin panel */
        .admin-section {
            margin: 16px 0;
        }
        .admin-section input,
        .admin-section textarea {
            width: 100%;
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.9em;
            margin-bottom: 8px;
        }
        .admin-section textarea {
            min-height: 200px;
            resize: vertical;
        }
        .admin-section input:focus,
        .admin-section textarea:focus {
            outline: none;
            border-color: var(--green);
        }
        .admin-section label {
            color: var(--gray);
            font-size: 0.8em;
            display: block;
            margin-bottom: 4px;
        }
        .admin-btn {
            background: var(--bg-header);
            color: var(--green);
            border: 1px solid var(--green);
            padding: 8px 20px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s;
        }
        .admin-btn:hover {
            background: rgba(0, 255, 65, 0.1);
        }
        .admin-btn.danger {
            color: var(--red);
            border-color: var(--red);
        }
        .admin-btn.danger:hover {
            background: rgba(255, 107, 107, 0.1);
        }
        .admin-btn.cyan {
            color: var(--cyan);
            border-color: var(--cyan);
        }
        .admin-btn.cyan:hover {
            background: rgba(0, 229, 255, 0.1);
        }

        /* Preview overlay */
        .preview-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 9998;
            overflow-y: auto;
            padding: 30px 16px;
        }

        /* Nav links in terminal */
        .nav-links {
            margin: 12px 0;
        }
        .nav-links a {
            color: var(--cyan);
            text-decoration: none;
            margin-right: 16px;
            font-size: 0.9em;
            cursor: pointer;
            transition: color 0.2s;
        }
        .nav-links a:hover, .nav-links a.active {
            color: var(--green);
        }

        /* Toast notification */
        #toastContainer {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
        }
        .toast-bar {
            width: 100%;
            background: var(--bg-header);
            border-bottom: 1px solid var(--border);
            padding: 10px 20px;
            text-align: center;
            color: var(--gray);
            font-size: 0.85em;
            pointer-events: auto;
            animation: toastIn 0.3s ease;
        }
        .toast-bar.fade-out {
            animation: toastOut 1s ease forwards;
        }
        .toast-bar .toast-success { color: var(--green-dim); }
        .toast-bar .toast-error { color: var(--red); }
        .toast-bar .toast-info { color: var(--cyan); }
        .toast-bar .toast-actions {
            margin-top: 8px;
            display: flex;
            justify-content: center;
            gap: 12px;
        }
        .toast-bar .toast-actions button {
            background: var(--bg);
            color: var(--gray);
            border: 1px solid var(--border);
            padding: 4px 16px;
            border-radius: 3px;
            font-family: inherit;
            font-size: 0.85em;
            cursor: pointer;
            transition: all 0.2s;
        }
        .toast-bar .toast-actions button:hover {
            border-color: var(--green);
            color: var(--green);
        }
        .toast-bar .toast-actions button.confirm-btn:hover {
            border-color: var(--red);
            color: var(--red);
        }
        @keyframes toastIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }
    </style>
</head>
<body>
    <div id="toastContainer"></div>

    <div class="terminal">
        <div class="title-bar">
            <div class="dot red" onclick="navigate('home')"></div>
            <div class="dot yellow" onclick="navigate('tags')"></div>
            <div class="dot green" onclick="navigate('admin')"></div>
            <div class="title" id="titleBar">hacker@blog ~ zsh</div>
        </div>

        <div class="term-body" id="termBody">
            <div class="loading"></div>
        </div>

        <div class="status-bar">
            <div>
                <span class="branch">⎇ main</span> · TerminalBlog
            </div>
            <div>
                <span class="mode" id="statusMode">NORMAL</span> · utf-8 · markdown
            </div>
        </div>
    </div>

    <div class="term-footer">
        <p>© 2026 TerminalBlog · 终端黑客风格 · Powered by TSE</p>
        <p style="margin-top: 8px; color: var(--gray-dim);">$ echo "Stay hungry, stay hacking."</p>
    </div>

    <script>
    // ============ Toast Notification ============
    function showToast(message, type, actions) {
        var container = document.getElementById('toastContainer');
        var toast = document.createElement('div');
        toast.className = 'toast-bar';

        var typeClass = type === 'success' ? 'toast-success' :
                        type === 'error' ? 'toast-error' :
                        type === 'info' ? 'toast-info' : '';

        var html = '<div class="' + typeClass + '">' + message + '</div>';

        if (actions && actions.length > 0) {
            html += '<div class="toast-actions">';
            actions.forEach(function(act, i) {
                var cls = act.confirm ? 'confirm-btn' : '';
                html += '<button class="' + cls + '" data-idx="' + i + '">' + act.label + '</button>';
            });
            html += '</div>';
        }

        toast.innerHTML = html;
        container.appendChild(toast);

        if (actions && actions.length > 0) {
            var btns = toast.querySelectorAll('.toast-actions button');
            btns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    removeToast(toast);
                    if (actions[idx] && actions[idx].action) actions[idx].action();
                });
            });
        } else {
            setTimeout(function() {
                removeToast(toast);
            }, 3000);
        }
    }

    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('fade-out');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 1000);
    }

    // ============ Simple Markdown Parser ============
    function parseMarkdown(md) {
        let html = md
            // Code blocks
            .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) =>
                '<div class="code-block"><button class="copy-btn" data-lang="' + lang + '" data-code="' + btoa(unescape(encodeURIComponent(code.trim()))) + '">复制</button><pre><code>' + escapeHtml(code.trim()) + '</code></pre></div>')
            // Inline code
            .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Bold & Italic
            .replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
            .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
            // Images
            .replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">')
            // Links
            .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>')
            // Blockquote
            .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
            // Horizontal rule
            .replace(/^---$/gm, '<hr>')
            // Unordered list
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            // Paragraphs
            .replace(/\\n\\n/g, '</p><p>')
            // Line breaks within paragraphs
            .replace(/\\n/g, '<br>');

        // Wrap consecutive <li> in <ul>
        html = html.replace(/((?:<li>.*?<\\/li><br>?)+)/g, '<ul>$1</ul>');
        // Clean up
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\\/p>/g, '');
        html = html.replace(/<p>(<h[1-3]>)/g, '$1');
        html = html.replace(/(<\\/h[1-3]>)<\\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\\/pre>)<\\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\\/ul>)<\\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\\/blockquote>)<\\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)<\\/p>/g, '$1');

        return html;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    }

    // ============ State & Routing ============
    let currentView = 'home';
    let currentSlug = null;
    let currentTag = null;
    let currentPage = 1;
    let adminPage = 1;
    const POSTS_PER_PAGE = 10;

    // ============ Auth State ============
    let authToken = localStorage.getItem('blog_token') || null;
    let authUser = localStorage.getItem('blog_user') || null;

    function navigate(view, param) {
        if (view === 'home') {
            currentView = 'home';
            currentSlug = null;
            currentTag = null;
            currentPage = 1;
        } else if (view === 'post') {
            currentView = 'post';
            currentSlug = param;
        } else if (view === 'tag') {
            currentView = 'tag';
            currentTag = param;
            currentPage = 1;
        } else if (view === 'tags') {
            currentView = 'tags';
        } else if (view === 'admin') {
            currentView = 'admin';
        }
        render();
        updateUrl();
        window.scrollTo(0, 0);
    }

    // ============ API Calls ============
    async function apiGet(path) {
        const res = await fetch(\`/api\${path}\`);
        if (!res.ok) throw new Error(\`API Error: \${res.status}\`);
        return res.json();
    }

    async function apiPost(path, data) {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = \`Bearer \${authToken}\`;
        const res = await fetch(\`/api\${path}\`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        if (res.status === 401) {
            clearAuth();
            const err = await res.json().catch(() => ({ error: '登录已过期' }));
            throw new Error(err.error || '需要重新登录');
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || res.statusText);
        }
        return res.json();
    }

    async function apiDelete(path) {
        const headers = {};
        if (authToken) headers['Authorization'] = \`Bearer \${authToken}\`;
        const res = await fetch(\`/api\${path}\`, {
            method: 'DELETE',
            headers
        });
        if (res.status === 401) {
            clearAuth();
            throw new Error('需要重新登录');
        }
        if (!res.ok) throw new Error(\`API Error: \${res.status}\`);
        return res.json();
    }

    // ============ Auth Functions ============
    function isLoggedIn() {
        return !!authToken;
    }

    function clearAuth() {
        authToken = null;
        authUser = null;
        localStorage.removeItem('blog_token');
        localStorage.removeItem('blog_user');
    }

    async function doLogin() {
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;
        if (!username || !password) {
            showToast('[ERROR] 请输入用户名和密码', 'error');
            return;
        }
        try {
            const result = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            }).then(r => {
                if (!r.ok) return r.json().then(e => { throw new Error(e.error || '登录失败'); });
                return r.json();
            });
            authToken = result.token;
            authUser = result.username;
            localStorage.setItem('blog_token', authToken);
            localStorage.setItem('blog_user', authUser);
            showToast('✅ 登录成功', 'success');
            render();
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function doLogout() {
        try {
            if (authToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': \`Bearer \${authToken}\` }
                });
            }
        } catch (e) {}
        clearAuth();
        navigate('admin');
    }

    async function checkAuth() {
        if (!authToken) return false;
        try {
            const res = await fetch('/api/auth/verify', {
                headers: { 'Authorization': \`Bearer \${authToken}\` }
            });
            const data = await res.json();
            if (data.valid) {
                authUser = data.username;
                return true;
            }
            clearAuth();
            return false;
        } catch (e) {
            return false;
        }
    }

    // ============ Renderers ============
    function setTitle(text) {
        document.getElementById('titleBar').textContent = text;
        document.title = text.split(' ~ ')[0] + ' - Terminal Blog';
    }

    function prompt(user, path, cmd) {
        return \`<div class="prompt">
            <span class="user">\${user}</span><span class="symbol">@</span><span class="path">\${path}</span><span class="symbol">:~$</span> <span class="cmd">\${cmd}</span>
        </div>\`;
    }

    function separator(text) {
        if (text) return \`<div class="sep"># ─── \${text} \${'─'.repeat(Math.max(1, 40 - text.length))}</div>\`;
        return \`<div class="sep"># \${'─'.repeat(50)}</div>\`;
    }

    async function render() {
        const body = document.getElementById('termBody');
        body.innerHTML = '<div class="loading"></div>';

        try {
            switch (currentView) {
                case 'home': await renderHome(body); break;
                case 'post': await renderPost(body); break;
                case 'tag': await renderTagPosts(body); break;
                case 'tags': await renderTags(body); break;
                case 'admin': await renderAdmin(body); break;
            }
        } catch (err) {
            body.innerHTML = \`
                \${prompt('hacker', 'blog', 'cat ./error.log')}
                <div class="output">
                    <p class="error-text">[ERROR] \${escapeHtml(err.message)}</p>
                    <p style="color: var(--gray); margin-top: 12px;">Try refreshing or <a href="#" onclick="navigate('home'); return false;" style="color: var(--cyan);">return home</a></p>
                </div>
            \`;
        }
    }

    async function renderHome(body) {
        setTitle('hacker@blog ~ zsh');
        document.getElementById('statusMode').textContent = 'NORMAL';

        const [stats, posts] = await Promise.all([
            apiGet('/stats'),
            apiGet(\`/posts?page=\${currentPage}&limit=\${POSTS_PER_PAGE}\`)
        ]);

        body.innerHTML = \`
            <div class="ascii-art glow">
 ____   ____ ___ ____  _     ___ _   _ _   _ _____ ____
|  _ \\\\ / ___|_ _|  _ \\\\| |   |_ _| \\\\ | | \\\\ | | ____|  _ \\\\
| |_) | |    | || |_) | |    | ||  \\\\| |  \\\\| |  _| | |_) |
|  _ <| |___ | ||  _ <| |___ | || |\\\\  | |\\\\  | |___|  _ <
|_| \\\\_\\\\\\\\____|___|_| \\\\_\\\\_____|___|_| \\\\_|_| \\\\_|_____|_| \\\\_\\\\
            </div>

            <div class="sysinfo">
                <p><span class="highlight">$</span> uname -a</p>
                <p>TerminalBlog 1.0.0 x86_64 Cloudflare/Pages UTF-8</p>
            </div>

            \${separator()}

            \${prompt('hacker', 'blog', 'cat ./welcome.txt')}
            <div class="output">
                <p style="color: var(--green);">欢迎来到我的终端博客。这里用代码记录世界，用键盘书写思考。</p>
                <p style="color: var(--gray);">共 \${stats.totalPosts} 篇文章 · 上次更新: \${stats.lastUpdate || 'N/A'} · 运行天数: \${stats.uptime} 天</p>
            </div>

            <div class="nav-links">
                <a onclick="navigate('home')" class="active">[首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            \${separator('文章列表')}

            \${prompt('hacker', 'blog', 'ls -la ./posts/')}
            \${renderPostList(posts.posts)}

            \${posts.totalPages > 1 ? renderPagination(posts.page, posts.totalPages) : ''}

            \${separator('标签云')}

            \${prompt('hacker', 'blog', 'cat ./tags.json')}
            <div id="homeTags" class="tags-section">
                <span class="loading"></span>
            </div>

            \${separator('系统状态')}

            \${prompt('hacker', 'blog', 'neofetch')}
            <div class="sysinfo">
                <p><span class="warn">OS:</span> TerminalBlog 1.0.0</p>
                <p><span class="warn">Host:</span> Cloudflare Pages + KV</p>
                <p><span class="warn">Articles:</span> \${stats.totalPosts} posts</p>
                <p><span class="warn">Engine:</span> Cloudflare Workers</p>
                <p><span class="warn">Storage:</span> Cloudflare KV</p>
            </div>

            \${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        \`;

        // Load tags asynchronously
        try {
            const tagsData = await apiGet('/tags');
            const tagsEl = document.getElementById('homeTags');
            if (tagsEl) {
                tagsEl.innerHTML = tagsData.tags.map(t =>
                    \`<a class="tag-item" onclick="navigate('tag', '\${escapeHtml(t.name)}')">\${escapeHtml(t.name)}<span class="count">(\${t.count})</span></a>\`
                ).join('');
            }
        } catch (e) {
            const tagsEl = document.getElementById('homeTags');
            if (tagsEl) tagsEl.innerHTML = '<p class="error-text">标签加载失败</p>';
        }
    }

    function renderPostList(posts) {
        if (!posts || posts.length === 0) {
            return '<div class="output"><p style="color: var(--gray);">暂无文章</p></div>';
        }

        let html = \`<div class="ls-output">
            <div class="ls-row header">
                <span>权限</span>
                <span>大小</span>
                <span>文件名</span>
                <span>日期</span>
            </div>\`;

        posts.forEach(post => {
            html += \`<div class="ls-row">
                <span class="perm">-rw-r--r--</span>
                <span class="size">\${post.size || '---'}</span>
                <span class="name"><a onclick="navigate('post', '\${escapeHtml(post.slug)}')">\${escapeHtml(post.title)}.md</a></span>
                <span class="date-col">\${post.date || '--'}</span>
            </div>\`;
        });

        html += '</div>';
        return html;
    }

    function renderPagination(page, totalPages) {
        let html = '<div class="pagination">';
        html += \`<a onclick="goPage(\${page - 1})" class="\${page <= 1 ? 'disabled' : ''}">← 上一页</a>\`;
        for (let i = 1; i <= totalPages; i++) {
            html += \`<a onclick="goPage(\${i})" class="\${i === page ? 'active' : ''}">\${i}</a>\`;
        }
        html += \`<a onclick="goPage(\${page + 1})" class="\${page >= totalPages ? 'disabled' : ''}">下一页 →</a>\`;
        html += '</div>';
        return html;
    }

    function goPage(page) {
        currentPage = page;
        render();
        window.scrollTo(0, 0);
    }

    function goAdminPage(page) {
        adminPage = page;
        loadAdminPosts();
    }

    async function loadAdminPosts() {
        const listEl = document.getElementById('adminPostList');
        if (!listEl) return;
        listEl.innerHTML = '<span class="loading"></span>';
        try {
            const posts = await apiGet(\`/posts?page=\${adminPage}&limit=\${POSTS_PER_PAGE}&admin=true\`);
            if (posts.posts.length === 0) {
                listEl.innerHTML = '<p style="color: var(--gray);">暂无文章</p>';
            } else {
                let html = posts.posts.map(p => {
                    const btnLabel = p.hidden ? '公开' : '隐藏';
                    const btnColor = p.hidden ? 'var(--green)' : 'var(--red)';
                    const hiddenTag = p.hidden ? '<span style="color: var(--yellow); font-size: 0.75em;">[隐藏中]</span> ' : '';
                    const idTag = p.id ? \`<span style="color: var(--purple); font-size: 0.75em;">#\${p.id}</span> \` : '';
                    return \`<div style="padding: 6px 0; border-bottom: 1px solid rgba(48,54,61,0.5); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            \${hiddenTag}\${idTag}
                            <a style="color: var(--cyan); cursor: pointer; text-decoration: none;" onclick="editPost('\${escapeHtml(p.slug)}')">\${escapeHtml(p.title)}</a>
                            <span style="color: var(--gray); font-size: 0.8em; margin-left: 8px;">\${p.date || ''} · \${p.slug}</span>
                        </div>
                        <button class="admin-btn" style="padding: 4px 12px; font-size: 0.75em; color: \${btnColor}; border-color: \${btnColor}; flex-shrink: 0;" onclick="toggleVisibility('\${escapeHtml(p.slug)}')">\${btnLabel}</button>
                    </div>\`;
                }).join('');
                if (posts.totalPages > 1) {
                    html += renderPagination(posts.page, posts.totalPages).replace(/goPage/g, 'goAdminPage');
                }
                listEl.innerHTML = html;
            }
        } catch (e) {
            listEl.innerHTML = \`<p class="error-text">加载失败: \${escapeHtml(e.message)}</p>\`;
        }
    }

    async function renderPost(body) {
        // Check if currentSlug is a numeric ID or a slug
        var post;
        if (/^\\d+$/.test(currentSlug)) {
            post = await apiGet(\`/post-by-id/\${currentSlug}\`);
        } else {
            post = await apiGet(\`/post/\${currentSlug}\`);
        }
        setTitle(\`\${post.title} ~ blog\`);
        document.getElementById('statusMode').textContent = 'INSERT';

        const tags = (post.tags || []).map(t => \`<span class="tag">[\${escapeHtml(t)}]</span>\`).join(' · ');
        const postId = post.id || '';
        const shareUrl = postId ? \`\${window.location.origin}/\${postId}\` : '';
        const slugDisplay = post.slug || currentSlug;

        // Update browser URL to /<ID>/
        updatePostUrl(postId);

        body.innerHTML = \`
            \${prompt('hacker', 'blog', \`cat ./posts/\${slugDisplay}.md\`)}

            <div class="nav-links">
                <a onclick="navigate('home')">[← 返回首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                \${shareUrl ? \`<a onclick="navigator.clipboard.writeText('\${shareUrl}'); this.textContent='[✓ 已复制链接]'; setTimeout(()=>this.textContent='[📋 复制分享链接]',1500)" style="color: var(--yellow);">[📋 复制分享链接]</a>\` : ''}
            </div>

            <div class="post-detail">
                <div class="file-header">
                    <span class="filename">\${escapeHtml(slugDisplay)}.md</span>
                    <span class="lang">\${postId ? 'ID: ' + postId : 'markdown'}</span>
                </div>
                <div class="file-body">
                    <h2 class="glow"># \${escapeHtml(post.title)}</h2>
                    <div class="meta-line">
                        \${tags}\${tags ? ' · ' : ''}发表于 <span class="date-highlight">\${post.date || 'N/A'}</span> · 阅读约 \${post.readTime || '?'} 分钟
                        \${shareUrl ? \` · <span style="color: var(--purple);">🔗 \${shareUrl}</span>\` : ''}
                    </div>
                    <div class="post-content">
                        \${parseMarkdown(post.content || '')}
                    </div>
                </div>
            </div>

            \${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        \`;
    }

    async function renderTagPosts(body) {
        setTitle(\`\${currentTag || '全部标签'} ~ blog\`);
        document.getElementById('statusMode').textContent = 'NORMAL';

        const posts = await apiGet(\`/posts?tag=\${encodeURIComponent(currentTag || '')}&page=\${currentPage}&limit=\${POSTS_PER_PAGE}\`);

        body.innerHTML = \`
            \${prompt('hacker', 'blog', \`grep -r "\${escapeHtml(currentTag)}" ./posts/\`)}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')" class="active">[标签]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            \${separator(\`标签: \${currentTag}\`)}

            \${renderPostList(posts.posts)}

            \${posts.totalPages > 1 ? renderPagination(posts.page, posts.totalPages) : ''}

            \${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        \`;
    }

    async function renderTags(body) {
        setTitle('tags ~ blog');
        document.getElementById('statusMode').textContent = 'NORMAL';

        const tagsData = await apiGet('/tags');

        let tagsHtml = tagsData.tags.map(t =>
            \`<a class="tag-item" onclick="navigate('tag', '\${escapeHtml(t.name)}')">\${escapeHtml(t.name)}<span class="count">(\${t.count})</span></a>\`
        ).join('');

        body.innerHTML = \`
            \${prompt('hacker', 'blog', 'cat ./tags.json')}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')" class="active">[标签]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            \${separator('全部标签')}

            <div class="tags-section">
                \${tagsHtml || '<p style="color: var(--gray);">暂无标签</p>'}
            </div>

            \${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        \`;
    }

    async function renderAdmin(body) {
        setTitle('admin ~ blog');
        document.getElementById('statusMode').textContent = 'ADMIN';

        // Check if logged in
        const authenticated = await checkAuth();

        if (!authenticated) {
            // Show login form
            body.innerHTML = \`
                \${prompt('hacker', 'blog', 'sudo ./admin-panel')}

                <div class="nav-links">
                    <a onclick="navigate('home')">[首页]</a>
                    <a onclick="navigate('tags')">[标签]</a>
                    <a onclick="navigate('admin')" class="active">[管理]</a>
                </div>

                \${separator('身份验证')}

                <div class="ascii-art" style="font-size: 0.6em; line-height: 1.3;">
 ╦ ╦┌─┐┌┐ ╔═╗╔═╗    ╔╦╗┌─┐┌┐┌┌─┐┌─┐┬  ┌─┐
 ║║║├┤ ├┴┐║ ║╚═╗    ║║║├─┤│││├┤ │ ││  ├┤ 
 ╚╩╝└─┘└─┘╚═╝╚═╝    ╩ ╩┴ ┴┘└┘└─┘└─┘┴─┘└─┘
                </div>

                <div class="output">
                    <p style="color: var(--yellow);">⚠ 需要管理员身份验证才能访问管理面板</p>
                    <p style="color: var(--gray); font-size: 0.8em;">请输入管理员帐号和密码以继续</p>
                </div>

                <div class="admin-section" style="max-width: 400px;">
                    <label>用户名</label>
                    <input type="text" id="loginUser" placeholder="admin"
                           onkeydown="if(event.key==='Enter') document.getElementById('loginPass').focus()" />

                    <label>密码</label>
                    <input type="password" id="loginPass" placeholder="••••••••"
                           onkeydown="if(event.key==='Enter') doLogin()" />

                    <div style="margin-top: 12px;">
                        <button class="admin-btn" onclick="doLogin()">🔑 登录</button>
                    </div>
                </div>

                \${separator()}

                <div class="prompt" style="margin-top: 16px;">
                    <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
                </div>
            \`;
            return;
        }

        // Show admin panel (authenticated)
        body.innerHTML = \`
            \${prompt('hacker', 'blog', 'sudo ./admin-panel')}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                <a onclick="navigate('admin')" class="active">[管理]</a>
                <a onclick="doLogout()" style="color: var(--red);">[退出登录]</a>
            </div>

            \${separator('博客管理面板')}

            <div class="output">
                <p style="color: var(--green);">✅ 已登录为: <span style="color: var(--cyan);">\${escapeHtml(authUser || 'admin')}</span></p>
            </div>

            <div class="admin-section">
                <label>Slug (URL标识符，如: my-first-post)</label>
                <input type="text" id="adminSlug" placeholder="my-first-post" />

                <label>标题</label>
                <input type="text" id="adminTitle" placeholder="文章标题" />

                <label>标签 (逗号分隔，如: 技术,教程,Linux)</label>
                <input type="text" id="adminTags" placeholder="技术, 教程" />

                <label>内容 (Markdown 格式)</label>
                <textarea id="adminContent" placeholder="# 我的文章标题\\n\\n文章内容..."></textarea>

                <div style="margin-top: 12px; display: flex; gap: 12px;">
                    <button class="admin-btn cyan" onclick="previewPost()">👁️ 预览发布</button>
                    <button class="admin-btn" onclick="savePost()">💾 发布文章</button>
                    <button class="admin-btn danger" onclick="deletePost()">🗑️ 删除文章</button>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
                <div style="color: var(--gray-dim); font-size: 0.85em;"># \${'─'.repeat(4)} 已有文章 \${'─'.repeat(30)}</div>
                <div style="display: flex; gap: 8px;">
                    <button class="admin-btn" style="padding: 4px 14px; font-size: 0.75em;" onclick="exportPosts()">📤 导出全部</button>
                    <button class="admin-btn" style="padding: 4px 14px; font-size: 0.75em; color: var(--cyan); border-color: var(--cyan);" onclick="document.getElementById('importFile').click()">📥 导入</button>
                    <input type="file" id="importFile" accept=".json" style="display:none;" onchange="importPosts(event)" />
                </div>
            </div>

            <div id="adminPostList">
                <span class="loading"></span>
            </div>

            \${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        \`;

        // Load posts for admin (paginated)
        adminPage = 1;
        loadAdminPosts();
    }

    async function savePost() {
        const slug = document.getElementById('adminSlug').value.trim();
        const title = document.getElementById('adminTitle').value.trim();
        const tags = document.getElementById('adminTags').value.trim();
        const content = document.getElementById('adminContent').value;

        if (!slug || !title || !content) {
            showToast('[ERROR] Slug、标题和内容不能为空', 'error');
            return;
        }

        try {
            const result = await apiPost('/post', {
                slug,
                title,
                tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                content
            });
            showToast('✅ ' + (result.message || '保存成功'), 'success');
            // Refresh admin post list
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function deletePost() {
        const slug = document.getElementById('adminSlug').value.trim();

        if (!slug) {
            showToast('[ERROR] 请输入要删除的 Slug', 'error');
            return;
        }

        showToast('确认删除文章 "' + escapeHtml(slug) + '"？', 'info', [
            { label: '确认', confirm: true, action: function() { doDeletePost(slug); } },
            { label: '取消', action: function() {} }
        ]);
    }

    async function doDeletePost(slug) {
        try {
            const result = await apiDelete(\`/post/\${slug}\`);
            showToast('✅ ' + (result.message || '删除成功'), 'success');
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function editPost(slug) {
        try {
            const post = await apiGet(\`/post/\${slug}\`);
            document.getElementById('adminSlug').value = post.slug || '';
            document.getElementById('adminTitle').value = post.title || '';
            document.getElementById('adminTags').value = (post.tags || []).join(', ');
            document.getElementById('adminContent').value = post.content || '';
            showToast('📝 已加载文章: ' + escapeHtml(post.title), 'info');
            window.scrollTo(0, 0);
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // ============ Preview Post ============
    function previewPost() {
        var slug = document.getElementById('adminSlug').value.trim() || 'untitled';
        var title = document.getElementById('adminTitle').value.trim() || '未命名文章';
        var tagsStr = document.getElementById('adminTags').value.trim();
        var content = document.getElementById('adminContent').value || '';
        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
        var htmlContent = parseMarkdown(content);
        var today = new Date().toISOString().split('T')[0];
        var readTime = Math.max(1, Math.ceil(content.length / 500));
        var tagsHtml = tags.map(function(t) { return '<span class="tag">[' + escapeHtml(t) + ']</span>'; }).join(' · ');

        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'previewOverlay';
        overlay.innerHTML =
            '<div class="terminal" style="margin: 0 auto;">' +
                '<div class="title-bar">' +
                    '<div class="dot red"></div>' +
                    '<div class="dot yellow"></div>' +
                    '<div class="dot green"></div>' +
                    '<div class="title">预览模式 ~ ' + escapeHtml(title) + '</div>' +
                '</div>' +
                '<div class="term-body">' +
                    prompt('hacker', 'blog', 'cat ./posts/' + escapeHtml(slug) + '.md') +
                    '<div class="nav-links">' +
                        '<a onclick="closePreview()" style="color: var(--cyan);">[← 返回编辑]</a>' +
                        '<span style="color: var(--yellow); font-size: 0.85em;">⬆ 这是预览模式，文章尚未发布</span>' +
                    '</div>' +
                    '<div class="post-detail">' +
                        '<div class="file-header">' +
                            '<span class="filename">' + escapeHtml(slug) + '.md</span>' +
                            '<span class="lang">预览</span>' +
                        '</div>' +
                        '<div class="file-body">' +
                            '<h2 class="glow"># ' + escapeHtml(title) + '</h2>' +
                            '<div class="meta-line">' +
                                tagsHtml + (tagsHtml ? ' · ' : '') +
                                '发表于 <span class="date-highlight">' + today + '</span>' +
                                ' · 阅读约 ' + readTime + ' 分钟' +
                            '</div>' +
                            '<div class="post-content">' +
                                (htmlContent || '<p style="color: var(--gray);">暂无内容</p>') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    separator() +
                    '<div class="prompt" style="margin-top: 16px;">' +
                        '<span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="status-bar">' +
                    '<div><span class="branch">⎇ main</span> · TerminalBlog</div>' +
                    '<div><span class="mode" style="color: var(--yellow);">PREVIEW</span> · utf-8 · markdown</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        overlay.scrollTop = 0;
    }

    function closePreview() {
        var overlay = document.getElementById('previewOverlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // ============ Toggle Visibility ============
    async function toggleVisibility(slug) {
        try {
            const result = await apiPost(\`/post/\${slug}/toggle\`, {});
            showToast('✅ 状态已切换', 'success');
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }


    // ============ 导出/导入 ============
    async function exportPosts() {
        try {
            var headers = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
            var res = await fetch('/api/export', { headers: headers });
            if (!res.ok) {
                var err = await res.json().catch(function() { return { error: '导出失败' }; });
                throw new Error(err.error || '导出失败');
            }
            var blob = await res.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'blog-export-' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('✅ 导出成功', 'success');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function importPosts(event) {
        var file = event.target.files[0];
        if (!file) return;

        try {
            var text = await file.text();
            var data = JSON.parse(text);
            if (!data.posts || !Array.isArray(data.posts)) {
                throw new Error('无效的导出文件格式');
            }

            showToast('确认导入？已有相同 slug 的文章将被覆盖。', 'info', [
                { label: '确认', confirm: true, action: function() { doImport(data); } },
                { label: '取消', action: function() {} }
            ]);
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
        event.target.value = '';
    }

    async function doImport(data) {
        try {
            var headers = { 'Content-Type': 'application/json' };
            if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
            var res = await fetch('/api/import', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            var result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || '导入失败');
            }
            showToast('✅ ' + escapeHtml(result.message) + ' (成功: ' + result.imported + ', 失败: ' + result.failed + ', 总计: ' + result.total + ')', 'success');
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // ============ URL 管理 ============
    function updateUrl() {
        var newUrl = '/';
        if (currentView === 'post' && currentSlug) {
            // Will be updated after post loads when we have the ID
        } else if (currentView === 'tag' && currentTag) {
            newUrl = '/?view=tag&tag=' + encodeURIComponent(currentTag);
        } else if (currentView === 'tags') {
            newUrl = '/?view=tags';
        } else if (currentView === 'admin') {
            newUrl = '/?view=admin';
        }
        history.pushState(null, '', newUrl);
    }

    function updatePostUrl(postId) {
        if (postId) {
            history.replaceState(null, '', '/' + postId + '/');
        }
    }

    // ============ Copy Code Button ============
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            var btn = e.target;
            var code = decodeURIComponent(escape(atob(btn.getAttribute('data-code'))));
            navigator.clipboard.writeText(code).then(function() {
                btn.textContent = '已复制';
                btn.classList.add('copied');
                setTimeout(function() {
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }, 1500);
            }).catch(function() {
                btn.textContent = '复制失败';
                setTimeout(function() {
                    btn.textContent = '复制';
                }, 1500);
            });
        }
    });

    // ============ Init ============
    // Handle direct URL: /<ID> (numeric)
    (function() {
        var pathMatch = window.location.pathname.match(/^\\/(\\d{5,})\\/?$/);
        if (pathMatch) {
            currentView = 'post';
            currentSlug = pathMatch[1];
        }
    })();
    render();
    </script>
</body>
</html>`;

// ============================================================
// Terminal Blog - Cloudflare Pages Worker (API routes only)
// HTML is served from public/index.html via ASSETS binding
// ============================================================

// ==================== 工具函数 ====================
function escapeHtml(str) {
    return str
        .replace(/&/g, '\x26amp;')
        .replace(/</g, '\x26lt;')
        .replace(/>/g, '\x26gt;')
        .replace(/"/g, '\x26quot;')
        .replace(/'/g, '\x26#039;');
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function markdownToHtml(md) {
    let html = md
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
            '<div class="code-block"><button class="copy-btn" data-lang="' + lang + '" data-code="' + btoa(unescape(encodeURIComponent(code.trim()))) + '">复制</button><pre><code>' + escapeHtml(code.trim()) + '</code></pre></div>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    html = html.replace(/((?:<li>.*?<\/li><br>?)+)/g, '<ul>$1</ul>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-3]>)/g, '$1');
    html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    return html;
}

async function verifyAuth(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonResponse({ error: '未登录，请先登录', needAuth: true }, 401);
    }
    const token = authHeader.substring(7);
    const session = await env.BLOG_KV.get('session:' + token, { type: 'json' });
    if (!session) {
        return jsonResponse({ error: '登录已过期，请重新登录', needAuth: true }, 401);
    }
    return null;
}

async function updateTagIndex(env, posts) {
    const tagMap = {};
    posts.forEach(function(post) {
        (post.tags || []).forEach(function(tag) {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
    });
    const tags = Object.entries(tagMap).map(function(entry) {
        return { name: entry[0], count: entry[1] };
    });
    tags.sort(function(a, b) { return b.count - a.count; });
    await env.BLOG_KV.put('tags:index', JSON.stringify({ tags: tags }));
}

// ==================== API 处理函数 ====================

async function handleStats(env) {
    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' });
    const posts = indexData || [];
    const totalPosts = posts.length;
    const sorted = posts.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    const lastUpdate = sorted.length > 0 ? sorted[0].date : null;
    const ascSorted = posts.slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    const startDate = ascSorted.length > 0 ? ascSorted[0].date : '2026-01-01';
    const uptime = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return jsonResponse({
        totalPosts: totalPosts,
        lastUpdate: lastUpdate || new Date().toISOString().split('T')[0],
        uptime: Math.max(1, uptime)
    });
}

async function handlePostsList(env, url) {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const tag = url.searchParams.get('tag') || '';
    const admin = url.searchParams.get('admin') === 'true';

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' });
    let posts = indexData || [];

    if (tag) {
        posts = posts.filter(function(p) { return p.tags && p.tags.indexOf(tag) !== -1; });
    }

    // Public view: filter out hidden posts
    if (!admin) {
        posts = posts.filter(function(p) { return !p.hidden; });
    }

    posts.sort(function(a, b) { return b.id - a.id; });

    const totalPosts = posts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit).map(function(p) {
        return {
            id: p.id,
            slug: p.slug,
            title: p.title,
            date: p.date,
            size: p.size || ((p.contentLength || 0) / 1024).toFixed(1) + ' KB',
            tags: p.tags || [],
            hidden: !!p.hidden
        };
    });

    return jsonResponse({ posts: paginatedPosts, page: page, totalPages: totalPages, totalPosts: totalPosts });
}

async function handleTags(env) {
    const tagsData = await env.BLOG_KV.get('tags:index', { type: 'json' });
    return jsonResponse(tagsData || { tags: [] });
}

async function handlePostGet(env, slug) {
    const postData = await env.BLOG_KV.get('post:' + slug, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }
    return jsonResponse(postData);
}

async function handlePostGetById(env, id) {
    var slug = await env.BLOG_KV.get('post:id:' + id);
    if (!slug) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }
    var postData = await env.BLOG_KV.get('post:' + slug, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }
    if (postData.hidden) {
        return jsonResponse({ error: '文章未公开' }, 404);
    }
    return jsonResponse(postData);
}

async function handleToggleVisibility(env, request, slug) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const idx = indexData.findIndex(function(p) { return p.slug === slug; });
    if (idx < 0) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    const wasHidden = !!indexData[idx].hidden;
    indexData[idx].hidden = !wasHidden;

    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));

    var postData = await env.BLOG_KV.get('post:' + slug, { type: 'json' });
    if (postData) {
        postData.hidden = !wasHidden;
        await env.BLOG_KV.put('post:' + slug, JSON.stringify(postData));
    }

    await updateTagIndex(env, indexData.filter(function(p) { return !p.hidden; }));

    return jsonResponse({
        message: wasHidden ? '文章已公开' : '文章已隐藏',
        slug: slug,
        hidden: !wasHidden
    });
}

async function handlePostCreate(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const data = await request.json();
    const slug = data.slug;
    const title = data.title;
    const tags = data.tags;
    const content = data.content;

    if (!slug || !title || !content) {
        return jsonResponse({ error: 'slug、标题和内容不能为空' }, 400);
    }

    const now = new Date().toISOString();
    const date = now.split('T')[0];
    const contentLength = new Blob([content]).size;
    const size = (contentLength / 1024).toFixed(1) + ' KB';
    const readTime = Math.max(1, Math.ceil(content.length / 500));
    const htmlContent = markdownToHtml(content);

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const existingIdx = indexData.findIndex(function(p) { return p.slug === slug; });

    // Auto ID: only assign for new posts
    var postId = null;
    if (existingIdx >= 0) {
        postId = indexData[existingIdx].id || null;
    }
    if (!postId) {
        var nextIdRaw = await env.BLOG_KV.get('post:nextId');
        var nextId = nextIdRaw ? parseInt(nextIdRaw) : 0;
        // 扫描已有文章 ID，确保 nextId 不冲突
        for (var j = 0; j < indexData.length; j++) {
            if (indexData[j].id && indexData[j].id >= nextId) {
                nextId = indexData[j].id + 1;
            }
        }
        if (nextId < 10001) nextId = 10001;
        postId = nextId;
        await env.BLOG_KV.put('post:nextId', String(nextId + 1));
        await env.BLOG_KV.put('post:id:' + postId, slug);
    }

    // New posts default to hidden
    var isHidden = true;
    if (existingIdx >= 0) {
        isHidden = !!indexData[existingIdx].hidden;
    }

    const postData = { id: postId, slug: slug, title: title, tags: tags || [], content: content, htmlContent: htmlContent, date: date, readTime: readTime, size: size, contentLength: contentLength, hidden: isHidden };
    await env.BLOG_KV.put('post:' + slug, JSON.stringify(postData));

    const indexEntry = { id: postId, slug: slug, title: title, tags: tags || [], date: date, size: size, contentLength: contentLength, hidden: isHidden };

    if (existingIdx >= 0) {
        indexEntry.date = indexData[existingIdx].date || date;
        indexEntry.createdAt = indexData[existingIdx].createdAt || now;
        indexData[existingIdx] = indexEntry;
    } else {
        indexEntry.createdAt = now;
        indexData.push(indexEntry);
    }

    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));
    await updateTagIndex(env, indexData.filter(function(p) { return !p.hidden; }));

    return jsonResponse({ message: '文章保存成功', slug: slug, id: postId });
}

async function handlePostDelete(env, request, slug) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const postData = await env.BLOG_KV.get('post:' + slug, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    await env.BLOG_KV.delete('post:' + slug);

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const newIndex = indexData.filter(function(p) { return p.slug !== slug; });
    await env.BLOG_KV.put('post:index', JSON.stringify(newIndex));
    await updateTagIndex(env, newIndex);

    return jsonResponse({ message: '文章已删除', slug: slug });
}

async function handleLogin(env, request) {
    const data = await request.json();
    const username = data.username;
    const password = data.password;

    const validUser = env.ADMIN_USER || 'admin';
    const validPass = env.ADMIN_PASS || 'admin123';

    if (!username || !password) {
        return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    }

    if (username !== validUser || password !== validPass) {
        return jsonResponse({ error: '用户名或密码错误' }, 401);
    }

    const token = crypto.randomUUID
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)))
              .map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

    await env.BLOG_KV.put(
        'session:' + token,
        JSON.stringify({ username: username, createdAt: Date.now() }),
        { expirationTtl: 86400 }
    );

    return jsonResponse({ message: '登录成功', token: token, username: username });
}

async function handleLogout(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await env.BLOG_KV.delete('session:' + token);
    }
    return jsonResponse({ message: '已退出登录' });
}

async function handleVerify(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonResponse({ error: '未提供认证令牌', valid: false }, 401);
    }
    const token = authHeader.substring(7);
    const session = await env.BLOG_KV.get('session:' + token, { type: 'json' });
    if (!session) {
        return jsonResponse({ error: '令牌已过期或无效', valid: false }, 401);
    }
    return jsonResponse({ valid: true, username: session.username });
}


// ==================== 导出/导入 ====================

async function handleExport(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    var posts = [];

    for (var i = 0; i < indexData.length; i++) {
        var meta = indexData[i];
        var postData = await env.BLOG_KV.get('post:' + meta.slug, { type: 'json' });
        if (postData) {
            posts.push({
                slug: postData.slug,
                title: postData.title,
                tags: postData.tags || [],
                content: postData.content || '',
                date: postData.date || meta.date,
                hidden: !!postData.hidden,
                id: postData.id || meta.id || null
            });
        }
    }

    var exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        posts: posts
    };

    return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="blog-export.json"'
        }
    });
}

async function handleImport(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    var data;
    try {
        data = await request.json();
    } catch (e) {
        return jsonResponse({ error: '无效的 JSON 数据' }, 400);
    }

    if (!data.posts || !Array.isArray(data.posts)) {
        return jsonResponse({ error: '数据格式错误，需要 posts 数组' }, 400);
    }

    var imported = 0, skipped = 0, failed = 0;
    var indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];

    for (var i = 0; i < data.posts.length; i++) {
        var post = data.posts[i];
        if (!post.slug || !post.title || !post.content) {
            failed++;
            continue;
        }

        var now = new Date().toISOString();
        var contentLength = new Blob([post.content]).size;
        var size = (contentLength / 1024).toFixed(1) + ' KB';
        var readTime = Math.max(1, Math.ceil(post.content.length / 500));
        var htmlContent = markdownToHtml(post.content);

        var existingIdx = indexData.findIndex(function(p) { return p.slug === post.slug; });

        var postId = post.id || null;
        if (existingIdx >= 0) {
            postId = indexData[existingIdx].id || postId;
        }
        if (!postId) {
            var nextIdRaw = await env.BLOG_KV.get('post:nextId');
            var nextId = nextIdRaw ? parseInt(nextIdRaw) : 10001;
            postId = nextId;
            await env.BLOG_KV.put('post:nextId', String(nextId + 1));
        }
        await env.BLOG_KV.put('post:id:' + postId, post.slug);

        var isHidden = (existingIdx >= 0) ? !!indexData[existingIdx].hidden : !!post.hidden;
        var postDate = (existingIdx >= 0) ? (indexData[existingIdx].date || post.date || now.split('T')[0]) : (post.date || now.split('T')[0]);

        var postData = {
            id: postId,
            slug: post.slug,
            title: post.title,
            tags: post.tags || [],
            content: post.content,
            htmlContent: htmlContent,
            date: postDate,
            readTime: readTime,
            size: size,
            contentLength: contentLength,
            hidden: isHidden
        };
        await env.BLOG_KV.put('post:' + post.slug, JSON.stringify(postData));

        var indexEntry = {
            id: postId,
            slug: post.slug,
            title: post.title,
            tags: post.tags || [],
            date: postDate,
            size: size,
            contentLength: contentLength,
            hidden: isHidden
        };

        if (existingIdx >= 0) {
            indexEntry.createdAt = indexData[existingIdx].createdAt || now;
            indexData[existingIdx] = indexEntry;
        } else {
            indexEntry.createdAt = now;
            indexData.push(indexEntry);
        }
        imported++;
    }

    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));
    await updateTagIndex(env, indexData.filter(function(p) { return !p.hidden; }));

    // 同步 post:nextId 为最大 ID + 1，防止后续新建文章 ID 冲突
    var maxId = 0;
    indexData.forEach(function(p) {
        if (p.id && p.id > maxId) maxId = p.id;
    });
    if (maxId > 0) {
        await env.BLOG_KV.put('post:nextId', String(maxId + 1));
    }

    return jsonResponse({
        message: '导入完成',
        imported: imported,
        skipped: skipped,
        failed: failed,
        total: data.posts.length
    });
}

// ==================== 路由分发 ====================
function handleAPI(request, env, pathname) {
    const url = new URL(request.url);
    const method = request.method;

    // Auth routes
    if (pathname === '/api/auth/login' && method === 'POST') {
        return handleLogin(env, request);
    }
    if (pathname === '/api/auth/logout' && method === 'POST') {
        return handleLogout(env, request);
    }
    if (pathname === '/api/auth/verify' && method === 'GET') {
        return handleVerify(env, request);
    }

    // Stats
    if (pathname === '/api/stats' && method === 'GET') {
        return handleStats(env);
    }

    // Posts list
    if (pathname === '/api/posts' && method === 'GET') {
        return handlePostsList(env, url);
    }

    // Tags
    if (pathname === '/api/tags' && method === 'GET') {
        return handleTags(env);
    }

    // Post create/update
    if (pathname === '/api/post' && method === 'POST') {
        return handlePostCreate(env, request);
    }

    // Post by slug: /api/post/:slug
    var postMatch = pathname.match(/^\/api\/post\/([^/]+)$/);
    if (postMatch) {
        var slug = postMatch[1];
        if (method === 'GET') {
            return handlePostGet(env, slug);
        }
        if (method === 'DELETE') {
            return handlePostDelete(env, request, slug);
        }
    }

    // Post by ID: /api/post-by-id/:id
    var postIdMatch = pathname.match(/^\/api\/post-by-id\/(\d+)$/);
    if (postIdMatch && method === 'GET') {
        return handlePostGetById(env, postIdMatch[1]);
    }

    // Toggle visibility: /api/post/:slug/toggle
    var toggleMatch = pathname.match(/^\/api\/post\/([^/]+)\/toggle$/);
    if (toggleMatch && method === 'POST') {
        return handleToggleVisibility(env, request, toggleMatch[1]);
    }

    // Export
    if (pathname === '/api/export' && method === 'GET') {
        return handleExport(env, request);
    }

    // Import
    if (pathname === '/api/import' && method === 'POST') {
        return handleImport(env, request);
    }

    return jsonResponse({ error: 'API 路由不存在' }, 404);
}


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

        // 短 URL 路由：/<数字ID> → 返回 SPA 页面，由前端处理
        if (/^\/\d{5,}\/?$/.test(pathname)) {
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
