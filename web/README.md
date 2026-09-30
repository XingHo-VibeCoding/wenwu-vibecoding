# web/ —— React 版前端（Day 15 起）

> **性质**：第 3 周的前端主线。第 2 周那个单文件静态站（仓库根目录 `index.html`）**保留不动**，继续供 GitHub Pages 使用；这里是按 Day 15 清单要求新建的 React 版，走 CloudBase 静态托管。

## 技术栈

| 项 | 值 |
|---|---|
| 构建工具 | Vite 5.4.11 |
| 框架 | React 18.3.1 |
| 路由 | 手写 hash 路由（`src/hooks/useHashRoute.js`），**不引路由库** |
| 数据 | `src/data/mock.js`——由 `.workbuddy/extract-data.js` 从根目录 `index.html` **程序化提取**，内容与静态站完全一致（4 场景 / 6 资源 / 34 条仪器操作 / 8 条任务索引） |

## 本地命令

```powershell
cd "C:\Users\zuwen\Desktop\vibecoding实战工作区\web"
C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\npm.cmd install
C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\npm.cmd run dev      # 开发预览
C:\Users\zuwen\.workbuddy\binaries\node\versions\22.22.2-3\npm.cmd run build    # 产出 dist/
```

## 三个视图（与静态站同口径）

| 路径 | 名称 | 内容 |
|---|---|---|
| `#/search` | 搜索（默认） | 两个搜索框：任务/场景 + 仪器操作 |
| `#/transfer` | 传输指南 | 场景卡片 ×4 + 资源入口 ×6 |
| `#/device` | 设备指南 | 仪器速查：类型筛选 + 关键词搜索 + 34 条条目 |

## 部署（CloudBase 静态网站托管）

1. `npm run build` 产出 `web/dist/`
2. 把 `dist/` 打成一个 zip（`Compress-Archive`）
3. CloudBase 控制台 →「静态网站托管」→ 上传该 zip（或上传 `dist` 目录内容）
4. 拿到托管默认域名后，浏览器打开验证三视图可切换

`web/dist/` 已在根 `.gitignore` 中忽略（构建产物不入库）。

## 本版范围（诚实说明）

- **是**：三视图 + 真实数据（与静态站同源）+ 搜索/筛选交互 + 移动端窄屏样式
- **不是**（留给 Day 16–20）：真实接口调用、四状态机（loading/empty/error 需真实数据源才有意义）、场景分步详情（静态站里是手写 HTML，迁移未做）、回到顶部按钮、资源复制按钮

## 设计基线

样式遵循项目 Skill `skills/frontend-design-baseline/SKILL.md`（对比度 AA / 字号 ≥13px / 间距 8 的倍数 / 交互三态）。所用颜色的对比度均为本机实测，数值与出处见 `src/styles.css` 头部注释。
