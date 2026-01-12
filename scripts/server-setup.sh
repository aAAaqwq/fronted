#!/bin/bash
# 前端服务器端初始化脚本
# 在服务器上运行此脚本来准备前端部署环境

set -e

echo "=== 前端服务部署准备 ==="

# 创建目录
echo "创建 /srv/frontend 目录..."
mkdir -p /srv/frontend
cd /srv/frontend

# 创建 docker-compose.prod.yml
echo "创建 docker-compose.prod.yml..."
cat > docker-compose.prod.yml << 'EOF'
name: sensor_frontend

services:
  frontend:
    container_name: frontend
    image: aaqwqaa/sensor_frontend:latest
    ports:
      - "3000:80"
    restart: unless-stopped
    networks: [sensor_frontend_network]

networks:
  sensor_frontend_network:
    driver: bridge
EOF

echo "✅ 准备完成！"
echo ""
echo "现在推送到 GitHub main 分支后，服务器会自动部署前端服务到端口 3000"
