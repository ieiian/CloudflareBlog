// POST /api/post - 创建或更新文章（需要认证）
export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        // 认证检查
        const authError = await verifyAuth(env, request);
        if (authError) return authError;

        const data = await request.json();
        const { slug, title, tags, content } = data;

        if (!slug || !title || !content) {
            return new Response(JSON.stringify({ error: 'slug、标题和内容不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const date = new Date().toISOString().split('T')[0];
        const contentLength = new Blob([content]).size;
        const size = (contentLength / 1024).toFixed(1) + ' KB';
        const readTime = Math.max(1, Math.ceil(content.length / 500));

        // 简易 Markdown 转 HTML（服务端渲染）
        const htmlContent = markdownToHtml(content);

        // 存储完整文章内容
        const postData = {
            slug,
            title,
            tags: tags || [],
            content,
            htmlContent,
            date,
            readTime,
            size,
            contentLength
        };

        await env.BLOG_KV.put(`post:${slug}`, JSON.stringify(postData));

        // 更新索引
        const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
        const existingIdx = indexData.findIndex(p => p.slug === slug);
        const indexEntry = { slug, title, tags: tags || [], date, size, contentLength };

        if (existingIdx >= 0) {
            // 保留原始创建日期
            indexEntry.date = indexData[existingIdx].date || date;
            indexData[existingIdx] = indexEntry;
        } else {
            indexData.push(indexEntry);
        }

        await env.BLOG_KV.put('post:index', JSON.stringify(indexData));

        // 更新标签索引
        await updateTagIndex(env, indexData);

        return new Response(JSON.stringify({
            message: '文章保存成功',
            slug
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function updateTagIndex(env, posts) {
    const tagMap = {};
    posts.forEach(post => {
        (post.tags || []).forEach(tag => {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
    });

    const tags = Object.entries(tagMap).map(([name, count]) => ({ name, count }));
    tags.sort((a, b) => b.count - a.count);

    await env.BLOG_KV.put('tags:index', JSON.stringify({ tags }));
}

function markdownToHtml(md) {
    let html = md
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
            `<pre><code>${escapeHtml(code.trim())}</code></pre>`)
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
        return new Response(JSON.stringify({ error: '未登录，请先登录', needAuth: true }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const token = authHeader.substring(7);
    const session = await env.BLOG_KV.get(`session:${token}`, { type: 'json' });
    if (!session) {
        return new Response(JSON.stringify({ error: '登录已过期，请重新登录', needAuth: true }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return null;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, String.fromCharCode(38) + 'amp;')
        .replace(/</g, String.fromCharCode(38) + 'lt;')
        .replace(/>/g, String.fromCharCode(38) + 'gt;')
        .replace(/"/g, String.fromCharCode(38) + 'quot;')
        .replace(/'/g, String.fromCharCode(38) + '#039;');
}
