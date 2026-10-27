// dsh-task-gantt · Figma build step 33/90
// turn 1 · step 98 · callId call_00_arcecnn7bm7dcjrao9jcfm44
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let doc=null;
for(const p of figma.root.children){ doc=find(p,'page 02 doc'); if(doc) break; }
doc.resize(1600,1010);
const wrap=find(doc,'panel+zone');
if(wrap) wrap.x=40;
return {ok:true,doc:doc.id,wrap:wrap?wrap.id:null};
