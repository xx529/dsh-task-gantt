// dsh-task-gantt · Figma build step 64/90
// turn 3 · step 7 · callId call_00_ogkn8b9avqcvhl1tzeg236bp
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const LANE=['#2563EB','#A3294F','#558130','#786BA5','#765C19','#9D5C91'];
const P='M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1';
/* data: page -> lane -> [dir, peer] */
const D1=[[['out',1],['in',2],['out',1]], [['in',0],['out',0]], [['in',0],['out',0],['q',0]], [['in',2],['out',2]], [['in',0],['out',0]]];
const D3=[[['out',1],['in',2],['out',1]], [['in',0],['out',0]], [['in',0],['out',3],['q',0]], [['in',2],['out',2]], [['in',0],['out',0]], [['in',0],['out',0]]];
function findPlots(root,out){out=out||[];try{if(root.name==='plot')out.push(root);}catch(e){}for(const c of (root.children||[]))findPlots(c,out);return out;}
function panelBg(node){let n=node;while(n&&n.parent&&n.parent.type!=='PAGE'){n=n.parent;try{if(String(n.name).indexOf('亮色')>=0)return '#FFFFFF';}catch(e){}}return '#232324';}
await Promise.all([figma.loadFontAsync({family:'PingFang SC',style:'Regular'})]);
let rebuilt=0;
for(const p of figma.root.children){
  const isPage01=p.name.startsWith('01');
  const isPage03=p.name.startsWith('03');
  const isPage04=p.name.startsWith('04');
  if(!isPage01&&!isPage03&&!isPage04) continue;
  const data = isPage01?D1:D3;
  for(const plot of findPlots(p,[])){
    const bg=panelBg(plot);
    const targets=[];
    for(const c of [...plot.children]){
      let n='';try{n=c.name;}catch(e){continue;}
      const m=/^msg-(\d+)-(\d+)$/.exec(n);
      if(!m) continue;
      const lane=Number(m[1]), mi=Number(m[2]);
      const row=data[lane]; if(!row||!row[mi]) continue;
      const [dir,peer]=row[mi];
      if(dir==='q') continue;
      targets.push({node:c,lane,mi,dir,peer,x:c.x,y:c.y,w:c.width,h:c.height});
    }
    for(const t of targets){
      t.node.remove();
      const color=LANE[t.peer];
      const rot = t.dir==='in' ? ' transform="matrix(1,0,0,-1,0,13)"' : '';
      const svg='<svg width="'+t.w+'" height="'+t.h+'" viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g'+rot+'><path d="'+P+'" fill="none" stroke="'+bg+'" stroke-width="4.2" stroke-linecap="round"/><path d="'+P+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></g></svg>';
      const n=figma.createNodeFromSvg(svg);n.name='msg-'+t.lane+'-'+t.mi;n.x=t.x;n.y=t.y;plot.appendChild(n);rebuilt++;
    }
  }
}
return {rebuilt};
