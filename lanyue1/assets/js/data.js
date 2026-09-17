/* ============================================================
 * 蓝月产品原型工作台 v3 · 数据层
 * assets/js/data.js  →  window.WBData
 * ------------------------------------------------------------
 * 唯一权威源只有两处（见《数据文件说明书》§1/§3/§4）：
 *   ① 结构层：index.html / admin.html 内联 <script id="wb-nav">
 *   ② 内容层：data/prototypes.js 的 window.PROTO_DATA
 * 两者通过 id 单向关联：结构引用内容，内容不得含 group/order。
 * 本模块不渲染任何组件，只负责装载 / 查询 / 持久化。
 * ============================================================ */
(function (window, document) {
  'use strict';

  /* ---------- WBCore 依赖：core 未定义时自带 fallback，保证不崩 ---------- */
  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function core() { try { return window.WBCore || null; } catch (e) { return null; } }

  function fbEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }
  function fbV(url) {
    if (!url) return url;
    var m = document.querySelector && document.querySelector('meta[name="wb-build"]');
    var b = m && m.getAttribute('content');
    if (!b || b === 'BUILD_PLACEHOLDER') return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(b);
  }
  function fbToast(msg) { try { console.log('[WBData] ' + msg); } catch (e) { } }

  function esc(s) { var c = core(); return c && c.esc ? c.esc(s) : fbEsc(s); }
  function v(url) { var c = core(); return c && c.v ? c.v(url) : fbV(url); }
  function emit(name, detail) { var c = core(); if (c && c.emit) { try { c.emit(name, detail); } catch (e) { } } }
  function on(name, fn) { var c = core(); if (c && c.on) { try { c.on(name, fn); } catch (e) { } } }
  function toast(msg, type) {
    var c = core();
    try { if (c && c.toast) { c.toast(msg, type); return; } } catch (e) { }
    fbToast(msg);
  }
  function $(sel) {
    var c = core();
    if (c && c.$) { try { return c.$(sel); } catch (e) { } }
    try { return document.querySelector(sel); } catch (e) { return null; }
  }

  /* ---------- 小工具 ---------- */
  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function isArr(x) { return Array.isArray(x); }
  function str(x, d) { return typeof x === 'string' ? x : (d === undefined ? '' : d); }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function pick(o, k, d) { return isObj(o) ? (o[k] === undefined || o[k] === null ? d : o[k]) : d; }

  /** 去掉下划线开头的运行时派生字段（_mounted/_group/_order/_dangling…），回写时不能污染内容层 */
  function clean(o) {
    if (isArr(o)) { return o.map(clean); }
    if (!isObj(o)) { return o; }
    var out = {};
    for (var k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      if (k.charAt(0) === '_') continue;
      out[k] = clean(o[k]);
    }
    return out;
  }

  /* 结构字段：内容层禁止出现（说明书 §3.1 硬约束 1），回写时统一剔除 */
  var STRUCT_KEYS = { group: 1, order: 1, icon: 1, badge: 1 };

  function cleanContent(o) {
    var c = clean(o);
    if (!isObj(c) || Array.isArray(c)) return c;
    for (var k in STRUCT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(c, k)) delete c[k];
    }
    return c;
  }

  /* ---------- 内部状态 ---------- */
  var NAV_ID = 'wb-nav';
  var CONTENT_URL = 'data/prototypes.js';
  var DEFAULT_GROUP = '未分类';

  var _nav = null;        // 结构（规范后的对象，引用即 nav() 返回值）
  var _items = {};        // 内容字典 id -> 实体原对象
  var _models = {};       // 数据模型字典
  var _dirty = false;
  var _meta = { v: 3, generated: '' };
  var _loaded = false;
  var _loading = null;    // 并发去重：load() 只真正跑一次
  var _listCache = null;  // all() 结果缓存，写操作后置空

  function emptyNav() {
    return { v: 3, brand: { name: '', sub: '' }, cats: [], items: [] };
  }

  /* ============================================================
   * 一、结构层：解析内联 #wb-nav
   * ============================================================ */
  function normItem(raw, i) {
    if (typeof raw === 'string') raw = { id: raw };
    if (!isObj(raw)) return null;
    var id = str(raw.id).trim();
    if (!id) return null;
    return {
      id: id,
      group: str(raw.group).trim() || DEFAULT_GROUP,
      order: num(raw.order, i),
      icon: str(raw.icon),
      badge: str(raw.badge),
      _dangling: false
    };
  }

  function normNav(raw) {
    if (!isObj(raw)) return emptyNav();
    var cats = isArr(raw.cats) ? raw.cats.filter(function (c) { return typeof c === 'string' && c; }) : [];
    var items = isArr(raw.items) ? raw.items : [];
    var out = emptyNav();
    out.v = num(raw.v, 3);
    if (isObj(raw.brand)) {
      out.brand = { name: str(raw.brand.name), sub: str(raw.brand.sub) };
    } else if (typeof raw.brand === 'string') {
      out.brand = { name: raw.brand, sub: '' };
    }
    out.cats = cats;
    out.items = [];
    var seen = {};
    items.forEach(function (it, i) {
      var n = normItem(it, i);
      if (!n) return;
      if (seen[n.id]) return;              // 同 id 重复挂载：只保留第一次
      seen[n.id] = 1;
      out.items.push(n);
    });
    return out;
  }

  function parseInlineNav() {
    var el = null, c = core();
    try {
      if (c && c.$) el = c.$('#' + NAV_ID);
      if (!el) el = document.getElementById(NAV_ID);
    } catch (e) { el = null; }
    if (!el) return emptyNav();
    var txt = '';
    try { txt = el.textContent || el.innerHTML || ''; } catch (e) { txt = ''; }
    txt = String(txt).replace(/^\s+|\s+$/g, '');
    if (!txt) return emptyNav();
    try { return normNav(JSON.parse(txt)); } catch (e) { return emptyNav(); }
  }

  /* ============================================================
   * 二、内容层：加载 data/prototypes.js
   * ============================================================ */
  function injectSrc(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () {
        if (done) return; done = true; reject(new Error('内容文件加载超时'));
      }, 8000);
      s.async = false;
      s.charset = 'utf-8';
      s.src = url;
      s.onload = function () {
        if (done) return; done = true; clearTimeout(timer);
        if (isObj(window.PROTO_DATA)) resolve(true);
        else reject(new Error('PROTO_DATA 未定义'));
      };
      s.onerror = function () {
        if (done) return; done = true; clearTimeout(timer);
        try { s.parentNode && s.parentNode.removeChild(s); } catch (e) { }
        reject(new Error('内容文件加载失败'));
      };
      try { document.head.appendChild(s); } catch (e) { clearTimeout(timer); reject(e); }
    });
  }

  /** fetch 兜底：取回文本后用内联 script 执行（不依赖 eval，file:// 下注入方式仍可用） */
  function injectText(url) {
    return new Promise(function (resolve, reject) {
      if (!window.fetch) { reject(new Error('fetch 不可用')); return; }
      fetch(url, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (txt) {
          if (!txt) throw new Error('内容为空');
          var s = document.createElement('script');
          s.textContent = txt;
          document.head.appendChild(s);
          if (!isObj(window.PROTO_DATA)) throw new Error('PROTO_DATA 未定义');
          resolve(true);
        })
        .catch(function (e) { reject(e); });
    });
  }

  function loadContent(url) {
    if (isObj(window.PROTO_DATA)) return Promise.resolve(true);
    return injectSrc(url).catch(function () { return injectText(url); })
      .catch(function () { return false; });   // 静默降级：内容缺失也不白屏
  }

  /* ============================================================
   * 三、合并：给每个实体打挂载标记
   * ============================================================ */
  function attach() {
    _listCache = null;
    var navIds = {}, i;
    for (i = 0; i < _nav.items.length; i++) navIds[_nav.items[i].id] = true;

    // 结构 → 内容：找不到内容的条目标 _dangling，渲染时跳过
    for (i = 0; i < _nav.items.length; i++) {
      var ni = _nav.items[i];
      ni._dangling = !Object.prototype.hasOwnProperty.call(_items, ni.id);
    }
    // 内容侧：把结构字段挂到实体上（下划线前缀，回写时剔除）
    for (i = 0; i < _nav.items.length; i++) {
      var n = _nav.items[i];
      if (n._dangling) continue;
      var p = _items[n.id];
      p._mounted = true;
      p._group = n.group;
      p._order = n.order;
      p._icon = n.icon;
      p._badge = n.badge;
    }
    for (var id in _items) {
      if (!Object.prototype.hasOwnProperty.call(_items, id)) continue;
      if (navIds[id]) continue;
      _items[id]._mounted = false;
      _items[id]._group = DEFAULT_GROUP;
      _items[id]._order = -1;
    }
  }

  function ensure() { if (!_loaded) { /* 允许未 load 直接查，返回空但不崩 */ } }

  /* ============================================================
   * 四、派生查询
   * ============================================================ */
  function buildList() {
    var out = [], seen = {}, i;
    // ① 已挂载：严格按 nav.items 顺序
    for (i = 0; i < _nav.items.length; i++) {
      var n = _nav.items[i];
      if (n._dangling) continue;
      var p = _items[n.id];
      if (!p) continue;
      seen[p.id] = 1;
      out.push(p);
    }
    // ② 未挂载：追加在末尾
    for (var id in _items) {
      if (!Object.prototype.hasOwnProperty.call(_items, id)) continue;
      if (seen[id]) continue;
      out.push(_items[id]);
    }
    _listCache = out;
    return out;
  }

  function listCache() { return _listCache || buildList(); }

  /* ============================================================
   * 五、网络（统一经 serve.py，见说明书 §7）
   * ============================================================ */
  function postJSON(url, body) {
    try {
      if (!window.fetch) return Promise.reject(new Error('fetch 不可用'));
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (j && j.ok === false) throw new Error(j.msg || j.error || '服务端返回失败');
        return j || { ok: true };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function fail(op, err, tip) {
    emit('data:error', { op: op, message: String((err && err.message) || err) });
    toast(tip + '：' + String((err && err.message) || err), 'error');
    return false;
  }

  /* ============================================================
   * 六、对外 API
   * ============================================================ */
  var WBData = {
    /** 版本/生成时间等信息 */
    meta: function () { return _meta; },

    /**
     * 装载：解析内联 #wb-nav + 加载 data/prototypes.js。
     * 多次调用复用同一个 Promise，不会重复加载。
     * @returns {Promise<Object>} {nav, proto, model, dangling}
     */
    load: function () {
      if (_loading) return _loading;
      _loading = Promise.resolve().then(function () {
        // 结构层优先读外部单一源 data/wb-nav.js（window.WB_NAV）；
        // 缺失时回退内联 #wb-nav，保证兼容性
        _nav = (window.WB_NAV ? normNav(window.WB_NAV) : parseInlineNav());
        return loadContent(v(CONTENT_URL));
      }).then(function (ok) {
        var raw = isObj(window.PROTO_DATA) ? window.PROTO_DATA : {};
        _meta = { v: num(raw.v, 3), generated: str(raw.generated) };
        _items = isObj(raw.items) ? raw.items : {};
        _models = isObj(raw.models) ? raw.models : {};
        // 防御：内容里的 id 必须与键一致
        for (var id in _items) {
          if (!Object.prototype.hasOwnProperty.call(_items, id)) continue;
          var it = _items[id];
          if (!isObj(it)) { delete _items[id]; continue; }
          if (!it.id) it.id = id;
        }
        if (!ok && _nav.items.length) {
          // 内容没加载成功：nav 里全部条目都会被判定为悬空，提示而非白屏
          toast('内容文件加载失败，左侧目录为空', 'error');
        }
        attach();
        _loaded = true;
        return { nav: _nav, proto: Object.keys(_items).length, model: Object.keys(_models).length, dangling: WBData.danglingCount() };
      }).catch(function (e) {
        _nav = _nav || emptyNav();
        _items = _items || {};
        _models = _models || {};
        attach();
        _loaded = true;
        emit('data:error', { op: 'load', message: String(e && e.message || e) });
        return { nav: _nav, proto: 0, model: 0, dangling: 0 };
      });
      return _loading;
    },

    /** 结构对象（引用）：{v, brand:{name,sub}, cats:[], items:[{id,group,order,icon,badge}]} */
    nav: function () { return _nav || (_nav = emptyNav()); },

    /** 内容实体（引用）；不存在返回 null */
    proto: function (id) {
      ensure();
      var p = Object.prototype.hasOwnProperty.call(_items, id) ? _items[id] : null;
      return p || null;
    },

    /** 按 nav 顺序排列的全部实体（未挂载的排在末尾，_mounted:false） */
    all: function () { ensure(); return listCache().slice(); },

    /** 只返回已挂载的实体 */
    mounted: function () { return WBData.all().filter(function (p) { return p._mounted !== false; }); },

    /** 未挂载的实体（管理模式「添加页面」可挂载） */
    unmounted: function () { return WBData.all().filter(function (p) { return p._mounted === false; }); },

    /** 悬空条目数（nav 里有、内容里没有） */
    danglingCount: function () {
      var n = 0;
      for (var i = 0; i < _nav.items.length; i++) if (_nav.items[i]._dangling) n++;
      return n;
    },

    /** 数据模型字典（引用） */
    models: function () { return _models || (_models = {}); },

    /**
     * 某原型关联的数据模型：按 models[].sources 反查
     * @param {string} id 原型 id
     * @returns {Array<{key,name,label,sources,fields}>} 无匹配恒返回 []
     *   fields 元素规整为 {name,type,required,format,sample}
     */
    modelsOf: function (id) {
      var out = [];
      if (!isObj(_models) || typeof id !== 'string' || !id) return out;
      for (var key in _models) {
        if (!Object.prototype.hasOwnProperty.call(_models, key)) continue;
        var m = _models[key];
        if (!isObj(m)) continue;
        var src = isArr(m.sources) ? m.sources : [];
        if (src.indexOf(id) < 0) continue;
        var label = str(m.label, str(m.name, key));
        out.push({
          key: key,
          name: label,
          label: label,
          sources: src,
          fields: (isArr(m.fields) ? m.fields : []).map(function (f) {
            if (!isObj(f)) f = { name: String(f) };
            return {
              name: str(f.name),
              type: str(f.type),
              required: f.required === undefined ? '' : f.required,
              format: str(f.format),
              sample: str(f.sample)
            };
          })
        });
      }
      return out;
    },

    /** [{group, items:[]}]，分组顺序 = nav.cats 顺序，组内按 nav.items 顺序 */
    byGroup: function () {
      ensure();
      var map = {}, order = [];
      var rank = {};
      for (var i = 0; i < _nav.cats.length; i++) rank[_nav.cats[i]] = i;

      _nav.items.forEach(function (n, idx) {
        if (n._dangling) return;
        var p = _items[n.id];
        if (!p) return;
        var g = n.group || DEFAULT_GROUP;
        if (!map[g]) { map[g] = { group: g, items: [] }; order.push(g); }
        map[g].items.push({ proto: p, nav: n, idx: idx });
      });

      order.sort(function (a, b) {
        var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : 1e6;
        var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : 1e6;
        return ra - rb;
      });

      return order.map(function (g) {
        return { group: g, items: map[g].items.map(function (x) { return x.proto; }) };
      });
    },

    /** 保存导航结构 → POST api/save-nav（serve.py 同步写回两个 HTML） */
    saveNav: function (nav) {
      var n = nav || _nav;
      var payload = clean(n);
      return postJSON('api/save-nav', { nav: payload }).then(function () {
        _dirty = false;
        emit('nav:changed', payload);
        return true;
      }).catch(function (e) {
        return fail('save-nav', e, '导航保存失败');
      });
    },

    /** 保存全部内容 → POST api/save-proto（整份 items + models） */
    saveProto: function () {
      var items = {}, models;
      for (var id in _items) {
        if (!Object.prototype.hasOwnProperty.call(_items, id)) continue;
        items[id] = cleanContent(_items[id]);
      }
      models = clean(_models);
      return postJSON('api/save-proto', { items: items, models: models }).then(function () {
        _dirty = false;
        return true;
      }).catch(function (e) {
        return fail('save-proto', e, '内容保存失败');
      });
    },

    /** 局部更新某个实体的内容字段，并标记 dirty（不落盘） */
    updateProto: function (id, patch) {
      var p = WBData.proto(id);
      if (!p) return null;
      if (isObj(patch)) {
        for (var k in patch) {
          if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
          if (k.charAt(0) === '_') continue;
          p[k] = patch[k];
        }
      }
      _dirty = true;
      _listCache = null;
      return p;
    },

    /** 新增或整体替换一个实体（管理模式「添加页面」用）；返回该实体 */
    upsert: function (proto) {
      if (!isObj(proto)) return null;
      var id = str(proto.id).trim();
      if (!id) return null;
      proto.id = id;
      _items[id] = proto;
      _dirty = true;
      attach();
      return proto;
    },

    /** 删除实体（同时从导航摘除）；返回是否命中 */
    remove: function (id) {
      var hit = Object.prototype.hasOwnProperty.call(_items, id);
      if (hit) delete _items[id];
      if (_nav) {
        _nav.items = _nav.items.filter(function (n) { return n.id !== id; });
      }
      if (hit) { _dirty = true; attach(); }
      return hit;
    },

    /** GET api/scan —— 扫描 v0.4 下可添加的文件；失败返回 [] */
    scan: function () {
      try {
        if (!window.fetch) return Promise.resolve([]);
        return fetch('api/scan', { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) {
            var arr = isArr(j) ? j : (j && isArr(j.files) ? j.files : (j && isArr(j.items) ? j.items : []));
            return arr.filter(function (f) {
              return typeof f === 'string' || isObj(f);
            }).map(function (f) {
              if (typeof f === 'string') return { name: f, path: str(pick(j, 'base', 'v0.4/')) + f, url: str(pick(j, 'base', 'v0.4/')) + f, type: 'page' };
              // serve.py 返回 {name, path, size, type}；path 缺失时用 base + name 兜底
              var rel = str(f.path, str(f.url, str(pick(j, 'base', 'v0.4/')) + str(f.name, str(f.file, ''))));
              return {
                name: str(f.name, str(f.file, '')),
                path: rel,
                url: rel,
                size: num(f.size, 0),
                type: str(f.type, 'page')
              };
            });
          })
          .catch(function () { return []; });
      } catch (e) {
        return Promise.resolve([]);
      }
    },

    /** 是否有未保存改动 */
    dirty: function () { return !!_dirty; },

    /** 目录页统计：{proto, anno, module} */
    stats: function () {
      var mountedList = WBData.mounted();
      var anno = 0;
      mountedList.forEach(function (p) {
        anno += isArr(p.hotspots) ? p.hotspots.length : 0;
      });
      var groups = {};
      mountedList.forEach(function (p) { groups[p._group || DEFAULT_GROUP] = 1; });
      return { proto: mountedList.length, anno: anno, module: Object.keys(groups).length };
    },

    /** 工具透出：转义 / 拼版本 / 事件 */
    esc: esc,
    v: v,
    emit: emit,
    on: on,
    toast: toast,
    $: $
  };

  window.WBData = WBData;
})(window, document);
