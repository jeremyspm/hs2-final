import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeUnits,selectNext,record,ready,snapshot,typedMatch} from './rep-engine.mjs';
const html=fs.readFileSync(new URL('./rep.html',import.meta.url),'utf8');
const d=JSON.parse(html.match(/window.REP_DATA = (\{[\s\S]*?\});<\/script>/)[1]);
const units=makeUnits(d.questions);const fresh=()=>({items:{},facts:{},turn:0});
const at=new Date(2026,9,27,12).getTime();
assert.equal(typedMatch('hh',['Hh']),false);
assert.equal(typedMatch('HH',['Hh']),false);
assert.equal(typedMatch('Hh',['Hh']),true);
assert.equal(typedMatch('medulla oblongata',['Medulla Oblongata']),true);
assert.equal(new Set(d.questions.map(q=>q.id)).size,d.questions.length);
assert.equal(d.cases.length,10);
assert.equal(new Set(units.map(u=>u.id)).size,units.length);
assert.equal(units.filter(u=>u.kind==='part').reduce((n,u)=>n+u.facts.length,0),d.facts,'each fact represented once in initial pieces');
assert.equal(new Set(units.filter(u=>u.kind==='part').flatMap(u=>u.facts.map(f=>f.key))).size,d.facts);
for(const c of d.cases){assert.ok(units.some(u=>u.caseId===c.id));assert.equal(c.held.length,0);assert.equal(c.map.length,3);}
for(const q of d.questions){assert.ok(units.some(u=>u.qid===q.id));if(q.short){assert.ok(q.note);assert.ok(q.source);}}
const part=units.find(u=>u.kind==='part'),s=fresh();
record(part,s,part.facts.map(()=>true),{now:at,supported:true});
assert.equal(s.items[part.id].wins,0,'supported rehearsal never counts as independent recall');
assert.deepEqual(s.items[part.id].days,[]);
assert.notEqual(selectNext(units,s,at).id,part.id,'no immediate same-piece repeat');
record(part,s,part.facts.map(()=>true),{now:at+100000});
assert.equal(s.items[part.id].days.length,1);assert.ok(s.items[part.id].due>at+100000);
record(part,s,part.facts.map(()=>true),{now:at+200000});
assert.equal(s.items[part.id].days.length,1,'same-day repeats do not create retained status');
record(part,s,part.facts.map(()=>true),{now:at+864e5});
assert.equal(s.items[part.id].days.length,2);
record(part,s,part.facts.map((_,i)=>i!==0),{now:at+2*864e5});
assert.equal(s.items[part.id].days.length,0,'failure removes retained status');
assert.equal(s.facts[part.facts[0].key].ok,false);assert.equal(s.facts[part.facts[1].key].ok,true);
const whole=units.find(u=>u.kind==='whole'),w=fresh();assert.equal(ready(whole,w),false);
for(const id of whole.requires){const p=units.find(u=>u.id===id);record(p,w,p.facts.map(()=>true),{now:at});}
assert.equal(ready(whole,w),true);
record(whole,w,whole.facts.map((_,i)=>i!==0),{now:at});
assert.equal(w.items[whole.requires[0]].wins,0);assert.ok(w.items[whole.requires[1]].wins>0,'successful components not reopened');
// Simulate a first pass with every new card supported and each return independently recalled.
const sim=fresh();let clock=at;let n=0;let exhausted=false;
while(n++<2500){let u=selectNext(units,sim,clock);if(!u){exhausted=true;break;}const helped=!sim.items[u.id]?.seen&&u.kind!=='whole';record(u,sim,(u.kind==='closed'?[true]:u.facts.map(()=>true)),{now:clock,supported:helped});clock+=1000;}
assert.ok(exhausted,'queue terminates for the day');
const snap=snapshot(units,sim,clock);assert.equal(snap.seen,snap.total,'all material reached, reviews cannot starve new learning');
assert.equal(snap.retained,0,'one-day pass is not multi-day retention');
assert.ok(units.filter(u=>u.kind==='whole').every(u=>sim.items[u.id]?.wins),'complete-answer checks reached');
// Confirm source-sized inheritance assignments independently by brute-force segregation.
function possibilities(parents,affected,dominant){const ids=Object.keys(affected),out=[];function visit(i,assigned){if(i===ids.length){out.push({...assigned});return}const id=ids[i];for(const value of [0,1,2]){if((dominant?value>0:value===2)!==affected[id])continue;const p=parents[id];if(p){const alleles=n=>n===0?[0]:n===1?[0,1]:[1];if(!alleles(assigned[p[0]]).some(a=>alleles(assigned[p[1]]).some(b=>a+b===value)))continue;}assigned[id]=value;visit(i+1,assigned);}}visit(0,{});return Object.fromEntries(ids.map(id=>[id,[...new Set(out.map(o=>o[id]))].sort()]));}
const harris=possibilities({'II1':['I1','I2'],'II2':['I1','I2'],'II3':['I1','I2'],'II4':['I3','I4'],'II5':['I3','I4'],'II6':['I3','I4'],'II7':['I3','I4'],'III1':['II3','II4'],'III2':['II3','II4']},{I1:false,I2:true,I3:false,I4:false,II1:false,II2:false,II3:false,II4:false,II5:true,II6:true,II7:false,III1:false,III2:true},false);
assert.deepEqual(harris,{I1:[0,1],I2:[2],I3:[1],I4:[1],II1:[1],II2:[1],II3:[1],II4:[1],II5:[2],II6:[2],II7:[0,1],III1:[0,1],III2:[2]});
const anderson=possibilities({'II2':['I1','I2'],'II3':['I1','I2'],'II5':['I1','I2'],'III1':['II1','II2'],'III2':['II1','II2'],'III3':['II3','II4'],'III4':['II3','II4'],'III5':['II5','II6'],'III6':['II5','II6']},{I1:false,I2:true,II1:false,II2:false,II3:true,II4:false,II5:true,II6:false,III1:false,III2:false,III3:true,III4:true,III5:true,III6:false},true);
assert.deepEqual(anderson,{I1:[0],I2:[1],II1:[0],II2:[0],II3:[1],II4:[0],II5:[1],II6:[0],III1:[0],III2:[0],III3:[1],III4:[1],III5:[1],III6:[0]});
console.log(`ok: ${d.questions.length} questions; ${d.facts} mapped fact lines; ${units.length} exercises including complete checks; ${n-1} first-day simulated attempts; both pedigree solutions verified`);
