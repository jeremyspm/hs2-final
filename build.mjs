/* Assemble the HS2 FINAL EXAM sim (Thu 5 Nov 2026: 130 min, 32 questions, 37% written, Modules 1–3, "based on the starred
   case studies in Case Study Booklet A"). Pipeline ported from hs2-test3 (itself from hs2-test2 @255d89b). Three sources:
   1. its OWN capture bank (_inbox/HS2 Final Capture → hs2-anki/final): quizzes that belong to no module — today only the
      CASE STUDY FORMATIVE TEST MODULE 1-2 (211092) — run through the same stem / key / gate pipeline as every sim;
   2. the three module sims IMPORTED AS BUILT (hs2-paper-m1, hs2-test2, hs2-test3 — their index.html DATA), every question
      with its explain row, figures hot-linked from the sibling sim (../<sim>/img/…, same origin) and checked on disk here;
   3. the TEN STARRED CASES (content/cases.js) as written questions marked against her own model answers.
   Nothing here authors questions; authored content lives in content/ and is joined by gates that fail the build in BOTH
   directions. Rebuild after any module sim is rebuilt: `python host-figs.py && node build.mjs`. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CHAINS } from './content/chains.js';
import { CASE7 } from './content/case7.js';
import { SAQ_ANSWERS, norm } from './content/saq-answers.js';
import { loadVideos, loadVideoMatches, loadRefMatches, loadPartRefs, matchVideo, matchRefs, matchParts } from './content/explain.mjs';
import { structuredStems, plainText } from './stem-html.mjs';
import { OVERRIDES } from './content/overrides.js';
import { AUTHORED_STEMS } from './content/authored-stems.js';
import { CASES } from './content/cases.js';
import { loadShorts, shortsJSON } from './shorts.mjs';
import { REVDECK } from './content/revision-deck.js';
import { HELPLINE_M1 } from './content/helpline-m1.js';
import { CASE_TOPICS } from './content/case-topics.js';
import { HELPLINE } from './content/helpline.js';
import { QTOPIC } from './content/qtopic.js';
import { QROW } from './content/qrow.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/* HER OWN model answers, lifted verbatim from the quiz_comment blocks of his graded captures by extract-her-answers.mjs */
const HER_ANSWERS = JSON.parse(fs.readFileSync(path.join(HERE, 'content/her-answers.json'), 'utf8'));
const herUsed = new Set();
const M2 = 'C:/Users/USER/Desktop/github/hs2-anki/final';      // name kept from the port: it is the parsed bank dir
const CAP = 'C:/Users/USER/Desktop/github/_inbox/HS2 Final Capture';

const bank = JSON.parse(fs.readFileSync(path.join(M2, 'questions.json'), 'utf8'));
const imgBind = JSON.parse(fs.readFileSync(path.join(HERE, 'images.json'), 'utf8'));
const readOr = (f, d) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d;      // his single-file saves carry no manifests: every figure is a data: URI
const manifest = readOr(path.join(CAP, 'images/manifest.json'), {});
const extManifest = readOr(path.join(CAP, 'images/ext-manifest.json'), {});
/* the same captures, read a second way: structure kept, blanks and images in place.
   `q` (flat, hers verbatim) stays the id + search text; `qh` is what the student sees. */
const STEMS = structuredStems(CAP, manifest, extManifest);

/* quiz id -> name + system (titles in the capture are the noscript banner, so
   names are declared here, matching Canvas titles) */
const QUIZ = {
  /* quizzes that belong to the exam, not to one module. `cases` = the starred case studies. */
  211092:['cases','Case Study Formative Test · Modules 1–2'],
};

/* Questions the pipeline cannot render truthfully, held on purpose rather than
   shipped broken. Matched by quiz + normalised stem prefix. (211112 #1 "Label the
   glands" used to live here; it now has an authored image-stem in
   content/authored-stems.js, so it ships.) */
const EXCLUDE = [
];

/* Questions held as "image did not survive" whose only image is a dead or decorative
   reference (a failed external image, an empty [[IMG]]) and which are fully answerable
   from their own text or pairs. Shipped as text rather than held on a phantom figure.
   Matched by quiz + normalised stem prefix; a stale entry fails the build. */
const NO_IMAGE_OK = [
];
const noImgOkUsed = new Set(), noImgOkStale = [];

/* A blank her KEY defines but her STEM never shows: in the PNS receptor table she printed "Photo receptors" as plain text
   and left its dropdown out, so Canvas itself shows three dropdowns for a four-blank key. A blank the student cannot see
   cannot be asked — it is dropped here, by name, and the rest renumbered. Explicit on purpose: the general rule stays
   "every key blank must be inline", so a blank the READER lost still fails the build. A stale entry fails it too. */
const ORPHAN_BLANKS = [
];
const orphanUsed = new Set();

/* deal-weight routing for mixed-quiz questions — coarse by design; used for
   stratification only, never for a coverage claim. APPEND rules, never insert. */
const ROUTE = [
  ['gen', /\b(allele|genotype|phenotype|homozyg|heterozyg|pedigree|karyotype|chromosom|dominant|recessive|punnett|inherit|mutation|trisomy|x-linked|autosom|gene)/i],
  ['repro', /\b(sperm|ovar|uter|testis|testes|oocyte|follicle|ovulat|menstrua|endometri|placenta|fertilis|fertiliz|semen|prostate|estrogen|progesterone|testosterone|lactat|pregnan)/i],
  ['senses', /\b(eye|retina|cornea|lens|pupil|iris|cone|rods?|cochlea|ear|hearing|sound|deaf|tympan|ossicle|light|refract|wavelength|frequency|pitch|decibel|vision|myopi|hyperopi)/i],
];
const routeSys = (txt) => (ROUTE.find(([, re]) => re.test(txt)) || ['mixed'])[0];

/* id hashes the CONTENT (stem + key), not the position — Canvas renumbers, and a
   review quiz can carry the same stem twice; identical content dedupes silently. */
const qid = (quiz, stem, content) =>
  'q' + crypto.createHash('sha1').update(quiz + '|' + stem + '|' + JSON.stringify(content ?? '')).digest('hex').slice(0, 10);

const stripImgRefs = (s) => s
  .replace(/\[\[IMG[^\]]*\]\]/g, ' ')
  /* Canvas page furniture that leaks into stems — never part of the question */
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/\(?\s*Links to an external site\.?\s*\)?/gi, ' ')
  .replace(/This video may display YouTube ads\.?/gi, ' ')
  .replace(/Continue to YouTube content\.?/gi, ' ')
  .replace(/Minimize embedded content\.?/gi, ' ')
  .replace(/\s+/g, ' ').trim();

const questions = [], held = [], quizzes = [];
const saqUsed = new Set();
const structFails = []; let nInline = 0;
const overridesUsed = new Set();
const authoredUsed = new Set();

for (const z of bank.quizzes) {
  const fid = (z.file.match(/HS2CAP-(\d+)/) || [])[1];
  const [qsys, qname] = QUIZ[fid] || ['mixed', 'Quiz ' + fid];
  let kept = 0;
  z.questions.forEach((q, idx) => {
    if (q.type === 'text_only_question' || q.type === 'unknown') return;
    const stemRaw = q.q || '';
    let stem = stripImgRefs(stemRaw);
    /* Some of her matching questions have NO stem in Canvas itself — the content
       is entirely in the pairs. A synthesised stem keeps them dealable; it is
       labelled generic on purpose, never invented content. */
    if (!stem && q.key && q.key.kind === 'pairs' && q.key.pairs.length >= 2)
      stem = 'Match each item with its correct partner.';
    /* her question printed INSIDE her figure, with no stem text on Canvas at all (211091 #19: the pedigree carries "What pattern
       of inheritance does this trait follow?"). An authored-stems entry keyed on THAT figure file copies the printed words in;
       nothing is invented, the page says where the words come from, and a stale entry fails the build like any other. */
    if (!stem) {
      const fig = AUTHORED_STEMS.find(a => a.quiz === fid && a.fig && ((imgBind[path.basename(z.file)] || {})[idx] || []).includes(a.fig));
      if (fig) stem = fig.stem;
    }
    if (!stem) { held.push({ quiz: qname, why: 'empty stem' }); return; }
    const ex = EXCLUDE.find(e => e.quiz === fid && norm(stem).startsWith(e.k));
    if (ex) { held.push({ quiz: qname, why: ex.why, q: stem.slice(0, 80) }); return; }
    const imgs = ((imgBind[path.basename(z.file)] || {})[idx] || []);
    const okNoImg = NO_IMAGE_OK.find(e => e.quiz === fid && norm(stem).startsWith(e.k));
    if (okNoImg) noImgOkUsed.add(okNoImg);
    if (okNoImg && imgs.length) noImgOkStale.push(`no-image-ok row is stale, the question ships its figure: ${fid} "${okNoImg.k}"`);
    const needsImg = !okNoImg && (/\[\[IMG/.test(stemRaw) || /\b(image|diagram|picture|micrograph|labell?ed|figure) (above|below|shown)\b/i.test(stem));
    if (needsImg && !imgs.length) { held.push({ quiz: qname, why: 'image did not survive capture', q: stem.slice(0, 80) }); return; }
    const sys = qsys === 'mixed' ? routeSys(stem + ' ' + (q.answers || []).map(a => a.text).join(' ')) : qsys;
    const base = { id: qid(fid, stem, q.key), quiz: fid, sys, mod: 'cases', pts: +q.points || 1, q: stem, imgs };
    /* structured stem: only images this question actually ships may be placed inline;
       blank markers are validated per type below, so a stem can never show a blank
       the key does not have, or hide one it does. */
    const authoredSt = AUTHORED_STEMS.find(a => a.quiz === fid && norm(stem).startsWith(a.k));
    if (authoredSt) authoredUsed.add(authoredSt);
    const st = authoredSt ? authoredSt.st : (STEMS[path.basename(z.file)] || {})[idx];
    if (st && st.html) {
      base.qh = st.html.replace(/\[\[IMG:([^\]]+)\]\]/g, (m, f) => imgs.includes(f) ? m : '');
      if (!/<(?:p|ul|ol|div)\b/.test(base.qh)) base.qh = '<p>' + base.qh + '</p>';
    } else base.qh = '<p>' + stem.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '</p>'; // synthesised stem
    /* one-line text of the SAME stem for titles and the Ask-AI prompt — the flat
       capture split words at inline tags ("a nta gonist") and carries "[ Select ]" */
    base.qt = plainText(base.qh);
    const blankMarkers = (h) => [...(h || '').matchAll(/\[\[BLANK:(\d+|\?)\]\]/g)].map(m => m[1]);
    const placeBlanks = (n) => {
      const ks = blankMarkers(base.qh);
      const ok = base.qh && ks.length === n && !ks.includes('?') && new Set(ks).size === n && ks.every(k => +k < n);
      if (!ok) { structFails.push(`${qname} #${idx + 1}: ${n} blanks in key, markers [${ks.join(',')}] in stem — "${stem.slice(0, 60)}"`); base.qh = (base.qh || '').replace(/\[\[BLANK:[^\]]*\]\]/g, '____'); return null; }
      nInline++;
      return st.ctx;
    };
    if (base.qh && q.type !== 'multiple_dropdowns_question' && q.type !== 'fill_in_multiple_blanks_question' && blankMarkers(base.qh).length) {
      structFails.push(`${qname} #${idx + 1}: blank markers in a ${q.type}`); base.qh = base.qh.replace(/\[\[BLANK:[^\]]*\]\]/g, '____');
    }
    /* her one short-answer question (211121 #14, "…is known as an [].") is a typed blank: she wrote "[]" where the answer goes and
       Canvas's accepted answers are its key. It ships as a one-blank typed cloze at her "[]", graded on exactly those answers.
       Only when her stem carries exactly one "[]": anything else stays on the old path (and is held there). */
    if (q.type === 'short_answer_question' && q.key && q.key.kind === 'options' && q.key.correct.length && (base.qh.match(/\[\]/g) || []).length === 1) {
      base.qh = base.qh.replace('[]', '[[BLANK:0]]');
      base.qt = plainText(base.qh);
      q = { ...q, type: 'fill_in_multiple_blanks_question', key: { kind: 'blanks', blanks: [{ label: null, options: q.key.correct, correct: q.key.correct[0] }] } };
    }

    if (q.type === 'essay_question') {
      const hers = HER_ANSWERS.find(a => a.quiz === fid && norm(stem).startsWith(a.k));
      if (hers) { herUsed.add(hers);
        questions.push({ ...base, type: 'essay', pts: base.pts || Math.min(6, hers.steps.length), saq: { steps: hers.steps, src: 'HER own model answer, word for word · from the feedback on her quiz' } });
        kept++; return; }
      const hit = SAQ_ANSWERS.find(a => norm(stem).startsWith(a.k) || norm(stem).includes(a.k));
      if (!hit) { held.push({ quiz: qname, why: 'essay with no authored model answer', q: stem.slice(0, 80) }); return; }
      saqUsed.add(hit.k);
      questions.push({ ...base, type: 'essay', pts: Math.max(base.pts, hit.steps.length ? Math.min(6, hit.steps.length) : base.pts), saq: { steps: hit.steps, src: 'Model answer is the tool’s · from ' + hit.src } });
      kept++; return;
    }
    if (!q.key) { held.push({ quiz: qname, why: 'no extracted key', q: stem.slice(0, 80) }); return; }
    if (q.key.kind === 'pairs') {
      if (q.key.pairs.length < 2) { held.push({ quiz: qname, why: 'matching with <2 recovered pairs', q: stem.slice(0, 80) }); return; }
      questions.push({ ...base, type: 'match', pairs: q.key.pairs, pts: Math.max(base.pts, q.key.pairs.length) });
      kept++; return;
    }
    if (q.key.kind === 'blanks') {
      if (q.key.blanks.some(b => !b.options.length || !b.correct)) { held.push({ quiz: qname, why: 'blank with no options/correct', q: stem.slice(0, 80) }); return; }
      /* bk: how the blank is answered — 'dd' = her dropdown (options are choices, ONE
         is right), 'fib' = typed (options are the accepted spellings, ALL are right).
         The two must grade differently; the old single path marked any dropdown
         choice correct. */
      const bk = q.type === 'multiple_dropdowns_question' ? 'dd' : 'fib';
      let keyBlanks = q.key.blanks, keptIdx = null;
      const orphan = ORPHAN_BLANKS.find(e => e.quiz === fid && norm(stem).startsWith(e.k));
      if (orphan) {
        const present = new Set(blankMarkers(base.qh));
        keptIdx = keyBlanks.map((b, k) => k).filter(k => present.has(String(k)) || !orphan.drop.includes(keyBlanks[k].correct));
        if (keptIdx.length < keyBlanks.length) orphanUsed.add(orphan);
        const remap = new Map(keptIdx.map((k, n) => [String(k), n]));
        base.qh = base.qh.replace(/\[\[BLANK:(\d+)\]\]/g, (m, k) => remap.has(k) ? `[[BLANK:${remap.get(k)}]]` : m);
        keyBlanks = keptIdx.map(k => keyBlanks[k]);
      }
      const ctx0 = placeBlanks(keyBlanks.length);
      const ctx = ctx0 && keptIdx ? Object.fromEntries(keptIdx.map((k, n) => [n, ctx0[k]])) : ctx0;
      const blanks = keyBlanks.map((b, k) => ({ ...b, ctx: ctx ? (ctx[k] || '') : '' }));
      /* extra accepted answers, declared in content/overrides.js and matched here by
         id + blank + her correct answer — a stale override fails the build below */
      for (const o of OVERRIDES.filter(o => o.id === base.id)) {
        const b = blanks[o.blank];
        if (!b || b.correct !== o.correct) continue;
        b.also = [...new Set([...(b.also || []), ...o.also])];
        overridesUsed.add(o);
      }
      questions.push({ ...base, type: 'cloze', bk, blanks, pts: Math.max(base.pts, blanks.length) });
      kept++; return;
    }
    /* options family. Some of her MCQs store options as bare letters (a/b/c/d)
       with the real text only in each answer's title attribute — enrich from the
       title, keys re-derived through the SAME rule so they can never diverge. */
    /* Canvas's title = the answer + "." + its marks ("You selected this answer.", "This was the correct answer."). Strip the marks
       AND that dot: a wrong "23." beside a bare right "92" marked the answer by its shape (2 live in hs2-test2, 24 in hs2-test3). */
    const cleanTitle = t => (t || '').replace(/(?:\.?\s*(?:This was the correct answer|You selected this answer)\.?)+\s*$/i, '').replace(/\.$/, '').trim();
    const enrich = a => { const t = (a.text || '').trim(), ti = cleanTitle(a.titleAttr);
      return (t.length < 3 && ti.length >= 3) ? ti : t; };
    const ans = (q.answers || []).filter(a => (a.text || '').trim() || cleanTitle(a.titleAttr));
    let opts = [...new Set(ans.map(enrich).filter(Boolean))];
    /* "All/None of the above" only means what it says when it IS below the others —
       the capture holds them in Canvas's per-attempt shuffle order. Display order only. */
    const above = o => /^(?:all|none|both) of (?:the above|these)/i.test(o);
    opts = [...opts.filter(o => !above(o)), ...opts.filter(above)];
    const key = [...new Set(ans.filter(a => a.correctClass || a.weight === '100').map(enrich))];
    /* a BARE LETTER is one character A-H. "Shorter than 3" held real answers as letters: genetics' "46", "Hh", "AO", "LH", "0%",
       Module 2's "6" (skeletal muscles), Module 1's "7" (blood pH) and "1"-"4" (O2 per haemoglobin). */
    const bare = o => /^[A-Ha-h]$/.test(o.trim());
    /* her lettered list may be in either case: "A. Calcitonin B. Parathyroid hormone C. Oestrogen" */
    const lettered = opts.every(bare) && /\b[a-d]\.\s/i.test(stem);
    if (!opts.length || opts.length < 2 || !key.length || !key.every(k => opts.includes(k))) {
      held.push({ quiz: qname, why: 'key text not among options', q: stem.slice(0, 80) }); return;
    }
    if (opts.every(bare) && !lettered && !imgs.length) {      /* EVERY option a bare letter: blood types A · B · AB · O are answers, not letters */
      held.push({ quiz: qname, why: 'letter-only options with no lettered stem or image', q: stem.slice(0, 80) }); return;
    }
    const type = q.type === 'true_false_question' ? 'tf'
      : q.type === 'multiple_answers_question' ? 'multi' : 'mcq';
    /* bare-letter options (a/b/c/d) get their text from the stem's own lettered list,
       so the card reads "b. Fibula" instead of "b" — display only; the key stays hers.
       Only when every option letter is found exactly once in the stem. */
    let ol = null;
    if (lettered) {
      const found = {};
      for (const m of stem.matchAll(/(?:^|\s)([a-d])\.\s*(.+?)(?=\s+[a-d]\.\s*\S|$)/gi)) { const L = m[1].toLowerCase(); if (found[L]) { found.__dup = true; } found[L] = m[2].trim(); }
      if (!found.__dup && opts.every(o => found[o.toLowerCase()])) ol = Object.fromEntries(opts.map(o => [o, found[o.toLowerCase()]]));
    }
    questions.push({ ...base, type, opts, key, ...(ol ? { ol } : {}) });
    kept++;
  });
  if (kept) quizzes.push({ id: fid, name: qname, sys: qsys, mod: 'cases', n: kept });
}

/* ── the explain layer: video + judged text references per question ── */
const GH = path.resolve(HERE, '..');
const SIMS = [['m1', 'hs2-paper-m1'], ['m2', 'hs2-test2'], ['m3', 'hs2-test3']];
{
  const shelf = new Map();
  for (const [, dir] of SIMS) for (const v of JSON.parse(fs.readFileSync(path.join(GH, dir, 'content', 'dmdm-all.json'), 'utf8'))) if (!shelf.has(v.id)) shelf.set(v.id, v);
  fs.writeFileSync(path.join(HERE, 'content', 'dmdm-all.json'), JSON.stringify([...shelf.values()], null, 1));
}
const videos = loadVideos(path.join(HERE, 'content'));
const vmatches = loadVideoMatches(path.join(HERE, 'content'), videos);
const rmatches = loadRefMatches(path.join(HERE, 'content'));
const pmatches = loadPartRefs(path.join(HERE, 'content'));
let nPartQ = 0, nPartRefs = 0; const pmUsed = new Set();
const SLIDESRC = path.join(CAP, 'slides');
let nVid = 0, nRef = 0, nSlide = 0, nSlideText = 0, nHer = 0, nCourse = 0, nPat = 0, nPatOnly = 0;
const usedSlides = new Set(), vmUsed = new Set(), rmUsed = new Set();
for (const q of questions) {
  const v = matchVideo(q, videos, vmatches); if (v) { q.vid = v; nVid++; vmUsed.add(q.id); }
  const refs = [];
  for (const r of matchRefs(q, rmatches)) {
    rmUsed.add(q.id);
    if (r.k === 'slide') {
      /* A question that carries its OWN image is its own authority — a retrieved
         slide with a different letter/label scheme beside it contradicts the
         figure the student just answered on (the label-the-glands bug). Such
         questions keep text references only, never a second figure. */
      if (q.imgs.length) continue;
      const png = path.join(SLIDESRC, r.slug, `slide-${r.n}.png`);
      if (fs.existsSync(png)) {
        const name = `${r.slug}-${r.n}.jpg`;
        usedSlides.add(JSON.stringify([png, name]));
        refs.push({ k: 'slide', src: r.src, slide: name }); nSlide++;
      } else if (r.t) { refs.push({ k: 'slide', src: r.src, t: r.t }); nSlideText++; }   /* deck not rendered: quote the slide's own words — never point at a picture we can't show */
    } else {
      refs.push(r);
      if (r.k === 'her') nHer++; else if (r.k === 'course') nCourse++; else nPat++;
    }
  }
  if (refs.length) { q.refs = refs; nRef++; if (refs.every(r => r.k === 'patton')) nPatOnly++; }
  const prefs = matchParts(q, pmatches);
  if (prefs.length) { q.prefs = prefs; nPartQ++; nPartRefs += prefs.length; pmUsed.add(q.id); }
}
console.log(`references per part: ${nPartRefs} parts referenced over ${nPartQ} multi-part questions`);
console.log(`explain layer: ${nVid}/${questions.length} questions matched a video (${Math.round(100 * nVid / questions.length)}%); ` +
  `${nRef} carry a judged reference (${nSlide} her slide images + ${nSlideText} slides quoted as text, ${nHer} her prose, ${nCourse} course files, ${nPat} Patton excerpts; ${nPatOnly} Patton-only) — from ${videos.length} videos`);
/* compress + ship only the referenced slides */
const SLIDEOUT = path.join(HERE, 'img', 'slides');
fs.mkdirSync(SLIDEOUT, { recursive: true });
fs.writeFileSync(path.join(HERE, 'slides-todo.json'),
  JSON.stringify([...usedSlides].map(s => JSON.parse(s)), null, 1));

/* her worked helpline answer, under the question: q.hl = the focus topic whose section
   teaches this question (content/qtopic.js, read by hand). Both directions gated: an id
   that matches no live question is stale, a topic with no section would render nothing. */
let nHl = 0; const hlUsed = new Set();
for (const q of questions) if (QTOPIC[q.id]) { q.hl = QTOPIC[q.id]; nHl++; hlUsed.add(q.id); }
/* ── gates ─────────────────────────────────────────────────────────── */
const fails = [];
for (const [qid, t] of Object.entries(QTOPIC)) {
  if (!hlUsed.has(qid)) fails.push('qtopic entry matched NO question: ' + qid);
  if (!HELPLINE[t]) fails.push(`qtopic topic has no helpline section: ${t} (${qid})`);
}
/* an essay HELD for another reason (its figure did not capture) keeps her answer on file without failing the build */
for (const a of HER_ANSWERS) if (!herUsed.has(a) && !held.some(h => h.q && a.k.startsWith(norm(h.q).slice(0, 50)))) fails.push('her-answers entry matched NO essay: ' + a.quiz + ' "' + a.k + '"');
for (const a of SAQ_ANSWERS) if (!saqUsed.has(a.k)) fails.push('saq-answers entry matched NO essay: "' + a.k + '"');
/* a verified video match whose question id no longer exists is stale evidence,
   not a harmless extra — same rule as an override that matched nothing */
for (const qid of Object.keys(vmatches)) if (!vmUsed.has(qid)) fails.push('video-matches entry matched NO question: ' + qid);
for (const qid of Object.keys(rmatches)) if (!rmUsed.has(qid)) fails.push('ref-matches entry matched NO question: ' + qid);
for (const qid of Object.keys(pmatches)) if (!pmUsed.has(qid)) fails.push('part-refs entry matched NO question: ' + qid);
/* identical content captured twice (review quizzes repeat questions) — keep one */
const dup = new Set(); let dropped = 0;
for (let i = questions.length - 1; i >= 0; i--) {
  if (dup.has(questions[i].id)) { questions.splice(i, 1); dropped++; }
  else dup.add(questions[i].id);
}
if (dropped) console.log('deduped', dropped, 'identical duplicate captures');
/* the shipped OWN bank as plain text, for reading by eye — never shipped */
fs.writeFileSync(path.join(HERE, 'bank-dump.json'), JSON.stringify(questions.map(q => ({ id: q.id, quiz: q.quiz, type: q.type, pts: q.pts, t: q.qt })), null, 0));
const TYPE_RANK = { mcq: 0, tf: 0, multi: 1, match: 2, cloze: 3, essay: 4 };
for (const q of questions) for (const f of q.imgs) if (!fs.existsSync(path.join(CAP, 'images', f))) fails.push('missing image file ' + f);
for (const c of CHAINS) if (c.beads.filter(b => b.t).length < 4) fails.push('chain too short: ' + c.id);
/* every blank-type question must carry every one of its blanks inline, once, in the
   stem the student sees — a blank the key has but the stem lacks is the exact bug this
   layer exists to kill, so it fails the build rather than falling back quietly */
for (const s of structFails) fails.push('stem structure: ' + s);
for (const o of OVERRIDES) if (!overridesUsed.has(o)) fails.push(`override matched nothing: ${o.id} blank ${o.blank} "${o.correct}"`);
for (const a of AUTHORED_STEMS) if (!authoredUsed.has(a)) fails.push(`authored-stem matched NO question: ${a.quiz} "${a.k}"`);
for (const e of ORPHAN_BLANKS) if (!orphanUsed.has(e)) fails.push(`orphan-blank rule dropped nothing: ${e.quiz} "${e.k}"`);
for (const e of NO_IMAGE_OK) if (!noImgOkUsed.has(e)) fails.push(`no-image-ok matched NO question: ${e.quiz} "${e.k}"`);
fails.push(...noImgOkStale);
/* an option must not carry Canvas's marks or the dot its title appends: either one tells the answer apart by its shape */
for (const q of questions) for (const o of [...(q.opts || []), ...(q.key || [])]) if (typeof o === 'string' && (/you selected this answer|this was the correct answer/i.test(o) || /^[^\s.]{2}\.$/.test(o))) fails.push(`option carries a Canvas title mark: ${q.id} "${o}"`);
for (const q of questions) if (!q.qh) fails.push('no structured stem for ' + q.id + ' "' + q.q.slice(0, 60) + '"');
for (const q of questions) if (q.qh && /\[\[(?!IMG:|BLANK:\d+\]\])/.test(q.qh)) fails.push('stray marker in ' + q.id);
if (fails.length) { console.error('BUILD FAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log(`her worked helpline answer under ${nHl} questions`);
console.log(`structured stems: ${questions.filter(q => q.qh).length}/${questions.length} · blanks placed inline in ${nInline} cloze questions`);

/* ── 2. the three module sims, imported AS BUILT ───────────────────── */
const readData = (dir) => { const h = fs.readFileSync(path.join(GH, dir, 'index.html'), 'utf8'); const i = h.indexOf('const DATA = ');
  if (i < 0) throw new Error('no DATA in ' + dir + '/index.html'); return JSON.parse(h.slice(i + 13, h.indexOf('\n', i) - 1)); };
const SIMDATA = Object.fromEntries(SIMS.map(([m, dir]) => [m, readData(dir)]));
const fails2 = [], hotMissing = [];
/* a figure stays where its sim ships it: `../<sim>/img/<file>` from this page (same origin on GitHub Pages, and the same when
   the estate root is served locally). The template reads a name with a '/' in it as a path. */
const hot = (dir, sub, f) => { const p = path.join(GH, dir, 'img', sub, f); if (!fs.existsSync(p)) hotMissing.push(p); return `../${dir}/img/${sub ? sub + '/' : ''}${f}`; };
const ownIds = new Set(questions.map(q => q.id));
let nImported = 0;
for (const [mod, dir] of SIMS) {
  const D = SIMDATA[mod];
  for (const q0 of D.questions) {
    if (ownIds.has(q0.id)) { fails2.push(`${dir} question ${q0.id} has the same id as one of the final's own`); continue; }
    const q = JSON.parse(JSON.stringify(q0));
    q.mod = mod;
    q.imgs = (q.imgs || []).map(f => hot(dir, '', f));
    if (q.qh) q.qh = q.qh.replace(/\[\[IMG:([^\]]+)\]\]/g, (m, f) => `[[IMG:${hot(dir, '', f)}]]`);
    for (const r of q.refs || []) if (r.slide) r.slide = hot(dir, 'slides', r.slide);
    questions.push(q); nImported++;
  }
  for (const z of D.quizzes) quizzes.push({ ...z, mod });
}
if (hotMissing.length) fails2.push(`${hotMissing.length} imported figure(s) not on disk in their sim, e.g. ${hotMissing[0]}`);

/* ── 3. the ten starred cases, as written questions ───────────────── */
const m1cases = Object.fromEntries((SIMDATA.m1.cases || []).map(c => [c.id, c]));
const caseQs = {}, caseHeld = [];
const escH = t => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
for (const c of CASES) {
  let from = c;
  if (c.from) { const m = m1cases[c.from.split(':')[1]]; if (!m) { fails2.push(`case ${c.id}: ${c.from} is not in hs2-paper-m1's built cases`); continue; } from = { ...c, scenario: m.scenario, questions: m.questions }; }
  const qz = 'case-' + c.id; caseQs[c.id] = [];
  for (const cq of from.questions || []) {
    if (!cq.steps || !cq.steps.length || !cq.src) { fails2.push(`case ${c.id}: a question with no steps or no source: "${cq.q.slice(0, 50)}"`); continue; }
    const imgs = cq.img ? [cq.img] : [];
    for (const f of imgs) if (!fs.existsSync(path.join(HERE, 'img', f))) fails2.push(`case ${c.id}: figure ${f} is missing — run python host-figs.py`);
    const q = { id: qid(qz, cq.q, cq.steps), quiz: qz, sys: c.sys, mod: 'cases', cmod: c.mod, type: 'essay', pts: cq.marks || cq.steps.length,
      q: cq.q, imgs, qh: '<p>' + escH(cq.q) + '</p>', qt: cq.q, saq: { steps: cq.steps, src: cq.src }, scenario: c.name + ' — ' + from.scenario };
    questions.push(q); caseQs[c.id].push(q.id);
  }
  for (const h of c.held || []) caseHeld.push({ quiz: c.name, why: h.why, q: h.q.slice(0, 80) });
  if (caseQs[c.id].length) quizzes.push({ id: qz, name: c.name, sys: c.sys, mod: 'cases', n: caseQs[c.id].length });
}

/* ── 4. her exam revision deck (content/revision-deck.js): her 30 exam-style slides, as a quiz. Every key was read off her
   red answer slide; the answer slide itself rides under each question as "her slide" (shipped via slides-todo.json). ── */
const slideJpg = n => `${REVDECK.slug}-${n}.jpg`;
const revIds = [];
for (const it of REVDECK.items) {
  for (const n of [it.q, it.a]) {
    const png = path.join(CAP, 'slides', REVDECK.slug, `slide-${n}.png`);
    if (!fs.existsSync(png)) { fails2.push(`revision deck slide ${n} is not rendered (${png})`); continue; }
    usedSlides.add(JSON.stringify([png, slideJpg(n)]));
  }
  const q = { id: qid(REVDECK.quiz, it.q + '|' + it.stem, it.type === 'essay' ? it.steps : it.key), quiz: REVDECK.quiz, sys: it.sys, mod: it.mod, type: it.type,
    pts: it.type === 'essay' ? (it.steps || []).length : 1, q: it.stem, qh: '<p>' + escH(it.stem) + '</p>', qt: it.stem,
    imgs: it.fig ? ['img/slides/' + slideJpg(it.q)] : [], refs: [{ k: 'slide', src: `Her exam revision deck · slide ${it.a}, her answer in red`, slide: slideJpg(it.a) }] };
  if (it.type === 'essay') {
    if (!it.steps || !it.steps.length) fails2.push(`revision deck slide ${it.q}: a written question with no answer lines`);
    q.saq = { steps: it.steps, src: `Her answer · her exam revision deck, slide ${it.a}` };
  } else if (it.type === 'tf') {
    q.opts = ['True', 'False']; q.key = it.key;
    if (it.key.length !== 1 || !q.opts.includes(it.key[0])) fails2.push(`revision deck slide ${it.q}: a true/false key that is neither`);
  } else {
    q.opts = it.opts; q.key = it.key;
    if (!it.key.length || !it.key.every(k => it.opts.includes(k)) || (it.type === 'mcq' && it.key.length !== 1)) fails2.push(`revision deck slide ${it.q}: key not among its options`);
  }
  if (questions.some(x => x.id === q.id)) fails2.push(`revision deck slide ${it.q}: the same question twice`);
  questions.push(q); revIds.push(q.id);
}
quizzes.push({ id: REVDECK.quiz, name: REVDECK.name, sys: 'mixed', mod: 'exam', n: revIds.length });
fs.writeFileSync(path.join(HERE, 'slides-todo.json'), JSON.stringify([...usedSlides].map(s => JSON.parse(s)), null, 1));

/* ── the exam checklist: the ten cases on top (HER words), then every module row, re-tiered on its own marks ── */
const byIdAll = new Map(questions.map(q => [q.id, q]));
const impRows = {};
for (const [mod] of SIMS) for (const f of SIMDATA[mod].focus || []) impRows[mod + ':' + f.id] = f;
const ownByCase = {};
for (const q of questions.filter(q => q.quiz === '211092')) {
  const hits = CASES.filter(c => (c.formative || []).some(k => norm(q.q).includes(k)));
  if (hits.length !== 1) { fails2.push(`formative question sits on ${hits.length} case rows: "${q.q.slice(0, 60)}"`); continue; }
  (ownByCase[hits[0].id] = ownByCase[hits[0].id] || []).push(q.id);
}
for (const c of CASES) for (const k of c.formative || []) if (!questions.some(q => q.quiz === '211092' && norm(q.q).includes(k))) fails2.push(`case ${c.id}: formative fragment matched nothing: "${k}"`);
const rowOut = (f, ids) => {
  const seen = new Set(), qs = [];
  for (const id of ids) { const q = byIdAll.get(id); if (!q) { fails2.push(`row ${f.id}: question ${id} is not in the bank`); continue; } if (!seen.has(id)) { seen.add(id); qs.push(q); } }
  const ordered = qs.map((q, i) => [q, i]).sort((a, b) => (TYPE_RANK[a[0].type] ?? 5) - (TYPE_RANK[b[0].type] ?? 5) || a[1] - b[1]).map(x => x[0]);
  return { ...f, all: ordered.length, n: ordered.length, pts: +ordered.reduce((a, q) => a + (q.pts || 0), 0).toFixed(1),
    qz: new Set(ordered.map(q => q.quiz)).size, saq: ordered.filter(q => q.type === 'essay' || q.type === 'cloze').length, qs: ordered.map(q => q.id) };
};
const FOCUS_OUT = [];
for (const c of CASES) {
  const ids = [...(ownByCase[c.id] || []), ...(caseQs[c.id] || [])];
  for (const p of c.pull || []) {
    const [pm, pid] = p.split(':');
    if (/^\d+$/.test(pid)) { const got = questions.filter(q => q.mod === pm && q.quiz === pid).map(q => q.id); if (!got.length) fails2.push(`case ${c.id}: pull ${p} matched no question`); ids.push(...got); }
    else { const r = impRows[p]; if (!r) fails2.push(`case ${c.id}: pull row ${p} is not a module checklist row`); else ids.push(...(r.qs || [])); }
  }
  FOCUS_OUT.push(rowOut({ id: 'case-' + c.id, sys: c.sys, mod: c.mod, tier: 0, flag: 'S', crit: `Case Study Booklet A · case ${c.n}, starred`, t: c.name,
    done: c.done, ask: c.ask, cap: c.cap, held: (c.held || []).map(h => h.q), pull: c.pull || [] }, ids));
}
FOCUS_OUT.push(rowOut({ id: 'rev-exam', sys: 'mixed', mod: 'exam', tier: 0, flag: 'X', crit: 'Her “Exam Revision ppt for Hs2 Final”, linked from her Module 3 Completion page',
  t: 'Her exam revision deck — the questions she chose for the final',
  done: `Answer all ${revIds.length} cold, then check each against her red answer slide. Her charades slides (2–24) are the terms she wants you able to act out: ${REVDECK.charades.join(', ')} — say what each one means.`,
  ask: 'MCQ, true/false, fill-the-gaps and short explanations: brain areas on her lettered figure, asthma and airway resistance, the bicarbonate buffer, insulin and the islets, baroreceptors and blood pressure, two pedigrees, RG colour blindness, the cycle graph.',
  cap: 'Her 30 slides, answered the way she answers them.' }, revIds));
for (const [mod, dir] of SIMS) for (const f of SIMDATA[mod].focus || []) {
  if (mod === 'm1' && f.id === 'exam-cases') continue;      /* Module 1's own "exam cases 2, 3, 4" row: the three case rows above replace it */
  const r = rowOut({ ...f, mod }, f.qs || []);
  /* THE TRIAGE (content/case-topics.js): a row one of her cases stands on is tier 1; off the cases, big rows (30+ marks) are
     tier 2 and the rest tier 3. A module row's own tier-0 (her words about ITS test) is not a word about the exam. */
  r.cases = Object.entries(CASE_TOPICS).filter(([, t]) => t.rows.includes(mod + ':' + f.id)).map(([c]) => c);
  r.tier = r.cases.length ? 1 : r.pts >= 30 ? 2 : 3;
  if (f.tier === 0) r.was0 = dir;
  FOCUS_OUT.push(r);
}
{ const ids = new Set(); for (const f of FOCUS_OUT) { if (ids.has(f.id)) fails2.push('checklist row id twice: ' + f.id); ids.add(f.id); } }
for (const [c, t] of Object.entries(CASE_TOPICS)) {
  if (!CASES.some(x => x.id === c)) fails2.push(`case-topics: ${c} is not a case`);
  for (const r of t.rows) if (!impRows[r]) fails2.push(`case-topics ${c}: ${r} is not a module checklist row`);
}
/* the exam core: A = the questions she wrote FOR this exam (the cases, her formative test, her revision deck); B = every
   module question on a row a case stands on. The home page deals from A until every A question has been seen once. */
const coreA = questions.filter(q => /^case-/.test(q.quiz) || q.quiz === '211092' || q.quiz === REVDECK.quiz).map(q => q.id);
const inA = new Set(coreA);
const coreB = [...new Set(FOCUS_OUT.filter(f => f.tier === 1).flatMap(f => f.qs || []))].filter(id => !inA.has(id));
console.log(`exam core: ${coreA.length} of her exam questions, then ${coreB.length} module questions on the case topics (of ${questions.length})`);
/* her MODULE 1 HELPLINE (content/helpline-m1.js): each section under the Module 1 row it answers, and under the questions
   read by hand as answered by it (`pin`) plus the case / revision-deck questions named by stem (`stems`). Gated both ways. */
let nHlM1 = 0;
for (const [rid, sec] of Object.entries(HELPLINE_M1)) {
  const row = FOCUS_OUT.find(f => f.id === rid && f.mod === 'm1');
  if (!row) { fails2.push(`helpline-m1: ${rid} is not a Module 1 checklist row`); continue; }
  row.hl = sec.hl; row.hlUrl = sec.url;
  const put = (q, why) => { if (q.hl) fails2.push(`helpline-m1 ${rid}: ${q.id} already sits on helpline ${q.hl} (${why})`); else { q.hl = rid; nHlM1++; } };
  for (const id of sec.pin) { const q = byIdAll.get(id); if (!q) fails2.push(`helpline-m1 ${rid}: pinned question ${id} is not in the bank`); else put(q, 'pin'); }
  for (const [quiz, k] of sec.stems) {
    const hits = questions.filter(q => q.quiz === quiz && norm(q.q).includes(k));
    if (hits.length !== 1) fails2.push(`helpline-m1 ${rid}: "${k}" matches ${hits.length} questions in ${quiz}`); else put(hits[0], k);
  }
}
/* her worked helpline answers: Module 2's travel with its sim; Module 1's come from content/helpline-m1.js */
const HELP = Object.assign({}, ...SIMS.map(([m]) => SIMDATA[m].helpline || {}),
  Object.fromEntries(Object.entries(HELPLINE_M1).map(([k, v]) => [k, { url: v.url, from: v.from, parts: v.parts }])));
console.log(`her Module 1 helpline: ${Object.keys(HELPLINE_M1).length} sections, under ${nHlM1} questions`);
for (const q of questions) if (q.hl && !HELP[q.hl]) fails2.push(`question ${q.id} points at helpline section ${q.hl}, which no sim ships`);
const CHAINS_ALL = [...CHAINS, ...SIMS.flatMap(([m]) => SIMDATA[m].chains || [])];
if (fails2.length) { console.error('BUILD FAILED:\n  ' + fails2.join('\n  ')); process.exit(1); }
console.log(`imported ${nImported} questions from the three module sims (${SIMS.map(([m, d]) => d + ' ' + SIMDATA[m].questions.length).join(' · ')}); figures hot-linked, all on disk`);
console.log(`cases: ${CASES.map(c => c.id + ' ' + (caseQs[c.id] || []).length + (c.held && c.held.length ? '+' + c.held.length + ' held' : '')).join(' · ')}`);
console.log(`revision deck: ${revIds.length} questions from ${new Set(REVDECK.items.map(it => it.q)).size} of her question slides`);
console.log(`checklist: ${FOCUS_OUT.length} rows — ${FOCUS_OUT.filter(f => f.tier === 0).length} on top (10 cases + her revision deck)`);

/* ── emit ──────────────────────────────────────────────────────────── */
/* video reach is a stat, not a sentence: the template reads these so the home
   screen can never quote a count the bank has moved past */
const reached = new Set();
for (const q of questions) if (q.vid) { reached.add(q.vid.id); if (q.vid.alt) reached.add(q.vid.alt.id); }
const withRefs = questions.filter(q => q.refs && q.refs.length);
const DATA = {
  built: new Date().toISOString().slice(0, 10),
  stats: { n: questions.length, held: held.length + caseHeld.length, videos: videos.length, videosReached: reached.size,
    videosFill: videos.filter(v => v.ch).length,
    withVideo: questions.filter(q => q.vid).length,
    withRef: withRefs.length, withHer: questions.filter(q => q.refs && q.refs.some(r => r.k === 'slide' || r.k === 'her')).length,
    withCourse: questions.filter(q => q.refs && q.refs.some(r => r.k === 'course')).length,
    withPatton: questions.filter(q => q.refs && q.refs.some(r => r.k === 'patton')).length,
    pattonOnly: withRefs.filter(q => q.refs.every(r => r.k === 'patton')).length,
    partQ: questions.filter(q => q.prefs && q.prefs.length).length, partRefs: questions.reduce((a, q) => a + (q.prefs || []).length, 0),
    withHl: questions.filter(q => q.hl).length,
    byMod: Object.fromEntries(['m1', 'm2', 'm3', 'cases', 'exam'].map(m => [m, questions.filter(q => q.mod === m).length])) },
  quizzes: quizzes.sort((a, b) => a.mod.localeCompare(b.mod) || a.sys.localeCompare(b.sys) || a.name.localeCompare(b.name)),
  questions, chains: CHAINS_ALL, case7: null, focus: FOCUS_OUT, helpline: HELP, held: [...held, ...caseHeld],
  core: { a: coreA, b: coreB },
};
const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
/* An unbalanced <details> fails silently: a stray </details> closed the focus checklist right after its intro, so
   all 37 rows sat outside it and the card could not be folded (hs2-test3 and hs2-paper-m1, 2026-09-21). */
{
  const open = (tpl.match(/<details\b/g) || []).length, shut = (tpl.match(/<\/details>/g) || []).length;
  if (open !== shut) { console.error(`BUILD FAILED: template.html opens ${open} <details> and closes ${shut}`); process.exit(1); }
}
const marker = '/*@BANK@*/';
if (tpl.split(marker).length !== 2) { console.error('BUILD FAILED: expected exactly one ' + marker); process.exit(1); }
if (tpl.split('/*@SHORTS@*/').length !== 2) { console.error('BUILD FAILED: expected exactly one /*@SHORTS@*/'); process.exit(1); }
/* the short versions of her case answers (content/case-shorts.js, 26 Sep 2026), gated against THIS build's questions:
   a case answer edited in content/cases.js without its short version following fails here, not on his phone */
const { shorts: SHORTS, fails: shortFails } = loadShorts(DATA.questions);
if (shortFails.length) { console.error('BUILD FAILED — short versions:\n  ' + shortFails.join('\n  ')); process.exit(1); }
const out = tpl.replace('/*@SHORTS@*/', () => shortsJSON(SHORTS)).replace(marker, JSON.stringify(DATA));
fs.writeFileSync(path.join(HERE, 'index.html'), out);

/* Parse-check the page's own inline script before it ships. A single bad escape
   kills the whole app with nothing but a blank page and exit code 0 - this is the
   cheapest possible guard against that. */
{
  const scripts = [...out.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!scripts.length) { console.error('BUILD FAILED: no inline script found to verify'); process.exit(1); }
  scripts.forEach((src, i) => {
    try { new Function(src); }
    catch (e) {
      console.error(`BUILD FAILED: inline script #${i + 1} does not parse - ${e.message}`);
      const line = (e.lineNumber || 0);
      console.error(src.split('\n').slice(Math.max(0, line - 3), line + 2).join('\n'));
      process.exit(1);
    }
  });
  console.log(`script parse check: ${scripts.length} inline script(s) OK`);
}

/* images ship beside the page */
const IMGDIR = path.join(HERE, 'img');
fs.mkdirSync(IMGDIR, { recursive: true });
const used = new Set(questions.filter(q => q.mod === 'cases' && q.quiz === '211092').flatMap(q => q.imgs));
for (const f of used) fs.copyFileSync(path.join(CAP, 'images', f), path.join(IMGDIR, f));

fs.writeFileSync(path.join(HERE, 'held.json'), JSON.stringify(DATA.held, null, 1));
const by = {}; for (const q of questions) by[q.mod] = (by[q.mod] || 0) + 1;
const byT = {}; for (const q of questions) byT[q.type] = (byT[q.type] || 0) + 1;
console.log('bank:', questions.length, 'questions ·', quizzes.length, 'quizzes ·', used.size, 'images ·', held.length, 'held');
console.log('by module:', JSON.stringify(by), '\nby type:', JSON.stringify(byT));
console.log('index.html', (fs.statSync(path.join(HERE, 'index.html')).size / 1024 | 0) + ' KB');
