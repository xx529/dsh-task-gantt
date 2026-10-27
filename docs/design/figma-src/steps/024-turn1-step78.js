// dsh-task-gantt · Figma build step 24/90
// turn 1 · step 78 · callId call_00_wqvrna3mphy8nd528zav7jvw
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const LANE=['#2563EB','#A3294F','#558130','#786BA5','#765C19','#9D5C91'];
const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',ink:'#0F1115',doc:'#1B1B1C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow){n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.45},offset:{x:0,y:-6},radius:18,spread:0,visible:true,blendMode:'NORMAL'}];}parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 plus:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M4 1.2 V6.8 M1.2 4 H6.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.4 4.6 L3.6 6.8 L7.6 2.2" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 refresh:(c)=>`<svg width="11" height="11" viewBox="0 0 11 11" xmlns="http://www.w3.org/2000/svg"><path d="M8.9 3.8 A3.7 3.7 0 1 0 9.3 5.9" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><path d="M6.9 1.2 L9.1 1.2 L9.1 3.4" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 chart:(c)=>`<svg width="40" height="30" viewBox="0 0 40 30" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="38.5" height="28.5" rx="4" fill="none" stroke="${c}" stroke-width="1.2"/><path d="M6 21 H14 M6 15 H22 M6 9 H18" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
 alert:(c)=>`<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><path d="M7 1.6 L13 12.4 H1 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 5.6 V8.6" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="10.6" r="0.7" fill="${c}"/></svg>`,
 speaker:(c)=>`<svg width="12" height="11" viewBox="0 0 12 11" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 H10.5 V7.5 H5.5 L3 9.8 V7.5 H1.5 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const page=figma.root.children.find(p=>p.name.startsWith('04'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 04 doc',0,0,1560,1660,{fill:C.doc});
TL(DOC,'pt','04 · 状态与交互',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','6 个关键状态 + 交互规范：抽屉不压图、浮窗不抢焦点、NOW 可点击、筛选是可组合的模式',0,38,18,{size:12,color:C.t3});
const p3=figma.root.children.find(p=>p.name.startsWith('03'));
const srcDark=find(p3,'03 · 改版 · 暗色 480×580');
function place(name,x,y){const c=srcDark.clone();DOC.appendChild(c);c.name=name;c.x=x;c.y=y;return c;}
const CAP=(t,x,y)=>TL(DOC,'cap-'+x+'-'+y,t,x,y+4,16,{size:10.5,color:C.t3});
/* 1 selected + sheet */
const A=place('state · 选中任务 + 详情抽屉',0,110);
const plotA=find(A,'plot');
plotA.children.filter(n=>n.name==='task').forEach(n=>{n.opacity=0.55;});
const selBar=F(plotA,'selected-task',700-142,44+2*80+44,90,22,{fill:null,radius:5,clip:true});
stroke(selBar,C.accent,1.5);
const sheet=F(A,'details-drawer',0,336,480,244,{fill:C.bg2,radius:10,clip:true,shadow:true});
sheet.topLeftRadius=10; sheet.topRightRadius=10; sheet.bottomLeftRadius=0; sheet.bottomRightRadius=0;
R(sheet,'handle',222,9,36,4,C.b3,{radius:2});
R(sheet,'sheet-top',0,0,480,1,C.b3,{opacity:0.6});
TL(sheet,'title','走查滚动与对齐',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
const chipS=F(sheet,'state-chip',132,26,58,20,{fill:null,radius:5,stroke:C.accent,strokeOpacity:0.6});chipS.fills=[solid(C.accent,0.12)];
TL(chipS,'chip-t','进行中',0,0,20,{size:10,color:C.accent}); chipS.children[0].x=(58-chipS.children[0].width)/2;
const closeB=F(sheet,'close',440,24,24,24,{fill:null,radius:5});SVG(closeB,'x',SYM.close(C.t3),7,7);
const meta=[['负责','ui'],['耗时','6 分 20 秒'],['区间','16:11:40 → 16:18:40'],['写入范围','src/client/ui/**'],['依赖','T-03'],['版本','r4']];
meta.forEach(([k,v],i)=>{
 const col=i%2, row=Math.floor(i/2);
 const bx=16+col*232, by=56+row*20;
 TL(sheet,'mk-'+i,k,bx,by,16,{size:10,color:C.t3});
 TL(sheet,'mv-'+i,v,bx+44,by,16,{size:10.5,color:C.t2,mono:i>=3});
});
R(sheet,'div',16,116,448,1,C.b1);
TT(sheet,'desc','把滚动手势与缩放锚点对齐到任务条中心；修正跟随回弹时的 1px 抖动，并统一三处间距。',16,124,448,{size:11,lh:17,color:C.t2});
TL(sheet,'hist-t','状态迁移',16,172,14,{size:10,color:C.t3});
[['16:11:40','创建'],['16:12:10','认领'],['16:18:40','完成']].forEach(([t,a],i)=>{
 TL(sheet,'h-t-'+i,t,16,190+i*18,14,{size:9.5,mono:true,color:C.t3});
 TL(sheet,'h-a-'+i,a,92,190+i*18,14,{size:10.5,color:C.t2});
});
CAP('选中任务 · 详情以底部抽屉覆盖，不压缩图区；Esc 或 ✕ 关闭',0,700);
/* 2 hover popover */
const B=place('state · 悬停预览',520,110);
R(B,'hover-ring',262,468,116,24,'none',{border:C.accent,borderWeight:1.5,radius:5});
const pop=F(B,'popover',180,368,272,104,{fill:C.bg2,radius:8,clip:true,stroke:C.b3,shadow:true});
pop.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.5},offset:{x:0,y:6},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];
TL(pop,'p-title','折叠时间线与泳道筛选',10,10,18,{size:11.5,color:C.t1,fontStyle:'Medium'});
TL(pop,'p-meta','已完成 · host-data · 7 分',10,30,14,{size:9.5,color:C.t3});
TT(pop,'p-desc','按 hidden set 与 workingOnly 组合过滤，保持名单顺序；空集合表示全选。',10,48,252,{size:10.5,lh:15,color:C.t2});
R(pop,'p-div',10,84,252,1,C.b1);
TL(pop,'p-hint','点击查看详情 · 状态迁移与写入范围',10,88,14,{size:9.5,color:C.accent});
CAP('悬停任务条 · 浮窗给出标题 / 状态 / 时长 / 简介',520,700);
/* 3 filter menu */
const M=place('state · 筛选菜单',1040,110);
const menu=F(M,'filter-menu',300,52,224,240,{fill:C.bg2,radius:8,clip:true,stroke:C.b3,shadow:true});
menu.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.5},offset:{x:0,y:6},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];
TL(menu,'menu-h','显示',10,8,16,{size:9.5,color:C.t3});
const wrow=F(menu,'working-row',6,28,212,26,{fill:null,radius:5});
TL(wrow,'w-label','只看工作中',32,0,26,{size:11,color:C.t1});
const wt=F(wrow,'w-track',0,6,26,14,{fill:C.accent,radius:7});E(wt,'w-knob',13,2,10,10,'#FFFFFF');
R(menu,'sep1',8,60,208,1,C.b1);
const listRows=['Lead','host-data','ui','shell','verify','packaging'];
listRows.forEach((n,i)=>{
 const y=66+i*28;const row=F(menu,'row-'+i,6,y,212,26,{fill:null,radius:5});
 if(i===0){R(row,'cb',8,7,13,13,C.b2,{radius:3,opacity:0.35});const t=TL(row,'pin','固定',176,0,26,{size:9,color:C.t3});}
 else {R(row,'cb',8,7,13,13,C.accent,{radius:3});SVG(row,'ck',SYM.check('#0F1115'),10,9.5);}
 const sw=E(row,'dot',30,10,6,6,LANE[i]);
 TL(row,'nm',n,44,0,26,{size:11,color:i===0?C.t3:C.t1});
});
CAP('筛选菜单 · 「只看工作中」是模式开关，与逐个勾选可叠加',1040,700);
/* 4 frozen */
const Z=place('state · 团队结束（冻结）',0,830);
const zbadge=find(Z,'now-badge');
if(zbadge){ zbadge.fills=[solid(C.bg2)]; stroke(zbadge,C.b2,1,1); const t=zbadge.children[0]; fill(t,C.t3); t.characters='结束 · 16:24'; t.x=(72-t.width)/2; }
const zline=find(Z,'now-line'); if(zline){fill(zline,C.dim);}
const zfollow=find(Z,'follow'); if(zfollow){ const tr=find(zfollow,'switch'); fill(tr,C.b3); const kn=find(zfollow,'knob'); if(kn)kn.x=3; const lb=find(zfollow,'follow-t'); if(lb)fill(lb,C.t3); }
const zpill=find(Z,'now-pill'); if(zpill){fill(zpill,C.bg2,0);stroke(zpill,C.b2,1,1);const t1=find(zpill,'now-label');fill(t1,C.t3);t1.characters='已结束';const t2=find(zpill,'now-time');fill(t2,C.t3);t2.characters='16:24';}
CAP('冻结态 · NOW 变虚线与中性标签，跟随自动关闭，不再暗示「还在跑」',0,1420);
/* 5 empty */
const EMP=F(DOC,'state · 空态',520,830,480,360,{fill:C.bg1,clip:true});
R(EMP,'top',0,0,480,40,C.bg1);R(EMP,'top-line',0,39,480,1,C.b1);
E(EMP,'dot',12,17,6,6,C.t3);TL(EMP,'src','会话日志',22,12,16,{size:11,color:C.t3});
SVG(EMP,'refresh',SYM.refresh(C.t2),448,14);
SVG(EMP,'icon',SYM.chart(C.dim),220,132);
TL(EMP,'t','当前会话没有 agent team',0,196,20,{size:13,color:C.t1,fontStyle:'Semibold'});
TT(EMP,'b','面板展示 Lead 与其 teammate 的任务时间线。\n先创建 team 或共享任务，再回到这里。',80,224,320,{size:11,lh:18,color:C.t3});
const b1=F(EMP,'btn',204,278,72,28,{fill:null,radius:6,stroke:C.b2});TL(b1,'b-t','刷新',0,0,28,{size:11,color:C.t2}); b1.children[0].x=(72-b1.children[0].width)/2;
CAP('空态 · 说明为什么空 + 唯一的下一步动作',520,1204);
/* 6 error */
const ERR=F(DOC,'state · 错误',1040,830,480,360,{fill:C.bg1,clip:true});
R(ERR,'top',0,0,480,40,C.bg1);R(ERR,'top-line',0,39,480,1,C.b1);
E(ERR,'dot',12,17,6,6,C.t3);TL(ERR,'src','会话日志',22,12,16,{size:11,color:C.t3});
SVG(ERR,'refresh',SYM.refresh(C.t2),448,14);
const banner=F(ERR,'error-banner',12,52,456,54,{fill:null,radius:6,stroke:C.error,strokeOpacity:0.4});banner.fills=[solid(C.error,0.09)];
SVG(banner,'al',SYM.alert(C.error),12,12);
TL(banner,'et','读取时间线失败',34,8,18,{size:11.5,color:C.t1,fontStyle:'Medium'});
TL(banner,'em','HTTP 500 · timeline fold failed（retry in 5s）',34,28,14,{size:9.5,mono:true,color:C.t3});
const rb=F(banner,'retry',372,14,72,26,{fill:null,radius:6,stroke:C.b2});TL(rb,'r-t','重试',0,0,26,{size:10.5,color:C.t1}); rb.children[0].x=(72-rb.children[0].width)/2;
SVG(ERR,'icon',SYM.alert(C.dim),220,152);
TL(ERR,'t2','暂时读不到这段时间的数据',0,212,20,{size:13,color:C.t1,fontStyle:'Semibold'});
TL(ERR,'b2','已有数据会保留在图上；恢复后自动继续轮询。',0,244,18,{size:11,color:C.t3});
CAP('错误态 · 就近给出错误与重试，不把提示丢到面板底部',1040,1204);
/* interaction spec */
R(DOC,'spec-line',0,1470,1180,1,C.b1);
TL(DOC,'spec-t','交互规范',0,1490,20,{size:12,color:C.t1,fontStyle:'Medium'});
const specs=[
 ['点击任务条','打开底部抽屉；Esc / ✕ 关闭；抽屉覆盖在图上，不压缩图区'],
 ['悬停任务条','浮窗显示标题 / 状态 / 时长 / 简介；移出、滚动、打开抽屉即关闭'],
 ['点击泳道头','跳转到该 teammate 的会话；行尾出现 › 作为可点击暗示'],
 ['点击「现在」','跳回 NOW 并自动开启跟随；跟随开关同时更新'],
 ['滚轮','纵向滚动；Shift+滚轮横向；⌘/Ctrl+滚轮缩放；双击空白 = 适应窗口'],
 ['键盘','←/→ 平移  +/− 缩放  N 回到现在  F 跟随  Esc 关闭  / 打开筛选'],
 ['筛选','逐项勾选 ∩「只看工作中」模式；Lead 固定不可隐藏']
];
specs.forEach(([k,v],i)=>{
 const y=1524+i*20;
 TL(DOC,'sk-'+i,k,0,y,16,{size:10.5,color:C.t1,fontStyle:'Medium'});
 TL(DOC,'sv-'+i,v,120,y,16,{size:10.5,color:C.t3});
});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
