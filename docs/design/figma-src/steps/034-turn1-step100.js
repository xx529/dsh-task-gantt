// dsh-task-gantt · Figma build step 34/90
// turn 1 · step 100 · callId call_00_qq8jethoeu0tk1mfyl85te03
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
function solid(h,o){h=h.replace('#','');const c={r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};const p={type:'SOLID',color:c};if(o!==undefined)p.opacity=o;return p;}
let doc=null;for(const p of figma.root.children){doc=find(p,'page 03 doc');if(doc)break;}
for(const c of [...doc.children]) if(/^note-b-/.test(c.name)) c.remove();
const bodies=['状态 / 时间 / 视图三段；固定宽 448px 内放得下，图标按钮替代长文案，去掉重复的总任务数。','身份药丸、单一状态指示、计数、活动词；颜色不再承担状态语义。','turn 带 20% 作背景、step 条 90% 嵌在其中；消息箭头 12px；任务条 22px。','左 3px 身份色 + 右侧状态字形（✓ / ●）+ 底边 2px 状态迁移刻度。','1.5px 强调线 + 轴内时间胶囊；不再用白底方块遮住刻度。','缩放 / 图例 / 构建号各归其位，图例移进弹层，默认不占据主视图。'];
await figma.loadFontAsync({family:'PingFang SC',style:'Regular'});
bodies.forEach((b,i)=>{
 const n=figma.createText();n.name='note-b-'+String(i+1).padStart(2,'0');
 n.fontName={family:'PingFang SC',style:'Regular'};n.characters=b;n.fontSize=10.5;n.lineHeight={unit:'PIXELS',value:15};
 n.fills=[solid('#ADB2B8')];n.textAutoResize='HEIGHT';n.resize(330,10);
 n.x=1066;n.y=140+i*62+18;doc.appendChild(n);
});
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
