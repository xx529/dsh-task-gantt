// dsh-task-gantt · Figma build step 19/90
// turn 1 · step 70 · callId call_00_emrwj2yfvdu59r1bkfxvr4bx
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name,out){out=out||[];if(root.name===name)out.push(root);for(const c of root.children||[])find(c,name,out);return out;}
const ticks=find(figma.currentPage,'tick-0');
const ax=find(figma.currentPage,'axis')[0];
return {n:ticks.length, info:ticks.map(n=>({x:n.x,y:n.y,w:n.width,h:n.height,chars:n.characters,col:n.fills&&n.fills[0]&&n.fills[0].color,fam:n.fontName})), axis:ax?{x:ax.x,y:ax.y,w:ax.width,h:ax.height,kids:ax.childCount}:null};
