import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadShorts} from './shorts.mjs';
import {LESSON_NOTES, CASE_MAPS, SUPPLEMENTS} from './content/rep-lessons.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bank=JSON.parse(html.match(/const DATA = (\{[\s\S]*?\});\r?\n/)[1]);
const {shorts,fails}=loadShorts(bank.questions);
if(fails.length)throw Error(fails.join('\n'));
const ids=new Set([...bank.core.a,...bank.mock.pool.map(q=>q.id)]);
const cases=bank.focus.filter(f=>/^case-c/.test(f.id)).map(f=>({id:f.id.replace('case-',''),title:f.t,scope:f.done,tip:f.ask,held:f.held||[],map:CASE_MAPS[f.id.replace('case-','')]}));
const caseFor=q=>cases.filter(c=>bank.focus.find(f=>f.id==='case-'+c.id).qs?.includes(q.id)).map(c=>c.id);
const questions=bank.questions.filter(q=>ids.has(q.id)).map(q=>{
 const s=shorts[q.id]; const c=caseFor(q); let caseId=q.quiz.startsWith('case-')?q.quiz.slice(5):c[0];
 if(!caseId)caseId=({lymph:'c2',resp:'c4',cvs:'c3',endo:'c6',ms:'c8',ns:'c9',repro:'c13',gen:'c15',senses:'c14'})[q.sys];
 if(!caseId)throw Error('Unmapped question '+q.id);
 if(q.saq&&!s)throw Error('Missing short '+q.id);
 if(s&&!LESSON_NOTES[s.title])throw Error('Missing explanation '+s.title);
 return {...q,caseId,short:s,note:s?LESSON_NOTES[s.title]:null,source:q.saq?.src||bank.quizzes.find(z=>z.id===q.quiz)?.name||'Hannetjie’s case revision'};
});
for(const q of SUPPLEMENTS){if(questions.some(x=>x.id===q.id))throw Error('Duplicate '+q.id);questions.push(q);}
for(const q of questions){
 if(['Does BGL leave the normal range?','Overnight and the morning'].includes(q.short?.title))q.imgs=['wb26-bgl-day.png'];
 if(['Why the hormones change','Pregnancy and the hormone graph'].includes(q.short?.title))q.imgs=['wb26-cycle.png'];
}
// The first pass follows the booklet, with its original questions before extra revision.
const order=new Map(cases.map((c,i)=>[c.id,i]));
questions.sort((a,b)=>(Number(a.mod!=='cases'&&!a.supplement)-Number(b.mod!=='cases'&&!b.supplement))||(order.get(a.caseId)-order.get(b.caseId))||Number(!a.short)-Number(!b.short));
// Keep the old key available in the source panel; do not drill an overbroad BBB rule.
const ld=questions.find(q=>q.short?.title==='Why levodopa, not dopamine');
if(ld){ld.short=structuredClone(ld.short);ld.short.groups[0].facts[1]={...ld.short.groups[0].facts[1],t:'**Levodopa** uses an **amino-acid transporter** to cross the blood–brain barrier.',fix:'Clarifies the old key: lipid solubility is not the only route across. Source: NCBI Basic Neurochemistry, Blood–Brain Barrier, https://www.ncbi.nlm.nih.gov/books/NBK28180/'};}
const assets=new Set();
for(const q of questions){
 for(const f of [...q.imgs||[],...[...(q.qh||'').matchAll(/\[\[IMG:([^\]]+)\]\]/g)].map(m=>m[1])])assets.add(f.includes('/')?f:'img/'+f);
 for(const r of q.refs||[])if(r.slide)assets.add(r.slide.includes('/')?r.slide:'img/slides/'+r.slide);
 if(q.short)for(const g of q.short.groups)for(const f of g.facts)if(!f.t||!f.of?.length)throw Error('Unmapped fact '+q.id);
}
for(const f of assets)if(!fs.existsSync(path.resolve(root,f)))throw Error('Missing image '+f);
const solved=new Set(SUPPLEMENTS.map(q=>q.heldKey));
for(const c of cases)c.held=c.held.filter((_,i)=>!solved.has(c.id+':'+i));
const d={version:1,cases,questions,originalCount:ids.size,facts:questions.reduce((n,q)=>n+(q.short?.groups.flatMap(g=>g.facts).length||0),0)};
const json=JSON.stringify(d).replace(/<\//g,'<\\/');
const out=fs.readFileSync(path.join(root,'rep.template.html'),'utf8').replace('/*@REP_DATA@*/',()=>json);
fs.writeFileSync(path.join(root,'rep.html'),out);
console.log(`rep.html: ${questions.length} source questions, ${d.facts} written fact lines, ${assets.size} figures, ${cases.reduce((n,c)=>n+c.held.length,0)} unresolved questions`);
