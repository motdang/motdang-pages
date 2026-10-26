#!/usr/bin/env python3
"""Photos for the front page and the builder's kinds (Nan 2026-10-26: plain, good, relevant photos, less
image editing). Each photo is cropped to its frame around a focus point and resized; colours are left alone.

  python3 -I tools/photos.py <plan.json>

plan.json: {"out/name": {"src": path, "w": 1100, "h": 825, "fx": .5, "fy": .5, "small": [480, 360],
             "credit": {"title", "by", "src", "license", "licenseUrl"}}, ...}
Writes <out/name>.webp (+ <out/name>-s.webp when "small") under public/s/, and merges each credit into
the folder's credits file (home/photos.json or kinds/kinds.json).
"""
import json, sys, os
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 's')

def frame(im, w, h, fx, fy):
    im = ImageOps.exif_transpose(im).convert('RGB')
    W, H = im.size
    s = max(w / W, h / H)
    im = im.resize((max(w, round(W * s)), max(h, round(H * s))), Image.LANCZOS)
    W, H = im.size
    x = min(max(0, round(fx * W - w / 2)), W - w)
    y = min(max(0, round(fy * H - h / 2)), H - h)
    return im.crop((x, y, x + w, y + h))

plan = json.load(open(sys.argv[1]))
credits = {}
for name, p in plan.items():
    im = Image.open(os.path.expanduser(p['src']))
    out = frame(im, p['w'], p['h'], p.get('fx', .5), p.get('fy', .5))
    path = os.path.join(ROOT, name + '.webp')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, 'WEBP', quality=p.get('q', 80), method=6)
    if p.get('small'):
        sw, sh = p['small']
        out.resize((sw, sh), Image.LANCZOS).save(os.path.join(ROOT, name + '-s.webp'), 'WEBP', quality=78, method=6)
    folder, key = name.split('/', 1)
    credits.setdefault(folder, {})[key] = p['credit']
    print(name, out.size, os.path.getsize(path) // 1024, 'KB')
for folder, cr in credits.items():
    f = os.path.join(ROOT, folder, 'photos.json')
    old = json.load(open(f)) if os.path.exists(f) else {}
    old.update(cr)
    json.dump(old, open(f, 'w'), ensure_ascii=False, indent=1)
    if folder == 'kinds':
        # the builder reads each kind's picture and credit from kinds.json: keep it in step
        kf = os.path.join(ROOT, 'kinds', 'kinds.json')
        kinds = json.load(open(kf)) if os.path.exists(kf) else {}
        for k, c in cr.items():
            kinds[k] = {'pd': 'k:' + k, 'title': c['title'], 'by': c['by'], 'src': c['src'], 'license': c['license'], 'licenseUrl': c.get('licenseUrl', ''), 'made': 'photo'}
        json.dump(kinds, open(kf, 'w'), ensure_ascii=False, indent=1)
        # the kinds' pictures, as the Worker reads them: a new page's first photo, credited (src/pd.mjs, "k:<kind>")
        with open(os.path.join(ROOT, 'kinds', 'house.mjs'), 'w') as h:
            h.write('// Written by tools/photos.py from kinds/photos.json: each kind\'s picture and its credit.\n')
            h.write('export const HOUSE = ' + json.dumps(old, ensure_ascii=False, indent=1) + '\n')
