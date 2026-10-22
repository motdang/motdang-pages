// Edit by LINE (src/lineedit.mjs, Nan 2026-10-22): linking a LINE account to a Gold page, a photo to the page's photos,
// a text to News. On an in-memory D1 (node:sqlite) built from the real migrations, an R2 in a Map and stubbed models.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker, { sha, rand } from '../src/worker.mjs'
import * as line from '../src/lineedit.mjs'
import { N } from '../public/s/make-words-line.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'
import { word, PAGE_LANGS } from '../public/s/words.mjs'
import { render, normalize, MAX_PHOTOS } from '../public/s/render.mjs'

const setT = globalThis.setTimeout
globalThis.setTimeout = (...a) => { const t = setT(...a); t?.unref?.(); return t }

const MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).sort()
function d1() {
  const db = new DatabaseSync(':memory:')
  for (const f of MIGRATIONS) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'))
  const st = (sql, args = []) => {
    const s = db.prepare(sql), a = args.map((x) => (x === undefined ? null : x))
    return {
      bind: (...b) => st(sql, b),
      first: async () => { const r = s.get(...a); return r ? { ...r } : null },
      all: async () => ({ results: s.all(...a).map((r) => ({ ...r })) }),
      run: async () => ({ meta: { changes: Number(s.run(...a).changes) } }),
    }
  }
  return { prepare: (sql) => st(sql), batch: async (xs) => Promise.all(xs.map((x) => x.run())), raw: db }
}
const media = () => { const m = new Map(); return { m, put: async (k, v, o) => { m.set(k, { body: v, ...o }) }, get: async (k) => (m.has(k) ? { body: m.get(k).body, httpMetadata: m.get(k).httpMetadata || {}, customMetadata: m.get(k).customMetadata } : null), delete: async (k) => { for (const x of [].concat(k)) m.delete(x) } } }

const O = 'http://localhost'
const DAY = 864e5
const day = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10)
// a JPEG the photo check accepts: SOI, a JFIF header, a scan, EOI
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9])
const WEBP = (n) => { const b = new Uint8Array(20 + n); b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, n & 255, 0, 0, 0]); return b }

function make(extra = {}) {
  const env = {
    DB: d1(), MEDIA: media(), SESSION_SECRET: 's', LINE_EDIT: 'on', _vision: { nudity: false, sexual: false, gore: false, what: 'a shop' }, _guard: 'safe', ...extra,
    AI: { run: async (model) => (model.includes('llama-guard') ? { response: env._guard } : { response: JSON.stringify(env._vision) }) },
  }
  return env
}
let n = 0
async function site(env, o = {}) {
  n++
  const id = 's' + n + 'x'.repeat(6), token = 'tok' + String(n).padStart(2, '0') + 'x'.repeat(30), uid = 'U' + String(n).padStart(32, '0')
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO site (id, name, edit_hash, status, kind, look, lang, d, created, updated, tier, gold_until, trial, plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, 'shop-' + n, await sha(token), o.status ?? 'live', o.kind ?? 'shop', 'poster', 'th', JSON.stringify(o.d ?? { name: 'Shop ' + n }), now, now, o.tier ?? 'gold', o.gold === undefined ? day(200) : o.gold, 0, 'gold').run()
  return { id, name: 'shop-' + n, token, uid }
}
const go = (env, path, init = {}) => worker.fetch(new Request(O + path, { redirect: 'manual', ...init }), env, { waitUntil() {} })
const api = async (env, s, path, init = {}) => { const r = await go(env, '/api/' + path, { ...init, headers: { 'x-edit': s.token, origin: O, 'content-type': 'application/json', ...(init.headers || {}) } }); return Object.assign(await r.json(), { _status: r.status }) }
const D = { rand, sha }
async function linked(env, s, name = 'Somchai') {
  const m = await api(env, s, 'line/code', { method: 'POST' })
  const c = await line.confirm(env, s.uid, m.code, name, D)
  assert.ok(c.ok, JSON.stringify(c))
  return c
}
const siteRow = (env, id) => env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(id).first()

// ---- linking -------------------------------------------------------------------------------------------------------

test('a Gold page mints a code; the LINE link carries the code to @964yxgnk', async () => {
  const env = make(), s = await site(env)
  const r = await api(env, s, 'line/code', { method: 'POST' })
  assert.equal(r._status, 200)
  assert.match(r.code, /^PAGE-[A-HJ-NP-TV-Z2-9]{6}$/)
  assert.ok(r.exp - Date.now() > 29 * 60e3 && r.exp - Date.now() <= 30 * 60e3)
  assert.equal(r.text, `เว็บ · page ${r.code}`)
  assert.equal(r.href, `https://line.me/R/oaMessage/%40964yxgnk/?${encodeURIComponent(r.text)}`)
  const row = await env.DB.prepare('SELECT * FROM line_code').first()
  assert.ok(!JSON.stringify(row).includes(r.code), 'only a hash is kept')
  // a second code replaces the first
  const r2 = await api(env, s, 'line/code', { method: 'POST' })
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM line_code').first()).n, 1)
  assert.equal((await line.confirm(env, s.uid, r.code, 'A', D)).error, 'code')
  assert.ok((await line.confirm(env, s.uid, r2.code, 'A', D)).ok)
})

test('no code for a Free page, or while the feature is off', async () => {
  const env = make(), free = await site(env, { tier: 'free', gold: null })
  assert.equal((await api(env, free, 'line/code', { method: 'POST' }))._status, 402)
  const off = make({ LINE_EDIT: 'off' }), g = await site(off)
  assert.equal((await api(off, g, 'line/code', { method: 'POST' }))._status, 503)
  assert.equal((await line.confirm(off, g.uid, 'PAGE-AAAAAA', 'x', D)).error, 'off')
  assert.equal((await line.addNote(off, g.uid, 'hello', 'm1', D)).error, 'off')
  assert.equal((await api(off, g, 'site')).line.on, false)
  assert.equal((await api(env, free, 'site')).line.on, true)
})

test('a code is typed several ways, works once, and ends after 30 minutes', async () => {
  const env = make(), s = await site(env)
  const { code } = await api(env, s, 'line/code', { method: 'POST' })
  assert.equal(line.codeOf(code.toLowerCase().replace('-', ' ')), code)
  assert.equal(line.codeOf('เว็บ · page ' + code), code)
  assert.equal(line.codeOf(code.slice(5)), code)
  assert.equal(line.codeOf('PAGE-00OIL1'), '')
  const bad = await line.confirm(env, s.uid, 'PAGE-ZZZZZZ', 'x', D)
  assert.equal(bad.error, 'code')
  const ok = await line.confirm(env, s.uid, 'page ' + code.slice(5).toLowerCase(), 'Somchai', D)
  assert.ok(ok.ok); assert.equal(ok.page, s.name); assert.equal(ok.url, `https://sites.motdang.net/${s.name}`)
  assert.equal((await line.confirm(env, 'Uother' + '0'.repeat(26), code, 'x', D)).error, 'code', 'used once')
  // an old code
  const m2 = await api(env, s, 'line/code', { method: 'POST' })
  await env.DB.prepare('UPDATE line_code SET exp = ?').bind(Date.now() - 1).run()
  assert.equal((await line.confirm(env, 'Uother' + '0'.repeat(26), m2.code, 'x', D)).error, 'code')
})

test('guessing is limited, one LINE account holds one page, a new account replaces the old one', async () => {
  const env = make(), a = await site(env), b = await site(env)
  const uid = 'Uguess' + '0'.repeat(26)
  for (let i = 0; i < 10; i++) assert.equal((await line.confirm(env, uid, 'PAGE-ZZZZZ' + 'ABCDEFGHJK'[i], 'x', D)).error, 'code')
  assert.equal((await line.confirm(env, uid, 'PAGE-ZZZZZZ', 'x', D)).error, 'tries')
  await linked(env, a)
  // a's LINE account tries to take b as well
  const mb = await api(env, b, 'line/code', { method: 'POST' })
  const taken = await line.confirm(env, a.uid, mb.code, 'x', D)
  assert.equal(taken.error, 'taken'); assert.equal(taken.page, a.name)
  assert.equal((await line.unlink(env, a.uid)).ok, true)
  assert.equal((await line.status(env, a.uid)).linked, false)
  assert.ok((await line.confirm(env, a.uid, mb.code, 'x', D)).ok, 'the same code works after "page off"')
  // another LINE account for the same page replaces it
  const mb2 = await api(env, b, 'line/code', { method: 'POST' })
  assert.ok((await line.confirm(env, 'Unew' + '0'.repeat(28), mb2.code, 'New phone', D)).ok)
  assert.equal((await line.status(env, a.uid)).linked, false)
  assert.equal((await line.status(env, 'Unew' + '0'.repeat(28))).page, b.name)
  assert.equal((await api(env, b, 'line')).name, 'New phone')
})

test('a Free page cannot link; the link waits while Gold has ended and works again with Gold', async () => {
  const env = make(), s = await site(env)
  const { code } = await api(env, s, 'line/code', { method: 'POST' })
  await env.DB.prepare("UPDATE site SET tier = 'free', gold_until = NULL WHERE id = ?").bind(s.id).run()
  assert.equal((await line.confirm(env, s.uid, code, 'x', D)).error, 'gold')
  await env.DB.prepare("UPDATE site SET tier = 'gold', gold_until = ? WHERE id = ?").bind(day(30), s.id).run()
  await linked(env, s)
  await env.DB.prepare('UPDATE site SET gold_until = ? WHERE id = ?').bind(day(-1), s.id).run()
  assert.equal((await line.addNote(env, s.uid, 'hello', 'm1', D)).error, 'gold')
  assert.equal((await line.addPhoto(env, s.uid, JPEG, 'm2', D)).error, 'gold')
  assert.equal((await line.status(env, s.uid)).gold, false)
  await env.DB.prepare('UPDATE site SET gold_until = ? WHERE id = ?').bind(day(5), s.id).run()
  assert.ok((await line.addNote(env, s.uid, 'hello', 'm3', D)).ok)
})

test('the editor unlinks, and a deleted page takes the link and its notes with it', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  assert.equal((await api(env, s, 'line')).linked, true)
  await api(env, s, 'line', { method: 'DELETE' })
  assert.equal((await line.addNote(env, s.uid, 'hi', 'm1', D)).error, 'not-linked')
  await linked(env, s)
  await line.addNote(env, s.uid, 'a note', 'm2', D)
  await api(env, s, 'site', { method: 'DELETE' })
  for (const t of ['line_link', 'note', 'line_code']) assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n, 0, t)
})

// ---- notes ---------------------------------------------------------------------------------------------------------

test('a text becomes a dated note; the page shows the newest first and a few older ones; the owner deletes', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  for (let i = 1; i <= 7; i++) {
    const r = await line.addNote(env, s.uid, `Note number ${i}\nsecond line`, 'm' + i, D)
    assert.ok(r.ok && !r.held)
    await env.DB.prepare('UPDATE note SET at = ? WHERE msg = ?').bind(new Date(Date.now() - (8 - i) * 3600e3).toISOString(), 'm' + i).run()
  }
  const html = await (await go(env, '/' + s.name)).text()
  const at = (t) => html.indexOf(t)
  assert.ok(html.includes('id="news"') && html.includes('>ข่าว<'), 'the News card, in Thai')
  assert.ok(at('Note number 7') > 0 && at('Note number 7') < at('Note number 6') && at('Note number 6') < at('Note number 3'))
  assert.ok(!html.includes('Note number 2'), 'five at most')
  assert.ok(at('id="news"') < at('id="menu"') || !html.includes('id="menu"'))
  assert.match(html, /<time datetime="[^"]+">/)
  // the owner's list and a delete
  const list = await api(env, s, 'notes')
  assert.equal(list.notes.length, 7); assert.equal(list.notes[0].body.startsWith('Note number 7'), true)
  await api(env, s, 'notes', { method: 'DELETE', body: JSON.stringify({ id: list.notes[0].id }) })
  assert.equal((await api(env, s, 'notes')).notes.length, 6)
  assert.ok(!(await (await go(env, '/' + s.name)).text()).includes('Note number 7'))
  // someone else's edit link cannot delete it
  const other = await site(env)
  await api(env, other, 'notes', { method: 'DELETE', body: JSON.stringify({ id: list.notes[1].id }) })
  assert.equal((await api(env, s, 'notes')).notes.length, 6)
  // Free: not shown, still listed for the owner
  await env.DB.prepare("UPDATE site SET tier = 'free', gold_until = NULL WHERE id = ?").bind(s.id).run()
  assert.ok(!(await (await go(env, '/' + s.name)).text()).includes('Note number 6'))
  assert.equal((await api(env, s, 'notes')).notes.length, 6)
})

test('the text check: a held note is kept, not shown, and says so to its owner; a message delivered twice is one note', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  const bad = await line.addNote(env, s.uid, 'เว็บพนัน บาคาร่า ทางเข้า', 'mx', D)
  assert.ok(bad.ok && bad.held)
  assert.ok((await line.addNote(env, s.uid, 'Open late tonight', 'my', D)).ok)
  assert.deepEqual((await line.addNote(env, s.uid, 'Open late tonight', 'my', D)).dup, true)
  const list = (await api(env, s, 'notes')).notes
  assert.equal(list.length, 2)
  assert.equal(list.find((x) => x.body.startsWith('เว็บ')).status, 'held')
  assert.ok(!(await (await go(env, '/' + s.name)).text()).includes('บาคาร่า'))
  // the model flags one
  env._guard = 'unsafe\nS1'
  const g = await line.addNote(env, s.uid, 'Something odd', 'mz', D)
  assert.ok(g.held)
  // a model that does not answer holds, and the cron's retry releases
  env.AI.run = async () => { throw new Error('down') }
  assert.ok((await line.addNote(env, s.uid, 'Closed on Monday', 'mw', D)).held)
  env.AI.run = async (model) => ({ response: model.includes('llama-guard') ? 'safe' : '{}' })
  assert.equal(await line.tidyLine(env), 1)
  assert.equal((await api(env, s, 'notes')).notes.find((x) => x.body === 'Closed on Monday').status, 'shown')
})

test('notes: empty, long, 20 a day, 100 kept', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  assert.equal((await line.addNote(env, s.uid, '  \n ', 'e1', D)).error, 'empty')
  const long = await line.addNote(env, s.uid, 'x'.repeat(501), 'e2', D)
  assert.equal(long.error, 'long'); assert.equal(long.max, 500)
  assert.ok((await line.addNote(env, s.uid, 'x'.repeat(500), 'e3', D)).ok)
  for (let i = 0; i < 19; i++) assert.ok((await line.addNote(env, s.uid, 'n' + i, 'q' + i, D)).ok)
  assert.equal((await line.addNote(env, s.uid, 'one more', 'q99', D)).error, 'quota')
  // the oldest go past 100
  for (let i = 0; i < 90; i++) await env.DB.prepare("INSERT INTO note (id, site_id, at, body, status, via) VALUES (?,?,?,?,'shown','line')").bind('o' + i, s.id, new Date(Date.now() - (i + 5) * 6e4).toISOString(), 'old' + i).run()
  await env.DB.prepare('DELETE FROM quota').run()
  await line.addNote(env, s.uid, 'newest', 'last', D)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM note').first()).n, 100)
})

// ---- photos --------------------------------------------------------------------------------------------------------

test('a photo goes the maker\'s way: checked, stored in two sizes, on the page\'s photos', async () => {
  const env = make(), s = await site(env, { d: { name: 'Shop', photos: [] } })
  await linked(env, s)
  const r = await line.addPhoto(env, s.uid, JPEG.buffer.slice(0), 'p1', D)
  assert.ok(r.ok && !r.held, JSON.stringify(r))
  const row = await env.DB.prepare('SELECT * FROM photo').first()
  assert.equal(row.via, 'line'); assert.equal(row.verdict, 'ok'); assert.equal(row.site_id, s.id)
  assert.equal(JSON.parse((await siteRow(env, s.id)).d).photos.at(-1), row.id)
  const big = env.MEDIA.m.get('p/' + row.id)
  assert.ok(big && big.customMetadata.v === 'ok' && big.httpMetadata.contentType === 'image/jpeg')
  // the same message again is not a second photo
  assert.ok((await line.addPhoto(env, s.uid, JPEG, 'p1', D)).dup)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM photo').first()).n, 1)
  // it is served by /img like any other
  const img = await go(env, `/img/${row.id}.webp`)
  assert.equal(img.status, 200)
})

test('with the Images binding: a big and a small WebP, the original read for its orientation', async () => {
  const seen = []
  const env = make({ IMAGES: { input: () => ({ transform: (t) => { seen.push(t); return { output: async () => ({ response: () => new Response(WEBP(t.width === 1600 ? 90 : 40)) }) } } }) } })
  const s = await site(env)
  await linked(env, s)
  const r = await line.addPhoto(env, s.uid, JPEG, 'p1', D)
  assert.ok(r.ok, JSON.stringify(r))
  assert.deepEqual(seen.map((t) => [t.width, t.height, t.fit]), [[1600, 1600, 'scale-down'], [480, 480, 'scale-down']])
  const id = (await env.DB.prepare('SELECT id FROM photo').first()).id
  assert.equal(env.MEDIA.m.get('p/' + id).httpMetadata.contentType, 'image/webp')
  assert.ok(env.MEDIA.m.get(`p/${id}-s`).body.length < env.MEDIA.m.get('p/' + id).body.length)
})

test('photo: not an image, too big for the maker, refused by the look, held when the model is down', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  assert.equal((await line.addPhoto(env, s.uid, new TextEncoder().encode('not a picture at all'), 'a1', D)).error, 'photo-format')
  const big = new Uint8Array(1_700_000); big.set(JPEG); big.fill(0, JPEG.length - 2)
  big.set([0xff, 0xd9], big.length - 2)
  assert.equal((await line.addPhoto(env, s.uid, big, 'a2', D)).error, 'photo-size', 'no Images binding and bigger than the maker\'s biggest')
  env._vision = { nudity: true, sexual: false, gore: false, what: 'x' }
  const no = await line.addPhoto(env, s.uid, JPEG, 'a3', D)
  assert.equal(no.error, 'refused')
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM photo').first()).n, 0)
  assert.equal(env.MEDIA.m.size, 0, 'a refused photo is not kept')
  // a person in the photo is fine on a page (the maker's check has no such rule)
  env._vision = { nudity: false, sexual: false, gore: false, what: 'two cooks' }
  assert.ok((await line.addPhoto(env, s.uid, JPEG, 'a4', D)).ok)
  env.AI.run = async () => { throw new Error('down') }
  const held = await line.addPhoto(env, s.uid, JPEG, 'a5', D)
  assert.ok(held.ok && held.held)
  const h = await env.DB.prepare("SELECT id FROM photo WHERE verdict = 'hold'").first()
  assert.equal(env.MEDIA.m.get('p/' + h.id).customMetadata.v, 'hold')
})

test('photo: 30 a day, and a full page', async () => {
  const env = make(), s = await site(env)
  await linked(env, s)
  for (let i = 0; i < 30; i++) assert.ok((await line.addPhoto(env, s.uid, JPEG, 'b' + i, D)).ok)
  assert.equal((await line.addPhoto(env, s.uid, JPEG, 'b99', D)).error, 'quota')
  const full = await site(env, { d: { name: 'Full', photos: Array.from({ length: MAX_PHOTOS.gold }, (_, i) => 'photo' + String(i).padStart(10, '0') + 'ab') } })
  await linked(env, full)
  const r = await line.addPhoto(env, full.uid, JPEG, 'c1', D)
  assert.equal(r.error, 'full'); assert.equal(r.max, MAX_PHOTOS.gold)
})

test('an editor open before a LINE photo arrived keeps it when it saves', async () => {
  const env = make(), s = await site(env, { d: { name: 'Shop', photos: [] } })
  await linked(env, s)
  const first = await api(env, s, 'site')
  assert.ok(first.loaded)
  assert.equal(first.line.linked, true)
  await new Promise((r) => setTimeout(r, 5))
  await line.addPhoto(env, s.uid, JPEG, 'p1', D)
  const id = (await env.DB.prepare('SELECT id FROM photo').first()).id
  // the stale copy saves with no photos
  const put1 = await api(env, s, 'site', { method: 'PUT', body: JSON.stringify({ d: { name: 'Shop renamed', photos: [] }, loaded: first.loaded }) })
  assert.deepEqual(put1.added, [id]); assert.deepEqual(put1.d.photos, [id])
  // it takes the photo, then saves again: no second copy
  const put2 = await api(env, s, 'site', { method: 'PUT', body: JSON.stringify({ d: { name: 'Shop renamed', photos: [id] }, loaded: put1.loaded }) })
  assert.deepEqual(put2.d.photos, [id]); assert.deepEqual(put2.added, [])
  // the owner removes it and saves: it stays removed
  const put3 = await api(env, s, 'site', { method: 'PUT', body: JSON.stringify({ d: { name: 'Shop renamed', photos: [] }, loaded: put2.loaded }) })
  assert.deepEqual(put3.d.photos, [])
  // a save with no stamp changes nothing about photos
  const put4 = await api(env, s, 'site', { method: 'PUT', body: JSON.stringify({ d: { name: 'Shop renamed', photos: [] } }) })
  assert.deepEqual(put4.d.photos, [])
})

// ---- words, page, files ----------------------------------------------------------------------------------------------

test('the LINE tab\'s words are in all four languages, Thai first, and the page word is in all twelve', () => {
  assert.deepEqual(Object.keys(UI_LANGS), ['th', 'en', 'my', 'zh'])
  const en = Object.keys(N.en).sort()
  for (const l of ['th', 'my', 'zh']) assert.deepEqual(Object.keys(N[l]).sort(), en, l)
  for (const l of Object.keys(UI_LANGS)) for (const k of en) { assert.ok(ui(l, k) !== k && ui(l, k).trim(), `${l}.${k}`) }
  for (const l of Object.keys(PAGE_LANGS)) assert.ok(word(l, 'news') && word(l, 'news') !== 'news', l)
  const banned = /\b(honest|authentic|real|just|simply|seamless|powerful|robust|comprehensive|ensure|leverage)\b/i // stylecheck: allow — the words the copy is checked against
  for (const l of Object.keys(N)) for (const [k, v] of Object.entries(N[l])) assert.ok(!banned.test(v), `${l}.${k}`)
})

test('News stays out of a Free page and out of the builder when there are no notes', () => {
  const site = { name: 'x', look: 'poster', lang: 'en', kind: 'shop', d: normalize({ name: 'X' }), status: 'live', tier: 'gold' }
  const news = [{ id: 'a', at: '2026-10-22T05:00:00.000Z', body: 'Closed Monday <b>x</b>' }]
  const gold = render(site, { gold: true, news })
  assert.match(gold, /id="news"/); assert.match(gold, /Closed Monday &lt;b&gt;x&lt;\/b&gt;/)
  assert.ok(!render({ ...site, tier: 'free' }, { news }).includes('id="news"'))
  assert.ok(!render(site, { gold: true, news: [] }).includes('id="news"'))
  assert.ok(!render(site, { gold: true }).includes('id="news"'))
})
