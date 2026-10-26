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
 s.turn++;s.items[u.id]={...old,first:old.first||now,seen:(old.seen||0)+1,wins,days:dates,last:now,due:now+interval,after:s.turn+(!pass||supported?3:0),miss:correct.map((x,i)=>x?-1:i).filter(i=>i>=0)};
 if(u.kind!=='closed')u.facts.forEach((f,i)=>{const p=s.facts[f.key]||{};s.facts[f.key]={seen:(p.seen||0)+1,last:now,ok:!!correct[i],cold:!!correct[i]&&!supported};});
 // A failure on the complete answer reopens the missed component as well.
 if(u.kind==='whole'&&!pass)for(const [part,id] of u.requires.entries()){if(correct.slice(part*4,part*4+4).every(Boolean))continue;const p=s.items[id];if(p){p.due=now;p.after=s.turn+3;p.days=[];p.wins=0;}}
 return {pass,cold,interval};
}
// Typed marking (27 Oct 2026: "shouldn't it all be typed?"). Every fact line carries its key words in **bold**; a point
// counts when each of its key words is in the typed answer. Forgiving on endings, plurals and one-letter typos, never on
// the distinctions the marks hang on: hyper/hypo and afferent/efferent differ in their first letters or by two, numbers
// must match exactly, and a genotype (Hh, hh, XᴿXʳ) must match exactly, capitals included.
const STOP=new Set('a an the of to in on and or for by with is are be it its at as from into that this than then their they them was were has have not can may will'.split(' '));
const GENO=/^(?:([A-Za-z])\1|X\S+(?:X\S+|Y))$/i;
const clean=s=>String(s).normalize('NFKC').replace(/[’‘]/g,"'");
const toks=s=>clean(s).toLowerCase().split(/[^\p{L}\p{N}+]+/u).filter(t=>/[\p{L}\p{N}]/u.test(t));
function lev(a,b){let p=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
export function sameWord(a,b){
 if(a===b)return true;
 if(/\d/.test(a)||/\d/.test(b))return false;
 if(a.length>3&&b.length>3&&a.replace(/e?s$/,'')===b.replace(/e?s$/,''))return true;
 const m=Math.min(a.length,b.length);let p=0;while(p<m&&a[p]===b[p])p++;
 if(m>=5&&p>=Math.max(5,m-2))return true;
 return m>=6&&a.slice(0,2)===b.slice(0,2)&&Math.abs(a.length-b.length)<=1&&lev(a,b)<=1;
}
export const keyTerms=f=>[...f.t.matchAll(/\*\*(.+?)\*\*/g)].map(m=>m[1]);
export function termFound(term,text){
 const t=clean(term).trim();
 if(GENO.test(t.replace(/\s+/g,'')))return clean(text).split(/[\s,;:.()/]+/).includes(t.replace(/\s+/g,''));
 const all=toks(t),sig=all.filter(w=>!STOP.has(w)),need=sig.length?sig:all,have=toks(text);
 return need.length>0&&need.every(w=>have.some(x=>sameWord(w,x)));
}
export const markFacts=(facts,text)=>facts.map(f=>{const terms=keyTerms(f).map(t=>({t,found:termFound(t,text)}));return {ok:terms.every(x=>x.found),terms};});
// The pace: new pieces a day to have met every one by the last day before the exam. Today's target holds still while
// you work through it (it counts today's new pieces back in).
export function pace(units,s,now,last){
 const first=units.filter(u=>u.kind!=='whole'),today=dayKey(now);
 const left=first.filter(u=>!s.items[u.id]?.seen).length;
 const done=first.filter(u=>s.items[u.id]?.first&&dayKey(s.items[u.id].first)===today).length;
 const [y,m,d]=last.split('-').map(Number),a=new Date(now);a.setHours(0,0,0,0);
 const days=Math.max(1,Math.round((new Date(y,m-1,d)-a)/864e5)+1);
 return {left,done,days,target:Math.ceil((left+done)/days)};
}
export function snapshot(units,s,now=Date.now()){
 const first=units.filter(u=>u.kind!=='whole');
 return {total:first.length,seen:first.filter(u=>s.items[u.id]?.seen).length,retained:first.filter(u=>(s.items[u.id]?.days?.length||0)>=2).length,due:units.filter(u=>ready(u,s)&&s.items[u.id]?.seen&&s.items[u.id].due<=now).length};
}
