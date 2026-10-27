// dsh-task-gantt · Figma build step 76/90
// turn 4 · step 7 · callId call_00_dy8tkzrhwsj32yk30bp1oew8
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const d1=byName(p5,'q-multi-answered')[0];
return {id:d1?d1.id:null};
