// support.mjs — /support, for people far away who want to back Mot Dang (NaN 2026-10-17):
// "either thru simply using the product, voluneership, paid contributions, or investment.
// Create a portal that allows all these actions, distinct from tasking platform."
//
//   /support          Use · Volunteer · Pay · Invest, in Thai and English, counts read live
//   /support/tip      a PromptPay QR for a tip (?b=100|500|1000|5000, none for any amount)
//
// A volunteer's sign-up posts to #people-team. An investor's note goes to NaN's mail
// (INVEST_TO) and a line without the contact to #core-plan. Both are backer rows.
// Paid tasks stay at motdang.net/anthill/work; this page links there once, in the footer.

import { promptPayPayload } from './promptpay.mjs'
import { qrSvg } from '../public/s/render.mjs'
import * as founding from './founding.mjs'
import { mail } from './msg.mjs'

export const TIPS = [100, 500, 1000, 5000] // baht; the giver picks, or types any amount
export const RUNGS = [100000, 200000, 500000, 1000000] // the investor minimum's ladder (Red Ant Plan, 2026-10-16)
export const HELP = [
  ['translate', 'แปล', 'Translate'],
  ['photos', 'ถ่ายรูปสถานที่', 'Photos of places'],
  ['code', 'เขียนโค้ด', 'Code'],
  ['draw', 'วาดรูป ตัดวิดีโอ', 'Drawing and video'],
  ['write', 'เขียน', 'Writing'],
  ['tell', 'บอกต่อ โพสต์', 'Telling people, posting'],
  ['test', 'ลองใช้บนมือถือ', 'Testing on a phone'],
]
export const HOURS = ['1', '2-5', '5+']
const KOFI = 'https://ko-fi.com/defiantchiangmai'
const PLAN = 'https://motdang.github.io/red-ant-plan/'
const PLANS = 'https://motdang.github.io/business-plan/'
const MAIN = 'https://motdang.net'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
/** Both languages; the page shows the reader's (html[data-l]). */
const t = (th, en) => `<span class="th">${th}</span><span class="en">${en}</span>`
const cut = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** th when the browser asks for Thai first, else en; ?l= wins. */
export function langOf(request, url) {
  const q = url.searchParams.get('l')
  if (q === 'th' || q === 'en') return q
  return /^th\b/i.test(request.headers.get('accept-language') || '') ? 'th' : 'en'
}

/** A form's fields as a backer row, or null when the name or contact is missing. */
export function rowOf(kind, f, lang) {
  const name = cut(f.get('name'), 60), contact = cut(f.get('contact'), 120)
  if (!name || !contact) return null
  const r = { kind, name, contact, place: cut(f.get('place'), 80) || null, note: cut(f.get('note'), 600) || null, lang, what: null, langs: null, hours: null }
  if (kind === 'volunteer') {
    r.what = f.getAll('what').map(String).filter((w) => HELP.some(([k]) => k === w)).join(',') || null
    r.langs = cut(f.get('langs'), 80) || null
    r.hours = HOURS.includes(String(f.get('hours'))) ? String(f.get('hours')) : null
  } else {
    const a = Number(f.get('amount'))
    r.what = RUNGS.includes(a) || a === -1 ? String(a) : null
  }
  return r
}

const amountWords = (w) => (w === '-1' ? 'more than ฿1,000,000' : w ? '฿' + nf(Number(w)) : 'not said')
const helpWords = (w) => (w || '').split(',').filter(Boolean).map((k) => HELP.find((h) => h[0] === k)?.[2] || k).join(', ')

/** Saves the row and tells the team. Returns where it was told. */
export async function keep(env, r, rand, post) {
  const id = rand(12), now = new Date().toISOString()
  let told = []
  if (r.kind === 'volunteer') {
    const s = await post.people(`🙋 **Volunteer** · ${r.name}${r.place ? ' · ' + r.place : ''}\n${helpWords(r.what) || 'anything'}${r.langs ? ' · languages: ' + r.langs : ''}${r.hours ? ' · ' + r.hours + ' h a week' : ''}\n${r.contact}${r.note ? '\n> ' + r.note.slice(0, 300) : ''}`).catch(() => 'error')
    if (s === 'sent') told.push('discord')
  } else {
    const to = env.INVEST_TO || 'nan@motdang.net'
    const lines = [`Name: ${r.name}`, `Contact: ${r.contact}`, `Where: ${r.place || '—'}`, `Amount: ${amountWords(r.what)}`, `Page language: ${r.lang}`, '', r.note || '']
    const ok = await mail(env, { to, subject: `Investor note · ${r.name} · ${amountWords(r.what)}`, text: lines.join('\n'), html: `<pre style="font:15px/1.5 system-ui">${esc(lines.join('\n'))}</pre>`, replyTo: /@/.test(r.contact) ? r.contact : undefined })
    if (ok) told.push('mail')
    const s = await post.core(`🪙 **Investor note** · ${r.name}${r.place ? ' · ' + r.place : ''} · ${amountWords(r.what)}\nContact and note: NaN's mail${ok ? '' : ' (the mail failed; the row is in D1 backer ' + id + ')'}`).catch(() => 'error')
    if (s === 'sent') told.push('discord')
  }
  await env.DB.prepare('INSERT INTO backer (id, kind, name, contact, place, what, langs, hours, note, lang, made, told) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, r.kind, r.name, r.contact, r.place, r.what, r.langs, r.hours, r.note, r.lang, now, told.join(',') || null).run()
  return told
}

/** The counts on the page, read from the tables. */
async function counts(env) {
  const one = (sql) => env.DB.prepare(sql).first().then((r) => r?.n || 0).catch(() => 0)
  const [pages, founders, volunteers, month] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM site WHERE status = 'live'"),
    one("SELECT COUNT(*) AS n FROM founder WHERE status = 'paid'"),
    one("SELECT COUNT(*) AS n FROM backer WHERE kind = 'volunteer'"),
    founding.thisMonth(env).catch(() => null),
  ])
  return { pages, founders, volunteers, month }
}

// ---- pages -------------------------------------------------------------------------

const CSS = `:root{--ink:#1c1530;--paper:#fff8e7;--gold:#f5c518;--line:#06c755;--navy:#0e1f3d;--soft:#4a4458}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:12px}
body{margin:0;font:17px/1.5 system-ui,-apple-system,"Noto Sans Thai",sans-serif;color:var(--ink);background:var(--paper)}
html[data-l=th] .en,html[data-l=en] .th{display:none}
#sky{position:fixed;inset:0;width:100vw;height:100vh;height:100lvh;z-index:0;display:block;background:linear-gradient(#bfe3ff,#fff8e7)}
.wrap{position:relative;z-index:1}
.hero{min-height:100vh;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-start;padding:64px 16px 26px;max-width:640px;margin:0 auto;cursor:pointer}
.lang{position:absolute;top:14px;right:16px;background:#fff;border:2px solid var(--ink);border-radius:999px;padding:6px 14px;font-weight:800;color:var(--ink);text-decoration:none;font-size:15px}
.plate{background:rgba(255,248,231,.94);border:2px solid var(--ink);border-radius:18px;padding:16px 16px 14px;box-shadow:6px 6px 0 var(--ink)}
h1{font-size:clamp(30px,8vw,46px);line-height:1.08;margin:0 0 6px;letter-spacing:-.5px}
.lede{margin:0 0 14px;font-size:18px}
.four{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.four a{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid var(--ink);border-radius:14px;padding:12px;font-weight:800;font-size:18px;color:var(--ink);text-decoration:none;min-height:60px}
.four a:active{transform:translate(2px,2px)}
.four a i{width:30px;height:30px;flex:none;display:inline-block}
.four a.pay{background:var(--gold);color:#000}
.count{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 0;font-size:15px;color:var(--soft)}.count b{color:var(--ink);font-size:17px}
section{background:var(--paper);border-top:2px solid var(--ink)}
section>div{max-width:640px;margin:0 auto;padding:30px 16px 36px}
h2{font-size:30px;margin:0 0 4px;display:flex;align-items:center;gap:10px}h2 i{width:40px;height:40px;display:inline-block}
h3{font-size:19px;margin:22px 0 6px}
.sub{margin:0 0 14px;color:var(--soft)}
.card{background:#fff;border:2px solid var(--ink);border-radius:14px;padding:14px;margin:10px 0}
.go{display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--ink);text-decoration:none}
.go b{font-size:18px}.go small{display:block;color:var(--soft);font-size:15px}.go:after{content:"→";font-weight:800;font-size:22px}
.btn,button{display:inline-block;font:inherit;font-weight:800;padding:14px 16px;border-radius:12px;border:2px solid var(--ink);cursor:pointer;background:var(--gold);color:#000;text-decoration:none;text-align:center}
.wide{width:100%}.ghost{background:#fff;color:var(--ink)}.lineb{background:var(--line);color:#fff;border-color:var(--line)}
.amt{font-size:34px;font-weight:800;margin:2px 0}.hint{font-size:15px;color:var(--soft)}
.seats{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.seats i{width:13px;height:13px;border-radius:4px;border:2px solid var(--ink);background:var(--gold)}.seats i.t{background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.chips a{background:#fff;border:2px solid var(--ink);border-radius:999px;padding:9px 14px;font-weight:800;color:var(--ink);text-decoration:none}
label{display:block;font-weight:700;margin:12px 0 4px}
input,select,textarea{font:inherit;width:100%;padding:12px;border:2px solid var(--ink);border-radius:10px;background:#fff;color:var(--ink)}textarea{min-height:84px}
.ticks{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.ticks label{display:flex;gap:8px;align-items:center;font-weight:400;margin:0}.ticks input{width:auto;transform:scale(1.3)}
.ok{background:#e6f7ec;border:2px solid #0a7a32;color:#0a5a26;border-radius:12px;padding:12px;font-weight:800}
.hp{position:absolute;left:-9999px}
.window{cursor:pointer;height:46vh;height:46svh;border-top:2px solid var(--ink)}
ul.now{padding-left:0;list-style:none;margin:0}
footer{position:relative;z-index:1;background:var(--navy);color:#fff;text-align:center;padding:22px 16px 30px;font-size:15px}footer a{color:#fff}
/* #card: the 1200×630 share card, drawn from this page (tools: Chrome --headless --screenshot) */
html.cardmode .lang,html.cardmode .count,html.cardmode .four,html.cardmode .lede,html.cardmode section,html.cardmode .window,html.cardmode footer{display:none!important}
html.cardmode .th,html.cardmode .en{display:block!important}
html.cardmode .hero{padding:0;max-width:none;min-height:630px}
html.cardmode .plate{position:absolute;left:56px;top:46px;width:640px;padding:24px 30px}
html.cardmode h1{font-size:62px;line-height:1.04;white-space:nowrap}
.card4{display:none}html.cardmode .card4{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;font:800 30px/1.3 system-ui,"Noto Sans Thai",sans-serif}
html.cardmode .card4 span{display:block;background:#fff;border:2px solid var(--ink);border-radius:12px;padding:10px 14px}html.cardmode .card4 span.g{background:var(--gold);color:#000}
html.cardmode .site{display:block;margin-top:14px;font:700 24px system-ui;color:var(--soft)}.site{display:none}
@media (max-width:380px){.four a{font-size:16px;padding:10px}.ticks{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`

function shell({ lang, title, desc, body, nonce, index }) {
  return `<!doctype html><html lang="${lang}" data-l="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><link rel="icon" href="/s/ant.svg">
${index ? `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="https://sites.motdang.net/support">
<meta property="og:type" content="website"><meta property="og:url" content="https://sites.motdang.net/support"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://sites.motdang.net/s/support-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Support motdang: use it, volunteer, pay, invest"><meta name="twitter:card" content="summary_large_image">` : '<meta name="robots" content="noindex">'}
<style>${CSS}</style></head><body>${body}</body></html>`
}

/** The counts that are above zero. */
const tally = (c) => {
  const s = [[c.pages, 'หน้าบน sites.motdang.net', 'pages on sites.motdang.net'], [c.founders, 'สมาชิกผู้ก่อตั้ง', 'founding members'], [c.volunteers, 'อาสา', 'volunteers']]
    .filter(([n]) => n > 0).map(([n, th, en]) => `<span><b>${nf(n)}</b> ${t(th, en)}</span>`).join('')
  return s ? `<p class="count">${s}</p>` : ''
}
const icon = (n) => `<i data-dingbat="${n}" data-look="ink" data-play="hover" aria-hidden="true"></i>`

/** /support */
export async function page(env, { lang, ok, nonce, promptpay }) {
  const c = await counts(env)
  const m = c.month
  const seats = m ? Array.from({ length: m.seats }, (_, i) => `<i${i < m.seats - m.left ? ' class="t"' : ''}></i>`).join('') : ''
  const done = (k) => ok === k ? `<p class="ok" role="status">${k === 'v' ? t('✓ ได้แล้ว ใบสมัครของคุณถึงทีมแล้ว', '✓ Got it. Your sign-up is with the team.') : t('✓ ส่งถึงแนนแล้ว', '✓ Sent to NaN.')}</p>` : ''
  const other = lang === 'th' ? 'en' : 'th'
  const body = `<canvas id="sky" aria-hidden="true"></canvas>
<div class="wrap">
<header class="hero"><a class="lang" id="lang" href="?l=${other}" hreflang="${other}">${lang === 'th' ? 'EN' : 'ไทย'}</a>
<div class="plate"><h1>${t('ช่วยมดแดง', 'Support motdang')}</h1>
<p class="lede">${t('ช่วยได้จากทุกที่ เลือกหนึ่งอย่าง', 'From anywhere. Pick one.')}</p>
<nav class="four"><a href="#use" data-t="use">${icon('compass')}${t('ใช้', 'Use it')}</a><a href="#volunteer" data-t="volunteer">${icon('wai')}${t('อาสา', 'Volunteer')}</a><a href="#pay" class="pay" data-t="pay">${icon('coin')}${t('จ่าย', 'Pay')}</a><a href="#invest" data-t="invest">${icon('rocket')}${t('ลงทุน', 'Invest')}</a></nav>
${tally(c)}<div class="card4" aria-hidden="true"><span>ใช้ · Use it</span><span>อาสา · Volunteer</span><span class="g">จ่าย · Pay</span><span>ลงทุน · Invest</span></div><p class="site" aria-hidden="true">sites.motdang.net/support</p></div>
</header>

<section id="use"><div>
<h2>${icon('compass')}${t('ใช้', 'Use it')}</h2>
<p class="sub">${t('ฟรี', 'Free.')}</p>
<a class="card go" href="${MAIN}/"><span><b>${t('ค้นหาเชียงใหม่ เชียงราย', 'Search Chiang Mai and Chiang Rai')}</b><small>motdang.net</small></span></a>
<a class="card go" href="/make"><span><b>${t('ทำหน้าให้ร้านที่คุณรัก', 'Make a page for a shop you love')}</b><small>${t('ฟรี ทำได้ทุกประเทศ จากมือถือ', 'Free, any country, from a phone')}</small></span></a>
<a class="card go" href="${MAIN}/sites/expat-toolkit/"><span><b>${t('ชุดเอาตัวรอดสำหรับชาวต่างชาติ', 'Expat Survival Toolkit')}</b><small>${t('วีซ่า เอกสาร บ้าน ถนน สุขภาพ จากมดแดง หงส์ดำ โต๊ะวีซ่าเชียงใหม่', 'Visas, papers, homes, roads, health, from Mot Dang, Hongdam and Chiang Mai Visa Desk')}</small></span></a>
<a class="card go" href="${MAIN}/sites/"><span><b>${t('มินิไซต์', 'Minisites')}</b><small>${t('ผี โคมลอย สะพาน ฝน กะเพรา', 'Ghosts, lanterns, bridges, rain, krapow')}</small></span></a>
<button type="button" class="wide ghost" id="send" data-t="send">${t('ส่งมดแดงให้คนที่อยู่เมืองไทย', 'Send motdang to someone in Thailand')}</button>
</div></section>

<section id="volunteer"><div>
<h2>${icon('wai')}${t('อาสา', 'Volunteer')}</h2>
<p class="sub">${t('ไม่มีค่าจ้าง ทำจากที่ไหนก็ได้', 'Unpaid, from wherever you are.')}</p>
${done('v')}
<h3>${t('เริ่มได้เลยตอนนี้', 'Start now')}</h3>
<ul class="now">
<li><a class="card go" href="/make"><span><b>${t('ทำหน้าให้ร้านที่คุณรู้จัก', 'Make a page for a shop you know')}</b><small>${t('ใส่รูป เวลาเปิด LINE ของร้าน', 'Its photos, its hours, its LINE')}</small></span></a></li>
<li><a class="card go" href="https://github.com/motdang"><span><b>${t('โค้ดบน GitHub', 'Code on GitHub')}</b><small>github.com/motdang</small></span></a></li>
<li><a class="card go" href="${MAIN}/security"><span><b>${t('หาช่องโหว่', 'Find a security bug')}</b><small>${t('ค่าหัว ฿1,000', '฿1,000 bounty')}</small></span></a></li>
</ul>
<h3>${t('สมัครเป็นอาสา', 'Sign up')}</h3>
<form method="post" action="/support/volunteer" class="card"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="lang" value="${lang}">
<label>${t('ชื่อ', 'Name')}<input name="name" required maxlength="60" autocomplete="name"></label>
<label>${t('อีเมล LINE หรือเบอร์โทร', 'Email, LINE or phone')}<input name="contact" required maxlength="120" autocomplete="email"></label>
<label>${t('อยู่ที่ไหน', 'Where you are')}<input name="place" maxlength="80" placeholder="Lisbon · Yangon · ลำพูน" autocomplete="address-level2"></label>
<label>${t('อยากช่วยเรื่อง', 'What you would like to do')}</label>
<div class="ticks">${HELP.map(([k, th, en]) => `<label><input type="checkbox" name="what" value="${k}">${t(th, en)}</label>`).join('')}</div>
<label>${t('แปลภาษาอะไรได้บ้าง', 'Languages you translate')}<input name="langs" maxlength="80" placeholder="ไทย, English, မြန်မာ, 中文"></label>
<label>${t('ชั่วโมงต่อสัปดาห์', 'Hours a week')}<select name="hours"><option value="">—</option>${HOURS.map((h) => `<option value="${h}">${h}</option>`).join('')}</select></label>
<label>${t('อยากบอกอะไรเพิ่ม', 'Anything else')}<textarea name="note" maxlength="600"></textarea></label>
<p><button class="wide" type="submit">${t('สมัคร', 'Sign me up')}</button></p></form>
</div></section>
<div class="window" aria-hidden="true"></div>
<section id="pay"><div>
<h2>${icon('coin')}${t('จ่าย', 'Pay')}</h2>
${m ? `<div class="card"><h3 style="margin-top:0">${t('สมาชิกผู้ก่อตั้ง', 'Founding member')}</h3><p class="amt">฿${nf(m.price)}</p>
<p>${t('ทอง 2 ปี ใช้เองหนึ่ง ให้ใครอีกหนึ่ง และเลขของคุณบนกำแพง', 'Two Gold years for pages on sites.motdang.net, one to keep and one to give, and your number on the wall.')}</p>
<div class="seats" aria-label="${m.left} / ${m.seats}">${seats}</div><p class="hint">${t(`เหลือ ${m.left} จาก ${m.seats} ที่ เดือนนี้ · ทองจ่ายล่วงหน้า ไม่ใช่หุ้น`, `${m.left} of ${m.seats} seats left this month · Prepaid Gold, not a share`)}</p>
<a class="btn wide" href="/founders">${t(`เป็นสมาชิก ฿${nf(m.price)}`, `Join for ฿${nf(m.price)}`)}</a></div>` : ''}
<div class="card"><h3 style="margin-top:0">${t('ทิป', 'Tip')}</h3>
<p>${t('บัตรหรือ PayPal จากต่างประเทศ', 'Card or PayPal, from any country')}</p>
<a class="btn wide" href="${KOFI}" rel="noopener" data-t="kofi">${t('ทิปผ่าน Ko-fi', 'Tip on Ko-fi')}</a>
${promptpay ? `<p style="margin-top:16px">${t('พร้อมเพย์ จากแอปธนาคารไทย', 'PromptPay, from a Thai bank app')}</p>
<div class="chips">${TIPS.map((b) => `<a href="/support/tip?b=${b}&amp;l=${lang}">฿${nf(b)}</a>`).join('')}<a href="/support/tip?l=${lang}">${t('ใส่เอง', 'Any amount')}</a></div>` : ''}</div>
</div></section>
<div class="window" aria-hidden="true"></div>
<section id="invest"><div>
<h2>${icon('rocket')}${t('ลงทุน', 'Invest')}</h2>
<p class="sub">${t(`ส่วนแบ่งรายได้ เริ่มที่ ฿${nf(RUNGS[0])}`, `A share of revenue, from ฿${nf(RUNGS[0])}.`)}</p>
${done('i')}
<a class="card go" href="${PLAN}"><span><b>${t('แผนมดแดง', 'The Red Ant Plan')}</b><small>${t('เงื่อนไข ตัวเลข และสามงวด', 'The terms, the numbers, the three draws')}</small></span></a>
<a class="card go" href="${PLANS}"><span><b>${t('เอกสารแผนทั้งหมด', 'Every plan document')}</b><small>motdang.github.io/business-plan</small></span></a>
<form method="post" action="/support/invest" class="card"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="lang" value="${lang}">
<h3 style="margin-top:0">${t('คุยกับแนน', 'Talk to NaN')}</h3>
<label>${t('ชื่อ', 'Name')}<input name="name" required maxlength="60" autocomplete="name"></label>
<label>${t('อีเมล', 'Email')}<input name="contact" type="email" required maxlength="120" autocomplete="email"></label>
<label>${t('อยู่ที่ไหน', 'Where you are')}<input name="place" maxlength="80" autocomplete="country-name"></label>
<label>${t('ประมาณเท่าไร', 'About how much')}<select name="amount"><option value="">—</option>${RUNGS.map((r) => `<option value="${r}">฿${nf(r)}</option>`).join('')}<option value="-1">฿1,000,000+</option></select></label>
<label>${t('ข้อความ', 'Note')}<textarea name="note" maxlength="600"></textarea></label>
<p><button class="wide" type="submit">${t('ส่งถึงแนน', 'Send to NaN')}</button></p></form>
<p class="hint">${t(`ต่ำกว่า ฿${nf(RUNGS[0])}:`, `Under ฿${nf(RUNGS[0])}:`)} <a href="#pay">${t('สมาชิกผู้ก่อตั้ง', 'founding membership')}</a></p>
</div></section>
</div>
<footer><p>motdang.net Co., Ltd. · ${t('เชียงราย', 'Chiang Rai')} · DBD 0575569006139</p>
<p><a href="${MAIN}/">motdang.net</a> · <a href="/">sites.motdang.net</a> · <a href="${MAIN}/anthill/work">${t('งานมีค่าจ้าง', 'Paid tasks')}</a></p></footer>
<script type="application/json" id="sd">${JSON.stringify({ lang }).replace(/</g, '\\u003c')}</script>
<script src="/s/support.js?v=2" defer></script>`
  const desc = 'Use motdang, volunteer, pay or invest, from anywhere. ช่วยมดแดงได้จากทุกที่: ใช้ อาสา จ่าย ลงทุน'
  return shell({ lang, title: lang === 'th' ? 'ช่วยมดแดง · Support motdang' : 'Support motdang · ช่วยมดแดง', desc, body, nonce, index: true })
}

/** /support/tip — a PromptPay QR for the amount, or an open amount. */
export function tipPage(env, { lang, b }) {
  const baht = TIPS.includes(b) ? b : 0
  const qr = env.PROMPTPAY ? qrSvg(promptPayPayload({ payeeId: env.PROMPTPAY, satang: baht * 100, oneTime: !!baht, merchantName: 'Mot Dang', ref: 'TIP' }), { dark: '#1c1530', light: '#ffffff', label: 'PromptPay' }) : ''
  const body = `<main style="max-width:520px;margin:0 auto;padding:22px 16px 40px;position:relative;z-index:1">
<h1>${t('ทิปมดแดง', 'Tip motdang')}</h1>
<p class="amt">${baht ? '฿' + nf(baht) : t('ใส่จำนวนเอง', 'Any amount')}</p>
<div style="background:#fff;border:2px solid #1c1530;border-radius:16px;padding:10px;max-width:300px;margin:12px auto">${qr.replace('<svg', '<svg style="width:100%;height:auto;display:block"')}</div>
<p class="hint" style="text-align:center">${t('พร้อมเพย์ · สแกนในแอปธนาคาร', 'PromptPay · scan in a Thai bank app')}</p>
<div class="chips" style="justify-content:center">${TIPS.map((x) => `<a href="/support/tip?b=${x}&amp;l=${lang}">฿${nf(x)}</a>`).join('')}<a href="/support/tip?l=${lang}">${t('ใส่เอง', 'Any')}</a></div>
<p style="text-align:center"><a class="btn ghost" href="/support?l=${lang}#pay">← ${t('ช่วยมดแดง', 'Support motdang')}</a></p></main>`
  return shell({ lang, title: 'Tip · motdang', body })
}

const note = (lang, th, en) => shell({ lang, title: 'motdang', body: `<main style="max-width:520px;margin:0 auto;padding:30px 16px"><p style="font-size:19px">${t(esc(th), esc(en))}</p><p><a href="/support?l=${lang}">← /support</a></p></main>` })

// ---- routes -------------------------------------------------------------------------

/** Answers /support and its paths; null for anything else. */
export async function route(request, env, path, url, H) {
  if (path !== '/support' && !path.startsWith('/support/')) return null
  const lang = langOf(request, url)
  if (request.method === 'GET' && (path === '/support' || path === '/support/')) {
    const ok = /^[vi]$/.test(url.searchParams.get('ok') || '') ? url.searchParams.get('ok') : ''
    return H.html(await page(env, { lang, ok, promptpay: !!env.PROMPTPAY }), 200, { cache: ok ? 'no-cache' : 'public, max-age=60' })
  }
  if (request.method === 'GET' && path === '/support/tip') return H.html(tipPage(env, { lang, b: Number(url.searchParams.get('b')) || 0 }), 200, { cache: 'public, max-age=3600' })
  const kind = { '/support/volunteer': 'volunteer', '/support/invest': 'invest' }[path]
  if (!kind || request.method !== 'POST') return H.html(note(lang, 'ไม่พบ', 'Not found.'), 404)
  if (!H.sameOrigin(request, url)) return new Response('', { status: 403 })
  const f = await request.formData()
  const fl = f.get('lang') === 'th' ? 'th' : f.get('lang') === 'en' ? 'en' : lang
  const back = `${url.origin}/support?l=${fl}&ok=${kind[0]}#${kind}`
  if (f.get('website')) return Response.redirect(back, 303)
  if (!(await H.take(env, await H.sender(request, env), 'backer'))) return H.html(note(fl, 'ลองใหม่พรุ่งนี้', 'Please try again tomorrow.'), 429)
  const r = rowOf(kind, f, fl)
  if (!r) return H.html(note(fl, 'ใส่ชื่อและช่องทางติดต่อ', 'A name and a way to reach you, please.'), 400)
  await keep(env, r, H.rand, H.post)
  await H.log(env, '', 'support-' + kind, r.place || '')
  return Response.redirect(back, 303)
}
