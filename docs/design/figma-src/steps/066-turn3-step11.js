// dsh-task-gantt · Figma build step 66/90
// turn 3 · step 11 · callId call_00_slpny72ltv4sca94d9o973i8
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function walk(root,fn,out){out=out||[];try{fn(root,out);}catch(e){}for(const c of (root.children||[]))walk(c,fn,out);return out;}
function byName(root,name){return walk(root,(n,o)=>{try{if(n.name===name)o.push(n);}catch(e){}}).filter(n=>n.name===name);}
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
const T2='#CFD3D6';
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const doc5=byName(p5,'page 05 doc')[0];
const inDrawer=byName(doc5,'msg-in')[0];
const outDrawer=byName(doc5,'msg-out')[0];
function fixDrawer(drawer,dir){
 if(!drawer) return 0;
 let n=0;
 for(const ar of byName(drawer,'ar')){
  let parentName='';try{parentName=ar.parent.name;}catch(e){}
  const x=ar.x,y=ar.y;
  ar.remove();
  const rot = dir==='in'?' transform="matrix(1,0,0,-1,0,13)"':'';
  let svg;
  if(parentName==='chip'){
   svg='<svg width="14" height="14" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+P+'" fill="none" stroke="'+T2+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
  } else {
   svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M1.6 6.5 H11 M7.4 2.9 L11 6.5 L7.4 10.1" fill="none" stroke="'+T2+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  const nd=figma.createNodeFromSvg(svg);nd.name='ar';nd.x=x;nd.y=y;drawer.appendChild(nd);n++;
 }
 return n;
}
const a=fixDrawer(inDrawer,'in');
const b=fixDrawer(outDrawer,'out');
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const doc6=p6.children[0];
const a2=byName(doc6,'a2')[0];
let c=0;
if(a2){const x=a2.x,y=a2.y;a2.remove();
 const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1,0,0,-1,0,13)"><path d="'+P+'" fill="none" stroke="#232324" stroke-width="4.2" stroke-linecap="round"/><path d="'+P+'" fill="none" stroke="#558130" stroke-width="2" stroke-linecap="round"/></g></svg>';
 const nd=figma.createNodeFromSvg(svg);nd.name='a2';nd.x=x;nd.y=y;doc6.appendChild(nd);c=1;}
return {inDrawer:a,outDrawer:b,spec:c};
