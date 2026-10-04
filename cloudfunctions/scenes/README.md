# cloudfunctions/scenes —— 全部 6 个读接口 + 1 个写接口（Day 17 建立 / Day 18 扩容 / Day 19 分层）

> 函数名 `scenes` 是 Day 17 起的名字，Day 18 起它实际管着 **4 类资源、7 个接口（6 读 + 1 写）**。
> **名字有误导，但刻意不改**（不为改名去动已上线的东西，见文末待办）。

## 目录结构（Day 19 分层重构）

```
cloudfunctions/scenes/
├── index.js        ← 接口层：路由分发、参数校验、组装响应
├── repository.js   ← 数据访问层：所有 REST 查询与写入集中在此
└── README.md       ← 本文件
```

### 两层职责边界

| 层 | 文件 | 只做这些 | 不做这些 |
|---|---|---|---|
| **接口层** | `index.js` | 接请求 → 解析路径/参数 → 校验 → 调 repository → 组装响应 → `res.end` | 不出现任何 REST 路径、表名、SQL 语义 |
| **数据访问层** | `repository.js` | 持有 `REST_BASE`、拼 PostgREST 查询串、发起 `fetch`、把结果原样返回 | 不判断业务规则、不碰 `req`/`res`、不写响应 |

`index.js` 通过 `const repo = require("./repository")` 拿到 10 个函数（2 个通用 + 8 个按表命名），全文**零 REST 路径字符串**。

### repository.js 导出的函数

| 函数 | 对应查询 | 被谁用 |
|---|---|---|
| `selectRows(pathWithQuery, key)` | 通用 GET（底层） | 被下面 6 个读函数复用 |
| `patchRows(pathWithQuery, body, key)` | 通用 PATCH（底层，带 `Prefer: return=representation`） | 被 `markStepMeasured` 复用 |
| `listScenes(key)` | `GET /scenes?select=*&order=no.asc` | `GET /api/scenes` |
| `findScene(id, key)` | `GET /scenes?id=eq.{id}` | `GET /api/scenes/:id` |
| `listStepsOfScene(id, key)` | `GET /steps?scene_id=eq.{id}&order=order_no.asc` | `GET /api/scenes/:id` |
| `listResources(key)` | `GET /resources?...&order=id.asc` | `GET /api/resources` |
| `listInstruments(queryString, key)` | `GET /instruments?{qs}` | `GET /api/instruments` |
| `listTasks(key)` | `GET /tasks?...&order=id.asc` | `GET /api/tasks` |
| `findStep(sceneId, orderNo, key)` | `GET /steps?scene_id=eq.…&order_no=eq.…` | `POST /api/steps/measure` 查步 |
| `markStepMeasured(sceneId, orderNo, level, minutes, key)` | `PATCH /steps?...`（写三字段） | `POST /api/steps/measure` 写库 |

> ℹ️ `listInstruments` 只负责「取回候选行」；`type` 白名单校验留在接口层，`q` 关键词过滤也在接口层（返回后由 `matchKeyword` 用 JS 过滤）。这是有意的：**过滤属于业务规则，不属于数据访问**。

> ⚠️ **部署提醒**：`index.js` 现在 `require("./repository")`，**控制台在线编辑器必须同时上传两个文件**，只贴 `index.js` 会报 `Cannot find module './repository'`。部署步骤见下方「部署注意」。

## 承载的接口

| 接口 | 实现日 | 查询参数 |
|---|---|---|
| `GET /api/scenes` | Day 17 | 无 |
| `GET /api/scenes/:id` | Day 17 | 无 |
| `GET /api/resources` | Day 18 | 无 |
| `GET /api/instruments` | Day 18 | `type`（6 个枚举白名单）、`q`（关键词，对 `title`+`keywords` 不区分大小写包含匹配） |
| `GET /api/tasks` | Day 18 | 无 |
| `POST /api/steps/measure` | Day 18 晚 | 无（请求体四字段：`scene_id`/`order_no`/`difficulty_level`/`time_minutes`） |
| `GET /api/health`（兜底分支） | Day 18 | 无——`/api/health` 另有独立函数，本分支是防被短前缀抢走的兜底 |

## 部署状态（2026-10-03，Day 18 收工）

**✅ 已上线并实测**（用户控制台截图 + AI 远程 python urllib 独立复核，11 个地址）：

| 地址 | 实测结果 |
|---|---|
| `/api/health` | `200`（回归检查，老接口未被弄坏） |
| `/api/scenes` | `200` `count:4` |
| `/api/scenes/scene-1` | `200`，`item.steps` 5 条 |
| `/api/resources` | `200` `count:6` |
| `/api/instruments` | `200` `count:34` |
| `/api/instruments?type=multimeter` | `200` `count:7` |
| `/api/instruments?type=xxx` | `400` `invalid_param` + 中文 `message` |
| `/api/instruments?q=电压` | `200` `count:5` |
| `/api/instruments?q=zzzznomatch` | `200` `count:0`（搜不到返回空结果，**不是 404**） |
| `/api/tasks` | `200` `count:8` |
| `/api/hello` | `400` + 中文（单段未知路径） |

- 函数名：`scenes`（模板：HTTP nodejs - Hello World，Web 函数模式，监听 9000）
- 部署方式：控制台在线编辑器（**只替换 `index.js`**，`package.json` 保持模板原样）
- 当前 `index.js` 体检：`node --check` exit 0 ｜ 非 ASCII 字节 0 ｜ 18 条路径本地路由自测全通过

## 架构

```
浏览器 → HTTP 网关（只配 /api 一条路由，剥掉 /api 后转发）
       → index.js 接口层：分发 /scenes、/resources、/instruments、/tasks、/steps/measure、/health
       → repository.js 数据访问层：拼查询串并用 Node 20 全局 fetch 调 CloudBase PostgreSQL REST API
       → PostgreSQL public schema
```

- **零依赖**：不用 `pg` 驱动，绕开"`package.json` 不能改"的铁律一
- REST 端点（**只出现在 `repository.js`**）：`https://wenwu-331122-d6gyrwmum2a734671.api.tcloudbasegateway.com/v1/rdb/rest/{table}`
  （⚠️ 这是第三个域名，与静态托管 `tcloudbaseapp.com`、云函数网关 `app.tcloudbase.com` 都不同，别串）
- 过滤走 PostgREST 查询参数（`?id=eq.scene-1`），**天然参数化防注入**；路径参数另过正则白名单（`^scene-[0-9]+$`）双保险
- `q` 关键词在**接口层**过滤（PostgREST 的 `like` 对数组列 `keywords` 不便，故取回后用 JS 匹配）

## 部署注意（Day 19 分层后新增）

`index.js` 与 `repository.js` 是**两个文件**，`require("./repository")` 要求它们**同目录一起部署**：

1. 控制台函数编辑页 → 若支持多文件，**两个文件都要创建/上传**
2. 若控制台只允许单个 `index.js`，**改用 CLI 或压缩包上传**（`cloudbaserc` / `tcb fn deploy`）
3. ⚠️ `repository.js` **不新增 `package.json`**——沿用 `index.js` 所在函数的模板 `package.json`（铁律一）
4. 部署后**必须实测**：只贴 `index.js` 的典型报错是 `Cannot find module './repository'`，出现在函数日志里、对外表现为 500 `internal_error`

> 🔎 **待实测**：控制台在线编辑器能否一次部署两个文件，尚未验证。这是 Day 19 引出的新未知点。

## 鉴权（Day 17 拍板）

- **Publishable Key**（数据库角色 `anon`，不过期，泄露也只是公开内容可读）
- 通过**云函数环境变量** `PUBLISHABLE_KEY` 注入；严禁写进代码/Git/聊天/前端
- 前置 SQL（Day 17 已在 SQL 编辑器执行）：

```sql
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
```

- 控制台 SQL 编辑器会对 `anon` 弹"检测到 Supabase 内置角色"警告——**假警报**（`SELECT rolname FROM pg_roles` 实测 `anon` 存在），点"仍然执行"即可
- RLS 未启用（本期只读公开数据，不需要；第二期有用户数据再议）

## 🔑 网关行为（Day 17 发现 / Day 18 定解）

### 1. 网关会剥掉路由前缀再转发（Day 17 实测）

| 路由配成 `/api/scenes` 时 | 函数收到的 `pathname` |
|---|---|
| `/api/scenes` | `/` |
| `/api/scenes/scene-1` | `/scene-1` |

`health` 函数从不检查路径，所以这个行为在 Day 15–16 一直没暴露。

### 2. 方案 K：只配 `/api` 一条，管住全部接口（Day 18 实测跑通）

Day 18 一度陷入困境：若给 `/api/resources`、`/api/tasks` 各配一条长路由，它们转发到函数后**全都变成 `/`，无法区分**。

解法是把路由配成**最短公共前缀**：

| 网关配置 | 浏览器访问 | 函数收到 |
|---|---|---|
| **`/api`（仅此一条）** | `/api/scenes` | `/scenes` |
| | `/api/scenes/scene-1` | `/scenes/scene-1` |
| | `/api/resources` | `/resources` |
| | `/api/instruments` | `/instruments` |
| | `/api/tasks` | `/tasks` |
| | `/api/health` | `/health` |

**收益**：① 多接口天然分得开；② **以后加接口只改本函数代码，不用再碰网关**；③ 契约里登记的浏览器地址一个字不变。

**配套**：`resolveRoute` **同时兼容剥前缀与未剥前缀两种形态**（`/scenes` 与 `/api/scenes` 都认），并给 `/health` 留兜底分支。

> ⚠️ 网关**不支持通配符**——方案 K 靠的是**前缀匹配**，不是 `/api/*`。

## 错误响应（Day 18 起三字段，与 api-contract §2.3 一致）

```json
{ "ok": false, "error": "invalid_param", "message": "type 取值不在允许范围内。可选值：dc_power、multimeter、oscilloscope、signal_gen、lcr、curve_tracer" }
```

| 场景 | 状态码 | `error` |
|---|---|---|
| 路径完全不匹配（多段） | 404 | `invalid_path` |
| 单段未知路径 / 场景编号格式错 | 400 | `invalid_param` |
| 场景 id 不存在 | 404 | `scene_not_found` |
| `type` 不在 6 个枚举内 | 400 | `invalid_param` |
| 非 GET | 405 | `method_not_allowed` |
| 环境变量缺失 | 500 | `config_error` |
| REST 调用失败 | 500 | `internal_error` |

- `error` 是**英文机器标识，不随文案变**；`message` 是中文人话，按每个分支各写。完整 7 条文案表见 `api-contract.md` §2.3。
- **中文写法**：受"纯 ASCII"铁律约束，`index.js` 里写成 `\uXXXX` 转义（如 `"\u63a5\u53e3\u5730\u5740\u4e0d\u5b58\u5728"` → "接口地址不存在"）。代价是可读性差，故契约里那张文案表**兼作转义对照表**。

## 服务端日志（Day 18 新增）

每个请求一行，形如：

```
[2026-10-03T12:46:54.090Z] GET /hello bad_scene_id -> 400 1ms
```

字段依次为：ISO 时间 · 方法 · 函数收到的路径 · 命中的模式 · 状态码 · 耗时(ms)。

**只打这六样，绝不打 `req.headers`**（理由见铁律四）。

## 🚨 四条铁律（第 4 条是 Day 18 拿事故换来的）

1. **`package.json` 保持模板原样，永不替换**——换任何自写版本必挂 `InvalidParameter.Dependency`
2. **`index.js` 纯 ASCII、零 `//` 注释**——控制台在线编辑器粘贴会吃换行，`//` 会把后文吞掉；中文一律 `\uXXXX`
3. **函数收到的路径 = 浏览器路径 − 网关路由前缀**（见上节），改路由/加接口时先想这条
4. **永不回吐 `req.headers`** ⚠️

### 铁律四的由来（2026-10-03 真实事故，务必读）

Day 18 调试路径时加过一个 `?debug=1` 分支回吐 `req.headers`，结果**把云凭据泄到了公网上**：

- 腾讯云 SCF 会把函数运行时环境变量与**临时密钥**以请求头形式注入，`x-scf-private-environment` 里**明文包含**：
  - `TENCENTCLOUD_SECRETID` / `TENCENTCLOUD_SECRETKEY` / `TENCENTCLOUD_SESSIONTOKEN`（腾讯云临时凭据）
  - `PUBLISHABLE_KEY`、`SCF_NAMESPACE`
- 另有 `x-cloudbase-context`（base64）内含 `serviceAccessToken`

**调试口是公网可访问的** → 任何人访问该地址都能刷出一份凭据。自部署到发现约 17 分钟，期间一直开放。

**教训**：要调试就**只回吐字段白名单**（`url` / `pathname` / `method` 三样足够），**永远不要整包回吐 headers**。事后已删除调试分支并远程复核确认关闭（对 12 个敏感标记扫描，0 命中）。

## 回归验证（Day 19 分层重构后）

### ① 本地路由自测（已完成，2026-10-04）

用**假 key** 起 `127.0.0.1:9000` 跑 11 条请求：校验链在「读 key 之后、调 REST 之前」，故假 key 也能测到全部分支。结果：

| # | 请求 | 结果 | 判读 |
|---|---|---|---|
| 1 | `GET /api/health` | `200` `service=wenwu-vibecoding` | ✅ 逐字正确 |
| 2–6、8 | `GET /api/scenes`、`/scenes/scene-1`、`/resources`、`/instruments`、`/instruments?type=multimeter`、`/tasks` | `500 internal_error` | ✅ **预期**——假 key 打真 REST 必失败；**恰好证明已走到 repository 并真发了网络请求** |
| 7 | `GET /api/instruments?type=xxx` | `400 invalid_param` + 中文文案 | ✅ 逐字正确 |
| 9 | `GET /api/hello` | `400 invalid_param` | ✅ 逐字正确 |
| 10 | `POST /api/steps/measure`（`{}`） | `400 missing_field` | ✅ 逐字正确 |
| 11 | `POST /api/steps/measure`（合法体） | `500 write_failed` | ✅ **预期**——校验全过、走到 `markStepMeasured` 才失败，**证明写路径已接 repository** |

**结论**：路由分发、参数校验、错误文案、repository 接线全部正常。文件体检：`index.js` 11162 字节 / 非 ASCII 0 / 零注释；`repository.js` 2341 字节 / 非 ASCII 0 / 零注释；两者 `node --check` 均 exit 0。

### ② 线上真数据回归（待实测，部署后逐条比对）

⚠️ 本地假 key 看不到真实数据，**count 类断言必须部署后实测**。清单：

| # | 接口 | 重构前记录 | 重构后应一致 |
|---|---|---|---|
| 1 | `GET /api/health` | `200` | `200` |
| 2 | `GET /api/scenes` | `200` `count:4` | 同 |
| 3 | `GET /api/scenes/scene-1` | `200`，`item.steps` 5 条 | 同 |
| 4 | `GET /api/resources` | `200` `count:6` | 同 |
| 5 | `GET /api/instruments` | `200` `count:34` | 同 |
| 6 | `GET /api/instruments?type=multimeter` | `200` `count:7` | 同 |
| 7 | `GET /api/instruments?type=xxx` | `400` `invalid_param` | 同 |
| 8 | `GET /api/instruments?q=电压` | `200` `count:5` | 同 |
| 9 | `GET /api/instruments?q=zzzznomatch` | `200` `count:0` | 同 |
| 10 | `GET /api/tasks` | `200` `count:8` | 同 |
| 11 | `POST /api/steps/measure`（`GET` 方法） | `405 method_not_allowed` | 同 |
| 12 | `POST /api/steps/measure`（缺字段） | `400 missing_field` | 同 |
| 13 | `POST /api/steps/measure`（已 `measured`） | `409 already_measured` | **待实测**（库里 20 步现全 `pending`，需临时写测试值再清） |

## 待办

- **函数名 `scenes` 与实际职责不符**（管着 4 类资源）：**已决定不改**——不为命名去动已上线的东西，Day 20 联调后再一并整理
- `/api/health` 究竟由 `health` 函数还是本函数的 `/health` 兜底分支响应，**目前无法分辨**（两者返回相同 JSON）；功能无影响，排查时需靠函数日志判断
- **多文件部署方式待实测**（Day 19 新增）：控制台在线编辑器能否一次部署 `index.js` + `repository.js`，未验证
- **线上真数据回归待实测**（Day 19 新增）：见上表 ②，尤其第 13 条 409 分支
- 前端接接口卡 **CORS**，排 Day 20
- 中文 `message` 的 `\u` 转义可读性差，根治需把文案外置（本期不做）
