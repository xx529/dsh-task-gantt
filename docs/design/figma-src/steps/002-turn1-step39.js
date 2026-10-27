// dsh-task-gantt · Figma build step 2/90
// turn 1 · step 39 · callId call_00_re3jltby5bc9e8cr4sk6pffn
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',business:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',lane0:'#2563EB',lane1:'#A3294F',lane2:'#558130',lane3:'#786BA5',lane4:'#765C19',doc:'#1B1B1C'};
function rgb(hex){const h=hex.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(hex,opacity){const p={type:'SOLID',color:rgb(hex)};if(opacity!==undefined)p.opacity=opacity;return p;}
function fill(n,hex,o){n.fills=[solid(hex,o)];}
function stroke(n,hex,w,o){n.strokes=[solid(hex,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border){stroke(n,o.border,o.borderWeight||1);}parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function T(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.ls!==undefined)n.letterSpacing={unit:'PIXELS',value:o.ls};if(o.color)fill(n,o.color);n.textAutoResize='NONE';n.resize(w,o.h||(o.lh||Math.max(o.size||11,14)));n.textAlignHorizontal=o.align||'LEFT';n.textAlignVertical='CENTER';n.x=x;n.y=y;parent.appendChild(n);return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||13;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.ls!==undefined)n.letterSpacing={unit:'PIXELS',value:o.ls};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.textAlignHorizontal=o.align||'LEFT';n.x=x;n.y=y;parent.appendChild(n);return n;}
await Promise.all([
 figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'PingFang SC',style:'Light'}),
 figma.loadFontAsync({family:'SF Pro',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'}),figma.loadFontAsync({family:'SF Pro',style:'Semibold'}),figma.loadFontAsync({family:'SF Pro',style:'Light'}),
 figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Medium'})
]);
const page = figma.root.children.find(p=>p.name.startsWith('00'));
await figma.setCurrentPageAsync(page);
const W=1440,H=960;
const board=F(page,'00 · 封面',0,0,W,H,{fill:C.doc,clip:true});
const M=96;
T(board,'eyebrow','DSH PLUGIN · SIDEBAR PANEL · UI/UX REDESIGN',M,88,900,{size:11,ls:1.6,color:C.business,mono:true});
T(board,'title','任务甘特图 · UI/UX 改版',M,116,1100,{size:40,lh:56,color:C.t1,fontStyle:'Semibold'});
T(board,'sub','把「调试可视化」整理成一块可以长期盯着的开发者时间线。',M,186,1000,{size:18,lh:30,color:C.t2});
T(board,'meta','dsh-task-gantt v0.2.38   ·   面板宽度 480px   ·   DSH 设计令牌 · 亮/暗双皮肤   ·   2026-10-27',M,226,1100,{size:11,ls:0.3,color:C.t3,mono:true});
R(board,'rule',M,266,W-2*M,1,C.b1);
const cols=[
 {k:'GOAL',zh:'改版目标',items:['2 秒内读出「谁在做什么、做了多久」','建立泳道 → 任务 → 事件的三层信息结构','收敛颜色与符号编码，删掉需要图例才能看懂的表达','修正不可达控件与反直觉交互'],color:C.business},
 {k:'CONSTRAINT',zh:'不可推翻的既有决定',items:['只读插件：不创建 / 认领 / 完成任务','颜色与字号全部来自 DSH 设计令牌，双皮肤不塌','泳道名＝色底白字；任务条长度＝真实时长','状态不以颜色为唯一编码；活动词位于统计行下方','不显示 notes 诊断行，不加回「活动＋消息」开关'],color:C.warn},
 {k:'DELIVERABLE',zh:'本次交付',items:['01 现状重建（按 v0.2.38 源码）','02 问题走查：P0 / P1 / P2 共 24 条','03 改版主界面：暗色 + 亮色','04 状态与交互规范（含空/错误/冻结态）','05 组件、令牌与字号规范'],color:C.success}
];
const colW=384, gap=36;
cols.forEach((c,i)=>{
 const x=M+i*(colW+gap);
 T(board,'col-'+i+'-kicker',c.k+' / '+c.zh,x,296,400,{size:10,ls:1.4,color:c.color,mono:true});
 const list=c.items.map((s,n)=>`${n+1}. ${s}`).join('\n');
 TT(board,'col-'+i+'-body',list,x,322,colW,{size:13,lh:24,color:C.t2});
});
R(board,'rule2',M,548,W-2*M,1,C.b1);
T(board,'index-kicker','CONTENTS',M,576,300,{size:10,ls:1.4,color:C.t3,mono:true});
const idx=[
 ['00','封面与结论','目标、约束、交付物'],
 ['01','现状 AS-IS','按 v0.2.38 源码与暗色令牌重建的当前面板'],
 ['02','问题走查','24 条问题的定位、证据与严重度'],
 ['03','改版 MAIN','480px 暗色主界面 + 亮色变体'],
 ['04','状态与交互','选中、悬停、筛选、冻结、空态、错误态'],
 ['05','设计规范','令牌、字号、间距、组件状态']
];
idx.forEach((row,i)=>{
 const y=608+i*48;
 T(board,'idx-'+i+'-no',row[0],M,y,40,{size:12,color:C.business,mono:true});
 T(board,'idx-'+i+'-name',row[1],M+52,y,250,{size:14,color:C.t1,fontStyle:'Medium'});
 T(board,'idx-'+i+'-desc',row[2],M+320,y,W-2*M-320,{size:12,color:C.t3});
 if(i<idx.length-1) R(board,'idx-rule-'+i,M,y+40,W-2*M,1,C.b1);
});
T(board,'note','说明：仓库内 docs/screenshots/panel-v4.png 为 v0.2.11 的历史截图（旧色板、旧状态文案），本稿「现状」依据当前 v0.2.38 源码重建。',M,900,1100,{size:10,color:C.dim});
figma.viewport.scrollAndZoomIntoView([board]);
return {page:page.name, frame:board.id};
