// dsh-task-gantt · Figma build step 13/90
// turn 1 · step 56 · callId call_00_oj3uj196hy4ybwh0v3stf87s
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

const C={lane0:'#2563EB',lane1:'#A3294F',lane2:'#558130',lane3:'#786BA5',lane4:'#765C19',bg1:'#232324'};
function rgb(h){h=h.replace('#','');return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};}
const sym={plus:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M4 1.2 V6.8 M1.2 4 H6.8" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/></svg>`,play:(c)=>`<svg width="7" height="8" viewBox="0 0 7 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 0.9 L6.2 4 L1.2 7.1 Z" fill="${c}"/></svg>`,check:(c)=>`<svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M1.2 4.2 L3.1 6.1 L6.8 1.9" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`};
function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
const plot=find(figma.currentPage,'plot');
let removed=0;
for(const c of [...plot.children]){ if(/^task-ev-/.test(c.name)){ c.remove(); removed++; } }
const tasks=[
 ['0',C.lane0,[{a:30,b:300,ev:['c','p','k']},{a:700,b:null,ev:['c']}]],
 ['1',C.lane1,[{a:120,b:440,ev:['c','p','k']},{a:800,b:1100,ev:['c','p','k']}]],
 ['2',C.lane2,[{a:430,b:700,ev:['c','p','k']},{a:760,b:null,ev:['c']}]],
 ['3',C.lane3,[{a:560,b:700,ev:['c','p','k']},{a:780,b:1100,ev:['c','p','k']}]],
 ['4',C.lane4,[{a:980,b:null,ev:['c']}]]
];
const X0=138,SEC=4,NOW=1200,HEAD_W=132;
const px=s=>X0+s/SEC;
let made=0;
for(const [idx,color,list] of tasks){
 for(let ti=0;ti<list.length;ti++){
  const t=list[ti];const by=Number(idx)*72+30;const end=t.b===null?NOW:t.b;
  t.ev.forEach((ev,ei)=>{
    const off=[0,10,end-t.a][ei];
    const x=px(t.a+off)-HEAD_W;
    const mk=ev==='c'?sym.plus(color):(ev==='p'?sym.play(color):sym.check(color));
    const n=figma.createNodeFromSvg(mk);n.name='task-ev-'+idx+'-'+ti+'-'+ei;n.x=x;n.y=by+22;plot.appendChild(n);made++;
  });
 }
}
figma.viewport.scrollAndZoomIntoView([plot]);
return {removed,made};
