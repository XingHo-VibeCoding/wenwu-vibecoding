---
name: verify-project
description: 《电子设备使用指南》发布前检查清单与执行口径（8 项）。每次改动上线前（或需要确认线上是否健康时）运行：逐项检查公网首页可访问且为真数据、面板图 6 张字节数吻合、GET /api/health、读接口 6 路逐一对字段、写接口错误分支、硬编码密钥（源码 + git 已跟踪文件）、.gitignore/.env.example、数据库与 6 表可达、静态站链接口径（#/view/anchor）。输出一律 [PASS]/[FAIL] + 证据（命令原文 + 关键输出行），禁用"看起来正常"这类模糊表述。触发词：发布前检查、上线前检查、跑一遍检查、verify-project、验收检查、PASS/FAIL。
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

## 检查 1 ｜公网首页可访问 + 展示数据库真实数据 + 面板图

**目的**：确认线上是"能打真接口的前端产物"，不是旧版 / 缓存 / 只剩 mock。

**执行**：
1. 抓前端 `index.html`，正则取 `assets/*.js`、`assets/*.css` 文件名
2. 逐个抓这些资源，记录 HTTP 码与字节数
3. 抓 JS，搜真数据模式特征串
4. **（Day 29 新增）**逐个抓 `img/panels/*.webp` 共 6 张，记录 HTTP 码与字节数
   —— 面板图走桶内路径、**不在 index.html 里被引用**，无法自动发现，故按**写死清单**核对

**通过标准**（全部满足才算 PASS）：
- `index.html` → HTTP **200**
- JS → HTTP **200**，且**字节数与本地 `web/dist/assets/*.js` 逐一吻合**
- JS 内含：`app.tcloudbase.com`（网关域名）、`/scenes`、`/resources`、`/instruments`、`/tasks`、`/panels`（证明会打真接口）
- **6 张面板图 → 全部 HTTP 200，且字节数与本地 `web/dist/img/panels/*.webp` 逐一吻合**

**失败形态**：
- `[FAIL] 首页不可访问 HTTP <码>`
- `[FAIL] 线上 JS 与本地 dist 不一致（线上 X / 本地 Y）——疑似未上传或 CDN 缓存`
- `[FAIL] 线上 JS 不含真数据特征串 <串>——疑似仍是旧版 / mock 版`
- `[FAIL] img/panels/<图>.webp -> 404 或字节数不符`（**图片没随产物上传**，页面会静默裂图）

**判据说明**：**不看截图**、不搜"看起来像数据"的串。字节数吻合证明"线上 = 本地这次构建"，特征串证明"这版前端真会请求真接口"。图片同理：字节数是硬判据。

## 检查 2 ｜`GET /api/health`

**执行**：`GET {网关}/api/health`

**通过标准**：HTTP **200**，且 `json.loads` 后**恰好等于**：
```json
{"ok": true, "service": "wenwu-vibecoding"}
```
（**字段级比对**：多字段、少字段、值不符都算 FAIL。）

**失败形态**：`[FAIL] health 形状不符：实际 {…}` / `[FAIL] health HTTP <码>`

## 检查 3 ｜读接口（六路，逐一对字段）

**执行**：依次 `GET /api/scenes`、`/api/scenes/scene-1`、`/api/resources`、`/api/instruments`、`/api/tasks`、`/api/panels`，再补两个面板接口的分支：`/api/panels?type=oscilloscope`、`/api/panels?type=bogus`

**通过标准**（全部满足才算 PASS）：

| 接口 | 期望 |
|---|---|
| `/api/scenes` | 200，`ok:true`，`count` 与基线一致，`items[0]` 字段集 = `{description, device_note, difficulty, id, measure_status, method, name, no, prerequisite, step_count, time_cost}`（11 个） |
| `/api/scenes/scene-1` | 200，`item.steps` **5 条**，每条字段集**恰好** = `{caution, content, difficulty_level, measure_status, order_no, time_minutes}`（6 个，**不含 `id`/`scene_id`**） |
| `/api/resources` | 200，`count` 与基线一致，字段集 = `{id, kind, name, purpose, url}` |
| `/api/instruments` | 200，`count` 与基线一致，字段集 = `{device_name, device_type, id, keywords, source, step_list, title}` |
| `/api/tasks` | 200，`count` 与基线一致，字段集 = `{id, label, scene_id}` |
| `/api/panels`（Day 28 新增） | 200，`count` 与基线一致，`items[0]` 字段集 = `{device_name, device_type, image_desc, image_path, keys, order_no, source}`；`items[0].keys[0]` 字段集 = `{function_desc, key_name, order_no, source}`；**逐台按键数与基线一致**（总和必须等于 146） |
| `/api/panels?type=oscilloscope` | 200，`count` = 1（过滤生效） |
| `/api/panels?type=bogus` | **400**，`error` = `invalid_param`，中文 `message` 非空（非法 type 校验分支） |

**失败形态**：`[FAIL] <接口> 字段差集 = {…}`（用 `sorted(keys)` 做差集——**缺字段肉眼看不出来，必须程序比对**）

> ⚠️ `/api/panels` 的 `keys` 是**嵌套数组**（一台仪器一行 + 若干按键），只比对表头字段会漏掉"按键丢了"。故额外比对**按键字段集**与**逐台条数**（实测 6 台 = 36/38/17/14/12/29，合计 146）。

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

## 检查 5 ｜无硬编码密钥（源码树 + **git 已跟踪文件**）

**执行**：
1. 扫源码树 `web/src/**`、`cloudfunctions/**`、`index.html`
2. 扫 git：`git grep -nE "eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"` —— ⚠️ **只扫"已跟踪文件"，不含历史提交**（Day 27 订正：原文误写为"全历史"，实际 `git grep` 不遍历历史）

> ⚠️ **盲区（Day 27 如实补记）**：**git 历史提交不在扫描范围内** —— 若某次提交里曾出现真密钥、之后又被删掉，本检查扫不出来。做全历史核查需另跑 `git log --all -p -S "eyJ"` 人工看（**不能直接当判据**：文档/脚本里的示例串会造成永久误报，见下条）。

**通过标准**：**0 命中**真实凭据特征：JWT 形态（**Day 29 起收紧为三段式**）`eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}`、`Bearer eyJ`、非空的 `PUBLISHABLE_KEY=<值>`、带值的 `SECRET_ID=` / `SECRET_KEY=`。

**失败形态**：`[FAIL] 命中 <文件>:<行号> → <片段>`

**判据说明（防误报）**：
- 变量名 `PUBLISHABLE_KEY`、`process.env.PUBLISHABLE_KEY`、`PUBLISHABLE_KEY=`（**等号后为空**）是**合法**的，不算命中。
- 文档/扫描脚本里作为**示例或检测模式**出现的 `eyJ` 串（如 `tests/security-checklist.md`、本 SKILL 的检查模式）**不算命中**——它后面不构成真实 JWT。
- ⚠️ **base64 误报 = Day 29 收紧的直接原因**：`index.html` 内联了约 577 KB base64 面板图，其中**必然**出现形如 `eyJGzz…` 的随机序列 → 宽模式 `eyJ[A-Za-z0-9_-]{10,}` **每次都会报 1 次误命中**（Day 28 实测：宽模式 1 次 / 三段式 0 次）。故 **Day 29 起收紧为三段式 JWT**（用户拍板）。
  - **代价（如实标注）**：不再检出**单段 token** 形态的凭据（没有两个 `.` 分隔的那类）。本项目凭据是 JWT 形态，故可接受；将来若引入单段形态密钥，本检查会漏。
  - 备选方案（当时一并讨论、未采用）：保留宽模式 + 忽略"嵌在 ≥1000 字符连续 base64 串内"的命中点 —— 检出力不降，但判定逻辑多一层。
- ⚠️ **证据文档自污染（Day 27 实测踩坑）**：本检查的 `git grep` 分支扫**全部已跟踪文件**，包含 `tests/**`。若证据/结果归档里**原样留了形似真实凭据的串**（哪怕是"假串"），入库后就会被打成命中 → **误报 FAIL**。
  - 真实案例：`tests/verify-project-result.txt` 曾粘贴埋雷 A 的假 JWT 片段，随 `d3ad504` 入库后 Day 27 复跑即 FAIL（源码树真密钥其实 0 命中）。
  - **规矩**：写任何证据/文档时，形似凭据的串一律**脱敏**（如 `eyJ…（假串·已脱敏）`），不留完整串。

## 检查 6 ｜`.gitignore` 覆盖 `.env` + `.env.example` 存在且无真值

**执行**：
- `git check-ignore -v .env`（应**命中**一行 `.gitignore:<行>:.env  .env`）
- `git check-ignore -v .env.example`（应**无输出**）
- `git ls-files .env`（应**空**）、`git ls-files .env.example`（应**有**）
- 读 `.env.example`，确认 `PUBLISHABLE_KEY=` 等号后为空

**通过标准**（全部满足）：`.env` 被忽略且未被跟踪；`.env.example` 未被忽略且已被跟踪；模板内**无真值**。

**失败形态**：`[FAIL] .env 未被忽略，可被提交 —— 危险`

**判据说明**：不用 `git check-ignore` 的**返回码**判语义——Day 23 踩过 `!.env.example` 否定规则的 `!` 陷阱（命中否定规则时返回码也是 0，语义却相反）。以**输出文字**为准，并辅以 `git ls-files` 交叉验证。

## 检查 7 ｜数据库可连 + 6 表存在

**执行**：**经接口间接证明**——
- `/api/scenes` 通 → 库通 + `scenes` 表在
- `/api/scenes/scene-1` 的 `steps` → `steps` 表在
- `/api/resources` → `resources` 表在
- `/api/instruments` → `instruments` 表在
- `/api/tasks` → `tasks` 表在
- `/api/panels` 且 `items[].keys` 非空 → `panels` + `panel_keys` 两表都在（Day 28 新增；`panel_keys` 靠**嵌套非空**证明）

**通过标准**：**6 张表各有至少一条 200 且返回非空数据**的接口证据 → `[PASS] 库连通，6 表全部可达`

**失败形态**：`[FAIL] <表> 间接证明失败：接口返回 500 internal_error`（注：**仅 GRANT 缺失也是 500**，需先查 GRANT 再看 Key 再看代码）

> ⚠️ Day 28 踩坑记录：新表建好后**忘记单独 GRANT**，`/api/panels` 返回 500 而**其余老接口全部正常** —— 这种"只有一个接口挂"的不对称最容易被误判成代码问题。**先查 GRANT**。

> ⚠️ **已知局限（如实标注）**：AI **不持有库凭据、不直连数据库**，本项是**间接证明**（接口能返回该表数据 = 库通 + 表在 + 该表可读），**非直连核验**。真·直连核验只能由用户在控制台做。

---

## 检查 8 ｜静态站链接口径（`#/view/anchor`）—— Day 29 新增

**目的**：拦住"链接写法与 hash 路由口径不一致"这类**静默跳错页**的 bug。

**来源（真实案例，不是假想）**：Day 13 上 hash 路由时，`index.html` 的 `sceneCard()` 漏改了一处，仍写**裸锚点** `href="#scene-1"`。路由 `parse()` 只认 `#/视图名/锚点`，于是把 `scene-1` 当成**视图名**去查 `VIEWS = ["search","transfer","device"]` → 不匹配 → **回落 `DEFAULT_VIEW = "search"`**，用户点 S1–S4 卡片就被丢回搜索页。**潜伏 16 天（Day 13 → Day 29）才被发现**。

**执行**：扫 `index.html`，正则取出全部 `href="#…"`，逐条判定：
1. 必须形如 `#/<view>` 或 `#/<view>/<anchor>`（**`#` 后必须紧跟 `/`**）
2. `<view>` 必须在 `VIEWS = {search, transfer, device, scene}` 内
3. 四个场景链接（`#/transfer/scene-1..4`）必须齐全

**通过标准**（全部满足）：hash 链接数 ≥ 1；**裸锚点数 = 0**；**视图名越界数 = 0**；四个场景链接去重后 = 4 条。

**失败形态**：`[FAIL] 裸锚点 = ['scene-1', …] —— 会被当成视图名，回落到 search`

**判据说明**：
- 本项是**源码级**检查（看本地 `index.html`），**不是**线上抓取 —— 与其他检查（线上验证）性质不同，刻意如此：这类 bug 在**上传之前**就该被拦住。
- 检查范围**只含静态站 `index.html`**；React 版（`web/src/**`）的链接不在本项内（它用 `#/scene/scene-N`，`scene` 在 `VIEWS` 里）。
- ⚠️ **必须把 JS 模板里的 `href` 也纳入**：本次 bug 恰恰长在模板字符串 `'<a class="card" href="#' + s.anchor + '">'` 里，若把"含 `' +` 的匹配"过滤掉就等于没查 —— 回退成裸锚点时本项会精确报出来。

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

## 当前基线（Day 29 ｜ v1.1，2026-10-13 实测，供后续比对）

| 项 | 基线值 |
|---|---|
| `index.html` 字节数 | 541（三次发布未变——它只是外壳，产物名在 assets 里） |
| JS 产物 | `assets/index-D6c_vhx8.js` / 176787 B（v1.0 为 `index-ChUL683b.js` / 173388 B） |
| CSS 产物 | `assets/index-CCG6c4Xs.css` / 9703 B（v1.0 为 `index-Dk9WJkSO.css` / 7591 B） |
| 面板图 6 张（`img/panels/`） | curve_tracer 75216 ／ oscilloscope 152968 ／ signal_gen 52572 ／ multimeter 97350 ／ lcr 19302 ／ dc_power 35412 |
| `/api/scenes` | count = 4 |
| `/api/scenes/scene-1` steps | 5 条（step1 `1星/0分/measured`、step2 `1星/1分/measured`、step3 `1星/1分/**pending**`、step4/5 `null/pending`） |
| `/api/resources` | count = 6 |
| `/api/instruments` | count = 34 |
| `/api/tasks` | count = 7，ids = `[1,4,5,6,7,8,9]` |
| `/api/panels`（Day 28 新增） | count = 6；逐台按键数 `curve_tracer 36 / oscilloscope 38 / signal_gen 17 / multimeter 14 / lcr 12 / dc_power 29`，**合计 146** |
| 写接口错误分支 | 4a `missing_field` / 4b `empty_patch` / 4c `invalid_param` / 4d `task_not_found`（零变更复核通过） |
| 密钥扫描 | 三段式 JWT 模式 0 命中；`.env` 被忽略、`.env.example` 已跟踪且无真值 |
| 静态站链接口径 | `index.html` 内 11 条 hash 链接，裸锚点 0，四个场景链接齐全 |

> ⚠️ **基线会漂**：`tasks` 表曾因删除从 8 变 7。**行数类判据以"与最近一次基线一致"为准**，不一致时先查是否有人改过数据，再决定是更新基线还是判 FAIL。
> 📌 历史基线（Day 26 ｜ v1.0 的产物指纹 `index-ChUL683b.js` / `index-Dk9WJkSO.css`）留在 `tests/check-live-version.py` 的 `PROFILES` 里 —— 回滚演练时靠它判"线上到底是哪一版"。

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
5. 检查 5 **不覆盖 git 历史提交**（`git grep` 只扫已跟踪文件）；且**扫描范围含 `tests/**`**，证据/文档里若留了形似凭据的完整串会自污染误报 → 一律脱敏（Day 27 实测）。
6. 检查 5 自 Day 29 起为**三段式模式**，**不覆盖"单段 token"形态**的凭据（换来了 base64 不误报，见检查 5 判据说明）。
7. 检查 8 只覆盖**静态站 `index.html`**，不覆盖 React 版（`web/src/**`）里的链接。
8. 检查 8 是**源码级**判据，只能拦住"源码写法错"；拦不住"源码对、上传的是旧文件"（那种要靠检查 1 的字节数 + `check-live-version.py` 的指纹）。

## 调用记录

> 格式：日期 ｜ 场景 ｜ 结果。每次真实调用后追加一行。

- 2026-10-10 ｜ Day 26 首次实跑（含埋雷验证）｜ 见下方记录
- 2026-10-11 ｜ Day 27 v1.0 发布验收 + 回滚恢复后复跑 ｜ **PASS 7 / FAIL 0**（当日第一次跑出 PASS 6 / FAIL 1，根因=证据文档自污染，已脱敏 → 见检查 5 判据说明）
