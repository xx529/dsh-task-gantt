// dsh-task-gantt · Figma build step 4/90
// turn 1 · step 45 · callId call_00_rd9jtiwg4zahet7qaav869wa
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const page = figma.currentPage;
const removed = [];
for (const child of [...page.children]) { removed.push(child.name); child.remove(); }
let svgOk = null, svgErr = null, id = null;
try {
  const n = figma.createNodeFromSvg('<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1" fill="none" stroke="#7AAAFF" stroke-width="2" stroke-linecap="round"/></svg>');
  n.name = 'svg-test'; n.x = 0; n.y = 0;
  page.appendChild(n);
  svgOk = n.id; id = n.id;
} catch (e) { svgErr = String(e); }
return { removed, svgOk, svgErr, id };
