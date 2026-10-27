// dsh-task-gantt · Figma build step 14/90
// turn 1 · step 58 · callId call_00_r5z4b1ld349c12hbx4d4umga
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',b1:'#2E2E2F',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',business:'#7AAAFF',success:'#22C55E',warn:'#F59E0B',error:'#F25A5A',doc:'#1B1B1C',ink:'#0F1115'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function F(parent,name,x,y,w,h,o){o=o||{};const n=figma.createFrame();n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=o.fill===null?[]:[solid(o.fill||C.bg1)];if(o.radius!==undefined)n.cornerRadius=o.radius;n.clipsContent=o.clip!==false;if(o.stroke)stroke(n,o.stroke,1,o.strokeOpacity);else n.strokes=[];parent.appendChild(n);return n;}
function R(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createRectangle();n.name=name;n.x=x;n.y=y;n.resize(w,h);if(color==='none')n.fills=[];else fill(n,color,o.opacity);if(o.radius!==undefined)n.cornerRadius=o.radius;if(o.border)stroke(n,o.border,o.borderWeight||1);parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color,o){o=o||{};const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);fill(n,color,o.opacity);if(o.border)stroke(n,o.border,o.borderWeight||1,o.borderOpacity);parent.appendChild(n);return n;}
function FONT(o){o=o||{};if(o.mono)return{family:'JetBrains Mono',style:o.fontStyle||'Regular'};if(o.latin)return{family:'SF Pro',style:o.fontStyle||'Regular'};return{family:'PingFang SC',style:o.fontStyle||'Regular'};}
function TL(parent,name,str,x,top,boxH,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;if(o.lh!==undefined)n.lineHeight={unit:'PIXELS',value:o.lh};if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top+(boxH-n.height)/2;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=FONT(o);n.characters=str;n.fontSize=o.size||11;n.lineHeight={unit:'PIXELS',value:o.lh||16};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'PingFang SC',style:'Semibold'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'}),figma.loadFontAsync({family:'SF Pro',style:'Medium'})]);
const page=figma.root.children.find(p=>p.name.startsWith('02'));
await figma.setCurrentPageAsync(page);
for(const c of [...page.children]) c.remove();
const PAGE=F(page,'page 02 doc',0,0,1440,1000,{fill:C.doc});
TL(PAGE,'pt','02 · 问题走查',0,0,34,{size:24,color:C.t1,fontStyle:'Semibold'});
TL(PAGE,'ps','24 条 · P0 5 / P1 8 / P2 11 · 编号①—⑬ 对应左侧现状面板上的圆点',0,38,18,{size:12,color:C.t3});
/* panel clone */
const src=figma.root.children.find(p=>p.name.startsWith('01')).children.find(n=>n.name==='01 · 现状面板 480×580');
const wrap=F(PAGE,'panel+ins',0,110,481,581,{fill:C.bg1,clip:false,stroke:C.b2});
const clone=src.clone(); wrap.appendChild(clone); clone.x=0; clone.y=0; clone.name='as-is clone';
const pins=[[1,455,15],[8,290,15],[9,131,15],[14,398,15],[10,452,43],[6,64,80],[11,250,60],[7,42,190],[2,250,92],[3,330,106],[5,240,455],[12,60,500],[4,432,530],[13,240,570]];
pins.forEach(([n,x,y])=>{
 const c=E(wrap,'pin-'+n,x-10,y-10,20,20,C.business);
 TL(wrap,'pin-t-'+n,String(n),x-10,y-10,20,{size:10,mono:true,color:C.ink,align:'LEFT'});
 const t=wrap.children[wrap.children.length-1];
 t.x=x-t.width/2; t.y=y-t.height/2;
});
TL(PAGE,'pin-note','① — ⑭ = 面板上的问题定位点；编号与右侧清单一致',0,706,18,{size:10.5,color:C.dim});
/* issue columns */
const cols=[
 {x:540,k:'P0',zh:'可用性 / 可读性硬伤',color:C.error,items:[
  [1,'工具栏在 480px 溢出','固定宽合计约 518px：「9 任务」被裁、刷新按钮完全不可见，横向滚动条被隐藏（scrollbar-width:none）。'],
  [2,'正文级文字只有 11px','任务名 / 状态 / 图例全部 11px 起，10px 字形更小；窄条只剩「…」——标题是这里最重要的信息。'],
  [3,'事件字形变成碎屑','每张任务卡下另画 ＋ / ▶ / ✓ 三类字形，需要图例才能解释，且在密集处与任务条、图例互相挤压。'],
  [4,'图例反客为主','11 个图例项 + 构建标识占据底部约 15% 高度；图比图例更难读，说明编码不自明。'],
  [5,'详情面板与图脱节','选中任务从底部弹出占 45%，不把条目滚进视野、不弱化其他任务；选中态只有 2px 描边。']
 ]},
 {x:858,k:'P1',zh:'层级 / 视觉噪声',color:C.warn,items:[
  [6,'泳道头信息过载','色底药丸 + 状态点 + 字形/转圈 + 计数 + 活动词，四套编码挤在 132px 宽、72px 高的一格里。'],
  [7,'颜色语义冲突','红 / 绿 / 橙既是 agent 身份色，又是失败 / 成功 / 警告色，身份与状态在同一个通道上打架。'],
  [8,'次要控件抢最高亮','「现在」「跟随时间线」用 brand 描边；深色皮肤 brand≈#F9FAFB，两圈白框成了全屏最亮的元素。'],
  [9,'开关语义不成立','「跟随时间线 ●」是文字加圆点的按钮；「现在」看起来可点击，实际只是状态 chip。'],
  [10,'轴与 NOW 打架','白底 NOW 方标签遮住 16:20 刻度并贴死右边缘；刻度没有主次层级，网格和轴同权重。'],
  [11,'收发箭头难辨','11px 箭头靠实心/空心 + 对端泳道色区分方向；最小间距仅 9px，密集时糊成一片。'],
  [12,'缩放藏在底部','缩放控件在左下角、与顶部工具栏分离；Ctrl/⌘+滚轮、Shift+横向无常驻提示，内部单位「4 秒/像素」外露。'],
  [13,'降级态没有位置','加载 / 空 / 错误只有一行居中文本；错误提示落在面板底部，离触发操作很远。']
 ]},
 {x:1176,k:'P2',zh:'细节与一致',color:C.t3,items:[
  [14,'筛选按钮在溢出区','触发按钮本身可能被裁掉；菜单用 fixed + 视口夹取，历史修过三次，说明布局压力一直在。'],
  [15,'圆角与间距无刻度','3 / 4 / 5 / 6 / 9px 圆角混用，1px 边框 6% / 12% 透明度混用，节奏不成体系。'],
  [16,'计数重复','工具栏「9 任务」与每行泳道计数重复，且筛选后总数不跟着变，读者无法判断当前视图。'],
  [17,'卡片内边距不对称','左 8px 内边距 + 3px 色边、右 6px，文字视觉中心整体左偏。'],
  [18,'空闲泳道整体降透明','.72 opacity 把计数与活动词一起变灰，深色底上低于 3:1 对比。'],
  [19,'等待带与活动条同轨','斜纹带靠纹理 + 透明度区分，缩放到分钟级后只剩一块灰。'],
  [20,'冻结态只有一条虚线','没有「已结束」的明确位置与原因，只在图例里多一项「结束」。'],
  [21,'术语未翻译','中文界面出现「turn 区间 / step 区间」等内部术语，用户不知道两者差别。'],
  [22,'时间窗无落款','轴只显示 HH:mm，没有日期与时长范围，截图无法自证是哪一天。'],
  [23,'构建号常驻','v0.2.38 常驻面板底部，对用户无意义；应移入「关于 / 帮助」。'],
  [24,'任务状态缺形状信号','待处理 / 进行中 / 已完成只靠左色边与 hover 文案，条本身没有完成度表达。']
 ]}
];
cols.forEach((col,ci)=>{
 let y=110;
 const chipW=26;
 const chip=F(PAGE,'sev-'+col.k,330+ci*318,110,chipW,18,{fill:null,radius:4,stroke:col.color});
 TL(chip,'sev-t',col.k,0,0,18,{size:10,mono:true,color:col.color});
 TL(chip,'sev-t2',col.k,26,0,18,{size:10,mono:true,color:col.color});
 chip.children[chip.children.length-1].x=0;
 TL(PAGE,'col-title-'+ci,col.zh,362+ci*318,110,18,{size:11,color:C.t3});
 let yy=142;
 col.items.forEach(([num,title,body],ii)=>{
  TL(PAGE,'iss-num-'+num,String(num).padStart(2,'0'),540+ci*318,yy,16,{size:10,mono:true,color:col.color});
  TL(PAGE,'iss-title-'+num,title,570+ci*318,yy,16,{size:11.5,color:C.t1,fontStyle:'Medium'});
  const b=TT(PAGE,'iss-body-'+num,body,570+ci*318,yy+18,250,{size:10.5,lh:15,color:C.t3});
  const h=Math.max(48,b.height+22);
  if(ii<col.items.length-1)R(PAGE,'iss-rule-'+num,540+ci*318,yy+h-8,250,1,C.b1);
  yy+=h;
 });
});
TL(PAGE,'sum','结论：这不是「样式不好看」，而是信息层级、编码通道与控件可达性同时失守。改版顺序应为 ①信息结构 → ②编码收敛 → ③视觉打磨。',0,756,1200,{size:12,color:C.t2});
figma.viewport.scrollAndZoomIntoView([PAGE]);
return {ok:true,page:page.name};
