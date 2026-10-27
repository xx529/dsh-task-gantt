// dsh-task-gantt · Figma build step 56/90
// turn 2 · step 38 · callId call_00_vwx1pq30c64ys8jqmmibwpv8
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p0=figma.root.children.find(p=>p.name.startsWith('00'));
await figma.setCurrentPageAsync(p0);
const doc0=p0.children[0];
return doc0.children.map(c=>({id:c.id,name:c.name,type:c.type,y:Math.round(c.y),x:Math.round(c.x),chars:c.type==='TEXT'?c.characters.slice(0,14):undefined}));
