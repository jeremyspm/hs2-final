// Pure queue/progress rules shared by the browser and the checks.
export const dayKey=now=>{const d=new Date(now);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
export function typedMatch(answer,accepted){
 const clean=s=>String(s).normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 const genotype=s=>/^(?:[A-Za-z]{2}|X[\^⁺⁻A-Za-z]+(?:X[\^⁺⁻A-Za-z]+|Y))$/.test(clean(s));
 return accepted.some(key=>genotype(key)?clean(answer)===clean(key):clean(answer).toLowerCase()===clean(key).toLowerCase());
}
export function makeUnits(questions){
 const units=[];
 for(const q of questions){
  if(q.short){
   const facts=q.short.groups.flatMap((g,gi)=>g.facts.map((f,fi)=>({...f,group:g.q,key:`${q.id}:${gi}:${fi}`})));
   // Keep short complete answers together; longer answers are rebuilt in pieces first.
   const chunks=[];if(facts.length<=5)chunks.push(facts);else for(let i=0;i<facts.length;i+=4)chunks.push(facts.slice(i,i+4));
   chunks.forEach((part,i)=>units.push({id:`${q.id}:part:${i}`,qid:q.id,caseId:q.caseId,kind:'part',facts:part,part:i+1,parts:chunks.length}));
   if(chunks.length>1)units.push({id:`${q.id}:whole`,qid:q.id,caseId:q.caseId,kind:'whole',facts,requires:chunks.map((_,i)=>`${q.id}:part:${i}`),chunkSizes:chunks.map(c=>c.length)});
  }else units.push({id:q.id+':closed',qid:q.id,caseId:q.caseId,kind:'closed',facts:[]});
 }
 return units;
}
export function ready(u,s){return !u.requires||u.requires.every(id=>(s.items[id]?.wins||0)>0);}
export function selectNext(units,s,now=Date.now(),caseId='all'){
 const pool=units.filter(u=>(caseId==='all'||u.caseId===caseId)&&ready(u,s));
 const due=pool.filter(u=>s.items[u.id]?.seen&&s.items[u.id].due<=now&&(s.items[u.id].after||0)<=s.turn).sort((a,b)=>s.items[a.id].due-s.items[b.id].due);
 const fresh=pool.filter(u=>!s.items[u.id]?.seen);
 // Two new pieces for every due review while there is unseen material. No starvation either way.
 if(due.length&&(!fresh.length||s.turn%3===2))return due[0];
 if(fresh.length)return fresh[0];
 return due[0]||null;
}
export function record(u,s,correct,{now=Date.now(),supported=false}={}){
 const old=s.items[u.id]||{};const pass=correct.every(Boolean);const cold=pass&&!supported;
 const dates=cold?[...new Set([...(old.days||[]),dayKey(now)])]:(pass?old.days||[]:[]);
 const wins=cold?(old.wins||0)+1:pass?old.wins||0:0;
 const interval=!pass||supported?0:dates.length>=3?3*864e5:dates.length===2?2*864e5:864e5;
 s.turn++;s.items[u.id]={...old,seen:(old.seen||0)+1,wins,days:dates,last:now,due:now+interval,after:s.turn+(!pass||supported?3:0),miss:correct.map((x,i)=>x?-1:i).filter(i=>i>=0)};
 if(u.kind!=='closed')u.facts.forEach((f,i)=>{const p=s.facts[f.key]||{};s.facts[f.key]={seen:(p.seen||0)+1,last:now,ok:!!correct[i],cold:!!correct[i]&&!supported};});
 // A failure on the complete answer reopens the missed component as well.
 if(u.kind==='whole'&&!pass)for(const [part,id] of u.requires.entries()){if(correct.slice(part*4,part*4+4).every(Boolean))continue;const p=s.items[id];if(p){p.due=now;p.after=s.turn+3;p.days=[];p.wins=0;}}
 return {pass,cold,interval};
}
export function snapshot(units,s,now=Date.now()){
 const first=units.filter(u=>u.kind!=='whole');
 return {total:first.length,seen:first.filter(u=>s.items[u.id]?.seen).length,retained:first.filter(u=>(s.items[u.id]?.days?.length||0)>=2).length,due:units.filter(u=>ready(u,s)&&s.items[u.id]?.seen&&s.items[u.id].due<=now).length};
}
