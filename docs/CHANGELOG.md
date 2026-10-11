# 更新日志（Changelog）

本项目自 2026-10-11 起用本文件记录**版本级**变更（日常实现细节见 `.workbuddy/memory/` 日记）。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；版本号遵循语义化版本。

---

## [v1.0] — 2026-10-11

首个正式发布版本。冻结提交 **`d3ad504`**（Day 26，2026-10-10），发布验收 2026-10-11。

线上地址：`https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/`

两版并存，判定口径**不混用**：静态站版（根 `index.html`，单文件）判 AC-01~15；云开发版（`web/`）判 AC-16~18。

### Added
- **云开发版前端**（`web/`，Vite + React）：4 个视图 —— `#/search`、`#/transfer`、`#/device`、`#/scene/<id>`（场景详情）；**三态渲染**（`loading` / `ready` / `fallback`，降级用内置离线内容 `mock.js`）。
- **全局错误模型**（`web/src/api/client.js`）：`ApiError` 统一 `kind` 三类 —— `input`(4xx) / `network`(发不出·超时 8s·非 JSON) / `server`(5xx)；文案**透传后端 `message`**。
- **云函数后端**（`cloudfunctions/scenes/`）：分层 `index.js`（接口层：路由/校验/响应）+ `repository.js`（数据层：`REST_BASE` 唯一持有者）。连库 = CloudBase PG REST（PostgREST）+ 零依赖 `fetch`。
- **接口 9 个**：读 6（`/api/health`、`/api/scenes`、`/api/scenes/:id`、`/api/resources`、`/api/instruments`、`/api/tasks`）+ 写 3（`POST /api/steps/measure`、`PATCH /api/steps/measure`、`DELETE /api/tasks/:id`）。
- **数据库 5 表**：`scenes` / `steps` / `resources` / `instruments` / `tasks`（`db/schema.sql` + `db/seed.sql`）。
- **发布前检查 Skill**（`skills/verify-project/SKILL.md`）：7 项检查 + 执行器 `tests/verify-project-run.py`；可复用设计/运维基线另有 `skills/frontend-design-baseline/`、`skills/cloudbase-postgres-ops/`。
- **线上版本校验器**（`tests/check-live-version.py`）：按「产物文件名 + 字节数 + 特征串」判定线上版本。
- **发布/回滚文档**：`docs/RELEASE-v1.0.md`、`docs/ROLLBACK.md`（含首次真实回滚演练记录）。

### Changed
- `api-contract.md` 升 **v1.9**：订正 §4.6 `DELETE /api/tasks/<非法id>` 的 `error`（误记 `bad_task_id` → 实测 **`invalid_param`**）。
- `README.md` 通读订正：视图数、接口数、云函数目录、文档版本号、线上状态。
- 发布前检查的检查项 5 表述订正：`git grep` **只扫已跟踪文件，不含历史提交**（原文误写"全历史"）。

### Fixed
- 搜索结果链接回归：`SearchView.jsx` 仍指向旧路由 `#/transfer/<id>` → 改为 `#/scene/<id>`（Day 25）。
- JSX 字符串拼接渲染成 `[object Object]`（`"串" + <元素/>` 混排必须写成 `{expr}` 子元素）。
- 徽标 / 页脚过时文案：`Day 20 · React · 云数据库数据` → `云数据库数据 · 实时`；页脚 `2026-10-04` → `2026-10-09`。

### 已知局限（v1.0 带发布）
- **AC-08 难度与耗时**：20 步中仅 **3 步有值**（step1 `1★/0分`、step2 `1★/1分`、step3 `1★/1分` 中间态），其余 17 步为 `null`。口径：只能真实实测，不得编造（写入不可撤销）。
- 发布前检查**不跑写接口成功路径**（会不可撤销地改线上库）、**不覆盖 git 历史提交**。
- 未做：软删除 `is_deleted`；前端请求日志；搜索支持设备名（`matchKeyword` 只查 `title` + `keywords`）。
