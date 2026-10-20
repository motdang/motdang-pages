// phone.mjs <outdir> — a seller's first minutes at the market, on a 390 px phone, with no server:
// headless Chrome's requests go straight to the Worker in this process (an in-memory D1, R2 in a
// Map, a model that passes everything). Screenshots of each screen land in <outdir>.
//   node tools/phone.mjs /tmp/phone
import { createRequire } from 'node:module'
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import worker from '../src/worker.mjs'
import * as prices from '../src/prices.mjs'
import { normalize } from '../public/s/render.mjs'

const require = createRequire('/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json')
const { chromium } = require('playwright-core')
const out = process.argv[2] || '/tmp/phone'
mkdirSync(out, { recursive: true })
const ROOT = new URL('../', import.meta.url)

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('migrations/', ROOT)).sort()) db.exec(readFileSync(new URL('migrations/' + f, ROOT), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x))
    return {
      bind: (...b) => st(sql, b),
      first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => { const r = []; for (const x of xs) r.push(await x.run()); return r }, raw: db }
}
const r2 = () => {
  const m = new Map()
  return {
    put: async (k, v, o = {}) => { m.set(k, { bytes: new Uint8Array(v instanceof ArrayBuffer ? v : v.buffer ? v : await new Response(v).arrayBuffer()), ...o }) },
    get: async (k) => { const x = m.get(k); return x ? { body: x.bytes, httpMetadata: x.httpMetadata || {}, customMetadata: x.customMetadata || {}, arrayBuffer: async () => x.bytes.buffer } : null },
    head: async (k) => (m.has(k) ? { customMetadata: m.get(k).customMetadata || {} } : null),
    delete: async (ks) => { for (const k of [].concat(ks)) m.delete(k) },
  }
}
const TYPES = { js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', html: 'text/html; charset=utf-8', svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', json: 'application/json', woff2: 'font/woff2' }
const env = {
  DB: d1(), MEDIA: r2(), SESSION_SECRET: 's', ADMIN_KEY: 'a', PROMPTPAY: '0812345678', GOLD_THB: '3000', DEV_ORIGIN: 'http://local.test',
  AI: { run: async (_m, x) => ({ response: Array.isArray(x?.messages?.[0]?.content) ? '{"nudity":false,"sexual":false,"gore":false,"what":"a thing for sale"}' : 'safe' }) },
  ASSETS: { fetch: async (req) => {
    const p = decodeURIComponent(new URL(req.url).pathname).replace(/^\/~/, '')
    const f = new URL('public' + p, ROOT)
    if (!existsSync(f) || p.endsWith('/')) return new Response('', { status: 404 })
    return new Response(readFileSync(f), { headers: { 'content-type': TYPES[p.split('.').pop()] || 'application/octet-stream' } })
  } },
  SITE: { fetch: (req) => fetch('https://motdang.net' + new URL(req.url).pathname) },
}
const waits = []
const ctxW = { waitUntil: (p) => waits.push(p.catch((e) => console.error('waitUntil', e))), passThroughOnException() {} }

const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'th-TH',
  userAgent: 'Mozilla/5.0 (Linux; Android 14; vivo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36' })
await ctx.route('http://local.test/**', async (route) => {
  const rq = route.request()
  const body = ['GET', 'HEAD'].includes(rq.method()) ? undefined : rq.postDataBuffer()
  const u = rq.url().replace('http://local.test/~/', 'http://local.test/') // the page's own files, without the old address's redirect
  const res = await worker.fetch(new Request(u, { method: rq.method(), headers: { ...rq.headers(), 'sec-fetch-mode': 'navigate' }, body }), env, ctxW)
  const h = {}; res.headers.forEach((v, k) => { if (k !== 'content-security-policy') h[k] = v })
  await route.fulfill({ status: res.status, headers: h, body: Buffer.from(await res.arrayBuffer()) })
})
const pg = await ctx.newPage()
pg.on('pageerror', (e) => console.log('PAGE ERROR', e.message))
pg.on('console', (m) => { if (m.type() === 'error' && !/NAME_NOT_RESOLVED/.test(m.text())) console.log('console', m.text(), m.location()?.url) })
pg.on('response', async (r) => { if (r.status() >= 400 && r.url().includes('local.test')) console.log('HTTP', r.status(), r.request().method(), r.url(), (await r.text().catch(() => '')).slice(0, 200)) })
const shot = async (n) => { await pg.waitForTimeout(400); await pg.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n) }
const photo = fileURLToPath(new URL('public/s/kinds/shop.webp', ROOT))
const amPhoto = process.env.AMULET_PHOTO || fileURLToPath(new URL('public/s/kinds/amulet.webp', ROOT))

async function market(m, kind, name, line, first, price, per, low, file) {
  await pg.goto(`http://local.test/make?by=nan#m=${m}&kind=${kind}`, { waitUntil: 'networkidle' })
  await shot(`${m}-1`)
  await pg.fill('#mkname', name)
  await pg.click('[data-mnext="1"]')
  await pg.waitForSelector('[data-mnext="2"]')
  await shot(`${m}-2`)
  await pg.fill('[data-mk="contact.line"]', line)
  await pg.click('[data-mnext="2"]')
  await pg.waitForSelector('[data-mnext="3"]')
  await shot(`${m}-3`)
  await pg.setInputFiles('[data-mkshot]', file)
  await pg.waitForSelector('.shot img', { timeout: 15000 }).catch(() => console.log('no photo shown'))
  await pg.fill(kind === 'amulet' ? '[data-mx="t"]' : '[data-mx="n"]', first)
  await pg.fill('[data-mx="p"]', price)
  if (per) await pg.fill('[data-mx="dyn.per"]', per)
  if (low) await pg.fill('[data-mx="dyn.low"]', low)
  await shot(`${m}-3b`)
  await pg.click('[data-mnext="3"]')
  await pg.waitForSelector('.donebox', { timeout: 20000 })
  await shot(`${m}-4-online`)
  await pg.click('[data-dnext="prices"]')
  await pg.waitForSelector('.pz, .pstill', { timeout: 10000 })
  await shot(`${m}-5-prices`)
  for (let i = 0; i < 3; i++) { await pg.click('.pc .big'); await pg.waitForTimeout(250) }
  await shot(`${m}-6-tapped`)
  const token = new URL(pg.url()).hash.match(/t=([^&]+)/)?.[1]
  const s = await env.DB.prepare('SELECT id, name, status, d FROM site ORDER BY created DESC LIMIT 1').first()
  console.log(m, s.name, s.status, 'seller', (await env.DB.prepare('SELECT seller FROM site WHERE id = ?').bind(s.id).first()).seller, 'token', !!token)
  // a week on: the Monday check, then the page as a buyer sees it
  await env.DB.prepare('UPDATE site SET d = ? WHERE id = ?').bind(JSON.stringify((() => { const d = JSON.parse(s.d); for (const x of [...(d.items || []), ...(d.amulets || [])]) if (x.dyn) x.dyn.since = '2026-10-01'; return d })()), s.id).run()
  console.log('steps', JSON.stringify(await prices.settle(env, s.id, normalize(JSON.parse((await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(s.id).first()).d)), '2026-10-26')))
  await pg.goto(`http://local.test/${s.name}`, { waitUntil: 'networkidle' })
  await shot(`${m}-7-page`)
  await pg.goto(`http://local.test/make#t=${token}&tab=prices`, { waitUntil: 'networkidle' })
  await pg.waitForSelector('.pz', { timeout: 10000 }).catch(() => {})
  await shot(`${m}-8-prices-after`)
  await pg.click('[data-tab="edit"]')
  await pg.waitForSelector('[data-pg="offer"]', { timeout: 10000 })
  await pg.click('[data-pg="offer"]')
  await pg.waitForTimeout(800)
  const dyn = await pg.$('.dyn')
  if (dyn) await dyn.scrollIntoViewIfNeeded()
  await shot(`${m}-9-editor`)
}

await env.DB.prepare("INSERT INTO seller (id, name, status, rate, target, created) VALUES ('nan', 'Nan', 'ok', 20, 30000, '2026-10-01')").run().catch((e) => console.log('seller row', e.message))
await market('warorot', 'shop', 'ผ้าทอป้าศรี', '@pasri', 'ผ้าพันคอทอมือ', '350', '8', '250', photo)
await market('kamthieng', 'amulet', 'พระเครื่องลุงแก้ว', '@lungkaew', 'เหรียญครูบาศรีวิชัย ปี 2482', '3000', '', '', amPhoto)
await Promise.all(waits)
await b.close()
