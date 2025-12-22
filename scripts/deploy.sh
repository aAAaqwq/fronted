#!/bin/bash

# 传感器管理系统部署脚本
# 使用方法: ./deploy.sh [环境] [版本]
# 示例: ./deploy.sh production v1.0.0

set -e

# 配置
ENVIRONMENT=${1:-development}
VERSION=${2:-latest}
PROJECT_NAME="sensor-management"
BUILD_DIR="dist"
BACKUP_DIR="backup"

echo "🚀 开始部署传感器管理系统"
echo "📋 环境: $ENVIRONMENT"
echo "📋 版本: $VERSION"
echo "📋 时间: $(date)"

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 16.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm 版本: $NPM_VERSION"

# 安装依赖
echo "📦 安装依赖..."
npm ci --production=false

# 环境配置
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔧 配置生产环境..."
    if [ ! -f ".env.production" ]; then
        echo "⚠️  .env.production 文件不存在，使用默认配置"
        cp .env.example .env.production
    fi
    cp .env.production .env
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "🔧 配置测试环境..."
    if [ ! -f ".env.staging" ]; then
        echo "⚠️  .env.staging 文件不存在，使用默认配置"
        cp .env.example .env.staging
    fi
    cp .env.staging .env
else
    echo "🔧 配置开发环境..."
    if [ ! -f ".env" ]; then
        cp .env.example .env
    fi
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建结果
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ 构建失败，$BUILD_DIR 目录不存在"
    exit 1
fi

echo "✅ 构建完成"
echo "📊 构建统计:"
du -sh $BUILD_DIR
find $BUILD_DIR -name "*.js" -o -name "*.css" -o -name "*.html" | wc -l | xargs echo "文件数量:"

# 备份旧版本（生产环境）
if [ "$ENVIRONMENT" = "production" ] && [ -d "/var/www/$PROJECT_NAME" ]; then
    echo "💾 备份旧版本..."
    mkdir -p $BACKUP_DIR
    BACKUP_NAME="$PROJECT_NAME-$(date +%Y%m%d-%H%M%S)"
    cp -r /var/www/$PROJECT_NAME $BACKUP_DIR/$BACKUP_NAME
    echo "✅ 备份完成: $BACKUP_DIR/$BACKUP_NAME"
fi

# 部署文件
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 部署到生产环境..."
    sudo mkdir -p /var/www/$PROJECT_NAME
    sudo cp -r $BUILD_DIR/* /var/www/$PROJECT_NAME/
    sudo chown -R www-data:www-data /var/www/$PROJECT_NAME
    sudo chmod -R 755 /var/www/$PROJECT_NAME
    echo "✅ 部署完成"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "🚀 部署到测试环境..."
    mkdir -p ../staging
    cp -r $BUILD_DIR/* ../staging/
    echo "✅ 部署完成"
else
    echo "🚀 开发环境构建完成，使用 npm run preview 预览"
fi

# 健康检查
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔍 执行健康检查..."
    sleep 2
    if curl -f -s http://localhost > /dev/null; then
        echo "✅ 健康检查通过"
    else
        echo "⚠️  健康检查失败，请检查服务状态"
    fi
fi

# 清理
echo "🧹 清理临时文件..."
rm -rf node_modules/.cache

echo "🎉 部署完成！"
echo "📋 部署信息:"
echo "   环境: $ENVIRONMENT"
echo "   版本: $VERSION"
echo "   时间: $(date)"
echo "   构建大小: $(du -sh $BUILD_DIR | cut -f1)"

if [ "$ENVIRONMENT" = "development" ]; then
    echo ""
    echo "💡 开发环境命令:"
    echo "   启动开发服务器: npm run dev"
    echo "   预览构建结果: npm run preview"
fi
