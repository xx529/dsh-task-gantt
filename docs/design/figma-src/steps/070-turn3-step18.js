// dsh-task-gantt · Figma build step 70/90
// turn 3 · step 18 · callId call_00_ed4281dxz5c7nuvnuyd0twh2
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
const td=byName(p5,'task-drawer')[0];
const lbk=byName(td,'lb-k')[0];
if(lbk) lbk.y=78;
/* remove redundant per-question waiting lines */
for(const d of byName(p5,'q-multi-waiting')){
 for(const c of [...d.children]){ if(String(c.name).indexOf('none-')===0) c.remove(); }
}
figma.viewport.scrollAndZoomIntoView([byName(p5,'page 05 doc')[0]]);
return {ok:true};
