// dsh-task-gantt · Figma build step 42/90
// turn 2 · step 9 · callId call_00_kgf67tjve6t2qyjzicbkne71
// recorded outcome: ERROR (expected when replaying)
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'},L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function findPlots(root,out){out=out||[];if(root.name==='plot')out.push(root);for(const c of root.children||[])findPlots(c,out);return out;}
function pal(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;if(n.name&&n.name.indexOf('亮色')>=0)return L;}return D;}
let out={tri:0,queue:0,removed:0};
for(const p of figma.root.children){
 if(!/^0[34]/.test(p.name)) continue;
 for(const plot of findPlots(p,[])){
  const P=pal(plot);
  for(const bar of [...plot.children]){
   if(bar.type!=='FRAME'||bar.name!=='task') continue;
   const w=bar.width,h=bar.height,bx=bar.x,by=bar.y;
   const claimX=Math.max(7,Math.min(w-7,w*0.3));
   /* queue track inside bar */
   for(const c of [...bar.children]) if(c.name==='queue-track'){
     c.y=h-5;c.resize(Math.max(0.5,claimX-3),4);c.fills=[solid(P.t3,0.22)];out.queue++;
   }
   /* remove old marker parts */
   for(const c of [...plot.children]) if((c.name==='claim-flag'||c.name==='claim-tick')&&Math.abs(c.x-(bx+claimX-3.5))<2){c.remove();out.removed++;}
   if(!plot.children.some(c=>c.name==='claim-tri'&&Math.abs(c.x-(bx+claimX-4.5))<0.5)){
     const tri=figma.createNodeFromSvg('<svg width="9" height="6" viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 0 L9 6 H0 Z" fill="'+P.accent+'"/></svg>');
     tri.name='claim-tri';tri.x=bx+claimX-4.5;tri.y=by+h;plot.appendChild(tri);out.tri++;
   }
  }
 }
}
return out;
