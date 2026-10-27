// dsh-task-gantt · Figma build step 44/90
// turn 2 · step 13 · callId call_00_xidelj7ocwf34jjj282ncw8d
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const D={accent:'#7AAAFF',t3:'#ADB2B8'},L={accent:'#4176E6',t3:'#81858C'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
function solid(h,o){const p={type:'SOLID',color:rgb(h)};if(o!==undefined)p.opacity=o;return p;}
function findPlots(root,out){out=out||[];try{if(root.name==='plot')out.push(root);}catch(e){}for(const c of (root.children||[]))findPlots(c,out);return out;}
function pal(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;try{if(n.name&&n.name.indexOf('亮色')>=0)return L;}catch(e){}}return D;}
const plots=[];for(const p of figma.root.children){ if(/^0[34]/.test(p.name)) findPlots(p,plots); }
let added=0;
for(const plot of plots){
 const P=pal(plot);
 for(const bar of [...plot.children]){
  let name='';try{name=bar.name;}catch(e){continue;}
  if(bar.type!=='FRAME'||name!=='task') continue;
  const w=bar.width,h=bar.height;
  const claimX=Math.max(7,Math.min(w-7,w*0.3));
  const has=bar.children.some(c=>{try{return c.name==='claim-edge-top';}catch(e){return false;}});
  if(has) continue;
  const top=figma.createRectangle();top.name='claim-edge-top';top.x=claimX-0.75;top.y=0;top.resize(1.5,4);top.fills=[solid(P.accent,1)];bar.appendChild(top);
  const bot=figma.createRectangle();bot.name='claim-edge-bottom';bot.x=claimX-0.75;bot.y=h-4;bot.resize(1.5,3.5);bot.fills=[solid(P.accent,1)];bar.appendChild(bot);
  added++;
 }
}
return {added};
