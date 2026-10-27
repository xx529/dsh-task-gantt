// dsh-task-gantt · Figma build step 54/90
// turn 2 · step 32 · callId call_00_yd8uzcllu43samkupux0223n
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p0=figma.root.children.find(p=>p.name.startsWith('00'));
await figma.setCurrentPageAsync(p0);
const doc0=p0.children[0];
return {doc:doc0.id, w:doc0.width, h:doc0.height, names:doc0.children.map(c=>c.name)};
