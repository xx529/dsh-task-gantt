// dsh-task-gantt · Figma build step 63/90
// turn 3 · step 5 · callId call_00_1fnmjjdtf5d0oc7n4u9thews
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function collect(root,fn,out){out=out||[];try{if(fn(root))out.push({id:root.id,name:root.name,x:root.x,y:root.y,w:root.width,h:root.height});}catch(e){}for(const c of (root.children||[]))collect(c,fn,out);return out;}
const p1=figma.root.children.find(p=>p.name.startsWith('01'));
const items=collect(p1,n=>/^msg-0-1$/.test(n.name)||/^msg-0-0$/.test(n.name)||/^plot$/.test(n.name));
return items;
