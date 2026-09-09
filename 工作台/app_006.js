
/* ============================================================
   编辑增强（编辑版专属）
   1) 点选页面元素新增标注   2) 右侧栏说明编辑保存   3) 左侧栏管理模式
   说明：本页是纯静态页，改动先存 localStorage（当前浏览器立即生效）。
   ============================================================ */
(function(){
'use strict';
var ED_KEY='lanyue_wb_edit_v1';
var ED_TAB_KEY='lanyue_wb_edit_tab';
window.ED={manage:false,boxMode:false,editId:null,rect:null,imported:{},cats:[]};
var UNCAT='未分类';

/* ---------- 基础工具 ---------- */
function edToday(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function edUid(p){return (p||'hs')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
/* 标注编号自增长默认值：当前原型内最大数字编号 +1（无编号时回退为总数 +1） */
function edNextNum(p){
  var max=0,any=false;
  if(p&&p.hotspots) p.hotspots.forEach(function(h){ var n=parseInt(h.num,10); if(!isNaN(n)){ any=true; if(n>max)max=n; } });
  return any?(max+1):((p&&p.hotspots)?p.hotspots.length+1:1);
}
function edDownload(name,text,mime){
  try{
    var blob=new Blob([text],{type:mime||'text/plain;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
  }catch(e){ window.alert('导出失败：'+e.message); }
}
function edBlobUrl(html){
  if(!html)return '';
  try{
    var base=new URL('v0.4/',location.href).href;
    var out=html;
    if(/<head[^>]*>/i.test(out)) out=out.replace(/<head([^>]*)>/i,'<head$1><base href="'+base+'">');
    else out='<base href="'+base+'">'+out;
    return URL.createObjectURL(new Blob([out],{type:'text/html;charset=utf-8'}));
  }catch(e){ return ''; }
}

/* ---------- 本地持久化 ---------- */
function edSaveAll(){
  try{
    localStorage.setItem(ED_KEY,JSON.stringify({v:1,protos:PROTOTYPES,imported:window.ED.imported,cats:window.ED.cats}));
    edPersistTab();
    return true;
  }catch(e){ showToast('本地保存失败（可能超出浏览器存储上限）：'+e.message); return false; }
}
/* 把编辑版当前右侧 tab 记到独立键，供普通版同步时切到同一 tab，确保热点说明实时可见 */
function edPersistTab(){
  try{ localStorage.setItem(ED_TAB_KEY, state.tab||'overview'); }catch(e){}
}
function edLoadAll(){
  var s=null;
  try{ s=localStorage.getItem(ED_KEY); }catch(e){ return false; }
  if(!s)return false;
  try{
    var d=JSON.parse(s);
    if(!d||!Array.isArray(d.protos))return false;
    if(d.imported){ window.ED.imported=Object.assign({}, window.ED.imported||{}, d.imported); }
    if(Array.isArray(d.cats)&&d.cats.length) window.ED.cats=d.cats.slice();
    var byId={}; PROTOTYPES.forEach(function(p){ byId[p.id]=p; });
    var reordered=[];
    d.protos.forEach(function(sp){
      var p=byId[sp.id];
      if(!p){
        if(sp.__imported){
          var np={id:sp.id,name:sp.name,group:sp.group,device:sp.device,kind:sp.kind,__imported:true,hotspots:sp.hotspots||[]};
          ['overview','flow','states','note','status'].forEach(function(k){ if(sp[k]!==undefined) np[k]=sp[k]; });
          var it=d.imported&&d.imported[sp.id];
          if(np.kind==='image'){ if(it&&it.image)np.image=it.image; if(it&&it.images)np.images=(it.images||[]).slice(); }
          else { var _c=(it&&it.content||sp.content||''); if(_c) np.url=edBlobUrl(_c); }
          PROTOTYPES.push(np); byId[sp.id]=np; p=np;
        } else { return; }
      }
      if(Array.isArray(sp.hotspots))p.hotspots=sp.hotspots;
      if(sp.overview)p.overview=sp.overview;
      if(sp.flow)p.flow=p.flow;
      if(sp.note!==undefined)p.note=sp.note;
      if(sp.group!==undefined)p.group=sp.group;   /* 恢复分类改动（file:// 下的最终兜底） */
      reordered.push(p);
    });
    /* 按 localStorage 保存的顺序重排（仅当数量一致，避免误删原型） */
    if(reordered.length===PROTOTYPES.length && reordered.length){
      PROTOTYPES.length=0; reordered.forEach(function(p){ PROTOTYPES.push(p); });
    }
    /* 兜底：任何 url 空的无内容原型，回退 V03 真实文件地址，避免空 blob/空 src 白屏 */
    PROTOTYPES.forEach(function(p){
      if(!p.url && !p.srcdoc && !p.image){
        var _v=PROTOTYPES_V03&&PROTOTYPES_V03.find(function(x){return x.id===p.id;});
        if(_v&&_v.url)p.url=_v.url;
      }
    });
    return true;
  }catch(e){ return false; }
}

/* ---------- 导入原型静态化：落盘为 imported-prototypes.js，随 GitHub 推送后新访客可见 ---------- */
function downloadText(filename,text){
  try{
    var blob=new Blob([text],{type:'text/javascript;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{document.body.removeChild(a);}catch(_){} URL.revokeObjectURL(url); },100);
  }catch(e){ showToast('导出失败：'+e.message); }
}
/* 把当前导入的原型（含 HTML content / 图片 dataURL）序列化为 imported-prototypes.js 并下载，
   用户将其保存到 产物/工作台/ 后推送 GitHub，即可让静态托管的新访客看到导入页面（不再只存本地缓存） */
function edBuildNavText(){
  var protos=PROTOTYPES.map(function(p){
    var c={id:p.id,name:p.name,group:p.group,device:p.device,kind:p.kind,__imported:!!p.__imported};
    /* 导出右侧栏编辑字段（PRD 概述/流程/状态/备注），内置与导入原型都带，确保导出不丢 */
    ['overview','flow','states','note','status'].forEach(function(k){ if(p[k]!==undefined) c[k]=p[k]; });
    if(p.__imported)c.hotspots=(p.hotspots||[]).map(function(h){return JSON.parse(JSON.stringify(h));});
    return c;
  });
  var content={};
  PROTOTYPES.forEach(function(p){
    if(!p.__imported)return;
    var it=window.ED.imported&&window.ED.imported[p.id];
    if(p.kind==='image'){ content[p.id]={kind:'image',image:(it&&it.image)||p.image||null,images:(it&&it.images)||p.images||[]}; }
    else { content[p.id]={kind:'html',content:(it&&it.content)||(p.content)||''}; }
  });
  var nav={cats:(window.ED.cats||[]).slice(),protos:protos,content:content};
  return '/* 左导航数据文件（由编辑版自动生成；本地 serve.py 写回 工作台/nav-data.js，index 与编辑版均读取此文件） */\n'
       + 'window.NAV_DATA='+JSON.stringify(nav,null,2)+';\n';
}
/* 自动落盘：任意改动（拖拽/导入/分类/排序/改名/删除）后把最新左导航写回本地 nav-data.js。
   http 环境（经 serve.py 打开）直接写文件；file:// 环境浏览器无法写本地文件，降级弹窗复制。 */
function edSaveNavFile(){ /* 已改为 localStorage 同步，不再经 serve.py 写文件；需固化到 nav-data.js 请用「导出左导航数据」按钮 */ }
function navExportShow(text){ try{ $('navExportText').value=text; $('navExportModal').classList.add('show'); }catch(e){} }
function edExportNavData(){
  try{ navExportShow(edBuildNavText()); }
  catch(e){ showToast('导出左导航数据失败：'+e.message); }
}
function navExportCopy(){
  var t=$('navExportText').value;
  var ok=function(){ showToast('已复制 nav-data.js 全文，请粘贴给我'); };
  var fb=function(){
    try{ var ta=$('navExportText'); ta.removeAttribute('readonly'); ta.select(); ta.setSelectionRange(0,ta.value.length); document.execCommand('copy'); ta.setAttribute('readonly',''); ok(); }
    catch(e){ showToast('复制失败，请手动全选复制'); }
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,fb); } else fb();
}
function navExportHide(){ var m=$('navExportModal'); if(m) m.classList.remove('show'); }
/* ---------- 原型数据导出：把当前内存 PROTOTYPES（内置原型的 srcdoc / 标注 / PRD 等）序列化为 prototypes-data.js ---------- */
function edBuildProtoText(){
  /* 增量导出：仅输出与纯净基准（window.__PROTOTYPES_BASE，数据文件加载时拍快照）有差异的手动编辑字段，
     生成 window.PROTOTYPES_EDITS 段。落盘时只把该段合并进 prototypes-data.js，
     原文件 V04 / PROTOTYPES_V03 / push / DATA_MODELS 结构完全不动，满足「只增加编辑数据、其他保持一致」。 */
  var base={};
  (window.__PROTOTYPES_BASE||[]).forEach(function(o){ if(o&&o.id) base[o.id]=o; });
  var allowed=['overview','flow','states','hotspots','note','status','name','group','device','url','srcdoc'];
  var edits=[];
  PROTOTYPES.forEach(function(p){
    if(p.__imported) return; /* 导入原型数据走 nav-data.js content，不在此文件 */
    var b=base[p.id]||{};
    var rec={id:p.id}, changed=false;
    allowed.forEach(function(k){
      if(JSON.stringify(p[k])!==JSON.stringify(b[k])){ rec[k]=p[k]; changed=true; }
    });
    if(changed) edits.push(rec);
  });
  if(!edits.length) return null;   /* 无编辑（含已改回原值）：返回 null，合并时删除整个 EDIT 块，不留下空块 */
  var json=JSON.stringify(edits,null,2);
  return '/* >>> PROTOTYPES_EDITS_START （编辑版导出：整体替换为最新编辑增量；原文件其余结构保持不变） >>> */\n'
    + 'window.PROTOTYPES_EDITS = '+json+';\n'
    + '/* <<< PROTOTYPES_EDITS_END <<< */\n';
}
function edExportProtoData(){
  try{
    var seg=edBuildProtoText();
    /* 无编辑时仍弹窗，但提示用户无需复制/合并，文件已是纯净版；亦可用「保存到本地」清掉历史编辑块 */
    $('protoExportText').value = seg ? seg
      : '（当前没有手动编辑数据，无需复制/合并；文件已是纯净版，亦可用「保存到本地」清掉历史编辑块）';
    $('protoExportModal').classList.add('show');
  }
  catch(e){ showToast('导出原型数据失败：'+e.message); }
}
function protoExportCopy(){
  var t=$('protoExportText').value;
  var ok=function(){ showToast('已复制编辑增量段（PROTOTYPES_EDITS），请粘贴给我合并到 prototypes-data.js（不要直接覆盖原文件）'); };
  var fb=function(){ try{ var ta=$('protoExportText'); ta.removeAttribute('readonly'); ta.select(); ta.setSelectionRange(0,ta.value.length); document.execCommand('copy'); ta.setAttribute('readonly',''); ok(); }catch(e){ showToast('复制失败，请手动全选复制'); } };
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,fb); } else fb();
}
function protoExportHide(){ var m=$('protoExportModal'); if(m) m.classList.remove('show'); }
/* 纯前端、无后台写本地文件：仅桌面 Chrome/Edge 的 File System Access API 支持。
   用户点击后弹出文件选择器，选 工作台/prototypes-data.js 即写入最新内容；鸿蒙/移动端无此 API 会隐藏按钮。 */
async function mergeProtoEdits(orig, seg){
  /* 把最新增量段合并进原 prototypes-data.js：定位文件内 PROTOTYPES_EDITS_START/END 标记块，
     整体替换为生成的增量段（含标记），从而只在原文件中“增加编辑数据”，其余结构（V04/V03/push/DATA_MODELS 等）全部保留，
     杜绝直接覆盖写增量段导致其他数据丢失。 */
  var RE=/[/][*]\s*>>>\s*PROTOTYPES_EDITS_START[\s\S]*?<<<\s*PROTOTYPES_EDITS_END\s*<<<\s*[*][/]/g;
  var cleaned=orig.replace(RE,'');                                  /* 全局删除所有旧块 */
  if(!seg) return cleaned.replace(/\n{3,}/g,'\n\n');                 /* 无编辑：只清块，不留空块 */
  var block='\n\n'+seg.trim()+'\n';
  var anchor=/window\.__PROTOTYPES_BASE\s*=/;
  var out = anchor.test(cleaned)
    ? cleaned.replace(anchor, function(m){ return m+block; })
    : (cleaned.replace(/\s*$/,'')+block);
  return out.replace(/\n{3,}/g,'\n\n');
}
function edProtoFileIsComplete(s){ return typeof s==='string' && s.indexOf('const V04')>=0 && s.indexOf('DATA_MODELS')>=0 && s.indexOf('PROTOTYPES_V03')>=0; }
async function edSaveProtoLocal(){
  var fn='prototypes-data.js';
  var seg=edBuildProtoText();          /* 差异段，可能为 null（无编辑/已改回原值） */
  var hasEdits=!!seg;

  /* 无编辑：若已持有原文件则清理历史 EDIT 块并输出纯净版；否则提示无需导出，绝不下载残缺文件 */
  if(!hasEdits){
    var origClean=null;
    try{ if(typeof fetch==='function'){ var u=new URL(fn,location.href).href; var r=await fetch(u,{cache:'no-store'}); if(r.ok) origClean=await r.text(); } }catch(_){}
    if(origClean){
      try{
        var clean=mergeProtoEdits(origClean,null);
        if(!edProtoFileIsComplete(clean)){ try{ downloadText('prototypes-data.edits.js', clean); }catch(_){} showToast('生成的纯净文件不完整，已改为下载 prototypes-data.edits.js 增量片段，切勿覆盖原文件'); return; }
        if(!('showSaveFilePicker' in window)) throw new Error('no picker');
        var hc=await window.showSaveFilePicker({suggestedName:fn,types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]});
        var wc=await hc.createWritable(); await wc.write(clean); await wc.close();
        showToast('已清理历史编辑块，文件还原为纯净版（还需部署 GitHub）'); return;
      }catch(e){ if(e&&e.name==='AbortError') return; try{ downloadText(fn,clean); }catch(_){} showToast('已自动下载清理后的纯净 '+fn+'，请用它覆盖本地原文件'); return; }
    }
    showToast('当前没有手动编辑的数据，无需导出'); return;
  }

  /* 有编辑：必须先拿到原文件（合并的必需输入），否则只能用“增量片段”且严禁当完整文件覆盖 */
  var orig=null;
  try{ if(typeof fetch==='function'){ var u=new URL(fn,location.href).href; var r=await fetch(u,{cache:'no-store'}); if(r.ok) orig=await r.text(); } }catch(_){}
  if(!orig){
    try{ if('showOpenFilePicker' in window){ var picks=await window.showOpenFilePicker({types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]}); orig=await (await picks[0].getFile()).text(); } }catch(e){ if(e&&e.name==='AbortError') return; }
  }
  if(orig){
    var out=mergeProtoEdits(orig, seg);   /* 完整合并结果：原结构 + 增量段，可安全覆盖 */
    if(!edProtoFileIsComplete(out)){ try{ downloadText('prototypes-data.edits.js', out); }catch(_){} showToast('生成的合并文件不完整，已改为下载 prototypes-data.edits.js 增量片段，切勿覆盖原文件'); return; }
    try{
      if(!('showSaveFilePicker' in window)) throw new Error('no picker');
      var h=await window.showSaveFilePicker({suggestedName:fn,types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]});
      var w=await h.createWritable(); await w.write(out); await w.close();
      showToast('已保存完整 '+fn+'（已合并编辑增量，原结构保留，还需部署 GitHub）'); return;
    }catch(e){ if(e&&e.name==='AbortError') return; try{ downloadText(fn,out); }catch(_){} showToast('已自动下载完整 '+fn+'，请用它覆盖本地原文件'); return; }
  }
  /* 拿不到原文件：绝不用纯增量段覆盖原文件！下载为 .edits.js 增量片段并明确警告 */
  try{ downloadText('prototypes-data.edits.js', seg); }catch(_){}
  showToast('未能读取原 prototypes-data.js：已改为下载“增量片段 prototypes-data.edits.js”，请把它合并进你的原文件，切勿直接覆盖！');
}
/* 纯前端、无后台写本地文件：仅桌面 Chrome/Edge 的 File System Access API 支持。
   用户点击后弹出文件选择器，选 工作台/nav-data.js 即写入最新内容；鸿蒙/移动端无此 API 会隐藏按钮。 */
async function edSaveNavLocal(){
  var text=edBuildNavText();
  /* 弹系统保存窗口，让用户自己选择保存位置（secure context 如 http/localhost 可用） */
  try{
    if(!('showSaveFilePicker' in window)) throw new Error('当前浏览器不支持系统保存窗口');
    var handle=await window.showSaveFilePicker({suggestedName:'nav-data.js', types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}]});
    var w=await handle.createWritable();
    await w.write(text);
    await w.close();
    showToast('已通过系统窗口保存 nav-data.js（含当前分类/顺序/导入原型，还需部署 GitHub）');
    return;
  }catch(e){
    if(e&&e.name==='AbortError') return;
    /* 环境不支持系统保存窗口：降级 blob 下载 */
    try{ downloadText('nav-data.js', text); }catch(_){}
    showToast('当前环境无法弹出系统保存窗口，已自动下载完整 nav-data.js，请用它覆盖本地原文件');
  }
}
/* 启动时合并 imported-prototypes.js（位于 prototypes-data.js 之后的静态数据）到 PROTOTYPES，
   使 GitHub 静态托管的新访客无需本地缓存也能看到导入页面 */
function edApplyNavData(){
  /* 优先读取独立数据文件 nav-data.js（window.NAV_DATA）构建左导航；无文件则退回 localStorage/种子 */
  if(typeof window.NAV_DATA==='undefined'||!window.NAV_DATA||!Array.isArray(window.NAV_DATA.protos)||!window.NAV_DATA.protos.length)return false;
  var nd=window.NAV_DATA;
  if(Array.isArray(nd.cats)&&nd.cats.length) window.ED.cats=nd.cats.slice();
  var v03={}; if(typeof PROTOTYPES_V03!=='undefined') PROTOTYPES_V03.forEach(function(p){v03[p.id]=p;});
  PROTOTYPES.length=0;
  nd.protos.forEach(function(sp){
    var base=v03[sp.id];
    if(base){
      var np={}; for(var k in base) np[k]=base[k];
      if(sp.group!==undefined) np.group=sp.group;
      if(sp.name!==undefined) np.name=sp.name;
      PROTOTYPES.push(np); return;
    }
    if(!sp.__imported)return;
    var np={id:sp.id,name:sp.name,group:sp.group,device:sp.device,kind:sp.kind,__imported:true,hotspots:sp.hotspots||[]};
    /* 恢复导出时一并写入的导入原型右侧栏编辑字段 */
    ['overview','flow','states','note','status'].forEach(function(k){ if(sp[k]!==undefined) np[k]=sp[k]; });
    var it=nd.content&&nd.content[sp.id];
    if(np.kind==='image'){ if(it&&it.image)np.image=it.image; if(it&&it.images)np.images=(it.images||[]).slice(); }
    else { var _c=(it&&it.content||sp.content||''); if(_c) np.url=edBlobUrl(_c); }
    PROTOTYPES.push(np);
  });
  return true;
}
function edApplyImportedData(){
  if(typeof window.IMPORTED_PROTOTYPES==='undefined'||!window.IMPORTED_PROTOTYPES)return;
  window.IMPORTED_PROTOTYPES.forEach(function(p){
    if(!p||!p.id)return;
    if(PROTOTYPES.some(function(x){return x.id===p.id;}))return;
    if(p.kind==='image'){
      var it=window.IMPORTED_CONTENT&&window.IMPORTED_CONTENT[p.id];
      if(it&&it.kind==='image'){ if(it.image)p.image=it.image; if(it.images)p.images=(it.images||[]).slice(); }
    }else{
      var it=window.IMPORTED_CONTENT&&window.IMPORTED_CONTENT[p.id];
      var _c=(it&&it.content)||'';
          if(_c) p.url=edBlobUrl(_c);
          /* 内置原型被误标 __imported 且 content 为空时，不强行覆盖 url，交由下方 _v03 回退正确文件地址，避免白屏 */
    }
    PROTOTYPES.push(p);
  });
}
window.edApplyImportedData=edApplyImportedData;
/* 启动时合并 prototypes-data.js 末尾自动写入的 PROTOTYPES_IMPORTED（编辑版「导入本地文件」持久化到数据文件），
   与 localStorage 中的导入项按 id 去重，避免重复；仅刷新 / 其他浏览器首次访问时补足导入原型 */
function edApplyDataEdits(){
  var E=window.PROTOTYPES_EDITS;
  if(!E)return;
  /* 兼容两种格式：新导出为数组 [{id,...}]，旧导入段为 {protos:[...]} */
  var list = Array.isArray(E) ? E : (E.protos&&Array.isArray(E.protos)?E.protos:[]);
  var allowed=['overview','flow','states','hotspots','note','status','name','group','device','url','srcdoc'];
  list.forEach(function(m){
    if(!m||!m.id)return;
    var p=PROTOTYPES.find(function(x){return x.id===m.id;});
    if(p){
      /* 内置原型：把编辑增量叠加到现有对象上（满足「只增加手动编辑数据」） */
      allowed.forEach(function(k){ if(m[k]!==undefined) p[k]=m[k]; });
    } else if(m.__imported){
      /* 导入原型：从 localStorage 内容重建（兜底恢复右侧栏编辑字段） */
      var np={id:m.id,name:m.name,group:m.group,device:m.device,kind:m.kind||'html',__imported:true,hotspots:[]};
      allowed.forEach(function(k){ if(m[k]!==undefined) np[k]=m[k]; });
      if(m.kind==='image'){ var it=window.ED.imported[m.id]; if(it){np.image=it.image;np.images=it.images||[];} }
      else { np.url=edBlobUrl((window.ED.imported[m.id]&&window.ED.imported[m.id].content)||''); }
      PROTOTYPES.push(np);
    }
  });
}
window.edApplyDataEdits=edApplyDataEdits;

/* 统一持久化：把左导航（分类顺序 / 原型排序 / 分组 / 改名 / 增删 + 导入原型内容 / 标注）
   一次性以双段写回 prototypes-data.js（PROTOTYPES_IMPORTED + PROTOTYPES_EDITS）；
   同时写 localStorage 作为兜底 / 同浏览器实时同步。文件为权威源，编辑版与 index 均从这两段读取，
   达成「两侧读同一数据文件」。 */
/* ---------- 自动回写（仅在 http(s) 环境、经 serve.py 打开时生效） ---------- */
/* file:// 下浏览器无写本地文件权限，仅 localStorage 兜底；http 环境下把编辑自动合并回写物理文件。
   后端 serve.py 对 prototypes-data.js / nav-data.js 均设完整性闸门，残缺内容拒绝写入，绝不丢数据。 */
var _edAutoTimer=null;
function edAutoSave(){
  if(typeof fetch!=='function' || location.protocol==='file:') return;   /* 仅 http(s) 自动回写 */
  if(_edAutoTimer) clearTimeout(_edAutoTimer);
  _edAutoTimer=setTimeout(async function(){
    try{
      /* 左导航结构 → nav-data.js */
      var navText=edBuildNavText();
      await fetch('/api/save-nav',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:'nav-data.js',text:navText})});
      /* 原型编辑增量 → 读原 prototypes-data.js + 合并增量 → 写回（后端再校验完整性） */
      var seg=edBuildProtoText();
      if(seg!==null){
        var r=await fetch('prototypes-data.js',{cache:'no-store'});
        if(r.ok){
          var orig=await r.text();
          var out=await mergeProtoEdits(orig, seg);
          if(edProtoFileIsComplete(out)){
            await fetch('/api/save-proto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:'prototypes-data.js',text:out})});
          }
        }
      }
    }catch(e){ /* 自动保存失败不影响编辑（localStorage 已兜底），静默 */ }
  }, 1000);
}
function edPersistNav(){
  /* 左导航已统一为 localStorage 同步（与右侧栏一致）：改动仅写 lanyue_wb_edit_v1，
     同浏览器 index 经 storage 事件实时刷新左导航；刷新后经 edLoadAll 恢复分类/顺序。
     http 环境下额外触发 edAutoSave 自动合并回写物理文件（serve.py 写盘，完整性闸门保护）。 */
  try{ edSaveAll(); }catch(e){}
  try{ edAutoSave(); }catch(e){}
}
window.edPersistNav=edPersistNav;


function edApplyDataImported(){
  if(typeof window.PROTOTYPES_IMPORTED==='undefined'||!window.PROTOTYPES_IMPORTED)return;
  window.PROTOTYPES_IMPORTED.forEach(function(p){
    if(!p||!p.id)return;
    if(PROTOTYPES.some(function(x){return x.id===p.id;}))return;
    if(p.kind!=='image'){ p.url=edBlobUrl(p.content||''); }
    PROTOTYPES.push(p);
  });
}

/* ---------- 元素选择器生成（点选时自动绑定最内层元素） ---------- */
function edCssPath(el,idoc){
  if(!el||el.nodeType!==1)return '';
  function unique(sel){ try{ return idoc.querySelectorAll(sel).length===1; }catch(e){ return false; } }
  var cur=el,parts=[];
  while(cur&&cur.nodeType===1&&cur.tagName!=='HTML'){
    var dn=cur.getAttribute&&cur.getAttribute('data-page-node-id');
    if(dn){ var s1='[data-page-node-id="'+dn+'"]'; if(unique(s1))return s1; }
    if(cur.id){ var s2='#'+cur.id.replace(/(["\\])/g,'\\$1'); if(unique(s2))return s2; }
    var seg=cur.tagName.toLowerCase();
    var cls=(cur.className&&typeof cur.className==='string')?cur.className.trim().split(/\s+/).filter(Boolean):[];
    cls.slice(0,3).forEach(function(c){ seg+='[class~="'+c.replace(/"/g,'')+'"]'; });
    var par=cur.parentElement;
    if(par){
      var sib=Array.prototype.filter.call(par.children,function(x){return x.tagName===cur.tagName;});
      if(sib.length>1)seg+=':nth-of-type('+(sib.indexOf(cur)+1)+')';
    }
    parts.unshift(seg);
    if(unique(parts.join(' > ')))return parts.join(' > ');
    cur=cur.parentElement;
  }
  return '';
}

/* ---------- 标注编辑器（新增 / 编辑） ---------- */
function edSyncBlocks(){
  var t=$('edType').value;
  $('edRuleBlock').style.display=(t==='rule')?'':'none';
  $('edFieldBlock').style.display=(t==='field')?'':'none';
}
function edOpen(id,rect){
  var p=current();
  if(!p){ showToast('请先在左侧选择一个原型页面'); return; }
  var h=null;
  if(id){ h=p.hotspots.filter(function(x){return x.id===id;})[0]||null; if(!h)return; }
  window.ED.editId=id||null;
  window.ED.rect=rect||null;
  $('edHead').textContent=h?'编辑标注':'新增标注';
  $('edSub').textContent=(id&&rect)
    ? '已将标注重新定位到「'+p.name+'」的新位置，确认或调整说明后保存'
    : (rect
      ? '已在「'+p.name+'」上点选一块区域，请补充标注说明，保存后同步到右侧栏'
      : '为「'+p.name+'」补充标注说明，保存后同步更新右侧栏与标注层');
  $('edTitle').value=h?h.title:'';
  $('edDesc').value=h?h.desc:'';
  $('edType').value=h?h.type:'element';
  /* 标注编号：编辑时回显 h.num，新增时默认自增长（当前最大编号 +1） */
  $('edNum').value=h?(h.num!=null?h.num:''):edNextNum(p);
  /* 重新定位时以新点选元素的选择器为准，否则沿用既有选择器 */
  $('edSelector').value=rect?(rect.sel||''):(h?(h.selector||''):'');
  var r=(h&&h.rule)||{};
  $('edRuleCode').value=r.code||''; $('edRuleTrigger').value=r.trigger||'';
  $('edRuleBehavior').value=r.behavior||''; $('edRuleException').value=r.exception||'';
  var f=(h&&h.field)||{};
  $('edFieldType').value=f.type||''; $('edFieldRequired').value=f.required||'否';
  $('edFieldFormat').value=f.format||''; $('edFieldSample').value=f.sample||'';
  $('edDelete').style.display=h?'':'none';
  edSyncBlocks();
  $('edModal').classList.add('show');
  setTimeout(function(){ try{ $('edTitle').focus(); }catch(e){} },60);
}
function edClose(){ $('edModal').classList.remove('show'); window.ED.editId=null; window.ED.rect=null; }
function edSave(){
  var p=current(); if(!p)return;
  var type=$('edType').value;
  var title=$('edTitle').value.trim();
  var desc=$('edDesc').value.trim();
  if(!title){ showToast('请填写标注名称'); try{$('edTitle').focus();}catch(e){} return; }
  var sel=$('edSelector').value.trim();
  var numRaw=$('edNum').value.trim();
  var numVal;
  if(numRaw!==''){ var _n=parseInt(numRaw,10); numVal=isNaN(_n)?numRaw:_n; }
  else { numVal=edNextNum(p); }
  var base={type:type,title:title,desc:desc,num:numVal};
  if(sel)base.selector=sel;
  if(type==='rule'){
    base.rule={code:$('edRuleCode').value.trim()||('RULE-'+String(p.hotspots.length+1).padStart(2,'0')),
      trigger:$('edRuleTrigger').value.trim()||'—',
      behavior:$('edRuleBehavior').value.trim()||'—',
      exception:$('edRuleException').value.trim()||'—'};
  }
  if(type==='field'){
    base.field={type:$('edFieldType').value.trim()||'字符串',required:$('edFieldRequired').value,
      format:$('edFieldFormat').value.trim()||'—',sample:$('edFieldSample').value.trim()||'—'};
  }
  var rect=window.ED.rect;
  if(rect){ base.x=rect.x; base.y=rect.y; base.w=rect.w; base.h=rect.h; if(rect.slide!=null)base.slide=rect.slide; }
  if(window.ED.editId){
    var i=p.hotspots.findIndex(function(x){return x.id===window.ED.editId;});
    if(i>=0){
      /* 保留原有全部字段（modal / trigger 等），再用表单值覆盖 */
      var merged=JSON.parse(JSON.stringify(p.hotspots[i]));
      Object.keys(base).forEach(function(k){ merged[k]=base[k]; });
      if(!sel)delete merged.selector;   /* 清空选择器 = 解除元素绑定，改用坐标 */
      p.hotspots[i]=merged;
    }
    showToast('标注已更新 · '+title);
  }else{
    base.id=edUid('hs');
    p.hotspots.push(base);
    showToast('已新增标注 · '+title);
  }
  p.updated=edToday();
  edSaveAll(); edPersistNav(); edClose();
  renderHotspots(); renderPRD(); renderSidebar(); scheduleUpdatePositions();
}
function edDeleteHs(id){
  var p=current(); if(!p)return;
  var h=p.hotspots.filter(function(x){return x.id===id;})[0];
  if(!h)return;
  if(!window.confirm('确认删除标注「'+h.title+'」？'))return;
  p.hotspots=p.hotspots.filter(function(x){return x.id!==id;});
  p.updated=edToday();
  edSaveAll(); edPersistNav();
  if(state.openId===id){ try{closeHsPop();}catch(e){} }
  if($('edModal').classList.contains('show'))edClose();
  renderHotspots(); renderPRD(); renderSidebar(); scheduleUpdatePositions();
  showToast('标注已删除');
}

/* ---------- 点选区域新增标注 ---------- */
function edExitBox(){
  window.ED.boxMode=false;
  window.ED.reloId=null;
  var b=$('boxAnnoBtn'); if(b)b.classList.remove('on');
  var ov=$('boxOverlay'); if(ov)ov.style.display='none';
  /* 卸载上一轮的 document 级监听，避免重复叠加 */
  if(window.ED._dragOff){ try{ window.ED._dragOff(); }catch(e){} }
}
function edBoxToggle(){
  if(window.ED.boxMode){ edExitBox(); return; }
  var p=current();
  if(!p){ showToast('请先在左侧选择一个原型页面'); return; }
  window.ED.boxMode=true;
  $('boxAnnoBtn').classList.add('on');
  var ov=$('boxOverlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='boxOverlay'; ov.className='box-overlay';
    device.appendChild(ov);
  }
  ov.innerHTML='<div class="box-hint">将鼠标移到原型上预览选区，单击即可标注 · 按 Esc 取消</div><div class="box-sel" id="boxSel"><span class="box-sel-tag"></span></div>';
  ov.style.display='block';   /* 必须显式 block：CSS 里 .box-overlay 默认 display:none */
  edBindSelect(ov);
}
function edBindSelect(ov){
  if(window.ED._dragOff){ try{ window.ED._dragOff(); }catch(e){} }
  var selEl=ov.querySelector('#boxSel');
  var pickEl=ov.querySelector('#boxPick'); if(!pickEl){ pickEl=document.createElement('div'); pickEl.id='boxPick'; pickEl.className='box-pick'; ov.appendChild(pickEl); }
  var hover=null;
  function isBlock(el){
    if(!el||el.nodeType!==1)return false;
    var tag=el.tagName.toLowerCase();
    if(tag==='html'||tag==='body'||tag==='script'||tag==='style'||tag==='head'||tag==='link')return false;
    var style=el.ownerDocument.defaultView.getComputedStyle(el);
    var disp=style.display;
    if(disp.indexOf('inline')===0 && disp!=='inline-block' && disp!=='inline-flex')return false;
    var rect=el.getBoundingClientRect();
    return rect.width>2 && rect.height>2;
  }
  function labelOf(el){
    var tag=el.tagName.toLowerCase();
    var cls=(el.className&&typeof el.className==='string')?el.className.trim().split(/\s+/).filter(c=>c).slice(0,2):[];
    var id=el.id?'#'+el.id:'';
    var dn=el.getAttribute&&el.getAttribute('data-page-node-id');
    var base=tag+id+(cls.length?('.'+cls.join('.')):'');
    return dn?base+' ['+dn.slice(0,6)+(dn.length>6?'…':'')+']':base;
  }
  /* device 相对坐标 → iframe 视口坐标（iframe 在 device 内有偏移，含桌面模式 34px 设备栏） */
  function candidatesAt(e){
    var r=device.getBoundingClientRect();
    var x=Math.max(0,Math.min(e.clientX-r.left,device.clientWidth));
    var y=Math.max(0,Math.min(e.clientY-r.top,device.clientHeight));
    var offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
    var idoc=null; try{ idoc=frame.contentDocument; }catch(err){ return []; }
    if(!idoc)return [];
    var el=idoc.elementFromPoint(x-offX, y-offY);
    if(!el||el===idoc.documentElement||el===idoc.body)return [];
    var arr=[];
    var cur=el, depth=0;
    while(cur && cur!==idoc.body && cur!==idoc.documentElement && cur.nodeType===1){
      if(isBlock(cur)){
        var br=cur.getBoundingClientRect();
        if(br.width>0||br.height>0){
          arr.push({el:cur,br:br,label:labelOf(cur),depth:depth,tag:cur.tagName.toLowerCase()});
          depth++;
        }
        if(arr.length>=8)break;
      }
      cur=cur.parentElement;
    }
    return arr;
  }
  function updateSelBox(idx){
    if(!hover)return;
    var c=hover.cands[idx]; if(!c)return;
    var offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
    selEl.style.display='block';
    selEl.style.left=(c.br.left+offX)+'px';
    selEl.style.top=(c.br.top+offY)+'px';
    selEl.style.width=c.br.width+'px';
    selEl.style.height=c.br.height+'px';
    var tag=selEl.querySelector('.box-sel-tag');
    if(tag)tag.textContent=(idx+1)+'/'+hover.cands.length+' '+c.label;
    hover.pick=idx; hover.el=c.el; hover.br=c.br;
  }
  function hidePick(){ pickEl.style.display='none'; pickEl.innerHTML=''; }
  function showPick(){
    if(!hover||hover.cands.length<=1){ hidePick(); return; }
    var offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
    var first=hover.cands[0];
    pickEl.style.display='block';
    /* 弹窗默认出现在元素上方，若上方空间不足则放到下方 */
    var top=first.br.top+offY-28-Math.min(hover.cands.length*24+30,180);
    if(top<8)top=first.br.bottom+offY+8;
    pickEl.style.left=Math.max(8,first.br.left+offX)+'px';
    pickEl.style.top=top+'px';
    pickEl.style.maxHeight='180px';
    pickEl.innerHTML='<div class="box-pick-hint">点击选择层级（滚轮/方向键切换）</div><div class="box-pick-list">'+hover.cands.map(function(c,i){
      var indent='', depthClass='depth-'+Math.min(c.depth,5);
      for(var k=0;k<c.depth;k++)indent+='<span class="depth-indent">—</span>';
      var tag='<span class="pick-tag">'+c.tag+'</span>';
      return '<div class="box-pick-item '+depthClass+(i===hover.pick?' on':'')+'" data-idx="'+i+'" title="'+c.label.replace(/"/g,'&quot;')+'">'+indent+tag+(i+1)+'. '+c.label+'</div>';
    }).join('')+'</div>';
  }
  function onMove(e){
    hidePick();
    /* 图片原型：无 DOM 可探测，直接以光标为中心画一块区域 */
    if(current().kind==='image'){
      var ir=getImgRect();
      if(!ir){ selEl.style.display='none'; hover=null; return; }
      var r=device.getBoundingClientRect();
      var cx=e.clientX-r.left, cy=e.clientY-r.top;
      var bw=Math.min(150,ir.w*0.5), bh=Math.min(100,ir.h*0.5);
      var bx=Math.max(ir.left,Math.min(cx-bw/2,ir.left+ir.w-bw));
      var by=Math.max(ir.top,Math.min(cy-bh/2,ir.top+ir.h-bh));
      selEl.style.display='block';selEl.style.left=bx+'px';selEl.style.top=by+'px';
      selEl.style.width=bw+'px';selEl.style.height=bh+'px';
      var tag=selEl.querySelector('.box-sel-tag'); if(tag)tag.textContent='点选位置';
      hover={el:null,br:{left:bx,top:by,width:bw,height:bh},ir:ir,cands:[],pick:0};
      return;
    }
    var cands=candidatesAt(e);
    if(!cands.length){ selEl.style.display='none'; hover=null; return; }
    hover={cands:cands,pick:0};
    updateSelBox(0);
  }
  function onLeave(){ selEl.style.display='none'; hover=null; hidePick(); }
  function finishRect(){
    var rect, rid=window.ED.reloId||null;
    if(current().kind==='image'){
      var ir=hover.ir||getImgRect();
      rect={ x:+(((hover.br.left+hover.br.width/2)-ir.left)*100/ir.w).toFixed(3),
             y:+(((hover.br.top+hover.br.height/2)-ir.top)*100/ir.h).toFixed(3),
             w:+(hover.br.width*100/ir.w).toFixed(3),
             h:+(hover.br.height*100/ir.h).toFixed(3), sel:'', slide:state.slideIndex };
    }else{
      var br=hover.br, dw=device.clientWidth, dh=device.clientHeight, st=0;
      try{ st=getScrollTop(); }catch(err){}
      rect={ x:+((br.left+br.width/2)*100/dw).toFixed(3),
             y:+((br.top+br.height/2+st)*100/dh).toFixed(3),
             w:+(br.width*100/dw).toFixed(3),
             h:+(br.height*100/dh).toFixed(3),
             sel:edCssPath(hover.el,frame.contentDocument) };
    }
    edExitBox();
    if(rid){ edOpen(rid,rect); }
    else{ edOpen(null,rect); }
  }
  function onClick(e){
    var item=e.target.closest('.box-pick-item');
    if(item && hover && hover.cands.length>1){
      e.stopPropagation();
      var idx=parseInt(item.dataset.idx,10);
      if(!isNaN(idx)){
        /* 点击的层级已经是当前选中：确认并打开编辑 */
        if(idx===hover.pick){ finishRect(); return; }
        /* 否则切换选中 */
        updateSelBox(idx); showPick();
      }
      return;
    }
    if(!hover)return;
    if(hover.cands.length>1 && pickEl.style.display!=='block'){
      e.stopPropagation();
      showPick(); return;
    }
    finishRect();
  }
  function onWheel(e){
    if(!hover || hover.cands.length<=1 || current().kind==='image')return;
    e.preventDefault();
    var d=e.deltaY>0?1:-1;
    var idx=(hover.pick+d+hover.cands.length)%hover.cands.length;
    updateSelBox(idx); showPick();
  }
  function onKey(e){
    if(!hover || hover.cands.length<=1 || current().kind==='image')return;
    if(e.key==='ArrowUp'||e.key==='ArrowLeft'){ e.preventDefault(); updateSelBox((hover.pick-1+hover.cands.length)%hover.cands.length); showPick(); }
    else if(e.key==='ArrowDown'||e.key==='ArrowRight'){ e.preventDefault(); updateSelBox((hover.pick+1)%hover.cands.length); showPick(); }
  }
  ov.addEventListener('mousemove',onMove);
  ov.addEventListener('mouseleave',onLeave);
  ov.addEventListener('click',onClick);
  ov.addEventListener('wheel',onWheel,{passive:false});
  document.addEventListener('keydown',onKey);
  window.ED._dragOff=function(){
    ov.removeEventListener('mousemove',onMove);
    ov.removeEventListener('mouseleave',onLeave);
    ov.removeEventListener('click',onClick);
    ov.removeEventListener('wheel',onWheel);
    document.removeEventListener('keydown',onKey);
    hidePick();
    window.ED._dragOff=null;
  };
}

/* ---------- 编辑增强：重新定位既有标注（复用点选标注的悬停/点选交互） ---------- */
function edRelocate(id){
  var p=current(); if(!p){ showToast('请先在左侧选择一个原型页面'); return; }
  var h=p.hotspots.filter(function(x){return x.id===id;})[0];
  if(!h){ return; }
  if(window.ED.boxMode){ edExitBox(); }   /* 若正处新增模式，先退出再进入 */
  window.ED.boxMode=true;
  window.ED.reloId=id;
  var b=$('boxAnnoBtn'); if(b)b.classList.add('on');
  var ov=$('boxOverlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='boxOverlay'; ov.className='box-overlay';
    device.appendChild(ov);
  }
  ov.innerHTML='<div class="box-hint">将鼠标移到原型上预览选区，单击即可<strong>重新定位「'+h.title+'」</strong> · 按 Esc 取消</div><div class="box-sel" id="boxSel"><span class="box-sel-tag"></span></div>';
  ov.style.display='block';
  edBindSelect(ov);
}

/* ---------- 管理模式：开关 / 导入本地 HTML / 删除 / 下载 ---------- */
function edOpenManage(){
  window.ED.manage=true;
  var t=$('mngToggle'); if(t)t.classList.add('on');
  renderSidebar();
  var pop=$('mngPop');
  if(pop&&t){
    var r=t.getBoundingClientRect();
    pop.style.left=(r.right+8)+'px';
    pop.style.top=Math.max(8,r.top)+'px';
    pop.classList.add('open');
  }
}
function edCloseManage(){
  window.ED.manage=false;
  var t=$('mngToggle'); if(t)t.classList.remove('on');
  var pop=$('mngPop'); if(pop)pop.classList.remove('open');
  renderSidebar();
}
function edToggleManage(){
  if(window.ED.manage) edCloseManage(); else edOpenManage();
}
function edImport(file){
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(){
    var html=String(reader.result||'');
    if(!/<html[\s>]/i.test(html)&&!/<body[\s>]/i.test(html)&&!/<div/i.test(html)){
      showToast('该文件似乎不是 HTML 原型，已取消导入'); return;
    }
    var id='imp-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    var name=file.name.replace(/\.html?$/i,'');
    PROTOTYPES.push({id:id,name:name,group:'本地导入',kind:'html',__imported:true,url:'v0.4/'+file.name,hotspots:[]});
    window.ED.imported[id]={name:file.name,content:html};
    edSaveAll(); renderSidebar(); edPersistNav();
    showToast('已导入「'+name+'」· 记得把文件放进 v0.4/ 目录');
  };
  reader.onerror=function(){ showToast('读取文件失败'); };
  reader.readAsText(file);
}
function edDeleteProto(id){
  var p=PROTOTYPES.filter(function(x){return x.id===id;})[0]; if(!p)return;
  if(!window.confirm('删除原型「'+p.name+'」及其全部标注？'))return;
  var idx=PROTOTYPES.findIndex(function(x){return x.id===id;});
  if(idx>=0)PROTOTYPES.splice(idx,1);
    delete window.ED.imported[id];
    edSaveAll(); edPersistNav();
  if(state.currentId===id){
    if(PROTOTYPES.length){ state.currentId=null; selectPrototype(PROTOTYPES[0].id); }
    else { state.currentId=null; renderSidebar(); }
  }
  renderSidebar();
  showToast('已删除原型「'+p.name+'」');
}
function edDownloadProto(id){
  var it=window.ED.imported[id];
  if(it&&it.kind==='image'){
    var dimgs=(it.images&&it.images.length)?it.images:(it.image?[it.image]:[]);
    if(dimgs.length){
      var dgh='<!doctype html><html><head><meta charset="utf-8"><title>'+(it.name||id)+'</title><style>body{margin:0;background:#0f172a;display:flex;flex-direction:column;gap:8px;padding:8px}img{max-width:100%}</style></head><body>'+dimgs.map(function(u){return '<img src="'+u+'">';}).join('')+'</body></html>';
      edDownload((it.name||id)+'.html',dgh,'text/html;charset=utf-8'); return;
    }
  }
  var html=it&&(it.content||it.html);
  var name=(it&&it.name)||(id+'.html');
  if(html){ edDownload(name,html,'text/html;charset=utf-8'); return; }
  var p=PROTOTYPES.filter(function(x){return x.id===id;})[0];
  if(p&&p.url){
    showToast('正在下载原原型文件…');
    if(typeof fetch==='function'){
      fetch(p.url).then(function(r){return r.text();}).then(function(t){ edDownload(name,t,'text/html;charset=utf-8'); })
        .catch(function(){ showToast('下载失败：无法读取 '+p.url); });
    } else { showToast('当前环境不支持下载，请手动复制 v0.4/ 下文件'); }
    return;
  }
  showToast('仅支持下载本地导入的原型');
}

/* ---------- 分类：数据模型与维护 ---------- */
function edEnsureCats(){
  var order=(window.ED.cats&&window.ED.cats.length)?window.ED.cats.slice():[];
  var seen=new Set(order);
  PROTOTYPES.forEach(function(p){ var g=p.group||UNCAT; if(!seen.has(g)){ seen.add(g); order.push(g); } });
  /* 合并重复分类：归一化后同名的只保留一个（优先保留有原型的），其余原型迁移过去，
     修掉本地缓存里「用户端 / 顾客端」等历史命名导致的左栏双分组 */
  var hasP={}; PROTOTYPES.forEach(function(p){ hasP[p.group||UNCAT]=true; });
  var canon={}, out=[], changed=false;
  order.forEach(function(g){
    var k=(typeof groupKey==='function')?groupKey(g):String(g||'');
    if(!(k in canon)){ canon[k]=g; out.push(g); return; }
    var keep=canon[k];
    if(keep===g){ return; }
    if(hasP[g]&&!hasP[keep]){           /* 后者有原型、前者为空壳：用后者顶替 */
      var pos=out.indexOf(keep); if(pos>=0)out[pos]=g;
      canon[k]=g;
      PROTOTYPES.forEach(function(p){ if(p.group===keep)p.group=g; });
    }else{
      PROTOTYPES.forEach(function(p){ if(p.group===g)p.group=keep; });
    }
    changed=true;
  });
  if(changed||out.length!==order.length){ window.ED.cats=out; try{edSaveAll();}catch(e){} }
  else { window.ED.cats=order; }
}
function edCatCount(g){ return PROTOTYPES.filter(function(p){return (p.group||UNCAT)===g;}).length; }
function edCatRename(oldN,newN){
  newN=(newN||'').trim(); if(!newN)return;
  if(newN!==oldN && window.ED.cats.indexOf(newN)>=0){ showToast('已存在同名分类「'+newN+'」'); return; }
  var i=window.ED.cats.indexOf(oldN);
  if(i>=0)window.ED.cats[i]=newN; else window.ED.cats.push(newN);
  PROTOTYPES.forEach(function(p){ if((p.group||UNCAT)===oldN)p.group=newN; });
  edSaveAll(); edPersistNav(); renderSidebar();
}
function edCatDelete(g){
  if(g===UNCAT){ showToast('「未分类」不可删除'); return; }
  if(!window.confirm('删除分类「'+g+'」？其下 '+edCatCount(g)+' 个原型将迁移到「'+UNCAT+'」'))return;
  var i=window.ED.cats.indexOf(g); if(i>=0)window.ED.cats.splice(i,1);
  PROTOTYPES.forEach(function(p){ if((p.group||UNCAT)===g)p.group=UNCAT; });
  edSaveAll(); edPersistNav(); renderSidebar(); openCatManager();
}
function edCatAdd(n){
  n=(n||'').trim(); if(!n){ showToast('请输入分类名'); return; }
  if(window.ED.cats.indexOf(n)>=0){ showToast('分类已存在'); return; }
  window.ED.cats.push(n); edSaveAll(); edPersistNav(); openCatManager();
}
function edCatMove(from,to){
  if(from===to)return;
  var a=window.ED.cats, fi=a.indexOf(from), ti=a.indexOf(to);
  if(fi<0||ti<0)return;
  a.splice(fi,1); a.splice(ti,0,from);
  edSaveAll(); edPersistNav(); renderCatManager(); renderSidebar();
}
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

/* ---------- 分类管理模态 ---------- */
function openCatManager(){ renderCatManager(); $('catModal').classList.add('show'); }
function closeCatManager(){ $('catModal').classList.remove('show'); }
function renderCatManager(){
  var list=$('catList'); if(!list)return; list.innerHTML='';
  (window.ED.cats||[]).forEach(function(g){
    var cnt=edCatCount(g);
    var row=document.createElement('div');
    var orderIdx=(window.ED.cats||[]).indexOf(g)+1;
    row.className='cat-row'; row.draggable=true; row.dataset.cat=g;
    var grip='<span class="cat-grip" title="拖拽排序"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>';
    var orderCtl='<label class="cat-ord" title="顺序值：数字越小越靠前"><span class="cat-ord-label">顺序</span><input type="number" class="cat-order" data-cat="'+escapeHtml(g)+'" value="'+orderIdx+'" min="1" step="1"></label>';
    var acts='<div class="cat-acts"><button class="cat-btn" data-act="rename">重命名</button>'+(g===UNCAT?'<button class="cat-btn" disabled style="opacity:.4">删除</button>':'<button class="cat-btn danger" data-act="delete">删除</button>')+'</div>';
    row.innerHTML=grip+'<div class="cat-info"><div class="cat-name">'+escapeHtml(g)+' <span class="cat-cnt">'+cnt+' 个</span></div></div>'+'<div class="cat-ctrl">'+orderCtl+acts+'</div>';
    row.addEventListener('dragstart',function(e){ try{e.dataTransfer.setData('text/plain',g);}catch(_){} row.style.opacity=.4; });
    row.addEventListener('dragend',function(){ row.style.opacity=''; });
    row.addEventListener('dragover',function(e){ e.preventDefault(); });
    row.addEventListener('drop',function(e){ e.preventDefault(); var from=''; try{from=e.dataTransfer.getData('text/plain');}catch(_){} edCatMove(from,g); });
    row.querySelector('[data-act="rename"]').addEventListener('click',function(){ edCatRenameInline(g,row); });
    var del=row.querySelector('[data-act="delete"]');
    if(del)del.addEventListener('click',function(){ edCatDelete(g); });
    var oi=row.querySelector('.cat-order');
    if(oi)oi.addEventListener('change',function(){ edSetCatOrder(); });
    list.appendChild(row);
  });
}
function edSetCatOrder(){
  var list=$('catList'); if(!list)return;
  var rows=Array.prototype.slice.call(list.querySelectorAll('.cat-row'));
  if(!rows.length)return;
  var arr=rows.map(function(row){
    var g=row.dataset.cat;
    var inp=row.querySelector('.cat-order');
    var v=inp?parseInt(inp.value,10):0; if(isNaN(v))v=0;
    return {g:g,v:v,old:window.ED.cats.indexOf(g)};
  }).sort(function(a,b){ return (a.v-b.v)||(a.old-b.old); });
  window.ED.cats=arr.map(function(x){return x.g;});
  edSaveAll(); edPersistNav(); renderCatManager(); renderSidebar();
  showToast('已调整分类顺序');
}
function edCatRenameInline(g,row){
  var nameEl=row.querySelector('.cat-name'); if(!nameEl)return;
  var input=document.createElement('input'); input.value=g; input.className='imp-group-new';
  nameEl.replaceWith(input); input.focus(); input.select();
  var done=false;
  function commit(){ if(done)return; done=true; edCatRename(g,input.value); renderCatManager(); }
  input.addEventListener('blur',commit);
  input.addEventListener('keydown',function(e){ if(e.key==='Enter'){e.preventDefault();commit();} else if(e.key==='Escape'){done=true;renderCatManager();} });
}

/* ---------- 导入对话框（名称 / 分类 / 设备类型） ---------- */
var pendingImport=null;
function edIsImage(f){ return /^image\//.test(f.type)||/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name); }
/* 多张图片合并为一个幻灯片原型（images[] 多图即幻灯片模式，可用 ◀▶ / 滑动切换） */
function edReadImages(files){
  if(!files||!files.length)return;
  var firstName=files[0].name;
  var name=firstName.replace(/\.[^.]+$/,'')+(files.length>1?(' 等'+files.length+'张'):'');
  var fileLabel=firstName+(files.length>1?(' 等'+files.length+'张'):'');
  var urls=[],pending=files.length,done=0;
  files.forEach(function(f){
    var r=new FileReader();
    r.onload=function(){
      urls.push(String(r.result||''));
      if(++done===pending){
        pendingImport={name:name,file:fileLabel,kind:'image',image:(urls.length===1?urls[0]:null),images:(urls.length>1?urls.slice():[])};
        edOpenImpModal();
      }
    };
    r.onerror=function(){ if(++done===pending)showToast('部分图片读取失败'); };
    r.readAsDataURL(f);
  });
}
function edReadImport(file){
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(){
    var html=String(reader.result||'');
    if(!/<html[\s>]/i.test(html)&&!/<body[\s>]/i.test(html)&&!/<div/i.test(html)){
      showToast('该文件似乎不是 HTML 原型，已取消导入'); return;
    }
    pendingImport={name:file.name.replace(/\.html?$/i,''),file:file.name,content:html};
    edOpenImpModal();
  };
  reader.onerror=function(){ showToast('读取文件失败'); };
  reader.readAsText(file);
}
function edOpenImpModal(){
  if(!pendingImport)return;
  $('impFileName').textContent=pendingImport.file;
  $('impName').value=pendingImport.name;
  var sel=$('impCat'); sel.innerHTML='';
  (window.ED.cats||[]).forEach(function(g){ var o=document.createElement('option');o.value=g;o.textContent=g;sel.appendChild(o); });
  var on=document.createElement('option'); on.value='__new__'; on.textContent='＋ 新建分类…'; sel.appendChild(on);
  sel.value=(window.ED.cats&&window.ED.cats.length)?window.ED.cats[0]:'__new__';
  $('impCatNew').style.display='none'; $('impCatNew').value='';
  $('impDevice').value='desktop';
  $('impModal').classList.add('show');
}
function edConfirmImport(){
  if(!pendingImport){ closeImpModal(); return; }
  var name=$('impName').value.trim()||pendingImport.name;
  var cat=$('impCat').value;
  if(cat==='__new__'){ cat=$('impCatNew').value.trim(); if(!cat){ showToast('请输入新分类名'); return; } }
  if(!cat){ showToast('请选择或输入分类'); return; }
  if(window.ED.cats.indexOf(cat)<0)window.ED.cats.push(cat);
  var id='imp-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  if(pendingImport.kind==='image'){
    var imgData={name:pendingImport.file,kind:'image'};
    if(pendingImport.image)imgData.image=pendingImport.image;
    if(pendingImport.images)imgData.images=pendingImport.images.slice();
    PROTOTYPES.push({id:id,name:name,group:cat,device:$('impDevice').value,kind:'image',__imported:true,hotspots:[],image:pendingImport.image||null,images:(pendingImport.images&&pendingImport.images.length?pendingImport.images.slice():[])});
    window.ED.imported[id]=imgData;
    edSaveAll(); renderSidebar();
    showToast('已导入图片「'+name+'」· '+(isMultiImage({kind:'image',images:pendingImport.images})?'已生成幻灯片，可用 ◀▶ 或滑动切换':'点击该原型即可在右侧查看'));
    edPersistNav();
    pendingImport=null; closeImpModal();
    return;
  }
  var file=pendingImport.file, content=pendingImport.content;
  PROTOTYPES.push({id:id,name:name,group:cat,device:$('impDevice').value,kind:'html',__imported:true,url:'v0.4/'+file,hotspots:[]});
  window.ED.imported[id]={name:file,content:content};
  edSaveAll(); renderSidebar();
  showToast('已导入「'+name+'」· 记得把文件放进 v0.4/ 目录');
  edPersistNav();
  pendingImport=null; closeImpModal();
}
function closeImpModal(){ pendingImport=null; $('impModal').classList.remove('show'); }

function edBind(){
  $('boxAnnoBtn').addEventListener('click',edBoxToggle);
  $('mngToggle').addEventListener('click',edToggleManage);
  $('mngPopClose').addEventListener('click',edCloseManage);
  document.addEventListener('click',function(e){
    if(!window.ED.manage)return;
    if(e.target.closest&&e.target.closest('#mngPop'))return;
    if(e.target.closest&&e.target.closest('#mngToggle'))return;
    if(e.target.closest&&e.target.closest('.ed-modal'))return;
    edCloseManage();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&window.ED.manage) edCloseManage();
  });
  $('importBtn').addEventListener('click',function(){ var f=$('importFile'); if(f)f.click(); });
  $('importFile').addEventListener('change',function(e){
    var files=e.target.files?Array.prototype.slice.call(e.target.files):[];
    if(!files.length)return;
    var imgs=[],others=[];
    files.forEach(function(f){ if(edIsImage(f))imgs.push(f); else others.push(f); });
    others.forEach(function(f){ edReadImport(f); });
    if(imgs.length)edReadImages(imgs);
    e.target.value='';
  });
  $('sideList').addEventListener('click',function(e){
    var del=e.target.closest('[data-del]');
    if(del){ edDeleteProto(del.getAttribute('data-del')); return; }
    var dl=e.target.closest('[data-dl]');
    if(dl){ edDownloadProto(dl.getAttribute('data-dl')); return; }
  });
  /* 分类管理 + 导入对话框 */
  $('catManageBtn').addEventListener('click',openCatManager);
  $('catClose').addEventListener('click',closeCatManager);
  $('catAdd').addEventListener('click',function(){ edCatAdd($('catNewName').value); $('catNewName').value=''; });
  $('exportNavBtn').addEventListener('click',edExportNavData);
  $('exportProtoBtn').addEventListener('click',edExportProtoData);
  $('protoCopyBtn').addEventListener('click',protoExportCopy);
  $('protoSaveFileBtn').addEventListener('click',edSaveProtoLocal);
  
  $('protoDownloadBtn').addEventListener('click',edSaveProtoLocal);
  $('protoExportClose').addEventListener('click',protoExportHide);
  $('protoExportModal').addEventListener('click',function(e){ if(e.target===this) protoExportHide(); });
  $('navCopyBtn').addEventListener('click',navExportCopy);
  $('navSaveFileBtn').addEventListener('click',edSaveNavLocal);
  $('navDownloadBtn').addEventListener('click',edSaveNavLocal);
  $('navExportClose').addEventListener('click',navExportHide);
  $('navExportModal').addEventListener('click',function(e){ if(e.target===this) navExportHide(); });
  $('impConfirm').addEventListener('click',edConfirmImport);
  $('impCancel').addEventListener('click',closeImpModal);
  $('impCat').addEventListener('change',function(){ $('impCatNew').style.display=(this.value==='__new__')?'block':'none'; });
  $('impModal').addEventListener('mousedown',function(e){ if(e.target.id==='impModal')closeImpModal(); });
  $('catModal').addEventListener('mousedown',function(e){ if(e.target.id==='catModal')closeCatManager(); });
  $('edSave').addEventListener('click',edSave);
  $('edCancel').addEventListener('click',edClose);
  $('edDelete').addEventListener('click',function(){ if(window.ED.editId)edDeleteHs(window.ED.editId); });
  $('edType').addEventListener('change',edSyncBlocks);
  $('edModal').addEventListener('mousedown',function(e){ if(e.target.id==='edModal')edClose(); });
  /* 切换原型（iframe 重新 load）时自动退出点选标注，避免遮罩残留在旧尺寸上 */
  try{
    frame.addEventListener('load',function(){
      if(window.ED.boxMode)edExitBox();
      if(window.ED.editId)edClose();
    });
  }catch(e){}
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    if($('edModal').classList.contains('show'))edClose();
    else if($('impModal').classList.contains('show'))closeImpModal();
    else if($('catModal').classList.contains('show'))closeCatManager();
    else if(window.ED.boxMode)edExitBox();
  });
}

/* 左侧导航拖拽排序（同分组/跨分组）。仅在管理模式显示拖动手柄，
   非管理模式下 draggable=false，避免日常评审误触发。 */
var _sidebarDrag=null;
window.edUnbindSidebarDrag=edUnbindSidebarDrag;
window.edBindSidebarDrag=edBindSidebarDrag;
function edUnbindSidebarDrag(){ if(_sidebarDrag){ try{ _sidebarDrag(); }catch(e){} _sidebarDrag=null; } }
function edBindSidebarDrag(){
  edUnbindSidebarDrag();
  var list=$('sideList'); if(!list)return;
  var dragId=null, dragEl=null, dragGroup=null, dropEl=null, dropBefore=true, groupOver=null;
  function groupNameOf(el){ var gn=el&&el.closest('.side-group'); var n=gn&&gn.querySelector('.side-group-name'); return n?n.dataset.group:null; }
  function clearMarks(){
    if(dropEl){ dropEl.classList.remove('drop-before','drop-after'); dropEl=null; }
    if(groupOver){ groupOver.classList.remove('drag-drop-over'); groupOver=null; }
  }
  function onDown(e){
    var handle=e.target.closest('.si-drag'); if(!handle)return;
    var item=handle.closest('.side-item.manage'); if(!item)return;
    e.preventDefault();
    dragId=item.dataset.id; dragEl=item; dragGroup=groupNameOf(item);
    item.classList.add('dragging');
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  }
  function onMove(e){
    if(!dragId)return;
    var t=document.elementFromPoint(e.clientX,e.clientY);
    var item=t&&t.closest?t.closest('.side-item.manage'):null;
    var gh=t&&t.closest?t.closest('.side-group-name'):null;
    clearMarks();
    if(gh){ groupOver=gh; gh.classList.add('drag-drop-over'); return; }
    if(item && item!==dragEl){
      dropEl=item;
      var r=item.getBoundingClientRect(), mid=r.top+r.height/2;
      dropBefore=e.clientY<mid;
      item.classList.add(dropBefore?'drop-before':'drop-after');
      return;
    }
    var grp=t&&t.closest?t.closest('.side-group'):null;
    if(grp){ var gn2=grp.querySelector('.side-group-name'); if(gn2){ groupOver=gn2; gn2.classList.add('drag-drop-over'); } }
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    if(!dragId)return;
    var id=dragId, g=dragGroup;
    var dropElRef=dropEl, groupOverRef=groupOver, beforeRef=dropBefore;
    if(dropElRef)dropElRef.classList.remove('drop-before','drop-after');
    if(groupOverRef)groupOverRef.classList.remove('drag-drop-over');
    if(dragEl)dragEl.classList.remove('dragging');
    dragId=null; dragEl=null; dragGroup=null; dropEl=null; groupOver=null;
    var targetGroup=null, targetItem=null, before=true;
    if(groupOverRef){ targetGroup=groupOverRef.dataset.group; }
    else if(dropElRef){ targetItem=dropElRef; targetGroup=groupNameOf(dropElRef); before=beforeRef; }
    if(targetGroup!=null && targetGroup!==g){ setProtoGroup(id,targetGroup); }
    if(targetItem){
      var orderedIds=[];
      list.querySelectorAll('.side-item.manage').forEach(function(it){
        if(it.dataset.id===id)return;
        if(before && it===targetItem)orderedIds.push(id);
        orderedIds.push(it.dataset.id);
        if(!before && it===targetItem)orderedIds.push(id);
      });
      setProtoOrder(orderedIds);
    }
    edSaveAll();
    renderSidebar();
    showToast('已调整原型顺序 / 分类');
  }
  list.addEventListener('mousedown',onDown);
  _sidebarDrag=function(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    list.removeEventListener('mousedown',onDown);
  };
}

/* ---------- 对外暴露（供 renderPane / renderSidebar 的按钮调用） ---------- */
window.edOpen=edOpen;
window.edDeleteHs=edDeleteHs;
window.edRelocate=edRelocate;
window.edSaveAll=edSaveAll;
window.edToday=edToday;

/* ---------- 启动：恢复本地改动 ---------- */
edBind();
edApplyImportedData(); edApplyNavData(); edApplyDataImported(); edApplyDataEdits();   /* 合并文件级左导航结构段，编辑版自身也以文件为权威源 */
if(edLoadAll()){
  edEnsureCats();
  renderSidebar();
  var still=PROTOTYPES.some(function(p){return p.id===state.currentId;});
  if(!still){
    if(PROTOTYPES.length){ state.currentId=null; selectPrototype(PROTOTYPES[0].id); }
  }else{
    renderPRD(); renderHotspots(); scheduleUpdatePositions();
  }
  showToast('已载入本地编辑数据');
}else{
  /* 首次访问（如 GitHub 静态托管的新访客，无本地缓存）：仍须渲染内置 + 导入的静态数据 */
  edEnsureCats();
  renderSidebar();
  if(PROTOTYPES.length){ state.currentId=null; selectPrototype(PROTOTYPES[0].id); }
}
})();
