# 可形成 skill 的方法与沟通加速做法

目标：总结本项目中可复用的方法论与团队沟通机制，形成一组 skill，以便提高后续协作效率。

1. 技术 skill（可形成模板/脚本）
   - 版本与发布流程 Skill：`sync-version` + `release` 脚本，包含 CHANGELOG/版本号同步、打 tag、生成发布包流程的标准化脚本。
   - 离线优先同步 Skill：变更队列、时间戳合并、冲突标志（会话级冲突检测），可封装为一套 SDK（示例：enqueueChange()/flushQueue()）。
   - 数据迁移 Skill：编写 `fixOldData()` 模式的迁移辅助函数集合（按版本分支迁移、自动化单元测试）。
   - 文档同步 Skill：在 CI 中运行版本注入脚本并生成带版本号的文档副本，防止文档与代码脱节。

2. 开发流程与沟通 Skill
   - 变更最小化原则：每次 PR 控制在单一目标（bugfix / feature / docs），便于版本号语义化与回滚。
   - 快速复现包：合并改动后自动生成 `release/*.zip` 以便 QA/同事快速跑本地环境。
   - 变更说明模板：在 PR 描述中必须包含“问题背景、变更内容、测试步骤、兼容性说明、版本影响（Major/Minor/Patch）”五项。
   - 会议外快速同步：对重要变更在项目 Chat 中以三行要点总结（What / Why / Next steps）。

3. 代码复用与 Review Skill
   - 组件契约（Contract）模板：为每个组件明确输入（props）、输出（events）、副作用（IO）与示例用法。
   - 小而频繁的重构：使用 `refactor` 分支并配合小型测试套件，降低大型重构带来的冲突成本。
   - Review Checklist：功能正确性、边界条件、性能（尤其是列表渲染）、安全（不泄露敏感信息）、文档/测试覆盖。

4. 交付与维护 Skill
   - 自动化健康检查：CI 在 PR 合并前自动运行 lint、基本 smoke 测试、版本检查（是否已更新 CHANGELOG 与 package.json）。
   - 回滚策略：保留上一个可运行的 zip 包，tag 对应的发布记录，并在 README 写明回滚步骤。

5. 知识库建设
   - 形成 FAQ 与常见问题模板（OAuth 配置、CORS、DB 文件位置、备份恢复流程）。
   - 将重要方法以短视频或 GIF 形式记录在 `doc/` 下，便于新人快速上手。
