# 完整代码示例

本文档提供可直接复制的代码模板，覆盖添加新模块、新原型、三类标注等常见操作。

---

## 示例 1：添加一个新业务模块「会员体系」

### 步骤 1：在 CATALOG_MODULES 追加模块卡片

找到 `const CATALOG_MODULES=[`（在 init 函数内），在数组末尾追加：

```js
{id:'member-system',name:'会员体系',version:'v1.0',
 desc:'会员等级、积分、权益与成长体系，覆盖会员详情、积分明细、等级特权等页面。',
 status:'online',icon:'member',emoji:'👑',
 proto:'ms-detail',count:4,anno:28},
```

### 步骤 2：在 PROTOTYPES 数组追加该模块的原型

找到 `const PROTOTYPES_V03=[`（或新建数据块），在数组内追加原型对象（见示例 2）。

### 步骤 3：同步更新统计

确保 `CATALOG_MODULES` 中该模块的 `count`（原型数）和 `anno`（标注数）与实际一致。

---

## 示例 2：添加一个完整原型页面

以下是一个完整的原型对象，可直接复制到 `PROTOTYPES` 数组中修改：

```js
{
  id:'ms-detail',
  group:'会员体系',
  name:'会员详情页',
  device:'mobile',
  url:'',
  srcdoc:MEMBER_DETAIL_HTML,  // 需提前定义 const MEMBER_DETAIL_HTML=`...HTML...`
  status:'review',
  version:'v1.0',
  owner:'产品 · 梁伟业',
  updated:'2026-09-03',
  overview:{
    goal:'展示会员的等级、积分、权益与成长进度，引导会员完成任务提升等级。',
    scenario:['会员主动查看自己的等级权益','导购在会话中查看顾客会员信息'],
    entry:['我的页面点击会员卡片','导购端会话页点击顾客头像'],
    exit:['点击等级特权进入权益列表','点击积分明细进入流水页']
  },
  flow:[
    {t:'进入会员详情',d:'加载会员基础信息与等级状态'},
    {t:'查看等级进度',d:'展示当前等级、成长值与下一等级差距'},
    {t:'浏览权益列表',d:'按可用/即将可用/已过期分组展示'},
    {t:'完成升级任务',d:'点击任务跳转对应页面，完成后回写成长值'}
  ],
  states:[
    {n:'正常会员态',d:'展示等级、积分、权益'},
    {n:'即将升级态',d:'等级进度条高亮，展示升级倒计时'},
    {n:'降级预警态',d:'顶部黄色警示条，提示保级所需成长值'}
  ],
  hotspots:[
    // 标注内容见示例 3/4/5
  ]
}
```

---

## 示例 3：添加 element 类型标注（界面元素）

```js
{id:'ms-e1',selector:'.member-level-badge',type:'element',
 x:50,y:18,
 title:'会员等级徽章',
 desc:'展示当前会员等级名称与图标，等级越高颜色越亮；点击可查看等级体系说明。等级变化时有缩放动画。'},
```

**带区域框的 element 标注**（走查时高亮成块区域）：

```js
{id:'ms-e2',selector:'.points-card',type:'element',
 x:50,y:35,w:80,h:12,
 title:'积分卡片',
 desc:'展示当前可用积分、即将过期积分与积分明细入口。点击卡片进入积分流水页。'},
```

---

## 示例 4：添加 rule 类型标注（业务规则）

```js
{id:'ms-r1',selector:'.upgrade-progress',type:'rule',
 x:50,y:50,w:70,h:8,
 title:'等级升级规则',desc:'',
 rule:{
   code:'R-MEM-01',
   trigger:'会员成长值发生变化时（消费/任务/活动）',
   behavior:'成长值达到下一等级阈值时自动升级，推送升级通知，等级徽章即时更新；升级后 7 天内享受保级期',
   exception:'成长值扣除导致降级时，不立即降级，进入 30 天保级期，期内补回则不降级'
 }},
```

---

## 示例 5：添加 field 类型标注（数据字段）

```js
{id:'ms-f1',selector:'.points-value',type:'field',
 x:35,y:35,w:20,h:6,
 title:'可用积分 availablePoints',desc:'会员当前可用于兑换的积分余额。',
 field:{
   type:'integer',
   required:'是',
   format:'非负整数，最大 999999，超过显示 99万+',
   sample:'12580'
 }},
```

---

## 示例 6：调整走查顺序

走查顺序 = `hotspots` 数组的物理顺序。只需调整数组中元素的排列顺序：

```js
// 调整前：按页面从上到下
hotspots:[
  {id:'ms-e1',...},  // 顶部等级徽章 → 走查第1步
  {id:'ms-f1',...},  // 积分字段     → 走查第2步
  {id:'ms-r1',...},  // 升级规则     → 走查第3步
]

// 调整后：按用户操作路径（先看等级→再看规则→最后看字段）
hotspots:[
  {id:'ms-e1',...},  // 走查第1步
  {id:'ms-r1',...},  // 走查第2步（提前）
  {id:'ms-f1',...},  // 走查第3步
]
```

> **建议**：走查顺序按用户实际操作路径排列，而非页面物理位置。先入口、再核心操作、后辅助信息。

---

## 示例 7：新增数据块（原型数量较多时）

当一个模块包含 5+ 个原型时，建议新建独立数据块，避免单个数组过长：

```js
/* ---------- 会员体系原型 ---------- */
const MEMBER_DETAIL_HTML=`<!DOCTYPE html>...（原型HTML）...`;
const MEMBER_POINTS_HTML=`<!DOCTYPE html>...（原型HTML）...`;

const PROTOTYPES_MEMBER=[
  {id:'ms-detail',group:'会员体系',name:'会员详情页',...},
  {id:'ms-points',group:'会员体系',name:'积分明细页',...},
  // ...更多原型
];
PROTOTYPES.push.apply(PROTOTYPES,PROTOTYPES_MEMBER);  // 合并到主数组
```

---

## 常见问题排查

### Q1：添加原型后左侧目录不显示
- 检查 `id` 是否与已有原型重复
- 检查数据块是否有 `push.apply` 合并语句
- 检查 `group` 字段是否为空

### Q2：走查时聚光灯位置不对
- 检查 `selector` 是否能在 iframe 内选中真实元素（打开浏览器控制台，在 iframe context 中执行 `document.querySelector('你的selector')` 验证）
- 检查 `x`/`y` 坐标是否在 0-100 范围内
- 如果目标元素需要滚动才能看到，框架会自动滚动，但 selector 必须准确

### Q3：标注点点击后弹窗内容为空
- 检查 `title` 字段是否填写
- 检查 `desc` 或 `rule`/`field` 对象是否有内容

### Q4：目录页模块卡片点击没反应
- 检查 `status` 是否为 `'online'`（planned 状态不可点击）
- 检查 `proto` 字段是否指向一个真实存在的原型 id
- 检查 `CATALOG_MODULES` 是否在 init 函数内定义

### Q5：修改后页面没变化
- 浏览器缓存：URL 加 `?v=2`（递增数字）绕缓存
- 确认修改的是 `index.html` 而非 `prototypes-data.js`（后者是独立副本，不被页面引用）
