/* ============================================================
 * 蓝月产品原型工作台 v3 · 左导航
 * assets/js/sidebar.js  →  window.WBSidebar
 * ------------------------------------------------------------
 * 职责单一：只渲染左侧原型目录。数据一律来自 WBData：
 *   结构 → WBData.byGroup()（分组顺序 = nav.cats）
 *   内容 → WBData.proto(id)
 * 本文件不自行维护任何导航数据副本。
 * 类名全部沿用 base.css 原版：.side-group/.side-group-name/
 * .side-item/.si-drag/.side-ico/.side-meta/.side-name/.empty-hint
 * ============================================================ */
(function (window, document) {
  'use strict';

  /* ---------- WBCore 依赖（缺失时自带降级） ---------- */
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function core() { try { return window.WBCore || null; } catch (e) { return null; } }
  function fbEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); }

  function esc(s) {
    var D = window.WBData, c = core();
    if (c && c.esc) return c.esc(s);
    if (D && D.esc) return D.esc(s);
    return fbEsc(s);
  }
  function emit(name, detail) {
    var c = core();
    if (c && c.emit) { try { c.emit(name, detail); } catch (e) { } }
  }
  function $(sel) {
    var c = core();
    if (c && c.$) { try { return c.$(sel); } catch (e) { } }
    try { return document.querySelector(sel); } catch (e) { return null; }
  }
  function isArr(x) { return Array.isArray(x); }

  /* ---------- 内联 SVG 图标（零外链） ---------- */
  var WRAP = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var SVG = {
    desktop: '<svg ' + WRAP + '><rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>',
    tablet: '<svg ' + WRAP + '><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M11 18h2"></path></svg>',
    mobile: '<svg ' + WRAP + '><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path></svg>',
    pages: '<svg ' + WRAP + '><rect x="8" y="3" width="12" height="15" rx="2"></rect><path d="M16 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8"></path></svg>',
    images: '<svg ' + WRAP + '><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.6"></circle><path d="m21 15-4.5-4.5L5 21"></path></svg>',
    grip: '<svg ' + WRAP + '><circle cx="9" cy="6" r="1.2"></circle><circle cx="15" cy="6" r="1.2"></circle><circle cx="9" cy="12" r="1.2"></circle><circle cx="15" cy="12" r="1.2"></circle><circle cx="9" cy="18" r="1.2"></circle><circle cx="15" cy="18" r="1.2"></circle></svg>'
  };

  function iconOf(p) {
    if (!p) return SVG.mobile;
    if (p.kind === 'images') return SVG.images;
    if (p.kind === 'pages') return SVG.pages;
    if (p.device === 'desktop') return SVG.desktop;
    if (p.device === 'tablet') return SVG.tablet;
    return SVG.mobile;
  }

  /* ---------- 内部状态 ---------- */
  var _root = null;        // #sideList
  var _search = null;      // #sideSearch
  var _total = null;       // #protoTotal
  var _manage = false;
  var _cur = null;
  var _q = '';
  var _bound = false;
  var _drag = null;        // 拖拽中的条目
  var _drop = null;        // 落点

  function G() { return window.WBData; }

  /* ---------- 搜索匹配：名称 / 字段 / 规则 / 标注 ---------- */
  function joinField(arr, keys) {
    if (!isArr(arr)) return '';
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var o = arr[i];
      if (o == null) continue;
      if (typeof o === 'string') { out.push(o); continue; }
      if (typeof o !== 'object') continue;
      for (var k = 0; k < keys.length; k++) {
        if (o[keys[k]] != null) out.push(String(o[keys[k]]));
      }
    }
    return out.join(' ');
  }

  function haystack(p) {
    if (!p) return '';
    var parts = [
      p.id, p.name, p.note, p.version, p.owner,
      p.overview && (p.overview.summary + ' ' + p.overview.goal + ' ' + p.overview.users + ' ' + p.overview.note)
    ];
    parts.push(joinField(p.fields, ['name', 'sample', 'format']));
    parts.push(joinField(p.rules, ['code', 'trigger', 'behavior', 'exception']));
    parts.push(joinField(p.hotspots, ['title', 'desc']));
    parts.push(joinField(p.api, ['name', 'path', 'desc']));
    parts.push(joinField(p.acceptance, []));
    parts.push(joinField(p.flow, ['t', 'd']));
    parts.push(joinField(p.states, ['n', 'd']));
    parts.push(joinField(p.exceptions, ['t', 'd']));
    return parts.join(' ').toLowerCase();
  }

  function matches(p, q) {
    if (!q) return true;
    return haystack(p).indexOf(q) >= 0;
  }

  /* ---------- 渲染 ---------- */
  function itemHTML(p, active) {
    var cls = 'side-item';
    if (active) cls += ' active';
    if (_manage) cls += ' manage';
    var h = '<div class="' + cls + '" data-id="' + esc(p.id) + '" data-group="' + esc(p._group || '') + '" role="button" tabindex="0" aria-selected="' + (active ? 'true' : 'false') + '">';
    if (_manage) h += '<span class="si-drag" title="拖拽排序 / 拖到分组名上改分类">' + SVG.grip + '</span>';
    h += '<span class="side-ico">' + iconOf(p) + '</span>';
    h += '<span class="side-meta"><div class="side-name">' + esc(p.name || p.id) + '</div></span>';
    h += '</div>';
    return h;
  }

  function clearMarks() {
    if (!_root) return;
    var els = _root.querySelectorAll('.drop-before,.drop-after,.drag-drop-over');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.remove('drop-before');
      els[i].classList.remove('drop-after');
      els[i].classList.remove('drag-drop-over');
    }
  }

  function setTotal(n) {
    var el = _total || (_total = $('#protoTotal'));
    if (el) el.textContent = n + ' 个页面';
  }

  function render() {
    if (!_root) return;
    var D = G();
    var groups = D && D.byGroup ? D.byGroup() : [];
    var html = '', shown = 0, total = 0, i, j;

    for (i = 0; i < groups.length; i++) {
      var gi = groups[i].items.filter(function (p) { return matches(p, _q); });
      total += groups[i].items.length;
      if (!gi.length) continue;
      html += '<div class="side-group"><div class="side-group-name" data-group="' + esc(groups[i].group) + '">' + esc(groups[i].group) + '</div>';
      for (j = 0; j < gi.length; j++) {
        html += itemHTML(gi[j], gi[j].id === _cur);
        shown++;
      }
      html += '</div>';
    }

    if (!shown) {
      html = '<div class="empty-hint">' + (_q ? '没有匹配「' + esc(_q) + '」的页面' : '暂无原型页面') + '</div>';
    }
    if (_manage) _root.classList.add('manage'); else _root.classList.remove('manage');
    _root.innerHTML = html;
    setTotal(_q ? shown : total);
  }

  /* ---------- 选中 ---------- */
  function select(id) {
    var D = G();
    var p = D && D.proto ? D.proto(id) : null;
    if (!p) return;
    _cur = id;
    try {
      var want = '#/p/' + encodeURIComponent(id);
      if (window.location.hash !== want) window.location.hash = want;
    } catch (e) { }
    emit('proto:select', p);
  }

  function setActive(id) {
    _cur = id || null;
    if (!_root) return;
    var els = _root.querySelectorAll('.side-item');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var hit = !!id && el.getAttribute('data-id') === id;
      if (hit) el.classList.add('active'); else el.classList.remove('active');
      el.setAttribute('aria-selected', hit ? 'true' : 'false');
    }
  }

  /* ---------- 事件委托：整个 sidebar 只绑一次 ---------- */
  function itemOf(target) {
    var el = target;
    while (el && el !== _root) {
      if (el.classList && el.classList.contains('side-item')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onClick(e) {
    if (!_root || !e.target) return;
    var el = itemOf(e.target);
    if (!el) return;
    var id = el.getAttribute('data-id');
    if (!id) return;
    setActive(id);
    select(id);
  }

  /** 双击左栏条目（仅管理模式）：直接打开该原型编辑弹窗 */
  function onDblClick(e) {
    if (!_root || !e.target) return;
    if (!document.documentElement.classList.contains('is-admin')) return;   // index 只读版不触发
    var el = itemOf(e.target);
    if (!el) return;
    var id = el.getAttribute('data-id');
    if (!id) return;
    if (window.WBEditor && typeof window.WBEditor.openEdit === 'function') {
      window.WBEditor.openEdit(id);
    }
  }

  function onKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var el = itemOf(e.target);
    if (!el) return;
    e.preventDefault();
    var id = el.getAttribute('data-id');
    if (!id) return;
    setActive(id);
    select(id);
  }

  function onSearch() {
    _q = (_search && _search.value ? String(_search.value) : '').replace(/^\s+|\s+$/g, '');
    if (_q) _q = _q.toLowerCase();
    render();
  }

  /* ---------- 管理模式拖拽排序（鼠标实现，与原版一致） ---------- */
  function onMouseDown(e) {
    if (!_manage || !_root || !e.target) return;
    var handle = e.target.closest ? e.target.closest('.si-drag') : null;
    if (!handle) return;
    var el = itemOf(handle);
    if (!el) return;
    e.preventDefault();
    _drag = { id: el.getAttribute('data-id'), el: el };
    _drop = null;
    el.classList.add('dragging');
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
  }

  function onMouseMove(e) {
    if (!_drag) return;
    clearMarks();
    var under = document.elementFromPoint ? document.elementFromPoint(e.clientX, e.clientY) : null;
    if (!under || (_root && !_root.contains(under))) { _drop = null; return; }

    // ① 落在分组标题上：跨分组改分类
    var gname = under.closest ? under.closest('.side-group-name') : null;
    if (gname) {
      gname.classList.add('drag-drop-over');
      _drop = { type: 'group', group: gname.getAttribute('data-group') };
      return;
    }
    // ② 落在其它条目上：同分组内插位
    var target = itemOf(under);
    if (!target || target === _drag.el) { _drop = null; return; }
    var r = target.getBoundingClientRect();
    var before = (e.clientY - r.top) < (r.height / 2);
    target.classList.add(before ? 'drop-before' : 'drop-after');
    _drop = { type: 'item', id: target.getAttribute('data-id'), before: before };
  }

  function applyDrop() {
    var D = G();
    if (!D || !_drag || !_drop) return false;
    var nav = D.nav();
    if (!nav || !isArr(nav.items)) return false;
    var items = nav.items, idx, from = -1;
    for (idx = 0; idx < items.length; idx++) { if (items[idx].id === _drag.id) { from = idx; break; } }
    if (from < 0) return false;
    var moved = items.splice(from, 1)[0];

    if (_drop.type === 'group') {
      moved.group = _drop.group || moved.group;
      var last = -1;
      for (idx = 0; idx < items.length; idx++) { if (items[idx].group === moved.group) last = idx; }
      if (last >= 0) items.splice(last + 1, 0, moved); else items.push(moved);
    } else {
      var to = -1;
      for (idx = 0; idx < items.length; idx++) { if (items[idx].id === _drop.id) { to = idx; break; } }
      if (to >= 0) {
        // 跨分组拖到别的条目上：归入目标所在分组，避免「看着插进去了、渲染又跳回原组」
        if (items[to].group !== moved.group) moved.group = items[to].group;
        items.splice(_drop.before ? to : to + 1, 0, moved);
      } else {
        items.push(moved);
      }
    }
    items.forEach(function (it, i) { it.order = i; });
    return true;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    if (_drag && _drag.el) _drag.el.classList.remove('dragging');
    var changed = applyDrop();
    clearMarks();
    _drag = null;
    _drop = null;
    if (!changed) return;
    render();
    var D = G();
    if (D && D.saveNav) D.saveNav().then(function (ok) { if (!ok) render(); });
  }

  /* ---------- 对外 API ---------- */
  var WBSidebar = {
    /**
     * 挂载：绑定事件并首渲
     * @param {HTMLElement} [rootEl] 默认 #sideList
     */
    mount: function (rootEl) {
      _root = rootEl || $('#sideList') || document.getElementById('sideList');
      if (!_root) return null;
      _total = $('#protoTotal') || document.getElementById('protoTotal');
      _search = $('#sideSearch') || document.getElementById('sideSearch');
      if (!_bound) {
        _bound = true;
        _root.addEventListener('click', onClick, false);
        _root.addEventListener('keydown', onKeydown, false);
        _root.addEventListener('mousedown', onMouseDown, false);
        _root.addEventListener('dblclick', onDblClick, false);   // 双击打开编辑（仅管理模式）
        if (_search) _search.addEventListener('input', onSearch, false);
      }
      render();
      return _root;
    },

    /** 全量重渲（数据源变化后调用） */
    render: render,

    /** 管理模式开关：显示拖拽手柄，开启拖拽排序 */
    setManage: function (on) {
      _manage = !!on;
      render();
      return _manage;
    },

    /** 当前选中 id */
    currentId: function () { return _cur; },

    /** 外部（路由 / 快捷键）驱动选中态，只切 class 不重渲 */
    setActive: setActive,

    /** 内部实现暴露给测试用 */
    _filter: function (q) { _q = q || ''; render(); }
  };

  window.WBSidebar = WBSidebar;
})(window, document);
