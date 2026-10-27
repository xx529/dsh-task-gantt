// dsh-task-gantt · Figma build step 59/90
// turn 2 · step 49 · callId call_00_ib7h7eeejtqewwvjzqaedz4l
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const p3=figma.root.children.find(p=>p.name.startsWith('03'));
const doc3=find(p3,'page 03 doc');
const names=doc3.children.map(c=>c.name).filter(n=>n.indexOf('note-')===0);
return {found:names, has07: names.some(n=>n.indexOf('07')>=0)};
