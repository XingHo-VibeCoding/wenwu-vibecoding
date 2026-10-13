# 发布清单 · v1.1

> 流程沿用 `docs/RELEASE-v1.0.md`（该文件是**通用发布流程**，本文件只记 v1.1 的**具体值**与**本次新踩的坑**）。
> 配套：回滚见 `docs/ROLLBACK.md`；8 项自动检查的判定口径见 `skills/verify-project/SKILL.md`。

---

## 一、版本标识

| 项 | 值 |
|---|---|
| 版本号 | **v1.1** |
| git tag | `v1.1` |
| 冻结提交 | Day 29 提交（2026-10-13，`git log` 查 tag `v1.1` 指向） |
| 发布验收 | 2026-10-13 |
| 前端（静态托管） | `https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/` |
| 云函数网关 | `https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbaseapp.com`（前缀 `/api`）|
| CloudBase 环境 | `wenwu-331122`（体验版，到期 2027-03-31）|

> ⚠️ 前端子域 `…1498877015…` 与网关 `…1498887015…` **只差一位数字**，务必整串复制。

## 二、本次版本内容

- **静态站版**（根 `index.html`，判 AC-01~15）：内联 6 张面板图 base64 + 146 条按键；页内放大浮层 + 联动筛选；修复 S1–S4 卡片裸锚点。
- **云开发版**（`web/`，判 AC-16~18）：4 视图 / 三态降级 / **7 读 + 3 写**接口 / **7 表**真实数据 / 新增「仪器面板」区块。

## 三、发布基准（产物指纹）

| 文件 | 字节数 |
|---|---|
| `index.html` | **541** |
| `assets/index-D6c_vhx8.js` | **176787** |
| `assets/index-CCG6c4Xs.css` | **9703** |
| `img/panels/panel-curve_tracer.webp` | 75216 |
| `img/panels/panel-oscilloscope.webp` | 152968 |
| `img/panels/panel-signal_gen.webp` | 52572 |
| `img/panels/panel-multimeter.webp` | 97350 |
| `img/panels/panel-lcr.webp` | 19302 |
| `img/panels/panel-dc_power.webp` | 35412 |

⚠️ **`img/` 是 v1.1 新增目录**（v1.0 只有 `assets/`）。⚠️ 判"线上是哪个版本"**只认文件名 + 字节数**，特征串只作辅助（v1.0 ↔ v1.1 的可区分串：`/panels` = 0 ↔ 1）。

## 四、发布前验证（必须全过）

```bash
python tests/verify-project-run.py     # 要求 PASS 8 / FAIL 0
python tests/check-live-version.py --expect v1.1
```

- v1.1 实测结果：**PASS 8 / FAIL 0**（2026-10-13）；上传完成后 `--expect v1.1` → **PASS**（特征串 4 项全 OK）。
- ⚠️ **首次跑检查 1 前必须先构建**（它比对"线上 JS 字节数 vs 本地 `web/dist/`"）。

## 五、发布步骤（v1.1 实操）

1. **构建**：
   ```powershell
   & "<node.exe>" "<repo>\web\node_modules\vite\bin\vite.js" build "<repo>\web"
   ```
2. **核对指纹**：与上表比对（防"构建出了别的东西"）。
3. **留档**：`web/dist/` 整份存到 `.workbuddy/artifacts/v1.1/dist/` —— **回滚弹药**。
4. **打 tag 并推送**：`git tag -a v1.1 -m "v1.1"` → `git push origin v1.1`（tag 不推等于没打）。
5. **上传前端**：控制台 → 静态网站托管 → 文件管理 → **进入 `wenwu-vibecoding/`** → 分三次传：
   - 「上传文件」`web\dist\index.html`
   - 「上传文件夹」`web\dist\assets`
   - 「上传文件夹」`web\dist\img` ← **本次新增**
6. **部署云函数**（本次改过 `scenes/`）：`index.js` 与 `repository.js` **必须一起部署**。

### ⚠️ 本次新踩的坑（已造成一次无效发布）

**「上传文件夹」是连文件夹名一起建的。** 在 `wenwu-vibecoding/` 里直接「上传文件夹」选整个 `web\dist`，会得到 `wenwu-vibecoding/dist/index.html` —— 多包一层，线上地址（指向 `wenwu-vibecoding/` 根）**完全没更新**，页面看起来"什么都没变"。
- 现场判据：桶根 `index.html` 更新时间仍是旧日期；`…/wenwu-vibecoding/dist/index.html` 却能打开且是新版。
- 修法：删除误传的 `dist/` 文件夹 → 按上面第 5 步**分三次**传（进入 `wenwu-vibecoding/` 后再传，让路径栏显示 `…/ wenwu-vibecoding`）。
- 这条已并入 `docs/ROLLBACK.md` §四 坑 2。

## 六、发布后验证

```bash
python tests/check-live-version.py --expect v1.1
python tests/verify-project-run.py                 # 8 项全过？
```

再用**无痕窗口**（或 `Ctrl+Shift+R` 强刷）打开前端地址，肉眼确认：面板图能显示、点 S1–S4 卡片进「传输指南」。

## 七、备份与回滚点

| 回滚点 | 位置 |
|---|---|
| git | tag `v1.1` |
| 构建产物 | `.workbuddy/artifacts/v1.1/dist/`（含 `img/`） |
| 平台 | ❌ **无** —— CloudBase 静态托管没有版本快照 / 一键回退入口 |
| 桶内残留 | 旧的 `assets/index-ChUL683b.js`（v1.0 产物）**未删**，可当额外回滚点（**别手动删**） |

→ 回滚必须走"重新上传旧产物"，流程见 `docs/ROLLBACK.md`。

## 八、已知局限（不阻塞发布）
- 发布前检查**不跑写接口成功路径**（会不可撤销地改线上库），属人工执行。
- 发布前检查**不覆盖 git 历史提交**。
- `check-live-version.py` **不校验 `img/panels/*.webp`**（图不在 `index.html` 里被引用），由检查 1 兜住。
- AC-08 难度/耗时：20 步中 17 步未实测（只允许真实实测）。
