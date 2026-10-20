// og-cards.mjs — draws the share card of every live page and item page (/name/a/<id>, /w/<id>, /l/<id>)
// that has none yet, with the drawCard the builder uses, and keeps it through /admin/og (src/ogcard.mjs).
// Until it runs, /card/… serves the item's own photo fitted to 1200×630.
//
//   node tools/og-cards.mjs [--dry] [--origin https://sites.motdang.net]
//
// The admin password is read from ~/.tokens/MOTDANG_PAGES_ADMIN. launchd runs it every 30 minutes
// (com.nanobotco.og-cards). playwright-core comes from the anidoodle-motdang checkout, as in avatarlab.mjs.

import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'

const require = createRequire(homedir() + '/Developer/claude code projects/anidoodle-motdang/package.json')
const { chromium } = require('playwright-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const oi = args.indexOf('--origin')
const ORIGIN = oi >= 0 ? args[oi + 1] : 'https://sites.motdang.net'
const KEY = readFileSync(homedir() + '/.tokens/MOTDANG_PAGES_ADMIN', 'utf8').trim()
const AUTH = 'Basic ' + Buffer.from('admin:' + KEY).toString('base64')

const r = await fetch(ORIGIN + '/admin/og', { headers: { authorization: AUTH } })
if (!r.ok) { console.error(`og-cards: /admin/og answered ${r.status}`); process.exit(1) }
const todo = await r.json()
if (!todo.length) process.exit(0)
console.log(`og-cards: ${todo.length} to draw`)
if (dry) { for (const o of todo) console.log(o.path, o.key); process.exit(0) }

const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined, headless: true })
const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1200, height: 800 } })
const page = await ctx.newPage()
let bad = 0
const byPage = Map.groupBy(todo, (o) => o.name)
for (const [name, list] of byPage) {
  // the page itself first, so its look's typefaces are declared
  await page.goto(`${ORIGIN}/${name}`, { waitUntil: 'networkidle' })
  for (const o of list) {
    const st = await page.evaluate(async ({ o, auth }) => {
      const { drawCard } = await import('/s/card.mjs')
      const { loadFaces } = await import('/s/mark.mjs')
      const { DINGBATS } = await import('/s/db/names.mjs')
      await loadFaces()
      const display = getComputedStyle(document.documentElement).getPropertyValue('--display')
      if (display) await document.fonts.load(`800 100px ${display}`, o.title).catch(() => null)
      const img = (id) => new Promise((ok) => { if (!id) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = `/img/${id}.webp` })
      const [cover, avatar] = await Promise.all([img(o.photo), img(o.avatar)])
      if (!cover && o.dings.length) {
        const add = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s) })
        if (!window.Dingbats) await add('/s/db/core.js')
        for (const f of new Set(o.dings.map((n) => DINGBATS[n]).filter(Boolean))) await add(`/s/db/${f}.js`)
      }
      const c = document.createElement('canvas')
      c.width = 1200; c.height = 630
      drawCard(c.getContext('2d'), { look: o.look, accent: o.accent, name: o.title, tagline: o.tagline, url: `${location.host}/${o.path.replace(/\.jpg$/, '')}`, gold: o.gold,
        cover, drawing: null, avatar, round: o.round, dings: o.dings, D: window.Dingbats || null })
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88))
      const put = await fetch('/admin/og/' + o.base, { method: 'PUT', headers: { authorization: auth, 'content-type': 'image/jpeg' }, body: blob })
      return put.ok ? (await put.json()).ok : put.status
    }, { o, auth: AUTH })
    if (st !== true) bad++
    console.log(`${st === true ? '✓' : '✗ ' + st} ${o.path}`)
  }
}
await browser.close()
process.exit(bad ? 1 : 0)
