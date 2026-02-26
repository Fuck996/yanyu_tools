# 数据同步机制完整指南

## 📋 目录
1. [初始化流程](#初始化流程)
2. [同步流程](#同步流程-syncfromcloud)
3. [上传流程](#上传流程-synctocloud)
4. [备份与恢复](#备份与恢复)
5. [所有触发点](#所有触发点)
6. [关键判断条件](#关键判断条件)
7. [常见问题排查](#常见问题排查)

---

## 初始化流程

### 页面加载时序

```
1. DOMContentLoaded / onload
   ↓
2. initializeApp()
   ↓
3. AuthUI.init()
   ├─ 检查 localStorage 中的 token
   ├─ 如果有 token → 调用 AuthHandler.getUser() 验证
   └─ 更新 UI（显示登录按钮或用户信息）
   
4. DataSync.initialize()
   ├─ LocalStorageManager.migrateOldData()
   ├─ AuthHandler.handleOAuthCallback()
   │  ├─ 检查 URL 中的 code 参数
   │  ├─ 是否新登录?
   │  │  ├─ 是 → localStorage.clearConflictCheckFlag()
   │  │  └─ 调用 syncFromCloud()
   │  └─ 存储 token 和用户信息
   │
   └─ AuthHandler.isAuthenticated()?
      ├─ 是 → 启动自动同步机制
      └─ 否 → 仅使用本地数据
   
5. 首次自动备份
   └─ window.YanyuApp.autoBackup()
   
6. 设置定时器
   ├─ 每 10 分钟一次备份
   └─ 页面卸载事件监听 (beforeunload)
```

### 关键变量初始化
- `DataSync.syncInProgress` = false
- `DataSync.lastSyncTime` = null
- `DataSync.syncInterval` = null
- `AuthUI.isUpdatingStatus` = false
- `AuthUI.cachedBackupList` = null
- `AuthUI.cachedBackupListTime` = null

---

## 同步流程 (syncFromCloud)

### 执行条件
| 条件 | 入口 |
|-----|-----|
| 用户点击"同步云端"按钮 | `index.html` line 599 |
| 新登录完成后 | `DataSync.initialize()` |
| 用户选择保留本地，需上传 | `syncFromCloud()` 中的判断 |
| 10 分钟轮询检查 | `AuthUI.startPolling()` |

### 流程详解

```javascript
async syncFromCloud() {
  // 1. 认证检查
  if (!AuthHandler.isAuthenticated())
    return { success: false, error: '未认证' }
  
  // 2. 并发保护
  if (this.syncInProgress)
    return { success: false, error: '同步进行中' }
  this.syncInProgress = true  // 锁定
  
  // 3. 获取云端数据
  const result = await ApiClient.getRecords()
  
  // 4. 哈希对比（性能优化）
  const localHash = hashData(localData)
  const cloudHash = hashData(cloudData)
  if (localHash === cloudHash)
    return { success: true, noChange: true }  // 跳过
  
  // 5. 冲突检测 - 三种情况
  
  // 情况 A: 云端无数据，本地有数据 (保护本地)
  if (cloudRecords.length === 0 && localRecordCount > 0) {
    console.log('☁️ 云端无数据，本地有数据，执行反向上传')
    this.syncInProgress = false
    return await this.syncToCloud()  // 递归调用上传
  }
  
  // 情况 B: 冲突检测标志已设置
  if (hasCheckedConflict) {
    console.log('☁️ 已检测过冲突，使用云端数据覆盖本地')
    // 继续使用云端数据，不再询问
  }
  
  // 情况 C: 冲突检测 - 第一次检测到两边都有数据且不同
  if (!hasCheckedConflict && 
      localRecordCount > 0 && 
      records.length > 0 &&
      detectDataConflict(...)) {
    
    console.warn('⚠️ 检测到数据冲突')
    
    // 标记已检测
    LocalStorageManager.setConflictCheckFlag()
    
    // 显示对话框，让用户选择
    const choice = await showConflictDialog(...)
    
    if (choice === 'keep-local') {
      console.log('👤 用户选择保留本地，上传到云端')
      this.syncInProgress = false
      return await this.syncToCloud()  // 上传本地
    } else {
      console.log('☁️ 用户选择使用云端，继续覆盖本地')
    }
  }
  
  // 6. 合并并保存
  const merged = this.mergeCloudData(records)
  LocalStorageManager.saveEquipmentData(merged)
  
  // 7. 刷新 UI
  window.renderNav()
  window.renderMain()
  
  // 8. 更新时间戳
  this.lastSyncTime = new Date()
  LocalStorageManager.updateSyncStatus('synced', {...})
  
  // 9. 解锁
  this.syncInProgress = false
  this.notifySyncStatusUpdate()  // 触发回调
  
  return { success: true, recordCount: records.length }
}
```

### 关键判断条件

| 判断条件 | 预期结果 | 异常处理 |
|---------|--------|--------|
| `!AuthHandler.isAuthenticated()` | 返回失败 | 用户未登录 |
| `this.syncInProgress` | 返回等待 | 防止并发调用 |
| `localHash === cloudHash` | 跳过同步不更新时间 | 优化：数据无变化 |
| `cloudRecords.length === 0 && localRecordCount > 0` | 反向上传 | 保护本地数据 |
| `hasCheckedConflict` | 使用云端 | 首次登录后不再询问 |
| `detectDataConflict(...)` | 显示对话框 | 用户手工选择 |

---

## 上传流程 (syncToCloud)

### 执行条件
| 条件 | 入口 |
|-----|-----|
| 用户点击"上传到云端"按钮 | `index.html` line 600 |
| 手动备份前检查本地数据 | `saveManualBackup()` |
| 冲突时用户保留本地 | `syncFromCloud()` 中调用 |
| 云端无数据反向上传 | `syncFromCloud()` 中调用 |

### 流程详解

```javascript
async syncToCloud() {
  // 1. 认证检查
  if (!AuthHandler.isAuthenticated())
    return { success: false, error: '未认证' }
  
  // 2. 并发保护
  if (this.syncInProgress)
    return { success: false, error: '同步进行中' }
  this.syncInProgress = true
  
  // 3. 获取本地数据
  const data = LocalStorageManager.getEquipmentData()
  
  // 4. 上传前对比（避免无变化上传）
  const remoteCheck = await ApiClient.getRecords()
  const localHash = hashData(data)
  const remoteHash = hashData(convertCloudToLocal(remoteCheck.records))
  
  if (localHash === remoteHash) {
    return { success: true, noChange: true }  // 跳过
  }
  
  // 5. 上传全量数据（覆盖方式）
  const result = await ApiClient.importData(data)
  
  // 6. 处理结果
  if (result.success) {
    this.lastSyncTime = new Date()
    LocalStorageManager.updateSyncStatus('synced', {...})
    this.syncInProgress = false
    return { success: true }
  } else if (result.offline) {
    this.syncInProgress = false
    return { success: false, offline: true }
  } else {
    this.syncInProgress = false
    return { success: false, error: result.error }
  }
}
```

---

## 备份与恢复

### 手动备份 (saveManualBackup)

```
1. 检查认证
2. 获取本地数据
3. 判断: 本地有数据?
   ├─ 是 → 先调用 syncToCloud() 确保云端最新
   └─ 否 → 直接保存
4. 调用 ApiClient.saveBackup('manual')
   - 后端会保存当前的云端数据为快照
5. 刷新备份显示
   └─ AuthUI.updateSyncStatus()
```

**关键逻辑**: 本地→云端→快照

### 手动恢复 (restoreManualBackup)

```
1. 获取备份列表
   - 有 5 分钟的缓存机制
   - 避免重复请求后端
2. 查找最新手动备份
3. 用户确认对话框
4. 调用 ApiClient.restoreBackup(id)
   - 后端将快照恢复为当前数据
5. 拉取完整数据
   └─ ApiClient.getRecords()
6. 合并到本地格式
   └─ mergeCloudData()
7. 保存本地
8. 刷新 UI
9. ⭐ 立即执行自动备份
   └─ autoBackup()
   └─ 确保后端保持两份历史记录
```

**关键步骤**: 步骤 9 是重要的防护机制，确保恢复后的数据被备份

### 清空数据 (clearAllData)

```
1. 用户确认对话框
2. 清空本地存储 (同步)
   └─ LocalStorageManager.clearEquipmentData()
3. 异步清空后端 (不阻塞 UI)
   └─ ApiClient.clearBackendData()
4. 如果后端清空失败，仅输出警告，不影响本地结果
```

**特点**: 本地同步删除，后端异步删除

---

## 所有触发点

### 1️⃣ 页面加载
- **入口**: `DOMContentLoaded` 或页面渲染完成
- **调用链**: `initializeApp()` → `AuthUI.init()` → `DataSync.initialize()`

### 2️⃣ 新登录
- **入口**: OAuth 重定向回调（URL 包含 `code` 参数）
- **逻辑**:
  ```javascript
  if (AuthHandler.handleOAuthCallback()) {
    LocalStorageManager.clearConflictCheckFlag()  // 新登录清除标志
    await DataSync.syncFromCloud()  // 自动同步
  }
  ```

### 3️⃣ 首次自动备份
- **入口**: `DataSync.initialize()` 完成后
- **时机**: 在所有冲突检测和用户选择完成之后
- **代码**:
  ```javascript
  if (AuthHandler.isAuthenticated()) {
    await window.YanyuApp.autoBackup()
  }
  ```

### 4️⃣ 定时自动备份
- **间隔**: 每 10 分钟
- **代码**:
  ```javascript
  setInterval(() => {
    if (AuthHandler.isAuthenticated()) {
      window.YanyuApp.autoBackup()
    }
  }, 10 * 60 * 1000)
  ```

### 5️⃣ 页面卸载自动备份
- **入口**: `beforeunload` 事件
- **机制**: 使用 `navigator.sendBeacon()` 确保请求发出
- **代码**:
  ```javascript
  window.addEventListener('beforeunload', () => {
    if (AuthHandler.isAuthenticated()) {
      navigator.sendBeacon(
        `${API_URL}/api/equipment/save-backup`,
        JSON.stringify({ backupType: 'auto' })
      )
    }
  })
  ```

### 6️⃣ 用户手动"同步云端"
- **入口**: 点击按钮 `onclick="window.YanyuApp?.syncFromCloud()"`
- **位置**: [index.html](../frontend/index.html#L599)

### 7️⃣ 用户手动"上传到云端"
- **入口**: 点击按钮 `onclick="window.YanyuApp?.syncToCloud()"`
- **位置**: [index.html](../frontend/index.html#L600)

### 8️⃣ 用户手动"在线保存"（手动备份）
- **入口**: 点击按钮 `onclick="window.YanyuApp?.saveManualBackup()"`
- **flow**: 检查本地数据 → 若有则先 syncToCloud() → 保存备份
- **位置**: [index.html](../frontend/index.html#L599), [index.html](../frontend/index.html#L777)

### 9️⃣ 用户手动"在线恢复"（手动恢复）
- **入口**: 点击按钮 `onclick="window.YanyuApp?.restoreManualBackup()"`
- **flow**: 获取备份列表 → 用户确认 → 恢复数据 → 拉取到本地 → **autoBackup()**
- **位置**: [index.html](../frontend/index.html#L602), [index.html](../frontend/index.html#L782)

### 🔟 10分钟轮询更新备份显示
- **入口**: `AuthUI.startPolling()`
- **触发条件**: 成功获取备份列表时
- **间隔**: 10 分钟
- **作用**: 定期检查备份状态，更新 PC 和移动端显示

---

## 关键判断条件

### 认证状态检查
```javascript
AuthHandler.isAuthenticated()  // 检查 token 是否存在且有效
```

### 并发保护
```javascript
if (this.syncInProgress) return  // 防止多个同步同时运行
```

### 数据相同性检查
```javascript
const localHash = hashData(localData)
const cloudHash = hashData(cloudData)
if (localHash === cloudHash) return { noChange: true }  // 跳过
```

### 云端无数据保护
```javascript
if (cloudRecords.length === 0 && localRecordCount > 0) {
  // 反向上传，保护本地数据不被清空
  return await this.syncToCloud()
}
```

### 冲突检测标志
```javascript
const hasCheckedConflict = LocalStorageManager.getConflictCheckFlag()

if (!hasCheckedConflict && needsConflictDetection) {
  LocalStorageManager.setConflictCheckFlag()  // 标记已检测
  // 显示对话框，仅在首次登录时
}
```

### 缓存有效性检查
```javascript
const CACHE_TTL = 5 * 60 * 1000  // 5 分钟
if (cachedBackupList &&
    Date.now() - cachedBackupListTime < CACHE_TTL) {
  // 使用缓存
} else {
  // 重新请求
  this.cachedBackupList = await ApiClient.getBackupList()
  this.cachedBackupListTime = Date.now()
}
```

---

## 状态存储位置

### 内存状态 (Runtime)
- `DataSync.syncInProgress` - 同步是否进行中
- `DataSync.lastSyncTime` - 最后同步时间
- `AuthUI.isUpdatingStatus` - 状态面板是否更新中
- `AuthUI.cachedBackupList` - 备份列表缓存
- `AuthUI.pollingTimer` - 轮询定时器 ID
- `AuthUI.retryCountdown` - 重试定时器 ID

### 本地存储 (localStorage)
- `'xiaohei_equipment'` - 装备数据
- `'xiaohei_sync_status'` - 同步状态信息
- `'xiaohei_conflict_checked'` - 冲突检测标志
- `'xiaohei_user_token'` - OAuth token
- `'xiaohei_user_info'` - 用户信息

### 后端存储 (数据库)
- `equipment_records` 表 - 当前最新数据
- `equipment_backups` 表 - 备份快照

---

## 常见问题排查

### 问题 1: "在线保存"显示 0 条
**原因**: 新账户本地有数据但后端空，同步时会反向上传，但备份时云端仍为空

**排查步骤**:
1. 检查 `DataSync.initialize()` 是否正确触发
2. 检查是否有冲突检测对话框出现
3. 查看控制台是否有"云端无数据，执行反向上传"日志
4. 检查 `syncToCloud()` 是否成功上传
5. 验证后端 `/api/equipment/get-records` 是否返回数据

**修复**: 在 `saveManualBackup()` 中添加 `syncToCloud()` 前置步骤 ✅ (已修复)

### 问题 2: 清空后刷新，数据又回来了
**原因**: `clearAllData()` 仅清空本地，后端数据仍存在；刷新页面时重新同步

**排查步骤**:
1. 检查控制台是否有"后端数据已清空"日志
2. 验证 `ApiClient.clearBackendData()` 是否被调用
3. 检查后端日志，是否收到清空请求

**修复**: 在 `clearAllData()` 中添加 `ApiClient.clearBackendData()` 异步调用 ✅ (已修复)

### 问题 3: 手动恢复后，没有自动备份
**原因**: `restoreManualBackup()` 完成后未调用 `autoBackup()`

**排查步骤**:
1. 恢复完成后检查是否有自动备份日志
2. 刷新页面查看备份时间是否更新
3. 查看备份条数是否与恢复条数一致

**修复**: 在 `restoreManualBackup()` 的数据加载完成后添加 `autoBackup()` ✅ (已修复)

### 问题 4: 移动端备份显示没有条数
**原因**: `updateSyncStatus()` 中仅更新了 PC 端备份卡片，移动端需要单独更新

**排查步骤**:
1. 检查 `mAutoBackupTime` 和 `mManualBackupTime` 是否被更新
2. 查看移动菜单中备份卡片的内容

**修复**: 在 `updateSyncStatus()` 中添加移动端备份卡片的条数显示 ✅ (已修复)

### 问题 5: 冲突对话框重复出现
**原因**: `setConflictCheckFlag()` 未正确保存，或被意外清除

**排查步骤**:
1. 检查 `LocalStorageManager.setConflictCheckFlag()` 是否被调用
2. 验证 `getConflictCheckFlag()` 是否能读取正确的值
3. 在新登录时检查是否调用了 `clearConflictCheckFlag()`

**修复**: 确保标志在同步成功后被妥善保存和读取

### 问题 6: 页面卸载时备份未发送
**原因**: `beforeunload` 事件中 `navigator.sendBeacon()` 可能被浏览器限制

**排查步骤**:
1. 检查浏览器是否支持 `sendBeacon()` (现代浏览器都支持)
2. 验证 API_URL 是否正确
3. 查看后端是否接收到 beacon 请求（与普通 POST 不同）

**修复**: 已使用 `sendBeacon()` 确保请求在页面卸载前发出

---

## 调试技巧

### 1. 开启详细日志
所有操作都有 `console.log()` 和 `console.warn()` 记录，支持按操作类型过滤：
```javascript
// 滤出所有同步日志
console.log 中查找: "📥" "📤" "🔄"

// 滤出所有冲突相关
console.log 中查找: "⚠️" "冲突"

// 滤出所有备份相关
console.log 中查找: "💾" "自动备份" "手动备份"
```

### 2. 检查内存状态
```javascript
// 在浏览器控制台执行
window.YanyuApp.DataSync.syncInProgress  // 是否同步中
window.YanyuApp.DataSync.lastSyncTime    // 最后同步时间
window.YanyuApp.AuthUI.isUpdatingStatus  // 状态面板更新状态
```

### 3. 查看本地存储
```javascript
// 装备数据
JSON.parse(localStorage.getItem('xiaohei_equipment'))

// 同步状态
JSON.parse(localStorage.getItem('xiaohei_sync_status'))

// 冲突检测标志
localStorage.getItem('xiaohei_conflict_checked')
```

### 4. 手动触发操作
```javascript
// 同步云端
await window.YanyuApp.syncFromCloud()

// 上传到云端
await window.YanyuApp.syncToCloud()

// 自动备份
await window.YanyuApp.autoBackup()

// 手动备份
await window.YanyuApp.saveManualBackup()

// 手动恢复
await window.YanyuApp.restoreManualBackup()
```

---

## 版本历史

| 版本 | 修复内容 | 提交 |
|-----|--------|-----|
| v1.2.0 | 移动端备份条数显示、恢复后自动备份、清空后端数据 | bcc4980 |
| v1.1.0 | stats-modal 响应式、selection-preview 高度、saveManualBackup 先同步 | 9587f7f |
| v1.0.0 | 初始化完成，含冲突检测、数据保护、自动/手动备份 | 521f8ea |
