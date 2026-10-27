// dsh-task-gantt · Figma build step 78/90
// turn 4 · step 10 · callId call_00_c12fbgxswtriw098omei5quc
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg2:'#2C2C2E',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',b3:'#434345',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',success:'#22C55E',error:'#F25A5A'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];if(o.shadow)n.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.45},offset:{x:0,y:-4},radius:16,spread:0,visible:true,blendMode:'NORMAL'}];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(Math.max(w,0.01),Math.max(h,0.01));if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.textAlignHorizontal=o.align||'LEFT';n.x=x;n.y=y;parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
function estW(str,size){let w=0;for(const ch of str){const c=ch.codePointAt(0);if(c>0x2e80)w+=size;else if(ch===' ')w+=size*0.3;else w+=size*0.56;}return w;}
function lines(str,size,width){return Math.max(1,Math.ceil(estW(str,size)/width));}
const SYM={close:(c)=>`<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
 check:(c)=>`<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><path d="M1.4 4.6 L3.6 6.8 L7.6 2.2" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 alert:(c)=>`<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M6 1.4 L11.3 10.6 H0.7 Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 4.6 V7.2" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r="0.6" fill="${c}"/></svg>`};
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const DOC=byName(p5,'page 05 doc')[0];
DOC.resize(1560,1860);
for(const c of [...DOC.children]){ const n=String(c.name); if(/^(q-multi-answered|q-multi-waiting|q-failed|cap-d1|cap-d2|cap-d3)$/.test(n)) c.remove(); }
for(const n of ['q-multi-answered','q-multi-waiting','q-failed']) for(const x of byName(DOC,n)) {try{x.remove();}catch(e){}}
function head(d,when,count,state){
 const map={answered:{c:C.success,t:'已回答'},waiting:{c:C.accent,t:'等待回复'},failed:{c:C.error,t:'提问失败'}};
 const s=map[state];
 R(d,'handle',222,9,36,4,C.b3,{radius:2});
 TL(d,'title','向人类提问',16,22,{size:13,color:C.t1,fontStyle:'Semibold'});
 const sx=16+estW('向人类提问',13)+12;
 E(d,'st-dot',sx,29,6,6,s.c);
 TL(d,'st-t',s.t,sx+10,22,{size:10.5,color:state==='failed'?C.error:C.t2});
 const cb=F(d,'close',440,22,24,24,{fill:null,radius:5});SVG(cb,'x',SYM.close(C.t3),7,7);
 TL(d,'when',when+' · '+count+' 个问题',16,50,{size:9.5,mono:true,color:C.t3});
 const src=TL(d,'src','来自 ui',0,50,{size:9.5,color:C.t3}); src.x=464-src.width;
 R(d,'hr',16,70,448,1,C.b1);
}
function qblock(d,y,idx,header,prompt,answers,custom,divider){
 if(divider){R(d,'div-'+idx,16,y-15,448,1,C.b2,{opacity:0.8});}
 TL(d,'qno-'+idx,'Q'+idx,16,y,{size:9.5,mono:true,color:C.t3});
 TL(d,'qh-'+idx,header,40,y,{size:10.5,color:C.t2});
 const pl=lines(prompt,12,448);
 TT(d,'qp-'+idx,prompt,16,y+18,448,{size:12,lh:19,color:C.t1});
 let yy=y+18+pl*19+8;
 if(answers&&answers.length){
  TL(d,'ak-'+idx,'答案',16,yy+2,{size:10,color:C.t3});
  answers.forEach((v,i)=>{
   SVG(d,'ck-'+idx+'-'+i,SYM.check(C.success),52,yy+4);
   TL(d,'av-'+idx+'-'+i,v,66,yy,{size:11,color:C.t1});
   yy+=18;
  });
  yy-=2;
 } else if(custom){
  TL(d,'ck-'+idx,'自由输入',16,yy+2,{size:10,color:C.t3});
  const cl=lines(custom,11,382);
  TT(d,'cv-'+idx,custom,66,yy,382,{size:11,lh:17,color:C.t2});
  yy+=cl*17;
 }
 return yy+26;
}
const D1=F(DOC,'q-multi-answered',0,1284,480,392,{fill:C.bg2,radius:10,clip:true,shadow:true});
head(D1,'16:12:10','3','answered');
let y=86;
y=qblock(D1,y,1,'工具栏','工具栏在 480px 下溢出，右侧「任务数 / 刷新」被裁，怎么处理？',['图标化 + 删总任务数'],null,false);
y=qblock(D1,y,2,'任务详情','任务详情继续用底部面板，还是改成抽屉？',['底部抽屉（覆盖）','不压缩图区'],null,true);
y=qblock(D1,y,3,'时间语义','「认领时间」放在条内还是条下？',[],'条下，别压字',true);
TL(D1,'foot','提问来自会话日志 · 只读 · 多选时答案可能有多个',16,366,{size:9,color:C.dim});
const D2=F(DOC,'q-multi-waiting',520,1284,480,270,{fill:C.bg2,radius:10,clip:true,shadow:true});
head(D2,'16:19:40','2','waiting');
y=86;
y=qblock(D2,y,1,'下一步','先在工具栏、详情抽屉、泳道头之间选一个先改，选哪个？',null,null,false);
y=qblock(D2,y,2,'验收','改完之后需要我在真机面板上复验哪些状态？',null,null,true);
E(D2,'wait-dot',16,238,5,5,C.accent);
TL(D2,'wait-note','等待回复 · 图中问号持续脉冲；还没有答案，所以不列选项',28,230,{size:10,color:C.t3});
const D3=F(DOC,'q-failed',520,1590,480,206,{fill:C.bg2,radius:10,clip:true,shadow:true});
head(D3,'16:21:05','1','failed');
TL(D3,'fh','调用被拒绝，问题没有到达人类',16,90,{size:11.5,color:C.t1});
const eb=F(D3,'err',16,116,448,52,{fill:null,radius:6,stroke:C.b1});eb.fills=[solid(C.bg3,0.35)];
R(eb,'bar',0,0,3,52,C.error,{rTL:3,rBL:3});
SVG(eb,'al',SYM.alert(C.error),14,20);
TL(eb,'code','UserQuestionError/DELEGATED_CALLER',32,9,{size:9.5,mono:true,color:C.error});
TL(eb,'text','delegated caller cannot ask the human',32,27,{size:9,mono:true,color:C.t3});
TL(D3,'fn','失败时不显示空选项，也不假装「没人回答」',16,182,{size:9.5,color:C.t3});
TL(DOC,'cap-d1','D1 · 已回答：3 个问题逐题「问题 + 答案」；Q2 多选两个，Q3 是自由输入的真实结果。',0,1686,{size:10,color:C.t3});
TL(DOC,'cap-d2','D2 · 等待回复：只有问题，没有选项也没有答案。',520,1564,{size:10,color:C.t3});
TL(DOC,'cap-d3','D3 · 提问失败：错误码 + 原因，不把问题当答案展示。',520,1806,{size:10,color:C.t3});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
