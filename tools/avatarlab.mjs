// avatarlab.mjs — the avatar maker looked at, side by side, before it ships (Nan 2026-10-16: "render every
// option with every kind at phone size and look at them side by side").
//
//   node tools/avatarlab.mjs [sheets] [--out dir] [--only part,part]
//
// sheets: parts (every option of every part, one sheet each) · random (64 at random) · presets (the nine
// kinds) · combos (hats with hair, clothes with skin) · editor (the sheet at 390 px in Chrome) · all
// Sheets land in notes/screens/avatar-*.png. Chrome is the installed one; playwright-core comes from the
// anidoodle-motdang checkout. The editor sheet is served from public/ by a small static server.

import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const require = createRequire('/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json')
const { chromium } = require('playwright-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf('--' + n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v }
const OUT = flag('out') || join(ROOT, 'notes/screens')
const ONLY = (flag('only') || '').split(',').filter(Boolean)
const SCALE = Number(flag('scale') || 1.5)
const sheets = args.length ? args : ['all']
mkdirSync(OUT, { recursive: true })

const A = await import(ROOT + '/public/s/avatar.mjs?' + Date.now())
const { AV_PARTS, AV_TABS, AV_PRESETS, avatarSvg, avatarTile, randomAvatar, normalizeAvatar } = A
const KINDS = ['shop', 'food', 'service', 'work', 'stay', 'homes', 'me', 'event', 'group']

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const CSS = `*{box-sizing:border-box}body{margin:0;padding:18px;background:#fff7ec;color:#1c1530;font:600 13px/1.25 system-ui,-apple-system,"Thonburi",sans-serif}
h1{font:800 22px system-ui;margin:0 0 4px}h2{font:800 15px system-ui;margin:18px 0 8px;padding:5px 10px;background:#1c1530;color:#fff;border-radius:8px}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 6px}.cell{width:var(--w,104px);text-align:center}.cell svg{display:block;width:100%;height:auto}
.cell span{display:block;margin-top:2px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tile{background:#e9dfd0;border-radius:12px;padding:0}
.sw{width:64px;height:64px;border-radius:50%;box-shadow:inset 0 0 0 2px #1c1530}.note{color:#5a4f6a;font-weight:500;margin:0 0 6px}`

/** A few characters to try each option on: different skin, face, hair, clothes. */
const BASES = [
  { skin: 's3', face: 'oval', hair: 'short', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', cheeks: 'on', outfit: 'tee', outc: 'teal', bg: 'glow', bgc: 'sun', frame: 'circle' },
  { skin: 's6', face: 'round', hair: 'long', hairc: 'espresso', brows: 'arched', eyes: 'lashes', mouth: 'grin', cheeks: 'on', outfit: 'blouse', outc: 'pink', bg: 'dots', bgc: 'mint', frame: 'circle' },
  { skin: 's8', face: 'square', hair: 'buzz', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'gentle', cheeks: 'off', outfit: 'collar', outc: 'indigo', bg: 'rays', bgc: 'peach', frame: 'circle' },
  { skin: 's1', face: 'oval', hair: 'bob', hairc: 'chestnut', brows: 'thin', eyes: 'happy', mouth: 'smile', cheeks: 'on', outfit: 'sweater', outc: 'orange', bg: 'solid', bgc: 'lilac', frame: 'circle' },
]

function partSheet(key) {
  const part = AV_PARTS[key]
  const html = [`<h1>${esc(key)}</h1><p class="note">${part.options.length} options. First row: the tiles the editor shows. Then the same option on four different characters.</p>`]
  if (part.type === 'swatch') {
    html.push('<div class="row">' + part.options.map((o) => `<div class="cell" style="--w:70px"><div class="sw" style="background:${o.c}"></div><span>${esc(o.id)}</span></div>`).join('') + '</div>')
    for (const b of BASES.slice(0, 2)) html.push('<div class="row">' + part.options.map((o) => `<div class="cell" style="--w:86px">${avatarSvg({ ...BASES[0], ...b, [part.key]: o.id }, 86)}</div>`).join('') + '</div>')
    return html.join('')
  }
  html.push('<h2>tiles</h2><div class="row">' + part.options.map((o) => `<div class="cell" style="--w:96px"><div class="tile">${avatarTile({ ...BASES[0] }, key, o.id, 96)}</div><span>${esc(o.id)}</span></div>`).join('') + '</div>')
  BASES.forEach((b, i) => {
    html.push(`<h2>on character ${i + 1}</h2><div class="row">` + part.options.map((o) => `<div class="cell" style="--w:92px">${avatarSvg({ ...b, [part.key]: o.id }, 92)}<span>${esc(o.id)}</span></div>`).join('') + '</div>')
  })
  return html.join('')
}

const page = (body, w) => `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body style="width:${w}px">${body}</body>`

let browser
async function shoot(html, name, w = 1180, scale = SCALE) {
  browser ||= await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: scale })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('PAGEERR', e.message))
  await p.setContent(html, { waitUntil: 'load' })
  await p.waitForTimeout(150)
  const file = join(OUT, name)
  await p.screenshot({ path: file, fullPage: true })
  await ctx.close()
  console.log(file)
  return file
}

const want = (n) => sheets.includes('all') || sheets.includes(n)

/** A grid: label cells on the left and across the top, every cell drawn by cell(row, col). */
function matrix(title, rows, cols, cell, { size = 66, label = (x) => x } = {}) {
  const head = `<div class="mrow"><span class="mlab"></span>${cols.map((c) => `<span class="mhead" style="width:${size}px">${esc(label(c))}</span>`).join('')}</div>`
  const body = rows.map((r) => `<div class="mrow"><span class="mlab">${esc(label(r))}</span>${cols.map((c) => `<span class="mcell" style="width:${size}px">${cell(r, c, size)}</span>`).join('')}</div>`).join('')
  return `<h1>${esc(title)}</h1>${head}${body}`
}
const MCSS = `.mrow{display:flex;align-items:center;gap:4px;margin:0 0 4px}.mlab{width:84px;flex:none;font-size:11px;text-align:right;padding-right:4px}.mhead{flex:none;font-size:10px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mcell svg{display:block;width:100%;height:auto}`
const mpage = (body, w) => page(`<style>${MCSS}</style>` + body, w)
const ids = (key) => AV_PARTS[key].options.map((x) => x.id)

/** The colour parts together: each swatch row, then the colour on a character. */
function colourSheet() {
  const use = { skin: {}, hairc: {}, outc: {}, hatc: { hat: 'cap' }, scarfc: { hair: 'hijab' }, bgc: { bg: 'solid' } }
  const html = ['<h1>colours</h1><p class="note">Skin, hair, clothes, hat, scarf and background colours: every swatch, then each on a character.</p>']
  for (const [key, part] of Object.entries(AV_PARTS)) {
    if (part.type !== 'swatch') continue
    html.push(`<h2>${esc(key)} (${part.options.length})</h2><div class="row">${part.options.map((o) => `<div class="cell" style="--w:78px"><div class="sw" style="background:${o.c};width:44px;height:44px;margin:0 auto"></div><span>${esc(o.id)}</span></div>`).join('')}</div>`)
    html.push(`<div class="row">${part.options.map((o) => `<div class="cell" style="--w:78px">${avatarSvg({ ...BASES[key === 'skin' ? 0 : 2], ...use[key], [part.key]: o.id }, 78)}</div>`).join('')}</div>`)
  }
  return html.join('')
}

if (want('parts')) {
  for (const key of Object.keys(AV_PARTS)) {
    if (AV_PARTS[key].type === 'swatch' || (ONLY.length && !ONLY.includes(key))) continue
    await shoot(page(partSheet(key), 1180), `avatar-part-${key}.png`)
  }
  if (!ONLY.length || ONLY.includes('colours')) await shoot(page(colourSheet(), 1180), 'avatar-part-colours.png')
}

if (want('random')) {
  const cells = Array.from({ length: 64 }, (_, i) => `<div class="cell" style="--w:132px">${avatarSvg(randomAvatar('lab-' + i, KINDS[i % 9]), 132)}</div>`).join('')
  await shoot(page(`<h1>64 at random</h1><div class="row">${cells}</div>`, 1180), 'avatar-random.png')
}

if (want('presets')) {
  const rows = KINDS.map((k) => `<h2>${k}</h2><div class="row">${AV_PRESETS[k].map((p) => `<div class="cell" style="--w:150px">${avatarSvg(p.o, 150)}<span>${esc(p.label.en)}</span></div>`).join('')}</div>`).join('')
  await shoot(page(`<h1>Presets for the nine kinds</h1>${rows}`, 1000), 'avatar-presets.png')
  // the same, at the size of a phone's tile, with their Thai names
  const small = KINDS.map((k) => `<h2>${k}</h2><div class="row">${AV_PRESETS[k].map((p) => `<div class="cell" style="--w:64px">${avatarSvg(p.o, 64)}<span>${esc(p.label.th)}</span></div>`).join('')}</div>`).join('')
  await shoot(page(`<h1>Presets at 64 px, Thai names</h1>${small}`, 560), 'avatar-presets-small.png', 560, 2)
}

if (want('combos')) {
  const base = { ...BASES[0], hat: 'none', hatc: 'red' }
  await shoot(mpage(matrix('Every hair with every hat', ids('hair'), ids('hat'), (h, t, z) => avatarSvg({ ...base, hair: h, hat: t, hatc: t === 'chef' ? 'white' : 'orange' }, z), { size: 62 }), 800), 'avatar-combos-hats.png', 800)
  await shoot(mpage(matrix('Every outfit on every skin tone', ids('outfit'), ids('skin'), (f, k, z) => avatarSvg({ ...BASES[1], hair: 'short', outfit: f, skin: k }, z), { size: 76 }), 960), 'avatar-combos-outfits.png', 960)
  await shoot(mpage(matrix('Glasses and facial hair on each face shape', ids('beard'), ['round', 'oval', 'square'].flatMap((f) => ids('glasses').map((g2) => f + ':' + g2)), (b, fg, z) => { const [f, g2] = fg.split(':'); return avatarSvg({ ...BASES[2], hair: 'short', face: f, glasses: g2, beard: b }, z) }, { size: 62, label: (x) => String(x).replace('round:', 'r:').replace('oval:', 'o:').replace('square:', 's:') }), 1100), 'avatar-combos-faces.png', 1100)
  await shoot(mpage(matrix('Flowers and earrings with every hair', ids('hair'), ['none', ...ids('flower').slice(1), ...ids('ears').slice(1)], (h, x, z) => avatarSvg({ ...BASES[3], hair: h, flower: ids('flower').includes(x) && x !== 'none' ? x : 'none', ears: ids('ears').includes(x) && x !== 'none' ? x : 'none', hat: 'none' }, z), { size: 70 }), 800), 'avatar-combos-extras.png', 800)
}

// ---- the editor sheet in Chrome, at the width of a phone ---------------------------------------------------------------

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' }
const HARNESS = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/s/make.css"><link rel="stylesheet" href="/s/avatar.css"></head>
<body><header class="bar"><b class="brand">Mot Dang</b></header><div class="app"><h1 class="q">Your page</h1><p class="sub">The builder sits behind the sheet.</p></div>
<script type="module">
import { openAvatar } from '/s/avatar-ui.mjs'
import { ui } from '/s/make-words.mjs'
const q = new URLSearchParams(location.search), lang = q.get('lang') || 'en'
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
window.__open = () => openAvatar({ name: q.get('name') || 'Noi Noodles', accent: q.get('accent') || '#d7261e', kind: q.get('kind') || 'food', T: (k) => esc(ui(lang, k)), onUse: async (canvas, o) => { window.__used = { url: canvas.toDataURL('image/png'), o, w: canvas.width, h: canvas.height } } })
window.__open()
</script></body></html>`
function serve(port) {
  const srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), p = u.pathname.replace(/^\/~/, '')
    if (p === '/lab/editor.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HARNESS) }
    const f = join(ROOT, 'public', p)
    if (!f.startsWith(join(ROOT, 'public')) || !existsSync(f)) { res.writeHead(404); return res.end('no') }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' })
    res.end(readFileSync(f))
  })
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)))
}

if (want('editor')) {
  const PORT = Number(process.env.AVATARLAB_PORT || 8812), srv = await serve(PORT)
  browser ||= await chromium.launch({ executablePath: CHROME, headless: true })
  const open = async (w, h, qs) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 600, hasTouch: w < 600 })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(e.message))
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    await p.goto(`http://127.0.0.1:${PORT}/lab/editor.html?${qs}`, { waitUntil: 'load' })
    await p.waitForSelector('.avmk .avt')
    await p.waitForTimeout(250)
    return { ctx, p, errs }
  }
  const shots = []
  /** One tab, scrolled to a section (or the top), shot as one frame of the phone sheet. */
  const frame = async (p, tab, sec, tag, caption) => {
    await p.click(`#avtab-${tab}`)
    await p.waitForTimeout(120)
    await p.evaluate((id) => {
      const body = document.querySelector('#avbody'), bar = document.querySelector('.avtabs')
      if (!id) { body.scrollTop = 0; return }
      const s = document.querySelector(`[data-sec="${id}"]`)
      body.scrollTop += s.getBoundingClientRect().top - body.getBoundingClientRect().top - bar.offsetHeight - 4
    }, sec)
    await p.waitForTimeout(120)
    const file = join(OUT, `.tmp-editor-${tag}-${tab}-${sec || 'top'}.png`)
    await p.screenshot({ path: file })
    shots.push([file, caption])
  }
  {
    const { ctx, p, errs } = await open(390, 844, 'lang=en&kind=food')
    // the first five: the top of each tab; then the sections below the fold
    for (const t of ['face', 'hair', 'clothes', 'extras', 'back']) await frame(p, t, null, 'en', `en ${t}`)
    await frame(p, 'face', 'eyes', 'en', 'en face: eyes')
    await frame(p, 'face', 'mouth', 'en', 'en face: mouth')
    await frame(p, 'hair', 'hairc', 'en', 'en hair: colour')
    await frame(p, 'clothes', 'outc', 'en', 'en clothes: colour')
    await frame(p, 'extras', 'beard', 'en', 'en extras: beard')
    await frame(p, 'extras', 'hat', 'en', 'en extras: hat')
    await frame(p, 'back', 'frame', 'en', 'en background: frame')
    if (errs.length) console.log('EDITOR ERRORS', errs)
    await ctx.close()
  }
  {
    const { ctx, p } = await open(390, 844, 'lang=en&kind=food')
    await p.click('#avtab-hair'); await p.click('[data-part="hair"][data-v="hijab"]'); await p.waitForTimeout(100)
    await frame(p, 'hair', 'scarfc', 'en', 'en hair: hijab shows scarf colour')
    await ctx.close()
  }
  {
    const { ctx, p } = await open(360, 740, 'lang=th&kind=shop&name=%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%9B%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B8%B4%E0%B8%94')
    for (const t of ['face', 'hair', 'extras']) await frame(p, t, null, 'th', `th 360 px ${t}`)
    await ctx.close()
  }
  {
    const { ctx, p } = await open(390, 844, 'lang=my&kind=stay')
    await frame(p, 'face', null, 'my', 'my face')
    await ctx.close()
  }
  {
    const { ctx, p } = await open(390, 844, 'lang=zh&kind=service')
    await frame(p, 'clothes', null, 'zh', 'zh clothes')
    await ctx.close()
  }
  // press Use: the canvas that goes back
  {
    const { ctx, p } = await open(390, 844, 'lang=en&kind=food')
    await p.click('#avtab-hair'); await p.click('[data-part="hair"][data-v="bun"]'); await p.click('[data-part="hairc"][data-v="grey"]')
    await p.click('#avtab-extras'); await p.click('[data-part="glasses"][data-v="round"]'); await p.click('[data-part="hat"][data-v="none"]')
    await p.click('#avtab-back'); await p.click('[data-part="frame"][data-v="stamp"]')
    await p.click('#avundo'); await p.click('#avundo')
    await p.click('#avshuf'); await p.waitForTimeout(100)
    await p.click('#avuse')
    await p.waitForFunction(() => window.__used, null, { timeout: 8000 })
    const got = await p.evaluate(() => window.__used)
    writeFileSync(join(OUT, '.tmp-use.png'), Buffer.from(got.url.split(',')[1], 'base64'))
    console.log('use ->', got.w + 'x' + got.h, JSON.stringify(got.o))
    const closed = await p.evaluate(() => !document.querySelector('.avmk'))
    console.log('sheet closed after use:', closed)
    await ctx.close()
  }
  // a desktop width
  {
    const { ctx, p } = await open(1000, 760, 'lang=en&kind=homes')
    await p.click('#avtab-hair'); await p.waitForTimeout(150)
    const file = join(OUT, '.tmp-editor-desk.png')
    await p.screenshot({ path: file }); shots.push([file, 'desktop 1000 px, hair'])
    await ctx.close()
  }
  srv.close()
  writeFileSync(join(OUT, '.tmp-shots.json'), JSON.stringify(shots))
  execFileSync('python3', [join(ROOT, 'tools/avatarlab-join.py'), join(OUT, '.tmp-shots.json'), OUT], { stdio: 'inherit' })
}

if (browser) await browser.close()
if (!args.includes('--no-optimize')) execFileSync('python3', [join(ROOT, 'tools/avatarlab-join.py'), '--optimize', OUT], { stdio: 'inherit' })
