// dsh-task-gantt · Figma build step 11/90
// turn 1 · step 53 · callId call_01_itty7dbgx66witjrw0ochnkv
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name,out){out=out||[];if(root.name===name)out.push(root);for(const c of root.children||[])find(c,name,out);return out;}
const counts=find(figma.currentPage,'counts').slice(0,2).map(n=>({id:n.id,w:n.width,h:n.height,chars:n.characters,ar:n.textAutoResize,lh:n.lineHeight,fs:n.fontSize,fam:n.fontName}));
const labels=find(figma.currentPage,'task-label-0-0').map(n=>({id:n.id,w:n.width,h:n.height,chars:n.characters}));
const labs=find(figma.currentPage,'task-label-0-1').map(n=>({id:n.id,w:n.width,h:n.height,chars:n.characters}));
return {counts,labels,labs};
