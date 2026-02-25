# 烟雨江湖装备录入工具 - 前后端分离版本

> V4.8.1 | 完全前后端分离 + GitHub OAuth 认证 + 云端数据同步

## ✨ 核心特性

- ✅ **纯前端可运行** - 不需要后端也能完整使用
- 🔐 **GitHub OAuth 认证** - 可选集成，使用 GitHub 账号登录
- ☁️ **云端数据同步** - 已登录用户数据自动保存到服务器
- 📱 **离线优先** - 完全支持离线工作，自动同步
- 🎨 **深浅主题** - 支持自适应主题切换
- 💾 **数据导出** - 支持 JSON 格式导出/导入备份
- 🚀 **免费部署** - 可完全免费部署到 Vercel/Railway/GitHub Pages
- 🔄 **自动同步** - 登录后无需手动操作，数据自动同步

## ⚡ 超快速开始（3 行代码）

如果只想纯前端使用，**不需要后端**：

```bash
cd frontend
python -m http.server 5173
# 打开 http://localhost:5173 👍 完成！
```

支持本地数据保存、导入导出。要启用云端同步，继续阅读下面的完整步骤。

---

## 🚀 完整开始（带后端）

### 前置要求

- Node.js 18+
- Git
- GitHub 账号

### 第1步：创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 创建 "New OAuth App"
3. 填写表单：
   - **Application name**: 烟雨江湖装备录入工具
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
4. 获得 `Client ID` 和 `Client Secret`

### 第2步：配置本地环境

```bash
# 新建 .env 文件
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入 GitHub OAuth 凭证：

```env
GITHUB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:5173
```

### 第3步：安装依赖

```bash
# 根目录
npm install

# 后端依赖
cd backend
npm install
```

### 第4步：启动服务

**后端**（Terminal 1）:
```bash
cd backend
npm run dev
```
输出: `🚀 Server running at http://localhost:3000`

**前端**（Terminal 2）:
│
├── 【前端】
├── frontend/              
│   ├── index.html         # 主应用
│   ├── js/                # JavaScript 模块 ⭐ 新增
│   │   ├── app-init.js    # 应用初始化入口
│   │   ├── local-storage-manager.js  # 本地存储
│   │   ├── auth-handler.js           # OAuth 认证
│   │   ├── api-client.js             # API 通信
│   │   ├── data-sync.js              # 数据同步
│   │   └── ui-manager.js             # UI 管理
│   └── INTEGRATION.md     # 集成指南 ⭐ 新增
│
├── 【后端（可选）】
├── backend/               
│   ├── server.js          # 主服务器
│   ├── config/            # 配置
│   ├── models/            # 数据模型
│   ├── routes/            # API 路由
│   ├── data/              # 数据库
│   └── README.md          # 文档
│
├── 【文档】
├── doc/                   # 设计文档
│
└── 【根目录文档】
    ├── README.md          # 本文件
    ├── QUICK-REFERENCE.md # 快速参考 ⭐ 新增
    ├── ARCHITECTURE.md    # 架构设计 ⭐ 新增
    ├── README-SETUP.md    # 设置指南
    ├── DEPLOYMENT.md      # 部署指南
    ├── MIGRATION.md       # 迁移指南
    └── package.json       # 项目配置 Node.js + Express
│   ├── server.js          # 主服务器
│   ├── config/            # 配置模块
│   ├── models/            # 数据模型
│   ├── routes/            # API 路由
│   ├── data/              # SQLite 数据库
│   └── README.md          # 后端文档
│
├── doc/                   # 文档
│
└── 📄 文档文件
    ├── README.md          # 本文件
    ├── README-SETUP.md    # 快速设置指南
    ├── DEPLOYMENT.md      # 部署指南
    └── MIGRATION.md       # 迁移指南
```

## 📚 文档

**快速开始**:
- ⚡ [快速参考卡片](./QUICK-REFERENCE.md) - 1分钟快速查阅
- 🚀 [快速设置](./README-SETUP.md) - 5分钟快速开始
- 📖 [前端集成指南](./frontend/INTEGRATION.md) - 模块化集成说明

**深入了解**:
- 🏗️ [架构设计](./ARCHITECTURE.md) - 系统架构和设计原理
- 🔄 [迁移指南](./MIGRATION.md) - 从旧版本迁移
- 📦 [后端文档](./backend/README.md) - API 和架构详情

**部署**:
- 🌐 [部署指南](./DEPLOYMENT.md) - Railway/Render/Vercel 部署

## 🌐 部署

完全免费部署方案：

### Railway (推荐)

1. 推送到 GitHub
2. 访问 [Railway.app](https://railway.app)
3. 使用 GitHub 登录
4. 部署此仓库
5. 配置环境变量
6. 自动部署完成 ✅

**成本**: $0-5/月 (通常免费)

### Vercel (仅前端) + Railway (后端)

**前端**: [vercel.com](https://vercel.com) - 完全免费
**后端**: [railway.app](https://railway.app) - $0-5/月

### 本地 Docker

```bash
docker build -t yanyu-tools .
docker run -p 3000:3000 yanyu-tools
```

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整步骤

## 🔗 API 端点

### 认证

```
GET  /api/auth/github              # 启动 OAuth 登录
GET  /api/auth/github/callback     # OAuth 回调
GET  /api/auth/user                # 获取当前用户
POST /api/auth/logout              # 退出登录
POST /api/auth/verify-token        # 验证 Token
```

### 装备数据

```
POST   /api/equipment/records      # 创建记录
GET    /api/equipment/records      # 获取所有记录
PUT    /api/equipment/records/:id  # 更新记录
DELETE /api/equipment/records/:id  # 删除记录
GET    /api/equipment/export       # 导出用户数据
```

详见 [backend/README.md](./backend/README.md) 了解完整 API 文档

## 🏗️ 架构设计

### 技术栈

**前端**:
- 原生 HTML5 / CSS3 / JavaScript
- 无第三方依赖（轻量级）
- 支持 OAuth 集成

**后端**:
- Node.js + Express
- Passport.js (GitHub OAuth)
- SQLite (数据持久化)
- CORS 支持

**部署**:
- Railway / Render (推荐)
- Vercel (仅前端)
- 自托管 Docker

### 数据架构

```
用户认证
├── GitHub OAuth 2.0
└── Session + Token

数据存储
├── 本地: localStorage (5MB, 离线)
└── 云端: SQLite (无限, 同步)

同步策略
├── 有认证: 自动上传到云端
├── 无认证: 仅使用本地缓存
└── 离线模式: 本地缓存 + 云端缓存
```

## 🔒 安全特性

- ✅ GitHub OAuth 2.0 认证
- ✅ HTTP-Only Cookie 会话管理
- ✅ CORS 跨域保护
- ✅ 环境变量敏感信息隔离
- ✅ 用户数据隔离（每个用户仅访问自己的数据）

## 📊 功能对比

### vs V4.7.31 (旧版本)

| 功能 | V4.7.31 | V4.8.0 |
|------|---------|--------|
| 本地存储 | ✅ | ✅ |
| 多装备管理 | ✅ | ✅ |
| 数据导出 | ✅ | ✅ |
| GitHub Auth | ❌ | ✅ |
| 云端同步 | ❌ | ✅ |
| 多设备同步 | ❌ | ✅ |
| 历史记录 | ❌ | ✅ (计划) |
| 数据分享 | ❌ | ✅ (计划) |

## 🛠️ 开发

### 可用命令

```bash
# 全部安装依赖
npm install:all

# 开发模式（后端 + 前端）
npm run dev

# 仅后端开发
npm run dev:backend

# 仅前端开发
npm run dev:frontend

# 生产构建
npm run build

# 生产启动
npm start

# 运行测试
npm test
```

### 项目规范

详见 [doc/code_requirements.md](./doc/code_requirements.md):
- 版本号格式 (Major.Minor.Patch)
- 代码注释保留
- 模块化结构
- 前后端 API 契约

## 🐛 故障排查

### OAuth 登录失败

1. 检查 `.env` 中的 `GITHUB_CLIENT_ID` 格式
2. 确认 GitHub OAuth App 的 Callback URL 正确
3. 查看浏览器控制台错误信息

### 前后端无法通信

1. 检查后端是否运行: `curl http://localhost:3000/api/health`
2. 检查 `FRONTEND_URL` 在 `.env` 中的值
3. 检查浏览器 CORS 错误

### 数据未同步

1. 确认已通过 GitHub 认证
2. 查看后端日志了解错误信息
3. 检查 `backend/data/yanyu_tools.db` 是否存在

## 📋 核心检查清单

- [ ] Node.js 已安装 (v18+)
- [ ] GitHub OAuth App 已创建
- [ ] `.env` 文件已配置（不提交到仓库）
- [ ] 后端依赖已安装: `npm install`
- [ ] 本地开发环境已测试
- [ ] GitHub 认证流程正常
- [ ] 选择了部署平台
- [ ] 部署前清单已完成 (见 DEPLOYMENT.md)

## 🚦 下一步

### 立即开始
```bash
# 1. 安装依赖
npm install:all

# 2. 配置 OAuth
cd backend && cp .env.example .env
# 编辑 .env 文件

# 3. 启动开发环境
npm run dev
```

### 选择部署
- 📖 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🚀 选择 Railway (最简单) 或 Vercel + Railway
- ⚙️ 配置环境变量
- ✅ 部署上线

### 未来计划
- [ ] TypeScript 类型化
- [ ] 单元测试覆盖
- [ ] 数据分析 Dashboard
- [ ] 移动应用版本
- [ ] 离线优先同步引擎

## 📞 支持

- 📧 创建 Issue 提交问题
- 💬 在 Discussions 讨论功能
- 🔄 欢迎 PR 贡献

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

**Version**: 4.8.0 | **Last Updated**: 2026-02-24 | **Status**: 生产就绪
