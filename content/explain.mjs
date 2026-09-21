/* The explain layer, computed at BUILD time — retrieval, not generation.
   For each question: (1) the video whose captions were judged to teach the
   keyed fact (content/video-matches.json); (2) up to three text references —
   her slide, her prose, a Patton paragraph — each judged to STATE the keyed
   fact and carrying a verbatim quote that this file re-finds in the shipped
   excerpt (content/ref-matches.json). Below the bar -> nothing: no reference
   beats a wrong one, and absence is the information. Nothing here writes
   prose; excerpts are quoted verbatim with their source named. */
import fs from 'node:fs';
import path from 'node:path';

const STOP = new Set(('the and for with which following are was were this that from into onto your their been have has ' +
  'correct answer true false statement statements system systems body called known example examples describe explain ' +
  'identify select choose match mix nervous muscular skeletal endocrine musculoskeletal anatomy physiology overview ' +
  'these those there where when what while would could should more most much many some also then than each other ' +
  'made make making used uses using type types kind kinds part parts main within between because during').split(' '));
const KEEP = new Set('atp csf pth tsh adh ach ecg cns pns ans dna gh fsh lh t3 t4 apc bbb'.split(' '));

export const terms = (s) => {
  const out = new Set();
  for (const w of String(s).toLowerCase().replace(/[^a-z0-9+]+/g, ' ').split(' ')) {
    if (KEEP.has(w) || (w.length >= 4 && !STOP.has(w))) out.add(w);
  }
  return out;
};

const mins = (d) => { const p = String(d).split(':').map(Number); return p.length === 3 ? p[0] * 60 + p[1] : (p[0] || 0); };

export function loadVideos(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'dmdm-all.json'), 'utf8'))
    .map(v => ({ ...v, m: mins(v.d), terms: terms(v.t.replace(/\|.*$/, '')) }));
}

/* The video per question is a LOOKUP into content/video-matches.json, not a
   title match. Until 2026-09-06 this function scored each video's TITLE against
   the question's key + stem terms; it attached 163 videos and roughly a third
   were wrong ("serratus ANTERIOR" bought the Anterior Pituitary video, every
   bone-growth question got the pituitary too). video-matches.json is built
   outside this repo from the videos' own caption tracks: every question's terms
   BM25-scored against 90-second caption windows, the top candidates judged by a
   model reading the caption text, every accepted match's quote located verbatim
   in the captions (that position is `at`), then a second, adversarial pass
   trying to refute each survivor. The captions themselves are not shipped.
   A question with no entry gets no video — absence is the information, and no
   video beats a wrong video. */
const secs = (d) => { const p = String(d).split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : (p[0] || 0) * 60 + (p[1] || 0); };

export function loadVideoMatches(dir, videos) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'video-matches.json'), 'utf8'));
  const byId = new Map(videos.map(v => [v.id, v]));
  const fail = [];
  for (const [qid, list] of Object.entries(j.matches || {})) {
    if (!Array.isArray(list) || !list.length) { fail.push(`${qid}: empty match list`); continue; }
    for (const m of list) {
      const v = byId.get(m.id);
      if (!v) { fail.push(`${qid}: video ${m.id} is not in dmdm-all.json`); continue; }
      if (!Number.isInteger(m.at) || m.at < 0 || m.at >= secs(v.d)) fail.push(`${qid}: ${m.id} at=${m.at}s is outside a ${v.d} video`);
      if (!m.quote || String(m.quote).split(/\s+/).length < 4) fail.push(`${qid}: ${m.id} has no provenance quote`);
    }
  }
  if (fail.length) throw new Error('video-matches.json does not agree with the video list:\n  ' + fail.join('\n  '));
  return j.matches;
}

export function matchVideo(q, videos, matches) {
  const list = matches[q.id];
  if (!list) return null;
  const byId = new Map(videos.map(v => [v.id, v]));
  const shape = (m) => { const v = byId.get(m.id); return { id: v.id, t: v.t.slice(0, 70), d: v.d, at: m.at, ...(Number.isInteger(m.end) ? { end: m.end } : {}), ...(v.ch ? { ch: v.ch } : {}) }; };
  return { ...shape(list[0]), ...(list[1] ? { alt: shape(list[1]) } : {}) };
}

/* Text references are a LOOKUP into content/ref-matches.json, built outside
   this repo (estate scripts/text-refs): every unit of her slides, learning
   pages, Anatomy Monday answers, the lab workbook, the discussion boards and
   helpline answers she posted, her recorded lecture, the other lecture files
   posted in the course and the whole of Patton 9e is BM25-shortlisted per
   question (three lanes: hers, course files, Patton), a model judges from the unit's text whether
   it STATES the keyed fact, every "yes" must carry a 6-15 word quote re-found
   verbatim in the unit, and an adversarial pass tries to refute each survivor.
   Until 2026-09-09 this file picked the ONE passage sharing the most words with
   the stem: 102 of its 347 picks shared no word at all with the keyed answer.
   Each entry: k = slide | her | course | patton (course = a file another lecturer
   posted in the course, shown as a course file, never as hers); slides carry slug + n (the rendered
   image is the reference), text kinds carry t (the sentence(s) around the
   quote, <=70 words) — Patton entries also pg/pp/ch and, for figure captions,
   fig and whether she assigned that figure in her own learning pages. */
const normTok = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
export function loadRefMatches(dir) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'ref-matches.json'), 'utf8'));
  const fail = [];
  for (const [qid, list] of Object.entries(j.matches || {})) {
    if (!Array.isArray(list) || !list.length) { fail.push(`${qid}: empty ref list`); continue; }
    const kinds = new Set();
    for (const r of list) {
      if (!['slide', 'her', 'course', 'patton'].includes(r.k)) { fail.push(`${qid}: unknown kind ${r.k}`); continue; }
      if (kinds.has(r.k)) fail.push(`${qid}: two ${r.k} refs`); kinds.add(r.k);
      if (!r.src) fail.push(`${qid}: ${r.uid} has no source label`);
      const q = normTok(r.quote);
      if (q.length < 4) { fail.push(`${qid}: ${r.uid} has no provenance quote`); continue; }
      if (r.k === 'slide') { if (!r.slug || !Number.isInteger(r.n)) fail.push(`${qid}: slide ref without slug/n`); continue; }
      if (!r.t || r.t.split(/\s+/).length > 80) { fail.push(`${qid}: ${r.uid} excerpt missing or over 80 words`); continue; }
      /* the quote must sit inside the excerpt that ships — the excerpt IS the evidence */
      const t = normTok(r.t).join(' ');
      if (!t.includes(q.join(' '))) {
        // the excerpt may have been trimmed with an ellipsis through the quote's edge; accept >=85% of the quote's tokens in order
        const hit = q.filter(w => t.includes(w)).length / q.length;
        if (hit < 0.85) fail.push(`${qid}: ${r.uid} quote is not in its excerpt: "${r.quote}"`);
      }
      if (r.k === 'patton' && !(Number.isInteger(r.pg) && Number.isInteger(r.pp) && Number.isInteger(r.ch))) fail.push(`${qid}: ${r.uid} Patton ref without page/chapter`);
    }
  }
  if (fail.length) throw new Error('ref-matches.json failed its gates:\n  ' + fail.join('\n  '));
  return j.matches;
}

/* References PER PART (content/part-refs.json, built by estate scripts/text-refs/parts.py):
   for matching / cloze / written questions with 3+ parts, each pair / blank / model step
   can carry the one sentence that states it. Same standard as the whole-question refs -
   judged, a 6-15 word quote re-found in the source, refuted - but the unit is the part,
   because a ten-pair table never has one passage stating half of it while every pair is
   stated somewhere one sentence at a time. Entries: i (1-based part index), k, src, t
   (<=45 words), Patton pg/pp/ch. Slides ship as their words here, never as an image. */
export function loadPartRefs(dir) {
  const f = path.join(dir, 'part-refs.json');
  if (!fs.existsSync(f)) return {};
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const fail = [];
  for (const [qid, list] of Object.entries(j.parts || {})) {
    if (!Array.isArray(list) || !list.length) { fail.push(`${qid}: empty part list`); continue; }
    const seen = new Set();
    for (const r of list) {
      if (!['slide', 'her', 'course', 'patton'].includes(r.k)) { fail.push(`${qid}: unknown kind ${r.k}`); continue; }
      if (!Number.isInteger(r.i) || r.i < 1) fail.push(`${qid}: bad part index ${r.i}`);
      if (seen.has(r.i)) fail.push(`${qid}: two refs for part ${r.i}`); seen.add(r.i);
      if (!r.src) fail.push(`${qid}: part ${r.i} has no source label`);
      const q = normTok(r.quote);
      if (q.length < 4) { fail.push(`${qid}: part ${r.i} has no provenance quote`); continue; }
      if (!r.t || r.t.split(/\s+/).length > 60) { fail.push(`${qid}: part ${r.i} excerpt missing or over 60 words`); continue; }
      const t = normTok(r.t).join(' ');
      if (!t.includes(q.join(' ')) && q.filter(w => t.includes(w)).length / q.length < 0.85) fail.push(`${qid}: part ${r.i} quote is not in its excerpt`);
      if (r.k === 'patton' && !(Number.isInteger(r.pg) && Number.isInteger(r.pp) && Number.isInteger(r.ch))) fail.push(`${qid}: part ${r.i} Patton ref without page/chapter`);
    }
  }
  if (fail.length) throw new Error('part-refs.json failed its gates:\n  ' + fail.join('\n  '));
  return j.parts;
}
export function matchParts(q, prefs) {
  const list = prefs[q.id];
  if (!list) return [];
  const n = (q.pairs || q.blanks || (q.saq && q.saq.steps) || []).length;
  return list.filter(r => r.i <= n).map(r => {
    const out = { i: r.i, k: r.k, src: r.src, t: r.t };
    if (r.k === 'patton') { out.pp = r.pp; out.ch = r.ch; }
    return out;
  });
}

export function matchRefs(q, matches) {
  const list = matches[q.id];
  if (!list) return [];
  return list.map(r => {
    const out = { k: r.k, src: r.src };
    if (r.k === 'slide') { out.slug = r.slug; out.n = r.n; if (r.t) out.t = r.t; }   /* t rides along so an unrendered deck can be quoted */
    else out.t = r.t;
    if (r.k === 'patton') { out.pp = r.pp; out.ch = r.ch; if (r.fig) out.fig = r.fig; if (r.assigned) out.assigned = true; }
    return out;
  });
}
