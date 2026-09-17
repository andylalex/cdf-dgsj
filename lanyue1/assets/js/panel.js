/* ==========================================================================
 * panel.js —— 右栏 PRD 面板
 * 蓝月产品原型工作台 v3
 *
 * 职责：把原型内容（overview / flow / states / exceptions / rules / fields /
 *       models / acceptance / hotspots）渲染成产品与研发都能读懂的 PRD。
 *
 * 依赖（全部可选，缺失时自带 fallback，绝不崩）：
 *   window.WBCore  —— esc / $ / on / emit / toast
 *   window.WBData  —— modelsOf(protoId) / nav()
 *
 * 挂载点：mount(rootEl)，rootEl = <div class="prd-body" id="prdBody">
 *   · 头部（#prdGroup/#prdStatus/#prdTitle/#prdUpdated/#prdOwner/#prdHsCount）
 *     与 tab 条（#prdTabs）属于 index.html 骨架，本模块只改文本与状态类。
 *   · 内容区（.prd-body）DOM 全部由本模块创建。
 *
 * 用到的 base.css 类名：
 *   .prd-pane(.on) .prd-item .pi-head .pi-title .pi-idx .pi-desc
 *   .type-chip(.element/.rule/.field) .rule-rows .rule-row
 *   .ov-block .ov-label .ov-list .ov-line .ov-goal .tag
 *   .flow-chain .flow-node .flow-dot .flow-txt .state-grid .state-cell
 *   .dm-entity .dm-entity-h .field-table .f-name .f-type .req .opt .f-sample
 *   .status-pill(.review/.wip/.done) .prd-tab(.on) .empty-hint
 * 需要 workbench.css 补充的类（已在汇报中列出）：
 *   .wb-empty / __t / __d
 *   .ov-label.exc
 *   .flow-node.exc .flow-dot  / .flow-node.exc .flow-txt b
 *   .acc-item(.on) / .acc-box / .acc-txt / .acc-bar > i
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.document;

  /* ======================================================================
   * 0. 依赖容错
   * ==================================================================== */
  function core() { return global.WBCore || null; }

  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** 全量转义：防 XSS 与标签截断 */
  function esc(s) {
    var c = core();
    if (c && typeof c.esc === 'function') {
      try { return c.esc(s); } catch (e) { /* 退化到本地实现 */ }
    }
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ESC_MAP[m]; });
  }

  /** 转义 + 换行转 <br>（desc 支持 \n 多行） */
  function br(s) {
    return esc(s).replace(/\r\n?|\n/g, '<br>');
  }

  function $(sel, root) {
    var c = core();
    if (c && typeof c.$ === 'function') {
      try { return c.$(sel, root); } catch (e) { /* 退化 */ }
    }
    try { return (root || D).querySelector(sel); } catch (e2) { return null; }
  }

  var localBus = {};
  function busOn(name, fn) {
    var c = core();
    if (c && typeof c.on === 'function') {
      try { c.on(name, fn); return; } catch (e) { /* 退化 */ }
    }
    (localBus[name] || (localBus[name] = [])).push(fn);
  }
  function busEmit(name, data) {
    var c = core();
    if (c && typeof c.emit === 'function') {
      try { c.emit(name, data); return; } catch (e) { /* 退化 */ }
    }
    (localBus[name] || []).forEach(function (fn) {
      try { fn(data); } catch (e2) { /* 忽略 */ }
    });
  }

  function toast(msg) {
    var c = core();
    if (c && typeof c.toast === 'function') {
      try { c.toast(msg); return; } catch (e) { /* 退化 */ }
    }
  }

  /** 任意值 → 数组 */
  function arr(v) {
    return Object.prototype.toString.call(v) === '[object Array]' ? v : [];
  }
  /** 任意值 → 去空白字符串 */
  function str(v) {
    if (v == null) return '';
    if (typeof v === 'object') return '';
    return String(v).trim();
  }
  /** 取对象首个非空字段 */
  function pick(o) {
    if (!o) return '';
    for (var i = 1; i < arguments.length; i++) {
      var v = o[arguments[i]];
      if (v == null || typeof v === 'object') continue;
      if (String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }
  function pad2(n) { n = parseInt(n, 10); return isNaN(n) ? '—' : (n < 10 ? '0' + n : String(n)); }

  /* ======================================================================
   * 1. 常量
   * ==================================================================== */
  var PANES = ['overview', 'flow', 'element', 'rule', 'field', 'model', 'accept'];

  var TYPE_META = {
    element: { cls: 'element', label: '界面组件' },
    rule: { cls: 'rule', label: '业务规则' },
    field: { cls: 'field', label: '数据字段' }
  };

  var STATUS_META = {
    review: { cls: 'review', txt: '已评审' },
    wip: { cls: 'wip', txt: '设计中' },
    done: { cls: 'done', txt: '已定稿' }
  };

  var OV_FIELDS = [
    { k: 'summary', label: '功能概述' },
    { k: 'path', label: '功能路径' },
    { k: 'users', label: '目标用户' },
    { k: 'permission', label: '功能与数据权限' },
    { k: 'ports', label: '涉及系统端口' }
  ];

  /* ======================================================================
   * 2. 模块状态
   * ==================================================================== */
  var root = null;      // .prd-body
  var shell = null;     // .prd-panel（事件委托根）
  var proto = null;     // 当前原型
  var curTab = 'element';
  var panes = {};       // 懒渲染缓存 { tab: paneEl }
  var subs = [];        // on() 订阅者
  var bound = false;

  /* ======================================================================
   * 3. 片段构造
   * ==================================================================== */

  /** 空状态：产品一眼看到「缺什么」，而不是一片空白 */
  function wbEmpty(title, desc) {
    return '<div class="wb-empty empty-hint">' +
      '<div class="wb-empty__t">' + esc(title) + '</div>' +
      (desc ? '<div class="wb-empty__d">' + esc(desc) + '</div>' : '') +
      '</div>';
  }

  /** 分区：沿用原版 .ov-block + .ov-label */
  function block(label, body, exc) {
    return '<div class="ov-block"><div class="ov-label' + (exc ? ' exc' : '') + '">' +
      esc(label) + '</div>' + body + '</div>';
  }

  function ruleRow(dt, val, mono) {
    if (str(val) === '') return '';
    return '<div class="rule-row"><dt>' + esc(dt) + '</dt>' +
      '<dd' + (mono ? ' class="mono"' : '') + '>' + br(val) + '</dd></div>';
  }

  /* ---------- 3.1 hotspots 归一化 ---------- */
  /** 浅拷贝（不污染 proto）+ 补号 + 按 num 升序 */
  function normHotspots(p) {
    var src = arr(p && p.hotspots), out = [], i, k, n, max = 0, next;
    for (i = 0; i < src.length; i++) {
      var x = src[i];
      if (!x || typeof x !== 'object') continue;
      var c = {};
      for (k in x) { if (Object.prototype.hasOwnProperty.call(x, k)) c[k] = x[k]; }
      n = parseInt(c.num, 10);
      if (!isNaN(n) && n > max) max = n;
      out.push(c);
    }
    next = max + 1;
    for (i = 0; i < out.length; i++) {
      n = parseInt(out[i].num, 10);
      if (isNaN(n)) out[i].num = next++;
    }
    out.sort(function (a, b) { return (a.num || 0) - (b.num || 0); });
    return out;
  }

  /** 标注语义：rule / field 之外一律按 element（缺省与未知类型都不丢） */
  function hsType(h) {
    var t = str(h && h.type).toLowerCase();
    return (t === 'rule' || t === 'field') ? t : 'element';
  }

  /* ---------- 3.2 标注卡片 ---------- */
  function hsCard(h) {
    var t = hsType(h), m = TYPE_META[t];
    var id = str(h.id), num = h.num;
    var html = '<div class="prd-item" data-id="' + esc(id) + '" data-type="' + t + '"' +
      ' data-num="' + esc(num) + '" tabindex="0" role="button">';
    html += '<div class="pi-head">';
    html += '<span class="type-chip ' + m.cls + '">' + m.label + '</span>';
    html += '<span class="pi-title">' + esc(pick(h, 'title', 'name') || ('标注 ' + num)) + '</span>';
    html += '<span class="pi-idx" title="标注编号">#' + pad2(num) + '</span>';
    html += '</div>';

    var desc = pick(h, 'desc', 'd', 'description');
    if (desc) html += '<div class="pi-desc">' + br(desc) + '</div>';

    var rows = '';
    var r = h.rule;
    if (r && typeof r === 'object') {
      rows += ruleRow('规则编号', r.code, true);
      rows += ruleRow('触发', r.trigger);
      rows += ruleRow('行为', r.behavior);
      rows += ruleRow('异常', r.exception);
    }
    var f = h.field;
    if (f && typeof f === 'object') {
      rows += ruleRow('字段名', f.name, true);
      rows += ruleRow('类型', f.type);
      rows += ruleRow('必填', f.required);
      rows += ruleRow('格式', f.format);
      rows += ruleRow('示例', f.sample);
    }
    if (rows) html += '<div class="rule-rows">' + rows + '</div>';
    return html + '</div>';
  }

  /* ---------- 3.3 overview ---------- */
  function renderOverview(p) {
    var ov = (p && p.overview && typeof p.overview === 'object') ? p.overview : {};
    var lines = '', i, v;
    for (i = 0; i < OV_FIELDS.length; i++) {
      v = str(ov[OV_FIELDS[i].k]);
      if (!v) continue;
      lines += '<div class="ov-line"><span class="tag">' + esc(OV_FIELDS[i].label) + '</span>' +
        '<span>' + br(v) + '</span></div>';
    }
    var note = str(pick(p, 'note', 'remark'));
    if (!note) note = str(ov.note);
    if (note) lines += '<div class="ov-line"><span class="tag">备注</span><span>' + br(note) + '</span></div>';

    var goal = str(ov.goal) || str(pick(p, 'goal', 'target'));

    var h = '';
    if (lines) h += block('模块概述（PRD）', '<div class="ov-list">' + lines + '</div>');
    if (goal) h += block('页面目标', '<div class="ov-goal">' + br(goal) + '</div>');
    if (!h) h = wbEmpty('暂无概述信息', '建议补充功能概述、功能路径、目标用户、权限与涉及端口');
    return h;
  }

  /* ---------- 3.4 flow（异常 → 主流程 → 状态） ---------- */
  function flowNode(x, i, exc) {
    var t = pick(x, 't', 'title', 'name') || ('步骤 ' + i);
    var d = pick(x, 'd', 'desc', 'description');
    return '<div class="flow-node' + (exc ? ' exc' : '') + '">' +
      '<div class="flow-dot">' + esc(exc ? '!' : i) + '</div>' +
      '<div class="flow-txt"><b>' + esc(t) + '</b>' + (d ? br(d) : '') + '</div></div>';
  }

  function chain(list, exc) {
    var h = '<div class="flow-chain">', i;
    for (i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      h += flowNode(list[i], i + 1, exc);
    }
    return h + '</div>';
  }

  function renderFlow(p) {
    var ex = arr(p && p.exceptions), fl = arr(p && p.flow), st = arr(p && p.states);
    var h = '';

    // 异常流程排最前：研发最关心「出错怎么办」
    h += block('异常流程 · ' + ex.length + ' 条',
      ex.length ? chain(ex, true)
        : wbEmpty('暂无异常流程', '建议补充空态 / 失败 / 超时 / 权限不足等分支'),
      ex.length > 0);

    h += block('主流程 · ' + fl.length + ' 步',
      fl.length ? chain(fl, false)
        : wbEmpty('暂无主流程', '建议补充关键操作路径'));

    var cells = '', i, n, d;
    for (i = 0; i < st.length; i++) {
      if (!st[i]) continue;
      n = pick(st[i], 'n', 'name', 't', 'title') || ('状态 ' + (i + 1));
      d = pick(st[i], 'd', 'desc', 'description');
      cells += '<div class="state-cell"><b>' + esc(n) + '</b><span>' + br(d || '—') + '</span></div>';
    }
    h += block('页面状态 · ' + st.length + ' 个',
      st.length ? '<div class="state-grid">' + cells + '</div>'
        : wbEmpty('暂无页面状态', '建议补充空态 / 加载中 / 正常 / 错误'));
    return h;
  }

  /* ---------- 3.5 element ---------- */
  function renderElement(p) {
    var list = normHotspots(p).filter(function (h) { return hsType(h) === 'element'; });
    if (!list.length) return wbEmpty('暂无界面组件标注', '在原型上圈选控件后，这里会列出组件说明');
    return list.map(hsCard).join('');
  }

  /* ---------- 3.6 rule ---------- */
  function ruleCard(r, i) {
    var rows = ruleRow('触发', r.trigger) + ruleRow('行为', r.behavior) + ruleRow('异常', r.exception);
    var code = str(r.code);
    return '<div class="prd-item" data-type="rule">' +
      '<div class="pi-head"><span class="type-chip rule">业务规则</span>' +
      '<span class="pi-title">' + esc(code || ('规则 ' + (i + 1))) + '</span>' +
      '<span class="pi-idx" title="规则编号">#' + esc(code || pad2(i + 1)) + '</span></div>' +
      (rows ? '<div class="rule-rows">' + rows + '</div>' : '') +
      '</div>';
  }

  function renderRule(p) {
    var hs = normHotspots(p).filter(function (h) { return hsType(h) === 'rule'; });
    var top = arr(p && p.rules);
    var h = '';
    if (hs.length) h += block('标注规则 · ' + hs.length + ' 条', hs.map(hsCard).join(''));
    if (top.length) {
      var cards = '', i, r;
      for (i = 0; i < top.length; i++) {
        r = top[i];
        if (!r || typeof r !== 'object') continue;
        cards += ruleCard(r, i);
      }
      if (cards) h += block('规则清单 · ' + top.length + ' 条', cards);
    }
    if (!h) h = wbEmpty('暂无业务规则', '建议补充触发条件 → 系统行为 → 异常处理三段式规则');
    return h;
  }

  /* ---------- 3.7 field ---------- */
  function isReq(v) {
    if (v === true) return true;
    var s = str(v).toLowerCase();
    return /必|是|required|^y$|^yes$|^true$|^1$/.test(s);
  }

  function fieldTable(list) {
    var h = '<table class="field-table"><thead><tr>' +
      '<th>字段</th><th>类型</th><th>必填</th><th>校验 / 约束</th><th>示例</th>' +
      '</tr></thead><tbody>', i, f;
    for (i = 0; i < list.length; i++) {
      f = list[i];
      if (!f || typeof f !== 'object') continue;
      h += '<tr>' +
        '<td><div class="f-name">' + esc(str(f.name) || '—') + '</div></td>' +
        '<td><span class="f-type">' + esc(str(f.type) || '—') + '</span></td>' +
        '<td class="' + (isReq(f.required) ? 'req' : 'opt') + '">' + esc(str(f.required) || '—') + '</td>' +
        '<td>' + br(str(f.format) || '—') + '</td>' +
        '<td><span class="f-sample">' + esc(str(f.sample) || '—') + '</span></td>' +
        '</tr>';
    }
    return h + '</tbody></table>';
  }

  function renderField(p) {
    var hs = normHotspots(p).filter(function (h) { return hsType(h) === 'field'; });
    var top = arr(p && p.fields);
    var h = '';
    if (hs.length) h += block('标注字段 · ' + hs.length + ' 项', hs.map(hsCard).join(''));
    if (top.length) h += block('字段清单 · ' + top.length + ' 项', fieldTable(top));
    if (!h) h = wbEmpty('暂无字段定义', '建议补充字段名 / 类型 / 必填 / 格式 / 示例');
    return h;
  }

  /* ---------- 3.8 model ---------- */
  function modelsOf(pid) {
    var out = null, D2 = global.WBData;
    if (D2 && typeof D2.modelsOf === 'function') {
      try { out = D2.modelsOf(pid); } catch (e) { out = null; }
    }
    if (out == null) {
      // fallback：直接读 PROTO_DATA.models，按 sources 反查
      var M = (global.PROTO_DATA && global.PROTO_DATA.models) || {};
      out = Object.keys(M).map(function (k) {
        var m = M[k] || {};
        return { key: k, label: m.label || k, fields: m.fields || [] };
      }).filter(function (m) {
        var src = (M[m.key] || {}).sources;
        return arr(src).indexOf(pid) >= 0;
      });
    }
    return arr(out).map(function (m) {
      if (!m || typeof m !== 'object') return null;
      return {
        label: str(pick(m, 'label', 'name', 'key', 'id')) || '未命名模型',
        fields: arr(m.fields)
      };
    }).filter(Boolean);
  }

  function renderModel(p) {
    var list = modelsOf(str(p && p.id));
    if (!list.length) return wbEmpty('暂无数据模型', '该原型未关联数据模型，可在数据模型的 sources 中补充本页 id');
    var h = '', i, m;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      h += '<div class="dm-entity"><div class="dm-entity-h">' + esc(m.label) + '</div>' +
        (m.fields.length ? fieldTable(m.fields) : wbEmpty('该模型暂无字段', '')) +
        '</div>';
    }
    return h;
  }

  /* ---------- 3.9 accept ---------- */
  function accKey(pid) { return 'wb_acc_' + pid; }

  function loadAcc(pid) {
    try {
      var raw = global.localStorage ? global.localStorage.getItem(accKey(pid)) : null;
      if (!raw) return [];
      return arr(JSON.parse(raw)).filter(function (n) { return typeof n === 'number'; });
    } catch (e) { return []; }
  }

  function saveAcc(pid, list) {
    try {
      if (global.localStorage) global.localStorage.setItem(accKey(pid), JSON.stringify(list));
    } catch (e) { /* 隐私模式 / 配额：静默降级 */ }
  }

  function accList(p) {
    return arr(p && p.acceptance).map(function (x) {
      return typeof x === 'string' ? x : pick(x, 't', 'text', 'title', 'd', 'desc');
    }).filter(function (x) { return x !== ''; });
  }

  function renderAccept(p) {
    var list = accList(p);
    if (!list.length) return wbEmpty('暂无验收标准', '建议补充可勾选的验收项，评审时逐条打勾');
    var pid = str(pick(p, 'id')) || '__anon__';
    var checked = loadAcc(pid).filter(function (i) { return i >= 0 && i < list.length; });
    var pct = Math.round(checked.length / list.length * 100);

    var bar = '<div class="ov-line"><span class="tag">进度</span>' +
      '<span class="acc-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span>' + checked.length + ' / ' + list.length + '</span></div>';

    var h = block('验收进度', '<div class="ov-list">' + bar + '</div>');
    for (var i = 0; i < list.length; i++) {
      var on = checked.indexOf(i) >= 0;
      h += '<div class="acc-item' + (on ? ' on' : '') + '" data-acc="' + i + '"' +
        ' role="checkbox" tabindex="0" aria-checked="' + (on ? 'true' : 'false') + '">' +
        '<span class="acc-box">✓</span><span class="acc-txt">' + br(list[i]) + '</span></div>';
    }
    return h;
  }

  /* ======================================================================
   * 4. 分发渲染（懒渲染：非当前 tab 不建 DOM）
   * ==================================================================== */
  var RENDERERS = {
    overview: renderOverview,
    flow: renderFlow,
    element: renderElement,
    rule: renderRule,
    field: renderField,
    model: renderModel,
    accept: renderAccept
  };

  function buildPane(name) {
    var fn = RENDERERS[name] || renderOverview;
    try {
      return fn(proto);
    } catch (e) {
      return wbEmpty('该分区渲染失败', (e && e.message) ? e.message : String(e));
    }
  }

  function renderBody() {
    if (!root) return;
    if (!proto) {
      root.innerHTML = '<div class="prd-pane on">' +
        wbEmpty('未选择原型', '在左侧目录中选择一个页面，这里会展示它的 PRD 说明') + '</div>';
      return;
    }
    var pane = panes[curTab];
    if (!pane) {
      pane = D.createElement('div');
      pane.className = 'prd-pane';
      pane.setAttribute('data-pane', curTab);
      pane.innerHTML = buildPane(curTab);
      panes[curTab] = pane;
      root.appendChild(pane);
    }
    for (var k in panes) {
      if (panes[k]) panes[k].classList.toggle('on', k === curTab);
    }
  }

  /* ======================================================================
   * 5. 头部 / tab 条
   * ==================================================================== */
  function setText(id, txt) {
    var el = $(id ? ('#' + id) : '');
    if (el) el.textContent = txt;
  }

  function groupOf(pid) {
    var d = global.WBData;
    if (d && typeof d.nav === 'function') {
      try {
        var nav = d.nav() || {};
        var items = arr(nav.items);
        for (var i = 0; i < items.length; i++) {
          if (items[i] && items[i].id === pid) return str(items[i].group);
        }
      } catch (e) { /* 退化 */ }
    }
    return '';
  }

  function renderHead() {
    var elStatus = $('#prdStatus');
    if (!proto) {
      setText('prdGroup', 'PRD');
      setText('prdTitle', '未选择原型');
      if (elStatus) elStatus.hidden = true;
      setText('prdUpdated', '—');
      setText('prdOwner', '—');
      setText('prdHsCount', '0 项标注');
      var eb0 = $('#prdEditBtn');
      if (eb0) eb0.hidden = true;
      return;
    }
    // 分组来源优先级：_group（nav 派生权威值）→ nav 反查 → proto.group（旧版迁移残留，保存后会被剔除）
    var grp = str(proto._group) || groupOf(str(proto.id)) || str(proto.group);
    setText('prdGroup', (grp ? grp + ' · ' : '') + 'PRD');
    setText('prdTitle', str(pick(proto, 'name', 'title')) || '未命名原型');

    var st = str(proto.status).toLowerCase();
    var meta = STATUS_META[st] || STATUS_META.wip;
    if (elStatus) {
      elStatus.hidden = false;
      elStatus.className = 'status-pill ' + meta.cls;
      elStatus.textContent = meta.txt;
    }
    setText('prdUpdated', str(proto.updated) ? ('更新于 ' + str(proto.updated)) : '—');
    setText('prdOwner', str(proto.owner) || '—');
    setText('prdHsCount', normHotspots(proto).length + ' 项标注');

    // 管理模式：右栏头部提供"编辑此原型"入口，调 WBEditor.openEdit 打开编辑弹窗
    var btn = $('#prdEditBtn');
    if (btn) {
      var manage = document.documentElement.classList.contains('is-admin');
      btn.hidden = !manage || !proto.id;
      btn.onclick = function () {
        if (window.WBEditor && typeof window.WBEditor.openEdit === 'function') {
          window.WBEditor.openEdit(proto.id);
        }
      };
    }
  }

  function renderCounts() {
    if (!proto) {
      setText('nFlow', '0'); setText('nElement', '0'); setText('nRule', '0');
      setText('nField', '0'); setText('nModel', '0'); setText('nAccept', '0');
      return;
    }
    var hs = normHotspots(proto);
    var nEl = 0, nRu = 0, nFd = 0, i;
    for (i = 0; i < hs.length; i++) {
      var t = hsType(hs[i]);
      if (t === 'element') nEl++;
      else if (t === 'rule') nRu++;
      else nFd++;
    }
    setText('nFlow', String(arr(proto.exceptions).length + arr(proto.flow).length + arr(proto.states).length));
    setText('nElement', String(nEl));
    setText('nRule', String(nRu + arr(proto.rules).length));
    setText('nField', String(nFd + arr(proto.fields).length));
    setText('nModel', String(modelsOf(str(proto.id)).length));
    setText('nAccept', String(accList(proto).length));
  }

  function renderTabs() {
    var tabs = D.querySelectorAll('#prdTabs .prd-tab');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-pane') === curTab;
      if (on) tabs[i].classList.add('on'); else tabs[i].classList.remove('on');
    }
  }

  /* ======================================================================
   * 6. 事件（委托到 .prd-panel，只绑一次）
   * ==================================================================== */
  function fireHotspot(el) {
    var payload = { type: 'hotspot', id: el.getAttribute('data-id') || '', num: parseInt(el.getAttribute('data-num'), 10) };
    if (isNaN(payload.num)) payload.num = null;
    var items = root ? root.querySelectorAll('.prd-item.sel') : [];
    for (var i = 0; i < items.length; i++) items[i].classList.remove('sel');
    el.classList.add('sel');
    subs.forEach(function (cb) {
      try { cb(payload); } catch (e) { /* 订阅者异常不影响他人 */ }
    });
  }

  function toggleAcc(idx) {
    if (!proto) return;
    var list = accList(proto);
    if (idx < 0 || idx >= list.length) return;
    var pid = str(pick(proto, 'id')) || '__anon__';
    var checked = loadAcc(pid);
    var at = checked.indexOf(idx);
    if (at >= 0) checked.splice(at, 1); else checked.push(idx);
    checked.sort(function (a, b) { return a - b; });
    saveAcc(pid, checked);
    // 只重建验收 pane，其它 tab 缓存不动
    var old = panes.accept;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    delete panes.accept;
    renderBody();
  }

  function onClick(e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    var tab = t.closest('.prd-tab');
    if (tab) {
      var name = tab.getAttribute('data-pane');
      if (name) { api.setTab(name); }
      return;
    }
    if (!root) return;

    var acc = t.closest('.acc-item');
    if (acc && root.contains(acc)) {
      var i = parseInt(acc.getAttribute('data-acc'), 10);
      if (!isNaN(i)) toggleAcc(i);
      return;
    }
    var item = t.closest('.prd-item');
    if (item && root.contains(item) && item.hasAttribute('data-num')) fireHotspot(item);
  }

  function onKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = e.target;
    if (!t || typeof t.closest !== 'function' || !root) return;
    var acc = t.closest('.acc-item');
    if (acc && root.contains(acc)) {
      e.preventDefault();
      var i = parseInt(acc.getAttribute('data-acc'), 10);
      if (!isNaN(i)) toggleAcc(i);
      return;
    }
    var item = t.closest('.prd-item');
    if (item && root.contains(item) && item.hasAttribute('data-num')) {
      e.preventDefault();
      fireHotspot(item);
    }
  }

  function bindEvents() {
    if (bound || !shell) return;
    shell.addEventListener('click', onClick);
    shell.addEventListener('keydown', onKeydown);
    bound = true;
  }

  /* ======================================================================
   * 7. 对外接口
   * ==================================================================== */
  var api = {
    /** 挂载：rootEl = #prdBody（.prd-body），内部 DOM 全量自建 */
    mount: function (rootEl) {
      if (!rootEl) return;
      root = rootEl;
      shell = (root.closest && root.closest('.prd-panel')) || root;
      panes = {};
      bindEvents();
      renderHead();
      renderCounts();
      renderTabs();
      renderBody();
    },

    /** 渲染某个原型；null → 空状态 */
    render: function (p) {
      proto = (p && typeof p === 'object') ? p : null;
      if (!root) return;
      panes = {};
      root.innerHTML = '';   // 原型切换：旧 pane 全部丢弃（验收勾选存 localStorage，不受影响）
      renderHead();
      renderCounts();
      renderTabs();
      renderBody();
    },

    /** 外部切 tab */
    setTab: function (name) {
      if (PANES.indexOf(name) < 0) return;
      curTab = name;
      if (!root) return;
      renderTabs();
      renderBody();
      busEmit('panel:tab', { tab: curTab, id: proto ? proto.id : null });
    },

    getTab: function () { return curTab; },

    /** 订阅条目点击：cb({type:'hotspot', id, num})，返回取消订阅函数 */
    on: function (cb) {
      if (typeof cb !== 'function') return function () { };
      subs.push(cb);
      return function () {
        var i = subs.indexOf(cb);
        if (i >= 0) subs.splice(i, 1);
      };
    },

    /** 外部高亮：舞台点热点 → 右栏滚到对应条目并加选中态 */
    select: function (id) {
      if (!root || !id) return;
      var el = root.querySelector('.prd-item[data-id="' + String(id).replace(/["\\]/g, '') + '"]');
      if (!el) return;
      var items = root.querySelectorAll('.prd-item.sel');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('sel');
      el.classList.add('sel');
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    },

    /** 强制重刷当前原型（管理模式保存后可用） */
    refresh: function () {
      if (!root) return;
      panes = {};
      root.innerHTML = '';
      renderHead();
      renderCounts();
      renderBody();
    },

    toast: toast
  };

  global.WBPanel = api;

  // 管理模式保存后只发事件不调 render —— 这里兜一层（不监听 proto:select，避免与 app.js 重复渲染）
  busOn('proto:changed', function (p) { api.render(p); });

})(typeof window !== 'undefined' ? window : this);
