// dsh-task-gantt · Figma build step 61/90
// turn 2 · step 51 · callId call_00_i1sx4qkti0vw6yr7a2131m7p
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={accent:'#7AAAFF',t1:'#F9FAFB',t3:'#ADB2B8'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function find(root,name){if(root===null)return null;if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
/* specs title */
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const d6=p6.children[0];
const pt6=find(d6,'pt');
if(pt6) pt6.characters='06 · 设计规范';
/* page 03 note 07 */
const p3=figma.root.children.find(p=>p.name.startsWith('03'));
const d3=find(p3,'page 03 doc');
const dot=figma.createEllipse();dot.name='note-dot-07';dot.x=1040;dot.y=515;dot.resize(17,17);fill(dot,C.accent);d3.appendChild(dot);
TL(d3,'note-n-07','07',1040,515,{size:8.5,mono:true,color:'#0F1115'});
TL(d3,'note-t-07','认领时刻',1066,512,{size:11,color:C.t1,fontStyle:'Medium'});
const nb=figma.createText();nb.name='note-b-07';nb.fontName={family:'PingFang SC',style:'Regular'};nb.characters='条下双段轨：灰段 = 创建到认领（排队），蓝段 = 认领到结束（执行），刻线 = 开始执行。';nb.fontSize=10.5;nb.lineHeight={unit:'PIXELS',value:15};fill(nb,C.t3);nb.textAutoResize='HEIGHT';nb.resize(330,10);nb.x=1066;nb.y=530;d3.appendChild(nb);
return {ok:true};
