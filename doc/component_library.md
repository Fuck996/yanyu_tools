# 组件库抽象方案

目标：将本项目中可复用的前端与后端模块抽象为组件/包，便于在未来项目中快速集成与复用。

1. UI 组件（前端）
   - `AppShell`：应用壳体（主题管理、全局状态挂载、错误边界）。
   - `TopNav`：顶部导航和统计区（包含 Badge、系统切换）。
   - `ControlPanel`：右上角操作面板（导出/导入/主题/清空等）。
   - `LocGrid`：可复用双列对比网格（支持表格/卡片两种渲染模式）。
   - `AttrPicker`：属性选择器弹窗（支持品质限制、智能提交、移动端底部 sheet 模式）。
   - `ListRow`：序列行组件（包含编辑、收藏、删除操作和行内标签渲染）。
   - `Modal` / `Sheet`：通用模态与底部弹出组件（可配置动画、回调）。
   - `ThemeToggle`：主题开关 + 本地持久化逻辑。

2. 数据与逻辑层（前端库）
   - `local-storage-manager`：统一的 localStorage 读写、版本迁移（fixOldData）、导入/导出接口。
   - `data-sync`：离线优先同步引擎（变更队列、重试、冲突策略、时间戳合并）。
   - `api-client`：封装 REST 调用、重试与鉴权（Cookie/Token）逻辑。
   - `ui-manager`：渲染驱动的 UI 更新调度（避免直接操作 DOM 的重复代码）。

3. 后端组件（Node.js）
   - `auth-github`：GitHub OAuth 抽象（Passport 配置封装、回调处理、token 管理）。
   - `records-service`：装备记录 CRUD 层（路由 + sqlite 访问封装 + 基本校验）。
   - `sync-engine`：合并策略与冲突处理逻辑（基于时间戳与会话冲突标志）。
   - `utils/logger`：统一日志接口（JSON 输出，环境切换为 console/file）。

4. 工具与脚手架
   - `scripts/sync-version`：版本同步工具（已实现）。
   - `scripts/release`：打包与生成 zip 的脚本（可扩展为 GitHub Release 流程）。

5. 发布与包化建议
   - 将前端组件整理为一个轻量 NPM 包（或单文件 UMD）以便在非模块化项目中使用。
   - 后端可拆分为微包：`yanyu-auth`、`yanyu-records`，便于在其他项目复用。

6. 优先级与里程碑
   - 第一阶段（短期，1 周）：抽取 `local-storage-manager`、`api-client`、`AttrPicker`。
   - 第二阶段（中期，2-4 周）：整理 `data-sync` 为独立库并加入测试用例。
   - 第三阶段（长期）：发布 NPM 包、添加 CI/CD 发布流程与示例项目。
