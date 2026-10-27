// dsh-task-gantt · Figma build step 27/90
// turn 1 · step 83 · callId call_00_896lkmil7qu41uapy8j6l9f3
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',white:'#FFFFFF'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
const SYM={check:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4.2 L3.1 6.1 L6.8 1.9" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 funnel:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1.6 2.4 H10.4 L6.8 6.6 V10.4 L5.2 9.2 V6.6 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
 q:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><circle cx="4.5" cy="4.5" r="4" fill="none" stroke="${c}" stroke-width="1"/><path d="M3.4 3.3 C3.5 2.5 4 2.1 4.6 2.1 C5.3 2.1 5.7 2.5 5.7 3.1 C5.7 3.9 4.6 4 4.6 4.9" fill="none" stroke="${c}" stroke-width="1" stroke-linecap="round"/><circle cx="4.6" cy="6.6" r="0.55" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const page=figma.root.children.find(p=>p.name.startsWith('05'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 05 doc',0,0,1600,1180,{fill:C.doc});
TL(DOC,'pt','05 · 设计规范',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','令牌、字号、间距与组件状态：所有值都能落到 DSH 的 --dsw-* 令牌上，亮暗双皮肤同一套结构',0,38,18,{size:12,color:C.t3});
/* ---- palette ---- */
const PAL=F(DOC,'palette',0,110,480,700,{fill:null});
TL(PAL,'pt-t','颜色令牌',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(PAL,'pt-s','按宿主暗色皮肤真实解析值；亮色为对应别名在白色底上的解析值',0,22,16,{size:10,color:C.t3});
const tokens=[['bg-layer-1','#232324','#FFFFFF','面板底'],['bg-layer-2','#2C2C2E','#F5F6F8','卡片/浮层'],['border-l1','#2E2E2F','#F0F1F2','分隔线'],['border-l2','#3A3A3C','#E6E6E6','控件描边'],['label-primary','#F9FAFB','#0F1115','正文'],['label-secondary','#CFD3D6','#61666B','次要文本'],['label-tertiary','#ADB2B8','#81858C','辅助文本'],['state-business','#7AAAFF','#4176E6','强调 / NOW'],['state-success','#22C55E','#16A34A','运行中'],['state-warn','#F59E0B','#D97706','启动 / 等待'],['state-error','#F25A5A','#DC2626','失败']];
tokens.forEach(([n,d,l,role],i)=>{
 const y=48+i*30;
 R(PAL,'sw-d-'+i,0,y,20,20,d,{radius:4,border:C.b2});
 R(PAL,'sw-l-'+i,28,y,20,20,l,{radius:4,border:'#E6E6E6'});
 TL(PAL,'tk-'+i,n,58,y,20,{size:10,color:C.t2,mono:true});
 TL(PAL,'tv-'+i,d.toUpperCase()+'  /  '+l.toUpperCase(),208,y,20,{size:9.5,color:C.t3,mono:true});
 TL(PAL,'tr-'+i,role,392,y,20,{size:10,color:C.t3});
});
TL(PAL,'lane-t','泳道身份色（宿主 16 色 roster，取前 6）',0,404,18,{size:10.5,color:C.t2});
const L=['#2563EB','#A3294F','#558130','#786BA5','#765C19','#9D5C91'];
L.forEach((c,i)=>{const x=i*76;R(PAL,'lane-'+i,x,428,60,28,c,{radius:5});TL(PAL,'lane-n-'+i,String(i),x,460,14,{size:9,color:C.t3,mono:true});});
TL(PAL,'lane-note','身份色只出现在：泳道名药丸、任务条左 3px、消息箭头的对端色。状态永远用语义色 + 形状。',0,486,16,{size:10,color:C.t3});
TL(PAL,'size-t','尺寸与间距',0,520,18,{size:12,color:C.t1,fontStyle:'Medium'});
const dims=[['面板宽',480],['工具栏',40],['时间轴',26],['泳道高',80],['泳道头宽',136],['任务条高',22],['控件高',26]];
dims.forEach(([k,v],i)=>{const y=548+i*20;TL(PAL,'dk-'+i,k,0,y,16,{size:10,color:C.t3});TL(PAL,'dv-'+i,String(v)+' px',360,y,16,{size:10,color:C.t2,mono:true});});
/* ---- type + spacing ---- */
const TYPE=F(DOC,'type',520,110,480,420,{fill:null});
TL(TYPE,'t-t','字号与行高',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
const type=[['13 / 20','Semibold','抽屉标题、空态标题'],['12 / 18','Medium','区块标题、浮窗标题'],['11 / 16','Medium','任务条标签、泳道名'],['11 / 16','Regular','正文、简介、说明'],['10.5 / 14','Regular','计数、活动词、meta'],['10 / 14','Mono','时间刻度、时间值'],['9 / 12','Mono','构建号、徽标数字']];
type.forEach(([s,w,u],i)=>{const y=30+i*44;TL(TYPE,'ts-'+i,s,0,y,18,{size:10,color:C.accent,mono:true});TL(TYPE,'tw-'+i,w,74,y,18,{size:10,color:C.t3,mono:true});TL(TYPE,'tu-'+i,u,150,y,18,{size:10,color:C.t3});R(TYPE,'tline-'+i,0,y+26,480,1,C.b1);});
TL(TYPE,'gap-t','间距刻度',0,352,18,{size:12,color:C.t1,fontStyle:'Medium'});
[4,6,8,12,16].forEach((s,i)=>{const x=i*90;R(TYPE,'sp-'+i,x,380,s,16,C.accent,{opacity:0.5,radius:2});TL(TYPE,'sp-n-'+i,String(s),x,400,14,{size:9.5,color:C.t3,mono:true});});
TL(TYPE,'rad-t','圆角',0,470,18,{size:12,color:C.t1,fontStyle:'Medium'});
[3,4,5,6,8,10].forEach((r,i)=>{const x=i*76;R(TYPE,'rd-'+i,x,498,44,32,C.bg2,{radius:r,border:C.b2});TL(TYPE,'rd-n-'+i,String(r),x,536,14,{size:9.5,color:C.t3,mono:true});});
/* ---- components ---- */
const COM=F(DOC,'components',1040,110,520,900,{fill:null});
TL(COM,'c-t','组件状态',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
function rowLabel(y,s){TL(COM,'cl-'+y,s,0,y,16,{size:10,color:C.t3});}
rowLabel(40,'ghost 按钮');
const gb=F(COM,'btn-ghost',140,34,72,26,{fill:null,radius:6,stroke:C.b2});TL(gb,'gb-t','全部时段',0,0,26,{size:11,color:C.t2});gb.children[0].x=10;
rowLabel(78,'图标按钮 + 徽标');
const ib=F(COM,'btn-icon',140,72,26,26,{fill:null,radius:6});SVG(ib,'i',SYM.funnel(C.t2),7,7);E(ib,'b',17,-1,13,13,C.accent);TL(ib,'bn','2',17,-1,13,{size:8.5,mono:true,color:'#0F1115'});
rowLabel(122,'开关 on / off');
const sw1=F(COM,'sw-on',140,116,26,14,{fill:C.accent,radius:7});E(sw1,'k',13,2,10,10,'#FFFFFF');
const sw2=F(COM,'sw-off',180,116,26,14,{fill:C.b3,radius:7});E(sw2,'k',3,2,10,10,C.t3);
rowLabel(166,'NOW 胶囊');
const nowp=F(COM,'now-pill',140,160,88,26,{fill:null,radius:6,stroke:C.accent,strokeOpacity:0.45});nowp.fills=[solid(C.accent,0.14)];TL(nowp,'n1','现在',8,0,26,{size:10.5,color:C.t2});TL(nowp,'n2','16:20',42,0,26,{size:11,mono:true,color:C.accent});
rowLabel(216,'状态指示（唯一状态编码）');
const st1=F(COM,'st-run',140,204,110,26,{fill:null});SVG(st1,'sp','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.4" fill="none" stroke="'+C.b2+'" stroke-width="1.4"/><path d="M6 1.6 A4.4 4.4 0 0 1 10.4 6" fill="none" stroke="'+C.success+'" stroke-width="1.4" stroke-linecap="round"/></svg>',0,7);TL(st1,'l1','运行中',20,0,26,{size:10.5,color:C.t2});
const st2=F(COM,'st-idle',260,204,110,26,{fill:null});E(st2,'d',3,10,7,7,'none',{border:C.t3,borderWeight:1.4});TL(st2,'l2','空闲',20,0,26,{size:10.5,color:C.t3});
const st3=F(COM,'st-prov',380,204,110,26,{fill:null});E(st3,'r',1,8,13,13,'none',{border:C.warn,borderOpacity:0.35,borderWeight:1});E(st3,'d',4,11,7,7,C.warn);TL(st3,'l3','启动中',20,0,26,{size:10.5,color:C.t2});
rowLabel(268,'任务条：已完成 / 进行中');
function taskRow(name,x,y,w,state){
 const b=F(COM,name,x,y,w,22,{fill:C.bg2,radius:5,clip:true,stroke:C.b2});
 R(b,'stripe',0,0,3,22,L[0],{rTL:5,rBL:5});
 TL(b,'l','设计面板布局',9,0,22,{size:11,color:C.t1,fontStyle:'Medium'});
 if(state==='done')SVG(b,'s',SYM.check(C.t3),w-13,7);
 if(state==='live'){E(b,'s',w-13,8.5,5,5,C.accent);for(let yy=2;yy<20;yy+=4)R(b,'d',w-2,yy,1.5,2.2,L[0]);}
 return b;
}
taskRow('task-done',140,262,180,'done');
taskRow('task-live',140,292,180,'live');
rowLabel(336,'任务条：选中 / 极窄');
const sel=F(COM,'task-sel',140,330,180,22,{fill:C.bg2,radius:5,clip:true,stroke:C.accent});
R(sel,'stripe',0,0,3,22,L[0],{rTL:5,rBL:5});TL(sel,'l','设计面板布局',9,0,22,{size:11,color:C.t1,fontStyle:'Medium'});SVG(sel,'s',SYM.check(C.t3),167,7);
const narrow=F(COM,'task-narrow',140,360,44,22,{fill:C.bg2,radius:5,clip:true,stroke:C.b2});R(narrow,'stripe',0,0,3,22,L[0],{rTL:5,rBL:5});TL(narrow,'l','…',9,0,22,{size:11,color:C.t2});
rowLabel(412,'消息标记');
SVG(COM,'arrow-out','<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.bg1+'" stroke-width="4.2" stroke-linecap="round"/><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+L[1]+'" stroke-width="2" stroke-linecap="round"/></svg>',140,400);
SVG(COM,'arrow-in','<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(180 6.5 6.5)"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+C.bg1+'" stroke-width="4.2" stroke-linecap="round"/><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+L[2]+'" stroke-width="2" stroke-linecap="round"/></g></svg>',176,400);
SVG(COM,'q','<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="6.6" fill="none" stroke="#EC1313" stroke-width="1"/><path d="M7 3.2 V8.2" stroke="#EC1313" stroke-width="1.6" stroke-linecap="round"/><circle cx="7" cy="10.4" r="0.9" fill="#EC1313"/></svg>',212,399);
TL(COM,'ml1','发出（对端色）',236,398,16,{size:9.5,color:C.t3});
rowLabel(452,'泳道头整行');
const head=F(COM,'head-demo',140,446,136,80,{fill:C.bg1});
R(head,'sep',0,0,136,1,C.b1);
const pill=F(head,'pill',12,10,62,20,{fill:L[0],radius:4});TL(pill,'pt','Lead',7,0,20,{size:11,color:'#FFFFFF',fontStyle:'Medium'});
SVG(head,'spin','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.4" fill="none" stroke="'+C.b2+'" stroke-width="1.4"/><path d="M6 1.6 A4.4 4.4 0 0 1 10.4 6" fill="none" stroke="'+C.success+'" stroke-width="1.4" stroke-linecap="round"/></svg>',112,14);
TL(head,'counts','2 任务 · 3 消息',12,36,14,{size:10.5,color:C.t3});
TL(head,'act','运行中',12,54,14,{size:10.5,color:C.t2});
rowLabel(542,'空态主按钮');
const eb=F(COM,'empty-btn',140,536,72,28,{fill:null,radius:6,stroke:C.b2});TL(eb,'t','刷新',0,0,28,{size:11,color:C.t2});eb.children[0].x=(72-eb.children[0].width)/2;
TL(COM,'rule-1','规则：状态 = 语义色 + 形状 + 文字；身份 = 泳道色 + 位置；两者不共用同一通道。',0,596,18,{size:10.5,color:C.t3});
TL(COM,'rule-2','规则：任务条长度只由时间决定；标签只在条内，宽度不足时截断为「…」，不改变条长。',0,618,18,{size:10.5,color:C.t3});
TL(COM,'rule-3','规则：控件最小 26px 高、命中区 ≥ 24×24；所有可交互元素有 hover / focus-visible 两态。',0,640,18,{size:10.5,color:C.t3});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
