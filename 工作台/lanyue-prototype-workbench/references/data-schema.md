# 数据结构完整参考

本文档详细说明蓝月产品原型工作台所有配置数据的字段定义、类型、必填性和示例值。

---

## 一、PROTOTYPES 数组（原型配置）

每个原型是一个对象，追加到 `PROTOTYPES`、`PROTOTYPES_B` 或 `PROTOTYPES_V03` 数组中。

### 顶层字段

| 字段 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | ✅ | 原型唯一标识，全局不可重复。用于 hash 路由、切换、目录关联 | `'v03-g3'` |
| `group` | string | ✅ | 左侧目录分组名，同组原型自动归到同一分组下 | `'导购端 · 繁星APP'` |
| `name` | string | ✅ | 原型显示名称，出现在左侧目录、面包屑、右侧标题 | `'G3 导购 IM 会话页'` |
| `device` | string | ✅ | 设备类型，决定中间展示区的设备框样式：`mobile` / `desktop` / `tablet` | `'mobile'` |
| `url` | string | ⚠️ | 外部原型 URL，与 `srcdoc` 二选一。两者都填时优先 srcdoc | `'https://example.com/prototype.html'` |
| `srcdoc` | string | ⚠️ | 内嵌 HTML 字符串，与 `url` 二选一。通常引用预定义的模板变量 | `LOGIN_HTML` |
| `status` | string | ❌ | 原型状态标签，显示在右侧 PRD 区：`review`（评审中）/ `online`（已上线）/ `draft`（草稿） | `'review'` |
| `version` | string | ❌ | 版本号，显示在面包屑和目录中 | `'v0.3'` |
| `owner` | string | ❌ | 负责人，显示在右侧 PRD 区 | `'产品 · 梁伟业'` |
| `updated` | string | ❌ | 更新日期，显示在右侧 PRD 区 | `'2026-09-01'` |
| `overview` | object | ❌ | PRD 概览，见下方「overview 结构」 | — |
| `flow` | array | ❌ | 主交互流程步骤数组，见下方「flow 结构」 | — |
| `states` | array | ❌ | 页面状态数组，见下方「states 结构」 | — |
| `hotspots` | array | ❌ | 热点标注数组，见下方「hotspots 结构」。为空则走查无内容 | — |

### overview 结构（PRD 概览）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `goal` | string | ❌ | 页面目标，一段描述性文字 |
| `scenario` | string[] | ❌ | 用户场景列表，每项一个场景 |
| `entry` | string[] | ❌ | 入口列表，每项一个入口描述 |
| `exit` | string[] | ❌ | 出口列表，每项一个出口描述 |

示例：
```js
overview:{
  goal:'让新老用户用「手机号 + 短信验证码」在一屏内完成登录。',
  scenario:['换机或退出后重新登录','新用户首次进入 App'],
  entry:['启动未登录态自动跳转','token 过期被拦截后跳回'],
  exit:['校验通过 → 写入 token，进入首页','连续失败 5 次 → 锁定']
}
```

### flow 结构（主交互流程）

数组中每个对象：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `t` | string | ✅ | 步骤名称 |
| `d` | string | ❌ | 步骤详细描述 |

示例：
```js
flow:[
  {t:'进入登录页',d:'未登录态访问受保护页面时重定向到此'},
  {t:'输入手机号',d:'失焦实时校验号段格式'},
  {t:'获取短信验证码',d:'手机号合法才允许点击，60s 倒计时'}
]
```

### states 结构（页面状态）

数组中每个对象：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `n` | string | ✅ | 状态名称 |
| `d` | string | ❌ | 状态描述 |

示例：
```js
states:[
  {n:'默认空态',d:'按钮禁用，无错误提示'},
  {n:'校验错误态',d:'字段下方红字，定位到首个错误项'}
]
```

---

## 二、hotspots 数组（热点标注）

`hotspots` 是原型对象内的数组，每个元素是一个标注。**数组的物理顺序即走查顺序**。

### 通用字段（所有 type 共用）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | ✅ | 标注唯一 ID，原型内不可重复。建议命名：`{原型缩写}-{类型缩写}-{序号}` | `'lg-e1'` |
| `selector` | string | ✅ | iframe 内目标元素的 CSS 选择器，用于实时定位和聚光灯聚焦。**必须真实存在** | `'#loginBtn'` |
| `type` | string | ✅ | 标注类型：`element`（界面元素）/ `rule`（业务规则）/ `field`（数据字段） | `'element'` |
| `x` | number | ✅ | 热点圆点 X 坐标，百分比（0-100），基于原型容器宽度 | `50` |
| `y` | number | ✅ | 热点圆点 Y 坐标，百分比（0-100），基于原型容器高度 | `34` |
| `w` | number | ❌ | 走查区域框宽度，百分比。适合成块区域（输入框、按钮组） | `44` |
| `h` | number | ❌ | 走查区域框高度，百分比 | `6` |
| `title` | string | ✅ | 标注标题，显示在弹窗和走查卡片中 | `'登录按钮'` |
| `desc` | string | ❌ | 标注描述，一段说明文字 | `'全宽主行动按钮'` |

### type=element（界面元素）

仅需通用字段，`desc` 描述元素的视觉态、交互行为等。

示例：
```js
{id:'lg-e4',selector:'#loginBtn',type:'element',x:50,y:73,
 title:'登录 / 注册主按钮',
 desc:'全宽主行动按钮，具备禁用、可用、加载三种视觉态；点击后进入 loading 并锁定，防止重复提交。'}
```

### type=rule（业务规则）

在通用字段基础上，需额外 `rule` 对象：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `rule.code` | string | ❌ | 规则编号，如 `R-ACC-01` |
| `rule.trigger` | string | ❌ | 触发条件 |
| `rule.behavior` | string | ❌ | 正常行为 |
| `rule.exception` | string | ❌ | 异常/边界情况 |

示例：
```js
{id:'lg-r1',selector:'#smsBtn',type:'rule',x:73,y:53,w:30,h:6,
 title:'验证码发送频控',desc:'',
 rule:{
   code:'R-ACC-01',
   trigger:'点击「获取验证码」且手机号格式合法',
   behavior:'调用短信网关下发 6 位数字码，本地按钮进入 60 秒倒计时；同一手机号 1 小时内最多发送 5 次',
   exception:'超出频控返回 429，按钮置灰并提示「操作过于频繁，请稍后再试」'
 }}
```

### type=field（数据字段）

在通用字段基础上，需额外 `field` 对象：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `field.type` | string | ❌ | 字段类型，如 `string(11)`、`number`、`boolean` |
| `field.required` | string | ❌ | 是否必填：`是` / `否` |
| `field.format` | string | ❌ | 格式约束，正则或文字描述 |
| `field.sample` | string | ❌ | 示例值 |

示例：
```js
{id:'lg-f1',selector:'#phone',type:'field',x:86,y:34,w:26,h:7,
 title:'手机号 phone',desc:'登录主体的唯一标识字段。',
 field:{
   type:'string(11)',
   required:'是',
   format:'/^1[3-9]\\d{9}$/，号段 3-9 开头',
   sample:'13800138000'
 }}
```

---

## 三、CATALOG_MODULES 数组（目录页模块卡片）

在 init 函数内定义，驱动目录页的模块卡片网格。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | ✅ | 模块唯一 ID | `'guide-upgrade'` |
| `name` | string | ✅ | 模块名称 | `'导购升级'` |
| `version` | string | ❌ | 版本号，显示在名称旁 | `'v0.3'` |
| `desc` | string | ✅ | 模块描述，一段文字 | `'导购端与顾客端的 IM 会话...'` |
| `status` | string | ✅ | 模块状态：`online`（已上线，可点击进入）/ `planned`（规划中，灰色不可点） | `'online'` |
| `icon` | string | ❌ | 图标 CSS class 名 | `'guide'` |
| `emoji` | string | ❌ | emoji 图标，显示在卡片左上角 | `'💬'` |
| `proto` | string | ⚠️ | 点击后进入的原型 ID。`status='online'` 时必填 | `'v03-g3'` |
| `count` | number | ❌ | 该模块包含的原型数量（手动维护） | `11` |
| `anno` | number | ❌ | 该模块包含的标注总数（手动维护） | `75` |

示例：
```js
{id:'guide-upgrade',name:'导购升级',version:'v0.3',
 desc:'导购端与顾客端的 IM 会话、商品推荐、快捷创建订单。',
 status:'online',icon:'guide',emoji:'💬',
 proto:'v03-g3',count:11,anno:75}
```

---

## 四、数据块合并机制

工作台将原型数据分散在三个数组中，最终合并为一个 `PROTOTYPES`：

```
PROTOTYPES（主数组，内置示例）
    ↑ push.apply
PROTOTYPES_B（第二批内置）
    ↑ push.apply
PROTOTYPES_V03（v0.3 业务原型）
```

**新增数据块时**：
1. 定义新数组 `const PROTOTYPES_XXX=[...]`
2. 在数组末尾后加合并语句：`PROTOTYPES.push.apply(PROTOTYPES,PROTOTYPES_XXX);`
3. 框架的 `current()` 函数通过 `PROTOTYPES.find()` 查找原型，合并后自动可用

---

## 五、字段命名约定

| 约定 | 说明 | 示例 |
|---|---|---|
| 原型 ID | `{版本缩写}-{端缩写}{序号}` | `v03-g3`（v0.3 · 导购端 · 第3个） |
| 标注 ID | `{原型缩写}-{类型缩写}{序号}`，e=element/r=rule/f=field | `lg-e1`（login · element · 1） |
| 模板变量 | `{原型名大写}_HTML` | `LOGIN_HTML`、`ADMIN_HTML` |
| group 命名 | `{端} · {产品/平台}` | `'导购端 · 繁星APP'`、`'管理后台 · PC'` |
