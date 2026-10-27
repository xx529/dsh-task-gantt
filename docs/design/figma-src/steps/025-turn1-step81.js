// dsh-task-gantt · Figma build step 25/90
// turn 1 · step 81 · callId call_00_0s252uksep12dww802pkz9vw
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',b1:'#2E2E2F',b2:'#3A3A3C',accent:'#7AAAFF',t1:'#F9FAFB',t3:'#ADB2B8'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName={family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function center(parent,name,text,frameW,top,boxH,o){const t=TL(parent,name,text,0,top,boxH,o);t.x=(frameW-t.width)/2;return t;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'})]);
const doc=find(figma.currentPage,'page 04 doc');
/* 1. selected bar */
const A=doc.children.find(n=>n.name.startsWith('state · 选中'));
const plotA=find(A,'plot');
const sel=find(plotA,'selected-task');
if(sel){ sel.x=181; sel.y=204; sel.resize(100,22); }
/* 2. hover ring + popover */
const B=doc.children.find(n=>n.name.startsWith('state · 悬停'));
const ring=find(B,'hover-ring');
if(ring){ ring.x=21; ring.y=124; ring.resize(105,22); }
const pop=find(B,'popover');
if(pop){ pop.x=40; pop.y=158; }
/* 3. filter menu x */
const M=doc.children.find(n=>n.name.startsWith('state · 筛选'));
const menu=find(M,'filter-menu');
if(menu) menu.x=244;
/* 4/5 center empty + error text */
const E=doc.children.find(n=>n.name==='state · 空态');
if(E){ ['t','t2'].forEach(()=>{}); const t=find(E,'t'); if(t){t.x=(480-t.width)/2;} const icon=find(E,'icon'); if(icon)icon.x=(480-icon.width)/2; }
const ER=doc.children.find(n=>n.name==='state · 错误');
if(ER){ const t=find(ER,'t2'); if(t){t.x=(480-t.width)/2;} const b=find(ER,'b2'); if(b){b.x=(480-b.width)/2;} const ic=find(ER,'icon'); if(ic)ic.x=(480-ic.width)/2; }
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
