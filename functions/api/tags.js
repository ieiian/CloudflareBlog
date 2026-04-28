// GET /api/tags - 获取所有标签
export async function onRequestGet(context) {
    const { env } = context;

    try {
        const tagsData = await env.BLOG_KV.get('tags:index', { type: 'json' });

        return new Response(JSON.stringify(tagsData || { tags: [] }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
