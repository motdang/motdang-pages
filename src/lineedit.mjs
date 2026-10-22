// lineedit.mjs — Edit by LINE (Gold, Nan 2026-10-22). An owner links a LINE account to a page once. After that a
// photo sent to the Mot Dang LINE account (@964yxgnk) joins the page's photos, and a text becomes a dated note
// under News. The LINE Worker (motdang-line) calls the methods below through a service binding to the LineEdit
// entrypoint (entry.mjs); nothing here has a public address.
//
// Linking. The editor's LINE tab mints a code, PAGE-XXXXXX, good for 30 minutes and for one use; only its hash is
// kept. The owner sends it to the account (the tab opens LINE with the words typed in). The account hands the code
// and the sender's LINE user id to confirm(), which stores uid → page. The code proves the sender holds the edit
// link; the editor shows who is linked (the LINE display name) and has a button to unlink.
//
// One LINE account links to one page and one page to one LINE account: the tables say so (line_link). A page whose
// Gold has ended keeps the link and refuses edits ('gold') until it is Gold again.
//
// Photos take the maker's own path (src/worker.mjs POST /api/photo): sniffed, metadata stripped, a big and a small
// copy, the vision look, R2 MEDIA p/<id> and p/<id>-s, a photo row, the id on the page's photos up to photoMax.
// The maker's browser shrinks on a canvas; here the Images binding does it. Notes go through the maker's text check
// (screen.mjs). A page asks for 30 photos and 20 notes a day.

import { clean, look, typeOf, MAX_BIG } from './photo.mjs'
import { screen } from './screen.mjs'
import { isGold } from './gold.mjs'
import { photoMax, HOME } from '../public/s/render.mjs'

export const LIMITS = { photos: 30, notes: 20, noteChars: 500, keepNotes: 100, tries: 10, codeMin: 30, raw: 12_000_000, side: 1600, small: 480 }
export const OA = '@964yxgnk'

/** The feature is on when LINE_EDIT is "on". */
export const on = (env) => String(env.LINE_EDIT ?? '').toLowerCase() === 'on'

const ALPHA = 'ABCDEFGHJKMNPQRSTVWXYZ23456789' // no I, L, O, U, 0, 1
const goodUid = (u) => typeof u === 'string' && /^U[\w-]{3,64}$/.test(u)
const cleanText = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

/** The LINE link with the words typed in: the code to the Official Account. */
export function oaHref(env, text) {
  return `https://line.me/R/oaMessage/${encodeURIComponent(env.LINE_OA || OA)}/?${encodeURIComponent(text)}`
}

/** 'PAGE-K7M2QX' from what a person typed ('page k7m2qx', 'K7M2QX', 'เว็บ · page PAGE-K7M-2QX'), else ''. */
export function codeOf(raw) {
  const ok = (x) => /^[A-Z0-9]{6}$/.test(x) && [...x].every((c) => ALPHA.includes(c))
  let t = String(raw ?? '').toUpperCase().replace(/[\s·:-]+/g, '')
  for (;;) {
    if (ok(t)) return 'PAGE-' + t
    const m = /^(เว็บ|PAGE)/.exec(t)
    if (!m) return ''
    t = t.slice(m[0].length)
  }
}

async function evt(env, siteId, what, note) {
  await env.DB.prepare('INSERT INTO event (at, site_id, what, note) VALUES (?,?,?,?)').bind(new Date().toISOString(), siteId, what, String(note || '').slice(0, 300)).run()
}

/** One more try of `what` for `key` today; false once `max` is passed. Same table as the page's other daily counts. */
async function take(env, key, what, max) {
  const day = new Date().toISOString().slice(0, 10)
  const r = await env.DB.prepare('INSERT INTO quota (who, day, what, n) VALUES (?,?,?,1) ON CONFLICT(who, day, what) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(key.slice(0, 16), day, what).first()
  return (r?.n || 1) <= max
}

// ---- the editor's side (the edit link is the sign-in) --------------------------------

/** A fresh code for a Gold page. { code, exp, text, href } or { error }. */
export async function mint(env, s, { rand, sha }) {
  if (!on(env)) return { error: 'off' }
  if (!isGold(s)) return { error: 'gold' }
  let code = ''
  while (code.length < 6) for (const b of crypto.getRandomValues(new Uint8Array(12))) if (b < 240 && code.length < 6) code += ALPHA[b % ALPHA.length] // 240 = 8 × 30: no bias
  const exp = Date.now() + LIMITS.codeMin * 60e3
  await env.DB.prepare('DELETE FROM line_code WHERE site_id = ? OR exp < ?').bind(s.id, Date.now()).run()
  await env.DB.prepare('INSERT INTO line_code (hash, site_id, exp) VALUES (?,?,?)').bind(await sha('PAGE-' + code), s.id, exp).run()
  const text = `เว็บ · page PAGE-${code}`
  return { code: 'PAGE-' + code, exp, text, href: oaHref(env, text) }
}

/** What the editor shows: is the feature on, who is linked. */
export async function describe(env, s) {
  const l = await env.DB.prepare('SELECT name, at FROM line_link WHERE site_id = ?').bind(s.id).first()
  return { on: on(env), linked: !!l, name: l?.name || '', at: l?.at || '' }
}

export async function unlinkSite(env, siteId) {
  await env.DB.prepare('DELETE FROM line_link WHERE site_id = ?').bind(siteId).run()
  await env.DB.prepare('DELETE FROM line_code WHERE site_id = ?').bind(siteId).run()
}

/** A page's notes for its owner: shown and held, newest first. */
export async function notesFor(env, siteId) {
  return (await env.DB.prepare("SELECT id, at, body, status FROM note WHERE site_id = ? AND status != 'gone' ORDER BY at DESC, rowid DESC LIMIT 100").bind(siteId).all()).results
}
export async function dropNote(env, siteId, id) {
  await env.DB.prepare("UPDATE note SET status = 'gone', body = '' WHERE id = ? AND site_id = ?").bind(String(id || ''), siteId).run()
}

/** The notes a reader sees: the newest, and a few before it. */
export async function shownNews(env, siteId, n = 5) {
  return (await env.DB.prepare("SELECT id, at, body FROM note WHERE site_id = ? AND status = 'shown' ORDER BY at DESC, rowid DESC LIMIT ?").bind(siteId, n).all()).results
}

/** Photos that came in by LINE after `since` (an ISO time the editor loaded the page), oldest first. */
export async function photosSince(env, siteId, since) {
  if (!since) return []
  return (await env.DB.prepare("SELECT id FROM photo WHERE site_id = ? AND via = 'line' AND created > ? ORDER BY created").bind(siteId, String(since)).all()).results.map((r) => r.id)
}

// ---- the account's side (called through the service binding) ---------------------------

async function pageOf(env, uid) {
  if (!goodUid(uid)) return null
  const l = await env.DB.prepare('SELECT site_id FROM line_link WHERE uid = ?').bind(uid).first()
  if (!l) return null
  const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(l.site_id).first()
  if (!s || s.status === 'removed') return null
  return s
}
const where = (s) => ({ page: s.name, url: `${HOME}/${s.name}` })

/** The code from the account, with the sender's LINE user id and display name. */
export async function confirm(env, uid, raw, name, { sha }) {
  if (!on(env)) return { error: 'off' }
  if (!goodUid(uid)) return { error: 'code' }
  if (!(await take(env, 'U' + (await sha(uid)).slice(0, 15), 'linetry', LIMITS.tries))) return { error: 'tries' }
  const code = codeOf(raw)
  if (!code) return { error: 'code' }
  const h = await sha(code)
  const row = await env.DB.prepare('SELECT site_id, exp FROM line_code WHERE hash = ?').bind(h).first()
  if (!row || row.exp < Date.now()) return { error: 'code' }
  const s = await env.DB.prepare('SELECT * FROM site WHERE id = ?').bind(row.site_id).first()
  if (!s || s.status === 'removed') return { error: 'code' }
  if (!isGold(s)) return { error: 'gold', ...where(s) }
  const other = await env.DB.prepare('SELECT site_id FROM line_link WHERE uid = ?').bind(uid).first()
  if (other && other.site_id !== s.id) {
    const o = await env.DB.prepare('SELECT name FROM site WHERE id = ?').bind(other.site_id).first()
    return { error: 'taken', page: o?.name || '' } // the code stays good: send "page off", then the code again
  }
  const used = await env.DB.prepare('DELETE FROM line_code WHERE hash = ? AND exp >= ?').bind(h, Date.now()).run()
  if (!used.meta.changes) return { error: 'code' }
  await env.DB.prepare('DELETE FROM line_link WHERE site_id = ?').bind(s.id).run() // a new LINE account replaces the old one
  await env.DB.prepare('INSERT INTO line_link (site_id, uid, name, at) VALUES (?,?,?,?)')
    .bind(s.id, uid, cleanText(name).slice(0, 40) || null, new Date().toISOString()).run()
  await evt(env, s.id, 'line-linked', '')
  return { ok: true, ...where(s) }
}

/** { linked, page, url, gold } for a LINE user id. */
export async function status(env, uid) {
  const s = await pageOf(env, uid)
  return s ? { linked: true, gold: isGold(s), ...where(s) } : { linked: false }
}

/** "page off" from the account. */
export async function unlink(env, uid) {
  const s = await pageOf(env, uid)
  if (!goodUid(uid)) return { ok: false }
  await env.DB.prepare('DELETE FROM line_link WHERE uid = ?').bind(uid).run()
  if (s) await evt(env, s.id, 'line-unlinked', 'from LINE')
  return { ok: true, linked: false, ...(s ? where(s) : {}) }
}

/** A text from the account, kept as a dated note. */
export async function addNote(env, uid, text, msg, { rand }) {
  if (!on(env)) return { error: 'off' }
  const s = await pageOf(env, uid)
  if (!s) return { error: 'not-linked' }
  if (!isGold(s)) return { error: 'gold', ...where(s) }
  const body = cleanText(text)
  if (!body) return { error: 'empty' }
  if (body.length > LIMITS.noteChars) return { error: 'long', max: LIMITS.noteChars }
  if (msg && (await env.DB.prepare('SELECT 1 FROM note WHERE msg = ?').bind(String(msg)).first())) return { ok: true, dup: true, ...where(s) }
  if (!(await take(env, 'L' + s.id, 'linenote', LIMITS.notes))) return { error: 'quota' }
  const r = await screen(env.AI, { about: body }, {})
  const held = r.decision === 'held'
  await env.DB.prepare('INSERT INTO note (id, site_id, at, body, status, why, via, msg) VALUES (?,?,?,?,?,?,?,?)')
    .bind(rand(10), s.id, new Date().toISOString(), body, held ? 'held' : 'shown', held ? r.reasons.join(' ').slice(0, 120) : null, 'line', msg ? String(msg) : null).run()
  await env.DB.prepare("DELETE FROM note WHERE site_id = ? AND id NOT IN (SELECT id FROM note WHERE site_id = ? ORDER BY at DESC, rowid DESC LIMIT ?)").bind(s.id, s.id, LIMITS.keepNotes).run()
  await env.DB.prepare('UPDATE site SET updated = ? WHERE id = ?').bind(new Date().toISOString(), s.id).run()
  await evt(env, s.id, held ? 'line-note-held' : 'line-note', held ? r.reasons.join(' ') : '')
  return { ok: true, held, ...where(s) }
}

/** A WebP at most `side` px on its longest edge through the Images binding, or null without one. The original bytes go in,
 *  so the camera's orientation is applied before the metadata is dropped. */
async function shrink(env, bytes, side, quality) {
  if (!env.IMAGES?.input) return null
  try {
    const r = await env.IMAGES.input(new Response(bytes).body).transform({ width: side, height: side, fit: 'scale-down' }).output({ format: 'image/webp', quality })
    return new Uint8Array(await r.response().arrayBuffer())
  } catch (e) {
    console.error('line photo shrink', String(e?.message || e))
    return null
  }
}

/** The page's `d` with `id` added to photos, written only if `d` is still what was read (up to three tries). */
async function appendPhoto(env, siteId, id, max) {
  for (let i = 0; i < 3; i++) {
    const s = await env.DB.prepare('SELECT d FROM site WHERE id = ?').bind(siteId).first()
    if (!s) return 'gone'
    const d = JSON.parse(s.d)
    const photos = Array.isArray(d.photos) ? d.photos : []
    if (photos.includes(id)) return 'ok'
    if (photos.length >= max) return 'full'
    d.photos = [...photos, id]
    const w = await env.DB.prepare('UPDATE site SET d = ?, updated = ? WHERE id = ? AND d = ?').bind(JSON.stringify(d), new Date().toISOString(), siteId, s.d).run()
    if (w.meta.changes) return 'ok'
  }
  return 'busy'
}

/** A photo from the account (bytes as LINE sent them) onto the page's photos. */
export async function addPhoto(env, uid, bytes, msg, { rand }) {
  if (!on(env)) return { error: 'off' }
  const s = await pageOf(env, uid)
  if (!s) return { error: 'not-linked' }
  if (!isGold(s)) return { error: 'gold', ...where(s) }
  if (msg && (await env.DB.prepare('SELECT 1 FROM line_msg WHERE msg = ?').bind(String(msg)).first())) return { ok: true, dup: true, ...where(s) }
  const max = photoMax(s.kind, true)
  const have = await env.DB.prepare('SELECT COUNT(*) AS n FROM photo WHERE site_id = ?').bind(s.id).first()
  if (JSON.parse(s.d).photos?.length >= max || (have?.n || 0) >= max * 2 + 10) return { error: 'full', max }
  if (!(await take(env, 'L' + s.id, 'linephoto', LIMITS.photos))) return { error: 'quota' }

  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const c = clean(raw, LIMITS.raw)
  if (c.error) return { error: 'photo-' + c.error }
  // the Images binding when there is one; otherwise the stripped file as it is, if it is no bigger than the maker's biggest
  let big = null, small = null
  const wb = await shrink(env, raw, LIMITS.side, 90)
  if (wb) {
    big = clean(wb, MAX_BIG)
    const ws = await shrink(env, raw, LIMITS.small, 86)
    small = ws ? clean(ws, 220_000) : null
    if (small?.error) small = null
  }
  if (!big || big.error) {
    if (c.bytes.length > MAX_BIG) return { error: 'photo-size' }
    big = c
    small = null
  }
  const eye = small || big
  const seen = await look(env.AI, eye.bytes, eye.kind)
  const id = rand(16)
  await evt(env, s.id, 'photo-' + seen.verdict, `line ${seen.why} ${seen.what || ''}`.trim())
  if (seen.verdict === 'refuse') return { error: 'refused', why: seen.why }
  const meta = { v: seen.verdict === 'ok' ? 'ok' : 'hold' }
  await env.MEDIA.put(`p/${id}`, big.bytes, { httpMetadata: { contentType: typeOf(big.kind) }, customMetadata: meta })
  if (small) await env.MEDIA.put(`p/${id}-s`, small.bytes, { httpMetadata: { contentType: typeOf(small.kind) }, customMetadata: meta })
  await env.DB.prepare('INSERT INTO photo (id, site_id, ext, bytes, w, h, role, verdict, why, created, credit, via) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, s.id, big.kind, big.bytes.length, null, null, 'photo', meta.v, seen.why || null, new Date().toISOString(), null, 'line').run()
  const put = await appendPhoto(env, s.id, id, max)
  if (put !== 'ok') {
    await env.MEDIA.delete([`p/${id}`, `p/${id}-s`])
    await env.DB.prepare('DELETE FROM photo WHERE id = ?').bind(id).run()
    return { error: put === 'full' ? 'full' : 'busy', max }
  }
  if (msg) await env.DB.prepare('INSERT OR IGNORE INTO line_msg (msg, site_id, at) VALUES (?,?,?)').bind(String(msg), s.id, new Date().toISOString()).run()
  return { ok: true, held: meta.v !== 'ok', ...where(s) }
}

// ---- upkeep (worker.mjs tidy) -------------------------------------------------------------

/** Spent codes, deleted notes and old message ids go; notes held only because the model did not answer get another look. */
export async function tidyLine(env) {
  const now = Date.now(), day3 = new Date(now - 3 * 864e5).toISOString()
  await env.DB.prepare('DELETE FROM line_code WHERE exp < ?').bind(now).run()
  await env.DB.prepare("DELETE FROM note WHERE status = 'gone' AND at < ?").bind(day3).run()
  await env.DB.prepare('DELETE FROM line_msg WHERE at < ?').bind(day3).run()
  let live = 0
  for (const n of (await env.DB.prepare("SELECT id, body FROM note WHERE status = 'held' AND why LIKE 'guard:guard-%' LIMIT 20").all()).results) {
    const r = await screen(env.AI, { about: n.body }, {})
    if (r.decision === 'live') { await env.DB.prepare("UPDATE note SET status = 'shown', why = NULL WHERE id = ?").bind(n.id).run(); live++ }
  }
  return live
}

/** A page deleted by its maker takes the link and the notes with it. */
export async function dropSite(env, siteId) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM line_link WHERE site_id = ?').bind(siteId),
    env.DB.prepare('DELETE FROM line_code WHERE site_id = ?').bind(siteId),
    env.DB.prepare('DELETE FROM note WHERE site_id = ?').bind(siteId),
    env.DB.prepare('DELETE FROM line_msg WHERE site_id = ?').bind(siteId),
  ])
}
