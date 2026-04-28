// POST /api/auth/logout - 退出登录
export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            await env.BLOG_KV.delete(`session:${token}`);
        }

        return new Response(JSON.stringify({ message: '已退出登录' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}