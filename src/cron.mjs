// cron.mjs — the half-hourly jobs added 2026-10-14: other sites' room
// calendars read in, the monthly visitor note to Gold makers, and the note
// before a page's 30 Gold days end.

import { icalNights, icalUrl } from '../public/s/extras.mjs'
import { mail, mayMail } from './msg.mjs'
import * as stats from './stats.mjs'

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)

/** Airbnb, Booking.com, Agoda … calendars of Gold rooms, oldest read first, every 30 minutes at most. */
export async function readCalendars(env, isGold, normalize, max = 12) {
  const rows = (await env.DB.prepare("SELECT id, d, tier, gold_until FROM site WHERE status = 'live' AND tier = 'gold' AND d LIKE '%\"ical\":[\"%' LIMIT 200").all()).results
  const due = []
  const since = new Date(Date.now() - 25 * 60e3).toISOString()
  for (const s of rows) {
    if (!isGold(s)) continue
    const d = normalize(JSON.parse(s.d))
    for (const r of d.rooms) for (const u of r.ical) due.push({ site: s.id, room: r.id, url: u })
  }
  if (!due.length) return 0
  const last = new Map((await env.DB.prepare('SELECT site_id, room, url, at FROM ical_read').all()).results.map((x) => [`${x.site_id}|${x.room}|${x.url}`, x.at]))
  const todo = due.filter((x) => (last.get(`${x.site}|${x.room}|${x.url}`) || '') < since).sort((a, b) => (last.get(`${a.site}|${a.room}|${a.url}`) || '').localeCompare(last.get(`${b.site}|${b.room}|${b.url}`) || '')).slice(0, max)
  const byRoom = new Map()
  for (const x of todo) {
    let nights = null
    try {
      const r = await fetch(icalUrl(x.url), { headers: { 'user-agent': 'sites.motdang.net calendar reader', accept: 'text/calendar,*/*' }, cf: { cacheTtl: 0 } })
      const t = r.ok ? await r.text() : ''
      if (r.ok && t.includes('BEGIN:VCALENDAR') && t.length < 3e6) nights = icalNights(t)
    } catch {}
    await env.DB.prepare('INSERT INTO ical_read (site_id, room, url, at, ok, nights) VALUES (?,?,?,?,?,?) ON CONFLICT(site_id, room, url) DO UPDATE SET at = excluded.at, ok = excluded.ok, nights = excluded.nights')
      .bind(x.site, x.room, x.url, new Date().toISOString(), nights ? 1 : 0, nights ? nights.length : null).run()
    if (!nights) continue // a calendar that did not answer keeps its last nights
    const k = x.site + '|' + x.room
    if (!byRoom.has(k)) byRoom.set(k, { site: x.site, room: x.room, urls: due.filter((y) => y.site === x.site && y.room === x.room).length, got: [] })
    byRoom.get(k).got.push(...nights)
  }
  for (const r of byRoom.values()) {
    // replace only when every calendar of the room was read this run; otherwise add
    const all = r.urls === todo.filter((y) => y.site === r.site && y.room === r.room).length
    const stmts = all ? [env.DB.prepare('DELETE FROM block WHERE site_id = ? AND room = ?').bind(r.site, r.room)] : []
    for (const day of new Set(r.got)) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO block (site_id, room, day) VALUES (?,?,?)').bind(r.site, r.room, day))
    for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90))
  }
  return todo.length
}

/** On the 1st (Bangkok), last month's numbers to each Gold maker who confirmed an email. */
export async function monthly(env, isGold, origin, max = 15) {
  const bkk = new Date(Date.now() + 7 * 3600e3)
  if (bkk.getUTCDate() !== 1 || bkk.getUTCHours() < 8) return 0
  const month = bkk.toISOString().slice(0, 7)
  const rows = (await env.DB.prepare("SELECT * FROM site WHERE status = 'live' AND notify_ok = 1 AND notify_email IS NOT NULL AND (mailed IS NULL OR mailed < ?) LIMIT ?").bind(month, max * 3).all()).results
  let sent = 0
  for (const s of rows) {
    if (sent >= max) break
    await env.DB.prepare('UPDATE site SET mailed = ? WHERE id = ?').bind(month, s.id).run()
    if (!isGold(s) || !(await mayMail(env, s.id))) continue
    const r = await stats.report(env, s.id, 31)
    const bk = await env.DB.prepare("SELECT COUNT(*) AS n FROM booking WHERE site_id = ? AND at >= ?").bind(s.id, new Date(Date.now() - 31 * 864e5).toISOString()).first()
    const ms = await env.DB.prepare("SELECT COUNT(*) AS n FROM msg WHERE site_id = ? AND at >= ? AND status != 'held'").bind(s.id, new Date(Date.now() - 31 * 864e5).toISOString()).first()
    const title = JSON.parse(s.d).name || s.name
    const rowsH = [['คน · People', r.total.people], ['เข้าชม · Visits', r.total.views], ['กดปุ่ม · Button taps', r.total.taps], ['ข้อความ · Messages', ms?.n || 0], ['การจอง · Bookings', bk?.n || 0]]
    const tops = (r.ref || []).slice(0, 5).map((x) => `${esc(x.k || 'direct')} · ${nf(x.n)}`).join('<br>')
    const ok = await mail(env, {
      to: s.notify_email, subject: `${title} — เดือนที่แล้ว · Last month`.slice(0, 120),
      html: `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">30 วันที่ผ่านมา · The last 30 days</p><h2 style="margin:0 0 14px;font-size:24px">${esc(title)}</h2>
<table style="border-collapse:collapse;width:100%;font-size:18px">${rowsH.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px dashed #efd9bf">${k}</td><td style="padding:8px 0;border-bottom:1px dashed #efd9bf;text-align:right;font-weight:800">${nf(v)}</td></tr>`).join('')}</table>
${tops ? `<p style="margin:16px 0 4px;font-weight:700">มาจาก · Where people came from</p><p style="margin:0">${tops}</p>` : ''}
<p style="margin:18px 0 0;font-size:14px;color:#5a4f6a">ดูทั้งหมดในแท็บสถิติ · Everything is in the Traffic tab: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a> · <a href="${origin}/${s.name}">${origin.replace(/^https:\/\//, '')}/${esc(s.name)}</a></p></div>`,
      text: `${title}\n${rowsH.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${origin}/make\n`,
    })
    if (ok) sent++
  }
  return sent
}

/** Five days before a page's 30 Gold days end: the date, and what stays. */
export async function trialNotes(env, origin, price, max = 15) {
  const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)
  const rows = (await env.DB.prepare("SELECT * FROM site WHERE trial = 1 AND trial_told = 0 AND status IN ('live','held','draft') AND gold_until IS NOT NULL AND gold_until <= ? LIMIT ?").bind(soon, max).all()).results
  let sent = 0
  for (const s of rows) {
    await env.DB.prepare('UPDATE site SET trial_told = 1 WHERE id = ?').bind(s.id).run()
    if (!s.notify_ok || !s.notify_email || !(await mayMail(env, s.id))) continue
    const title = JSON.parse(s.d).name || s.name
    const ok = await mail(env, {
      to: s.notify_email, subject: `${title} — ทองถึง ${s.gold_until} · Gold until ${s.gold_until}`.slice(0, 120),
      html: `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>
<p>ทองของหน้าเว็บนี้ถึงวันที่ <b>${esc(s.gold_until)}</b> หลังจากนั้นหน้าเว็บยังออนไลน์ต่อแบบฟรี<br>Gold on this page runs to <b>${esc(s.gold_until)}</b>. After that the page stays online as a free page.</p>
<p>ทองหนึ่งปี ฿${nf(price)} · A year of Gold is ฿${nf(price)}: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a> → ทอง · Gold</p></div>`,
      text: `${title}\nGold until ${s.gold_until}. After that the page stays online as a free page.\nA year of Gold: ฿${price} — ${origin}/make\n`,
    })
    if (ok) sent++
  }
  return sent
}
