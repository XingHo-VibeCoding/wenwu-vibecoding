# 密钥自查脚本（Day 23）

用途：全仓库 + Git 历史扫描密钥特征词，确认无真实凭据泄露。
用法（在工作区根目录）：`python tests/secret-scan.py`
输出：命中清单（预期：全部为"说明性文字"，无真实密钥值）

## 一、扫描范围与特征词

**工作区扫描**（排除 `.git` / `node_modules` / `dist` / `.workbuddy`）：
`API_KEY` `apikey` `secret` `SECRET` `token` `TOKEN` `password` `PASSWORD`
`BEGIN RSA` `PRIVATE KEY` `Bearer ` `Authorization:` `postgres://` `postgresql://`

**Git 历史扫描**（`git log --all -S <词>`）：
`TENCENTCLOUD_SECRET` `BEGIN RSA` `BEGIN PRIVATE KEY` `postgres://` `postgresql://`
`publishable_key=` `API_KEY=` `apikey=` `password=` `secret=` `token=`

## 二、判定标准

- **真实密钥**：出现在**代码或配置**中的、可直接用于认证的字符串（如 `sk-xxx`、`AKIDxxx`、连接串里的账号密码）。
- **说明性文字**（不算泄露）：文档里讲"无 token"、占位符 `<PUBLISHABLE_KEY>`、变量名拼接 `"Bearer " + key`、注释掉的 `# API_KEY=`、包名 `js-tokens`。
- **一旦发现真实密钥**：立即作废 + 重新生成 + 更新云函数环境变量，**不要只清理代码**。

## 三、当前结论（2026-10-07 实测）

| 检查项 | 结果 |
|---|---|
| 工作区特征词扫描 | 18 处命中，**全部为说明性文字**，无真实密钥 |
| Git 历史扫描 | 2 处命中（`TENCENTCLOUD_SECRET` / `postgresql://`），**均为文档说明文字** |
| `.env` 是否进过 Git | **从未提交** |
| `.env` 是否被忽略 | `git check-ignore -v .env` → `.gitignore:2` 命中 ✅ |

→ **无真实密钥泄露，无需作废重生成。**
