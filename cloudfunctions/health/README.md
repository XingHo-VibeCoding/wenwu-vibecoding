# cloudfunctions/health —— /api/health 健康检查（Day 15）

## 部署状态（2026-09-30）

- **✅ 已上线**：`https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com/api/health` → `200 {"ok":true,"service":"wenwu-vibecoding"}`（控制台「测试」直连 + 公网浏览器 + 本机 Invoke-WebRequest 三方验证一致）
- 环境：`wenwu-331122`（体验版，到期 2027-03-31）
- 函数名：`health`（模板：HTTP nodejs - Hello World，Web 函数模式，监听 9000）
- 部署方式：控制台在线编辑器（只替换 `index.js`）

## ⚠️ 铁律：`package.json` 保持模板原样，不要替换

2026-09-30 实测（二分法定位）：

- 空模板原封不动部署 → **成功**
- 只替换 `index.js`、`package.json` 保持模板原样 → **成功**
- 把 `package.json` 换成任何自写版本（哪怕语法合法、零依赖的最小 5 行）→ **部署失败**：`InvalidParameter.Dependency Error` + `BadCmqMsgError ... failed to write meta`

本文件当前内容 = 控制台模板原版（与线上部署一致）。Web 函数运行期不读它（启动靠 `scf_bootstrap`，监听 9000），改它没有任何收益，只有部署失败的风险。

## 公网访问

- 入口：控制台「HTTP 网关 → 域名及路由 → 路由管理」
- 默认域名：`wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com`
- 路由：`/api/health` → 云函数 `health`（身份验证关闭，公网可访问）

## ⚠️ 铁律二：`index.js` 保持纯 ASCII、不写 `//` 注释

2026-09-30 晚：控制台在线编辑器出现过「粘贴后文件报错」，怀疑粘贴过程吃掉换行——而 `//` 单行注释一旦与后文拼成一行，会把整段代码注释掉，直接语法错误。处置：本文件已改为**纯 ASCII、零 `//`、零中文注释**（522 字节，`node --check` exit 0，非 ASCII 字符 0 个）。逻辑与旧版完全一致（GET 200 / 非 GET 405）。经验说明一律写在本 README 里，不写进代码。

## 契约口径（api-contract.md 依据本文件）

- `GET /api/health` → `200 {"ok":true,"service":"wenwu-vibecoding"}`
- 非 GET → `405 {"ok":false,"error":"method not allowed"}`
- 不连数据库、不写业务逻辑（Day 16–20 的事）
