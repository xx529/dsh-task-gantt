// dsh-task-gantt · Figma build step 90/90
// turn 8 · step 58 · callId call_00_gy1uhysf6hq99gmr4gkfyttr
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name,out){out=out||[];try{if(root.name===name)out.push(root);}catch(e){}for(const c of root.children||[])byName(c,name,out);return out;}
await figma.loadAllPagesAsync();
const p7=figma.root.children.find(p=>p.name.startsWith('07 · Markdown'));
await figma.setCurrentPageAsync(p7);
const doc=p7.children[0];
const ps=byName(doc,'ps')[0];
if(ps){ ps.characters='详情正文默认渲染 Markdown，「原文」切回源文本；展开后的详情弹窗用 fixed + 打开时测量视口，覆盖【整个应用窗口】居中（不是侧边栏居中）'; }
const n3=byName(doc,'note-2')[0];
if(n3){ n3.characters='3. 展开按钮触发弹窗：position:fixed + 打开时测量自身盒子并校正（兼容祖先 transform），在【整个应用】居中（720px 宽），不是侧边栏 480px 居中。'; }
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
