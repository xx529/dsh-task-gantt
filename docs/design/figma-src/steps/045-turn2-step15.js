// dsh-task-gantt · Figma build step 45/90
// turn 2 · step 15 · callId call_00_yp9u9utf5m0v0l485yooxodu
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'},L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function findPlots(root,out){out=out||[];try{if(root.name==='plot')out.push(root);}catch(e){}for(const c of (root.children||[]))findPlots(c,out);return out;}
function pal(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;try{if(n.name&&n.name.indexOf('亮色')>=0)return L;}catch(e){}}return D;}
const plots=[];for(const p of figma.root.children){ if(/^0[34]/.test(p.name)) findPlots(p,plots); }
let cleaned=0,built=0;
for(const plot of plots){
 const P=pal(plot);
 /* remove old under-bar pieces */
 for(const c of [...plot.children]){
  let n='';try{n=c.name;}catch(e){continue;}
  if(n==='claim-tri'||n==='claim-tick'||n==='claim-flag'||n==='claim-rail'||n==='claim-run'||n==='claim-idle'||n==='claim-cut'){ c.remove(); cleaned++; }
 }
 for(const bar of [...plot.children]){
  let name='';try{name=bar.name;}catch(e){continue;}
  if(bar.type!=='FRAME'||name!=='task') continue;
  for(const c of [...bar.children]){
   let n='';try{n=c.name;}catch(e){continue;}
   if(n==='queue-track'||n==='claim-edge-top'||n==='claim-edge-bottom'){ c.remove(); cleaned++; }
  }
  const w=bar.width,h=bar.height,bx=bar.x,by=bar.y;
  const claimX=Math.max(8,Math.min(w-8,w*0.3));
  const y=by+h+2.5;
  const idle=figma.createRectangle();idle.name='claim-idle';idle.x=bx+3;idle.y=y;idle.resize(Math.max(0.5,claimX-3),2.5);idle.fills=[solid(P.t3,0.3)];plot.appendChild(idle);
  const run=figma.createRectangle();run.name='claim-run';run.x=bx+claimX;run.y=y;run.resize(Math.max(0.5,w-claimX-1),2.5);run.fills=[solid(P.accent,0.55)];plot.appendChild(run);
  const cut=figma.createRectangle();cut.name='claim-cut';cut.x=bx+claimX-1;cut.y=by+h+0.5;cut.resize(2,7);cut.fills=[solid(P.accent,1)];plot.appendChild(cut);
  built++;
 }
}
return {cleaned,built,plots:plots.length};
