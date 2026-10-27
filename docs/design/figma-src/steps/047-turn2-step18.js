// dsh-task-gantt · Figma build step 47/90
// turn 2 · step 18 · callId call_00_bz1upr13lwthmnmflo4qtzss
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',red:'#EC1313'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow)n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.45},offset:{x:0,y:-4},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.textAlignHorizontal=o.align||'LEFT';n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.4 4.6 L3.6 6.8 L7.6 2.2" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 arrow:(c,rot)=>`<svg width="14" height="14" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g${rot?' transform="rotate(180 6.5 6.5)"':''}><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></g></svg>`,
 q:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M4.2 4.1 C4.3 3.1 5 2.5 5.9 2.5 C6.9 2.5 7.5 3.1 7.5 3.9 C7.5 5.1 5.9 5.2 5.9 6.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><circle cx="5.9" cy="8.8" r="0.9" fill="${c}"/></svg>`,
 alert:(c)=>`<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 1.5 L12.2 11.5 H0.8 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5 V7.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="6.5" cy="9.8" r="0.65" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const DOC=find(figma.currentPage,'page 05 doc');
/* ============ B. task detail ============ */
TL(DOC,'b-h','B · 任务详情（点击任务条）',0,660,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-s','三点时间线把「创建 / 认领 / 完成」写全；抽屉覆盖在图上，不压缩图区。',0,682,18,{size:10.5,color:C.t3});
const T=F(DOC,'task-drawer',0,714,480,360,{fill:C.bg2,radius:10,clip:true,shadow:true});
R(T,'handle',222,9,36,4,C.b3,{radius:2});
TL(T,'title','设计面板布局',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
const tc=F(T,'status',108,26,58,20,{fill:null,radius:5,stroke:C.success,strokeOpacity:0.5});tc.fills=[solid(C.success,0.12)];TL(tc,'t','已完成',0,0,20,{size:10,color:C.success});tc.children[0].x=(58-tc.children[0].width)/2;
const cb=F(T,'close',440,24,24,24,{fill:null,radius:5});SVG(cb,'x',SYM.close(C.t3),7,7);
/* micro timeline */
const tlx=16,tlw=448,tly=88;
R(T,'tl-line',tlx,tly,tlw,1,C.b3);
const tx={'c':tlx,'k':tlx+Math.round(tlw*(100/(100+390))),'d':tlx+tlw};
E(T,'dot-c',tx.c-3.5,tly-3,7,7,'none',{border:C.t3,borderWeight:1.4});
E(T,'dot-k',tx.k-4.5,tly-4,9,9,C.accent);
E(T,'dot-d',tx.d-3.5,tly-3,7,7,C.success);
TL(T,'lb-c','创建',tx.c,54,16,{size:10,color:C.t3});
TL(T,'lb-k','认领 · 开始执行',tx.k,40,16,{size:10,color:C.accent});
TL(T,'lb-d','完成',tx.d-24,54,16,{size:10,color:C.t3});
TL(T,'tm-c','16:00:30',tx.c,66,14,{size:9.5,mono:true,color:C.t2});
TL(T,'tm-k','16:02:10',tx.k,56,14,{size:9.5,mono:true,color:C.accent});
TL(T,'tm-d','16:07:00',tx.d-48,66,14,{size:9.5,mono:true,color:C.t2});
/* meta */
const meta=[['负责','ui'],['依赖','T-03'],['泳道','ui'],['写入范围','src/client/ui/**'],['版本','r4'],['时长','6 分 30 秒']];
meta.forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2);const x=16+col*232,y=118+row*20;TL(T,'mk-'+i,k,x,y,16,{size:10,color:C.t3});TL(T,'mv-'+i,v,x+48,y,16,{size:10,color:C.t2,mono:i>=3});});
R(T,'div',16,188,448,1,C.b1);
TT(T,'desc','把滚动手势与缩放锚点对齐到任务条中心；修正跟随回弹时的 1px 抖动，并统一三处间距。',16,196,448,{size:11,lh:17,color:C.t2});
TL(T,'hist-t','状态迁移',16,244,14,{size:10,color:C.t3});
[['16:00:30','创建'],['16:02:10','认领'],['16:07:00','完成']].forEach(([t,a],i)=>{
 TL(T,'ht-'+i,t,16,262+i*20,14,{size:9.5,mono:true,color:C.t3});
 TL(T,'ha-'+i,a,92,262+i*20,14,{size:10.5,color:C.t2});
});
TL(T,'foot','只读面板 · 时间来自会话日志',16,336,14,{size:9,color:C.dim});
/* annotations */
const ANX=540;
TL(DOC,'b-an1','① 三点时间线',ANX,714,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an1b','创建 / 认领 / 完成各一个点；认领点是新的，和条下刻线同源。',ANX,734,16,{size:10,color:C.t3});
TL(DOC,'b-an2','② 抽屉覆盖',ANX,774,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an2b','固定从底部升起，盖住图而不改变图高；Esc / ✕ / 点空白关闭。',ANX,794,16,{size:10,color:C.t3});
TL(DOC,'b-an3','③ 与图关联',ANX,834,16,{size:11,color:C.t1,fontStyle:'Medium'});
TL(DOC,'b-an3b','打开时对应任务条加 1.5px focus 环；抽屉里的时间与条下刻线同一坐标系。',ANX,854,16,{size:10,color:C.t3});
TL(DOC,'b-an4','为什么不在条内画认领线：22px 高的条里文字占 5—17px，任何竖线都会压字；放到条下 2px 处，既不压字又能对齐时间。',ANX,900,300,{size:10,lh:16,color:C.t2});
/* ============ C. message detail ============ */
TL(DOC,'c-h','C · 消息详情（点击 ↗ / ↙ 箭头）',0,1110,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'c-s','发出与收到共用同一个抽屉，靠「方向 chip + 路由」区分；正文全文只在这里出现。',0,1132,18,{size:10.5,color:C.t3});
function msgDrawer(name,x,dir,from,to,when,body){
 const d=F(DOC,name,x,1164,480,300,{fill:C.bg2,radius:10,clip:true,shadow:true});
 R(d,'handle',222,9,36,4,C.b3,{radius:2});
 TL(d,'title','消息详情',16,24,22,{size:13,color:C.t1,fontStyle:'Semibold'});
 const chip=F(d,'chip',92,26,54,20,{fill:null,radius:5,stroke:C.b2});
 SVG(chip,'ar',SYM.arrow(C.t2,dir==='in'),6,4);
 TL(chip,'ct',dir==='in'?'收到':'发出',22,0,20,{size:10,color:C.t2});
 const cb2=F(d,'close',440,24,24,24,{fill:null,radius:5});SVG(cb2,'x',SYM.close(C.t3),7,7);
 TL(d,'from',from,16,52,20,{size:13,color:C.t1,fontStyle:'Medium'});
 SVG(d,'ar',SYM.arrow(C.t3,false),16+from.length*8+10,58);
 TL(d,'to',to,16+from.length*8+30,52,20,{size:13,color:C.t1,fontStyle:'Medium'});
 TL(d,'meta',when+' · 消息 · 来自会话日志',16,78,14,{size:9.5,mono:true,color:C.t3});
 const bodyBox=F(d,'body',16,100,448,150,{fill:null,radius:6,stroke:C.b1});bodyBox.fills=[solid(C.bg3,0.35)];
 TT(bodyBox,'text',body,12,10,424,{size:11,lh:18,color:C.t2});
 TL(d,'foot','正文上限 16384 字符 · Esc 关闭',16,266,14,{size:9,color:C.dim});
 return d;
}
msgDrawer('msg-in',0,'in','host-data','ui','16:13:20','面板骨架已完成：泳道头 136、轨道分层、任务条 22。\n下一步请把滚动手势和缩放锚点对齐到任务条中心，先别动 host 数据层。');
msgDrawer('msg-out',520,'out','ui','host-data','16:18:40','收到。滚动与缩放已对齐，跟随回弹的 1px 抖动也修了。\n新增：条下双段轨表达「创建 → 认领 → 完成」，刻线就是认领时间。');
TL(DOC,'c-note','两个方向都用同一个抽屉，不再区分「发出/收到」两套详情；路由用大字号一行说清。',1040,1164,20,{size:10,color:C.t3});
/* ============ D. question detail ============ */
TL(DOC,'d-h','D · 问题详情（点击红色 ?）',0,1500,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'d-s','只放问题与答案：不列全部选项说明；等待中脉冲、失败虚线圈、已回答为实心。',0,1522,18,{size:10.5,color:C.t3});
function qDrawer(name,x,state,when,prompt,options,selected,answer,custom){
 const d=F(DOC,name,x,1554,480,330,{fill:C.bg2,radius:10,clip:true,shadow:true});
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
  const y=140+i*30;const on=i===selected;
  const row=F(d,'opt-'+i,16,y,448,26,{fill:null,radius:5,stroke:on?C.accent:C.b1,strokeOpacity:on?0.6:1});
  if(on)row.fills=[solid(C.accent,0.08)];
  E(row,'rad',8,6.5,13,13,on?C.accent:'none',{border:on?C.accent:C.b3,borderWeight:1.3});
  if(on)SVG(row,'ck',SYM.check('#0F1115'),10,9);
  TL(row,'t',opt,30,0,26,{size:11,color:on?C.t1:C.t3});
 });
 if(state==='failed'){
  const eb=F(d,'err',16,232,448,40,{fill:null,radius:6,stroke:C.error,strokeOpacity:0.4});eb.fills=[solid(C.error,0.09)];
  SVG(eb,'al',SYM.alert(C.error),10,13);TL(eb,'et','调用被拒绝，问题没有到达人类',30,0,40,{size:10.5,color:C.t1});
 } else if(state==='answered'){
  TL(d,'ak','答案',16,244,16,{size:10,color:C.t3});
  TL(d,'av',answer,60,244,16,{size:11,color:C.success});
  if(custom){TL(d,'custom',custom,60,264,16,{size:10.5,color:C.t2});}
 } else {
  TL(d,'wait','等待回复 · 图中问号持续脉冲，回答后自动转为实心',16,244,16,{size:10,color:C.t3});
 }
 TL(d,'foot','提问来自会话日志 · 只读',16,304,14,{size:9,color:C.dim});
 return d;
}
qDrawer('q-answered',0,'answered','16:12:10','任务条上是否需要标出「认领时间」？',['需要，放在条内','需要，放在条下','不需要'],1,'需要，放在条下');
qDrawer('q-waiting',520,'waiting','16:19:40','下一步先改哪一块？',['先修工具栏溢出','先做详情抽屉','先调泳道头'],-1,null);
qDrawer('q-failed',1040,'failed','16:21:05','是否要顺带重构泳道筛选？',['可以','暂不'],-1,null);
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
