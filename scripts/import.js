/**
 * Markdown 导入脚本 - 将 Markdown/ 目录下的 .md 文件导入到博客
 *
 * 用法:
 *   npm run import
 *   ADMIN_USER=xxx ADMIN_PASS=xxx npm run import
 *
 * 特性:
 *   - 按日期排序导入（先旧后新）
 *   - 按标题去重，已存在的文章会被跳过
 *   - 所有文章自动分配新的 ID
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { frontmatter: {}, body: content };

    const lines = match[1].split('\n');
    const frontmatter = {};

    lines.forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            let value = line.slice(colonIdx + 1).trim();

            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    value = JSON.parse(value.replace(/'/g, '"'));
                } catch (e) {
                    value = [];
                }
            }

            frontmatter[key] = value;
        }
    });

    const body = content.slice(match[0].length).trim();
    return { frontmatter, body };
}

async function main() {
    const BASE_URL = process.env.SEED_URL || 'http://localhost:8788';
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    console.log('📥 Markdown 导入脚本');
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

    // 读取 Markdown 目录
    const mdDir = path.join(__dirname, '..', 'Markdown');
    if (!fs.existsSync(mdDir)) {
        console.log(`❌ Markdown 目录不存在: ${mdDir}\n`);
        process.exit(1);
    }

    let files = fs.readdirSync(mdDir)
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const filepath = path.join(mdDir, f);
            const content = fs.readFileSync(filepath, 'utf-8');
            const { frontmatter, body } = parseFrontmatter(content);

            let date = frontmatter.date || '1970-01-01';
            if (typeof date === 'string' && date.includes('T')) {
                date = date.split('T')[0];
            }

            return {
                file: f,
                title: frontmatter.title || f.replace(/\.md$/, ''),
                tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
                date,
                content: body,
                hidden: frontmatter.hidden === true || frontmatter.hidden === 'true'
            };
        });

    // 按日期排序
    files.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`📝 找到 ${files.length} 篇文章（按日期排序）\n`);

    // 获取已有文章列表
    console.log('🔍 检查已有文章...');
    const existingRes = await fetch(`${BASE_URL}/api/posts?limit=1000&admin=true`);
    const existingData = await existingRes.json();
    const existingTitles = new Set(existingData.posts?.map(p => p.title) || []);
    console.log(`  已存在 ${existingTitles.size} 篇文章\n`);

    // 逐个导入
    let imported = 0;
    let skipped = 0;

    for (const post of files) {
        if (existingTitles.has(post.title)) {
            console.log(`  ⏭️  跳过（已存在）: ${post.title}`);
            skipped++;
            continue;
        }

        const postData = {
            title: post.title,
            tags: post.tags,
            content: post.content,
            date: post.date  // Send the date from markdown frontmatter
        };

        try {
            const res = await fetch(`${BASE_URL}/api/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(postData)
            });

            if (res.ok) {
                const result = await res.json();
                console.log(`  ✅ 导入: ${post.title} (ID: ${result.id})`);
                imported++;
                existingTitles.add(post.title);
            } else {
                const err = await res.text();
                console.log(`  ❌ 导入失败: ${post.title} - ${err}`);
            }
        } catch (e) {
            console.log(`  ❌ 导入失败: ${post.title} - ${e.message}`);
        }
    }

    console.log(`\n🎉 导入完成！`);
    console.log(`  ✅ 新增: ${imported} 篇`);
    console.log(`  ⏭️  跳过: ${skipped} 篇（已存在）\n`);
}

main().catch(console.error);