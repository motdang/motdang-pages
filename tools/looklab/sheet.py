# sheet.py <shotdir> <out.png> <designs,comma> <kinds,comma> [scale] — one column for each design, its kinds stacked under it
import sys
from PIL import Image, ImageDraw
d, out, looks, kinds = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4].split(',')
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
cols = {}
for l in looks:
    for k in kinds:
        try: cols.setdefault(l, []).append((k, Image.open(f'{d}/{l}-{k}.png').convert('RGB')))
        except Exception: pass
first = next(iter(cols.values()))[0][1]
w, h = int(first.size[0] * sc), int(first.size[1] * sc)
pad, top = 10, 26
rows = max(len(v) for v in cols.values())
S = Image.new('RGB', (pad + len(cols) * (w + pad), top + rows * (h + 18 + pad)), (235, 235, 235))
g = ImageDraw.Draw(S)
for i, (l, items) in enumerate(cols.items()):
    x = pad + i * (w + pad)
    g.text((x + 4, 6), l, fill=(0, 0, 0))
    for j, (k, im) in enumerate(items):
        y = top + j * (h + 18 + pad) + 18
        g.text((x + 4, y - 15), k, fill=(0, 0, 0))
        S.paste(im.resize((w, h)), (x, y))
S.save(out)
print(out, S.size)
