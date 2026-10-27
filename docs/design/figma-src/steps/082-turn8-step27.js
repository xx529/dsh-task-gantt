// dsh-task-gantt · Figma build step 82/90
// turn 8 · step 27 · callId call_00_cqgydc09lahhua5qm0yck71c
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const doc=p5.children[0];
return {doc:doc.id, w:doc.width, h:doc.height, children:doc.children.map(c=>({id:c.id,name:c.name,type:c.type,x:Math.round(c.x),y:Math.round(c.y),w:Math.round(c.width),h:Math.round(c.height)}))};
