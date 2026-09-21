# 电子设备使用指南

面向大二大三理工学生的手机 ↔ 电脑资料流转指南：怎么用（使用技巧），不是选购决策，也不是校园流程。

纯 HTML + CSS 的单页静态站，**零 JS、零后端、零依赖**——打开 `index.html` 就能用。

## 本地运行

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

直接双击 `index.html` 用浏览器打开即可（跳转按钮和锚点均为纯 HTML 能力，不依赖服务器）。

## 文件结构

```
├── index.html      # 整站（HTML + 内联 CSS，单文件即全部页面）
├── research.md     # 调研文档（Day 3）
├── PRD.md          # 需求文档（Day 4）
└── TECH_DESIGN.md  # 技术设计（Day 5）
```

## 功能

- **按任务跳转**：顶部一排任务按钮（拍板书、交作业、传安装包、同步笔记等 8 个），点击即跳对应场景锚点——纯 HTML 表单实现，零 JS
- **场景教程**：USB 数据线 / LocalSend 局域网 / 网盘中转 / 云盘同步，共 4 个场景、20 个步骤，每步标注难度与耗时
- **资源入口**：官方与实用资源网址（新标签打开）

## 线上访问

部署在 GitHub Pages（Day 7 上线）：`https://xingho-vibecoding.github.io/wenwu-vibecoding/`
