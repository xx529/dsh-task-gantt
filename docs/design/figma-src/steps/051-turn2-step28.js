// dsh-task-gantt · Figma build step 51/90
// turn 2 · step 28 · callId call_00_ek3e80mjk4a0m2b4qylkgbu7
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p0=figma.root.children.find(p=>p.name.startsWith('00'));
return p0.children.map(c=>({id:c.id,name:c.name,type:c.type,w:c.width,h:c.height,childCount:c.childCount}));
