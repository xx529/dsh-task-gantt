// dsh-task-gantt · Figma build step 60/90
// turn 2 · step 50 · callId call_00_j8m0x42npbf280giecgqi5z5
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const d5=find(p5,'page 05 doc');
const AN=find(d5,'anatomy');
const n1=find(AN,'n1'),n3=find(AN,'n3');
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const d6=p6.children[0];
const pt6=find(d6,'pt');
return {n1y:n1?n1.y:null,n3y:n3?n3.y:null,specsTitle:pt6?pt6.characters:null,specsDocName:d6.name};
