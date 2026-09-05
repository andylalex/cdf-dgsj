const { spawn } = require('child_process');
const fs = require('fs');
const mcp = JSON.parse(fs.readFileSync('/storage/Users/currentUser/.workbuddy/mcp.json','utf8'));
const feishu = mcp.mcpServers['feishu-mcp'];
const env = {...process.env, ...feishu.env, HOME:'/storage/Users/currentUser', PATH:'/data/storage/el1/bundle/libs/arm64/node/bin:/usr/local/bin:/bin:/usr/bin:/system/bin:/vendor/bin'};
const p = spawn('/data/storage/el1/bundle/libs/arm64/node/bin/npx',['-y','feishu-mcp','--stdio'],{env});
let buf=''; const responses={};
p.stdout.on('data',d=>{buf+=d.toString(); let i; while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!l)continue; try{const m=JSON.parse(l); if(m.id!==undefined)responses[m.id]=m;}catch(e){}}});
p.stderr.on('data',d=>process.stderr.write('[srv]'+d));
const send=o=>p.stdin.write(JSON.stringify(o)+'\n');
const wait=(id,ms=30000)=>new Promise((res,rej)=>{const t0=Date.now();const iv=setInterval(()=>{if(responses[id]){clearInterval(iv);res(responses[id]);}else if(Date.now()-t0>ms){clearInterval(iv);rej(new Error('timeout '+id));}},100);});

// 已存在的画板（在 3.1.1 下创建成功，但填充因缺权限失败）
const TOKEN='WPsjw4xolhQ2EHbcWoVcaPwdnGf';
const MERMAID = `flowchart TB
  subgraph C[商城端 · 用户 C端]
    c1[联系导购 IM会话]
    c2[查看推荐商品与专题]
    c3[下单购买]
  end
  subgraph G[导购端 G端]
    g1[工作台]
    g2[IM沟通 推荐商品 发券]
    g3[客户与商品管理]
    g4[业绩查看]
  end
  subgraph F[繁星后台 · PC管理端]
    f1[维护导购资料]
    f2[在线与离线管理]
  end
  subgraph Q[千帆后台 · 数据配置]
    q1[数据管理]
    q2[功能页面入口配置]
  end
  c1 --> c2 --> c3
  c2 <--> g2
  c3 --> g3
  g1 --> g2 --> g3 --> g4
  f1 -.支撑.-> g1
  f2 -.支撑.-> g2
  q1 -.支撑.-> g4
  q2 -.支撑.-> g2`;

(async()=>{
  send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'l',version:'1'}}});
  await wait(1);
  send({jsonrpc:'2.0',method:'notifications/initialized'});
  send({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'fill_whiteboard_with_plantuml',arguments:{
    whiteboards:[{whiteboardId:TOKEN, code:MERMAID, syntax_type:'mermaid'}]
  }}});
  const r2=await wait(2);
  if(r2.error){console.log('FILL_ERR',JSON.stringify(r2.error));p.kill();process.exit(1);}
  const fillText=(r2.result&&r2.result.content&&r2.result.content[0]&&r2.result.content[0].text)||'';
  console.log('FILL_RESP='+fillText);
  console.log('DONE');
  p.kill(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
