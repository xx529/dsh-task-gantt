// dsh-task-gantt · Figma build step 80/90
// turn 4 · step 13 · callId call_00_eo20ovdm54g9462k38k1qhg5
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'})]);
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const DOC=byName(p5,'page 05 doc')[0];
const d2=byName(DOC,'q-multi-waiting')[0];
const d3=byName(DOC,'q-failed')[0];
const dim='#43454A';
if(d2){ d2.resize(480,392); TL(d2,'foot','提问来自会话日志 · 只读',16,366,{size:9,color:dim}); }
if(d3){ d3.resize(480,392); TL(d3,'foot','提问来自会话日志 · 只读',16,366,{size:9,color:dim}); }
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true,d2:d2?d2.id:null,d3:d3?d3.id:null};
