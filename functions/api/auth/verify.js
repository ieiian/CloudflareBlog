// GET /api/auth/verify - 验证令牌是否有效
export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: '未提供认证令牌', valid: false }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.substring(7);
        const session = await env.BLOG_KV.get(`session:${token}`, { type: 'json' });

        if (!session) {
            return new Response(JSON.stringify({ error: '令牌已过期或无效', valid: false }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ valid: true, username: session.username }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message, valid: false }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}