# 前后端分离部署指南

## 快速开始

### 本地开发环境

#### 1. 后端启动

```bash
cd backend
npm install
cp .env.example .env

# 编辑 .env 文件并填入 GitHub OAuth 凭证
# GITHUB_CLIENT_ID=xxx
# GITHUB_CLIENT_SECRET=xxx

npm run dev
# 后端运行在 http://localhost:3000
```

#### 2. 前端启动

使用任何静态服务器或开发服务器：

```bash
# 方式1：使用 Python
cd frontend
python -m http.server 5173

# 方式2：使用 Node.js http-server
npx http-server frontend -p 5173

# 方式3：使用 Live Server (VS Code 扩展)
# 在 VS Code 中打开 frontend/index.html，右键选择 "Open with Live Server"
```

前端运行在 `http://localhost:5173`

### 环境变量配置

后端 `.env` 文件需要配置：

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# 服务器
PORT=3000
NODE_ENV=development

# 前端地址
FRONTEND_URL=http://localhost:5173

# 会话密钥（开发环境可用默认值）
SESSION_SECRET=dev-secret-key-change-in-production

# 数据库（可选）
DB_PATH=./data/yanyu_tools.db
```

## 部署方案

### 方案1：Railway (后端) + Vercel (前端)

这是**最推荐**的方案，后端部署在 Railway (支持 SQLite 持久化)，前端部署在 Vercel (全球加速)。

#### 1. 后端部署 (Railway)

1. **项目入口**: 根目录下的 `railway.json` 已配置好，指向 `backend/server.js`。
2. **环境变量**: 在 Railway 控制面板设置：
   - `GITHUB_CLIENT_ID`: 你的 GitHub Client ID
   - `GITHUB_CLIENT_SECRET`: 你的 GitHub Client Secret
   - `FRONTEND_URL`: 你的 Vercel 前端域名 (例如 `https://yanyu-tools.vercel.app`)
   - `SESSION_SECRET`: 一个随机长字符串
   - `NODE_ENV`: `production`

#### 2. 前端部署 (Vercel)

1. **项目出口**: `frontend/vercel.json` 已配置好，处理单页应用路由。
2. **根目录设置**: 在 Vercel 导入项目时，将 `Root Directory` 设置为 `frontend`。
3. **域名解析**: 部署完成后，记得将生成的 `https://...vercel.app` 填入后端的 `FRONTEND_URL` 变量中。

### 方案2：Render (全栈直出)

如果你想用一个平台搞定一切：

1. **创建 Web Service**: 链接 GitHub 仓库。
2. **Root Directory**: 设置为空（根目录）。
3. **Build Command**: `cd backend && npm install`
4. **Start Command**: `node backend/server.js`
5. **Disk (重要)**: 由于 Render 的文件系统是临时的，你需要添加一个 **Disk** 挂载到 `/app/backend/data`，否则重启后 SQLite 数据库会丢失。

---

## 🛠️ 关于配置文件

为了简化部署，我已经为你创建了以下文件：

- **`railway.json`**: 指导 Railway 如何构建和启动后端，并包含健康检查。
- **`frontend/vercel.json`**: 处理前端的边缘路由和 CORS 代理。

> **提示**: 部署完成后，请第一时间访问 `/api/health` 确认后端是否存活。

### 方案3：Docker 容器化部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装后端依赖
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

WORKDIR /app

# 复制前端静态文件
COPY frontend/ ./frontend/

# 复制后端源码
COPY backend/ ./backend/

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

然后在任何支持 Docker 的平台部署（如 Render、Railway、AWS、Google Cloud 等）

## 故障排查

### 问题1：GitHub OAuth 回调失败

**症状**：登录后无法返回应用

**解决**：
- 检查 GitHub OAuth App 的 Callback URL 是否正确
- 确认环境变量中的 `GITHUB_CALLBACK_URL` 与设置一致
- 检查 CORS 配置

### 问题2：前端无法连接后端

**症状**：API 请求失败，浏览器标签页有 CORS 错误

**解决**：
- 检查 `FRONTEND_URL` 环境变量是否正确
- 确保后端 CORS 配置包含前端地址
- 使用浏览器开发者工具查看请求详情

### 问题3：数据无法同步

**症状**：前端保存的数据未上传到服务器

**解决**：
- 确认用户已通过 GitHub 认证
- 检查后端日志中的错误信息
- 检查数据库连接是否正常

## 监控与日志

### 本地开发
```bash
# 后端日志
cd backend && npm run dev

# 前端调试
打开浏览器开发者工具 (F12)
```

### Railway
- 访问项目 Dashboard
- 查看 "Deployments" 标签页
- 点击具体 deployment 查看实时日志

### Vercel
- 访问项目 Dashboard
- 查看 "Deployments" 标签页的日志输出

## 下一步优化

1. **数据库迁移管理**
   - 使用 Knex.js 或 TypeORM 管理数据库版本
   
2. **API 文档化**
   - 集成 Swagger/OpenAPI
   
3. **性能优化**
   - 添加缓存层（Redis）
   - 数据库查询优化
   
4. **安全加固**
   - 添加速率限制
   - 实施内容安全策略 (CSP)
   - 数据加密存储
   
5. **监控告警**
   - 集成错误追踪（Sentry）
   - 应用性能监控 (APM)
