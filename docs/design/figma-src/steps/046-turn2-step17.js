// dsh-task-gantt · Figma build step 46/90
// turn 2 · step 17 · callId call_00_sy6venkdyfpq3gcbgdvy073s
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',red:'#EC1313',lane0:'#2563EB'};
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
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.4 4.6 L3.6 6.8 L7.6 2.2" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 arrow:(c)=>`<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
 q:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M4.2 4.1 C4.3 3.1 5 2.5 5.9 2.5 C6.9 2.5 7.5 3.1 7.5 3.9 C7.5 5.1 5.9 5.2 5.9 6.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><circle cx="5.9" cy="8.8" r="0.9" fill="${c}"/></svg>`,
 alert:(c)=>`<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 1.5 L12.2 11.5 H0.8 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5 V7.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="6.5" cy="9.8" r="0.65" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
/* create page and place before specs */
const existing=figma.root.children.find(p=>p.name.startsWith('05'));
if(existing) existing.name='06 · 设计规范';
let page=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
if(!page){ page=figma.createPage(); page.name='05 · 详情与时间语义'; }
const specs=figma.root.children.find(p=>p.name.startsWith('06'));
figma.root.insertChild(figma.root.children.indexOf(specs),page);
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 05 doc',0,0,1560,1930,{fill:C.doc});
TL(DOC,'pt','05 · 详情与时间语义',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','点开之后看到什么：任务详情 / 消息详情 / 问题详情；以及「任务什么时候被认领、开始执行」的新表达',0,38,18,{size:12,color:C.t3});
/* ============ A. task bar time semantics ============ */
TL(DOC,'a-h','A · 任务条的时间语义',0,96,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'a-s','条长 = 创建 → 完成；条下双段轨：灰 = 创建到认领（排队），蓝 = 认领到结束（执行）。交界处的刻线就是「开始执行」的时刻。',0,118,18,{size:10.5,color:C.t3});
const AN=F(DOC,'anatomy',0,150,980,250,{fill:null});
const barX=110,barY=86,barW=520,barH=44,claimX=barX+Math.round(barW*0.3);
const bar=F(AN,'bar',barX,barY,barW,barH,{fill:C.bg2,radius:10,clip:true,stroke:C.b2});
R(bar,'stripe',0,0,6,barH,C.lane0,{rTL:10,rBL:10});
TL(bar,'label','设计面板布局',18,0,barH,{size:22,color:C.t1,fontStyle:'Medium'});
SVG(bar,'check',SYM.check(C.t3),barW-30,17);
/* under track */
R(AN,'track-idle',barX+6,barY+barH+5,claimX-barX-6,5,C.t3,{opacity:0.3});
R(AN,'track-run',claimX,barY+barH+5,barX+barW-claimX-2,5,C.accent,{opacity:0.55});
R(AN,'claim-cut',claimX-1,barY+barH+1,2,14,C.accent);
/* labels above */
TC(AN,'l-created','创建 16:00:30',barX+40,44,16,{size:10.5,color:C.t2});
R(AN,'lead-c',barX+40,62,1,18,C.b3);
TC(AN,'l-claim','认领 · 开始执行 16:02:10',claimX+40,32,16,{size:10.5,color:C.accent});
R(AN,'lead-k',claimX,50,1,30,C.accent,{opacity:0.6});
TR(AN,'l-done','完成 16:07:00',barX+barW,44,16,{size:10.5,color:C.t2});
R(AN,'lead-d',barX+barW,62,1,18,C.b3);
/* brackets below */
R(AN,'br-idle',barX+6,barY+barH+20,claimX-barX-6,1,C.b3);R(AN,'br-idle-l',barX+6,barY+barH+16,1,8,C.b3);R(AN,'br-idle-r',claimX-2,barY+barH+16,1,8,C.b3);
TC(AN,'bl-idle','排队 1 分 40 秒',(barX+6+claimX)/2,barY+barH+30,16,{size:10,color:C.t3});
R(AN,'br-run',claimX,barY+barH+20,barX+barW-claimX-2,1,C.accent,{opacity:0.6});R(AN,'br-run-r',barX+barW-3,barY+barH+16,1,8,C.accent,{opacity:0.6});
TC(AN,'bl-run','执行 4 分 50 秒',(claimX+barX+barW)/2,barY+barH+30,16,{size:10,color:C.accent});
TL(AN,'n1','① 矩形左端 = 创建',barX,0,16,{size:10.5,color:C.t2});
TL(AN,'n2','② 条下灰段 = 排队等待',barX+150,0,16,{size:10.5,color:C.t2});
TL(AN,'n3','③ 刻线 = 认领（开始执行）',barX+330,0,16,{size:10.5,color:C.accent});
TL(AN,'n4','④ 蓝段 = 执行中',barX+530,0,16,{size:10.5,color:C.t2});
TL(AN,'n5','⑤ 右端 = 完成（或 NOW）',barX+670,0,16,{size:10.5,color:C.t2});
/* variants */
const VAR=F(DOC,'variants',1000,150,520,250,{fill:null});
TL(VAR,'h','四种状态',0,0,18,{size:11,color:C.t2,fontStyle:'Medium'});
const rows=[['未认领','全段排队，无刻线，右端开口（pending）',0],['进行中','灰 → 蓝，右端虚线延伸到现在',0.3,true],['已完成','灰 → 蓝，右端实心 + ✓',0.3,false,true],['无历史','只有一个 9px 实时标记，不编造区间',-1]];
rows.forEach(([name,desc,ratio,live,done],i)=>{
 const y=34+i*50;
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
  else {R(VAR,'vi-'+i,bx+3,y+25,bw-5,3,C.t3,{opacity:0.3});}
  if(live){for(let yy=2;yy<20;yy+=4)R(b,'d',bw-2,yy,1.5,2.2,C.lane0);}
  if(done)SVG(b,'ck',SYM.check(C.t3),bw-13,7);
 }
 TL(VAR,'vd-'+i,desc,140,y+32,16,{size:9,color:C.t3});
});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true,page:page.name};
