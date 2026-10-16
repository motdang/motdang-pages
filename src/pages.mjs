// pages.mjs — the directory of everyone's pages, the not-found page, admin.

import { esc, LOOKS, KINDS, lookOf } from '../public/s/render.mjs'
import { ui, pickLang, UI_LANGS } from '../public/s/make-words.mjs'

const icon = (id) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="/s/icons.svg#i-${id}"/></svg>`
const KIND_ICON = { shop: 'shop', food: 'food', service: 'gear', work: 'star', stay: 'moon', homes: 'tag', me: 'me', event: 'party', group: 'people' }

const CSS = `*{box-sizing:border-box}body{margin:0;background:#fff7ec;color:#1c1530;font:400 18px/1.5 system-ui,-apple-system,"Segoe UI","Prompt","Noto Sans Thai",sans-serif}
a{color:inherit}.i{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
header{background:#1c1530;color:#fff7ec;padding:28px 16px 30px}header .w,main{max-width:1100px;margin:0 auto}
h1{margin:0 0 6px;font:800 clamp(40px,9vw,72px)/1 "Avenir Next Condensed","Arial Narrow Bold",Impact,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.01em}
.make{display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:14px 22px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none;font-size:19px}
.langs{float:right;display:flex;gap:6px}.langs a{padding:6px 10px;border-radius:99px;text-decoration:none;font-size:15px;color:#fff7ec;box-shadow:inset 0 0 0 1px #fff7ec66}.langs a.on{background:#fff7ec;color:#1c1530}
main{padding:18px 16px 80px}.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.chips a{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:99px;background:#fff;text-decoration:none;font-weight:600;box-shadow:inset 0 0 0 2px #efd9bf}
.chips a.on{background:#1c1530;color:#fff7ec;box-shadow:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.tile{display:flex;flex-direction:column;border-radius:14px;overflow:hidden;background:#fff;text-decoration:none;box-shadow:0 1px 0 #efd9bf,0 6px 18px rgba(28,21,48,.08);transition:transform .2s}
.tile:hover{transform:translateY(-3px)}.tile .pic{aspect-ratio:1200/630;background:var(--bg);color:var(--ink);display:grid;place-items:center;position:relative;overflow:hidden}
.tile .pic img{width:100%;height:100%;object-fit:cover}.tile .pic b{font:var(--h1w) 30px/1 var(--display);text-transform:var(--case);padding:0 14px;text-align:center;overflow-wrap:anywhere}
.tile .tx{padding:12px 14px 14px}.tile .gd{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;background:linear-gradient(135deg,#f8dd8e,#c99a3a);color:#2a1a04;font-weight:800}.tile .nm{font-weight:700}.tile .tg{font-size:15px;color:#5a4f6a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tile .meta{display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13px;color:#5a4f6a}
.empty{padding:60px 0;text-align:center;color:#5a4f6a}.more{display:block;margin:24px auto;text-align:center;font-weight:700}
.nf{max-width:560px;margin:10vh auto;padding:0 16px;text-align:center}.nf h1{color:#1c1530}`

function shell(lang, title, inner, { langLinks = '' } = {}) {
  return `<!doctype html><html lang="${lang}" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Mot Dang</title><meta name="robots" content="noindex"><link rel="icon" href="/s/ant.svg"><meta name="theme-color" content="#1c1530">
<style>${CSS}</style></head><body>${langLinks}${inner}</body></html>`
}

function langOf(url, request) {
  const q = url?.searchParams?.get('lang')
  return UI_LANGS[q] ? q : pickLang(request?.headers?.get('accept-language'))
}

/** /~/ — newest first, by kind and by country. */
export async function directory(env, url, request, origin = 'https://sites.motdang.net') {
  const lang = langOf(url, request)
  const T = (k) => esc(ui(lang, k))
  const kind = KINDS.includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : ''
  const cc = /^[A-Z]{2}$/.test(url.searchParams.get('cc') || '') ? url.searchParams.get('cc') : ''
  const before = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(url.searchParams.get('before') || '') ? url.searchParams.get('before') : ''
  const where = ["status='live'"], args = []
  if (kind) { where.push('kind = ?'); args.push(kind) }
  if (cc) { where.push('cc = ?'); args.push(cc) }
  if (before) { where.push('published < ?'); args.push(before) }
  const rows = (await env.DB.prepare(`SELECT name, kind, look, d, cc, published, tier, gold_until FROM site WHERE ${where.join(' AND ')} ORDER BY (tier = 'gold' AND gold_until >= date('now')) DESC, published DESC LIMIT 49`).bind(...args).all()).results
  const ccs = (await env.DB.prepare("SELECT cc, COUNT(*) AS n FROM site WHERE status='live' AND cc IS NOT NULL GROUP BY cc ORDER BY n DESC LIMIT 30").all()).results
  const q = (o) => { const p = new URLSearchParams({ ...(kind && { kind }), ...(cc && { cc }), ...(lang && { lang }), ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); return '/all?' + p }
  const region = (c) => { try { return new Intl.DisplayNames([lang], { type: 'region' }).of(c) } catch { return c } }
  const tiles = rows.slice(0, 48).map((r) => {
    const d = JSON.parse(r.d)
    const L = LOOKS[lookOf(r.look)]
    const pic = (d.card ? `<img src="/img/${esc(d.card)}.jpg" alt="" loading="lazy">` : d.cover ? `<img src="/img/${esc(d.cover)}-s.webp" alt="" loading="lazy">` : `<b>${esc(d.name || r.name)}</b>`) + (r.tier === 'gold' && r.gold_until >= new Date().toISOString().slice(0, 10) ? '<i class="gd">★</i>' : '')
    return `<a class="tile" href="/${esc(r.name)}"><span class="pic" style="${esc(L.vars.replace(/\s+/g, ' '))};--accent:${esc(d.accent || L.accent)}">${pic}</span>` +
      `<span class="tx"><span class="nm">${esc(d.name || r.name)}</span>${d.tagline ? `<span class="tg">${esc(d.tagline)}</span>` : ''}` +
      `<span class="meta">${icon(KIND_ICON[r.kind] || 'star')}${T('k_' + r.kind)}${r.cc ? ' · ' + esc(region(r.cc)) : ''}</span></span></a>`
  }).join('')
  const langLinks = ''
  const inner = `<header><div class="w"><nav class="langs">${Object.entries(UI_LANGS).map(([k, v]) => `<a href="${q({ lang: k })}"${k === lang ? ' class="on"' : ''}>${esc(v)}</a>`).join('')}</nav>
<h1>${T('d_title')}</h1><a class="make" href="/make">${icon('plus-circle')}${T('d_make')}</a></div></header><main>
<nav class="chips"><a href="${q({ kind: '' })}"${!kind ? ' class="on"' : ''}>${T('d_all')}</a>${KINDS.map((k) => `<a href="${q({ kind: k })}"${k === kind ? ' class="on"' : ''}>${icon(KIND_ICON[k])}${T('k_' + k)}</a>`).join('')}</nav>
${ccs.length > 1 ? `<nav class="chips">${ccs.map((c) => `<a href="${q({ cc: c.cc === cc ? '' : c.cc })}"${c.cc === cc ? ' class="on"' : ''}>${esc(region(c.cc))} <small>${c.n}</small></a>`).join('')}</nav>` : ''}
${tiles ? `<div class="grid">${tiles}</div>` : `<p class="empty">${T('d_none')}</p>`}
${rows.length > 48 ? `<a class="more" href="${q({ before: rows[47].published })}">→</a>` : ''}</main>`
  return shell(lang, ui(lang, 'd_title'), inner, { langLinks })
}

/** Not found, being made, or taken down. A free address offers itself. */
export function notFound(free, request, status) {
  const lang = pickLang(request?.headers?.get('accept-language'))
  const T = (k) => esc(ui(lang, k))
  const msg = status === 'draft' ? T('nf_draft') : status === 'removed' ? T('nf_gone') : T('nf')
  const offer = free && /^[a-z0-9-]{3,30}$/.test(free)
    ? `<p>${T('nf_free')}</p><a class="make" href="/make#name=${esc(free)}">${icon('plus-circle')}${T('nf_make')} · sites.motdang.net/${esc(free)}</a>`
    : `<a class="make" href="/all">${T('d_title')}</a>`
  return shell(lang, msg, `<div class="nf"><svg viewBox="0 0 24 24" width="96" height="96" style="color:#d7261e" aria-hidden="true"><use href="/s/icons.svg#i-ant-solid"/></svg><h1 style="font:700 30px/1.2 system-ui">${msg}</h1>${offer}</div>`)
}

/** Held pages, reports, held photos, the latest events. */
export async function adminPage(env, sel = { sellers: [], due: [], gigs: [] }) {
  const held = (await env.DB.prepare("SELECT id, name, held_why, updated, d FROM site WHERE status='held' ORDER BY updated DESC LIMIT 100").all()).results
  const reps = (await env.DB.prepare('SELECT r.site_id, s.name, s.status, COUNT(*) AS n, GROUP_CONCAT(r.why, " | ") AS why FROM report r JOIN site s ON s.id = r.site_id GROUP BY r.site_id ORDER BY MAX(r.at) DESC LIMIT 50').all()).results
  const photos = (await env.DB.prepare("SELECT p.id, p.why, s.name FROM photo p JOIN site s ON s.id = p.site_id WHERE p.verdict='hold' ORDER BY p.created DESC LIMIT 60").all()).results
  const ev = (await env.DB.prepare('SELECT e.at, e.what, e.note, s.name FROM event e LEFT JOIN site s ON s.id = e.site_id ORDER BY e.at DESC LIMIT 80').all()).results
  const n = (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM site GROUP BY status").all()).results
  const pays = (await env.DB.prepare("SELECT p.id, p.amount, p.status, p.note, p.updated, s.name, s.id AS sid FROM pay p JOIN site s ON s.id = p.site_id WHERE p.status IN ('slip','paid') ORDER BY p.updated DESC LIMIT 60").all()).results
  const golds = (await env.DB.prepare("SELECT name, gold_until FROM site WHERE tier='gold' ORDER BY gold_until DESC LIMIT 100").all()).results
  const btn = (id, act, label) => `<form method="post" action="/admin/act" style="display:inline"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="act" value="${act}"><button>${label}</button></form>`
  const T = (rows, f) => `<table>${rows.map(f).join('')}</table>`
  return shell('en', 'Admin', `<main style="max-width:1100px;margin:0 auto;padding:16px"><style>table{width:100%;border-collapse:collapse;font-size:15px}td{border-bottom:1px solid #ddd;padding:6px;vertical-align:top}button{font:inherit;padding:4px 10px}</style>
<h1 style="font:800 34px system-ui">Pages · admin</h1><p>${n.map((r) => `${esc(r.status)} ${r.n}`).join(' · ')}</p>
<h2>Gold slips</h2>${T(pays, (p) => `<tr><td><a href="/${esc(p.name)}">${esc(p.name)}</a></td><td>฿${esc(p.amount)}</td><td>${esc(p.status)} ${esc(p.note || '')}</td><td>${esc(p.updated.slice(0, 16))}</td><td><a href="/admin/slip/${esc(p.id)}" target="_blank">slip</a></td><td>${p.status === 'slip' ? btn(p.id, 'pay-ok', 'Paid: make Gold') + ' ' + btn(p.id, 'pay-no', 'Not paid') : ''}</td></tr>`)}
<h2>Sellers</h2>${T(sel.sellers, (s) => `<tr><td>${s.kit && s.status === 'ok' ? `<a href="${esc(s.kit)}">${esc(s.name)}</a>` : esc(s.name)} <small>${esc(s.id)}</small></td><td>${esc(s.status)} · ${s.rate}%</td><td>${esc(s.phone || '')} ${esc(s.line || '')}<br><small>${esc(s.area || '')}</small></td><td>${s.via ? 'via ' + esc(s.via) : ''}</td><td>${s.status !== 'ok' ? btn(s.id, 'seller-on', 'Selling') : btn(s.id, 'seller-off', 'Stop')}</td></tr>`)}
<p>${sel.due.map((p) => `<a href="${esc(p.link)}">Pay ${esc(p.name)} ฿${p.baht} (${esc(p.month)})</a> ${btn(p.id, 'payout-paid', 'Paid')}`).join('<br>') || 'No payouts due.'}</p>
<h2 id="gigs">Page checks</h2><form method="post" action="/admin/gig"><input name="name" placeholder="page name" required> <select name="lang">${['my', 'en', 'zh', 'ja', 'ko', 'vi', 'km', 'lo', 'id', 'es', 'fr', 'th'].map((l) => `<option>${l}</option>`).join('')}</select> <input name="who" placeholder="who (or blank)"> <button>Make a link</button></form>
${T(sel.gigs || [], (g) => `<tr><td><a href="/${esc(g.name)}?hl=${esc(g.lang)}">${esc(g.name)}</a> ${esc(g.lang)}</td><td>${esc(g.who || '')}</td><td>posted ${esc(g.posted)}${g.taken ? ` · taken ${esc(g.taken)} · ${g.n} lines, ${g.changed} changed` : ''}</td><td><a href="${esc(g.link)}">link</a></td></tr>`)}
<h2>Gold pages</h2><p>${golds.map((g) => `<a href="/${esc(g.name)}">${esc(g.name)}</a> → ${esc(g.gold_until || '')}`).join(' · ') || '—'}</p>
<h2>Held</h2>${T(held, (s) => `<tr><td><a href="/${esc(s.name)}">${esc(s.name)}</a><br><small>${esc(JSON.parse(s.d).tagline || '')}</small></td><td>${esc(s.held_why || '')}</td><td>${esc(s.updated.slice(0, 16))}</td><td>${btn(s.id, 'live', 'Put live')} ${btn(s.id, 'remove', 'Remove')} ${btn(s.id, 'gold', 'Gold a year')}</td></tr>`)}
<h2>Reported</h2>${T(reps, (r) => `<tr><td><a href="/${esc(r.name)}">${esc(r.name)}</a> (${esc(r.status)})</td><td>${r.n}</td><td>${esc(r.why || '')}</td><td>${btn(r.site_id, 'hold', 'Hold')} ${btn(r.site_id, 'live', 'Put live')} ${btn(r.site_id, 'remove', 'Remove')}</td></tr>`)}
<h2>Held photos</h2>${T(photos, (p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.why || '')}</td><td>${btn(p.id, 'photo-ok', 'Show it')}</td></tr>`)}
<h2>Latest</h2>${T(ev, (e) => `<tr><td>${esc(e.at.slice(0, 16))}</td><td>${esc(e.what)}</td><td>${e.name ? esc(e.name) : ''}</td><td>${esc(e.note || '')}</td></tr>`)}</main>`)
}
