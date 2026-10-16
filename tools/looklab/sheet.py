# sheet.py <shotdir> <out.png> <looks,comma> <kinds,comma> [scale] — looks across, kinds down, one picture
import sys
from PIL import Image, ImageDraw
d, out, looks, kinds = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4].split(',')
sc = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
ims = {}
for l in looks:
    for k in kinds:
        try: ims[(l, k)] = Image.open(f'{d}/{l}-{k}.png').convert('RGB')
        except Exception: pass
w0, h0 = next(iter(ims.values())).size
w, h = int(w0 * sc), int(h0 * sc)
pad, top = 10, 26
S = Image.new('RGB', (pad + len(looks) * (w + pad), top + len(kinds) * (h + pad)), (235, 235, 235))
g = ImageDraw.Draw(S)
for i, l in enumerate(looks):
    g.text((pad + i * (w + pad) + 4, 6), l, fill=(0, 0, 0))
    for j, k in enumerate(kinds):
        im = ims.get((l, k))
        if im: S.paste(im.resize((w, h)), (pad + i * (w + pad), top + j * (h + pad)))
S.save(out)
print(out, S.size)
