// dsh-task-gantt · Figma build step 89/90
// turn 8 · step 37 · callId call_00_w6vr3bdt8gkl58hlf9qnt99m
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={bg1:'#232324',bg3:'#353638',b1:'#2E2E2F',b2:'#3A3A3C',t1:'#F9FAFB',t2:'#CFD3D6',t3:'#ADB2B8',accent:'#7AAAFF'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function stroke(n,h,w,o){n.strokes=[solid(h,o)];n.strokeWeight=w===undefined?1:w;n.strokeAlign='INSIDE';}
function byName(root,name,out){out=out||[];try{if(root.name===name)out.push(root);}catch(e){}for(const c of root.children||[])byName(c,name,out);return out;}
await figma.loadAllPagesAsync();
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const doc=p5.children[0];
for(const dn of ['msg-in','msg-out']){
 const drawer=byName(doc,dn)[0];
 const body=byName(drawer,'body')[0];
 if(body){ body.fills=[]; body.strokes=[]; body.strokeWeight=0; body.resize(448,124); }
 const link=byName(drawer,'md-link')[0]; if(link) link.y=108;
 const codebox=byName(drawer,'md-code')[0]; if(codebox){ codebox.fills=[solid(C.bg3,1)]; stroke(codebox,C.b2,1); }
}
figma.viewport.scrollAndZoomIntoView([doc]);
return {ok:true};
