// trcheck.mjs — a page check: a translator's gig (Nan 2026-10-16: translators are key gig work
// on Mot Dang; motdang.net/sites/translators/). A gig is one Gold page in one language. Its link,
// /x/<gig>.<exp>.<sig>, is signed like a slip link (slipq.mjs) and needs no password. It opens the
// maker's words beside the machine's; what the translator saves goes to tr_fix and wins over the
// machine (tr.mjs merge). Fixes are keyed by the maker's words: a string the maker did not change
// keeps its fix through any re-translation, and a string whose words changed shows the old fix,
// flagged, for the next check. Each save posts to #people-team and marks the gig taken, which
// Paid in Art's ledger (data/gigs.tsv) reads.

import { PAGE_LANGS } from '../public/s/words.mjs'
import { texts, hashOf, apply, merge } from './tr.mjs'
import { aiScreen } from './screen.mjs'

const DAYS = 30
const MAX = 400

async function sig(env, id, exp, sha) {
  return (await sha(`${env.SESSION_SECRET || 'dev'}|check|${id}|${exp}`)).slice(0, 24)
}

/** The link for one gig. */
export async function link(env, origin, id, sha) {
  const exp = Math.floor(Date.now() / 1000 + DAYS * 86400).toString(36)
  return `${origin}/x/${id}.${exp}.${await sig(env, id, exp, sha)}`
}

/** The gig id a link opens, or null. */
export async function read(env, path, sha) {
  const m = /^\/x\/([a-z0-9]{12})\.([a-z0-9]{1,10})\.([a-f0-9]{24})$/.exec(path)
  if (!m) return null
  if (parseInt(m[2], 36) * 1000 < Date.now()) return { expired: true }
  if (m[3] !== (await sig(env, m[1], m[2], sha))) return null
  return { id: m[1] }
}

/** A new gig for a page in a language: { id, link } or { error }. */
export async function mint(env, origin, { name, lang, who }, { sha, rand }) {
  if (!PAGE_LANGS[lang]) return { error: 'lang' }
  const s = await env.DB.prepare('SELECT id, lang FROM site WHERE name = ?').bind(String(name || '').toLowerCase()).first()
  if (!s) return { error: 'name' }
  if (s.lang === lang) return { error: 'own-lang' }
  const id = rand(12)
  await env.DB.prepare('INSERT INTO gig (id, kind, site_id, lang, who, posted) VALUES (?,?,?,?,?,?)')
    .bind(id, 'check', s.id, lang, String(who || '').trim().slice(0, 60) || null, today()).run()
  return { id, link: await link(env, origin, id, sha) }
}

const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10) // a Bangkok day

/** One row per string: the maker's words, the machine's, the fix, and a flag when the words at
 *  that place changed since a fix was made there. `fixes` = [{ src, v, path }]. */
export function rows(list, machine, fixes) {
  const bySrc = new Map(fixes.map((f) => [f.src, f]))
  const srcs = new Set(list.map((x) => x[1]))
  return list.map(([path, src], i) => {
    const fix = bySrc.get(src)
    const mt = typeof machine?.[i] === 'string' ? machine[i] : ''
    const was = fix ? null : fixes.find((f) => f.path === path && !srcs.has(f.src)) || null
    return { path, src, mt, v: fix ? fix.v : mt, fixed: !!fix, was: was && { src: was.src, v: was.v } }
  })
}

/** "items.2.note" → "Item 3 · note". */
export function label(path) {
  const NAMES = { n: 'name', t: 'title', note: 'note', q: 'quote', beds: 'beds', role: 'role', kind: 'kind' }
  const [a, b, c] = path.split('.')
  if (b === undefined) return { tagline: 'Tagline', about: 'About' }[a] || a
  if (c === undefined) return `${a} · ${b}`
  return `${a[0].toUpperCase()}${a.slice(1).replace(/s$/, '')} ${Number(b) + 1} · ${NAMES[c] || c}`
}

const lines = (n) => `${n} line${n === 1 ? '' : 's'}`
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const tall = (s) => Math.min(14, Math.max(2, Math.ceil(String(s).length / 38) + (String(s).match(/\n/g) || []).length))

/** The check page. */
export function page({ title, name, lang, home, who, list, saved, err }, origin) {
  const L = PAGE_LANGS[lang], H = PAGE_LANGS[home]
  const view = `${origin}/${name}?hl=${lang}`
  const fixed = list.filter((r) => r.fixed).length, flagged = list.filter((r) => r.was).length
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>ตรวจคำแปล · Page check · ${esc(title)}</title>
<style>body{margin:0;font:17px/1.5 system-ui,'Noto Sans Myanmar','Noto Sans Thai',sans-serif;background:#fff8e7;color:#1c1530}
main{max-width:1100px;margin:0 auto;padding:16px 16px 110px}h1{font-size:22px;margin:0 0 4px}a{color:#1c1530}
.hint{font-size:15px;color:#4a4458;margin:4px 0}.who{display:block;margin:14px 0 18px;font-weight:700}
.who input{display:block;width:100%;max-width:360px;box-sizing:border-box;font:inherit;padding:10px;border:2px solid #1c1530;border-radius:10px;margin-top:4px;background:#fff}
.head,.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.head{font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#4a4458;margin-bottom:6px}
.row{border-top:1px solid #e3d9bd;padding:12px 0}.lab{grid-column:1/-1;font-size:13px;color:#4a4458;display:flex;gap:8px;align-items:center}
.src{white-space:pre-wrap;background:#fff;border-radius:10px;padding:10px;border:1px solid #e3d9bd}
textarea{width:100%;box-sizing:border-box;font:inherit;padding:10px;border:2px solid #1c1530;border-radius:10px;background:#fff;resize:vertical}
.pill{font-size:12px;font-weight:800;padding:1px 8px;border-radius:99px;background:#e3d9bd}.pill.ok{background:#bfe6c4}.pill.flag{background:#f5c518}
.was{grid-column:1/-1;font-size:14px;background:#fff3c4;border-radius:10px;padding:8px 10px}.was s{color:#6b6478}
.bar{position:fixed;left:0;right:0;bottom:0;background:#1c1530;color:#fff;padding:12px 16px}.bar div{max-width:1100px;margin:0 auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.bar button{font:inherit;font-weight:800;padding:12px 22px;border-radius:12px;border:0;background:#f5c518;color:#000;cursor:pointer}.bar a{color:#fff}
.note{font-weight:700;padding:10px 12px;border-radius:10px;margin:12px 0}.note.ok{background:#bfe6c4}.note.err{background:#ffd2c8}
@media (max-width:640px){.head{display:none}.row{grid-template-columns:1fr}.src::before{content:attr(data-h);display:block;font-size:12px;font-weight:800;color:#4a4458}}</style></head>
<body><main><h1>${esc(title)}</h1>
<p class="hint">ตรวจคำแปล · Page check · ${esc(H)} → <b>${esc(L)}</b> · <a href="${esc(view)}" target="_blank">${esc(view.replace(/^https?:\/\//, ''))}</a></p>
<p class="hint">อ่านทีละบรรทัด แก้ให้เหมือนคนท้องถิ่นเขียน ชื่อร้าน ชื่อคน ราคา คงไว้ตามเดิม · Read each line and fix it until it reads as a local wrote it. Names of shops and people, and prices, stay as they are. Leave a box empty to go back to the machine's words.</p>
${saved ? `<p class="note ok">✓ บันทึกแล้ว · Saved. <a href="${esc(view)}" target="_blank">${esc(L)}</a> shows your words now.</p>` : ''}
${err ? `<p class="note err">${esc(err)}</p>` : ''}
<form method="post"><label class="who">ชื่อของคุณ (สำหรับค่าจ้าง) · Your name, for the pay<input name="who" value="${esc(who || '')}" maxlength="60" required autocomplete="name"></label>
<p class="hint">${lines(list.length)} · ${fixed} checked before${flagged ? ` · <b>${flagged} changed since they were checked</b>` : ''}</p>
<div class="head"><span>${esc(H)}</span><span>${esc(L)}</span></div>
${list.map((r, i) => `<div class="row"><span class="lab">${esc(label(r.path))} ${r.fixed ? '<span class="pill ok">checked</span>' : r.was ? '<span class="pill flag">words changed</span>' : r.mt ? '<span class="pill">machine</span>' : '<span class="pill flag">no machine version yet</span>'}</span>
<div class="src" lang="${esc(home)}" data-h="${esc(H)}">${esc(r.src)}</div><input type="hidden" name="s${i}" value="${esc(r.src)}">
<textarea name="v${i}" lang="${esc(lang)}" rows="${tall(r.v || r.src)}" aria-label="${esc(L)}: ${esc(label(r.path))}">${esc(r.v)}</textarea>
${r.was ? `<p class="was">ก่อนหน้านี้ · Before the maker changed it: <s>${esc(r.was.src)}</s><br>→ ${esc(r.was.v)}</p>` : ''}</div>`).join('\n')}
<div class="bar"><div><button>บันทึก · Save</button><span>${esc(L)} · ${lines(list.length)}</span></div></div></form></main></body></html>`
}

/** /x/<link>: GET the page, POST the translator's words. Answers every /x/ path. */
export async function route(request, env, path, url, origin, { html, sha, sameOrigin, normalize, postPeople, log }) {
  const q = await read(env, path, sha)
  if (!q) return new Response('', { status: 404 })
  if (q.expired) return html('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><p style="font:18px system-ui;padding:20px">ลิงก์หมดอายุ ขอลิงก์ใหม่ทาง LINE<br>This link has expired; ask for a new one on LINE.</p>', 410)
  const g = await env.DB.prepare('SELECT gig.*, site.name, site.lang AS home, site.d FROM gig JOIN site ON site.id = gig.site_id WHERE gig.id = ?').bind(q.id).first()
  if (!g) return new Response('', { status: 404 })
  const d = normalize(JSON.parse(g.d))
  const list = texts(d).slice(0, MAX)
  const view = async (extra = {}) => {
    const row = await env.DB.prepare('SELECT src, d FROM tr WHERE site_id = ? AND lang = ?').bind(g.site_id, g.lang).first()
    let machine = null
    if (row && row.src === (await hashOf(texts(d)))) try { machine = JSON.parse(row.d) } catch {}
    const fixes = (await env.DB.prepare('SELECT src, v, path FROM tr_fix WHERE site_id = ? AND lang = ?').bind(g.site_id, g.lang).all()).results
    return { machine, fixes, page: (o) => html(page({ title: d.name || g.name, name: g.name, lang: g.lang, home: g.home, who: g.who, list: rows(list, machine, fixes), ...extra, ...o }, origin), o.err ? 422 : 200) }
  }
  if (request.method !== 'POST') return (await view({ saved: url.searchParams.has('saved') })).page({})
  if (!sameOrigin(request, url)) return new Response('', { status: 403 })

  const f = await request.formData()
  const who = String(f.get('who') || '').trim().slice(0, 60)
  const nl = (x) => String(x).replace(/\r\n/g, '\n') // a form sends its line breaks as CRLF
  const at = new Map(list.map(([p, src]) => [nl(src), [p, src]]))
  const seen = new Set(), put = [], drop = []
  for (let i = 0; i < MAX; i++) {
    const src = f.get('s' + i)
    if (src == null) break
    const hit = at.get(nl(src))
    if (!hit || seen.has(hit[1])) continue // words the maker has changed since the page was opened
    seen.add(hit[1])
    const v = nl(f.get('v' + i) ?? '').trim().slice(0, 2400)
    ;(v ? put : drop).push({ src: hit[1], v, path: hit[0] })
  }
  const v0 = await view()
  if (!who) return v0.page({ err: 'ใส่ชื่อของคุณ · Your name, please: it is how the pay finds you.' })
  // the words as they will read, through the same guard as a maker's page
  const fixes = new Map(v0.fixes.map((x) => [x.src, x.v]))
  for (const x of put) fixes.set(x.src, x.v)
  for (const x of drop) fixes.delete(x.src)
  const strings = merge(list, v0.machine, fixes)
  if (strings) {
    const g2 = await aiScreen(env.AI, apply(d, list.map((x) => x[0]), strings))
    if (g2.hold && !g2.cats.some((c) => c.startsWith('guard-'))) return v0.page({ err: 'บางคำผ่านการตรวจไม่ได้ · Some of these words did not pass the check. Nothing was saved.' })
  }
  const now = new Date().toISOString()
  const changed = put.filter((x) => { const i = list.findIndex((l) => l[1] === x.src); return x.v !== (v0.machine?.[i] ?? '') }).length
  const st = [
    ...put.map((x) => env.DB.prepare('INSERT INTO tr_fix (site_id, lang, src, v, path, who, gig, at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(site_id, lang, src) DO UPDATE SET v = excluded.v, path = excluded.path, who = excluded.who, gig = excluded.gig, at = excluded.at')
      .bind(g.site_id, g.lang, x.src, x.v, x.path, who, g.id, now)),
    ...drop.map((x) => env.DB.prepare('DELETE FROM tr_fix WHERE site_id = ? AND lang = ? AND src = ?').bind(g.site_id, g.lang, x.src)),
    env.DB.prepare('UPDATE gig SET who = ?, taken = COALESCE(taken, ?), saved = ?, n = ?, changed = ? WHERE id = ?').bind(who, today(), now, put.length, changed, g.id),
  ]
  await env.DB.batch(st)
  await log(env, g.site_id, 'tr-check', `${g.lang} ${put.length} lines, ${changed} changed, ${who}`)
  const first = !g.taken
  await postPeople(`${first ? '✓ ตรวจคำแปลเสร็จ · Page check done' : '✎ ตรวจคำแปลแก้อีกครั้ง · Page check saved again'} · ${PAGE_LANGS[g.lang]}\n` +
    `${d.name || g.name} · ${who} · ${lines(put.length)}, ${changed} changed${drop.length ? `, ${drop.length} back to the machine` : ''}\n${origin}/${g.name}?hl=${g.lang}`).catch((e) => console.error(e))
  return Response.redirect(url.origin + path + '?saved=1', 303)
}
