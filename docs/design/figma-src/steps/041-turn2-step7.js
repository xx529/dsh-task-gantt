// dsh-task-gantt · Figma build step 41/90
// turn 2 · step 7 · callId call_00_xg6fmh33nssdanhm6k7ce4t0
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'};
const L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function findPlots(root,out){out=out||[];if(root.name==='plot')out.push(root);for(const c of root.children||[])findPlots(c,out);return out;}
function panelPalette(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;if(n.name&&n.name.indexOf('亮色')>=0)return L;}return D;}
let counts={removed:0,rails:0};
for(const p of figma.root.children){
 if(!/^0[34]/.test(p.name)) continue;
 for(const plot of findPlots(p,[])){
  const P=panelPalette(plot);
  for(const bar of [...plot.children]){
   if(bar.type!=='FRAME'||bar.name!=='task') continue;
   for(const c of [...bar.children]) if(c.name==='claim-line'){c.remove();counts.removed++;}
   if(plot.children.some(c=>c.name==='claim-rail'&&Math.abs(c.x-bar.x)<0.2&&Math.abs(c.y-bar.y)<0.2)) continue;
   const w=bar.width, h=bar.height, bx=bar.x, by=bar.y;
   const claimX=Math.max(7,Math.min(w-7,w*0.3));
   const rail=figma.createRectangle();rail.name='claim-rail';rail.x=bx;rail.y=by+h+3;rail.resize(w,1);rail.fills=[solid(P.t3,0.18)];plot.appendChild(rail);
   const tick=figma.createRectangle();tick.name='claim-tick';tick.x=bx+claimX-1;tick.y=by+h-1;tick.resize(2,6);tick.fills=[solid(P.accent,1)];plot.appendChild(tick);
   const tri=figma.createNodeFromSvg('<svg width="7" height="5" viewBox="0 0 7 5" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 0 L7 5 H0 Z" fill="'+P.accent+'"/></svg>');
   tri.name='claim-flag';tri.x=bx+claimX-3.5;tri.y=by+h+1;plot.appendChild(tri);
   counts.rails++;
  }
 }
}
return counts;
