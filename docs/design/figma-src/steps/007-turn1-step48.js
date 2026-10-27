// dsh-task-gantt · Figma build step 7/90
// turn 1 · step 48 · callId call_00_d9qkb0uby42yeoudpu7vx77w
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root, name){ if(root.name===name) return root; for(const c of root.children||[]){ const r=find(c,name); if(r) return r; } return null; }
const plot = find(figma.currentPage, 'plot');
const out = { found: plot?plot.id:null };
if(plot){
  const bg1='#232324';
  try{
    const n = figma.createNodeFromSvg('<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="'+bg1+'" stroke-width="4.4" stroke-linecap="round"/><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="#A3294F" stroke-width="2" stroke-linecap="round"/></g></svg>');
    n.name='probe-arrow'; n.x=10; n.y=10; plot.appendChild(n); out.arrow='ok';
  }catch(e){ out.arrow='ERR '+String(e); }
  try{
    const e = figma.createEllipse(); e.name='probe-q'; e.x=40; e.y=10; e.resize(14,14); e.fills=[{type:'SOLID',color:{r:0.137,g:0.137,b:0.141}}]; plot.appendChild(e); out.ellipse='ok';
  }catch(err){ out.ellipse='ERR '+String(err); }
}
return out;
