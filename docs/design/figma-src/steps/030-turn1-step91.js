// dsh-task-gantt · Figma build step 30/90
// turn 1 · step 91 · callId call_00_trm85nbeyus2r7txajhn1g1w
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let doc=null;
for(const p of figma.root.children){ doc=find(p,'page 04 doc'); if(doc) break; }
const t=doc.children.find(n=>n.name&&n.name.startsWith('cap-0-1420'));
if(t){ t.characters='冻结态 · NOW 变暗、标签改中性「结束 · 16:24」，跟随自动关闭，不再暗示「还在跑」'; }
return {ok:true};
