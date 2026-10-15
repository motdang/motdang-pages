"""bands.py — the front page's wide still pictures (Nan 2026-10-15: "big wide pictures that
don't move while the rest of the page scrolls over them"). Each is a public-domain or CC0
photo from Wikimedia Commons, made over by the page maker's own picture studio
(tools/makeover.mjs): left as the photo, right as the drawing, blended across.

    python3 tools/bands.py            writes public/s/home/<id>-{2000,1100}.webp and credits.json
"""
import io, json, os, subprocess, tempfile, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 's', 'home')
UA = {'User-Agent': 'motdang-pages-bands/1.0 (https://sites.motdang.net)'}
C = 'https://commons.wikimedia.org/wiki/File:'

BANDS = [
    # id, file on Commons, left style, right style, accent, focus (0..1 across, 0..1 down), credit
    ('lanterns', 'YI_PENG_LANTERN_FESTIVAL_THAILAND.jpg', 'fix', 'fix', '', (0.6, 0.5), 'Yi Peng lantern festival, Thailand', 'CC0'),
    ('path', 'Mae_Hong_Son,_Thailand_(Unsplash).jpg', 'fix', 'wash', '', (0.5, 0.5), 'Mae Hong Son, Thailand (Unsplash)', 'CC0'),
    ('pai', 'View_of_rice_farms_in_Pai,_Thailand..JPG', 'fix', 'riso', '#ff48b0', (0.5, 0.45), 'Rice farms in Pai, Thailand', 'CC0'),
    ('wat', 'Temple_Wat_Chiang_Man_3.jpg', 'fix', 'gold', '', (0.5, 0.55), 'Wat Chiang Man, Chiang Mai', 'CC0'),
    ('map', 'Chiang_Mai_City_Map_(Chiengmai)_1890.png', 'fix', 'ink', '', (0.5, 0.5), 'Map of Chiang Mai, 1890', 'Public domain'),
]

# pictures for the example phones on the front page: (id, file on Commons, style, title, licence)
EXAMPLES = [
    ('khaosoi', 'Khao_soi_-_Bangkok_-_2017-05-07_(002).jpg', 'wash', 'Khao soi, Bangkok', 'CC0'),
    ('khaosoi2', 'Khao_soi_-_Bangkok_-_2017-05-07_(005).jpg', 'fix', 'Khao soi, Bangkok', 'CC0'),
    ('bungalow', 'Bungalow_in_Pai,_Thailand.JPG', 'wash', 'Bungalow in Pai, Thailand', 'CC0'),
    ('paifields', 'View_of_rice_farms_in_Pai,_Thailand..JPG', 'fix', 'Rice farms in Pai, Thailand', 'CC0'),
    ('lanternsx', 'YI_PENG_LANTERN_FESTIVAL_THAILAND.jpg', 'fix', 'Yi Peng lantern festival, Thailand', 'CC0'),
    ('watgold', 'Temple_Wat_Chiang_Man_3.jpg', 'gold', 'Wat Chiang Man, Chiang Mai', 'CC0'),
    ('pathwash', 'Mae_Hong_Son,_Thailand_(Unsplash).jpg', 'wash', 'Mae Hong Son, Thailand (Unsplash)', 'CC0'),
    ('mapink', 'Chiang_Mai_City_Map_(Chiengmai)_1890.png', 'ink', 'Map of Chiang Mai, 1890', 'Public domain'),
    ('pairiso', 'View_of_rice_farms_in_Pai,_Thailand..JPG', 'riso', 'Rice farms in Pai, Thailand', 'CC0'),
]

SAMPLE = ('Bungalow_in_Pai,_Thailand.JPG', 'Bungalow in Pai, Thailand')


def fetch(name, width=2400):
    q = urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + name, 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': width, 'format': 'json'})
    j = json.load(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + q, headers=UA), timeout=60))
    info = next(iter(j['query']['pages'].values()))['imageinfo'][0]
    return urllib.request.urlopen(urllib.request.Request(info.get('thumburl') or info['url'], headers=UA), timeout=120).read()


def styled(im, style, accent, tmp):
    if style == 'none':
        return im
    w, h = im.size
    a, b = os.path.join(tmp, 'a.rgba'), os.path.join(tmp, 'b.rgba')
    open(a, 'wb').write(im.convert('RGBA').tobytes())
    subprocess.run(['node', os.path.join(HERE, 'makeover.mjs'), a, str(w), str(h), style, accent or '-', b], check=True)
    return Image.frombytes('RGBA', (w, h), open(b, 'rb').read()).convert('RGB')


def blend(left, right):
    """The photo on the left, the drawing on the right, a soft slanted seam between."""
    if left is right:
        return left
    w, h = left.size
    mask = Image.new('L', (w, h))
    px = mask.load()
    for y in range(h):
        for x in range(w):
            t = (x / w - 0.42 - (y / h - 0.5) * 0.18) / 0.16
            px[x, y] = int(255 * min(1, max(0, t)))
    return Image.composite(right, left, mask)


def main():
    os.makedirs(OUT, exist_ok=True)
    credits = {}
    with tempfile.TemporaryDirectory() as tmp:
        for bid, name, ls, rs, acc, focus, title, lic in BANDS:
            im = Image.open(io.BytesIO(fetch(name))).convert('RGB')
            im.thumbnail((2400, 2400))
            left = styled(im, ls, acc, tmp)
            right = left if rs == ls else styled(im, rs, acc, tmp)
            pic = blend(left, right)
            for wd in (2000, 1100):
                p = pic.copy(); p.thumbnail((wd, wd))
                p.save(os.path.join(OUT, f'{bid}-{wd}.webp'), 'WEBP', quality=68 if wd > 1100 else 66, method=6)
            credits[bid] = {'title': title, 'src': C + name, 'license': lic, 'made': f'{ls} → {rs}', 'focus': focus, 'w': pic.size[0], 'h': pic.size[1]}
            print(bid, pic.size, flush=True)
        # the studio demo's photo: a good one made dim, soft and blue, as a phone at dusk takes it
        from PIL import ImageEnhance, ImageFilter
        im = Image.open(io.BytesIO(fetch(SAMPLE[0], 1200))).convert('RGB')
        im.thumbnail((900, 900))
        im = ImageEnhance.Brightness(im).enhance(0.58)
        im = ImageEnhance.Contrast(im).enhance(0.78)
        im = ImageEnhance.Color(im).enhance(0.7).filter(ImageFilter.GaussianBlur(1.1))
        r, g, b = im.split()
        im = Image.merge('RGB', (r.point(lambda v: v * 0.92), g, b.point(lambda v: min(255, v * 1.08 + 6))))
        im.save(os.path.join(OUT, 'sample.webp'), 'WEBP', quality=80)
        credits['sample'] = {'title': SAMPLE[1], 'src': C + SAMPLE[0], 'license': 'CC0', 'made': 'dimmed'}
        ex = {}
        for eid, name, style, title, lic in EXAMPLES:
            im = Image.open(io.BytesIO(fetch(name, 1400))).convert('RGB')
            im.thumbnail((1100, 1100))
            pic = styled(im, style, '', tmp)
            pic.save(os.path.join(OUT, f'ex-{eid}.webp'), 'WEBP', quality=72, method=6)
            sm = pic.copy(); sm.thumbnail((480, 480)); sm.save(os.path.join(OUT, f'ex-{eid}-s.webp'), 'WEBP', quality=72, method=6)
            ex[eid] = {'title': title, 'by': 'Wikimedia Commons', 'src': C + name, 'license': lic, 'licenseUrl': '', 'from': 'commons'}
            print('ex', eid, pic.size, flush=True)
        json.dump(ex, open(os.path.join(OUT, 'examples.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
