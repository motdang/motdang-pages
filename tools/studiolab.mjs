// studiolab.mjs — the picture studio's styles over fifteen varied photos at phone size: one sheet per
// style and one of everything side by side, rows the photos, columns the styles (Nan 2026-10-16:
// "before shipping any set of designs, render every option with every kind at phone size and look
// at them side by side"). The photos are CC0 from Wikimedia Commons, kept in a temp folder; four of
// them are held upright, as a phone is, and have a sheet of their own.
//
//   node tools/studiolab.mjs --out notes/screens          the sheets for public/s/studio.mjs
//   node tools/studiolab.mjs --engine old.mjs --tag before     another engine (git show <rev>:public/s/studio.mjs)
//   node tools/studiolab.mjs --styles ink,wash --photos food,night     a part of it
//   node tools/studiolab.mjs --all-only                    the sheets of everything side by side, not one for each style
//   node tools/studiolab.mjs --size 200                    at the picker's thumbnail size (420: the avatar's)
//   node tools/studiolab.mjs --avatars                     a sheet of round avatars: the middle square of three photos, no border
//   node tools/studiolab.mjs --time                        milliseconds per style on a 1600 px photo
//   node tools/studiolab.mjs --accent '#2563eb'            with the page's accent colour
// The photos and the renders sit in $STUDIOLAB_DIR (default: motdang-studiolab in the temp folder); the sheets go where --out says.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const UA = { 'User-Agent': 'motdang-pages-studiolab/1.0 (https://sites.motdang.net; photo filter tests)' }
const WORK = process.env.STUDIOLAB_DIR || join(tmpdir(), 'motdang-studiolab')
const flag = (k) => { const i = process.argv.indexOf('--' + k); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) }

// id, what it is, file on Commons, focus (0..1 across, 0..1 down) of the 4:3 window (3:4 for an upright one), how to treat it: dim (made dim, soft and blue), portrait (held upright)
const PHOTOS = [
  ['food', 'Food close-up', 'Khao soi - Bangkok - 2017-05-07 (001).jpg', [0.5, 0.5]],
  ['behind', 'A person from behind', 'Woman walking down path (Unsplash).jpg', [0.5, 0.5]],
  ['street', 'A busy street', 'Bangkok 2 (November 2023).jpg', [0.5, 0.5]],
  ['temple', 'A temple', 'Wat Phra That Doi Suthep D 32.jpg', [0.5, 0.5]],
  ['room', 'A room', 'Bed in hotel room 2.jpg', [0.5, 0.5]],
  ['product', 'A product on a table', 'Blue coffee cup (Unsplash).jpg', [0.55, 0.5]],
  ['land', 'A landscape', 'Rice paddy in Thailand (Boon Kho Ku Sui Bridge).jpg', [0.5, 0.5]],
  ['night', 'A night scene', 'Cinatown (Unsplash).jpg', [0.5, 0.45]],
  ['face', 'A portrait', 'Mother Nature, Summer (Unsplash).jpg', [0.5, 0.45]],
  ['market', 'A market stall', 'Thai Fish Market (Unsplash).jpg', [0.5, 0.5]],
  ['dim', 'A dim phone photo', 'Bungalow in Pai, Thailand.JPG', [0.5, 0.5], { dim: true }],
  ['upnight', 'Upright: a night street', 'Chinatown in Bangkok (Yaowarat) at night.jpg', [0.5, 0.5], { portrait: true }],
  ['uptemple', 'Upright: a temple', 'Temple Wat Chiang Man 1.jpg', [0.5, 0.5], { portrait: true }],
  ['upfood', 'Upright: food from above', 'Beef khao soi - Chiang Mai - 2017-07-09 (001).jpg', [0.5, 0.5], { portrait: true }],
  ['upface', 'Upright: a portrait', 'Portrait of elderly woman (Unsplash).jpg', [0.5, 0.4], { portrait: true }],
]
const AVATARS = ['face', 'behind', 'product']
const NAMES = { fix: 'Fixed', doodle: 'Doodle', ink: 'Pen and ink', wash: 'Watercolour', riso: 'Riso print', gold: 'Gold lacquer', pop: 'Comic', mural: 'Lanna mural', cyan: 'Sun print' }

const only = (all, k) => { const v = flag(k); if (!v || v === true) return all; const want = v.split(','); return all.filter((x) => want.includes(Array.isArray(x) ? x[0] : x)) }
const photos = only(PHOTOS, 'photos')
const SIZE = Number(flag('size')) || 900 // the long side the builder works at on a phone (studio-ui.mjs: big()); 200 is a thumbnail, 420 an avatar
const SIZES = [...new Set([SIZE, 900, 1600])]
const upright = (id) => !!PHOTOS.find((p) => p[0] === id)?.[4]?.portrait

async function fetchPhoto([id, , file]) {
  const dir = join(WORK, 'photos', id), dest = join(dir, 'photo.jpg')
  if (existsSync(dest)) return dest
  const q = new URLSearchParams({ action: 'query', titles: 'File:' + file, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600', format: 'json' })
  const j = await (await fetch('https://commons.wikimedia.org/w/api.php?' + q, { headers: UA })).json()
  const ii = Object.values(j.query.pages)[0].imageinfo?.[0]
  if (!ii) throw new Error('not on Commons: ' + file)
  const lic = ii.extmetadata?.LicenseShortName?.value || ''
  if (!/^(CC0|CC Zero|Public domain|PD)/i.test(lic)) throw new Error(`${file}: licence ${lic}, not CC0`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(dest, Buffer.from(await (await fetch(ii.thumburl || ii.url, { headers: UA })).arrayBuffer()))
  writeFileSync(join(dir, 'credit.json'), JSON.stringify({ file, licence: lic, src: ii.descriptionurl }))
  return dest
}

const py = (cmd, spec) => {
  const f = join(WORK, `${cmd}.json`)
  writeFileSync(f, JSON.stringify(spec))
  const r = spawnSync('python3', ['-I', join(ROOT, 'tools', 'studiolab.py'), cmd, f], { stdio: 'inherit' })
  if (r.status) throw new Error('studiolab.py ' + cmd + ' failed')
}

const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]

async function main() {
  const crops = join(WORK, 'crops'), have = (id) => SIZES.map((z) => `${id}-${z}`).concat(`${id}-sq420`).every((f) => existsSync(join(crops, f + '.rgba')))
  const need = PHOTOS.filter(([id]) => (photos.some((p) => p[0] === id) || AVATARS.includes(id)) && !have(id))
  if (need.length) {
    const files = {}
    for (const p of need) files[p[0]] = await fetchPhoto(p)
    py('prep', { photos: need.map(([id, , , focus, how]) => ({ id, file: files[id], focus, dim: !!how?.dim, portrait: !!how?.portrait })), sizes: SIZES, square: 420, out: crops })
  }
  const engine = await import(pathToFileURL(resolve(flag('engine') || join(ROOT, 'public/s/studio.mjs'))).href)
  const styles = only(engine.STYLES, 'styles'), accent = flag('accent') || '', tag = flag('tag') || 'after'
  const rd = (file, w, h) => { const b = readFileSync(join(crops, file + '.rgba')); return { width: w, height: h, data: new Uint8ClampedArray(b.buffer, b.byteOffset, b.length) } }
  const read = (id, size) => (upright(id) ? rd(`${id}-${size}`, Math.round(size * 0.75), size) : rd(`${id}-${size}`, size, Math.round(size * 0.75)))
  const sheets = flag('out') ? resolve(flag('out')) : join(WORK, 'sheets')
  const date = new Date().toLocaleDateString('sv')

  if (flag('time')) { // 1600 px, the size the maker's phone uploads
    const warm = read(photos[0][0], 1600)
    for (const s of styles) engine.makeOver(warm, s, { accent })
    console.log('style    median ms   worst ms   (1600 px on the long side, this machine; a mid-range phone is three to five times slower)')
    for (const s of styles) {
      const ms = photos.map(([id]) => { const img = read(id, 1600), t = performance.now(); engine.makeOver(img, s, { accent }); return performance.now() - t })
      console.log(s.padEnd(8), String(Math.round(med(ms))).padStart(8), String(Math.round(Math.max(...ms))).padStart(10))
    }
    return
  }

  const out = join(WORK, 'out-' + tag)
  mkdirSync(out, { recursive: true })
  if (flag('avatars')) { // the avatar is the middle square, 420 px, drawn without the border
    for (const id of AVATARS) for (const s of styles) writeFileSync(join(out, `avatar-${id}-${s}.rgba`), engine.makeOver(rd(`${id}-sq420`, 420, 420), s, { accent, frame: false }).data)
    py('avatars', { photos: AVATARS, styles, names: NAMES, size: 420, cell: 190, rendered: out, originals: crops, out: sheets, date })
    return
  }
  for (const [id] of photos) {
    const img = read(id, SIZE), row = []
    for (const s of styles) {
      const t = performance.now(), r = engine.makeOver(img, s, { accent })
      row.push(`${s} ${Math.round(performance.now() - t)}`)
      writeFileSync(join(out, `${id}-${s}.rgba`), r.data)
    }
    console.log(id.padEnd(8), row.join(' · '))
  }
  py('sheet', { photos: photos.map((p) => ({ id: p[0], title: p[1], portrait: !!p[4]?.portrait })), styles, names: NAMES, size: SIZE, cell: 390, rendered: out, originals: crops, out: sheets, date, tag, perStyle: !flag('all-only') })
}

main().catch((e) => { console.error(e.message); process.exit(1) })
