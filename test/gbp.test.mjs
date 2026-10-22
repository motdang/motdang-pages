import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as gbp from '../src/gbp.mjs'
import { kitOf, periodsOf, descriptionOf, postOf, hoursRows } from '../public/s/gbp-kit.mjs'
import { gbpBox } from '../public/s/make-gbp.mjs'
import { normalize } from '../public/s/render.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'
import { B } from '../public/s/make-words-gbp.mjs'

const ENV = { GBP_CLIENT_ID: 'cid.apps.googleusercontent.com', GBP_CLIENT_SECRET: 'sec', GBP_KEY: 'k'.repeat(40) }
const local = (days) => new Date(Date.now() + days * 864e5 + 7 * 3600e3).toISOString().slice(0, 16)
const week = (r) => Array.from({ length: 7 }, (_, i) => (i === 6 ? null : r))
const page = (over = {}) => normalize({ name: 'Baan Ton Pho', tagline: 'Coffee and cake', about: 'We roast on the terrace.', contact: { phone: '053 123 456' }, place: { lat: 18.8, lng: 98.9, addr: 'x' },
  hours: { on: true, always: false, tz: 'Asia/Bangkok', week: week([['09:00', '17:00']]) },
  camps: [{ id: 'cmp1', t: 'Rainy day cake', note: 'Half price on cake', code: 'RAIN', start: local(-1), end: local(20) }],
  cover: 'aaaaaaaaaaaaaaaa', photos: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'], ...over })

test('hours as Google asks: a period each range, past midnight ends the next day, 24 hours is 0–24', () => {
  const p = periodsOf(page()).periods
  assert.equal(p.length, 6)
  assert.deepEqual(p[0], { openDay: 'MONDAY', openTime: { hours: 9, minutes: 0 }, closeDay: 'MONDAY', closeTime: { hours: 17, minutes: 0 } })
  const night = periodsOf(page({ hours: { on: true, always: false, tz: 'Asia/Bangkok', week: [[['18:00', '02:00']], null, null, null, null, null, [['10:00', '12:00'], ['13:00', '18:00']]] } })).periods
  assert.deepEqual(night[0], { openDay: 'MONDAY', openTime: { hours: 18, minutes: 0 }, closeDay: 'TUESDAY', closeTime: { hours: 2, minutes: 0 } })
  assert.equal(night.filter((x) => x.openDay === 'SUNDAY').length, 2)
  const all = periodsOf(page({ hours: { on: true, always: true, tz: 'Asia/Bangkok', week: [] } })).periods
  assert.equal(all.length, 7); assert.deepEqual(all[2].closeTime, { hours: 24, minutes: 0 })
  assert.equal(periodsOf(page({ hours: { on: false, week: [] } })), null)
  assert.equal(hoursRows(page({ hours: { on: false, week: [] } })), null)
})

test('a description is cut to Google\'s 750 at a sentence', () => {
  const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
  const d = descriptionOf({ tagline: 'Line', about: long })
  assert.ok(d.length <= 750 && d.endsWith('.') && d.startsWith('Line\n\nSentence'))
  assert.equal(descriptionOf({ tagline: '', about: '' }), '')
})

test('an offer is a Google OFFER post with its dates, code, link and the share card', () => {
  const c = page({ camps: [{ id: 'cmp1', t: 'Rainy day cake', note: 'Half price on cake', code: 'RAIN', start: '2099-06-01T09:00', end: '2099-06-30T18:00' }] }).camps[0]
  const p = postOf(c, { url: 'https://sites.motdang.net/tonpho', card: 'https://sites.motdang.net/card/tonpho.jpg?k=a', lang: 'th' })
  assert.equal(p.topicType, 'OFFER'); assert.equal(p.languageCode, 'th')
  assert.deepEqual(p.event.schedule.startDate, { year: 2099, month: 6, day: 1 })
  assert.deepEqual(p.event.schedule.endTime, { hours: 18, minutes: 0, seconds: 0, nanos: 0 })
  assert.equal(p.offer.couponCode, 'RAIN'); assert.equal(p.offer.redeemOnlineUrl, 'https://sites.motdang.net/tonpho')
  assert.deepEqual(p.media, [{ mediaFormat: 'PHOTO', sourceUrl: 'https://sites.motdang.net/card/tonpho.jpg?k=a' }])
})

test('the kit lists description, phone, link, each day, and the offer fields', () => {
  const k = kitOf(page({ camps: [{ id: 'cmp1', t: 'Rainy day cake', note: 'Half price on cake', code: 'RAIN', start: '2099-06-01T09:00', end: '2099-06-30T18:00' }] }), { url: 'https://sites.motdang.net/tonpho', lang: 'en' })
  assert.equal(k.phone, '053 123 456'); assert.equal(k.web, 'https://sites.motdang.net/tonpho'); assert.equal(k.hours.length, 7)
  assert.equal(k.hours[0].day, 'Monday'); assert.equal(k.hours[0].value, '09:00 – 17:00'); assert.equal(k.hours[6].kind, 'closed')
  assert.equal(k.offers.length, 1); assert.deepEqual([k.offers[0].startDate, k.offers[0].startTime, k.offers[0].endDate, k.offers[0].endTime], ['1 Jun 2099', '09:00', '30 Jun 2099', '18:00'])
  assert.equal(kitOf(page({ camps: [{ id: 'old1', t: 'Old', start: '2020-01-01T09:00', end: '2020-01-02T09:00' }] }), { url: 'u' }).offers.length, 0)
})

test('the card draws the kit with a copy button on each field, in four languages, and the link to Google', () => {
  const S = { d: page(), name: 'tonpho', lang: 'en' }
  const h = { T: (k) => ui(S.lang, k), esc: (x) => String(x), url: 'https://sites.motdang.net/tonpho', imgUrl: (id) => `/img/${id}.webp` }
  const html = gbpBox(S, h)
  assert.match(html, /https:\/\/business\.google\.com\//)
  assert.ok((html.match(/data-gbpcopy=/g) || []).length >= 14)
  assert.match(html, /053 123 456/); assert.match(html, /Rainy day cake/); assert.match(html, /09:00/)
  const noHours = gbpBox({ ...S, d: page({ hours: { on: false, week: [] }, contact: {}, tagline: '', about: '' }) }, h)
  assert.match(noHours, /Hours are off on this page/); assert.match(noHours, /Add a phone number under Contact/)
})

test('every word exists in Thai, English, Burmese and Chinese, and none is on the list', () => {
  const keys = Object.keys(B.en)
  for (const l of Object.keys(UI_LANGS)) {
    for (const k of keys) assert.ok(B[l][k] && B[l][k].length, `${l} ${k}`)
    assert.equal(Object.keys(B[l]).length, keys.length, l)
  }
  const banned = /\b(honest|authentic|real|just|simply|seamless|powerful|robust|comprehensive|ensure|leverage|never|always)\b/i
  for (const k of keys) assert.doesNotMatch(B.en[k], banned, k)
})

test('off until the three secrets exist', () => {
  assert.equal(gbp.on({}), false); assert.equal(gbp.on({ GBP_CLIENT_ID: 'a', GBP_CLIENT_SECRET: 'b' }), false); assert.equal(gbp.on(ENV), true)
})

test('the refresh token is sealed, the state is signed and expires', async () => {
  const blob = await gbp.seal(ENV, '1//refresh-token')
  assert.ok(!blob.includes('refresh')); assert.equal(await gbp.unseal(ENV, blob), '1//refresh-token')
  await assert.rejects(gbp.unseal({ ...ENV, GBP_KEY: 'z'.repeat(40) }, blob))
  const st = await gbp.stateOf(ENV, 'site1', 1000)
  assert.equal(await gbp.readState(ENV, st, 2000), 'site1')
  assert.equal(await gbp.readState(ENV, st, 1000 + 16 * 60e3), null)
  assert.equal(await gbp.readState(ENV, st.slice(0, -2) + 'xx', 2000), null)
  assert.equal(await gbp.readState({ ...ENV, GBP_KEY: 'z'.repeat(40) }, st, 2000), null)
  const u = new URL(gbp.authUrl(ENV, 'https://sites.motdang.net/api/gbp/callback', st))
  assert.equal(u.searchParams.get('scope'), 'https://www.googleapis.com/auth/business.manage')
  assert.equal(u.searchParams.get('access_type'), 'offline'); assert.equal(u.searchParams.get('redirect_uri'), 'https://sites.motdang.net/api/gbp/callback')
})

// a real SQLite with the migration, behind D1's calls
const sqlite = await import('node:sqlite').catch(() => null)
function db() {
  const d = new sqlite.DatabaseSync(':memory:')
  d.exec(fs.readFileSync(new URL('../migrations/0031_gbp.sql', import.meta.url), 'utf8'))
  d.exec('CREATE TABLE site (id TEXT, name TEXT, look TEXT, lang TEXT, tier TEXT, gold_until TEXT, status TEXT, d TEXT, updated TEXT, domain TEXT, domain_state TEXT)')
  return { raw: d, prepare: (q) => { const st = d.prepare(q); let a = []; const o = { bind: (...x) => { a = x; return o }, run: async () => ({ meta: st.run(...a) }), first: async () => st.get(...a) ?? null, all: async () => ({ results: st.all(...a) }) }; return o } }
}
const SITE = (D, over = {}) => { const s = { id: 's1', name: 'tonpho', look: 'poster', lang: 'en', tier: 'gold', gold_until: '2099-01-01', status: 'live', d: JSON.stringify(page()), updated: '2026-10-22T00:00:00Z', domain: null, domain_state: null, ...over }
  D.raw.prepare('INSERT INTO site VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(s.id, s.name, s.look, s.lang, s.tier, s.gold_until, s.status, s.d, s.updated, s.domain, s.domain_state); return s }
const google = (handler) => { const calls = []; const real = globalThis.fetch; globalThis.fetch = async (u, init = {}) => { const c = { url: String(u), method: init.method || 'GET', body: init.body && typeof init.body === 'string' && init.body[0] === '{' ? JSON.parse(init.body) : init.body }; calls.push(c); return handler(c) || new Response('{}') }; return { calls, done: () => { globalThis.fetch = real } } }
const J = (o, status = 200) => new Response(JSON.stringify(o), { status })

test('the sign-in comes back: the token is stored sealed, the owner returns to the Gold tab', { skip: !sqlite }, async () => {
  const D = db(); const s = SITE(D); const env = { ...ENV, DB: D }
  const g = google((c) => (c.url.startsWith('https://oauth2.googleapis.com/token') ? J({ access_token: 'at', refresh_token: 'rt-1' }) : null))
  try {
    const state = await gbp.stateOf(env, s.id)
    const r = await gbp.callback(env, new URL(`https://sites.motdang.net/api/gbp/callback?code=abc&state=${encodeURIComponent(state)}`), 'https://sites.motdang.net')
    assert.equal(r.status, 302); assert.equal(r.headers.get('location'), 'https://sites.motdang.net/make#gbp=tonpho&tab=gold&gbp2=ok')
    assert.match(String(g.calls[0].body), /code=abc/); assert.match(String(g.calls[0].body), /grant_type=authorization_code/)
    const row = D.raw.prepare('SELECT * FROM gbp').get()
    assert.ok(row.enc && !row.enc.includes('rt-1')); assert.equal(await gbp.unseal(env, row.enc), 'rt-1')
    assert.equal((await gbp.callback(env, new URL('https://sites.motdang.net/api/gbp/callback?code=abc&state=bad'), 'https://sites.motdang.net')).status, 400)
    const denied = await gbp.callback(env, new URL(`https://sites.motdang.net/api/gbp/callback?error=access_denied&state=${encodeURIComponent(state)}`), 'https://sites.motdang.net')
    assert.match(denied.headers.get('location'), /gbperr=denied/)
  } finally { g.done() }
})

test('a sync sends what changed once, then nothing; a refused part is named and the rest goes', { skip: !sqlite }, async () => {
  const D = db(); const s = SITE(D); const env = { ...ENV, DB: D }
  D.raw.prepare('INSERT INTO gbp (site_id, enc, account, location, loc_title, connected) VALUES (?,?,?,?,?,?)').run('s1', await gbp.seal(env, 'rt-1'), 'accounts/9', 'locations/7', 'Ton Pho', 'now')
  const patches = []
  const g = google((c) => {
    if (c.url.startsWith('https://oauth2.googleapis.com/token')) return J({ access_token: 'at' })
    if (c.method === 'PATCH') { patches.push(c); return J({}) }
    if (c.url.endsWith('/media')) return c.body.locationAssociation.category === 'ADDITIONAL' && c.body.sourceUrl.includes('bbbbbbbb') ? J({ error: { status: 'INVALID_ARGUMENT', message: 'format' } }, 400) : J({ name: 'media/1' })
    if (c.url.endsWith('/localPosts')) return J({ name: 'accounts/9/locations/7/localPosts/55' })
    return null
  })
  try {
    let row = D.raw.prepare('SELECT * FROM gbp').get()
    const r1 = await gbp.syncOne(env, row, s)
    assert.equal(patches.length, 1)
    assert.equal(patches[0].url, 'https://mybusinessbusinessinformation.googleapis.com/v1/locations/7?updateMask=regularHours%2Cprofile.description%2CphoneNumbers.primaryPhone%2CwebsiteUri')
    assert.equal(patches[0].body.websiteUri, 'https://sites.motdang.net/tonpho'); assert.equal(patches[0].body.phoneNumbers.primaryPhone, '053 123 456'); assert.equal(patches[0].body.regularHours.periods.length, 6)
    const posts = g.calls.filter((c) => c.url.endsWith('/localPosts')); assert.equal(posts.length, 1); assert.equal(posts[0].body.topicType, 'OFFER')
    const media = g.calls.filter((c) => c.url.endsWith('/media')); assert.deepEqual(media.map((c) => c.body.locationAssociation.category), ['COVER', 'ADDITIONAL'])
    assert.equal(r1.ok, false); assert.match(r1.err, /^photo\|/) // the one picture Google refused is named; everything else went
    row = D.raw.prepare('SELECT * FROM gbp').get()
    assert.equal(row.last_ok, null); assert.match(row.err, /^photo\|/)
    // nothing changed: no call to Google, not even for a token
    const before = g.calls.length
    const r2 = await gbp.syncOne(env, row, s)
    assert.equal(g.calls.length, before); assert.equal(r2.idle, true)
    // the phone changes: only it goes
    const s2 = { ...s, d: JSON.stringify(page({ contact: { phone: '053 999 999' } })) }
    await gbp.syncOne(env, D.raw.prepare('SELECT * FROM gbp').get(), s2, 'https://sites.motdang.net', { touch: true })
    assert.equal(patches.length, 2); assert.match(patches[1].url, /updateMask=phoneNumbers\.primaryPhone$/)
    // the offer is removed: its post is deleted
    const s3 = { ...s2, d: JSON.stringify(page({ contact: { phone: '053 999 999' }, camps: [] })) }
    await gbp.syncOne(env, D.raw.prepare('SELECT * FROM gbp').get(), s3)
    assert.ok(g.calls.some((c) => c.method === 'DELETE' && c.url === 'https://mybusiness.googleapis.com/v4/accounts/9/locations/7/localPosts/55'))
  } finally { g.done() }
})

test('Google\'s refusals come back in plain codes', { skip: !sqlite }, async () => {
  const D = db(); const s = SITE(D); const env = { ...ENV, DB: D }
  const mk = async () => { D.raw.exec('DELETE FROM gbp'); D.raw.prepare('INSERT INTO gbp (site_id, enc, account, location, connected) VALUES (?,?,?,?,?)').run('s1', await gbp.seal(env, 'rt'), 'accounts/9', 'locations/7', 'now'); return D.raw.prepare('SELECT * FROM gbp').get() }
  for (const [status, body, code] of [[403, { error: { status: 'PERMISSION_DENIED', message: 'The caller does not have permission' } }, 'access'], [429, { error: { status: 'RESOURCE_EXHAUSTED' } }, 'quota'],
    [403, { error: { message: 'My Business Business Information API has not been used in project 1 before or it is disabled' } }, 'apioff'], [401, { error: { message: 'x' } }, 'closed']]) {
    const g = google((c) => (c.url.startsWith('https://oauth2.googleapis.com/token') ? J({ access_token: 'at' }) : J(body, status)))
    try { const r = await gbp.syncOne(env, await mk(), s); assert.match(r.err, new RegExp('^' + code + '\\|')) } finally { g.done() }
  }
  const g = google((c) => J({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 400))
  try { assert.match((await gbp.syncOne(env, await mk(), s)).err, /^closed\|/) } finally { g.done() }
  assert.match((await gbp.syncOne(env, { ...(await mk()), location: null }, s)).err, /^nolocation\|/)
  assert.match((await gbp.syncOne(env, await mk(), { ...s, status: 'draft' })).err, /^notlive\|/)
})

test('the routes: status always, the rest wait for the secrets and for Gold', { skip: !sqlite }, async () => {
  const D = db(); const s = SITE(D)
  const h = { J: (o, st = 200) => J(o, st), body: async (r) => r.json(), take: async () => true, sender: async () => 'who' }
  const ask = async (env, p, method = 'GET', site = s) => gbp.route(new Request('https://sites.motdang.net/api/' + p, { method }), env, { waitUntil() {} }, p, 'https://sites.motdang.net', site, h)
  let r = await ask({ DB: D }, 'gbp'); assert.deepEqual(await r.json(), { on: false, gold: true, connected: false, location: null, last_ok: '', last_try: '', err: null })
  assert.equal((await ask({ DB: D }, 'gbp/connect', 'POST')).status, 503)
  assert.equal((await ask({ ...ENV, DB: D }, 'gbp/connect', 'POST', { ...s, tier: 'free' })).status, 402)
  const url = (await (await ask({ ...ENV, DB: D }, 'gbp/connect', 'POST')).json()).url
  assert.match(url, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/)
  assert.equal((await ask({ ...ENV, DB: D }, 'gbp/sync', 'POST')).status, 409)
})

test('the daily check takes the pages not sent for 20 hours or changed since, not those Google closed', { skip: !sqlite }, async () => {
  const D = db(); const env = { ...ENV, DB: D }
  const now = Date.now(), ago = (h) => new Date(now - h * 3600e3).toISOString()
  const row = (id, last_ok, last_try, err, updated = ago(500)) => { SITE(D, { id, name: id, updated }); D.raw.prepare('INSERT INTO gbp (site_id, enc, account, location, connected, last_ok, last_try, err) VALUES (?,?,?,?,?,?,?,?)').run(id, 'x', 'accounts/1', 'locations/1', 'n', last_ok, last_try, err) }
  row('fresh', ago(2), ago(2), null)
  row('stale', ago(30), ago(30), null)
  row('changed', ago(2), ago(2), null, ago(1))
  row('closed', ago(60), ago(60), 'closed|x')
  row('retrying', ago(30), ago(1), 'access|x')
  row('failed-long-ago', ago(30), ago(4), 'access|x')
  assert.equal(await gbp.due(env, 'https://sites.motdang.net', 5, now), 3)
  const tried = D.raw.prepare('SELECT site_id FROM gbp WHERE last_try > ?').all(ago(0.5)).map((r) => r.site_id).sort()
  assert.deepEqual(tried, ['changed', 'failed-long-ago', 'stale'])
})
