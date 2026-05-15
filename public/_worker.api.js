// ============================================================
// Terminal Blog - API handlers (ID-only, no slug)
// Data is stored in MySQL through env.DB.
// ============================================================

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

function buildPostData(data, existingPost) {
    const content = data.content;
    const contentLength = new Blob([content]).size;
    return {
        title: data.title,
        tags: data.tags || [],
        content,
        htmlContent: markdownToHtml(content),
        date: data.date || (existingPost && existingPost.date ? existingPost.date : new Date().toISOString().split('T')[0]),
        readTime: Math.max(1, Math.ceil(content.length / 500)),
        size: (contentLength / 1024).toFixed(1) + ' KB',
        contentLength,
        hidden: existingPost ? !!existingPost.hidden : true,
        locked: existingPost ? !!existingPost.locked : false,
        lockPassword: existingPost ? (existingPost.lockPassword || '') : ''
    };
}

async function verifyAuth(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return jsonResponse({ error: '未登录，请先登录', needAuth: true }, 401);
    }
    const token = authHeader.substring(7);
    const session = await env.DB.getSession(token);
    if (!session) {
        return jsonResponse({ error: '登录已过期，请重新登录', needAuth: true }, 401);
    }
    return null;
}

async function handleStats(env) {
    return jsonResponse(await env.DB.getStats());
}

async function handlePostsList(env, url) {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const tag = url.searchParams.get('tag') || '';
    const admin = url.searchParams.get('admin') === 'true';
    return jsonResponse(await env.DB.listPosts({ page, limit, tag, admin }));
}

async function handleTags(env) {
    return jsonResponse({ tags: await env.DB.listTags() });
}

async function handlePostGet(env, request, id) {
    const postData = await env.DB.getPost(parseInt(id));
    if (!postData) return jsonResponse({ error: '文章不存在' }, 404);

    const authHeader = request.headers ? request.headers.get('Authorization') : null;
    let validToken = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        validToken = !!(await env.DB.getSession(authHeader.substring(7)));
    }

    if (postData.locked && !validToken) {
        const unlockHeader = request.headers ? request.headers.get('X-Unlock-Password') : null;
        if (unlockHeader && unlockHeader === postData.lockPassword) return jsonResponse(postData);
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
    const result = await env.DB.toggleVisibility(parseInt(id));
    if (!result) return jsonResponse({ error: '文章不存在' }, 404);
    return jsonResponse(result);
}

async function handlePostLock(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const data = await request.json();
    const password = data.password || '';
    if (!password) return jsonResponse({ error: '请输入解锁密码' }, 400);
    const ok = await env.DB.setPostLock(parseInt(id), true, password);
    if (!ok) return jsonResponse({ error: '文章不存在' }, 404);
    return jsonResponse({ message: '文章已上锁', id: parseInt(id), locked: true });
}

async function handlePostUnlock(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const ok = await env.DB.setPostLock(parseInt(id), false, '');
    if (!ok) return jsonResponse({ error: '文章不存在' }, 404);
    return jsonResponse({ message: '文章已解锁', id: parseInt(id), locked: false });
}

async function handlePostVerifyLockPassword(env, request, id) {
    const postData = await env.DB.getPost(parseInt(id));
    if (!postData) return jsonResponse({ error: '文章不存在' }, 404);
    if (!postData.locked) return jsonResponse({ valid: true });
    const data = await request.json();
    if ((data.password || '') === postData.lockPassword) return jsonResponse({ valid: true });
    return jsonResponse({ valid: false, error: '密码错误' }, 401);
}

async function handlePostCreate(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const data = await request.json();
    if (!data.title || !data.content) return jsonResponse({ error: '标题和内容不能为空' }, 400);
    const postId = await env.DB.createPost(buildPostData(data));
    return jsonResponse({ message: '文章保存成功', id: postId });
}

async function handlePostDelete(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const ok = await env.DB.deletePost(parseInt(id));
    if (!ok) return jsonResponse({ error: '文章不存在' }, 404);
    return jsonResponse({ message: '文章已删除', id: parseInt(id) });
}

async function handlePostUpdate(env, request, id) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const existingPost = await env.DB.getPost(parseInt(id));
    if (!existingPost) return jsonResponse({ error: '文章不存在' }, 404);
    const data = await request.json();
    if (!data.title || !data.content) return jsonResponse({ error: '标题和内容不能为空' }, 400);
    await env.DB.updatePost(parseInt(id), buildPostData(data, existingPost));
    return jsonResponse({ message: '文章已更新', id: parseInt(id) });
}

async function handleLogin(env, request) {
    const data = await request.json();
    const username = data.username;
    const password = data.password;
    const validUser = env.ADMIN_USER || 'admin';
    const validPass = env.ADMIN_PASS || 'admin123';

    if (!username || !password) return jsonResponse({ error: '用户名和密码不能为空' }, 400);
    if (username !== validUser || password !== validPass) return jsonResponse({ error: '用户名或密码错误' }, 401);

    const token = crypto.randomUUID
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    await env.DB.createSession(token, username, 86400);
    return jsonResponse({ message: '登录成功', token: token, username: username });
}

async function handleLogout(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) await env.DB.deleteSession(authHeader.substring(7));
    return jsonResponse({ message: '已退出登录' });
}

async function handleVerify(env, request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonResponse({ error: '未提供认证令牌', valid: false }, 401);
    const session = await env.DB.getSession(authHeader.substring(7));
    if (!session) return jsonResponse({ error: '令牌已过期或无效', valid: false }, 401);
    return jsonResponse({ valid: true, username: session.username });
}

async function handleExport(env, request) {
    const authError = await verifyAuth(env, request);
    if (authError) return authError;
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        posts: await env.DB.exportPosts()
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
    try { data = await request.json(); } catch (e) { return jsonResponse({ error: '无效的 JSON 数据' }, 400); }
    if (!data.posts || !Array.isArray(data.posts)) return jsonResponse({ error: '数据格式错误，需要 posts 数组' }, 400);

    var imported = 0, skipped = 0, failed = 0;
    for (var i = 0; i < data.posts.length; i++) {
        var post = data.posts[i];
        if (!post.title || !post.content) { failed++; continue; }
        try {
            await env.DB.createPost(buildPostData({
                title: post.title,
                tags: post.tags || [],
                content: post.content,
                date: post.date
            }, { hidden: !!post.hidden, locked: false, lockPassword: '' }));
            imported++;
        } catch (e) {
            failed++;
        }
    }
    return jsonResponse({ message: '导入完成', imported, skipped, failed, total: data.posts.length });
}

function handleAPI(request, env, pathname) {
    const url = new URL(request.url);
    const method = request.method;

    if (pathname === '/api/auth/login' && method === 'POST') return handleLogin(env, request);
    if (pathname === '/api/auth/logout' && method === 'POST') return handleLogout(env, request);
    if (pathname === '/api/auth/verify' && method === 'GET') return handleVerify(env, request);
    if (pathname === '/api/stats' && method === 'GET') return handleStats(env);
    if (pathname === '/api/posts' && method === 'GET') return handlePostsList(env, url);
    if (pathname === '/api/tags' && method === 'GET') return handleTags(env);
    if (pathname === '/api/post' && method === 'POST') return handlePostCreate(env, request);

    var postMatch = pathname.match(/^\/api\/post\/(\d+)$/);
    if (postMatch) {
        var id = postMatch[1];
        if (method === 'GET') return handlePostGet(env, request, id);
        if (method === 'PUT') return handlePostUpdate(env, request, id);
        if (method === 'DELETE') return handlePostDelete(env, request, id);
    }

    var toggleMatch = pathname.match(/^\/api\/post\/(\d+)\/toggle$/);
    if (toggleMatch && method === 'POST') return handleToggleVisibility(env, request, toggleMatch[1]);

    var lockMatch = pathname.match(/^\/api\/post\/(\d+)\/lock$/);
    if (lockMatch && method === 'POST') return handlePostLock(env, request, lockMatch[1]);

    var unlockMatch = pathname.match(/^\/api\/post\/(\d+)\/unlock$/);
    if (unlockMatch && method === 'POST') return handlePostUnlock(env, request, unlockMatch[1]);

    var verifyLockMatch = pathname.match(/^\/api\/post\/(\d+)\/verify-lock$/);
    if (verifyLockMatch && method === 'POST') return handlePostVerifyLockPassword(env, request, verifyLockMatch[1]);

    if (pathname === '/api/export' && method === 'GET') return handleExport(env, request);
    if (pathname === '/api/import' && method === 'POST') return handleImport(env, request);

    if (pathname === '/api/reset-nextid' && method === 'POST') {
        return (async function() {
            const authError = await verifyAuth(env, request);
            if (authError) return authError;
            await env.DB.resetAutoIncrement();
            return jsonResponse({ message: 'ID 计数器已重置为 10001' });
        })();
    }

    if (pathname === '/api/reset-data' && method === 'POST') {
        return (async function() {
            const authError = await verifyAuth(env, request);
            if (authError) return authError;
            await env.DB.resetData();
            return jsonResponse({ message: '所有数据已清空' });
        })();
    }

    return jsonResponse({ error: 'API 路由不存在' }, 404);
}
