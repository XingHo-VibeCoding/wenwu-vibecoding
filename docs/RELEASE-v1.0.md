# 发布清单 · v1.0

> 这是一份**可复用的发布流程**（下次发 v1.1 照此走，只改版本号与指纹）。
> 配套：回滚见 `docs/ROLLBACK.md`；7 项自动检查的判定口径见 `skills/verify-project/SKILL.md`。

---

## 一、版本标识

| 项 | 值 |
|---|---|
| 版本号 | **v1.0** |
| git tag | `v1.0` |
| 冻结提交 | **`d3ad504`**（Day 26，2026-10-10）|
| 发布验收 | 2026-10-11 |
| 前端（静态托管） | `https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/` |
| 云函数网关 | `https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com`（前缀 `/api`）|
| CloudBase 环境 | `wenwu-331122`（体验版，到期 2027-03-31）|

> ⚠️ 前端子域 `…1498877015…` 与网关 `…1498887015…` **只差一位数字**，务必整串复制——凭记忆缩写会得到 `DNS_PROBE_FINISHED_NXDOMAIN`。

## 二、本次版本内容
- **静态站版**：根 `index.html`（单文件，判 AC-01~15）
- **云开发版**：`web/`（判 AC-16~18）—— 4 视图 / 三态降级 / 6 读 + 3 写接口 / 5 表真实数据

## 三、发布基准（产物指纹）

| 文件 | 字节数 |
|---|---|
| `index.html` | **541** |
| `assets/index-ChUL683b.js` | **173388** |
| `assets/index-Dk9WJkSO.css` | **7591** |

指纹的用途：发布后 / 回滚后**用它证明"线上就是这一版"**（见 `tests/check-live-version.py`）。
⚠️ 判定"线上是哪个版本"**只认字节数 + 文件名**，不要只搜特征串——React 产物自带 `[object Object]` 之类的报错文案，会误报。

## 四、发布前验证（必须全过）

```bash
python tests/verify-project-run.py     # 要求 PASS 7 / FAIL 0
```

- v1.0 实测结果：**PASS 7 / FAIL 0**（2026-10-11）
- ⚠️ **首次跑检查 1 前必须先构建**（它比对"线上 JS 字节数 vs 本地 `web/dist/`"）。

## 五、发布步骤

1. **构建**（本机唯一可靠姿势 —— 中文路径下 `npm run build` 会被编码搞坏）：
   ```powershell
   & "<node.exe>" "<repo>\web\node_modules\vite\bin\vite.js" build "<repo>\web"
   ```
   - `vite` 用**位置参数**当 root（`--cwd` 非法）；本机 node = `C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\node.exe`
2. **核对指纹**：与上一版基线比对，防"构建出了别的东西"。
3. **留档**：把 `web/dist/` 存一份（本项目存到 `.workbuddy/artifacts/<版本>/`）——**这是回滚的弹药**。
4. **打 tag 并推送**：`git tag -a v1.0 -m "v1.0"` → `git push origin v1.0`（tag 不推等于没打）。
5. **上传前端**：控制台 → 静态网站托管 → 文件管理 → **进入 `wenwu-vibecoding/`** → 上传 `index.html` + `assets/`
   ⚠️ 层级必须落在 `wenwu-vibecoding/` **根**：`wenwu-vibecoding/index.html` + `wenwu-vibecoding/assets/*`，别多套一层。
6. **部署云函数**（仅当本次改过）：`cloudfunctions/scenes/` 下 **`index.js` 与 `repository.js` 必须一起部署**（`require("./repository")`）。
   ⚠️ "部署成功 ≠ 能跑"；函数收到的路径 = 浏览器路径 − 路由前缀。

## 六、发布后验证

```bash
python tests/check-live-version.py --expect v1.0   # 线上版本 = v1.0？
python tests/verify-project-run.py                 # 7 项全过？
```
再用**无痕窗口**（或 `Ctrl+Shift+R` 强刷）打开前端地址，肉眼确认徽标与页脚日期。

## 七、备份与回滚点

| 回滚点 | 位置 |
|---|---|
| git | tag `v1.0` + 提交 `d3ad504` |
| 构建产物 | `.workbuddy/artifacts/v1.0/dist/` |
| 平台 | ❌ **无** —— CloudBase 静态托管没有版本快照 / 一键回退入口 |

→ 回滚必须走"重新上传旧产物"，流程见 `docs/ROLLBACK.md`。

## 八、已知局限（不阻塞发布，但要心里有数）
- 发布前检查**不跑写接口成功路径**（三个写接口都会不可撤销地改线上库），成功路径属**人工执行**。
- 发布前检查**不覆盖 git 历史提交**（历史里若有真密钥，扫不出来）。
- AC-08 难度/耗时：20 步中 17 步未实测（只允许真实实测）。
