"""Lift the case workbook's own figures (content/hosted-figs.json, "workbook") out of "Case Study Workbook 2026 S2.docx" at full
resolution into img/, under the names content/cases.js uses. Each media name is checked against the document's own
relationships, so a changed workbook cannot hand over a different picture. Transparent images are laid on white.
Run BEFORE build.mjs (the build fails if a case figure is missing).   python host-figs.py"""
import io, json, os, re, sys, zipfile
from PIL import Image
H = json.load(open(os.path.join('content', 'hosted-figs.json'), encoding='utf-8'))
os.makedirs('img', exist_ok=True)
for f in H['workbook']:
    z = zipfile.ZipFile(H['docx'])
    rels = z.read('word/_rels/document.xml.rels').decode('utf8')
    if 'media/' + f['media'] not in re.findall(r'Target="(media/[^"]+)"', rels): sys.exit(f"{f['out']}: {f['media']} is not in {H['docx']}")
    im = Image.open(io.BytesIO(z.read('word/media/' + f['media'])))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
    im = im.convert('RGB')
    dest = os.path.join('img', f['out'])
    im.save(dest, 'PNG', optimize=True)
    print(f"{f['out']}: {im.size[0]}x{im.size[1]}, {os.path.getsize(dest) // 1024} KB  ({f['for']})")
