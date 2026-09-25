/* Re-splice template.html onto the bank already inside index.html.
   For chrome-only changes (header, home screen, styles, sitting logic) when her Canvas
   archive is not on hand — or when you want to be certain no question moved. Anything
   that touches a QUESTION still needs `node build.mjs`.
   Gates: the bank must still be one JSON value, the marker must appear exactly once,
   and the spliced page's script must parse (a stray apostrophe in a template literal
   kills a single-file app silently — see estate memory "silent JS death"). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadShorts, shortsJSON } from './shorts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const m = html.match(/const DATA = (\{[\s\S]*?\});\n/);
if (!m) { console.error('RESPLICE FAILED: no bank found in index.html'); process.exit(1); }
const D = JSON.parse(m[1]);
const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
const marker = '/*@BANK@*/';
for (const mk of [marker, '/*@SHORTS@*/'])
  if (tpl.split(mk).length !== 2) { console.error('RESPLICE FAILED: expected exactly one ' + mk); process.exit(1); }
/* the short versions of her case answers (content/case-shorts.js), gated against the bank already in the page */
const { shorts, fails } = loadShorts(D.questions);
if (fails.length) { console.error('RESPLICE FAILED — short versions:\n  ' + fails.join('\n  ')); process.exit(1); }
// function form: a `$'` inside the bank must not be a replacement pattern; the shorts go in first, the bank last
const out = tpl.replace('/*@SHORTS@*/', () => shortsJSON(shorts)).replace(marker, () => m[1]);
const script = (out.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!script) { console.error('RESPLICE FAILED: no <script> block'); process.exit(1); }
try { new Function(script); } catch (e) { console.error('RESPLICE FAILED: page script does not parse — ' + e.message); process.exit(1); }
fs.writeFileSync(path.join(HERE, 'index.html'), out);
console.log(`index.html re-spliced: ${m[1].length / 1024 | 0} KB bank · ${fs.statSync(path.join(HERE, 'index.html')).size / 1024 | 0} KB total · script parses`);
