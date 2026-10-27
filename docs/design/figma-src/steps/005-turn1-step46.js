// dsh-task-gantt · Figma build step 5/90
// turn 1 · step 46 · callId call_00_dyhzwdgf2n0a7ck6n3tubi3d
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',business:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',lane0:'#2563EB',lane1:'#A3294F',lane2:'#558130',lane3:'#786BA5',lane4:'#765C19',doc:'#1B1B1C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o,dash){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';if(dash)n.strokeDashes=dash;}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity,o.dash);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function T(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.ls!==undefined)n.letterSpacing={unit:'PIXELS',value:o.ls};if(o.color)fill(n,o.color);n.textAutoResize='NONE';n.resize(Math.max(w,1),o.h||(o.lh||Math.max(o.size||11,14)));n.textAlignHorizontal=o.align||'LEFT';n.textAlignVertical='CENTER';n.x=x;n.y=y;if(o.opacity)n.opacity=o.opacity;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function estW(str,size){let w=0;for(const ch of str){const c=ch.codePointAt(0);if(c>0x2e80)w+=size;else if(ch===' ')w+=size*0.3;else w+=size*0.56;}return w;}
let step='start';
try{
await Promise.all([
 figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),
 figma.loadFontAsync({family:'SF Pro',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'}),
 figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})
]);
step='fonts';
const page=figma.root.children.find(p=>p.name.startsWith('01'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const PAGE=F(page,'page 01 doc',0,0,1000,760,{fill:C.doc});
T(PAGE,'pt','01 · 现状 AS-IS',0,0,700,{size:24,color:C.t1,fontStyle:'Semibold'});
T(PAGE,'ps','按 v0.2.38 源码与 DSH 暗色令牌重建 · 面板 480 × 580 · 5 条泳道 · 工具栏在 480px 下的真实溢出状态',0,40,940,{size:12,color:C.t3});
const P=F(PAGE,'01 · 现状面板 480×580',0,110,480,580,{fill:C.bg1,clip:true});
step='panel';
const X0=138, SEC=4, NOW=1200;
const px=s=>X0+s/SEC;
const LANE_H=72, AX_Y=30, AX_H=28, HEAD_W=132;
const TF_H=30;
step='toolbar';
const bar=F(P,'toolbar',0,0,480,TF_H,{fill:C.bg1});
R(bar,'bar-border',0,TF_H-1,480,1,C.b1);
let cx=6, cy=5;
function chip(name,label,w,opts){opts=opts||{};const f=F(bar,name,cx,cy,w,20,{fill:null,radius:9,stroke:opts.border||C.b2});T(f,name+'-t',label,6,3,w-12,{size:11,color:opts.color||C.t2});cx+=w+4;return f;}
chip('chip-source','时间来自会话日志',103,{});
chip('chip-now','现在',37,{border:C.t1,color:C.t1});
const rangeF=F(bar,'range',cx,cy,90,20,{fill:null});T(rangeF,'range-label','时间段',0,3,33,{size:11,color:C.t3});
const sel=F(rangeF,'select',36,0,54,20,{fill:C.bg1,radius:3,stroke:C.b2});T(sel,'select-txt','全部',5,3,34,{size:11,color:C.t2});T(sel,'select-caret','▾',41,3,10,{size:9,color:C.t3});
cx+=94;
const fw=Math.ceil(estW('跟随时间线 ●',12,{}))+12;
const follow=F(bar,'btn-follow',cx,cy,fw,20,{fill:null,radius:5,stroke:C.t1});T(follow,'follow-t','跟随时间线 ●',6,3,fw-12,{size:12,color:C.t1,fontStyle:'Medium'});
cx+=fw+4;
const flt=F(bar,'btn-filter',cx,cy,100,20,{fill:null,radius:5,stroke:C.b2});T(flt,'filter-t','筛选 teammate ·',5,3,90,{size:11,color:C.t2});
cx+=104;
const tasksChip=F(bar,'chip-tasks',cx,cy,47,20,{fill:null,radius:9,stroke:C.b2});T(tasksChip,'tasks-t','9 任务',6,3,36,{size:11,color:C.t2});
cx+=51;
const retry=F(bar,'btn-retry',cx,cy,22,20,{fill:null,radius:5,stroke:C.b2});T(retry,'retry-t','⟳',4,3,14,{size:12,color:C.t2,align:'CENTER'});
step='heads';
const heads=F(P,'lane-heads',0,AX_Y,HEAD_W,AX_H+5*LANE_H,{fill:C.bg1});
R(heads,'head-right-border',HEAD_W-1,0,1,AX_H+5*LANE_H,C.b2);
const corner=F(heads,'corner',0,0,HEAD_W,AX_H,{fill:C.bg1});R(corner,'corner-b',0,AX_H-1,HEAD_W,1,C.b1);T(corner,'corner-t','活动',6,6,100,{size:11,color:C.t3});
const lanes=[
 {name:'Lead',color:C.lane0,status:'running',tasks:2,msgs:3,act:'运行中'},
 {name:'host-data',color:C.lane1,status:'idle',tasks:2,msgs:2,act:null},
 {name:'ui',color:C.lane2,status:'running',tasks:2,msgs:2,act:'运行中'},
 {name:'shell',color:C.lane3,status:'idle',tasks:2,msgs:2,act:null},
 {name:'verify',color:C.lane4,status:'provisioning',tasks:1,msgs:2,act:null}
];
lanes.forEach((L,i)=>{
 const y=AX_H+i*LANE_H;
 const row=F(heads,'head-'+L.name,0,y,HEAD_W,LANE_H,{fill:null});R(row,'sep',0,0,HEAD_W,1,C.b1);
 const pw=Math.ceil(estW(L.name,11,{}))+13;
 const pill=F(row,'name-pill',6,6,pw,20,{fill:L.color,radius:3});T(pill,'name',L.name,6,3,pw-12,{size:11,color:'#FFFFFF',fontStyle:'Medium'});
 if(L.status==='running'){SVG(row,'spin','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.6" fill="none" stroke="'+C.b2+'" stroke-width="1.5"/><path d="M6 1.4 A4.6 4.6 0 0 1 10.6 6" fill="none" stroke="'+C.success+'" stroke-width="1.5" stroke-linecap="round"/></svg>',HEAD_W-18,11);}
 else if(L.status==='idle'){R(row,'pause-a',HEAD_W-19,12,2,8,C.t3,{radius:1});R(row,'pause-b',HEAD_W-15,12,2,8,C.t3,{radius:1});}
 else {T(row,'prov','…',HEAD_W-20,10,12,{size:11,color:C.warn,align:'CENTER'});}
 T(row,'counts',L.tasks+' 任务 · ✉ '+L.msgs,6,32,116,{size:11,color:C.t3});
 if(L.act)T(row,'activity',L.act,6,48,116,{size:11,color:C.t2});
});
step='axis';
const scroll=F(P,'scroll',HEAD_W,AX_Y,480-HEAD_W,AX_H+5*LANE_H,{fill:null,clip:true});
const axis=F(scroll,'axis',0,0,480-HEAD_W,AX_H,{fill:C.bg1});R(axis,'axis-b',0,AX_H-1,480-HEAD_W,1,C.b2);
for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD_W;if(x<0||x>348)continue;const major=s%600===0;if(major){T(axis,'tick-'+s,'16:'+String(s/60).padStart(2,'0'),x+3,7,60,{size:11,latin:true,color:C.t2,fontStyle:'Medium'});}else{R(axis,'minor-'+s,x,AX_H-6,1,6,C.b1);}}
step='lanes';
const laneData=[
 {i:0,color:C.lane0,
  turns:[[10,170],[185,340],[700,1200]],steps:[[10,60],[70,170],[185,250],[260,340],[700,800],[820,910],[930,1010],[1030,1200]],
  waits:[[350,430,'woken']],msgs:[[300,'out',C.lane1],[420,'in',C.lane2],[960,'out',C.lane1]],
  tasks:[{s:'设计面板布局',a:30,b:300,ev:[30,60,300]},{s:'重写工具栏分组',a:700,b:null,ev:[700]}]},
 {i:1,color:C.lane1,
  turns:[[20,200],[210,470]],steps:[[20,100],[110,200],[210,320],[330,470]],
  waits:[[500,760,'open']],msgs:[[150,'in',C.lane0],[460,'out',C.lane0]],
  tasks:[{s:'折叠时间线的回填',a:120,b:440,ev:[120,150,440]},{s:'补齐回填逻辑',a:800,b:1100,ev:[800,830,1100]}]},
 {i:2,color:C.lane2,
  turns:[[360,700],[710,1200]],steps:[[360,430],[440,520],[530,700],[710,800],[810,900],[910,1000],[1010,1200]],
  waits:[],msgs:[[560,'in',C.lane0],[980,'out',C.lane0],[1150,'q','#EC1313']],
  tasks:[{s:'面板骨架与样式令牌',a:430,b:700,ev:[430,460,700]},{s:'走查滚动与对齐',a:760,b:null,ev:[760]}]},
 {i:3,color:C.lane3,
  turns:[[520,860]],steps:[[520,600],[610,700],[710,860]],
  waits:[],msgs:[[640,'in',C.lane2],[900,'out',C.lane2]],
  tasks:[{s:'页面外壳与页签注册',a:560,b:700,ev:[560,585,700]},{s:'状态与边界处理',a:780,b:1100,ev:[780,810,1100]}]},
 {i:4,color:C.lane4,
  turns:[[860,1200]],steps:[[860,930],[940,1030],[1040,1200]],
  waits:[],msgs:[[900,'in',C.lane0],[1100,'out',C.lane0]],
  tasks:[{s:'验收面板与交互走查',a:980,b:null,ev:[980]}]}
];
const plot=F(scroll,'plot',0,AX_H,348,5*LANE_H,{fill:null,clip:true});
laneData.forEach((L,idx)=>{const y=idx*LANE_H;if(idx%2===1)R(plot,'alt-'+idx,0,y,348,LANE_H,C.bg2,{opacity:0.5});R(plot,'sep-'+idx,0,y,348,1,C.b1);});
for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD_W;if(x<0||x>348)continue;const major=s%600===0;R(plot,'grid-'+s,x,0,1,5*LANE_H,major?C.b2:C.b1,{opacity:major?0.9:0.6});}
step='lane-content';
laneData.forEach((L,idx)=>{
 const y=idx*LANE_H;
 (L.waits||[]).forEach((w,wi)=>{
  const x1=px(w[0])-HEAD_W, x2=px(w[1])-HEAD_W, wd=x2-x1;
  const band=F(plot,'wait-'+idx+'-'+wi,x1,y+17,wd,10,{fill:null,clip:true});
  R(band,'wait-bg',0,0,wd,10,C.t3,{opacity:0.35});
  for(let hx=-10;hx<wd+10;hx+=4){const st=R(band,'hatch',hx,0,1.6,14,C.bg1,{opacity:0.9});st.rotation=45;}
  R(band,'cap-start',0,-1,2,12,C.t1);
  if(w[2]!=='open')R(band,'cap-end',wd-2,-1,2,12,C.t1);
 });
 (L.turns||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD_W,x2=px(t[1])-HEAD_W;R(plot,'turn-'+idx+'-'+ti,x1,y+17,x2-x1,10,L.color,{radius:3,opacity:0.75});});
 (L.steps||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD_W,x2=px(t[1])-HEAD_W;const open=(t[1]>=1200);R(plot,'step-'+idx+'-'+ti,x1,y+18,x2-x1,8,L.color,{radius:2,border:open?C.business:null,dash:open?[2,2]:null});});
 (L.msgs||[]).forEach((m,mi)=>{
  const s=m[0],dir=m[1],color=m[2],x=px(s)-HEAD_W,yy=y+3;
  if(dir==='q'){E(plot,'q-halo-'+idx+'-'+mi,x-7,yy-1,14,14,C.bg1);T(plot,'q-'+idx+'-'+mi,'?',x-4,yy,9,{size:11,color:'#EC1313',fontStyle:'Medium',align:'CENTER'});return;}
  const flip=dir==='in';
  const rot=flip?' transform="rotate(180 6.5 6.5)"':'';
  const path='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
  const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+path+'" fill="none" stroke="'+C.bg1+'" stroke-width="4.4" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
  SVG(plot,'msg-'+idx+'-'+mi,svg,x-9.3,yy-1);
 });
 (L.tasks||[]).forEach((t,ti)=>{
  const x1=px(t.a)-HEAD_W;
  const end=t.b===null?NOW:t.b;
  let w=px(end)-HEAD_W-x1;
  const live=t.b===null;
  const by=y+30;
  if(w<12&&live){R(plot,'task-marker-'+idx+'-'+ti,x1,by+5,9,9,L.color,{radius:2});return;}
  const ww=Math.max(w,14);
  R(plot,'task-'+idx+'-'+ti,x1,by,ww,20,C.bg2,{radius:live?0:4,rTL:4,rBL:4,border:C.b2});
  R(plot,'task-stripe-'+idx+'-'+ti,x1,by,3,20,L.color,{rTL:4,rBL:4,rTR:0,rBR:0});
  if(live)R(plot,'task-open-'+idx+'-'+ti,x1+ww-1.5,by,1.5,20,L.color,{border:L.color,dash:[2,2]});
  const labelW=ww-13;
  if(labelW>=30){T(plot,'task-label-'+idx+'-'+ti,t.s,x1+9,by+3,labelW,{size:11,color:C.t1,fontStyle:'Medium'});}
  else if(labelW>=15){T(plot,'task-ell-'+idx+'-'+ti,'…',x1+7,by+3,10,{size:11,color:C.t2,fontStyle:'Medium'});}
  (t.ev||[]).forEach((ev,ei)=>{const ex=px(ev)-HEAD_W;const glyph=ei===0?'＋':(ev===t.b?'✓':'▶');T(plot,'task-ev-'+idx+'-'+ti+'-'+ei,glyph,ex-1,by+21,12,{size:11,color:L.color,fontStyle:'Medium'});});
 });
});
step='now';
R(scroll,'now-line',px(NOW)-HEAD_W,AX_H,1,5*LANE_H,C.business);
const nowHead=F(scroll,'now-head',px(NOW)-HEAD_W-29,0,58,15,{fill:C.t1,radius:3});
T(nowHead,'now-t','现在 16:20',3,1,52,{size:11,color:'#353638',fontStyle:'Medium'});
step='footer';
const foot=F(P,'footer',0,500,480,64,{fill:C.bg1});
R(foot,'foot-top',0,0,480,1,C.b1);
function lbtn(name,x,label){const b=F(foot,name,x,4,20,20,{fill:null,radius:5,stroke:C.b2});T(b,name+'-t',label,3,2,14,{size:12,color:C.t2,align:'CENTER'});return x+24;}
let lxx=6;lxx=lbtn('z-out',lxx,'−');lxx=lbtn('z-fit',lxx,'⤢');lxx=lbtn('z-in',lxx,'＋');
T(foot,'zoom-readout','4 秒/像素',lxx+2,7,70,{size:11,color:C.t3});
const lg=F(foot,'legend',0,24,480,40,{fill:null});
R(lg,'sw-turn',6,28,14,8,C.bg3,{radius:2,opacity:0.75});T(lg,'lb-turn','turn 区间',24,24,80,{size:11,color:C.t3});
R(lg,'sw-step',106,28,14,6,C.t3,{radius:2});T(lg,'lb-step','step 区间',124,24,80,{size:11,color:C.t3});
R(lg,'sw-card',196,27,14,9,C.bg2,{radius:2,border:C.b2});R(lg,'sw-card-l',196,27,3,9,C.t3,{rTL:2,rBL:2});T(lg,'lb-card','任务卡',214,24,60,{size:11,color:C.t3});
SVG(lg,'sw-out','<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.t3+'" stroke-width="2" stroke-linecap="round"/></svg>',278,26);
T(lg,'lb-out','发出',292,24,40,{size:11,color:C.t3});
SVG(lg,'sw-in','<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(180 6.5 6.5)"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.t3+'" stroke-width="2" stroke-linecap="round"/></g></svg>',332,26);
T(lg,'lb-in','收到',346,24,40,{size:11,color:C.t3});
R(lg,'sw-wait',6,50,16,8,C.t1,{opacity:0.35});R(lg,'sw-wait-cap',6,48,2,12,C.t1);
T(lg,'lb-wait','等待开始/结束',24,46,110,{size:11,color:C.t3});
T(lg,'lb-hist','状态迁移',140,46,60,{size:11,color:C.t3});
T(lg,'lb-h1','＋ 创建',200,46,50,{size:11,color:C.t3});
T(lg,'lb-h2','▶ 认领',252,46,50,{size:11,color:C.t3});
T(lg,'lb-h3','✓ 完成',302,46,50,{size:11,color:C.t3});
T(P,'build','v0.2.38',6,556,200,{size:11,color:C.t3});
step='done';
figma.viewport.scrollAndZoomIntoView([PAGE]);
return {ok:true, frame:P.id};
}catch(e){ return {step, err:String(e)}; }
