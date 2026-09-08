/* 原型数据（由编辑版「导出原型数据」自动生成；HTML 通过 <script src="prototypes-data.js"></script> 加载）
   修改数据保存后即可生效，无需再合并回 HTML。 */

const PROTOTYPES=[];

/* ---------- v0.4 门店导购升级原型包（本地文件） ---------- */
const V04={
  "U1": {
    "url": "v0.4/U1-用户端IM会话页.html",
    "device": "mobile",
    "group": "用户端 · CDF海南免税"
  },
  "U6": {
    "url": "v0.4/U6-意向单页.html",
    "device": "mobile",
    "group": "用户端 · CDF海南免税"
  },
  "U4": {
    "url": "v0.4/U4-结算中心页.html",
    "device": "mobile",
    "group": "用户端 · CDF海南免税"
  },
  "U5": {
    "url": "v0.4/U5-行程核验页.html",
    "device": "mobile",
    "group": "用户端 · CDF海南免税"
  },
  "G1": {
    "url": "v0.4/G1-工作台.html",
    "device": "mobile",
    "group": "导购端 · 繁星APP"
  },
  "G2": {
    "url": "v0.4/G2-消息会话列表.html",
    "device": "mobile",
    "group": "导购端 · 繁星APP"
  },
  "G3": {
    "url": "v0.4/G3-导购IM会话页.html",
    "device": "mobile",
    "group": "导购端 · 繁星APP"
  },
  "G4": {
    "url": "v0.4/G4-选择商品.html",
    "device": "mobile",
    "group": "导购端 · 繁星APP"
  },
  "G8": {
    "url": "v0.4/G8-移动端业绩管理.html",
    "device": "mobile",
    "group": "导购端 · 繁星APP"
  },
  "M3": {
    "url": "v0.4/M3-PC业绩管理.html",
    "device": "desktop",
    "group": "管理后台 · PC"
  },
  "M4": {
    "url": "v0.4/M4-消息管理.html",
    "device": "desktop",
    "group": "管理后台 · PC"
  }
};

const PROTOTYPES_V03=[
  {
    "id": "v04-u1",
    "group": "用户端 · CDF海南免税",
    "name": "U1 用户端 IM 会话页",
    "device": "mobile",
    "url": "v0.4/U1-用户端IM会话页.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "用户在IM里发优惠券",
      "path": "导购入口 → 导购消息对话页",
      "users": "C端用户",
      "permission": "功能权限：所有商城用户均有功能权限数据权限：不涉及",
      "ports": "中免海南 APP（安卓、IOS、鸿蒙）、中免海南微信小程序、中免海南支付宝小程序、H5"
    },
    "flow": [
      {
        "t": "接收消息",
        "d": "导购发送文字/商品推荐卡片/品牌推荐卡片/优惠券卡片"
      },
      {
        "t": "查看商品",
        "d": "点击商品卡片进入 U3 商品详情，自动进入导购模式、开始业绩归因"
      },
      {
        "t": "查看品牌",
        "d": "点击品牌卡片进入通用品牌店铺列表页，传入导购信息进入导购模式；不属于当前门店商品沉底"
      },
      {
        "t": "领券",
        "d": "点击「领取优惠券」发券到我的优惠券，按钮更新为「已领取」"
      }
    ],
    "states": [
      {
        "n": "收到推荐",
        "d": "商品/品牌/优惠券卡片待查看"
      },
      {
        "n": "已领取券",
        "d": "优惠券按钮变为「已领取」"
      },
      {
        "n": "进入导购模式",
        "d": "点击卡片进入商品详情即进入归因"
      }
    ],
    "hotspots": [
      {
        "id": "u1-e2",
        "selector": "[data-page-node-id=\"U1PendingCard\"]",
        "type": "element",
        "x": 55.831,
        "y": 109.698,
        "w": 80.512,
        "h": 61.142,
        "title": "商品推荐卡片（顾客视角）",
        "desc": "PRD 5.2.1：促销标签(多个)/缩略图/业态+商品名称/商品金额+划线价/提货门店名称+库存；点击进入 U3 商品详情并进入导购模式。",
        "num": 1
      },
      {
        "id": "u1-e4",
        "selector": "[data-page-node-id=\"U1CouponCard\"]",
        "type": "element",
        "x": 55.831,
        "y": 57.776,
        "w": 80.512,
        "h": 30.144,
        "title": "优惠券卡片",
        "desc": "展示导购发送的优惠券领取链接；待领取显示「领取优惠券」按钮，点击发券到我的优惠券后更新为「已领取」。",
        "num": 2
      }
    ]
  },
  {
    "id": "v04-u6",
    "group": "用户端 · CDF海南免税",
    "name": "U6 意向单页",
    "device": "mobile",
    "url": "v0.4/U6-意向单页.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-07",
    "overview": {
      "summary": "导购在会话中代客创建或打开购物清单，引导顾客加购并结算；清单按门店与电商分组，支持勾选、合计与去结算。整体复用扫码购能力",
      "path": "中免商户通 → 消息列表 → 消息会话页 → +号 → 创建清单 / 购物清单",
      "users": "门店导购（代客操作）、顾客（查看与确认）",
      "permission": "功能权限：导购可见数据权限：仅当前会话顾客的商品与清单",
      "ports": "中免商户通APP、中免海南 APP（顾客端购物清单）"
    },
    "flow": [
      {
        "t": "门店/电商分组",
        "d": "清单按门店（海口国际免税城）与电商分组展示，门店商品与电商商品不可合并结算"
      },
      {
        "t": "勾选与合计",
        "d": "勾选商品后底部展示合计金额，支持全选"
      },
      {
        "t": "去结算",
        "d": "点击去结算进入 U4 结算中心页，按分组分别结算"
      }
    ],
    "states": [
      {
        "n": "空清单",
        "d": "提示导购代客加购"
      },
      {
        "n": "已勾选",
        "d": "展示合计与去结算"
      }
    ],
    "hotspots": [
      {
        "id": "u6-e1",
        "selector": "[data-page-node-id=\"U6TripCard\"]",
        "type": "element",
        "x": 50.053,
        "y": 24.631,
        "w": 92.068,
        "h": 15.761,
        "title": "行程核验",
        "desc": "展示行程核验信息",
        "num": 1
      },
      {
        "id": "u6-e2",
        "selector": "div[class~=\"bg-white\"][class~=\"rounded-2xl\"][class~=\"p-4\"]:nth-of-type(1)",
        "type": "element",
        "x": 50.053,
        "y": 55.381,
        "w": 92.068,
        "h": 41.972,
        "title": "门店商品清单",
        "desc": "展示电商商品，含买即赠/满赠标签，与门店分组不可合并结算。",
        "num": 2
      },
      {
        "id": "u6-e3",
        "selector": "div[class~=\"bg-white\"][class~=\"rounded-2xl\"][class~=\"p-4\"]:nth-of-type(3)",
        "type": "element",
        "x": 50.053,
        "y": 119.078,
        "w": 92.068,
        "h": 58.72,
        "title": "展示电商商品清单",
        "desc": "电商商品不可与门店商品合并支付",
        "num": 3
      },
      {
        "type": "element",
        "title": "底栏",
        "desc": "显示已选商品数量、合计金额\n“去结算”按钮，点击后跳转到结算中心页面",
        "num": 4,
        "selector": "[data-page-node-id=\"U6Footer\"]",
        "x": 50.053,
        "y": 168.617,
        "w": 100.106,
        "h": 10.284,
        "id": "hs_mtqw4te2ra9w"
      }
    ]
  },
  {
    "id": "v04-u4",
    "group": "用户端 · CDF海南免税",
    "name": "U4 结算中心页",
    "device": "mobile",
    "url": "v0.4/U4-结算中心页.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-07",
    "overview": {
      "summary": "用户结算中心的页面，含提货方式、商品清单、发票/优惠券/积分、费用明细、行程核验与同意条款",
      "path": "购物清单 → 去结算 / 商品详情 → 去结算",
      "users": "C 端用户",
      "permission": "功能权限：商城用户均有数据权限：仅本人订单",
      "ports": "中免海南 APP（安卓、IOS、鸿蒙）、微信小程序、支付宝小程序、H5"
    },
    "flow": [
      {
        "t": "加载订单信息",
        "d": "展示商品、价格、优惠、地址、导购/平台来源信息"
      },
      {
        "t": "选择/修改地址",
        "d": "点击地址区进入地址管理"
      },
      {
        "t": "选择优惠券",
        "d": "选择可用优惠券，实时重算金额"
      },
      {
        "t": "提交订单",
        "d": "校验后生成订单，记录导购归因，进入支付"
      }
    ],
    "states": [
      {
        "n": "正常确认",
        "d": "信息完整可提交"
      },
      {
        "n": "地址缺失",
        "d": "提示选择地址"
      },
      {
        "n": "优惠冲突",
        "d": "提示优惠券不可用"
      },
      {
        "n": "待支付",
        "d": "生成订单后 30 分钟自动取消"
      }
    ],
    "hotspots": [
      {
        "id": "u4-e1",
        "selector": "[data-page-node-id=\"U4Verify\"]",
        "type": "element",
        "x": 50.053,
        "y": 24.631,
        "w": 92.068,
        "h": 15.761,
        "title": "行程核验卡片",
        "desc": "显示行程核验卡片，点击后进入行程核验页面\n核验通过后展示核验信息",
        "num": 1
      },
      {
        "id": "u4-f1",
        "selector": "#U4GuideName",
        "type": "field",
        "x": 30,
        "y": 22,
        "title": "导购姓名 guideName",
        "desc": "订单关联的导购或平台来源名称。",
        "field": {
          "type": "string",
          "required": "是",
          "format": "导购姓名或「中免海南平台统仓」",
          "sample": "李婷"
        },
        "num": 2
      },
      {
        "id": "u4-e2",
        "selector": "[data-page-node-id=\"U4Pickup\"]",
        "type": "element",
        "x": 50.053,
        "y": 50.021,
        "w": 92.068,
        "h": 31.253,
        "title": "提货方式卡片",
        "desc": "提供3种提货方式",
        "num": 2
      },
      {
        "type": "element",
        "title": "商品清单",
        "desc": "商品图片、商品标题、编号、导购名称、单价、数量",
        "num": 3,
        "selector": "[data-page-node-id=\"U4Items\"]",
        "x": 50.053,
        "y": 111.958,
        "w": 92.068,
        "h": 88.853,
        "id": "hs_mtqvtt84p5qx"
      },
      {
        "type": "element",
        "title": "服务",
        "desc": "发票：可选择是否要发票\n优惠券：可选择可用优惠券\n积分：如果判定为会员，可选择积分抵扣",
        "num": 5,
        "selector": "[data-page-node-id=\"U4Coupon\"]",
        "x": 50.053,
        "y": 173.106,
        "w": 92.068,
        "h": 29.676,
        "id": "hs_mtqvxazi30ig"
      },
      {
        "type": "element",
        "title": "购买须知勾选",
        "desc": "提示用户购买须知，默认勾选",
        "num": 6,
        "selector": "[data-page-node-id=\"U4Agree\"]",
        "x": 50.053,
        "y": 227.944,
        "w": 92.068,
        "h": 12.276,
        "id": "hs_mtqvyhyva7v5"
      },
      {
        "type": "element",
        "title": "底栏",
        "desc": "1.显示应付合计金额\n2.立即支付按钮，勾选购买须知时才可点击",
        "num": 7,
        "selector": "[data-page-node-id=\"U4Footer\"]",
        "x": 50.053,
        "y": 254.405,
        "w": 100.106,
        "h": 10.566,
        "id": "hs_mtqw0ramryri"
      }
    ]
  },
  {
    "id": "v04-u5",
    "group": "用户端 · CDF海南免税",
    "name": "U5 行程核验页",
    "device": "mobile",
    "url": "v0.4/U5-行程核验页.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {},
    "flow": [
      {
        "t": "选择行程类型",
        "d": "飞机/火车/轮船/自驾等"
      },
      {
        "t": "填写行程信息",
        "d": "航班号/车次/船次、离岛日期、证件信息等"
      },
      {
        "t": "选择提货方式",
        "d": "机场提货/港口提货/邮寄"
      },
      {
        "t": "提交核验",
        "d": "系统校验资格后返回结果"
      }
    ],
    "states": [
      {
        "n": "未填写",
        "d": "需补充行程信息"
      },
      {
        "n": "核验中",
        "d": "系统校验行程与资格"
      },
      {
        "n": "通过",
        "d": "可继续下单/提货"
      },
      {
        "n": "不通过",
        "d": "提示原因并引导修改"
      }
    ],
    "hotspots": [
      {
        "id": "u5-f1",
        "selector": "#U5FormWrap",
        "type": "field",
        "x": 50,
        "y": 45,
        "w": 86,
        "h": 30,
        "title": "行程信息 iternaryInfo",
        "desc": "离岛航班/车次/船次、日期、乘客及证件信息，作为免税购买资格凭证。",
        "field": {
          "type": "object",
          "required": "是",
          "format": "按行程类型填写不同字段；与证件信息关联校验",
          "sample": "航班 HU7181 / 2026-09-10 / 海口美兰"
        },
        "num": 2
      },
      {
        "id": "u5-r1",
        "selector": "#U5Tip",
        "type": "rule",
        "x": 50,
        "y": 15,
        "w": 80,
        "h": 6,
        "title": "免税购买资格校验规则",
        "desc": "",
        "rule": {
          "code": "R-U5-01",
          "trigger": "提交行程核验",
          "behavior": "校验离岛日期、航班/船次有效性、旅客证件一致性；通过后方可购买免税商品并选择提货方式",
          "exception": "行程过期、证件不匹配或已购额度超限则拦截并提示具体原因"
        },
        "num": 3
      }
    ]
  },
  {
    "id": "v04-g1",
    "group": "导购端 · 繁星APP",
    "name": "G1 导购工作台",
    "device": "mobile",
    "url": "v0.4/G1-工作台.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "在工作台中添加新增「业绩管理」的功能入口",
      "path": "中免商户通 → 工作台",
      "users": "门店导购",
      "permission": "功能权限：导购可见数据权限：不涉及数据权限",
      "ports": "中免商户通APP"
    },
    "flow": [
      {
        "t": "查看经营概览",
        "d": "顶部四宫格展示今日访客数、支付订单、支付金额、客单价及较昨日环比"
      },
      {
        "t": "查看数据趋势",
        "d": "折线图对比昨日与今日支付金额，定位成交高峰"
      },
      {
        "t": "常用功能",
        "d": "创建订单 / 订单 / 售后 / 业绩管理（v0.3 新增）/ 客户消息快捷入口"
      },
      {
        "t": "切换 Tab",
        "d": "底部工作台 / 消息 / 经营 / 我的"
      }
    ],
    "states": [
      {
        "n": "默认态",
        "d": "展示本人所属门店经营数据"
      },
      {
        "n": "切换门店",
        "d": "顶部门店名切换后刷新全部数据"
      }
    ],
    "hotspots": [
      {
        "id": "g1-e3",
        "selector": "[data-page-node-id=\"wL3ObHSdaVuuZF3ObUDO81\"]",
        "type": "element",
        "x": 67.46,
        "y": 100.437,
        "w": 16.404,
        "h": 10.266,
        "title": "常用功能入口",
        "desc": "在常用功能卡片新增「业绩管理」按钮，点击进入移动端业绩管理页面",
        "num": 1
      },
      {
        "id": "g1-f1",
        "selector": ".grid-cols-4 .status-time",
        "type": "field",
        "x": 8,
        "y": 27,
        "title": "环比 delta",
        "desc": "较昨日变化百分比，红涨绿跌。",
        "field": {
          "type": "percent",
          "required": "是",
          "format": "带符号百分比",
          "sample": "-42.93%"
        },
        "num": 2
      },
      {
        "id": "g1-r1",
        "selector": "nav",
        "type": "rule",
        "x": 6,
        "y": 92,
        "w": 88,
        "h": 6,
        "title": "底部 Tab 切换规则",
        "desc": "",
        "rule": {
          "code": "R-G1-01",
          "trigger": "点击底部 Tab",
          "behavior": "在工作台 / 消息 / 经营 / 我的之间切换，保留各页状态",
          "exception": "无"
        },
        "num": 3
      }
    ]
  },
  {
    "id": "v04-g2",
    "group": "导购端 · 繁星APP",
    "name": "G2 消息会话列表",
    "device": "mobile",
    "url": "v0.4/G2-消息会话列表.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "增加「创建清单、发优惠券、购物清单、名片、图片发送」功能入口",
      "path": "中免商户通 → 消息列表 → 消息会话页 → +号",
      "users": "门店导购",
      "permission": "功能权限：所有会话页功能权限数据权限：不涉及数据权限",
      "ports": "中免商户通APP"
    },
    "flow": [
      {
        "t": "查看列表",
        "d": "默认展示会话 Tab，顶部可切换「会话 / 通知」"
      },
      {
        "t": "查看通知",
        "d": "通知 Tab 聚合系统通知、订单状态、店铺公告"
      },
      {
        "t": "进入会话",
        "d": "点击具体会话跳转 G3，底部「+」弹窗可推荐商品 / 发优惠券"
      },
      {
        "t": "全部已读",
        "d": "点击「全部已读」清除未读角标"
      }
    ],
    "states": [
      {
        "n": "会话态",
        "d": "默认展示顾客会话列表"
      },
      {
        "n": "通知态",
        "d": "展示系统通知与公告"
      }
    ],
    "hotspots": [
      {
        "id": "g2-f1",
        "selector": ".session-item .unread",
        "type": "field",
        "x": 80,
        "y": 24,
        "title": "未读角标 unread",
        "desc": "未读消息数量，点击会话后清零。",
        "field": {
          "type": "integer",
          "required": "否",
          "format": "≥0",
          "sample": "3"
        },
        "num": 1
      }
    ]
  },
  {
    "id": "v04-g3",
    "group": "导购端 · 繁星APP",
    "name": "G3 导购 IM 会话页",
    "device": "mobile",
    "url": "v0.4/G3-导购IM会话页.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "调用优惠券接口发送领取链接，促进用户下单",
      "path": "中免商户通 → 消息列表 → 消息会话页 → +号 → 发优惠券按钮",
      "users": "门店导购",
      "permission": "功能权限：所有页面功能权限数据权限：不涉及数据权限",
      "ports": "中免商户通APP"
    },
    "flow": [
      {
        "t": "实时沟通",
        "d": "顾客与导购消息气泡分列左右，含时间分隔"
      },
      {
        "t": "打开+号弹窗",
        "d": "底栏「+」展开：推荐商品、发优惠券（v0.2 取消创建订单、v0.3 取消专题，仅保留此两项）"
      },
      {
        "t": "推荐商品",
        "d": "点击「推荐商品」跳转 G4 商品选择页，确认后回传「商品推荐卡片」"
      },
      {
        "t": "发优惠券",
        "d": "点击「发优惠券」打开优惠券选择弹窗→确认发券弹窗→发送「优惠券卡片」"
      }
    ],
    "states": [
      {
        "n": "聊天态",
        "d": "默认展示对话消息流"
      },
      {
        "n": "+号弹窗",
        "d": "底栏展开推荐商品/发优惠券入口"
      },
      {
        "n": "优惠券弹窗",
        "d": "底部弹出可选优惠券列表"
      }
    ],
    "hotspots": [
      {
        "id": "g3-e3",
        "selector": "[data-page-node-id=\"plusBtn\"]",
        "type": "element",
        "modal": true,
        "modalEl": "#plusPanel",
        "trigger": "[data-page-node-id=\"plusBtn\"]",
        "x": 8.038,
        "y": 128.563,
        "w": 10.046,
        "h": 6.277,
        "title": "+号弹窗（创建清单 / 发优惠券）",
        "desc": "底栏「+」展开弹窗：\n创建清单 → 跳转 商品选择页 发送购物清单卡片；\n发优惠券 → 优惠券选择弹窗→确认发券→发送优惠券卡片",
        "num": 1
      },
      {
        "id": "g3-e4",
        "selector": "[data-page-node-id=\"couponWrap\"]",
        "type": "element",
        "x": 55.831,
        "y": 69.675,
        "w": 80.512,
        "h": 26.379,
        "title": "优惠券卡片",
        "desc": "导购发送的专属优惠券，含面额、门槛、适用范围与有效期，状态：待领取/已领取。",
        "num": 2
      },
      {
        "type": "element",
        "title": "购物清单卡片",
        "desc": "展示导购选择商品后，导购为用户选择的商品\n- 做多展示3个商品（图片、名称、规格、单价）\n- 购物清单里的全部商品数量",
        "selector": "[data-page-node-id=\"pendingCard\"]",
        "x": 55.831,
        "y": 103.03,
        "w": 80.512,
        "h": 35.309,
        "id": "hs_mtptn161htrz",
        "num": 3
      }
    ]
  },
  {
    "id": "v04-g4",
    "group": "导购端 · 繁星APP",
    "name": "G4 选择商品页",
    "device": "mobile",
    "url": "v0.4/G4-选择商品.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {},
    "flow": [
      {
        "t": "左侧导航",
        "d": "我的收藏 / 我的柜组 / 一级分类（仅当前门店分类）"
      },
      {
        "t": "搜索与二级分类",
        "d": "按商品名称/编号/品牌搜索；二级分类以品牌维度展示，选中品牌后首位为该品牌推荐卡片"
      },
      {
        "t": "商品列表",
        "d": "展示缩略图/名称/库存/编号/活动/价格，门店库存=门店全部库存+电商仓门店库存，柜组库存=当前柜组库存；门店0库存沉底，未授权商品沉底且推荐禁用"
      },
      {
        "t": "确认发送",
        "d": "点击「推荐」弹窗确认推荐商品/品牌，回传对应卡片至 G3"
      }
    ],
    "states": [
      {
        "n": "商品列表",
        "d": "默认展示当前门店商品"
      },
      {
        "n": "品牌推荐",
        "d": "选中品牌分类，首位展示品牌推荐卡片"
      },
      {
        "n": "搜索结果",
        "d": "关键词过滤商品与分类"
      },
      {
        "n": "确认弹窗",
        "d": "点击推荐后弹窗二次确认"
      }
    ],
    "hotspots": [
      {
        "id": "g4-e1",
        "selector": "[data-page-node-id=\"sidebar\"]",
        "fixed": true,
        "type": "element",
        "x": 10,
        "y": 50,
        "w": 16,
        "h": 60,
        "title": "左侧导航",
        "desc": "我的收藏（导购收藏商品）\n我的柜组（所在柜组商品）\n一级分类（商城全部一级分类，仅显示当前门店分类）。",
        "num": 1
      },
      {
        "id": "g4-e3",
        "selector": "main .product-item",
        "type": "element",
        "x": 60,
        "y": 48,
        "w": 72,
        "h": 34,
        "title": "商品列表",
        "desc": "商品卡片：缩略图/商品名称/门店与柜组库存/编号/活动标签/价格；促销标签支持多个；推荐按钮在门店库存为0时禁用。",
        "num": 3
      },
      {
        "id": "g4-f1",
        "selector": ".stock-pill",
        "type": "field",
        "x": 70,
        "y": 54,
        "title": "门店库存 / 柜组库存 stock",
        "desc": "分别展示门店库存（=门店全部库存+电商仓门店库存）与柜组库存（当前导购所在柜组）；为0时商品沉底、推荐禁用。",
        "field": {
          "type": "integer",
          "required": "是",
          "format": "≥0；门店0库存沉底、未授权沉底且推荐禁用",
          "sample": "门店 6 / 柜组 2"
        },
        "num": 4
      },
      {
        "type": "element",
        "title": "底栏",
        "desc": "统计合计金额+已选商品数量",
        "num": 6,
        "selector": "[data-page-node-id=\"orderBar\"]",
        "x": 50.053,
        "y": 95.225,
        "w": 100.106,
        "h": 9.5,
        "id": "hs_mtpu0azhgvc5"
      }
    ]
  },
  {
    "id": "v04-g8",
    "group": "导购端 · 繁星APP",
    "name": "G8 业绩管理（移动）",
    "device": "mobile",
    "url": "v0.4/G8-移动端业绩管理.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "可查看导购上月和本月的业绩和成交订单",
      "path": "中免商户通 → 工作台；中免商户通 → 经营",
      "users": "门店导购",
      "permission": "功能权限：所有页面功能权限数据权限：当前登录导购的业绩统计数据和订单数据",
      "ports": "中免商户通APP"
    },
    "flow": [
      {
        "t": "业绩月统计",
        "d": "顶部展示我的业绩（已完成订单数据）、待结算业绩（待发货+待收货之和）、本月总订单数量"
      },
      {
        "t": "筛选",
        "d": "按订单号/客户名称/手机号模糊搜索；按订单状态筛选；按时间范围筛选（默认最近30天）"
      },
      {
        "t": "订单列表",
        "d": "用户头像+名称+手机号(脱敏)+订单状态；业绩本单总业绩+业绩状态(未完结/计入/不计入)；订单状态+金额+创建时间"
      },
      {
        "t": "订单详情",
        "d": "点击展开弹窗：商品信息/我的业绩归因/用户信息订单信息/离岛信息/金额明细"
      }
    ],
    "states": [
      {
        "n": "默认态",
        "d": "展示上月/本月业绩汇总+订单列表"
      },
      {
        "n": "筛选中",
        "d": "局部 loading"
      },
      {
        "n": "订单详情",
        "d": "弹出订单详情"
      }
    ],
    "hotspots": [
      {
        "id": "g8-e1",
        "selector": "[data-page-node-id=\"T71OipRtnaTIHFZTQYCCXk\"]",
        "type": "element",
        "x": 50.035,
        "y": 24.363,
        "w": 93.671,
        "h": 19.369,
        "title": "业绩月统计卡片",
        "desc": "PRD 4.2.5 顶部汇总：我的业绩（已完成订单数据）、待结算业绩（待发货+待收货之和）、本月总订单数量。",
        "num": 1
      },
      {
        "id": "g8-f1",
        "selector": "#sumCounted",
        "type": "field",
        "x": 25,
        "y": 17,
        "title": "我的业绩 monthCounted",
        "desc": "当前导购已完成订单累计业绩（仅「已完成」且未退款商品计入）。",
        "field": {
          "type": "decimal(元)",
          "required": "是",
          "format": "≥0，按月聚合",
          "sample": "86,420.00"
        },
        "num": 2
      },
      {
        "id": "g8-e2",
        "selector": "[data-page-node-id=\"IMkqlSKZmF9jCJhuhOprOR\"]",
        "type": "element",
        "x": 50.035,
        "y": 49.403,
        "w": 100.07,
        "h": 26.943,
        "title": "搜索与筛选器",
        "desc": "订单号/客户名称/手机号模糊搜索；订单状态筛选（全部/待付款/待发货/待收货/已完成/已退款/已关闭）；时间范围筛选（默认最近30天）。",
        "num": 2
      },
      {
        "id": "g8-e3",
        "selector": "[data-page-node-id=\"viYfyIix1iMupEPxjuqHFh\"]",
        "type": "element",
        "x": 50.035,
        "y": 82.367,
        "w": 100.07,
        "h": 35.217,
        "title": "订单列表",
        "desc": "按时间倒序：用户头像+名称+手机号(脱敏)+订单状态；本单总业绩+业绩状态（未完结/计入/不计入）；订单金额+创建时间。",
        "num": 3
      },
      {
        "id": "g8-e4",
        "selector": "[data-page-node-id=\"GgV5NU94SIrArtew1NAs6F\"]",
        "type": "element",
        "modal": true,
        "modalEl": "#orderDetailModal",
        "trigger": "#orderList button",
        "x": 50.035,
        "y": 55.986,
        "w": 100.07,
        "h": 87.978,
        "title": "订单详情弹窗",
        "desc": "商品信息、我的业绩归因（已完成=本单业绩总和；未完结=整单待结算；不计入=整单不计入）、用户信息/订单信息、离岛信息、金额明细。",
        "num": 4
      }
    ]
  },
  {
    "id": "v04-m3",
    "group": "管理后台 · PC",
    "name": "M3 PC 业绩管理",
    "device": "desktop",
    "url": "v0.4/M3-PC业绩管理.html",
    "srcdoc": "",
    "status": "review",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "展示当前门店导购的开单统计数据和订单列表",
      "path": "中免商户通PC端 → 导购管理 → 业绩管理",
      "users": "门店运营",
      "permission": "功能权限：隐藏门店筛选功能数据权限：只能看到当前门店产生的订单，但不显示同一个订单下其他门店导购的数据",
      "ports": "中免商户通PC端"
    },
    "flow": [
      {
        "t": "业绩数据卡片",
        "d": "接待客户数/订单数/订单总金额（今日+累计，订单总金额仅统计已完成）"
      },
      {
        "t": "列表筛选",
        "d": "订单号搜索；筛选订单状态/门店(默认当前门店禁用)/柜组/导购/时间范围"
      },
      {
        "t": "订单列表",
        "d": "订单号/用户手机号/订单金额/导购业绩/订单时间/订单状态；仅显示本门店业绩，未完结灰色、已完结红色"
      },
      {
        "t": "订单详情",
        "d": "商品信息/我的业绩归因/用户信息订单信息/离岛信息/金额明细"
      }
    ],
    "states": [
      {
        "n": "数据正常",
        "d": "完整看板"
      },
      {
        "n": "筛选加载",
        "d": "局部 loading"
      },
      {
        "n": "无数据",
        "d": "空态"
      },
      {
        "n": "导出中",
        "d": "导出进度提示"
      }
    ],
    "hotspots": [
      {
        "id": "m3-e1",
        "selector": "aside",
        "fixed": true,
        "type": "element",
        "x": 7,
        "y": 40,
        "w": 12,
        "h": 40,
        "title": "左侧导航（导购管理）",
        "desc": "PC 后台一级导航，当前在「导购管理 → 业绩管理」；店长角色查看本门店数据。"
      },
      {
        "id": "m3-e2",
        "selector": ".grid.gap-4",
        "type": "element",
        "x": 55,
        "y": 17,
        "w": 75,
        "h": 14,
        "title": "业绩数据卡片（今日/累计）",
        "desc": "PRD 6.2.2：接待客户数、订单数、订单总金额三组，均含今日与累计；订单总金额仅统计已完成订单。"
      },
      {
        "id": "m3-e3",
        "selector": "table",
        "type": "element",
        "x": 55,
        "y": 37,
        "w": 75,
        "h": 18,
        "title": "订单列表",
        "desc": "字段：订单号/用户手机号/订单金额/导购业绩/订单时间/订单状态；导购业绩显示门店/柜组/柜组编号/导购名称/业绩金额/未完结状态，仅本门店，未完结灰、已完结红。"
      },
      {
        "id": "m3-e4",
        "selector": ".bg-white.rounded-2xl",
        "type": "element",
        "x": 55,
        "y": 63,
        "w": 80,
        "h": 22,
        "title": "订单明细表格 / 详情",
        "desc": "分页订单列表，支持排序、筛选、导出（限制数量以评估性能）；点击查看商品信息/业绩归因/离岛信息/金额明细。"
      },
      {
        "id": "m3-r1",
        "selector": "header",
        "fixed": true,
        "type": "rule",
        "x": 85,
        "y": 4,
        "w": 20,
        "h": 6,
        "title": "门店数据权限与导出规则",
        "desc": "",
        "rule": {
          "code": "R-M3-01",
          "trigger": "进入页面 / 点击导出",
          "behavior": "门店筛选默认当前门店且禁用，仅展示本门店订单、不显示其他门店导购数据；导出需权限且限制数量",
          "exception": "无线程权限隐藏导出；数据范围外不展示"
        }
      }
    ]
  },
  {
    "id": "v04-m4",
    "group": "管理后台 · PC",
    "name": "M4 消息管理（客户继承）",
    "device": "desktop",
    "url": "v0.4/M4-消息管理.html",
    "srcdoc": "",
    "status": "wip",
    "version": "v0.4",
    "owner": "产品 · 梁伟业",
    "updated": "2026-09-06",
    "overview": {
      "summary": "消息管理里面，导购列表增加客户继承功能，且增加新的对话卡片展示",
      "path": "中免商户通PC端 → 导购管理 → 消息管理",
      "users": "门店运营",
      "permission": "功能权限：支持“继承客户”按钮单独分配权限数据权限：不涉及数据权限",
      "ports": "中免商户通PC端"
    },
    "flow": [
      {
        "t": "打开客户继承",
        "d": "点击「继承客户」打开导购选择弹窗，选择并确定目标导购"
      },
      {
        "t": "批量通知",
        "d": "新导购向3个月内客户批量发送会话通知，说明服务交接"
      },
      {
        "t": "查看对话",
        "d": "对话列表新增推荐品牌/商品/优惠券卡片展示"
      },
      {
        "t": "管理",
        "d": "按导购/时间筛选，查看继承后会话"
      }
    ],
    "states": [
      {
        "n": "默认列表",
        "d": "导购列表与对话"
      },
      {
        "n": "继承弹窗",
        "d": "选择目标导购"
      },
      {
        "n": "继承完成",
        "d": "批量通知已发送"
      },
      {
        "n": "对话卡片",
        "d": "展示推荐品牌/商品/优惠券"
      }
    ],
    "hotspots": [
      {
        "id": "m4-e1",
        "selector": ".flex-1.flex > section:nth-child(1)",
        "fixed": true,
        "type": "element",
        "x": 22,
        "y": 50,
        "w": 18,
        "h": 55,
        "title": "左侧导购列表",
        "desc": "PRD 6.2.1：导购列表，含「继承客户」入口；支持按导购查看其客户会话。"
      },
      {
        "id": "m4-e2",
        "selector": ".flex-1.flex > section:nth-child(2)",
        "type": "element",
        "x": 44,
        "y": 50,
        "w": 18,
        "h": 55,
        "title": "客户会话列表",
        "desc": "所选导购的客户会话，按时间倒序；支持客户继承后接管。"
      },
      {
        "id": "m4-e3",
        "selector": "#inheritBtn",
        "type": "element",
        "x": 55,
        "y": 9,
        "w": 70,
        "h": 6,
        "title": "继承客户按钮",
        "desc": "点击「继承客户」打开导购选择弹窗，选择目标导购并确定后，新导购向该客户批量发送交接会话。"
      },
      {
        "id": "m4-e4",
        "selector": "#chatCard",
        "type": "element",
        "x": 78,
        "y": 55,
        "w": 35,
        "h": 35,
        "title": "对话卡片（推荐品牌/商品/优惠券）",
        "desc": "PRD 6.2.1 对话内容优化：品牌卡片(品牌logo+名称/在售数量/品牌专区链接/品牌banner)、商品卡片(促销标签/缩略图/业态+名称/金额+划线价/提货门店+库存)、优惠券卡片(金额/门店/使用条件/有效期，状态待领取/已领取)。"
      },
      {
        "id": "m4-r1",
        "selector": "#inheritBtn",
        "type": "rule",
        "x": 22,
        "y": 4,
        "w": 55,
        "h": 5,
        "title": "客户继承规则",
        "desc": "",
        "rule": {
          "code": "R-M4-01",
          "trigger": "确认客户继承",
          "behavior": "新导购批量向被继承客户发送交接会话：「您好，由于「***导购」工作变更，接下来将由我继续为您服务。感谢您一直以来对我们的支持。」",
          "exception": "仅一次性向 3 个月内的客户批量发送消息，超出时间范围的客户不发送"
        }
      }
    ]
  }
];

PROTOTYPES.push.apply(PROTOTYPES, PROTOTYPES_V03);

/* ---------- 数据模型（来自《中免海南商城·门店导购升级 数据模型》v0.4；由 AI 写入 prototypes-data.js，编辑版导出时一并保留） ---------- */
window.DATA_MODELS = {
  "Product": {
    "label": "Product（商品）",
    "sources": [
      "v04-g4",
      "v04-u6",
      "v04-g8",
      "v04-m3"
    ],
    "fields": [
      {
        "name": "sku",
        "type": "string",
        "required": "是",
        "format": "商品唯一编码；门店品以C开头，电商品以E开头",
        "sample": "C016080 / E00123"
      },
      {
        "name": "name",
        "type": "string",
        "required": "否",
        "format": "商品名称",
        "sample": "浪凡光韵女士浓香水"
      },
      {
        "name": "brand",
        "type": "string",
        "required": "否",
        "format": "品牌",
        "sample": "浪凡 / 迪奥 / 兰蔻 / 香奈儿"
      },
      {
        "name": "specs",
        "type": "string[]",
        "required": "否",
        "format": "可选规格列表（多规格，逗号分隔存储）",
        "sample": "30ml,50ml,100ml"
      },
      {
        "name": "spec",
        "type": "string",
        "required": "否",
        "format": "用户/导购选中的规格",
        "sample": "50ml"
      },
      {
        "name": "price",
        "type": "number",
        "required": "否",
        "format": "单价（元）",
        "sample": "394.00"
      },
      {
        "name": "img",
        "type": "string",
        "required": "否",
        "format": "商品图路径（本地 assets/generated/）",
        "sample": "assets/generated/product1.png"
      },
      {
        "name": "store",
        "type": "number",
        "required": "否",
        "format": "门店库存（来源=门店时的可用量）",
        "sample": "270 / 0(缺货)"
      },
      {
        "name": "warehouse",
        "type": "number",
        "required": "否",
        "format": "电商库存（平台库存，来源=电商时的可用量）",
        "sample": "88 / 0(缺货)"
      },
      {
        "name": "group",
        "type": "enum",
        "required": "否",
        "format": "左侧导航二级分类（柜组视图分组）",
        "sample": "我的收藏 / 我的柜组 / 其他柜组"
      },
      {
        "name": "fav",
        "type": "boolean",
        "required": "否",
        "format": "是否收藏（我的收藏）",
        "sample": "—"
      },
      {
        "name": "source",
        "type": "enum",
        "required": "否",
        "format": "加入清单时选择的库存来源 store/ecommerce",
        "sample": "来源：门店库存 / 来源：电商库存"
      }
    ]
  },
  "ShoppingList": {
    "label": "ShoppingList（导购代客购物清单）",
    "sources": [
      "v04-g4",
      "v04-g3",
      "v04-g1",
      "v04-u6"
    ],
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": "是",
        "format": "清单编号",
        "sample": "DD20260903001"
      },
      {
        "name": "time",
        "type": "string",
        "required": "否",
        "format": "创建/发送时间",
        "sample": "14:52 / 刚刚"
      },
      {
        "name": "items",
        "type": "Item[]",
        "required": "否",
        "format": "商品行集合，见 ListItem",
        "sample": "—"
      },
      {
        "name": "total",
        "type": "number",
        "required": "否",
        "format": "清单金额合计（Σ price×qty）",
        "sample": "—"
      },
      {
        "name": "source",
        "type": "enum",
        "required": "否",
        "format": "结算来源；门店与电商不可合并结算，必须同来源",
        "sample": "—"
      },
      {
        "name": "guide",
        "type": "object",
        "required": "否",
        "format": "挂单导购 {name, store}（每个 item 可不同导购）",
        "sample": "—"
      }
    ]
  },
  "ListItem": {
    "label": "ListItem（清单商品行）",
    "sources": [
      "v04-g4",
      "v04-u6",
      "v04-g1",
      "v04-g3"
    ],
    "fields": [
      {
        "name": "sku",
        "type": "string",
        "required": "是",
        "format": "商品编码",
        "sample": "C016080"
      },
      {
        "name": "name",
        "type": "string",
        "required": "否",
        "format": "商品名",
        "sample": "浪凡光韵女士浓香水"
      },
      {
        "name": "spec",
        "type": "string",
        "required": "否",
        "format": "规格",
        "sample": "50ml"
      },
      {
        "name": "price",
        "type": "number",
        "required": "否",
        "format": "单价",
        "sample": "394.00"
      },
      {
        "name": "qty",
        "type": "number",
        "required": "否",
        "format": "数量",
        "sample": "1"
      },
      {
        "name": "img",
        "type": "string",
        "required": "否",
        "format": "图",
        "sample": "assets/generated/product1.png"
      },
      {
        "name": "source",
        "type": "enum",
        "required": "否",
        "format": "store / ecommerce",
        "sample": "store"
      },
      {
        "name": "guide",
        "type": "object",
        "required": "否",
        "format": "挂单导购",
        "sample": "{name:'李婷', store:'三亚国际免税城'}"
      },
      {
        "name": "tags",
        "type": "string[]",
        "required": "否",
        "format": "营销标签",
        "sample": "政府消费券 / 买即赠 / 满赠"
      }
    ]
  },
  "Order": {
    "label": "Order（用户结算中心）",
    "sources": [
      "v04-u4",
      "v04-u6"
    ],
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": "是",
        "format": "订单号（清单 id 或新生成）",
        "sample": "—"
      },
      {
        "name": "time",
        "type": "string",
        "required": "否",
        "format": "下单时间",
        "sample": "—"
      },
      {
        "name": "items",
        "type": "ListItem[]",
        "required": "否",
        "format": "勾选的商品行（同来源）",
        "sample": "—"
      },
      {
        "name": "source",
        "type": "enum",
        "required": "否",
        "format": "单一来源 store/ecommerce",
        "sample": "—"
      },
      {
        "name": "coupon",
        "type": "Coupon",
        "required": "否",
        "format": "使用的优惠券（U4 优惠券卡）",
        "sample": "—"
      },
      {
        "name": "fee",
        "type": "OrderFee",
        "required": "否",
        "format": "费用明细",
        "sample": "—"
      },
      {
        "name": "pickup",
        "type": "Pickup",
        "required": "否",
        "format": "提货预约",
        "sample": "—"
      },
      {
        "name": "trip",
        "type": "TripVerify",
        "required": "否",
        "format": "行程核验（离岛信息）",
        "sample": "—"
      },
      {
        "name": "agreement",
        "type": "boolean",
        "required": "否",
        "format": "协议勾选（U4 协议 checkbox 联动）",
        "sample": "—"
      }
    ]
  },
  "Customer": {
    "label": "Customer（客户 / 用户）",
    "sources": [
      "v04-u6",
      "v04-g8",
      "v04-m3",
      "v04-u5",
      "v04-u1"
    ],
    "fields": [
      {
        "name": "name",
        "type": "string",
        "required": "是",
        "format": "客户称呼",
        "sample": "陈女士"
      },
      {
        "name": "phone",
        "type": "string",
        "required": "否",
        "format": "手机号（脱敏）",
        "sample": "138****8888"
      },
      {
        "name": "idcard",
        "type": "string",
        "required": "否",
        "format": "身份证号",
        "sample": "—"
      },
      {
        "name": "level",
        "type": "enum?",
        "required": "否",
        "format": "客户等级（原型未显式建模，预留）",
        "sample": "—"
      }
    ]
  },
  "Consultant": {
    "label": "Consultant（导购）",
    "sources": [
      "v04-g8",
      "v04-m3",
      "v04-u6",
      "v04-g4"
    ],
    "fields": [
      {
        "name": "id",
        "type": "enum/string",
        "required": "是",
        "format": "导购工号（映射键）",
        "sample": "lin / wang / zhang / liu"
      },
      {
        "name": "name",
        "type": "string",
        "required": "否",
        "format": "导购姓名",
        "sample": "林小婷 / 王小丽 / 张美琪 / 刘佳怡"
      },
      {
        "name": "store",
        "type": "enum",
        "required": "否",
        "format": "所属门店",
        "sample": "三亚国际免税城"
      },
      {
        "name": "group",
        "type": "enum",
        "required": "否",
        "format": "所属柜组",
        "sample": "香化一组（68680401）"
      },
      {
        "name": "phone",
        "type": "string?",
        "required": "否",
        "format": "导购手机（消息管理继承用）",
        "sample": "—"
      }
    ]
  },
  "TripVerify": {
    "label": "TripVerify（离岛行程核验）",
    "sources": [
      "v04-u5",
      "v04-g8",
      "v04-m3"
    ],
    "fields": [
      {
        "name": "type",
        "type": "enum",
        "required": "是",
        "format": "离岛方式 flight/train/ship",
        "sample": "flight"
      },
      {
        "name": "typeLabel",
        "type": "string",
        "required": "否",
        "format": "方式中文",
        "sample": "飞机 / 火车 / 轮船"
      },
      {
        "name": "tripNo",
        "type": "string",
        "required": "是",
        "format": "航班号 / 车次 / 船次",
        "sample": "HU7281 / Z202 / 海峡号"
      },
      {
        "name": "date",
        "type": "datetime",
        "required": "是",
        "format": "离岛时间",
        "sample": "2026-09-10T14:30"
      },
      {
        "name": "port",
        "type": "string",
        "required": "否",
        "format": "出发/到达 机场/车站/港口",
        "sample": "—"
      },
      {
        "name": "name",
        "type": "string",
        "required": "是",
        "format": "乘机人姓名",
        "sample": "—"
      },
      {
        "name": "idcard",
        "type": "string",
        "required": "是",
        "format": "乘机人身份证",
        "sample": "—"
      },
      {
        "name": "phone",
        "type": "string",
        "required": "否",
        "format": "联系电话",
        "sample": "—"
      },
      {
        "name": "passed",
        "type": "boolean",
        "required": "否",
        "format": "核验是否通过",
        "sample": "true"
      }
    ]
  },
  "Performance": {
    "label": "Performance（导购业绩）",
    "sources": [
      "v04-g8",
      "v04-m3"
    ],
    "fields": [
      {
        "name": "total",
        "type": "number",
        "required": "否",
        "format": "该导购在本单商品金额合计",
        "sample": "—"
      },
      {
        "name": "counted",
        "type": "number",
        "required": "否",
        "format": "已完成且无退款的商品金额（已计入业绩）",
        "sample": "—"
      },
      {
        "name": "hasRefund",
        "type": "boolean",
        "required": "否",
        "format": "是否含退款→状态「含退款不计入」",
        "sample": "—"
      },
      {
        "name": "r15last",
        "type": "string",
        "required": "否",
        "format": "归因规则：15天·末次点击归因",
        "sample": "—"
      },
      {
        "name": "r1first",
        "type": "string",
        "required": "否",
        "format": "归因规则：加购1天·首次归因",
        "sample": "—"
      },
      {
        "name": "r7last",
        "type": "string",
        "required": "否",
        "format": "归因规则：7天·末次点击归因",
        "sample": "—"
      },
      {
        "name": "业绩额",
        "type": "number",
        "required": "否",
        "format": "业绩额（M3 PC 维度派生）",
        "sample": "—"
      },
      {
        "name": "提成",
        "type": "number",
        "required": "否",
        "format": "提成（M3 PC 维度派生）",
        "sample": "—"
      },
      {
        "name": "订单数",
        "type": "number",
        "required": "否",
        "format": "订单数（M3 PC 维度派生）",
        "sample": "—"
      },
      {
        "name": "客单价",
        "type": "number",
        "required": "否",
        "format": "客单价（M3 PC 维度派生）",
        "sample": "—"
      }
    ]
  },
  "PerformanceOrder": {
    "label": "PerformanceOrder（业绩订单）",
    "sources": [
      "v04-g8",
      "v04-m3"
    ],
    "fields": [
      {
        "name": "no",
        "type": "string",
        "required": "是",
        "format": "订单号",
        "sample": "ORD20260811001"
      },
      {
        "name": "user",
        "type": "string",
        "required": "否",
        "format": "客户名",
        "sample": "陈女士"
      },
      {
        "name": "phone",
        "type": "string",
        "required": "否",
        "format": "客户手机（脱敏）",
        "sample": "138****8888"
      },
      {
        "name": "time",
        "type": "datetime",
        "required": "否",
        "format": "下单时间",
        "sample": "2026-08-11 14:52:18"
      },
      {
        "name": "status",
        "type": "enum",
        "required": "否",
        "format": "订单状态（见状态字典）",
        "sample": "待发货"
      },
      {
        "name": "amount",
        "type": "number",
        "required": "否",
        "format": "订单金额",
        "sample": "42680"
      },
      {
        "name": "products",
        "type": "PerfItem[]",
        "required": "否",
        "format": "商品明细（每行独立携带归属）",
        "sample": "—"
      }
    ]
  },
  "PerfItem": {
    "label": "PerfItem（业绩商品行）",
    "sources": [
      "v04-g8",
      "v04-m3"
    ],
    "fields": [
      {
        "name": "icon",
        "type": "string",
        "required": "否",
        "format": "图标类（fa-ring 等）",
        "sample": "—"
      },
      {
        "name": "name",
        "type": "string",
        "required": "否",
        "format": "商品名",
        "sample": "—"
      },
      {
        "name": "spec",
        "type": "string",
        "required": "否",
        "format": "规格",
        "sample": "—"
      },
      {
        "name": "qty",
        "type": "number",
        "required": "否",
        "format": "数量",
        "sample": "—"
      },
      {
        "name": "price",
        "type": "number",
        "required": "否",
        "format": "单价（计入业绩的金额基准）",
        "sample": "—"
      },
      {
        "name": "store",
        "type": "enum",
        "required": "否",
        "format": "门店",
        "sample": "—"
      },
      {
        "name": "group",
        "type": "enum",
        "required": "否",
        "format": "柜组",
        "sample": "—"
      },
      {
        "name": "guide",
        "type": "string",
        "required": "否",
        "format": "归属导购 id（按商品级归因）",
        "sample": "—"
      },
      {
        "name": "refund",
        "type": "enum",
        "required": "否",
        "format": "退款状态 none/其他（影响业绩计入口径）",
        "sample": "—"
      }
    ]
  },
  "Coupon": {
    "label": "Coupon（优惠券）",
    "sources": [
      "v04-u4",
      "v04-m4",
      "v04-g3",
      "v04-u1"
    ],
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": "是",
        "format": "券 ID",
        "sample": "—"
      },
      {
        "name": "name",
        "type": "string",
        "required": "否",
        "format": "券名称",
        "sample": "—"
      },
      {
        "name": "type",
        "type": "enum",
        "required": "否",
        "format": "满减 / 折扣",
        "sample": "满减"
      },
      {
        "name": "threshold",
        "type": "number",
        "required": "否",
        "format": "使用门槛（满 X 元）",
        "sample": "—"
      },
      {
        "name": "value",
        "type": "number",
        "required": "否",
        "format": "减免金额（满减）",
        "sample": "500"
      },
      {
        "name": "validFrom",
        "type": "date",
        "required": "否",
        "format": "有效期起",
        "sample": "—"
      },
      {
        "name": "validTo",
        "type": "date",
        "required": "否",
        "format": "有效期止",
        "sample": "—"
      },
      {
        "name": "status",
        "type": "enum",
        "required": "否",
        "format": "可用 / 已使用 / 已过期",
        "sample": "已使用"
      }
    ]
  },
  "OrderFee": {
    "label": "OrderFee（订单费用明细）",
    "sources": [
      "v04-u4"
    ],
    "fields": [
      {
        "name": "goodsTotal",
        "type": "number",
        "required": "是",
        "format": "商品总额",
        "sample": "¥1,674.00"
      },
      {
        "name": "discount",
        "type": "number",
        "required": "否",
        "format": "折扣优惠（优惠/券抵，负）",
        "sample": "-¥500.00"
      },
      {
        "name": "pointsDeduct",
        "type": "number",
        "required": "否",
        "format": "积分抵扣（负）",
        "sample": "-¥0.00"
      },
      {
        "name": "tax",
        "type": "number",
        "required": "否",
        "format": "行邮税（加）",
        "sample": "+¥0.00"
      },
      {
        "name": "payable",
        "type": "number",
        "required": "否",
        "format": "应付总额（派生 = 商品总额+折扣+积分+税）",
        "sample": "—"
      }
    ]
  },
  "Pickup": {
    "label": "Pickup（提货预约）",
    "sources": [
      "v04-u4"
    ],
    "fields": [
      {
        "name": "date",
        "type": "date",
        "required": "是",
        "format": "提货日期（未来 7 天可选）",
        "sample": "—"
      },
      {
        "name": "weekday",
        "type": "string",
        "required": "否",
        "format": "星期（周日~周六）",
        "sample": "—"
      },
      {
        "name": "timeSlot",
        "type": "string",
        "required": "否",
        "format": "提货时段（09:00~20:30，每 30 分钟一档）",
        "sample": "—"
      }
    ]
  },
  "Conversation": {
    "label": "Conversation / Message（会话与消息）",
    "sources": [
      "v04-g2",
      "v04-g3",
      "v04-g1",
      "v04-u1",
      "v04-m4"
    ],
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": "是",
        "format": "会话 ID",
        "sample": "—"
      },
      {
        "name": "peer",
        "type": "object",
        "required": "否",
        "format": "对端（导购/客户）",
        "sample": "—"
      },
      {
        "name": "lastMsg",
        "type": "string",
        "required": "否",
        "format": "最后一条消息预览",
        "sample": "—"
      },
      {
        "name": "unread",
        "type": "number",
        "required": "否",
        "format": "未读数",
        "sample": "—"
      },
      {
        "name": "type",
        "type": "enum",
        "required": "否",
        "format": "会话类型",
        "sample": "—"
      },
      {
        "name": "msgId",
        "type": "string",
        "required": "否",
        "format": "消息 ID",
        "sample": "—"
      },
      {
        "name": "convId",
        "type": "string",
        "required": "否",
        "format": "所属会话 ID",
        "sample": "—"
      },
      {
        "name": "sender",
        "type": "string",
        "required": "否",
        "format": "发送方",
        "sample": "—"
      },
      {
        "name": "msgType",
        "type": "enum",
        "required": "否",
        "format": "消息类型 text/image/product/shoppingList/coupon",
        "sample": "text"
      },
      {
        "name": "content",
        "type": "string",
        "required": "否",
        "format": "消息内容",
        "sample": "—"
      },
      {
        "name": "time",
        "type": "string",
        "required": "否",
        "format": "消息时间",
        "sample": "—"
      },
      {
        "name": "template",
        "type": "string",
        "required": "否",
        "format": "模板消息（M4 消息管理 PC 端扩展）",
        "sample": "—"
      },
      {
        "name": "massSend",
        "type": "string",
        "required": "否",
        "format": "群发消息（M4 消息管理 PC 端扩展）",
        "sample": "—"
      },
      {
        "name": "customerInherit",
        "type": "string",
        "required": "否",
        "format": "客户继承至当前账号（M4 消息管理 PC 端扩展）",
        "sample": "—"
      }
    ]
  }
};
