/* ============================================================
   assets/js/editor.js · 管理模式（仅 admin.html 加载）
   window.WBEditor = { mount, toggle, isOn, openAdd, openEdit, openCats }
   依赖：WBCore（esc/toast/on/emit）、WBData、WBSidebar、WBStage
   所有持久化统一经 WBData.saveNav + WBData.saveProto → serve.py
   ============================================================ */
(function () {
  'use strict';

  var C = window.WBCore || {};
  var esc = C.esc || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  var toast = C.toast || function (m) { window.console && console.log('[WBEditor]', m); };
  function emit(n, p) { try { C.emit && C.emit(n, p); } catch (e) {} }
  function $(s, r) { return (r || document).querySelector(s); }
  function D() { return window.WBData || null; }
  function SB() { return window.WBSidebar || null; }

  var UNCAT = '未分类';
  var LS_KEY = 'lanyue_wb_v2_admin';

  // ---------------- 运行时状态 ----------------
  var on = false;            // 管理模式开关
  var dirty = false;         // 有未保存改动
  var selfEmit = false;      // 抑制自己 emit 触发的 dirty
  var els = {};              // 注入的 DOM
  // 添加页面向导
  var impSrc = 'file';       // file | dir
  var impFile = null;        // File
  var impThumb = null;       // File
  var impThumbUrl = '';
  var dirFiles = [];         // scan 结果
  // 编辑弹窗
  var editId = null, editCopy = null, editTab = 'base', jsonText = '', jsonErr = '';
  // 分类管理
  var catRen = -1, catDel = -1;

  // ---------------- 小工具 ----------------
  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function isImg(n) { return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(String(n || '')); }
  function stripExt(n) { return String(n || '').replace(/\.[a-z0-9]+$/i, ''); }
  function baseName(p) { return String(p || '').split('/').pop(); }
  function arr(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }
  function nav() { var d = D(); return (d && d.nav) ? d.nav() : null; }
  // nav() 若返回副本，用 setNav 回写；没有 setNav 就当它是同一引用（说明书约定）
  function touchNav(n) {
    var d = D();
    if (n && d && d.setNav) { try { d.setNav(n); } catch (e) {} }
    return n;
  }
  function navItem(id) {
    var n = nav(), it = arr(n && n.items);
    for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i];
    return null;
  }
  function slugId(name) {
    var s = String(name || '');
    var a = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    if (!a) {
      a = '';
      for (var i = 0; i < s.length && a.length < 10; i++) if (s.charCodeAt(i) > 127) a += (s.charCodeAt(i) % 36).toString(36);
    }
    return a || ('p' + Date.now().toString(36));
  }
  function newId(name) {
    var d = D();
    var base = 'v04-' + slugId(name), id = base, i = 1;
    // 查重走 proto()：WBData.all() 返回的是数组（不是字典）
    while (d && d.proto && d.proto(id)) id = base + '-' + (++i);
    return id;
  }
  function findComment(root, key) {
    var it = document.createNodeIterator(root || document, NodeFilter.SHOW_COMMENT, null, false);
    var n;
    while ((n = it.nextNode())) if ((n.nodeValue || '').indexOf(key) >= 0) return n;
    return null;
  }
  function show(m) { if (m) m.classList.add('show'); }
  function hide(m) { if (m) m.classList.remove('show'); }
  function setPath(obj, path, val) {
    var ks = String(path).split('.'), o = obj, i;
    for (i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }
  function pcall(fn, arg) {
    // 兼容 saveNav(nav) 与 saveNav() 两种签名
    return Promise.resolve().then(function () { return fn.length ? fn(arg) : fn(); });
  }

  // ---------------- 统一回写 ----------------
  function protoPayload() {
    var d = D() || {};
    var items = {}, list = (d.all ? d.all() : null) || [];
    if (Array.isArray(list)) {
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].id) items[list[i].id] = list[i];
    } else {
      items = list;
    }
    return { v: 3, generated: today(), items: items, models: (d.models ? d.models() : {}) || {} };
  }
  function saveAll(silent) {
    var d = D();
    if (!d) { toast('数据模块未就绪'); return Promise.resolve(false); }
    var jobs = [];
    if (d.saveNav) jobs.push(pcall(d.saveNav, nav()));
    if (d.saveProto) jobs.push(pcall(d.saveProto, protoPayload()));
    if (!jobs.length) { toast('无可用的保存通道（需启动 serve.py）'); return Promise.resolve(false); }
    return Promise.all(jobs).then(function (rs) {
      // data.js 失败时 resolve(false) 而非 reject，所以要逐个判；失败原因它自己会 toast，这里不重复提示
      var ok = rs.every(function (r) { return r !== false; });
      if (ok) {
        markDirty(false);
        if (!silent) toast('已保存：data/wb-nav.js / data/prototypes.js');
      } else {
        refreshDirty();
      }
      return ok;
    }).catch(function (e) {
      // 只有 WBData 抛异常（或没有失败提示）时才补一条，避免与 data.js 的失败 toast 重复
      if (!(D() && D().saveNav)) toast('保存失败：' + ((e && e.message) || e || '未知错误'));
      refreshDirty();
      return false;
    });
  }
  // 以数据层 dirty() 为准（saveNav/saveProto 成功后它会变 false），避免刚保存完还亮着
  function refreshDirty() {
    var d = D();
    if (d && d.dirty) markDirty(!!d.dirty());
    else markDirty(dirty);
  }
  function markDirty(v) {
    dirty = !!v;
    if (els.saveBtn) {
      els.saveBtn.className = 'ed-btn sm' + (dirty ? ' primary' : '');
      els.saveBtn.textContent = dirty ? '保存全部 ●' : '保存全部';
      els.saveBtn.setAttribute('data-dirty', dirty ? '1' : '0');
    }
  }

  // ============================================================
  // A. 管理模式
  // ============================================================
  function injectTools() {
    var tools = $('.top-tools');
    var c = findComment(document, 'WB-EXTRA-TOOLS');
    var btn = document.createElement('button');
    btn.className = 'tbtn';
    btn.id = 'wbAdminBtn';
    btn.type = 'button';
    btn.title = '管理模式：添加 / 编辑 / 排序原型';
    btn.setAttribute('data-wbe', 'admin');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.1 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-2.77 1.13V21a2 2 0 1 1-4 0v-.09A1.6 1.6 0 0 0 7.4 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 3.5 14a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.07-2.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9.7 3.5a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 2.77 1.07l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 20.5 10a2 2 0 1 1 0 4 1.6 1.6 0 0 0-1.4 1.5z"/></svg>管理';
    (c && c.parentNode ? c.parentNode : (tools || document.body)).insertBefore(btn, c || null);
    els.adminBtn = btn;

    var side = document.createElement('div');
    side.className = 'side-extra';
    side.id = 'wbSideExtra';
    side.hidden = true;
    side.innerHTML =
      '<button type="button" class="ed-btn sm primary" data-wbe="add">＋ 添加页面</button>' +
      '<button type="button" class="ed-btn sm" data-wbe="cats">分类管理</button>' +
      '<button type="button" class="ed-btn sm" data-wbe="saveall">保存全部</button>';
    var sc = findComment(document, 'WB-SIDE-EXTRA');
    var foot = sc && sc.parentNode ? sc.parentNode : $('.side-foot');
    (foot || btn.parentNode).insertBefore(side, sc || null);
    els.sideExtra = side;
    els.saveBtn = $('[data-wbe="saveall"]', side);
  }

  function setAdmin(v) {
    on = !!v;
    document.documentElement.classList.toggle('is-admin', on);
    if (els.adminBtn) els.adminBtn.classList.toggle('on', on);
    if (els.sideExtra) els.sideExtra.hidden = !on;
    var sb = SB();
    if (sb && sb.setManage) { try { sb.setManage(on); } catch (e) {} }
    try { localStorage.setItem(LS_KEY, on ? '1' : ''); } catch (e) {}
    if (on && els.adminBtn) els.adminBtn.title = '退出管理模式';
    toast(on ? '管理模式已开启：可添加 / 编辑 / 排序原型' : '管理模式已关闭');
    return on;
  }

  // ============================================================
  // B. 添加页面向导（#impModal）
  // ============================================================
  function catOptions(sel) {
    var n = nav(), cats = arr(n && n.cats);
    var h = cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    if (cats.indexOf(UNCAT) < 0) h += '<option value="' + esc(UNCAT) + '"' + (UNCAT === sel ? ' selected' : '') + '>' + esc(UNCAT) + '</option>';
    h += '<option value="__new__">＋ 新建分类…</option>';
    return h;
  }
  function dirOptions(cur, only) {
    return dirFiles.filter(function (f) { return !only || f.type === only; }).map(function (f) {
      return '<option value="' + esc(f.path) + '"' + (f.path === cur ? ' selected' : '') + '>' + esc(f.name) + '</option>';
    }).join('');
  }
  function loadScan() {
    var d = D();
    if (!d || !d.scan) return;
    Promise.resolve().then(function () { return d.scan(); }).then(function (r) {
      // 兼容两种返回：数组（data.js 的 {name,url,type}）或 {files:[{name,path,size,type}]}
      var raw = arr(r && r.files).length ? arr(r.files) : arr(r);
      dirFiles = raw.map(function (f) {
        if (typeof f === 'string') return { name: f, path: 'v0.4/' + f, size: 0, type: isImg(f) ? 'image' : 'html' };
        var nm = f.name || baseName(f.path || f.url || '');
        return { name: nm, path: f.path || f.url || ('v0.4/' + nm), size: f.size || 0, type: isImg(nm) ? 'image' : 'html' };
      });
      fillDirSelect();
    }).catch(function () { dirFiles = []; });
  }
  function fillDirSelect() {
    var sel = $('#impDirSelect');
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">— 请选择 —</option>' + dirOptions(cur);
  }
  function setSrc(s) {
    impSrc = s;
    var seg = $('#impSourceSeg');
    if (seg) Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-src') === s);
    });
    var fr = $('#impFileRow'), dr = $('#impDirRow');
    if (fr) fr.style.display = s === 'file' ? '' : 'none';
    if (dr) dr.style.display = s === 'dir' ? '' : 'none';
    var t = $('#impTitle'), sub = $('.ed-sub', $('#impModal'));
    if (t) t.textContent = s === 'dir' ? '从 v0.4 目录添加' : '导入本地 HTML / 图片';
    if (sub) sub.textContent = s === 'dir'
      ? '选择目录内已有文件，统一回写内容层与结构层'
      : '支持 .html/.htm 与图片；HTML 按 v0.4/ 路径登记，图片上传到 assets/brand/';
  }
  function openAdd() {
    impFile = null; impThumb = null; impThumbUrl = '';
    var nm = $('#impName'), fn = $('#impFileName'), tn = $('#impThumbName');
    if (nm) nm.value = '';
    if (fn) fn.textContent = '—';
    if (tn) tn.textContent = '—（可选，图片稿专用）';
    var cat = $('#impCat');
    if (cat) {
      cat.innerHTML = catOptions('');
      cat.value = arr(nav() && nav().cats)[0] || UNCAT;
    }
    var cn = $('#impCatNew');
    if (cn) { cn.style.display = 'none'; cn.value = ''; }
    setSrc('file');
    loadScan();
    show($('#impModal'));
    if (nm) nm.focus();
  }
  function impCatValue() {
    var cat = $('#impCat'), cn = $('#impCatNew');
    var v = cat ? cat.value : '';
    if (v === '__new__') {
      var t = cn ? (cn.value || '').trim() : '';
      if (!t) { toast('请填写新分类名'); return null; }
      return t;
    }
    return v || UNCAT;
  }
  function readAsDataURL(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error('读取失败')); };
      r.readAsDataURL(f);
    });
  }
  function uploadImg(f) {
    var name = f.name.replace(/[^\w.\-一-龥]/g, '_');
    return readAsDataURL(f).then(function (dataUrl) {
      var b64 = String(dataUrl).split(',')[1] || '';
      return fetch('api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, b64: b64 })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.msg) || '上传失败');
        return j.path || ('assets/brand/' + name);
      });
    }).catch(function (e) {
      toast('图片未上传成功（' + ((e && e.message) || e) + '），临时预览仅本次有效');
      try { return URL.createObjectURL(f); } catch (e2) { return ''; }
    });
  }
  function impConfirm() {
    var name = (($('#impName') || {}).value || '').trim();
    var fname = '', furl = '', type = 'html';
    if (impSrc === 'dir') {
      var v = ($('#impDirSelect') || {}).value || '';
      if (!v) { toast('请选择 v0.4 目录里的文件'); return; }
      fname = baseName(v); furl = v; type = isImg(v) ? 'image' : 'html';
    } else {
      if (!impFile) { toast('请先选择文件'); return; }
      fname = impFile.name;
      type = isImg(fname) ? 'image' : 'html';
      furl = 'v0.4/' + fname;
      var hit = dirFiles.filter(function (f) { return f.name === fname; })[0];
      if (hit) furl = hit.path;
    }
    if (!name) name = stripExt(fname);
    if (!name) { toast('请填写名称'); return; }
    var cat = impCatValue();
    if (cat === null) return;
    var d = D();
    if (!d || !d.upsert) { toast('数据模块未就绪'); return; }

    var proto = {
      id: newId(name),
      name: name,
      device: ($('#impDevice') || {}).value || 'mobile',
      status: 'wip',
      version: 'v0.4',
      owner: '',
      updated: today(),
      kind: 'page',
      url: '',
      pages: [],
      images: [],
      overview: { summary: '', path: '', users: '', permission: '', ports: '', goal: '', note: '' },
      flow: [], states: [], exceptions: [], rules: [], api: [], fields: [],
      acceptance: [], note: '', hotspots: []
    };

    function commit() {
      d.upsert(proto);
      var n = nav();
      if (n) {
        if (arr(n.cats).indexOf(cat) < 0) n.cats = arr(n.cats).concat([cat]);
        var max = 0;
        arr(n.items).forEach(function (it) { if (it && typeof it.order === 'number' && it.order > max) max = it.order; });
        n.items = arr(n.items).concat([{ id: proto.id, group: cat, order: max + 1, icon: '', badge: '' }]);
      }
      touchNav(n);
      saveAll(true).then(function (ok) {
        hide($('#impModal'));
        selfEmit = true;
        emit('nav:changed', n);
        selfEmit = false;
        if (window.WBStage && WBStage.show) { try { WBStage.show(proto); } catch (e) {} }
        try { location.hash = '#/p/' + proto.id + '/0'; } catch (e) {}
        toast((ok ? '已添加并保存：' : '已添加（未落盘，需 serve.py）：') + name);
      });
    }

    if (type === 'image') {
      var job = (impSrc === 'file' && impFile) ? uploadImg(impFile) : Promise.resolve(furl);
      job.then(function (u) {
        proto.kind = 'images';
        proto.url = '';
        proto.images = [{ name: name, url: u || furl }];
        if (impThumbUrl) proto.thumb = impThumbUrl;
        commit();
      });
      return;
    }
    if (impThumb && !impThumbUrl) {
      uploadImg(impThumb).then(function (u) { impThumbUrl = u; proto.thumb = u; commit(); });
      return;
    }
    proto.kind = 'page';
    proto.url = furl;
    if (impThumbUrl) proto.thumb = impThumbUrl;
    if (impSrc === 'file' && !dirFiles.filter(function (f) { return f.name === fname; }).length) {
      toast('注意：' + fname + ' 不在 v0.4/ 目录，请把文件拷进去后再预览');
    }
    commit();
  }

  // ============================================================
  // C. 编辑弹窗（#editModal）
  // ============================================================
  function inp(path, val, ph) {
    return '<input data-p="' + esc(path) + '" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph || '') + '">';
  }
  function ta(path, val, ph, rows) {
    return '<textarea data-p="' + esc(path) + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph || '') + '">' + esc(val == null ? '' : val) + '</textarea>';
  }
  function sel(path, val, opts) {
    return '<select data-p="' + esc(path) + '">' + opts.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }
  function row(label, inner) {
    return '<div class="ed-row"><label>' + esc(label) + '</label>' + inner + '</div>';
  }
  function tip(t) { return '<div class="ed-tip">' + esc(t) + '</div>'; }
  function pairRows(list) {
    return '<div class="ed-grid2">' + list.map(function (x) { return row(x[0], x[1]); }).join('') + '</div>';
  }

  function paneBase(p) {
    var n = nav(), cats = arr(n && n.cats);
    if (cats.indexOf(UNCAT) < 0) cats = cats.concat([UNCAT]);
    return pairRows([
      ['名称', inp('name', p.name)],
      ['ID（不可改）', '<div class="imp-file">' + esc(p.id || '') + '</div>'],
      ['设备类型', sel('device', p.device || 'mobile', [['mobile', '手机'], ['desktop', '桌面'], ['tablet', '平板']])],
      ['状态', sel('status', p.status || 'wip', [['wip', '进行中 wip'], ['review', '已评审 review'], ['done', '已完成 done']])],
      ['负责人', inp('owner', p.owner, '产品 · 张三')],
      ['更新时间', inp('updated', p.updated || today(), 'YYYY-MM-DD')],
      ['所属分类（结构层）', sel('__group', p.__group || UNCAT, cats.map(function (c) { return [c, c]; }))],
      ['内容类型', sel('kind', p.kind || 'page', [['page', '单页 page'], ['pages', '多页（二级导航）pages'], ['images', '图片稿 images']])]
    ]) + row('原型地址 url（kind=page 时生效）', inp('url', p.url, 'v0.4/xxx.html')) +
      row('版本', inp('version', p.version || 'v0.4'));
  }

  function panePages(p) {
    var list = arr(p.pages);
    var h = tip('子页 = 页面内的二级导航切换器（左侧竖排按钮）。有 ≥1 项时内容类型自动变为 pages。');
    h += list.map(function (it, i) {
      return '<div class="ed-row"><label>子页 ' + (i + 1) + '</label>' +
        '<div class="ed-grid2">' + inp('pages.' + i + '.name', it.name, '子页名称') + inp('pages.' + i + '.url', it.url, 'v0.4/xxx.html') + '</div>' +
        '<div class="ed-foot">' +
        '<select data-dirpick="' + i + '" style="flex:1"><option value="">从 v0.4 选择…</option>' + dirOptions('', 'html') + '</select>' +
        '<button type="button" class="ed-btn sm" data-wbe="pg-up" data-i="' + i + '" title="上移">↑</button>' +
        '<button type="button" class="ed-btn sm" data-wbe="pg-dn" data-i="' + i + '" title="下移">↓</button>' +
        '<button type="button" class="ed-btn sm danger" data-wbe="pg-del" data-i="' + i + '">删除</button>' +
        '</div></div>';
    }).join('');
    h += '<div class="ed-foot"><button type="button" class="ed-btn sm" data-wbe="pg-add">＋ 添加子页</button><span class="sp"></span>' +
      '<span class="ed-tip">共 ' + list.length + ' 个子页</span></div>';
    return h;
  }

  function paneOverview(p) {
    var o = p.overview || {};
    var keys = [
      ['summary', '一句话概述'], ['path', '用户路径'], ['users', '使用角色'],
      ['permission', '权限'], ['ports', '涉及端口 / 接口'], ['goal', '目标'], ['note', '备注']
    ];
    return tip('多行字段，一行一条会自动解析为列表项。') +
      keys.map(function (k) { return row(k[1], ta('overview.' + k[0], o[k[0]], k[1], k[0] === 'summary' ? 3 : 2)); }).join('');
  }

  function paneFlow(p) {
    var g = function (title, key, a, b) {
      var list = arr(p[key]);
      return '<div class="ed-row"><label>' + esc(title) + '</label>' +
        list.map(function (it, i) {
          return '<div class="ed-grid2" style="margin-bottom:6px">' +
            inp(key + '.' + i + '.' + a, it[a], a === 't' ? '名称' : '状态名') +
            inp(key + '.' + i + '.' + b, it[b], '说明') +
            '</div><div class="ed-foot" style="margin:-4px 0 10px">' +
            '<button type="button" class="ed-btn sm" data-wbe="pg-up" data-k="' + key + '" data-i="' + i + '">↑</button>' +
            '<button type="button" class="ed-btn sm" data-wbe="pg-dn" data-k="' + key + '" data-i="' + i + '">↓</button>' +
            '<button type="button" class="ed-btn sm danger" data-wbe="pg-del" data-k="' + key + '" data-i="' + i + '">删除</button>' +
            '</div>';
        }).join('') +
        '<button type="button" class="ed-btn sm" data-wbe="pg-add" data-k="' + key + '">＋ 添加</button></div>';
    };
    return g('主流程 flow', 'flow', 't', 'd') +
      g('状态 states', 'states', 'n', 'd') +
      g('异常流程 exceptions', 'exceptions', 't', 'd');
  }

  function paneAccept(p) {
    var list = arr(p.acceptance);
    return tip('逐条验收标准，评审时可勾选。') + list.map(function (s, i) {
      return '<div class="ed-row"><label>验收 ' + (i + 1) + '</label><div class="ed-grid2">' +
        ta('acceptance.' + i, s, '验收标准', 2) +
        '<div class="ed-foot"><button type="button" class="ed-btn sm" data-wbe="pg-up" data-k="acceptance" data-i="' + i + '">↑</button>' +
        '<button type="button" class="ed-btn sm" data-wbe="pg-dn" data-k="acceptance" data-i="' + i + '">↓</button>' +
        '<button type="button" class="ed-btn sm danger" data-wbe="pg-del" data-k="acceptance" data-i="' + i + '">删除</button></div>' +
        '</div></div>';
    }).join('') +
      '<div class="ed-foot"><button type="button" class="ed-btn sm" data-wbe="pg-add" data-k="acceptance">＋ 添加验收项</button></div>';
  }

  function paneJson() {
    var txt = jsonText || JSON.stringify(jsonOf(), null, 2);
    jsonText = txt;
    return tip('整体 JSON，可直接粘贴编辑。保存前会做格式校验，解析失败不会保存。') +
      '<div class="ed-row"><textarea data-p="__json" rows="16" style="font-family:var(--mono);font-size:11.5px">' + esc(txt) + '</textarea></div>' +
      (jsonErr ? '<div class="ed-tip" style="color:var(--danger)">' + esc(jsonErr) + '</div>' : '');
  }

  function jsonOf() {
    var c = JSON.parse(JSON.stringify(editCopy || {}));
    delete c.__group;
    return c;
  }
  function renderPane() {
    var pane = $('#editPane');
    if (!pane) return;
    var tabs = $('#editTabs');
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-t') === editTab);
    });
    var p = editCopy || {};
    var h = '';
    if (editTab === 'base') h = paneBase(p);
    else if (editTab === 'pages') h = panePages(p);
    else if (editTab === 'overview') h = paneOverview(p);
    else if (editTab === 'flow') h = paneFlow(p);
    else if (editTab === 'accept') h = paneAccept(p);
    else h = paneJson();
    pane.innerHTML = h;
  }
  function openEdit(id) {
    var d = D();
    if (!d || !d.proto) { toast('数据模块未就绪'); return; }
    var p = d.proto(id);
    if (!p) { toast('未找到原型：' + id); return; }
    editId = id;
    editCopy = JSON.parse(JSON.stringify(p || {}));
    var it = navItem(id);
    editCopy.__group = (it && it.group) || UNCAT;
    editTab = 'base'; jsonText = ''; jsonErr = '';
    var sub = $('#editSub');
    if (sub) sub.textContent = 'id：' + id + ' · ' + (p.name || '') + ' · 改动保存后同步写回 data/prototypes.js 与两个 HTML';
    if (!dirFiles.length) loadScan();
    renderPane();
    show($('#editModal'));
  }
  function editSave() {
    if (!editCopy) return;
    if (editTab === 'json') {
      try {
        var o = JSON.parse(jsonText);
        if (!o || typeof o !== 'object') throw new Error('顶层必须是对象');
        o.id = editId;
        editCopy = o;
        jsonErr = '';
      } catch (e) {
        jsonErr = 'JSON 解析失败：' + e.message;
        renderPane();
        toast('JSON 解析失败，未保存');
        return;
      }
    }
    var g = editCopy.__group;
    delete editCopy.__group;
    editCopy.id = editId;
    if (arr(editCopy.pages).length) editCopy.kind = 'pages';
    if (editCopy.kind === 'pages' && !arr(editCopy.pages).length) editCopy.kind = 'page';
    if (editCopy.kind === 'images' && !arr(editCopy.images).length) editCopy.kind = 'page';
    editCopy.updated = today();

    var d = D();
    if (!d || !d.upsert) { toast('数据模块未就绪'); return; }
    d.upsert(editCopy);
    var n = nav(), it = navItem(editId);
    if (it && g) it.group = g;
    touchNav(n);
    saveAll(true).then(function (ok) {
      hide($('#editModal'));
      selfEmit = true;
      emit('proto:changed', editCopy);   // 右栏监听它刷新
      emit('nav:changed', n);
      selfEmit = false;
      if (window.WBStage && WBStage.show) { try { WBStage.show(editCopy); } catch (e) {} }
      toast((ok ? '已保存：' : '已改到内存（未落盘，需 serve.py）：') + (editCopy.name || editId));
    });
  }
  function editDelete() {
    if (!editId) return;
    var p = (D() && D().proto) ? D().proto(editId) : null;
    if (!window.confirm('确认删除原型「' + ((p && p.name) || editId) + '」？\n会同时从左导航与内容字典移除。')) return;
    if (!window.confirm('再确认一次：删除后不可撤销（旧版本备份在 .workbuddy/backups）。')) return;
    var d = D(), n = nav();
    if (n) n.items = arr(n.items).filter(function (it) { return it && it.id !== editId; });
    touchNav(n);
    if (d && d.remove) { try { d.remove(editId); } catch (e) {} }
    else { var all = d && d.all ? d.all() : null; if (all && !Array.isArray(all)) delete all[editId]; }
    saveAll(true).then(function () {
      hide($('#editModal'));
      editId = null; editCopy = null;
      /* nav:changed 由 WBData.saveNav() 内部统一 emit，此处不再重复触发，避免左导航渲染两遍 */
      try { location.hash = '#/catalog'; } catch (e) {}
      toast('已删除');
    });
  }

  // ============================================================
  // D. 分类管理（#catModal）
  // ============================================================
  function renderCats() {
    var box = $('#catList');
    if (!box) return;
    var n = nav();
    if (!n) { box.innerHTML = '<div class="cat-empty">导航数据未加载</div>'; return; }
    var cats = arr(n.cats);
    if (!cats.length) { box.innerHTML = '<div class="cat-empty">暂无分类，先在下面新增一个</div>'; return; }
    box.innerHTML = cats.map(function (c, i) {
      var cnt = arr(n.items).filter(function (it) { return (it && (it.group || '')) === c; }).length;
      var h = '<div class="cat-row">' +
        '<div class="cat-line"><span class="cat-name">' + esc(c) + '<span class="cat-cnt">' + cnt + ' 个原型</span></span>' +
        '<span class="cat-acts">' +
        '<button type="button" class="cat-btn" data-wbe="cat-up" data-i="' + i + '" title="上移">↑</button>' +
        '<button type="button" class="cat-btn" data-wbe="cat-dn" data-i="' + i + '" title="下移">↓</button>' +
        '<button type="button" class="cat-btn" data-wbe="cat-ren" data-i="' + i + '">重命名</button>' +
        '<button type="button" class="cat-btn danger" data-wbe="cat-del" data-i="' + i + '">删除</button>' +
        '</span></div>';
      if (catRen === i) {
        h += '<div class="cat-rename"><input data-wbe="cat-ren-input" value="' + esc(c) + '">' +
          '<button type="button" class="cat-btn primary" data-wbe="cat-ren-ok" data-i="' + i + '">保存</button>' +
          '<button type="button" class="cat-btn" data-wbe="cat-cancel">取消</button></div>';
      }
      if (catDel === i) {
        var others = cats.filter(function (x, j) { return j !== i; }).concat([UNCAT]);
        var uniq = others.filter(function (x, j) { return others.indexOf(x) === j; });
        h += '<div class="cat-del"><span class="cat-del-tip">删除后原型迁移到：</span>' +
          '<select data-wbe="cat-del-target">' + uniq.map(function (x) {
            return '<option value="' + esc(x) + '"' + (x === UNCAT ? ' selected' : '') + '>' + esc(x) + '</option>';
          }).join('') + '</select>' +
          '<button type="button" class="cat-btn danger" data-wbe="cat-del-ok" data-i="' + i + '">确认删除</button>' +
          '<button type="button" class="cat-btn" data-wbe="cat-cancel">取消</button></div>';
      }
      return h + '</div>';
    }).join('');
  }
  function openCats() {
    if (!nav()) { toast('导航数据未加载'); return; }
    catRen = -1; catDel = -1;
    renderCats();
    show($('#catModal'));
  }
  function catsSave(n) {
    var d = D();
    touchNav(n);
    if (!d || !d.saveNav) { toast('保存通道未就绪（需启动 serve.py）'); return; }
    pcall(d.saveNav, n || nav()).then(function () {
      markDirty(false);
      /* nav:changed 由 WBData.saveNav() 内部统一 emit，此处不再重复触发，避免左导航渲染两遍 */
      toast('分类已保存');
    }).catch(function (e) { toast('保存失败：' + ((e && e.message) || e)); });
  }
  function catAdd() {
    var i = $('#catNewName'), n = nav();
    var v = i ? (i.value || '').trim() : '';
    if (!v) { toast('请输入分类名'); return; }
    if (arr(n.cats).indexOf(v) >= 0) { toast('分类已存在'); return; }
    n.cats = arr(n.cats).concat([v]);
    if (i) i.value = '';
    renderCats();
    catsSave(n);
  }
  function catRenameOk(i) {
    var n = nav(), inp = $('[data-wbe="cat-ren-input"]');
    var v = inp ? (inp.value || '').trim() : '';
    var old = arr(n.cats)[i];
    if (!v || v === old) { catRen = -1; renderCats(); return; }
    if (arr(n.cats).indexOf(v) >= 0) { toast('分类已存在'); return; }
    n.cats[i] = v;
    arr(n.items).forEach(function (it) { if (it && (it.group || '') === old) it.group = v; });
    catRen = -1;
    renderCats();
    catsSave(n);
  }
  function catDelOk(i) {
    var n = nav(), sel = $('[data-wbe="cat-del-target"]');
    var target = sel ? sel.value : UNCAT;
    var old = arr(n.cats)[i];
    n.cats = arr(n.cats).filter(function (_, j) { return j !== i; });
    arr(n.items).forEach(function (it) { if (it && (it.group || '') === old) it.group = target; });
    if (arr(n.cats).indexOf(target) < 0) n.cats = n.cats.concat([target]);
    catDel = -1;
    renderCats();
    catsSave(n);
  }
  function catMove(i, dir) {
    var n = nav(), cats = arr(n.cats), j = i + dir;
    if (j < 0 || j >= cats.length) return;
    var t = cats[i]; cats[i] = cats[j]; cats[j] = t;
    n.cats = cats;
    renderCats();
    catsSave(n);
  }

  // ============================================================
  // 事件绑定（全事件委托）
  // ============================================================
  /** 快捷键：Ctrl/Cmd + E —— 管理模式打开当前选中原型的编辑弹窗 */
  function onShortcut(e) {
    if (!((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E'))) return;
    if (!on) return;                       // 仅在管理模式生效
    if (editId) return;                    // 编辑弹窗已开则不重复弹
    var t = e.target || {};
    var tag = t.tagName || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;  // 输入态不拦截
    e.preventDefault();
    var id = SB() && SB().currentId ? SB().currentId() : null;
    if (!id) { toast('请先在左侧选择一个原型'); return; }
    openEdit(id);
  }

  function bindModalBackdrop() {
    ['#impModal', '#editModal', '#catModal'].forEach(function (sel) {
      var m = $(sel);
      if (!m) return;
      m.addEventListener('click', function (e) { if (e.target === m) hide(m); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      ['#impModal', '#editModal', '#catModal'].forEach(function (s) { hide($(s)); });
    });
  }

  function bindFields() {
    var pane = $('#editPane');
    if (!pane) return;
    function onEvt(e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      var p = el.getAttribute('data-p');
      if (p === '__json') { jsonText = el.value; return; }
      if (p) { setPath(editCopy, p, el.value); jsonText = ''; return; }  // 表单改动后 JSON 重新生成
      var dp = el.getAttribute('data-dirpick');
      if (dp !== null && el.value) {
        var i = parseInt(dp, 10);
        var pg = arr(editCopy && editCopy.pages)[i];
        if (pg) {
          pg.url = el.value;
          if (!pg.name) pg.name = stripExt(baseName(el.value));
        }
        el.value = '';
        renderPane();
      }
    }
    pane.addEventListener('input', onEvt);
    pane.addEventListener('change', onEvt);
  }

  function onPaneAct(t) {
    var act = t.getAttribute('data-wbe'), i = parseInt(t.getAttribute('data-i') || '0', 10);
    var k = t.getAttribute('data-k');
    var p = editCopy;
    if (!p) return;
    function move(a, idx, d) {
      var j = idx + d;
      if (j < 0 || j >= a.length) return;
      var x = a[idx]; a[idx] = a[j]; a[j] = x;
    }
    if (act === 'pg-add') {
      if (!k) { p.pages = arr(p.pages).concat([{ name: '新子页', url: '' }]); p.kind = 'pages'; }
      else if (k === 'acceptance') p.acceptance = arr(p.acceptance).concat(['']);
      else if (k === 'states') p.states = arr(p.states).concat([{ n: '', d: '' }]);
      else p[k] = arr(p[k]).concat([{ t: '', d: '' }]);
    } else if (act === 'pg-del') {
      if (!k) { p.pages = arr(p.pages).filter(function (_, j) { return j !== i; }); if (!p.pages.length) p.kind = 'page'; }
      else if (k === 'acceptance') p.acceptance = arr(p.acceptance).filter(function (_, j) { return j !== i; });
      else p[k] = arr(p[k]).filter(function (_, j) { return j !== i; });
    } else if (act === 'pg-up' || act === 'pg-dn') {
      var d = act === 'pg-up' ? -1 : 1;
      if (!k) move(arr(p.pages), i, d);
      else move(arr(p[k]), i, d);
      if (k && p[k]) p[k] = arr(p[k]);
    }
    renderPane();
  }

  // 下拉联动（change 不走 click 委托，单独处理）
  function onChange(e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'impCat') {                       // 切到「新建分类」时显示输入框
      var cn = $('#impCatNew');
      if (cn) cn.style.display = t.value === '__new__' ? '' : 'none';
      return;
    }
    if (t.id === 'impDirSelect') {                 // 选目录文件 → 自动填名称
      var nm = $('#impName');
      if (nm && !nm.value) nm.value = stripExt(baseName(t.value));
    }
  }

  function onClick(e) {
    var t = e.target;
    while (t && t !== document && !t.getAttribute) t = t.parentNode;
    if (!t || t === document) return;
    var act = t.getAttribute('data-wbe');
    if (!act) return;
    if (act === 'admin') { setAdmin(!on); return; }
    if (act === 'add') { openAdd(); return; }
    if (act === 'cats') { openCats(); return; }
    if (act === 'saveall') { saveAll(false); return; }
    if (act === 'imp-src') { setSrc(t.getAttribute('data-src')); return; }
    if (act === 'imp-pick') { var fi = $('#impFileInput'); if (fi) fi.click(); return; }
    if (act === 'imp-thumb') { var ti = $('#impThumbInput'); if (ti) ti.click(); return; }
    if (act === 'imp-confirm') { impConfirm(); return; }
    if (act === 'imp-cancel') { hide($('#impModal')); return; }
    if (act === 'edit-save') { editSave(); return; }
    if (act === 'edit-cancel') { hide($('#editModal')); return; }
    if (act === 'edit-del') { editDelete(); return; }
    if (act === 'edit-tab') { editTab = t.getAttribute('data-t'); renderPane(); return; }
    if (act === 'cat-add') { catAdd(); return; }
    if (act === 'cat-close') { hide($('#catModal')); return; }
    if (act === 'cat-ren') { catRen = parseInt(t.getAttribute('data-i'), 10); catDel = -1; renderCats(); return; }
    if (act === 'cat-del') { catDel = parseInt(t.getAttribute('data-i'), 10); catRen = -1; renderCats(); return; }
    if (act === 'cat-ren-ok') { catRenameOk(parseInt(t.getAttribute('data-i'), 10)); return; }
    if (act === 'cat-del-ok') { catDelOk(parseInt(t.getAttribute('data-i'), 10)); return; }
    if (act === 'cat-cancel') { catRen = -1; catDel = -1; renderCats(); return; }
    if (act === 'cat-up') { catMove(parseInt(t.getAttribute('data-i'), 10), -1); return; }
    if (act === 'cat-dn') { catMove(parseInt(t.getAttribute('data-i'), 10), 1); return; }
    if (act.indexOf('pg-') === 0) { onPaneAct(t); return; }
  }

  function bindModalButtons() {
    // 把 index.html 里已有的按钮挂上 data-wbe，保持 HTML 不动
    var map = {
      '#impPickBtn': 'imp-pick', '#impThumbBtn': 'imp-thumb',
      '#impConfirm': 'imp-confirm', '#impCancel': 'imp-cancel',
      '#editSave': 'edit-save', '#editCancel': 'edit-cancel', '#editDelete': 'edit-del',
      '#catAdd': 'cat-add', '#catClose': 'cat-close'
    };
    Object.keys(map).forEach(function (sel) {
      var b = $(sel);
      if (b) b.setAttribute('data-wbe', map[sel]);
    });
    var seg = $('#impSourceSeg');
    if (seg) Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('data-wbe', 'imp-src'); });
    var tabs = $('#editTabs');
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) { b.setAttribute('data-wbe', 'edit-tab'); });
  }

  function bindFiles() {
    var fi = $('#impFileInput');
    if (fi) fi.addEventListener('change', function () {
      impFile = fi.files && fi.files[0] || null;
      var fn = $('#impFileName');
      if (fn) fn.textContent = impFile ? impFile.name : '—';
      if (impFile) {
        var nm = $('#impName');
        if (nm && !nm.value) nm.value = stripExt(impFile.name);
      }
    });
    var ti = $('#impThumbInput');
    if (ti) ti.addEventListener('change', function () {
      impThumb = ti.files && ti.files[0] || null;
      var tn = $('#impThumbName');
      if (tn) tn.textContent = impThumb ? impThumb.name : '—（可选，图片稿专用）';
    });
    var rl = $('#impDirReload');
    if (rl) rl.addEventListener('click', function () { loadScan(); fillDirSelect(); });
  }

  // ============================================================
  // 对外接口
  // ============================================================
  var mounted = false;
  var WBEditor = {
    mount: function () {
      if (mounted) return true;   // 幂等：app.js 与本模块自动挂载只会生效一次
      mounted = true;
      injectTools();
      bindModalButtons();
      bindModalBackdrop();
      bindFields();
      bindFiles();
      document.addEventListener('click', onClick);
      document.addEventListener('change', onChange);
      document.addEventListener('keydown', onShortcut);
      if (C.on) {
        // 别人（如左导航拖拽排序）改了结构 → 同步「保存全部」高亮
        C.on('nav:changed', function () { if (!selfEmit) refreshDirty(); });
        C.on('proto:changed', function () { if (!selfEmit) refreshDirty(); });
      }
      try { setInterval(function () { if (on) refreshDirty(); }, 2000); } catch (e) {}
      try {
        var saved = localStorage.getItem(LS_KEY);
        var isAdminPage = /admin\.html/i.test(location.pathname) || /管理模式/.test(document.title || '');
        if (saved === '1' || (saved === null && isAdminPage)) setAdmin(true);
      } catch (e) {}
      return true;
    },
    toggle: function (v) { return setAdmin(v === undefined ? !on : !!v); },
    isOn: function () { return on; },
    openAdd: function () { openAdd(); },
    openEdit: function (id) { openEdit(id || (SB() && SB().currentId ? SB().currentId() : null)); },
    openCats: function () { openCats(); },
    saveAll: function () { return saveAll(false); },
    isDirty: function () { return dirty; }
  };

  window.WBEditor = WBEditor;

  // admin.html 里 editor.js 排在 app.js 之后；若 app.js 没调 mount()，这里兜底自动挂载
  function autoMount() { try { WBEditor.mount(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();
})();
