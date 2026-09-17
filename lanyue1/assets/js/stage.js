/* ============================================================
   中间舞台 · WBStage
   原型预览（page / pages / images）· 设备切换 · 二级导航
   热点标注 · 聚光灯走查
   依赖：WBCore / WBData / WBCache —— 任一缺失均静默降级
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. 依赖与降级
     ------------------------------------------------------------ */
  var C = window.WBCore || {};

  function esc(s) {
    if (C && typeof C.esc === 'function') { try { return C.esc(s); } catch (e) {} }
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function v(url) {
    if (!url) return '';
    if (C && typeof C.v === 'function') { try { return C.v(url); } catch (e) {} }
    return url;
  }
  function toast(msg) {
    if (C && typeof C.toast === 'function') { try { C.toast(msg); } catch (e) {} }
  }
  function emit(name, payload) {
    if (C && typeof C.emit === 'function') { try { C.emit(name, payload); return; } catch (e) {} }
    try { document.dispatchEvent(new CustomEvent('wb:' + name, { detail: payload })); } catch (e) {}
  }
  function debounce(fn, ms) {
    if (C && typeof C.debounce === 'function') { try { return C.debounce(fn, ms); } catch (e) {} }
    var t = null;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms || 120);
    };
  }
  function throttle(fn, ms) {
    if (C && typeof C.throttle === 'function') { try { return C.throttle(fn, ms); } catch (e) {} }
    var last = 0, timer = null;
    return function () {
      var now = Date.now(), a = arguments, self = this;
      var wait = (ms || 100) - (now - last);
      if (wait <= 0) { last = now; fn.apply(self, a); }
      else if (!timer) {
        timer = setTimeout(function () { timer = null; last = Date.now(); fn.apply(self, a); }, wait);
      }
    };
  }
  function lazy() { return (window.WBCache && window.WBCache.lazy) || null; }

  /* ------------------------------------------------------------
     1. 小工具
     ------------------------------------------------------------ */
  function baseName(url) {
    return String(url || '').split(/[?#]/)[0].split('/').pop() || '';
  }
  /* 兼容 0~1 比例（v3 契约）与旧版 0~100 百分比 */
  function ratio(n) {
    n = parseFloat(n);
    if (isNaN(n)) return 0;
    return n > 1 ? n / 100 : n;
  }
  function kindOf(p) {
    if (!p) return 'page';
    var k = p.kind;
    if (k === 'page' || k === 'pages' || k === 'images') return k;
    if (k === 'image') return 'images';                       // 旧版兼容
    var pgs = p.pages || [], imgs = p.images || [];
    if (pgs.length > 1) return 'pages';
    if (imgs.length) return 'images';
    return 'page';
  }
  function pageList(p) {
    var out = [];
    (p && p.pages || []).forEach(function (x) {
      if (x && (x.url || x.src)) out.push({ name: x.name || baseName(x.url || x.src), url: x.url || x.src });
    });
    return out;
  }
  function imgList(p) {
    var out = [];
    (p && p.images || []).forEach(function (x) {
      if (!x) return;
      if (typeof x === 'string') out.push({ name: '', url: x });
      else if (x.url || x.src) out.push({ name: x.name || '', url: x.url || x.src });
    });
    if (!out.length && p && p.image) out.push({ name: '', url: p.image });
    return out;
  }
  function hsList(p) {
    var all = (p && p.hotspots) || [];
    all.forEach(function (h, i) { if (h && h.num == null) h.num = i + 1; });
    return all;
  }
  var TYPE_LABEL = { element: '界面组件', rule: '业务规则', field: '数据字段' };
  function typeLabel(t) { return TYPE_LABEL[t] || '标注'; }

  /* ------------------------------------------------------------
     2. 状态
     ------------------------------------------------------------ */
  var S = {
    proto: null,
    kind: 'page',
    page: 0,
    slide: 0,
    device: 'mobile',
    anno: true,
    openId: null,
    tour: false,
    tourIdx: 0,
    tourFilter: 'all',
    tourList: []
  };
  var _hsRefs = [];          // [{el, rg, h}] 位置重算用
  var _frameScrollBound = false;

  /* ------------------------------------------------------------
     3. 原型展示
     ------------------------------------------------------------ */
  function show(proto) {
    S.proto = proto || null;
    S.kind = kindOf(proto);
    S.page = 0;
    S.slide = 0;
    S.openId = null;
    tourStop();
    closeHsPop();

    var dev = $('device'), f = $('protoFrame'), imgScroll = $('imgScroll'),
        img = $('protoImg'), tabs = $('pageTabs'), bar = $('slideBar'), cap = $('imgCaption');

    if (dev) dev.style.display = '';
    setDevice((proto && proto.device) || 'mobile');

    if (S.kind === 'images') {
      if (f) { f.style.display = 'none'; }
      if (tabs) { tabs.hidden = true; tabs.innerHTML = ''; }
      if (imgScroll) imgScroll.hidden = false;
      if (img) { img.style.display = 'block'; img.hidden = false; }
      if (dev) dev.classList.add('img-mode');
      fitImageStage();
      showSlide(0);
      playTransition((proto && proto.name) || '');
    } else {
      if (dev) dev.classList.remove('img-mode');
      if (dev) dev.style.width = '';
      if (imgScroll) { imgScroll.hidden = true; }
      if (img) { img.style.display = 'none'; }
      if (bar) bar.hidden = true;
      if (cap) cap.hidden = true;
      if (f) f.style.display = '';

      var url = '';
      if (S.kind === 'pages') {
        var pgs = pageList(S.proto);
        renderPageTabs();
        if (pgs.length) {
          var h = parseHash();
          var start = (h && h.id === S.proto.id) ? h.page : 0;   // 刷新恢复子页
          showPage(start, true);
        } else { setFrameSrc(''); setUrlText(''); }
      } else {
        if (tabs) { tabs.hidden = true; tabs.innerHTML = ''; }
        url = (S.proto && (S.proto.url || S.proto.srcdoc)) || '';
        if (S.proto && S.proto.srcdoc && !S.proto.url && f) {
          f.dataset.src = 'srcdoc:' + S.proto.id;
          f.srcdoc = S.proto.srcdoc;
          setUrlText('prototype://' + S.proto.id);
        } else {
          setFrameSrc(url);
          setUrlText(url);
        }
      }
      playTransition((S.proto && S.proto.name) || '');
    }
    renderHotspots();
  }

  function parseHash() {
    var h = String(location.hash || '');
    var m = /#\/p\/([^/]+)(?:\/(\d+))?/.exec(h);
    if (!m) return null;
    return { id: decodeURIComponent(m[1] || ''), page: parseInt(m[2], 10) || 0 };
  }

  function setUrlText(url, extra) {
    var fu = $('frameUrl');
    if (!fu) return;
    var b = baseName(url);
    var txt = b || '—';
    if (extra) txt = extra + (b ? ' · ' + b : '');
    fu.textContent = txt;
    fu.title = url || '';
  }

  /* ------------------------------------------------------------
     4. iframe 装载（about:blank 打底 + data-src 去重 + loading）
     ------------------------------------------------------------ */
  var SPINNER_HTML = '<span class="ld-dot"></span><span class="ld-dot"></span><span class="ld-dot"></span>';
  /* 切页过渡动画已彻底移除（v0.4）：正常切页不再显示 spinner 遮罩，iframe 直接跳转；
     仅加载失败兜底由 showFrameError 接管浅色「重试」UI。 */
  function loading(on) {
    var el = $('stageLoading');
    if (!el) return;
    if (on) {
      // 不再显示加载遮罩 —— 直接跳转，无过渡动画
      return;
    }
    // off：隐藏（含失败重试成功后清掉 error UI）
    if (el.classList.contains('is-error')) { el.classList.remove('is-error'); el.innerHTML = ''; }
    el.hidden = true;
  }
  /* 直载目标页 + 失败自动重试：消除云端偶发 502/超时导致的黑屏。
     同源下 contentDocument 可访问 → 检测浏览器错误页判定失败并重试；
     全失败则显示浅色「加载失败·重试」UI，绝不再卡黑屏。 */
  function setFrameSrc(url, force) {
    var f = $('protoFrame');
    if (!f) { loading(false); return; }
    var src = url ? v(url) : '';
    if (!src) {
      f.dataset.src = '';
      loading(false);
      try { f.removeAttribute('srcdoc'); f.removeAttribute('src'); } catch (e) {}
      return;
    }
    var curAttr = f.getAttribute('src') || '';
    if (!force && f.dataset.src === src && curAttr && curAttr !== 'about:blank') {
      loading(false); return;
    }
    f.dataset.src = src;
    loading(true);
    _loadWithRetry(f, src, 0);
  }
  function _loadWithRetry(f, src, attempt) {
    if (f.dataset.src !== src) return;                 // 已切到别的原型
    try { f.removeAttribute('srcdoc'); f.src = src; } catch (e) {}
    var done = false;
    function settle() {
      if (done || f.dataset.src !== src) return;
      done = true;
      if (isFrameError(f)) {
        if (attempt < 2) { window.setTimeout(function () { _loadWithRetry(f, src, attempt + 1); }, 600); }
        else { showFrameError(f, src); }
      } else {
        loading(false);
        bindFrameScroll(); renderHotspots(); if (S.tour) renderTourStep();
      }
    }
    f.addEventListener('load', settle, { once: true });
    f.addEventListener('error', function () {
      if (done || f.dataset.src !== src) return;
      done = true;
      if (attempt < 2) { window.setTimeout(function () { _loadWithRetry(f, src, attempt + 1); }, 600); }
      else { showFrameError(f, src); }
    }, { once: true });
    window.setTimeout(function () {                     // 兜底：最长 12s 仍无定论按失败处理
      if (done || f.dataset.src !== src) return;
      done = true;
      if (isFrameError(f)) {
        if (attempt < 2) { window.setTimeout(function () { _loadWithRetry(f, src, attempt + 1); }, 600); }
        else { showFrameError(f, src); }
      } else { loading(false); bindFrameScroll(); renderHotspots(); if (S.tour) renderTourStep(); }
    }, 12000);
  }
  /* 同源下可访问 contentDocument：标题含浏览器错误关键字即视为加载失败 */
  function isFrameError(f) {
    try {
      var d = f.contentDocument;
      if (!d || !d.documentElement) return false;        // 跨域不可访问 → 视为成功，不误杀
      var t = (d.title || '').toLowerCase();
      return /无法访问|找不到|404|403|502|503|500|error|not found|can't be reached|refused|connection|err_/i.test(t);
    } catch (e) { return false; }
  }
  function showFrameError(f, src) {
    var el = $('stageLoading');
    if (!el) { loading(false); return; }
    el.classList.add('is-error');
    el.hidden = false;
    el.innerHTML = '<div class="frame-err"><div class="frame-err-t">页面加载失败</div>' +
      '<div class="frame-err-d">云端资源偶发未响应，可点击重试</div>' +
      '<button type="button" class="ed-btn sm frame-retry" id="frameRetry">重新加载</button></div>';
    var btn = $('frameRetry');
    if (btn) btn.onclick = function () {
      var e2 = $('stageLoading');
      if (e2) { e2.classList.remove('is-error'); e2.innerHTML = ''; e2.hidden = true; }
      _loadWithRetry(f, src, 0);          // 静默重试：不再显示 spinner 动画
    };
  }
  function bindFrameScroll() {
    var f = $('protoFrame');
    if (!f) return;
    var upd = updatePositions;
    try {
      var w = f.contentWindow, d = f.contentDocument;
      if (w) w.addEventListener('scroll', upd, true);
      if (d) d.addEventListener('scroll', upd, true);
      _frameScrollBound = true;
    } catch (e) { _frameScrollBound = false; }   // 跨域 / file:// 静默
  }

  /* 切页动画已移除（v0.4 需求）：切页即时切换，不再显示 logo 过渡层 */
  function playTransition(name) { /* no-op */ }

  /* ------------------------------------------------------------
     5. 二级导航（页面切换器）
     ------------------------------------------------------------ */
  function renderPageTabs() {
    var tabs = $('pageTabs');
    if (!tabs) return;
    var pgs = (S.kind === 'pages') ? pageList(S.proto) : [];
    if (S.kind !== 'pages' || pgs.length < 2) {          // 空 / 仅 1 项不显示切换器
      tabs.hidden = true;
      tabs.innerHTML = '';
      return;
    }
    var html = '';
    pgs.forEach(function (pg, i) {
      html += '<button type="button" class="page-tab' + (i === S.page ? ' on' : '') +
        '" data-idx="' + i + '" title="' + esc(pg.url) + '">' + esc(pg.name) + '</button>';
    });
    tabs.innerHTML = html;
    tabs.hidden = false;
  }

  function showPage(idx, silent) {
    if (S.kind !== 'pages') return;
    var pgs = pageList(S.proto);
    if (!pgs.length) return;
    idx = parseInt(idx, 10) || 0;
    if (idx < 0 || idx >= pgs.length) idx = 0;
    S.page = idx;
    closeHsPop();

    var pg = pgs[idx];
    setFrameSrc(pg.url, !!silent);
    setUrlText(pg.url, pg.name);

    var tabs = $('pageTabs');
    if (tabs) {
      var bs = tabs.querySelectorAll('.page-tab');
      for (var i = 0; i < bs.length; i++) {
        bs[i].classList.toggle('on', parseInt(bs[i].dataset.idx, 10) === idx);
      }
    }
    syncHash();
    renderHotspots();
  }

  function syncHash() {
    if (!S.proto || !S.proto.id) return;
    var target = '#/p/' + S.proto.id + '/' + (S.page || 0);
    if (location.hash === target) return;
    try { history.replaceState(null, '', target); } catch (e) { location.hash = target; }
  }

  /* ------------------------------------------------------------
     6. 设备切换
     ------------------------------------------------------------ */
  function setDevice(d) {
    if (d !== 'mobile' && d !== 'tablet' && d !== 'desktop') d = 'mobile';
    S.device = d;
    var dev = $('device');
    if (dev) {
      dev.classList.remove('mobile', 'tablet', 'desktop');
      dev.classList.add(d);
      if (S.kind === 'images') { dev.classList.add('img-mode'); fitImageStage(); }
      else { dev.classList.remove('img-mode'); dev.style.width = ''; }
    }
    var seg = $('deviceSeg');
    if (seg) {
      var bs = seg.querySelectorAll('button[data-device]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].dataset.device === d);
    }
    schedulePositions();
  }

  function fitImageStage() {
    var dev = $('device'), stage = $('stage');
    if (!dev) return;
    var base = S.device === 'desktop' ? 1280 : (S.device === 'tablet' ? 768 : 414);
    var sw = stage ? stage.clientWidth : 0;
    if (!sw) { dev.style.width = ''; return; }
    var avail = sw - 72;                       // 舞台左右 padding 28*2 + 设备边框 16
    if (avail < 320) avail = 320;
    dev.style.width = Math.min(base, avail) + 'px';
  }

  function reload() {
    var f = $('protoFrame');
    if (!f) return;
    var src = f.dataset.src || (S.proto && S.proto.url) || '';
    if (!src) return;
    setFrameSrc(src, true);   // 复用新逻辑（直接加载 + 超时兜底），不再 about:blank 中转
  }

  function open() {
    var f = $('protoFrame');
    var url = (f && f.dataset.src) || (S.proto && S.proto.url) || '';
    if (S.kind === 'images') {
      var imgs = imgList(S.proto);
      if (imgs[S.slide]) url = imgs[S.slide].url;
    }
    if (S.kind === 'pages') {
      var pgs = pageList(S.proto);
      if (pgs[S.page]) url = pgs[S.page].url;
    }
    if (!url) { toast('当前原型没有可打开的页面'); return; }
    try { window.open(v(url), '_blank', 'noopener'); } catch (e) {}
  }

  function setAnno(on) {
    S.anno = !!on;
    var stage = $('stage');
    if (stage) stage.classList.toggle('hidden-annotations', !S.anno);
    var btn = $('annoToggle');
    if (btn) {
      btn.classList.toggle('on', S.anno);
      btn.setAttribute('aria-pressed', S.anno ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------------
     7. 热点标注
     ------------------------------------------------------------ */
  function frameOffset() {
    var f = $('protoFrame');
    if (!f) return { x: 0, y: 0 };
    return { x: f.offsetLeft || 0, y: f.offsetTop || 0 };
  }
  function imgRect() {
    var img = $('protoImg');
    if (!img || !img.offsetWidth) return null;
    var dw = img.clientWidth, dh = img.clientHeight;
    var nw = img.naturalWidth || dw, nh = img.naturalHeight || dh;
    var w, h, left = 0, top = 0;
    if (nw > 0 && nh > 0) {
      if (nw / nh > dw / dh) { w = dw; h = dw / (nw / nh); top = (dh - h) / 2; }
      else { h = dh; w = dh * (nw / nh); left = (dw - w) / 2; }
    } else { w = dw; h = dh; }
    return { left: (img.offsetLeft || 0) + left, top: (img.offsetTop || 0) + top, w: w, h: h };
  }
  /* 返回相对 .device 的像素坐标：{x,y,w,h,found} */
  function posOf(h) {
    var dev = $('device') || { clientWidth: 0, clientHeight: 0 };
    var dw = dev.clientWidth || 0, dh = dev.clientHeight || 0;

    if (S.kind === 'images') {
      var ir = imgRect();
      if (ir) {
        return {
          x: ir.left + ir.w * ratio(h.x), y: ir.top + ir.h * ratio(h.y),
          w: ir.w * ratio(h.w), h: ir.h * ratio(h.h), found: false
        };
      }
      return { x: dw * ratio(h.x), y: dh * ratio(h.y), w: dw * ratio(h.w), h: dh * ratio(h.h), found: false };
    }

    var off = frameOffset();
    if (h.selector) {
      try {
        var f = $('protoFrame');
        var idoc = f && f.contentDocument;
        var el = idoc && idoc.querySelector(h.selector);
        if (el) {
          var r = el.getBoundingClientRect();
          if (r.width > 0 || r.height > 0) {
            var vw = f.clientWidth || dw, vh = f.clientHeight || dh;
            var inView = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
            return { x: r.left + r.width / 2 + off.x, y: r.top + r.height / 2 + off.y, w: r.width, h: r.height, found: true, inView: inView };
          }
        }
      } catch (e) {}
    }
    var px = dw * ratio(h.x) + off.x, py = dh * ratio(h.y) + off.y;
    if (!h.fixed) {
      var st = 0;
      try {
        var fw = $('protoFrame') && $('protoFrame').contentWindow;
        st = fw ? (fw.scrollY || fw.pageYOffset || 0) : 0;
      } catch (e) { st = 0; }
      py -= st;
    }
    return { x: px, y: py, w: dw * ratio(h.w), h: dh * ratio(h.h), found: false, inView: true };
  }
  /* 只在舞台上有可用定位信息时才画引脚（规则 / 字段类通常只落在右栏） */
  function hasPos(h) {
    if (!h) return false;
    if (h.selector) return true;
    return !(h.x == null && h.y == null);
  }

  function renderHotspots() {
    var layer = $('hotspotLayer'), flayer = $('hotspotFixedLayer');
    _hsRefs = [];
    if (layer) layer.innerHTML = '';
    if (flayer) flayer.innerHTML = '';
    var p = S.proto;
    if (!p || (!layer && !flayer)) return;

    hsList(p).forEach(function (h) {
      if (!h || !h.id) return;
      if (h.type !== 'element' && !hasPos(h)) return;
      if (!hasPos(h)) return;

      var pos = posOf(h);
      var el = document.createElement('div');
      el.className = 'hs';
      el.dataset.id = h.id;
      el.dataset.type = h.type || 'element';
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';
      el.innerHTML = '<div class="hs-pin" title="点击查看标注说明"><span class="hs-pin-num">' +
        esc(h.num != null ? h.num : '') + '</span></div>';
      (h.fixed && flayer ? flayer : layer).appendChild(el);

      var rg = null;
      if (pos.w > 0 && pos.h > 0) {
        rg = document.createElement('div');
        rg.className = 'hs-region';
        rg.dataset.id = h.id;
        rg.dataset.type = h.type || 'element';
        rg.style.left = (pos.x - pos.w / 2) + 'px';
        rg.style.top = (pos.y - pos.h / 2) + 'px';
        rg.style.width = pos.w + 'px';
        rg.style.height = pos.h + 'px';
        (h.fixed && flayer ? flayer : layer).appendChild(rg);
      }
      _hsRefs.push({ el: el, rg: rg, h: h });
      if (S.openId === h.id) el.classList.add('sel');
      if (S.tour) {
        var cur = S.tourList[S.tourIdx];
        if (cur && cur.id === h.id && rg) rg.classList.add('show');
      }
    });
  }

  var updatePositions = throttle(function () {
    var dev = $('device');
    if (!dev || !_hsRefs.length) return;
    _hsRefs.forEach(function (ref) {
      try {
        var pos = posOf(ref.h);
        ref.el.style.left = pos.x + 'px';
        ref.el.style.top = pos.y + 'px';
        if (ref.rg) {
          ref.rg.style.left = (pos.x - pos.w / 2) + 'px';
          ref.rg.style.top = (pos.y - pos.h / 2) + 'px';
          ref.rg.style.width = pos.w + 'px';
          ref.rg.style.height = pos.h + 'px';
        }
      } catch (e) {}
    });
    if (S.openId) { positionPop(currentHs(S.openId)); }
    if (S.tour) positionSpot();
  }, 60);

  var schedulePositions = debounce(function () { updatePositions(); }, 120);

  function currentHs(id) {
    var all = hsList(S.proto);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  /* ---- 气泡 ---- */
  function hsBody(h) {
    var s = '<p>' + esc(h.desc || h.title || '').replace(/\n/g, '<br>') + '</p>';
    if (h.field) {
      s += '<dl class="hp-kv">' +
        '<dt>类型</dt><dd>' + esc(h.field.type) + '</dd>' +
        '<dt>必填</dt><dd>' + esc(h.field.required) + '</dd>' +
        '<dt>约束</dt><dd>' + esc(h.field.format) + '</dd>' +
        '<dt>示例</dt><dd>' + esc(h.field.sample) + '</dd></dl>';
    }
    if (h.rule) {
      s += '<div class="hp-rule-block"><b>触发条件</b><span>' + esc(h.rule.trigger) + '</span></div>' +
        '<div class="hp-rule-block"><b>系统行为</b><span>' + esc(h.rule.behavior) + '</span></div>' +
        '<div class="hp-rule-block"><b>异常处理</b><span>' + esc(h.rule.exception) + '</span></div>';
    }
    return s;
  }
  function openHsPop(id) {
    var p = S.proto; if (!p) return;
    var all = hsList(p), idx = -1, h = null;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { idx = i; h = all[i]; break; }
    if (!h) return;
    S.openId = id;

    var nodes = document.querySelectorAll('.hs');
    for (var k = 0; k < nodes.length; k++) nodes[k].classList.toggle('sel', nodes[k].dataset.id === id);
    var rgs = document.querySelectorAll('.hs-region');
    for (var r = 0; r < rgs.length; r++) rgs[r].classList.toggle('show', rgs[r].dataset.id === id);

    var pop = $('hsPop');
    if (!pop) return;
    var code = h.rule && h.rule.code ? h.rule.code : ((h.type === 'field' ? 'FIELD-' : 'UI-') + String(idx + 1));
    pop.innerHTML =
      '<div class="hp-head"><span class="type-chip ' + esc(h.type || 'element') + '">' + esc(typeLabel(h.type)) + '</span>' +
      '<span class="hp-code">' + esc(code) + '</span></div>' +
      '<div class="hp-title">' + esc(h.title || '') + '</div>' +
      '<div class="hp-body">' + hsBody(h) + '</div>' +
      '<div class="hp-foot"><span>标注 ' + (idx + 1) + ' / 共 ' + all.length + ' 个</span>' +
      '<button class="hp-link" data-jump="' + esc(h.id) + '">在右侧 PRD 查看 →</button></div>';
    positionPop(h);
    pop.classList.add('show');
    revealInPanel(h);
    emit('hotspot:click', { id: id, num: h.num });
  }
  /* 舞台 → 右栏：优先 reveal（切 tab + select），否则 setTab + select 组合 */
  function revealInPanel(h) {
    var P = window.WBPanel;
    if (!P || !h || !h.id) return;
    try {
      if (typeof P.reveal === 'function') { P.reveal(h.id); return; }
      if (typeof P.setTab === 'function') P.setTab(h.type || 'element');
      if (typeof P.select === 'function') P.select(h.id);
    } catch (e) {}
  }
  function positionPop(h) {
    var pop = $('hsPop'), dev = $('device');
    if (!pop || !h || !dev) return;
    var pos = posOf(h);
    var W = 300, dw = dev.clientWidth, dh = dev.clientHeight;
    var ax = pos.x, ay = pos.y;
    if (S.kind === 'images') {
      var sc = $('imgScroll');
      if (sc) { ax -= sc.scrollLeft || 0; ay -= sc.scrollTop || 0; }
    }
    var left = ax + 16, top = ay + 14;
    pop.classList.remove('flip');
    if (left + W > dw - 10) left = ax - W - 16;
    if (top + 260 > dh) { top = ay - 260 - 14; pop.classList.add('flip'); }
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function closeHsPop() {
    var pop = $('hsPop');
    if (pop) pop.classList.remove('show');
    S.openId = null;
    var nodes = document.querySelectorAll('.hs.sel');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('sel');
    if (!S.tour) {
      var rgs = document.querySelectorAll('.hs-region.show');
      for (var k = 0; k < rgs.length; k++) rgs[k].classList.remove('show');
    }
  }

  /* ------------------------------------------------------------
     8. 图片稿
     ------------------------------------------------------------ */
  function loadImg(el, url) {
    if (!el || !url) return;
    var src = v(url);
    el.dataset.src = url;                       // data-src 交给懒加载
    try {
      var L = lazy();
      if (L && typeof L.lazyImage === 'function') L.lazyImage(el);
    } catch (e) {}
    /* 兜底：容器隐藏 / 不支持 IO 时 src 不会被赋值，延迟后直接兜上，绝不白屏 */
    window.setTimeout(function () {
      if (el.dataset.src === url && !el.getAttribute('src')) {
        try { el.src = src; } catch (e) {}
      }
    }, 300);
  }
  function showSlide(idx) {
    var imgs = imgList(S.proto);
    if (!imgs.length) return;
    idx = parseInt(idx, 10) || 0;
    if (idx < 0 || idx >= imgs.length) idx = 0;
    S.slide = idx;
    closeHsPop();
    var img = $('protoImg');
    if (img) {
      img.onload = function () { schedulePositions(); };
      loadImg(img, imgs[idx].url);
      img.style.display = 'block';
    }
    var cap = $('imgCaption');
    if (cap) {
      var nm = imgs[idx].name || baseName(imgs[idx].url);
      cap.textContent = imgs.length > 1 ? ((idx + 1) + ' / ' + imgs.length + (nm ? ' · ' + nm : '')) : (nm || '');
      cap.hidden = !nm && imgs.length <= 1;
    }
    setUrlText(imgs[idx].url, (S.proto && S.proto.name) || '');
    renderSlideBar();
    renderHotspots();
  }
  function renderSlideBar() {
    var bar = $('slideBar'), dots = $('slideDots');
    var imgs = imgList(S.proto);
    if (S.kind !== 'images' || imgs.length < 2 || !bar) { if (bar) bar.hidden = true; return; }
    bar.hidden = false;
    if (!dots) return;
    var html = '';
    imgs.forEach(function (im, i) {
      html += '<button type="button" class="slide-dot' + (i === S.slide ? ' on' : '') +
        '" data-idx="' + i + '" title="' + esc((im.name || baseName(im.url)) + ' · ' + (i + 1) + '/' + imgs.length) + '"></button>';
    });
    dots.innerHTML = html;
  }
  function slideGo(d) {
    var imgs = imgList(S.proto);
    if (imgs.length < 2) return;
    showSlide((S.slide + d + imgs.length) % imgs.length);
  }

  /* ------------------------------------------------------------
     9. 走查模式
     ------------------------------------------------------------ */
  function buildTourList() {
    var all = hsList(S.proto);
    return (S.tourFilter === 'element') ? all.filter(function (h) { return h.type === 'element'; }) : all.slice();
  }
  function tourStart() {
    var p = S.proto;
    if (!p) { toast('请先在左侧选择一个原型'); return false; }
    closeHsPop();
    S.tourFilter = S.tourFilter || 'all';
    S.tourList = buildTourList();
    if (!S.tourList.length) { toast('当前原型没有可走查的标注'); return false; }
    S.tour = true;
    S.tourIdx = Math.min(Math.max(S.tourIdx, 0), S.tourList.length - 1);

    var card = $('tourCard'), mask = $('spotMask'), tf = $('tourFilter');
    if (mask) mask.classList.add('on');
    if (card) card.hidden = false;
    if (tf) {
      tf.style.display = '';
      var bs = tf.querySelectorAll('button[data-f]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].dataset.f === S.tourFilter);
    }
    var t0 = $('tourStart');
    if (t0) t0.classList.add('on');
    renderTourStep();
    return true;
  }
  function tourStop() {
    S.tour = false;
    var mask = $('spotMask'), card = $('tourCard'), tf = $('tourFilter'), t0 = $('tourStart');
    if (mask) mask.classList.remove('on');
    if (card) card.hidden = true;
    if (tf) tf.style.display = 'none';
    if (t0) t0.classList.remove('on');
    var rgs = document.querySelectorAll('.hs-region.show');
    for (var i = 0; i < rgs.length; i++) rgs[i].classList.remove('show');
  }
  function tourGo(d) {
    if (!S.tour) return;
    var n = S.tourIdx + d;
    if (n < 0) return;
    if (n >= S.tourList.length) { tourStop(); return; }
    S.tourIdx = n;
    renderTourStep();
  }
  function scrollIntoView(h, pos) {
    if (!h || h.fixed) return;
    try {
      var f = $('protoFrame');
      var idoc = f && f.contentDocument, iwin = f && f.contentWindow;
      if (!idoc || !iwin) return;
      var margin = 84;
      var el = h.selector ? idoc.querySelector(h.selector) : null;
      if (el) {
        var r = el.getBoundingClientRect();
        if (r.top >= margin && r.bottom <= (f.clientHeight || iwin.innerHeight) - margin) return;
        iwin.scrollTo({ top: Math.max(0, (iwin.scrollY || 0) + (r.top + r.bottom) / 2 - (f.clientHeight || iwin.innerHeight) / 2), behavior: 'smooth' });
      } else if (pos) {
        if (pos.y >= margin && pos.y <= (f.clientHeight || 0) - margin) return;
        iwin.scrollTo({ top: Math.max(0, (iwin.scrollY || 0) + pos.y - (f.clientHeight || 0) / 2), behavior: 'smooth' });
      }
      var k = 0;
      (function tick() { updatePositions(); if (++k < 24) requestAnimationFrame(tick); })();
    } catch (e) {}
  }
  function positionSpot() {
    var h = S.tourList[S.tourIdx];
    var hole = $('spotHole');
    if (!h || !hole) return;
    var pos = posOf(h);
    var rx, ry, rw, rh;
    if (pos.w > 0 && pos.h > 0) { rx = pos.x - pos.w / 2; ry = pos.y - pos.h / 2; rw = pos.w; rh = pos.h; }
    else { var s = 74; rx = pos.x - s / 2; ry = pos.y - s / 2; rw = s; rh = s; }
    hole.style.left = rx + 'px';
    hole.style.top = ry + 'px';
    hole.style.width = rw + 'px';
    hole.style.height = rh + 'px';
    return { x: rx, y: ry, w: rw, h: rh };
  }
  function renderTourStep() {
    if (!S.tour) return;
    var h = S.tourList[S.tourIdx];
    if (!h) { tourStop(); return; }
    var p = S.proto;

    var box = positionSpot();
    scrollIntoView(h, posOf(h));

    var chip = $('tourChip'), title = $('tourTitle'), body = $('tourBody'),
        cnt = $('tourCount'), bar = $('tourBar'),
        bPrev = $('tourPrev'), bNext = $('tourNext');

    if (chip) { chip.className = 'type-chip ' + (h.type || 'element'); chip.textContent = typeLabel(h.type); }
    if (title) title.textContent = (S.tourIdx + 1) + '. ' + (h.title || '');
    if (body) body.innerHTML = hsBody(h);
    if (cnt) cnt.textContent = (S.tourIdx + 1) + ' / ' + S.tourList.length;
    if (bar) bar.style.width = ((S.tourIdx + 1) / S.tourList.length * 100) + '%';
    if (bPrev) bPrev.disabled = S.tourIdx === 0;
    if (bNext) bNext.disabled = S.tourIdx === S.tourList.length - 1;

    /* 热点高亮 + 区域框 */
    var nodes = document.querySelectorAll('.hs');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('sel', nodes[i].dataset.id === h.id);
    var rgs = document.querySelectorAll('.hs-region');
    for (var r = 0; r < rgs.length; r++) rgs[r].classList.toggle('show', rgs[r].dataset.id === h.id);

    /* 卡片避让：焦点在下半区时卡片上移 */
    var card = $('tourCard'), dev = $('device');
    if (card && dev && box) {
      if (box.y + box.h > dev.clientHeight * 0.55) { card.style.bottom = 'auto'; card.style.top = '16px'; }
      else { card.style.bottom = '16px'; card.style.top = 'auto'; }
    }
    revealInPanel(h);
    emit('hotspot:click', { id: h.id, num: h.num, tour: true, index: S.tourIdx });
  }

  var Tour = {
    start: function () { return tourStart(); },
    stop: function () { tourStop(); },
    next: function () { tourGo(1); },
    prev: function () { tourGo(-1); },
    isOn: function () { return !!S.tour; }
  };

  /* ------------------------------------------------------------
     10. 挂载（全部事件委托）
     ------------------------------------------------------------ */
  function mount() {
    /* 设备切换 */
    var seg = $('deviceSeg');
    if (seg) seg.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-device]') : null;
      if (b) setDevice(b.dataset.device);
    });
    /* 标注开关 */
    var anno = $('annoToggle');
    if (anno) anno.addEventListener('click', function () {
      setAnno(!anno.classList.contains('on'));
    });
    setAnno(true);
    /* 注：#frameRefresh / #frameOpen 由 app.js 统一绑定，此处不重复绑定，避免双次重载 */

    /* 二级导航（事件委托） */
    var tabs = $('pageTabs');
    if (tabs) tabs.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.page-tab') : null;
      if (b) showPage(parseInt(b.dataset.idx, 10) || 0);
    });

    /* 热点层（事件委托） */
    ['hotspotLayer', 'hotspotFixedLayer'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('click', function (e) {
        var hs = e.target.closest ? e.target.closest('.hs') : null;
        if (!hs) return;
        e.stopPropagation();
        var hid = hs.dataset.id;
        if (S.tour) {
          for (var i = 0; i < S.tourList.length; i++) {
            if (S.tourList[i].id === hid) { S.tourIdx = i; renderTourStep(); return; }
          }
        }
        openHsPop(hid);
      });
    });
    /* 气泡内「在右侧 PRD 查看」 */
    var pop = $('hsPop');
    if (pop) pop.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-jump]') : null;
      if (b) { emit('hotspot:click', { id: b.dataset.jump, jump: true }); }
      e.stopPropagation();
    });
    /* 点空白处关闭气泡 */
    var dev = $('device');
    if (dev) dev.addEventListener('click', function (e) {
      if (e.target.closest && (e.target.closest('.hs') || e.target.closest('.hs-pop'))) return;
      closeHsPop();
    });
    var stage = $('stage');
    if (stage) {
      stage.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.hs')) return;
        closeHsPop();
      });
      stage.addEventListener('scroll', updatePositions, true);
    }
    /* 图片滚动 / 幻灯片 */
    var isc = $('imgScroll');
    if (isc) isc.addEventListener('scroll', updatePositions, { passive: true });
    var sp = $('slidePrev'); if (sp) sp.addEventListener('click', function () { slideGo(-1); });
    var sn = $('slideNext'); if (sn) sn.addEventListener('click', function () { slideGo(1); });
    var sd = $('slideDots');
    if (sd) sd.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.slide-dot') : null;
      if (b) showSlide(parseInt(b.dataset.idx, 10) || 0);
    });

    /* 走查 */
    var ts = $('tourStart');
    if (ts) ts.addEventListener('click', function () { if (S.tour) tourStop(); else tourStart(); });
    var te = $('tourExit'); if (te) te.addEventListener('click', tourStop);
    var td = $('tourDone'); if (td) td.addEventListener('click', tourStop);
    var tp = $('tourPrev'); if (tp) tp.addEventListener('click', function () { tourGo(-1); });
    var tn = $('tourNext'); if (tn) tn.addEventListener('click', function () { tourGo(1); });
    var tf = $('tourFilter');
    if (tf) tf.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-f]') : null;
      if (!b) return;
      S.tourFilter = b.dataset.f;
      var bs = tf.querySelectorAll('button[data-f]');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i] === b);
      S.tourList = buildTourList();
      if (!S.tour) return;
      if (!S.tourList.length) { toast('当前过滤下没有可走查的标注'); renderTourStep(); return; }
      S.tourIdx = Math.min(S.tourIdx, S.tourList.length - 1);
      renderTourStep();
    });

    /* 键盘：走查模式下 ← → 切换，Esc 退出 */
    document.addEventListener('keydown', function (e) {
      if (!S.tour) return;
      var t = e.target || {};
      var tag = t.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'Escape') { e.preventDefault(); tourStop(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); tourGo(-1); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); tourGo(1); return; }
    });

    /* iframe 加载由 setFrameSrc → _loadWithRetry 统一接管（含失败自动重试） */

    /* 视口变化 */
    window.addEventListener('resize', debounce(function () {
      if (S.kind === 'images') fitImageStage();
      updatePositions();
    }, 160));
    window.addEventListener('hashchange', function () {
      if (S.kind !== 'pages' || !S.proto) return;
      var h = parseHash();
      if (h && h.id === S.proto.id && h.page !== S.page) showPage(h.page, true);
    });
  }

  /* ------------------------------------------------------------
     11. 导出
     ------------------------------------------------------------ */
  window.WBStage = {
    mount: mount,
    show: show,
    showPage: function (idx) { showPage(idx); },
    setDevice: setDevice,
    reload: reload,
    open: open,
    setAnno: setAnno,
    tour: Tour,
    renderPageTabs: renderPageTabs,
    /* 附加只读能力，便于 app / editor 编排 */
    renderHotspots: renderHotspots,
    updatePositions: updatePositions,
    closeHsPop: closeHsPop,
    current: function () { return S.proto; },
    pageIndex: function () { return S.page; },
    device: function () { return S.device; },
    /* 右栏标注点击 → 舞台高亮（app.js / WBPanel.on 回调入口） */
    focusHotspot: function (id) {
      if (!id) return;
      if (S.tour) {
        for (var i = 0; i < S.tourList.length; i++) {
          if (S.tourList[i].id === id) { S.tourIdx = i; renderTourStep(); return; }
        }
      }
      var h = currentHs(id);
      /* 舞台上已画引脚 → 滚动到可视区并弹气泡 */
      var nodes = document.querySelectorAll('.hs');
      for (var k = 0; k < nodes.length; k++) {
        if (nodes[k].dataset.id === id) {
          if (h) scrollIntoView(h, posOf(h));
          openHsPop(id);
          return;
        }
      }
      /* 规则 / 字段类未落引脚：滚动 + 让右栏把条目亮出来 */
      if (h) { scrollIntoView(h, posOf(h)); revealInPanel(h); }
      emit('hotspot:click', { id: id, jump: true });
    }
  };
})();
