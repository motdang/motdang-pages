"""kinds.py — a picture for each kind of page, for the page maker's first screen (Nan 2026-10-15:
"not sure what the dingbat/icons are even of"). Each is a CC0 photo from Wikimedia Commons, made
over by the picture studio (tools/makeover.mjs). The builder shows it on the kind's tile and puts it
on a new page as its cover, credited, until the maker adds a photo of their own.

    python3 tools/kinds.py                    writes public/s/kinds/<kind>{,-s}.webp and kinds.json
    python3 tools/kinds.py --try fix wash      a contact sheet of every kind in each style, to pick from
"""
import io, json, os, sys, tempfile, urllib.parse, urllib.request
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bands import styled, UA  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 's', 'kinds')

# kind, Commons page id, style, focus (0..1 across, 0..1 down)
KINDS = [
    ('shop', 61735841, 'fix', (0.5, 0.5)),
    ('food', 0, 'fix', (0.5, 0.5)),
    ('service', 62348750, 'fix', (0.5, 0.45)),
    ('work', 61768601, 'fix', (0.5, 0.4)),
    ('amulet', 62072302, 'fix', (0.5, 0.5)),
    ('stay', 0, 'fix', (0.5, 0.5)),
    ('homes', 62443023, 'fix', (0.5, 0.5)),
    ('me', 61823398, 'fix', (0.5, 0.5)),
    ('event', 0, 'fix', (0.6, 0.5)),
    ('group', 61660338, 'fix', (0.5, 0.5)),
]
# the two whose page ids are looked up by file name
BY_NAME = {'stay': 'Bungalow_in_Pai,_Thailand.JPG', 'event': 'YI_PENG_LANTERN_FESTIVAL_THAILAND.jpg', 'food': 'Khao_soi_-_Bangkok_-_2017-05-07_(002).jpg'}


def api(**q):
    q = {**q, 'format': 'json'}
    return json.load(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q), headers=UA), timeout=60))


def info(kind, pid):
    q = {'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1600}
    j = api(action='query', titles='File:' + BY_NAME[kind], **q) if kind in BY_NAME else api(action='query', pageids=pid, **q)
    p = next(iter(j['query']['pages'].values()))
    ii = p['imageinfo'][0]
    lic = ii.get('extmetadata', {}).get('LicenseShortName', {}).get('value', 'CC0')
    return p['pageid'], p['title'], ii.get('thumburl') or ii['url'], lic


def crop(im, focus, ratio=4 / 3):
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio); x = int(max(0, min(w - nw, focus[0] * w - nw / 2)))
        return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio); y = int(max(0, min(h - nh, focus[1] * h - nh / 2)))
    return im.crop((0, y, w, y + nh))


def main():
    tryout = sys.argv[2:] if len(sys.argv) > 1 and sys.argv[1] == '--try' else None
    os.makedirs(OUT, exist_ok=True)
    meta, sheet = {}, []
    with tempfile.TemporaryDirectory() as tmp:
        for kind, pid, style, focus in KINDS:
            pageid, title, url, lic = info(kind, pid)
            im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read())).convert('RGB')
            im = crop(im, focus)
            im.thumbnail((1200, 1200))
            if tryout:
                sheet.append([styled(im, s, '', tmp) for s in tryout])
                print(kind, flush=True)
                continue
            pic = styled(im, style, '', tmp)
            pic.save(os.path.join(OUT, f'{kind}.webp'), 'WEBP', quality=74, method=6)
            sm = pic.copy(); sm.thumbnail((520, 520)); sm.save(os.path.join(OUT, f'{kind}-s.webp'), 'WEBP', quality=72, method=6)
            meta[kind] = {'pd': f'c:{pageid}', 'title': title.removeprefix('File:').rsplit('.', 1)[0].replace('_', ' '),
                          'src': 'https://commons.wikimedia.org/wiki/' + title.replace(' ', '_'), 'license': lic, 'made': style}
            print(kind, pic.size, flush=True)
    if tryout:
        tw, th = 300, 225
        out = Image.new('RGB', (tw * len(tryout), th * len(sheet)), 'white')
        for r, row in enumerate(sheet):
            for c, p in enumerate(row):
                p = p.copy(); p.thumbnail((tw, th)); out.paste(p, (c * tw, r * th))
        out.save(os.path.join(tempfile.gettempdir(), 'kinds-try.jpg'), quality=82)
        print(os.path.join(tempfile.gettempdir(), 'kinds-try.jpg'))
        return
    json.dump(meta, open(os.path.join(OUT, 'kinds.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
