// tr.mjs — a Gold page in the other page languages. Workers AI writes each
// language from the maker's words; the cron does it once the words have sat
// for ten minutes, and again when they change. A reader asks with ?hl=xx.
// Names, prices, codes and links stay as the maker wrote them.

import { PAGE_LANGS } from '../public/s/words.mjs'

export const MODEL = '@cf/google/gemma-4-26b-a4b-it' // chosen 2026-10-14 on Thai → Burmese: SEA-LION v4 left Thai in place, DeepSeek V4 and Qwen 3.8 spent their tokens thinking
const LANG_EN = { th: 'Thai', en: 'English', my: 'Burmese', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', vi: 'Vietnamese', km: 'Khmer', lo: 'Lao', id: 'Indonesian', es: 'Spanish', fr: 'French' }

/** [path, text] for each piece of the maker's words a reader reads. */
export function texts(d) {
  const out = []
  const add = (p, v) => { if (typeof v === 'string' && v.trim() && /\p{L}/u.test(v)) out.push([p, v]) }
  add('tagline', d.tagline); add('about', d.about); add('hours.note', d.hours?.note)
  ;(d.items || []).forEach((x, i) => { add(`items.${i}.n`, x.n); add(`items.${i}.note`, x.note) })
  ;(d.links || []).forEach((x, i) => add(`links.${i}.t`, x.t))
  ;(d.spots || []).forEach((x, i) => add(`spots.${i}.note`, x.note))
  ;(d.cal || []).forEach((x, i) => { add(`cal.${i}.t`, x.t); add(`cal.${i}.note`, x.note) })
  ;(d.camps || []).forEach((x, i) => { add(`camps.${i}.t`, x.t); add(`camps.${i}.note`, x.note) })
  ;(d.svc || []).forEach((x, i) => { add(`svc.${i}.n`, x.n); add(`svc.${i}.note`, x.note) })
  ;(d.rooms || []).forEach((x, i) => { add(`rooms.${i}.n`, x.n); add(`rooms.${i}.beds`, x.beds); add(`rooms.${i}.note`, x.note) })
  ;(d.lists || []).forEach((x, i) => { add(`lists.${i}.t`, x.t); add(`lists.${i}.kind`, x.kind); add(`lists.${i}.note`, x.note) })
  return out
}

export async function hashOf(list) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(list.map((x) => x[1]))))
  return [...new Uint8Array(h)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('')
}

/** `d` with the translated strings put back in their places. */
export function apply(d, paths, strings) {
  const o = JSON.parse(JSON.stringify(d))
  paths.forEach((p, i) => {
    const v = strings[i]
    if (typeof v !== 'string' || !v.trim()) return
    const ks = p.split('.')
    let x = o
    for (let k = 0; k < ks.length - 1; k++) { x = x?.[ks[k]]; if (x == null) return }
    x[ks.at(-1)] = v.slice(0, 2400)
  })
  return o
}

/** One language: [strings] in the same order, or null. Long pages go in pieces. */
export async function translate(env, list, from, to) {
  const out = []
  for (let i = 0; i < list.length; i += 24) {
    const part = list.slice(i, i + 24).map((x) => x[1])
    const sys = `You translate the words of a small business web page. Translate each string in the JSON array from ${LANG_EN[from] || from} to ${LANG_EN[to]}. ` +
      `Every string must come out fully in ${LANG_EN[to]}, except names of shops, people, places, dishes and brands, which stay as written. Keep numbers, prices, codes, emoji and links. ` +
      'Answer with only a JSON array of the same length, nothing else.'
    let r
    try { r = await env.AI.run(env.TR_MODEL || MODEL, { messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(part) }], max_tokens: 4000, chat_template_kwargs: { enable_thinking: false } }) } catch { return null }
    const raw = r?.choices?.[0]?.message?.content ?? r?.response ?? ''
    const txt = String(typeof raw === 'string' ? raw : JSON.stringify(raw)).replace(/^[\s\S]*?(\[)/, '[').replace(/\][^\]]*$/, ']')
    let arr
    try { arr = JSON.parse(txt) } catch { return null }
    if (!Array.isArray(arr) || arr.length !== part.length) return null
    out.push(...arr.map((x) => String(x ?? '')))
  }
  return out
}

/** The page in `lang`, when a translation made from the current words exists. */
export async function read(env, s, d, lang) {
  if (!PAGE_LANGS[lang] || lang === s.lang) return null
  const list = texts(d)
  if (!list.length) return d
  const row = await env.DB.prepare('SELECT src, d FROM tr WHERE site_id = ? AND lang = ?').bind(s.id, lang).first()
  if (!row || row.src !== (await hashOf(list))) return null
  try { return apply(d, list.map((x) => x[0]), JSON.parse(row.d)) } catch { return null }
}

/** Languages a page can be read in now (its own first). */
export async function langsOf(env, s, d) {
  const list = texts(d)
  if (!list.length) return Object.keys(PAGE_LANGS)
  const h = await hashOf(list)
  const rows = (await env.DB.prepare('SELECT lang FROM tr WHERE site_id = ? AND src = ?').bind(s.id, h).all()).results.map((r) => r.lang)
  return [s.lang, ...Object.keys(PAGE_LANGS).filter((l) => l !== s.lang && rows.includes(l))]
}

/** The cron's share: Gold pages whose words sat ten minutes, up to `budget` languages a run. */
export async function catchUp(env, isGold, normalize, budget = 8) {
  const settled = new Date(Date.now() - 10 * 60e3).toISOString()
  const rows = (await env.DB.prepare("SELECT id, name, lang, d, tier, gold_until FROM site WHERE status = 'live' AND tier = 'gold' AND updated < ? ORDER BY updated DESC LIMIT 40").bind(settled).all()).results
  let done = 0
  for (const s of rows) {
    if (!isGold(s)) continue
    const d = normalize(JSON.parse(s.d))
    const list = texts(d)
    if (!list.length) continue
    const h = await hashOf(list)
    const have = new Set((await env.DB.prepare('SELECT lang FROM tr WHERE site_id = ? AND src = ?').bind(s.id, h).all()).results.map((r) => r.lang))
    for (const lang of Object.keys(PAGE_LANGS)) {
      if (lang === s.lang || have.has(lang)) continue
      if (done >= budget) return done
      done++
      const strings = await translate(env, list, s.lang, lang)
      if (!strings) continue
      await env.DB.prepare('INSERT INTO tr (site_id, lang, src, d, at) VALUES (?,?,?,?,?) ON CONFLICT(site_id, lang) DO UPDATE SET src = excluded.src, d = excluded.d, at = excluded.at')
        .bind(s.id, lang, h, JSON.stringify(strings), new Date().toISOString()).run()
    }
  }
  return done
}
