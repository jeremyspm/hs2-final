"""Convert the slide PNGs the build referenced into shipped 960px JPGs."""
import json, os, sys
from PIL import Image
todo = json.load(open('slides-todo.json'))
out_dir = os.path.join('img', 'slides')
os.makedirs(out_dir, exist_ok=True)
n = 0
for png, name in todo:
    dest = os.path.join(out_dir, name)
    im = Image.open(png).convert('RGB')
    if im.width > 960: im = im.resize((960, int(im.height*960/im.width)), Image.LANCZOS)
    im.save(dest, 'JPEG', quality=82, optimize=True)
    n += 1
print(f'slides shipped: {n}')
missing = [name for _, name in todo if not os.path.exists(os.path.join(out_dir, name))]
if missing: sys.exit('MISSING: ' + str(missing[:5]))
