// dsh-task-gantt · Figma build step 23/90
// turn 1 · step 77 · callId call_00_r5zdjuxh2bvdjbwz0o2y6eu8
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const doc=find(figma.currentPage,'page 03 doc');
const panels=[doc.children.find(n=>n.name.startsWith('03 · 改版 · 暗色')),doc.children.find(n=>n.name.startsWith('03 · 改版 · 亮色'))];
let moved=0;
for(const p of panels){
 const plot=find(p,'plot');
 for(const c of [...plot.children]){
  if(/^turn-|^step-|^step-open-|^wait-/.test(c.name)){ c.y+=16; moved++; }
  else if(/^msg-|^q-halo-|^q-/.test(c.name)){ c.y-=17; moved++; }
 }
}
return {moved};
