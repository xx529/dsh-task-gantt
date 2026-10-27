// dsh-task-gantt · Figma build step 31/90
// turn 1 · step 93 · callId call_00_twnoufqk9ffrr0ndt81k0f2d
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let doc=null;
for(const p of figma.root.children){ doc=find(p,'page 04 doc'); if(doc) break; }
let out={found:false};
if(doc){ const t=doc.children.find(n=>n.name&&n.name.startsWith('cap-0-1420')); if(t){ t.characters='冻结态 · NOW 变暗、标签改中性「结束 · 16:24」，跟随自动关闭，不再暗示「还在跑」'; out={found:true,id:t.id}; } }
return out;
