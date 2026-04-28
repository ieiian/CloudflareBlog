// POST /api/auth/login - 管理员登录
export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const data = await request.json();
        const { username, password } = data;

        // 从环境变量获取帐号密码，如果未设置则使用默认值
        const validUser = env.ADMIN_USER || 'admin';
        const validPass = env.ADMIN_PASS || 'admin123';

        if (!username || !password) {
            return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (username !== validUser || password !== validPass) {
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 生成随机会话令牌
        const token = crypto.randomUUID ? crypto.randomUUID() :
            Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(b => b.toString(16).padStart(2, '0')).join('');

        // 存储会话到 KV，24 小时过期
        await env.BLOG_KV.put(
            `session:${token}`,
            JSON.stringify({ username, createdAt: Date.now() }),
            { expirationTtl: 86400 }
        );

        return new Response(JSON.stringify({
            message: '登录成功',
            token,
            username
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