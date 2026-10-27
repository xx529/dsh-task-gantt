// dsh-task-gantt · Figma build step 21/90
// turn 1 · step 72 · callId call_00_hqyuawwciopjutbz4x1w3kcc
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const LANE=['#2563EB','#A3294F','#558130','#786BA5','#765C19','#9D5C91'];
const DARK={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',onAccent:'#0F1115',card:'#2C2C2E',cardBorder:'#3A3A3C',alt:'#2C2C2E',hatch:'#CFD3D6'};
const LIGHT={bg1:'#FFFFFF',bg2:'#F5F6F8',bg3:'#EBEEF2',b1:'#F0F1F2',b2:'#E6E6E6',t1:'#0F1115',t2:'#61666B',t3:'#81858C',dim:'#C9CDD4',accent:'#4176E6',success:'#16A34A',warn:'#D97706',error:'#DC2626',onAccent:'#FFFFFF',card:'#F5F6F8',cardBorder:'#E6E6E6',alt:'#FAFAFB',hatch:'#61666B'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||'#232324')];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.ls!==undefined)n.letterSpacing={unit:'PIXELS',value:o.ls};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function estW(str,size){let w=0;for(const ch of str){const c=ch.codePointAt(0);if(c>0x2e80)w+=size;else if(ch===' ')w+=size*0.32;else w+=size*0.58;}return w;}
function fit(str,maxW,size){if(estW(str,size)<=maxW)return str;let out='';for(const ch of str){if(estW(out+ch+'…',size)>maxW)break;out+=ch;}return out+'…';}
const SYM={
 minus:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 4.5 H7.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 plus:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M4 1.2 V6.8 M1.2 4 H6.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4.2 L3.1 6.1 L6.8 1.9" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 fitIcon:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1 3.4 V1 H3.4 M6.6 1 H9 V3.4 M9 6.6 V9 H6.6 M3.4 9 H1 V6.6" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/></svg>`,
 refresh:(c)=>`<svg width="11" height="11" viewBox="0 0 11 11" xmlns="http://www.w3.org/2000/svg"><path d="M8.9 3.8 A3.7 3.7 0 1 0 9.3 5.9" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><path d="M6.9 1.2 L9.1 1.2 L9.1 3.4" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 funnel:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1.6 2.4 H10.4 L6.8 6.6 V10.4 L5.2 9.2 V6.6 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
 chevron:(c)=>`<svg width="8" height="5" viewBox="0 0 8 5" xmlns="http://www.w3.org/2000/svg"><path d="M1 1 L4 4 L7 1" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 q:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><circle cx="4.5" cy="4.5" r="4" fill="none" stroke="${c}" stroke-width="1"/><path d="M3.4 3.3 C3.5 2.5 4 2.1 4.6 2.1 C5.3 2.1 5.7 2.5 5.7 3.1 C5.7 3.9 4.6 4 4.6 4.9" fill="none" stroke="${c}" stroke-width="1" stroke-linecap="round"/><circle cx="4.6" cy="6.6" r="0.55" fill="${c}"/></svg>`
};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'})]);
const page=figma.root.children.find(p=>p.name.startsWith('03'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 03 doc',0,0,1440,800,{fill:'#1B1B1C'});
TL(DOC,'pt','03 · 改版 MAIN',0,0,34,{size:24,color:'#F9FAFB',fontStyle:'Semibold'});
TL(DOC,'ps','同样的信息量，第一次就能读懂：左侧暗色（默认皮肤）· 中间亮色 · 右侧改版要点',0,38,18,{size:12,color:'#ADB2B8'});
const TB=40,AXH=26,HEAD=136,LH=80,FOOT=32,X0=142,SEC=4,NOW=1200;
const px=s=>X0+s/SEC;
const lanes=[
 {name:'Lead',c:0,status:'running',tasks:2,msg:3,act:'运行中',turns:[[10,180],[200,440],[600,1200]],steps:[[10,70],[80,180],[200,270],[280,360],[370,440],[600,700],[720,800],[820,900],[920,1010],[1020,1200]],waits:[[450,540]],msgs:[[300,'out',1],[500,'in',2],[960,'out',1]],ts:[{s:'设计面板布局',a:30,b:420,st:'k'},{s:'重写工具栏分组',a:620,b:null,st:'p'}]},
 {name:'host-data',c:1,status:'idle',tasks:2,msg:2,act:null,turns:[[20,220],[240,520],[600,1000]],steps:[[20,110],[120,220],[240,350],[360,520],[600,700],[720,820],[840,1000]],waits:[[500,700]],msgs:[[150,'in',0],[460,'out',0]],ts:[{s:'折叠时间线与泳道筛选',a:60,b:480,st:'k'},{s:'补齐回填逻辑',a:600,b:1000,st:'k'}]},
 {name:'ui',c:2,status:'running',tasks:2,msg:3,act:'运行中',turns:[[280,680],[700,1200]],steps:[[280,360],[370,460],[470,560],[570,680],[700,790],[800,890],[900,1000],[1010,1200]],waits:[],msgs:[[560,'in',0],[980,'out',3],[1150,'q',0]],ts:[{s:'面板骨架与样式令牌',a:300,b:660,st:'k'},{s:'走查滚动与对齐',a:700,b:null,st:'p'}]},
 {name:'shell',c:3,status:'idle',tasks:2,msg:2,act:null,turns:[[400,740],[760,1100]],steps:[[400,480],[490,600],[610,740],[760,850],[860,960],[970,1100]],waits:[],msgs:[[640,'in',2],[940,'out',2]],ts:[{s:'页面外壳与页签注册',a:420,b:720,st:'k'},{s:'状态与边界处理',a:760,b:1080,st:'k'}]},
 {name:'verify',c:4,status:'provisioning',tasks:1,msg:2,act:null,turns:[[880,1200]],steps:[[880,950],[960,1050],[1060,1200]],waits:[],msgs:[[900,'in',0],[1100,'out',0]],ts:[{s:'验收面板与交互走查',a:900,b:null,st:'p'}]},
 {name:'packaging',c:5,status:'running',tasks:1,msg:2,act:'写文件',turns:[[520,920]],steps:[[520,600],[610,700],[710,800],[810,920]],waits:[],msgs:[[700,'in',0],[1050,'out',0]],ts:[{s:'整理 CHANGELOG 与发布说明',a:540,b:900,st:'k'}]}
];
function drawPanel(P,ox,oy,name){
 const frame=F(DOC,name,ox,oy,480,580,{fill:P.bg1,clip:true});
 const tb=F(frame,'toolbar',0,0,480,TB,{fill:P.bg1});R(tb,'tb-line',0,TB-1,480,1,P.b1);
 E(tb,'source-dot',12,17,6,6,P.t3);
 TL(tb,'source','会话日志',22,12,16,{size:11,color:P.t3});
 const nowP=F(tb,'now-pill',82,7,88,26,{fill:null,stroke:P.accent,radius:6}); nowP.fills=[solid(P.accent,0.14)]; stroke(nowP,P.accent,1,0.45);
 TL(nowP,'now-label','现在',8,0,26,{size:10.5,color:P.t2});
 TL(nowP,'now-time','16:20',42,0,26,{size:11,mono:true,color:P.accent});
 const range=F(tb,'range',230,7,92,26,{fill:null,stroke:P.b1,radius:6});
 TL(range,'range-t','全部时段',10,0,26,{size:11,color:P.t2});
 SVG(range,'range-chev',SYM.chevron(P.t3),74,11);
 const follow=F(tb,'follow',330,7,64,26,{fill:null});
 const track=F(follow,'switch',0,6,26,14,{fill:P.accent,radius:7});
 E(track,'knob',13,2,10,10,'#FFFFFF');
 TL(follow,'follow-t','跟随',32,0,26,{size:11,color:P.t1});
 R(tb,'divider',398,13,1,14,P.b1);
 const filter=F(tb,'filter-btn',406,7,26,26,{fill:null,radius:6});
 SVG(filter,'funnel',SYM.funnel(P.t2),7,7);
 E(filter,'badge',17,-1,13,13,P.accent); TL(filter,'badge-t','2',17,-1,13,{size:8.5,mono:true,color:P.onAccent});
 const refresh=F(tb,'refresh',440,7,26,26,{fill:null,radius:6});
 SVG(refresh,'refresh-i',SYM.refresh(P.t2),7.5,7.5);
 const corner=F(frame,'head-corner',0,TB,HEAD,AXH,{fill:P.bg1});R(corner,'corner-b',0,AXH-1,HEAD,1,P.b1);
 TL(corner,'corner-t','成员',12,0,AXH,{size:10,color:P.t3});
 TL(corner,'corner-n','6',HEAD-24,0,AXH,{size:10,mono:true,color:P.t3});
 const axis=F(frame,'axis',HEAD,TB,480-HEAD,AXH,{fill:P.bg1});R(axis,'axis-b',0,AXH-1,480-HEAD,1,P.b1);
 for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD;if(x<0)continue;if(s%600===0){TL(axis,'tick-'+s,'16:'+String(s/60).padStart(2,'0'),x+2,4,16,{size:10,mono:true,color:P.t3});}else{R(axis,'minor-'+s,x,AXH-5,1,5,P.b1);}}
 const nowBadge=F(axis,'now-badge',480-HEAD-78,4,72,17,{fill:P.accent,radius:4});
 const nb=TL(nowBadge,'now-badge-t','现在 · 16:20',0,0,17,{size:9,mono:true,color:P.onAccent}); nb.x=(72-nb.width)/2;
 const plot=F(frame,'plot',HEAD,TB+AXH,480-HEAD,6*LH,{fill:null,clip:true});
 for(let s=0;s<=1200;s+=120){const x=px(s)-HEAD;if(x<0||x>348)continue;const major=s%600===0;R(plot,'grid-'+s,x,0,1,6*LH,P.b1,{opacity:major?1:0.45});}
 lanes.forEach((L,i)=>{
  const y=i*LH;
  if(i%2===1)R(plot,'alt-'+i,0,y,348,LH,P.alt,{opacity:0.55});
  R(plot,'lane-sep-'+i,0,y,348,1,P.b1);
  (L.turns||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD,x2=px(t[1])-HEAD;R(plot,'turn-'+i+'-'+ti,x1,y+8,x2-x1,10,LANE[L.c],{radius:3,opacity:0.2});});
  (L.steps||[]).forEach((t,ti)=>{const x1=px(t[0])-HEAD,x2=px(t[1])-HEAD;const open=t[1]>=1200;R(plot,'step-'+i+'-'+ti,x1,y+10,x2-x1,6,LANE[L.c],{radius:2});if(open)R(plot,'step-open-'+i+'-'+ti,x2-1.5,y+9,1.5,8,P.accent);});
  (L.waits||[]).forEach((w)=>{
   const x1=px(w[0])-HEAD,x2=px(w[1])-HEAD,wd=x2-x1;
   const band=F(plot,'wait-'+i,x1,y+8,wd,10,{fill:null,clip:true});
   R(band,'w-bg',0,0,wd,10,P.hatch,{opacity:0.28});
   for(let hx=-12;hx<wd+12;hx+=3.5){const st=R(band,'h',hx,0,1.4,16,P.bg1,{opacity:0.92});st.rotation=45;}
   R(band,'w-cap-s',0,-1,2,12,P.t2);R(band,'w-cap-e',wd-2,-1,2,12,P.t2);
  });
  (L.msgs||[]).forEach((m,mi)=>{
   const s=m[0],dir=m[1],peer=m[2],x=px(s)-HEAD,yy=y+24;
   if(dir==='q'){E(plot,'q-halo-'+i,x-6,yy,13,13,P.bg1);TL(plot,'q-'+i,'?',x-2.5,yy-2,13,{size:10,color:'#EC1313',fontStyle:'Medium'});return;}
   const color=LANE[peer];
   const rot=dir==='in'?' transform="rotate(180 6.5 6.5)"':'';
   const path='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
   const svg='<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+path+'" fill="none" stroke="'+P.bg1+'" stroke-width="4.2" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
   SVG(plot,'msg-'+i+'-'+mi,svg,x-8.6,yy+1);
  });
  (L.ts||[]).forEach((t,ti)=>{
   const x1=px(t.a)-HEAD;const end=t.b===null?NOW:t.b;const w=px(end)-HEAD-x1;const live=t.b===null;
   if(w<10&&live){R(plot,'task-marker',x1,y+50,9,9,LANE[L.c],{radius:2});return;}
   const ww=Math.max(w,22);const by=y+44;
   const bar=F(plot,'task',x1,by,ww,22,{fill:P.card,radius:5,clip:true,stroke:P.cardBorder});
   R(bar,'stripe',0,0,3,22,LANE[L.c],{rTL:5,rBL:5});
   TL(bar,'label',fit(t.s,ww-24,11),9,0,22,{size:11,color:P.t1,fontStyle:'Medium'});
   if(live){for(let yy=2;yy<20;yy+=4)R(bar,'open-dash',ww-2,yy,1.5,2.2,LANE[L.c]);}
   if(ww>=58){const gx=ww-13;
    if(t.st==='k')SVG(bar,'status',SYM.check(P.t3),gx,7);
    else E(bar,'status',gx,8.5,5,5,P.accent);
   }
   [t.a,t.b].forEach((ev)=>{if(ev===null)return;const ex=px(ev)-HEAD-x1-1;R(plot,'ev',x1+ex,by+20,1.5,2,P.t3,{opacity:0.75});});
  });
 });
 R(plot,'now-line',px(NOW)-HEAD,0,1.5,6*LH,P.accent);
 const foot=F(frame,'footer',0,548,480,FOOT,{fill:P.bg1});R(foot,'foot-line',0,0,480,1,P.b1);
 const zo=F(foot,'zoom',10,5,22,22,{fill:null,radius:5});SVG(zo,'m',SYM.minus(P.t2),6.5,6.5);
 TL(foot,'zoom-pct','100%',38,5,22,{size:10,mono:true,color:P.t3});
 const zi=F(foot,'zoom-in',70,5,22,22,{fill:null,radius:5});SVG(zi,'p',SYM.plus(P.t2),7,7);
 const zf=F(foot,'zoom-fit',98,5,22,22,{fill:null,radius:5});SVG(zf,'f',SYM.fitIcon(P.t2),6,6);
 const lg=F(foot,'legend-btn',372,5,48,22,{fill:null,radius:5});SVG(lg,'q',SYM.q(P.t3),4,6);TL(lg,'legend-t','图例',18,0,22,{size:10.5,color:P.t3});
 TL(foot,'build','v0.2.38',432,5,22,{size:9,mono:true,color:P.dim});
 const heads=F(frame,'heads',0,TB+AXH,HEAD,6*LH,{fill:P.bg1});R(heads,'heads-r',HEAD-1,0,1,6*LH,P.b1);
 lanes.forEach((L,i)=>{
  const y=i*LH;
  const row=F(heads,'head-'+L.name,0,y,HEAD,LH,{fill:null});R(row,'sep',0,0,HEAD,1,P.b1);
  const pw=Math.ceil(estW(L.name,11))+15;
  const pill=F(row,'pill',12,10,pw,20,{fill:LANE[L.c],radius:4});
  TL(pill,'pill-t',L.name,7,0,20,{size:11,color:'#FFFFFF',fontStyle:'Medium'});
  if(L.status==='running'){SVG(row,'spin','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.4" fill="none" stroke="'+P.b2+'" stroke-width="1.4"/><path d="M6 1.6 A4.4 4.4 0 0 1 10.4 6" fill="none" stroke="'+P.success+'" stroke-width="1.4" stroke-linecap="round"/></svg>',HEAD-24,14);}
  else if(L.status==='provisioning'){E(row,'prov-ring',HEAD-27,14,13,13,'none',{border:P.warn,borderOpacity:0.35,borderWeight:1});E(row,'prov-dot',HEAD-24,17,7,7,P.warn);}
  else {E(row,'idle-dot',HEAD-24,17,7,7,'none',{border:P.t3,borderWeight:1.4});}
  TL(row,'counts',`${L.tasks} 任务 · ${L.msg} 消息`,12,36,14,{size:10.5,color:P.t3});
  if(L.act)TL(row,'activity',L.act,12,54,14,{size:10.5,color:P.t2});
 });
 return frame;
}
const dark=drawPanel(DARK,0,110,'03 · 改版 · 暗色 480×580');
const light=drawPanel(LIGHT,520,110,'03 · 改版 · 亮色 480×580');
TL(DOC,'cap-d','暗色皮肤 · 默认',0,700,16,{size:10.5,color:'#ADB2B8'});
TL(DOC,'cap-l','亮色皮肤 · 同一组件结构',520,700,16,{size:10.5,color:'#ADB2B8'});
const NX=1040;
TL(DOC,'nt','改版要点',NX,110,18,{size:12,color:'#F9FAFB',fontStyle:'Medium'});
const notes=[
 ['01','工具栏三分组','状态 / 时间 / 视图；固定宽 448px 内放得下，图标按钮替代长文案，去掉重复的总任务数。'],
 ['02','泳道头四行各司其职','身份药丸、单一状态指示、计数、活动词；颜色不再承担状态语义。'],
 ['03','轨道分层','turn 带 20% 作背景、step 条 90% 嵌在其中；消息箭头 12px；任务条 22px。'],
 ['04','任务条自带状态','左 3px 身份色 + 右侧状态字形（✓ / ●）+ 底边 2px 状态迁移刻度。'],
 ['05','NOW 不再抢戏','1.5px 强调线 + 轴内时间胶囊；不再用白底方块遮住刻度。'],
 ['06','页脚收成一行','缩放 / 图例 / 构建号各归其位，图例移进弹层，默认不占据主视图。']
];
let ny=140;
notes.forEach(([n,t,b])=>{
 E(DOC,'note-dot-'+n,NX,ny+3,17,17,'#7AAAFF');
 TL(DOC,'note-n-'+n,n,NX,ny+3,17,{size:8.5,mono:true,color:'#0F1115'});
 TL(DOC,'note-t-'+n,t,NX+26,ny,16,{size:11,color:'#F9FAFB',fontStyle:'Medium'});
 TL(DOC,'note-b-'+n,b,NX+26,ny+18,16,{size:10.5,color:'#ADB2B8'});
 ny+=62;
});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true,dark:dark.id,light:light.id};
