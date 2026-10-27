// dsh-task-gantt · Figma build step 71/90
// turn 3 · step 23 · callId call_00_wzjc71ab8q2xqufc1pe7vv7z
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function byName(root,name){const out=[];const w=(r)=>{try{if(r.name===name)out.push(r);}catch(e){}for(const c of (r.children||[]))w(c);};w(root);return out;}
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
await figma.loadFontAsync({family:'PingFang SC',style:'Regular'});
let fixed=0;
for(const pname of ['01','02']){
 const page=figma.root.children.find(p=>p.name.startsWith(pname));
 for(const n of byName(page,'sw-in')){
  const x=n.x,y=n.y;

  n.remove();
  const svg='<svg width="12" height="12" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1,0,0,-1,0,13)"><path d="'+P+'" fill="none" stroke="#ADB2B8" stroke-width="2" stroke-linecap="round"/></g></svg>';
  const nd=figma.createNodeFromSvg(svg);nd.name='sw-in';nd.x=x;nd.y=y;
  fixed++;
 }
}
return {fixed};
