// msg.mjs — messages readers send from a page to its maker. The maker reads
// them in the builder; a copy goes by email when the maker has confirmed an
// address. A message that trips the rules waits in its own fold.

import { squash } from './screen.mjs'

const SPAM = ['บาคาร่า', 'baccarat', 'สล็อต', 'slotonline', 'คาสิโน', 'casino', 'แทงบอล', 'ufabet', 'เครดิตฟรี', 'freecredit', 'เว็บพนัน',
  'กู้เงินด่วน', 'สินเชื่อด่วน', 'ไม่เช็คบูโร', 'forexsignal', 'cryptosignal', 'seoservice', 'backlinks', 'guestpost', 'rankyourwebsite',
  'firstpageofgoogle', 'webdesignservice', 'viagra', 'cialis', 'onlyfans', 'ไซด์ไลน์', 'verifyyouraccount', 'บัญชีถูกระงับ', 'พัสดุตกค้าง', 'taxrefund']
const MAIL_DAY = 25 // copies a page receives a day
const MAIL_ALL = 90 // copies the service sends a day

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)

/** { name, reach, body } cut to size, or null when there is nothing to send. */
export function clean(b) {
  const m = { name: str(b.name, 80), reach: str(b.reach, 120), body: str(b.body, 2000) }
  return m.body.length >= 2 ? m : null
}

/** 'ok' | 'held:<why>' for a message's words. */
export function check(m) {
  const all = `${m.name}\n${m.reach}\n${m.body}`
  const q = squash(all)
  if (SPAM.some((w) => q.includes(squash(w)))) return 'held:spam'
  if ((all.match(/https?:\/\//g) || []).length >= 3) return 'held:links'
  if (/<\s*(script|iframe|a\s)|javascript:/i.test(all)) return 'held:markup'
  return 'ok'
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])

/** One email through Resend. true when it was accepted. */
export async function mail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_KEY || !to) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Mot Dang <pages@motdang.net>', to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    })
    return r.ok
  } catch { return false }
}

/** May one more copy go out today, for this page and in all? Counts it when it may. */
export async function mayMail(env, siteId) {
  const day = new Date().toISOString().slice(0, 10)
  const up = (who) => env.DB.prepare("INSERT INTO quota (who, day, what, n) VALUES (?,?,'mail',1) ON CONFLICT(who, day, what) DO UPDATE SET n = n + 1 RETURNING n").bind(who, day).first()
  const a = await up('mail:' + siteId.slice(0, 10))
  if ((a?.n || 1) > MAIL_DAY) return false
  const b = await up('mail:all')
  return (b?.n || 1) <= MAIL_ALL
}

/** The copy of a reader's message that goes to the maker. */
export function copyOf(m, pageName, title, origin) {
  const page = `${origin}/${pageName}`
  const subject = `ข้อความใหม่ · New message — ${title}`.slice(0, 120)
  const reachIsMail = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i.test(m.reach)
  const html = `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<p style="margin:0 0 4px;color:#5a4f6a">ข้อความจากหน้าเว็บ · A message from your page</p>
<h2 style="margin:0 0 14px;font-size:22px">${esc(title)}</h2>
<div style="padding:16px 18px;border-radius:14px;background:#fff7ec;border:2px solid #efd9bf;white-space:pre-wrap">${esc(m.body)}</div>
<p style="margin:14px 0 0"><b>${esc(m.name || '—')}</b>${m.reach ? ' · ' + esc(m.reach) : ''}</p>
<p style="margin:18px 0 0;font-size:14px;color:#5a4f6a">อ่านทุกข้อความในตัวแก้ไข · Every message is in your editor: <a href="${origin}/make">${origin.replace(/^https:\/\//, '')}/make</a> · <a href="${page}">${esc(page.replace(/^https:\/\//, ''))}</a></p></div>`
  const text = `${title}\n\n${m.body}\n\n${m.name || '—'}${m.reach ? ' · ' + m.reach : ''}\n\n${origin}/make\n${page}\n`
  return { subject, html, text, replyTo: reachIsMail ? m.reach : '' }
}

/** The mail that asks the maker to confirm an address. */
export function confirmOf(link, title, origin) {
  return {
    subject: `ยืนยันอีเมล · Confirm your email — ${title}`.slice(0, 120),
    html: `<div style="font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1530;max-width:560px">
<h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>
<p>กดปุ่มนี้เพื่อรับสำเนาข้อความจากหน้าเว็บของคุณทางอีเมล<br>Press the button to get a copy of each message from your page by email.</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:14px 22px;border-radius:99px;background:#ffb000;color:#000;font-weight:800;text-decoration:none">ยืนยัน · Confirm</a></p>
<p style="font-size:14px;color:#5a4f6a">ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร · If you did not ask for this, do nothing. ${esc(origin.replace(/^https:\/\//, ''))}</p></div>`,
    text: `${title}\n\nConfirm / ยืนยัน: ${link}\n`,
  }
}
