---
name: frontend-design-baseline
description: 《电子设备使用指南》前端设计基线。给 index.html 新增或修改任何界面元素（按钮、卡片、列表、输入框、板块）时必须先读取本文件并逐条自查；含对比度、字号、间距、交互四态的可核对标准与自查清单。
---

# 前端设计基线（frontend-design-baseline）

> **来源**：Day 9（2026-09-24）设计审查确立，用户拍板「甲：用行业标准」（规则本身不落文件，本文件即其固化形态）。
> **性质**：把已定规则整理为可核对清单，**不是新立规矩**——核对结论与 PRD/TECH_DESIGN 冲突时，停下问用户，以用户决定为准。

## 适用时机

- 给页面新增任何 UI 元素（按钮 / 卡片 / 列表 / 输入框 / 板块）**之前**
- 修改现有元素的颜色、字号、间距、交互状态时
- 审查界面改动是否符合基线时

## 四条基线（逐条可核对）

### 1. 对比度 —— WCAG 2.1 AA

| 对象 | 下限 |
|---|---|
| 正文、说明性小字 | **≥ 4.5 : 1** |
| 组件边界（边框、描边） | **≥ 3 : 1** |

**已核实参照**（Day 9 实测，可直接复用，不必重测）：

| 色 | 场景 | 结果 |
|---|---|---|
| 星级橙 `#946200` on 白底 | 难度星级文字 | 过 AA（Day 9 修复：原 `#d98a00` 仅 2.77:1 不达标） |
| 成功绿 `#1c7a43` on `#e6f6ec` | 复制成功状态 | 5.37 : 1 PASS |
| 错误红 `#9c3a3a` on `#fdf3f3` | 复制失败 / 错误态 | 6.26 : 1 PASS |

新配色必须**实测后才能用**，测不出的不上（呼应项目规则"不许编造数据"）。

### 2. 字号下限 13px

全站任何文字 ≥ 13px，无例外（placeholder、辅助说明、计数文本都算文字）。

### 3. 间距取 8 的倍数

新增的 `padding` / `margin` / `gap` 一律取 8 的倍数（8 / 16 / 24 / 32…）。历史遗留的非 8 倍数值（如早期写的 14px）**不追溯**，但新代码必须守。

### 4. 可交互元素三态齐备

每个可交互元素必须有可见的 **hover / active / focus-visible** 三态；用了 `disabled` 时也要有对应样式（`cursor: wait/not-allowed` + 降透明度，参照 `.copy-btn[disabled]`）。键盘焦点由全局 `:focus-visible`（Day 9 建）自动继承，新元素**不必重复写**，但要在浏览器里实际 Tab 一下确认。

## 新增 UI 自查清单（逐条打钩，核对结果写进调用记录）

- [ ] 所有新文字 ≥ 13px
- [ ] 正文/小字对比度 ≥ 4.5:1；边框对比度 ≥ 3:1（新色须实测）
- [ ] 新间距全部是 8 的倍数
- [ ] 新可交互元素 hover / active / focus-visible 齐备（有 disabled 场景则四态）
- [ ] 优先复用现有语义色（品牌蓝 / 成功绿 / 错误红 / 星级橙），不开新色
- [ ] aria：状态文本变化用 `aria-live`，开关/选中用 `aria-pressed`，控件有可读 label

## 调用记录

> 格式：日期 ｜ 用在哪 ｜ 核对结果（过 / 改了什么）。每次真实调用后追加一行。

（暂无记录——首次调用见下一行之后）

- 2026-09-27 ｜ Day 12 仪器速查类型筛选按钮（`.ins-chip` ×7，index.html）｜ **全过**：文字均 13px；未开新色，复用品牌蓝系（白字 on `#185fa5` 按 WCAG 公式计算 6.5:1，过 4.5；边框同色过 3:1）；间距 8/16 全为 8 倍数；hover / active 齐备，focus-visible 由全局继承（Tab 实测留给用户）；选中态由 `aria-pressed` 驱动，按钮组带 `aria-label`；无 disabled 场景
- 2026-09-28 ｜ Day 13 视图导航（`nav.views a` ×3）+ 搜索视图（`section.searchpg`、`.sv-field input` ×2、`ul.sv-list a`，index.html）｜ **全过**：文字均 ≥13px（13 / 14px）；未开新色，只复用品牌蓝系（白字 on `#185fa5` = 6.5:1 过 4.5；边框同色过 3:1）；新间距全为 8 的倍数（padding 8/16、gap 8、margin 16/24）；hover / active 齐备（输入框沿用既有做法：hover 改中性边框、focus 改品牌蓝边框），focus-visible 由全局继承（Tab 实测待用户）；选中态由 `aria-current="page"` 驱动，搜索框有 label，结果区 `aria-live="polite"`；无 disabled 场景
- 2026-09-28 ｜ Day 13 板块③ 搜索 / 设备视图四状态（`.demo-bar` ×2 复用 `.demo-btn`、`.skel-col` 骨架、`.state-box` 空态/错误态复用，index.html）｜ **全过**：未新增任何交互样式——演示按钮、骨架屏、空态/错误态框、重试按钮全部复用 Day 8 既有类；唯一新 CSS 是 `.skel-col`（纯布局，gap 16 = 8 倍数，无文字无交互）；错误态配色沿用已实测参照（`#9c3a3a` on `#fdf3f3` = 6.26:1）；状态区带 `aria-live="polite"`。**顺带修掉一个越界 bug**：主视图老代码 `querySelectorAll(".demo-btn")` 全局抓按钮，新增两组演示按钮后会把别视图的按钮也绑上——已限定 `#mainview .demo-btn`。教训已验证：全局类选择器在页面拆视图后会跨视图误伤，新代码一律从容器内向下查。
- 2026-09-29 ｜ Day 14 最小修复 回到顶部浮动按钮（`.totop`，index.html）｜ **全过**：文字 13px（达标）；未开新色——白底 + 品牌蓝文字 `#185fa5`（WCAG 对比度 6.5:1 过 4.5，与 Day 12 白字 on 蓝同源对称），边框同为 `#185fa5` 对页面底 `#f7f6f3` ≈ 6.3:1 过 3:1；新间距 `padding: 8px 16px`、`right/bottom: 16px` 全为 8 的倍数（窄屏沿用同值，未另写规则）；hover（`--accent-soft`）/ active（`#d8eaf9`）齐备，focus-visible 由全局继承（Tab 实测留给用户）；`aria-label="回到页面顶部"` 已加，显隐由 `.is-on` 控制（不用 `hidden`，避免与 `display` 冲突）；无 disabled 场景。**可访问性加项**：点击后按钮即将隐藏，焦点主动交给 `nav.views a`，避免焦点留在 `display:none` 元素上；动效尊重 `prefers-reduced-motion`。
- 2026-09-30 ｜ Day 15 板块③ React 版界面（`web/src/styles.css` 全量 + `App.jsx` / 三个视图 / `OpItem.jsx`）｜ **全过（含一处口径修正）**：文字最小 13px（13 / 14 / 15 / 18 / 26px）；颜色**全部本机实测**（脚本 `.workbuddy/contrast.js` + `contrast2.js`，WCAG 公式）——正文 `#24211c` on 白 16.04:1、小字 `#5c5a55` 6.89:1（on 页底 6.37）、品牌蓝 `#185fa5` 6.52:1（on 页底 6.04）、白 on 蓝 6.52、错误 `#9c3a3a` on `#fdf3f3` 6.26、成功 `#1c7a43` on `#e6f6ec` 4.79、星级 `#946200` 5.24；间距全为 8 的倍数；三态齐备（hover / active / 全局 `:focus-visible` outline）；未开新色；aria：导航 `aria-current="page"`、筛选 `aria-pressed`、结果区 `aria-live="polite"`、输入框均有 label。**⚠️ 顺带发现静态站的一处不达标**：根目录 `index.html` 的卡片/输入框浅色边框（约 `#d8d3c9` vs 页底 `#f7f6f3`）实测仅 **1.38:1**，未达组件边界 3:1；React 版因此改用 `#8f887a`（3.25:1 / 对白 3.52:1）。静态站是否回改待用户决定（Day 9 当时的口径只覆盖了文字与星级橙，未逐项量边框）。

