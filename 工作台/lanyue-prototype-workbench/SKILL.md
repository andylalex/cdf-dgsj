---
name: lanyue-prototype-workbench
description: 蓝月产品原型工作台的维护与扩展指南。当需要往工作台添加新业务模块、新增/修改原型页面、配置或更新热点标注（界面元素/业务规则/数据字段）、调整 PRD 说明（概览/流程/状态）、更新目录页模块卡片、或排查走查定位问题时使用。覆盖数据结构、配置规范、selector 编写、走查顺序控制、验证流程等完整维护知识。
---

# 蓝月产品原型工作台 · 维护指南

## 架构概览

工作台是**单文件原生 HTML/CSS/JS**（无构建、无框架），所有内容由数据驱动：

- **文件**：`prototype-workbench/index.html`（唯一交付物，自包含）
- **三栏布局**：左侧原型目录 / 中间 iframe 交互原型 / 右侧 PRD 说明
- **核心数据**：`PROTOTYPES` 数组（驱动全部三栏）+ `CATALOG_MODULES` 数组（驱动目录页）
- **热点标注**：每个原型的 `hotspots` 数组，同时驱动标注点、悬停框选、点击弹窗、聚光灯走查
- **走查顺序**：等于 `hotspots` 数组的物理顺序，无需额外配置

## 数据分布（添加内容时定位用）

| 数据块 | Grep 关键词 | 内容 |
|---|---|---|
| `PROTOTYPES` | `const PROTOTYPES=[` | 内置示例原型（login 等） |
| `PROTOTYPES_B` | `const PROTOTYPES_B=[` | 第二批内置原型，末尾 `push.apply` 合并 |
| `PROTOTYPES_V03` | `const PROTOTYPES_V03=[` | v0.3 业务原型，末尾 `push.apply` 合并 |
| `CATALOG_MODULES` | `const CATALOG_MODULES=[` | 目录页模块卡片（在 init 函数内） |
| 原型 HTML 模板 | `const XXX_HTML=` | srcdoc 内嵌的原型页面 HTML |

> **新增原型时**：在对应数据块数组内追加对象即可，框架自动渲染左侧目录、中间 iframe、右侧 PRD。无需改任何框架代码。

## 核心工作流

### 流程 A：添加一个新业务模块（如"会员体系"）

1. **在 `CATALOG_MODULES` 追加模块卡片**：设置 `status:'online'`、`proto` 指向该模块默认原型 id、`count`/`anno` 填统计数
2. **在 `PROTOTYPES`（或新建数据块）添加该模块的所有原型**：每个原型一个对象，`group` 字段统一为模块名（如"会员体系"），左侧目录会自动按 group 分组
3. **为每个原型配置 `hotspots`**：见流程 C
4. **验证**：见下方「验证流程」

### 流程 B：添加一个新原型页面

1. 在对应数据块数组中追加原型对象，**必填字段**：`id`（全局唯一）、`group`、`name`、`device`、`url` 或 `srcdoc`（二选一）
2. 配置 PRD 说明：`overview`（goal/scenario/entry/exit）、`flow`（主交互流程步骤数组）、可选 `states`
3. 配置 `hotspots` 数组（至少 1 个，否则走查无内容）
4. 验证

### 流程 C：添加/修改热点标注

1. **确定 `selector`**：在原型 iframe 的 DOM 中找到目标元素，写 CSS 选择器（如 `#loginBtn`、`.msg-item:last-child`）。**必须是 iframe 内真实存在的元素**，否则定位失效
2. **确定 `type`**：
   - `element`：界面元素（按钮、输入框、卡片等），只需 `desc`
   - `rule`：业务规则，需额外 `rule` 对象（code/trigger/behavior/exception）
   - `field`：数据字段，需额外 `field` 对象（type/required/format/sample）
3. **确定位置 `x`/`y`**：热点圆点在原型容器中的百分比坐标（0-100），用于标注点渲染
4. **可选区域框 `w`/`h`**：走查时高亮的区域框大小（百分比），适合输入框、按钮组、表格等成块区域
5. **走查顺序**：`hotspots` 数组的物理顺序即走查顺序，调整数组顺序即可调整走查步骤顺序

### 流程 D：更新目录页模块统计

修改 `CATALOG_MODULES` 中对应模块的 `count`（原型数）和 `anno`（标注数）。这两个数是手动维护的静态值，新增原型/标注后需同步更新。

## 关键注意事项（高频踩坑点）

1. **`id` 全局唯一**：原型 id 和 hotspot id 都不能重复，否则切换/定位混乱
2. **`selector` 必须真实存在**：走查定位依赖 `iframe.contentDocument.querySelector(selector)`，selector 写错会导致聚光灯无法聚焦。添加后务必浏览器实测
3. **`srcdoc` 优先于 `url`**：两者都填时框架优先用 srcdoc。外部原型用 url，内嵌原型用 srcdoc（模板字符串变量）
4. **走查自动滚动**：框架会自动滚动 iframe 让聚焦元素进入视野，无需手动配置，但 selector 必须准确
5. **`device` 影响设备框**：`mobile` 显示手机壳，`desktop` 显示桌面窗口，`tablet` 显示平板
6. **数据块合并**：`PROTOTYPES_B` 和 `PROTOTYPES_V03` 通过 `push.apply` 合并到主 `PROTOTYPES`，新增数据块时记得在末尾加合并语句
7. **单文件约束**：所有原型 HTML、图片、数据都内嵌在 index.html 中，新增原型时图片用 base64 或 CDN URL，不要用本地路径

## 验证流程（每次修改后必做）

1. **语法校验**：提取两个 inline `<script>` 到临时文件，跑 `node --check`
   ```bash
   node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const re=/<script>([\s\S]*?)<\/script>/g;let m,i=0;while((m=re.exec(h))){i++;fs.writeFileSync('/tmp/s'+i+'.js',m[1]);}"
   node --check /tmp/s1.js && node --check /tmp/s2.js
   ```
2. **浏览器实测**：
   - 启动本地服务：`python3 -m http.server 8765`
   - 访问 `http://localhost:8765/index.html?v=N`（加版本号绕缓存）
   - 验证：左侧目录出现新原型 → 点击切换正常 → 右侧 PRD 显示正确 → 标注点位置准确 → 走查启动/切换/退出正常 → 聚光灯定位准确
3. **走查专项**：按 T 启动走查，逐个检查每个标注的聚光灯位置、弹窗内容、自动滚动是否正常

## 参考文档

- **完整数据结构**：见 [references/data-schema.md](references/data-schema.md) — PROTOTYPES / hotspots / PRD / CATALOG_MODULES 所有字段的详细说明、类型、必填性、示例值
- **完整代码示例**：见 [references/examples.md](references/examples.md) — 添加新模块、新原型、三类标注（element/rule/field）的完整可复制代码模板
