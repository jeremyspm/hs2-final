/* shorts.mjs — the short versions of the written answers (26 Sep 2026), gated and keyed to the bank's question ids, for
   build.mjs and resplice.mjs (spliced into the page at /*@SHORTS@*\/, like hs2-test3's SAQD).
     content/case-shorts.js   — her 44 exam-case answers; each entry matches exactly ONE case question.
     content/module-shorts.js — the module written questions; an entry may match several questions, but only when they
                                carry the same answer (the same question set in two quizzes).
   A line: {t, of, fix?}. `of` = the step (or steps) of the answer it is cut from; every bold word must be found there.
   `fix` = a CORRECTION: the answer slips (her feedback says the pupil dilates, the inner ear amplifies, LH makes estrogen)
   and the line teaches the right fact instead, with the reason shown on the page; only a fix line may bold a word the
   answer does not have. `skip` = {step: reason} for steps that carry no fact (a table header, her sub-question heading,
   page-capture junk). `none` = the question has no text to cut (with the reason). Every gate is a hard failure. */
import { CASE_SHORTS } from './content/case-shorts.js';
import { MODULE_SHORTS } from './content/module-shorts.js';
import { norm } from './content/saq-answers.js';

const pad = t => ' ' + String(t).toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const stem = q => norm(q.qt || q.q || '');

/* one short version against the answer (its steps) it was cut from */
function checkEntry(s, at, steps, fails) {
  const flat = [], skip = s.skip || {};
  if (!String(s.title || '').trim() || String(s.title).split(/\s+/).length > 8) fails.push(`${at}: title empty or over 8 words`);
  if (!String(s.hook || '').trim()) fails.push(`${at}: hook empty`);
  if (!Array.isArray(s.groups) || !s.groups.length) fails.push(`${at}: no groups`);
  for (const g of s.groups || []) {
    if (!String(g.q || '').trim()) fails.push(`${at}: a group has no heading`);
    if (!Array.isArray(g.facts) || !g.facts.length) fails.push(`${at}: group "${g.q}" has no lines`);
    flat.push(...(g.facts || []));
  }
  for (const [i, why] of Object.entries(skip)) {
    if (!(Number(i) >= 0 && Number(i) < steps.length)) fails.push(`${at}: skip ${i} is out of range`);
    if (!String(why || '').trim()) fails.push(`${at}: skip ${i} needs a reason`);
  }
  for (const f of flat) {
    const ofs = Array.isArray(f.of) ? f.of : [f.of];
    if (!ofs.length || !ofs.every(i => Number.isInteger(i) && i >= 0 && i < steps.length)) { fails.push(`${at}: line "${f.t}" cites ${JSON.stringify(f.of)}, out of range`); continue; }
    if (ofs.some(i => i in skip)) fails.push(`${at}: line "${f.t}" cites a skipped step`);
    const bold = [...String(f.t).matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1]);
    if (!bold.length) fails.push(`${at}: line "${f.t}" has no bold mark word`);
    if ('fix' in f) { if (!String(f.fix || '').trim()) fails.push(`${at}: correction line "${f.t}" needs its reason`); }
    else { const src = pad(ofs.map(i => steps[i]).join(' ')); for (const b of bold) if (!src.includes(pad(b))) fails.push(`${at}: bold "${b}" is not in step ${ofs.map(i => i + 1).join('+')}`); }
    if (String(f.t).split(/\s+/).length > 14) fails.push(`${at}: line "${f.t}" is over 14 words`);
  }
  steps.forEach((_, i) => { if (!(i in skip) && !flat.some(f => (Array.isArray(f.of) ? f.of : [f.of]).includes(i))) fails.push(`${at}: step ${i + 1} has no short line (skip it, with the reason, if it carries no fact)`); });
}
/* what the page gets: the lines, the steps each is cut from (a step's quote, q.prefs, is shown under the first line cut
   from that step, so the page needs `of` too) and the corrections' reasons */
const pack = (s, id) => ({ id, title: s.title, hook: s.hook,
  groups: s.groups.map(g => ({ q: g.q, facts: g.facts.map(f => {
    const of = Array.isArray(f.of) ? f.of : [f.of];
    return 'fix' in f ? { t: f.t, of, fix: f.fix } : { t: f.t, of }; }) })) });

export function loadShorts(questions) {
  const fails = [], out = {};
  const C = questions.filter(q => q.mod === 'cases' && q.saq), M = questions.filter(q => q.mod !== 'cases' && q.saq);
  for (const s of CASE_SHORTS) {
    const at = `case ${s.case} "${s.k}"`;
    const hit = C.filter(q => q.quiz === 'case-' + s.case && stem(q).startsWith(s.k));
    if (hit.length !== 1) { fails.push(`${at}: matched ${hit.length} written case questions (needs exactly 1)`); continue; }
    if (out[hit[0].id]) { fails.push(`${at}: a second short version for the same question`); continue; }
    checkEntry(s, at, hit[0].saq.steps, fails);
    out[hit[0].id] = pack(s, `c:${s.case}:${s.k}`);
  }
  for (const q of C) if (!out[q.id]) fails.push(`written case question ${q.id} ("${stem(q).slice(0, 50)}") has no short version`);
  const done = new Set();
  for (const s of MODULE_SHORTS) {
    const at = `module "${s.k}"${s.a ? ` / "${s.a}"` : ''}`;
    const hit = M.filter(q => stem(q).startsWith(s.k) && (!s.a || norm(q.saq.steps[0] || '').startsWith(s.a)));
    if (!hit.length) { fails.push(`${at}: matched no written module question`); continue; }
    const sig = JSON.stringify(hit[0].saq.steps);
    if (hit.some(q => JSON.stringify(q.saq.steps) !== sig)) { fails.push(`${at}: matched ${hit.length} questions whose answers differ`); continue; }
    if (hit.some(q => done.has(q.id))) { fails.push(`${at}: one of its questions already has a short version`); continue; }
    hit.forEach(q => done.add(q.id));
    if ('none' in s) { if (!String(s.none || '').trim()) fails.push(`${at}: 'none' needs its reason`); continue; }
    checkEntry(s, at, hit[0].saq.steps, fails);
    const p = pack(s, `m:${s.k}${s.a ? ':' + s.a : ''}`);
    for (const q of hit) out[q.id] = p;
  }
  for (const q of M) if (!done.has(q.id)) fails.push(`written module question ${q.id} ("${stem(q).slice(0, 50)}") has no short version, and no 'none' with its reason`);
  return { shorts: out, fails };
}

/* JSON for an inline <script>: a "</" inside it would end the script block early */
export const shortsJSON = o => JSON.stringify(o).replace(/<\//g, '<\\/');
