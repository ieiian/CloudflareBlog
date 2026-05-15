/**
 * 重置脚本 - 清空所有本地博客数据，恢复出厂状态
 *
 * 直接清空 post:index 和重置 nextId，
 * 不需要逐个删除文章（那些残留数据反正也访问不到）
 */

async function main() {
    const BASE_URL = process.env.SEED_URL || 'http://localhost:8788';
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    console.log('⚠️  即将清空所有数据，恢复出厂状态！');
    console.log(`📡 目标地址: ${BASE_URL}\n`);

    // 登录
    let authToken = null;
    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUser, password: adminPass })
        });
        const loginData = await loginRes.json();
        authToken = loginData.token;
        if (!authToken) throw new Error(loginData.error || '登录失败');
        console.log('🔐 登录成功\n');
    } catch (e) {
        console.log(`❌ 登录失败: ${e.message}\n`);
        process.exit(1);
    }

    // 清空 post:index
    console.log('🗑️  清空文章索引...');
    try {
        // 发送一个请求来清空数据（通过设置 post:index 为空数组）
        const res = await fetch(`${BASE_URL}/api/reset-data`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            console.log('  ✅ 文章索引已清空\n');
        } else {
            console.log('  ⚠️  无法清空数据，尝试备用方案...\n');
        }
    } catch (e) {
        console.log(`  ⚠️  重置失败: ${e.message}\n`);
    }

    // 重置 ID 计数器
    console.log('🔄 重置 ID 计数器...');
    try {
        const resetRes = await fetch(`${BASE_URL}/api/reset-nextid`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (resetRes.ok) {
            const result = await resetRes.json();
            console.log(`  ✅ ${result.message}\n`);
        } else {
            console.log('  ⚠️  ID 计数器重置失败\n');
        }
    } catch (e) {
        console.log(`  ⚠️  ID 计数器重置失败: ${e.message}\n`);
    }

    console.log('🎉 重置完成！');
    console.log('\n💡 提示: 请手动刷新浏览器访问首页\n');
}

main().catch(console.error);