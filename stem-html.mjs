/* Structured stems.
   The shared parser (hs2-test1/audit/parse-quizzes.mjs) flattens every question_text
   to one line — paragraphs, lists, table rows and image positions all collapse, and
   the inline blanks of a fill-in-multiple-blanks question vanish entirely, so the
   student meets "What is in the middle? … What is in the middle? … Answer 1: Answer 2:"
   with nothing to say which blank is which. This walks the SAME captures and emits,
   per (capture file, question index), a sanitised HTML stem in which every blank and
   every image sits exactly where Canvas put it, as [[BLANK:k]] / [[IMG:file]] markers.

   Read-only over the captures. Nothing here authors content: text is hers, page
   furniture (external-link icons, screen-reader labels, bare URLs, file-download
   link text, YouTube-migration overlays) is dropped exactly as the flat stem already
   drops it. Her external links and embedded videos survive as plain links, because a
   stem that says "see the linked website" with no link is a dead end. `blocks()` is
   the parser's helper, copied byte for byte. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/* Split on a tag with a given class, returning each element's full outer HTML.
   Depth-counts <div> so nested divs do not truncate an element early. */
function blocks(html, className) {
  const out = [];
  const re = new RegExp(`<div[^>]*\\bclass=(?:"[^"]*\\b${className}\\b[^"]*"|${className}\\b)[^>]*>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    let i = m.index + m[0].length, depth = 1;
    const tag = /<\/?div\b/gi;
    tag.lastIndex = i;
    let t;
    while (depth > 0 && (t = tag.exec(html))) {
      depth += t[0][1] === '/' ? -1 : 1;
      const gt = html.indexOf('>', tag.lastIndex);
      i = gt === -1 ? tag.lastIndex : gt + 1;
      tag.lastIndex = i;
    }
    out.push(html.slice(m.index, i));
  }
  return out;
}

const unesc = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&amp;/g, '&');
const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Full-page-save captures inline images as data: URIs instead of the canvas file
   URLs the manifest maps, so a figure that would download as HS2IMG-<id>.png arrives
   as base64 bytes with no id. Give it a stable shipped name from the bytes themselves,
   so resolveImg (below) and bind-images.mjs agree on the SAME file by construction. */
/* SingleFile stores a picture the page uses MORE THAN ONCE in a CSS variable (--sf-img-N: url("data:…")) and leaves the <img> holding an
   empty SVG plus background-image:var(--sf-img-N). Read naively, the question looks like it has no figure. This puts the real data URI
   back into src, so every reader downstream sees an ordinary image. (Found 21 Sep 2026: 13 "missing" figures were in the files all along.) */
/* SingleFile stores an embedded player's whole document in its <iframe srcdoc="…"> (quotes escaped, tags literal), so once
   unquoted src=data: was read, a YouTube channel logo inside it became a question "figure" (3 in Module 3, 21 Sep 2026). The
   embed is not her question: its document is emptied before anything is read. The tag keeps src and title, so it still
   becomes a link. (hs2-paper-m1's prep-capture empties iframes for the same reason.) */
export function dropIframeDocs(html) {
  return html.replace(/(<iframe\b[^>]*?\ssrcdoc=)(?:"[^"]*"|'[^']*')/gi, '$1""');
}
export function inlineSfImages(html) {
  const defs = {};
  for (const m of html.matchAll(/(--sf-img-\d+)\s*:\s*url\(\s*["']?(data:[^"')]+)["']?\s*\)/g)) defs[m[1]] = m[2];
  if (!Object.keys(defs).length) return html;
  /* each <img> is cut out by a quote-aware scan, not [^>]*: the placeholder's src holds an <svg> with ">" in it, and
     SingleFile writes attributes in any order (id= or style= can come before src=) */
  let out = '', pos = 0;
  for (const m of html.matchAll(/<img\b/gi)) {
    if (m.index < pos) continue;
    let i = m.index + 4, q = null;
    for (; i < html.length; i++) { const c = html[i]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break; }
    const tag = html.slice(m.index, i + 1);
    const v = (tag.match(/background-image:var\((--sf-img-\d+)\)/) || [])[1];
    const src = tag.match(/\ssrc\s*=\s*(?:'data:image\/svg\+xml,[^']*'|"data:image\/svg\+xml,[^"]*")/);
    if (!v || !defs[v] || !src) continue;
    out += html.slice(pos, m.index) + tag.replace(src[0], ' src="' + defs[v] + '"');
    pos = i + 1;
  }
  return pos ? out + html.slice(pos) : html;
}
export function dataImgFile(src) {
  if (typeof src !== 'string' || !src.startsWith('data:image/')) return null;
  /* a single-file save leaves a PLACEHOLDER where an image never loaded: an inline (non-base64) SVG of the right size, or an empty
     data:, URI. A placeholder is not her figure — accepting one would ship a pedigree question with a blank picture. Real figures
     are base64 and carry real bytes. */
  if (!/^data:image\/[\w.+-]+;base64,/.test(src) || src.length < 1200) return null;
  const sha = crypto.createHash('sha1').update(src).digest('hex').slice(0, 16);
  const mime = (src.match(/^data:image\/([\w.+-]+)/) || [])[1] || 'png';
  const ext = mime === 'jpeg' ? 'jpg' : mime === 'svg+xml' ? 'svg' : (mime.replace(/[^\w]/g, '') || 'png');
  return `HS2DATA-${sha}.${ext}`;
}
export function writeDataImg(src, dir) {
  const file = dataImgFile(src);
  if (!file) return null;
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) {
    const b64 = src.slice(src.indexOf(',') + 1);
    fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  }
  return file;
}

/* Canvas names each fill-in blank's <input> question_<qid>_<md5>, where the md5 is
   AssessmentQuestion.variable_id(blank_id) = md5("dropdown,<blank_id>,instructure-key").
   Verified against the capture: blank "a" → 8d96cdbb58bd64d59e8ddb2b41b8b48e. */
const variableId = (blankId) =>
  crypto.createHash('md5').update(['dropdown', blankId, 'instructure-key'].join(',')).digest('hex');

/* page furniture that is never part of the question — same list as build.mjs */
const scrubText = (s) => s
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/\(?\s*Links to an external site\.?\s*\)?/gi, ' ')
  .replace(/This video may display YouTube ads\.?/gi, ' ')
  .replace(/Continue to YouTube content\.?/gi, ' ')
  .replace(/Minimize embedded content\.?/gi, ' ');

/* tag → what we emit. Everything not listed is transparent (content kept, tag dropped). */
const BLOCK = { p: 'p', ul: 'ul', ol: 'ol', li: 'li', h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p', blockquote: 'p', pre: 'p' };
const TABLE = { table: '<div class="tbl">', tbody: null, thead: null, tr: '<div class="tr">', td: '<div class="td">', th: '<div class="td">' };
const INLINE = { strong: 'strong', b: 'strong', em: 'em', i: 'em', u: 'u', sub: 'sub', sup: 'sup' };
const DROP = new Set(['script', 'style', 'svg', 'textarea', 'select', 'button', 'object', 'video', 'audio', 'noscript']);
const DROP_SPAN = /\b(?:screenreader-only|external_link_icon|ui-icon)\b/;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? unesc(m[1] ?? m[2] ?? m[3]) : null;
}
const isFileLink = (href) => /\/files\/\d+|\/download\b/.test(href) || !/^https?:\/\//i.test(href);
const videoLink = (src) => {
  const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/) || src.match(/youtu\.be\/([\w-]{6,})/);
  return yt ? `https://www.youtube.com/watch?v=${yt[1]}` : (/^https?:\/\//i.test(src) ? src : null);
};

/* Turn one question_text block into sanitised HTML with markers.
   resolveImg(srcRaw) → shipped file name or null. blankIndexOf(md5) → blank index or -1. */
function structure(qtextHtml, { type, resolveImg, blankIndexOf }) {
  /* strip the outer question_text div itself */
  let html = qtextHtml.replace(/^<div[^>]*>/, '').replace(/<\/div>\s*$/, '');
  const out = [];
  const stack = [];                       // emitted closing tags, innermost last
  let skip = null;                        // {tag, depth} while inside a dropped element
  let fileLinkDepth = 0;                  // inside <a href=…/files/…>: text dropped, images kept
  let boundary = false;                   // an <a> just opened/closed: Canvas often omits the space there
  let nSel = 0;
  const imgs = [];
  const unresolved = [];
  const links = [];
  const push = (s) => out.push(s);
  const tail = () => { for (let i = out.length - 1; i >= 0; i--) if (out[i]) return out[i]; return ''; };
  /* the last visible characters, looking back past tags and markers */
  const textTail = () => out.slice(-6).join('').replace(/<[^>]+>/g, '').replace(/\[\[[^\]]*\]\]/g, ' ');
  const closeTo = (emitted) => {          // close stack down to and including `emitted`
    const i = stack.lastIndexOf(emitted);
    if (i === -1) return false;
    while (stack.length > i) { const e = stack.pop(); if (e !== 'x') push(`</${e}>`); }
    return true;
  };
  /* an inline widget/figure must never be glued to the word before it */
  const spaceBefore = () => { const t = tail(); if (t && !/[\s>(]$/.test(t)) push(' '); };
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
  for (const tok of tokens) {
    if (tok.startsWith('<!--')) continue;
    if (tok[0] === '<') {
      const close = tok[1] === '/';
      const name = (tok.match(/^<\/?\s*([a-zA-Z][\w:-]*)/) || [])[1]?.toLowerCase();
      if (!name) continue;
      if (skip) {
        if (name === skip.tag) { skip.depth += close ? -1 : 1; if (skip.depth <= 0) skip = null; }
        continue;
      }
      /* A capture saved with hidden elements stripped keeps the stem's real <select> (older saves show it as
         the text "[ Select ]"). The blank goes where the select sits: by its md5 name when the blank ids are
         known, else by order — the same order rule the "[ Select ]" text path uses. Its options never reach the stem. */
      if (name === 'select' && !close && /\bquestion_input\b/.test(attr(tok, 'class') || '')) {
        const h = ((attr(tok, 'name') || '').match(/_([0-9a-f]{32})$/) || [])[1];
        const k = h ? blankIndexOf(h) : -1;
        spaceBefore(); push(`[[BLANK:${k >= 0 ? k : nSel}]]`); nSel++;
      }
      if (DROP.has(name)) { if (!close && !/\/>$/.test(tok)) skip = { tag: name, depth: 1 }; continue; }
      if (name === 'iframe') {
        /* an embedded video becomes a plain link with its title — the embed itself
           cannot ship, but "watch this video" with nothing to watch is worse */
        if (!close) {
          const url = videoLink(attr(tok, 'src') || '');
          const title = (attr(tok, 'title') || '').trim();
          if (url) { spaceBefore(); push(`<a class="vid" href="${esc(url)}" target="_blank" rel="noopener">▶ ${esc(title || 'video')}</a>`); links.push(url); }
          if (!/\/>$/.test(tok)) skip = { tag: 'iframe', depth: 1 };
        }
        continue;
      }
      if (name === 'span' && !close && DROP_SPAN.test(attr(tok, 'class') || '')) { skip = { tag: 'span', depth: 1 }; continue; }
      if (name === 'a') {
        const href = attr(tok, 'href') || '';
        if (!close) {
          if (isFileLink(href)) fileLinkDepth++;
          else { boundary = true; push(`<a href="${esc(href)}" target="_blank" rel="noopener">`); stack.push('a'); links.push(href); }
        } else if (fileLinkDepth) fileLinkDepth--;
        else { closeTo('a'); boundary = true; }
        continue;
      }
      if (name === 'br') { push('<br>'); continue; }
      if (name === 'img') {
        const src = attr(tok, 'src') || '';
        const file = resolveImg(src);
        if (file) { spaceBefore(); push(`[[IMG:${file}]]`); imgs.push(file); }
        else unresolved.push(src.slice(0, 120));
        continue;
      }
      if (name === 'input') {
        if (!/\bquestion_input\b/.test(attr(tok, 'class') || '')) continue;
        const h = ((attr(tok, 'name') || '').match(/_([0-9a-f]{32})$/) || [])[1];
        const k = h ? blankIndexOf(h) : -1;
        spaceBefore();
        push(k >= 0 ? `[[BLANK:${k}]]` : '[[BLANK:?]]');
        continue;
      }
      if (name in BLOCK) {
        const e = BLOCK[name];
        if (close) closeTo(e); else { push(`<${e}>`); stack.push(e); }
        continue;
      }
      if (name in TABLE) {
        const open = TABLE[name];
        if (open === null) continue;
        if (close) closeTo('div'); else { push(open); stack.push('div'); }
        continue;
      }
      if (name in INLINE) {
        const e = INLINE[name];
        if (close) closeTo(e); else { push(`<${e}>`); stack.push(e); }
        continue;
      }
      if (name === 'div') {
        /* a generic div is a line of its own (Canvas pastes lettered options as one
           div each — "a. Tibia", "b. Fibula" — and as inline text they run together).
           A PDF paste arrives as one div per PRINTED LINE (class textLayer--absolute),
           so a sentence breaks wherever the PDF wrapped it; mark those so the tidy
           pass can re-join a line onto its predecessor. */
        const dcls = close ? '' : (attr(tok, 'class') || '');
        /* Instructure's own UI wrappers (YouTube-migration overlay, css-* views) are
           chrome, not content: transparent, but still tracked so their close tags
           do not close one of ours */
        if (!close && (/\bcss-|youtube-migration/.test(dcls) || /youtube-migration/.test(attr(tok, 'data-test-id') || ''))) { push(''); stack.push('x'); continue; }
        if (close && stack[stack.length - 1] === 'x') { stack.pop(); continue; }
        const ln = !close && /\btextLayer--absolute\b/.test(dcls);
        if (close) closeTo('div'); else { push(ln ? '<div class="ln">' : '<div>'); stack.push('div'); }
        continue;
      }
      /* span, label, font, etc: transparent */
      continue;
    }
    /* text */
    if (skip) continue;
    let t = unesc(tok);
    if (fileLinkDepth) continue;
    if (type === 'multiple_dropdowns_question' && /^\s*\[\s*Select\s*\]\s*$/.test(t)) { spaceBefore(); push(`[[BLANK:${nSel++}]]`); continue; }
    t = scrubText(t).replace(/\s+/g, ' ');
    if (!t.trim()) { if (t) push(' '); continue; }
    if (boundary && /^\w/.test(t) && /\w$/.test(textTail())) push(' ');
    boundary = false;
    push(esc(t));
  }
  while (stack.length) { const e = stack.pop(); if (e !== 'x') push(`</${e}>`); }
  let s = out.join('');
  /* a link whose whole text was a bare URL is source furniture (an image credit, a
     pasted address) — dropped, as the flat stem always dropped it. Links with words,
     and titled videos, stay. */
  s = s.replace(/<a href="[^"]*" target="_blank" rel="noopener">\s*<\/a>/g, '');
  /* punctuation that follows a bold/italic run must hug the word before it */
  s = s.replace(/\s+(<(?:strong|em|u)>)([,.;:?!])/g, '$1$2').replace(/(<\/(?:strong|em|u)>)\s+([,.;:?!])(?=\s|<|$)/g, '$1$2');
  /* tidy: dead whitespace and empty containers (Canvas emits <p>&nbsp;</p> freely) */
  for (let prev = null; prev !== s;) {
    prev = s;
    s = s
      .replace(/\s+(<\/(?:p|li|ul|ol|div)>)/g, '$1').replace(/(<(?:p|li|ul|ol)>|<div[^>]*>)\s+/g, '$1')
      .replace(/<(p|li|strong|em|u|sub|sup)>\s*<\/\1>/g, '')
      .replace(/<div(?: class="(?:td|tr|tbl|ln)")?>\s*<\/div>/g, '')
      .replace(/<(ul|ol)>\s*<\/\1>/g, '')
      .replace(/(<br>\s*)+(<\/(?:p|li|div)>)/g, '$2').replace(/(<p>|<li>|<div[^>]*>)(\s*<br>)+/g, '$1')
      /* a list item that only wraps another list shows as an empty bullet */
      .replace(/<li>\s*<(ul|ol)>([\s\S]*?)<\/\1>\s*<\/li>/g, '<$1>$2</$1>')
      /* re-join PDF lines: a line that ended mid-sentence continues on the next,
         unless the next line starts a lettered/numbered option */
      .replace(/([^\s.?!:;)"”])<\/div>\s*<div class="ln">(?![a-dA-D]\.\s*\S|\d+\.\s*\S)/g, '$1 ')
      /* two links in a row, and a <br> she dropped mid-sentence */
      .replace(/<\/a>((?:<\/?(?:strong|em)>)*)\s*<a /g, '</a>$1 · <a ')
      /* Canvas wraps an embed in a sized div inside a <p>; the link needs neither */
      .replace(/<p>\s*<div>\s*(<a class="vid"[\s\S]*?<\/a>)\s*<\/div>\s*<\/p>/g, '<p>$1</p>')
      .replace(/(\w)<br>(?=[a-z])/g, '$1 ')
      /* "(C7) , a person" — a space left behind by a stripped inline tag */
      .replace(/(\S) +([,.;:?!])(?=\s|<|$)/g, '$1$2')
      .replace(/ {2,}/g, ' ');
  }
  s = s.replace(/<div class="ln">/g, '<div>').trim();
  return { html: s, imgs, unresolved, nSel, links };
}

/* A Canvas layout table with a row of captions above a row of figures reads fine on
   a desktop, but the cells stack on a phone and every caption drifts away from its
   picture. Merge such a pair into one row of caption+figure cells. Own markup, so a
   depth-counting split over "<div" / "</div>" is exact. */
function splitDivs(inner) {
  const parts = []; let depth = 0, start = -1;
  const re = /<div\b[^>]*>|<\/div>/g; let m;
  while ((m = re.exec(inner))) {
    if (m[0][1] !== '/') { if (depth === 0) start = m.index; depth++; }
    else { depth--; if (depth === 0) { parts.push(inner.slice(start, m.index + m[0].length)); start = -1; } }
  }
  return parts;
}
function pairCaptionsWithFigures(s) {
  let i = 0, outS = '';
  while (true) {
    const j = s.indexOf('<div class="tbl">', i);
    if (j === -1) { outS += s.slice(i); break; }
    outS += s.slice(i, j);
    /* extent of this table */
    let depth = 0, k = j; const re = /<div\b[^>]*>|<\/div>/g; re.lastIndex = j; let m, end = -1;
    while ((m = re.exec(s))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) { end = m.index + m[0].length; break; } }
    if (end === -1) { outS += s.slice(j); break; }
    const tbl = s.slice(j, end);
    const rows = splitDivs(tbl.slice('<div class="tbl">'.length, -'</div>'.length));
    const cells = (row) => splitDivs(row.replace(/^<div class="tr">/, '').replace(/<\/div>$/, ''));
    const merged = [];
    for (let r = 0; r < rows.length; r++) {
      const a = cells(rows[r]), b = rows[r + 1] ? cells(rows[r + 1]) : null;
      const isCaption = (c) => !/\[\[IMG:/.test(c) && c.replace(/<[^>]+>/g, '').trim().length <= 120;
      const isFigure = (c) => /\[\[IMG:/.test(c) && c.replace(/<[^>]+>/g, '').replace(/\[\[IMG:[^\]]*\]\]/g, '').trim().length <= 40;
      /* a caption row over a figure row: pair them cell by cell. A caption whose
         figure never survived the capture is dropped with it — a caption for a
         picture that is not there only sends the student looking. */
      if (b && b.length >= 1 && b.length <= a.length && a.length > 1 && a.every(isCaption) && b.every(isFigure)) {
        const inner = (c) => c.replace(/^<div class="td">/, '').replace(/<\/div>$/, '');
        merged.push('<div class="tr">' + b.map((c, x) => '<div class="td">' + inner(a[x]) + ' ' + inner(c) + '</div>').join(' ') + '</div>');
        r++;
      } else merged.push(rows[r]);
    }
    outS += '<div class="tbl">' + merged.join(' ') + '</div>';
    i = end;
  }
  return outS;
}

/* plain text just before each [[BLANK:k]] — the label the key screen shows */
function contexts(html) {
  const ctx = {};
  const re = /\[\[BLANK:(\d+|\?)\]\]/g;
  let m;
  while ((m = re.exec(html))) {
    const before = html.slice(0, m.index).replace(/\[\[IMG:[^\]]*\]\]/g, ' ').replace(/\[\[BLANK:[^\]]*\]\]/g, ' ___ ');
    const lastBlock = before.split(/<\/(?:p|li|div)>|<br>/).pop().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = lastBlock.split(' ').filter(Boolean).slice(-7);
    ctx[m[1]] = words.length ? (words.length === 7 ? '…' : '') + words.join(' ') : '';
  }
  return ctx;
}

/* the stem as one line of plain text — for titles and the Ask-AI prompt. Inline
   tags join without a space (the flat capture split "antagonist" into "a nta gonist"
   at <strong> boundaries); blocks join with one. */
export function plainText(html) {
  return unesc(html
    .replace(/\[\[IMG:[^\]]*\]\]/g, ' ').replace(/\[\[BLANK:[^\]]*\]\]/g, ' ____ ')
    .replace(/<\/(?:p|li|div|ul|ol)>|<br>/g, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ').replace(/\s+([.,;:?!])/g, '$1').trim();
}

/* Walk every capture; returns { [file]: { [idx]: {html, ctx, imgs, unresolved, blanks, nSel, type, links} } } */
export function structuredStems(CAP, manifest, ext) {
  const resolveImg = (src) => {
    if (src && src.startsWith('data:image/')) return dataImgFile(src);
    if (/canvas\.manukau/.test(src)) { const id = (src.match(/files\/(\d+)/) || [])[1]; return (id && manifest[id]) || null; }
    return ext[src] || ext[src.replace(/&/g, '&amp;')] || null;
  };
  const out = {};
  for (const f of fs.readdirSync(CAP).filter(x => /^HS2CAP-.*\.html$/.test(x))) {
    const html = inlineSfImages(dropIframeDocs(fs.readFileSync(path.join(CAP, f), 'utf8')));
    const per = {};
    blocks(html, 'display_question').forEach((q, i) => {
      const cls = (q.match(/class=["']?([^"'>]*)/) || [])[1] || '';
      const type = (cls.match(/\b((?:multiple_dropdowns|fill_in_multiple_blanks|matching|multiple_choice|true_false|multiple_answers|essay|text_only|short_answer|numerical)_question)\b/) || [])[1] || 'unknown';
      /* blank ids per answer_group, in group order — the parser's key.blanks is in this order too */
      const blanks = blocks(q, 'answer_group').map(g => (g.match(/<span[^>]*\bblank_id\b[^>]*>\s*([^<]+?)\s*<\/span>/i) || [])[1]
        /* a save that strips hidden elements drops the blank_id span; every answer of the group still carries answer_for_<blank id> */
        || (g.match(/\banswer_for_([^\s"'>]+)/) || [])[1] || null);
      const byHash = new Map(blanks.map((b, k) => [b == null ? null : variableId(b), k]));
      const qtextHtml = blocks(q, 'question_text')[0] ?? '';
      const r = structure(qtextHtml, { type, resolveImg, blankIndexOf: (h) => byHash.has(h) ? byHash.get(h) : -1 });
      r.html = pairCaptionsWithFigures(r.html);
      per[i] = { type, html: r.html, ctx: contexts(r.html), imgs: r.imgs, unresolved: r.unresolved, blanks, nSel: r.nSel, links: r.links };
    });
    out[f] = per;
  }
  return out;
}
