# 数据同步流程图 - 可视化参考

> ⚠️ **注意**: 本文件中的Mermaid图表在Markdown中显示可能不清晰。  
> **推荐使用**: 访问 [mermaid.live](https://mermaid.live) 在线查看和导出

## 📌 快速查看

### 方案1️⃣：使用在线工具 (最推荐)
1. 访问 https://mermaid.live (无需注册)
2. 在左侧编辑器中粘贴下方代码块 (英文部分)
3. 右侧实时显示图表，字体清晰

### 方案2️⃣：导出为PNG/SVG
```bash
# 安装mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# 导出（从下方复制code块内容到 diagram.mmd）
mmdc -i diagram.mmd -o diagram.png -s 2
```

### 方案3️⃣：VS Code预览
- 安装插件: Markdown Preview Mermaid Support
- 打开此MD文件，按 `Ctrl+Shift+V` 预览
- 右键图表导出

---

## 📊 图表1：系统初始化流程

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A["▶️ 页面加载<br/>DOMContentLoaded"] --> B["注册同步状态回调<br/>DataSync.setSyncStatusCallback"]
    B --> C["认证初始化<br/>AuthUI.init"]

    C --> D{"检测登录状态"}

    D -->|"OAuth回调(OAuth新登录)"| E["更新UI显示"]
    D -->|"savedUser(恢复会话)"| E
    D -->|"未登录"| F["🔒 显示登录按钮<br/>updateSyncStatus显示未登录"]
    F --> Z["🏁 结束<br/>不进行同步流程"]

    E --> G["• 即刻启动服务器可用性轮询<br/>startPolling——不等同步完成"]
    G --> H["调用 updateSyncStatus<br/>显示备份信息"]
    H --> I["进入 DataSync.initialize"]

    I --> J["数据迁移<br/>migrateOldData"]
    J --> K["syncFromCloud<br/>含冲突检测"]
    K --> L["同步完成<br/>两端数据已一致"]

    L --> M["启动本地数据变化检测<br/>（事件驱动，非轮询）"]
    M --> O["✨ 系统就绪"]

    style A fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style F fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style Z fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style G fill:#5d4037,stroke:#ff6f00,stroke-width:2px,color:#fff
    style K fill:#1a237e,stroke:#7c4dff,stroke-width:2px,color:#fff
    style L fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style M fill:#4a148c,stroke:#bb86fc,stroke-width:2px,color:#fff
    style O fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
```

> **要点说明：**
> - 轮询（服务器可用性检测）在登录时立即启动，不等同步完成
> - `syncFromCloud` 完成后两端数据已一致，无需首次自动备份
> - 无论新登录还是恢复会话，均执行冲突检测
> - 系统就绪后采用**事件驱动**的数据变化检测，不依赖定时轮询

---

## 📊 图表2：syncFromCloud 决策树（修正版）

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A["▶️ 开始<br/>syncFromCloud"] --> B{已认证?}
    B -->|"❌ 否"| FAIL["返回 FAILED<br/>错误: 未认证"]
    B -->|"✅ 是"| FETCH["📥 获取云端数据<br/>ApiClient.getRecords"]

    FETCH --> LOC["🔍 检查本地数据<br/>getEquipmentData"]
    LOC --> BOTH_EMPTY{两边都为空?}
    BOTH_EMPTY -->|"✅ 是"| DONE_EMPTY["✨ 无需操作<br/>返回 NO_CHANGE"]

    BOTH_EMPTY -->|"❌ 否"| HASH_CHECK
    HASH_CHECK["⚖️ 哈希对比<br/>本地 vs 云端"] --> SAME{哈希相同?}
    SAME -->|"✅ 一致"| DONE_SAME["✨ 数据相同<br/>返回 NO_CHANGE"]

    SAME -->|"❌ 不一致"| LOC_HAS{本地有数据?}

    LOC_HAS -->|"❌ 本地为空"| DL["⬇️ 直接下载云端<br/>无需冲突处理"]
    DL --> DL1["🎨 刷新界面<br/>renderNav / renderMain"]
    DL1 --> DL2["✅ 返回 SUCCESS"]

    LOC_HAS -->|"✅ 本地有数据"| CLOUD_HAS{云端有数据?}

    CLOUD_HAS -->|"❌ 云端为空"| PROTECT["⬆️ 上传本地数据<br/>保护本地不丢失<br/>syncToCloud"]
    PROTECT --> PROTECT1["✅ 返回 SUCCESS<br/>本地已备份到云端"]

    CLOUD_HAS -->|"✅ 云端有数据"| CONFLICT["⚠️ 冲突！展示冲突对话框<br/>本地N条 vs 云端M条<br/>注：每次应用加载都执行"]
    CONFLICT --> CHOICE{用户选择}

    CHOICE -->|"'保留本地'"| KL["⬆️ 上传本地<br/>syncToCloud"]
    KL --> KL1["✅ 返回 SUCCESS<br/>两端已一致"]

    CHOICE -->|"'使用云端'"| UC["⬇️ 下载云端<br/>mergeCloudData"]
    UC --> UC1["🎨 刷新界面<br/>renderNav / renderMain"]
    UC1 --> UC2["✅ 返回 SUCCESS<br/>两端已一致"]

    style A fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style FAIL fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style DONE_EMPTY fill:#4a148c,stroke:#bb86fc,stroke-width:2px,color:#fff
    style DONE_SAME fill:#4a148c,stroke:#bb86fc,stroke-width:2px,color:#fff
    style PROTECT fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style CONFLICT fill:#6b3a00,stroke:#ff6f00,stroke-width:2px,color:#fff
    style KL fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style UC fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
```

> **✔️ 决策顺序：先检本地 → 再检哈希 → 再检云端 → 再处理冲突**
> **✔️ 冲突检测无条件执行**：无对话标记展开适淳，冲突解决后两端哈希相同，下次自然进 noChange 分支不再弹框
> **✔️ 冲突解决 = 同步完成**：不需要额外的 autoBackup 步骤

---

## 📊 图表3：本地数据变化处理流程（统一视图）

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    IDLE["🔍 待机<br/>本地数据变化检测（事件驱动）"]

    IDLE --> OP{"检测到数据变化<br/>（操作触发）"}

    OP -->|"渐进式操作<br/>手动新增 / 修改 / 删除<br/>收藏标记 / 起始序号"| P_LOCAL["💾 更新本地存储"]
    OP -->|"大操作(触发备份)<br/>在线恢复 / 本地导入"| R_LOCAL["💾 更新本地存储"]
    OP -->|"大操作(不备份)<br/>清空数据"| C_LOCAL["💾 更新本地存储"]

    P_LOCAL --> P_UI["🎨 立即刷新界面<br/>renderNav + renderMain"]
    R_LOCAL --> R_UI["🎨 立即刷新界面<br/>renderNav + renderMain"]
    C_LOCAL --> C_UI["🎨 立即刷新界面<br/>renderNav + renderMain"]

    P_UI --> TIMER{"已有1分钟<br/>延迟备份定时器?"}
    TIMER -->|"有 → 忽略，让计时继续"| IDLE
    TIMER -->|"无"| SET["⏱️ 新建1分钟延迟任务"]
    SET --> WAIT["⏳ 等待1分钟<br/>（期间再有渐进式变化不重置计时）"]
    WAIT --> BACKUP

    R_UI --> BACKUP["🚀 执行全量自动备份<br/>autoBackup"]

    C_UI --> CLEAR_BACKEND["📡 清空后端数据 + 删除Auto备份<br/>ApiClient.clearBackendData"]
    CLEAR_BACKEND --> CLEAR_STATUS["📊 刷新状态展示<br/>updateSyncStatus"]
    CLEAR_STATUS --> IDLE

    BACKUP --> SYNC["⬆️ 上传最新数据到云端<br/>syncToCloud"]
    SYNC --> SAVE_BK["💾 保存备份快照<br/>ApiClient.saveBackup"]
    SAVE_BK --> INVAL["🔄 使缓存失效<br/>cachedBackupList = null"]
    INVAL --> STATUS["📊 更新备份状态显示<br/>updateSyncStatus"]
    STATUS --> NOTIFY["✅ 浮动提示：备份成功"]
    NOTIFY --> IDLE

    style IDLE fill:#1a237e,stroke:#7c4dff,stroke-width:2px,color:#fff
    style OP fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style P_LOCAL fill:#4a2c00,stroke:#ff9800,stroke-width:2px,color:#fff
    style R_LOCAL fill:#6b0000,stroke:#f44336,stroke-width:2px,color:#fff
    style C_LOCAL fill:#2a0a2a,stroke:#9c27b0,stroke-width:2px,color:#fff
    style P_UI fill:#4a2c00,stroke:#ff9800,stroke-width:2px,color:#fff
    style R_UI fill:#6b0000,stroke:#f44336,stroke-width:2px,color:#fff
    style C_UI fill:#2a0a2a,stroke:#9c27b0,stroke-width:2px,color:#fff
    style WAIT fill:#3c2a00,stroke:#ffc107,stroke-width:1px,color:#aaa
    style BACKUP fill:#0d3d1f,stroke:#4caf50,stroke-width:2px,color:#fff
    style CLEAR_BACKEND fill:#2a0a2a,stroke:#9c27b0,stroke-width:2px,color:#fff
    style NOTIFY fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
```

> **操作分类说明：**
>
> | 操作类型 | 触发操作 | 备份时机 |
> |---------|---------|---------|
 | 渐进式 | 手动新增装备、修改装备、删除装备、收藏标记、起始序号调整 | 1分钟后（计时期间新操作不重置，到期统一备份） |
 | 大操作(备份) | 在线恢复备份、本地文件导入 | 立即备份 |
 | 大操作(不备份) | 清空数据 | 不做备份，清空后端数据+删除auto备份+刷新状态展示 |
>
> **关键原则：**
> - 本地存储更新 → **立即刷新界面** → 再进行后端操作（用户操作反馈不等网络）
> - 渐进式操作的定时器一旦建立**不会被后续操作重置**，1分钟到期后统一执行一次备份
> - 大操作直接旁路定时器，走立即备份路径

---

## 📊 图表4：全量自动备份（autoBackup）执行细节

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A["🚀 触发 autoBackup<br/>（来自渐进式1分钟定时器 或 大操作立即调用）"]

    A --> AUTH{已认证?}
    AUTH -->|"❌ 否"| SKIP["⏭️ 跳过备份<br/>记录日志"]
    SKIP --> END["🏁 结束"]

    AUTH -->|"✅ 是"| LOCAL["📊 获取当前本地数据<br/>LocalStorageManager.getEquipmentData"]

    LOCAL --> SYNC["⬆️ 上传到云端<br/>DataSync.syncToCloud"]
    SYNC --> SYNC_OK{上传成功?}
    SYNC_OK -->|"❌ 失败"| SYNC_WARN["⚠️ 记录警告<br/>继续尝试备份"]
    SYNC_OK -->|"✅ 成功"| SAVE

    SYNC_WARN --> SAVE["💾 保存备份快照<br/>ApiClient.saveBackup"]

    SAVE --> SAVE_OK{备份成功?}
    SAVE_OK -->|"❌ 失败"| ERR["❌ 显示失败提示<br/>showMessage error"]
    SAVE_OK -->|"✅ 成功"| INVAL["🔄 缓存失效<br/>cachedBackupList = null<br/>cachedBackupListTime = 0"]

    INVAL --> STATUS["📊 刷新备份状态显示<br/>updateSyncStatus<br/>（显示最新自动备份时间）"]
    STATUS --> OK["✅ 显示成功提示<br/>showMessage success"]

    OK --> END
    ERR --> END

    style A fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style AUTH fill:#3c2a00,stroke:#ffc107,stroke-width:2px,color:#fff
    style SKIP fill:#3c1515,stroke:#ff4444,stroke-width:1px,color:#aaa
    style SYNC fill:#0d3d1f,stroke:#4caf50,stroke-width:2px,color:#fff
    style SAVE fill:#0d3d1f,stroke:#4caf50,stroke-width:2px,color:#fff
    style INVAL fill:#1a237e,stroke:#7c4dff,stroke-width:2px,color:#fff
    style STATUS fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style OK fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
    style ERR fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
```

> **autoBackup 被以下场景调用：**  
> - 渐进式操作（新增/修改/删除）：1分钟定时器到期后调用  
> - 大操作（在线恢复/本地导入/清空）：操作完成、界面刷新后立即调用  
>
> **缓存失效必须在 saveBackup 成功后执行**，确保 `updateSyncStatus` 拿到最新备份列表

---

## 📋 推荐使用方式

### 👍 最佳选择：在线查看
访问 [mermaid.live](https://mermaid.live) 并复制上方任一代码块，享受：
- ✅ 黑底白字，清晰易读
- ✅ 实时预览，即时反馈
- ✅ 一键导出PNG/SVG
- ✅ 无需安装任何工具

### 📦 导出本地图片
```bash
# 一次性安装
npm install -g @mermaid-js/mermaid-cli

# 导出此文件中的所有图表
mmdc -i FLOWCHART_DIAGRAMS.md -o ./diagrams/
```

### 🖥️ VS Code 内预览
1. 安装插件：**Markdown Preview Mermaid Support**
2. 打开此文件，按 `Ctrl+Shift+V` 预览
3. 右键图表导出为PNG

---

## 🎯 图表速查表

| # | 名称 | 重点关注 | 用途 |
|----|------|----------|------|
| 1️⃣ | 系统初始化流程 | 启动顺序、轮询、数据变化检测启动时机 | 了解应用如何启动 |
| 2️⃣ | syncFromCloud决策树 | 冲突检测和数据保护判断顺序 | 理解云端同步的完整逻辑 |
| 3️⃣ | 本地数据变化处理流程 | 渐进式vs大操作的备份触发策略 | 理解备份的触发机制 |
| 4️⃣ | autoBackup执行细节 | syncToCloud→saveBackup→缓存失效顺序 | 深入理解备份一致性保障 |

**建议阅读顺序**：图1 → 图2 → 图3 → 图4（从全景到细节）

---

## ⚠️ 关键数据流程注意点

1. **未登录时不进入同步流程**
   - `AuthUI.init()` 检测登录状态后，若未登录直接返回
   - 不调用 `DataSync.initialize()`，不访问后端

2. **冲突标记的正确生命周期**
   - ✅ **正确做法**：`syncFromCloud` 内部，两端哈希不同时弹冲突对话框；解决后两端哈希匹配，下次同步自然走 NO_CHANGE 分支，不再弹框
   - ❌ **不再需要** `conflictCheckFlag`：冲突解决后数据一致，本身就不会再冲突

3. **syncFromCloud 的判断顺序（重要）**
   - 先检查**两边是否都为空** → 是则直接结束
   - 再做**哈希对比** → 相同则直接结束
   - 哈希不同时，检查**本地是否有数据** → 为空则直接下载云端
   - 本地有数据时，检查**云端是否有数据**
     - 云端无数据 → 上传本地（保护本地不丢失）
     - 云端有数据 → 弹冲突对话框

4. **数据变化事件驱动（替代轮询）**
   - ✅ **渐进式操作**（新增/修改/删除/收藏标记/起始序号）：本地变更 → 刷新界面 → 1分钟延迟备份（计时期间再有同类操作**不重置计时**，到期统一备份）
   - ✅ **大操作-触发备份**（在线恢复/本地导入）：本地变更 → 刷新界面 → 立即备份
   - ✅ **大操作-不备份**（清空数据）：清空本地 → 刷新界面 → 清空后端数据 → 刷新状态展示
   - ❌ **不再使用** 5分钟轮询检测 和 10分钟定时备份任务

5. **本地操作优先，网络操作靠后**
   - 数据变化后**先更新本地存储**，**再立即刷新界面**，最后才做后端上传/备份
   - 用户看到界面变化不需要等待网络完成

6. **autoBackup 执行时序**
   - ✅ 先 `syncToCloud` 将最新数据上传
   - ✅ 再 `saveBackup` 创建备份快照
   - ✅ 成功后 `cachedBackupList = null` 使缓存失效
   - ✅ 最后 `updateSyncStatus` 刷新显示
   - ❌ **不能在 syncToCloud 前就 saveBackup**（否则备份的是旧数据）

7. **浮动提示机制**
   - 所有数据操作（备份/还原/清空/同步）完成后显示浮动提示
   - 位置：左下角，5秒自动消失
   - 格式：统一的 success / error / warning 颜色分类

---

## 🔗 相关文档

- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统整体架构
- [code_requirements.md](code_requirements.md) - 代码规范和标准

---

**最后更新**: 2026年2月26日
**版本**: 前端1.2.0 / 后端1.2.0
**样式**: ✨ 中文黑底白字，高对比度易阅读
