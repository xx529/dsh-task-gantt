// dsh-task-gantt · Figma build step 6/90
// turn 1 · step 47 · callId call_00_n2zm0cj8kvq5an0bs0hz3t81
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const page = figma.currentPage;
let out = {};
try {
  const a = figma.createFrame(); a.name='probe-a'; a.resize(100,100); a.x=600; a.y=0; page.appendChild(a);
  const b = figma.createFrame(); b.name='probe-b'; b.resize(80,80); b.x=0; b.y=0; b.fills=[]; a.appendChild(b);
  out.frameOk = true;
  try {
    const s = figma.createNodeFromSvg('<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="#A3294F" stroke-width="2" stroke-linecap="round"/></svg>');
    s.name='svg-nested'; s.x=5; s.y=5; b.appendChild(s); out.svgNested='ok';
  } catch(e){ out.svgNested='ERR '+String(e); }
  try {
    const r = figma.createRectangle(); r.name='rect-nested'; r.x=20; r.y=20; r.resize(10,10); r.fills=[{type:'SOLID',color:{r:0.1,g:0.2,b:0.3}}]; b.appendChild(r); out.rectNested='ok';
  } catch(e){ out.rectNested='ERR '+String(e); }
  try {
    const e2 = figma.createEllipse(); e2.x=40; e2.y=40; e2.resize(6,6); e2.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}]; b.appendChild(e2); out.ellipse='ok';
  } catch(e){ out.ellipse='ERR '+String(e); }
} catch(e){ out.outer='ERR '+String(e); }
return out;
