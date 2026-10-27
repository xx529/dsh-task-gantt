// dsh-task-gantt · Figma build step 43/90
// turn 2 · step 11 · callId call_00_mcibxsee1v3hvnv4t3wopqtq
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'},L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function findPlots(root,out){out=out||[];try{if(root.name==='plot')out.push(root);}catch(e){}for(const c of (root.children||[]))findPlots(c,out);return out;}
function pal(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;try{if(n.name&&n.name.indexOf('亮色')>=0)return L;}catch(e){}}return D;}
const plots=[];
for(const p of figma.root.children){ if(/^0[34]/.test(p.name)) findPlots(p,plots); }
/* pass 1: remove legacy markers and duplicate claim-tri */
let removed=0;
for(const plot of plots){
 for(const c of [...plot.children]){
  try{ if(c.name==='claim-flag'||c.name==='claim-tick'){ c.remove(); removed++; } }catch(e){}
 }
}
/* pass 2: per bar ensure queue + triangle */
let tri=0,queue=0;
for(const plot of plots){
 const P=pal(plot);
 for(const bar of [...plot.children]){
  let name=''; try{name=bar.name;}catch(e){continue;}
  if(bar.type!=='FRAME'||name!=='task') continue;
  const w=bar.width,h=bar.height,bx=bar.x,by=bar.y;
  const claimX=Math.max(7,Math.min(w-7,w*0.3));
  for(const c of [...bar.children]){
   let n=''; try{n=c.name;}catch(e){continue;}
   if(n==='queue-track'){ c.y=h-5; c.resize(Math.max(0.5,claimX-3),4); c.fills=[solid(P.t3,0.22)]; queue++; }
  }
  let has=false;
  for(const c of [...plot.children]){
   let n=''; try{n=c.name;}catch(e){continue;}
   if(n==='claim-tri' && Math.abs(c.x-(bx+claimX-4.5))<0.6 && Math.abs(c.y-(by+h))<0.6){ has=true; break; }
  }
  if(!has){
   const t=figma.createNodeFromSvg('<svg width="9" height="6" viewBox="0 0 9 6" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 0 L9 6 H0 Z" fill="'+P.accent+'"/></svg>');
   t.name='claim-tri'; t.x=bx+claimX-4.5; t.y=by+h; plot.appendChild(t); tri++;
  }
 }
}
return {removed,tri,queue,plots:plots.length};
