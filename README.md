# 电子设备使用指南

面向大二大三理工学生的手机 ↔ 电脑资料流转指南：怎么用（使用技巧），不是选购决策，也不是校园流程。

## 两个版本（Day 15 起并存）

| 版本 | 位置 | 技术 | 地址 |
|---|---|---|---|
| **静态站版** | 仓库根 `index.html` | HTML + 内联 CSS + 一段内联 JS（本地 mock 渲染），**零后端、零网络请求、零构建、零依赖** | <https://xingho-vibecoding.github.io/wenwu-vibecoding/> |
| **云开发版** | `web/`（Vite + React） | React 构建产物上传 CloudBase 静态托管 + 云函数接口 + PostgreSQL（Day 16 起） | <https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/> |

两版功能相同（同一套 hash 路由三视图：搜索 / 传输指南 / 设备指南）。**静态站版保留作断网兜底**——打开 `index.html` 就能用，不需要任何后端。

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

## 文件结构

```
├── index.html          # 【静态站版】整站单文件
├── web/                # 【云开发版】Vite + React 项目（dist/ 为构建产物，不入库）
├── cloudfunctions/     # 云函数源码留档（health/ = /api/health）
├── api-contract.md     # 接口契约（Day 15）：5 张表 + 6 个接口
├── research.md         # 调研文档（Day 3）
├── PRD.md              # 需求文档（Day 4，v2.0 Day 15）
├── TECH_DESIGN.md      # 技术设计（Day 5，v2.0 Day 15）
└── skills/             # 项目内 Skill（设计基线）
```

## 功能

- **三视图路由**：`#/search` 搜索 / `#/transfer` 传输指南 / `#/device` 设备指南，手写 hash 路由，地址可收藏可刷新
- **四状态渲染**：每个视图的列表都能呈现加载中 / 成功 / 空 / 错误四种状态（`?state=empty` / `?state=error` 可复现）
- **按任务跳转**：传输指南视图内一排任务按钮（拍板书、交作业、传安装包、同步笔记等 8 个），点击跳对应场景
- **场景教程**：USB 数据线 / LocalSend 局域网 / 网盘中转 / 云盘同步，共 4 个场景，每步标注难度与耗时
- **资源入口**：官方与实用资源网址（新标签打开，带一键复制）
- **仪器速查**：6 台教学仪器共 34 条操作条目，支持类型筛选 + 关键词搜索

## 线上访问

- GitHub Pages（静态站版，Day 7 上线）：`https://xingho-vibecoding.github.io/wenwu-vibecoding/`
- CloudBase 静态托管（云开发版，Day 15 上线）：`https://wenwu-331122-d6gyrwmum2a734671-1498877015.tcloudbaseapp.com/wenwu-vibecoding/`
- 接口基地址（云函数网关）：`https://wenwu-331122-d6gyrwmum2a734671-1498887015.ap-shanghai.app.tcloudbase.com`（当前仅 `/api/health` 可用）

> ⚠️ 云开发版状态（2026-09-30）：前端已上线但**数据仍来自本地 mock**，云函数只有 `/api/health` 一个，业务接口与数据库排 Day 16–20。
