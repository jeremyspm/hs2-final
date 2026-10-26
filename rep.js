import {makeUnits,selectNext,record,snapshot,ready,typedMatch} from './rep-engine.mjs?v=20261027a';
const D=window.REP_DATA,units=makeUnits(D.questions),Q=new Map(D.questions.map(q=>[q.id,q]));
const KEY='hs2f.relearn.v1';
let storeError=false,state;
try{state=JSON.parse(localStorage.getItem(KEY))}catch{}
if(!state||state.version!==1||typeof state.items!=='object'||typeof state.facts!=='object')state={version:1,items:{},facts:{},turn:0,intros:{},filter:'all',active:null};
state.intros ||= {};state.turn ||= 0;state.filter ||= 'all';
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));storeError=false}catch{storeError=true;}};
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bold=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
const plain=s=>String(s).replace(/\*\*/g,'');
const img=f=>f.includes('/')?f:'img/'+f;
const caseName=id=>D.cases.find(c=>c.id===id)?.title.replace(/^Exam case /,'Case ')||'Case revision';
const shuffled=a=>a.map(x=>({x,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.x);
const normal=s=>String(s).normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
// Preserve genotype capitals. Case-insensitive grading is unsafe for Hh versus hh.
const same=(a,b)=>normal(a)===normal(b);
const title=q=>q.short?.title||'Apply it in her question';
let run=null,sessionCount=0;
try{if(localStorage.getItem('hs2f.repTheme')==='dark')document.body.classList.add('dark')}catch{}
$('#theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('hs2f.repTheme',document.body.classList.contains('dark')?'dark':'light')}catch{}};
function mount(html){app.innerHTML=html+(storeError?'<p class="notice" role="alert">This browser could not save progress. Keep this tab open and export progress from the home screen.</p>':'');window.scrollTo(0,0);}
const button=(id,text,cls='primary')=>`<button id="${id}" class="${cls}">${text}</button>`;
function figures(q){return (q.imgs||[]).map(f=>`<figure class="figure"><a href="${esc(img(f))}" target="_blank" rel="noopener"><img src="${esc(img(f))}" alt="${esc(q.short?.title||caseName(q.caseId))} — original course figure"></a><figcaption>Original course figure · tap to enlarge</figcaption></figure>`).join('');}
function source(q){return `<details><summary>Source and full question</summary><p>${esc(q.qt||q.q)}</p><p class="source">${esc(q.source)}${q.supplement?' · Added study answer, clearly separate from Hannetjie’s published keys.':''}</p>${q.saq?.steps?`<ol class="compact">${q.saq.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}</details>`;}
function support(q){return `<details id="extraHelp"><summary>I need the explanation again</summary><p>${esc(q.note||'Use the source notes below, then explain how the keyed answer follows.')}</p>${q.short?`<ol class="facts">${q.short.groups.flatMap(g=>g.facts).map(f=>`<li>${bold(f.t)}</li>`).join('')}</ol>`:''}${refs(q)}</details>`;}
function refs(q){return (q.refs||[]).slice(0,3).map(r=>r.slide?`<figure class="figure"><img src="${esc(r.slide.includes('/')?r.slide:'img/slides/'+r.slide)}" alt="${esc(r.src)}"><figcaption>${esc(r.src)}</figcaption></figure>`:r.t?`<p class="compact">${esc(r.t)}<br><small>${esc(r.src)}</small></p>`:'').join('');}
function markAssisted(){run.assisted=true;state.active={...run};save();}
function hookHelp(){const e=$('#extraHelp');if(e)e.addEventListener('toggle',()=>{if(e.open)markAssisted()});}
function home(){
 run=null;const s=snapshot(units,state),newN=s.total-s.seen;const active=state.active&&units.some(u=>u.id===state.active.id);
 mount(`<section class="hero"><div class="eyebrow">HS2 FINAL · THE TEN CASES</div><h1>Learn it. Say it.<br>Remember it later.</h1><p class="lead">One small piece at a time. Get the explanation, rebuild the answer, then recall it without hints.</p><div class="stats"><div><strong>${D.cases.filter(c=>units.some(u=>u.caseId===c.id&&state.items[u.id]?.seen)).length}/10</strong><span>cases started</span></div><div><strong>${s.retained}</strong><span>recalled on 2+ days</span></div><div><strong>${s.due}</strong><span>reviews due</span></div></div>${button('begin',active?'Continue where I stopped':'Start my next round','primary wide')}<p class="muted compact">${newN?`New learning and due reviews take turns. This round is 12 small checks.`:'All pieces introduced. Keep retrieving them on later days.'} Stop whenever you need; every marked answer is saved.</p></section><div class="case-nav">${button('allCases','All ten cases',state.filter==='all'?'on':'')}${button('reviewOnly','Review due points','')}${button('export','Export progress','quiet')}${button('import','Import progress','quiet')}<input id="importFile" type="file" accept="application/json" hidden></div><section><h2>Your cases</h2>${D.cases.map(c=>{const sub=units.filter(u=>u.caseId===c.id),v=snapshot(sub,state);return `<div class="row"><div class="text"><b>${esc(c.title.replace(/^Exam /,''))}</b><small>${v.seen}/${v.total} practised · ${v.retained} recalled on later days</small><div class="bar" aria-label="${v.seen} of ${v.total} pieces practised"><i style="width:${100*v.seen/v.total}%"></i></div></div><button data-case="${c.id}">Learn</button></div>`}).join('')}</section><details><summary>What does “everything” include?</summary><p>${s.seen}/${s.total} mini exercises practised. ${D.originalCount} existing case/revision questions, plus ${D.questions.filter(q=>q.supplement).length} added study answers covering the held questions and the male-pill research prompt. All ${D.facts} written fact lines are represented. Long answers become short pieces and unlock a complete-answer check.</p><p>The core cases are introduced before the extra revision. Diagrams stay with their questions. Extra revision uses the original MCQ, matching and dropdown formats.</p><p>“Practised” means you have checked it. “Recalled on 2+ days” means you retrieved the complete piece without hints on different days. Neither is an exam mark.</p>${D.cases.some(c=>c.held.length)?`<p class="notice">Still unresolved: ${D.cases.flatMap(c=>c.held).map(esc).join('; ')}</p>`:'<p>Previously held answers are labelled as compiled study answers or worked pedigree solutions, not lecturer marking schedules.</p>'}<p class="source">Explanations paraphrase the cited course material. The original answer source remains available with each question. Progress is separate from your existing Paper Sim scores.</p></details>`);
 $('#begin').onclick=()=>{sessionCount=0;if(active){run={...state.active};render()}else next()};
 $('#allCases').onclick=()=>{state.filter='all';save();home()};
 document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.case;state.active=null;save();sessionCount=0;next()});
 $('#reviewOnly').onclick=()=>{const pool=units.filter(u=>ready(u,state)&&state.items[u.id]?.seen&&state.items[u.id].due<=Date.now()).sort((a,b)=>state.items[a.id].due-state.items[b.id].due);if(pool.length)open(pool[0]);else info('No reviews due yet','You can continue introducing new material, or return later for a stronger check of recall.');};
 $('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hs2-recall-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('#import').onclick=()=>$('#importFile').click();
 $('#importFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(x.version!==1||!x.items||!x.facts||!Number.isFinite(x.turn))throw Error('Unsupported progress file');for(const u of units){const incoming=x.items[u.id],old=state.items[u.id];if(incoming&&Number.isFinite(incoming.last)&&(!old||incoming.last>old.last))state.items[u.id]=incoming;}for(const [k,v]of Object.entries(x.facts))if(v&&Number.isFinite(v.last)&&(!state.facts[k]||v.last>state.facts[k].last))state.facts[k]=v;state.turn=Math.max(state.turn,x.turn);state.active=null;save();home()}catch{alert('Could not read that progress file. Your existing progress was kept.')}};
}
function info(t,p){mount(`<div class="panel"><h1>${esc(t)}</h1><p>${esc(p)}</p>${button('back','Back to my cases')}</div>`);$('#back').onclick=home;}
function next(){
 if(sessionCount>=12){mount(`<div class="panel"><div class="eyebrow">ROUND COMPLETE</div><h1>Twelve checks done.</h1><p>Your progress is saved. Take a break or continue; missed points are queued to return.</p><div class="actions">${button('more','Keep going')}${button('stop','Stop here','')}</div></div>`);$('#more').onclick=()=>{sessionCount=0;next()};$('#stop').onclick=home;return;}
 const u=selectNext(units,state,Date.now(),state.filter);
 if(u)return open(u);
 const later=units.filter(u=>(state.filter==='all'||u.caseId===state.filter)&&ready(u,state)&&state.items[u.id]?.seen).sort((a,b)=>state.items[a.id].due-state.items[b.id].due)[0];
 mount(`<div class="panel"><h1>That round is saved.</h1><p>${later?'Your next reviews are waiting for a gap. You can practise early, but another day gives a better check of retention.':'No available pieces in this selection.'}</p><div class="actions">${button('back','Back to all cases')}${later?button('early','Practise early',''):''}</div></div>`);$('#back').onclick=()=>{state.filter='all';save();home()};if(later)$('#early').onclick=()=>open(later);
}
function open(u){const q=Q.get(u.qid);run={id:u.id,stage:state.items[u.id]?.seen?'recall':'learn',assisted:false,text:'',started:Date.now()};if(u.kind==='whole')run.stage='recall';state.active={...run};save();if(!state.intros[u.caseId]&&run.stage==='learn')intro(u,q);else render();}
function intro(u,q){const c=D.cases.find(c=>c.id===u.caseId);mount(`<div class="eyebrow">${esc(caseName(c.id))}</div><h1>The idea behind this case</h1><ol class="map">${c.map.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><p class="muted">Now learn the small pieces and put them back together.</p>${button('introGo','Start learning','primary wide')}${button('pause','Back to my cases','quiet wide')}`);$('#introGo').onclick=()=>{state.intros[c.id]=true;save();render()};$('#pause').onclick=home;}
function shell(u,q,body){
 const reviewed=!!state.items[u.id]?.seen;
 mount(`<div class="topline">${button('pause','Pause','quiet')}<span class="pill">${sessionCount+1} of 12 this round</span></div><div class="eyebrow">${esc(caseName(u.caseId))} · ${u.kind==='whole'?'COMPLETE ANSWER':u.kind==='closed'?'APPLY IT':`PIECE ${u.part} OF ${u.parts}`}</div><h2>${esc(title(q))}</h2><p class="checkpoint">${run.stage==='learn'?'1 · Understand it':run.stage==='gaps'?'2 · Rebuild it with help':run.stage==='mark'?'Check every point':'3 · Recall without hints'}${reviewed?' · returning review':''}</p><section class="panel">${body}</section>`);
 $('#pause').onclick=()=>{state.active={...run};save();home()};
}
function prompt(u,q){const focus=[...new Set(u.facts.map(f=>f.group.replace(/^([A-H])\s*·.*/, 'Label $1')))];return `<p class="stem">${esc(q.qt||q.q)}</p>${u.kind==='part'&&u.parts>1?`<p class="muted compact">This piece: ${focus.map(esc).join(' · ')}. Points ${(u.part-1)*4+1}–${(u.part-1)*4+u.facts.length}.</p>`:''}${q.scenario?`<details><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${figures(q)}`;}
function factList(facts){return `<ol class="facts">${facts.map(f=>`<li>${bold(f.t)}${f.fix?`<p class="source">Clarification: ${esc(f.fix)}</p>`:''}</li>`).join('')}</ol>`;}
function render(){
 if(!run)return home();const u=units.find(u=>u.id===run.id);if(!u){state.active=null;save();return home()}const q=Q.get(u.qid);
 if(run.stage==='closedMark')return closedFeedback(u,q);
 if(u.kind==='closed')return closed(u,q);
 if(run.stage==='learn'){
 shell(u,q,`<div class="explain"><b>Why it works</b><p>${esc(q.note)}</p></div>${figures(q)}${q.short.hook?`<div class="hook">${esc(q.short.hook)}</div>`:''}${factList(u.facts)}${button('gaps','Hide the key words','primary wide')}${button('know','Skip the gaps — try the whole piece','quiet wide')}${q.scenario?`<details><summary>The case</summary><p>${esc(q.scenario)}</p></details>`:''}${source(q)}`);
 $('#gaps').onclick=()=>{run.stage='gaps';run.assisted=true;run.revealed=false;persist();render()};$('#know').onclick=()=>{run.stage='recall';run.assisted=true;persist();render()};return;
 }
 if(run.stage==='gaps'){
 shell(u,q,`${prompt(u,q)}<p>Say the missing words, then reveal. Use the mechanism to rebuild the answer.</p><ol class="facts">${u.facts.map(f=>`<li>${run.revealed?bold(f.t):esc(f.t).replace(/\*\*(.+?)\*\*/g,'<span class="gap" aria-label="missing key words">…</span>')}</li>`).join('')}</ol>${button('revealGaps',run.revealed?'Now hide everything':'Reveal the key words','primary wide')}${source(q)}`);
 $('#revealGaps').onclick=()=>{if(run.revealed){run.stage='recall';run.text=''}else run.revealed=true;persist();render()};return;
 }
 if(run.stage==='mark'){
 shell(u,q,`${prompt(u,q)}${run.text?`<p class="muted">Your answer</p><p style="white-space:pre-wrap">${esc(run.text)}</p>`:''}<p><b>Tick only the points you recalled correctly.</b> Naming a word without the right relationship is not enough. Leave anything missed unticked.</p><ul class="reveal-list">${u.facts.map((f,i)=>`<li><label><input type="checkbox" data-fact="${i}" ${run.ticks?.[i]?'checked':''}><span>${bold(f.t)}${f.fix?`<small> · ${esc(f.fix)}</small>`:''}</span></label></li>`).join('')}</ul>${button('record','Save this check','primary wide')}${source(q)}`);
 document.querySelectorAll('[data-fact]').forEach(e=>e.onchange=()=>{run.ticks=[...document.querySelectorAll('[data-fact]')].map(e=>e.checked);persist()});
 $('#record').onclick=()=>finish(u,[...document.querySelectorAll('[data-fact]')].map(e=>e.checked));return;
 }
 shell(u,q,`${prompt(u,q)}<p><b>Say the answer before revealing it.</b> Include the proper terms and explain what causes what.</p><details><summary>Type or dictate instead</summary><textarea id="typed" placeholder="Your answer, one point per line…">${esc(run.text)}</textarea></details>${button('reveal','Reveal and check my answer','primary wide')}${support(q)}`);
 $('#typed').oninput=e=>{run.text=e.target.value;persist()};$('#reveal').onclick=()=>{run.stage='mark';persist();render()};hookHelp();
}
function persist(){state.active={...run};save();}
function finish(u,ticks){
 const result=record(u,state,ticks,{supported:run.assisted});state.active=null;sessionCount++;save();const q=Q.get(u.qid),miss=ticks.filter(x=>!x).length;
 const explanation=!result.pass?'The missed points return after a few other pieces. Read the correction once, then move on.':run.assisted?'That was supported practice. This piece will return without hints after a few other pieces.':'You recalled it without hints. It returns on a later day to check whether it lasted.';
 shell(u,q,`<div class="eyebrow">CHECK SAVED</div><h2 class="${result.pass?'correct':'needs'}">${result.pass?(run.assisted?'Rebuilt with help':'Recalled without hints'):`${miss} point${miss===1?'':'s'} to repair`}</h2><p>${explanation}</p>${miss&&u.kind!=='closed'?factList(u.facts.filter((_,i)=>!ticks[i])):''}${button('next','Next piece','primary wide')}`);
 // Finished screens must not recreate a completed pending card when paused.
 $('#pause').onclick=home;$('#next').onclick=next;run=null;
}
function optionLabel(q,o){return q.ol?.[o]?`${o}. ${q.ol[o]}`:o;}
function closedKey(q){if(q.type==='match')return q.pairs.map(p=>({label:p.left,answer:p.right}));if(q.type==='cloze')return q.blanks.map((b,i)=>({label:b.ctx||b.label||`Blank ${i+1}`,answer:b.correct}));return [{label:'Correct answer',answer:q.key.map(o=>optionLabel(q,o)).join(' · ')}];}
function closedStem(q){const placed=new Set();const text=q.qh?q.qh.replace(/\[\[IMG:([^\]]+)\]\]/g,(_,f)=>{placed.add(f);return `<img src="${esc(img(f))}" alt="Original question figure">`}).replace(/\[\[BLANK:(\d+)\]\]/g,(_,i)=>`<b>[${Number(i)+1}]</b>`):esc(q.qt||q.q);return `<div class="stem">${text}</div>${figures({...q,imgs:(q.imgs||[]).filter(f=>!placed.has(f))})}${q.scenario?`<p class="compact">${esc(q.scenario)}</p>`:''}`;}
function closed(u,q){
 if(run.stage==='learn'){
  shell(u,q,`${closedStem(q)}<div class="explain"><b>Study the keyed answer</b>${closedKey(q).map(k=>`<p><span class="muted">${esc(k.label)}</span><br><b>${esc(k.answer)}</b></p>`).join('')}</div>${refs(q)}${button('tryClosed','Hide the key and try it','primary wide')}${source(q)}`);
  $('#tryClosed').onclick=()=>{run.stage='recall';run.assisted=true;persist();render()};return;
 }
 let inputs='';run.options ||= q.opts?shuffled(q.opts):[];run.picks ||= {};
 if(['mcq','multi','tf'].includes(q.type))inputs=`${q.type==='multi'?'<p>Select every correct option.</p>':''}${run.options.map((o,i)=>`<label class="choice"><input type="${q.type==='multi'?'checkbox':'radio'}" name="answer" data-opt="${i}" ${run.picks[i]?'checked':''}><span>${esc(optionLabel(q,o))}</span></label>`).join('')}`;
 else {const rows=q.type==='match'?q.pairs.map(p=>({label:p.left,answer:p.right,options:q.pairs.map(p=>p.right)})):q.blanks.map((b,i)=>({label:`${i+1}. ${b.ctx||b.label}`,answer:b.correct,options:b.options}));run.rowOptions ||= rows.map(r=>shuffled([...new Set(r.options)]));inputs=rows.map((r,i)=>`<div class="answer-row"><label for="row${i}">${esc(r.label)}</label>${q.bk==='fib'?`<input id="row${i}" data-typed-row="${i}" type="text" autocomplete="off" spellcheck="false" value="${esc(run.picks[i]||'')}" placeholder="Type your answer">`:`<select id="row${i}" data-row="${i}"><option value="">Choose…</option>${run.rowOptions[i].map((o,j)=>`<option value="${j}" ${run.picks[i]===String(j)?'selected':''}>${esc(o)}</option>`).join('')}</select><output>${run.picks[i]!==undefined?esc(run.rowOptions[i][run.picks[i]]):''}</output>`}</div>`).join('');}
 shell(u,q,`${closedStem(q)}${inputs}${button('checkClosed','Check my answer','primary wide')}${support(q)}`);
 document.querySelectorAll('[data-opt]').forEach(e=>e.onchange=()=>{if(q.type!=='multi')run.picks={};run.picks[e.dataset.opt]=e.checked;persist()});
 document.querySelectorAll('[data-row]').forEach(e=>e.onchange=()=>{run.picks[e.dataset.row]=e.value;const o=e.nextElementSibling;o.textContent=e.value===''?'':run.rowOptions[e.dataset.row][e.value];persist()});
 document.querySelectorAll('[data-typed-row]').forEach(e=>e.oninput=()=>{run.picks[e.dataset.typedRow]=e.value;persist()});
 $('#checkClosed').onclick=()=>{if(['mcq','multi','tf'].includes(q.type)){const selected=run.options.filter((_,i)=>run.picks[i]);run.correct=[selected.length===q.key.length&&q.key.every(k=>selected.some(s=>same(s,k)))];run.yours=[selected.map(o=>optionLabel(q,o)).join(' · ')||'No answer'];}else{const rows=closedKey(q);run.yours=rows.map((_,i)=>(q.bk==='fib'?run.picks[i]:run.rowOptions[i][run.picks[i]])||'No answer');run.correct=rows.map((k,i)=>q.type==='cloze'&&q.bk==='fib'?typedMatch(run.yours[i],q.blanks[i].options):same(k.answer,run.yours[i]));}run.stage='closedMark';persist();render()};hookHelp();
}
function closedFeedback(u,q){shell(u,q,`${closedStem(q)}${closedKey(q).map((k,i)=>`<div class="answer-row"><b class="${run.correct[i]?'correct':'needs'}">${run.correct[i]?'Correct':'Needs another try'}</b><p>${esc(k.label)}<br><b>${esc(k.answer)}</b></p>${!run.correct[i]?`<small>You chose: ${esc(run.yours[i])}</small>`:''}</div>`).join('')}${refs(q)}${button('saveClosed','Save and continue','primary wide')}${source(q)}`);$('#saveClosed').onclick=()=>finish(u,run.correct);}
home();
