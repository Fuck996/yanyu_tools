# 前后端分离架构迁移指南

## 项目结构

```
yanyu_tools/
├── frontend/               # 前端 - 静态 SPA
│   ├── index.html         # 主页面（包含 OAuth 登录）
│   ├── styles/            # CSS 文件
│   └── js/                # JavaScript 模块
│
├── backend/               # 后端 - Node.js + Express
│   ├── server.js          # 主应用入口
│   ├── package.json       # 依赖管理
│   ├── .env.example       # 环境变量模板
│   ├── config/            # 配置
│   │   ├── oauth.js       # OAuth 配置
│   │   └── database.js    # 数据库配置
│   ├── models/            # 数据模型
│   │   └── user.js        # 用户模型
│   ├── routes/            # API 路由
│   │   ├── auth.js        # 认证路由
│   │   └── equipment.js   # 装备数据路由
│   ├── middleware/        # 中间件（预留）
│   ├── data/              # 数据库文件（自动创建）
│   └── README.md          # 后端文档
│
├── doc/                   # 文档
│   ├── design_doc.md      # 设计文档
│   ├── code_requirements.md # 编码规范
│   └── backup_format_spec.md
│
├── DEPLOYMENT.md          # 部署指南
├── MIGRATION.md           # 迁移指南（本文件）
├── package.json           # 根项目配置（可选）
└── .gitignore             # Git 忽略规则
```

## 迁移步骤

### 第1步：将原 index.html 备份到 frontend

```bash
# 原文件已复制到 frontend/index.html
# 保留原文件作为 V4.7.31 版本备份（可选）
```

### 第2步：设置 Git 仓库

```bash
cd /path/to/yanyu_tools

# 添加新文件到版本控制
git add frontend/ backend/ DEPLOYMENT.md MIGRATION.md
git commit -m "feat: 实现前后端分离架构

- 创建 frontend 目录，集成 GitHub OAuth 登录
- 创建 backend Node.js 服务器，实现 OAuth 和数据 API
- 迁移装备数据到 SQLite 数据库
- 支持云端数据持久化

Breaking Change: 改变了数据存储方式从本地 localStorage 到云端
"
git push origin main
```

### 第3步：本地测试

```bash
# 1. 创建 GitHub OAuth App
#    访问 https://github.com/settings/developers
#    创建新应用，获得 Client ID 和 Secret

# 2. 配置后端
cd backend
cp .env.example .env
# 编辑 .env，填入：
#   GITHUB_CLIENT_ID
#   GITHUB_CLIENT_SECRET
#   SESSION_SECRET（自定义安全密钥）

# 3. 安装依赖
npm install

# 4. 启动后端
npm run dev
# 输出: 🚀 Server running at http://localhost:3000

# 5. 在另一个终端启动前端
cd ../frontend
python -m http.server 5173
# 或使用其他静态服务器
```

### 第4步：测试所有功能

- [ ] 访问 `http://localhost:5173`
- [ ] 点击「登录 GitHub」按钮
- [ ] GitHub 认证完成后重定向到前端
- [ ] 验证用户信息正确显示
- [ ] 测试数据导出/导入
- [ ] 测试主题切换
- [ ] 测试本地 localStorage 数据仍可用

### 第5步：迁移现有数据（可选）

如果要迁移旧数据到新系统：

```javascript
// backend/migrate.js
import db from './config/database.js'

async function migrateLocalData(localStorageJson) {
  const data = JSON.parse(localStorageJson)
  const userId = 1 // 或从认证用户获得
  
  for (const [equipmentType, locations] of Object.entries(data)) {
    for (const [location, equipments] of Object.entries(locations)) {
      for (const [equipmentName, records] of Object.entries(equipments)) {
        // 逐条导入数据
      }
    }
  }
}
```

## 架构对比

### 迁移前（V4.7.31）

```
+--------+
| Browser|
+---+----+
    |
    | localStorage
    V (5MB 限制)
+--------+
| 本地数据|
+--------+
```

**特点**：
- ✅ 完全离线运行
- ❌ 无法多设备同步
- ❌ 无用户认证
- ❌ 数据容量受限

### 迁移后（V4.8.0）

```
+--------+              +----------+
| Browser| <---------->|  Backend |
+---+----+  OAuth      +-----+----+
    |                        |
    | 可选：localStorage      | SQLite DB
    |                        |
    V                        V
+--------+              +----------+
| 本地缓存| <--sync--> | 云端数据  |
+--------+              +----------+
```

**特点**：
- ✅ GitHub 账号认证
- ✅ 多设备数据同步
- ✅ 数据容量无限制
- ✅ 后端灵活扩展
- ⚠️ 需要互联网连接

## 功能保留与增强

### 保留功能
- ✅ 本地 localStorage 缓存（无认证时）
- ✅ 数据导出/导入
- ✅ 主题切换
- ✅ 所有装备录入功能

### 新增功能
- ✅ GitHub OAuth 认证
- ✅ 云端数据持久化
- ✅ 多设备同步
- ✅ 用户历史记录
- ✅ RESTful API（可供第三方使用）

### 计划功能
- [ ] 装备对比分析
- [ ] 数据统计报表
- [ ] 队友数据共享
- [ ] 移动应用版本

## 版本号规范更新

- **V4.7.31** → 最后的单文件版本
- **V4.8.0** → 前后端分离版本（本次）
- **V5.0.0** → 计划中的大版本重构

更新 [doc/code_requirements.md](../doc/code_requirements.md) 中的版本号管理规范。

## 向后兼容性

### localStorage 兼容
原有用户的本地数据仍然保留在浏览器：
```javascript
// 旧数据位置
localStorage['yanyu_v24_db']

// 新系统也检查这个位置，优先导入
if (localStorage['yanyu_v24_db'] && !user.authenticated) {
  useLocalData = true
}
```

### API 扩展
可以为旧版本保留 GET 接口，支持直接访问原 `index.html`：
```bash
# 旧版本（仍可用）
http://localhost:3000/legacy/index.html

# 新版本
http://localhost:5173/
```

## 故障恢复

### 数据备份
```bash
# 自动备份 SQLite 数据库
cp backend/data/yanyu_tools.db backend/data/yanyu_tools.db.bak
```

### 回滚方案
如果新版本出现问题：
```bash
# 1. 使用 git 恢复
git checkout HEAD~1

# 2. 保留现有数据并恢复提交前版本
git log --oneline
git checkout <older-commit-hash> -- frontend/* backend/*
```

## 技术负债与改进

- [ ] 添加项目级 package.json 脚本管理
- [ ] TypeScript 类型化
- [ ] 单元测试覆盖
- [ ] 集成测试套件
- [ ] API 文档化（Swagger）
- [ ] 数据库迁移工具

## 参考文档

- [部署指南](./DEPLOYMENT.md)
- [设计文档](./doc/design_doc.md)
- [编码规范](./doc/code_requirements.md)
