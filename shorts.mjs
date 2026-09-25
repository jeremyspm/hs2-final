/* shorts.mjs — the short versions of her exam-case answers (content/case-shorts.js), gated and keyed to the bank's
   question ids, for build.mjs and resplice.mjs (spliced into the page at /*@SHORTS@*\/, like hs2-test3's SAQD).
   Every gate is a hard failure: a short version that matches no question (or two), a bold word that is not in the step
   of HER answer it cites, a step of her answer with no short line, a line over 14 words, or a written case question with
   no short version would each ship a trainer that teaches something she did not write, or skips something she did. */
import { CASE_SHORTS } from './content/case-shorts.js';
import { norm } from './content/saq-answers.js';

export function loadShorts(questions) {
  const fails = [], out = {}, C = questions.filter(q => q.mod === 'cases' && q.saq);
  const pad = t => ' ' + String(t).toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  for (const s of CASE_SHORTS) {
    const at = `case ${s.case} "${s.k}"`;
    const hit = C.filter(q => q.quiz === 'case-' + s.case && norm(q.qt).startsWith(s.k));
    if (hit.length !== 1) { fails.push(`${at}: matched ${hit.length} written case questions (needs exactly 1)`); continue; }
    const q = hit[0], steps = q.saq.steps, flat = [];
    if (out[q.id]) { fails.push(`${at}: a second short version for the same question`); continue; }
    if (!String(s.title || '').trim() || String(s.title).split(/\s+/).length > 8) fails.push(`${at}: title empty or over 8 words`);
    if (!String(s.hook || '').trim()) fails.push(`${at}: hook empty`);
    if (!Array.isArray(s.groups) || !s.groups.length) fails.push(`${at}: no groups`);
    for (const g of s.groups || []) {
      if (!String(g.q || '').trim()) fails.push(`${at}: a group has no heading`);
      if (!Array.isArray(g.facts) || !g.facts.length) fails.push(`${at}: group "${g.q}" has no lines`);
      flat.push(...(g.facts || []));
    }
    for (const f of flat) {
      if (!Number.isInteger(f.of) || f.of < 0 || f.of >= steps.length) { fails.push(`${at}: line "${f.t}" cites her step ${f.of}, out of range`); continue; }
      const bold = [...String(f.t).matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1]);
      if (!bold.length) fails.push(`${at}: line "${f.t}" has no bold mark word`);
      for (const b of bold) if (!pad(steps[f.of]).includes(pad(b))) fails.push(`${at}: bold "${b}" is not in her step ${f.of + 1}`);
      if (String(f.t).split(/\s+/).length > 14) fails.push(`${at}: line "${f.t}" is over 14 words`);
    }
    steps.forEach((_, i) => { if (!flat.some(f => f.of === i)) fails.push(`${at}: her step ${i + 1} has no short line`); });
    out[q.id] = { title: s.title, hook: s.hook, groups: s.groups };
  }
  for (const q of C) if (!out[q.id]) fails.push(`written case question ${q.id} ("${q.qt.slice(0, 50)}") has no short version`);
  return { shorts: out, fails };
}

/* JSON for an inline <script>: a "</" inside it would end the script block early */
export const shortsJSON = o => JSON.stringify(o).replace(/<\//g, '<\\/');
