#!/bin/bash
# ========================================
# Cloudflare Pages 部署打包脚本
# ========================================
# 生成的 zip 文件包含正确的目录结构：
#   - public/     → 静态文件（build output directory 设为 public）
#   - functions/  → API 函数
#   - wrangler.toml 不包含在内
#
# 使用方法：
#   bash scripts/build-zip.sh
#
# 然后在 Cloudflare Dashboard 中：
#   1. 创建 Pages 项目，选择 "Direct Upload"
#   2. 上传生成的 deploy.zip
#   3. Build command: 留空
#   4. Build output directory: public
#   5. 在 Settings → Bindings 中添加 KV:
#      Variable name: BLOG_KV
#      选择你的 KV namespace
# ========================================

set -e
cd "$(dirname "$0")/.."

echo "📦 正在打包部署文件..."

# 删除旧的 zip
rm -f deploy.zip

# 创建正确结构的 zip
# zip 中包含 public/ 和 functions/ 目录
zip -r deploy.zip public/ functions/ -x "*.DS_Store" "*.map"

echo ""
echo "✅ 打包完成: deploy.zip"
echo ""
echo "📋 部署步骤："
echo "   1. 前往 Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets"
echo "   2. 上传 deploy.zip"
echo "   3. Framework preset: None"
echo "   4. Build command: (留空)"
echo "   5. Build output directory: public"
echo "   6. 部署后，进入 Settings → Bindings → Add"
echo "      - Variable name: BLOG_KV"
echo "      - KV namespace: 选择你创建的 KV namespace"
echo "   7. (可选) Settings → Environment variables 添加:"
echo "      - ADMIN_USER = 你的用户名"
echo "      - ADMIN_PASS = 你的密码"
echo ""
ls -lh deploy.zip