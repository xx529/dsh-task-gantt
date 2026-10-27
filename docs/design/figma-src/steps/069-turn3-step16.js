// dsh-task-gantt · Figma build step 69/90
// turn 3 · step 16 · callId call_00_itikc7akh534gt7w6msy59rj
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const td=byName(p5,'task-drawer')[0];
return {id:td?td.id:null};
