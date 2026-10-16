# sheet.py <rundir> <out-prefix> [cell] — the pictures run.mjs saved, as one sheet for each style (every kind, two prompts,
# both options) and one overall sheet (styles across, kinds down, the first option). PNG, 256 colours, with the kind and
# the option on each. grid.py makes any other sheet from a list of pictures.
import sys, os
from PIL import Image, ImageDraw
d, prefix = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 240
KINDS = ['shop', 'food', 'service', 'work', 'stay', 'homes', 'me', 'event', 'group']
STYLES = ['pen', 'crayon', 'wash', 'lanna', 'sticker', 'neon']
def tile(path, label, size):
    im = Image.new('RGB', (size, size), (120, 30, 30))
    g = ImageDraw.Draw(im)
    try: im = Image.open(path).convert('RGB').resize((size, size), Image.LANCZOS); g = ImageDraw.Draw(im)
    except Exception: g.text((size // 2 - 50, size // 2 - 6), 'dropped by a check', fill=(255, 255, 255))
    w = g.textlength(label)
    g.rectangle([0, 0, w + 8, 16], fill=(0, 0, 0)); g.text((4, 2), label, fill=(255, 255, 255))
    return im
def sheet(items, cols, size, out, pad=4):
    rows = (len(items) + cols - 1) // cols
    S = Image.new('RGB', (cols * (size + pad) + pad, rows * (size + pad) + pad), (40, 40, 44))
    for i, (p, lb) in enumerate(items): S.paste(tile(p, lb, size), (pad + (i % cols) * (size + pad), pad + (i // cols) * (size + pad)))
    S.quantize(256, method=Image.MEDIANCUT).save(out, optimize=True); print(out, S.size, os.path.getsize(out) // 1024, 'KB')
for st in STYLES:
    items = [(f'{d}/{st}_{k}{i}_{n}.webp', f'{k}{i + 1}.{n + 1}') for k in KINDS for i in (0, 1) for n in (0, 1)]
    if any(os.path.exists(p) for p, _ in items): sheet(items, 6, cell, f'{prefix}-{st}.png')
items = [(f'{d}/{st}_{k}{i}_0.webp', f'{st} {k}{i + 1}') for k in KINDS for i in (0, 1) for st in STYLES]
sheet(items, 6, max(160, cell * 2 // 3), f'{prefix}-all.png')
