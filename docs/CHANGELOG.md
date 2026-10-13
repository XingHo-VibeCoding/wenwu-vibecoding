# 更新日志（Changelog）

本项目自 2026-10-11 起用本文件记录**版本级**变更（日常实现细节见 `.workbuddy/memory/` 日记）。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；版本号遵循语义化版本。

---

## [v1.1] — 2026-10-13

在 v1.0 基础上**新增内容与接口**（非修 bug 版）：从 6 本仪器说明书 PDF 抽取**仪器面板示意图**，并补录**按键介绍**。冻结提交 = Day 29 提交（tag `v1.1`）。

线上地址：`https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/`

### Added
- **仪器面板图 6 张**（WebP，合计 423 KB，存 `web/public/img/panels/` → 桶内 `wenwu-vibecoding/img/panels/`）：曲线图示仪 75K / 示波器 153K / 信号发生器 53K / 万用表 97K / LCR 表 19K / 直流电源 35K。按需 dpi 抽取（示波器 520、万用表 400、信号源 300；GPS-2303C 源为 96dpi 扫描位图，已到顶）。
- **按键介绍 146 条**（WQ4830 36 / GDS-1102B 38 / AFG-2225 17 / GDM-8341 14 / LCR-6002 12 / GPS-2303C 29）：按键名 + 功能说明 + **印刷页码出处**。LCR-6002 说明书无功能描述 → `function_desc` 留 `NULL`（**不编造**）。
- **数据库 5 表 → 7 表**：新增 `panels`（面板图，每台 1 行）+ `panel_keys`（按键，挂 `device_type`）。迁移脚本 `db/migration-day28.sql`（`CREATE TABLE IF NOT EXISTS` + 单独 `GRANT SELECT … TO anon`，可重复执行、无 `DROP`）。
- **新接口 `GET /api/panels`**：读接口 **6 → 7**（合计 10 个）。支持 `?type=<设备>` 筛选，非法 `type` → `400 invalid_param`；响应 `items[].keys[]` 嵌套。
- **云开发版**：新增「仪器面板」区块（`web/src/components/PanelCard.jsx`：默认收起、点标题展开、图可点开原图、按键表、裂图兜底），与原有设备筛选**联动**；面板数据**独立加载**（`web/src/hooks/usePanels.js`），失败时降级只影响本区块。
- **静态站版**：6 图 base64 内联 + 146 条按键写死（`index.html` 87 KB → **678 KB**，红线 800 KB 内）；含**页内放大浮层**与联动筛选，仍守 AC-14④「断网可用」（实测 `file://` 零网络）。

### Changed
- `api-contract.md` 升 **v2.0**：新增 §3.6 两表定义、§4.7 `/api/panels`、授权行、§5.1 现状（6 读 → 7 读）。
- **发布前检查 7 项 → 8 项**（`skills/verify-project/SKILL.md` + `tests/verify-project-run.py`）：
  - 检查 5 模式**收紧为三段式 JWT** `eyJ…{8,}\.…{8,}\.…{8,}`（原宽模式会被 `index.html` 里 577 KB 的 base64 图误命中）。
  - **新增检查 8「静态站链接口径」**：全文 `href="#…"` 必须匹配 `#/view/anchor`（刻意不过滤 JS 模板里的 href）。
  - 检查 1 **纳入 6 张面板图字节数**核对；检查 3 扩到 6 路（含 `?type=bogus` 400）；检查 7 扩到 6 表。

### Fixed
- **静态站 S1–S4 场景卡片链接**（`sceneCard()`）：裸锚点 `href="#scene-1"` → `href="#/transfer/scene-1"`。裸锚点不被 hash 路由识别（视图名不在 `VIEWS` 内）→ **回落默认视图 `search`**，点卡片会跳到搜索页。Day 13 上路由时漏改，**潜伏 16 天**，Day 29 发现并修复（全文此类裸锚点仅此 1 处）。

### 已知局限（v1.1 带发布）
- **AC-08 难度与耗时**：仍 **3/20 有值**（step1 `1★/0分`、step2 `1★/1分`、step3 `1★/1分` 中间态），其余 17 步 `null`。口径不变：只能真实实测，不得编造。
- `tests/check-live-version.py` **不校验 `img/panels/*.webp`**（图不在 `index.html` 里被引用）——由检查 1 兜住。
- 未做：软删除 `is_deleted`；前端请求日志；搜索支持设备名。

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
