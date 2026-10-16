#!/usr/bin/env node
// logolab.mjs — the logo maker's gate (Nan: "before shipping any set of designs, render every option
// with every kind at phone size and look at them side by side").
//
//   node tools/logolab.mjs [--origin http://127.0.0.1:8813] [--kinds food,shop|all] [--langs th,en]
//                          [--out notes/screens] [--shots tmpdir] [--only gallery,editor,mocks]
//
// It writes a lab page (public/s/lab/logo.html, removed again), opens the real sheet in Chrome at
// 390 px, and for each of the nine kinds, a Thai name and an English one:
//   - every design, as a card the way the phone shows it, laid in one picture (logo-<kind>-<lang>.png)
//   - the whole gallery as the phone scrolls it
//   - the editor on each tab, the mock-ups, a download
// and reports any design that draws nothing, runs off its box, or throws.
//
// Serve first:  cp ../motdang-pages/.dev.vars .dev.vars  (DEV_ORIGIN = "http://127.0.0.1:8813")
//               npx --yes wrangler dev --port 8813 --ip 127.0.0.1 --local
// Playwright comes from the anidoodle-motdang checkout, Chrome is the installed one.

import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PW = process.env.LAB_PLAYWRIGHT || '/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json'
const CHROME = process.env.LAB_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const { chromium } = createRequire(PW)('playwright-core')

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ORIGIN = opt('--origin', process.env.LAB_ORIGIN || 'http://127.0.0.1:8813')
const OUT = resolve(ROOT, opt('--out', 'notes/screens'))
const ONLY = opt('--only', 'gallery,editor,mocks,flow').split(',')
const SHOTS = opt('--shots', '') ? resolve(opt('--shots')) : mkdtempSync(join(tmpdir(), 'logolab-'))
const { LOOKS } = await import(new URL('../public/s/looks.mjs', import.meta.url))
const { KINDS } = await import(new URL('../public/s/render.mjs', import.meta.url))

// what each kind would really write, in Thai and in English
const SETS = {
  shop: { look: 'poster', th: ['ร้านผ้าทอแม่ปิง', 'ผ้าฝ้ายทอมือจากเชียงใหม่'], en: ['Hands of Mae Ping', 'Handwoven cotton from Chiang Mai'] },
  food: { look: 'night', th: ['ก๋วยเตี๋ยวป้านิด', 'ข้าวซอยตั้งแต่ปี 2530'], en: ['Noi Noodles', 'Khao soi since 1987'] },
  service: { look: 'loom', th: ['นวดแผนไทยสบายใจ', 'นวดเท้า นวดตัว อโรม่า'], en: ['Sabai Jai Massage', 'Thai massage by the river'] },
  work: { look: 'clean', th: ['พลอยสตูดิโอ', 'ถ่ายภาพงานแต่งและอาหาร'], en: ['Ploy Studio', 'Photographs of weddings and food'] },
  stay: { look: 'lanna', th: ['บ้านสวนเกสต์เฮาส์', 'ห้องพักหกห้องในสวนริมน้ำ'], en: ['Ban Suan Guesthouse', 'Six rooms in a garden by the river'] },
  homes: { look: 'clean', th: ['เชียงใหม่โฮมส์', 'บ้านและที่ดินเชียงใหม่'], en: ['Teak House Homes', 'Houses to buy or rent around Chiang Mai'] },
  me: { look: 'stitch', th: ['อันนิกา', 'นักเขียนและนักเดิน'], en: ['Annika', 'Writer and walker'] },
  event: { look: 'poster', th: ['ลอยกระทงริมน้ำปิง', 'โคมไฟเหนือแม่น้ำ'], en: ['Loi Krathong Night', 'Lanterns over the Ping river'] },
  group: { look: 'stitch', th: ['ชมรมวิ่งเชียงใหม่', 'วิ่งทุกวันเสาร์ตอนหกโมง'], en: ['Chiang Mai Runners', 'We run every Saturday at six'] },
}
const kinds = opt('--kinds', 'all') === 'all' ? KINDS : opt('--kinds').split(',')
const langs = opt('--langs', 'th,en').split(',')

// the builder's own content security policy, read from the worker, so a lab run fails where the page would
const CSP = (() => { try { const m = /const CSP_TOOL = `([^`]*)`(?:\s*\+\s*`([^`]*)`)?/.exec(readFileSync(join(ROOT, 'src/worker.mjs'), 'utf8')); return (m[1] + (m[2] || '')).replace(/frame-ancestors[^;]*;?\s*/g, '').trim() } catch { return '' } })()

const LABJS = `import { ui } from '/s/make-words.mjs'
import { openLogo } from '/s/logo-ui.mjs'
import { drawLogo, RECIPES } from '/s/logo.mjs'
const q = new URLSearchParams(location.search)
const lang = q.get('lang') || 'en'
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const T = (k) => esc(ui(lang, k))
const add = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s) })
let dbReady = null
const loaded = new Set()
function dingbats(fams) {
  dbReady = (dbReady || add('/s/db/core.js')).then(() => Promise.all([...new Set(fams)].map((f) => (loaded.has(f) ? null : (loaded.add(f), add('/s/db/' + f + '.js'))))))
  return dbReady
}
window.__errors = []
addEventListener('error', (e) => window.__errors.push(String(e.message)))
addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.message || e.reason)))
window.labOpen = (o) => { window.__used = null; return openLogo({ ...o, T, need: (f) => dingbats(f.filter(Boolean)), onUse: async (sq, x) => { window.__used = { sq: [sq.width, sq.height], cover: [x.cover.width, x.cover.height], design: x.design.id } } }) }
window.labRecipes = RECIPES.length
// the ink of a card: does it draw, does it stay inside its box
window.labInk = () => [...document.querySelectorAll('#lg-gal .lg-card canvas')].map((cv) => {
  const t = document.createElement('canvas'); t.width = t.height = 80
  const c = t.getContext('2d', { willReadFrequently: true }); c.drawImage(cv, 0, 0, 80, 80)
  const d = c.getImageData(0, 0, 80, 80).data
  let x0 = 80, y0 = 80, x1 = -1, y1 = -1, n = 0
  for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) if (d[(y * 80 + x) * 4 + 3] > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return { n, x0, y0, x1, y1, id: cv.parentNode.dataset.id }
})
`

const HARNESS = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">${CSP ? `<meta http-equiv="Content-Security-Policy" content="${CSP.replace(/"/g, '&quot;')}">` : ''}<meta name="viewport" content="width=device-width,initial-scale=1"><title>logolab</title>
<link rel="stylesheet" href="/s/make.css">
<script type="module" src="/s/lab/logo-lab.mjs"></script></head><body></body></html>`

function py(...a) {
  const r = spawnSync('python3', [join(ROOT, 'tools/logolab.py'), ...a], { stdio: 'inherit' })
  if (r.status) throw new Error('logolab.py failed')
}

mkdirSync(OUT, { recursive: true })
mkdirSync(join(ROOT, 'public/s/lab'), { recursive: true })
const labFile = join(ROOT, 'public/s/lab/logo.html')
writeFileSync(labFile, HARNESS)
const labJs = join(ROOT, 'public/s/lab/logo-lab.mjs')
writeFileSync(labJs, LABJS)
if (!CSP) console.log('note: no content security policy found in src/worker.mjs')
const cleanup = () => { try { rmSync(labFile) } catch {}; try { rmSync(join(ROOT, 'public/s/lab/logo-lab.mjs')) } catch {}; try { if (!readdirSync(join(ROOT, 'public/s/lab')).length) rmSync(join(ROOT, 'public/s/lab'), { recursive: true }) } catch {} }
process.on('exit', cleanup)
process.on('SIGINT', () => process.exit(1))

const problems = []
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' })

const FULL = '.sheet.logo{position:absolute;inset:0 0 auto 0;display:block;background:#fff;min-height:100%}.sheet.logo .box.lg{max-height:none;overflow:visible;width:390px;border-radius:0}.lg-top{position:static}'

async function open(lang, o, full = false) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => problems.push(`${o.kind}/${lang}: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) problems.push(`${o.kind}/${lang}: console ${m.text().slice(0, 160)}`) })
  await page.goto(`${ORIGIN}/s/lab/logo.html?lang=${lang}`, { waitUntil: 'load' })
  await page.evaluate((x) => { window.labOpen(x) }, o)
  if (full) await page.addStyleTag({ content: FULL })
  const n = await page.evaluate(() => window.labRecipes)
  await page.waitForFunction((k) => document.querySelectorAll('.lg-card.done').length >= k, full ? n : Math.min(n, 6), { timeout: 60000 }).catch(() => problems.push(`${o.kind}/${lang}: not every card drew`))
  await page.waitForTimeout(400)
  return page
}

// a page that carries the policy refuses an inline script; if this one does not, the run proves nothing about it
if (CSP) {
  const t = await ctx.newPage()
  await t.goto(`${ORIGIN}/s/lab/logo.html?lang=en`, { waitUntil: 'load' })
  if (await t.evaluate(() => { const e = document.createElement('script'); e.textContent = 'window.__inline = 1'; document.head.appendChild(e); return !!window.__inline })) problems.push('lab: the content security policy is not enforced')
  await t.close()
}

const sets = []
for (const kind of kinds) for (const lang of langs) {
  const s = SETS[kind]
  const [name, tagline] = s[lang]
  sets.push({ kind, lang, name, tagline, look: s.look, accent: LOOKS[s.look].accent })
}

const made = []
const sheets = {}
if (ONLY.includes('gallery')) for (const s of sets) {
  const page = await open(s.lang === 'th' ? 'th' : 'en', s, true)
  await page.waitForTimeout(300)
  const dir = join(SHOTS, `${s.kind}-${s.lang}`)
  mkdirSync(dir, { recursive: true })
  const rects = await page.evaluate(() => [...document.querySelectorAll('#lg-gal .lg-card')].map((c) => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, id: c.getAttribute('aria-label') } }))
  const ink = await page.evaluate(() => window.labInk())
  ink.forEach((k, i) => {
    if (k.n < 90) problems.push(`${s.kind}/${s.lang} #${i + 1} ${k.id}: almost nothing drawn`)
    else if (k.x0 <= 0 || k.y0 <= 0 || k.x1 >= 79 || k.y1 >= 79) problems.push(`${s.kind}/${s.lang} #${i + 1} ${k.id}: touches the edge of its box`)
  })
  let i = 0
  for (const r of rects) { await page.screenshot({ path: join(dir, `card-${String(i++).padStart(2, '0')}.png`), clip: { x: r.x, y: r.y, width: r.width, height: r.height }, fullPage: true }) }
  const one = join(SHOTS, `sheet-${s.kind}-${s.lang}.png`)
  py('grid', dir, one, '--cols', '6', '--tile', '176', '--title', `${s.kind} · ${s.name}`)
  sheets[s.kind] = { ...(sheets[s.kind] || {}), [s.lang]: one }
  if (s.lang === 'en' && ['food', 'stay'].includes(s.kind)) await page.screenshot({ path: join(SHOTS, `phone-${s.kind}.png`), fullPage: true })
  if (page.isClosed() === false) await page.close()
}

for (const [kind, by] of Object.entries(sheets)) {
  const out = join(OUT, `logo-${kind}.png`)
  py('hstack', out, ...langs.map((l) => by[l]).filter(Boolean))
  made.push(out)
}

// the editor on each tab, on a phone, for one Thai and one English maker
const EDIT = [
  { kind: 'food', lang: 'th', pick: 4 }, { kind: 'stay', lang: 'en', pick: 8 },
]
if (ONLY.includes('editor') || ONLY.includes('mocks')) for (const e of EDIT) {
  const s = sets.find((x) => x.kind === e.kind && x.lang === e.lang) || { ...SETS[e.kind], kind: e.kind, lang: e.lang, name: SETS[e.kind][e.lang][0], tagline: SETS[e.kind][e.lang][1], look: SETS[e.kind].look, accent: LOOKS[SETS[e.kind].look].accent }
  const page = await open(e.lang, s)
  const shots = []
  if (ONLY.includes('editor')) { const f = join(SHOTS, `edit-${e.kind}-gallery.png`); await page.screenshot({ path: f }); shots.push(f) }
  await page.locator('.lg-card').nth(e.pick).click()
  await page.waitForSelector('#lg-pv')
  await page.waitForTimeout(900)
  const tabs = ONLY.includes('editor') ? ['words', 'icon', 'type', 'colour', 'layout'] : []
  for (const t of tabs) {
    await page.locator(`.lg-tabs [data-tab="${t}"]`).click()
    await page.waitForTimeout(t === 'layout' || t === 'type' ? 2600 : 900)
    const f = join(SHOTS, `edit-${e.kind}-${t}.png`)
    await page.screenshot({ path: f }); shots.push(f)
  }
  if (shots.length) { const o = join(OUT, `logo-editor-${e.lang}.png`); py('strip', o, ...shots, '--h', '1200', '--labels', ['gallery', ...tabs].join(',')); made.push(o) }
  if (ONLY.includes('mocks')) {
    await page.locator('.lg-tabs [data-tab="try"]').click()
    await page.waitForTimeout(2500)
    await page.addStyleTag({ content: '.sheet.logo{position:absolute;inset:0 0 auto 0;display:block;background:#fff;min-height:100%}.sheet.logo .box.lg{max-height:none;overflow:visible;width:390px;border-radius:0}.lg-top,.lg-pvw,.lg-tabs,.lg-bar{position:static!important}.lg-bar{display:none}' })
    await page.waitForTimeout(500)
    const files = []
    const n = await page.locator('#lg-mocks canvas').count()
    for (let i = 0; i < n; i++) { const f = join(SHOTS, `mock-${e.kind}-${i}.png`); await page.locator('#lg-mocks canvas').nth(i).screenshot({ path: f }); files.push(f) }
    const o = join(OUT, `logo-mockups-${e.kind}.png`)
    py('mosaic', o, ...files, '--cols', '4', '--w', '360')
    made.push(o)
  }
  // the download and the use
  if (e === EDIT[0]) {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.evaluate(async () => { document.getElementById('lg-down').click(); document.querySelector('[data-dl="logo"]').click() })])
    if (!dl) problems.push('download did not start')
    else { const p = join(SHOTS, 'download.png'); await dl.saveAs(p); const r = spawnSync('python3', ['-c', `from PIL import Image;im=Image.open(${JSON.stringify(p)});print(im.size, im.mode, im.getpixel((2,2)))`]); console.log('download', String(r.stdout).trim()) }
    await page.evaluate(() => document.getElementById('lg-use').click())
    await page.waitForFunction(() => window.__used, null, { timeout: 15000 }).catch(() => problems.push('use did not finish'))
    console.log('use', JSON.stringify(await page.evaluate(() => window.__used)))
  }
  await page.close()
}

// a maker's whole visit: type a name, shuffle, pick, edit each tab, download, use
if (ONLY.includes('flow')) {
  const s = { kind: 'food', lang: 'th', name: 'ก๋วยเตี๋ยวป้านิด', tagline: 'ข้าวซอยตั้งแต่ปี 2530', look: 'night', accent: LOOKS.night.accent }
  const page = await open('th', s)
  const step = async (what, fn) => { try { await fn() } catch (e) { problems.push(`flow ${what}: ${String(e.message).split('\n')[0]}`) } }
  await step('type a name', async () => {
    await page.fill('#lg-n', 'Noi Noodles'); await page.fill('#lg-t', 'Khao soi since 1987')
    await page.waitForTimeout(1500)
    const names = await page.evaluate(() => [...document.querySelectorAll('#lg-gal .lg-card')].map((c) => c.getAttribute('aria-label')))
    if (!names.every((n) => n.startsWith('Noi Noodles'))) throw new Error('cards kept the old name')
  })
  await step('shuffle', async () => { const a = await page.evaluate(() => document.querySelector('#lg-gal').innerHTML.length); await page.click('#lg-shuf'); await page.waitForTimeout(1500); const n = await page.evaluate(() => document.querySelectorAll('#lg-gal .lg-card.done').length); if (n < 4) throw new Error('shuffle drew ' + n) })
  await step('pick a design', async () => { await page.locator('#lg-gal .lg-card').nth(1).click(); await page.waitForSelector('#lg-pv'); await page.waitForTimeout(600) })
  await step('words', async () => { await page.fill('#lg-wt', 'Hot bowls every day'); await page.fill('#lg-ws', 'since 1987'); await page.locator('[data-set="caps"][data-v="upper"]').click(); await page.waitForTimeout(400) })
  await step('icon search in Thai', async () => {
    await page.locator('.lg-tabs [data-tab="icon"]').click()
    await page.fill('#lg-iq', 'ก๋วยเตี๋ยว'); await page.waitForTimeout(2500)
    const n = await page.locator('#lg-ig button').count()
    if (!n) throw new Error('no icon for a Thai word')
    await page.locator('#lg-ig button').first().click()
    await page.fill('#lg-iq', 'coffee'); await page.waitForTimeout(1800)
    if (!(await page.locator('#lg-ig button').count())) throw new Error('no icon for coffee')
    await page.locator('#lg-ig button').first().click()
    await page.locator('[data-set="iconLook"][data-v="mono"]').click()
    await page.fill('#lg-iq', ''); await page.waitForTimeout(300)
    await page.locator('#lg-fams [data-fam="lanna"]').click(); await page.waitForTimeout(900)
    if (!(await page.locator('#lg-ig button').count())) throw new Error('no icons in a family')
    await page.locator('#lg-ig button').nth(2).click()
    await page.locator('[data-ic=""]').first().click(); await page.waitForTimeout(300)
    await page.locator('#lg-fams [data-fam="suggested"]').click(); await page.waitForTimeout(500)
    await page.locator('#lg-ig button').first().click()
    await page.locator('#lg-is').fill('0.7'); await page.waitForTimeout(300)
  })
  await step('letters', async () => { await page.locator('.lg-tabs [data-tab="type"]').click(); await page.waitForTimeout(1500); await page.locator('#lg-fonts .lg-ft').nth(5).click(); await page.waitForTimeout(500); await page.locator('#lg-sp').fill('0.1') })
  await step('colour', async () => { await page.locator('.lg-tabs [data-tab="colour"]').click(); await page.locator('#lg-pals .lg-pal').nth(6).click(); await page.waitForTimeout(300); await page.locator('#lg-c1').fill('#1f7a5a'); await page.locator('[data-set="inv"][data-v="1"]').click(); await page.locator('.lg-gs [data-g="dark"]').click(); await page.locator('.lg-gs [data-g="clear"]').click(); await page.locator('.lg-gs [data-g="light"]').click(); await page.locator('.lg-gs [data-g="auto"]').click(); await page.waitForTimeout(500) })
  await step('layout', async () => { await page.locator('.lg-tabs [data-tab="layout"]').click(); await page.waitForTimeout(3000); await page.locator('#lg-lay .lg-card').nth(8).click(); await page.waitForTimeout(600) })
  await step('on things', async () => { await page.locator('.lg-tabs [data-tab="try"]').click(); await page.waitForTimeout(2500); const n = await page.locator('#lg-mocks canvas').count(); if (n < 8) throw new Error('mock-ups: ' + n) })
  await page.screenshot({ path: join(SHOTS, 'flow-end.png') })
  const sizes = {}
  for (const k of ['logo', 'sq', 'cover']) {
    await page.click('#lg-down'); await page.waitForTimeout(150)
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }).catch(() => null), page.locator(`[data-dl="${k}"]`).click()])
    if (!dl) { problems.push('flow download ' + k + ': none'); continue }
    const p = join(SHOTS, `dl-${k}.png`); await dl.saveAs(p)
    const r = spawnSync('python3', ['-c', `from PIL import Image;im=Image.open(${JSON.stringify(p)}).convert('RGBA');print(im.size[0], im.size[1], im.getpixel((1,1))[3], im.getpixel((im.size[0]//2, im.size[1]//2))[3])`])
    sizes[k] = String(r.stdout).trim()
  }
  console.log('downloads (w h corner-alpha centre-alpha)', JSON.stringify(sizes))
  const [lw, lh, la] = (sizes.logo || '0 0 0').split(' ').map(Number)
  if (Math.max(lw, lh) !== 2000) problems.push('flow: the logo download is not 2000 px on its long side: ' + sizes.logo)
  if (la !== 0) problems.push('flow: the logo download is not clear in its corner')
  if (sizes.sq && !/^640 640 /.test(sizes.sq)) problems.push('flow: the square is not 640: ' + sizes.sq)
  if (sizes.cover && !/^1600 900 /.test(sizes.cover)) problems.push('flow: the cover is not 1600 x 900: ' + sizes.cover)
  await step('use', async () => { await page.click('#lg-use'); await page.waitForFunction(() => window.__used, null, { timeout: 15000 }); const u = await page.evaluate(() => window.__used); console.log('use', JSON.stringify(u)); if (u.sq[0] !== 640 || u.cover[0] !== 1600 || u.cover[1] !== 900) throw new Error('wrong canvases ' + JSON.stringify(u)) })
  const gone = await page.evaluate(() => !document.querySelector('.sheet.logo'))
  if (!gone) problems.push('flow: the sheet did not close after use')
  await page.close()
}

await browser.close()
if (problems.length) { console.log('\nPROBLEMS\n' + problems.join('\n')); }
console.log('\nsheets\n' + made.join('\n'))
process.exit(problems.length ? 1 : 0)
