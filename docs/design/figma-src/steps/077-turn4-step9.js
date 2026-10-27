// dsh-task-gantt · Figma build step 77/90
// turn 4 · step 9 · callId call_00_nklvrs6mf0b74du61xq5vsjk
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const d1=byName(p5,'q-multi-answered')[0];
const items=d1.children.filter(c=>/^(qno|qp|ak|av|ck|div|qh|foot)-?/.test(String(c.name))).map(c=>({n:c.name,y:Math.round(c.y),h:Math.round(c.height||0),x:Math.round(c.x)}));
return items;
