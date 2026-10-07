# 输出安全自查清单（Day 23）

> 用途：交付前逐项过一遍。每项都写清「**查什么**」「**怎么查**」「**当前结论**」。
> 原则：**不靠印象，靠命令输出**。任何一项说不出"我是怎么验的"，就等于没验。

---

## 一、硬编码密钥

### 1.1 工作区是否存在真实密钥
- **查什么**：全部受版本控制的文件里，有没有把真实凭据直接写进代码/文档/配置。
- **怎么查**：
  ```powershell
  python tests/secret-scan.py     # 结果写入 tests/secret-scan-result.txt
  ```
  或手工粗查：
  ```powershell
  git grep -n -I -E "API_KEY|secret|token|password|PRIVATE KEY|Bearer " -- .
  ```
- **判定标准**：命中的行要**逐条看内容**——"说明文字 / 占位符 / 代码拼接表达式 / 第三方包名"都不算真实密钥。看变量名不够，必须看**是不是真的带值**。
- **当前结论**：✅ 工作区扫出 18 处命中，**全部为非真实**（注释占位、文档说明、`"Bearer " + key` 拼接、`js-tokens` 包名等）；**真实密钥 0 处**。

### 1.2 Git 历史里有没有曾提交过的密钥
- **为什么历史也要查**：密钥**提交过一次就永久留在历史里**，光删文件没用。
- **怎么查**：
  ```powershell
  git log --all -S "BEGIN RSA" --oneline
  git log --all -S "postgresql://" --oneline
  git log --all -S "TENCENTCLOUD_SECRET" --oneline
  # 或脚本内置 12 个特征词批量扫
  ```
- **当前结论**：✅ 12 个特征词里仅 2 个有命中（`e86740d` Day 18 的 README 说明文字、`17f7119` Day 17 的连接串**格式模板**），均为文档正文，**无真实凭据**。

### 1.3 真实凭据只走环境变量
- **怎么查**：
  ```powershell
  git grep -n "PUBLISHABLE_KEY"        # 代码里只应出现 process.env.PUBLISHABLE_KEY
  ```
- **判定标准**：代码里出现的是 `process.env.PUBLISHABLE_KEY`（读变量）才合规；出现 `= "eyJ..."` 之类的字面量就不合规。
- **当前结论**：✅ `repository.js` 用 `process.env.PUBLISHABLE_KEY` 读取；真值只存在云函数环境变量里。
- **一旦发现真实密钥泄露**：**立即到 CloudBase 控制台作废并重新生成**，再清历史（`git filter-repo`），顺序不能反。

---

## 二、裸报错（错误提示是否对用户友好）

### 2.1 后端三类错误是否都有中文提示
- **查什么**：输入错（4xx）/ 服务端错（5xx）返回的 `message` 必须是中文，且有具体原因。
- **怎么查**：
  ```powershell
  python tests/error-triage-test.py      # 起本地 :9000，打 11 条用例
  ```
- **判定标准**：每条都满足「状态码符合类别 **且** message 含中文字符」。
- **当前结论**：✅ **PASS 11 / FAIL 0**。输入错 9 条（非法路径/编号格式/取值非法/方法不允许/缺字段/非法 JSON/空 PATCH/编号非法）+ 服务端错 2 条。

### 2.2 后端是否会把原始异常直接吐给用户
- **查什么**：`catch` 里有没有把 `e.message`、`e.stack` 直接 `res.end()` 出去（会泄露内部实现、库版本、SQL）。
- **怎么查**：
  ```powershell
  git grep -n -E "e\.message|e\.stack|err\.message" -- cloudfunctions/
  ```
- **判定标准**：`catch` 分支必须 `failMsg(...)` 输出**固定的中文文案**，不能输出 `e.message`。
- **当前结论**：✅ 云函数全部 catch 都走 `MSG.xxx` 固定中文；实际输出里也无 SQL / 库名 / 路径泄露。

### 2.3 前端是否会显示裸异常
- **查什么**：前端 catch 里直接 `e.message` 展示，可能显示 `Failed to fetch` 这类英文原生报错。
- **怎么查**：
  ```powershell
  git grep -n "e.message" -- web/src/
  ```
- **判定标准**：展示给用户的文案应当是 `client.js` 转换后的中文；未转换的 `e.message` 只能作为兜底。
- **当前结论**：✅ Day 23 已统一：`client.js` 抛 `ApiError`（中文 message + kind），展示侧一律走 `errorText(e)` / `kindLabel(kind)`；不再有裸拼 `e.message`。

---

## 三、非法输入

### 3.1 请求体非法 / 缺字段 / 越界值是否被拦
- **怎么查**：见 2.1 的 11 条用例，覆盖：非 JSON 体、缺必填、难度越界（=9）、编号格式错、空 PATCH。
- **当前结论**：✅ 全部拦在 400，且给出"哪一项不对、应该是什么"。

### 3.2 超长请求体是否被拦
- **怎么查**：`readJsonBody` 有 64KB 上限（`size > 65536` → `bad_body`）。
  ```powershell
  git grep -n "65536" -- cloudfunctions/
  ```
- **当前结论**：✅ 上限 64KB，超出返回 400「请求体不是合法的 JSON 对象」。

### 3.3 DELETE 是否可能"删空整表"（最危险的一项）
- **查什么**：PostgREST 的 DELETE 若不带过滤条件，会**删掉整张表**。
- **怎么查**：
  ```powershell
  git grep -n "delete_requires_filter" -- cloudfunctions/
  ```
- **判定标准**：`deleteRows()` 内部必须校验收到的路径**含 `?`**，否则直接 `throw`。
- **当前结论**：✅ 已实现硬防护：路径不含 `?` → `throw delete_requires_filter`。且 `GRANT DELETE` **只授给 `tasks` 一张表**。

### 3.4 越权写入（本期无鉴权的已知取舍）
- **查什么**：是否有人误以为"前端二次确认 = 安全"。
- **当前结论**：⚠️ **本期无鉴权，任何人都可 `curl` 直接调写接口**——这是用户明确接受的取舍。前端 `window.confirm` **只是防误触，不是安全边界**。已在 `api-contract.md` §2.4 与 `PRD.md` 第 218 行登记。

---

## 四、`.gitignore` 完整性

### 4.1 敏感文件是否真的被忽略
- **怎么查**（**注意坑**）：
  ```powershell
  git check-ignore -v .env            # 期望命中 .gitignore:2:.env
  git add --dry-run .env              # 期望 "ignored by ... Use -f"
  ```
- **⚠️ 踩坑记录**：`git check-ignore -v .env.example` 会输出 `!.env.example` 且**返回码为 0**，但那是**否定规则命中 = 不被忽略**。**只看返回码会判反**，必须看输出里有没有 `!`。更可靠的是 `git add --dry-run`。
- **当前结论**：✅ `.env` / `.env.local` / `.env.production` / `.env.staging` / `.env.foo` **全部被忽略**。

### 4.2 模板文件是否可提交
- **怎么查**：
  ```powershell
  git add --dry-run .env.example      # 期望 "add '.env.example'"
  ```
- **当前结论**：✅ `.env.example` 可提交（`!.env.example` 放行）。它**只列变量名，不含真值**，可安全入库。

### 4.3 忽略规则有没有漏洞
- **Day 23 发现并修复**：原规则 `.env.*.local` **只挡"以 `.local` 结尾"**，实测 `.env.production` **未被忽略**（这是个真窟窿，将来有人建 `.env.staging` 就会意外入库）。
- **修复**：加 `.env.*` + `!.env.example`（先全挡、再放行模板）。
- **怎么复查**：`git check-ignore -v .env.production` 应命中 `.env.*`。

### 4.4 其它该忽略的
- **当前结论**：✅ `node_modules/`、`web/dist/`、`web/dist.zip`、`.workbuddy/`、`*.pdf`、`*.log`、`*.pem`、`*.key` 均已忽略。

---

## 五、一句话总结

| 检查项 | 结果 |
|---|---|
| 硬编码密钥（工作区 + 历史） | ✅ 无真实密钥 |
| `.env` 是否入库 | ✅ 从未提交，且被忽略 |
| `.gitignore` 完整性 | ✅ 已补漏洞（`.env.*` 中间态） |
| 后端三类错误中文提示 | ✅ PASS 11 / FAIL 0 |
| 后端是否泄露原始异常 | ✅ 全部固定中文文案 |
| 前端错误提示 | ✅ 统一 `ApiError` + 中文 |
| DELETE 防删表 | ✅ 路径必须含 `?` 硬防护 |
| 越权写入 | ⚠️ 无鉴权（已登记的取舍，非缺陷） |
