// dsh-task-gantt · Figma build step 87/90
// turn 8 · step 34 · callId call_00_ruglz8mpjoj3y3ougbpqahtj
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={accent:'#7AAAFF',t1:'#F9FAFB',t3:'#ADB2B8',dim:'#43454A',b1:'#2E2E2F'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function byName(root,name,out){out=out||[];try{if(root.name===name)out.push(root);}catch(e){}for(const c of root.children||[])byName(c,name,out);return out;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
await figma.loadAllPagesAsync();
const p0=figma.root.children.find(p=>p.name.startsWith('00'));
await figma.setCurrentPageAsync(p0);
const doc=p0.children[0];
doc.resize(1440,1040);
/* move the note down */
const note=byName(doc,'note')[0]; if(note) note.y=1000;
/* append index row 07 */
const y=610+7*46;
TL(doc,'idx-7-no','07',96,y+3,{size:12,color:C.accent,mono:true});
TL(doc,'idx-7-name','Markdown 与弹窗',148,y,{size:14,color:C.t1,fontStyle:'Medium'});
TL(doc,'idx-7-desc','正文 Markdown 渲染 / 原文切换 / 应用级详情弹窗',416,y+2,{size:12,color:C.t3});
/* deliverable column gains one line */
const col2=byName(doc,'col-2-body')[0];
if(col2){ col2.characters='1. 01 现状重建（按 v0.2.38 源码）\n2. 02 问题走查：P0 / P1 / P2 共 24 条\n3. 03 改版主界面：暗色 + 亮色\n4. 04 状态与交互（空/错误/冻结态）\n5. 05 任务 / 消息 / 问题详情 + 认领时刻\n6. 06 组件、令牌与字号规范\n7. 07 Markdown 渲染 + 应用级弹窗'; }
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
