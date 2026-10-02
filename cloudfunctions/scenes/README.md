# cloudfunctions/scenes —— GET /api/scenes + GET /api/scenes/:id（Day 17）

## 部署状态（2026-10-02 晚）

- **✅ 已上线并实测**：
  - `GET /api/scenes` → `200 {"ok":true,"count":4,"items":[S1–S4]}`（按 `no` 升序）
  - `GET /api/scenes/scene-1` → `200 {"ok":true,"item":{…,"steps":[5 条]}}`
  - `GET /api/scenes/scene-99` → `404 {"ok":false,"error":"scene_not_found"}`
  - `GET /api/scenes/hello` → `400 {"ok":false,"error":"invalid_param"}`
  - 复核方式：控制台部署后，AI 用 python urllib 远程抓取全部地址独立复核（含 `/api/health` 回归 200）
- 函数名：`scenes`（模板：HTTP nodejs - Hello World，Web 函数模式，监听 9000）
- 部署方式：控制台在线编辑器（只替换 `index.js`，`package.json` 保持模板原样）

## 架构（Day 17 拍板"B 路径"）

```
浏览器 → HTTP 网关(/api/scenes → 函数 scenes)
       → 函数用 Node 20 全局 fetch 调 CloudBase PostgreSQL REST API(PostgREST)
       → PostgreSQL public schema
```

- **零依赖**：不用 `pg` 驱动，绕开"package.json 不能改"的铁律一
- REST 端点：`https://wenwu-331122-d6gyrwmum2a734671.api.tcloudbasegateway.com/v1/rdb/rest/{table}`
  （⚠️ 这是第三个域名，与静态托管 `tcloudbaseapp.com`、云函数网关 `app.tcloudbase.com` 都不同，别串）
- 过滤走 PostgREST 查询参数（`?id=eq.scene-1`），天然参数化防注入；详情接口的 id 另过正则 `^scene-[0-9]+$` 双保险

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

## 🔑 网关行为（Day 17 实测新知识，很反直觉）

**HTTP 网关按路由前缀匹配后，会把前缀从路径中剥掉再转发给函数**：

| 浏览器访问 | 函数收到的 `pathname` |
|---|---|
| `/api/scenes` | `/` |
| `/api/scenes/scene-1` | `/scene-1` |

- 取证方法：临时加 `?debug=1` 分支回吐 `req.url`/`pathname`，实测后已删除
- 因此 `resolveMode` 同时兼容两种形态（剥前缀的 `/scene-1` 与完整的 `/api/scenes/scene-1`），防网关行为变化
- `health` 函数从不检查路径，所以这个行为在 Day 15–16 一直没暴露

## 错误分支（与 api-contract §2.2/§4.2 一致）

| 场景 | 状态码 | 响应 |
|---|---|---|
| 路径不匹配 | 404 | `{"ok":false,"error":"invalid_path"}` |
| id 格式非法 | 400 | `{"ok":false,"error":"invalid_param"}` |
| id 不存在 | 404 | `{"ok":false,"error":"scene_not_found"}` |
| 非 GET | 405 | `{"ok":false,"error":"method not allowed"}` |
| 环境变量缺失 | 500 | `{"ok":false,"error":"config_error"}` |
| REST 调用失败 | 500 | `{"ok":false,"error":"internal_error"}` |

## 铁律（沿用 health 的两条 + 本函数特有的一条）

1. `package.json` 保持模板原样，永不替换
2. `index.js` 纯 ASCII、零 `//` 注释（本文件 2742 字节，`node --check` exit 0，非 ASCII 字节 0）
3. **函数收到的路径 = 浏览器路径减去路由前缀**（见上节），改路由/加接口时先想这条

## 待办（Day 18+）

- 余下 3 个读接口（`/api/resources`、`/api/instruments`、`/api/tasks`）往本函数加路由分支即可（网关再各配一条路由）
- 前端接接口卡 CORS，排 Day 20
