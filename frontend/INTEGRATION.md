# 前端模块集成指南

## 📋 概述

为了让项目可以**纯前端运行**，同时支持**可选的后端数据同步**，我们创建了以下独立模块：

| 模块 | 功能 | 文件 |
|------|------|------|
| 本地存储 | 管理 localStorage 数据 | `js/local-storage-manager.js` |
| OAuth 认证 | GitHub 登录流程 | `js/auth-handler.js` |
| API 客户端 | 与后端通信 | `js/api-client.js` |
| 数据同步 | 本地↔云端数据同步 | `js/data-sync.js` |
| UI 管理 | 认证面板与消息提示 | `js/ui-manager.js` |
| 应用初始化 | 整合所有模块 | `js/app-init.js` |

## 🚀 快速集成（3步）

### 第1步：复制模块文件

确保 `frontend/js/` 目录包含：
```
frontend/js/
├── local-storage-manager.js
├── auth-handler.js
├── api-client.js
├── data-sync.js
├── ui-manager.js
└── app-init.js
```

### 第2步：在 index.html 中引入

在 `index.html` 的 `</body>` 标签前添加：

```html
<!-- 应用初始化（会自动初始化所有模块） -->
<script type="module" src="js/app-init.js"></script>
```

### 第3步：测试

刷新页面，应该看到：
1. ✅ 右上角出现 **GitHub 登录按钮**
2. ✅ 控制台输出初始化日志
3. ✅ 未登录时显示"未登录 - 数据保存在本地浏览器"

## 📖 使用说明

### 纯前端模式（无后端）

**场景**: 用户不登录，所有数据保存在本地浏览器

```javascript
// 获取数据
const data = window.YanyuApp.LocalStorageManager.getEquipmentData()

// 保存数据
window.YanyuApp.LocalStorageManager.saveEquipmentData({
  拳套: {
    剑王阁: {
      破军指套: [
        { q: 'purple', attrs: ['攻击', '命中'], special: '臂力+5', k: true }
      ]
    }
  }
})

// 导出 JSON
window.YanyuApp.exportData()

// 导入 JSON
const input = document.createElement('input')
input.type = 'file'
input.accept = '.json'
input.onchange = (e) => {
  window.YanyuApp.importData(e.target.files[0])
}
input.click()
```

### GitHub 登录流程

**场景**: 用户点击登录按钮，使用 GitHub 账号认证，数据同步到云端

```javascript
// 触发登录（自动发生）
// 按钮会自动被创建并绑定到 UI 中

// 或程序触发登录
window.YanyuApp.AuthHandler.loginWithGitHub()

// 登出
await window.YanyuApp.AuthHandler.logout()

// 检查认证状态
const isAuth = window.YanyuApp.AuthHandler.isAuthenticated()
const user = window.YanyuApp.AuthHandler.getUser()
```

### 数据同步

**场景**: 用户已登录，想要同步云端数据到本地或上传本地数据到云端

```javascript
// 从云端下载最新数据（自动定期执行）
const result = await window.YanyuApp.syncFromCloud()
// result: { success: true, recordCount: 10 }

// 上传本地数据到云端
const result = await window.YanyuApp.syncToCloud()

// 双向同步
const result = await window.YanyuApp.DataSync.syncBidirectional()

// 获取同步状态
const status = window.YanyuApp.getSyncStatus()
// {
//   authenticated: true,
//   user: { username: 'john', id: 123 },
//   syncStatus: { state: 'synced', timestamp: '...' },
//   lastSyncTime: Date,
//   storageUsage: '2.5 MB'
// }
```

### 消息提示

```javascript
// 显示消息
window.YanyuApp.UIManager.showMessage('保存成功！', 'success', 2000)

// 类型: 'info', 'success', 'error', 'warning'
// 时长: 毫秒数，0 表示不自动隐藏

// 显示同步进度
window.YanyuApp.UIManager.showSyncProgress('正在同步...')

// 隐藏同步进度
window.YanyuApp.UIManager.hideSyncProgress()
```

### 存储管理

```javascript
// 获取存储使用量
const usage = window.YanyuApp.getStorageUsage()
// { usage: '2.5 MB', warning: false }

// 检查存储警告
if (window.YanyuApp.LocalStorageManager.checkStorageWarning()) {
  console.log('⚠️ 接近 localStorage 限制')
}

// 清空所有数据
await window.YanyuApp.clearAllData()
```

## 🔧 配置说明

### API 地址配置

如果后端不在 `http://localhost:3000`，可在页面加载前设置：

```html
<script>
  window.__API_URL__ = 'https://your-backend.com/api'
</script>
<script type="module" src="js/app-init.js"></script>
```

### 自动同步间隔

修改 `data-sync.js` 中的配置：

```javascript
autoSyncIntervalSeconds: 300, // 改为需要的秒数（默认5分钟）
```

## 🏗️ 架构说明

### 数据流向

#### 未登录状态
```
用户操作
    ↓
原有的 index.html 功能
    ↓
LocalStorageManager
    ↓
localStorage (浏览器本地存储)
```

#### 已登录状态
```
用户操作
    ↓
原有的 index.html 功能
    ↓
LocalStorageManager + DataSync
    ↓
同时存储到：
├── localStorage (本地缓存)
└── 后端 API → SQLite 数据库 (云端)

→ 自动同步 (每5分钟)
```

### 模块通信

```
index.html
    ↓
app-init.js (初始化入口)
    ├── AuthHandler (OAuth 认证)
    │   ├── 处理登录/登出
    │   └── 管理 Token
    │
    ├── LocalStorageManager (本地存储)
    │   ├── 读写 localStorage
    │   ├── 导入/导出数据
    │   └── 迁移旧版本
    │
    ├── DataSync (数据同步)
    │   ├── 云端 → 本地
    │   ├── 本地 → 云端
    │   └── 自动同步
    │
    ├── ApiClient (API 通信)
    │   ├── 调用后端 API
    │   └── 错误处理
    │
    └── UIManager (UI 管理)
        ├── 认证面板
        ├── 消息提示
        └── 样式注入
```

## ⚙️ 后端不可用时的处理

所有模块都支持**后端可选**：

- ✅ 后端运行时：完整的云端同步功能
- ✅ 后端不运行时：自动降级为纯前端模式
- ✅ 后端恢复时：自动重新连接

```javascript
// ApiClient 会自动检测后端可用性
const available = await window.YanyuApp.ApiClient.isBackendEnabled()

if (!available) {
  console.log('💾 后端离线，使用本地存储')
  // 应用自动使用 localStorage
}
```

## 🔄 集成到现有 index.html 的步骤

### 当前状态
- ✅ `index.html` - 原有的装备录入工具
- ✅ localStorage 支持
- ✅ 导入/导出功能

### 集成后的新增功能
- ✅ GitHub 登录按钮（自动创建）
- ✅ 用户信息显示
- ✅ 同步状态指示
- ✅ 自动数据云端同步
- ✅ 本地缓存

### 集成流程

1. **复制模块文件** 到 `frontend/js/`
2. **在 index.html 末尾添加一行**：
   ```html
   <script type="module" src="js/app-init.js"></script>
   ```
3. **完成！** 无需修改 index.html 的任何其他部分

## 🧪 测试清单

- [ ] 页面加载，右上角出现登录按钮
- [ ] 点击登录，重定向到 GitHub 认证
- [ ] 认证后重定向回应用，显示用户名和头像
- [ ] 本地数据导出为 JSON 文件
- [ ] 导入 JSON 文件，数据恢复
- [ ] 后端运行时自动同步
- [ ] 后端停止时仍可使用本地功能
- [ ] 退出登录，清除用户信息
- [ ] 浏览器控制台无错误

## 💡 常见问题

### Q: 如何让现有的装备录入逻辑与新模块整合？
A: 现有逻辑不需要改动。新模块通过以下方式集成：
- 使用 `LocalStorageManager` 替代直接操作 localStorage
- 在保存数据前后调用 `DataSync` 进行同步
- 通过 `UIManager` 显示用户反馈

### Q: 如果用户关闭浏览器后数据会丢失吗？
A: 不会。localStorage 是持久化的，数据会保留直到用户明确清除。

### Q: 如何处理数据冲突（本地修改 vs 云端修改）？
A: 当前实现采用**云端优先**策略。登录后登录会自动从云端拉取最新数据。高级实现可添加时间戳比较和三路合并。

### Q: 支持离线工作吗？
A: 完全支持。未登录时完全离线工作，已登录时后端离线也能继续使用本地功能。

## 📚 代码示例

### 完整的保存流程

```javascript
// 在原有的保存逻辑中添加
function saveEquipment(equipment) {
  // 1. 保存到本地
  const data = window.YanyuApp.LocalStorageManager.getEquipmentData()
  data[equipment.type] = { ...equipment }
  window.YanyuApp.LocalStorageManager.saveEquipmentData(data)

  // 2. 如果已登录，同步到云端
  if (window.YanyuApp.AuthHandler.isAuthenticated()) {
    window.YanyuApp.DataSync.syncToCloud()
      .then(result => {
        if (result.success) {
          window.YanyuApp.UIManager.showMessage('✅ 已保存到云端', 'success')
        }
      })
  } else {
    window.YanyuApp.UIManager.showMessage('💾 已保存到本地', 'info')
  }
}
```

### 完整的加载流程

```javascript
// 在应用启动时
function loadEquipment() {
  // 1. 如果已登录，先从云端同步
  if (window.YanyuApp.AuthHandler.isAuthenticated()) {
    window.YanyuApp.syncFromCloud()
      .then(() => {
        // 使用最新数据
        const data = window.YanyuApp.LocalStorageManager.getEquipmentData()
        renderUI(data)
      })
  } else {
    // 直接使用本地数据
    const data = window.YanyuApp.LocalStorageManager.getEquipmentData()
    renderUI(data)
  }
}
```

## 🚀 部署说明

集成后的应用可以：

### 纯前端部署
```bash
# 不需要后端，可直接部署到任何静态主机
# Vercel、GitHub Pages、Netlify 等

# 启动本地测试
python -m http.server 8000
# 访问 http://localhost:8000
```

### 后端可选部署
```bash
# 如果需要云端同步功能，启动后端
cd backend
npm install
npm run dev

# 然后启动前端
cd frontend
python -m http.server 5173
```

## 📞 获取帮助

查看各模块的源代码注释了解更多细节：
- `local-storage-manager.js` - 本地存储操作
- `auth-handler.js` - OAuth 认证细节
- `data-sync.js` - 同步逻辑
- `ui-manager.js` - UI 组件

---

**Version**: 4.8.0 | **Status**: 生产就绪
