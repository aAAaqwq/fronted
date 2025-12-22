# 传感器管理系统 - 企业级前端应用

## 项目简介

这是一个基于 React + Vite 构建的企业级传感器设备管理系统前端应用，提供完整的设备管理、数据采集、告警监控、日志管理和用户权限管理功能。

### 核心功能

- **仪表盘** - 实时设备状态监控、数据趋势分析、告警概览
- **设备管理** - 设备CRUD、状态管理、用户绑定、型号版本管理
- **数据管理** - 时序数据查询与可视化、文件上传下载、数据统计
- **告警管理** - 告警查看、状态更新、类型筛选
- **日志管理** - 系统日志查询、多维度搜索、日志上传
- **用户管理** - 用户CRUD、角色权限、设备绑定关系
- **数据上传** - 支持时序数据、图像、视频、音频等多种格式上传
- **个人中心** - 用户信息管理、密码修改

## 技术栈

### 核心框架
- **React 18.2** - 前端框架
- **Vite 5.0** - 构建工具
- **React Router 6.20** - 路由管理

### UI & 样式
- **TailwindCSS 3.3** - 原子化CSS框架
- **Lucide React** - 图标库
- **Recharts 2.10** - 数据可视化

### 网络请求
- **Axios 1.6** - HTTP客户端
- 支持大数字ID（BigInt）自动转换
- 统一错误处理和Token管理

### 工具库
- **date-fns 2.30** - 日期处理

## 项目结构

```
sensor-management/
├── src/
│   ├── api/                    # API接口定义
│   │   └── index.js           # 统一API管理，包含BigInt处理
│   ├── components/            # 组件
│   │   ├── common/           # 通用组件
│   │   │   ├── Button.jsx    # 按钮组件
│   │   │   ├── Card.jsx      # 卡片组件
│   │   │   ├── Input.jsx     # 输入框组件
│   │   │   ├── Modal.jsx     # 模态框组件
│   │   │   ├── Select.jsx    # 下拉选择组件
│   │   │   ├── Table.jsx     # 表格组件
│   │   │   └── Toast.jsx     # 消息提示组件
│   │   └── Layout.jsx        # 布局组件
│   ├── context/              # 上下文
│   │   └── AuthContext.jsx   # 认证上下文
│   ├── pages/                # 页面
│   │   ├── Dashboard.jsx     # 仪表盘
│   │   ├── Devices.jsx       # 设备管理
│   │   ├── Data.jsx          # 数据管理
│   │   ├── DataUpload.jsx    # 数据上传
│   │   ├── Warnings.jsx      # 告警管理
│   │   ├── Logs.jsx          # 日志管理
│   │   ├── Users.jsx         # 用户管理
│   │   ├── Profile.jsx       # 个人中心
│   │   └── Login.jsx         # 登录页
│   ├── App.jsx               # 应用入口
│   └── main.jsx              # 主入口
├── public/                    # 静态资源
├── .env                       # 环境变量
├── .env.example              # 环境变量示例
├── vite.config.js            # Vite配置
├── tailwind.config.js        # TailwindCSS配置
├── package.json              # 依赖配置
└── Readme.md                 # 项目文档

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并根据实际情况修改：

```bash
cp .env.example .env
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

构建产物位于 `dist/` 目录

### 预览生产构建

```bash
npm run preview
# 或
yarn preview
```

## API对接说明

### 后端API地址

- **开发环境**: 通过Vite代理 `/api` -> `http://120.46.56.244:12000`
- **生产环境**: 需要配置 `VITE_API_BASE_URL` 环境变量

### 认证机制

- 使用 JWT Bearer Token 认证
- Token存储在 localStorage
- 自动在请求头添加 `Authorization: Bearer <token>`
- Token过期自动跳转登录页

### 大数字ID处理

系统自动处理JavaScript中的大数字精度问题：

- **响应数据**: 自动将超过15位的数字ID转为字符串
- **请求数据**: 自动将字符串ID转回数字发送给后端
- 支持字段: `dev_id`, `uid`, `alert_id`, `log_id`, `data_id`

### API接口列表

#### 用户相关
- `POST /api/v1/users/register` - 用户注册
- `POST /api/v1/users/login` - 用户登录
- `PUT /api/v1/users/password` - 修改密码
- `GET /api/v1/users/all` - 获取用户列表（管理员）
- `GET /api/v1/users` - 获取用户信息
- `PUT /api/v1/users` - 更新用户信息
- `DELETE /api/v1/users` - 删除用户
- `GET /api/v1/users/bind_devices` - 获取用户绑定设备

#### 设备相关
- `POST /api/v1/devices` - 创建设备
- `GET /api/v1/devices` - 获取设备列表
- `PUT /api/v1/devices` - 更新设备信息
- `PUT /api/v1/devices/status` - 更新设备状态（管理员）
- `DELETE /api/v1/devices` - 删除设备
- `POST /api/v1/devices/bind_user` - 绑定用户
- `DELETE /api/v1/devices/unbind_user` - 解绑用户
- `GET /api/v1/devices/bind_users` - 获取设备绑定用户
- `GET /api/v1/devices/statistics` - 获取设备统计

#### 告警相关
- `POST /api/v1/warning_info` - 创建告警
- `GET /api/v1/warning_info` - 获取告警列表
- `PUT /api/v1/warning_info` - 更新告警状态
- `DELETE /api/v1/warning_info` - 删除告警

#### 日志相关
- `POST /api/v1/logs` - 创建日志
- `GET /api/v1/logs` - 获取日志列表（管理员）
- `DELETE /api/v1/logs` - 删除日志

#### 数据相关
- `POST /api/v1/device/data` - 上传时序数据
- `POST /api/v1/device/data/timeseries` - 查询时序数据
- `DELETE /api/v1/device/data/timeseries` - 删除时序数据
- `GET /api/v1/device/data/statistic` - 获取数据统计
- `GET /api/v1/device/data/file/list` - 获取文件列表
- `POST /api/v1/device/data/file/presigned_url` - 获取上传预签名URL
- `GET /api/v1/device/data/file/download` - 下载文件
- `DELETE /api/v1/device/data/file` - 删除文件

## 功能特性

### 1. 设备管理

- ✅ 设备CRUD操作
- ✅ 设备状态管理（在线/离线/异常）
- ✅ 设备型号、版本信息
- ✅ 设备与用户绑定关系
- ✅ 设备类型分类（温度、湿度、压力、心电、肌电、图像等）
- ✅ 设备搜索与筛选
- ✅ 管理员可修改设备状态

### 2. 数据管理

- ✅ 时序数据查询与可视化
- ✅ 支持多种测量类型（ECG、EMG、温度等）
- ✅ 时间范围筛选
- ✅ 数据点限制
- ✅ 图表展示（折线图）
- ✅ 文件管理（图像、视频、音频）
- ✅ 文件上传下载
- ✅ MinIO对象存储集成

### 3. 告警管理

- ✅ 告警列表查看
- ✅ 告警状态管理（活跃/已解决/已忽略）
- ✅ 告警类型分类（设备告警/数据告警）
- ✅ 告警详情查看
- ✅ 告警删除

### 4. 日志管理

- ✅ 系统日志查询（仅管理员）
- ✅ 日志类型（debug/info/warning/error/critical）
- ✅ 日志级别（0-4）
- ✅ 关键词搜索（支持设备名称、型号、ID、版本、类型）
- ✅ 时间范围筛选
- ✅ 日志上传
- ✅ User Agent记录

### 5. 用户管理

- ✅ 用户CRUD操作（管理员）
- ✅ 角色权限（管理员/普通用户）
- ✅ 用户绑定设备查看
- ✅ 用户搜索与筛选
- ✅ 密码修改

### 6. 权限控制

- ✅ 基于角色的访问控制（RBAC）
- ✅ 路由级别权限保护
- ✅ 功能级别权限控制
- ✅ 管理员专属功能

## 设备状态说明

- **0** - 离线
- **1** - 在线
- **2** - 异常

## 日志类型与级别

### 类型（type）
- `debug` - 调试信息
- `info` - 一般信息
- `warning` - 警告
- `error` - 错误
- `critical` - 严重错误

### 级别（level）
- `0` - Level 0
- `1` - Level 1（info）
- `2` - Level 2（warning）
- `3` - Level 3（error）
- `4` - Level 4（critical）

## 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 开发规范

### 代码风格

- 使用 ES6+ 语法
- 组件使用函数式组件 + Hooks
- 统一使用 2 空格缩进
- 组件文件使用 PascalCase 命名

### Git提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具链相关
```

## 部署说明

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/sensor-management/dist;
    index index.html;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://120.46.56.244:12000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker部署

```dockerfile
FROM node:16-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 常见问题

### 1. 大数字ID精度丢失

系统已自动处理，无需手动干预。所有超过15位的数字ID会自动转为字符串处理。

### 2. Token过期处理

Token过期后会自动跳转到登录页，重新登录即可。

### 3. 跨域问题

开发环境使用Vite代理解决，生产环境需要后端配置CORS或使用Nginx代理。

### 4. 文件上传失败

检查MinIO配置和网络连接，确保预签名URL有效。

## 更新日志

### v1.0.0 (2025-12-21)

- ✅ 完整的设备管理功能
- ✅ 时序数据查询与可视化
- ✅ 文件上传下载
- ✅ 告警管理
- ✅ 日志管理（支持设备字段搜索）
- ✅ 用户权限管理
- ✅ 管理员设备状态修改
- ✅ 设备型号版本字段显示
- ✅ 修复设备状态显示错误

## 技术支持

如有问题，请联系开发团队或提交Issue。

## 许可证

企业内部使用，保留所有权利。
