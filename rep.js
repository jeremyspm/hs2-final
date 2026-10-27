import {makeUnits,selectNext,record,snapshot,ready,keyTerms,markFacts,termFound,pace,DAY_HITS,SOLID} from './rep-engine.mjs?v=20261027g';
/* Learn the cases (27 Oct 2026). Everything is typed and marked by the page, never ticked on trust, and only ever key
   words, never sentences: a new piece climbs a ladder of hidden key words, then comes back a few pieces later for its key
   words from memory (see "the ladder" below). Written questions only: the ones that mark themselves (MCQ, matching,
   blanks) are the Paper Sim's ⚡ Rep screen, the hub's Rep tab. Her case questions first, then her revision deck's. */
const D=window.REP_DATA,Q=new Map(D.questions.map(q=>[q.id,q]));
const ALL=makeUnits(D.questions).filter(u=>u.kind!=='closed');
for(const u of ALL){const q=Q.get(u.qid);u.core=q.mod==='cases'||!!q.supplement;}
const EXAM='2026-11-04',LAST='2026-11-03',ROUND=12;
const STEPS=['Read it','One key word a line hidden','Every key word hidden','Key words from memory'],MEM=3;
/* each case wears its body system's colour, the same hues as the sim's system tags */
const CC={c2:'hsl(140 55% 58%)',c3:'hsl(199 89% 64%)',c4:'hsl(199 89% 64%)',c6:'hsl(158 64% 52%)',c8:'hsl(28 90% 62%)',
  c9:'hsl(268 80% 74%)',c10:'hsl(268 80% 74%)',c13:'hsl(335 85% 72%)',c14:'hsl(38 92% 62%)',c15:'hsl(300 70% 72%)'};
const KEY='hs2f.relearn.v1';
let storeError=false,state;
try{state=JSON.parse(localStorage.getItem(KEY))}catch{}
if(!state||state.version!==1||typeof state.items!=='object'||typeof state.facts!=='object')state={version:1,items:{},facts:{},turn:0,intros:{},filter:'all',active:null};
state.intros ||= {};state.turn ||= 0;state.filter ||= 'all';delete state.extras;
/* progress saved before the key-word ladder (state.lv 2): the morning's 5-step ladder (… 3 first letters, 4 write-out)
   is now 4 steps (… 3 key words from memory), and a run from before any ladder (stages learn / gaps / cloze / recall /
   mark) picks up on the matching step */
if(state.lv!==2){
  for(const it of Object.values(state.items))if(it.rung>=3)it.rung=it.rung===3?2:MEM;
  const a=state.active;
  if(a){if(a.rung===undefined)a.rung=a.stage==='learn'?0:a.stage==='gaps'||a.stage==='cloze'?2:4;
    if(a.rung>=3)a.rung=a.rung===3?2:MEM;
    if(!(a.stage==='mark'&&a.marks))a.stage='do';}
  state.lv=2;}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));storeError=false}catch{storeError=true;}};
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bold=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const img=f=>f.includes('/')?f:'img/'+f;
const units=()=>ALL;
const caseOf=id=>D.cases.find(c=>c.id===id);
const caseName=id=>caseOf(id)?.title.replace(/^Exam case (\d+) · .*/,'Case $1')||'Revision';
const caseTitle=c=>c.title.replace(/^Exam case \d+ · /,'');
const title=q=>q.short.title;
const ladder=r=>`<div class="ladder" aria-label="Step ${r+1} of ${STEPS.length}">${STEPS.map((s,i)=>`<span class="${i<r?'done':i===r?'on':''}" title="${s}">${i+1}</span>`).join('<i></i>')}</div>`;
const stepLabel=r=>`${r+1} · ${STEPS[r]}`;
const dots=(k,of)=>`<b class="dots" aria-label="${k} of ${of}">${Array.from({length:of},(_,i)=>`<i class="${i<k?'on':''}"></i>`).join('')}</b>`;
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
 const met=p.done>=p.target;
 const paceLine=p.left===0
   ?'Every piece is in. From here it’s reviews: clear the due ones each day.'
   :met?`Today’s <b>${p.target}</b> are done. Reviews keep them; more new pieces put you ahead.`
   :`<b>${p.target} new a day</b> meets all ${s.total} by Tue 3 Nov.${p.left<s.total?` ${p.left} still to meet.`:''}`;
 mount(`<div class="idcard"><span class="idic" aria-hidden="true">🧠</span><span class="idtx"><small>Health Science 2 · 722.541</small><b>Write the cases</b><span>Her 10 starred cases · read it, type it, it comes back</span>${n>=0?`<span class="idwhen">${n===0?'Your sitting is today':`${n} day${n===1?'':'s'} to your sitting · 4 Nov`}</span>`:''}</span></div>
 <div class="card today"><div class="k">Today</div>
  <div class="nums"><div><strong>${p.done}<i>/${p.target}</i></strong><span>new pieces</span></div><div><strong>${s.due}</strong><span>back for review</span></div><div><strong>${s.retained}<i>/${s.total}</i></strong><span>solid (${SOLID} days)</span></div></div>
  <div class="bar"><i style="width:${p.target?Math.min(100,100*p.done/p.target):100}%"></i></div>
  <p class="pace">${paceLine}</p>
  ${btn('begin',active?'Carry on where you stopped':'Start a round of 12')}
 </div>
 <p class="small muted">Her written questions on the cases. The ones that mark themselves (multiple choice, matching, blanks) are in <a href="./#rep">⚡ Rep questions</a>.</p>
 <div class="lsec">The ten cases</div>
 ${D.cases.map(c=>{const sub=U.filter(u=>u.caseId===c.id),v=snapshot(sub,state);return `<button class="lrow${v.seen===v.total?' done':''}" data-case="${c.id}" style="--cc:${CC[c.id]}"><span class="lic">${c.id.slice(1)}</span><span class="ltx"><b>${esc(caseTitle(c))}</b><small>${v.seen}/${v.total} met · ${v.retained} solid${v.due?` · ${v.due} back`:''}</small><span class="bar"><i style="width:${v.total?100*v.seen/v.total:0}%"></i></span></span><span class="lch">›</span></button>`}).join('')}
 <div class="tools">${btn('reviewOnly',`Reviews only${s.due?` · ${s.due}`:''}`,'ghost sm')}${btn('export','Export progress','ghost sm')}${btn('import','Import progress','ghost sm')}<input id="importFile" type="file" accept="application/json" hidden></div>
 <details class="fold"><summary>How this works</summary>
  <p><b>You learn her key words, not her sentences.</b> The highlighted words are what the marker looks for, about 2 a line. You never have to type a sentence here.</p>
  <p><b>A new piece climbs a ladder:</b> 1 read it · 2 one key word a line hidden · 3 every key word hidden. Get a step right and the next one hides more. Miss one and you try that step again, or leave it there and it comes back at that step.</p>
  <p><b>Step 4 comes a few pieces later:</b> type her key words from memory, any order. It's only ever the last step: miss it and it comes back at step 3, never blank. Spelling slips, swapped letters, British/US spellings and word endings are fine; hyper/hypo, intra/inter, afferent/efferent, numbers and genotype capitals are not.</p>
  <p><b>Then it gets drilled.</b> A day only counts after ${DAY_HITS} from-memory hits in a row, a few pieces apart. Then it's back tomorrow, then in 2 days, then 3, and each of those days needs its ${DAY_HITS} in a row too. <b>Solid</b> means ${SOLID} days running. Any miss wipes the streak and it starts again.</p>
  <p>Long answers are learned in pieces of four points, then all their key words together.</p>
  <p class="source">${D.originalCount} of her questions plus ${D.questions.filter(q=>q.supplement).length} compiled study answers (the held questions and the male-pill research prompt), ${D.facts} marking points. “Kept” means written from memory on 2+ different days; it isn’t an exam mark. Progress is separate from your Paper Sim scores.</p>
 </details>`);
 $('#begin').onclick=()=>{sessionCount=0;if(active){run={...state.active};render()}else{state.filter='all';save();next()}};
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
/* a piece starts where its ladder left it (state.items[id].rung); one seen before the ladder existed restarts at step 3
   (every key word hidden) if it was missed, else at key words from memory. A whole answer is only ever from memory. */
function open(u){const it=state.items[u.id];
 const r=u.kind==='whole'?MEM:it?.rung??(!it?.seen?0:it.miss?.length?2:MEM);
 run={id:u.id,rung:r,stage:'do',assisted:r<MEM,text:'',started:Date.now()};persist();
 if(!state.intros[u.caseId]&&r===0&&caseOf(u.caseId))intro(u);else render();}
function intro(u){const c=caseOf(u.caseId);
 mount(`<div class="card piece" style="--cc:${CC[c.id]}"><div class="where"><span class="tag">${esc(caseName(c.id))}</span><span class="tag plain">First time in</span></div><h2>${esc(caseTitle(c))}</h2><p class="step">The idea behind the case</p><ol class="map">${c.map.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>${btn('introGo','Start the case')}${btn('pause','Back to the cases','ghost wide')}</div>`);
 $('#introGo').onclick=()=>{state.intros[c.id]=true;save();render()};$('#pause').onclick=home;}
function shell(u,q,step,body,back=!!state.items[u.id]?.seen){
 const kind=u.kind==='whole'?'Whole answer':u.parts>1?`Piece ${u.part} of ${u.parts}`:'';
 mount(`<div class="topline">${btn('pause','‹ Cases','ghost sm')}<div class="pips" aria-label="${sessionCount} of ${ROUND} this round">${Array.from({length:ROUND},(_,i)=>`<i class="${i<sessionCount?'on':''}"></i>`).join('')}</div></div>
 <div class="card piece" style="--cc:${CC[u.caseId]||'var(--muted-fg)'}"><div class="where"><span class="tag">${esc(caseName(u.caseId))}</span>${kind?`<span class="tag plain">${kind}</span>`:''}${back?'<span class="tag back">Back again</span>':''}${u.core?'':'<span class="tag plain">Revision deck</span>'}</div>
 <h2>${esc(title(q))}</h2><p class="step">${step}</p>${body}</div>`);
 $('#pause').onclick=()=>{if(run)persist();home()};
}
function prompt(u,q){
 const focus=[...new Set(u.facts.map(f=>f.group.replace(/^([A-H])\s*·.*/,'Label $1')))];
 return `<p class="stem">${esc(q.qt||q.q)}</p>${u.kind==='part'&&u.parts>1?`<p class="small muted">This piece: ${focus.map(esc).join(' · ')} (points ${(u.part-1)*4+1}–${(u.part-1)*4+u.facts.length} of her answer).</p>`:''}${q.scenario?`<details class="fold"><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${figures(q)}`;
}
const factList=(facts,cls='')=>`<ol class="facts ${cls}">${facts.map(f=>`<li>${bold(f.t)}${f.fix?`<span class="fix">Note: ${esc(f.fix)}</span>`:''}</li>`).join('')}</ol>`;
/* a fact with its key words coloured: hit (in your answer) or miss */
const marked=(f,terms)=>{let k=0;return esc(f.t).replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b class="${terms[k++]?.found?'hit':'miss'}">${t}</b>`);};

/* ── the ladder (27 Oct 2026: "shouldn't it be gradual occlusion?", then: you learn the key words, not the sentences) ──
   A new piece climbs it in one visit: 0 read it (key words loud, the rest quiet) · 1 one key word a line hidden ·
   2 every key word hidden. Then it leaves, and comes back a few pieces later as 3: her key words from memory, typed in
   any order, no sentences. Nothing on the ladder asks for a sentence. A miss never sends a piece back to blank: a
   missed step is tried again (or left at that step), and a miss from memory climbs back from 2 next time.
   state.items[id].rung is where the next visit starts. */
function render(){
 if(!run)return home();const u=ALL.find(u=>u.id===run.id);if(!u){state.active=null;save();return home()}const q=Q.get(u.qid);
 if(run.stage==='mark')return markScreen(u,q);
 if(run.stage==='checked')return checked(u,q);
 const r=run.rung;
 if(r===0){
  shell(u,q,stepLabel(0),`${ladder(0)}<p class="stem">${esc(q.qt||q.q)}</p><div class="why"><b>Why it works</b>${esc(q.note)}</div>${figures(q)}${q.short.hook?`<div class="hook">${esc(q.short.hook)}</div>`:''}<p class="say">Learn the highlighted words. They're what earn the marks.</p>${factList(u.facts,'kw')}${btn('climb','Start hiding them ›')}${btn('know','I know it, straight to memory','ghost wide')}${q.scenario?`<details class="fold"><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${source(q)}`);
  $('#climb').onclick=()=>{run.rung=1;persist();render()};
  $('#know').onclick=()=>{run.rung=MEM;run.assisted=true;persist();render()};return;
 }
 if(r<MEM)return cloze(u,q,r);
 const nk=u.facts.reduce((n,f)=>n+keyTerms(f).length,0);
 shell(u,q,u.kind==='whole'?'The whole answer: key words from memory':stepLabel(MEM),`${u.kind==='whole'?'':ladder(MEM)}${prompt(u,q)}<p class="say">Type her key words: ${nk} to find. Any order, no sentences.</p><textarea id="typed" class="kwbox" placeholder="key words, separated by commas…" spellcheck="false">${esc(run.text)}</textarea><p class="small muted">A point counts when all its key words are here. Ctrl+Enter checks.</p>${btn('check','Check')}${support(q)}`);
 const ta=$('#typed'),go=$('#check');go.disabled=!run.text.trim();ta.focus();
 ta.oninput=()=>{run.text=ta.value;go.disabled=!ta.value.trim();persist()};
 ta.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!go.disabled){e.preventDefault();go.click()}};
 go.onclick=()=>{run.marks=markFacts(u.facts,run.text);run.over=u.facts.map(()=>false);run.stage='mark';persist();render()};hookHelp();
}
/* steps 2 and 3: key words become blanks to type. Step 2 hides the last key word of each line, step 3 every one. */
function cloze(u,q,r){
 let n=0;const rows=u.facts.map((f,fi)=>{const K=keyTerms(f).length;let k=0;return `<li>${esc(f.t).replace(/\*\*(.+?)\*\*/g,(_,t)=>{const i=k++;return r===2||i===K-1?`<input class="blank" data-f="${fi}" data-k="${i}" data-i="${n++}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="missing key word" style="width:${Math.min(22,Math.max(5,t.length+2))}ch">`:`<b>${t}</b>`})}</li>`;}).join('');
 shell(u,q,stepLabel(r),`${ladder(r)}${prompt(u,q)}<ol class="facts cloze">${rows}</ol>${btn('checkStep','Check')}`);
 const ins=[...document.querySelectorAll('.blank')];ins[0]?.focus();
 ins.forEach((e,i)=>e.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();ins[i+1]?ins[i+1].focus():$('#checkStep').click()}});
 $('#checkStep').onclick=()=>{
  const got=u.facts.map((f,fi)=>keyTerms(f).map((t,k)=>{const e=ins.find(e=>e.dataset.f==fi&&e.dataset.k==k);if(!e)return {t,given:true,found:true};const v=e.value;return {t,v,found:!!v.trim()&&termFound(t,v)}}));
  run.ok=got.map(g=>g.every(x=>x.found));
  run.html=`<ol class="facts">${u.facts.map((f,fi)=>{let k=0;return `<li>${esc(f.t).replace(/\*\*(.+?)\*\*/g,()=>{const g=got[fi][k++];return g.given?`<b>${esc(g.t)}</b>`:g.found?`<b class="hit">${esc(g.t)}</b>`:`<b class="miss">${esc(g.t)}</b>${g.v.trim()?` <s class="small muted">${esc(g.v)}</s>`:''}`})}</li>`}).join('')}</ol>`;
  run.stage='checked';persist();render();
 };
}
/* after a step: all right climbs on (every key word hidden ends the visit); a miss tries the step again or leaves it there */
function checked(u,q){
 const r=run.rung,miss=run.ok.filter(x=>!x).length,top=r===MEM-1;
 shell(u,q,stepLabel(r),`${ladder(r)}<p class="verdict ${miss?'no':'ok'}">${miss?`${miss} to fix`:top?'Climbed it':'All right'}</p>${run.html}
  ${miss?`${btn('again','Try this step again')}${btn('leave','Leave it here, bring it back later','ghost wide')}`
   :btn('up',top?'Done, back later from memory ›':`Next: ${STEPS[r+1].toLowerCase()} ›`)}`);
 const a=$('#again'),l=$('#leave'),up=$('#up');
 if(a)a.onclick=()=>{run.stage='do';persist();render()};
 if(l)l.onclick=()=>finish(u,run.ok,run.html);
 if(up)up.onclick=()=>{if(top)finish(u,run.ok,run.html);else{run.rung++;run.stage='do';persist();render()}};
}
/* after key words from memory: the page's marking, key words coloured, a deliberate override for a right one in other words */
function markScreen(u,q){
 const marks=run.marks,over=run.over;
 shell(u,q,'Checked',`<p class="small muted">Your key words</p><div class="yours">${esc(run.text)}</div>
 <ul class="ticks">${u.facts.map((f,i)=>`<li class="mk ${marks[i].ok||over[i]?'right':'wrong'}"><span class="v">${marks[i].ok?'Got it':over[i]?'Counted (your words)':'Missed'}</span><div>${marked(f,marks[i].terms)}</div>${!marks[i].ok?`<button class="btn ghost sm" data-over="${i}">${over[i]?'Undo':'I had it in other words, count it'}</button>`:''}</li>`).join('')}</ul>
 ${btn('save','Save and carry on')}${source(q)}`);
 document.querySelectorAll('[data-over]').forEach(b=>b.onclick=()=>{const i=+b.dataset.over;over[i]=!over[i];persist();markScreen(u,q)});
 $('#save').onclick=()=>finish(u,marks.map((m,i)=>m.ok||over[i]));
}
function finish(u,correct,detail=''){
 const back=!!state.items[u.id]?.seen,result=record(u,state,correct,{supported:run.assisted});
 /* where the next visit starts: climbed or recalled → from memory; a missed step → that step; missed from memory → every key word hidden */
 const mem=run.rung>=MEM;state.items[u.id].rung=result.pass?MEM:mem?2:Math.max(1,run.rung);
 if(u.kind==='whole'&&!result.pass)for(const id of u.requires)if(state.items[id]&&!state.items[id].wins)state.items[id].rung=2;
 state.active=null;sessionCount++;save();
 const q=Q.get(u.qid),miss=correct.filter(x=>!x).length,n=result.days;
 const gap=result.interval>=3*864e5?'in 3 days':result.interval>=2*864e5?'in 2 days':'tomorrow';
 const [cls,head,line]=!result.pass?['no',`${miss} point${miss===1?'':'s'} to fix`,mem?`Streak wiped. It comes back in a few pieces with its key words hidden, and needs ${DAY_HITS} in a row again.`:'It comes back in a few pieces at this step.']
   :run.assisted?['help',mem?'Got it with help':'Climbed it',mem?'Help doesn’t count as a hit. It comes back in a few pieces, from memory.':`Now the drilling: key words from memory, a few pieces from now. It needs ${DAY_HITS} in a row today.`]
   :!result.locked?['ok',`Hit ${result.hits} of ${DAY_HITS} today`,'Once more from memory in a few pieces to lock today in.']
   :n>=SOLID?['ok','Solid',`From memory ${SOLID} days running. It still comes back every 3 days to stay that way.`]
   :['ok',`Day ${n} of ${SOLID} locked in`,`Back ${gap} for ${DAY_HITS} more in a row.`];
 const today=result.locked?DAY_HITS:result.hits;
 const drill=`<div class="drill"><div><span>Today</span>${dots(today,DAY_HITS)}</div><div><span>Days in a row</span>${dots(Math.min(n,SOLID),SOLID)}</div></div>`;
 shell(u,q,'Saved',`<p class="verdict ${cls}">${head}</p><p class="small muted">${line}</p>${drill}${detail||(miss?factList(u.facts.filter((_,i)=>!correct[i])):'')}${btn('next','Next piece ›')}`,back);
 $('#pause').onclick=home;$('#next').onclick=next;$('#next').focus();run=null;
}

home();
