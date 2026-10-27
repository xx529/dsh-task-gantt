// dsh-task-gantt · Figma build step 16/90
// turn 1 · step 64 · callId call_00_m1y6t0ij7u993c4nnob5e0m3
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',b1:'#2E2E2F',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',business:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',ink:'#0F1115'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'})]);
const page=figma.root.children.find(p=>p.name.startsWith('02'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const PAGE=F(page,'page 02 doc',0,0,1440,1010,{fill:C.doc});
TL(PAGE,'pt','02 · 问题走查',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(PAGE,'ps','24 条问题（P0 6 / P1 9 / P2 9）· 覆盖 5 个区域 A—E · 每条标注区域代号',0,38,18,{size:12,color:C.t3});
const src=find(figma.root.children.find(p=>p.name.startsWith('01')),'01 · 现状面板 480×580');
const wrap=F(PAGE,'panel+zone',0,110,481,581,{fill:C.bg1,clip:false,stroke:C.b2});
const clone=src.clone(); wrap.appendChild(clone); clone.x=0; clone.y=0; clone.name='as-is clone';
const zones=[
 ['A','工具栏',0,0,480,30],
 ['B','时间轴',132,30,348,28],
 ['C','泳道头',0,30,132,388],
 ['D','图区',132,58,348,360],
 ['E','页脚',0,492,480,88]
];
zones.forEach(([id,label,x,y,w,h])=>{
 const z=R(wrap,'zone-'+id,x,y,w,h,C.business,{opacity:0.05,border:C.business,borderOpacity:0.55});
 const tag=F(wrap,'zone-tag-'+id,x+4,y+4,id==='C'?46:18,16,{fill:C.business,radius:3});
 TL(tag,'zt-'+id,id,3,-2,16,{size:10,mono:true,color:C.ink});
 TL(wrap,'zone-label-'+id,label,x+(id==='C'?22:22),y+4,16,{size:9,color:C.business});
});
TL(PAGE,'zone-note','A 工具栏 · B 时间轴 · C 泳道头 · D 图区（轨道 + 任务卡 + 等着色）· E 页脚（缩放 / 图例 / 构建号）',0,708,16,{size:10.5,color:C.dim});
const cols=[
 {k:'P0',zh:'可用性 / 可读性硬伤',color:C.error,items:[
  ['A',1,'工具栏在 480px 必溢出','固定宽合计约 490px：「9 任务」被裁、刷新按钮完全不可见；滚动条被 scrollbar-width:none 隐藏。'],
  ['—',2,'加载 / 错误态永不可达','BoardView.tsx:499 的 return null 早于加载分支 → 首屏空白，失败也没有重试入口。'],
  ['D',3,'正文级文字只有 11px','任务名/状态/图例全部 11px 起，深色 tertiary 实测 3.71:1；窄条只剩「…」。'],
  ['D',4,'事件字形变成碎屑','任务卡下再画 ＋/▶/✓ 三类字形，需要图例才能解释，密集处与任务条互相挤压。'],
  ['E',5,'详情面板挤压图区','任务详情 45% + 消息详情 60% 可同时开，图区可被压到 0；选中不滚动、不弱化其他任务。'],
  ['E',6,'图例反客为主','11 个图例项 + 构建标识占底部约 15%；图比图例更难读 = 编码不自明。']
 ]},
 {k:'P1',zh:'层级 / 视觉噪声',color:C.warn,items:[
  ['C',7,'泳道头信息过载','色底药丸 + 状态点 + 字形/转圈 + 计数 + 活动词，四套编码挤在 132×72 的一格。'],
  ['C',8,'颜色语义冲突','红/绿/橙既是 agent 身份色，又是失败/成功/警告色；身份与状态在同一通道打架。'],
  ['A',9,'次要控件抢最高亮','「现在」「跟随时间线」用 brand 描边；深色皮肤 brand≈#F9FAFB，两圈白框成最亮元素。'],
  ['A',10,'开关语义不成立','「跟随时间线 ●」是文字+圆点的按钮；「现在」看起来可点击，实际只是状态 chip。'],
  ['B',11,'轴与 NOW 打架','白底 NOW 标签遮住 16:20 刻度并贴死右边缘；刻度无主次，网格与轴同权重。'],
  ['D',12,'收发箭头难辨','11px 箭头靠实心/空心+对端色区分方向；最小间距 9px，密集时糊成一片。'],
  ['E',13,'缩放藏在底部','缩放控件与顶部工具栏分离；Ctrl/⌘+滚轮、Shift+横向无常驻提示；内部单位外露。'],
  ['E',14,'降级态没有位置','加载/空/错误只有一行居中文本；错误提示落在面板底部，离触发点很远。'],
  ['D',15,'点击热区=绘制宽度','任务条可细到 1px，9px 标记同样难命中；同一张图的消息标记却做了 5px 外扩。']
 ]},
 {k:'P2',zh:'细节与一致',color:C.t3,items:[
  ['A',16,'筛选按钮在溢出区','触发按钮本身可能被裁掉；菜单用 fixed + 视口夹取，历史修过三次。'],
  ['—',17,'圆角与间距无刻度','3/4/5/6/9px 圆角混用，1px 边框 6%/12% 透明度混用，节奏不成体系。'],
  ['A',18,'计数重复','工具栏「9 任务」与每行泳道计数重复，筛选后总数也不跟着变。'],
  ['D',19,'卡片内边距不对称','左 8px + 3px 色边、右 6px，文字视觉中心整体左偏。'],
  ['C',20,'空闲泳道整体降透明','.72 opacity 把计数与活动词一起变灰，深色底对比不足 3:1。'],
  ['D',21,'等待带与活动条同轨','斜纹带靠纹理+透明度区分，缩放后只剩一块灰；亮色皮肤仅 1.68:1。'],
  ['B',22,'冻结态只有一条虚线','没有「已结束」的明确位置与原因，图例里也只多一项「结束」。'],
  ['E',23,'术语未翻译','中文界面出现「turn 区间 / step 区间」等内部术语，用户不知道两者差别。'],
  ['E',24,'构建号常驻','v0.2.38 常驻面板底部，对用户无意义；应移入「关于/帮助」。']
 ]}
];
cols.forEach((col,ci)=>{
 const bx=540+ci*318;
 TL(PAGE,'col-k-'+ci,col.k,bx,110,18,{size:11,mono:true,color:col.color});
 TL(PAGE,'col-t-'+ci,col.zh,bx+36,110,18,{size:11,color:C.t3});
 let yy=142;
 col.items.forEach(([zone,num,title,body],ii)=>{
  TL(PAGE,'iss-num-'+num,String(num).padStart(2,'0'),bx,yy,16,{size:10,mono:true,color:col.color});
  TL(PAGE,'iss-zone-'+num,zone,bx+26,yy,16,{size:9,mono:true,color:C.dim});
  TL(PAGE,'iss-title-'+num,title,bx+40,yy,16,{size:11.5,color:C.t1,fontStyle:'Medium'});
  const b=TT(PAGE,'iss-body-'+num,body,bx+40,yy+18,242,{size:10.5,lh:15,color:C.t3});
  const hh=Math.max(50,b.height+24);
  if(ii<col.items.length-1)R(PAGE,'iss-rule-'+num,bx,yy+hh-8,282,1,C.b1);
  yy+=hh;
 });
});
TL(PAGE,'sum','结论：问题不是「样式不好看」，而是信息层级、编码通道与控件可达性同时失守。改版顺序：① 信息结构 → ② 编码收敛 → ③ 视觉打磨。',0,760,1230,{size:12,color:C.t2});
figma.viewport.scrollAndZoomIntoView([PAGE]);
return {ok:true,page:page.name};
