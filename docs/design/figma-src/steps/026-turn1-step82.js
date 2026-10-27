// dsh-task-gantt · Figma build step 26/90
// turn 1 · step 82 · callId call_00_lkjmd5u27oo5zmssvyjh84fe
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const doc=find(figma.currentPage,'page 04 doc');
const E=doc.children.find(n=>n.name==='state · 空态');
if(E){ const b=find(E,'b'); if(b){ b.textAlignHorizontal='CENTER'; b.x=80; } }
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
