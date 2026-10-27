// dsh-task-gantt · Figma build step 62/90
// turn 3 · step 3 · callId call_00_efcf5gft2zcyiqarqfhqwdmk
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,fn,out){out=out||[];try{fn(root)&&out.push(root);}catch(e){}for(const c of (root.children||[]))find(c,fn,out);return out;}
const p1=figma.root.children.find(p=>p.name.startsWith('01'));
const plot=find(p1,n=>{try{return n.name==='plot';}catch(e){return false;}})[0];
const node=find(plot,n=>{try{return n.name==='msg-0-1';}catch(e){return false;}})[0];
if(!node) return {err:'not found'};
const before={x:node.x,y:node.y,w:node.width,h:node.height,rt:node.relativeTransform};
node.relativeTransform=[[1,0,node.x],[0,-1,node.y+node.height]];
return {before, after:{rt:node.relativeTransform, x:node.x,y:node.y}};
