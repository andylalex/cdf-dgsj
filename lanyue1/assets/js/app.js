/* app.js —— 启动装配与全局交互
 * 职责边界（避免与 stage.js / sidebar.js 重复绑定）：
 *   stage.js   负责：设备切换、标注开关、走查、iframe、热点、二级导航
 *   sidebar.js 负责：左导航渲染、搜索、点击选中、管理模式拖拽
 *   app.js     负责：启动装配、路由、顶栏其余按钮、目录页、快捷键、主题、折叠栏
 */
(function () {
  'use strict';
  var G = window, D = G.document;

  var C = G.WBCore || {
    esc: function (s) { return String(s == null ? '' : s); },
    $: function (s, r) { return (r || D).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); },
    on: function () {}, emit: function () {},
    toast: function (m) { var t = D.getElementById('toast'); if (t) { t.textContent = m; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2000); } },
    v: function (u) { return u; }, store: { get: function () { return null; }, set: function () {} }
  };

  var State = { view: 'proto', id: null, page: 0 };

  /* proto:select 去重：sidebar 点击会先 emit 一次，随后 hashchange 路由再触发一次，
     400ms 内同 id 只发一次，避免下游（editor / stage）重复响应。 */
  var lastSel = { id: '', t: 0 };
  function emitSelect(p) {
    if (!p || !p.id) return;
    var now = Date.now();
    if (lastSel.id === p.id && (now - lastSel.t) < 400) return;
    lastSel.id = p.id; lastSel.t = now;
    C.emit('proto:select', p);
  }

  /* ---------- 路由 ---------- */
  function parseHash() {
    var h = (G.location.hash || '').replace(/^#\/?/, '');
    var m = h.match(/^p\/([^/]+)(?:\/(\d+))?$/);
    if (m) return { view: 'proto', id: decodeURIComponent(m[1]), page: parseInt(m[2] || '0', 10) };
    return { view: 'catalog', id: null, page: 0 };
  }

  function go(r, replace) {
    var h = r.view === 'proto' ? ('#/p/' + r.id + (r.page ? '/' + r.page : '')) : '#/catalog';
    if (G.location.hash === h) { apply(r); return; }
    if (replace && G.history && G.history.replaceState) {
      G.history.replaceState(null, '', G.location.pathname + G.location.search + h);
      apply(r);
    } else {
      G.location.hash = h;
    }
  }

  function apply(r) {
    State.view = r.view; State.id = r.id; State.page = r.page || 0;
    var cat = C.$('#catalogView');
    var proto = r.view === 'proto' ? (G.WBData ? G.WBData.proto(r.id) : null) : null;

    if (r.view === 'catalog') {
      if (cat) cat.style.display = '';
      renderCatalog();
      if (G.WBPanel) G.WBPanel.render(null);
    } else {
      if (cat) cat.style.display = 'none';
      if (!proto) {
        // id 失效：回退到第一个
        var first = G.WBData && G.WBData.mounted ? G.WBData.mounted()[0] : null;
        if (first) { go({ view: 'proto', id: first.id, page: 0 }, true); return; }
      }
      if (G.WBStage) G.WBStage.show(proto);
      if (G.WBPanel) G.WBPanel.render(proto);
      if (G.WBSidebar) G.WBSidebar.setActive(r.id);
      emitSelect(proto);
    }
    C.emit('route:change', r);
  }

  /* ---------- 目录页 ---------- */
  var MODULES = [
    { key: 'guide', icon: 'guide', name: '导购升级', desc: '导购端商品推荐与业绩管理、顾客端 IM 会话/商品详情/结算中心/行程核验，以及管理后台的业绩与消息监控。' },
    { key: 'member', icon: 'member', name: '会员体系', desc: '会员等级、积分、权益与成长体系，规划中。' },
    { key: 'order', icon: 'order', name: '订单中心', desc: '订单全生命周期管理、履约跟踪与售后流程，规划中。' },
    { key: 'data', icon: 'data', name: '数据看板', desc: '经营数据、转化漏斗与实时指标监控，规划中。' }
  ];

  function stats() {
    var n = 0, a = 0;
    if (G.WBData && G.WBData.mounted) {
      var list = G.WBData.mounted();
      n = list.length;
      list.forEach(function (p) { a += (p.hotspots || []).length; });
    }
    return { proto: n, anno: a, mod: 1 };
  }

  function renderCatalog() {
    var s = stats();
    var set = function (id, v) { var e = C.$('#' + id); if (e) e.textContent = v; };
    set('catNavMod', s.mod); set('catNavProto', s.proto); set('catNavAnno', s.anno);
    set('catHeroMod', s.mod); set('catHeroProto', s.proto); set('catHeroAnno', s.anno);

    var grid = C.$('#catGrid');
    if (!grid) return;
    var first = G.WBData && G.WBData.mounted ? G.WBData.mounted()[0] : null;
    grid.innerHTML = MODULES.map(function (m) {
      if (m.key !== 'guide') {
        return '<div class="cat-card planned" data-proto="">' +
          '<div class="cat-top"><div class="cat-icon ' + m.icon + '"></div><span class="cat-status planned">规划中</span></div>' +
          '<div class="cat-name">' + C.esc(m.name) + '</div>' +
          '<div class="cat-desc">' + C.esc(m.desc) + '</div>' +
          '<div class="cat-meta-row"><div class="cat-meta-item"><span class="v">0</span><span class="l">交互原型</span></div>' +
          '<div class="cat-meta-item"><span class="v">0</span><span class="l">热点标注</span></div>' +
          '<div class="cat-meta-item"><span class="v">—</span><span class="l">走查模式</span></div></div></div>';
      }
      return '<div class="cat-card" data-proto="' + C.esc(first ? first.id : '') + '">' +
        '<div class="cat-top"><div class="cat-icon ' + m.icon + '"></div><span class="cat-status online">已上线</span></div>' +
        '<div class="cat-name">' + C.esc(m.name) + '<span class="ver">v0.4</span></div>' +
        '<div class="cat-desc">' + C.esc(m.desc) + '</div>' +
        '<div class="cat-meta-row">' +
        '<div class="cat-meta-item"><span class="v accent">' + s.proto + '</span><span class="l">交互原型</span></div>' +
        '<div class="cat-meta-item"><span class="v">' + s.anno + '</span><span class="l">热点标注</span></div>' +
        '<div class="cat-meta-item"><span class="v">✓</span><span class="l">走查模式</span></div></div>' +
        '<div class="cat-enter"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></div></div>';
    }).join('');
  }

  /* ---------- 顶栏与全局交互 ---------- */
  var SHORTCUTS = [
    [['Alt', '↑'], '切换上一个原型'], [['Alt', '↓'], '切换下一个原型'],
    [['C'], '开始 / 结束 走查模式'], [['['], '收起 / 展开 左栏（目录）'],
    [[']'], '收起 / 展开 右栏（PRD）'], [['\\'], '一键 隐藏 / 显示 左右栏'],
    [['Esc'], '结束走查'], [['←', '→'], '走查 上一步 / 下一步']
  ];

  function setCollapsed(side, on) {
    var l = C.$('.layout');
    if (!l) return;
    l.classList.toggle('collapse-left', side === 'left' ? on : l.classList.contains('collapse-left'));
    l.classList.toggle('collapse-right', side === 'right' ? on : l.classList.contains('collapse-right'));
  }

  function stepProto(dir) {
    if (!G.WBData) return;
    var list = G.WBData.mounted ? G.WBData.mounted() : [];
    if (!list.length) return;
    var i = 0;
    for (var k = 0; k < list.length; k++) { if (list[k].id === State.id) { i = k; break; } }
    var n = (i + dir + list.length) % list.length;
    go({ view: 'proto', id: list[n].id, page: 0 });
  }

  function bindGlobal() {
    // 返回目录
    var back = C.$('#backToCatalog');
    if (back) back.addEventListener('click', function () { go({ view: 'catalog' }); });

    // 目录卡片
    var grid = C.$('#catGrid');
    if (grid) grid.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.cat-card') : null;
      if (!card) return;
      var pid = card.getAttribute('data-proto');
      if (!pid) { C.toast('该模块规划中'); return; }
      go({ view: 'proto', id: pid, page: 0 });
    });

    // 顶栏：刷新 / 新窗口 / 一键折叠
    var fr = C.$('#frameRefresh');
    if (fr) fr.addEventListener('click', function () { if (G.WBStage) G.WBStage.reload(); });
    var fo = C.$('#frameOpen');
    if (fo) fo.addEventListener('click', function () { if (G.WBStage) G.WBStage.open(); });
    var pt = C.$('#panelToggle');
    if (pt) pt.addEventListener('click', function () {
      var l = C.$('.layout'); if (!l) return;
      var on = !l.classList.contains('collapse-left');
      setCollapsed('left', on); setCollapsed('right', on);
    });

    // 左右折叠手柄
    ['left', 'right'].forEach(function (side) {
      var h = C.$('#' + (side === 'left' ? 'handleLeft' : 'handleRight'));
      if (!h) return;
      h.addEventListener('click', function () {
        var l = C.$('.layout');
        setCollapsed(side, !(l && l.classList.contains('collapse-' + side)));
      });
    });

    // 快捷键弹窗
    var more = C.$('#kbdMoreBtn');
    if (more) more.addEventListener('click', function () {
      var list = C.$('#kbdAllList');
      if (list && !list.childNodes.length) {
        list.innerHTML = SHORTCUTS.map(function (r) {
          return '<div class="kbd-all-row"><div class="k">' +
            r[0].map(function (k) { return '<kbd>' + C.esc(k) + '</kbd>'; }).join('') +
            '</div><div class="d">' + C.esc(r[1]) + '</div></div>';
        }).join('');
      }
      var m = C.$('#shortcutModal'); if (m) m.classList.add('show');
    });
    var kc = C.$('#kbdCloseBtn');
    if (kc) kc.addEventListener('click', function () { var m = C.$('#shortcutModal'); if (m) m.classList.remove('show'); });
    // 所有 .ed-modal 点遮罩关闭
    D.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('ed-modal')) e.target.classList.remove('show');
    });

    // 主题切换
    var tt = C.$('#wbThemeToggle');
    if (tt) tt.addEventListener('click', function () {
      var cur = D.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = cur === 'light' ? 'dark' : 'light';
      D.documentElement.setAttribute('data-theme', next);
      tt.textContent = next === 'light' ? '🌓' : '🌑';
      try { localStorage.setItem('lanyue_wb_theme', next); } catch (e) {}
    });

    // 键盘
    D.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var k = e.key;
      if (e.altKey && k === 'ArrowUp') { e.preventDefault(); stepProto(-1); return; }
      if (e.altKey && k === 'ArrowDown') { e.preventDefault(); stepProto(1); return; }
      if (k === '[') { var l1 = C.$('.layout'); setCollapsed('left', !(l1 && l1.classList.contains('collapse-left'))); return; }
      if (k === ']') { var l2 = C.$('.layout'); setCollapsed('right', !(l2 && l2.classList.contains('collapse-right'))); return; }
      if (k === '\\') { var p = C.$('#panelToggle'); if (p) p.click(); return; }
      if (k === 'Escape') { var m2 = D.querySelector('.ed-modal.show'); if (m2) m2.classList.remove('show'); }
    });

    // 品牌信息（来自内联 nav）
    if (G.WBData && G.WBData.nav) {
      try {
        var nav = G.WBData.nav();
        if (nav && nav.brand) {
          var bn = C.$('#brandName'), cn = C.$('#catBrandName');
          if (bn && nav.brand.name) bn.textContent = nav.brand.name;
          if (cn && nav.brand.name) cn.textContent = nav.brand.name;
          var t = nav.brand.name ? D.title.replace(/^[^·]+·/, nav.brand.name + ' ·') : D.title;
          if (nav.brand.name) D.title = t;
        }
      } catch (e) {}
    }

    // 品牌图懒加载
    ['catMarkImg', 'brandMarkImg'].forEach(function (id) {
      var el = C.$('#' + id);
      if (el && G.WBCache && G.WBCache.lazy) G.WBCache.lazy.lazyImage(el);
      else if (el && el.getAttribute('data-src')) el.src = el.getAttribute('data-src');
    });
  }

  /* ---------- 启动 ---------- */
  function start() {
    // 主题
    try {
      var th = localStorage.getItem('lanyue_wb_theme');
      if (th) D.documentElement.setAttribute('data-theme', th);
      var tt = C.$('#wbThemeToggle');
      if (tt) tt.textContent = (D.documentElement.getAttribute('data-theme') === 'light') ? '🌓' : '🌑';
    } catch (e) {}

    bindGlobal();

    if (G.WBCache && G.WBCache.init) {
      try {
        G.WBCache.init({ build: (C.build || 'dev'), versionUrl: 'version.json', checkInterval: 300000, sw: 'sw.js' });
      } catch (e) {}
    }

    var ready = function () {
      if (G.WBSidebar) { G.WBSidebar.mount(C.$('#sideList')); }
      if (G.WBStage) G.WBStage.mount();
      if (G.WBPanel) G.WBPanel.mount(C.$('#prdBody'));

      // 右栏标注点击 → 舞台高亮
      if (G.WBPanel && G.WBPanel.on) {
        G.WBPanel.on(function (ev) {
          if (ev && ev.type === 'hotspot' && G.WBStage && G.WBStage.focusHotspot) G.WBStage.focusHotspot(ev.id);
        });
      }
      // 管理模式
      if (G.WBEditor && G.WBEditor.mount) { try { G.WBEditor.mount(); } catch (e) {} }

      // 导航/内容变化 → 重渲染
      C.on('nav:changed', function () { if (G.WBSidebar) G.WBSidebar.render(); });
      C.on('proto:changed', function (p) {
        if (G.WBPanel) G.WBPanel.render(p);
        if (G.WBSidebar) G.WBSidebar.render();
        if (G.WBStage && p && p.id === State.id) G.WBStage.show(p);
      });

      G.addEventListener('hashchange', function () { apply(parseHash()); });
      var r = parseHash();
      if (r.view === 'catalog' && !G.location.hash) {
        var list = G.WBData && G.WBData.mounted ? G.WBData.mounted() : [];
        r = list.length ? { view: 'proto', id: list[0].id, page: 0 } : { view: 'catalog' };
      }
      apply(r);
    };

    if (G.WBData && G.WBData.load) {
      G.WBData.load().then(ready).catch(function (e) { console.error(e); ready(); });
    } else {
      ready();
    }
  }

  if (D.readyState !== 'loading') start();
  else D.addEventListener('DOMContentLoaded', start);
})();
