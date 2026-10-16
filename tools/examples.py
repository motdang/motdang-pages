"""examples.py — a picture for every look of every kind, for the builder's example pages (Nan
2026-10-16: "All example sites feature picture of same bicycle. Put a LOT of thought into what the
picture should be, and have it be different for every site."). Each is a freely licensed photo from
Wikimedia Commons, chosen by eye for its look (tools/examples.json: kind → look → page id, focus).

    python3 tools/examples.py          writes public/s/ex/<kind>-<look>{,-s}.webp and public/s/ex/ex.json

ex.json carries each picture's credit and focus (where its subject sits, 0..1 across and down), which
the builder hands to a new page as the cover's credit and its focal point.
"""
import io, json, os, sys, urllib.parse, urllib.request
from PIL import Image, ImageEnhance, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 's', 'ex')
SPEC = os.path.join(HERE, 'examples.json')
UA = {'User-Agent': 'motdang-pages-examples/1.0 (https://sites.motdang.net)'}


def api(**q):
    q = {**q, 'format': 'json'}
    req = urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q), headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))


def info(pageid):
    j = api(action='query', pageids=pageid, prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1800)
    p = next(iter(j['query']['pages'].values()))
    ii = p['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    val = lambda k: (meta.get(k, {}).get('value') or '').strip()
    by = val('Artist')
    if '<' in by:  # Commons gives the author as a link; keep its words
        import re
        by = re.sub(r'<[^>]+>', '', by).strip()
    return p['title'], ii.get('thumburl') or ii['url'], val('LicenseShortName') or 'CC0', val('LicenseUrl'), by[:80]


def polish(im):
    """A light touch: levels from the 0.5% ends, a little more colour. The look does the rest."""
    im = ImageOps.autocontrast(im, cutoff=0.5)
    return ImageEnhance.Color(im).enhance(1.08)


def main():
    spec = json.load(open(SPEC))
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for kind, looks in spec.items():
        for look, pick in looks.items():
            title, url, lic, lurl, by = info(pick['pageid'])
            raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
            im = polish(Image.open(io.BytesIO(raw)).convert('RGB'))
            im.thumbnail((1600, 1600))
            base = f'{kind}-{look}'
            im.save(os.path.join(OUT, base + '.webp'), 'WEBP', quality=76, method=6)
            sm = im.copy(); sm.thumbnail((560, 560)); sm.save(os.path.join(OUT, base + '-s.webp'), 'WEBP', quality=72, method=6)
            meta.setdefault(kind, {})[look] = {
                'title': title.removeprefix('File:').rsplit('.', 1)[0].replace('_', ' '),
                'src': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')),
                'license': lic, 'licenseUrl': lurl, 'by': by or 'Wikimedia Commons', 'focus': pick.get('focus', [0.5, 0.5]), 'pd': f"c:{pick['pageid']}",
            }
            print(base, im.size, lic, flush=True)
    json.dump(meta, open(os.path.join(OUT, 'ex.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    sys.exit(main())
