# avatarlab-join.py <shots.json> <outdir> — the editor shots laid side by side with PIL, and the 640 px picture kept.
# shots.json: [[file, caption], ...]. Writes avatar-editor-phone.png (the five tabs), avatar-editor-more.png (the rest),
# avatar-use-640.png; removes the .tmp-* files.
import json, os, sys
from PIL import Image, ImageDraw

shots, out = json.load(open(sys.argv[1])), sys.argv[2]
ims = {c: Image.open(f).convert('RGB') for f, c in shots}

def sheet(names, path, scale=0.5, gap=14, top=30):
    pick = [(n, ims[n]) for n in names if n in ims]
    if not pick:
        return
    w, h = pick[0][1].size
    w, h = int(w * scale), int(h * scale)
    S = Image.new('RGB', (gap + len(pick) * (w + gap), top + h + gap), (236, 236, 236))
    d = ImageDraw.Draw(S)
    for i, (n, im) in enumerate(pick):
        d.text((gap + i * (w + gap) + 4, 8), n, fill=(0, 0, 0))
        S.paste(im.resize((w, h), Image.LANCZOS), (gap + i * (w + gap), top))
    S.save(path, optimize=True)
    print(path, S.size)

sheet(['en face', 'en hair', 'en clothes', 'en extras', 'en back'], os.path.join(out, 'avatar-editor-phone.png'))
sheet(['en extras, scrolled down', 'th face', 'th hair', 'my face', 'zh clothes'], os.path.join(out, 'avatar-editor-more.png'))
if 'desktop 1000 px, hair' in ims:
    ims['desktop 1000 px, hair'].resize((1000, 760), Image.LANCZOS).save(os.path.join(out, 'avatar-editor-desktop.png'), optimize=True)
use = os.path.join(out, '.tmp-use.png')
if os.path.exists(use):
    im = Image.open(use)
    print('use canvas', im.size, im.mode, 'corner alpha', im.getpixel((2, 2))[3] if im.mode == 'RGBA' else 'n/a')
    os.replace(use, os.path.join(out, 'avatar-use-640.png'))
for f in os.listdir(out):
    if f.startswith('.tmp-'):
        os.remove(os.path.join(out, f))
