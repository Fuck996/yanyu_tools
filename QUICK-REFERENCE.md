# 快速集成卡片 - 复制以获取快速指引

## 🎯 3 步集成前端模块

### Step 1: 准备文件
确保 `frontend/js/` 文件夹包含：
- ✅ `local-storage-manager.js`
- ✅ `auth-handler.js`
- ✅ `api-client.js`
- ✅ `data-sync.js`
- ✅ `ui-manager.js`
- ✅ `app-init.js`

### Step 2: 修改 index.html
在 `</body>` 前添加：
```html
<script type="module" src="js/app-init.js"></script>
```

### Step 3: 完成！
刷新浏览器测试：
- ✅ 右上角出现 GitHub 登录按钮
- ✅ 控制台无错误
- ✅ 本地数据正常保存

---

## 🚀 常用命令

### 本地开发
```bash
# 无后端（纯前端）
cd frontend
python -m http.server 5173

# 有后端
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && python -m http.server 5173
```

### 查看 API 状态
```javascript
// 在浏览器控制台中
window.YanyuApp.getSyncStatus()
```

### 手动同步
```javascript
// 从云端拉取
await window.YanyuApp.syncFromCloud()

// 上传到云端
await window.YanyuApp.syncToCloud()

// 导出数据
window.YanyuApp.exportData()
```

---

## 📦 后端的 3 大核心功能

| 功能 | 解决的问题 |
|------|-----------|
| **1. GitHub OAuth** | 用户身份认证和隔离 |
| **2. 数据持久化** | 装备数据云端存储 |
| **3. 多设备同步** | 不同设备间数据一致 |

**注意**：后端完全可选！不启动后端时自动降级为本地模式。

---

## ✨ 用户使用流程

### 未登录用户
```
打开页面
  ↓
看到 GitHub 登录按钮
  ↓
所有数据保存在浏览器本地
  ↓
支持导入/导出
```

### 已登录用户
```
点击 GitHub 登录
  ↓
重定向到 GitHub 认证
  ↓
返回应用，显示头像和用户名
  ↓
数据自动同步到云端
  ↓
其他设备登录后自动获取最新数据
  ↓
定期自动同步（每5分钟）
```

---

## 🔧 配置参考

### 后端 (.env)
```env
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
FRONTEND_URL=http://localhost:5173
```

### 前端自定义 API 地址
```html
<script>
  window.__API_URL__ = 'http://your-backend.com/api'
</script>
<script type="module" src="js/app-init.js"></script>
```

---

## 📊 系统对比

| 功能 | 本地模式 | 云端模式 |
|------|---------|---------|
| 装备录入 | ✅ | ✅ |
| 数据保存 | localStorage | SQLite |
| 需要登录 | ❌ | ✅ |
| 多设备同步 | ❌ | ✅ |
| 离线使用 | ✅ | ✅ (缓存) |
| 数据容量 | 5MB | 无限 |

---

## 🐛 故障排查

### 问题：没有登录按钮
**原因**：模块未加载
**解决**：
1. 检查 `js/app-init.js` 是否存在
2. 查看浏览器控制台的错误信息

### 问题：登录后显示认证失败
**原因**：后端 OAuth 配置错误
**解决**：
1. 检查 GitHub OAuth App 配置
2. 检查 `.env` 中的 Client ID 和 Secret
3. 查看后端是否运行

### 问题：后端显示 CORS 错误
**原因**：前端地址与配置不匹配
**解决**：
1. 检查 `.env` 中的 `FRONTEND_URL`
2. 确保前端地址与访问地址一致

---

## 📞 获取帮助

### 查看完整文档
- [前端集成指南](./frontend/INTEGRATION.md) - 详细的集成说明
- [架构设计](./ARCHITECTURE.md) - 系统架构和设计原理
- [后端文档](./backend/README.md) - API 和部署说明
- [部署指南](./DEPLOYMENT.md) - 云端部署步骤

### 查看代码示例
各模块的源代码中都有详细的注释说明每个函数的用法。

---

**版本**: 1.2.1 | **最后更新**: 2026-02-24
