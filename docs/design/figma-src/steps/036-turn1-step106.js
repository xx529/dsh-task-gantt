// dsh-task-gantt · Figma build step 36/90
// turn 1 · step 106 · callId call_00_zd7e1e14o1ikcylfxn02la30
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let doc=null;for(const p of figma.root.children){doc=find(p,'page 02 doc');if(doc)break;}
doc.resize(1520,820);
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
