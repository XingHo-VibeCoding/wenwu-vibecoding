---
name: verify-project
description: 《电子设备使用指南》发布前检查清单与执行口径。每次改动上线前（或需要确认线上是否健康时）运行：逐项检查公网首页可访问且为真数据、GET /api/health、读写接口、硬编码密钥（源码 + git 全历史）、.gitignore/.env.example、数据库与核心表可达。输出一律 [PASS]/[FAIL] + 证据（命令原文 + 关键输出行），禁用"看起来正常"这类模糊表述。触发词：发布前检查、上线前检查、跑一遍检查、verify-project、验收检查、PASS/FAIL。
agent_created: true
---

# 发布前检查（verify-project）

> **来源**：Day 26（2026-10-10）产出。检查项**全部来自本项目真实踩过的坑**，不是通用模板。
> **性质**：一套**可重复执行**的验收动作。每次改动上线前跑一遍，用证据替代"我感觉没问题"。
> **不做**：不产出新功能；不接入 CI / 自动化流水线（本期明确不做）。

## 适用时机

- 每次 `dist/` 上传后、宣布"上线完成"之前
- 修完 Bug、想确认**没把别处弄坏**（回归）时
- 用户说「跑发布前检查」「上线前检查」「按 verify-project 跑一遍」时

## 怎么调用

在对话里说一句 **「跑发布前检查」**（或「按 verify-project 跑一遍」），AI 读本文件后逐项执行、逐项给 `[PASS]/[FAIL] + 证据`，最后给 `小结：PASS n / FAIL m`。

> ⚠️ **前置**：若怀疑源码有未构建的改动，**先 `vite build`** 再跑检查 1（否则比对的是"上一次的旧 dist"）。
> ⚠️ **检查 4 只跑错误分支**（用户拍板方案 A）：请求真打到线上接口、真走完整校验链，但**一个字节都不改库**。成功路径属人工执行，不在本检查范围。

## 关键域名（整串复制，别手打缩写）

| 用途 | 地址 |
|---|---|
| 前端（静态托管） | `https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/` |
| 云函数网关（`/api/*`） | `https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com` |

> 前端段是 `1498877015`，网关段是 `1498887015` —— 差一位，串了就 DNS 打不开。地址凭记忆缩写会报 `DNS_PROBE_FINISHED_NXDOMAIN`。

---

## 检查 1 ｜公网首页可访问 + 展示数据库真实数据

**目的**：确认线上是"能打真接口的前端产物"，不是旧版 / 缓存 / 只剩 mock。

**执行**：
1. 抓前端 `index.html`，正则取 `assets/*.js`、`assets/*.css` 文件名
2. 逐个抓这些资源，记录 HTTP 码与字节数
3. 抓 JS，搜真数据模式特征串

**通过标准**（全部满足才算 PASS）：
- `index.html` → HTTP **200**
- JS → HTTP **200**，且**字节数与本地 `web/dist/assets/*.js` 逐一吻合**
- JS 内含：`app.tcloudbase.com`（网关域名）、`/scenes`、`/resources`、`/instruments`、`/tasks`（证明会打真接口）

**失败形态**：
- `[FAIL] 首页不可访问 HTTP <码>`
- `[FAIL] 线上 JS 与本地 dist 不一致（线上 X / 本地 Y）——疑似未上传或 CDN 缓存`
- `[FAIL] 线上 JS 不含真数据特征串 <串>——疑似仍是旧版 / mock 版`

**判据说明**：**不看截图**、不搜"看起来像数据"的串。字节数吻合证明"线上 = 本地这次构建"，特征串证明"这版前端真会请求真接口"。

## 检查 2 ｜`GET /api/health`

**执行**：`GET {网关}/api/health`

**通过标准**：HTTP **200**，且 `json.loads` 后**恰好等于**：
```json
{"ok": true, "service": "wenwu-vibecoding"}
```
（**字段级比对**：多字段、少字段、值不符都算 FAIL。）

**失败形态**：`[FAIL] health 形状不符：实际 {…}` / `[FAIL] health HTTP <码>`

## 检查 3 ｜读接口（四路，逐一对字段）

**执行**：依次 `GET /api/scenes`、`/api/scenes/scene-1`、`/api/resources`、`/api/instruments`、`/api/tasks`

**通过标准**（全部满足才算 PASS）：

| 接口 | 期望 |
|---|---|
| `/api/scenes` | 200，`ok:true`，`count` 与基线一致，`items[0]` 字段集 = `{description, device_note, difficulty, id, measure_status, method, name, no, prerequisite, step_count, time_cost}`（11 个） |
| `/api/scenes/scene-1` | 200，`item.steps` **5 条**，每条字段集**恰好** = `{caution, content, difficulty_level, measure_status, order_no, time_minutes}`（6 个，**不含 `id`/`scene_id`**） |
| `/api/resources` | 200，`count` 与基线一致，字段集 = `{id, kind, name, purpose, url}` |
| `/api/instruments` | 200，`count` 与基线一致，字段集 = `{device_name, device_type, id, keywords, source, step_list, title}` |
| `/api/tasks` | 200，`count` 与基线一致，字段集 = `{id, label, scene_id}` |

**失败形态**：`[FAIL] <接口> 字段差集 = {…}`（用 `sorted(keys)` 做差集——**缺字段肉眼看不出来，必须程序比对**）

## 检查 4 ｜写接口（**方案 A：只跑错误分支，零数据变更**）

**目的**：证明三个写接口**真的在工作、校验链完整**，同时**不碰线上数据**。

**执行 + 期望**：

| 子项 | 请求 | 期望状态码 | 期望 `error` | 期望 `message` |
|---|---|---|---|---|
| 4a | `POST /api/steps/measure` body 缺 `time_minutes`（给 scene_id/order_no/difficulty_level） | **400** | `missing_field` | 缺少必填字段：time_minutes… |
| 4b | `PATCH /api/steps/measure` body 仅 `scene_id`+`order_no` | **400** | `empty_patch` | 没有提供任何可修改字段… |
| 4c | `DELETE /api/tasks/abc` | **400** | **`invalid_param`** | 任务编号必须是正整数 |
| 4d | `DELETE /api/tasks/999999` | **404** | `task_not_found` | 任务不存在，无法删除… |

**通过标准**：四个子项**状态码 + `error` + 非空中文 `message` 全部精确匹配**；且跑完 `GET /api/tasks` 的 `count` 与 `sorted(ids)` **与跑前基线一致**（零变更证明）。

**失败形态**：`[FAIL] 4a 期望 400 missing_field，实际 <码> <error>` / `[FAIL] 写接口调用后 tasks 基线变化 → 数据被改动`

> ⚠️ **4c 的 `error` 是 `invalid_param`，不是契约 §4.6 登记的 `bad_task_id`** —— 见文末「已知口径差异」。检查以**实测真实行为**为准。

> ⚠️ **盲区（如实标注）**：**成功路径（真写一次并核对回写值）不在本检查范围**，属人工执行。理由：三个写接口都会**不可撤销**地改线上库（POST 改难度/耗时、PATCH 改已有值、DELETE 删真实任务），违背本项目"线上库只做不落库/可回滚探测"的铁律。

## 检查 5 ｜无硬编码密钥（源码 + **git 全历史**）

**执行**：
1. 扫源码树 `web/src/**`、`cloudfunctions/**`、`index.html`
2. 扫 git：`git grep -nE "eyJ[A-Za-z0-9_-]{10,}"`（当前被跟踪文件）+ `git log --all -S "eyJ" --oneline`（全历史）

**通过标准**：**0 命中**真实凭据特征：JWT 形态 `eyJ[A-Za-z0-9_\-]{10,}`、`Bearer eyJ`、非空的 `PUBLISHABLE_KEY=<值>`、带值的 `SECRET_ID=` / `SECRET_KEY=`。

**失败形态**：`[FAIL] 命中 <文件>:<行号> → <片段>`

**判据说明（防误报）**：
- 变量名 `PUBLISHABLE_KEY`、`process.env.PUBLISHABLE_KEY`、`PUBLISHABLE_KEY=`（**等号后为空**）是**合法**的，不算命中。
- 文档/扫描脚本里作为**示例或检测模式**出现的 `eyJ` 串（如 `tests/security-checklist.md`）**不算命中**——它后面不构成真实 JWT。严格模式 `eyJ[A-Za-z0-9_-]{10,}` 应为 0 命中。

## 检查 6 ｜`.gitignore` 覆盖 `.env` + `.env.example` 存在且无真值

**执行**：
- `git check-ignore -v .env`（应**命中**一行 `.gitignore:<行>:.env  .env`）
- `git check-ignore -v .env.example`（应**无输出**）
- `git ls-files .env`（应**空**）、`git ls-files .env.example`（应**有**）
- 读 `.env.example`，确认 `PUBLISHABLE_KEY=` 等号后为空

**通过标准**（全部满足）：`.env` 被忽略且未被跟踪；`.env.example` 未被忽略且已被跟踪；模板内**无真值**。

**失败形态**：`[FAIL] .env 未被忽略，可被提交 —— 危险`

**判据说明**：不用 `git check-ignore` 的**返回码**判语义——Day 23 踩过 `!.env.example` 否定规则的 `!` 陷阱（命中否定规则时返回码也是 0，语义却相反）。以**输出文字**为准，并辅以 `git ls-files` 交叉验证。

## 检查 7 ｜数据库可连 + 核心表存在

**执行**：**经接口间接证明**——
- `/api/scenes` 通 → 库通 + `scenes` 表在
- `/api/scenes/scene-1` 的 `steps` → `steps` 表在
- `/api/resources` → `resources` 表在
- `/api/instruments` → `instruments` 表在
- `/api/tasks` → `tasks` 表在

**通过标准**：**5 张表各有至少一条 200 且返回非空数据**的接口证据 → `[PASS] 库连通，5 表全部可达`

**失败形态**：`[FAIL] <表> 间接证明失败：接口返回 500 internal_error`（注：**仅 GRANT 缺失也是 500**，需先查 GRANT 再看 Key 再看代码）

> ⚠️ **已知局限（如实标注）**：AI **不持有库凭据、不直连数据库**，本项是**间接证明**（接口能返回该表数据 = 库通 + 表在 + 该表可读），**非直连核验**。真·直连核验只能由用户在控制台做。

---

## 输出格式（统一，硬规矩）

```
[PASS] 1. 公网首页可访问 + 真实数据
       证据：GET …/index.html → 200；assets/index-ChUL683b.js → 200 / 173388 B（= 本地 dist）
             JS 内含 app.tcloudbase.com + /scenes /resources /instruments /tasks → 真数据模式
[FAIL] 4a. 写接口 - 缺字段
       证据：POST /api/steps/measure → 实际 500 internal_error；期望 400 missing_field
...
小结：PASS 6 / FAIL 1
```

**硬规矩**：每项必须带**命令原文 + 关键输出行**作为证据；**禁用**「看起来正常」「基本没问题」「应该没问题」这类表述——**要么 PASS 要么 FAIL，说不清即为 FAIL**。

---

## Day 26 基线（2026-10-10 实测，供后续比对）

| 项 | 基线值 |
|---|---|
| `index.html` 字节数 | 541 |
| JS 产物 | `assets/index-ChUL683b.js` / 173388 B |
| CSS 产物 | `assets/index-Dk9WJkSO.css` / 7591 B |
| `/api/scenes` | count = 4 |
| `/api/scenes/scene-1` steps | 5 条（step1 `1星/0分/measured`、step2 `1星/1分/measured`、step3 `1星/1分/**pending**`、step4/5 `null/pending`） |
| `/api/resources` | count = 6 |
| `/api/instruments` | count = 34 |
| `/api/tasks` | count = 7，ids = `[1,4,5,6,7,8,9]` |
| 写接口错误分支 | 4a `missing_field` / 4b `empty_patch` / 4c `invalid_param` / 4d `task_not_found`（零变更复核通过） |
| 密钥扫描 | 严格 JWT 模式 0 命中；`.env` 被忽略、`.env.example` 已跟踪且无真值 |

> ⚠️ **基线会漂**：`tasks` 表曾因删除从 8 变 7。**行数类判据以"与最近一次基线一致"为准**，不一致时先查是否有人改过数据，再决定是更新基线还是判 FAIL。

## 已知口径差异（Day 26 发现 → 已订正）

**`DELETE /api/tasks/<非法id>` 的 `error` 标识**：

| 来源 | 值 |
|---|---|
| 代码实现（`cloudfunctions/scenes/index.js`，`bad_task_id` 分支 → `failMsg(res, 400, "invalid_param", MSG.bad_task_id)`） | **`invalid_param`** |
| 契约 `api-contract.md` §4.6 原登记 | ~~`bad_task_id`~~ |
| 契约 `api-contract.md` §4.6 **Day 26 订正后**（v1.9） | **`invalid_param`** |

**实测（2026-10-10）**：线上真实返回 `400 {"ok":false,"error":"invalid_param","message":"任务编号必须是正整数"}` —— **`bad_task_id` 是那句中文 message 的 key，被契约误当成了 `error` 值**。

**处置**：本检查以实测 `invalid_param` 为准；契约已于 **Day 26 回改**（`api-contract.md` **v1.9**，§2.3 / §4.6 失败表 / §4.6 实测证据表**划线保留原值 + 补注**）。**这是本 Skill 首次实跑就抓到的一个真问题**（文档与实现不一致），可作为"检查确实在工作、不虚报"的旁证。

## 已知局限汇总

1. 检查 1 只证明「线上 = 本地 dist 这次构建」，**不证明「dist = 最新源码构建」**（后者需先 `vite build`，见前置）。
2. 检查 4 **不覆盖写成功路径**（人工执行）。
3. 检查 7 是**间接证明**，非直连库核验。
4. 本 Skill **不自动化**（不接 CI），全靠 AI 按本文件逐项手工执行。

## 调用记录

> 格式：日期 ｜ 场景 ｜ 结果。每次真实调用后追加一行。

- 2026-10-10 ｜ Day 26 首次实跑（含埋雷验证）｜ 见下方记录
