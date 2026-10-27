// dsh-task-gantt · Figma build step 50/90
// turn 2 · step 26 · callId call_00_ezjo2jc8fi7as58gwnc68mnk
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={accent:'#7AAAFF',t1:'#F9FAFB',t3:'#ADB2B8',dim:'#43454A',b1:'#2E2E2F'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function R(parent,name,x,y,w,h,color){const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);n.fills=[solid(color)];parent.appendChild(n);return n;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const p0=figma.root.children.find(p=>p.name.startsWith('00'));
const doc0=p0.children[0];
doc0.resize(1440,1000);
for(const c of [...doc0.children]){ let n='';try{n=c.name;}catch(e){continue;} if(/^idx-|^note$/.test(n)) c.remove(); }
const idx=[['00','封面与结论','目标、约束、交付物'],['01','现状 AS-IS','按 v0.2.38 源码与暗色令牌重建的面板'],['02','问题走查','24 条问题的定位、证据与严重度'],['03','改版 MAIN','480px 暗色主界面 + 亮色变体'],['04','状态与交互','选中、悬停、筛选、冻结、空态、错误态'],['05','详情与时间语义','任务 / 消息 / 问题详情 + 认领时刻'],['06','设计规范','令牌、字号、间距、组件状态']];
idx.forEach((row,i)=>{
 const y=608+i*46;
 TL(doc0,'idx-'+i+'-no',row[0],96,y,40,{size:12,color:C.accent,mono:true});
 TL(doc0,'idx-'+i+'-name',row[1],148,y,250,{size:14,color:C.t1,fontStyle:'Medium'});
 TL(doc0,'idx-'+i+'-desc',row[2],416,y,900,{size:12,color:C.t3});
 if(i<idx.length-1)R(doc0,'idx-rule-'+i,96,y+38,1248,C.b1);
});
TL(doc0,'note','说明：仓库内 docs/screenshots/panel-v4.png 为 v0.2.11 的历史截图（旧色板、旧状态文案），本稿「现状」依据当前 v0.2.38 源码重建。',96,958,1150,{size:10,color:C.dim});
figma.viewport.scrollAndZoomIntoView([doc0]);
return {ok:true,doc:doc0.id};
