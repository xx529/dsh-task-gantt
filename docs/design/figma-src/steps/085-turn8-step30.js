// dsh-task-gantt · Figma build step 85/90
// turn 8 · step 30 · callId call_00_fiav1ut96wrwi7vw8h8ifcth
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',error:'#F25A5A',doc:'#1B1B1C',app:'#1B1B1C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow)n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.55},offset:{x:0,y:12},radius:40,spread:0,visible:true,blendMode:'NORMAL'}];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function byName(root,name,out){out=out||[];try{if(root.name===name)out.push(root);}catch(e){}for(const c of root.children||[])byName(c,name,out);return out;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
let page=figma.root.children.find(p=>p.name.startsWith('07 · Markdown'));
if(!page){page=figma.createPage();page.name='07 · Markdown 与弹窗';}
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 07 doc',0,0,1400,1120,{fill:C.doc});
TL(DOC,'pt','07 · Markdown 与弹窗',0,0,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','详情正文默认渲染 Markdown，「原文」切回源文本；展开后的详情弹窗 portal 到应用层、在整窗居中（不是侧边栏居中）',0,38,{size:12,color:C.t3});
/* app shell */
const APP=F(DOC,'app-window',0,90,1280,780,{fill:C.app,radius:12,stroke:C.b2,clip:true});
const TOP=F(APP,'app-topbar',0,0,1280,48,{fill:C.bg1});
R(TOP,'line',0,47,1280,1,C.b1);
E(TOP,'traffic-r',16,20,10,10,C.error);
E(TOP,'traffic-a',32,20,10,10,'#F59E0B');
E(TOP,'traffic-g',48,20,10,10,C.success);
TL(TOP,'app-title','DeepSeek Harness',66,16,{size:11,color:C.t3});
/* left chat placeholder */
for(let i=0;i<7;i++){
 const w=[520,360,440,500,300,420,240][i];
 R(APP,'chat-line-'+i,190,96+i*64,w,10,C.b3,{opacity:0.55,radius:5});
}
R(APP,'chat-user',520,92,240,52,C.bg2,{radius:10});
TL(APP,'chat-user-t','把甘特图的详情改成 Markdown 渲染',532,106,{size:10.5,color:C.t3});
/* right sidebar: real panel clone */
const p3=figma.root.children.find(p=>p.name.startsWith('03'));
const src=byName(p3,'03 · 改版 · 暗色 480×580')[0];
R(APP,'sidebar-bg',800,48,480,732,C.bg1);
R(APP,'sidebar-edge',799,48,1,732,C.b2);
const panel=src.clone();APP.appendChild(panel);panel.x=800;panel.y=48;panel.name='gantt-panel';
/* dim backdrop over the app */
R(APP,'modal-backdrop',0,0,1280,780,'#000000',{opacity:0.55});
/* app-centered modal */
const MODAL=F(APP,'detail-modal',280,110,720,560,{fill:C.bg1,radius:12,stroke:C.b2,clip:true,shadow:true});
const H=F(MODAL,'modal-head',0,0,720,58,{fill:null});R(H,'head-line',0,57,720,1,C.b1);
TL(H,'m-title','消息详情 · lead → backend',20,18,{size:13,color:C.t1,fontStyle:'Semibold'});
E(H,'m-dot',252,27,6,6,C.accent);
TL(H,'m-word','收到',264,20,{size:10.5,color:C.t2});
const rawbtn=F(H,'raw-toggle',568,18,52,22,{fill:null,radius:5,stroke:C.b2});
const rt=TL(rawbtn,'rt','原文',0,4,{size:10,color:C.t2});rt.x=(52-rt.width)/2;
const close=F(H,'m-close',644,18,24,24,{fill:null,radius:5});TL(close,'x','✕',6,3,{size:11,color:C.t3});
/* body */
TT(MODAL,'m-meta','16:13:20 · 消息 · 来自会话日志',20,74,680,{size:9.5,lh:14,color:C.t3,mono:true});
TL(MODAL,'m-h','新任务：复用 backend 职责',20,96,{size:14,color:C.t1,fontStyle:'Semibold'});
TT(MODAL,'m-p','从 team_task_list 到 team_task_get task-66，再 claim、执行。写作用域限定在 lib/host/**；不碰 client/tests/docs；不 commit/push。',20,126,680,{size:12,lh:19,color:C.t2});
TL(MODAL,'m-sub','用户两条反馈',20,176,{size:12,color:C.t1,fontStyle:'Medium'});
const items=['bash 的 description 作为卡片标题（trim / 单行化 / ≤200 字符截断）','会话名前方的名称改用角色名（主会话 = lead，teammate = displayName）','npm run verify exit 0（基线 365/91 不得回退）'];
items.forEach((t,i)=>{E(MODAL,'mb-'+i,22,206+i*22+4,3,3,C.accent);TL(MODAL,'mli-'+i,t,32,202+i*22,{size:11,color:C.t2});});
const code=F(MODAL,'m-code',20,278,680,64,{fill:C.bg3,radius:6});
TT(code,'c1','team_task_update action=claim expected_revision=1',12,10,656,{size:10.5,lh:16,color:C.t1,mono:true});
TT(code,'c2','team_task_update action=complete',12,30,656,{size:10.5,lh:16,color:C.t3,mono:true});
TT(MODAL,'m-p2','细节见 task-66：classify.mjs 的 commandAndCwd 加 description；capture-bash.mjs 写入 store；store.mjs serialize 输出 description。',20,356,680,{size:12,lh:19,color:C.t2});
TT(MODAL,'m-link','docs/INSTALL.md · 规则来源',20,420,600,{size:11,lh:17,color:C.accent,mono:true});
TL(MODAL,'m-foot','Esc 先关弹窗 · 点遮罩关闭 · 弹窗复用抽屉的同一份内容节点',20,512,{size:9,color:C.dim});
/* captions / notes */
TL(DOC,'note-t','要点',0,890,{size:12,color:C.t1,fontStyle:'Medium'});
const notes=['1. 详情正文默认按 Markdown 渲染：标题 / 粗体 / 行内代码 / 列表 / 代码块 / 链接。','2. 右上「原文」切到源文本（等宽 pre），再点「渲染」回来；切换不清空内容。','3. 展开按钮触发弹窗：portal 到 body + position:fixed，在【整个应用】居中（720px 宽），不是侧边栏 480px 居中。','4. 弹窗与抽屉复用同一份内容节点（drawerBody），所以两处不会出现内容差异。'];
notes.forEach((t,i)=>TT(DOC,'note-'+i,t,0,920+i*24,1180,{size:10.5,lh:18,color:C.t3}));
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true,page:page.name,doc:DOC.id};
