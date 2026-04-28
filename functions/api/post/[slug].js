// GET /api/post/:slug - 获取单篇文章
// DELETE /api/post/:slug - 删除文章
export async function onRequestGet(context) {
    const { env, params } = context;

    try {
        const { slug } = params;
        const postData = await env.BLOG_KV.get(`post:${slug}`, { type: 'json' });

        if (!postData) {
            return new Response(JSON.stringify({ error: '文章不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(postData), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    const { env, params, request } = context;

    try {
        // 认证检查
        const authError = await verifyAuth(env, request);
        if (authError) return authError;

        const { slug } = params;

        // 检查文章是否存在
        const postData = await env.BLOG_KV.get(`post:${slug}`, { type: 'json' });
        if (!postData) {
            return new Response(JSON.stringify({ error: '文章不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 删除文章
        await env.BLOG_KV.delete(`post:${slug}`);

        // 更新索引
        const indexData = await env.BLOG_KV.get('post:index', { type: 'json' }) || [];
        const newIndex = indexData.filter(p => p.slug !== slug);
        await env.BLOG_KV.put('post:index', JSON.stringify(newIndex));

        // 更新标签索引
        const tagMap = {};
        newIndex.forEach(post => {
            (post.tags || []).forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        });
        const tags = Object.entries(tagMap).map(([name, count]) => ({ name, count }));
        tags.sort((a, b) => b.count - a.count);
        await env.BLOG_KV.put('tags:index', JSON.stringify({ tags }));

        return new Response(JSON.stringify({
            message: '文章已删除',
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
