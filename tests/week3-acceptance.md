# 第 3 周验收表（Day 21）+ 演示提纲

> 日期：2026-10-06（Day 21｜第 3 周）｜验收范围：第 3 周产出（Day 15–20）
> **判定规矩**：每一行都要有能复现的证据；测不出的直标「未执行」，**不用"基本完成""大体没问题"这类模糊说法**。
> **证据来源标注**：`【实测】`＝2026-10-06 由 AI 通过公网地址直连抓取的真实响应；`【文件】`＝仓库文件可查；`【用户截图】`＝用户本人提供；`【历史记录】`＝本周已登记在案的实测记录。

---

## 一、验收项逐项判定（清单指定的 5 项）

### 1. schema / seed 脚本 —— ✅ PASS

| 项 | 内容 |
|---|---|
| 验证方法 | ① 数 `db/schema.sql` 里的建表语句；② 用公网接口查各表实际行数；③ 两者比对 |
| 结果 | **PASS** |
| 证据 | 【文件】`db/schema.sql` 含 5 处 `CREATE TABLE`：scenes（L36）、steps（L56）、resources（L77）、instruments（L90）、tasks（L107）；文件头声明行数设计值 4 / 20 / 6 / 34 / 8<br>【实测】公网查得行数 4 / 20 / 6 / 34 / 8，合计 **72 行**——与脚本设计逐项一致 |

### 2. GET / POST 公网接口 —— ✅ PASS（写入接口见备注）

| 项 | 内容 |
|---|---|
| 验证方法 | 直接打公网网关的 6 个读接口 + 写接口的校验分支（URL 见附录 A，可自行复现） |
| 结果 | **PASS** |
| 证据 | 【实测】`/api/health` **200**（40 B，`{"ok":true,"service":"wenwu-vibecoding"}`）<br>【实测】`/api/scenes` **200** `count:4`｜`/api/scenes/scene-1` **200** `steps:5`｜`/api/resources` **200** `count:6`｜`/api/instruments` **200** `count:34`｜`/api/tasks` **200** `count:8`<br>【实测】`POST /api/steps/measure` 两条校验分支：缺字段 → **400** `missing_field`（中文文案完整）；方法错 → **405** `method_not_allowed`<br>【实测 2026-10-06】**真实实测值成功写入**：`scene-1` 第 1 步（难度 1 / 耗时 0 分钟）→ **200** `{"ok":true,"item":{...,"measure_status":"measured"}}`；重复提交 → **409** `already_measured`；独立读回 `GET /api/scenes/scene-1` 第 1 步 `difficulty_level:1 / time_minutes:0 / measure_status:"measured"`（AI 端 urllib 独立取证，非浏览器） |

> **备注（2026-10-06 更新）**：写接口的**成功写入（200）**已由今日真实实测值写入覆盖（不再是历史记录背书）——用户真机实测 scene-1 第 1 步（插线选「传输文件」，难度 1 星、不足 10 秒、按口径记 0 分钟）并亲手执行写入，200 / 409 / 读回三链全过。~~成功路径的证据是【历史记录】2026-10-03 晚实测~~（原文保留备查）。

### 3. 分层重构（接口层 / 数据访问层）—— ✅ PASS

| 项 | 内容 |
|---|---|
| 验证方法 | ① 全目录搜 `REST_BASE`，应只出现在数据访问层；② 核对接口层是否 `require("./repository")`、是否残留 REST 路径串；③ 线上接口正常＝分层版在跑 |
| 结果 | **PASS** |
| 证据 | 【文件】`cloudfunctions/scenes/repository.js` **L1** `const REST_BASE =`（**唯一持有者**），L4 `selectRows` / L14 `patchRows` + L30–L73 共 8 个按表函数（`listScenes`/`findScene`/`listStepsOfScene`/`listResources`/`listInstruments`/`listTasks`/`findStep`/`markStepMeasured`）<br>【文件】`cloudfunctions/scenes/index.js` **L3** `const repo = require("./repository");`；全文 grep `REST_BASE` **零命中**<br>【实测】线上 6 读接口全 200 → 分层版已在线上运行（不是只在本地的重构） |

### 4. 公网可访问 —— ✅ PASS

> **映射说明**（Day 21 已与用户确认）：清单写作「公网检查台 URL」，但本项目**没有"检查台"页面**（全项目搜索零命中，也没有"打卡/checkins"概念）。故映射为两行实证：健康接口 URL + 前端页面 URL。如需另建检查台页面，属新功能，不在今日范围。

| 证据 | 内容 |
|---|---|
| **A. 健康接口** | 【实测】`https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/health` → **200**，40 字节，`{"ok":true,"service":"wenwu-vibecoding"}` |
| **B. 前端页面** | 【实测】`https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/` → **200**（541 B，`<title>电子设备使用指南</title>`）；页面引用的两个资源均 **200**：`assets/index-BdfB7jiV.js`（167394 B）、`assets/index-CunotPut.css`（4776 B） |

> **B 的加分含义**：资源 hash 与本地 `web/dist` 逐字相同（`BdfB7jiV` / `CunotPut`）→ 线上跑的**正是 `bf12ec3` 这次改造的产物**，不是旧版本。

### 5. api-contract.md 完整性 —— ✅ PASS

| 项 | 内容 |
|---|---|
| 验证方法 | 核对章节骨架是否覆盖"环境 → 通用约定 → 数据模型 → 接口清单 → 实现口径 → 遗留项"，且每个接口是否标了实现状态与实测记录 |
| 结果 | **PASS** |
| 证据 | 【文件】章节：§1 环境与基地址（1.1 三域名对照）→ §2 通用约定（2.1 请求 / 2.2 响应 / 2.3 错误形状 / 2.4 鉴权与限流）→ §3 数据模型（3.0 交付物 + 3.1–3.5 五表逐字段）→ §4 接口清单（4.1 health / 4.2 scenes / 4.3 三读 / **4.4 技术口径** / **4.5 写入接口**）→ §7 遗留与理由<br>6 读 + 1 写**全部标「✅ 已实现」**且各带实测表；未还清的债（AC-08、`steps[]` 有意省略 `id`/`scene_id`）**如实登记**，不粉饰 |

---

## 二、线上真数据回归 13 条（`cloudfunctions/scenes/README.md` ② 表）—— 12/13 PASS

| # | 接口 | 期望 | 今日实测 | 判定 |
|---|---|---|---|---|
| 1 | `GET /api/health` | 200 | 200 | ✅ PASS |
| 2 | `GET /api/scenes` | 200 `count:4` | 200 `count:4` | ✅ PASS |
| 3 | `GET /api/scenes/scene-1` | 200，steps 5 条 | 200，steps 5 条 | ✅ PASS |
| 4 | `GET /api/resources` | 200 `count:6` | 200 `count:6` | ✅ PASS |
| 5 | `GET /api/instruments` | 200 `count:34` | 200 `count:34` | ✅ PASS |
| 6 | `GET /api/instruments?type=multimeter` | 200 `count:7` | 200 `count:7` | ✅ PASS |
| 7 | `GET /api/instruments?type=xxx` | 400 `invalid_param` | 400 `invalid_param`（中文文案含允许值清单） | ✅ PASS |
| 8 | `GET /api/instruments?q=电压` | 200 `count:5` | 200 `count:5` | ✅ PASS |
| 9 | `GET /api/instruments?q=zzzznomatch` | 200 `count:0` | 200 `count:0` | ✅ PASS |
| 10 | `GET /api/tasks` | 200 `count:8` | 200 `count:8` | ✅ PASS |
| 11 | `POST /api/steps/measure`（GET 方法） | 405 `method_not_allowed` | 405 `method_not_allowed` | ✅ PASS |
| 12 | `POST /api/steps/measure`（缺字段） | 400 `missing_field` | 400 `missing_field` | ✅ PASS |
| 13 | `POST /api/steps/measure`（已 measured） | 409 `already_measured` | —— | ⏳ **未执行**（库里 20 步现全 `pending`，需先写入 → 安排在演示环节） |

---

## 三、缺项如实标记（FAIL / 未执行 / 记录到下周）

| 项 | 状态 | 说明与原因 |
|---|---|---|
| **AC-08 每步难度星级 + 耗时** | ❌ **FAIL（进度 1/20）** | 【实测 2026-10-06】`scene-1` 第 1 步已有真实值：`difficulty_level:1` / `time_minutes:0`（不足 10 秒，按「不足 1 分钟记 0」口径）/ `measure_status:"measured"`——接口读回确认。**其余 19 步仍全 `pending`/`null`**（读回核实：2~5 步 `diff=None time=None status=pending`）。原因不变：必须真机实测、宁缺不编 |
| 线上回归 13 条第 13 条 | ✅ **PASS（2026-10-06）** | 真实实测值写入 scene-1 第 1 步后重复提交 → **409** `already_measured`「该步骤已经实测过，不能重复提交」（用户截图 + AI 端独立读回）。至此 13 条回归**全部实测通过** |
| 同伴交叉验证结论 | ✅ **已回收（2026-10-06 14:53，同伴手机）** | 见第四节已填结论；另附赠：健康接口经同伴外网手机实测 200 + 正确 JSON（14:48 截图，第一次误开接口 URL 反而完成该项交叉验证） |
| 演示视频（清单「余力加练」） | ⏳ 未执行 | 属余力加练，非今日必做 |
| 函数名 `scenes` 与实际职责不符 | 📌 记录到下周 | 已决定不改，不为命名动已上线的东西（契约 §7.2） |
| 中文 `message` 的 `\u` 转义可读性 | 📌 记录到下周 | 根治需文案外置 |
| `/api/health` 的 405 仍两字段 | 📌 记录到下周 | 已在契约 §7.2 登记 |
| `steps[]` 有意省略 `id` / `scene_id` | 📌 记录到下周 | 设计取舍，非缺陷 |

---

## 四、同伴交叉验证：三行结论模板 + 可直接转发的话术

**三行结论模板**（同伴填完发回来，就是清单要的那张截图）

```
① 能否打开：能 / 不能（不能请附截图）
② 能否真实读写：能读到公网真实数据 / 只读成功，写入未验 / 不能
③ 有无报错：无 / 有（请把 Console 红字原文发我）
```

**已回收的结论（2026-10-06 14:53，同伴手机截图为证）**

```
① 能否打开：能（手机浏览器直开，地址栏为静态托管域 …1498877015.tcloudbaseapp.com）
② 能否真实读写：能读到公网真实数据（badge＝ready 态「Day 20 · React · 云数据库数据」，
   说明同伴网络下四路读接口全部成功；写入部分见下方命令行自测，同伴侧不适用）
③ 有无报错：无报错迹象（页面无离线兜底红条、内容完整渲染；手机上不便开 Console，
   以 badge ready 态 + 无 fallback 提示条作为移动端等价证据）
```

**转发话术**（整段复制给同伴即可）

```
帮我验个页面，一分钟：
① 打开 https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/
   能正常显示三个板块（传输指南 / 设备指南 / 任务搜索）吗？
② 页面右上角有一行小字，念给我听就行。
③ 电脑上按 F12 → 切到 Network → 按 Ctrl+F5 刷新，看有没有红色报错。
④ 随便点几下导航，看看能不能切换。
回我三句话：能打开吗 / 有报错吗 / 右上角那行字是什么。
```

**⚠️ 一条必须说清的限制**：前端页面**没有写入入口**（React 版只接了 6 个读接口），所以同伴那侧只能验「能打开 + 无报错 + 读到真实数据」；**「可读写」这一行要由命令行完成**，命令见下。

### 写入自测命令（"可读写"这行的证据 ＋ 顺手验回归第 13 条）

> ⚠️ **前提**：星级和分钟数必须是**你真实测出来的值**（难度星级 1–5、耗时取整数分钟）。没有真实值就先别跑这行——按"不许编造数据"的规矩，宁可标「未执行」。**本命令不可撤销**：写一次该步就永久变 `measured`（契约 §4.5）。
>
> **本次取值与口径（2026-10-06 定）**：`scene-1` 第 1 步（"用数据线连接手机与电脑，通知栏选「传输文件」"），真机实测——**难度 1 星**（直觉操作、一次就成）、**秒表读数不足 10 秒**。**取整口径：`time_minutes` 不足 1 分钟如实记 0**（契约只要求 `>= 0`，`0` 合法）。后续 19 步沿用同一口径。

在 PowerShell 里**整段粘贴**（下面已按本次实测值填好，可直接跑）：

```powershell
$uri  = 'https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/steps/measure'
$body = '{"scene_id":"scene-1","order_no":1,"difficulty_level":1,"time_minutes":0}'

Write-Host '--- 第一次：写入 ---'
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body -Uri $uri | ConvertTo-Json -Depth 5

Write-Host '--- 第二次：应被拒绝（重复提交）---'
try { Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body -Uri $uri } catch { $_.ErrorDetails.Message }
```

**两次分别应该看到**：

| 第几次 | 预期 |
|---|---|
| 第一次 | `"ok": true`，`item.measure_status` 为 `"measured"` → **回归第 13 条前半**（写入成功） |
| 第二次 | `{"ok":false,"error":"already_measured","message":"该步骤已经实测过，不能重复提交"}` → **回归第 13 条转 PASS** |

> PS 5.1 的坑：`Invoke-RestMethod` 遇到 4xx 会**抛红字**，**红字不等于接口坏了**——第二次的红字正是"防重复生效"的证据，真实响应体在 `ErrorDetails.Message` 里。

**✅ 实测结果（2026-10-06，全部符合预期）**：第一次 **200** `{"ok":true,"item":{"scene_id":"scene-1","order_no":1,"difficulty_level":1,"time_minutes":0,"measure_status":"measured"}}`；随后原样重跑整段 → **409 冲突**（`already_measured`，防重复生效）；读回（AI 端 urllib 独立取证，HTTP 200）：第 1 步 `diff=1 / time=0 / measured`，第 2~5 步原样 `null/null/pending`，场景步数仍为 5。**注意**：另有一张 404 截图是读回网址开到了静态托管域（对象存储 NoSuchKey），与写入无关，接口本身无恙。

**写完立刻读回确认**（这条同时是演示里的"刷新后持久化"证据）：浏览器打开
`https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/scenes/scene-1`
→ 第 1 步应变成 `"difficulty_level":1,"time_minutes":0,"measure_status":"measured"`。

> ⚠️ **一处必须说清的边界（2026-10-06 核对源码后订正）**：**前端页面上看不到这个值**——`TransferView.jsx` 只渲染**场景级**的 `难度 {s.difficulty} ｜ 耗时 {s.time_cost}`（值来自 `scenes` 表、恒为字符串「待实测」），**不渲染 `steps` 的 `difficulty_level` / `time_minutes`，也不展示步骤列表**。所以"刷新后持久化"的证据**只能用接口读回**（上一步），不能靠页面肉眼确认；要让页面上可见＝新增详情视图，属新功能（已记待办）。**同理**：写入后页面刷新**不会**有任何变化，这不是写入失败。

---

## 五、演示提纲（3–5 分钟）

> 总时长约 **4 分钟**，四段结构（用户问题 → 核心流程 → 提示词改写 → 验证方式）+ 未完成项收尾。
> **素材说明**：第三段「提示词改写」用的是 **Day 18（2026-10-03）真实发生的事**，原文见 `.workbuddy/memory/2026-10-03.md`，非事后编造。

### 第 1 段 ｜ 用户问题（约 40 秒）

**讲什么**：写给"用 Android 手机 + Windows 电脑的理工科学生"（大二大三）——实验数据、板书照片都在手机里，要传进电脑写报告。现成教程的通病是**只列步骤、不说每步多难、不说要多久**，动手前心里没底。

**差异点一句话**：这份指南每件事都分步，且**每步标注难度星级与耗时**——"动手前先看清楚"。

**展示**：公网页面首页（badge「Day 20 · React · 云数据库数据」+ 副标题那句定位语）。

### 第 2 段 ｜ 核心流程：一次真实写入 + 刷新持久化（约 100 秒）

**这段是重点，按顺序做**：

1. **打开公网页面**（地址栏完整 URL）→ 点「传输指南」→ 看到 S1「实验数据 / 板书传电脑」卡片，meta 行是「方式：USB 数据线 ｜ 5 步 ｜ 难度 待实测 ｜ 耗时 待实测」——**坦率说一句**："难度/耗时那两格就是今天要还的债。"
2. **现场跑一次真实写入**（PowerShell 整段粘贴，命令见第四节）：
   - 写入的是**真机实测值**：`scene-1` 第 1 步 = 难度 **1 星**、耗时 **0 分钟**（实测不足 10 秒，口径=不足 1 分钟记 0）。**强调这不是测试值**，是真测出来的。
   - 第一次 → **200** `{"ok":true,"item":{…,"measure_status":"measured"}}`。
3. **再发一次同一条请求** → **409 `already_measured`**：防重复生效，这一步此后永久拒绝重复提交。**说明代价**：本期没有"改一版/撤销"的接口，写错了只能回 SQL 控制台改——这是当初拍板时明确接受的取舍。
4. **刷新持久化** → 用接口读回 `GET /api/scenes/scene-1`：第 1 步 `difficulty_level:1 / time_minutes:0 / measure_status:"measured"`，第 2~5 步仍是 `null / pending`。
   - ⚠️ **必须提前说明的一个诚实点**：**刷新网页本身看不到变化**——前端目前只渲染场景级的「难度 / 耗时」（值来自 `scenes` 表、恒为「待实测」），**不渲染步骤级数值、也没有步骤列表**。所以"持久化"的证据是**接口读回**，不是页面。**顺带交代**：这正是今天新记的待办——补一个「场景详情」视图，点开卡片展开 5 步并把实测值显示出来（调已有接口 `GET /api/scenes/:id`，属新功能，本周不做）。

### 第 3 段 ｜ 提示词改写过程（约 60 秒，真实素材）

**讲什么**：这一周我改过一次需求——**第一次选错了方向，是后来的追问把需求变清楚的**。

| 阶段 | 当时的说法 | 结果 |
|---|---|---|
| 第一版（Day 18 上午） | 清单要求"实现契约中登记的 POST 接口"；但 `PRD.md` 第 7 节第 218 行**明文禁止任何写入类接口**，契约里 6 个接口也**全是 GET** | 我给了甲/乙选项，你选了**甲＝守 PRD、不做写入接口**，当天主任务改为把剩下 3 个读接口做完。**代价如实承担**：清单三条完成标准（POST 成功 / 重复被拒 / 缺字段中文提示）**全部达不成**，写入接口这个教学点跳过 |
| 转折（当晚 21:31） | 你主动问了一句：**"POST 接口什么时候补上"** | 这句把模糊的"要不要"变成了明确的"要、并且现在解决"——我澄清了**补数据（AC-08 的难度/耗时）≠ 开写入接口（教学点）**不是一回事，给了三选项 |
| 第二版（当晚 21:35） | 你选**乙＝要 POST 接口**，并接受要动 `PRD.md`；随后连拍两个子决策：**A甲**（写入落点＝UPDATE `steps` 三个字段，重复＝已 `measured` 则拒）+ **B甲**（完全公开、无密钥） | 当晚定型 `POST /api/steps/measure`，契约新增 §4.5 登记；第二天部署实测；**今天用真实实测值走完 200 / 409 / 读回** |

**这一段的结论（值得讲的那句）**：第一版的"甲"不是错——**它是守住既有约定的正确第一反应**；真正让事情往前走的是后面那次追问，把一个大选择**拆成了四个能单独拍板的小决策**：要不要做 → 抓什么写（写入落点）→ 重复怎么判 → 谁能写。**把"要不要做一个写入接口"问到"写哪张表、写哪几个字段、重复怎么判、谁有权写"，需求才真正可执行。**

### 第 4 段 ｜ 验证方式（约 45 秒）

| 验证什么 | 怎么验 | 证据 |
|---|---|---|
| 前端真的在拉公网数据 | 页面 badge = ready 态文案；F12 → Network → 强刷 → 4 条请求打在**公网网关** | 截图（10-04 / 10-05） |
| 数据是活的不是打包死的 | 控制台改 `scene-1.name` → 页面标题跟着变 → 改回又变回来 | 接口三时刻对账（10-05） |
| 换个人、换个网络也能开 | 同伴用**手机**打开页面，报三行结论（能否打开 / 能否读写 / 有无报错） | 同伴手机截图（10-06） |
| 接口本身没坏 | 线上回归 **13 条全 PASS**（含 400 / 405 / 409 各分支） | 验收表第二节 |
| 写入是真的落到库里 | 200 写入 → 409 重复 → 接口读回 | 命令输出 + 读回（10-06） |

### 收尾 ｜ 本周未完成项（约 15 秒，如实说）

- **AC-08 只到 1/20**——20 步里只有第 1 步有真实实测值，其余必须一台台真机测，**没测出来就不填**；
- 场景详情视图（点开卡片看 5 步）**未做**，属新功能；
- 反向兜底验证（断网看"离线内容"提示条）**未做**，可选；
- 演示视频（余力加练）**未录**；
- 契约第 747 行"React 版数据来自 mock"是旧描述，待补注。

---

## 附录 A：可复现证据的地址清单（浏览器直接打开即可）

```
# 健康接口
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/health

# 6 个读接口
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/scenes
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/scenes/scene-1
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/resources
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/instruments
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/tasks

# 参数校验（可直接看到 400 中文文案）
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/instruments?type=xxx
https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/instruments?q=zzzznomatch

# 前端公网页面（子路径，末尾 / 不能省）
https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/
```

## 附录 B：今天要交的三张截图（用户本人拍）

| # | 拍什么 | 图里必须有 |
|---|---|---|
| 1 | 本验收表（周验收表） | 逐项 **PASS / FAIL / 未执行** + 每行的证据（可截第一节表格 + 第三节缺项表） |
| 2 | 同伴交叉验证 | 那**三行结论**（能否打开 / 能否真实读写 / 有无报错） |
| 3 | 演示提纲 | 四段结构：用户问题 → 核心流程 → 提示词改写 → 验证方式 |
