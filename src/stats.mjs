// stats.mjs — traffic for each page, for its maker: visits a day, people
// (each counted once a day by a salted hash), machines apart from people,
// where readers came from, their country, device, language and hour, and
// which buttons they pressed. One D1 row per page, day, measure and key.

const MACHINE = /bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|preview|embedly|whatsapp|telegrambot|linkexpand|skypeuripreview|discordbot|slackbot|twitterbot|bluesky|cardyb|mastodon|curl|wget|python|httpx|go-http|node-fetch|axios|java\/|okhttp|headless|lighthouse|pingdom|uptime|monitor|scan|gptbot|claude|anthropic|perplexity|bytespider|ahrefs|semrush|mj12|dotbot|petal|yandex|baidu/i
export const TAPS = ['call', 'line', 'dir', 'ride', 'food', 'lineman', 'whatsapp', 'share', 'copy', 'shareline', 'sharefb', 'sharex', 'sharewa', 'sharetg', 'qr', 'story', 'map', 'far', 'vcf', 'ics', 'sign', 'order', 'msg', 'link', 'social', 'email', 'web', 'photo', 'video', 'drawing', 'book', 'rooms', 'listing', 'code', 'calone', 'calfollow', 'lang']

/** People or machines, from the request alone. */
export function isMachine(request) {
  const ua = request.headers.get('user-agent') || ''
  if (!ua || MACHINE.test(ua)) return true
  // a browser that navigates sends Sec-Fetch-Mode; a script dressed as Chrome usually does not
  if (/Chrome\/\d/.test(ua) && !request.headers.get('sec-fetch-mode')) return true
  return false
}

function device(ua) {
  if (/iPad|Tablet|SM-T|Tab\b/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'phone'
  return 'computer'
}

function refHost(request, origin) {
  const r = request.headers.get('referer') || ''
  if (!r) return ''
  try {
    const h = new URL(r).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, '')
    if (!h || r.startsWith(origin)) return ''
    if (/(^|\.)facebook\.com$|fb\.com$|messenger\.com$/.test(h)) return 'facebook.com'
    if (/(^|\.)line\.me$|line-apps|lin\.ee$/.test(h)) return 'line.me'
    if (/(^|\.)google\./.test(h)) return 'google'
    return h.slice(0, 60)
  } catch { return '' }
}

function bumps(id, day, list) {
  return list.map(([m, k]) => ['INSERT INTO hit (site_id, day, m, k, n) VALUES (?,?,?,?,1) ON CONFLICT(site_id, day, m, k) DO UPDATE SET n = n + 1', [id, day, m, k]])
}

/** A page was opened. */
export async function view(env, request, site, origin, salt) {
  const day = new Date().toISOString().slice(0, 10)
  if (isMachine(request)) {
    await env.DB.prepare('INSERT INTO hit (site_id, day, m, k, n) VALUES (?,?,?,?,1) ON CONFLICT(site_id, day, m, k) DO UPDATE SET n = n + 1').bind(site.id, day, 'machines', '').run()
    return false
  }
  const ua = request.headers.get('user-agent') || ''
  const ip = request.headers.get('cf-connecting-ip') || 'local'
  const who = await hash(`${salt}|${site.id}|${day}|${ip}|${ua}`)
  const fresh = await env.DB.prepare('INSERT OR IGNORE INTO seen (site_id, day, who) VALUES (?,?,?)').bind(site.id, day, who.slice(0, 20)).run()
  const cf = request.cf || {}
  const tz = cf.timezone || 'Asia/Bangkok'
  let hour = '00'
  try { hour = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date()).slice(0, 2) } catch {}
  const lang = (request.headers.get('accept-language') || '').slice(0, 2).toLowerCase()
  const list = [['views', ''], ['hour', hour]]
  if (fresh.meta?.changes) {
    list.push(['people', ''], ['dev', device(ua)])
    if (cf.country) list.push(['cc', String(cf.country).slice(0, 2)])
    if (/^[a-z]{2}$/.test(lang)) list.push(['lang', lang])
    const rh = refHost(request, origin)
    list.push(['ref', rh || '(direct)'])
  }
  await env.DB.batch(bumps(site.id, day, list).map(([q, a]) => env.DB.prepare(q).bind(...a)))
  return true
}

/** A reader pressed a button. */
export async function tap(env, request, siteId, k) {
  if (!TAPS.includes(k) || isMachine(request)) return
  const day = new Date().toISOString().slice(0, 10)
  await env.DB.prepare('INSERT INTO hit (site_id, day, m, k, n) VALUES (?,?,?,?,1) ON CONFLICT(site_id, day, m, k) DO UPDATE SET n = n + 1').bind(siteId, day, 'tap', k).run()
}

/** What the maker sees: `days` of daily counts and the top keys of each measure. */
export async function report(env, siteId, days) {
  const from = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10)
  const rows = (await env.DB.prepare('SELECT day, m, k, n FROM hit WHERE site_id = ? AND day >= ? ORDER BY day').bind(siteId, from).all()).results
  const byDay = new Map()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    byDay.set(d, { day: d, views: 0, people: 0, machines: 0, taps: 0 })
  }
  const tops = { ref: {}, cc: {}, dev: {}, lang: {}, tap: {}, hour: {} }
  const total = { views: 0, people: 0, machines: 0, taps: 0 }
  for (const r of rows) {
    const d = byDay.get(r.day)
    if (r.m === 'views' || r.m === 'people' || r.m === 'machines') { if (d) d[r.m] += r.n; total[r.m] += r.n; continue }
    if (r.m === 'tap') { if (d) d.taps += r.n; total.taps += r.n }
    if (tops[r.m]) tops[r.m][r.k] = (tops[r.m][r.k] || 0) + r.n
  }
  const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, n]) => ({ k, n }))
  const today = new Date().toISOString().slice(0, 10)
  const week = [...byDay.values()].slice(-7)
  return {
    days: [...byDay.values()], total,
    today: byDay.get(today) || { views: 0, people: 0, machines: 0, taps: 0 },
    week: week.reduce((a, d) => ({ views: a.views + d.views, people: a.people + d.people, taps: a.taps + d.taps }), { views: 0, people: 0, taps: 0 }),
    ref: top(tops.ref), cc: top(tops.cc, 12), dev: top(tops.dev, 3), lang: top(tops.lang), tap: top(tops.tap, 30),
    hour: Array.from({ length: 24 }, (_, h) => tops.hour[String(h).padStart(2, '0')] || 0),
  }
}

/** Every row of `days`, as CSV, for Gold pages. */
export async function csv(env, siteId, days) {
  const from = new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10)
  const rows = (await env.DB.prepare('SELECT day, m, k, n FROM hit WHERE site_id = ? AND day >= ? ORDER BY day, m, k').bind(siteId, from).all()).results
  const q = (s) => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s)
  return 'day,measure,key,count\n' + rows.map((r) => [r.day, r.m, r.k, r.n].map(q).join(',')).join('\n') + '\n'
}

async function hash(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
