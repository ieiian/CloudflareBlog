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
    <script src="https://cdn.jsdelivr.net/npm/marked@3.0.8/marked.min.js"></script>
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

        /* Tables */
        .post-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            font-size: 0.9em;
        }
        .post-content table th,
        .post-content table td {
            border: 1px solid var(--border);
            padding: 8px 12px;
            text-align: left;
        }
        .post-content table th {
            background: var(--bg-header);
            color: var(--green);
        }
        .post-content table tr:nth-child(even) {
            background: var(--bg-card);
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

        /* Fullscreen editor mode */
        .fullscreen-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9997;
            padding: 30px 0;
            display: flex;
            justify-content: center;
        }
        .fullscreen-overlay .fullscreen-container {
            width: 100%;
            max-width: 900px;
            display: flex;
            flex-direction: column;
        }
        .fullscreen-overlay .fullscreen-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: var(--bg-header);
            border: 1px solid var(--border);
            border-radius: 8px 8px 0 0;
            border-bottom: none;
        }
        .fullscreen-overlay .fullscreen-header span {
            color: var(--green);
            font-size: 0.85em;
        }
        .fullscreen-overlay .fullscreen-header button {
            background: var(--bg-header);
            color: var(--gray);
            border: 1px solid var(--border);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
        }
        .fullscreen-overlay .fullscreen-header button:hover {
            color: var(--red);
            border-color: var(--red);
        }
        .fullscreen-overlay textarea {
            flex: 1;
            width: 100%;
            background: var(--bg);
            border: 1px solid var(--border);
            border-top: none;
            border-radius: 0 0 8px 8px;
            color: var(--text);
            padding: 20px 24px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: none;
        }
        .fullscreen-overlay textarea:focus {
            outline: none;
            border-color: var(--green);
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

    // ============ Markdown Parser (using marked.js) ============
    // Wait for marked to load, then configure it
    function initMarked() {
        if (typeof marked === 'undefined') {
            setTimeout(initMarked, 100);
            return;
        }

        // Configure marked options
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        // Create custom renderer for code blocks with copy button
        const renderer = new marked.Renderer();

        // Override code block rendering
        renderer.code = function(code, language) {
            var lang = language || '';
            var encoded = btoa(unescape(encodeURIComponent(code)));
            return '<div class="code-block"><button class="copy-btn" data-lang="' + lang + '" data-code="' + encoded + '">复制</button><pre><code class="language-' + lang + '">' + escapeHtml(code) + '</code></pre></div>';
        };

        // Override link rendering (open in new tab)
        renderer.link = function(href, title, text) {
            var titleAttr = title ? ' title="' + title + '"' : '';
            return '<a href="' + href + '" target="_blank"' + titleAttr + '>' + text + '</a>';
        };

        // Override image rendering
        renderer.image = function(href, title, text) {
            var titleAttr = title ? ' title="' + title + '"' : '';
            return '<img src="' + href + '" alt="' + (text || '') + '"' + titleAttr + '>';
        };

        // Override table rendering
        renderer.table = function(header, body) {
            return '<div style="overflow-x:auto;"><table class="md-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
        };

        marked.use({ renderer: renderer });
    }

    // Start initialization
    initMarked();

    function parseMarkdown(md) {
        if (typeof marked !== 'undefined' && md) {
            try {
                return marked.parse(md);
            } catch (e) {
                console.error('Markdown parse error:', e);
            }
        }
        // Fallback - show raw text with HTML escaping
        return '<pre>' + escapeHtml(md) + '</pre>';
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&#039;');
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

    // Store unlocked post IDs in session storage
    let unlockedPosts = JSON.parse(sessionStorage.getItem('unlocked_posts') || '{}');

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
    async function apiGet(path, options) {
        options = options || {};
        const res = await fetch(\`/api\${path}\`, options);
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

    async function apiPut(path, data) {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = \`Bearer \${authToken}\`;
        const res = await fetch(\`/api\${path}\`, {
            method: 'PUT',
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
______ __________  __  _______   __  ___    __     ____  __    ____  ______
/_  __/ ____/ __ \\/  |/  /  _/ | / / /   |  / /    / __ )/ /   / __ \\/ ____/
 / / / __/ / /_/ / /|_/ // //  |/ / / /| | / /    / __  / /   / / / / / __
/ / / /___/ _, _/ /  / // // /|  / / ___ |/ /___ / /_/ / /___/ /_/ / /_/ /
/_/ /_____/_/ |_/_/  /_/___/_/ |_/ /_/  |_/_____//_____/_____/\\____/\\____/
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
            const lockIcon = post.locked ? '🔒 ' : '';
            html += \`<div class="ls-row">
                <span class="perm">\${post.locked ? '🔒' : '-rw-r--r--'}</span>
                <span class="size">\${post.size || '---'}</span>
                <span class="name"><a onclick="viewPost('\${post.id}')">\${lockIcon}\${escapeHtml(post.title)}.md</a></span>
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
                    const btnLabel = p.hidden ? '显示' : '隐藏';
                    const btnColor = p.hidden ? 'var(--red)' : 'var(--green)';
                    const lockBtnColor = p.locked ? 'var(--orange)' : 'var(--gray)';
                    const lockLabel = p.locked ? '🔓' : '🔒';
                    const hiddenTag = p.hidden ? '<span style="color: var(--yellow); font-size: 0.75em;">[隐藏]</span> ' : '';
                    return \`<div style="padding: 6px 0; border-bottom: 1px solid rgba(48,54,61,0.5); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            \${hiddenTag}
                            <span style="color: var(--purple); font-size: 0.75em;">#\${p.id}</span>
                            \${p.locked ? '<span style="color: var(--orange); font-size: 0.75em;"> 🔒</span>' : ''}
                            <a style="color: var(--cyan); cursor: pointer; text-decoration: none; margin-left: 8px;" onclick="viewPost('\${p.id}')">\${escapeHtml(p.title)}</a>
                            <span style="color: var(--gray); font-size: 0.8em; margin-left: 8px;">\${p.date || ''}</span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="admin-btn" style="padding: 4px 8px; font-size: 0.75em;" onclick="editPost('\${p.id}')" title="编辑">✏️</button>
                            <button class="admin-btn" style="padding: 4px 8px; font-size: 0.75em; color: \${btnColor}; border-color: \${btnColor};" onclick="toggleVisibility('\${p.id}')" title="\${btnLabel}">\${p.hidden ? '👁' : '👁️'}</button>
                            <button class="admin-btn" style="padding: 4px 8px; font-size: 0.75em; color: \${lockBtnColor}; border-color: \${lockBtnColor};" onclick="showLockDialog('\${p.id}', \${p.locked})" title="\${p.locked ? '解锁' : '上锁'}">\${lockLabel}</button>
                        </div>
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
        // currentSlug now always contains the post ID
        var post;
        try {
            // If post was previously unlocked, pass password to get full content
            var unlockPassword = unlockedPosts[currentSlug];
            if (unlockPassword) {
                post = await apiGet('/post/' + currentSlug, {
                    headers: { 'X-Unlock-Password': unlockPassword }
                });
            } else {
                post = await apiGet('/post/' + currentSlug);
            }
        } catch (err) {
            // Post not found, redirect to home
            showToast('文章不存在或已被删除', 'error');
            navigate('home');
            return;
        }

        // If post is locked and we don't have content, show unlock prompt
        if (post.locked && !post.content) {
            showLockPasswordPrompt(currentSlug, post.title);
            navigate('home');  // Go back to home while waiting for password
            return;
        }

        setTitle(\`\${post.title} ~ blog\`);
        document.getElementById('statusMode').textContent = 'INSERT';

        const tags = (post.tags || []).map(t => \`<span class="tag">[\${escapeHtml(t)}]</span>\`).join(' · ');
        const postId = post.id || '';
        const shareUrl = postId ? \`\${window.location.origin}/\${postId}\` : '';

        // Update browser URL to /<ID>/
        updatePostUrl(postId);

        body.innerHTML = \`
            \${prompt('hacker', 'blog', \`cat ./posts/\${postId}.md\`)}

            <div class="nav-links">
                <a onclick="navigate('home')">[← 返回首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                \${shareUrl ? \`<a onclick="navigator.clipboard.writeText('\${shareUrl}'); this.textContent='[✓ 已复制链接]'; setTimeout(()=>this.textContent='[📋 复制分享链接]',1500)" style="color: var(--yellow);">[📋 复制分享链接]</a>\` : ''}
            </div>

            <div class="post-detail">
                <div class="file-header">
                    <span class="filename">\${postId}.md</span>
                    <span class="lang">ID: \${postId}\${post.locked ? ' 🔒' : ''}</span>
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
                <input type="hidden" id="adminId" />

                <label>标题</label>
                <input type="text" id="adminTitle" placeholder="文章标题" />

                <label>标签 (逗号分隔，如: 技术,教程,Linux)</label>
                <input type="text" id="adminTags" placeholder="技术, 教程" />

                <label style="position: relative;">内容 (Markdown 格式)
                    <span id="fullscreenBtn" onclick="toggleFullscreen()" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--gray); font-size: 1.2em; padding: 4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--gray)'">⛶</span>
                </label>
                <textarea id="adminContent" placeholder="# 我的文章标题\\n\\n文章内容..." style="padding-right: 40px;"></textarea>

                <div style="margin-top: 12px; display: flex; gap: 12px;">
                    <button class="admin-btn cyan" onclick="previewPost()">👁️ 预览</button>
                    <button class="admin-btn" onclick="savePost()">💾 发布</button>
                    <button class="admin-btn danger" onclick="deletePost()">🗑️ 删除</button>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
                <div style="color: var(--gray-dim); font-size: 0.85em;"># \${'─'.repeat(4)} 已有文章 \${'─'.repeat(30)}</div>
                <div style="display: flex; gap: 8px;">
                    <button class="admin-btn" style="padding: 4px 10px; font-size: 0.75em; color: var(--cyan); border-color: var(--cyan);" onclick="document.getElementById('importFile').click()" title="导入">↙️</button>
                    <button class="admin-btn" style="padding: 4px 10px; font-size: 0.75em;" onclick="exportPosts()" title="导出">↗️</button>
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
        const title = document.getElementById('adminTitle').value.trim();
        const tags = document.getElementById('adminTags').value.trim();
        const content = document.getElementById('adminContent').value;
        const id = document.getElementById('adminId').value.trim();

        if (!title || !content) {
            showToast('[ERROR] 标题和内容不能为空', 'error');
            return;
        }

        const postData = {
            title,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            content
        };

        try {
            let result;
            if (id) {
                // Update existing post
                result = await apiPut('/post/' + id, postData);
                showToast('✅ ' + (result.message || '更新成功'), 'success');
            } else {
                // Create new post
                result = await apiPost('/post', postData);
                showToast('✅ ' + (result.message || '保存成功') + ' (ID: ' + result.id + ')', 'success');
            }
            // Refresh admin post list
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function deletePost() {
        const id = document.getElementById('adminId').value.trim();

        if (!id) {
            showToast('[ERROR] 请先在列表中选择要删除的文章', 'error');
            return;
        }

        showToast('确认删除文章 ID "' + id + '"？', 'info', [
            { label: '确认', confirm: true, action: function() { doDeletePost(id); } },
            { label: '取消', action: function() {} }
        ]);
    }

    async function doDeletePost(id) {
        try {
            const result = await apiDelete('/post/' + id);
            showToast('✅ ' + (result.message || '删除成功'), 'success');
            // Clear form and refresh
            document.getElementById('adminId').value = '';
            document.getElementById('adminTitle').value = '';
            document.getElementById('adminTags').value = '';
            document.getElementById('adminContent').value = '';
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // View post - check if locked first, show password prompt if needed
    async function viewPost(id) {
        try {
            const post = await apiGet('/post/' + id);
            if (post.locked) {
                showLockPasswordPrompt(id, post.title);
            } else {
                navigate('post', id);
            }
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // Lock password prompt overlay
    function showLockPasswordPrompt(id, title) {
        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'lockOverlay';
        overlay.innerHTML =
            '<div class="terminal" style="margin: 30px auto; max-width: 400px;">' +
                '<div class="title-bar">' +
                    '<div class="dot red"></div>' +
                    '<div class="dot yellow"></div>' +
                    '<div class="dot green"></div>' +
                    '<div class="title">🔒 文章已锁定</div>' +
                '</div>' +
                '<div class="term-body">' +
                    '<p style="color: var(--yellow); margin-bottom: 16px;">🔒 <strong>' + escapeHtml(title) + '</strong> 已锁定</p>' +
                    '<p style="color: var(--gray); margin-bottom: 16px;">请输入解锁密码</p>' +
                    '<input type="text" id="lockPasswordInput" placeholder="输入密码..." ' +
                        'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                        'onfocus="this.removeAttribute(\\'readonly\\'); this.value = \\'\\'; this.type = \\'password\\'" readonly ' +
                        'onkeydown="if(event.key===\\'Enter\\') verifyLockPassword()" />' +
                    '<div style="display: flex; gap: 8px;">' +
                        '<button onclick="verifyLockPassword()" style="background: var(--bg-header); color: var(--green); border: 1px solid var(--green); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">解锁</button>' +
                        '<button onclick="closeLockPrompt()" style="background: var(--bg-header); color: var(--gray); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">取消</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        window.lockPostId = id;
        // Focus and clear
        setTimeout(function() {
            var input = document.getElementById('lockPasswordInput');
            if (input) {
                input.removeAttribute('readonly');
                input.value = '';
                input.type = 'password';
                input.focus();
            }
        }, 100);
    }

    function closeLockPrompt() {
        var overlay = document.getElementById('lockOverlay');
        if (overlay) overlay.remove();
        window.lockPostId = null;
    }

    async function verifyLockPassword() {
        var password = document.getElementById('lockPasswordInput').value;
        var id = window.lockPostId;
        if (!id || !password) return;

        try {
            var res = await fetch('/api/post/' + id + '/verify-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });
            var data = await res.json();
            if (data.valid) {
                // Mark post as unlocked in session storage
                unlockedPosts[id] = password;
                sessionStorage.setItem('unlocked_posts', JSON.stringify(unlockedPosts));
                closeLockPrompt();
                navigate('post', id);
            } else {
                showToast('❌ 密码错误', 'error');
            }
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    // Show lock dialog or directly unlock
    function showLockDialog(id, isLocked) {
        if (isLocked) {
            // Directly unlock without confirmation
            unlockPost(id);
        } else {
            // Show lock password input
            var overlay = document.createElement('div');
            overlay.className = 'preview-overlay';
            overlay.id = 'lockDialogOverlay';
            overlay.innerHTML =
                '<div class="terminal" style="margin: 30px auto; max-width: 400px;">' +
                    '<div class="title-bar">' +
                        '<div class="dot red"></div>' +
                        '<div class="dot yellow"></div>' +
                        '<div class="dot green"></div>' +
                        '<div class="title">🔒 设置文章密码</div>' +
                    '</div>' +
                    '<div class="term-body">' +
                        '<p style="color: var(--yellow); margin-bottom: 16px;">设置解锁密码</p>' +
                        '<input type="text" id="lockNewPassword" placeholder="输入密码..." ' +
                            'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                            'onfocus="this.removeAttribute(\\'readonly\\'); this.value = \\'\\'; this.type = \\'password\\'" readonly />' +
                        '<input type="text" id="lockNewPasswordConfirm" placeholder="确认密码..." ' +
                            'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                            'onfocus="this.removeAttribute(\\'readonly\\'); this.value = \\'\\'; this.type = \\'password\\'" readonly />' +
                        '<div style="display: flex; gap: 8px;">' +
                            '<button onclick="lockPost(' + id + ')" style="background: var(--bg-header); color: var(--orange); border: 1px solid var(--orange); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">上锁</button>' +
                            '<button onclick="closeLockDialog()" style="background: var(--bg-header); color: var(--gray); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">取消</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);
            // Focus first input
            setTimeout(function() {
                var input = document.getElementById('lockNewPassword');
                if (input) {
                    input.removeAttribute('readonly');
                    input.value = '';
                    input.type = 'password';
                    input.focus();
                }
            }, 100);
        }
    }

    function closeLockDialog() {
        var overlay = document.getElementById('lockDialogOverlay');
        if (overlay) overlay.remove();
    }

    async function lockPost(id) {
        var password = document.getElementById('lockNewPassword').value;
        var confirm = document.getElementById('lockNewPasswordConfirm').value;

        if (!password) {
            showToast('请输入密码', 'error');
            return;
        }
        if (password !== confirm) {
            showToast('两次密码不一致', 'error');
            return;
        }

        try {
            var res = await apiPost('/post/' + id + '/lock', { password: password });
            showToast('✅ 文章已上锁', 'success');
            closeLockDialog();
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    async function unlockPost(id) {
        try {
            var res = await apiPost('/post/' + id + '/unlock', {});
            showToast('✅ 文章已解锁', 'success');
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    async function editPost(id) {
        try {
            // For admin users, fetch full content even for locked posts
            const post = await apiGet('/post/' + id, {
                headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
            });
            document.getElementById('adminId').value = post.id || '';
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
        var id = document.getElementById('adminId').value.trim();
        var title = document.getElementById('adminTitle').value.trim() || '未命名文章';
        var tagsStr = document.getElementById('adminTags').value.trim();
        var content = document.getElementById('adminContent').value || '';
        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
        var htmlContent = parseMarkdown(content);
        var today = new Date().toISOString().split('T')[0];
        var readTime = Math.max(1, Math.ceil(content.length / 500));
        var tagsHtml = tags.map(function(t) { return '<span class="tag">[' + escapeHtml(t) + ']</span>'; }).join(' · ');
        var displayId = id || 'new';

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
                    prompt('hacker', 'blog', 'cat ./posts/' + displayId + '.md') +
                    '<div class="nav-links">' +
                        '<a onclick="closePreview()" style="color: var(--cyan);">[← 返回编辑]</a>' +
                        '<span style="color: var(--yellow); font-size: 0.85em;">⬆ 这是预览模式，文章尚未发布</span>' +
                    '</div>' +
                    '<div class="post-detail">' +
                        '<div class="file-header">' +
                            '<span class="filename">' + displayId + '.md</span>' +
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

    // ============ Fullscreen Editor ============
    function toggleFullscreen() {
        var existingOverlay = document.getElementById('fullscreenOverlay');
        if (existingOverlay) {
            // Exit fullscreen - restore content
            var textarea = document.getElementById('adminContent');
            var fullscreenTextarea = document.getElementById('fullscreenTextarea');
            if (textarea && fullscreenTextarea) {
                textarea.value = fullscreenTextarea.value;
            }
            document.body.removeChild(existingOverlay);
            return;
        }

        // Enter fullscreen
        var textarea = document.getElementById('adminContent');
        var content = textarea ? textarea.value : '';

        var overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        overlay.id = 'fullscreenOverlay';
        overlay.innerHTML =
            '<div class="fullscreen-container">' +
                '<div class="fullscreen-header">' +
                    '<span>📝 全屏编辑模式 - 按 Esc 或点击退出</span>' +
                    '<button onclick="toggleFullscreen()">✕ 退出</button>' +
                '</div>' +
                '<textarea id="fullscreenTextarea" placeholder="# 文章内容...">' + escapeHtml(content) + '</textarea>' +
            '</div>';

        document.body.appendChild(overlay);

        // Focus textarea
        setTimeout(function() {
            var ta = document.getElementById('fullscreenTextarea');
            if (ta) {
                ta.focus();
                // Move cursor to end
                ta.selectionStart = ta.selectionEnd = ta.value.length;
            }
        }, 100);

        // Handle Escape key
        document.addEventListener('keydown', exitFullscreenOnEscape);
    }

    function exitFullscreenOnEscape(e) {
        if (e.key === 'Escape') {
            toggleFullscreen();
            document.removeEventListener('keydown', exitFullscreenOnEscape);
        }
    }

    // ============ Toggle Visibility ============
    async function toggleVisibility(id) {
        try {
            const result = await apiPost('/post/' + id + '/toggle', {});
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

            showToast('确认导入？所有文章将被重新分配新的 ID。', 'info', [
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
// Terminal Blog - API handlers (ID-only, no slug)
// ============================================================

// ==================== 工具函数 ====================
function escapeHtml(str) {
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
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

async function getNextId(env, existingPosts) {
    var nextIdRaw = await env.BLOG_KV.get('post:nextId');
    var nextId = nextIdRaw ? parseInt(nextIdRaw) : 10001;
    // Ensure no collision with existing IDs
    for (var j = 0; j < existingPosts.length; j++) {
        if (existingPosts[j].id && existingPosts[j].id >= nextId) {
            nextId = existingPosts[j].id + 1;
        }
    }
    if (nextId < 10001) nextId = 10001;
    return nextId;
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

    // Public view: filter out hidden posts (unless admin=true)
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
            title: p.title,
            date: p.date,
            size: p.size || ((p.contentLength || 0) / 1024).toFixed(1) + ' KB',
            tags: p.tags || [],
            hidden: !!p.hidden,
            locked: p.locked || false
        };
    });

    return jsonResponse({ posts: paginatedPosts, page: page, totalPages: totalPages, totalPosts: totalPosts });
}

async function handleTags(env) {
    const tagsData = await env.BLOG_KV.get('tags:index', { type: 'json' });
    return jsonResponse(tagsData || { tags: [] });
}

async function handlePostGet(env, request, id) {
    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    // Check if request is authenticated (admin)
    const authHeader = request.headers ? request.headers.get('Authorization') : null;
    const isAdmin = authHeader && authHeader.startsWith('Bearer ');
    let validToken = false;
    if (isAdmin) {
        const token = authHeader.substring(7);
        const session = await env.BLOG_KV.get('session:' + token, { type: 'json' });
        validToken = !!session;
    }

    // If post is locked, admins can see full content, others need password
    if (postData.locked && !validToken) {
        const unlockHeader = request.headers ? request.headers.get('X-Unlock-Password') : null;
        if (unlockHeader && unlockHeader === postData.lockPassword) {
            // Password matches, return full content
            return jsonResponse(postData);
        }
        return jsonResponse({
            id: postData.id,
            title: postData.title,
            date: postData.date,
            tags: postData.tags || [],
            locked: true,
            size: postData.size,
            contentLength: postData.contentLength,
            hidden: postData.hidden
        });
    }

    return jsonResponse(postData);
}

async function handleToggleVisibility(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const idx = indexData.findIndex(function(p) { return p.id === parseInt(id); });
    if (idx < 0) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    const wasHidden = !!indexData[idx].hidden;
    indexData[idx].hidden = !wasHidden;

    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));

    var postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (postData) {
        postData.hidden = !wasHidden;
        await env.BLOG_KV.put('post:' + id, JSON.stringify(postData));
    }

    await updateTagIndex(env, indexData.filter(function(p) { return !p.hidden; }));

    return jsonResponse({
        message: wasHidden ? '文章已公开' : '文章已隐藏',
        id: parseInt(id),
        hidden: !wasHidden
    });
}

async function handlePostLock(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    const data = await request.json();
    const password = data.password || '';

    if (!password) {
        return jsonResponse({ error: '请输入解锁密码' }, 400);
    }

    postData.locked = true;
    postData.lockPassword = password;
    await env.BLOG_KV.put('post:' + id, JSON.stringify(postData));

    // Update index
    var indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    var idx = indexData.findIndex(function(p) { return p.id === parseInt(id); });
    if (idx >= 0) {
        indexData[idx].locked = true;
        await env.BLOG_KV.put('post:index', JSON.stringify(indexData));
    }

    return jsonResponse({
        message: '文章已上锁',
        id: parseInt(id),
        locked: true
    });
}

async function handlePostUnlock(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    postData.locked = false;
    postData.lockPassword = '';
    await env.BLOG_KV.put('post:' + id, JSON.stringify(postData));

    // Update index
    var indexData2 = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    var idx2 = indexData2.findIndex(function(p) { return p.id === parseInt(id); });
    if (idx2 >= 0) {
        indexData2[idx2].locked = false;
        await env.BLOG_KV.put('post:index', JSON.stringify(indexData2));
    }

    return jsonResponse({
        message: '文章已解锁',
        id: parseInt(id),
        locked: false
    });
}

async function handlePostVerifyLockPassword(env, request, id) {
    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    if (!postData.locked) {
        return jsonResponse({ valid: true });
    }

    const data = await request.json();
    const password = data.password || '';

    if (password === postData.lockPassword) {
        return jsonResponse({ valid: true });
    } else {
        return jsonResponse({ valid: false, error: '密码错误' }, 401);
    }
}

async function handlePostCreate(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const data = await request.json();
    const title = data.title;
    const tags = data.tags;
    const content = data.content;
    const importDate = data.date;  // Date from import, if provided

    if (!title || !content) {
        return jsonResponse({ error: '标题和内容不能为空' }, 400);
    }

    const now = new Date().toISOString();
    // Use import date if provided, otherwise use current date
    const date = importDate || now.split('T')[0];
    const contentLength = new Blob([content]).size;
    const size = (contentLength / 1024).toFixed(1) + ' KB';
    const readTime = Math.max(1, Math.ceil(content.length / 500));
    const htmlContent = markdownToHtml(content);

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];

    // Auto-generate ID
    const postId = await getNextId(env, indexData);
    await env.BLOG_KV.put('post:nextId', String(postId + 1));

    const postData = {
        id: postId,
        title: title,
        tags: tags || [],
        content: content,
        htmlContent: htmlContent,
        date: date,
        readTime: readTime,
        size: size,
        contentLength: contentLength,
        hidden: true,  // New posts default to hidden
        locked: false,
        lockPassword: ''
    };
    await env.BLOG_KV.put('post:' + postId, JSON.stringify(postData));

    const indexEntry = {
        id: postId,
        title: title,
        tags: tags || [],
        date: date,
        size: size,
        contentLength: contentLength,
        hidden: true,
        createdAt: now
    };
    indexData.push(indexEntry);
    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));

    return jsonResponse({ message: '文章保存成功', id: postId });
}

async function handlePostDelete(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    await env.BLOG_KV.delete('post:' + id);

    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const newIndex = indexData.filter(function(p) { return p.id !== parseInt(id); });
    await env.BLOG_KV.put('post:index', JSON.stringify(newIndex));
    await updateTagIndex(env, newIndex);

    return jsonResponse({ message: '文章已删除', id: parseInt(id) });
}

async function handlePostUpdate(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;

    const postData = await env.BLOG_KV.get('post:' + id, { type: 'json' });
    if (!postData) {
        return jsonResponse({ error: '文章不存在' }, 404);
    }

    const data = await request.json();
    const title = data.title;
    const tags = data.tags;
    const content = data.content;

    if (!title || !content) {
        return jsonResponse({ error: '标题和内容不能为空' }, 400);
    }

    const contentLength = new Blob([content]).size;
    const size = (contentLength / 1024).toFixed(1) + ' KB';
    const readTime = Math.max(1, Math.ceil(content.length / 500));
    const htmlContent = markdownToHtml(content);

    // Update the post, preserving lock status
    const updatedPost = {
        id: parseInt(id),
        title: title,
        tags: tags || [],
        content: content,
        htmlContent: htmlContent,
        date: postData.date,  // Keep original date
        readTime: readTime,
        size: size,
        contentLength: contentLength,
        hidden: postData.hidden,
        locked: postData.locked || false,
        lockPassword: postData.lockPassword || ''
    };
    await env.BLOG_KV.put('post:' + id, JSON.stringify(updatedPost));

    // Update index
    const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
    const idx = indexData.findIndex(function(p) { return p.id === parseInt(id); });
    if (idx >= 0) {
        indexData[idx] = {
            id: parseInt(id),
            title: title,
            tags: tags || [],
            date: postData.date,
            size: size,
            contentLength: contentLength,
            hidden: postData.hidden,
            locked: postData.locked || false
        };
        await env.BLOG_KV.put('post:index', JSON.stringify(indexData));
    }

    return jsonResponse({ message: '文章已更新', id: parseInt(id) });
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
        var postData = await env.BLOG_KV.get('post:' + meta.id, { type: 'json' });
        if (postData) {
            posts.push({
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
        if (!post.title || !post.content) {
            failed++;
            continue;
        }

        var now = new Date().toISOString();
        var contentLength = new Blob([post.content]).size;
        var size = (contentLength / 1024).toFixed(1) + ' KB';
        var readTime = Math.max(1, Math.ceil(post.content.length / 500));
        var htmlContent = markdownToHtml(post.content);

        // Generate new ID for each post
        var postId = await getNextId(env, indexData);
        indexData.push(postId);

        var postDate = post.date || now.split('T')[0];

        var postData = {
            id: postId,
            title: post.title,
            tags: post.tags || [],
            content: post.content,
            htmlContent: htmlContent,
            date: postDate,
            readTime: readTime,
            size: size,
            contentLength: contentLength,
            hidden: !!post.hidden
        };
        await env.BLOG_KV.put('post:' + postId, JSON.stringify(postData));

        var indexEntry = {
            id: postId,
            title: post.title,
            tags: post.tags || [],
            date: postDate,
            size: size,
            contentLength: contentLength,
            hidden: !!post.hidden,
            createdAt: now
        };
        indexData.push(indexEntry);
        imported++;
    }

    await env.BLOG_KV.put('post:index', JSON.stringify(indexData));
    await updateTagIndex(env, indexData.filter(function(p) { return !p.hidden; }));

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

    // Post create
    if (pathname === '/api/post' && method === 'POST') {
        return handlePostCreate(env, request);
    }

    // Post by ID: /api/post/:id
    var postMatch = pathname.match(/^\/api\/post\/(\d+)$/);
    if (postMatch) {
        var id = postMatch[1];
        if (method === 'GET') {
            return handlePostGet(env, request, id);
        }
        if (method === 'PUT') {
            return handlePostUpdate(env, request, id);
        }
        if (method === 'DELETE') {
            return handlePostDelete(env, request, id);
        }
    }

    // Toggle visibility: /api/post/:id/toggle
    var toggleMatch = pathname.match(/^\/api\/post\/(\d+)\/toggle$/);
    if (toggleMatch && method === 'POST') {
        return handleToggleVisibility(env, request, toggleMatch[1]);
    }

    // Lock post: /api/post/:id/lock
    var lockMatch = pathname.match(/^\/api\/post\/(\d+)\/lock$/);
    if (lockMatch && method === 'POST') {
        return handlePostLock(env, request, lockMatch[1]);
    }

    // Unlock post: /api/post/:id/unlock
    var unlockMatch = pathname.match(/^\/api\/post\/(\d+)\/unlock$/);
    if (unlockMatch && method === 'POST') {
        return handlePostUnlock(env, request, unlockMatch[1]);
    }

    // Verify lock password: /api/post/:id/verify-lock
    var verifyLockMatch = pathname.match(/^\/api\/post\/(\d+)\/verify-lock$/);
    if (verifyLockMatch && method === 'POST') {
        return handlePostVerifyLockPassword(env, request, verifyLockMatch[1]);
    }

    // Export
    if (pathname === '/api/export' && method === 'GET') {
        return handleExport(env, request);
    }

    // Import
    if (pathname === '/api/import' && method === 'POST') {
        return handleImport(env, request);
    }

    // Reset nextId counter
    if (pathname === '/api/reset-nextid' && method === 'POST') {
        return (async function() {
            const authError = await verifyAuth(env, request);
            if (authError) return authError;
            await env.BLOG_KV.put('post:nextId', '10001');
            return jsonResponse({ message: 'ID 计数器已重置为 10001' });
        })();
    }

    // Reset all data (clear post:index and tags)
    if (pathname === '/api/reset-data' && method === 'POST') {
        return (async function() {
            const authError = await verifyAuth(env, request);
            if (authError) return authError;
            await env.BLOG_KV.put('post:index', JSON.stringify([]));
            await env.BLOG_KV.put('tags:index', JSON.stringify({ tags: [] }));
            return jsonResponse({ message: '所有数据已清空' });
        })();
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
