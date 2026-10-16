// lab.mjs — every look × every kind (and a Thai name, no photo, a listing, a work page) written as a
// real page into public/s/lab/, for shoot.mjs. run.sh removes them again; they must not deploy.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '')
mkdirSync(ROOT + '/public/s/lab', { recursive: true })
const { render, LOOK_IDS, KINDS } = await import(ROOT + '/public/s/render.mjs?' + Date.now())
const KP = JSON.parse(readFileSync(ROOT + '/public/s/kinds/kinds.json', 'utf8'))
let EX = {}
try { EX = JSON.parse(readFileSync(ROOT + '/public/s/ex/ex.json', 'utf8')) } catch {}
const KPIC_ID = 'kindpic000000'
const ORIGIN = process.env.LAB_ORIGIN || 'http://127.0.0.1:8790'
const day = (n, hh) => { const t = new Date(Date.now() + n * 864e5); const p = (x) => String(x).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${hh}` }
const NAMES = { shop: 'Ban Suan Shop', food: 'Noi Noodles', service: 'Hands of Mae Ping', work: 'Ploy Studio', stay: 'Ban Suan Guesthouse', homes: 'Teak House Homes', me: 'Annika', event: 'Loi Krathong Night', group: 'Chiang Mai Runners' }
const TAG = { shop: 'Cotton, tea and paper, made in the valley', food: 'Khao soi since 1987', service: 'Thai massage by the river', work: 'Photographs of weddings and food', stay: 'Six rooms in a garden by the river', homes: 'Houses to buy or rent around Chiang Mai', me: 'Writer and walker', event: 'Lanterns over the Ping river', group: 'We run every Saturday at six' }
function data(kind) {
  const x = {
    name: NAMES[kind], tagline: TAG[kind], about: 'We opened in 1987 on a small soi off Tha Phae Road. Everything is made here, by the three of us, the same way every day.',
    photos: [KPIC_ID], cover: KPIC_ID, items: [], links: [], contact: { phone: '081 234 5678', line: '@noinoodles' }, order: {}, counter: kind === 'me', accent: '',
    place: { lat: 18.78772, lng: 98.99331, addr: 'Tha Phae Road, Chiang Mai', cc: 'TH', snap: '', zoom: 16 },
    hours: { on: kind === 'shop' || kind === 'food', always: false, tz: 'Asia/Bangkok', week: Array.from({ length: 7 }, () => [['09:00', '18:00']]), note: '' },
    credits: { [KPIC_ID]: { title: KP[kind].title, by: 'Wikimedia Commons', src: KP[kind].src, license: KP[kind].license, from: 'commons' } },
  }
  if (kind === 'shop') x.items = [['Cotton bag', '250'], ['Postcards, set of 6', '120'], ['Oolong tea, 100 g', '180']].map(([n, p]) => ({ n, p }))
  if (kind === 'food') x.items = [['Khao soi with chicken', '60'], ['Kaphrao with fried egg', '55'], ['Thai iced tea', '30']].map(([n, p]) => ({ n, p }))
  if (kind === 'service') { x.items = [['Thai massage, 1 hour', '300'], ['Foot massage', '250']].map(([n, p]) => ({ n, p })); x.svc = [{ n: 'Thai massage', mins: 60, p: '300' }, { n: 'Oil massage', mins: 90, p: '500' }] }
  if (kind === 'stay') x.rooms = [{ n: 'Garden room', guests: 2, beds: '1 queen bed', p: '900', p2: '1100', photos: [KPIC_ID] }, { n: 'Family room', guests: 4, beds: '2 double beds', p: '1500', photos: [] }]
  if (kind === 'homes') x.lists = [{ t: 'Teak house, 3 bedrooms', deal: 'sale', p: '4500000', area: '320', beds: 3, baths: 2, photos: [KPIC_ID] }, { t: 'Studio near Nimman', deal: 'rent', p: '9000', area: '32', beds: 1, baths: 1, photos: [] }]
  if (kind === 'work') { x.works = [{ t: 'A wedding on Doi Suthep', year: '2026', tags: 'weddings', photos: [KPIC_ID] }, { t: 'Menu photos for a café', year: '2025', tags: 'food', photos: [KPIC_ID] }]; x.quotes = [{ q: 'Quick, kind, and the photos were beautiful.', who: 'Ploy' }] }
  if (kind === 'me' || kind === 'work' || kind === 'group') x.links = [{ t: 'Facebook', u: 'https://www.facebook.com/' }, { t: 'Instagram', u: 'https://www.instagram.com/' }]
  if (kind === 'event') x.event = { start: day(7, '18:00'), end: '', tz: 'Asia/Bangkok' }
  x.pay = { pp: '0812345678', tips: ['me', 'work', 'group', 'service'].includes(kind), price: kind === 'event' ? '150' : '' }
  if (kind === 'event' || kind === 'group') x.cal = [{ t: 'Monthly meet-up', start: day(5, '18:00'), end: '20:00', rep: 'monthly' }, { t: 'Saturday market', start: day(2, '16:00'), end: '21:00', rep: 'weekly' }]
  return x
}
const looks = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : LOOK_IDS
const kinds = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : KINDS
for (const look of looks) for (const kind of kinds) {
  const dd = data(kind), e = EX[kind]?.[look]
  if (e) { dd.credits = { [KPIC_ID]: { title: e.title, by: e.by, src: e.src, license: e.license, from: 'commons' } }; dd.coverPos = e.focus }
  const html = render({ name: kind + '-page', look, lang: 'en', kind, d: dd, views: 1234, status: 'live', tier: 'gold' },
    { preview: true, gold: true, hotel: true, origin: ORIGIN, now: Date.parse('2026-10-15T10:30:00+07:00'), img: (id, small) => (id === KPIC_ID ? (e ? `/s/ex/${kind}-${look}${small ? '-s' : ''}.webp` : `/s/kinds/${kind}${small ? '-s' : ''}.webp`) : `/img/${id}${small ? '-s' : ''}.webp`) })
  writeFileSync(`${ROOT}/public/s/lab/${look}-${kind}.html`, html)
}
console.log('wrote', looks.length * kinds.length)
// extra cases: a Thai name, no photo, a listing page, a work page
const extra = [
  ['thai', 'food', (x) => { x.name = 'ก๋วยเตี๋ยวป้านิด'; x.tagline = 'ข้าวซอยตั้งแต่ปี 2530'; x.place.addr = 'ถนนท่าแพ, เชียงใหม่' }],
  ['nopic', 'shop', (x) => { x.cover = ''; x.photos = [] }],
  ['list', 'homes', null, { listing: true }],
  ['workpage', 'work', null, { work: true }],
]
for (const look of looks) for (const [tag, kind, f, o] of extra) {
  const dd = data(kind); if (f) f(dd)
  const norm = (await import(ROOT + '/public/s/render.mjs')).normalize(dd)
  const op = { preview: true, gold: true, hotel: true, origin: ORIGIN, now: Date.parse('2026-10-15T10:30:00+07:00'), img: (id, small) => (id === KPIC_ID ? `/s/kinds/${kind}${small ? '-s' : ''}.webp` : `/img/${id}${small ? '-s' : ''}.webp`) }
  if (o?.listing) op.listing = norm.lists[0].id
  if (o?.work) op.work = norm.works[0].id
  writeFileSync(`${ROOT}/public/s/lab/${look}-${tag}.html`, render({ name: kind + '-page', look, lang: tag === 'thai' ? 'th' : 'en', kind, d: norm, views: 1234, status: 'live', tier: 'gold' }, op))
}
console.log('extras done')
