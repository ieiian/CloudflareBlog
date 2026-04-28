// GET /api/posts - 文章列表（支持分页和标签过滤）
export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const tag = url.searchParams.get('tag') || '';

        // 获取文章列表索引
        const indexData = await env.BLOG_KV.get('post:index', { type: 'json' });
        let posts = indexData || [];

        // 按标签过滤
        if (tag) {
            posts = posts.filter(p => p.tags && p.tags.includes(tag));
        }

        // 按日期降序排序
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 分页
        const totalPosts = posts.length;
        const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
        const start = (page - 1) * limit;
        const paginatedPosts = posts.slice(start, start + limit).map(p => ({
            slug: p.slug,
            title: p.title,
            date: p.date,
            size: p.size || `${(p.contentLength || 0 / 1024).toFixed(1)} KB`,
            tags: p.tags || []
        }));

        return new Response(JSON.stringify({
            posts: paginatedPosts,
            page,
            totalPages,
            totalPosts
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
