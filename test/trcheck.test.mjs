// A page check: the link opens a Gold page's words beside the machine's; a save wins over the
// machine, outlives the cron's re-translation, keeps fixes whose words did not change, flags the rest,
// posts to #people-team and marks the gig taken for Paid in Art's ledger.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import * as trcheck from '../src/trcheck.mjs'
import { texts, hashOf, read as trRead, langsOf, merge } from '../src/tr.mjs'
import { normalize } from '../public/s/render.mjs'
import { sha, rand } from '../src/worker.mjs'

function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(new URL('../migrations', import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => ({
    bind: (...a) => st(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } } },
  })
  return { prepare: (sql) => st(sql), batch: async (list) => { for (const s of list) await s.run() } }
}

const ORIGIN = 'https://sites.motdang.net'
const page0 = { name: 'Hongdam', tagline: 'รับทำเว็บไซต์ เชียงราย', about: 'เราออกแบบเว็บสองภาษา\nใช้งานผ่าน LINE', items: [{ n: 'แปลเอกสาร', note: 'ต่อหน้า' }] }

async function setup(ai = { run: async () => ({ response: 'safe' }) }) {
  const posts = []
  const env = { DB: d1(), SESSION_SECRET: 's3cret', AI: ai }
  await env.DB.prepare("INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until) VALUES ('s1', 'hongdam-x', 'x', 'live', 'shop', 'gold', 'th', ?, '2026-10-16', '2026-10-16', 'gold', '2027-11-13')").bind(JSON.stringify(page0)).run()
  const deps = { html: (b, status = 200) => new Response(b, { status, headers: { 'content-type': 'text/html' } }), sha, sameOrigin: () => true, normalize, log: async () => {}, postPeople: async (c) => { posts.push(c); return 'sent' } }
  return { env, posts, deps }
}
async function machine(env, d, strings) {
  const h = await hashOf(texts(normalize(d)))
  await env.DB.prepare('INSERT INTO tr (site_id, lang, src, d, at) VALUES (?,?,?,?,?) ON CONFLICT(site_id, lang) DO UPDATE SET src = excluded.src, d = excluded.d, at = excluded.at').bind('s1', 'my', h, JSON.stringify(strings), 'now').run()
}
const call = (env, deps, link, form) => {
  const req = form ? new Request(link, { method: 'POST', body: new URLSearchParams(form) }) : new Request(link)
  return trcheck.route(req, env, new URL(link).pathname, new URL(link), ORIGIN, deps)
}
const site = { id: 's1', lang: 'th' }

test('the link opens its own gig only', async () => {
  const env = { SESSION_SECRET: 's3cret' }
  const u = await trcheck.link(env, ORIGIN, 'abcdefghij12', sha)
  const p = new URL(u).pathname
  assert.match(p, /^\/x\/abcdefghij12\.[a-z0-9]+\.[a-f0-9]{24}$/)
  assert.deepEqual(await trcheck.read(env, p, sha), { id: 'abcdefghij12' })
  assert.equal(await trcheck.read(env, p.replace('ij12', 'ij13'), sha), null)
  assert.equal(await trcheck.read({ SESSION_SECRET: 'other' }, p, sha), null)
  const old = p.replace(/\.([a-z0-9]+)\./, '.' + Math.floor(Date.now() / 1000 - 10).toString(36) + '.')
  assert.deepEqual(await trcheck.read(env, old, sha), { expired: true })
})

test('merge: a fix first, then a current machine string, else nothing', () => {
  const list = [['a', 'one'], ['b', 'two']]
  assert.deepEqual(merge(list, ['1', '2'], new Map([['two', 'II']])), ['1', 'II'])
  assert.deepEqual(merge(list, null, new Map([['one', 'I'], ['two', 'II']])), ['I', 'II'])
  assert.equal(merge(list, null, new Map([['one', 'I']])), null)
})

test('a translator fixes Burmese; ?hl=my reads the fix, through re-translation and the maker\'s changes', async () => {
  const { env, posts, deps } = await setup()
  await machine(env, page0, ['MT tagline', 'MT about', 'MT item', 'MT note'])
  const g = await trcheck.mint(env, ORIGIN, { name: 'hongdam-x', lang: 'my' }, { sha, rand })
  assert.ok(g.link.startsWith(ORIGIN + '/x/'))
  assert.equal((await trcheck.mint(env, ORIGIN, { name: 'hongdam-x', lang: 'th' }, { sha, rand })).error, 'own-lang')

  // the page: the maker's words on the left, the machine's in a box on the right
  const r0 = await call(env, deps, g.link)
  assert.equal(r0.status, 200)
  const h0 = await r0.text()
  assert.match(h0, /รับทำเว็บไซต์ เชียงราย/)
  assert.match(h0, /<textarea name="v1"[^>]*>MT about<\/textarea>/)
  assert.match(h0, /lang="my"/)

  // no name: nothing saved
  const bad = await call(env, deps, g.link, { s0: page0.tagline, v0: 'X' })
  assert.equal(bad.status, 422)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM tr_fix').first()).n, 0)

  // the save; the form sends line breaks as CRLF
  const r1 = await call(env, deps, g.link, { who: 'Ko Aung', s0: page0.tagline, v0: 'ချင်းရိုင် ဝဘ်ဆိုက်', s1: page0.about.replace('\n', '\r\n'), v1: 'ဝဘ်\r\nLINE', s2: 'แปลเอกสาร', v2: 'MT item', s3: 'ต่อหน้า', v3: 'MT note' })
  assert.equal(r1.status, 303)
  assert.match(r1.headers.get('location'), /\?saved=1$/)
  const gig = await env.DB.prepare('SELECT who, taken, n, changed, posted FROM gig WHERE id = ?').bind(g.id).first()
  assert.equal(gig.who, 'Ko Aung'); assert.ok(gig.taken); assert.equal(gig.n, 4); assert.equal(gig.changed, 2)
  assert.equal(posts.length, 1)
  assert.match(posts[0], /Page check done · မြန်မာ/)
  assert.match(posts[0], /Ko Aung · 4 lines, 2 changed/)
  assert.match(posts[0], /hongdam-x\?hl=my/)

  let d = await trRead(env, site, normalize(page0), 'my')
  assert.equal(d.tagline, 'ချင်းရိုင် ဝဘ်ဆိုက်')
  assert.equal(d.about, 'ဝဘ်\nLINE')

  // the cron writes the language again: the fix still wins
  await machine(env, page0, ['MT2 tagline', 'MT2 about', 'MT2 item', 'MT2 note'])
  d = await trRead(env, site, normalize(page0), 'my')
  assert.equal(d.tagline, 'ချင်းရိုင် ဝဘ်ဆိုက်')

  // the maker changes the tagline: the about's fix holds; the tagline is the machine's, flagged with the old fix
  const page1 = { ...page0, tagline: 'รับทำเว็บไซต์และแอป เชียงราย' }
  await machine(env, page1, ['MT3 tagline', 'MT3 about', 'MT3 item', 'MT3 note'])
  d = await trRead(env, site, normalize(page1), 'my')
  assert.equal(d.tagline, 'MT3 tagline')
  assert.equal(d.about, 'ဝဘ်\nLINE')
  await env.DB.prepare('UPDATE site SET d = ? WHERE id = ?').bind(JSON.stringify(page1), 's1').run()
  const h2 = await (await call(env, deps, g.link)).text()
  assert.match(h2, /1 changed since they were checked/)
  assert.match(h2, /words changed/)
  assert.match(h2, /<s>รับทำเว็บไซต์ เชียงราย<\/s><br>→ ချင်းရိုင် ဝဘ်ဆိုက်/)

  // a form opened before the maker's change: the old tagline is skipped, the rest saves; an empty box goes back to the machine
  const r3 = await call(env, deps, g.link, { who: 'Ko Aung', s0: page0.tagline, v0: 'stale', s1: page0.about, v1: '' })
  assert.equal(r3.status, 303)
  assert.equal(await env.DB.prepare('SELECT 1 FROM tr_fix WHERE src = ?').bind(page0.about).first(), null)
  assert.equal(await env.DB.prepare('SELECT 1 FROM tr_fix WHERE v = ?').bind('stale').first(), null)
  assert.match(posts[1], /saved again/)
  assert.equal((await trRead(env, site, normalize(page1), 'my')).about, 'MT3 about')
})

test('a language fixed in full reads before the cron catches up', async () => {
  const { env, deps } = await setup()
  const g = await trcheck.mint(env, ORIGIN, { name: 'hongdam-x', lang: 'my' }, { sha, rand })
  assert.ok(!(await langsOf(env, site, normalize(page0))).includes('my'))
  const h = await (await call(env, deps, g.link)).text()
  assert.match(h, /no machine version yet/)
  await call(env, deps, g.link, { who: 'Ma Su', s0: page0.tagline, v0: 'a', s1: page0.about, v1: 'b', s2: 'แปลเอกสาร', v2: 'c', s3: 'ต่อหน้า', v3: 'd' })
  assert.ok((await langsOf(env, site, normalize(page0))).includes('my'))
  assert.equal((await trRead(env, site, normalize(page0), 'my')).items[0].note, 'd')
})

test('words the guard refuses are not saved', async () => {
  const { env, deps, posts } = await setup({ run: async () => ({ response: 'unsafe\nS10' }) })
  await machine(env, page0, ['MT tagline', 'MT about', 'MT item', 'MT note'])
  const g = await trcheck.mint(env, ORIGIN, { name: 'hongdam-x', lang: 'my' }, { sha, rand })
  const r = await call(env, deps, g.link, { who: 'X', s0: page0.tagline, v0: 'bad' })
  assert.equal(r.status, 422)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) n FROM tr_fix').first()).n, 0)
  assert.equal((await env.DB.prepare('SELECT taken FROM gig').first()).taken, null)
  assert.equal(posts.length, 0)
})

test('labels a translator can read', () => {
  assert.equal(trcheck.label('about'), 'About')
  assert.equal(trcheck.label('items.2.note'), 'Item 3 · note')
  assert.equal(trcheck.label('hours.note'), 'hours · note')
})
