// dsh-task-gantt · Figma build step 58/90
// turn 2 · step 42 · callId call_00_srrkoo9a0xnni231jwb9rdjb
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function find(root,name){if(root.name===name)return root;for(const c of root.children||[]){const r=find(c,name);if(r)return r;}return null;}
await figma.loadFontAsync({family:'PingFang SC',style:'Regular'});
const p0=figma.root.children.find(p=>p.name.startsWith('00'));
await figma.setCurrentPageAsync(p0);
const doc0=p0.children[0];
const c2=find(doc0,'col-2-body');
if(c2){ c2.characters='1. 01 现状重建（按 v0.2.38 源码）\n2. 02 问题走查：P0 / P1 / P2 共 24 条\n3. 03 改版主界面：暗色 + 亮色\n4. 04 状态与交互（空/错误/冻结态）\n5. 05 任务 / 消息 / 问题详情 + 认领时刻\n6. 06 组件、令牌与字号规范'; }
const p6=figma.root.children.find(p=>p.name.startsWith('06'));
const doc6=p6.children[0];
if(doc6&&doc6.name==='page 05 doc') doc6.name='page 06 doc';
return {ok:true};
