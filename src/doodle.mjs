// doodle.mjs — doodle anything (Nan 2026-10-16: "People should be able to easily doodle whatever
// they can imagine (within guardrails) and use it to self-promote on their site ... Doodle from photo").
//
//   POST /api/doodle {n, prompt, style, from?}   two doodles to choose from (x-edit: the page's edit token)
//   POST /api/doodle {n, use: id}                keep one: it becomes a photo of the page
//   GET  /api/doodle                             { left, max, gold } doodles still to ask for today
//
// Order of work: the edit token, the day's count (free pages 5, Gold pages 30; the 30-day trial is Gold),
// the maker's words through doodle-guard.mjs, two pictures from FLUX.2 klein in the house style, each looked
// at again (photo.mjs look, then lettering, royal and sacred pictures), stored like an uploaded photo.
// A doodle that fails, or is refused, does not count against the day.

import { MAX_PHOTOS } from '../public/s/render.mjs'
import { Q } from '../public/s/make-words-doodle.mjs'
import * as gold from './gold.mjs'
import { clean, look, sniff, typeOf, MAX_BIG } from './photo.mjs'
import { vet, answerOf, jsonOf } from './doodle-guard.mjs'

export const LIMIT = { free: 5, gold: 30 } // doodles a page may ask for in a day; env.DOODLE_FREE and env.DOODLE_GOLD override
const ALL_DAY = 600 // every page together; env.DOODLE_DAY overrides
const REFUSED_DAY = 40 // words turned away for one page in a day, then the page waits for tomorrow
const OPTIONS = 2
const MODEL = { draw: '@cf/black-forest-labs/flux-2-klein-4b', quick: '@cf/black-forest-labs/flux-1-schnell', see: '@cf/mistralai/mistral-small-3.1-24b-instruct' }

// The house style: a cheerful hand-drawn doodle, flat colours, confident ink outlines, warm paper.
// Each look says what the drawing is and how it is made; HOUSE says where it sits and what it leaves out.
export const STYLES = {
  pen: { noun: 'hand-drawn pen doodle', look: 'Confident black ink outlines with a lively, slightly wobbly line, flat colour fills in a warm palette of red, gold, green and teal, a few simple hatching strokes for shade. Warm cream paper background with a faint paper grain.' },
  crayon: { noun: 'crayon drawing, made with thick waxy crayons by a happy child', look: 'Bold chunky strokes, bright saturated flat colours, visible paper grain and crayon texture, slightly uneven colouring outside the lines. Warm cream paper background.' },
  wash: { noun: 'watercolour doodle', look: 'Loose translucent watercolour washes with soft edges and gentle colour blooms, thin confident ink outlines, lots of paper white showing, a few playful splatters. Warm cream watercolour paper background.' },
  lanna: { noun: 'hand-painted doodle in the style of a northern Thai (Lanna) temple mural', look: 'Flat stylised shapes, bold dark outlines, lacquer red, deep black, ochre and gold-leaf accents, ornamental flame-pattern (kranok) corner borders, aged warm plaster wall.' },
  sticker: { noun: 'cute die-cut sticker', look: 'Kawaii style, thick white sticker border all around, bold clean outlines, glossy flat bright colours, tiny sparkles and hearts, soft drop shadow, on a plain pale pastel background. The sticker is big and fills about three quarters of the picture.' },
  neon: { noun: 'night neon doodle', look: 'Glowing neon lines in hot pink, cyan and yellow with a soft glow halo, on a deep indigo night background with blurred round lantern lights. The neon lines draw shapes only, never letters or words. No crowd and no photographed people in the background.' },
}
export const STYLE_IDS = Object.keys(STYLES)
const HOUSE = 'Friendly, charming, simple shapes. The subject fills about two thirds of the picture and sits in the centre, with plain background all around it so the picture can be cropped square or tall. The picture fills the whole frame edge to edge, with no outer border, frame, table or hands. No text of any kind: no letters, no numbers, no words, no logos, no watermark, no signature. Signs, menus, boards and screens are left blank.'
const NO_TEXT = 'No text of any kind: no letters, no numbers, no words, no logos, no watermark, no signature.'

const subject = (s) => String(s).replace(/[.!\s]+$/, '').replace(/^(A|An|The|Our|My|Two|Three|Some)\b/, (w) => w.toLowerCase())

/** The words the picture model reads for a new doodle: `draw` is the English brief from the gatekeeper; `people`: the maker's words have people in them, who are drawn Thai. */
export const composeDraw = (style, draw, { people = false } = {}) => `A cheerful ${STYLES[style].noun} of ${subject(draw)}. ${people ? 'The people are friendly Thai people with black hair. ' : ''}${STYLES[style].look} ${HOUSE}`
/** ... and for a doodle from the maker's own photo; `change` is what the maker asked to change, or ''. */
export const composeEdit = (style, change) => `Redraw this photo as a cheerful ${STYLES[style].noun}. Keep the same subject, composition and main colours. Draw every sign, label, board, screen and surface that carries writing as a plain blank shape. ${STYLES[style].look} ${change ? `Change: ${subject(change)}. ` : ''}${NO_TEXT}`

/** Width and height for a redrawn photo: the photo's own shape, the long side 1024, both sides a multiple of 16 and at least 512. */
export function sizeFor(w, h) {
  w = Number(w); h = Number(h)
  if (!(w > 0 && h > 0)) return [1024, 768]
  const k = 1024 / Math.max(w, h)
  const fit = (x) => Math.min(1024, Math.max(512, Math.round((x * k) / 16) * 16))
  return [fit(w), fit(h)]
}

const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
/** The plain English sentence for an error of this route: the builder's own words (make-words-doodle.mjs), which it shows in four languages. */
export function reasonOf(error, why) {
  const e = Q.en
  if (error === 'refused') return e['dd_no_' + why] || e.dd_no_other
  if (error === 'quota') return e[why === 'words' ? 'dd_e_words' : why === 'gold' ? 'dd_e_quotaGold' : 'dd_e_quotaFree']
  if (error === 'busy') return e[{ text: 'dd_e_text', day: 'dd_e_day', check: 'dd_e_check' }[why] || 'dd_e_busy']
  return e['dd_e_' + error] || ''
}
const fail = (status, error, why) => J({ error, ...(why ? { why } : {}), reason: reasonOf(error, why) }, status)
const body = async (request) => { try { return await request.json() } catch { return {} } }
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('')
function rand(n) {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (const x of crypto.getRandomValues(new Uint8Array(n))) s += a[x % 36]
  return s
}
const timed = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms) })]).finally(() => clearTimeout(t)) }
/** A Bangkok day: a maker's day starts at their midnight. */
const day = (back = 0) => new Date(Date.now() + 7 * 3600e3 - back * 864e5).toISOString().slice(0, 10)
const limitOf = (env, isGold) => Number(isGold ? env.DOODLE_GOLD : env.DOODLE_FREE) || (isGold ? LIMIT.gold : LIMIT.free)
const note = (env, id, what, text) => env.DB.prepare('INSERT INTO event (at, site_id, what, note) VALUES (?,?,?,?)').bind(new Date().toISOString(), id, what, String(text || '').slice(0, 300)).run().catch(() => {})

// ---- the day's count --------------------------------------------------------------------------------

/** Takes one doodle from `id`'s day: '' when taken; 'quota' when the day is used up and 'words' when too many words were turned away (nothing is taken). */
async function take(env, id, max, refusedMax) {
  const r = await env.DB.prepare('INSERT INTO doodle_use (site_id, day, n, refused) VALUES (?,?,1,0) ON CONFLICT(site_id, day) DO UPDATE SET n = n + 1 RETURNING n, refused').bind(id, day()).first()
  const no = r.n > max ? 'quota' : refusedMax && r.refused >= refusedMax ? 'words' : ''
  if (no) await give(env, id)
  return no
}
const give = (env, id) => env.DB.prepare('UPDATE doodle_use SET n = MAX(n - 1, 0) WHERE site_id = ? AND day = ?').bind(id, day()).run().catch(() => {})
const turned = (env, id) => env.DB.prepare('UPDATE doodle_use SET refused = refused + 1 WHERE site_id = ? AND day = ?').bind(id, day()).run().catch(() => {})
async function left(env, id, max) {
  const r = await env.DB.prepare('SELECT n FROM doodle_use WHERE site_id = ? AND day = ?').bind(id, day()).first()
  return Math.max(0, max - (r?.n || 0))
}

// ---- the pictures -----------------------------------------------------------------------------------

function bytesOf(b64) {
  if (typeof b64 !== 'string' || b64.length < 200) throw new Error('no-image')
  const b = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  if (!sniff(b)) throw new Error('not-an-image')
  return b
}
const dataUrl = (bytes, kind) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return `data:${typeOf(kind)};base64,${btoa(s)}`
}

/**
 * One picture from FLUX.2 klein: a new one from words, or `image` ({bytes, kind}) redrawn. klein answers in 5 to 30 seconds and now
 * and then in a minute, so a new picture asks klein again after HEDGE[0] ms, and FLUX.1 schnell (2 seconds, plainer, now and then a
 * scribbled signature) after HEDGE[1] ms; an attempt that fails starts the next at once. The first picture to arrive is the one.
 * A redrawn photo waits for klein alone.
 */
export const HEDGE = [30000, 50000]
export function paint(ai, prompt, { w, h, image }) {
  const klein = async () => {
    const form = new FormData()
    form.append('prompt', prompt)
    form.append('width', String(w))
    form.append('height', String(h))
    if (image) form.append('input_image_0', new Blob([image.bytes], { type: typeOf(image.kind) }), 'photo')
    const req = new Response(form)
    const out = await timed(ai.run(MODEL.draw, { multipart: { body: req.body, contentType: req.headers.get('content-type') } }), image ? 75000 : 60000)
    return { bytes: bytesOf(out?.image), model: 'klein-4b' }
  }
  const schnell = async () => {
    const out = await timed(ai.run(MODEL.quick, { prompt, steps: 4 }), 30000)
    return { bytes: bytesOf(out?.image), model: 'schnell' }
  }
  const plan = image ? [klein] : [klein, klein, schnell]
  return new Promise((resolve, reject) => {
    let over = false, started = 0, failed = 0, last
    const timers = []
    const finish = (f, v) => { if (!over) { over = true; timers.forEach(clearTimeout); f(v) } }
    const start = () => {
      if (over || started >= plan.length) return
      plan[started++]().then((r) => finish(resolve, r)).catch((e) => {
        console.error('doodle paint', String(e?.message || e))
        last = e
        failed += 1
        if (failed === plan.length) finish(reject, last)
        else start()
      })
    }
    start()
    if (!image) HEDGE.forEach((ms) => timers.push(setTimeout(start, ms)))
  })
}

const SEE = 'You check a drawing for a web page. Answer only with JSON: {"text": true|false, "royal": true|false, "sacred": true|false}. ' +
  'text = any letters, numbers, words, signs with writing or logos are visible, even if garbled or decorative. ' +
  'royal = a portrait or likeness of the Thai king, queen or a member of the royal family. sacred = a Buddha image or statue, or a monk.'

/** { text, royal, sacred } for a picture; throws when the model does not answer. */
export async function see(ai, bytes, kind) {
  const out = await timed(ai.run(MODEL.see, {
    messages: [{ role: 'user', content: [{ type: 'text', text: SEE }, { type: 'image_url', image_url: { url: dataUrl(bytes, kind) } }] }],
    max_tokens: 60, temperature: 0,
  }), 25000)
  const r = jsonOf(answerOf(out))
  if (!r || typeof r.text !== 'boolean') throw new Error('see-unreadable')
  return { text: r.text, royal: !!r.royal, sacred: !!r.sacred }
}

/** A WebP at `width` wide through the Images binding, or null without one. */
async function shrink(env, bytes, width, quality) {
  if (!env.IMAGES?.input) return null
  try {
    const r = await env.IMAGES.input(new Response(bytes).body).transform({ width, fit: 'scale-down' }).output({ format: 'image/webp', quality })
    const out = new Uint8Array(await r.response().arrayBuffer())
    return sniff(out) === 'webp' ? { bytes: out, kind: 'webp' } : null
  } catch (e) {
    console.error('doodle shrink', String(e?.message || e))
    return null
  }
}

/**
 * One option: draw, then look. { pic } or { drop: why }. Lettering draws it again once (the model writes gibberish now and then);
 * a picture of a royal, a Buddha image, a monk, nudity or gore is dropped.
 */
async function option(env, job) {
  let last = 'busy'
  for (let tries = 0; tries < 2; tries++) {
    let made
    try { made = await paint(env.AI, job.prompt, job) } catch (e) { console.error('doodle paint', String(e?.message || e)); last = 'busy'; continue }
    const raw = { bytes: made.bytes, kind: sniff(made.bytes) }
    const [big, small] = await Promise.all([shrink(env, raw.bytes, 1024, 84), shrink(env, raw.bytes, 480, 78)])
    const eye = small || raw // the small copy is looked at: fewer tokens, the same answer
    const [seen, saw] = await Promise.all([look(env.AI, eye.bytes, eye.kind), see(env.AI, eye.bytes, eye.kind).catch((e) => { console.error('doodle see', String(e?.message || e)); return null })])
    if (seen.verdict === 'refuse') return { drop: 'picture' }
    if (seen.verdict !== 'ok' || !saw) { last = 'busy'; continue }
    if (saw.royal || saw.sacred) return { drop: 'picture' }
    if (saw.text) { last = 'text'; continue }
    return { pic: { big: big || raw, small }, model: made.model }
  }
  return { drop: last }
}

// ---- the route --------------------------------------------------------------------------------------

/** The page's own photo as { bytes, kind, w, h }, or null: the small copy, which is plenty to redraw. */
async function photoOf(env, siteId, id) {
  if (!/^[a-z0-9]{12,24}$/.test(id)) return null
  const row = await env.DB.prepare("SELECT id, w, h FROM photo WHERE id = ? AND site_id = ? AND verdict = 'ok'").bind(id, siteId).first()
  if (!row) return null
  const obj = (await env.MEDIA.get(`p/${id}-s`)) || (await env.MEDIA.get(`p/${id}`))
  if (!obj) return null
  const bytes = new Uint8Array(await obj.arrayBuffer())
  const kind = sniff(bytes)
  return kind ? { bytes, kind, w: row.w, h: row.h } : null
}

const cleanText = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()

export async function doodleRoute(request, env, ctx, url) {
  const m = request.method
  if (m !== 'POST' && m !== 'GET') return fail(405, 'method')
  const token = request.headers.get('x-edit') || ''
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return fail(403, 'edit-link')
  const s = await env.DB.prepare('SELECT * FROM site WHERE edit_hash = ?').bind(await sha(token)).first()
  if (!s || s.status === 'removed') return fail(403, 'edit-link')
  const isGold = gold.isGold(s)
  const max = limitOf(env, isGold)
  if (m === 'GET') return J({ left: await left(env, s.id, max), max, gold: isGold, styles: STYLE_IDS })

  const b = await body(request)
  if (b.n && String(b.n) !== s.name) return fail(400, 'name')
  if (b.use) return keep(env, s, isGold, String(b.use))

  const style = b.style === undefined ? 'pen' : b.style
  if (!STYLES[style]) return fail(400, 'style')
  const text = cleanText(b.prompt)
  if (text.length > 300) return fail(400, 'long')
  const from = b.from ? String(b.from) : ''
  if (!from && text.length < 2) return fail(400, 'empty')
  const photo = from ? await photoOf(env, s.id, from) : null
  if (from && !photo) return fail(400, 'photo')

  // the day's count, for the page and for every page together; given back unless a doodle is made
  const all = Number(env.DOODLE_DAY) || ALL_DAY
  if (await take(env, '*', all)) return fail(503, 'busy', 'day')
  const no = await take(env, s.id, max, REFUSED_DAY)
  if (no) { await give(env, '*'); return fail(429, 'quota', no === 'words' ? 'words' : isGold ? 'gold' : 'free') }
  const giveBack = () => Promise.all([give(env, '*'), give(env, s.id)])
  const t0 = Date.now()
  try {
    let draw = '', people = false
    if (text) {
      let v
      try { v = await vet(env.AI, text, { photo: !!photo }) } catch (e) {
        console.error('doodle vet', String(e?.message || e))
        await giveBack()
        return fail(503, 'busy', 'check')
      }
      if (!v.ok) {
        await giveBack(); await turned(env, s.id)
        await note(env, s.id, 'doodle-no', `${v.why} ${v.layer} ${text}`)
        return fail(422, 'refused', v.why)
      }
      draw = v.draw; people = v.people
    }
    if (photo) {
      const saw = await see(env.AI, photo.bytes, photo.kind).catch(() => null)
      if (!saw) { await giveBack(); return fail(503, 'busy', 'check') }
      if (saw.royal || saw.sacred) {
        await giveBack(); await turned(env, s.id)
        await note(env, s.id, 'doodle-no', `${saw.royal ? 'royal' : 'sacred'} photo ${from}`)
        return fail(422, 'refused', saw.royal ? 'royal' : 'sacred')
      }
    }

    const t1 = Date.now()
    const [w, h] = photo ? sizeFor(photo.w, photo.h) : [1024, 1024]
    const job = { prompt: photo ? composeEdit(style, draw) : composeDraw(style, draw, { people }), w, h, image: photo }
    const made = await Promise.all(Array.from({ length: OPTIONS }, () => option(env, job)))
    const won = made.filter((x) => x.pic)
    if (!won.length) {
      await giveBack()
      const why = made.some((x) => x.drop === 'picture') ? 'picture' : made.some((x) => x.drop === 'text') ? 'text' : 'busy'
      await note(env, s.id, 'doodle-fail', `${why} ${style} ${text} => ${draw}`)
      return why === 'picture' ? fail(422, 'refused', why) : fail(503, 'busy', why)
    }

    const now = new Date().toISOString()
    const options = []
    const rows = []
    for (const x of won) {
      const big = clean(x.pic.big.bytes, MAX_BIG)
      if (big.error) continue
      const small = x.pic.small ? clean(x.pic.small.bytes, MAX_BIG) : null
      const id = rand(16)
      await env.MEDIA.put(`p/${id}`, big.bytes, { httpMetadata: { contentType: typeOf(big.kind) }, customMetadata: { v: 'ok' } })
      if (small && !small.error) await env.MEDIA.put(`p/${id}-s`, small.bytes, { httpMetadata: { contentType: typeOf(small.kind) }, customMetadata: { v: 'ok' } })
      rows.push(env.DB.prepare('INSERT INTO doodle (id, site_id, created, style, prompt, ext, bytes, w, h, model, kept) VALUES (?,?,?,?,?,?,?,?,?,?,0)').bind(id, s.id, now, style, text || '(photo)', big.kind, big.bytes.length, w, h, x.model))
      options.push({ id, url: `/img/${id}.webp`, small: `/img/${id}-s.webp`, w, h, credit: { from: 'doodle', style, prompt: text } })
    }
    if (!options.length) { await giveBack(); return fail(503, 'busy', 'busy') }
    await env.DB.batch(rows)
    const dropped = made.filter((x) => x.drop).map((x) => x.drop)
    await note(env, s.id, 'doodle', `${style} ${photo ? 'photo ' : ''}${text} => ${draw}${dropped.length ? ' | dropped ' + dropped.join(',') : ''}`)
    ctx?.waitUntil?.(sweep(env).catch((e) => console.error('doodle sweep', e)))
    return J({ options, brief: draw, ms: { words: t1 - t0, pictures: Date.now() - t1 }, left: await left(env, s.id, max), max, gold: isGold })
  } catch (e) {
    await giveBack()
    throw e
  }
}

/** Keeps one doodle: it becomes a photo of the page, with its credit. */
async function keep(env, s, isGold, id) {
  if (!/^[a-z0-9]{12,24}$/.test(id)) return fail(404, 'not-found')
  const row = await env.DB.prepare('SELECT * FROM doodle WHERE id = ? AND site_id = ?').bind(id, s.id).first()
  if (!row) return fail(404, 'not-found')
  const credit = { from: 'doodle', style: row.style, prompt: row.prompt === '(photo)' ? '' : row.prompt }
  if (!row.kept) {
    const have = await env.DB.prepare('SELECT COUNT(*) AS n FROM photo WHERE site_id = ?').bind(s.id).first()
    if ((have?.n || 0) >= (isGold ? MAX_PHOTOS.gold : MAX_PHOTOS.free) * 2 + 10) return fail(400, 'too-many')
    const now = new Date().toISOString()
    await env.DB.batch([
      env.DB.prepare('INSERT INTO photo (id, site_id, ext, bytes, w, h, role, verdict, why, created, credit) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(row.id, s.id, row.ext, row.bytes, row.w, row.h, 'photo', 'ok', null, now, JSON.stringify(credit)),
      env.DB.prepare('UPDATE doodle SET kept = 1 WHERE id = ?').bind(row.id),
    ])
  }
  return J({ id: row.id, url: `/img/${row.id}.webp`, small: `/img/${row.id}-s.webp`, credit })
}

/** Doodles nobody kept go after a day, with their files. Run with every new doodle; the count of old days goes too. */
export async function sweep(env) {
  const old = new Date(Date.now() - 864e5).toISOString()
  const rows = (await env.DB.prepare('SELECT id FROM doodle WHERE kept = 0 AND created < ? LIMIT 40').bind(old).all()).results
  if (rows.length) {
    await env.MEDIA.delete(rows.flatMap((r) => [`p/${r.id}`, `p/${r.id}-s`]))
    await env.DB.prepare(`DELETE FROM doodle WHERE id IN (${rows.map(() => '?').join(',')})`).bind(...rows.map((r) => r.id)).run()
  }
  await env.DB.prepare('DELETE FROM doodle_use WHERE day < ?').bind(day(3)).run()
  return rows.length
}
