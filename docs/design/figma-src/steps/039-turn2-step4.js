// dsh-task-gantt · Figma build step 39/90
// turn 2 · step 4 · callId call_00_0fiz47jg778cw0b9dme1dygn
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'};
const L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
function findPlotParents(root,out){out=out||[];if(root.name==='plot')out.push(root);for(const c of root.children||[])findPlotParents(c,out);return out;}
let added={bars:0,flags:0};
for(const p of figma.root.children){
 if(!/^0[34]/.test(p.name)) continue;
 const plots=findPlotParents(p,[]);
 for(const plot of plots){
  const parentPanelName=(()=>{let n=plot;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;if(n.name&&n.name.indexOf('亮色')>=0)return 'light';}return 'dark';})();
  const P = (()=>{ let n=plot; while(n&&n.parent&&n.parent.type!=='PAGE'){ n=n.parent; if(n.name&&n.name.indexOf('亮色')>=0) return L; } return D; })();
  for(const bar of [...plot.children]){
   if(bar.type!=='FRAME'||bar.name!=='task') continue;
   if(bar.children.some(c=>c.name==='claim-line')) continue;
   const w=bar.width,h=bar.height;
   const claimX=Math.max(7,Math.min(w-7,w*0.3));
   const queue=figma.createRectangle();queue.name='queue-track';queue.x=3;queue.y=Math.max(1,h-5);queue.resize(Math.max(0.5,claimX-3),3);
   queue.fills=[solid(P.t3,0.16)];bar.appendChild(queue);
   const line=figma.createRectangle();line.name='claim-line';line.x=claimX-1;line.y=0;line.resize(2,h);line.fills=[solid(P.accent,0.9)];bar.appendChild(line);
   added.bars++;
  }
 }
}
return added;
