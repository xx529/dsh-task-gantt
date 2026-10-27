// dsh-task-gantt · Figma build step 65/90
// turn 3 · step 9 · callId call_00_skpmmwwj5ltlgw295p2zfcyy
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const T2='#CFD3D6', T3='#ADB2B8';
function find(root,fn,out){out=out||[];try{if(fn(root))out.push(root);}catch(e){}for(const c of (root.children||[]))find(c,fn,out);return out;}
function findName(root,name){return find(root,n=>{try{return n.name===name;}catch(e){return false;}});}
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
const p5=figma.root.children.find(p=>p.name.startsWith('05 · 详情'));
const doc5=findName(p5,'page 05 doc');
/* chip arrows */
const chips=[findName(doc5,'msg-in'),findName(doc5,'msg-out')];
chips.forEach((drawer,i)=>{
 if(!drawer) return;
 const chip=findName(drawer,'chip');
 const ar=chip?findName(chip,'ar'):null;
 if(ar&&chip){
  const x=ar.x,y=ar.y,w=ar.width,h=ar.height;ar.remove();
  const dir = i===0 ? 'in':'out';
  const rot = dir==='in'?' transform="matrix(1,0,0,-1,0,13)"':'';
  const svg='<svg width="14" height="14" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+P+'" fill="none" stroke="'+T2+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
  const n=figma.createNodeFromSvg(svg);n.name='ar';n.x=x;n.y=y;chip.appendChild(n);
 }
 /* route arrow -> right arrow */
 const ar2=findName(drawer,'ar');
});
/* route arrows: replace any 'ar' that is a direct child of the drawer (not chip) */
chips.forEach(drawer=>{
 if(!drawer) return;
 for(const c of [...drawer.children]){
  let n='';try{n=c.name;}catch(e){continue;}
  if(n==='ar'){
   const x=c.x,y=c.y;c.remove();
   const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 6.5 H11 M7.5 3 L11 6.5 L7.5 10" fill="none" stroke="'+T2+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   const nd=figma.createNodeFromSvg(svg);nd.name='route-arrow';nd.x=x;nd.y=y;drawer.appendChild(nd);
  }
 }
});
/* page 06: received example */
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const doc6=p6.children[0];
const a2=findName(doc6,'a2');
if(a2){
 const x=a2.x,y=a2.y;a2.remove();
 const color='#558130';
 const svg='<svg width="13" height="13" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1,0,0,-1,0,13)"><path d="'+P+'" fill="none" stroke="#232324" stroke-width="4.2" stroke-linecap="round"/><path d="'+P+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
 const n=figma.createNodeFromSvg(svg);n.name='a2';n.x=x;n.y=y;doc6.appendChild(n);
}
return {ok:true};
