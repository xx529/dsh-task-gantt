// dsh-task-gantt · Figma build step 8/90
// turn 1 · step 49 · callId call_00_296jfpwba79ubvxu7v50aoob
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',business:'#7AAAFF',lane0:'#2563EB',lane1:'#A3294F',lane2:'#558130',lane3:'#786BA5',lane4:'#765C19'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o,dash){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';if(dash)n.strokeDashes=dash;}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.rTL!==undefined)n.topLeftRadius=o.rTL;if(o.rTR!==undefined)n.topRightRadius=o.rTR;if(o.rBL!==undefined)n.bottomLeftRadius=o.rBL;if(o.rBR!==undefined)n.bottomRightRadius=o.rBR;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity,o.dash);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function T(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='NONE';n.resize(Math.max(w,1),o.h||(o.lh||Math.max(o.size||11,14)));n.textAlignHorizontal=o.align||'LEFT';n.textAlignVertical='CENTER';n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'})]);
const plot=find(figma.currentPage,'plot');
const X0=138,SEC=4,NOW=1200,HEAD_W=132;
const px=s=>X0+s/SEC;
const laneData=[
 {i:0,color:C.lane0,waits:[[350,430,'woken']],msgs:[[300,'out',C.lane1],[420,'in',C.lane2],[960,'out',C.lane1]],
  tasks:[{s:'设计面板布局',a:30,b:300,ev:[30,60,300]},{s:'重写工具栏分组',a:700,b:null,ev:[700]}]},
 {i:2,color:C.lane2,waits:[],msgs:[[560,'in',C.lane0],[980,'out',C.lane0],[1150,'q','#EC1313']],
  tasks:[{s:'面板骨架与样式令牌',a:430,b:700,ev:[430,460,700]},{s:'走查滚动与对齐',a:760,b:null,ev:[760]}]}
];
const log=[];
for(const L of laneData){
 const idx=L.i, y=idx*72;
 try{
  (L.waits||[]).forEach((w,wi)=>{const x1=px(w[0])-HEAD_W,x2=px(w[1])-HEAD_W,wd=x2-x1;const band=F(plot,'probe-wait-'+idx,x1,y+17,wd,10,{fill:null,clip:true});R(band,'wait-bg',0,0,wd,10,C.t3,{opacity:0.35});for(let hx=-10;hx<wd+10;hx+=4){const st=R(band,'hatch',hx,0,1.6,14,C.bg1,{opacity:0.9});st.rotation=45;}R(band,'cap-start',0,-1,2,12,C.t1);});
  log.push('wait-'+idx+' ok');
 }catch(e){log.push('wait-'+idx+' ERR '+String(e));}
 try{
  (L.msgs||[]).forEach((m,mi)=>{const s=m[0],dir=m[1],color=m[2],x=px(s)-HEAD_W,yy=y+3;if(dir==='q'){E(plot,'probe-q',x-7,yy-1,14,14,C.bg1);T(plot,'probe-qt','?',x-4,yy,9,{size:11,color:'#EC1313',fontStyle:'Medium',align:'CENTER'});return;}const rot=dir==='in'?' transform="rotate(180 6.5 6.5)"':'';const path='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+path+'" fill="none" stroke="'+C.bg1+'" stroke-width="4.4" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';SVG(plot,'probe-msg-'+mi,svg,x-9.3,yy-1);});
  log.push('msg-'+idx+' ok');
 }catch(e){log.push('msg-'+idx+' ERR '+String(e));}
 try{
  (L.tasks||[]).forEach((t,ti)=>{const x1=px(t.a)-HEAD_W;const end=t.b===null?NOW:t.b;let w=px(end)-HEAD_W-x1;const live=t.b===null;const by=y+30;if(w<12&&live){R(plot,'probe-tm',x1,by+5,9,9,L.color,{radius:2});return;}const ww=Math.max(w,14);R(plot,'probe-task',x1,by,ww,20,C.bg2,{radius:live?0:4,rTL:4,rBL:4,border:C.b2});R(plot,'probe-stripe',x1,by,3,20,L.color,{rTL:4,rBL:4,rTR:0,rBR:0});if(live)R(plot,'probe-open',x1+ww-1.5,by,1.5,20,L.color,{border:L.color,dash:[2,2]});const labelW=ww-13;if(labelW>=30){T(plot,'probe-label',t.s,x1+9,by+3,labelW,{size:11,color:C.t1,fontStyle:'Medium'});}else if(labelW>=15){T(plot,'probe-ell','…',x1+7,by+3,10,{size:11,color:C.t2,fontStyle:'Medium'});}(t.ev||[]).forEach((ev,ei)=>{const ex=px(ev)-HEAD_W;const glyph=ei===0?'＋':(ev===t.b?'✓':'▶');T(plot,'probe-ev',glyph,ex-1,by+21,12,{size:11,color:L.color,fontStyle:'Medium'});});});
  log.push('task-'+idx+' ok');
 }catch(e){log.push('task-'+idx+' ERR '+String(e));}
}
return {plot:plot.id, log};
