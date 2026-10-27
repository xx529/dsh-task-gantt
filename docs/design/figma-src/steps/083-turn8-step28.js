// dsh-task-gantt · Figma build step 83/90
// turn 8 · step 28 · callId call_00_u8gelfxl8x3iei4s4dfb8yve
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const doc=p5.children[0];
const find=(n,name)=>{ if(n.name===name) return n; for(const c of n.children||[]){ const r=find(c,name); if(r) return r;} return null; };
const a=find(doc,'msg-in'); const b=find(doc,'msg-out');
const dump=(n)=>({id:n.id,name:n.name,w:Math.round(n.width),h:Math.round(n.height),x:Math.round(n.x),y:Math.round(n.y),children:(n.children||[]).map(c=>({id:c.id,name:c.name,type:c.type,x:Math.round(c.x),y:Math.round(c.y),w:Math.round(c.width),h:Math.round(c.height),chars:c.type==='TEXT'?c.characters.slice(0,30):undefined}))});
return {a:dump(a), b:dump(b)};
