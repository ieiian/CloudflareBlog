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
            '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>')
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

    posts.sort(function(a, b) {
        var ta = b.createdAt || b.date;
        var tb = a.createdAt || a.date;
        return new Date(ta) - new Date(tb);
    });

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
        var nextId = nextIdRaw ? parseInt(nextIdRaw) : 10001;
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
