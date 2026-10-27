// dsh-task-gantt · Figma build step 9/90
// turn 1 · step 50 · callId call_00_5nk2r8xjpsul1umu55nkdshv
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
const page=figma.currentPage;
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const plot=find(page,'plot');
const out=[];
const base={name:'probe',x:10,y:10,w:60,h:20};
try{ const n=figma.createRectangle(); n.name='t1'; n.x=10;n.y=10;n.resize(60,20); n.fills=[{type:'SOLID',color:rgb('#2C2C2E')}]; n.cornerRadius=4; plot.appendChild(n); out.push('plain rect ok'); }catch(e){out.push('plain ERR '+String(e));}
try{ const n=figma.createRectangle(); n.name='t2'; n.x=80;n.y=10;n.resize(60,20); n.fills=[{type:'SOLID',color:rgb('#2C2C2E')}]; n.strokes=[{type:'SOLID',color:rgb('#3A3A3C')}]; n.strokeWeight=1; n.strokeAlign='INSIDE'; n.cornerRadius=4; plot.appendChild(n); out.push('rect+stroke ok'); }catch(e){out.push('stroke ERR '+String(e));}
try{ const n=figma.createRectangle(); n.name='t3'; n.x=150;n.y=10;n.resize(3,20); n.fills=[{type:'SOLID',color:rgb('#2563EB')}]; n.cornerRadius=4; n.topLeftRadius=4; n.bottomLeftRadius=4; n.topRightRadius=0; n.bottomRightRadius=0; plot.appendChild(n); out.push('per-corner ok'); }catch(e){out.push('per-corner ERR '+String(e));}
try{ const n=figma.createRectangle(); n.name='t4'; n.x=10;n.y=50;n.resize(1.5,20); n.fills=[{type:'SOLID',color:rgb('#2563EB')}]; n.strokes=[{type:'SOLID',color:rgb('#2563EB')}]; n.strokeWeight=1; n.strokeAlign='INSIDE'; n.strokeDashes=[2,2]; plot.appendChild(n); out.push('dash ok'); }catch(e){out.push('dash ERR '+String(e));}
return out;
