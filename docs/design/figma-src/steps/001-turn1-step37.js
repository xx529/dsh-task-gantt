// dsh-task-gantt · Figma build step 1/90
// turn 1 · step 37 · callId call_00_xw05wu55exdqsdtvvodyr3ac
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C = {
  bg1:'#232324', bg2:'#2C2C2E', bg3:'#353638',
  b1:'#2E2E2F', b2:'#3A3A3C', b3:'#434345',
  t1:'#F9FAFB', t2:'#CFD3D6', t3:'#ADB2B8', dim:'#43454A',
  business:'#7AAAFF', success:'#22C55E', warn:'#F59E0B', error:'#F25A5A',
  lane0:'#2563EB', lane1:'#A3294F', lane2:'#558130', lane3:'#786BA5', lane4:'#765C19',
  pageDoc:'#151517', pageCanvas:'#1B1B1C'
};
function rgb(hex){ const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}; }
function solid(hex, opacity){ const p={type:'SOLID', color:rgb(hex)}; if(opacity!==undefined) p.opacity=opacity; return p; }
function fill(node, hex, opacity){ node.fills=[solid(hex,opacity)]; }
function stroke(node, hex, w, opacity){ node.strokes=[solid(hex,opacity)]; node.strokeWeight=w===undefined?1:w; node.strokeAlign='INSIDE'; }
function F(frame, name, x, y, w, h, opts){
  opts=opts||{};
  const n=figma.createFrame(); n.name=name; n.resize(w,h); n.x=x; n.y=y;
  n.fills = opts.fill===null?[]:[solid(opts.fill||C.bg1)];
  if(opts.radius!==undefined){ n.cornerRadius=opts.radius; }
  n.clipsContent = opts.clip!==false;
  if(opts.stroke){ stroke(n, opts.stroke, 1, opts.strokeOpacity); } else { n.strokes=[]; }
  frame.appendChild(n);
  return n;
}
function R(parent, name, x, y, w, h, color, opts){
  opts=opts||{};
  const n=figma.createRectangle(); n.name=name; n.x=x; n.y=y; n.resize(w,h);
  fill(n, color, opts.opacity);
  if(opts.radius!==undefined) n.cornerRadius=opts.radius;
  if(opts.border){ stroke(n, opts.border, opts.borderWeight||1); }
  if(opts.dash){ n.strokeDashes=opts.dash; n.strokes=[solid(opts.border)]; }
  parent.appendChild(n); return n;
}
function E(parent, name, x, y, w, h, color, opts){
  opts=opts||{};
  const n=figma.createEllipse(); n.name=name; n.x=x; n.y=y; n.resize(w,h);
  if(color==='none'){ n.fills=[]; } else { fill(n,color,opts.opacity); }
  if(opts.border){ stroke(n, opts.border, opts.borderWeight||1); }
  parent.appendChild(n); return n;
}
function T(parent, name, str, x, y, w, opts){
  opts=opts||{};
  const n=figma.createText(); n.name=name;
  n.fontName = opts.mono ? {family:'JetBrains Mono', style:opts.fontStyle||'Regular'} : (opts.latin ? {family:'SF Pro', style:opts.fontStyle||'Regular'} : {family:'PingFang SC', style:opts.fontStyle||'Regular'});
  n.characters = str; n.fontSize = opts.size||11;
  if(opts.lh!==undefined) n.lineHeight={unit:'PIXELS', value:opts.lh};
  if(opts.ls!==undefined) n.letterSpacing={unit:'PIXELS', value:opts.ls};
  if(opts.color) fill(n, opts.color);
  n.textAutoResize='NONE';
  n.resize(w, opts.h||Math.max(opts.size||11, 14));
  n.textAlignHorizontal = opts.align||'LEFT';
  n.textAlignVertical='CENTER';
  n.x=x; n.y=y;
  parent.appendChild(n); return n;
}
async function load(){
  await Promise.all([
    figma.loadFontAsync({family:'PingFang SC', style:'Regular'}),
    figma.loadFontAsync({family:'PingFang SC', style:'Medium'}),
    figma.loadFontAsync({family:'PingFang SC', style:'Semibold'}),
    figma.loadFontAsync({family:'PingFang SC', style:'Light'}),
    figma.loadFontAsync({family:'SF Pro', style:'Regular'}),
    figma.loadFontAsync({family:'SF Pro', style:'Medium'}),
    figma.loadFontAsync({family:'SF Pro', style:'Semibold'}),
    figma.loadFontAsync({family:'JetBrains Mono', style:'Regular'}),
    figma.loadFontAsync({family:'JetBrains Mono', style:'Medium'})
  ]);
}
await load();
const pages = figma.root.children;
const wanted = [
  ['00 · 封面', 'cover'],
  ['01 · 现状 AS-IS', 'asis'],
  ['02 · 问题走查', 'audit'],
  ['03 · 改版 MAIN', 'main'],
  ['04 · 状态与交互', 'states'],
  ['05 · 设计规范', 'specs']
];
const out = [];
for (let i=0;i<wanted.length;i++){
  let p = pages[i];
  if(p===undefined) p = figma.createPage();
  p.name = wanted[i][0];
  p.backgrounds=[solid(C.pageCanvas)];
  out.push({id:p.id,name:p.name});
}
figma.currentPage = figma.root.children[1];
figma.viewport.scrollAndZoomIntoView([]);
return out;
