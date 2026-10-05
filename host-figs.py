"""Lift the case workbook's own figures (content/hosted-figs.json, "workbook") out of "Case Study Workbook 2026 S2.docx" at full
resolution into img/, under the names content/cases.js uses. Each media name is checked against the document's own
relationships, so a changed workbook cannot hand over a different picture. Transparent images are laid on white.
A figure whose `media` is a LIST is her pictures side by side at one height, each with its letter from `letters` in a white
corner box (case 3's four lung micrographs, which the workbook lays out in a table row) — the letters are the tool's.
Run BEFORE build.mjs (the build fails if a case figure is missing).   python host-figs.py"""
import io, json, os, re, sys, zipfile
from PIL import Image, ImageDraw, ImageFont
H = json.load(open(os.path.join('content', 'hosted-figs.json'), encoding='utf-8'))
os.makedirs('img', exist_ok=True)
z = zipfile.ZipFile(H['docx'])
rels = re.findall(r'Target="(media/[^"]+)"', z.read('word/_rels/document.xml.rels').decode('utf8'))


def lift(media, out):
    if 'media/' + media not in rels: sys.exit(f"{out}: {media} is not in {H['docx']}")
    im = Image.open(io.BytesIO(z.read('word/media/' + media)))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
    return im.convert('RGB')


for f in H['workbook']:
    if isinstance(f['media'], list):
        parts = [lift(m, f['out']) for m in f['media']]
        h = min(p.height for p in parts); gap = 12
        parts = [p.resize((round(p.width * h / p.height), h)) for p in parts]
        cols = f.get('cols', len(parts)); w = max(p.width for p in parts); rows = -(-len(parts) // cols)
        im = Image.new('RGB', (cols * w + gap * (cols - 1), rows * h + gap * (rows - 1)), 'white')   # a phone needs a grid, not a strip
        try: font = ImageFont.truetype('arialbd.ttf', 30)
        except OSError: font = ImageFont.load_default()
        d = ImageDraw.Draw(im)
        for k, (p, letter) in enumerate(zip(parts, f['letters'])):
            x, y = (k % cols) * (w + gap), (k // cols) * (h + gap)
            im.paste(p, (x, y))
            d.rectangle([x + 6, y + 6, x + 46, y + 46], fill='white', outline='black', width=2)
            d.text((x + 26, y + 26), letter, fill='black', font=font, anchor='mm')
    else:
        im = lift(f['media'], f['out'])
    dest = os.path.join('img', f['out'])
    im.save(dest, 'PNG', optimize=True)
    print(f"{f['out']}: {im.size[0]}x{im.size[1]}, {os.path.getsize(dest) // 1024} KB  ({f['for']})")
