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
async function handleAPI(request, env, pathname) {
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

    // 文件下载 /download/* → 代理到本地静态文件服务器（监听 8789）
    var downloadMatch = pathname.match(/^\/download\/(.+)$/);
    if (downloadMatch && method === 'GET') {
        var filePath = downloadMatch[1].split('?')[0].split('#')[0];
        if (!/^[a-zA-Z0-9._-]+$/.test(filePath)) {
            return jsonResponse({ error: '文件名包含非法字符' }, 400);
        }
        try {
            var upstreamRes = await fetch('http://127.0.0.1:8789/' + filePath);
            if (!upstreamRes.ok && upstreamRes.status === 404) {
                return jsonResponse({ error: '文件不存在' }, 404);
            }
            return new Response(upstreamRes.body, {
                status: upstreamRes.status,
                headers: {
                    'Content-Type': upstreamRes.headers.get('Content-Type') || 'application/octet-stream',
                    'Cache-Control': 'public, max-age=86400',
                }
            });
        } catch (e) {
            return jsonResponse({ error: '文件服务不可用' }, 502);
        }
    }

    return jsonResponse({ error: 'API 路由不存在' }, 404);
}