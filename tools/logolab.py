#!/usr/bin/env python3
"""logolab.py — sheets for tools/logolab.mjs (PIL).

  logolab.py grid  <card-dir> <out.png> [--cols 6] [--tile 190] [--title TEXT] [--pad 8]
      every card-NN.png in the directory, in order, as one picture
  logolab.py strip <out.png> <in.png>... [--h 1500] [--gap 14] [--labels a,b,c]
      phone screenshots side by side, scaled to one height
  logolab.py stack <out.png> <in.png>...     pictures one under another, as wide as the widest
  logolab.py hstack <out.png> <in.png>...    pictures side by side, top-aligned
  logolab.py mosaic <out.png> <in.png>... [--cols 4] [--w 360]   pictures of one width in rows
"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

BG = (233, 230, 223)


def font(size):
    for p in ('/System/Library/Fonts/Supplemental/Ayuthaya.ttf', '/System/Library/Fonts/Thonburi.ttc', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf'):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def opt(args, name, default):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return default


def save(im, out):
    im = im.convert('RGB')
    try:
        q = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        q.save(out, optimize=True)
    except Exception:
        im.save(out, optimize=True)
    print(out, im.size, os.path.getsize(out) // 1024, 'KB')


def grid(args):
    cols = int(opt(args, '--cols', 6)); tile = int(opt(args, '--tile', 190)); title = opt(args, '--title', ''); pad = int(opt(args, '--pad', 8))
    d, out = args[0], args[1]
    files = sorted(glob.glob(os.path.join(d, 'card-*.png')))
    if not files:
        print('no cards in', d); sys.exit(1)
    rows = (len(files) + cols - 1) // cols
    top = 34 if title else 0
    W = pad + cols * (tile + pad)
    H = top + pad + rows * (tile + pad)
    S = Image.new('RGB', (W, H), BG)
    g = ImageDraw.Draw(S)
    if title:
        g.text((pad + 2, 8), title, fill=(30, 30, 30), font=font(18))
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGB').resize((tile, tile), Image.LANCZOS)
        x = pad + (i % cols) * (tile + pad)
        y = top + pad + (i // cols) * (tile + pad)
        S.paste(im, (x, y))
    save(S, out)


def strip(args):
    h = int(opt(args, '--h', 1500)); gap = int(opt(args, '--gap', 14)); labels = opt(args, '--labels', '')
    out, ins = args[0], args[1:]
    ims = []
    for f in ins:
        im = Image.open(f).convert('RGB')
        w = int(im.size[0] * h / im.size[1])
        ims.append(im.resize((w, h), Image.LANCZOS))
    lab = labels.split(',') if labels else []
    top = 30 if lab else 0
    W = gap + sum(i.size[0] + gap for i in ims)
    S = Image.new('RGB', (W, h + top + gap * 2), BG)
    g = ImageDraw.Draw(S)
    x = gap
    for n, im in enumerate(ims):
        S.paste(im, (x, top + gap))
        if n < len(lab):
            g.text((x + 4, 6), lab[n], fill=(30, 30, 30), font=font(16))
        x += im.size[0] + gap
    save(S, out)


def stack(args):
    out, ins = args[0], args[1:]
    ims = [Image.open(f).convert('RGB') for f in ins]
    W = max(i.size[0] for i in ims)
    H = sum(i.size[1] for i in ims)
    S = Image.new('RGB', (W, H), BG)
    y = 0
    for im in ims:
        S.paste(im, (0, y)); y += im.size[1]
    save(S, out)


def hstack(args):
    out, ins = args[0], args[1:]
    ims = [Image.open(f).convert('RGB') for f in ins]
    W = sum(i.size[0] for i in ims)
    H = max(i.size[1] for i in ims)
    S = Image.new('RGB', (W, H), BG)
    x = 0
    for im in ims:
        S.paste(im, (x, 0)); x += im.size[0]
    save(S, out)


def mosaic(args):
    cols = int(opt(args, '--cols', 4)); w = int(opt(args, '--w', 360)); gap = 8
    out, ins = args[0], args[1:]
    ims = []
    for f in ins:
        im = Image.open(f).convert('RGB')
        ims.append(im.resize((w, int(im.size[1] * w / im.size[0])), Image.LANCZOS))
    rows = (len(ims) + cols - 1) // cols
    rh = [max(i.size[1] for i in ims[r * cols:(r + 1) * cols]) for r in range(rows)]
    S = Image.new('RGB', (gap + cols * (w + gap), gap + sum(rh) + gap * rows), BG)
    y = gap
    for r in range(rows):
        for c, im in enumerate(ims[r * cols:(r + 1) * cols]):
            S.paste(im, (gap + c * (w + gap), y))
        y += rh[r] + gap
    save(S, out)


if __name__ == '__main__':
    cmd, rest = sys.argv[1], sys.argv[2:]
    {'grid': grid, 'strip': strip, 'stack': stack, 'hstack': hstack, 'mosaic': mosaic}[cmd](rest)
