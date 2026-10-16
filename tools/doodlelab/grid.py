# grid.py <out.png> <cell> <cols> <picture[=label]>... — any pictures as one contact sheet (a missing one is a red square).
import sys, os
from PIL import Image, ImageDraw
out, cell, cols, args = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
items = [(a.split('=')[0], a.split('=', 1)[1] if '=' in a else os.path.basename(a)) for a in args]
pad = 4
rows = (len(items) + cols - 1) // cols
S = Image.new('RGB', (cols * (cell + pad) + pad, rows * (cell + pad) + pad), (40, 40, 44))
for i, (p, lb) in enumerate(items):
    im = Image.new('RGB', (cell, cell), (120, 30, 30))
    try:
        im = Image.open(p).convert('RGB'); im.thumbnail((cell, cell), Image.LANCZOS)
        f = Image.new('RGB', (cell, cell), (40, 40, 44)); f.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2)); im = f
    except Exception: ImageDraw.Draw(im).text((cell // 2 - 30, cell // 2 - 6), 'no picture', fill=(255, 255, 255))
    g = ImageDraw.Draw(im); w = g.textlength(lb); g.rectangle([0, 0, w + 8, 16], fill=(0, 0, 0)); g.text((4, 2), lb, fill=(255, 255, 255))
    S.paste(im, (pad + (i % cols) * (cell + pad), pad + (i // cols) * (cell + pad)))
S.quantize(256, method=Image.MEDIANCUT).save(out, optimize=True); print(out, S.size, os.path.getsize(out) // 1024, 'KB')
