// dsh-task-gantt · Figma build step 67/90
// turn 3 · step 12 · callId call_00_ugnbsmb5cks6sups0rxrfucx
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',error:'#F25A5A'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow)n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.45},offset:{x:0,y:-4},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.textAlignHorizontal=o.align||'LEFT';n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,alert:(c)=>`<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 1.5 L12.2 11.5 H0.8 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5 V7.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="6.5" cy="9.8" r="0.65" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const DOC=byName(p5,'page 05 doc')[0];
DOC.resize(1560,1780);
/* remove old D section */
for(const c of [...DOC.children]){ if(/^q-answered$|^q-waiting$|^q-failed$|^d-h$|^d-s$|^d-note$|^cap-d-/.test(String(c.name))) c.remove(); }
for(const n of byName(DOC,'q-answered').concat(byName(DOC,'q-waiting'),byName(DOC,'q-failed'))) { try{n.remove();}catch(e){} }
/* D header */
const DH=find2name('d-h'); function find2name(){return null;}
TL(DOC,'d-h','D · 问题详情（点击红色 ?）',0,1230,{size:12,color:C.t1,fontStyle:'Medium'});
TL(DOC,'d-s','一次 ask_user_question 可带 1—4 个问题：逐题展示「问题 + 答案」，不列未选的选项与选项说明；等待中只有问题。',0,1252,{size:10.5,color:C.t3});
function questionBlock(drawer,y,idx,header,prompt,selected,custom,showDivider){
 if(showDivider){R(drawer,'div-'+idx,16,y-9,448,1,C.b1);}
 TL(drawer,'qno-'+idx,'Q'+idx,16,y,{size:9.5,mono:true,color:C.accent});
 TL(drawer,'qh-'+idx,header,40,y-1,{size:10.5,color:C.t3});
 const pb=TT(drawer,'qp-'+idx,prompt,16,y+18,448,{size:12,lh:19,color:C.t1});
 let yy=y+18+pb.height+8;
 if(selected&&selected.length>0){
  TL(drawer,'ak-'+idx,'答案',16,yy+2,{size:10,color:C.t3});
  let cx=50;
  selected.forEach((label,li)=>{
   const w=Math.ceil(label.length*11)+18;
   const chip=F(drawer,'chip-'+idx+'-'+li,cx,yy,w,22,{fill:null,radius:5,stroke:C.success,strokeOpacity:0.5});chip.fills=[solid(C.success,0.1)];
   TL(chip,'ct',label,9,0,22,{size:10.5,color:C.success});
   cx+=w+6;
  });
  yy+=28;
 }
 if(custom){
  TL(drawer,'ck-'+idx,'自由输入',16,yy+2,{size:10,color:C.t3});
  TT(drawer,'cv-'+idx,custom,72,yy,380,{size:10.5,lh:16,color:C.t2});
  yy+=Math.max(18,0);
 }
 if((!selected||selected.length===0)&&!custom){
  TL(drawer,'none-'+idx,'等待回复，暂无答案',16,yy+2,{size:10,color:C.t3});
  yy+=18;
 }
 return yy+6;
}
function statusChip(drawer,state,x){
 const st=state==='answered'?{c:C.success,t:'已回答'}:state==='waiting'?{c:C.accent,t:'等待回复'}:{c:C.error,t:'提问失败'};
 const chip=F(drawer,'state',x,26,64,20,{fill:null,radius:5,stroke:st.c,strokeOpacity:0.5});chip.fills=[solid(st.c,0.12)];
 TL(chip,'ct',st.t,0,0,20,{size:10,color:st.c});
 const t=chip.children[chip.children.length-1]; t.x=(64-t.width)/2;
}
function header(drawer,when,count,state){
 R(drawer,'handle',222,9,36,4,C.b3,{radius:2});
 TL(drawer,'title','向人类提问',16,24,{size:13,color:C.t1,fontStyle:'Semibold'});
 statusChip(drawer,state,104);
 const cb=F(drawer,'close',440,24,24,24,{fill:null,radius:5});SVG(cb,'x',SYM.close(C.t3),7,7);
 TL(drawer,'when',when+' · '+count+' 个问题 · 来自 ui',16,52,{size:9.5,mono:true,color:C.t3});
}
/* D1 multi answered */
const D1=F(DOC,'q-multi-answered',0,1284,480,420,{fill:C.bg2,radius:10,clip:true,shadow:true});
header(D1,'16:12:10','3','answered');
let y=80;
y=questionBlock(D1,y,1,'工具栏','工具栏在 480px 下溢出，右侧「任务数 / 刷新」被裁，怎么处理？',['图标化 + 删总任务数'],null,false);
y=questionBlock(D1,y,2,'任务详情','任务详情继续用底部面板，还是改成抽屉？',['底部抽屉（覆盖）','不压缩图区'],null,true);
y=questionBlock(D1,y,3,'时间语义','「认领时间」放在条内还是条下？',[],'条下，别压字',true);
TL(D1,'foot','提问来自会话日志 · 只读 · 多选时答案可能有多个',16,392,{size:9,color:C.dim});
TL(DOC,'cap-d1','D1 · 已回答：3 个问题逐题「问题 + 答案」；Q2 多选两个 label，Q3 是「自由输入」的真实结果',0,1712,{size:10,color:C.t3});
/* D2 multi waiting */
const D2=F(DOC,'q-multi-waiting',520,1284,480,300,{fill:C.bg2,radius:10,clip:true,shadow:true});
header(D2,'16:19:40','2','waiting');
y=80;
y=questionBlock(D2,y,1,'下一步','先在工具栏、详情抽屉、泳道头之间选一个先改，选哪个？',null,null,false);
y=questionBlock(D2,y,2,'验收','改完之后需要我在真机面板上复验哪些状态？',null,null,true);
TL(D2,'wait-note','等待回复 · 图中问号持续脉冲；此刻不列出选项，因为还没有答案',16,268,{size:10,color:C.accent});
TL(DOC,'cap-d2','D2 · 等待回复：只有问题，没有选项也没有答案',520,1712,{size:10,color:C.t3});
/* D3 failed */
const D3=F(DOC,'q-failed',1040,1284,480,220,{fill:C.bg2,radius:10,clip:true,shadow:true});
header(D3,'16:21:05','1','failed');
TL(D3,'fail-hint','调用被拒绝，问题没有到达人类',16,84,{size:11,color:C.t1});
const eb=F(D3,'err',16,108,448,48,{fill:null,radius:6,stroke:C.error,strokeOpacity:0.4});eb.fills=[solid(C.error,0.09)];
SVG(eb,'al',SYM.alert(C.error),10,17);
TL(eb,'code','UserQuestionError/DELEGATED_CALLER',30,8,{size:10,mono:true,color:C.error});
TL(eb,'text','delegated caller cannot ask the human',30,26,{size:9.5,mono:true,color:C.t3});
TL(D3,'fail-note','失败时不显示空选项，也不假装「没人回答」',16,176,{size:10,color:C.t3});
TL(DOC,'cap-d3','D3 · 提问失败：给出错误码与原因，不展示问题当答案',1040,1712,{size:10,color:C.t3});
/* bottom note */
TL(DOC,'d-extra','若结果无法解析：抽屉显示「结果无法解析，以下为原文」+ 原始 JSON，而不是空答案。',0,1740,{size:10,color:C.dim});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
