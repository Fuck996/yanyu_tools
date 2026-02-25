## 快速参考

### 本地开发启动

**后端**：
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入 GitHub OAuth 凭证
npm run dev
```

**前端**：
```bash
cd frontend
python -m http.server 5173
# 或: npx http-server . -p 5173
```

### 部署清单

- [ ] 已配置 GitHub OAuth App 并获得凭证
- [ ] 已在项目中创建 backend 和 frontend 目录
- [ ] 已配置 .env 文件（不提交到仓库）
- [ ] 已测试本地 OAuth 流程
- [ ] 已选择部署平台（Railway/Render/Vercel）
- [ ] 已配置部署平台的环境变量
- [ ] 已测试生产环境

### GitHub OAuth App 配置

| 字段 | 值 |
|------|-----|
| Application name | 烟雨江湖装备录入工具 |
| Homepage URL | 部署后的前端地址 |
| Authorization callback URL | `https://your-backend.com/api/auth/github/callback` |

### 环境变量 (.env)

```env
# 必填
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FRONTEND_URL=

# 可选
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key
DB_PATH=./data/yanyu_tools.db
```

### 免费部署平台对比

| 平台 | 前端 | 后端 | 数据库 | 成本 |
|------|------|------|--------|------|
| **Railway** | ✅ | ✅ | ✅ | $0-5/月 |
| **Render** | ✅ | ✅ | ✅ | $0-3/月 |
| **Vercel** | ✅✅ | ❌ | ❌ | $0/月 |
| **GitHub Pages** | ✅ | ❌ | ❌ | $0/月 |
| **Netlify** | ✅ | ✅ | ❌ | $0-20/月 |

### 常用命令

```bash
# 后端
npm run dev          # 开发模式
npm start            # 生产模式
npm test             # 运行测试

# 前端
npm run build        # 构建产物
npm run preview      # 预览模式
```

### 架构图

```
前端 (SPA)
├── GitHub OAuth 登录
├── 本地 localStorage 缓存
└── REST API 调用

    ↓↑ HTTP/HTTPS

后端 (Node.js)
├── Passport.js OAuth
├── Express 路由
└── SQLite 数据库

    ↓↑ OAuth

GitHub
```

### 文件清单

```
backend/
├── server.js              # ✅ 已创建
├── package.json           # ✅ 已创建
├── .env.example           # ✅ 已创建
├── config/oauth.js        # ✅ 已创建
├── config/database.js     # ✅ 已创建
├── models/user.js         # ✅ 已创建
├── routes/auth.js         # ✅ 已创建
├── routes/equipment.js    # ✅ 已创建
└── README.md              # ✅ 已创建

frontend/
└── index.html             # ✅ 已创建（集成 OAuth）

doc/
└── （保持不变）

project-root/
├── DEPLOYMENT.md          # ✅ 已创建
├── MIGRATION.md           # ✅ 已创建
└── README-SETUP.md        # ✅ 本文件
```

### 下一步

1. **立即开始**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

2. **获取 OAuth 凭证**
   - 访问 https://github.com/settings/developers
   - 创建 New OAuth App
   - 复制 Client ID 和 Secret 到 .env

3. **启动本地服务**
   - 后端：`npm run dev` @ http://localhost:3000
   - 前端：`python -m http.server 5173` @ http://localhost:5173

4. **选择部署平台**
   - 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细步骤
   - 推荐使用 Railway（最简单）

### 常见问题

**Q: 如何从旧版本迁移？**
A: 新系统仍保留 localStorage 兼容，旧数据会自动加载。严格来说，该阶段不需要有任何迁移。

**Q: 需要 Node.js 吗？**
A: 是的，后端需要 Node.js 18+。前端不需要（纯静态 HTML）。

**Q: 可以完全离线运行吗？**
A: 可以，没有认证时会使用本地 localStorage。

**Q: 数据会丢失吗？**
A: 不会，所有旧数据保留在本地，新数据同时保存到云端。

### 获取帮助

- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- 查看 [MIGRATION.md](./MIGRATION.md) - 迁移详情
- 查看 [backend/README.md](./backend/README.md) - 后端文档
