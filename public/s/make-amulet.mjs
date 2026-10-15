// make-amulet.mjs — the builder's amulets section: one fold per amulet, photos taken straight
// into it (front, then back), the facts a buyer asks about, a status a tap changes, and the
// seller's guarantee and delivery words. make.js calls amuletsSec with its own helpers.

import { AM_FORMS, AM_MATERIALS, AM_CONDS, AM_STATUS, AM_MAX, amLabel } from './amulet.mjs'

const UI = {
  en: { hint: 'Each amulet gets its own page to share, with a LINE reserve button.', free: 'Free pages show 6 amulets; Gold shows 120.', t: 'Name', tEx: 'Phra Somdej Wat Rakhang, large mould',
    shoot: 'Take photos', shootHint: 'Front first, then back. Close-ups help: the year stamp, the edge, beside a ruler. Daylight, no flash.', pick: 'Or pick from your photos', fix: 'Fix',
    st: 'Status', st_open: 'Available', st_reserved: 'Reserved', st_sold: 'Gone', st_show: 'On show', p: 'Price', pHint: 'Empty: the page says "Ask the price"', form: 'Kind', none: '—',
    temple: 'Temple', maker: 'Monk or maker', year: 'Year (BE or CE)', mat: 'Material', mould: 'Mould', size: 'Size', sizeEx: '2.4 × 3.6 cm', cond: 'Condition', frame: 'Frame or case', cert: 'Certificate (issuer, number)',
    certEx: 'Association card no. 12345', note: 'More about it', add: 'Add an amulet', open: 'Open its page', front: 'Front', back: 'Back', terms: 'Guarantee and delivery (on every amulet page)',
    termsEx: 'Refund within 7 days if not genuine. EMS across Thailand.', tap_amulet: 'Amulet pages', tap_reserve: 'Reserve on LINE' },
  th: { hint: 'พระแต่ละองค์มีหน้าของตัวเอง แชร์ได้ พร้อมปุ่มจองทางไลน์', free: 'หน้าฟรีแสดง 6 องค์ หน้าทองแสดง 120', t: 'ชื่อพระ', tEx: 'พระสมเด็จวัดระฆัง พิมพ์ใหญ่',
    shoot: 'ถ่ายรูป', shootHint: 'ด้านหน้าก่อน แล้วด้านหลัง ถ่ายใกล้ ๆ ช่วยได้มาก: โค้ดหรือปี ขอบ วางข้างไม้บรรทัด ใช้แสงธรรมชาติ ไม่เปิดแฟลช', pick: 'หรือเลือกจากรูปของคุณ', fix: 'แต่งรูป',
    st: 'สถานะ', st_open: 'พร้อมเช่า', st_reserved: 'จองแล้ว', st_sold: 'เช่าแล้ว', st_show: 'พระโชว์', p: 'ราคาเช่า', pHint: 'เว้นว่างไว้ หน้าเว็บจะขึ้นว่า "สอบถามราคา"', form: 'ประเภท', none: '—',
    temple: 'วัด', maker: 'เกจิ · ผู้สร้าง', year: 'ปี (พ.ศ. หรือ ค.ศ.)', mat: 'เนื้อ', mould: 'พิมพ์', size: 'ขนาด', sizeEx: '2.4 × 3.6 ซม.', cond: 'สภาพ', frame: 'กรอบ · เลี่ยม', cert: 'บัตรรับรอง (ที่ออก เลขที่)',
    certEx: 'บัตรสมาคมฯ เลขที่ 12345', note: 'รายละเอียด', add: 'เพิ่มพระ', open: 'เปิดหน้าองค์นี้', front: 'หน้า', back: 'หลัง', terms: 'การรับประกันและการจัดส่ง (แสดงทุกองค์)',
    termsEx: 'รับประกันพระแท้ ไม่แท้คืนเงินภายใน 7 วัน · ส่ง EMS ทั่วประเทศ', tap_amulet: 'หน้าพระแต่ละองค์', tap_reserve: 'จองทางไลน์' },
  zh: { hint: '每尊佛牌都有自己的网页，可以分享，带 LINE 预订按钮。', free: '免费网页显示 6 尊；金卡显示 120 尊。', t: '名称', tEx: '崇迪佛 大模',
    shoot: '拍照', shootHint: '先拍正面，再拍背面。近拍很有用：年份印记、边缘、放在尺子旁。用自然光，不开闪光灯。', pick: '或从你的照片中选', fix: '美化',
    st: '状态', st_open: '可请', st_reserved: '已预订', st_sold: '已请走', st_show: '仅展示', p: '请供价', pHint: '留空：网页显示“询价”', form: '类别', none: '—',
    temple: '寺庙', maker: '师父 · 制作', year: '年份（佛历或公历）', mat: '材质', mould: '模版', size: '尺寸', sizeEx: '2.4 × 3.6 厘米', cond: '品相', frame: '外壳', cert: '鉴定卡（机构、编号）',
    certEx: '协会鉴定卡 12345', note: '介绍', add: '添加佛牌', open: '打开这一页', front: '正面', back: '背面', terms: '保证和寄送（每尊都显示）',
    termsEx: '保真，不真 7 天内退款 · EMS 寄送', tap_amulet: '佛牌页面', tap_reserve: '在 LINE 预订' },
}
export const amUi = (lang, k) => (UI[lang] && UI[lang][k]) || UI.en[k] || k

export const newAmulet = (rid) => ({ id: rid(), t: '', temple: '', maker: '', year: '', form: '', mat: '', mould: '', size: '', cond: '', cert: '', frame: '', p: '', status: 'open', note: '', photos: [] })

// folds the maker opened, kept across redraws; a new amulet starts open
const opened = new Set()
export function amToggle(e) {
  const f = e.target
  if (f.matches && f.matches('details.am')) f.open ? opened.add(f.dataset.am) : opened.delete(f.dataset.am)
}

const CSS = `<style>.am{min-width:0}.am>summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;padding:0 40px 10px 0;min-height:56px}.am>summary::-webkit-details-marker{display:none}
.am .th{flex:none;width:48px;height:64px;border-radius:8px;overflow:hidden;background:#141210;display:grid;place-items:center;color:#fff}.am .th img{width:100%;height:100%;object-fit:cover}
.am .sm{display:flex;flex-direction:column;min-width:0;flex:1}.am .sm b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am .sm small{color:var(--mute)}
.am .chosen{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:0 0 8px}.am .chosen figure{position:relative;margin:0}.am .chosen img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;background:#141210}
.am .chosen figcaption{position:absolute;left:6px;top:6px;padding:1px 8px;border-radius:99px;background:rgba(0,0,0,.7);color:#fff;font:700 12px/1.5 system-ui}
.am .chosen .tools{display:flex;gap:4px;margin-top:4px}.am .chosen .tools button{flex:1;padding:6px 4px;border:0;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 2px var(--line);font:700 13px system-ui;cursor:pointer}
.am .shoot{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border-radius:14px;background:var(--ink);color:#fff;font-weight:800;cursor:pointer}.am .shoot input{display:none}
.am details.more>summary{cursor:pointer;font-weight:700;margin:8px 0}.am .seg{margin:0 0 4px}.am .seg button{padding:10px 12px}.am .over{opacity:.5}</style>`

/** The section's form. h = make.js's helpers: S, T, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold, lang. */
export function amuletsSec(h) {
  const { S, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold, lang } = h
  const A = (k) => esc(amUi(lang, k))
  const cap = isGold() ? AM_MAX.gold : AM_MAX.free
  const list = (id, rows) => `<datalist id="${id}">${rows.map((r) => `<option value="${esc(amLabel(rows, r[0], lang))}">`).join('')}</datalist>`
  const shown = (rows, v) => (rows.some((r) => r[0] === v) ? amLabel(rows, v, lang) : v)
  const rows = S.d.amulets.map((x, i) => {
    const isOpen = !x.t || opened.has(x.id)
    const sub = [A('st_' + x.status), x.p].filter(Boolean).join(' · ')
    const chosen = x.photos.map((id, k) => `<figure><img src="${esc(imgUrl(id, true))}" alt="">${k < 2 ? `<figcaption>${A(k ? 'back' : 'front')}</figcaption>` : ''}
      <div class="tools"><button type="button" data-mo="${id}">${A('fix')}</button><button type="button" data-amrm="${i}.${k}" aria-label="×">×</button></div></figure>`).join('')
    return `<details class="rowc am${i >= cap ? ' over' : ''}" data-am="${esc(x.id)}"${isOpen ? ' open' : ''}>${rowX('amulets', i)}
      <summary><span class="th">${x.photos[0] ? `<img src="${esc(imgUrl(x.photos[0], true))}" alt="">` : '🪷'}</span><span class="sm"><b>${esc(x.t) || A('t')}</b><small>${esc(sub)}</small></span></summary>
      ${x.photos.length ? `<div class="chosen">${chosen}</div>` : ''}
      ${x.photos.length < AM_MAX.photos ? `<label class="shoot">${icon('camera')}${A('shoot')}<input type="file" accept="image/*" multiple data-amfile="${i}"></label><p class="hint">${A('shootHint')}</p>` : ''}
      ${S.d.photos.length ? `<details class="more"><summary>${A('pick')}</summary>${photoPick(`amulets.${i}.photos`, x.photos)}</details>` : ''}
      <label class="field"><span>${A('t')}</span><input data-k="amulets.${i}.t" value="${val(x.t)}" maxlength="100" placeholder="${A('tEx')}"></label>
      <div class="field"><span>${A('st')}</span>${seg(`amulets.${i}.status`, x.status, AM_STATUS.map((k) => [k, A('st_' + k)]))}</div>
      <div class="grid2f"><label class="mini"><span>${A('p')}</span><input data-k="amulets.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label>
      <label class="mini"><span>${A('form')}</span><select data-k="amulets.${i}.form"><option value="">${A('none')}</option>${AM_FORMS.map((f) => `<option value="${f[0]}"${f[0] === x.form ? ' selected' : ''}>${esc(amLabel(AM_FORMS, f[0], lang))}</option>`).join('')}</select></label></div>
      <p class="hint" style="margin-top:-4px">${A('pHint')}</p>
      <div class="grid2f"><label class="mini"><span>${A('temple')}</span><input data-k="amulets.${i}.temple" value="${val(x.temple)}" maxlength="80"></label>
      <label class="mini"><span>${A('maker')}</span><input data-k="amulets.${i}.maker" value="${val(x.maker)}" maxlength="80"></label></div>
      <div class="grid3f"><label class="mini"><span>${A('year')}</span><input data-k="amulets.${i}.year" value="${val(x.year)}" maxlength="12" inputmode="numeric" placeholder="2517"></label>
      <label class="mini"><span>${A('mat')}</span><input data-k="amulets.${i}.mat" value="${val(shown(AM_MATERIALS, x.mat))}" maxlength="40" list="am-mat"></label>
      <label class="mini"><span>${A('mould')}</span><input data-k="amulets.${i}.mould" value="${val(x.mould)}" maxlength="60"></label></div>
      <div class="grid3f"><label class="mini"><span>${A('size')}</span><input data-k="amulets.${i}.size" value="${val(x.size)}" maxlength="40" placeholder="${A('sizeEx')}"></label>
      <label class="mini"><span>${A('cond')}</span><input data-k="amulets.${i}.cond" value="${val(shown(AM_CONDS, x.cond))}" maxlength="40" list="am-cond"></label>
      <label class="mini"><span>${A('frame')}</span><input data-k="amulets.${i}.frame" value="${val(x.frame)}" maxlength="60"></label></div>
      <label class="field"><span>${A('cert')}</span><input data-k="amulets.${i}.cert" value="${val(x.cert)}" maxlength="120" placeholder="${A('certEx')}"></label>
      <label class="field"><span>${A('note')}</span><textarea data-k="amulets.${i}.note" maxlength="2000">${val(x.note)}</textarea></label>
      ${S.status === 'live' && x.t ? `<a class="linkbtn" href="/${esc(S.name)}/a/${esc(x.id)}" target="_blank">${icon('globe')}${A('open')}</a>` : ''}</details>`
  })
  return `${CSS}<p class="hint">${A('hint')}${isGold() ? '' : ' ' + A('free')}</p>${list('am-mat', AM_MATERIALS)}${list('am-cond', AM_CONDS)}<div class="rows">${rows.join('')}</div>
    ${S.d.amulets.length < AM_MAX.gold ? `<button class="go ghost" data-addrow="amulets">${icon('plus')}${A('add')}</button>` : ''}
    <label class="field" style="margin-top:16px"><span>${A('terms')}</span><textarea data-k="amterms" maxlength="600" style="min-height:70px" placeholder="${A('termsEx')}">${val(S.d.amterms)}</textarea></label>`
}
