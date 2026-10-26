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
 // Due first, as in Anki (27 Oct 2026, drilled): a piece waiting on its next hit comes back as soon as three other
 // pieces have passed (the `after` gate), and new pieces fill the gaps. Locked days leave the queue until their date,
 // so new learning is never starved for long.
 if(due.length)return due[0];
 return fresh[0]||null;
}
/* Drilled, two layers (27 Oct 2026: "it needs multiple consecutive correct hits over a single session or day before it
   even gets climbed for the day, then a bigger meta layer where multiple days need to be consecutively correct", and
   "this needs to be DRILLED into our heads"). A day counts only after DAY_HITS from-memory passes in a row that day, a
   few pieces apart (each pass short of that comes back after three other pieces). Counted days space out 1, 2, then
   3 days; SOLID counted days in a row is solid. Any miss empties both: the day's hits and the run of days. Help (the
   ladder, the explanation) is neither a hit nor a miss. */
export const DAY_HITS=2;
export function record(u,s,correct,{now=Date.now(),supported=false}={}){
 const old=s.items[u.id]||{};const pass=correct.every(Boolean);const cold=pass&&!supported;const today=dayKey(now);
 let hits=old.hitsDay===today?old.hits||0:0,dates=old.days||[],locked=false;
 if(!pass){hits=0;dates=[];}
 else if(cold&&++hits>=DAY_HITS){locked=true;hits=0;if(!dates.includes(today))dates=[...dates,today];}
 const wins=cold?(old.wins||0)+1:pass?old.wins||0:0;
 const interval=!locked?0:dates.length>=3?3*864e5:dates.length===2?2*864e5:864e5;
 s.turn++;s.items[u.id]={...old,first:old.first||now,seen:(old.seen||0)+1,wins,days:dates,hits,hitsDay:today,last:now,due:now+interval,after:s.turn+(locked?0:3),miss:correct.map((x,i)=>x?-1:i).filter(i=>i>=0)};
 if(u.kind!=='closed')u.facts.forEach((f,i)=>{const p=s.facts[f.key]||{};s.facts[f.key]={seen:(p.seen||0)+1,last:now,ok:!!correct[i],cold:!!correct[i]&&!supported};});
 // A failure on the complete answer reopens the missed component as well.
 if(u.kind==='whole'&&!pass)for(const [part,id] of u.requires.entries()){if(correct.slice(part*4,part*4+4).every(Boolean))continue;const p=s.items[id];if(p){p.due=now;p.after=s.turn+3;p.days=[];p.wins=0;}}
 return {pass,cold,interval,hits,locked,days:dates.length};
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
// Spelling leniency (same evening: "there needs to be some leniency with the spelling"). British and American spellings
// meet (oedema/edema, haemoglobin/hemoglobin); a slip of one letter passes from 4 letters up, of two letters from 8 up
// when the first four agree; a key term of three or more words may miss one word (never a number). Never lenient
// across OPPOSITES, the pairs the marks hang on, nor on numbers or genotypes.
// Word endings are compared by stripping a common suffix, not by a shared start: until this evening any two words
// sharing their first five letters passed, so glycogen stood in for glycogenesis, glucose for gluconeogenesis and
// neuron for neurotransmitter. A swapped pair of letters counts as one slip (ovualtion).
const OPPOSITES=[['hyper','hypo'],['intra','inter'],['af','ef'],['ab','ad'],['in','ex'],['endo','exo'],['pre','post'],
  ['ana','cata'],['sym','para'],['de','in'],['ilium','ileum'],['ante','anti'],['grandf','grandm'],['inhibin','inhibit']];
const brit=w=>w.replace(/ae|oe/g,'e');
const stem=w=>w.length>5?w.replace(/(?:ations?|ions?|ings?|ated|ed|es|s|al|ic|ally|ly|ity)$/,''):w;
function osa(a,b){const d=[...Array(a.length+1)].map((_,i)=>[i,...Array(b.length).fill(0)]);for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);}
 return d[a.length][b.length];}
const near=(a,b,n,min=5)=>Math.min(a.length,b.length)>=min&&a[0]===b[0]&&Math.abs(a.length-b.length)<=1&&osa(a,b)<=n;
export function sameWord(a,b){
 if(a===b)return true;
 if(/\d/.test(a)||/\d/.test(b))return false;
 for(const [p,q] of OPPOSITES)if(a.startsWith(p)&&b.startsWith(q)||a.startsWith(q)&&b.startsWith(p))return false;
 a=brit(a);b=brit(b);if(a===b)return true;
 if(a.length>3&&b.length>3&&a.replace(/e?s$/,'')===b.replace(/e?s$/,''))return true;
 const sa=stem(a),sb=stem(b);if(sa===sb)return true;
 if(near(a,b,1)||near(sa,sb,1,6))return true;
 // a short word may drop or gain one letter (cels → cells), never swap one (node ≠ none)
 if(Math.min(a.length,b.length)>=4&&Math.abs(a.length-b.length)===1&&a[0]===b[0]&&osa(a,b)===1)return true;
 return Math.min(a.length,b.length)>=9&&a.slice(0,4)===b.slice(0,4)&&Math.abs(a.length-b.length)<=2&&osa(a,b)<=2;
}
export const keyTerms=f=>[...f.t.matchAll(/\*\*(.+?)\*\*/g)].map(m=>m[1]);
export function termFound(term,text){
 const t=clean(term).trim();
 if(GENO.test(t.replace(/\s+/g,'')))return clean(text).split(/[\s,;:.()/]+/).includes(t.replace(/\s+/g,''));
 const all=toks(t),sig=all.filter(w=>!STOP.has(w)),need=sig.length?sig:all,have=toks(text);
 const missed=need.filter(w=>!have.some(x=>sameWord(w,x)));
 return need.length>0&&(missed.length===0||need.length>=3&&missed.length===1&&!/\d/.test(missed[0]));
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
// Solid (same evening: "like anki, it needs consecutive attempts spaced out before it is solidified"): recalled from
// memory, no help, on SOLID different days in a row. A miss empties the run of days (record), so it starts again.
export const SOLID=3;
export function snapshot(units,s,now=Date.now()){
 const first=units.filter(u=>u.kind!=='whole');
 return {total:first.length,seen:first.filter(u=>s.items[u.id]?.seen).length,retained:first.filter(u=>(s.items[u.id]?.days?.length||0)>=SOLID).length,due:units.filter(u=>ready(u,s)&&s.items[u.id]?.seen&&s.items[u.id].due<=now).length};
}
