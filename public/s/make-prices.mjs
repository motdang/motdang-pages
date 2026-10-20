// make-prices.mjs — the builder's side of prices that follow demand (NaN 2026-10-20, for the
// Kamthieng and Warorot markets): the switch and two questions on each thing or amulet, and the
// Prices tab, where a seller marks a sale or an ask with one tap at the stall and sees what
// Monday will do. The rules are shoup.mjs; the counts come from /api/prices.

import { bahtOf, fmt, step, dynOf } from './shoup.mjs'

const W = {
  th: {
    tab: 'ราคา', on: 'ให้ราคาขยับตามคนซื้อ', per: 'เดือนหนึ่งขายได้กี่ชิ้น', low: 'ราคาต่ำสุดที่รับได้', fall: 'ลดได้ ถ้า 14 วันไม่มีคนถาม',
    helpItem: 'ทุกวันจันทร์ ดูยอดขาย 30 วัน ขายได้เกิน 80% ของที่ตั้งไว้ ราคาขึ้นหนึ่งขั้น ต่ำกว่า 60% ลงหนึ่งขั้น ไม่ต่ำกว่าราคาต่ำสุดของคุณ',
    helpAm: 'ทุกวันจันทร์ ถ้ามีคนถามรุ่นนี้ 2 ครั้งขึ้นไปใน 7 วัน ราคาขึ้นหนึ่งขั้น ไม่มีคนถาม ราคาเท่าเดิม พระวัดเดียวกัน เกจิ ปี พิมพ์เดียวกัน นับรวมกัน',
    shoot: 'ถ่ายรูป', next: 'เช็คครั้งต่อไป {d} 06:00', sold: '+1 ขายแล้ว', ask: '+1 มีคนถาม', gone: 'เช่าแล้ว', undo: 'ถอน',
    sold30: '30 วัน ขายไป {n} จาก {m}', asks7: '7 วัน มีคนถาม {n}', asksFrom: 'จองทางไลน์ {a} · คุณกด {b}', batch: 'รุ่นเดียวกัน นับรวม {n}',
    up: 'ถ้าเป็นแบบนี้ถึงวันจันทร์: ขึ้นเป็น {p}', same: 'ถ้าเป็นแบบนี้ถึงวันจันทร์: ราคาเท่าเดิม', down: 'ถ้าเป็นแบบนี้ถึงวันจันทร์: ลงเป็น {p}',
    young: 'เริ่มขยับหลังครบ 7 วัน', opened: 'ตั้งไว้ {p}', hist: 'ที่ผ่านมา', still: 'ยังไม่ขยับ', start: 'ให้ขยับ', none: 'ยังไม่มีของ เพิ่มของในแท็บหน้าเว็บ',
    noPrice: 'ใส่ราคาก่อน', why: 'ขายดี ราคาขึ้น ขายช้า ราคาลง คุณไม่ต้องคิดราคาเอง กดปุ่มทุกครั้งที่ขายได้ ที่ร้าน ในไลน์ หรือที่ไหนก็ได้',
    whyAm: 'มีคนถามมาก ราคาขึ้น กดปุ่มทุกครั้งที่มีคนถามองค์ไหน ที่แผง ในไลน์ ในกลุ่มเฟซบุ๊ก กดจองบนหน้าเว็บนับให้เอง',
  },
  en: {
    tab: 'Prices', on: 'Let the price follow demand', per: 'How many can you sell a month?', low: 'Lowest price you would take', fall: 'May come down after 14 days with no ask',
    helpItem: 'Every Monday, the last 30 days: over 80% of your month sold, one step up; under 60%, one step down, never under your lowest.',
    helpAm: 'Every Monday: two or more asks about this batch in 7 days, one step up. No asks, it stays. Amulets of the same temple, maker, year and mould count together.',
    shoot: 'Take a photo', next: 'Next check {d} 06:00', sold: '+1 Sold', ask: '+1 Asked', gone: 'Gone', undo: 'Undo',
    sold30: '30 days: {n} sold of {m}', asks7: '7 days: {n} asks', asksFrom: 'Reserve taps {a} · yours {b}', batch: 'Same batch, counted together: {n}',
    up: 'If it stays like this until Monday: up to {p}', same: 'If it stays like this until Monday: no change', down: 'If it stays like this until Monday: down to {p}',
    young: 'Starts moving after its first 7 days', opened: 'Set at {p}', hist: 'Before', still: 'Not moving', start: 'Let it move', none: 'Nothing to sell yet. Add things on the Page tab.',
    noPrice: 'Give it a price first', why: 'Sells well, the price goes up; sells slowly, it comes down. You do not have to pick prices. Tap each time you sell: at the stall, in LINE, anywhere.',
    whyAm: 'Many asks, the price goes up. Tap each time someone asks about an amulet: at the stall, in LINE, in a Facebook group. Reserve taps on your page count themselves.',
  },
}
export const pw = (lang, k, v = {}) => String((W[lang] && W[lang][k]) || W.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '')

const CSS = `<style>.it>.dyn,.it>.itph{grid-column:1/-1}.dyn{margin:8px 0 4px;padding:10px 12px;border-radius:12px;background:var(--soft,#f6f1ea)}.dyn>label.check{font-weight:800}
.dyn .hint{margin:4px 0 8px}.dyn .grid2f{margin:0}.itph{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.itph figure{position:relative;margin:0}.itph img{width:56px;height:56px;border-radius:8px;object-fit:cover;display:block}
.itph figure button{position:absolute;right:-6px;top:-6px;width:24px;height:24px;border-radius:50%;border:0;background:#111;color:#fff;font:700 14px/1 system-ui;cursor:pointer}.itph .shoot{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:12px;background:var(--ink,#1c1530);color:#fff;font-weight:800;cursor:pointer}.itph .shoot input{display:none}
.pz{display:grid;gap:12px}.pzwhy{margin:0 0 12px;color:var(--mute,#5a4f6a)}.pzn{margin:0 0 14px;font-weight:700}.pc{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:12px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 2px var(--line,#efd9bf)}
.pc .th{width:64px;height:64px;border-radius:10px;overflow:hidden;background:#141210;display:grid;place-items:center;font-size:28px}.pc .th img{width:100%;height:100%;object-fit:cover}
.pc h3{margin:0;font:800 17px/1.25 system-ui}.pc .pr{font:900 30px/1.1 system-ui;margin:2px 0}.pc .pr small{font:600 14px system-ui;color:var(--mute,#5a4f6a);margin-left:6px}.pc .pl{margin:2px 0;font-size:15px}.pc .po{font-weight:800}.pc .po.up{color:#0b8043}.pc .po.down{color:#b3261e}
.pc .bt{grid-column:1/-1;display:flex;gap:8px}.pc .bt button{min-height:64px;border:0;border-radius:14px;font:900 20px system-ui;cursor:pointer}.pc .bt .big{flex:1;background:#0b8043;color:#fff}.pc .bt .big.ask{background:#b45309}.pc .bt .sm{padding:0 16px;background:#fff;box-shadow:inset 0 0 0 2px var(--line,#efd9bf);font-size:15px}
.pc .hs{grid-column:1/-1;margin:0;color:var(--mute,#5a4f6a);font-size:13px}.pstill{margin-top:18px}.pstill li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px dashed var(--line,#efd9bf)}.pstill button{min-height:44px;padding:0 14px;border-radius:12px;border:0;background:var(--ink,#1c1530);color:#fff;font-weight:800;cursor:pointer}</style>`

/** Defaults when a seller switches a piece on: ten a month, lowest two rungs under today's price. */
export function startDyn(x, amulet) {
  const p = bahtOf(x.p)
  return { on: true, per: amulet ? 0 : 10, low: p ? step(p, -2) : 0, open: p, fall: false, kind: 'round' }
}

/** The switch and its questions, under one thing (`items.i`) or amulet (`amulets.i`). */
export function dynFields(path, x, { lang, val, amulet = false }) {
  const d = x.dyn && x.dyn.on ? x.dyn : null
  const P = (k) => pw(lang, k)
  return `<div class="dyn"><label class="check"><input type="checkbox" class="sw" data-dyn="${path}"${d ? ' checked' : ''}>${P('on')}</label>` + (!d ? '' :
    `<p class="hint">${P(amulet ? 'helpAm' : 'helpItem')}</p><div class="grid2f">` +
    (amulet ? '' : `<label class="mini"><span>${P('per')}</span><input data-k="${path}.dyn.per" value="${val(d.per || '')}" inputmode="numeric" maxlength="6"></label>`) +
    (!amulet || d.fall ? `<label class="mini"><span>${P('low')}</span><input data-k="${path}.dyn.low" value="${val(d.low || '')}" inputmode="numeric" maxlength="8"></label>` : '') +
    `</div>${amulet ? `<label class="check"><input type="checkbox" class="sw" data-k="${path}.dyn.fall"${d.fall ? ' checked' : ''}>${P('fall')}</label>` : ''}`) + '</div>'
}

/** A thing's photos and the camera, in its row. */
export function itemPhotos(i, it, { lang, esc, icon, imgUrl }) {
  const ph = it.photos || []
  return `<div class="itph">${ph.map((id, k) => `<figure><img src="${esc(imgUrl(id, true))}" alt=""><button type="button" data-itrm="${i}.${k}" aria-label="×">×</button></figure>`).join('')}` +
    (ph.length < 4 ? `<label class="shoot">${icon('camera')}${pw(lang, 'shoot')}<input type="file" accept="image/*" capture="environment" data-itfile="${i}"></label>` : '') + '</div>'
}
export const DYN_CSS = CSS

const day = (iso, lang) => { try { return new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(iso)) } catch { return iso.slice(0, 10) } }

/** The Prices tab: each moving piece, its price now, the counts, Monday's move, one big button. */
export function pricesTab(v, d, { lang, esc, imgUrl, sym = '฿' }) {
  const P = (k, o) => esc(pw(lang, k, o))
  const all = [...d.items.map((x) => ({ x, amulet: false })), ...d.amulets.map((x) => ({ x, amulet: true }))]
  if (!all.length) return `${CSS}<p class="hint">${P('none')}</p>`
  const byId = new Map((v?.pieces || []).map((p) => [p.id, p]))
  const money = (n) => sym + fmt(n)
  const cards = [], still = []
  for (const { x, amulet } of all) {
    const p = byId.get(x.id)
    const name = esc(x.t || x.n || '')
    const th = x.photos && x.photos[0] ? `<img src="${esc(imgUrl(x.photos[0], true))}" alt="">` : amulet ? '🪷' : '🧺'
    if (!(x.dyn && x.dyn.on) || !p || !p.moving) {
      if (amulet && x.status !== 'open') continue
      still.push(`<li><span>${name} · ${esc(x.p || '–')}</span>${bahtOf(x.p) ? `<button type="button" data-pstart="${amulet ? 'amulets' : 'items'}.${amulet ? d.amulets.indexOf(x) : d.items.indexOf(x)}">${P('start')}</button>` : `<small>${P('noPrice')}</small>`}</li>`)
      continue
    }
    const c = p.counts, o = p.out
    const lines = []
    if (amulet) {
      lines.push(P('asks7', { n: c.asks7 }) + ` <small>(${P('asksFrom', { a: c.page7, b: c.mine7 })})</small>`)
      if (p.batch && p.batch.asks + 2 * p.batch.sold !== c.asks7 + 2 * c.sold7) lines.push(P('batch', { n: p.batch.asks + 2 * p.batch.sold }))
    } else lines.push(P('sold30', { n: c.sold, m: dynOf(x.dyn)?.per || '–' }))
    const out = !o ? '' : o.young ? `<p class="pl po">${P('young')}</p>` : o.move > 0 ? `<p class="pl po up">▲ ${P('up', { p: money(o.to) })}</p>` : o.move < 0 && o.to !== p.now ? `<p class="pl po down">▼ ${P('down', { p: money(o.to) })}</p>` : `<p class="pl po">${P('same')}</p>`
    const k = amulet ? 'ask' : 'sold'
    cards.push(`<div class="pc" data-pid="${esc(x.id)}"><span class="th">${th}</span><div><h3>${name}</h3><p class="pr">${money(p.now)}${p.opened && p.opened !== p.now ? `<small>${P('opened', { p: money(p.opened) })}</small>` : ''}</p>
      ${lines.map((l) => `<p class="pl">${l}</p>`).join('')}${out}</div>
      <div class="bt"><button type="button" class="big${amulet ? ' ask' : ''}" data-mark="${esc(x.id)}|${k}|1">${P(k === 'ask' ? 'ask' : 'sold')}</button>${amulet ? `<button type="button" class="sm" data-pgone="${d.amulets.indexOf(x)}">${P('gone')}</button>` : ''}<button type="button" class="sm" data-mark="${esc(x.id)}|${k}|-1">${P('undo')}</button></div>
      ${p.steps.length ? `<p class="hs">${P('hist')}: ${p.steps.map((s) => `${esc(s.week.slice(5).replace('-', '/'))} ${fmt(s.from)}→${fmt(s.to)}`).join(' · ')}</p>` : ''}</div>`)
  }
  const amu = d.amulets.length && !d.items.length
  return `${CSS}<p class="pzwhy">${P(amu ? 'whyAm' : 'why')}</p>${v ? `<p class="pzn">${P('next', { d: day(v.next, lang) })}</p>` : ''}<div class="pz">${cards.join('')}</div>` +
    (still.length ? `<div class="pstill"><h3>${P('still')}</h3><ul style="list-style:none;margin:0;padding:0">${still.join('')}</ul></div>` : '')
}
