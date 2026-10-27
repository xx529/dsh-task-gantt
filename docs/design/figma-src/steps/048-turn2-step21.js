// dsh-task-gantt · Figma build step 48/90
// turn 2 · step 21 · callId call_00_deqhj6rn85irawv16erzyi4p
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',lane0:'#2563EB'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow)n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.45},offset:{x:0,y:-4},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TC(parent,name,str,cx,top,boxH,o){const n=TL(parent,name,str,0,top,boxH,o);n.x=cx-n.width/2;return n;}
function TR(parent,name,str,right,top,boxH,o){const n=TL(parent,name,str,0,top,boxH,o);n.x=right-n.width;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.textAlignHorizontal=o.align||'LEFT';n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.4 4.6 L3.6 6.8 L7.6 2.2" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 arrow:(c,rot)=>`<svg width="14" height="14" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g${rot?' transform="rotate(180 6.5 6.5)"':''}><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></g></svg>`,
 alert:(c)=>`<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 1.5 L12.2 11.5 H0.8 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5 V7.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="6.5" cy="9.8" r="0.65" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const page=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 05 doc',0,0,1560,1660,{fill:C.doc});
TL(DOC,'pt','05 · 详情与时间语义',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','点开之后看到什么：任务详情 / 消息详情 / 问题详情；以及「任务什么时候被认领、开始执行」的表达',0,38,18,{size:12,color:C.t3});
/* ---------- A anatomy ---------- */
TL(DOC,'a-h','A · 任务条的时间语义',0,92,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'a-s','条长 = 创建 → 完成。条下双段轨：灰 = 创建到认领（排队），蓝 = 认领到结束（执行）；交界刻线就是「开始执行」的时刻。',0,114,18,{size:10.5,color:C.t3});
const AN=F(DOC,'anatomy',0,146,980,222,{fill:null});
const barX=120,barY=72,barW=520,barH=44,claimX=barX+156;
const bar=F(AN,'bar',barX,barY,barW,barH,{fill:C.bg2,radius:10,clip:true,stroke:C.b2});
R(bar,'stripe',0,0,6,barH,C.lane0,{rTL:10,rBL:10});
TL(bar,'label','设计面板布局',18,0,barH,{size:22,color:C.t1,fontStyle:'Medium'});
SVG(bar,'check',SYM.check(C.t3),barW-30,17);
R(AN,'track-idle',barX+6,barY+barH+5,claimX-barX-6,5,C.t3,{opacity:0.3});
R(AN,'track-run',claimX,barY+barH+5,barX+barW-claimX-2,5,C.accent,{opacity:0.55});
R(AN,'claim-cut',claimX-1,barY+barH+1,2,14,C.accent);
TL(AN,'n1','① 创建 16:00:30',barX,28,16,{size:10.5,color:C.t2});
R(AN,'l1',barX+22,48,1,22,C.b3);
TC(AN,'n3','③ 认领 · 开始执行 16:02:10',claimX,20,16,{size:10.5,color:C.accent});
R(AN,'l3',claimX,38,1,32,C.accent,{opacity:0.7});
TR(AN,'n5','⑤ 完成 16:07:00',barX+barW,28,16,{size:10.5,color:C.t2});
R(AN,'l5',barX+barW,48,1,22,C.b3);
R(AN,'br-idle',barX+6,barY+barH+20,claimX-barX-6,1,C.b3);R(AN,'br-idle-l',barX+6,barY+barH+17,1,7,C.b3);R(AN,'br-idle-r',claimX-2,barY+barH+17,1,7,C.b3);
TC(AN,'n2','② 排队 1 分 40 秒（尚未开始）',(barX+6+claimX)/2,barY+barH+26,16,{size:10,color:C.t3});
R(AN,'br-run',claimX,barY+barH+20,barX+barW-claimX-2,1,C.accent,{opacity:0.6});R(AN,'br-run-r',barX+barW-3,barY+barH+17,1,7,C.accent,{opacity:0.6});
TC(AN,'n4','④ 执行 4 分 50 秒',(claimX+barX+barW)/2,barY+barH+26,16,{size:10,color:C.accent});
TL(AN,'note','为什么放在条下：22px 高的条里文字占 5—17px，任何竖线都会压字；条下 2px 处既不挡字，又能沿同一时间轴对齐。',barX,184,18,{size:10,color:C.t3});
/* variants */
const VAR=F(DOC,'variants',1000,146,540,222,{fill:null});
TL(VAR,'h','四种状态',0,0,18,{size:11,color:C.t2,fontStyle:'Medium'});
const rows=[['未认领','全段排队，无刻线，右端开口（pending）',0],['进行中','灰 → 蓝，右端虚线延伸到现在',0.3,true],['已完成','灰 → 蓝，右端实心 + ✓',0.3,false,true],['无历史','只有 9px 实时标记，不编造区间',-1]];
rows.forEach(([name,desc,ratio,live,done],i)=>{
 const y=30+i*46;
 TL(VAR,'vn-'+i,name,0,y+8,16,{size:10,color:C.t2});
 const bw=300;
 if(ratio<0){R(VAR,'vm-'+i,140,y+12,9,9,C.lane0,{radius:2});}
 else {
  const bx=140;
  const b=F(VAR,'vb-'+i,bx,y+3,bw,22,{fill:C.bg2,radius:5,clip:true,stroke:C.b2});
  R(b,'stripe',0,0,3,22,C.lane0,{rTL:5,rBL:5});
  TL(b,'l','设计面板布局',9,0,22,{size:11,color:C.t1,fontStyle:'Medium'});
  const cx=bx+Math.max(8,Math.round(bw*ratio));
  if(ratio>0){R(VAR,'vi-'+i,bx+3,y+25,cx-bx-3,3,C.t3,{opacity:0.3});R(VAR,'vr-'+i,cx,y+25,bx+bw-cx-2,3,C.accent,{opacity:0.55});R(VAR,'vc-'+i,cx-1,y+23,2,8,C.accent);}
  else R(VAR,'vi-'+i,bx+3,y+25,bw-5,3,C.t3,{opacity:0.3});
  if(live){for(let yy=2;yy<20;yy+=4)R(b,'d',bw-2,yy,1.5,2.2,C.lane0);}
  if(done)SVG(b,'ck',SYM.check(C.t3),bw-13,7);
 }
 TL(VAR,'vd-'+i,desc,140,y+31,14,{size:9,color:C.t3});
});
/* ---------- B task drawer ---------- */
TL(DOC,'b-h','B · 任务详情（点击任务条）',0,398,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-s','三点时间线把「创建 / 认领 / 完成」写全；抽屉覆盖在图上，不压缩图区。',0,420,18,{size:10.5,color:C.t3});
const T=F(DOC,'task-drawer',0,452,480,360,{fill:C.bg2,radius:10,clip:true,shadow:true});
R(T,'handle',222,9,36,4,C.b3,{radius:2});
TL(T,'title','设计面板布局',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
const tch=F(T,'status',106,26,58,20,{fill:null,radius:5,stroke:C.success,strokeOpacity:0.5});tch.fills=[solid(C.success,0.12)];TL(tch,'t','已完成',0,0,20,{size:10,color:C.success});tch.children[0].x=(58-tch.children[0].width)/2;
const cb=F(T,'close',440,24,24,24,{fill:null,radius:5});SVG(cb,'x',SYM.close(C.t3),7,7);
const tlx=16,tlw=448,tly=112;
R(T,'tl-line',tlx,tly,tlw,1,C.b3);
const cx1=tlx+Math.round(tlw*(100/(100+390))),cx2=tlx+tlw;
E(T,'dot-c',tlx-3.5,tly-3,7,7,'none',{border:C.t3,borderWeight:1.4});
E(T,'dot-k',cx1-4.5,tly-4,9,9,C.accent);
E(T,'dot-d',cx2-3.5,tly-3,7,7,C.success);
TL(T,'lb-c','创建',tlx,80,16,{size:10,color:C.t3});
TL(T,'tm-c','16:00:30',tlx,96,14,{size:9.5,mono:true,color:C.t2});
TC(T,'lb-k','认领 · 开始执行',cx1,66,16,{size:10,color:C.accent});
TC(T,'tm-k','16:02:10',cx1,96,14,{size:9.5,mono:true,color:C.accent});
TR(T,'lb-d','完成',cx2,80,16,{size:10,color:C.t3});
TR(T,'tm-d','16:07:00',cx2,96,14,{size:9.5,mono:true,color:C.t2});
const meta=[['负责','ui'],['依赖','T-03'],['泳道','ui'],['写入范围','src/client/ui/**'],['版本','r4'],['时长','6 分 30 秒']];
meta.forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2);const x=16+col*232,y=136+row*20;TL(T,'mk-'+i,k,x,y,16,{size:10,color:C.t3});TL(T,'mv-'+i,v,x+48,y,16,{size:10,color:C.t2,mono:i>=3});});
R(T,'div',16,206,448,1,C.b1);
TT(T,'desc','把滚动手势与缩放锚点对齐到任务条中心；修正跟随回弹时的 1px 抖动，并统一三处间距。',16,214,448,{size:11,lh:17,color:C.t2});
TL(T,'hist-t','状态迁移',16,252,14,{size:10,color:C.t3});
[['16:00:30','创建'],['16:02:10','认领'],['16:07:00','完成']].forEach(([t,a],i)=>{
 TL(T,'ht-'+i,t,16,270+i*20,14,{size:9.5,mono:true,color:C.t3});
 TL(T,'ha-'+i,a,92,270+i*20,14,{size:10.5,color:C.t2});
});
TL(T,'foot','只读面板 · 时间来自会话日志',16,338,14,{size:9,color:C.dim});
const ANX=540;
TL(DOC,'b-an1','① 三点时间线',ANX,452,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an1b','创建 / 认领 / 完成各一个点；认领点与条下刻线同源，同一个时刻。',ANX,472,16,{size:10,color:C.t3});
TL(DOC,'b-an2','② 抽屉覆盖',ANX,512,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an2b','从底部升起、盖住图，不改变图高；Esc / ✕ / 点击图空白关闭。',ANX,532,16,{size:10,color:C.t3});
TL(DOC,'b-an3','③ 与图关联',ANX,572,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an3b','打开时对应任务条加 1.5px focus 环；抽屉时间与刻线同一坐标系。',ANX,592,16,{size:10,color:C.t3});
TT(DOC,'b-an4','为一个任务画一条可读的时间线：矩形本身只回答「多久」，抽屉回答「什么时候被谁认领、什么时候完成、中间发生了什么」。',ANX,640,420,{size:10,lh:17,color:C.t2});
/* ---------- C message drawers ---------- */
TL(DOC,'c-h','C · 消息详情（点击 ↗ / ↙ 箭头）',0,850,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'c-s','发出与收到共用同一个抽屉，靠「方向 chip + 路由」区分；正文全文只在这里出现。',0,872,18,{size:10.5,color:C.t3});
function msgDrawer(name,x,dir,from,to,when,body){
 const d=F(DOC,name,x,904,480,300,{fill:C.bg2,radius:10,clip:true,shadow:true});
 R(d,'handle',222,9,36,4,C.b3,{radius:2});
 TL(d,'title','消息详情',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
 const chip=F(d,'chip',92,26,54,20,{fill:null,radius:5,stroke:C.b2});
 SVG(chip,'ar',SYM.arrow(C.t2,dir==='in'),6,4);
 TL(chip,'ct',dir==='in'?'收到':'发出',22,0,20,{size:10,color:C.t2});
 const cb2=F(d,'close',440,24,24,24,{fill:null,radius:5});SVG(cb2,'x',SYM.close(C.t3),7,7);
 TL(d,'from',from,16,52,20,{size:13,color:C.t1,fontStyle:'Medium'});
 SVG(d,'ar',SYM.arrow(C.t3,false),16+from.length*7.2+10,58);
 TL(d,'to',to,16+from.length*7.2+30,52,20,{size:13,color:C.t1,fontStyle:'Medium'});
 TL(d,'meta',when+' · 消息 · 来自会话日志',16,78,14,{size:9.5,mono:true,color:C.t3});
 const bb=F(d,'body',16,100,448,146,{fill:null,radius:6,stroke:C.b1});bb.fills=[solid(C.bg3,0.35)];
 TT(bb,'text',body,12,10,424,{size:11,lh:18,color:C.t2});
 TL(d,'foot','正文上限 16384 字符 · Esc 关闭',16,262,14,{size:9,color:C.dim});
}
msgDrawer('msg-in',0,'in','host-data','ui','16:13:20','面板骨架已完成：泳道头 136、轨道分层、任务条 22。\n下一步请把滚动手势和缩放锚点对齐到任务条中心，先别动 host 数据层。');
msgDrawer('msg-out',520,'out','ui','host-data','16:18:40','收到。滚动与缩放已对齐，跟随回弹的 1px 抖动也修了。\n新增：条下双段轨表达「创建 → 认领 → 完成」，刻线就是认领时间。');
TL(DOC,'c-note','收到方向的箭头沿用对端泳道色；抽屉不复制颜色语义，只用方向 chip 与路由文字。',1040,904,20,{size:10,color:C.t3});
/* ---------- D question drawers ---------- */
TL(DOC,'d-h','D · 问题详情（点击红色 ?）',0,1240,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'d-s','只放问题与答案：不列全部选项说明；等待中脉冲、失败虚线圈、已回答为实心。',0,1262,18,{size:10.5,color:C.t3});
function qDrawer(name,x,state,when,prompt,options,selected,answer){
 const d=F(DOC,name,x,1294,480,330,{fill:C.bg2,radius:10,clip:true,shadow:true});
 R(d,'handle',222,9,36,4,C.b3,{radius:2});
 TL(d,'title','向人类提问',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
 const st=state==='answered'?{c:C.success,t:'已回答'}:state==='waiting'?{c:C.accent,t:'等待回复'}:{c:C.error,t:'提问失败'};
 const chip=F(d,'state',104,26,64,20,{fill:null,radius:5,stroke:st.c,strokeOpacity:0.5});chip.fills=[solid(st.c,0.12)];
 TL(chip,'ct',st.t,0,0,20,{size:10,color:st.c});chip.children[0].x=(64-chip.children[0].width)/2;
 const cb3=F(d,'close',440,24,24,24,{fill:null,radius:5});SVG(cb3,'x',SYM.close(C.t3),7,7);
 TL(d,'when',when,16,52,14,{size:9.5,mono:true,color:C.t3});
 const pb=F(d,'prompt-box',16,72,448,56,{fill:null,radius:6,stroke:C.b1});pb.fills=[solid(C.bg3,0.3)];
 TT(pb,'prompt',prompt,12,9,424,{size:12,lh:19,color:C.t1});
 options.forEach((opt,i)=>{
  const y=140+i*30,on=i===selected;
  const row=F(d,'opt-'+i,16,y,448,26,{fill:null,radius:5,stroke:on?C.accent:C.b1,strokeOpacity:on?0.6:1});
  if(on)row.fills=[solid(C.accent,0.08)];
  E(row,'rad',8,6.5,13,13,on?C.accent:'none',{border:on?C.accent:C.b3,borderWeight:1.3});
  if(on)SVG(row,'ck',SYM.check('#0F1115'),10,9);
  TL(row,'t',opt,30,0,26,{size:11,color:on?C.t1:C.t3});
 });
 if(state==='failed'){
  const eb=F(d,'err',16,232,448,40,{fill:null,radius:6,stroke:C.error,strokeOpacity:0.4});eb.fills=[solid(C.error,0.09)];
  SVG(eb,'al',SYM.alert(C.error),10,13);TL(eb,'et','调用被拒绝，问题没有到达人类',30,0,40,{size:10.5,color:C.t1});
 } else if(state==='answered'){ TL(d,'ak','答案',16,244,16,{size:10,color:C.t3}); TL(d,'av',answer,60,244,16,{size:11,color:C.success}); }
 else TL(d,'wait','等待回复 · 图中问号持续脉冲，回答后自动转为实心',16,244,16,{size:10,color:C.t3});
 TL(d,'foot','提问来自会话日志 · 只读',16,304,14,{size:9,color:C.dim});
}
qDrawer('q-answered',0,'answered','16:12:10','任务条上是否需要标出「认领时间」？',['需要，放在条内','需要，放在条下','不需要'],1,'需要，放在条下');
qDrawer('q-waiting',520,'waiting','16:19:40','下一步先改哪一块？',['先修工具栏溢出','先做详情抽屉','先调泳道头'],-1,null);
qDrawer('q-failed',1040,'failed','16:21:05','是否要顺带重构泳道筛选？',['可以','暂不'],-1,null);
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
