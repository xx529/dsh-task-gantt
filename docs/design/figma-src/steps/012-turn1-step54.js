// dsh-task-gantt · Figma build step 12/90
// turn 1 · step 54 · callId call_00_3n3sswz4aa4sljs8t1opduc3
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',business:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',lane0:'#2563EB',lane1:'#A3294F',lane2:'#558130',lane3:'#786BA5',lane4:'#765C19',doc:'#1B1B1C',redStatic:'#EC1313'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||12;n.lineHeight={unit:'PIXELS',value:o.lh||20};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function estW(str,size){let w=0;for(const ch of str){const c=ch.codePointAt(0);if(c>0x2e80)w+=size;else if(ch===' ')w+=size*0.32;else w+=size*0.58;}return w;}
function fit(str,maxW,size){if(estW(str,size)<=maxW)return str;let out='';for(const ch of str){if(estW(out+ch+'…',size)>maxW)break;out+=ch;}return out+'…';}
const SYM={
 env:(c)=>`<svg width="9" height="7" viewBox="0 0 9 7" xmlns="http://www.w3.org/2000/svg"><rect x="0.55" y="0.55" width="7.9" height="5.9" rx="1" fill="none" stroke="${c}" stroke-width="1"/><path d="M1.3 1.5 L4.5 3.9 L7.7 1.5" fill="none" stroke="${c}" stroke-width="1"/></svg>`,
 play:(c)=>`<svg width="7" height="8" viewBox="0 0 7 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 0.9 L6.2 4 L1.2 7.1 Z" fill="${c}"/></svg>`,
 plus:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M4 1.2 V6.8 M1.2 4 H6.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4.2 L3.1 6.1 L6.8 1.9" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 minus:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4 H6.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></svg>`,
 fit:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1 3.2 V1 H3.2 M5.8 1 H8 V3.2 M8 5.8 V8 H5.8 M3.2 8 H1 V5.8" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/></svg>`,
 refresh:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M8.2 3.4 A3.4 3.4 0 1 0 8.6 5.4" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/><path d="M6.4 1 L8.4 1 L8.4 3" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'SF Pro',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const page=figma.root.children.find(p=>p.name.startsWith('01'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const PAGE=F(page,'page 01 doc',0,0,1000,780,{fill:C.doc});
TL(PAGE,'pt','01 · 现状 AS-IS',0,0,32,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(PAGE,'ps','按 v0.2.38 源码与 DSH 暗色令牌重建 · 480 × 580 · 5 条泳道 · 工具栏为 480px 下的真实溢出状态',0,36,18,{size:12,color:C.t3});
const P=F(PAGE,'01 · 现状面板 480×580',0,110,480,580,{fill:C.bg1,clip:true});
const X0=138,SEC=4,NOW=1200,LANE_H=72,AX_Y=30,AX_H=28,HEAD_W=132;
const px=s=>X0+s/SEC;
/* toolbar */
const bar=F(P,'toolbar',0,0,480,30,{fill:C.bg1});R(bar,'bar-border',0,29,480,1,C.b1);
let cx=6;
function chip(name,label,w,opts){opts=opts||{};const f=F(bar,name,cx,5,w,20,{fill:null,radius:9,stroke:opts.border||C.b2});TL(f,name+'-t',label,6,-3,20,{size:11,color:opts.color||C.t2});cx+=w+4;return f;}
chip('chip-source','时间来自会话日志',103,{});
chip('chip-now','现在',37,{border:C.t1,color:C.t1});
const rangeF=F(bar,'range',cx,5,90,20,{fill:null});TL(rangeF,'range-label','时间段',0,0,20,{size:11,color:C.t3});
const sel=F(rangeF,'select',36,0,54,20,{fill:C.bg1,radius:3,stroke:C.b2});TL(sel,'select-txt','全部',5,0,20,{size:11,color:C.t2});TL(sel,'select-caret','▾',41,0,20,{size:9,color:C.t3});
cx+=94;
const fw=Math.ceil(estW('跟随时间线 ●',12))+12;
const follow=F(bar,'btn-follow',cx,5,fw,20,{fill:null,radius:5,stroke:C.t1});TL(follow,'follow-t','跟随时间线 ●',6,0,20,{size:12,color:C.t1,fontStyle:'Medium'});cx+=fw+4;
const flt=F(bar,'btn-filter',cx,5,100,20,{fill:null,radius:5,stroke:C.b2});TL(flt,'filter-t','筛选 teammate ·',5,0,20,{size:11,color:C.t2});cx+=104;
const tasksChip=F(bar,'chip-tasks',cx,5,47,20,{fill:null,radius:9,stroke:C.b2});TL(tasksChip,'tasks-t','9 任务',6,0,20,{size:11,color:C.t2});cx+=51;
const retry=F(bar,'btn-retry',cx,5,22,20,{fill:null,radius:5,stroke:C.b2});SVG(retry,'retry-i',SYM.refresh(C.t2),6,5);
/* heads */
const heads=F(P,'lane-heads',0,AX_Y,HEAD_W,AX_H+5*LANE_H,{fill:C.bg1});
R(heads,'head-right-border',HEAD_W-1,0,1,AX_H+5*LANE_H,C.b2);
const corner=F(heads,'corner',0,0,HEAD_W,AX_H,{fill:C.bg1});R(corner,'corner-b',0,AX_H-1,HEAD_W,1,C.b1);TL(corner,'corner-t','活动',6,0,AX_H,{size:11,color:C.t3});
const lanes=[{name:'Lead',color:C.lane0,status:'running',tasks:2,msgs:3,act:'运行中'},{name:'host-data',color:C.lane1,status:'idle',tasks:2,msgs:2,act:null},{name:'ui',color:C.lane2,status:'running',tasks:2,msgs:2,act:'运行中'},{name:'shell',color:C.lane3,status:'idle',tasks:2,msgs:2,act:null},{name:'verify',color:C.lane4,status:'provisioning',tasks:1,msgs:2,act:null}];
lanes.forEach((L,i)=>{
 const y=AX_H+i*LANE_H;
 const row=F(heads,'head-'+L.name,0,y,HEAD_W,LANE_H,{fill:null});R(row,'sep',0,0,HEAD_W,1,C.b1);
 const pw=Math.ceil(estW(L.name,11))+13;
 const pill=F(row,'name-pill',6,6,pw,20,{fill:L.color,radius:3});TL(pill,'name',L.name,6,0,20,{size:11,color:'#FFFFFF',fontStyle:'Medium'});
 if(L.status==='running'){SVG(row,'spin','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.6" fill="none" stroke="'+C.b2+'" stroke-width="1.5"/><path d="M6 1.4 A4.6 4.6 0 0 1 10.6 6" fill="none" stroke="'+C.success+'" stroke-width="1.5" stroke-linecap="round"/></svg>',HEAD_W-19,11);}
 else if(L.status==='idle'){R(row,'pause-a',HEAD_W-19,12,2,8,C.t3,{radius:1});R(row,'pause-b',HEAD_W-15,12,2,8,C.t3,{radius:1});}
 else {TL(row,'prov','…',HEAD_W-21,10,14,{size:11,color:C.warn});}
 TL(row,'task-count',L.tasks+' 任务',6,28,16,{size:11,color:C.t3});
 TL(row,'dot1','·',6+estW(L.tasks+' 任务',11)+3,28,16,{size:11,color:C.t3});
 const ex=6+estW(L.tasks+' 任务',11)+3+estW('·',11)+4;
 SVG(row,'env',SYM.env(C.t3),ex,28+5);
 TL(row,'msg-count',String(L.msgs),ex+11,28,16,{size:11,color:C.t3});
 if(L.act)TL(row,'activity',L.act,6,44,16,{size:11,color:C.t2});
});
/* axis + plot */
const scroll=F(P,'scroll',HEAD_W,AX_Y,480-HEAD_W,AX_H+5*LANE_H,{fill:null,clip:true});
const axis=F(scroll,'axis',0,0,480-HEAD_W,AX_H,{fill:C.bg1});R(axis,'axis-b',0,AX_H-1,480-HEAD_W,1,C.b2);
for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD_W;if(x<0||x>348)continue;if(s%600===0){TL(axis,'tick-'+s,'16:'+String(s/60).padStart(2,'0'),x+3,6,16,{size:11,latin:true,color:C.t2,fontStyle:'Medium'});}else{R(axis,'minor-'+s,x,AX_H-6,1,6,C.b1);}}
const laneData=[
 {i:0,color:C.lane0,turns:[[10,170],[185,340],[700,1200]],steps:[[10,60],[70,170],[185,250],[260,340],[700,800],[820,910],[930,1010],[1030,1200]],waits:[[350,430,'woken']],msgs:[[300,'out',C.lane1],[420,'in',C.lane2],[960,'out',C.lane1]],tasks:[{s:'设计面板布局',a:30,b:300,ev:['c','p','k']},{s:'重写工具栏分组',a:700,b:null,ev:['c']}]},
 {i:1,color:C.lane1,turns:[[20,200],[210,470]],steps:[[20,100],[110,200],[210,320],[330,470]],waits:[[500,760,'open']],msgs:[[150,'in',C.lane0],[460,'out',C.lane0]],tasks:[{s:'折叠时间线的回填',a:120,b:440,ev:['c','p','k']},{s:'补齐回填逻辑',a:800,b:1100,ev:['c','p','k']}]},
 {i:2,color:C.lane2,turns:[[360,700],[710,1200]],steps:[[360,430],[440,520],[530,700],[710,800],[810,900],[910,1000],[1010,1200]],waits:[],msgs:[[560,'in',C.lane0],[980,'out',C.lane0],[1150,'q',C.redStatic]],tasks:[{s:'面板骨架与样式令牌',a:430,b:700,ev:['c','p','k']},{s:'走查滚动与对齐',a:760,b:null,ev:['c']}]},
 {i:3,color:C.lane3,turns:[[520,860]],steps:[[520,600],[610,700],[710,860]],waits:[],msgs:[[640,'in',C.lane2],[900,'out',C.lane2]],tasks:[{s:'页面外壳与页签注册',a:560,b:700,ev:['c','p','k']},{s:'状态与边界处理',a:780,b:1100,ev:['c','p','k']}]},
 {i:4,color:C.lane4,turns:[[860,1200]],steps:[[860,930],[940,1030],[1040,1200]],waits:[],msgs:[[900,'in',C.lane0],[1100,'out',C.lane0]],tasks:[{s:'验收面板与交互走查',a:980,b:null,ev:['c']}]}
];
const plot=F(scroll,'plot',0,AX_H,348,5*LANE_H,{fill:null,clip:true});
laneData.forEach((L,idx)=>{const y=idx*LANE_H;if(idx%2===1)R(plot,'alt-'+idx,0,y,348,LANE_H,C.bg2,{opacity:0.5});R(plot,'sep-'+idx,0,y,348,1,C.b1);});
for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD_W;if(x<0||x>348)continue;const major=s%600===0;R(plot,'grid-'+s,x,0,1,5*LANE_H,major?C.b2:C.b1,{opacity:major?0.9:0.6});}
laneData.forEach((L,idx)=>{
 const y=idx*LANE_H;
 (L.waits||[]).forEach((w,wi)=>{
  const x1=px(w[0])-HEAD_W,x2=px(w[1])-HEAD_W,wd=x2-x1;
  const band=F(plot,'wait-'+idx+'-'+wi,x1,y+17,wd,10,{fill:null,clip:true});
  R(band,'wait-bg',0,0,wd,10,C.t3,{opacity:0.35});
  for(let hx=-10;hx<wd+10;hx+=4){const st=R(band,'hatch',hx,0,1.6,14,C.bg1,{opacity:0.9});st.rotation=45;}
  R(band,'cap-start',0,-1,2,12,C.t1);if(w[2]!=='open')R(band,'cap-end',wd-2,-1,2,12,C.t1);
 });
 (L.turns||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD_W,x2=px(t[1])-HEAD_W;R(plot,'turn-'+idx+'-'+ti,x1,y+17,x2-x1,10,L.color,{radius:3,opacity:0.75});});
 (L.steps||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD_W,x2=px(t[1])-HEAD_W;const open=(t[1]>=1200);R(plot,'step-'+idx+'-'+ti,x1,y+18,x2-x1,8,L.color,{radius:2,border:open?C.business:null});});
 (L.msgs||[]).forEach((m,mi)=>{
  const s=m[0],dir=m[1],color=m[2],x=px(s)-HEAD_W,yy=y+2;
  if(dir==='q'){E(plot,'q-halo-'+idx+'-'+mi,x-7,yy,14,14,C.bg1);TL(plot,'q-'+idx+'-'+mi,'?',x-2.5,yy-3,14,{size:11,color:C.redStatic,fontStyle:'Medium'});return;}
  const rot=dir==='in'?' transform="rotate(180 6.5 6.5)"':'';
  const path='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
  const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+path+'" fill="none" stroke="'+C.bg1+'" stroke-width="4.2" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
  SVG(plot,'msg-'+idx+'-'+mi,svg,x-9.3,yy-1);
 });
 (L.tasks||[]).forEach((t,ti)=>{
  const x1=px(t.a)-HEAD_W;const end=t.b===null?NOW:t.b;let w=px(end)-HEAD_W-x1;const live=t.b===null;const by=y+30;
  if(w<12&&live){R(plot,'task-marker-'+idx+'-'+ti,x1,by+6,9,9,L.color,{radius:2});return;}
  const ww=Math.max(w,14);
  R(plot,'task-'+idx+'-'+ti,x1,by,ww,20,C.bg2,{radius:live?0:4,rTL:4,rBL:4,border:C.b2});
  R(plot,'task-stripe-'+idx+'-'+ti,x1,by,3,20,L.color,{rTL:4,rBL:4,rTR:0,rBR:0});
  if(live){for(let yy=0;yy<20;yy+=4)R(plot,'task-open-'+idx+'-'+ti+'-'+yy,x1+ww-1.5,by+yy,1.5,2.4,L.color);}
  const labelW=ww-13;
  if(labelW>=26){TL(plot,'task-label-'+idx+'-'+ti,fit(t.s,labelW,11),x1+9,by+2,16,{size:11,color:C.t1,fontStyle:'Medium'});}
  else if(labelW>=13){TL(plot,'task-ell-'+idx+'-'+ti,'…',x1+7,by+2,16,{size:11,color:C.t2,fontStyle:'Medium'});}
  (t.ev||[]).forEach((ev,ei)=>{const ex=px(t.a+[0,15,60][ei])-HEAD_W;const i=ev==='c'?0:1;const svg=ev==='c'?SYM.plus(L.color):(ev==='p'?SYM.play(L.color):SYM.check(L.color));SVG(plot,'task-ev-'+idx+'-'+ti+'-'+ei,svg,ex,by+22);});
 });
});
R(scroll,'now-line',px(NOW)-HEAD_W,AX_H,1,5*LANE_H,C.business);
const nowHead=F(scroll,'now-head',px(NOW)-HEAD_W-30,1,60,14,{fill:C.t1,radius:3});nowHead.topLeftRadius=0;nowHead.topRightRadius=0;
TL(nowHead,'now-t','现在 16:20',4,0,14,{size:10,color:'#353638',fontStyle:'Medium'});
/* footer */
const foot=F(P,'footer',0,492,480,88,{fill:C.bg1});R(foot,'foot-top',0,0,480,1,C.b1);
function zbtn(name,x,svg){const b=F(foot,name,x,4,20,20,{fill:null,radius:5,stroke:C.b2});SVG(b,name+'-i',svg,6,6);return x+24;}
let lxx=6;lxx=zbtn('z-out',lxx,SYM.minus(C.t2));lxx=zbtn('z-fit',lxx,SYM.fit(C.t2));lxx=zbtn('z-in',lxx,SYM.plus(C.t2));
TL(foot,'zoom-readout','4 秒/像素',lxx+2,4,20,{size:11,color:C.t3});
const lg=F(foot,'legend',0,26,480,40,{fill:null});
R(lg,'sw-turn',6,2,14,8,C.bg3,{radius:2,opacity:0.75});TL(lg,'lb-turn','turn 区间',24,-2,16,{size:11,color:C.t3});
R(lg,'sw-step',106,3,14,6,C.t3,{radius:2});TL(lg,'lb-step','step 区间',124,-2,16,{size:11,color:C.t3});
R(lg,'sw-card',196,1,14,9,C.bg2,{radius:2,border:C.b2});R(lg,'sw-card-l',196,1,3,9,C.t3,{rTL:2,rBL:2});TL(lg,'lb-card','任务卡',214,-2,16,{size:11,color:C.t3});
SVG(lg,'sw-out','<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.t3+'" stroke-width="2" stroke-linecap="round"/></svg>',278,0);
TL(lg,'lb-out','发出',292,-2,16,{size:11,color:C.t3});
SVG(lg,'sw-in','<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(180 6.5 6.5)"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.t3+'" stroke-width="2" stroke-linecap="round"/></g></svg>',332,0);
TL(lg,'lb-in','收到',346,-2,16,{size:11,color:C.t3});
/* row 2 */
R(lg,'sw-wait',6,22,16,8,C.t1,{opacity:0.35});R(lg,'sw-wait-cap',6,20,2,12,C.t1);
TL(lg,'lb-wait','等待开始/结束',24,18,16,{size:11,color:C.t3});
TL(lg,'lb-hist','状态迁移',140,18,16,{size:11,color:C.t3});
SVG(lg,'hist-c',SYM.plus(C.t3),200,22);TL(lg,'lb-h1','创建',210,18,16,{size:11,color:C.t3});
SVG(lg,'hist-p',SYM.play(C.t3),246,22);TL(lg,'lb-h2','认领',256,18,16,{size:11,color:C.t3});
SVG(lg,'hist-k',SYM.check(C.t3),292,22);TL(lg,'lb-h3','完成',302,18,16,{size:11,color:C.t3});
TL(P,'build','v0.2.38',6,560,16,{size:11,color:C.t3,opacity:0.7});
/* side notes */
const SX=560;
TL(PAGE,'notes-t','重建说明',SX,112,20,{size:12,color:C.t1,fontStyle:'Medium'});
TT(PAGE,'notes-b','1. 尺寸与层级按 src/client/ui 常量重建：泳道头 132、泳道 72、轴 28、任务条 20、消息轨 11、活动轨 10。\n\n2. 颜色取 DSH 暗色别名真实值：bg #232324 / layer-2 #2C2C2E / 边框白 12% / brand #F9FAFB / business #7AAAFF。\n\n3.「现在」chip 与「跟随时间线」按钮的描边用的是 brand-primary——深色皮肤下这个令牌本身接近纯白，于是两个次要控件变成了全屏最亮的两道白框。\n\n4. 工具栏固定宽合计约 515px，超过 480px 面板：右侧「9 任务」被裁、刷新按钮完全不可见，且滚动条被隐藏。\n\n5. 底部图例 11 项分两行，再加构建标识一行，占掉面板底部约 15% 高度。\n\n6. 任务卡内文字 11px，短条只能显示「…」；条下还有 3 类事件字形（＋ ▶ ✓）。',SX,140,392,{size:11,lh:19,color:C.t3});
TL(PAGE,'sizes-t','画布取值',SX,492,20,{size:12,color:C.t1,fontStyle:'Medium'});
TT(PAGE,'sizes-b','面板 480 × 580   ·   工具栏 30   ·   轴 28   ·   泳道 5 × 72\n泳道头 132   ·   任务条 20   ·   消息轨 11   ·   活动轨 10\n字号 11 / 12   ·   圆角 3 / 4 / 5 / 9   ·   比例 4 秒 / 像素',SX,520,392,{size:11,lh:19,color:C.t3});
figma.viewport.scrollAndZoomIntoView([PAGE]);
return {ok:true,frame:P.id};
