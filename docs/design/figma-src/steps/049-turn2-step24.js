// dsh-task-gantt · Figma build step 49/90
// turn 2 · step 24 · callId call_00_95ynf4e7i1002tue5xrp0s85
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={accent:'#7AAAFF',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',b1:'#2E2E2F',line0:'#2563EB'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
/* ---- page 05: fix anatomy callouts + 未认领 dashed ---- */
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const doc5=find(p5,'page 05 doc');
const AN=find(doc5,'anatomy');
const n1=find(AN,'n1'),n3=find(AN,'n3'),n5=find(AN,'n5'),l1=find(AN,'l1'),l3=find(AN,'l3'),l5=find(AN,'l5');
if(n1){n1.y=8;}
if(n3){n3.y=34;}
if(n5){n5.y=8;}
if(l1){l1.y=30;l1.resize(1,42);}
if(l5){l5.y=30;l5.resize(1,42);}
if(l3){l3.y=50;l3.resize(1,22);}
const vb0=find(doc5,'vb-0');
if(vb0){ for(let yy=2;yy<20;yy+=4){const d=figma.createRectangle();d.name='dash';d.x=vb0.width-2;d.y=yy;d.resize(1.5,2.2);d.fills=[solid(C.line0)];vb0.appendChild(d);} }
/* ---- page 06: title 05 -> 06 ---- */
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const doc6=find(p6,'page 06 doc');
const pt6=find(doc6,'pt');
if(pt6) pt6.characters='06 · 设计规范';
/* ---- page 03: 7th note ---- */
const p3=figma.root.children.find(p=>p.name.startsWith('03'));
const doc3=find(p3,'page 03 doc');
const dot=figma.createEllipse();dot.name='note-dot-07';dot.x=1040;dot.y=515;dot.resize(17,17);dot.fills=[solid(C.accent)];doc3.appendChild(dot);
TL(doc3,'note-n-07','07',1040,515,17,{size:8.5,mono:true,color:'#0F1115'});
TL(doc3,'note-t-07','认领时刻',1066,512,16,{size:11,color:C.t1,fontStyle:'Medium'});
const nb=figma.createText();nb.name='note-b-07';nb.fontName={family:'PingFang SC',style:'Regular'};nb.characters='条下双段轨：灰段 = 创建到认领（排队），蓝段 = 认领到结束（执行），刻线 = 开始执行。';nb.fontSize=10.5;nb.lineHeight={unit:'PIXELS',value:15};nb.fills=[solid(C.t3)];nb.textAutoResize='HEIGHT';nb.resize(330,10);nb.x=1066;nb.y=530;doc3.appendChild(nb);
/* ---- cover: rebuild index with 7 rows ---- */
const p0=figma.root.children.find(p=>p.name.startsWith('00'));
const doc0=find(p0,'page 00 doc')||p0.children[0];
doc0.resize(1440,1000);
for(const c of [...doc0.children]){ if(/^idx-|^note$/.test(c.name)) c.remove(); }
const idx=[['00','封面与结论','目标、约束、交付物'],['01','现状 AS-IS','按 v0.2.38 源码与暗色令牌重建的面板'],['02','问题走查','24 条问题的定位、证据与严重度'],['03','改版 MAIN','480px 暗色主界面 + 亮色变体'],['04','状态与交互','选中、悬停、筛选、冻结、空态、错误态'],['05','详情与时间语义','任务 / 消息 / 问题详情 + 认领时刻'],['06','设计规范','令牌、字号、间距、组件状态']];
idx.forEach((row,i)=>{
 const y=608+i*46;
 TL(doc0,'idx-'+i+'-no',row[0],96,y,40,{size:12,color:C.accent,mono:true});
 TL(doc0,'idx-'+i+'-name',row[1],148,y,250,{size:14,color:C.t1,fontStyle:'Medium'});
 TL(doc0,'idx-'+i+'-desc',row[2],416,y,900,{size:12,color:C.t3});
 if(i<idx.length-1)R(doc0,'idx-rule-'+i,96,y+38,1248,1,C.b1);
});
TL(doc0,'note','说明：仓库内 docs/screenshots/panel-v4.png 为 v0.2.11 的历史截图（旧色板、旧状态文案），本稿「现状」依据当前 v0.2.38 源码重建。',96,962,1150,{size:10,color:C.dim});
figma.viewport.scrollAndZoomIntoView([doc0]);
return {ok:true};
