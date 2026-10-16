// shoot.mjs <outdir> <looks,comma|all> <kinds,comma|all> [full] — the lab pages at 390 px, one Chrome, many tabs.
// Chrome is the installed one; playwright-core comes from the anidoodle-motdang checkout.
import { createRequire } from 'node:module'
const require = createRequire('/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json')
const { chromium } = require('playwright-core')
import { mkdirSync } from 'node:fs'
const [out, L, K, full] = process.argv.slice(2)
const { LOOK_IDS } = await import(new URL('../../public/s/render.mjs', import.meta.url))
const LOOKS = L === 'all' ? LOOK_IDS : L.split(',')
const KINDS = K === 'all' ? ['shop', 'food', 'service', 'work', 'stay', 'homes', 'me', 'event', 'group'] : K.split(',')
mkdirSync(out, { recursive: true })
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
const jobs = LOOKS.flatMap((l) => KINDS.map((k) => [l, k]))
let i = 0
async function worker() {
  while (i < jobs.length) {
    const [l, k] = jobs[i++]
    const p = await ctx.newPage()
    p.on('pageerror', (e) => console.log('ERR', l, k, e.message))
    try {
      await p.goto(`${process.env.LAB_ORIGIN || 'http://127.0.0.1:8790'}/s/lab/${l}-${k}.html`, { waitUntil: 'load', timeout: 20000 }).catch(() => {})
      if (full) await p.addStyleTag({ content: '.rise{opacity:1!important;transform:none!important}' })
      await p.waitForTimeout(full ? 1500 : 2200)
      await p.screenshot({ path: `${out}/${l}-${k}.png`, fullPage: !!full, timeout: 15000 })
    } catch (e) { console.log('FAIL', l, k, e.message.split('\n')[0]) }
    await p.close()
  }
}
await Promise.all(Array.from({ length: 6 }, worker))
await b.close()
console.log('shot', jobs.length)
