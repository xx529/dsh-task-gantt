// dsh-task-gantt · Figma build step 72/90
// turn 3 · step 24 · callId call_00_pp2441rgllhvr4vpaje2qn0k
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
await figma.loadFontAsync({family:'PingFang SC',style:'Regular'});
/* remove misplaced nodes on page 05 */
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
for(const n of byName(p5,'sw-in')) n.remove();
const placed=[];
for(const pname of ['01','02']){
 const page=figma.root.children.find(p=>p.name.startsWith(pname));
 await figma.setCurrentPageAsync(page);
 const legends=byName(page,'legend');
 for(const lg of legends){
  // skip the as-is panel legend inside page 02? both pages have one legend each
  const svg='<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1,0,0,-1,0,13)"><path d="'+P+'" fill="none" stroke="#ADB2B8" stroke-width="2" stroke-linecap="round"/></g></svg>';
  const nd=figma.createNodeFromSvg(svg);nd.name='sw-in';lg.appendChild(nd);nd.x=332;nd.y=0;
  placed.push({page:pname,legend:lg.id});
  break;
 }
}
return {placed};
