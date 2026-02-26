# 代码开发基本规范 (Code Requirements)

为了保证项目的长期可维护性和协作效率，所有代码编写必须遵循以下基本规范：

## 1. 层级与结构 (Hierarchy & Structure)
- **模块化**: 代码应保持清晰的层级关系，逻辑功能应尽可能拆分为独立的函数或模块。
- **可读性**: 避免编写冗长、嵌套过深的逻辑块。长函数应根据功能逻辑进行合理拆分。
- **排版**: 保持统一的缩进（推荐 4 空格或 2 空格）和合理的换行，使代码结构一目了然。

## 2. 编写习惯 (Coding Habits)
- **避免长串编写**: 禁止在单行编写过长的表达式或连续调用。复杂的逻辑应分步实现，并赋值给具有描述性的变量名。
- **命名规范**: 变量和函数命名应具有明确的语义化，避免使用无意义的单字母命名（循环变量除外）。

## 3. 注释与文档 (Comments & Documentation)
- **注释保留**: 在进行功能更新或代码重构时，**必须保留核心逻辑的注释**。严禁在更新代码的同时无故删除原有的说明性注释。
- **新增说明**: 对新增的复杂逻辑、特殊算法或关键补丁（Hotfix），必须添加清晰的注释说明其用途。
- **文档同步**: 如果代码逻辑发生了重大变更，应同步更新 `doc/` 文件夹下的设计文档。

## 4. 前端特定要求 (Frontend Specific)
- **CSS 规范**: 样式层级应与 HTML 结构保持一致。推荐使用 CSS 变量来管理颜色、间距等主题要素。
- **数据解耦**: 核心数据（如属性池、配置项）应与视图渲染逻辑分离，便于后续维护和扩展。

## 5. 版本号管理 (Version Management)
- **格式规范**: 版本号遵循 `V<主版本号>.<次版本号>.<修订号>` 的格式，例如 `V4.7.31`。
  - `主版本号 (Major)`: 发生重大架构调整或功能重构时递增。
  - `次版本号 (Minor)`: 增加新功能或对现有功能进行较大优化时递增。
  - `修订号 (Patch)`: 修复 Bug、进行小幅优化或文档更新时递增。
- **更新要求**: **每次代码或文档更新，无论大小，都必须至少递增修订号。**
- **同步位置**: `index.html` 中 `title` 和 `version-footer` 的版本号必须与实际版本保持一致。

### 5.1 前后端版本一致规则

- **单一来源 (Single Source of Truth)**: 仓库根目录的 `package.json` 的 `version` 字段作为本仓库的“整体版本号”。任何需要展示或使用项目版本号的前端页面或后端 `package.json` 应与根目录 `package.json` 保持一致或通过发布脚本自动同步。
- **前后端对应**: 后端 `package.json` 中的 `version` 字段应与根目录 `package.json` 完全一致（例如：根为 `1.2.1`，后端也应为 `1.2.1`）。前端页面（`index.html` 的 title、`version-footer`、各文档页的 Footer）应展示相同的版本号或从根目录自动注入。
- **禁止硬编码多处版本号**: 禁止在多个文件中手动维护不同版本号（例如 README、doc 文件、HTML footer 等）。若确有需要展示历史/组件版本，应明确标注为组件版本而非项目整体版本。
- **变更流程**: 发布新版本时应执行下列步骤：
  1. 在 `CHANGELOG.md` 中添加条目并写明版本号。
  2. 更新根目录 `package.json` 的 `version` 字段。
  3. 运行 `scripts/sync-version.js`（或手动脚本）同步后端 `package.json` 和需要注入版本号的文档/页面。
  4. 生成发布包并在 Git 中打 tag（如 `v1.2.1`）。
- **自动化建议**: 推荐添加一个简单的同步脚本 `scripts/sync-version.js`，读取根目录 `package.json` 并把 `version` 写入 `backend/package.json`、README footer（或生成 README），以及注入到 `index.html` 的 `version-footer`，以避免人工出错。

## 6. 移动端兼容规范 (Mobile Compatibility)

### 6.1 断点触发条件
- **判断方式**：使用 JavaScript 计算视口高宽比，而非 CSS Media Query，以保证实时响应和统一逻辑。
- **触发条件**：当 `window.innerHeight / window.innerWidth > 1.5` 时，切换至移动端布局；否则使用桌面端布局。
- **实现方式**：通过在 `<body>` 元素上切换 `.mobile-view` 类来控制。
- **触发时机**：页面加载时（`init()` 内）以及 `window.resize` 事件时均需重新检测，函数名为 `checkLayout()`。
- **规范函数**：
  ```js
  function isMobileLayout() { return window.innerHeight / window.innerWidth > 1.5; }
  function checkLayout() {
      document.body.classList.toggle('mobile-view', isMobileLayout());
      // 移动端时调用 renderMobileAll()，桌面端无需操作
  }
  ```

### 6.2 布局切换原则
- **桌面端元素**：`.control-panel`、`.top-container`、`#mainGrid`、`#statusBackupContainer`、`.version-footer` 在 `body.mobile-view` 时通过 CSS `display:none !important` 隐藏，**不得删除 HTML 结构**。
- **移动端壳体**：所有移动端 UI 元素集中在 `#mobile-shell` 内，默认 `display:none`，仅在 `body.mobile-view` 时显示。
- **共用逻辑**：JS 业务逻辑函数（`openPicker()`、`saveFinal()`、`toggleStar()` 等）**必须同时适用**于桌面端与移动端，**不得为移动端单独拷贝逻辑**。
- **数据共享**：`curType`、`curSystem`、`tempEntry` 等全局状态变量由两套 UI 共用。

### 6.3 移动端 UI 结构
- **Header**：Logo 图标 + 系统/装备切换按钮 + 汉堡菜单按钮。
- **位置分段**：两个等宽切换按钮，对应当前系统的两个地点（`LOC_MAP[curSystem]`），使用 `.m-loc-btn.active` 标记当前选中。
- **列头**：两列，每列显示装备名 + 起始次数输入 + ＋新增按钮（虚线样式）。
- **数据区**：可滚动 table，仅展示当前选中地点的数据，结构与桌面端一致（序号列 + 两列装备）。
- **系统弹窗**：居中模态框，顶部选项卡切换铸造/缝纫，下方为装备 Chip 网格（4列），点击 Chip 同时完成系统切换+装备切换并关闭弹窗。
- **菜单 Sheet**：从底部滑入，包含：连接状态、备份信息、操作按钮网格、退出登录按钮。
- **属性选择器**：复用桌面端 `#attrPicker` 弹窗，移动端通过 CSS 将其改为底部 Sheet 样式；新增时顶部展示品质选择 Chip 行（`.m-q-chip`），编辑时顶部展示标题行（含 ★/🗑️ 图标按钮）。

### 6.4 移动端状态变量
- `curMobileLoc`：当前移动端选中的地点，切换系统时自动重置。
- 属性选择器移动端品质状态：通过 `tempEntry.q` 管理，为 `null` 时表示尚未选择品质（移动端新增模式）。

## 7. 动画使用规范 (Animation Guidelines)

### 7.1 底部 Sheet 动画
- **滑入**：使用 `@keyframes sheetSlideUp`（从 `translateY(100%)` 到 `translateY(0)`），duration `0.3s ease-out`。
- **滑出**：为元素添加 `.closing` 类触发 `@keyframes sheetSlideDown`，在 `animationend` 事件后隐藏元素。
- **遮罩**：配套的 `.m-sheet-overlay` 使用 `@keyframes mFadeIn`（`opacity: 0 → 1`），关闭时追加 `.closing` 类触发反向动画。

### 7.2 居中弹窗动画
- 居中模态框（如系统切换弹窗）使用 `@keyframes mModalPop`（`scale(0.9)+opacity:0 → scale(1)+opacity:1`），duration `0.25s ease-out`。

### 7.3 下拉动画
- 下拉菜单使用 `@keyframes slideDown`（`translateY(-8px)+opacity:0 → translateY(0)+opacity:1`），已有实现，新增时遵循相同规范。

### 7.4 使用原则
- **凡 Sheet/Modal 打开必须有动画**，关闭建议有反向动画（至少淡出）。
- 动画 duration 不超过 `0.35s`，避免影响操作流畅感。
- 不得对频繁重渲染的列表行（table row）添加 transition/animation。

---
*本规范作为项目开发的基本要求，所有代码提交应严格遵守。*
