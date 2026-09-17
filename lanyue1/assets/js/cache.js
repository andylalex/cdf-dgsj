/* =============================================================================
 * assets/js/cache.js · window.WBCache —— 缓存治理 + 懒加载
 * -----------------------------------------------------------------------------
 * 加载顺序：core → cache → data → sidebar → stage → panel → app
 *
 * 【依赖的全局】window.WBCore（缺失时内置最小兜底，绝不崩）
 *              navigator.serviceWorker / window.caches / IntersectionObserver（均可选能力）
 * 【提供的全局】window.WBCache
 * 【依赖的 DOM】 #wbUpdateBar     更新提示条（带 hidden，发现新版本时移除 hidden）
 *               #wbUpdateText    文案容器
 *               #wbUpdateReload  立即刷新按钮 → forceReload()
 *               #wbUpdateLater   稍后按钮     → dismiss()
 * 【依赖的文件】version.json（构建号唯一真相）、sw.js（Service Worker）
 * 【契约】数据文件说明书.md §8 缓存治理协议、§9 性能要求、§11 发布顺序
 *
 * 三条不可动摇的原则：
 *   1. 版本用【数值】比较（20260916.10 > 20260916.2）；本地领先（回滚/发布中间态）不报更新。
 *   2. 【绝不自动刷新】——只弹提示条，交给用户决定，避免打断评审。
 *   3. file:// 下不注册 SW、不做网络自检；所有 fetch 一律 try/catch 静默降级。
 * ========================================================================== */
(function (global) {
  'use strict';

  var doc = global.document;

  /* core 缺席时的最小兜底（避免 cache.js 早于 core.js 加载时崩掉） */
  var FALLBACK = { build: 'dev' };
  function core() {
    try { return global.WBCore || FALLBACK; } catch (e) { return FALLBACK; }
  }
  function emit(evt, data) {
    try { var c = core(); if (c && typeof c.emit === 'function') c.emit(evt, data); } catch (e) {}
  }

  /* -------------------------------------------------------------- 内部状态 */
  var state = {
    inited: false,
    // 初值直接继承 core.build：core.v() 会委托到 assetUrl，
    // 若这里是 'dev'，init 之前发出的资源 URL 就会拼成 ?v=dev
    build: (global.WBCore && global.WBCore.build) || 'dev',
    versionUrl: 'version.json',
    swUrl: 'sw.js',
    interval: 300000,          // 5 分钟
    timer: 0,
    hidden: false,
    checking: null,            // 进行中的 check() Promise，去并发
    announced: '',             // 已提示过的远端 build，避免重复弹条
    pending: '',               // 已发现但用户点了「稍后」的 build
    reloading: false,
    listeners: []
  };

  /* ------------------------------------------------------ 版本号数值比较 */
  // "YYYYMMDD.NN" → 数值；非法值（如 'dev'）返回 null，表示“不可判定”
  function parseBuild(b) {
    if (!b) return null;
    var m = String(b).trim().match(/^(\d{1,8})(?:[.\-](\d{1,5}))?$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 100000 + (m[2] ? parseInt(m[2], 10) : 0);
  }
  // 返回：1 远端更新 / 0 相同或不可判定 / -1 本地领先
  function compareBuild(remote, local) {
    var r = parseBuild(remote), l = parseBuild(local);
    if (r === null || l === null) return 0;   // 无法判定 → 一律不报更新
    if (r > l) return 1;
    if (r < l) return -1;
    return 0;
  }

  /* ------------------------------------------------------------ assetUrl */
  // 与 WBCore.v() 同规则；core.js 的 v() 在 WBCache 就绪后委托到这里（互不递归）
  function assetUrl(path) {
    if (!path) return '';
    try {
      var s = String(path);
      if (!s) return '';
      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(s)) return s;   // 绝对 URL
      if (/^(?:data:|blob:|about:|#)/i.test(s)) return s;      // 内联资源
      if (/[?&]v=/.test(s)) return s;                          // 已拼过版本
      var build = state.build || core().build || 'dev';
      var hash = '', at = s.indexOf('#');
      if (at >= 0) { hash = s.slice(at); s = s.slice(0, at); }
      return s + (s.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(build) + hash;
    } catch (e) { return String(path); }
  }

  /* ------------------------------------------------------------- 网络自检 */
  function joinParam(url, key, val) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + key + '=' + val;
  }
  function isOffline() {
    try { return global.location.protocol === 'file:'; } catch (e) { return true; }
  }

  function doCheck() {
    return new Promise(function (resolve) {
      if (isOffline() || typeof global.fetch !== 'function') {
        resolve({ hasUpdate: false, remote: null, local: state.build, ok: false });
        return;
      }
      var url = joinParam(assetUrl(state.versionUrl), 't', Date.now());
      try {
        global.fetch(url, { cache: 'no-store', credentials: 'same-origin' })
          .then(function (res) {
            if (!res || !res.ok) throw new Error('http ' + (res && res.status));
            return res.json();
          })
          .then(function (json) {
            var remote = json && json.build ? String(json.build) : '';
            if (!remote) {
              resolve({ hasUpdate: false, remote: null, local: state.build, ok: false });
              return;
            }
            var cmp = compareBuild(remote, state.build);
            var ret = { hasUpdate: cmp === 1, remote: remote, local: state.build, ok: true };
            if (cmp === 1) publish(remote);
            else if (cmp === -1) {           // 本地领先：回滚 / 发布中间态，静默
              state.announced = '';
            }
            resolve(ret);
          })
          .catch(function () {
            resolve({ hasUpdate: false, remote: null, local: state.build, ok: false });
          });
      } catch (e) {
        resolve({ hasUpdate: false, remote: null, local: state.build, ok: false });
      }
    });
  }

  function check() {
    if (state.checking) return state.checking;
    state.checking = doCheck().then(function (r) {
      state.checking = null;
      return r;
    }, function (e) {
      state.checking = null;
      return { hasUpdate: false, remote: null, local: state.build, ok: false };
    });
    return state.checking;
  }

  /* --------------------------------------------------------- 更新提示条 */
  function bar() {
    if (!doc) return null;
    return doc.getElementById('wbUpdateBar');
  }

  function publish(remote) {
    state.pending = remote;
    emit('data:stale', { build: remote, local: state.build });
    state.listeners.slice().forEach(function (cb) {
      try { cb({ build: remote, local: state.build }); } catch (e) {}
    });
    if (state.announced === remote) return;   // 同一版本只弹一次
    state.announced = remote;
    var el = bar();
    if (!el) return;
    try {
      var txt = doc.getElementById('wbUpdateText');
      if (txt) txt.textContent = '发现新版本 ' + remote + '（当前 ' + state.build + '），建议刷新后继续评审';
      el.removeAttribute('hidden');
    } catch (e) {}
  }

  function dismiss() {
    var el = bar();
    if (!el) return;
    try { el.setAttribute('hidden', ''); } catch (e) {}
  }

  function bindBar() {
    if (!doc || !doc.getElementById) return;
    var reload = doc.getElementById('wbUpdateReload');
    var later = doc.getElementById('wbUpdateLater');
    if (reload && !reload.__wbBound) {
      reload.__wbBound = 1;
      reload.addEventListener('click', function (e) { e.preventDefault(); forceReload(); });
    }
    if (later && !later.__wbBound) {
      later.__wbBound = 1;
      later.addEventListener('click', function (e) { e.preventDefault(); dismiss(); });
    }
  }

  /* -------------------------------------------------------- forceReload */
  // 四层兜底：① 清 CacheStorage ② SW skipWaiting ③ location.reload(true)
  //          ④ 800ms 后仍未跳走 → location.replace(pathname?_wb=ts + hash)（保留 hash，子页状态不丢）
  function clearCaches() {
    try {
      if (!('caches' in global) || !global.caches || !global.caches.keys) return Promise.resolve(false);
      return global.caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return global.caches.delete(k); }));
      }).then(function () { return true; }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  function pokeSW() {
    try {
      if (!('serviceWorker' in global.navigator)) return;
      var msg = { type: 'WB_SKIP_WAITING' };
      var send = function (target) { try { target && target.postMessage(msg); } catch (e) {} };
      if (global.navigator.serviceWorker.controller) {
        send(global.navigator.serviceWorker.controller);
        return;
      }
      global.navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) return;
        send(reg.waiting || reg.installing || reg.active);
        try { reg.update(); } catch (e) {}
      }, function () {});
    } catch (e) {}
  }

  function forceReload() {
    if (state.reloading) return;
    state.reloading = true;
    // ① CacheStorage 全清（含本次已知的 SW 缓存）
    clearCaches();
    // ② 让等待中的 SW 立即接管
    pokeSW();
    // ③ 强制刷新（reload(true) 在部分内核已忽略参数，异常时退回无参）
    try { global.location.reload(true); }
    catch (e) { try { global.location.reload(); } catch (e2) {} }
    // ④ 800ms 兜底：保留 hash，`_wb` 时间戳绕开一切中间缓存
    setTimeout(function () {
      try {
        var next = global.location.pathname + '?_wb=' + Date.now() + (global.location.hash || '');
        global.location.replace(next);
      } catch (e) {
        try { global.location.href = global.location.href; } catch (e2) {}
      }
    }, 800);
  }

  /* ------------------------------------------------------ Service Worker */
  function registerSW() {
    try {
      if (isOffline()) return;
      if (!global.navigator || !('serviceWorker' in global.navigator)) return;
      if (!/(?:https?:)/.test((global.location && global.location.protocol) || '')) return;
      global.navigator.serviceWorker
        .register(state.swUrl, { scope: './', updateViaCache: 'none' })
        .then(function (reg) {
          try { reg.update(); } catch (e) {}
        })
        .catch(function () { /* 注册失败静默：不影响主流程 */ });
    } catch (e) {}
  }

  /* ------------------------------------------------------- 轮询与可见性 */
  function startTimer() {
    stopTimer();
    if (isOffline() || !state.interval) return;
    state.timer = setInterval(function () {
      if (!state.hidden) check();
    }, state.interval);
  }
  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = 0; }
  }
  function bindVisibility() {
    if (!doc) return;
    doc.addEventListener('visibilitychange', function () {
      try {
        state.hidden = !!doc.hidden;
        if (state.hidden) stopTimer();          // 切后台：暂停轮询
        else { startTimer(); check(); }         // 切回来：立即查一次
      } catch (e) {}
    });
  }

  /* --------------------------------------------------------------- 懒加载 */
  /* 全局共用一个 IntersectionObserver（图片 + 延迟渲染），避免逐元素建观察器 */
  var io = null, pendingMap = null;

  function observer() {
    if (io) return io;
    var MAP = global.WeakMap || null;
    pendingMap = MAP ? new MAP() : null;
    if (!('IntersectionObserver' in global) || !pendingMap) return null;
    io = new global.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runPending(en.target);
      });
    }, { rootMargin: '240px 0px', threshold: 0.01 });
    return io;
  }

  function runPending(el) {
    var cb = pendingMap && pendingMap.get ? pendingMap.get(el) : null;
    if (io) { try { io.unobserve(el); } catch (e) {} }
    if (pendingMap && pendingMap.delete) pendingMap.delete(el);
    if (typeof cb === 'function') { try { cb(el); } catch (e) {} }
  }

  function observeOnce(el, cb) {
    var ob = observer();
    if (!ob) { setTimeout(function () { try { cb(el); } catch (e) {} }, 0); return; }
    if (pendingMap.has(el)) return;               // 去重
    pendingMap.set(el, cb);
    try { ob.observe(el); } catch (e) { runPending(el); }
  }

  function lazyImage(el) {
    if (!el || el.__wbLazy) return;
    el.__wbLazy = 1;
    var src = el.getAttribute && el.getAttribute('data-src');
    if (!src) return;
    observeOnce(el, function (target) {
      try { target.src = assetUrl(src); } catch (e) { target.src = src; }
    });
  }

  function lazyRender(el, cb) {
    if (!el || typeof cb !== 'function') return;
    observeOnce(el, cb);
  }

  var scripts = Object.create(null);
  function lazyScript(src) {
    if (!src) return Promise.reject(new Error('WBCache.lazy.lazyScript: src 为空'));
    var key = assetUrl(src);
    if (scripts[key]) return scripts[key];        // 同 src 复用
    var p = new Promise(function (resolve, reject) {
      try {
        var s = doc.createElement('script');
        s.src = key;
        s.async = true;
        s.onload = function () { resolve(true); };
        s.onerror = function () { delete scripts[key]; reject(new Error('脚本加载失败: ' + key)); };
        (doc.head || doc.documentElement).appendChild(s);
      } catch (e) { delete scripts[key]; reject(e); }
    });
    scripts[key] = p;
    return p;
  }

  /* ----------------------------------------------------------------- init */
  function init(opts) {
    opts = opts || {};
    if (state.inited) return Cache;
    state.inited = true;

    state.build = opts.build || core().build || 'dev';
    if (opts.versionUrl) state.versionUrl = opts.versionUrl;
    if (opts.sw) state.swUrl = opts.sw;
    if (typeof opts.checkInterval === 'number') state.interval = opts.checkInterval;

    bindBar();
    bindVisibility();

    if (isOffline()) {
      // file:// —— 不注册 SW、不轮询、不自检，全部静默（§8.8）
      return Cache;
    }

    registerSW();
    startTimer();
    // 首屏让路：晚一点再自检，不与渲染抢带宽
    setTimeout(function () { if (!state.hidden) check(); }, opts.delay || 1500);

    return Cache;
  }

  function onUpdate(cb) {
    if (typeof cb !== 'function') return function () {};
    state.listeners.push(cb);
    return function () {
      var i = state.listeners.indexOf(cb);
      if (i >= 0) state.listeners.splice(i, 1);
    };
  }

  /* ------------------------------------------------------------------ API */
  var Cache = {
    init: init,
    check: check,
    forceReload: forceReload,
    assetUrl: assetUrl,
    onUpdate: onUpdate,
    dismiss: dismiss,
    get build() { return state.build; },
    get pending() { return state.pending; },
    lazy: {
      lazyScript: lazyScript,
      lazyImage: lazyImage,
      lazyRender: lazyRender
    }
  };

  global.WBCache = Cache;

  // 兼容已经先取过 WBCore.v 的场景：cache 就绪后无需重新调用
  try { if (global.WBCore && !global.WBCore.build) global.WBCore.build = state.build; } catch (e) {}
})(window);
