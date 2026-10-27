// dsh-task-gantt · Figma build step 29/90
// turn 1 · step 90 · callId call_00_odfem78h1tvwgi4lk0201p5h
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const doc=find(figma.currentPage,'page 04 doc');
const t=doc.children.find(n=>n.name&&n.name.startsWith('cap-0-1420'));
if(t){ t.characters='冻结态 · NOW 变暗、标签改中性「结束 · 16:24」，跟随自动关闭，不再暗示「还在跑」'; }
return {ok:true};
