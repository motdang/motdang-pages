// online.mjs — the parts of an online business page (Nan 2026-10-26: "run an online business site";
// "everything except for portfolio site has lots of bells and whistles"). The packages as a price table,
// the questions and answers (with FAQPage data for search), the news sign-up box, and the two buttons at
// the top. render.mjs passes its helpers in, like amulet.mjs; make-online.mjs is the builder's side.

import { money } from './extras.mjs'
import { ow } from './words-online.mjs'

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)

export const ON_MAX = { faq: 40, faqFree: 12, cards: 3, points: 8 }
/** Questions a page shows: Gold 40, free 12. */
export const faqCap = (gold) => (gold ? ON_MAX.faq : ON_MAX.faqFree)

/** The questions and the sign-up box of `d`, cut to size. Called from normalize(). */
export function normalizeOnline(d, o) {
  o.faq = (Array.isArray(d.faq) ? d.faq : []).map((x) => ({ q: str(x?.q, 200), a: str(x?.a, 1500) })).filter((x) => x.q).slice(0, ON_MAX.faq)
  const s = d.signup && typeof d.signup === 'object' ? d.signup : {}
  o.signup = { on: !!s.on, t: str(s.t, 60), note: str(s.note, 160) }
  return o
}

/** The questions that show: both parts filled, the tier's number. */
export const faqShown = (d, gold) => d.faq.filter((x) => x.q && x.a).slice(0, faqCap(gold))

/** A package's note as the points of "what is in it": a line each, or split at ; · • on one line. */
export function pointsOf(note) {
  const lines = String(note || '').split(/\r?\n/).map((s) => s.replace(/^[\s\-–—•*·✓✔]+/, '').trim()).filter(Boolean)
  const pts = lines.length === 1 && /[;；•·]|\s\+\s/.test(lines[0]) ? lines[0].split(/\s*[;；•·]\s*|\s+\+\s+/).map((s) => s.trim()).filter(Boolean) : lines
  return pts.slice(0, ON_MAX.points)
}

/** The two buttons at the top of an online page: [main, second], each [href, word, icon] or null.
 *  The main one goes to the packages (Book a call on Gold, Ask on a free page); the second to the message form, or LINE when the page has no form. */
export function onlineCta({ d, gold, line, phone, tel }) {
  const packs = d.svc.length > 0
  // with packages: Book a call or Ask first, then the message form (LINE has its own button under the title); without: one button that talks
  const talk = d.msg ? ['#message', 'msg', 'mail'] : line ? [line, 'line', 'chat'] : phone ? [tel(phone), 'call', 'phone'] : null
  return packs ? [['#packages', gold ? 'pkgBook' : 'pkgAsk', gold ? 'cal' : 'chat'], talk] : [talk, null]
}

/** A price typed as 3200 reads 3,200; words and ranges stay as typed. */
const priceOf = (p) => (/^\d{4,}(\.\d+)?$/.test(String(p)) ? Number(p).toLocaleString('en-US', { maximumFractionDigits: 2 }) : p)

const attrs = (a) => (/^https?:/.test(a[0]) ? ' rel="nofollow noopener"' : '')

/** The button for the second place on the header (a ghost button beside the main one). */
export const ctaHtml = (a, { W, icon, esc, cls = '' }) => `<a class="btn cta${cls}" data-t="cta" href="${esc(a[0])}"${attrs(a)}>${icon(a[2])}${W(a[1])}</a>`

/** The packages: up to three as cards (name, price, minutes, what is in it, a button), the rest as rows.
 *  Gold: Book a call opens the booking times. Free: Ask goes to the message form, LINE or the phone. */
export function packagesSection(svc, h) {
  const { W, esc, H2, icon, sym, gold, askHref } = h
  const btn = (v, cls = '') => {
    if (gold) return `<button type="button" class="btn svcb pkgb${cls}" data-t="book" data-svc="${esc(v.id)}">${icon('cal')}${W('pkgBook')}</button>`
    const href = askHref(v.n)
    return href ? `<a class="btn pkgb${cls}" data-t="ask" data-ask="${esc(v.n)}" href="${esc(href)}"${attrs([href])}>${icon('chat')}${W('pkgAsk')}</a>` : ''
  }
  const cards = svc.slice(0, ON_MAX.cards), rest = svc.slice(ON_MAX.cards)
  const out = [`<section class="card rise pkgsec" id="packages">${H2('packages', W('packages'))}<ul class="pkgs n${cards.length}">`]
  for (const v of cards) {
    const pts = pointsOf(v.note)
    out.push(`<li class="pkg"><h3>${esc(v.n)}</h3>${v.p ? `<p class="pkp">${esc(money(priceOf(v.p), sym))}</p>` : ''}<p class="pkm">${icon('clock')}${W('bookMins', { m: v.mins })}</p>`,
      pts.length > 1 ? `<ul class="pki">${pts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : pts.length ? `<p class="pkn">${esc(pts[0])}</p>` : '',
      btn(v), '</li>')
  }
  out.push('</ul>')
  if (rest.length) {
    out.push(`<h3 class="pkmore">${W('pkgMore')}</h3><ul class="pkrows">`)
    for (const v of rest) out.push(`<li><span class="n">${esc(v.n)}<small>${W('bookMins', { m: v.mins })}</small></span><span class="p">${esc(money(priceOf(v.p), sym))}</span>${btn(v, ' small')}</li>`)
    out.push('</ul>')
  }
  if (gold) out.push('<div class="bookui" id="bookui" hidden></div>')
  out.push('</section>')
  return out.join('')
}

/** The questions as folds, a tap opens one. */
export function faqSection(list, h) {
  const { W, esc, H2, paras } = h
  return `<section class="card rise faq" id="faq">${H2('faq', W('faqT'))}` +
    list.map((x) => `<details class="qa"><summary>${esc(x.q)}</summary><div class="qa-a">${paras(x.a)}</div></details>`).join('') + '</section>'
}

/** FAQPage data for search engines: the questions that show, as plain text. */
export const faqLd = (list) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: list.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
})

/** The packages as schema.org offers, for the page's own data. */
export const packagesLd = (svc, cur) => ({
  '@type': 'OfferCatalog', name: 'Packages',
  itemListElement: svc.slice(0, 30).map((v) => {
    const m = /^\s*(?:฿|THB|\$|USD)?\s*(\d+(?:\.\d+)?)\s*(?:฿|บาท|baht|THB)?\s*$/i.exec(String(v.p).replace(/,/g, '')) // "3,000" yes; "from 3,000" or "3,000–5,000" no (CodeRabbit on #72)
    const num = m ? Number(m[1]) : 0
    return { '@type': 'Offer', itemOffered: { '@type': 'Service', name: v.n, description: v.note ? v.note.slice(0, 300) : undefined }, price: num > 0 ? num : undefined, priceCurrency: num > 0 ? cur || undefined : undefined }
  }),
})

/** The news sign-up box (Gold): a name if they like, an email, a Join button. The Worker mails a link to confirm first. */
export function signupSection(d, h) {
  const { W, esc, H2, icon, preview } = h
  const s = d.signup
  return `<section class="card rise signup" id="join">${H2('join', s.t ? esc(s.t) : W('joinT'))}<p>${s.note ? esc(s.note) : W('joinNote')}</p>` +
    (preview ? `<p style="color:var(--mute)">${W('joinPreview')}</p>` : '') +
    `<form class="msgf joinf" id="joinf"><input name="name" maxlength="80" autocomplete="name" placeholder="${W('joinName')}" aria-label="${W('joinName')}">` +
    `<input name="email" type="email" maxlength="254" autocomplete="email" required placeholder="${W('joinMail')}" aria-label="${W('joinMail')}">` +
    `<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
    `<button class="btn" type="submit" data-t="join"${preview ? ' disabled' : ''}>${icon('mail')}${W('joinGo')}</button></form></section>`
}

/** The words the page's own script (online-page.js) reads from #pd. */
export const onlineW = (lang) => ['joinSent', 'joinFail', 'joinBad', 'askPkg'].map((k) => [k, ow(lang, k)])

export const ONLINE_CSS = `.pkgs{list-style:none;margin:0;padding:0;display:grid;gap:14px}.pkg{display:flex;flex-direction:column;gap:6px;padding:18px;border-radius:calc(var(--r) + 4px);border:2px solid var(--line);background:var(--soft)}
.pkg h3{margin:0;font:800 21px/1.25 var(--display)}.pkp{margin:0;font:800 30px/1.1 var(--display);color:var(--acc-ink)}.pkm{display:flex;align-items:center;gap:6px;margin:0;color:var(--mute);font-weight:600;font-size:15px}.pkm .i{width:18px;height:18px}
.pki{list-style:none;margin:6px 0 4px;padding:0;display:grid;gap:6px}.pki li{position:relative;padding-left:26px}.pki li::before{content:"";position:absolute;left:3px;top:.5em;width:10px;height:6px;border-left:3px solid var(--accent);border-bottom:3px solid var(--accent);transform:rotate(-45deg)}
.pkn{margin:4px 0}.pkg .btn,.pkrows .btn{margin-top:auto}
.pkgs .svcb.pkgb,.pkrows .svcb.pkgb{width:100%;justify-content:center;text-align:center;padding:10px 16px;border:0;background:var(--accent);color:var(--on-accent);font:700 17px/1.2 var(--body);box-shadow:none}.pkgs .svcb.pkgb.on,.pkrows .svcb.pkgb.on{box-shadow:0 0 0 3px var(--ink)}
.pkmore{margin:22px 0 6px;font:700 14px/1.2 var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}.pkrows{list-style:none;margin:0;padding:0}
.pkrows li{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px dashed var(--line)}.pkrows li:last-child{border:0}.pkrows .n{flex:1;font-weight:700}.pkrows small{display:block;font-weight:400;color:var(--mute);font-size:14px}.pkrows .p{font-weight:800;white-space:nowrap}
.pkrows .btn.small{min-height:44px;width:auto;margin:0;padding:6px 14px;font-size:15px}
@media(min-width:640px){.pkgs.n2{grid-template-columns:1fr 1fr}.pkgs.n3{grid-template-columns:repeat(3,1fr)}}
.qa{border-bottom:1px dashed var(--line)}.qa:last-child{border:0}.qa summary{display:flex;align-items:center;justify-content:space-between;gap:14px;list-style:none;cursor:pointer;min-height:56px;padding:12px 0;font-weight:700}
.qa summary::-webkit-details-marker{display:none}.qa summary::after{content:"+";flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--soft);font:700 20px/1 var(--body)}.qa[open] summary::after{content:"–"}
.qa-a{padding:0 0 14px}.qa-a p{margin:0 0 10px}
.signup .joinf .btn{width:100%}
.top .ctas{display:inline-flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:100%;margin-top:18px;order:6}.top .ctas .cta{flex:1 1 auto;justify-content:center;margin-top:0}`
