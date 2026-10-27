// dsh-task-gantt · Figma build step 81/90
// turn 4 · step 15 · callId call_00_3cesijaf6457osoafi8mhk4b
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const DOC=byName(p5,'page 05 doc')[0];
const res=[];
for(const nm of ['msg-in','msg-out']){
 const d=byName(DOC,nm)[0]; if(!d) continue;
 d.resize(480,282);
 const body=byName(d,'body')[0]; if(body) body.resize(448,112);
 const foot=byName(d,'foot')[0]; if(foot) foot.y=242;
 res.push({nm:id=>id, id:d.id});
}
figma.viewport.scrollAndZoomIntoView([DOC]);
return {ok:true,count:res.length};
