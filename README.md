# 电子设备使用指南

面向大二大三理工学生的手机 ↔ 电脑资料流转指南：怎么用（使用技巧），不是选购决策，也不是校园流程。

## 两个版本（Day 15 起并存）

| 版本 | 位置 | 技术 | 地址 |
|---|---|---|---|
| **静态站版** | 仓库根 `index.html` | HTML + 内联 CSS + 一段内联 JS（本地 mock 渲染），**零后端、零网络请求、零构建、零依赖** | <https://xingho-vibecoding.github.io/wenwu-vibecoding/> |
| **云开发版** | `web/`（Vite + React） | React 构建产物上传 CloudBase 静态托管 + 云函数接口 + PostgreSQL（Day 16 起） | <https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/> |

两版核心功能相同（同一套 hash 路由三视图：搜索 / 传输指南 / 设备指南）；**云开发版另有场景详情视图** `#/scene/<id>`（点场景卡片进入，展示该场景的 5 个步骤），静态站版无详情页、点卡片是滚动定位。**静态站版保留作断网兜底**——打开 `index.html` 就能用，不需要任何后端。

## 本地运行

### 静态站版

任选其一：

**方式一：Python 内置服务器（推荐）**

```powershell
& "C:\Users\zuwen\.workbuddy\binaries\python\versions\3.13.12\python.exe" -m http.server 8000 --bind 127.0.0.1 --directory "C:\Users\zuwen\Desktop\vibecoding实战工作区"
```

如果装了普通 Python，也可以简化为（在项目目录下执行）：

```powershell
python -m http.server 8000
```

然后在浏览器打开 <http://localhost:8000/index.html>。

**方式二：直接双击**

直接双击 `index.html` 用浏览器打开即可。

### 云开发版

```powershell
cd web
npm install
npm run dev      # 本地开发预览
npm run build    # 构建产物到 web/dist/，上传 CloudBase 静态托管
```

## 发布前检查（上线前验收）

每次改动上线前跑一遍「发布前检查」，用**证据**替代"我感觉没问题"。

在对话里说一句 **「跑发布前检查」**（或「按 verify-project 跑一遍」），AI 会读 `skills/verify-project/SKILL.md` 逐项执行，输出 `[PASS]/[FAIL] + 证据`（命令原文 + 关键输出行），最后给 `小结：PASS n / FAIL m`。**禁用「看起来正常」这类模糊表述 —— 说不清即为 FAIL。**

也可以直接跑执行器：

```powershell
& "C:\Users\zuwen\.workbuddy\binaries\python\versions\3.13.12\python.exe" "C:\Users\zuwen\Desktop\vibecoding实战工作区\tests\verify-project-run.py"
```

> ⚠️ 跑检查 1 前**先 `vite build`** —— 它比对的是「线上 JS 字节数 vs 本地 `web/dist/`」，不先构建就会比到上一次的旧产物。

**7 项检查**（每一项都来自本项目真实踩过的坑）：

| # | 检查项 | 怎么算通过 |
|---|---|---|
| 1 | 公网首页可访问 + 真数据 | `index.html` 200 ｜ JS 字节数与本地 `web/dist/` **逐一吻合** ｜ JS 内含网关域名 + `/scenes` `/resources` `/instruments` `/tasks` |
| 2 | `GET /api/health` | 200，且响应体**恰好** `{"ok":true,"service":"wenwu-vibecoding"}`（字段级比对） |
| 3 | 读接口（5 路 GET） | 全部 200，且**字段集逐一吻合契约**（缺字段即 FAIL，肉眼看不出来必须程序比对） |
| 4 | 写接口（**只跑错误分支**） | 4a `missing_field` / 4b `empty_patch` / 4c `invalid_param` / 4d `task_not_found`，且跑前跑后 `tasks` 数一致（**零变更**） |
| 5 | 无硬编码密钥 | 源码树 + **git 全历史**，严格 JWT 模式 `eyJ[A-Za-z0-9_-]{10,}` **0 命中** |
| 6 | `.gitignore` / `.env.example` | `.env` 被忽略且未跟踪 ｜ `.env.example` 已跟踪且**无真值** |
| 7 | 数据库可连 + 5 表存在 | 5 张表各有 200 且非空数据（**经接口间接证明**，AI 不持有库凭据） |

> ⚠️ 检查 4 **不跑写成功路径**（三个写接口都会不可撤销地改线上库，违背"只做不落库/可回滚探测"的铁律，成功路径属人工执行）；检查 7 是**间接证明**，非直连库核验。完整判定口径、Day 26 基线值、已知局限见 `skills/verify-project/SKILL.md`。

## 文件结构

```
├── index.html          # 【静态站版】整站单文件
├── web/                # 【云开发版】Vite + React 项目（dist/ 为构建产物，不入库）
├── cloudfunctions/     # 云函数源码留档（health/ = /api/health；scenes/ = 全部业务接口）
├── api-contract.md     # 接口契约（Day 15 建，现 v1.9）：5 张表 + 9 个接口（6 读 + 3 写）
├── research.md         # 调研文档（Day 3）
├── PRD.md              # 需求文档（Day 4，现 v2.4）
├── TECH_DESIGN.md      # 技术设计（Day 5，现 v2.5）
├── tests/              # 测试清单与实跑存档（error-triage / verify-project / day25-bugfix 等）
└── skills/             # 项目内 Skill：设计基线 / CloudBase 运维 / 发布前检查
```

## 功能

- **视图路由**：`#/search` 搜索 / `#/transfer` 传输指南 / `#/device` 设备指南，云开发版另有 `#/scene/<id>` 场景详情；手写 hash 路由，地址可收藏可刷新
- **四状态渲染**：每个视图的列表都能呈现加载中 / 成功 / 空 / 错误四种状态（`?state=empty` / `?state=error` 可复现）
- **按任务跳转**：传输指南视图内一排任务按钮（拍板书、交作业、传安装包、同步笔记等 8 个），点击跳对应场景
- **场景教程**：USB 数据线 / LocalSend 局域网 / 网盘中转 / 云盘同步，共 4 个场景，每步标注难度与耗时
- **资源入口**：官方与实用资源网址（新标签打开，带一键复制）
- **仪器速查**：6 台教学仪器共 34 条操作条目，支持类型筛选 + 关键词搜索

## 线上访问

- GitHub Pages（静态站版，Day 7 上线）：`https://xingho-vibecoding.github.io/wenwu-vibecoding/`
- CloudBase 静态托管（云开发版，Day 15 上线）：`https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/`
- 接口基地址（云函数网关）：`https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com`（前缀 `/api`，现有 6 个读接口 + 3 个写接口）

> ⚠️ 云开发版状态（2026-10-10 更新）：前端已上线，**数据来自 PostgreSQL 真实数据**——6 个读接口 + 3 个写接口全部在 `scenes` 云函数内（`health/` 仅提供 `/api/health`）；已含场景详情视图。上线前跑一遍「发布前检查」（见上）。
