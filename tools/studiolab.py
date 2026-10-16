"""studiolab.py — the picture studio's photos and sheets, for tools/studiolab.mjs.

    studiolab.py prep    <spec.json>   photos → 4:3 (or 3:4) crops as raw RGBA at the sizes asked, and squares for avatars
    studiolab.py sheet   <spec.json>   rendered RGBA → one sheet per style, and sheets of all styles side by side
    studiolab.py avatars <spec.json>   rendered squares → one sheet, round like the avatar, styles across

Run with -I (it reads downloaded files); the user site is added by hand because -I drops it.
"""
import json, os, site, sys
sys.path.append(site.getusersitepackages())
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont  # noqa: E402

FONTS = ['/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
INK, BG = (24, 22, 20), (236, 232, 224)


def font(size):
    for f in FONTS:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def save(im, path):
    """A PNG kept small: 256 colours (median cut, then dithered so gradients stay smooth). A sheet of fifteen photos by nine styles is otherwise thirty megabytes."""
    pal = im.quantize(256, method=Image.Quantize.MEDIANCUT)
    im.quantize(palette=pal, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)
    print(path, im.size, round(os.path.getsize(path) / 1e6, 1), 'MB')


def crop(im, focus, ratio):
    """The largest window of the shape ratio (across ÷ down), centred on focus (0..1 across, 0..1 down)."""
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio); x = int(max(0, min(w - nw, focus[0] * w - nw / 2)))
        return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio); y = int(max(0, min(h - nh, focus[1] * h - nh / 2)))
    return im.crop((0, y, w, y + nh))


def dim(im):
    """A good photo made dim, soft and blue, as a phone at dusk takes it (the same recipe as tools/bands.py)."""
    k = im.width / 900
    im = ImageEnhance.Brightness(im).enhance(0.58)
    im = ImageEnhance.Contrast(im).enhance(0.78)
    im = ImageEnhance.Color(im).enhance(0.7).filter(ImageFilter.GaussianBlur(1.1 * k))
    r, g, b = im.split()
    return Image.merge('RGB', (r.point(lambda v: v * 0.92), g, b.point(lambda v: min(255, v * 1.08 + 6))))


def prep(spec):
    """spec: { photos: [{id, file, focus, dim, portrait}], sizes: [900, 1600], square: 420, out }. The sizes are the long side.
    Writes <out>/<id>-<size>.rgba, and the middle square at spec.square as <id>-sq<size>.rgba."""
    os.makedirs(spec['out'], exist_ok=True)
    for p in spec['photos']:
        ratio = 3 / 4 if p.get('portrait') else 4 / 3
        im = crop(Image.open(p['file']).convert('RGB'), p.get('focus', [0.5, 0.5]), ratio)
        if p.get('dim'):
            im = dim(im)
        for size in spec['sizes']:
            w, h = (round(size * ratio), size) if ratio < 1 else (size, round(size / ratio))
            r = im.resize((w, h), Image.LANCZOS).convert('RGBA')
            open(os.path.join(spec['out'], f"{p['id']}-{size}.rgba"), 'wb').write(r.tobytes())
        if spec.get('square'):  # an avatar is the middle square, as the builder crops it
            side = min(im.size); x, y = (im.width - side) // 2, (im.height - side) // 2
            r = im.crop((x, y, x + side, y + side)).resize((spec['square'], spec['square']), Image.LANCZOS).convert('RGBA')
            open(os.path.join(spec['out'], f"{p['id']}-sq{spec['square']}.rgba"), 'wb').write(r.tobytes())


def load(path, w, h):
    return Image.frombytes('RGBA', (w, h), open(path, 'rb').read()).convert('RGB')


def sheet(spec):
    """spec: { photos: [{id, title, portrait}], styles, names, size (the long side), cell (the width), rendered, originals, out, date, tag, perStyle }.
    One sheet per style, the photos in a grid (the upright ones in rows of their own below), and sheets of everything side by side:
    rows are photos, columns the original then each style; the upright photos have a sheet to themselves."""
    cw = spec.get('cell', 390)
    size, tag, stem = spec['size'], spec['tag'], f"studio-{spec['date']}"
    pad, head, cap = 8, 28, 16
    f, fs = font(15), font(12)
    ims = {}

    def dims(p):
        return (round(size * 0.75), size) if p.get('portrait') else (size, round(size * 0.75))

    def cell_h(p):
        return round(cw * 4 / 3) if p.get('portrait') else round(cw * 3 / 4)

    def cell(p, style):
        k = (p['id'], style)
        if k not in ims:
            src = os.path.join(spec['originals'], f"{p['id']}-{size}.rgba") if style == 'original' else os.path.join(spec['rendered'], f"{p['id']}-{style}.rgba")
            w, h = dims(p)
            try:
                ims[k] = load(src, w, h).resize((cw, cell_h(p)), Image.LANCZOS)
            except FileNotFoundError:  # a part of the set was rendered
                ims[k] = Image.new('RGB', (cw, cell_h(p)), (205, 200, 192))
        return ims[k]

    os.makedirs(spec['out'], exist_ok=True)
    flat = [p for p in spec['photos'] if not p.get('portrait')]
    tall = [p for p in spec['photos'] if p.get('portrait')]
    cols = 4

    def grid(photos):
        """Where each photo of a group goes, laid in rows of cols: [(photo, x, y)], and the height they take."""
        out, y = [], 0
        for r in range(0, len(photos), cols):
            row = photos[r:r + cols]
            for i, p in enumerate(row):
                out.append((p, pad + i * (cw + pad), y))
            y += max(cell_h(p) for p in row) + cap + pad
        return out, y

    for style in spec['styles'] if spec.get('perStyle', True) else []:
        a, ha = grid(flat)
        b, hb = grid(tall)
        S = Image.new('RGB', (pad + cols * (cw + pad), head + ha + hb), BG)
        g = ImageDraw.Draw(S)
        g.text((pad, 6), f"{spec['names'].get(style, style)}  ({tag})", fill=INK, font=f)
        for p, x, y in a + [(p, x, y + ha) for p, x, y in b]:
            S.paste(cell(p, style), (x, head + y + cap))
            g.text((x + 2, head + y + 1), p['title'], fill=INK, font=fs)
        save(S, os.path.join(spec['out'], f'{stem}-{tag}-{style}.png' if tag != 'after' else f'{stem}-{style}.png'))

    cols_all = ['original'] + spec['styles']
    for photos, name in ((flat, ''), (tall, '-portrait')):
        if not photos:
            continue
        rows = [cell_h(p) + pad for p in photos]
        S = Image.new('RGB', (pad + len(cols_all) * (cw + pad), head + sum(rows)), BG)
        g = ImageDraw.Draw(S)
        for j, c in enumerate(cols_all):
            g.text((pad + j * (cw + pad) + 2, 6), 'photo' if c == 'original' else spec['names'].get(c, c), fill=INK, font=f)
            y = head
            for p, rh in zip(photos, rows):
                S.paste(cell(p, c), (pad + j * (cw + pad), y))
                if c == 'original':  # the row's name, on the photo
                    tw = g.textlength(p['title'], font=fs) + 10
                    g.rectangle((pad, y, pad + tw, y + 17), fill=(0, 0, 0))
                    g.text((pad + 5, y + 2), p['title'], fill=(255, 255, 255), font=fs)
                y += rh
        save(S, os.path.join(spec['out'], f'{stem}-{tag}{name}.png'))


def avatars(spec):
    """spec: { photos: [id], styles, names, size, cell, rendered, originals, out, date }. Round, as the avatar shows."""
    size, cw = spec['size'], spec.get('cell', 190)
    pad, head = 10, 28
    f = font(15)
    cols = ['original'] + spec['styles']
    S = Image.new('RGB', (pad + len(cols) * (cw + pad), head + len(spec['photos']) * (cw + pad)), BG)
    g = ImageDraw.Draw(S)
    mask = Image.new('L', (cw * 4, cw * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, cw * 4 - 1, cw * 4 - 1), fill=255)
    mask = mask.resize((cw, cw), Image.LANCZOS)
    for j, c in enumerate(cols):
        g.text((pad + j * (cw + pad) + 2, 6), 'photo' if c == 'original' else spec['names'].get(c, c), fill=INK, font=f)
        for i, photo in enumerate(spec['photos']):
            src = os.path.join(spec['originals'], f'{photo}-sq{size}.rgba') if c == 'original' else os.path.join(spec['rendered'], f'avatar-{photo}-{c}.rgba')
            try:
                im = load(src, size, size).resize((cw, cw), Image.LANCZOS)
            except FileNotFoundError:
                continue
            S.paste(im, (pad + j * (cw + pad), head + i * (cw + pad)), mask)
    save(S, os.path.join(spec['out'], f"studio-{spec['date']}-avatars.png"))


if __name__ == '__main__':
    cmd, spec = sys.argv[1], json.load(open(sys.argv[2]))
    {'prep': prep, 'sheet': sheet, 'avatars': avatars}[cmd](spec)
