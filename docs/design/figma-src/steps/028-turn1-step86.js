// dsh-task-gantt · Figma build step 28/90
// turn 1 · step 86 · callId call_00_z6ab8gis2ifveljcy14rnslq
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C'};
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
const SYM={
 funnel:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M1.6 2.4 H10.4 L6.8 6.6 V10.4 L5.2 9.2 V6.6 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
 check:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4.2 L3.1 6.1 L6.8 1.9" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 arrow:(c,rot)=>`<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g${rot?' transform="rotate(180 6.5 6.5)"':''}><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="#232324" stroke-width="4.2" stroke-linecap="round"/><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></g></svg>`,
 question:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5.4" fill="none" stroke="${c}" stroke-width="4" opacity="0.9" stroke-opacity="0"/><path d="M4.2 4.1 C4.3 3.1 5 2.5 5.9 2.5 C6.9 2.5 7.5 3.1 7.5 3.9 C7.5 5.1 5.9 5.2 5.9 6.5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><circle cx="5.9" cy="8.8" r="0.9" fill="${c}"/></svg>`
};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const page=figma.root.children.find(p=>p.name.startsWith('05'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const DOC=F(page,'page 05 doc',0,0,1600,1000,{fill:C.doc});
TL(DOC,'pt','05 · 设计规范',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(DOC,'ps','令牌、字号、尺寸与组件状态：所有值都能落到 DSH 的 --dsw-* 令牌上，亮暗双皮肤共用同一套结构',0,38,18,{size:12,color:C.t3});
/* --- palette --- */
const PAL=F(DOC,'palette',0,110,460,700,{fill:null});
TL(PAL,'h','颜色令牌',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
TL(PAL,'s','暗色取自宿主别名真实解析值；亮色为同别名在白底上的值',0,22,16,{size:10,color:C.t3});
const tokens=[['bg-layer-1','#232324','#FFFFFF','面板底'],['bg-layer-2','#2C2C2E','#F5F6F8','卡片 / 浮层'],['border-l1','#2E2E2F','#F0F1F2','分隔线'],['border-l2','#3A3A3C','#E6E6E6','控件描边'],['label-primary','#F9FAFB','#0F1115','正文'],['label-secondary','#CFD3D6','#61666B','次要文本'],['label-tertiary','#ADB2B8','#81858C','辅助文本'],['state-business','#7AAAFF','#4176E6','强调 / NOW'],['state-success','#22C55E','#16A34A','运行中'],['state-warn','#F59E0B','#D97706','启动 / 等待'],['state-error','#F25A5A','#DC2626','失败']];
tokens.forEach(([n,d,l,role],i)=>{
 const y=50+i*30;
 TL(PAL,'tn-'+i,n,0,y,20,{size:10,color:C.t2,mono:true});
 R(PAL,'sw1-'+i,128,y,18,18,d,{radius:4,border:C.b3});
 R(PAL,'sw2-'+i,152,y,18,18,l,{radius:4,border:C.b2});
 TL(PAL,'tv-'+i,d.toUpperCase(),178,y,20,{size:9.5,color:C.t3,mono:true});
 TL(PAL,'tv2-'+i,l.toUpperCase(),268,y,20,{size:9.5,color:C.t3,mono:true});
 TL(PAL,'tr-'+i,role,352,y,20,{size:10,color:C.t3});
});
TL(PAL,'lh','泳道身份色 · 取宿 16 色 roster 前 6',0,404,18,{size:10.5,color:C.t2});
const L=['#2563EB','#A3294F','#558130','#786BA5','#765C19','#9D5C91'];
L.forEach((c,i)=>{const x=i*72;R(PAL,'lane-'+i,x,428,56,26,c,{radius:5});TL(PAL,'ln-'+i,String(i),x,458,12,{size:9,color:C.t3,mono:true});});
TL(PAL,'lnote','身份色只出现在泳道名药丸、任务条左 3px、消息箭头的对端色；状态永远用语义色 + 形状。',0,486,16,{size:10,color:C.t3});
TL(PAL,'dh','尺寸',0,522,18,{size:12,color:C.t1,fontStyle:'Medium'});
const dims=[['面板宽',480],['工具栏',40],['时间轴',26],['泳道高',80],['泳道头宽',136],['任务条高',22],['控件高',26],['命中区下限',24]];
dims.forEach(([k,v],i)=>{const y=548+i*20;TL(PAL,'dk-'+i,k,0,y,16,{size:10,color:C.t3});TL(PAL,'dv-'+i,String(v)+' px',140,y,16,{size:10,color:C.t2,mono:true});});
/* --- type + spacing --- */
const TYPE=F(DOC,'type',500,110,460,420,{fill:null});
TL(TYPE,'h','字号与行高',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
const type=[['13 / 20','Semibold','抽屉标题、空态标题'],['12 / 18','Medium','区块标题、浮窗标题'],['11 / 16','Medium','任务条标签、泳道名'],['11 / 16','Regular','正文、简介、说明'],['10.5 / 14','Regular','计数、活动词、meta'],['10 / 14','Mono','时间刻度、时间值'],['9 / 12','Mono','构建号、徽标数字']];
type.forEach(([s,w,u],i)=>{const y=30+i*42;TL(TYPE,'ts-'+i,s,0,y,18,{size:10,color:C.accent,mono:true});TL(TYPE,'tw-'+i,w,72,y,18,{size:10,color:C.t3,mono:true});TL(TYPE,'tu-'+i,u,146,y,18,{size:10,color:C.t3});R(TYPE,'tl-'+i,0,y+28,460,1,C.b1);});
TL(TYPE,'gh','间距刻度',0,344,18,{size:12,color:C.t1,fontStyle:'Medium'});
[4,6,8,12,16].forEach((s,i)=>{const x=i*84;R(TYPE,'sp-'+i,x,372,s,20,C.accent,{opacity:0.55,radius:2});TL(TYPE,'sn-'+i,String(s),x,396,14,{size:9.5,color:C.t3,mono:true});});
TL(TYPE,'rh','圆角',0,438,18,{size:12,color:C.t1,fontStyle:'Medium'});
[3,4,5,6,8,10].forEach((r,i)=>{const x=i*72;R(TYPE,'rd-'+i,x,466,42,30,C.bg2,{radius:r,border:C.b2});TL(TYPE,'rn-'+i,String(r),x,500,14,{size:9.5,color:C.t3,mono:true});});
TL(TYPE,'note','字重只用 Regular / Medium / Semibold；时间与数字统一等宽字体，保证列对齐。',0,540,18,{size:10,color:C.t3});
/* --- components grid --- */
const COM=F(DOC,'components',1000,110,580,860,{fill:null});
TL(COM,'h','组件状态',0,0,20,{size:12,color:C.t1,fontStyle:'Medium'});
function cell(col,row,label){
 const x=col*296,y=30+row*116;
 const f=F(COM,'cell-'+col+'-'+row,x,y,280,100,{fill:C.bg1,radius:8,clip:true,stroke:C.b1});
 TL(f,'label',label,12,10,14,{size:9.5,color:C.t3});
 R(f,'div',12,30,256,1,C.b1,{opacity:0.6});
 return f;
}
let k=cell(0,0,'ghost 按钮');
const gb=F(k,'btn',12,44,84,26,{fill:null,radius:6,stroke:C.b2});TL(gb,'t','全部时段',10,0,26,{size:11,color:C.t2});
let c1=cell(1,0,'图标按钮 + 徽标');
const ib=F(c1,'ib',12,44,26,26,{fill:null,radius:6});SVG(ib,'i',SYM.funnel(C.t2),7,7);E(ib,'b',17,-1,13,13,C.accent);TL(ib,'bt','2',17,-1,13,{size:8.5,mono:true,color:'#0F1115'});
let c2=cell(0,1,'开关 on / off');
const sw1=F(c2,'on',12,46,26,14,{fill:C.accent,radius:7});E(sw1,'k',13,2,10,10,'#FFFFFF');
const sw2=F(c2,'off',48,46,26,14,{fill:C.b3,radius:7});E(sw2,'k',3,2,10,10,C.t3);
const c3=cell(1,1,'NOW 胶囊');
const np=F(c3,'now',12,44,88,26,{fill:null,radius:6,stroke:C.accent,strokeOpacity:0.45});np.fills=[solid(C.accent,0.14)];TL(np,'a','现在',8,0,26,{size:10.5,color:C.t2});TL(np,'b','16:20',42,0,26,{size:11,mono:true,color:C.accent});
const c4=cell(0,2,'状态指示：运行 / 空闲 / 启动');
const sr=F(c4,'run',12,46,84,24,{fill:null});SVG(sr,'sp','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.4" fill="none" stroke="'+C.b2+'" stroke-width="1.4"/><path d="M6 1.6 A4.4 4.4 0 0 1 10.4 6" fill="none" stroke="'+C.success+'" stroke-width="1.4" stroke-linecap="round"/></svg>',0,6);TL(sr,'l','运行中',18,0,24,{size:10.5,color:C.t2});
const si=F(c4,'idle',100,46,70,24,{fill:null});E(si,'d',3,9,6,6,'none',{border:C.t3,borderWeight:1.4});TL(si,'l','空闲',16,0,24,{size:10.5,color:C.t3});
const sp=F(c4,'prov',180,46,86,24,{fill:null});E(sp,'r',1,7,13,13,'none',{border:C.warn,borderOpacity:0.35,borderWeight:1});E(sp,'d',4,10,7,7,C.warn);TL(sp,'l','启动中',18,0,24,{size:10.5,color:C.t2});
const c5=cell(1,2,'任务条：已完成 / 进行中');
function taskCell(par,y,w,st){
 const b=F(par,'task-'+y,12,y,w,22,{fill:C.bg2,radius:5,clip:true,stroke:C.b2});
 R(b,'s',0,0,3,22,L[0],{rTL:5,rBL:5});
 TL(b,'l','设计面板布局',9,0,22,{size:11,color:C.t1,fontStyle:'Medium'});
 if(st==='done')SVG(b,'g',SYM.check(C.t3),w-13,7);
 else {E(b,'g',w-13,8.5,5,5,C.accent);for(let yy=2;yy<20;yy+=4)R(b,'d',w-2,yy,1.5,2.2,L[0]);}
}
taskCell(c5,44,236,'done');taskCell(c5,72,236,'live');
const c6=cell(0,3,'任务条：选中 / 极窄');
function taskSel(par,y,w){
 const b=F(par,'t-'+y,12,y,w,22,{fill:C.bg2,radius:5,clip:true,stroke:C.accent});
 R(b,'s',0,0,3,22,L[0],{rTL:5,rBL:5});TL(b,'l','设计面板布局',9,0,22,{size:11,color:C.t1,fontStyle:'Medium'});SVG(b,'g',SYM.check(C.t3),w-13,7);
}
taskSel(c6,44,180);
const nar=F(c6,'narrow',12,72,44,22,{fill:C.bg2,radius:5,clip:true,stroke:C.b2});R(nar,'s',0,0,3,22,L[0],{rTL:5,rBL:5});TL(nar,'l','…',9,0,22,{size:11,color:C.t2});
const c7=cell(1,3,'消息：发出 / 收到 / 提问');
SVG(c7,'a1',SYM.arrow(L[1]),12,48);TL(c7,'al1','发出',34,42,20,{size:9.5,color:C.t3});
SVG(c7,'a2',SYM.arrow(L[2],true),86,48);TL(c7,'al2','收到',108,42,20,{size:9.5,color:C.t3});
SVG(c7,'q',SYM.question('#EC1313'),160,48);TL(c7,'ql','提问',182,42,20,{size:9.5,color:C.t3});
const c8=cell(0,4,'泳道头整行');
const hd=F(c8,'head',12,40,136,52,{fill:null});R(hd,'sep',0,0,136,1,C.b1);
const pl=F(hd,'pill',0,4,62,20,{fill:L[0],radius:4});TL(pl,'t','Lead',7,0,20,{size:11,color:'#FFFFFF',fontStyle:'Medium'});
SVG(hd,'sp','<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="4.4" fill="none" stroke="'+C.b2+'" stroke-width="1.4"/><path d="M6 1.6 A4.4 4.4 0 0 1 10.4 6" fill="none" stroke="'+C.success+'" stroke-width="1.4" stroke-linecap="round"/></svg>',108,8);
TL(hd,'c','2 任务 · 3 消息',0,30,14,{size:10.5,color:C.t3});
TL(hd,'a','运行中',0,44,14,{size:10.5,color:C.t2});
const c9=cell(1,4,'空态 / 错误态主按钮');
const eb=F(c9,'eb',12,44,76,28,{fill:null,radius:6,stroke:C.b2});TL(eb,'t','刷新',0,0,28,{size:11,color:C.t2});eb.children[0].x=(76-eb.children[0].width)/2;
const eb2=F(c9,'eb2',100,44,76,28,{fill:null,radius:6,stroke:C.b2});TL(eb2,'t','重试',0,0,28,{size:11,color:C.t1});eb2.children[0].x=(76-eb2.children[0].width)/2;
const c10=cell(0,5,'焦点环');
const fr=F(c10,'ring',12,44,120,26,{fill:null,radius:6,stroke:C.b2});stroke(fr,C.accent,2);TL(fr,'t','focus-visible',10,0,26,{size:10,color:C.t2,mono:true});
const c11=cell(1,5,'等待带 / 开放端');
const wband=F(c11,'wb',12,48,140,10,{fill:null,clip:true});R(wband,'bg',0,0,140,10,C.t2,{opacity:0.28});
for(let hx=-12;hx<152;hx+=3.5){const st=R(wband,'h',hx,0,1.4,16,C.bg1,{opacity:0.92});st.rotation=45;}
R(wband,'c1',0,-1,2,12,C.t2);R(wband,'c2',138,-1,2,12,C.t2);
R(c11,'open',170,46,1.5,12,C.accent);TL(c11,'ol','开放端',180,42,20,{size:9.5,color:C.t3});
TL(COM,'rules','规则 · 状态 = 语义色 + 形状 + 文字；身份 = 泳道色 + 位置；两条通道不复用。\n规则 · 任务条长度只由时间决定，标签只在条内截断，不改变条长。\n规则 · 控件 ≥ 26px 高、命中区 ≥ 24×24，hover 与 focus-visible 两态齐全。',0,742,360,{size:10,color:C.t3,mono:false});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
