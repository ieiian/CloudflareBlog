// GET /api/stats - 博客统计信息
export async function onRequestGet(context) {
    const { env } = context;

    try {
        // 获取文章列表索引
        const indexData = await env.BLOG_KV.get('post:index', { type: 'json' });
        const posts = indexData || [];

        // 计算统计信息
        const totalPosts = posts.length;
        const lastUpdate = posts.length > 0
            ? posts.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
            : null;

        // 计算运行天数（从第一篇文章或固定日期开始）
        const startDate = posts.length > 0
            ? posts.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date
            : '2026-01-01';
        const uptime = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

        return new Response(JSON.stringify({
            totalPosts,
            lastUpdate: lastUpdate || new Date().toISOString().split('T')[0],
            uptime: Math.max(1, uptime)
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
