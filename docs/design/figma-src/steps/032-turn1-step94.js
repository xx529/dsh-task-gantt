// dsh-task-gantt · Figma build step 32/90
// turn 1 · step 94 · callId call_00_u0txj3pq0yqo79wihxlljhx2
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const out=[];
for(const p of figma.root.children){ const d=p.children.find(n=>n.name&&n.name.endsWith('doc')); out.push({page:p.name, doc:d?d.id:null, w:d?d.width:0}); }
return out;
