// dsh-task-gantt · Figma build step 35/90
// turn 1 · step 102 · callId call_00_0u1khwsaq1j6fvths8scs97a
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
function solid(h,o){h=h.replace('#','');const c={r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};const p={type:'SOLID',color:c};if(o!==undefined)p.opacity=o;return p;}
let doc=null;for(const p of figma.root.children){doc=find(p,'page 05 doc');if(doc)break;}
const old=doc.children.find(n=>n.name==='rules'); if(old) old.remove();
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'}),figma.loadFontAsync({family:'PingFang SC',style:'Medium'}),figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'})]);
function txt(name,str,x,y,w,opts){
 const n=figma.createText();n.name=name;n.fontName=opts.mono?{family:'JetBrains Mono',style:'Regular'}:{family:'PingFang SC',style:opts.fontStyle||'Regular'};
 n.characters=str;n.fontSize=opts.size||10.5;n.lineHeight={unit:'PIXELS',value:opts.lh||16};
 if(opts.color)n.fills=[solid(opts.color)];
 if(w){n.textAutoResize='HEIGHT';n.resize(w,10);}else{n.textAutoResize='WIDTH_AND_HEIGHT';}
 n.x=x;n.y=y;doc.appendChild(n);return n;
}
txt('rules','规则 · 状态 = 语义色 + 形状 + 文字；身份 = 泳道色 + 位置；两条通道不复用。\n规则 · 任务条长度只由时间决定，标签只在条内截断，不改变条长。\n规则 · 控件 ≥ 26px 高、命中区 ≥ 24×24；hover 与 focus-visible 两态齐全。',1000,740,560,{size:10,color:'#ADB2B8',lh:18});
const line=figma.createRectangle();line.name='diff-line';line.x=1000;line.y=812;line.resize(560,1);line.fills=[solid('#2E2E2F')];doc.appendChild(line);
txt('diff-t','与现状的关键差异',1000,828,300,{size:11,color:'#F9FAFB',fontStyle:'Medium'});
const rows=[['工具栏','8 个控件约 490px 溢出','5 组共 448px，图标化 + 分组'],['泳道头','色块 + 字形 + 双计数 + 状态词','身份药丸 + 单一状态指示 + 计数 + 活动词'],['任务条','条下 3 类事件字形','状态字形入条 + 底边 2px 迁移刻度'],['时间轴','白底 NOW 方块遮刻度','1.5px 强调线 + 轴内时间胶囊'],['页脚','11 项图例占两行','一行页脚 + 图例弹层'],['状态','颜色是唯一方向编码','形状 + 位置 + 文字三重编码']];
rows.forEach(([k,b,a],i)=>{
 const y=856+i*20;
 txt('dk-'+i,k,1000,y,60,{size:10,color:'#7AAAFF',mono:true});
 txt('db-'+i,b,1052,y,220,{size:10,color:'#81858C'});
 txt('da-'+i,a,1300,y,300,{size:10,color:'#CFD3D6'});
});
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
