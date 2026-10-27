// dsh-task-gantt · Figma build step 79/90
// turn 4 · step 12 · callId call_00_26dmt1sis69qj9t5r4p695zi
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',dim:'#43454A',accent:'#7AAAFF',b1:'#2E2E2F',success:'#22C55E'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function fill(n,h,o){n.fills=[solid(h,o)];}
function TL(parent,name,str,x,top,o){o=o||{};const n=figma.createText();n.name=name;n.fontName=o.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:o.fontStyle||'Regular'};n.characters=str;n.fontSize=o.size||11;if(o.color)fill(n,o.color);n.textAutoResize='WIDTH_AND_HEIGHT';parent.appendChild(n);n.x=x;n.y=top;return n;}
function TT(parent,name,str,x,y,w,o){o=o||{};const n=figma.createText();n.name=name;n.fontName={family:'PingFang SC',style:'Regular'};n.characters=str;n.fontSize=o.size||10.5;n.lineHeight={unit:'PIXELS',value:o.lh||17};if(o.color)fill(n,o.color);n.textAutoResize='HEIGHT';n.resize(w,10);n.x=x;n.y=y;parent.appendChild(n);return n;}
function E(parent,name,x,y,w,h,color){const n=figma.createEllipse();n.name=name;n.x=x;n.y=y;n.resize(w,h);n.fills=[solid(color)];parent.appendChild(n);return n;}
function SVG(parent,name,markup,x,y){const n=figma.createNodeFromSvg(markup);n.name=name;n.x=x;n.y=y;parent.appendChild(n);return n;}
function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
function estW(str,size){let w=0;for(const ch of str){const c=ch.codePointAt(0);if(c>0x2e80)w+=size;else if(ch===' ')w+=size*0.3;else w+=size*0.56;}return w;}
function lines(str,size,width){return Math.max(1,Math.ceil(estW(str,size)/width));}
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const DOC=byName(p5,'page 05 doc')[0];
DOC.resize(1560,1930);
const d3=byName(DOC,'q-failed')[0]; if(d3){ d3.x=1040; d3.y=1284; }
for(const c of [...DOC.children]){ const n=String(c.name); if(/^(cap-d1|cap-d2|cap-d3|d-rules-t|d-arrow-t|d-arrow-note|ar-out|ar-in|ar-out-l|ar-in-l|d-rule-.*)$/.test(n)) c.remove(); }
TL(DOC,'cap-d1','D1 · 已回答：3 个问题逐题「问题 + 答案」；Q2 多选两个，Q3 是自由输入的真实结果。',0,1690,{size:10,color:C.t3});
TL(DOC,'cap-d2','D2 · 等待回复：只有问题，没有选项也没有答案。',520,1690,{size:10,color:C.t3});
TL(DOC,'cap-d3','D3 · 提问失败：错误码 + 原因，不把问题当答案展示。',1040,1690,{size:10,color:C.t3});
/* rules, 2 columns */
TL(DOC,'d-rules-t','多问题的渲染规则',0,1736,{size:11,color:C.t1,fontStyle:'Medium'});
const rules=[
 ['01','一次调用 1—4 个问题，逐题渲染，不合并、不截断。'],
 ['02','已回答：只列 selected 的 label（可多个）与 custom；未选中的选项与说明都不显示。'],
 ['03','等待中：只有问题，不列选项——还没有答案。'],
 ['04','失败：错误码 + 原因，不把问题当答案。'],
 ['05','结果不可解析：显示「结果无法解析，以下为原文」+ 原始 JSON。'],
 ['06','selected 为空且无 custom 是真实结果：写「结果中未记录选项选择」。']
];
const colX=[0,480];
rules.forEach(([n,t],i)=>{
 const cx=colX[i%2], cy=1768+Math.floor(i/2)*56;
 E(DOC,'d-rule-dot-'+n,cx,cy+5,5,5,C.b1);
 TL(DOC,'d-rule-n-'+n,n,cx+12,cy,{size:9.5,mono:true,color:C.dim});
 TT(DOC,'d-rule-'+n,t,cx+40,cy-1,420,{size:10.5,lh:17,color:C.t3});
});
/* arrow block right */
TL(DOC,'d-arrow-t','标记方向（更正）',1040,1736,{size:11,color:C.t1,fontStyle:'Medium'});
SVG(DOC,'ar-out','<svg width="16" height="16" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="'+P+'" fill="none" stroke="'+C.accent+'" stroke-width="2" stroke-linecap="round"/></svg>',1040,1766);
TL(DOC,'ar-out-l','发出',1066,1765,{size:11,color:C.t2});
SVG(DOC,'ar-in','<svg width="16" height="16" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1,0,0,-1,0,13)"><path d="'+P+'" fill="none" stroke="'+C.accent+'" stroke-width="2" stroke-linecap="round"/></g></svg>',1140,1766);
TL(DOC,'ar-in-l','收到',1166,1765,{size:11,color:C.t2});
TT(DOC,'d-arrow-note','接收 = 发出箭头的垂直镜像（scale(1,-1)），不是 180° 旋转。之前画成 ↙ 是错的；颜色规则不变：箭头用「对端」的泳道色。',1040,1800,440,{size:10,lh:16,color:C.t3});
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true};
