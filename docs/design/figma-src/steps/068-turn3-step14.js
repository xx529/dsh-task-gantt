// dsh-task-gantt · Figma build step 68/90
// turn 3 · step 14 · callId call_00_26anm05pnb3pnk59f6h2xkfm
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
await figma.setCurrentPageAsync(p5);
for(const c of [...p5.children]){ if(c.name==='idx-rule-0') c.remove(); }
figma.viewport.scrollAndZoomIntoView([p5.children[0]]);
return {ok:true};
