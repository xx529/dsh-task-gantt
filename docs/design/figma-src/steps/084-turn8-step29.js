// dsh-task-gantt · Figma build step 84/90
// turn 8 · step 29 · callId call_00_swinftvdze6f5s0zy9ffdnq3
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',doc:'#1B1B1C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function byName(root,name,out){out=out||[];try{if(root.name===name)out.push(root);}catch(e){}for(const c of root.children||[])byName(c,name,out);return out;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const doc=p5.children[0];
const msgIn=byName(doc,'msg-in')[0];
const msgOut=byName(doc,'msg-out')[0];
function toggle(drawer,label,x){
 const b=F(drawer,'raw-toggle',x,26,42,20,{fill:null,radius:4,stroke:C.b2});
 const t=TL(b,'raw-label',label,0,4,{size:10,color:C.t2}); t.x=(42-t.width)/2;
}
toggle(msgIn,'原文',386);
toggle(msgOut,'渲染',386);
/* rendered body */
const bi=byName(msgIn,'body')[0];
for(const c of [...bi.children]) c.remove();
TL(bi,'md-h','新任务：复用 backend 职责',0,0,{size:11.5,color:C.t1,fontStyle:'Medium'});
TL(bi,'md-p1','team_task_list →',0,22,{size:10.5,color:C.t2});
const chip=F(bi,'md-code',86,20,150,16,{fill:C.bg3,radius:3});
TL(chip,'code-t','team_task_get task-66',5,3,{size:9.5,mono:true,color:C.t1});
TL(bi,'md-p2','→ claim → 执行',244,22,{size:10.5,color:C.t2});
TL(bi,'md-p3','写作用域 lib/host/**；不碰 client/tests/docs。',0,42,{size:10.5,color:C.t2});
const bullets=['bash 的 description 作为卡片标题','「会话名」改为角色名 lead','npm run verify exit 0（基线 365/91）'];
bullets.forEach((b,i)=>{
 E(bi,'md-bullet-'+i,1,64+i*16+4,3,3,C.accent);
 TL(bi,'md-li-'+i,b,10,60+i*16,{size:10.5,color:C.t2});
});
const link=TL(bi,'md-link','task-66 · docs/host/README.md',0,112,{size:10.5,color:C.accent});
link.textDecoration='UNDERLINE';
/* raw body */
const bo=byName(msgOut,'body')[0];
for(const c of [...bo.children]) c.remove();
const rawText='# 新任务（复用 backend 职责）\n**team_task_list** → `team_task_get task-66` → claim → 执行\n写作用域 `lib/host/**`；不碰 client/tests/docs\n- bash 的 `description` 作为卡片标题\n- 「会话名」前方改为角色名 lead\n```bash\nnpm run verify  # 基线 365/91\n```';
TT(bo,'md-raw',rawText,0,0,448,{size:9.5,lh:14,color:C.t2,mono:true});
/* note */
const note=byName(doc,'c-note')[0];
if(note){ note.characters='详情正文默认按 Markdown 渲染；右上「原文」切到源文本。展开后的应用级弹窗见 07 页。'; note.resize(377,30); }
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
