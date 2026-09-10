
/* ============================================================
   一、原型数据：每个原型一份配置（单一数据源，同时驱动热点与 PRD）
   接入自己的原型时：把 srcdoc 换成 url:'你的原型地址'，
   再按同样结构写 overview / flow / hotspots 即可。
   ============================================================ */
const TYPE_META={
  element:{label:'界面组件',cls:'element'},
  rule:{label:'业务规则',cls:'rule'},
  field:{label:'数据字段',cls:'field'}
};

/* ============================================================
   二、全局状态与 DOM
   ============================================================ */
const state={
  currentId:null,       // 当前原型 id；'__guide__' 为指南页
  tab:'overview',
  annotation:true,
  device:'desktop',
  tour:false,
  tourIdx:0,
  tourFilter:'all',     // 走查范围过滤：'all' 全部 / 'element' 仅界面组件
  openId:null,
  keyword:'',
  slideIndex:0
};
const $=id=>document.getElementById(id);
const stage=$('stage'),device=$('device'),frame=$('protoFrame'),layer=$('hotspotLayer'),fixedLayer=$('hotspotFixedLayer'),
      hsPop=$('hsPop'),spotMask=$('spotMask'),spotHole=$('spotHole'),tourCard=$('tourCard');

/* ============================================================
   三、左侧目录
   ============================================================ */
/* 分组归一化：忽略空格 / 中英文分隔符差异，并把「顾客端」视为「用户端」，
   避免同一端因历史命名不同在左栏出现两个分组 */
function groupKey(g){
  return String(g==null?'':g).replace(/[\s\u00b7\u2022\u30fb\-\u2014_()\uff08\uff09]/g,'').replace(/\u987e\u5ba2\u7aef/g,'\u7528\u6237\u7aef').toLowerCase();
}
function groups(){
  const m=new Map(); const canon=new Map();
  const add=g=>{ const k=groupKey(g); if(!canon.has(k)){ canon.set(k,g); m.set(g,[]); } };
  (window.ED&&window.ED.cats||[]).forEach(add);
  PROTOTYPES.forEach(p=>add(p.group||UNCAT));
  /* 保持原型在 PROTOTYPES 全局数组中的顺序，分组内按 PROTOTYPES 索引排序 */
  PROTOTYPES.forEach((p,idx)=>{ const name=canon.get(groupKey(p.group||UNCAT)); if(m.has(name))m.get(name).push({p,idx}); });
  const out=new Map();
  m.forEach((arr,g)=>out.set(g,arr.sort((a,b)=>a.idx-b.idx).map(x=>x.p)));
  return out;
}
function setProtoOrder(orderedIds){
  const byId={}; PROTOTYPES.forEach((p,i)=>byId[p.id]=i);
  const tail=PROTOTYPES.filter(p=>orderedIds.indexOf(p.id)<0);
  const head=orderedIds.map(id=>PROTOTYPES[byId[id]]).filter(Boolean);
  PROTOTYPES.length=0; head.concat(tail).forEach(p=>PROTOTYPES.push(p));
  edPersistNav();
}
function setProtoGroup(pid,g){ const p=PROTOTYPES.find(x=>x.id===pid); if(p){p.group=g; p.updated=edToday(); edSaveAll(); edPersistNav();} }
function getVisibleProtos(){
  const kw=state.keyword.trim().toLowerCase();
  const list=[];
  groups().forEach(plist=>{
    plist.forEach(p=>{
      if(!kw){list.push(p);return;}
      const hay=(p.name+p.group+JSON.stringify(p.hotspots.map(h=>h.title)).toLowerCase()).toLowerCase();
      if(hay.includes(kw))list.push(p);
    });
  });
  return list;
}
function switchProto(d){
  if(state.currentId==='__guide__')return;
  const list=getVisibleProtos();
  if(list.length<2)return;
  const idx=list.findIndex(p=>p.id===state.currentId);
  if(idx<0)return;
  const next=list[(idx+d+list.length)%list.length];
  selectPrototype(next.id);
}
function renderSidebar(){
  const kw=state.keyword.trim().toLowerCase();
  let html='';
  groups().forEach((list,gname)=>{
    const items=list.filter(p=>{
      if(!kw)return true;
      const hay=(p.name+p.group+JSON.stringify(p.hotspots.map(h=>h.title)).toLowerCase()).toLowerCase();
      return hay.includes(kw);
    });
    if(!items.length)return;
    html+='<div class="side-group"><div class="side-group-name" data-group="'+gname+'">'+gname+'</div>';
    items.forEach(p=>{
      const manage=window.ED&&window.ED.manage;
      const active=p.id===state.currentId?'active':'';
      const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
      const catOpts=(window.ED&&Array.isArray(window.ED.cats)?window.ED.cats:[]).map(function(c){
        return '<option value="'+c.replace(/"/g,'&quot;')+'"'+(c===p.group?' selected':'')+'>'+c+'</option>';
      }).join('');
      const orderVal=PROTOTYPES.indexOf(p)+1;
      html+='<div class="side-item '+active+(manage?' manage':'')+'" data-id="'+p.id+'" data-group="'+p.group+'" role="button" tabindex="0">'+
        '<span class="side-ico">'+icon+'</span>'+
        '<span class="side-meta"><div class="side-name">'+p.name+'</div>'+
        (manage
          ? '<div class="si-edit">'+
              '<select class="si-cat" data-id="'+p.id+'" title="选择分类">'+catOpts+'</select>'+
              '<label class="si-ord" title="顺序值：数字越小越靠前（全局顺序）"><span class="si-ord-t">排序</span><input type="number" class="si-order" data-id="'+p.id+'" value="'+orderVal+'" min="1" step="1"></label>'+
              '<span class="si-acts"><button class="si-del" data-del="'+p.id+'" title="删除该原型"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg></button></span>'+
            '</div>'
          : '')+
        '</span>'+
        '</div>';
    });
    html+='</div>';
  });
  if(!html)html='<div class="empty-hint">没有匹配的原型 / 标注</div>';
  $('sideList').innerHTML=html;
  $('protoTotal').textContent=PROTOTYPES.length+' 个页面';
  document.querySelectorAll('.side-item').forEach(el=>{
    el.addEventListener('click',e=>{ if(e.target.closest('.si-acts')||e.target.closest('.si-edit'))return; selectPrototype(el.dataset.id); });
  });
  document.querySelectorAll('.side-item.manage').forEach(function(el){
    const id=el.dataset.id;
    const sel=el.querySelector('.si-cat');
    if(sel)sel.addEventListener('change',function(){ setProtoGroup(id, sel.value); renderSidebar(); showToast('已改分类：'+sel.value); });
    const ord=el.querySelector('.si-order');
    if(ord)ord.addEventListener('change',function(){
      let n=parseInt(ord.value,10); if(isNaN(n)||n<1)n=1;
      const ids=PROTOTYPES.map(p=>p.id); const cur=ids.indexOf(id);
      if(cur<0)return; ids.splice(cur,1); n=Math.min(n,ids.length+1); ids.splice(n-1,0,id);
      setProtoOrder(ids); renderSidebar(); showToast('已调整排序值');
    });
  });
  if(window.ED&&window.ED.manage){ if(window.edBindSidebarDrag)window.edBindSidebarDrag(); } else { if(window.edUnbindSidebarDrag)window.edUnbindSidebarDrag(); }
}
$('sideSearch').addEventListener('input',e=>{state.keyword=e.target.value;renderSidebar();});
$('guideBtn').addEventListener('click',()=>selectPrototype('__guide__'));

/* ============================================================
   四、中间舞台：加载原型 + 渲染热点
   ============================================================ */
function current(){return PROTOTYPES.find(p=>p.id===state.currentId);}
/* 多图原型（幻灯片）：images 长度 > 1 */
function isMultiImage(p){ return !!(p&&p.kind==='image'&&p.images&&p.images.length>1); }
/* 当前幻灯片可见的标注集合：多图原型只显示本张的标注，单图原型显示全部 */
function visibleHotspots(p){
  if(!p)return [];
  if(isMultiImage(p)) return p.hotspots.filter(h=>(h.slide||0)===state.slideIndex);
  return p.hotspots;
}

function playPageTransition(swapCb){
  const ov=$('pageTransition'),logo=$('ptLogo'),glow=$('ptGlow'),ring=$('ptRing'),txt=$('ptText');
  if(typeof gsap==='undefined'){ if(swapCb)swapCb(); return; }
  const token=++playPageTransition.token;
  if(window.__ptTl) window.__ptTl.kill();
  gsap.set([logo,glow,ring,txt],{clearProps:'all'});
  const tl=window.__ptTl=gsap.timeline();
  /* 舒缓版：约 0.7s，平滑淡入淡出、无弹跳、小幅旋转，避免晃眼 */
  tl.fromTo(ov,{autoAlpha:0},{autoAlpha:1,duration:0.22,ease:'power1.out'})
    .fromTo(glow,{scale:0.6,autoAlpha:0},{autoAlpha:0.8,scale:1,duration:0.34,ease:'power1.out'},0.02)
    .fromTo(ring,{scale:0.82,autoAlpha:0,rotation:-40},{scale:1,autoAlpha:1,rotation:0,duration:0.36,ease:'power2.out'},0.06)
    .fromTo(logo,{scale:0.88,autoAlpha:0,y:6},{scale:1,autoAlpha:1,y:0,duration:0.36,ease:'power2.out'},0.10)
    .fromTo(txt,{autoAlpha:0,y:5},{autoAlpha:0.8,y:0,duration:0.30,ease:'power1.out'},0.22)
    .add(function(){ if(token===playPageTransition.token && swapCb) swapCb(); },0.32)
    .to([logo,txt],{autoAlpha:0,duration:0.32,ease:'power1.in'},'+=0.08')
    .to([ring,glow],{autoAlpha:0,duration:0.36,ease:'power1.in'},'<')
    .to(ov,{autoAlpha:0,duration:0.34,ease:'power1.in'},'-=0.18');
}
playPageTransition.token=0;
function selectPrototype(id){
  closeHsPop();endTour();
  if(id===state.currentId) return; // 已在当前原型，避免重复切换动画
  state.currentId=id;state.openId=null;   /* tab 不重置：跨页保持上次所在 tab（state.tab 由 switchTab 维护） */
  document.querySelectorAll('.prd-tab').forEach(t=>t.classList.toggle('on',t.dataset.pane===state.tab));
  const isGuide=id==='__guide__';
  device.style.display=isGuide?'none':'flex';
  $('guideView').classList.toggle('show',isGuide);
  /* —— 同步渲染：不依赖过渡动画回调，保证切页立即刷新右侧内容 / 目录 / 热点（tab 保持 state.tab 不变） —— */
  if(isGuide){
    renderGuide();
  }else{
    const p=current();
    state.device=p.device||'desktop';applyDevice();
    state._scrollContainer=null;
    if(p.kind==='image'){
      frame.style.display='none';
      $('protoImg').style.display='block';
      showImageSlide(0);
    }else{
      $('protoImg').style.display='none';
      $('slideBar').hidden=true;
      frame.style.display='';
      if(p.srcdoc){frame.srcdoc=p.srcdoc;$('frameUrl').textContent='prototype://'+p.id;}
      else if(p.url){frame.src=p.url;$('frameUrl').textContent=p.url;}
    }
  }
  renderSidebar();renderPRD();renderHotspots();updateTopMeta();
  if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);
  // 切换原型过渡动画（playPageTransition）已关闭，仅保留标注位置重算
  setTimeout(scheduleUpdatePositions,200);
}
  /* 原型内部链接跳转 → 同步切换左右栏（左目录 + 右 PRD）；外部链接（basename 不匹配任一原型）不切换 */
  function frameHrefToProto(raw){
    if(!raw||raw.charAt(0)==='#'||/^(javascript:|mailto:|tel:)/i.test(raw)||/^https?:\/\//i.test(raw)||raw.indexOf('//')===0) return null;
    const base=raw.split('/').pop().split('?')[0].split('#')[0];
    if(!base) return null;
    return PROTOTYPES.find(p=>{ const u=(p.url||'').split('/').pop(); return !!u && u===base; })||null;
  }
  function syncSidesFromFrame(){
    const fr=document.getElementById('protoFrame'); if(!fr)return;
    let doc; try{ doc=fr.contentDocument; }catch(e){ return; }
    if(!doc||!doc.location) return;
    const href=doc.location.href||'';
    if(!href||href==='about:blank'||href.indexOf('srcdoc')>-1) return;
    const hit=frameHrefToProto(href);
    if(hit && hit.id!==state.currentId) selectPrototype(hit.id);
  }
  /* 在 iframe 内部拦截 <a> 点击：内部原型链接接管导航并同步左右栏；外部链接放行 */
  function bindFrameInternalNav(){
    const fr=document.getElementById('protoFrame'); if(!fr)return;
    syncSidesFromFrame();
    let idoc; try{ idoc=fr.contentDocument; }catch(e){ return; }
    if(!idoc) return;
    idoc.addEventListener('click',function(ev){
      const t=ev.target; const a=t&&t.closest?t.closest('a'):null; if(!a) return;
      const raw=a.getAttribute('href')||'';
      const hit=frameHrefToProto(raw);
      if(!hit) return; /* 外部链接：不拦截、不切换 */
      ev.preventDefault();
      if(hit.id!==state.currentId) selectPrototype(hit.id);
      else if(a.getAttribute('target')!=='_blank'){ fr.src=hit.url; }
    }, true);
  }
  document.getElementById('protoFrame').addEventListener('load', bindFrameInternalNav);

/* 切换 / 渲染图片原型当前幻灯片。多图原型会变为幻灯片模式 */
function showImageSlide(idx){
  var p=current(); if(!p||p.kind!=='image')return;
  var imgs=(p.images&&p.images.length)?p.images:[p.image];
  if(idx<0||idx>=imgs.length)idx=0;
  state.slideIndex=idx;
  try{ closeHsPop(); }catch(e){}
  var img=$('protoImg');
  img.onload=function(){ fitImageStage(); scheduleUpdatePositions(); };
  img.src=imgs[idx];
  img.style.display='block';
  $('frameUrl').textContent=p.name+'（图片'+(isMultiImage(p)?(' · 幻灯片 '+(idx+1)+'/'+imgs.length):'')+'）';
  renderSlideBar();
  renderHotspots();
  renderPRD();
}
/* 幻灯片 / 图片原型：外壳同手机（8px 边框），宽度 = 图片自然内容宽（窄于手机外框）；
   因 box-sizing:border-box，设备宽度需 +16px 边框，使图片内容恰好按自然宽完整展示。
   图片过长时由内部 .img-scroll 纵向滚动查看。切页 / 切图 / 切换设备 / 窗口缩放都会触发 */
function fitImageStage(){
  var p=current();
  if(!p || p.kind!=='image'){
    device.classList.remove('img-mode');
    device.style.width='';
    return;
  }
  device.classList.add('img-mode');
  var border=16;                            /* 8px*2 设备边框，从舞台可用宽中扣除 */
  var sw=$('stage').clientWidth||0;
  if(sw<120){                                  /* 舞台尚未完成布局（宽度 0）：先不写死宽度，避免误设成最小宽后残留到切页 */
    device.style.width='';scheduleUpdatePositions();return;
  }
  var avail=sw-56-border;                      /* 舞台可用宽 - 边框，作为图片内容上限，防横向溢出 */
  if(avail<320)avail=320;
  /* 图片原型外壳宽度统一按设备类型标准宽（mobile 414 / tablet 768 / desktop 1280），
     不再跟随图片自然宽，避免不同截图原始尺寸导致舞台设备框宽度不一致（如“导购入口”与“意向单入口”宽度不一） */
  var baseW = state.device==='desktop'?1280 : state.device==='tablet'?768 : 414;
  var w=Math.min(baseW,avail);
  device.style.width=(w+border)+'px';          /* 加回边框：图片按设备标准宽完整展示 */
  scheduleUpdatePositions();
}
/* 渲染幻灯片控制条（仅多图显示），并绑定圆点跳转 */
function renderSlideBar(){
  var p=current(), bar=$('slideBar');
  if(!p||p.kind!=='image'||!isMultiImage(p)){ bar.hidden=true; return; }
  bar.hidden=false;
  var n=p.images.length;
  $('slideCounter').textContent=(state.slideIndex+1)+' / '+n;
  var dots=$('slideDots'); dots.innerHTML='';
  for(var i=0;i<n;i++){
    (function(i){
      var d=document.createElement('button');
      d.className='slide-dot'+(i===state.slideIndex?' on':'');
      d.dataset.idx=i; d.title='第 '+(i+1)+' 张';
      d.addEventListener('click',function(){ showImageSlide(i); });
      dots.appendChild(d);
    })(i);
  }
}
/* 上一张 / 下一张（循环） */
function slideGo(dir){
  var p=current(); if(!isMultiImage(p))return;
  var n=p.images.length, idx=(state.slideIndex+dir+n)%n;
  showImageSlide(idx);
}
function applyDevice(){
  device.className='device '+state.device;
  document.querySelectorAll('#deviceSeg button').forEach(b=>b.classList.toggle('on',b.dataset.device===state.device));
  /* 图片 / 幻灯片原型：恢复自适应宽度 + 内部滚动 */
  if(current() && current().kind==='image'){ device.classList.add('img-mode'); fitImageStage(); }
  else{
    /* 非图片原型：必须清掉上一个原型遗留的 inline 宽度 / zoom / transform，
       把宽度交回 CSS 设备类（.device.mobile 414px / .tablet 768px），
       否则切页后会残留上次算出的宽度（表现为手机外壳变窄），要再切一次页才恢复 */
    device.classList.remove('img-mode');
    device.style.width='';device.style.zoom='';device.style.transform='';device.style.transformOrigin='';
  }
  fitDesktop();
}
/* PC 端（desktop 设备）按真实桌面宽度渲染，再用 zoom 缩放适配中间区：
   保证 iframe 视口达 1280px（≥ md 断点 → 侧栏可见、桌面布局完整），
   同时整体缩放进展示区，不溢出、无需滚动条 */
function fitDesktop(){
  if(current() && current().kind==='image') return;
  if(state.device!=='desktop'){
    /* 非桌面设备：宽度由 CSS 设备类决定，这里清掉桌面模式遗留的 zoom / transform（双保险） */
    device.style.zoom='';device.style.transform='';device.style.transformOrigin='';
    return;
  }
  var DESIGN=1280;
  device.style.width=DESIGN+'px';
  var avail=stage.clientWidth-56; if(avail<320)avail=320;
  var s=Math.min(1, avail/DESIGN);
  try{ device.style.zoom=String(s); device.style.transform=''; }
  catch(err){ device.style.zoom=''; device.style.transform='scale('+s+')'; device.style.transformOrigin='top center'; }
}
document.querySelectorAll('#deviceSeg button').forEach(b=>b.addEventListener('click',()=>{
  state.device=b.dataset.device;applyDevice();
}));
/* 幻灯片：上一张 / 下一张 */
$('slidePrev').addEventListener('click',function(){ slideGo(-1); });
$('slideNext').addEventListener('click',function(){ slideGo(1); });
/* 幻灯片：滑动手势切换（触摸 / 鼠标拖拽）。横向滑动切图，纵向滑动仍交给原生滚动看长图 */
function bindSlideGesture(){
  var el=$('imgScroll'); if(!el)return;
  var sx=0,sy=0,pid=null,locked=null;
  el.addEventListener('pointerdown',function(e){
    if(!isMultiImage(current())){ pid=null; return; }   /* 单图原型不启用手势 */
    pid=e.pointerId; sx=e.clientX; sy=e.clientY; locked=null;
  });
  el.addEventListener('pointermove',function(e){
    if(e.pointerId!==pid||locked!==null)return;
    var dx=e.clientX-sx, dy=e.clientY-sy;
    if(Math.abs(dx)<8&&Math.abs(dy)<8)return;            /* 小于 8px 视为抖动，暂不判定方向 */
    locked=Math.abs(dx)>Math.abs(dy)?'h':'v';             /* 横向主导→切图；纵向主导→交给滚动 */
  });
  function end(e){
    if(e.pointerId!==pid)return;
    var dx=e.clientX-sx;
    if(locked==='h'&&Math.abs(dx)>=40) slideGo(dx<0?1:-1); /* 左滑下一张 / 右滑上一张（阈值 40px） */
    pid=null; locked=null;
  }
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',function(){ pid=null; locked=null; });
  /* 触控板两指滑动切换（wheel 事件带 deltaX）。
     注意：触控板横滑时手指常带纵向分量，若要求 |deltaX|>|deltaY| 会误判为纵向、被浏览器拿去滚图片。
     故改为：横向分量绝对值明显(≥45)且非“纵向绝对主导”(dy<dx*3)即判横向意图→切图并 preventDefault 阻止滚动；
     横向极小(≈0)则交给原生纵向滚动长图；节流 500ms 防一次甩动连切多张 */
  var lastWheel=0;
  el.addEventListener('wheel',function(e){
    if(!isMultiImage(current()))return;
    if(state.annotation)return;                                  /* 标注模式下不切图（由标注层接管交互） */
    var adx=Math.abs(e.deltaX), ady=Math.abs(e.deltaY);
    if(adx<45)return;                                             /* 横向不明显：交给原生纵向滚动长图 / 鼠标滚轮不切 */
    if(ady>adx*3)return;                                          /* 纵向绝对主导(dy 远大于 dx)：原生滚动，不切 */
    e.preventDefault();                                           /* 横向意图明确：阻止容器/页面滚动，改为切图 */
    var now=Date.now();
    if(now-lastWheel<500)return;                                  /* 节流：一次连续滑动只切一张 */
    lastWheel=now;
    slideGo(e.deltaX<0?1:-1);                                     /* 左滑(deltaX<0)下一张 / 右滑上一张 */
  },{passive:false});
}
bindSlideGesture();
document.addEventListener('keydown',function(e){
  if($('edModal').classList.contains('show'))return;
  var p=current(); if(!isMultiImage(p))return;
  if(e.key==='ArrowLeft'){ slideGo(-1); }
  else if(e.key==='ArrowRight'){ slideGo(1); }
});
$('frameRefresh').addEventListener('click',()=>{const p=current();if(!p)return;
  if(p.kind==='image'){const img=$('protoImg');if(img)img.src=(p.images&&p.images[state.slideIndex])||p.image;showToast('图片已重载');return;}
  if(p.srcdoc)frame.srcdoc=p.srcdoc;else frame.src=p.url;showToast('原型已重载');});
$('frameOpen').addEventListener('click',()=>{const p=current();if(!p||!p.url){showToast('内置示例原型仅在框架内展示，外部原型可新窗口打开');return;}window.open(p.url,'_blank');});
$('annoToggle').addEventListener('click',()=>{
  state.annotation=!state.annotation;
  stage.classList.toggle('hidden-annotations',!state.annotation);
  $('annoToggle').classList.toggle('on',state.annotation);
  if(!state.annotation)closeHsPop();
  showToast(state.annotation?'已开启标注层':'已隐藏标注层');
});

/* ===== 热点实时定位系统：绑定 iframe 内部 DOM 元素，getBoundingClientRect 实时计算 ===== */
/* 找到 iframe 内部真正的滚动容器（原型常在 div 内滚动而非 window） */
function findScrollContainer(idoc){
  try{
    const win=idoc.defaultView;
    const list=idoc.querySelectorAll('div,section,main,ul');
    for(const el of list){
      const st=win.getComputedStyle(el);
      if((st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+10)return el;
    }
    const de=idoc.scrollingElement||idoc.documentElement;
    if(de&&de.scrollHeight>de.clientHeight+10)return de;
  }catch(e){}
  return null;
}
/* 从目标元素实时向上找可滚动祖先——不依赖 load 时缓存，规避 Tailwind JIT 延迟导致找不到容器 */
function findScrollableAncestor(el,idoc){
  try{
    const win=idoc.defaultView;
    let node=el&&el.parentNode;
    while(node&&node!==idoc.body&&node!==idoc.documentElement&&node.nodeType===1){
      const st=win.getComputedStyle(node);
      if((st.overflowY==='auto'||st.overflowY==='scroll')&&node.scrollHeight>node.clientHeight+4)return node;
      node=node.parentNode;
    }
  }catch(e){}
  return null;
}
/* 计算元素相对其滚动容器视口的位置与是否已在可视带 */
function visibilityInScroller(el,sc,margin){
  const er=el.getBoundingClientRect(),sr=sc.getBoundingClientRect();
  const relTop=er.top-sr.top,relBottom=er.bottom-sr.top;
  return {relTop,relBottom,vh:sc.clientHeight,
          visible:relTop>=margin&&relBottom<=sc.clientHeight-margin};
}
function getScrollTop(){
  try{
    if(state._scrollContainer)return state._scrollContainer.scrollTop||0;
    const iwin=frame.contentWindow;return iwin.scrollY||iwin.pageYOffset||0;
  }catch(e){return 0;}
}
function getImgRect(){
  var img=$('protoImg');
  if(!img||img.style.display==='none'||!img.offsetWidth)return null;
  var dw=img.clientWidth, dh=img.clientHeight;
  var nw=img.naturalWidth||dw, nh=img.naturalHeight||dh, w,dw2,h,left=0,top=0;
  if(nh>0 && nw>0){
    if(nw/nh > dw/dh){ w=dw; h=dw/(nw/nh); top=(dh-h)/2; }
    else { h=dh; w=dh*(nw/nh); left=(dw-w)/2; }
  }else{ w=dw; h=dh; }
  return {left:img.offsetLeft+left, top:img.offsetTop+top, w:w, h:h};
}
function getHotspotPixelPos(h){
  const p=current();
  if(p && p.kind==='image'){
    const ir=getImgRect();
    if(ir) return {x:ir.left+ir.w*(h.x||0)/100, y:ir.top+ir.h*(h.y||0)/100,
      w:ir.w*(h.w||0)/100, h:ir.h*(h.h||0)/100, found:false, inView:true};
  }
  const dw=device.clientWidth,dh=device.clientHeight;
  /* 编辑版修正：iframe 位于 device 内部、上方有设备栏（桌面模式 34px），
     故 iframe 视口坐标需加上 iframe 在 device 内的偏移，才能与标注层对齐 */
  const offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
  /* 优先：CSS 选择器绑定 iframe 内部真实元素，位置绝对精确 */
    if(h.selector){
      try{
        const idoc=frame.contentDocument;
        const el=idoc.querySelector(h.selector);
        if(el){
          const r=el.getBoundingClientRect();
          if(r.width>0||r.height>0){
            const vw=frame.clientWidth||dw, vh=frame.clientHeight||dh;
            const inView = r.bottom>0 && r.top<vh && r.right>0 && r.left<vw;
            return {x:r.left+r.width/2+offX,y:r.top+r.height/2+offY,w:r.width,h:r.height,found:true,inView:inView};
          }
        }
      }catch(e){}
    }
    /* 降级：百分比坐标，非 fixed 元素减去滚动偏移 */
    let px=dw*h.x/100+offX,py=dh*h.y/100+offY;
    if(!h.fixed){py-=getScrollTop();}
    return {x:px,y:py,w:h.w?dw*h.w/100:0,h:h.h?dh*h.h/100:0,found:false,inView:true};
}
function isHotspotLayerCovered(h){
  /* 原型内更高层级遮挡判定：标注绑定在原型元素上时，若其位置被原型页面内
     更上层的元素（弹窗/抽屉/遮罩等）盖住，则视为被遮挡，应隐藏。
     仅在 iframe 同源可访问时生效；file:// 跨域或图片原型降级为「不隐藏」。 */
  var p=current(); if(!p) return false;
  if(p.kind==='image') return false;
  var idoc; try{ idoc=frame.contentDocument; }catch(e){ return false; }
  if(!idoc) return false;
  var pos; try{ pos=getHotspotPixelPos(h); }catch(e){ return false; }
  if(!pos || pos.x==null || pos.y==null) return false;
  var offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
  var vx=pos.x-offX, vy=pos.y-offY;            /* 换算成 iframe 视口坐标 */
  var vw=frame.clientWidth||device.clientWidth, vh=frame.clientHeight||device.clientHeight;
  if(vx<0||vy<0||vx>vw||vy>vh) return false;   /* 视口外交给 inView 处理 */
  var topEl; try{ topEl=idoc.elementFromPoint(vx,vy); }catch(e){ return false; }
  if(!topEl) return false;
  if(h.selector){
    var target=null; try{ target=idoc.querySelector(h.selector); }catch(e){}
    if(target){
      var n=topEl;
      while(n){ if(n===target) return false; n=n.parentElement; }
      return true;   /* 命中点不在被绑定元素内部 → 被其它层级覆盖 */
    }
    return false;    /* 取不到绑定元素时不强行隐藏 */
  }
  /* 百分比坐标（非 selector 绑定）：仅当命中带 z-index 的浮动层才隐藏 */
  try{
    var cs=idoc.defaultView.getComputedStyle(topEl);
    var pc=cs.position, z=parseInt(cs.zIndex,10);
    var tag=topEl.tagName?topEl.tagName.toLowerCase():"";
    if((pc==='fixed'||pc==='absolute') && !isNaN(z) && z>0 && tag!=='body' && tag!=='html') return true;
  }catch(e){}
  return false;
}
/* ---------- 组件标注引脚定位：优先组件右上角外侧，不可用则自动换角 ---------- */
/* 浮动层遮挡判定：某坐标是否被原型页面内带 z-index 的弹窗/遮罩等浮动层盖住。
   注意：角避让的点本就在组件外侧，不能用「是否命中绑定元素」判定，否则四角都会被误判。 */
function isPointOccludedByFloat(x,y){
  var p=current(); if(!p) return false;
  if(p.kind==='image') return false;
  var idoc; try{ idoc=frame.contentDocument; }catch(e){ return false; }
  if(!idoc) return false;
  var offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
  var vx=x-offX, vy=y-offY;
  var vw=frame.clientWidth||device.clientWidth, vh=frame.clientHeight||device.clientHeight;
  if(vx<0||vy<0||vx>vw||vy>vh) return false;        /* 视口外交给边界检查处理 */
  var topEl; try{ topEl=idoc.elementFromPoint(vx,vy); }catch(e){ return false; }
  if(!topEl) return false;
  try{
    var cs=idoc.defaultView.getComputedStyle(topEl);
    var pc=cs.position, z=parseInt(cs.zIndex,10);
    var tag=topEl.tagName?topEl.tagName.toLowerCase():"";
    if((pc==='fixed'||pc==='absolute') && !isNaN(z) && z>0 && tag!=='body' && tag!=='html') return true;
  }catch(e){}
  return false;
}
/* 引脚落位是否可用：在可视范围内（留 PAD 边距）且未被浮动层遮挡 */
function pinSpotUsable(x,y,pad){
  var W=device.clientWidth||0, H=device.clientHeight||0;
  if(W&&H&&(x<pad||y<pad||x>W-pad||y>H-pad)) return false;
  return !isPointOccludedByFloat(x,y);
}
/* 引脚锚点：界面组件(element)放组件右上角外侧；右上角放不下/被遮挡则依次换
   左上 → 右下 → 左下；其它类型（规则/字段）不参与原型内标注。 */
function getPinAnchor(h,pos){
  if(h.type!=='element') return {x:pos.x,y:pos.y};
  var GAP=13, PAD=16;
  var w=(pos.w>0)?pos.w:0, hh=(pos.h>0)?pos.h:0;
  var left=pos.x-w/2, top=pos.y-hh/2, right=pos.x+w/2, bottom=pos.y+hh/2;
  var cands=[
    {x:right+GAP, y:top-GAP},      /* 右上角外（首选） */
    {x:left-GAP,  y:top-GAP},      /* 左上角外 */
    {x:right+GAP, y:bottom+GAP},   /* 右下角外 */
    {x:left-GAP,  y:bottom+GAP}    /* 左下角外 */
  ];
  for(var i=0;i<cands.length;i++){
    if(pinSpotUsable(cands[i].x,cands[i].y,PAD)) return cands[i];
  }
  return cands[0];
}
let _rafPos=null;
function scheduleUpdatePositions(){
  if(_rafPos)return;
  _rafPos=requestAnimationFrame(()=>{_rafPos=null;updateHotspotPositions();});
}
function updateHotspotPositions(){
  const p=current();if(!p)return;
  /* 1) 收集当前已打开弹窗的覆盖矩形（用于遮挡判定） */
  const modalRects=[];
  const offX=frame.offsetLeft||0, offY=frame.offsetTop||0;
  p.hotspots.forEach(mh=>{
    if(isMultiImage(p)&&(mh.slide||0)!==state.slideIndex)return;
    if(!mh.modal)return;
    const sel=mh.modalEl||mh.selector;
    try{
      const el=frame.contentDocument.querySelector(sel);
      if(el && !el.classList.contains('hidden')){
        const r=el.getBoundingClientRect();
        /* 编辑版修正：弹窗矩形换算到标注层（device）坐标系，与 getHotspotPixelPos 一致 */
        if(r.width>0||r.height>0)modalRects.push({left:r.left+offX,right:r.right+offX,top:r.top+offY,bottom:r.bottom+offY});
      }
    }catch(e){}
  });
  const covered=(x,y)=>modalRects.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);
  /* 2) 逐热点计算可见性与定位 */
  p.hotspots.forEach(h=>{
    /* 规则 / 字段 不在原型页面内做标注，跳过定位与显隐 */
    if(h.type!=='element')return;
    if(isMultiImage(p)&&(h.slide||0)!==state.slideIndex)return;
    const pos=getHotspotPixelPos(h);
    const parent=h.fixed?fixedLayer:layer;
    const hsEl=parent.querySelector('.hs[data-id="'+h.id+'"]');
    const rgEl=parent.querySelector('.hs-region[data-id="'+h.id+'"]');
    const occluded=isHotspotLayerCovered(h);
    let vis;
    if(h.modal){
      /* 弹窗类：仅在弹窗已打开时显示标注 */
      vis=pos.found && !occluded;
    }else if(!pos.found){
      /* 降级坐标：无弹窗遮挡即显示（无法判断滚动出屏） */
      vis=!covered(pos.x,pos.y) && !occluded;
    }else{
      /* 组件类：滚动出屏幕 / 被弹窗遮挡 时隐藏 */
      vis=pos.inView && !covered(pos.x,pos.y) && !occluded;
    }
    if(hsEl)hsEl.style.display=vis?'':'none';
    if(rgEl)rgEl.style.display=(vis&&pos.w>0)?'':'none';
    if(!vis)return;
    if(hsEl){const anchor=getPinAnchor(h,pos);hsEl.style.left=anchor.x+'px';hsEl.style.top=anchor.y+'px';}
    if(rgEl&&pos.w>0){
      rgEl.style.left=(pos.x-pos.w/2)+'px';rgEl.style.top=(pos.y-pos.h/2)+'px';
      rgEl.style.width=pos.w+'px';rgEl.style.height=pos.h+'px';
    }
  });
  if(state.openId){const h=p.hotspots.find(x=>x.id===state.openId);if(h)positionPop(h);}
  if(state.tour)renderTourStep();
}
/* 三重实时重算：窗口 resize + iframe 内部 scroll + DOM 变化 */
window.addEventListener('resize',scheduleUpdatePositions);
window.addEventListener('resize',fitImageStage);
window.addEventListener('resize',fitDesktop);
frame.addEventListener('load',()=>{
  try{
    const iwin=frame.contentWindow,idoc=frame.contentDocument;
    iwin.addEventListener('scroll',scheduleUpdatePositions,{passive:true});
    /* 捕获阶段监听：scroll 不冒泡，capture 可捕获任意内部 div 容器的滚动，免去逐个绑定 */
    idoc.addEventListener('scroll',scheduleUpdatePositions,{capture:true,passive:true});
    state._scrollContainer=findScrollContainer(idoc);
    if(state._scrollContainer){
      state._scrollContainer.addEventListener('scroll',scheduleUpdatePositions,{passive:true});
    }
    if(window.MutationObserver){
      const mo=new MutationObserver(scheduleUpdatePositions);
      mo.observe(idoc.body,{childList:true,subtree:true,attributes:true,characterData:true});
    }
  }catch(e){}
  /* Tailwind CDN JIT 延迟应用样式，分多次重新定位主滚动容器并刷新坐标 */
  [120,350,700,1200].forEach(t=>setTimeout(()=>{
    try{
      const idoc=frame.contentDocument;
      if(!state._scrollContainer)state._scrollContainer=findScrollContainer(idoc);
      scheduleUpdatePositions();
    }catch(e){}
  },t));
});



function renderHotspots(){
  layer.innerHTML='';fixedLayer.innerHTML='';
  const p=current();if(!p){return;}
  edEnsureHotspotNums(p);
  const vis=visibleHotspots(p);
  vis.forEach((h,i)=>{
    /* 规则 / 字段 不在原型页面内做标注，仅在右侧栏列表中呈现 */
    if(h.type!=='element')return;
    const pos=getHotspotPixelPos(h);
    const anchor=getPinAnchor(h,pos);
    const el=document.createElement('div');
    el.className='hs';el.dataset.id=h.id;el.dataset.type=h.type;
    el.style.left=anchor.x+'px';el.style.top=anchor.y+'px';
    const dnum=(h.num!=null&&h.num!=='')?h.num:(i+1);
    el.innerHTML='<div class="hs-pin" title="点击修改标注编号"><span class="hs-pin-num">'+dnum+'</span></div>';
    var pin=el.querySelector('.hs-pin');
    /* 标注圆圈本身朝向区域的角为方角，充当箭头：旋转让左下(BL)方角指向区域中心 */
    var _dx=pos.x-anchor.x, _dy=pos.y-anchor.y;
    el.style.setProperty('--pin-rot',(Math.atan2(-_dx,_dy)*180/Math.PI - 45).toFixed(1)+'deg');
    pin.addEventListener('click',ev=>{ev.stopPropagation();edEditPinNum(h.id);});
    el.addEventListener('mouseenter',()=>hoverLinked(h.id,true));
    el.addEventListener('mouseleave',()=>hoverLinked(h.id,false));
    el.addEventListener('click',ev=>{ev.stopPropagation();if(state.tour){const list=state.tourList||p.hotspots;const idx=list.findIndex(x=>x.id===h.id);if(idx>=0){state.tourIdx=idx;renderTourStep();}}else{openHsPop(h.id);}});
    (h.fixed?fixedLayer:layer).appendChild(el);
    if(h.modal)el.style.display='none';
    if(pos.w>0){
      const rg=document.createElement('div');
      rg.className='hs-region';rg.dataset.id=h.id;rg.dataset.type=h.type;
      rg.style.left=(pos.x-pos.w/2)+'px';rg.style.top=(pos.y-pos.h/2)+'px';
      rg.style.width=pos.w+'px';rg.style.height=pos.h+'px';
      (h.fixed?fixedLayer:layer).appendChild(rg);
      if(h.modal)rg.style.display='none';
    }
  });
}
function hotspotEl(id){return layer.querySelector('.hs[data-id="'+id+'"]');}
function regionEl(id){return layer.querySelector('.hs-region[data-id="'+id+'"]');}

/* 为缺失编号的标注补上默认值（按原型内顺序 i+1），保证引脚显示与内联编辑有稳定起点 */
function edEnsureHotspotNums(p){
  if(!p||!p.hotspots)return;
  var miss=false; p.hotspots.forEach(function(h){ if(h.num==null)miss=true; });
  if(!miss)return;
  p.hotspots.forEach(function(h,i){ if(h.num==null)h.num=i+1; });
}

/* 在原型引脚上直接查看并修改标注编号：点击数字内联编辑，回车/失焦保存，Esc 取消 */
function edEditPinNum(id){
  var p=current(); if(!p)return;
  var h=p.hotspots.filter(function(x){return x.id===id;})[0]; if(!h)return;
  var el=document.querySelector('.hs[data-id="'+id+'"]'); if(!el)return;
  var pin=el.querySelector('.hs-pin'); if(!pin)return;
  var cur=(h.num!=null&&h.num!=='')?h.num:'';
  pin.innerHTML='<input class="hs-num-input" type="text" inputmode="numeric" value="'+cur+'">';
  var inp=pin.querySelector('input');
  setTimeout(function(){ try{inp.focus();inp.select();}catch(e){} },0);
  var done=false;
  function commit(){
    if(done)return; done=true;
    var v=(inp.value||'').trim();
    if(v!==''){ var n=parseInt(v,10); h.num=isNaN(n)?v:n; }
    else { h.num=edNextNum(p); }
    p.updated=edToday(); edSaveAll();
    renderHotspots(); renderPRD(); renderSidebar();
  }
  inp.addEventListener('click',function(e){e.stopPropagation();});
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();inp.blur();}
    else if(e.key==='Escape'){e.preventDefault();done=true;renderHotspots();}
  });
  inp.addEventListener('blur',commit);
}

/* 双向联动：热点 ↔ 右侧 PRD 条目 */
function hoverLinked(id,on){
  const hs=hotspotEl(id);if(hs)hs.classList.toggle('hover',on);
  const rg=regionEl(id);if(rg)rg.classList.toggle('show',on);
  document.querySelectorAll('.prd-item[data-id],.field-table tr[data-id]').forEach(el=>{
    if(el.dataset.id===id)el.classList.toggle('hover',on);
  });
  if(on){
    const item=document.querySelector('.prd-item[data-id="'+id+'"],.field-table tr[data-id="'+id+'"]');
    const body=$('prdBody');
    if(item&&body){const r=item.getBoundingClientRect(),br=body.getBoundingClientRect();
      if(r.top<br.top||r.bottom>br.bottom)body.scrollTo({top:item.offsetTop-90,behavior:'smooth'});}
  }
}

/* ---------- 热点气泡 ---------- */
function hsCardInner(h,idx){
  const m=TYPE_META[h.type];
  let body='<p>'+h.desc+'</p>';
  if(h.field){
    body+='<dl class="hp-kv">'+
      '<dt>类型</dt><dd>'+h.field.type+'</dd>'+
      '<dt>必填</dt><dd>'+h.field.required+'</dd>'+
      '<dt>格式约束</dt><dd>'+h.field.format+'</dd>'+
      '<dt>示例值</dt><dd>'+h.field.sample+'</dd></dl>';
  }
  if(h.rule){
    body+='<div class="hp-rule-block"><b>触发条件</b><span>'+h.rule.trigger+'</span></div>'+
      '<div class="hp-rule-block"><b>系统行为</b><span>'+h.rule.behavior+'</span></div>'+
      '<div class="hp-rule-block"><b>异常处理</b><span>'+h.rule.exception+'</span></div>';
  }
  const code=h.rule?h.rule.code:(h.field?'FIELD':'UI-'+String(idx+1).padStart(2,'0'));
  return '<div class="hp-head"><span class="type-chip '+m.cls+'">'+m.label+'</span><span class="hp-code">'+code+'</span></div>'+
    '<div class="hp-title">'+h.title+'</div><div class="hp-body">'+body+'</div>'+
    '<div class="hp-foot"><span>标注 '+ (idx+1) +' / 共 '+current().hotspots.length+' 个</span>'+
    '<button class="hp-link" data-jump="'+h.id+'">在右侧 PRD 查看 →</button></div>';
}
function openHsPop(id){
  const p=current();if(!p)return;
  const idx=p.hotspots.findIndex(h=>h.id===id);if(idx<0)return;
  const h=p.hotspots[idx];state.openId=id;
  document.querySelectorAll('.hs').forEach(x=>x.classList.toggle('sel',x.dataset.id===id));
  hsPop.innerHTML=hsCardInner(h,idx);
  hsPop.querySelector('[data-jump]').addEventListener('click',()=>focusPrdItem(id));
  positionPop(h);
  hsPop.classList.add('show');
}
function positionPop(h){
  const pos=getHotspotPixelPos(h);
  const p=current();
  const dw=device.clientWidth,dh=device.clientHeight;
  const W=300;
  let ax=pos.x, ay=pos.y;
  if(p && p.kind==='image'){            /* 图片已内部滚动时，换算到设备可视坐标 */
    const sc=$('imgScroll');
    if(sc){ ax-=sc.scrollLeft; ay-=sc.scrollTop; }
  }
  let left=ax+16, top=ay+14;hsPop.classList.remove('flip');
  if(left+W>dw-10)left=ax-W-16;
  if(top+260>dh){top=ay-260-14;hsPop.classList.add('flip');}
  if(left<8)left=8;if(top<8)top=8;
  hsPop.style.left=left+'px';hsPop.style.top=top+'px';
}
function closeHsPop(){hsPop.classList.remove('show');state.openId=null;
  document.querySelectorAll('.hs.sel').forEach(x=>x.classList.remove('sel'));}
device.addEventListener('click',e=>{if(!e.target.closest('.hs')&&!e.target.closest('.hs-pop'))closeHsPop();});
stage.addEventListener('click',e=>{if(!e.target.closest('.hs'))closeHsPop();});

/* ============================================================
   五、聚光灯走查（Tour）
   ============================================================ */
$('tourStart').addEventListener('click',()=>{
  const p=current();if(!p){showToast('请先在左侧选择一个原型');return;}
  state.tour=true;state.tourIdx=0;startTour();
});
$('tourExit').addEventListener('click',endTour);
$('tourPrev').addEventListener('click',()=>moveTour(-1));
$('tourNext').addEventListener('click',()=>moveTour(1));
$('tourDone').addEventListener('click',endTour);
/* 走查范围过滤：全部 / 仅界面组件 */
$('tourFilter').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  const f=b.dataset.f;
  $('tourFilter').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
  state.tourFilter=f;
  const p=current();if(!p)return;
  state.tourList=(f==='element')?p.hotspots.filter(h=>h.type==='element'):p.hotspots.slice();
  if(!state.tourList.length){ showToast('当前过滤下没有可走查的标注'); state.tourIdx=0; renderTourStep(); return; }
  state.tourIdx=Math.min(state.tourIdx,state.tourList.length-1);
  renderTourStep();
}));
document.addEventListener('keydown',e=>{
  const tag=(e.target&&e.target.tagName)||'';
  const typing=tag==='INPUT'||tag==='TEXTAREA'||(e.target&&e.target.isContentEditable);
  /* \ 一键隐藏 / 显示左右栏；[ 左栏；] 右栏 */
  if(!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    if(e.key==='\\'){e.preventDefault();toggleSides();return;}
    if(e.key==='['){e.preventDefault();toggleLeft();return;}
    if(e.key===']'){e.preventDefault();toggleRight();return;}
  }
  // Alt+↑/↓ 切换上一个/下一个原型
  if(e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){
    e.preventDefault();
    switchProto(e.key==='ArrowDown'?1:-1);
    return;
  }
  if((e.key==='c'||e.key==='C')&&!typing){
    e.preventDefault();
    if(state.tour){endTour();}else{$('tourStart').click();}
    return;
  }
  // A：点选标注开关（走查进行中禁用，避免冲突）
  if((e.key==='a'||e.key==='A')&&!typing&&!state.tour){
    e.preventDefault();
    $('boxAnnoBtn').click();
    return;
  }
  if(!state.tour){return;}
  if(e.key==='Escape'){endTour();return;}
  if(e.key==='ArrowLeft'){moveTour(-1);return;}
  if(e.key==='ArrowRight'||e.key==='Enter'||e.key===' '){e.preventDefault();moveTour(1);return;}
});

/* ===== 键盘快捷键：侧栏展示前 3 个 + 弹窗全量 ===== */
  const SHORTCUTS=[
    {keys:['Alt','↑'], desc:'切换上一个原型'},
    {keys:['Alt','↓'], desc:'切换下一个原型'},
    {keys:['C'], desc:'开始 / 结束 走查模式'},
    {keys:['['], desc:'收起 / 展开 左栏（目录）'},
    {keys:[']'], desc:'收起 / 展开 右栏（PRD）'},
    {keys:['\\'], desc:'一键 隐藏 / 显示 左右栏'},
    {keys:['Esc'], desc:'结束走查'},
    {keys:['←','→'], desc:'走查 上一步 / 下一步'}
  ];
function kbdCell(k){ return '<kbd>'+k.replace(/</g,'&lt;')+'</kbd>'; }
function renderSideKbd(){
  const wrap=$('sideKbdList'); if(wrap) wrap.innerHTML=SHORTCUTS.slice(0,3).map(s=>'<div class="side-kbd-row">'+s.keys.map(kbdCell).join('<span class="plus">+</span>')+'<span>'+s.desc+'</span></div>').join('');
  const all=$('kbdAllList'); if(all) all.innerHTML=SHORTCUTS.map(s=>'<div class="kbd-all-row"><div class="k">'+s.keys.map(kbdCell).join('')+'</div><div class="d">'+s.desc+'</div></div>').join('');
}
renderSideKbd();
$('kbdMoreBtn').addEventListener('click',()=>$('shortcutModal').classList.add('show'));
$('kbdCloseBtn').addEventListener('click',()=>$('shortcutModal').classList.remove('show'));
$('shortcutModal').addEventListener('click',e=>{ if(e.target===$('shortcutModal')) $('shortcutModal').classList.remove('show'); });


function startTour(){
  closeHsPop();
  const p=current();if(!p){endTour();return;}
  state.tourList=(state.tourFilter==='element')
    ? p.hotspots.filter(h=>h.type==='element')
    : p.hotspots.slice();
  if(!state.tourList.length){ showToast('当前原型没有可走查的标注'); endTour(); return; }
  state.tourIdx=Math.min(state.tourIdx, state.tourList.length-1);
  spotMask.classList.add('on');tourCard.hidden=false;
  const tf=$('tourFilter');if(tf){tf.style.display='';tf.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.f===state.tourFilter));}
  renderTourStep();
}
function endTour(){
  state.tour=false;spotMask.classList.remove('on');tourCard.hidden=true;
  const tf=$('tourFilter');if(tf)tf.style.display='none';
  document.querySelectorAll('.hs-region.show').forEach(r=>r.classList.remove('show'));
}
function moveTour(d){
  const tl=state.tourList;if(!tl||!tl.length)return;
  const n=state.tourIdx+d;
  if(n<0||n>=tl.length){if(d>0)endTour();return;}
  state.tourIdx=n;renderTourStep();
}
/* 走查时自动滚动 iframe，让聚焦元素进入视野 */
let _lastTourScroll=0;
function scrollHotspotIntoViewIfNeeded(h,pos){
  if(h.fixed)return; /* 固定元素始终可见，无需滚动 */
  const now=Date.now();
  if(now-_lastTourScroll<260)return; /* 节流，避免 smooth 滚动中重复触发 */
  try{
    const idoc=frame.contentDocument,iwin=frame.contentWindow;
    const margin=84; /* 上下安全边距，避让原型固定头尾栏与走查卡片 */
    let el=null;
    if(h.selector){
      try{el=idoc.querySelector(h.selector);}catch(e){el=null;}
      if(el){const er0=el.getBoundingClientRect();if(!(er0.width>0||er0.height>0))el=null;} /* 隐藏元素放弃精确路径 */
    }
    if(el){
      /* 精确路径：实时找元素的可滚动祖先，手动计算让元素居中的 scrollTop */
      const sc=findScrollableAncestor(el,idoc);
      if(sc){
        const v=visibilityInScroller(el,sc,margin);
        if(v.visible)return; /* 已在可视带，无需滚动 */
        _lastTourScroll=now;
        const center=(v.relTop+v.relBottom)/2;
        let target=sc.scrollTop+center-sc.clientHeight/2;
        const max=Math.max(0,sc.scrollHeight-sc.clientHeight);
        target=Math.max(0,Math.min(max,target));
        sc.scrollTo({top:target,behavior:'smooth'});
        pumpPositionWhileScrolling();
        return;
      }
      /* 元素无可滚动祖先 → 整页 window 滚动 */
      const er=el.getBoundingClientRect();
      if(er.top>=margin&&er.bottom<=iwin.innerHeight-margin)return;
      _lastTourScroll=now;
      iwin.scrollTo({top:iwin.scrollY+(er.top+er.bottom)/2-iwin.innerHeight/2,behavior:'smooth'});
      pumpPositionWhileScrolling();
      return;
    }
    /* 降级路径：无可见 selector，用百分比坐标 + 全局主滚动容器 */
    const sc=findScrollContainer(idoc);state._scrollContainer=sc;
    const dh=device.clientHeight;
    if(sc){
      const sr=sc.getBoundingClientRect();
      const relY=dh*h.y/100-sr.top; /* 设计位置相对容器顶 */
      if(relY>=margin&&relY<=sc.clientHeight-margin)return;
      _lastTourScroll=now;
      let target=sc.scrollTop+relY-sc.clientHeight/2;
      const max=Math.max(0,sc.scrollHeight-sc.clientHeight);
      target=Math.max(0,Math.min(max,target));
      sc.scrollTo({top:target,behavior:'smooth'});
      pumpPositionWhileScrolling();
    }else{
      if(pos.y>=margin&&pos.y<=frame.clientHeight-margin)return;
      _lastTourScroll=now;
      iwin.scrollTo({top:Math.max(0,(iwin.scrollY||0)+pos.y-frame.clientHeight/2),behavior:'smooth'});
      pumpPositionWhileScrolling();
    }
  }catch(e){}
}
/* smooth 滚动期间持续刷新热点/聚光灯位置（capture scroll 监听之外的兜底补帧） */
let _pumpN=0;
function pumpPositionWhileScrolling(){
  _pumpN=0;
  const tick=()=>{scheduleUpdatePositions();if(++_pumpN<26)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
function openModalInFrame(h){
  try{
    const idoc=frame.contentDocument;
    if(h.trigger){
      const t=idoc.querySelector(h.trigger);
      if(t)t.click();
    }else if(h.selector){
      const el=idoc.querySelector(h.selector);
      if(el && el.classList.contains('hidden')) el.classList.remove('hidden');
    }
    scheduleUpdatePositions();
  }catch(e){}
}
function closeOpenModal(){
  /* 走查聚焦非弹窗标注时，关闭原型内所有已打开的弹窗（加回 .hidden） */
  const p=current();if(!p)return;
  let closed=false;
  p.hotspots.forEach(mh=>{
    if(!mh.modal)return;
    const sel=mh.modalEl||mh.selector;
    try{
      const el=frame.contentDocument.querySelector(sel);
      if(el && !el.classList.contains('hidden')){el.classList.add('hidden');closed=true;}
    }catch(e){}
  });
  if(closed)scheduleUpdatePositions();
}
function renderTourStep(){
  const p=current();const h=(state.tourList||p.hotspots)[state.tourIdx];if(!h)return;
  const pos=getHotspotPixelPos(h);
  if(h.modal && !pos.found) openModalInFrame(h);
  if(!h.modal) closeOpenModal();   /* 标注不在弹窗：自动关闭已打开的弹窗 */
  const dw=device.clientWidth,dh=device.clientHeight;
  let rx,ry,rw,rh;
  if(pos.w>0){rx=pos.x-pos.w/2;ry=pos.y-pos.h/2;rw=pos.w;rh=pos.h;}
  else{const s=74;rx=pos.x-s/2;ry=pos.y-s/2;rw=s;rh=s;}
  spotHole.style.left=rx+'px';spotHole.style.top=ry+'px';spotHole.style.width=rw+'px';spotHole.style.height=rh+'px';
  scrollHotspotIntoViewIfNeeded(h,pos);
  const m=TYPE_META[h.type];
  $('tourChip').className='type-chip '+m.cls;$('tourChip').textContent=m.label;
  $('tourTitle').textContent=(state.tourIdx+1)+'. '+h.title;
  let body='<p>'+h.desc+'</p>';
  if(h.field){body+='<dl class="hp-kv"><dt>类型</dt><dd>'+h.field.type+'</dd><dt>必填</dt><dd>'+h.field.required+'</dd><dt>约束</dt><dd>'+h.field.format+'</dd><dt>示例</dt><dd>'+h.field.sample+'</dd></dl>';}
  if(h.rule){body+='<div class="hp-rule-block"><b>触发</b><span>'+h.rule.trigger+'</span></div><div class="hp-rule-block"><b>行为</b><span>'+h.rule.behavior+'</span></div><div class="hp-rule-block"><b>异常</b><span>'+h.rule.exception+'</span></div>';}
  $('tourBody').innerHTML=body;
  const _tl=state.tourList||p.hotspots;
  $('tourCount').textContent=(state.tourIdx+1)+' / '+_tl.length;
  $('tourBar').style.width=((state.tourIdx+1)/_tl.length*100)+'%';
  $('tourPrev').disabled=state.tourIdx===0;
  $('tourNext').disabled=state.tourIdx===_tl.length-1;
  /* 智能避让：聚焦元素在底部时卡片移到顶部，否则在底部 */
  const focusBottom=ry+rh;
  if(focusBottom>dh*0.55){tourCard.style.bottom='auto';tourCard.style.top='16px';}
  else{tourCard.style.bottom='16px';tourCard.style.top='auto';}
  /* 右侧 PRD 同步 */
  const tabMap={element:'element',rule:'rule',field:'field'};
  switchTab(tabMap[h.type],true);
  setTimeout(()=>hoverLinked(h.id,true),60);
  setTimeout(()=>hoverLinked(h.id,false),900);
}

/* ============================================================
   六、右侧 PRD
   ============================================================ */
document.querySelectorAll('.prd-tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.pane)));
/* —— 右侧栏两指横向滑动切换 tab（触控板 wheel.deltaX 主导时触发） —— */
function switchTabByDir(dir){
  const tabs=Array.from(document.querySelectorAll('.prd-tab'));
  if(!tabs.length) return;
  let i=tabs.findIndex(t=>t.classList.contains('on'));
  if(i<0) i=0;
  const ni=Math.min(tabs.length-1,Math.max(0,i+dir));
  if(ni!==i) switchTab(tabs[ni].dataset.pane);
}
(function bindTabSwipe(){
  const panel=document.querySelector('.prd-panel');
  if(!panel) return;
  let last=0;
  panel.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY) && Math.abs(e.deltaX)>12){
      e.preventDefault();
      const now=Date.now();
      if(now-last<300) return;
      last=now;
      switchTabByDir(e.deltaX>0?1:-1);   /* 向右滚(手指左滑)=下一个；向左滚=上一个 */
    }
  },{passive:false});
})();
function switchTab(tab,silent){
  state.tab=tab;
  document.querySelectorAll('.prd-tab').forEach(t=>t.classList.toggle('on',t.dataset.pane===tab));
  renderPane();
  edPersistTab();
}
function updateTopMeta(){
  const p=current();
  if(!p){return;}
  $('prdGroup').textContent=p.group+' · PRD';
  $('prdTitle').textContent=p.name;
  const sp=$('prdStatus');sp.className='status-pill '+(p.status==='review'?'review':'wip');
  sp.textContent=p.status==='review'?'已评审':'设计中';
  $('prdUpdated').textContent='更新于 '+p.updated;
  $('prdOwner').textContent=p.owner;
  $('prdHsCount').textContent=visibleHotspots(p).length+' 项标注'+(isMultiImage(p)?(' · 第 '+(state.slideIndex+1)+' 张'):'');
}
function renderPRD(){
  const p=current();
  if(!p){ // 指南页
    $('prdGroup').textContent='工作台';$('prdTitle').textContent='框架使用指南';
    $('prdStatus').hidden=true;$('prdUpdated').textContent='';$('prdOwner').textContent='';$('prdHsCount').textContent='';
    renderPane();return;
  }
  $('prdStatus').hidden=false;
  updateTopMeta();
  const vis=visibleHotspots(p);
  const c={element:0,rule:0,field:0};vis.forEach(h=>c[h.type]++);
  $('nElement').textContent=c.element;$('nRule').textContent=c.rule;$('nField').textContent=c.field;
  renderPane();
}
var RELO_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
function renderPane(){
  const p=current(),body=$('prdBody');
  if(!p){body.innerHTML=renderGuidePrd();return;}
  if(state.tab==='overview'){
    const ov=p.overview||{};
    const hasOv=ov.summary||ov.path||ov.users||ov.permission||ov.ports;
    let html='<div class="prd-pane on">';
    if(hasOv){
      /* 右侧栏「概览」只呈现飞书 PRD 模块概述的 5 字段结构 */
      html+='<div class="ov-block"><div class="ov-label">模块概述（PRD）</div><div class="ov-list">'+
        (ov.summary?'<div class="ov-line"><span class="tag">功能概述</span><span>'+ov.summary+'</span></div>':'')+
        (ov.path?'<div class="ov-line"><span class="tag">功能路径</span><span>'+ov.path+'</span></div>':'')+
        (ov.users?'<div class="ov-line"><span class="tag">目标用户</span><span>'+ov.users+'</span></div>':'')+
        (ov.permission?'<div class="ov-line"><span class="tag">功能与数据权限</span><span>'+ov.permission+'</span></div>':'')+
        (ov.ports?'<div class="ov-line"><span class="tag">涉及系统端口</span><span>'+ov.ports+'</span></div>':'')+
        '</div></div>';
    } else if(ov.goal){
      /* 无 PRD 模块概述的原型（如 G4 推荐商品）降级显示原页面目标 */
      html+='<div class="ov-block"><div class="ov-label">页面目标</div><div class="ov-goal">'+ov.goal+'</div></div>';
    }
    html+='</div>';
    body.innerHTML=html;
    return;
  }
  if(state.tab==='field'){
    const ents=Object.keys(DATA_MODELS).map(k=>({key:k,obj:DATA_MODELS[k]})).filter(e=>e.obj.sources&&e.obj.sources.indexOf(p.id)>=0);
    const nf=document.getElementById('nField'); if(nf) nf.textContent=String(ents.reduce((s,e)=>s+e.obj.fields.length,0));
    if(!ents.length){
      body.innerHTML='<div class="prd-pane on"><p style="font-size:12px;color:var(--text-3);padding:10px 2px">当前原型暂无对应的数据模型字段。</p></div>';
      return;
    }
    let html='<div class="prd-pane on">';
    ents.forEach(e=>{
      const o=e.obj;
      let rows=o.fields.map(f=>'<tr><td><div class="f-name">'+f.name+'</div></td>'+
        '<td><span class="f-type">'+f.type+'</span></td>'+
        '<td class="'+(f.required==='是'?'req':'opt')+'">'+f.required+'</td>'+
        '<td>'+f.format+'</td>'+
        '<td><span class="f-sample">'+f.sample+'</span></td></tr>').join('');
      html+='<div class="dm-entity"><div class="dm-entity-h">'+o.label+'</div>'+
        '<table class="field-table"><thead><tr><th>字段</th><th>类型</th><th>必填</th><th>校验 / 约束</th><th>示例</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    });
    html+='<p style="font-size:11.5px;color:var(--text-3);margin-top:12px">字段数据来自《中免海南商城·门店导购升级 数据模型》（v0.4 原型对齐）。</p></div>';
    body.innerHTML=html;
    return;
  }
  const list=visibleHotspots(p).filter(h=>h.type===state.tab).slice().sort(function(a,b){
    /* 右侧栏说明按标注编号（h.num）升序排序；无编号的排末尾，保持原相对顺序 */
    const na=parseInt(a.num,10), nb=parseInt(b.num,10);
    const ha=!isNaN(na), hb=!isNaN(nb);
    if(ha&&hb) return na-nb;
    if(ha) return -1;
    if(hb) return 1;
    return 0;
  });
  body.innerHTML='<div class="prd-pane on">'+list.map(h=>{
    const idx=list.indexOf(h);const m=TYPE_META[h.type];
    let extra='';
    if(h.rule){extra='<div class="rule-rows">'+
      '<div class="rule-row"><dt>规则编号</dt><dd style="font-family:var(--mono);font-size:11.5px;color:var(--c-rule)">'+h.rule.code+'</dd></div>'+
      '<div class="rule-row"><dt>触发</dt><dd>'+h.rule.trigger+'</dd></div>'+
      '<div class="rule-row"><dt>行为</dt><dd>'+h.rule.behavior+'</dd></div>'+
      '<div class="rule-row"><dt>异常</dt><dd>'+h.rule.exception+'</dd></div></div>';}
    var _num=(h.num!=null)?h.num:(idx+1);
    return '<div class="prd-item" data-id="'+h.id+'" data-type="'+h.type+'"><div class="pi-head">'+
      '<span class="type-chip '+m.cls+'">'+m.label+'</span>'+
      '<span class="pi-title">'+h.title+'</span><span class="pi-idx" title="标注编号">#'+String(_num).padStart(2,'0')+'</span></div>'+
      '<div class="pi-desc">'+h.desc+'</div>'+extra+
      '<span class="pi-acts"><button class="pi-relo" data-relo="'+h.id+'" title="重新定位（点选原型重新绑定位置）">'+RELO_SVG+'</button>'+
      '<button class="pi-edit" data-edit="'+h.id+'" title="编辑说明">✎</button>'+
      '<button class="pi-del" data-del="'+h.id+'" title="删除标注">✕</button></span></div>';
  }).join('')+'</div>';
  body.querySelectorAll('.prd-item').forEach(it=>{
    it.addEventListener('mouseenter',()=>hoverLinked(it.dataset.id,true));
    it.addEventListener('mouseleave',()=>hoverLinked(it.dataset.id,false));
    it.addEventListener('click',()=>scrollProtoToHotspot(it.dataset.id));
  });
  /* 编辑增强：条目的编辑 / 删除（阻止冒泡，避免触发定位走查） */
  body.querySelectorAll('.pi-edit').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation(); if(window.edOpen)window.edOpen(b.dataset.edit);
  }));
  body.querySelectorAll('.pi-del').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation(); if(window.edDeleteHs)window.edDeleteHs(b.dataset.del);
  }));
  body.querySelectorAll('.pi-relo').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation(); if(window.edRelocate)window.edRelocate(b.dataset.relo);
  }));
}
/* 右侧条目 → 原型定位 */
function focusPrdItem(id){
  const p=current();const h=p.hotspots.find(x=>x.id===id);if(!h)return;
  switchTab(h.type==='element'?'element':h.type,true);
  setTimeout(()=>{
    const it=document.querySelector('.prd-item[data-id="'+id+'"],.field-table tr[data-id="'+id+'"]');
    if(it){it.classList.add('sel');setTimeout(()=>it.classList.remove('sel'),1400);}
  },30);
  closeHsPop();
}
function focusHotspot(id){
  openHsPop(id);
  const hs=hotspotEl(id);if(!hs)return;
  hs.style.animation='none';
}

/* 右侧组件/规则卡片点击 → 原型展示区滚动到对应组件位置（优先 selector，降级百分比坐标） */
/* 展开原型内弹窗（兼容 hidden 类 / display:none / show|active|open 类） */
function openProtoModal(el){
  if(!el) return;
  el.classList.remove('hidden');
  el.classList.add('show','active','open');
  if(el.style.display==='none') el.style.display='';
}
/* 找离元素最近的可滚动祖先（跳过 overflow:hidden 的设备外壳 .phone-frame） */
function getScrollableParent(el){
  let n=el.parentElement;
  while(n && n.nodeType===1){
    const cs=getComputedStyle(n);
    const canY=(cs.overflowY==='auto'||cs.overflowY==='scroll')&&n.scrollHeight>n.clientHeight+1;
    const canX=(cs.overflowX==='auto'||cs.overflowX==='scroll')&&n.scrollWidth>n.clientWidth+1;
    if(canY||canX) return n;
    n=n.parentElement;
  }
  return null;
}
/* 在指定容器内把元素滚到居中（容器为 null 时回退整窗居中） */
function scrollElInto(el, container){
  if(!el) return;
  if(container){
    const cr=container.getBoundingClientRect();
    const tr=el.getBoundingClientRect();
    container.scrollBy({top:(tr.top-cr.top)-(container.clientHeight-el.offsetHeight)/2, behavior:'smooth'});
  }else{
    el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
  }
}
function scrollProtoToHotspot(id){
  const p=current(); if(!p) return;
  const h=p.hotspots.find(x=>x.id===id); if(!h) return;
  try{
    if(p.kind==='image'){
      const sc=document.getElementById('imgScroll');
      if(sc && h.y!=null){ sc.scrollTo({top:Math.max(0,(h.y/100)*sc.scrollHeight - sc.clientHeight/2),behavior:'smooth'}); }
    }else{
      const idoc=frame.contentDocument; if(!idoc) return;
      /* 弹窗组件：先自动展开弹窗；非弹窗组件：关闭已打开的弹窗 */
      if(h.modal && h.modalEl){ openProtoModal(idoc.querySelector(h.modalEl)); }
      else { closeOpenModal(); }
      let done=false;
      if(h.selector){
        const target=idoc.querySelector(h.selector);
        if(target){
          const sc=getScrollableParent(target);   /* 只滚设备外壳内部内容区，不滚外壳本身 */
          scrollElInto(target, sc);
          done=true;
        }
      }
      if(!done){
        const sc=findScrollContainer(idoc)||(idoc.scrollingElement||idoc.documentElement);
        if(sc && h.y!=null){
          const dh=sc.scrollHeight||idoc.documentElement.scrollHeight;
          sc.scrollTo({top:Math.max(0,(h.y/100)*dh - sc.clientHeight/2),behavior:'smooth'});
        }
      }
    }
  }catch(e){}
  hoverLinked(id,true);
  setTimeout(()=>hoverLinked(id,false),900);
  const it=document.querySelector('.prd-item[data-id="'+id+'"]');
  if(it){ it.classList.add('sel'); setTimeout(()=>it.classList.remove('sel'),1400); }
}

/* ============================================================
   七、使用指南
   ============================================================ */
function renderGuide(){$('prdBody').innerHTML=renderGuidePrd();
  $('guideView').innerHTML=guideHTML();
}
function renderGuidePrd(){
  return '<div class="prd-pane on">'+
  '<div class="ov-block"><div class="ov-label">这个工作台是什么</div><div class="ov-goal">一套「左目录 · 中原型 · 右 PRD」三栏联动的产品原型评审框架。中间用 iframe 承载任意可交互原型，通过可配置的<b>热点标注层</b>把界面组件、业务规则、数据字段与 PRD 逐条锚定，并提供聚光灯走查。</div></div>'+
  '<div class="ov-block"><div class="ov-label">三种标注语义</div><div class="state-grid">'+
  '<div class="state-cell" style="border-left:3px solid var(--c-element)"><b style="color:var(--c-element)">界面组件</b><span>看得见、可操作的控件：按钮、输入框、列表、弹窗…</span></div>'+
  '<div class="state-cell" style="border-left:3px solid var(--c-rule)"><b style="color:var(--c-rule)">业务规则</b><span>触发条件 → 系统行为 → 异常处理的三段式逻辑</span></div>'+
  '<div class="state-cell" style="border-left:3px solid var(--c-field)"><b style="color:var(--c-field)">数据字段</b><span>类型、必填、格式约束、示例值，直接对接接口文档</span></div>'+
  '</div></div>'+
  '<div class="ov-block"><div class="ov-label">推荐评审动线</div><div class="flow-chain">'+
  '<div class="flow-node"><div class="flow-dot">1</div><div class="flow-txt"><b>浏览概览</b>先读页面目标、入口出口与主流程</div></div>'+
  '<div class="flow-node"><div class="flow-dot">2</div><div class="flow-txt"><b>开启走查</b>点顶栏「走查」，聚光灯逐个讲解标注，方向键切换</div></div>'+
  '<div class="flow-node"><div class="flow-dot">3</div><div class="flow-txt"><b>双向核对</b>右侧字段表/规则卡与原型热点互相悬停定位</div></div>'+
  '<div class="flow-node"><div class="flow-dot">4</div><div class="flow-txt"><b>切换设备</b>用桌面 / 平板 / 手机宽度检查响应式表现</div></div>'+
  '</div></div></div>';
}
function guideHTML(){
  return '<h1>接入你自己的原型</h1>'+
  '<p class="lead">框架只依赖一份配置数组 <code>PROTOTYPES</code>：左侧目录、中间 iframe、右侧 PRD、热点走查全部由它驱动，改数据即可，无需改框架代码。</p>'+
  '<h2>第一步：准备原型 <i>IFRAME</i></h2>'+
  '<ul>'+
  '<li><b>外部地址</b>：把原型部署到可访问 URL（Axure / 墨刀 / 自建页面均可，需允许被 iframe 嵌入），配置中写 <code>url:"https://…"</code></li>'+
  '<li><b>内置页面</b>：直接把原型 HTML 字符串放进 <code>srcdoc</code>，离线可用（本页三个示例就是这种方式）</li>'+
  '</ul>'+
  '<h2>第二步：配置一个原型节点 <i>SCHEMA</i></h2>'+
  '<pre><span class="c">// PROTOTYPES 数组中追加一个对象</span>'+
  '{<span class="k">id</span>: <span class="s">"order-create"</span>, <span class="c">// 唯一标识，也是路由 hash</span>\n'+
  ' <span class="k">group</span>: <span class="s">"交易体系"</span>, <span class="c">// 左侧分组名</span>\n'+
  ' <span class="k">name</span>: <span class="s">"创建订单"</span>, <span class="k">device</span>: <span class="s">"desktop"</span>,\n'+
  ' <span class="k">url</span>: <span class="s">"https://你的原型地址"</span>,  <span class="c">// 或 srcdoc: HTML字符串</span>\n'+
  ' <span class="k">overview</span>: { goal, scenario[], entry[], exit[] },\n'+
  ' <span class="k">flow</span>: [{ t:<span class="s">"步骤名"</span>, d:<span class="s">"说明"</span> }],\n'+
  ' <span class="k">states</span>: [{ n:<span class="s">"状态名"</span>, d:<span class="s">"说明"</span> }],\n'+
  ' <span class="k">hotspots</span>: [ <span class="c">// 标注：元素/规则/字段三类</span>\n'+
  '   { <span class="k">id</span>, <span class="k">type</span>:<span class="s">"element|rule|field"</span>,\n'+
  '     <span class="k">x</span>:50,<span class="k">y</span>:30, <span class="c">// 热点圆心，占原型视口的百分比</span>\n'+
  '     <span class="k">w</span>:30,<span class="k">h</span>:8,  <span class="c">// 可选：走查时高亮的区域框（百分比）</span>\n'+
  '     <span class="k">title</span>, <span class="k">desc</span>,\n'+
  '     <span class="k">field</span>:{type,required,format,sample}, <span class="c">// field 类型</span>\n'+
  '     <span class="k">rule</span>:{code,trigger,behavior,exception} <span class="c">// rule 类型</span>\n'+
  '   }\n'+
  ' ]\n}</pre>'+
  '<h2>第三步：标定热点坐标 <i>HOTSPOT</i></h2>'+
  '<ul>'+
  '<li>坐标取原型<b>首屏视口</b>的百分比：x=50 表示水平正中，y 从上往下；这样切换设备宽度时热点仍能对齐</li>'+
  '<li>长页面建议按页面状态拆成多个原型节点，每个节点锚定自己的首屏——这也更符合评审习惯</li>'+
  '<li>带 <code>w/h</code> 的标注在走查时会出现区域聚焦框，适合输入框、按钮组、表格等成块区域</li>'+
  '</ul>'+
  '<h2>框架能力一览 <i>FEATURES</i></h2>'+
  '<div class="guide-grid">'+
  '<div class="guide-card"><div class="gc-t" style="color:var(--c-element)">● 热点标注层</div><p>脉冲锚点 + 点击说明卡，可一键开关；三色区分元素/规则/字段</p></div>'+
  '<div class="guide-card"><div class="gc-t" style="color:var(--accent)">● 聚光灯走查</div><p>遮罩挖洞聚焦当前标注，进度条 + 键盘左右方向键 / Esc 退出</p></div>'+
  '<div class="guide-card"><div class="gc-t" style="color:var(--c-field)">● 双向联动</div><p>悬停右侧条目，原型上的锚点发光；点击直接定位，反之亦然</p></div>'+
  '</div>';
}

/* ============================================================
   八、Toast / 路由 / 启动
   ============================================================ */
let toastTimer;
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900);}
window.addEventListener('hashchange',()=>{
  if(isCatalogHash()){showCatalog();return;}
  hideCatalog();
  const id=location.hash.replace('#','')||'__guide__';
  if(id!==state.currentId&&(id==='__guide__'||PROTOTYPES.some(p=>p.id===id)))selectPrototype(id);
  setTimeout(hideCatalog,0);
});
/* ===== 侧边栏收起/展开 ===== */
/* ---------- 左右栏一键隐藏 / 显示 ---------- */
function setSideCollapsed(side,c){
  const layout=document.querySelector('.layout'); if(!layout)return;
  const cls=(side==='left')?'collapse-left':'collapse-right';
  const varName=side==='left'?'--left-w':'--right-w';
  const defW=side==='left'?200:320;
  const _v=layout.style.getPropertyValue(varName).trim();
  const curVal=_v?parseFloat(_v):defW;
  if(layout.classList.contains(cls)===c)return;
  if(c){
    layout.dataset['w_'+side]=curVal;                 // 记住收起前的宽度
    layout.style.setProperty(varName,'0px');          // 内联直接收起（优先级高于类选择器）
  }else{
    const w=layout.dataset['w_'+side]?parseFloat(layout.dataset['w_'+side]):defW;
    layout.style.setProperty(varName,w+'px');         // 恢复记忆宽度
  }
  layout.classList.toggle(cls,c);
  try{localStorage.setItem(side==='left'?'pd_left':'pd_right',c?'1':'0');}catch(e){}
  const h=document.getElementById(side==='left'?'handleLeft':'handleRight');
  if(h)h.title=side==='left'?(c?'展开目录（[）':'收起目录（[）'):(c?'展开PRD（]）':'收起PRD（]）');
}
/* 一键：任一栏处于展开状态则两侧都收起，否则两侧都展开 */
function toggleSides(){
  const layout=document.querySelector('.layout'); if(!layout)return;
  const anyOpen=!layout.classList.contains('collapse-left')||!layout.classList.contains('collapse-right');
  setSideCollapsed('left',anyOpen);
  setSideCollapsed('right',anyOpen);
  setTimeout(scheduleUpdatePositions,300);
  try{showToast(anyOpen?'已隐藏左右栏':'已显示左右栏');}catch(e){}
}
function toggleLeft(){
  const layout=document.querySelector('.layout');
  setSideCollapsed('left', !layout.classList.contains('collapse-left'));
  setTimeout(scheduleUpdatePositions,300);
}
function toggleRight(){
  const layout=document.querySelector('.layout');
  setSideCollapsed('right', !layout.classList.contains('collapse-right'));
  setTimeout(scheduleUpdatePositions,300);
}
document.getElementById('handleLeft').addEventListener('click',toggleLeft);
document.getElementById('handleRight').addEventListener('click',toggleRight);
/* ===== 左右栏拖拽调宽（含最低/最高值） ===== */
function bindResize(handle,side){
  const layout=document.querySelector('.layout'); if(!layout||!handle)return;
  const varName=side==='left'?'--left-w':'--right-w';
  const defW=side==='left'?200:320;
  const MIN=side==='left'?200:320;   /* 最小宽度 */
  const MAX=side==='left'?460:640;   /* 最大宽度 */
  const cls=side==='left'?'collapse-left':'collapse-right';
  function curW(){const v=layout.style.getPropertyValue(varName).trim();return v?parseFloat(v):defW;}
  handle.addEventListener('mousedown',function(e){
    e.preventDefault();
    let startW;
    if(layout.classList.contains(cls)){
      setSideCollapsed(side,false);                 // 取消隐藏并恢复记忆宽度（内联）
      startW=parseFloat(layout.style.getPropertyValue(varName))||defW;
    }else{
      startW=curW();
    }
    const startX=e.clientX;
    document.body.style.cursor='col-resize'; document.body.style.userSelect='none';
    layout.classList.add('resizing');
    function onMove(ev){
      const dx=ev.clientX-startX;
      let w=startW+(side==='left'?dx:-dx);
      w=Math.max(MIN,Math.min(MAX,w));
      layout.style.setProperty(varName,w+'px');
    }
    function onUp(){
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      document.body.style.cursor=''; document.body.style.userSelect='';
      layout.classList.remove('resizing');
    }
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
  });
}
bindResize(document.getElementById('divLeft'),'left');
bindResize(document.getElementById('divRight'),'right');
var _pt=document.getElementById('panelToggle'); if(_pt)_pt.addEventListener('click',toggleSides);

(function init(){
  /* 返回目录：用相对 hash，本地 / WorkBuddy / GitHub 三环境通用（不整页刷新） */
  var bk=document.querySelector('.back-to-catalog');
  if(bk)bk.href='#catalog';

  /* ===== 原型目录视图（单文件 hash 路由） ===== */
  const CATALOG_MODULES=[
    {id:'guide-upgrade',name:'导购升级',version:'v0.4',desc:'导购端商品推荐与业绩管理、顾客端 IM 会话/商品详情/结算中心/行程核验，以及管理后台的业绩与消息监控，覆盖繁星 APP 导购端、CDF 海南免税顾客端与管理后台。',status:'online',icon:'guide',emoji:'💬',proto:'v04-g3',count:11,anno:53},
    {id:'member-system',name:'会员体系',version:'',desc:'会员等级、积分、权益与成长体系，规划中。',status:'planned',icon:'member',emoji:'👑',proto:'',count:0,anno:0},
    {id:'order-center',name:'订单中心',version:'',desc:'订单全生命周期管理、履约跟踪与售后流程，规划中。',status:'planned',icon:'order',emoji:'📦',proto:'',count:0,anno:0},
    {id:'data-dashboard',name:'数据看板',version:'',desc:'经营数据、转化漏斗与实时指标监控，规划中。',status:'planned',icon:'data',emoji:'📊',proto:'',count:0,anno:0}
  ];
  const catalogView=$('catalogView');
  function showCatalog(){catalogView.style.display='block';playHeroTitle();}
  function playHeroTitle(){
    if(typeof gsap==='undefined')return;
    var h1=document.querySelector('.cat-hero h1');
    if(!h1)return;
    var chars=Array.prototype.slice.call(h1.querySelectorAll('.h1-char'));
    if(!chars.length)return;
    var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 每字切成 ROWS×COLS 块碎片，从四面八方随机飞入拼合
    var ROWS=3, COLS=2, N=ROWS*COLS, allFrags=[];
    chars.forEach(function(ch){
      if(!ch.dataset.txt) ch.dataset.txt=ch.textContent;
      var txt=ch.dataset.txt;
      ch.textContent='';
      var real=document.createElement('span'); real.className='h1-real'; real.textContent=txt; ch.appendChild(real);
      var frags=document.createElement('span'); frags.className='h1-frags';
      for(var i=0;i<N;i++){
        var f=document.createElement('span'); f.className='h1-frag'; f.textContent=txt;
        var r=Math.floor(i/COLS), c=i%COLS;
        var x0=(c/COLS*100), x1=((c+1)/COLS*100);
        var y0=(r/ROWS*100), y1=((r+1)/ROWS*100);
        var cp='inset('+y0+'% '+(100-x1)+'% '+(100-y1)+'% '+x0+'%)';
        f.style.webkitClipPath=cp; f.style.clipPath=cp;
        frags.appendChild(f); allFrags.push(f);
      }
      ch.appendChild(frags);
    });
    if(reduce){
      gsap.set(allFrags,{clearProps:'all'});
      var rs=h1.parentNode.querySelector('.cat-hero-stats'), rp=h1.parentNode.querySelector('.cat-hero p');
      if(rs)gsap.set(rs,{clearProps:'all'}); if(rp)gsap.set(rp,{clearProps:'all'});
      return;
    }
    // 按文字顺序（从左到右）逐字汇聚：每字基延迟递进，字内碎片仍随机错落
    var CHAR_GAP=0.13;
    chars.forEach(function(ch,ci){
      var fs=ch.querySelectorAll('.h1-frag');
      fs.forEach(function(f){
        var ang=Math.random()*Math.PI*2, dist=180+Math.random()*260;
        gsap.set(f,{x:Math.cos(ang)*dist, y:Math.sin(ang)*dist, rotation:(Math.random()*2-1)*220, scale:0.4+Math.random()*0.9, autoAlpha:0});
      });
      gsap.to(fs,{x:0,y:0,rotation:0,scale:1,autoAlpha:1,duration:1.0,ease:'expo.out',stagger:{each:0.014,from:'random'},delay:ci*CHAR_GAP});
    });
    var lastDelay=(chars.length-1)*CHAR_GAP;
    var sub=h1.parentNode.querySelector('.cat-hero p'), stats=h1.parentNode.querySelector('.cat-hero-stats');
    if(sub){gsap.killTweensOf(sub);gsap.set(sub,{y:16,autoAlpha:0});gsap.to(sub,{y:0,autoAlpha:1,duration:0.6,delay:lastDelay+0.35,ease:'power2.out'});}
    if(stats){gsap.killTweensOf(stats);gsap.set(stats,{y:16,autoAlpha:0});gsap.to(stats,{y:0,autoAlpha:1,duration:0.6,delay:lastDelay+0.5,ease:'power2.out'});}
  }
  function hideCatalog(){catalogView.style.display='none';}
  function isCatalogHash(){const h=location.hash.replace('#','');return !h||h==='catalog';}
  $('catGrid').innerHTML=CATALOG_MODULES.map(m=>{
    const on=m.status==='online';
    return `<div class="cat-card ${on?'':'planned'}" data-proto="${m.proto}">
      <div class="cat-top"><div class="cat-icon ${m.icon}">${m.emoji}</div><span class="cat-status ${m.status}">${on?'已上线':'规划中'}</span></div>
      <div class="cat-name">${m.name}${m.version?`<span class="ver">${m.version}</span>`:''}</div>
      <div class="cat-desc">${m.desc}</div>
      <div class="cat-meta-row">
        <div class="cat-meta-item"><span class="v ${on?'accent':''}">${m.count}</span><span class="l">交互原型</span></div>
        <div class="cat-meta-item"><span class="v">${m.anno}</span><span class="l">热点标注</span></div>
        <div class="cat-meta-item"><span class="v">${on?'✓':'—'}</span><span class="l">走查模式</span></div>
      </div>
      ${on?`<div class="cat-enter"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>`:''}
    </div>`;
  }).join('');
  $('catGrid').addEventListener('click',e=>{
    const card=e.target.closest('.cat-card');
    if(!card||card.classList.contains('planned')||!card.dataset.proto)return;
    const proto=card.dataset.proto;
    location.hash=proto;
    hideCatalog();
    if(proto!==state.currentId)selectPrototype(proto);
  });
  $('backToCatalog').addEventListener('click',()=>{location.hash='catalog';showCatalog();});
  const _onMods=CATALOG_MODULES.filter(m=>m.status==='online');
  const _totProto=CATALOG_MODULES.reduce((s,m)=>s+m.count,0);
  const _totAnno=CATALOG_MODULES.reduce((s,m)=>s+m.anno,0);
  ['catNavMod','catHeroMod'].forEach(id=>$(id).textContent=_onMods.length);
  ['catNavProto','catHeroProto'].forEach(id=>$(id).textContent=_totProto);
  ['catNavAnno','catHeroAnno'].forEach(id=>$(id).textContent=_totAnno);

  $('annoToggle').classList.add('on');
  /* 恢复侧边栏收起状态 */
  const layout=document.querySelector('.layout');
  try{
    if(localStorage.getItem('pd_left')==='1'){layout.classList.add('collapse-left');layout.style.setProperty('--left-w','0px');document.getElementById('handleLeft').title='展开目录';}
    if(localStorage.getItem('pd_right')==='1'){layout.classList.add('collapse-right');layout.style.setProperty('--right-w','0px');document.getElementById('handleRight').title='展开PRD';}
  }catch(e){}
  if(isCatalogHash()){showCatalog();return;}
  hideCatalog();
  /* 静态模式：v0.4 原型已复制进本目录(工作台/v0.4/)，直接用相对路径 v0.4/ 引用，不依赖任何本地服务，
     可整体打包上传 GitHub Pages。工作台文件夹为自包含单元，无需与源目录保持兄弟关系。 */
  const SRC_BASE='v0.4/';
  PROTOTYPES.forEach(p=>{ if(p.url){ const _fn=p.url.split('/').pop(); p.url=SRC_BASE+_fn; } });
  /* 静态部署无法列目录，直接以配置数组为准（删文件不会自动从导航消失，需同步删配置项） */
  (function(){
    const _id=location.hash.replace('#','');
    selectPrototype(PROTOTYPES.some(p=>p.id===_id)?_id:PROTOTYPES[0].id);
  })();
})();
