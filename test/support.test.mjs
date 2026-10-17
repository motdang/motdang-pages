// /support on an in-memory D1 (node:sqlite): the page, a volunteer, an investor's note, a tip QR.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../src/worker.mjs'
import { rowOf, langOf, RUNGS } from '../src/support.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : x))
    return {
      bind: (...b) => st(sql, b),
      first: async (col) => { const r = s.get(...a); return r ? (col ? r[col] : { ...r }) : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql) }
}
const O = 'http://localhost'
const posts = []
const realFetch = globalThis.fetch
globalThis.fetch = async (u, init) => { posts.push({ u: String(u), body: init?.body }); return new Response('{}', { status: 200 }) }
const env = { DB: d1(), SESSION_SECRET: 's', PROMPTPAY: '0812345678', GOLD_THB: '3000', DISCORD_PEOPLE: 'https://discord.test/people', DISCORD_CORE_PLAN: 'https://discord.test/core', RESEND_KEY: 'k' }
const go = (path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const form = (pairs) => { const f = new FormData(); for (const [k, v] of pairs) f.append(k, v); return f }

test('the page: four parts, both languages, live counts, the founders price', async () => {
  const r = await go('/support', { headers: { 'accept-language': 'th-TH,th;q=0.9' } })
  assert.equal(r.status, 200)
  const t = await r.text()
  assert.match(t, /data-l="th"/)
  for (const id of ['use', 'volunteer', 'pay', 'invest']) assert.match(t, new RegExp(`id="${id}"`))
  assert.match(t, /Support motdang/)
  assert.match(t, /฿3,000/) // founding member, this month
  assert.match(t, /฿100,000/)
  assert.match(t, /og:image/)
  assert.equal((await (await go('/support')).text()).includes('data-l="en"'), true)
})

test('a volunteer: a row, a line in #people-team, back to the page with a tick', async () => {
  posts.length = 0
  const r = await go('/support/volunteer', { method: 'POST', body: form([['name', 'Ana'], ['contact', 'ana@example.org'], ['place', 'Lisbon'], ['what', 'translate'], ['what', 'code'], ['what', 'nonsense'], ['langs', 'Portuguese'], ['hours', '2-5'], ['lang', 'en']]) })
  assert.equal(r.status, 303)
  assert.match(r.headers.get('location'), /ok=v#volunteer$/)
  const b = await env.DB.prepare("SELECT * FROM backer WHERE kind = 'volunteer'").first()
  assert.equal(b.what, 'translate,code')
  assert.equal(b.told, 'discord')
  assert.ok(posts.some((p) => p.u.includes('people') && /Ana/.test(p.body) && /Translate, Code/.test(p.body)))
  assert.match(await (await go('/support?ok=v&l=en')).text(), /Your sign-up is with the team/)
})

test('an investor: mail to NaN with the contact, #core-plan without it', async () => {
  posts.length = 0
  const r = await go('/support/invest', { method: 'POST', body: form([['name', 'Kit'], ['contact', 'kit@example.org'], ['amount', '200000'], ['note', 'hello'], ['lang', 'en']]) })
  assert.equal(r.status, 303)
  const mail = posts.find((p) => p.u.includes('resend'))
  assert.ok(mail && /kit@example\.org/.test(mail.body) && /nan@motdang\.net/.test(mail.body))
  const core = posts.find((p) => p.u.includes('core'))
  assert.ok(core && /฿200,000/.test(core.body) && !/kit@example/.test(core.body))
  assert.equal((await env.DB.prepare("SELECT told FROM backer WHERE kind = 'invest'").first()).told, 'mail,discord')
})

test('a form without a name or contact, a bot, another site', async () => {
  assert.equal((await go('/support/volunteer', { method: 'POST', body: form([['name', 'x']]) })).status, 400)
  const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM backer').first()).n
  assert.equal((await go('/support/volunteer', { method: 'POST', body: form([['name', 'b'], ['contact', 'c'], ['website', 'spam']]) })).status, 303)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM backer').first()).n, n)
  assert.equal((await go('/support/invest', { method: 'POST', headers: { origin: 'https://evil.example' }, body: form([['name', 'b'], ['contact', 'c']]) })).status, 403)
})

test('a tip QR for an amount, and for any amount', async () => {
  const a = await (await go('/support/tip?b=500')).text()
  assert.match(a, /<svg/)
  assert.match(a, /฿500/)
  assert.match(await (await go('/support/tip?b=7')).text(), /Any amount/)
})

test('rows and languages', () => {
  const f = form([['name', ' A  B '], ['contact', 'x'], ['amount', '123']])
  assert.equal(rowOf('invest', f, 'en').what, null)
  assert.equal(rowOf('invest', form([['name', 'a'], ['contact', 'x'], ['amount', String(RUNGS[0])]]), 'en').what, '100000')
  assert.equal(rowOf('invest', f, 'en').name, 'A B')
  assert.equal(langOf(new Request(O, { headers: { 'accept-language': 'en-US' } }), new URL(O + '/support?l=th')), 'th')
})

test.after(() => { globalThis.fetch = realFetch })
