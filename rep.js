import {makeUnits,selectNext,record,snapshot,ready,typedMatch,keyTerms,markFacts,termFound,pace} from './rep-engine.mjs?v=20261027b';
/* Learn the cases (27 Oct 2026, second pass). Everything is typed and marked by the page, never ticked on trust: a new
   piece is read, then its key words are typed into blanks; it comes back a few pieces later to be written out whole,
   marked on its key words. Her starred case questions come first and set the pace; her revision deck and quizzes are
   an opt-in second tier. */
const D=window.REP_DATA,Q=new Map(D.questions.map(q=>[q.id,q]));
const ALL=makeUnits(D.questions);
for(const u of ALL){const q=Q.get(u.qid);u.core=q.mod==='cases'||!!q.supplement;}
const EXAM='2026-11-04',LAST='2026-11-03',ROUND=12;
/* each case wears its body system's colour, the same hues as the sim's system tags */
const CC={c2:'hsl(140 55% 58%)',c3:'hsl(199 89% 64%)',c4:'hsl(199 89% 64%)',c6:'hsl(158 64% 52%)',c8:'hsl(28 90% 62%)',
  c9:'hsl(268 80% 74%)',c10:'hsl(268 80% 74%)',c13:'hsl(335 85% 72%)',c14:'hsl(38 92% 62%)',c15:'hsl(300 70% 72%)'};
const KEY='hs2f.relearn.v1';
let storeError=false,state;
try{state=JSON.parse(localStorage.getItem(KEY))}catch{}
if(!state||state.version!==1||typeof state.items!=='object'||typeof state.facts!=='object')state={version:1,items:{},facts:{},turn:0,intros:{},filter:'all',active:null};
state.intros ||= {};state.turn ||= 0;state.filter ||= 'all';state.extras=!!state.extras;
/* a run saved by the first version: its say-the-gaps stage is now typed blanks, its self-ticked check restarts at the prompt */
if(state.active?.stage==='gaps')state.active.stage='cloze';
if(state.active?.stage==='mark'&&!state.active.marks)state.active.stage='recall';
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));storeError=false}catch{storeError=true;}};
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bold=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const img=f=>f.includes('/')?f:'img/'+f;
const units=()=>state.extras?ALL:ALL.filter(u=>u.core);
const caseOf=id=>D.cases.find(c=>c.id===id);
const caseName=id=>caseOf(id)?.title.replace(/^Exam case (\d+) · .*/,'Case $1')||'Revision';
const caseTitle=c=>c.title.replace(/^Exam case \d+ · /,'');
const shuffled=a=>a.map(x=>({x,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.x);
const normal=s=>String(s).normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
// Preserve genotype capitals. Case-insensitive grading is unsafe for Hh versus hh.
const same=(a,b)=>normal(a)===normal(b);
const title=q=>q.short?.title||'Her quiz question';
const day=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const daysTo=s=>{const t=new Date();t.setHours(0,0,0,0);return Math.round((day(s)-t)/864e5)};
let run=null,sessionCount=0;

/* ── header: theme shared with the Paper Sim (hs2f.theme), countdown to the sitting ── */
$('#themeBtn').onclick=()=>{const r=document.documentElement,to=r.dataset.theme==='light'?'':'light';
  to?r.dataset.theme='light':delete r.dataset.theme;try{localStorage.setItem('hs2f.theme',JSON.stringify(to))}catch{}};
const when=()=>{const n=daysTo(EXAM);return n>1?`${n} days to Wed 4 Nov`:n===1?'Exam tomorrow':n===0?'Exam today':''};
$('#countdown').textContent=when();

function mount(html){app.innerHTML=html+(storeError?'<p class="notice" role="alert">This browser could not save progress. Keep this tab open and export progress from the home screen.</p>':'');window.scrollTo(0,0);}
const btn=(id,text,cls='primary wide')=>`<button id="${id}" class="btn ${cls}">${text}</button>`;
function figures(q){return (q.imgs||[]).map(f=>`<figure class="figure"><a href="${esc(img(f))}" target="_blank" rel="noopener"><img src="${esc(img(f))}" alt="${esc(title(q))}, her figure"></a><figcaption>Her figure · tap to enlarge</figcaption></figure>`).join('');}
function source(q){return `<details class="fold"><summary>Her full question and where the answer is from</summary><p>${esc(q.qt||q.q)}</p><p class="source">${esc(q.source)}${q.supplement?' · A compiled study answer, kept apart from Hannetjie’s own keys.':''}</p>${q.saq?.steps?`<ol>${q.saq.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}</details>`;}
function refs(q){return (q.refs||[]).slice(0,3).map(r=>r.slide?`<figure class="figure"><img src="${esc(r.slide.includes('/')?r.slide:'img/slides/'+r.slide)}" alt="${esc(r.src)}"><figcaption>${esc(r.src)}</figcaption></figure>`:r.t?`<p>${esc(r.t)}<br><span class="source">${esc(r.src)}</span></p>`:'').join('');}
function support(q){return `<details class="fold" id="extraHelp"><summary>Stuck? Show the explanation (counts as help)</summary><p>${esc(q.note||'Read her answer below, then try again later.')}</p>${refs(q)}</details>`;}
function hookHelp(){const e=$('#extraHelp');if(e)e.addEventListener('toggle',()=>{if(e.open){run.assisted=true;persist();}});}
function persist(){state.active={...run};save();}

/* ── home ── */
function home(){
 run=null;const U=units(),s=snapshot(U,state),p=pace(U,state,Date.now(),LAST),n=daysTo(EXAM);
 const active=state.active&&U.some(u=>u.id===state.active.id);
 const core=ALL.filter(u=>u.core&&u.kind!=='whole').length,extra=ALL.filter(u=>!u.core).length;
 const met=p.done>=p.target;
 const paceLine=p.left===0
   ?(state.extras?'Every piece is in. From here it’s reviews: clear the due ones each day.':'Every case piece is in. Add her revision deck and quizzes below when you want more.')
   :met?`Today’s <b>${p.target}</b> are done. Reviews keep them; more new pieces put you ahead.`
   :`<b>${p.target} new a day</b> meets all ${s.total} by Tue 3 Nov.${p.left<s.total?` ${p.left} still to meet.`:''}`;
 mount(`<div class="idcard"><span class="idic" aria-hidden="true">🧠</span><span class="idtx"><small>Health Science 2 · 722.541</small><b>Learn the cases</b><span>Her 10 starred cases · read it, type it, it comes back</span>${n>=0?`<span class="idwhen">${n===0?'Your sitting is today':`${n} day${n===1?'':'s'} to your sitting · 4 Nov`}</span>`:''}</span></div>
 <div class="card today"><div class="k">Today</div>
  <div class="nums"><div><strong>${p.done}<i>/${p.target}</i></strong><span>new pieces</span></div><div><strong>${s.due}</strong><span>back for review</span></div><div><strong>${s.retained}<i>/${s.total}</i></strong><span>kept 2+ days</span></div></div>
  <div class="bar"><i style="width:${p.target?Math.min(100,100*p.done/p.target):100}%"></i></div>
  <p class="pace">${paceLine}</p>
  ${btn('begin',active?'Carry on where you stopped':'Start a round of 12')}
 </div>
 <div class="chips"><button class="chip ${state.extras?'':'on'}" id="coreOnly">Her case questions · ${core}</button><button class="chip ${state.extras?'on':''}" id="addExtras">+ Revision deck and quizzes · ${extra}</button></div>
 <p class="small muted">The case questions are the exam. The revision deck and her quizzes are extra practice, after them.</p>
 <div class="lsec">The ten cases</div>
 ${D.cases.map(c=>{const sub=U.filter(u=>u.caseId===c.id),v=snapshot(sub,state);return `<button class="lrow${v.seen===v.total?' done':''}" data-case="${c.id}" style="--cc:${CC[c.id]}"><span class="lic">${c.id.slice(1)}</span><span class="ltx"><b>${esc(caseTitle(c))}</b><small>${v.seen}/${v.total} met · ${v.retained} kept${v.due?` · ${v.due} back`:''}</small><span class="bar"><i style="width:${v.total?100*v.seen/v.total:0}%"></i></span></span><span class="lch">›</span></button>`}).join('')}
 <div class="tools">${btn('reviewOnly',`Reviews only${s.due?` · ${s.due}`:''}`,'ghost sm')}${btn('export','Export progress','ghost sm')}${btn('import','Import progress','ghost sm')}<input id="importFile" type="file" accept="application/json" hidden></div>
 <details class="fold"><summary>How this works</summary>
  <p><b>New piece:</b> read her answer and why it works, then type the key words into the blanks. The page marks them.</p>
  <p><b>A few pieces later</b> it comes back blank: write the whole thing from memory, the way you will in Echoexam. A point counts when its key words are in your answer. Spelling slips and word endings are fine; hyper/hypo, afferent/efferent, numbers and genotype capitals are not.</p>
  <p><b>Got it with no help:</b> back tomorrow, then in 2 days, then 3. <b>Missed it:</b> back in a few pieces. Long answers are learned in pieces of four points, then written out whole.</p>
  <p class="source">${D.originalCount} of her questions plus ${D.questions.filter(q=>q.supplement).length} compiled study answers (the held questions and the male-pill research prompt), ${D.facts} marking points. “Kept” means written from memory on 2+ different days; it isn’t an exam mark. Progress is separate from your Paper Sim scores.</p>
 </details>`);
 $('#begin').onclick=()=>{sessionCount=0;if(active){run={...state.active};render()}else{state.filter='all';save();next()}};
 $('#coreOnly').onclick=()=>{state.extras=false;state.active=null;save();home()};
 $('#addExtras').onclick=()=>{state.extras=true;save();home()};
 document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.case;state.active=null;save();sessionCount=0;next()});
 $('#reviewOnly').onclick=()=>{const pool=U.filter(u=>ready(u,state)&&state.items[u.id]?.seen&&state.items[u.id].due<=Date.now()).sort((a,b)=>state.items[a.id].due-state.items[b.id].due);sessionCount=0;if(pool.length)open(pool[0]);else info('Nothing due yet','Pieces come back a few turns after a miss, and a day or more after you get them from memory. Meet new pieces for now.');};
 $('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hs2-recall-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#import').onclick=()=>$('#importFile').click();
 $('#importFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(x.version!==1||!x.items||!x.facts||!Number.isFinite(x.turn))throw Error('Unsupported progress file');for(const u of ALL){const incoming=x.items[u.id],old=state.items[u.id];if(incoming&&Number.isFinite(incoming.last)&&(!old||incoming.last>old.last))state.items[u.id]=incoming;}for(const [k,v]of Object.entries(x.facts))if(v&&Number.isFinite(v.last)&&(!state.facts[k]||v.last>state.facts[k].last))state.facts[k]=v;state.turn=Math.max(state.turn,x.turn);state.active=null;save();home()}catch{alert('Could not read that progress file. Your existing progress was kept.')}};
}
function info(t,p){mount(`<div class="card"><h2 style="margin:0 0 6px;font-size:1.15rem">${esc(t)}</h2><p class="muted">${esc(p)}</p>${btn('back','Back to the cases')}</div>`);$('#back').onclick=home;}

/* ── the queue ── */
function next(){
 if(sessionCount>=ROUND){const U=units(),p=pace(U,state,Date.now(),LAST);
  mount(`<div class="card today"><div class="k">Round done</div><h2 style="margin:6px 0 4px;font-size:1.3rem">${ROUND} pieces in.</h2><p class="pace">${p.done>=p.target?`That’s today’s ${p.target} new pieces met.`:`${p.done} of today’s ${p.target} new pieces met.`} Misses are queued to come back.</p><div class="row2">${btn('more','Another round','primary')}${btn('stop','Back to the cases','')}</div></div>`);
  $('#more').onclick=()=>{sessionCount=0;next()};$('#stop').onclick=home;return;}
 const U=units(),u=selectNext(U,state,Date.now(),state.filter);
 if(u)return open(u);
 const later=U.filter(u=>(state.filter==='all'||u.caseId===state.filter)&&ready(u,state)&&state.items[u.id]?.seen).sort((a,b)=>state.items[a.id].due-state.items[b.id].due)[0];
 mount(`<div class="card"><h2 style="margin:0 0 6px;font-size:1.15rem">${state.filter==='all'?'All caught up':`${esc(caseName(state.filter))}: all caught up`}</h2><p class="muted">${later?'Everything here is waiting for its next day. Going early works, but a day’s gap is the real test.':'Nothing to learn in this selection.'}</p><div class="row2">${btn('back','Back to the cases','primary')}${later?btn('early','Go early',''):''}</div></div>`);
 $('#back').onclick=()=>{state.filter='all';save();home()};if(later)$('#early').onclick=()=>open(later);
}
function open(u){const q=Q.get(u.qid),seen=!!state.items[u.id]?.seen;
 run={id:u.id,stage:u.kind==='whole'||seen?'recall':'learn',assisted:false,text:'',started:Date.now()};persist();
 if(!state.intros[u.caseId]&&run.stage==='learn'&&caseOf(u.caseId))intro(u);else render();}
function intro(u){const c=caseOf(u.caseId);
 mount(`<div class="card piece" style="--cc:${CC[c.id]}"><div class="where"><span class="tag">${esc(caseName(c.id))}</span><span class="tag plain">First time in</span></div><h2>${esc(caseTitle(c))}</h2><p class="step">The idea behind the case</p><ol class="map">${c.map.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>${btn('introGo','Start the case')}${btn('pause','Back to the cases','ghost wide')}</div>`);
 $('#introGo').onclick=()=>{state.intros[c.id]=true;save();render()};$('#pause').onclick=home;}
function shell(u,q,step,body,back=!!state.items[u.id]?.seen){
 const kind=u.kind==='whole'?'Whole answer':u.kind==='closed'?'Her quiz':u.parts>1?`Piece ${u.part} of ${u.parts}`:'';
 mount(`<div class="topline">${btn('pause','‹ Cases','ghost sm')}<div class="pips" aria-label="${sessionCount} of ${ROUND} this round">${Array.from({length:ROUND},(_,i)=>`<i class="${i<sessionCount?'on':''}"></i>`).join('')}</div></div>
 <div class="card piece" style="--cc:${CC[u.caseId]||'var(--muted-fg)'}"><div class="where"><span class="tag">${esc(caseName(u.caseId))}</span>${kind?`<span class="tag plain">${kind}</span>`:''}${back?'<span class="tag back">Back again</span>':''}${u.core?'':'<span class="tag plain">Revision deck</span>'}</div>
 <h2>${esc(title(q))}</h2><p class="step">${step}</p>${body}</div>`);
 $('#pause').onclick=()=>{if(run)persist();home()};
}
function prompt(u,q){
 const focus=[...new Set(u.facts.map(f=>f.group.replace(/^([A-H])\s*·.*/,'Label $1')))];
 return `<p class="stem">${esc(q.qt||q.q)}</p>${u.kind==='part'&&u.parts>1?`<p class="small muted">This piece: ${focus.map(esc).join(' · ')} (points ${(u.part-1)*4+1}–${(u.part-1)*4+u.facts.length} of her answer).</p>`:''}${q.scenario?`<details class="fold"><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${figures(q)}`;
}
const factList=facts=>`<ol class="facts">${facts.map(f=>`<li>${bold(f.t)}${f.fix?`<span class="fix">Note: ${esc(f.fix)}</span>`:''}</li>`).join('')}</ol>`;
/* a fact with its key words coloured: hit (in your answer) or miss */
const marked=(f,terms)=>{let k=0;return esc(f.t).replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b class="${terms[k++]?.found?'hit':'miss'}">${t}</b>`);};

function render(){
 if(!run)return home();const u=ALL.find(u=>u.id===run.id);if(!u){state.active=null;save();return home()}const q=Q.get(u.qid);
 if(u.kind==='closed')return run.stage==='closedMark'?closedFeedback(u,q):closed(u,q);
 if(run.stage==='learn'){
  shell(u,q,'1 · Read it',`<p class="stem">${esc(q.qt||q.q)}</p><div class="why"><b>Why it works</b>${esc(q.note)}</div>${figures(q)}${q.short.hook?`<div class="hook">${esc(q.short.hook)}</div>`:''}${factList(u.facts)}${btn('cloze','Hide the key words ›')}${btn('know','I’ve got it, let me write it all','ghost wide')}${q.scenario?`<details class="fold"><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${source(q)}`);
  $('#cloze').onclick=()=>{run.stage='cloze';run.assisted=true;persist();render()};
  $('#know').onclick=()=>{run.stage='recall';run.assisted=true;persist();render()};return;
 }
 if(run.stage==='cloze')return cloze(u,q);
 if(run.stage==='mark')return markScreen(u,q);
 shell(u,q,u.kind==='whole'?'Write the whole answer from memory':'Write it from memory',`${prompt(u,q)}<p class="say">Type it the way you would in the exam.</p><textarea id="typed" placeholder="Your answer…" spellcheck="false">${esc(run.text)}</textarea><p class="small muted">Marked on her key words. Ctrl+Enter checks.</p>${btn('check','Check my answer')}${support(q)}`);
 const ta=$('#typed'),go=$('#check');go.disabled=!run.text.trim();ta.focus();
 ta.oninput=()=>{run.text=ta.value;go.disabled=!ta.value.trim();persist()};
 ta.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!go.disabled){e.preventDefault();go.click()}};
 go.onclick=()=>{run.marks=markFacts(u.facts,run.text);run.over=u.facts.map(()=>false);run.stage='mark';persist();render()};hookHelp();
}
/* step 2 of a new piece: every key word becomes a blank to type */
function cloze(u,q){
 let n=0;const rows=u.facts.map((f,fi)=>{let k=0;return `<li>${esc(f.t).replace(/\*\*(.+?)\*\*/g,(_,t)=>`<input class="blank" data-f="${fi}" data-k="${k++}" data-i="${n++}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="missing key word" style="width:${Math.min(22,Math.max(5,t.length+2))}ch">`)}</li>`;}).join('');
 shell(u,q,'2 · Type the key words',`${prompt(u,q)}<ol class="facts cloze">${rows}</ol>${btn('checkCloze','Check')}`);
 const ins=[...document.querySelectorAll('.blank')];ins[0]?.focus();
 ins.forEach((e,i)=>e.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();ins[i+1]?ins[i+1].focus():$('#checkCloze').click()}});
 $('#checkCloze').onclick=()=>{
  const got=u.facts.map((f,fi)=>keyTerms(f).map((t,k)=>{const v=ins.find(e=>e.dataset.f==fi&&e.dataset.k==k)?.value||'';return {t,v,found:!!v.trim()&&termFound(t,v)}}));
  const html=`<ol class="facts">${u.facts.map((f,fi)=>{let k=0;return `<li>${esc(f.t).replace(/\*\*(.+?)\*\*/g,()=>{const g=got[fi][k++];return g.found?`<b class="hit">${esc(g.t)}</b>`:`<b class="miss">${esc(g.t)}</b>${g.v.trim()?` <s class="small muted">${esc(g.v)}</s>`:''}`})}</li>`}).join('')}</ol>`;
  finish(u,got.map(g=>g.every(x=>x.found)),html);
 };
}
/* after a write-out: the page's marking, key words coloured, a deliberate override for a right answer in other words */
function markScreen(u,q){
 const marks=run.marks,over=run.over;
 shell(u,q,'Checked',`<p class="small muted">Your answer</p><div class="yours">${esc(run.text)}</div>
 <ul class="ticks">${u.facts.map((f,i)=>`<li class="mk ${marks[i].ok||over[i]?'right':'wrong'}"><span class="v">${marks[i].ok?'Got it':over[i]?'Counted (your words)':'Missed'}</span><div>${marked(f,marks[i].terms)}</div>${!marks[i].ok?`<button class="btn ghost sm" data-over="${i}">${over[i]?'Undo':'I wrote it differently, count it'}</button>`:''}</li>`).join('')}</ul>
 ${btn('save','Save and carry on')}${source(q)}`);
 document.querySelectorAll('[data-over]').forEach(b=>b.onclick=()=>{const i=+b.dataset.over;over[i]=!over[i];persist();markScreen(u,q)});
 $('#save').onclick=()=>finish(u,marks.map((m,i)=>m.ok||over[i]));
}
function finish(u,correct,detail=''){
 const back=!!state.items[u.id]?.seen,result=record(u,state,correct,{supported:run.assisted});state.active=null;sessionCount++;save();
 const q=Q.get(u.qid),miss=correct.filter(x=>!x).length;
 const [cls,head,line]=!result.pass?['no',`${miss} point${miss===1?'':'s'} to fix`,'They come back in a few pieces.']
   :run.assisted?['help','Got it with help','It comes back in a few pieces, blank this time.']
   :['ok','Got it from memory','Back in a day to see if it stuck.'];
 shell(u,q,'Saved',`<p class="verdict ${cls}">${head}</p><p class="small muted">${line}</p>${detail||(miss&&u.kind!=='closed'?factList(u.facts.filter((_,i)=>!correct[i])):'')}${btn('next','Next piece ›')}`,back);
 $('#pause').onclick=home;$('#next').onclick=next;$('#next').focus();run=null;
}

/* ── her quiz questions (MCQ, matching, dropdowns, typed blanks): marked as in the sim ── */
function optionLabel(q,o){return q.ol?.[o]?`${o}. ${q.ol[o]}`:o;}
function closedKey(q){if(q.type==='match')return q.pairs.map(p=>({label:p.left,answer:p.right}));if(q.type==='cloze')return q.blanks.map((b,i)=>({label:b.ctx||b.label||`Blank ${i+1}`,answer:b.correct}));return [{label:'Answer',answer:q.key.map(o=>optionLabel(q,o)).join(' · ')}];}
function closedStem(q){const placed=new Set();const text=q.qh?q.qh.replace(/\[\[IMG:([^\]]+)\]\]/g,(_,f)=>{placed.add(f);return `<img src="${esc(img(f))}" alt="Her question figure">`}).replace(/\[\[BLANK:(\d+)\]\]/g,(_,i)=>`<b>[${Number(i)+1}]</b>`):esc(q.qt||q.q);return `<div class="stem">${text}</div>${figures({...q,imgs:(q.imgs||[]).filter(f=>!placed.has(f))})}${q.scenario?`<p class="small">${esc(q.scenario)}</p>`:''}`;}
function closed(u,q){
 if(run.stage==='learn'){
  shell(u,q,'1 · Read the answer',`${closedStem(q)}<div class="why"><b>Her answer</b>${closedKey(q).map(k=>`<div>${k.label!=='Answer'?`<span class="muted">${esc(k.label)}</span> → `:''}<b style="color:var(--primary)">${esc(k.answer)}</b></div>`).join('')}</div>${refs(q)}${btn('tryClosed','Hide it and answer ›')}${source(q)}`);
  $('#tryClosed').onclick=()=>{run.stage='recall';run.assisted=true;persist();render()};return;
 }
 let inputs='';run.options ||= q.opts?shuffled(q.opts):[];run.picks ||= {};
 if(['mcq','multi','tf'].includes(q.type))inputs=`${q.type==='multi'?'<p class="small muted">Pick every right one.</p>':''}${run.options.map((o,i)=>`<label class="opt"><input type="${q.type==='multi'?'checkbox':'radio'}" name="answer" data-opt="${i}" ${run.picks[i]?'checked':''}><span>${esc(optionLabel(q,o))}</span></label>`).join('')}`;
 else {const rows=q.type==='match'?q.pairs.map(p=>({label:p.left,answer:p.right,options:q.pairs.map(p=>p.right)})):q.blanks.map((b,i)=>({label:`${i+1}. ${b.ctx||b.label}`,answer:b.correct,options:b.options}));run.rowOptions ||= rows.map(r=>shuffled([...new Set(r.options)]));inputs=rows.map((r,i)=>`<div class="arow"><label for="row${i}">${esc(r.label)}</label>${q.bk==='fib'?`<input id="row${i}" data-typed-row="${i}" type="text" autocomplete="off" spellcheck="false" value="${esc(run.picks[i]||'')}" placeholder="Type it">`:`<select id="row${i}" data-row="${i}"><option value="">Choose…</option>${run.rowOptions[i].map((o,j)=>`<option value="${j}" ${run.picks[i]===String(j)?'selected':''}>${esc(o)}</option>`).join('')}</select><output>${run.picks[i]!==undefined&&run.picks[i]!==''?esc(run.rowOptions[i][run.picks[i]]):''}</output>`}</div>`).join('');}
 shell(u,q,'Answer it',`${closedStem(q)}${inputs}${btn('checkClosed','Check')}${support(q)}`);
 document.querySelectorAll('[data-opt]').forEach(e=>e.onchange=()=>{if(q.type!=='multi')run.picks={};run.picks[e.dataset.opt]=e.checked;persist()});
 document.querySelectorAll('[data-row]').forEach(e=>e.onchange=()=>{run.picks[e.dataset.row]=e.value;const o=e.nextElementSibling;o.textContent=e.value===''?'':run.rowOptions[e.dataset.row][e.value];persist()});
 document.querySelectorAll('[data-typed-row]').forEach(e=>e.oninput=()=>{run.picks[e.dataset.typedRow]=e.value;persist()});
 $('#checkClosed').onclick=()=>{if(['mcq','multi','tf'].includes(q.type)){const selected=run.options.filter((_,i)=>run.picks[i]);run.correct=[selected.length===q.key.length&&q.key.every(k=>selected.some(s=>same(s,k)))];run.yours=[selected.map(o=>optionLabel(q,o)).join(' · ')||'No answer'];}else{const rows=closedKey(q);run.yours=rows.map((_,i)=>(q.bk==='fib'?run.picks[i]:run.rowOptions[i][run.picks[i]])||'No answer');run.correct=rows.map((k,i)=>q.type==='cloze'&&q.bk==='fib'?typedMatch(run.yours[i],q.blanks[i].options):same(k.answer,run.yours[i]));}run.stage='closedMark';persist();render()};hookHelp();
}
function closedFeedback(u,q){
 shell(u,q,'Checked',`${closedStem(q)}${closedKey(q).map((k,i)=>`<div class="mk ${run.correct[i]?'right':'wrong'}"><span class="v">${run.correct[i]?'Right':'Not quite'}</span><div>${k.label!=='Answer'?`${esc(k.label)} → `:''}<b>${esc(k.answer)}</b></div>${!run.correct[i]?`<div class="small muted">You put: ${esc(run.yours[i])}</div>`:''}</div>`).join('')}${refs(q)}${btn('saveClosed','Save and carry on')}${source(q)}`);
 $('#saveClosed').onclick=()=>finish(u,run.correct);
}
home();
