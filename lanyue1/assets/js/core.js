/* =============================================================================
 * assets/js/core.js · window.WBCore —— 运行时内核（必须最先加载）
 * -----------------------------------------------------------------------------
 * 加载顺序：core → cache → data → sidebar → stage → panel → app（editor 仅 admin）
 *
 * 【依赖的全局】无强制依赖；存在 `window.WBCache` 时 `v()` 委托给 `WBCache.assetUrl`
 * 【提供的全局】window.WBCore
 * 【依赖的 DOM】  #toast                        —— toast() 的容器（加 .show 显示）
 *                 meta[name="wb-build"]        —— build 号首选来源
 *                 window.WB_BUILD              —— build 号备选来源
 * 【约定】localStorage 命名空间：`lanyue_wb_v2_`（清理时白名单保护
 *         `lanyue_wb_v2_` / `wb_acc_` / `lanyue_wb_edit_v1`）
 * 【契约】数据文件说明书.md §5 模块契约、§8 缓存治理协议、§9 性能要求
 * 【铁律】全站动态文本必须经 esc()；全站资源 URL 必须经 v()，禁止裸路径拼串
 * ========================================================================== */
(function (global) {
  'use strict';

  var STORE_PREFIX = 'lanyue_wb_v2_';
  var TOAST_MS = 2000;
  var PLACEHOLDER = /^(BUILD_PLACEHOLDER|WB_BUILD|\{\{.*\}\}|)$/;

  /* ---------------------------------------------------------------- build */
  // 读不到（或仍是占位符）→ 'dev'。'dev' 在版本比较里视为不可判定，永不误报更新。
  function readBuild() {
    var raw = '';
    try {
      if (global.WB_BUILD) raw = String(global.WB_BUILD);
      if (!raw) {
        var meta = document.querySelector('meta[name="wb-build"]');
        if (meta) raw = (meta.getAttribute('content') || '').trim();
      }
    } catch (e) { /* file:// / 无 DOM 兜底 */ }
    if (!raw || PLACEHOLDER.test(raw)) return 'dev';
    return raw;
  }

  /* ------------------------------------------------------------ 环境判断 */
  var protocol = '';
  try { protocol = (global.location && global.location.protocol) || ''; } catch (e) {}

  /* -------------------------------------------------------------- esc() */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  /* ------------------------------------------------------ 选择器快捷方法 */
  function $(sel, root) {
    try { return (root || document).querySelector(sel); } catch (e) { return null; }
  }
  function $$(sel, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(sel) || []);
    } catch (e) { return []; }
  }

  /* ------------------------------------------------------------ 事件总线 */
  var bus = Object.create(null);

  function on(evt, fn) {
    if (!evt || typeof fn !== 'function') return function () {};
    (bus[evt] || (bus[evt] = [])).push(fn);
    return function () { Core.off(evt, fn); };
  }
  function off(evt, fn) {
    var list = bus[evt];
    if (!list) return;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  function emit(evt, data) {
    var list = bus[evt];
    if (!list || !list.length) return false;
    // 复制一份：允许监听器内部增删自己
    list.slice().forEach(function (fn) {
      try { fn(data, evt); } catch (e) {
        if (global.console && console.warn) console.warn('[WBCore] 事件处理异常 ' + evt, e);
      }
    });
    return true;
  }

  /* --------------------------------------------------------- 版本号 v() */
  // 全站唯一拼版入口：行为以此处为准，其它模块禁止自行拼 `?v=`
  function v(url) {
    if (!url) return '';
    try {
      var s = String(url);
      if (!s) return '';
      // 绝对 URL / 协议相对 / 内联资源：原样返回，不动手
      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(s)) return s;
      if (/^(?:data:|blob:|about:|javascript:|mailto:|#)/i.test(s)) return s;
      if (/[?&]v=/.test(s)) return s;              // 已带版本号，不重复拼
      if (global.WBCache && typeof global.WBCache.assetUrl === 'function') {
        return global.WBCache.assetUrl(s);
      }
      return inlineVersion(s);
    } catch (e) { return String(url); }
  }
  // WBCache 缺席时的兜底（与 WBCache.assetUrl 同规则）
  function inlineVersion(s) {
    var build = Core.build;
    if (!build) return s;
    var hash = '';
    var hashAt = s.indexOf('#');
    if (hashAt >= 0) { hash = s.slice(hashAt); s = s.slice(0, hashAt); }
    return s + (s.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(build) + hash;
  }

  /* --------------------------------------------------------- localStorage */
  var store = {
    get: function (k, def) {
      try {
        var raw = global.localStorage.getItem(STORE_PREFIX + k);
        if (raw === null || raw === undefined) return def;
        try { return JSON.parse(raw); } catch (e) { return raw; } // 容忍历史裸字符串
      } catch (e) { return def; }
    },
    set: function (k, val) {
      try {
        global.localStorage.setItem(STORE_PREFIX + k, JSON.stringify(val));
        return true;
      } catch (e) { return false; }   // 隐私模式 / 配额满：静默失败
    },
    del: function (k) {
      try { global.localStorage.removeItem(STORE_PREFIX + k); return true; } catch (e) { return false; }
    }
  };

  /* --------------------------------------------------------------- toast */
  var toastTimer = 0;
  function toast(msg, tone) {
    try {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg === null || msg === undefined ? '' : String(msg);
      if (tone) el.setAttribute('data-tone', String(tone));
      else el.removeAttribute('data-tone');
      el.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastTimer = 0;
        el.classList.remove('show');
      }, TOAST_MS);
    } catch (e) { /* 无 #toast 时静默 */ }
  }

  /* ----------------------------------------------------------------- 杂项 */
  var seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'wb') + '_' + Date.now().toString(36) + seq.toString(36) +
      Math.floor(Math.random() * 1e6).toString(36);
  }

  function debounce(fn, ms) {
    var t = 0;
    return function () {
      var ctx = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = 0; fn.apply(ctx, args); }, ms || 160);
    };
  }
  function throttle(fn, ms) {
    var last = 0, timer = 0, pending = null;
    return function () {
      var now = Date.now(), ctx = this;
      pending = arguments;
      var wait = (ms || 200) - (now - last);
      if (wait <= 0) {
        last = now;
        fn.apply(ctx, pending);
      } else if (!timer) {
        timer = setTimeout(function () {
          timer = 0; last = Date.now();
          fn.apply(ctx, pending);
        }, wait);
      }
    };
  }

  /* ----------------------------------------------------------------- API */
  var Core = {
    build: readBuild(),
    env: protocol === 'file:' ? 'file' : 'http',
    esc: esc,
    $: $,
    $$: $$,
    on: on,
    emit: emit,
    off: off,
    v: v,
    store: store,
    toast: toast,
    uid: uid,
    debounce: debounce,
    throttle: throttle
  };

  global.WBCore = Core;
})(window);
