// dsh-task-gantt · Figma build step 37/90
// turn 1 · step 110 · callId call_00_5nm7271lni3g2ac1uhlq23m8
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let doc=null;for(const p of figma.root.children){doc=find(p,'page 05 doc');if(doc)break;}
doc.resize(1600,1090);
const r=doc.children.find(n=>n.name==='rules'); if(r)r.y=838;
const l=doc.children.find(n=>n.name==='diff-line'); if(l)l.y=902;
const t=doc.children.find(n=>n.name==='diff-t'); if(t)t.y=916;
for(let i=0;i<6;i++){
 const k=doc.children.find(n=>n.name==='dk-'+i); if(k)k.y=942+i*20;
 const b=doc.children.find(n=>n.name==='db-'+i); if(b)b.y=942+i*20;
 const a=doc.children.find(n=>n.name==='da-'+i); if(a)a.y=942+i*20;
}
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
