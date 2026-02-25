# 烟雨江湖装备录入工具 - 后端服务

## 项目结构

```
backend/
├── server.js                # 主服务器文件
├── package.json            # 项目依赖
├── .env.example            # 环境变量示例
├── config/
│   ├── oauth.js            # OAuth 配置
│   └── database.js         # 数据库初始化
├── models/
│   └── user.js             # 用户模型
├── routes/
│   ├── auth.js             # 认证路由 (OAuth/登录/登出)
│   └── equipment.js        # 装备数据 CRUD 路由
└── data/
    └── yanyu_tools.db      # SQLite 数据库（自动创建）
```

## 快速开始

### 1. 创建 GitHub OAuth App

访问 [GitHub Developer Settings](https://github.com/settings/developers)：
- 点击 "New OAuth App"
- **Application name**: 烟雨江湖装备录入工具
- **Homepage URL**: `http://localhost:3000`
- **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
- 复制 `Client ID` 和 `Client Secret`

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_secret_key
PORT=3000
NODE_ENV=development
```

### 3. 安装依赖

```bash
cd backend
npm install
```

### 4. 开发模式

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. 生产部署

```bash
npm start
```

## API 端点

### 认证

- `GET /api/auth/github` - 启动 GitHub OAuth 登录
- `GET /api/auth/github/callback` - OAuth 回调（由 GitHub 自动调用）
- `GET /api/auth/user` - 获取当前用户信息
- `POST /api/auth/logout` - 退出登录
- `POST /api/auth/verify-token` - 验证令牌有效性

### 装备数据

- `POST /api/equipment/records` - 创建装备记录
- `GET /api/equipment/records` - 获取用户的所有装备记录
- `PUT /api/equipment/records/:id` - 更新装备记录
- `DELETE /api/equipment/records/:id` - 删除装备记录
- `GET /api/equipment/export` - 导出用户数据

## 数据库设计

### users 表
- `id` - 主键
- `github_id` - GitHub 用户 ID
- `username` - GitHub 用户名
- `email` - 邮箱
- `avatar_url` - 头像链接
- `created_at` - 创建时间
- `updated_at` - 更新时间

### equipment_records 表
- `id` - 主键 (UUID)
- `user_id` - 用户 ID (外键)
- `equipment_type` - 装备类型（武器/防具/饰品）
- `location` - 地点（剑王阁/塞北等）
- `equipment_name` - 装备名称
- `quality` - 品质（green/blue/purple）
- `attributes` - 属性数组 (JSON)
- `special_attr` - 特殊属性
- `is_favorite` - 是否收藏
- `created_at` - 创建时间
- `updated_at` - 更新时间

## 部署到 Railway

详见 [Railway 部署指南](./DEPLOYMENT.md)

## 部署到 Render

详见 [Render 部署指南](./DEPLOYMENT.md)
