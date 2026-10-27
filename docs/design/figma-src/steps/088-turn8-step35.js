// dsh-task-gantt · Figma build step 88/90
// turn 8 · step 35 · callId call_00_mwp6qbof8ee9ei1cmxax58j6
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const doc=p5.children[0];
const find=(n,name)=>{try{if(n.name===name)return n;}catch(e){}for(const c of n.children||[]){const r=find(c,name);if(r)return r;}return null;};
return {in:find(doc,'msg-in')?.id,out:find(doc,'msg-out')?.id};
