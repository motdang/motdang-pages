// picks.mjs — a Gold page's swatch book (Nan 2026-10-28, for Fashion King: "choose a fabric"): groups of
// things a customer chooses before coming in — cloth, colours, tiles, frames — each a photo and a code.
// A tap picks one; the picks go into the booking note, the message and the LINE text (page.js).

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)
const ID = /^[a-z0-9]{4,12}$/
const PHOTO_ID = /^[a-z0-9]{12,24}$/
const idOf = (v, i) => (ID.test(v || '') ? v : 'g' + i.toString(36).padStart(3, '0'))

export const PK_MAX = { groups: 12, items: 80, total: 240, picks: 8 }

/** d.picks = { t, groups: [{ id, t, note, p, items: [{ c, ph, n }] }] }: a title, groups, and in each group photos with a code. */
export function normalizePicks(d, o) {
  const s = d.picks && typeof d.picks === 'object' && !Array.isArray(d.picks) ? d.picks : {}
  const ids = new Set()
  let left = PK_MAX.total
  const groups = []
  for (const [i, g] of (Array.isArray(s.groups) ? s.groups : []).slice(0, PK_MAX.groups).entries()) {
    let id = idOf(g?.id, i)
    while (ids.has(id)) id = 'g' + (i + ids.size).toString(36) + 'z'
    ids.add(id)
    const items = (Array.isArray(g?.items) ? g.items : [])
      .map((x) => ({ c: str(x?.c, 24), ph: PHOTO_ID.test(x?.ph || '') ? x.ph : '', n: str(x?.n, 80) }))
      .filter((x) => x.ph).slice(0, Math.min(PK_MAX.items, left))
    left -= items.length
    const t = str(g?.t, 60)
    if (t || items.length) groups.push({ id, t, note: str(g?.note, 240), p: str(g?.p, 24), items })
  }
  o.picks = { t: str(s.t, 40), groups }
  return o
}

/** Every photo id the swatch book uses. */
export const pickPhotos = (pk) => (pk?.groups || []).flatMap((g) => g.items.map((x) => x.ph))

/** A swatch's name in a message: its code, else the group and its number. */
export const pickName = (g, x, i) => x.c || `${g.t || '#'} ${i + 1}`

/** The swatch book on the page. Gold only; nothing when it holds no photos. */
export function picksSection(pk, h) {
  const { W, esc, H2, img, sym, money } = h
  const groups = pk.groups.filter((g) => g.items.length)
  if (!groups.length) return ''
  const title = pk.t || W('pkT')
  const out = [`<section class="card rise picks" id="picks" data-max="${PK_MAX.picks}" data-title="${esc(title)}">${H2('picks', esc(title))}<p class="pk-hint">${W('pkHint')}</p>`]
  if (groups.length > 1) out.push(`<nav class="pk-go" aria-label="${esc(title)}">${groups.map((g) => `<a href="#pick-${esc(g.id)}" data-t="pkgroup">${esc(g.t || title)}</a>`).join('')}</nav>`)
  for (const g of groups) {
    out.push(`<div class="pk-g" id="pick-${esc(g.id)}"><div class="pk-h"><h3>${esc(g.t || title)}</h3>`,
      g.p ? `<span class="pk-p">${W('pkFrom', { p: esc(money(g.p, sym)) })}</span>` : '', '</div>',
      g.note ? `<p class="pk-note">${esc(g.note)}</p>` : '',
      `<div class="pk-grid">`)
    g.items.forEach((x, i) => {
      const nm = pickName(g, x, i)
      out.push(`<button type="button" class="pk-sw" data-t="pick" data-sw="${esc(nm)}" aria-pressed="false" title="${esc(x.n || nm)}">`,
        `<img src="${esc(img(x.ph, true))}" alt="${esc(x.n || nm)}" loading="lazy"><span class="pk-code">${esc(nm)}</span><span class="pk-tick" aria-hidden="true"></span></button>`)
    })
    out.push('</div></div>')
  }
  // the tray: what is picked, and where it goes (page.js fills and shows it)
  out.push(`<div class="pk-tray" id="pk-tray" hidden aria-live="polite"><div class="pk-chips"></div><div class="pk-acts">`,
    h.book ? `<a class="btn" data-t="pkbook" href="${esc(h.book)}">${h.icon('cal')}${W('pkBook')}</a>` : '',
    h.line ? `<a class="btn line" data-t="pkline" href="${esc(h.line)}"${h.oa ? ` data-oa="${esc(h.oa)}"` : ''} rel="nofollow noopener">${h.icon('chat')}${W('pkLine')}</a>` : '',
    h.msg ? `<a class="btn ghost" data-t="pkask" href="#message">${h.icon('mail')}${W('pkAsk')}</a>` : '',
    `<button type="button" class="pk-clear">${W('pkClear')}</button></div></div></section>`)
  return out.join('')
}

export const PICKS_CSS = `.picks .pk-hint{margin:-4px 0 12px;color:var(--mute)}
.pk-go{display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;margin:0 0 14px;padding:2px 0 6px;scrollbar-width:none}.pk-go a{flex:none;padding:8px 14px;border-radius:99px;background:var(--soft);font:700 15px/1.2 var(--body);color:var(--ink);text-decoration:none}
.pk-g{scroll-margin-top:84px;margin:0 0 22px}.pk-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px}
.pk-h h3{margin:0;font:800 20px/1.25 var(--display)}.pk-p{font:800 16px/1.2 var(--body);color:var(--acc-ink)}.pk-note{margin:4px 0 0;color:var(--mute)}
.pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:10px;margin:10px 0 0}
.pk-sw{position:relative;display:flex;flex-direction:column;gap:4px;padding:0;border:0;background:none;color:var(--ink);cursor:pointer;text-align:center}
.pk-sw img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);transition:transform .15s,box-shadow .15s}
.pk-sw .pk-code{font:700 13px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.02em;overflow-wrap:anywhere}
.pk-sw .pk-tick{position:absolute;right:6px;top:6px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:none;place-items:center;font:900 15px/1 var(--body);box-shadow:0 2px 6px rgba(0,0,0,.3)}
.pk-sw .pk-tick::after{content:"✓"}
.pk-sw[aria-pressed=true] img{outline:4px solid var(--accent);outline-offset:-4px;transform:scale(.94)}.pk-sw[aria-pressed=true] .pk-tick{display:grid}
.pk-sw:focus-visible img{outline:3px solid var(--ink);outline-offset:2px}
.pk-tray{position:sticky;bottom:calc(84px + env(safe-area-inset-bottom));z-index:5;margin:8px -4px 0;padding:12px;border-radius:var(--r);background:var(--card);box-shadow:0 6px 24px rgba(0,0,0,.18),inset 0 0 0 2px var(--accent)}
.pk-chips{display:flex;flex-wrap:nowrap;gap:6px;margin:0 0 10px;overflow-x:auto;scrollbar-width:none}.pk-chips button{flex:none}.pk-chips button{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border:0;border-radius:99px;background:var(--soft);color:var(--ink);font:700 14px/1.2 ui-monospace,Menlo,monospace;cursor:pointer}
.pk-chips img{width:28px;height:28px;border-radius:50%;object-fit:cover}.pk-chips button::after{content:"×";font:800 16px/1 var(--body);color:var(--mute)}
.pk-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.pk-acts .btn{margin:0;min-height:48px}
.pk-clear{justify-self:start;padding:6px 2px;border:0;background:none;color:var(--mute);font:600 14px var(--body);text-decoration:underline;cursor:pointer}
`
