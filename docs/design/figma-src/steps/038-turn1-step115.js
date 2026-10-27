// dsh-task-gantt · Figma build step 38/90
// turn 1 · step 115 · callId call_00_k9kn2w8sssbqsj6my385n2kw
// recorded outcome: ok
// Replay via the DSH ↔ Figma local bridge: send this file's body as `code` to use_figma.

function walk(n,out){ if(n.type==='TEXT' && typeof n.characters==='string') out.push(n); for(const c of n.children||[]) walk(c,out); return out; }
await figma.loadFontAsync({family:'PingFang SC',style:'Regular'});
await figma.loadFontAsync({family:'JetBrains Mono',style:'Regular'});
const texts=[]; for(const p of figma.root.children) walk(p,texts);
const changed=[];
for(const t of texts){
 if(t.characters.includes('515px')){ t.characters=t.characters.replace('515px','约 500px'); changed.push('515'); }
 else if(t.characters.includes('约 490px')){ t.characters=t.characters.replace('约 490px','约 500px'); changed.push('490'); }
}
return {changed, count:changed.length};
