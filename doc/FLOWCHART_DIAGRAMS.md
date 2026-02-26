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

    C --> D{OAuth回调?<br/>handleOAuthCallback}
    D -->|"✅ 有回调(新登录)"| E["更新UI显示<br/>设置 newLogin=true"]
    D -->|"无回调"| F{本地已有<br/>用户信息?}

    F -->|"✅ 有"| G["更新UI显示<br/>恢复登录状态"]
    F -->|"❌ 无"| H["🔒 未登录<br/>显示登录按钮"]
    H --> H1["updateSyncStatus<br/>显示未登录提示"]
    H1 --> END["🏁 结束初始化<br/>不进入同步流程"]

    E --> SYNC_START["进入数据同步<br/>DataSync.initialize"]
    G --> SYNC_START

    SYNC_START --> I{newLogin=true?}
    I -->|"✅ 是"| J["进入 syncFromCloud<br/>触发冲突检测"]
    I -->|"❌ 否(恢复会话)"| K["进入 syncFromCloud<br/>⚠️ 此会话已检测过, 跳过冲突"]

    J --> SYNC_DONE
    K --> SYNC_DONE

    SYNC_DONE["同步完成"] --> L["enableAutoSync<br/>启动5分钟轮询"]
    L --> M["首次 autoBackup"]
    M --> N["设置10分钟定时备份"]
    N --> O["绑定 beforeunload<br/>页面卸载前备份"]
    O --> P["✨ 系统就绪"]

    style A fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style H fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style END fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style SYNC_DONE fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style P fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
    style J fill:#5d4037,stroke:#ff6f00,stroke-width:2px,color:#fff
```

---

## 📊 图表2：syncFromCloud 决策树（修正版）

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A["▶️ 开始<br/>syncFromCloud"] --> B{已认证?}
    B -->|"❌ 否"| FAIL["返回 FAILED<br/>错误: 未认证"]
    B -->|"✅ 是"| C["📥 获取云端数据<br/>ApiClient.getRecords"]

    C --> D["🔍 检查本地数据<br/>getEquipmentData"]
    D --> E{本地有数据?}

    E -->|"❌ 本地为空"| F{云端<br/>有数据?}
    F -->|"❌ 云端也为空"| G["✨ 无需操作<br/>返回 NO_CHANGE"]
    F -->|"✅ 云端有数据"| H["⬇️ 直接下载<br/>mergeCloudData<br/>保存本地"]
    H --> H1["🎨 刷新界面<br/>renderNav / renderMain"]
    H1 --> H2["✅ 返回 SUCCESS<br/>recordCount=N"]

    E -->|"✅ 本地有数据"| I["⚖️ 哈希对比<br/>提示: 数据比较中..."]
    I --> J{云端<br/>有数据?}

    J -->|"❌ 云端为空"| K["⬆️ 上传本地数据<br/>保护本地不丢失<br/>syncToCloud"]
    K --> K1["✅ 返回 SUCCESS<br/>本地已备份到云端"]

    J -->|"✅ 云端有数据"| L{哈希<br/>是否一致?}
    L -->|"✅ 一致"| M["✨ 数据相同<br/>返回 NO_CHANGE"]

    L -->|"❌ 不一致"| N{本会话已<br/>处理过冲突?}
    N -->|"✅ 已处理"| O["⬇️ 使用云端数据<br/>mergeCloudData<br/>保存本地"]
    O --> O1["🎨 刷新界面"]
    O1 --> O2["✅ 返回 SUCCESS"]

    N -->|"❌ 首次冲突"| P["⚠️ 提示用户解决冲突<br/>本地N条 vs 云端M条"]
    P --> Q{用户选择}

    Q -->|"保留本地"| R["⬆️ 上传本地数据<br/>syncToCloud"]
    R --> R1["🔒 标记冲突已处理<br/>setConflictCheckFlag"]
    R1 --> R2["✅ 返回 SUCCESS"]

    Q -->|"使用云端"| S["⬇️ 下载云端数据<br/>mergeCloudData<br/>保存本地"]
    S --> S1["🎨 刷新界面<br/>renderNav / renderMain"]
    S1 --> S2["🔒 标记冲突已处理<br/>setConflictCheckFlag"]
    S2 --> S3["✅ 返回 SUCCESS"]

    style A fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style FAIL fill:#3c1515,stroke:#ff4444,stroke-width:2px,color:#fff
    style G fill:#4a148c,stroke:#bb86fc,stroke-width:2px,color:#fff
    style M fill:#4a148c,stroke:#bb86fc,stroke-width:2px,color:#fff
    style K fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style H fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style P fill:#6b3a00,stroke:#ff6f00,stroke-width:2px,color:#fff
    style R1 fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
    style S2 fill:#1b3a2f,stroke:#4caf50,stroke-width:2px,color:#fff
```

> **⚠️ 关键说明**：  
> - 冲突标记 (`conflictCheckFlag`) 只在 **syncFromCloud内冲突解决后** 才标记，不在外部清除  
> - 未登录不进入此流程  
> - 哈希比对只发生在本地有数据时

---

## 📊 图表3：备份/恢复/清空流程

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    subgraph BACKUP["💾 手动备份 saveManualBackup"]
        B1["▶️ 开始"] --> B2{已认证?}
        B2 -->|否| B3["❌ 显示错误"]
        B2 -->|是| B4["📊 获取本地数据"]
        B4 --> B5{有数据?}
        B5 -->|是| B6["📤 先同步到云端<br/>syncToCloud"]
        B5 -->|否| B7["继续执行"]
        B6 --> B7
        B7 --> B8["💾 保存备份<br/>ApiClient.saveBackup"]
        B8 --> B9{成功?}
        B9 -->|是| B10["📊 更新显示"]
        B9 -->|否| B11["❌ 显示错误"]
        B10 --> B12["✨ 完成"]
        B11 --> B12
        B3 --> B12
    end
    
    subgraph RESTORE["♻️ 手动恢复 restoreManualBackup"]
        R1["▶️ 开始"] --> R2["📋 获取备份列表<br/>5分钟缓存"]
        R2 --> R3{列表有效<br/>有备份?}
        R3 -->|否| R4["⚠️ 显示无备份"]
        R3 -->|是| R5["🔍 查找手动备份"]
        R5 --> R6{找到?}
        R6 -->|否| R4
        R6 -->|是| R7["💬 显示确认<br/>对话框"]
        R7 --> R8{用户确认?}
        R8 -->|否| R9["❌ 取消"]
        R8 -->|是| R10["🔄 恢复备份<br/>ApiClient.restoreBackup"]
        R10 --> R11["⏳ 显示加载中"]
        R11 --> R12["📥 获取最新数据<br/>ApiClient.getRecords"]
        R12 --> R13{成功?}
        R13 -->|否| R14["❌ 显示错误"]
        R13 -->|是| R15["🔀 合并数据<br/>mergeCloudData"]
        R15 --> R16["💾 保存本地"]
        R16 --> R17["🎨 刷新界面"]
        R17 --> R18["🚀 执行自动备份<br/>autoBackup"]
        R18 --> R19["📊 更新显示<br/>⚠️ 关键:先验证数据再备份"]
        R19 --> R20["✨ 完成"]
        R14 --> R20
        R9 --> R20
        R4 --> R20
    end
    
    subgraph CLEAR["🗑️ 清空数据 clearAllData"]
        C1["▶️ 开始"] --> C2["💬 确认对话框"]
        C2 --> C3{用户确认?}
        C3 -->|否| C4["❌ 取消"]
        C3 -->|是| C5["🔄 清空本地<br/>LocalStorage"]
        C5 --> C6["🎨 立即刷新界面"]
        C6 --> C7{已认证?}
        C7 -->|否| C8["✨ 完成"]
        C7 -->|是| C9["📡 清空后端数据<br/>ApiClient.clearBackendData"]
        C9 --> C10{成功?}
        C10 -->|是| C11["✅ 记录成功"]
        C10 -->|否| C12["⚠️ 记录警告<br/>继续"]
        C11 --> C13["🔄 缓存失效<br/>cachedBackupList = null<br/>cachedBackupListTime = 0"]
        C12 --> C13
        C13 --> C14["🔄 重新更新状态<br/>updateSyncStatus"]
        C14 --> C8
        C4 --> C8
    end
    
    BACKUP --> AFTER["→ 更新备份状态<br/>updateSyncStatus"]
    RESTORE --> AFTER
    CLEAR --> AFTER
    
    style BACKUP fill:#5d4037,stroke:#ff6f00,stroke-width:2px,color:#fff
    style RESTORE fill:#1a237e,stroke:#7c4dff,stroke-width:2px,color:#fff
    style CLEAR fill:#b71c1c,stroke:#ff5252,stroke-width:2px,color:#fff
    style AFTER fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
```

---

## 📊 图表4：缓存失效与UI刷新机制

```mermaid
%%{init: {'theme':'dark'}}%%
graph TD
    A["👤 用户点击'清空'"] --> B["💬 确认对话框"]
    B --> C{用户确认?}
    C -->|否| D["↩️ 返回"]
    
    C -->|是| E["🔄 清空本地<br/>存储"]
    E --> F["🎨 立即刷新界面<br/>renderNav + renderMain"]
    F --> G["✅ 显示成功<br/>浮动提示"]
    
    G --> H{已认证?}
    H -->|否| I["🏁 结束"]
    
    H -->|是| J["📡 调用后端清空<br/>ApiClient.clearBackendData"]
    J --> K{成功?}
    K -->|失败| L["⚠️ 记录警告<br/>继续进行"]
    K -->|成功| M["✅ 记录成功"]
    
    L --> N["🔄 缓存失效<br/>① cachedBackupList = null<br/>② cachedBackupListTime = 0"]
    M --> N
    
    N --> O["🔓 重置状态<br/>isUpdatingStatus = false"]
    O --> P["🔄 重新获取<br/>updateSyncStatus"]
    P --> Q["📥 查询备份列表<br/>ApiClient.getBackupList"]
    
    Q --> R{有备份记录?}
    R -->|有| S["📊 更新显示数量"]
    R -->|无| T["显示 '—'<br/>无备份"]
    
    S --> U["🎨 刷新PC端卡片<br/>autoBackupItem<br/>manualBackupItem"]
    T --> U
    
    U --> V["📱 刷新移动端卡片<br/>mAutoBackupTime<br/>mManualBackupTime"]
    V --> W["✨ 显示完成<br/>浮动提示"]
    W --> I
    
    style A fill:#b71c1c,stroke:#ff5252,stroke-width:2px,color:#fff
    style E fill:#6b5104,stroke:#ffb300,stroke-width:2px,color:#fff
    style F fill:#6b5104,stroke:#ffb300,stroke-width:2px,color:#fff
    style N fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
    style P fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#fff
    style W fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
    style I fill:#0d6e41,stroke:#4caf50,stroke-width:2px,color:#fff
```

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
| 1️⃣ | 系统初始化流程 | 启动顺序和定时器 | 了解应用如何启动及备份策略 |
| 2️⃣ | syncFromCloud决策树 | 冲突检测和数据保护 | 理解云端同步的完整逻辑 |
| 3️⃣ | 备份/恢复/清空流程 | 操作顺序和缓存处理 | 追踪数据相关操作的完整链路 |
| 4️⃣ | 缓存失效与UI刷新 | 缓存清理时机 | 深入理解数据一致性的保障 |

**建议阅读顺序**：图1 → 图2 → 图3 → 图4（从全景到细节）

---

## ⚠️ 关键数据流程注意点

1. **未登录时不进入同步流程**
   - `AuthUI.init()` 检测登录状态后，若未登录直接返回
   - 不调用 `DataSync.initialize()`，不访问后端

2. **冲突标记的正确生命周期**
   - ❌ **错误做法**：在初始化时或同步前清除冲突标志（会导致每次页面刷新都弹冲突框）
   - ✅ **正确做法**：冲突标志只在 `syncFromCloud` 内，冲突解决完成 **之后** 才设置（`setConflictCheckFlag`）
   - 一旦设置，本会话内不再弹冲突框；新登录会话则重新触发

3. **syncFromCloud 的判断顺序（重要）**
   - 先检查**本地是否有数据**，为空则直接下载云端
   - 本地有数据时，再检查**云端是否有数据**
     - 云端无数据 → 上传本地（保护本地不丢失）
     - 云端有数据 → 哈希比对 → 相同则结束，不同则冲突解决

4. **还原数据时的时序**
   - ✅ 先 `restoreBackup` API 恢复后端
   - ✅ 再 `getRecords` 获取最新数据并合并
   - ✅ 最后 `autoBackup` 执行自动备份
   - ❌ **不能在merge前就执行backup**（否则备份的是0条数据）

5. **缓存失效必须点**
   - 清空/备份/还原完成后：`cachedBackupList = null` + `cachedBackupListTime = 0`
   - UI刷新前必须执行缓存失效，确保显示最新备份状态

6. **浮动提示机制**
   - 所有数据操作（备份/还原/清空/同步）完成后显示浮动提示
   - 位置：左下角，5秒自动消失
   - 格式：统一的 success / error / warning 颜色分类

---

## 🔗 相关文档

- [sync_flowchart_guide.md](sync_flowchart_guide.md) - 详细文字说明和代码位置
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统整体架构
- [code_requirements.md](code_requirements.md) - 代码规范和标准

---

**最后更新**: 2026年2月26日  
**版本**: 前端1.2.0 / 后端1.2.0  
**样式**: ✨ 中文黑底白字，高对比度易阅读
