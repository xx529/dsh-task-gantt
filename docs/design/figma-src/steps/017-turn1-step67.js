// dsh-task-gantt · Figma build step 17/90
// turn 1 · step 67 · callId call_00_76nrx0n1bha1cqie8py42iq7
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={business:'#7AAAFF',dim:'#43454A',ink:'#0F1115',t2:'#CFD3D6'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||'#232324')];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=false;if(o.stroke)stroke(n,o.stroke,1);else n.strokes=[];parent.appendChild(n);return n;}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const wrap=find(figma.currentPage,'panel+zone');
const PAGE=find(figma.currentPage,'page 02 doc');
/* remove in-panel zone labels and tags */
for(const c of [...wrap.children]){ if(/^zone-tag-|^zone-label-/.test(c.name)) c.remove(); }
/* re-add badges outside the panel left edge */
const zones=[['A',0],['B',30],['C',58],['D',86],['E',492]];
zones.forEach(([id,y])=>{
 const tag=F(wrap,'zone-tag-'+id,-26,y,18,16,{fill:C.business,radius:3});
 TL(tag,'zt-'+id,id,5,-2,16,{size:10,mono:true,color:C.ink});
});
/* fix sum text: recreate */
const old=PAGE.children.find(c=>c.name==='sum'); if(old) old.remove();
TL(PAGE,'sum','结论：问题不是「样式不好看」，而是信息层级、编码通道与控件可达性同时失守。改版顺序：① 信息结构 → ② 编码收敛 → ③ 视觉打磨。',0,752,20,{size:12,color:C.t2});
figma.viewport.scrollAndZoomIntoView([PAGE]);
return {ok:true};
