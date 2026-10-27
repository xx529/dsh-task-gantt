// dsh-task-gantt · Figma build step 40/90
// turn 2 · step 5 · callId call_00_jtl0f5mo2m1bd2607aj5uevq
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
let dark=null,light=null;
for(const p of figma.root.children){ if(!p.name.startsWith('03')) continue; dark=find(p,'03 · 改版 · 暗色 480×580'); light=find(p,'03 · 改版 · 亮色 480×580'); }
return {dark:dark?dark.id:null,light:light?light.id:null};
