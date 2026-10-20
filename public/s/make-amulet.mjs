// make-amulet.mjs — the builder's amulets section: one fold per amulet, photos taken straight
// into it (front, then back), the facts a buyer asks about, a status a tap changes, and the
// seller's guarantee and delivery words. make.js calls amuletsSec with its own helpers.

import { AM_FORMS, AM_MATERIALS, AM_CONDS, AM_STATUS, AM_MAX, amLabel } from './amulet.mjs'
import { amcamTray } from './make-amcam.mjs'
import { dynFields, DYN_CSS } from './make-prices.mjs'

const UI = {
  en: { cam: 'Amulet camera', cam_pick: 'Or pick photos', cam_hint: 'Each photo becomes a new amulet at the top of your page, background removed. The photo stays on this phone until it is on the page, so a crash or a lost signal loses nothing.', cam_gold: 'Gold: the amulet camera. Each photo becomes a new amulet, background removed.',
    cam_wait: 'Waiting', cam_cut: 'Removing the background', cam_send: 'Putting it on your page', cam_net: 'No signal. Kept on this phone', cam_refused: 'This photo was refused', cam_retry: 'Try again', cam_getting: 'Getting the cutting tool, {a} of {b} MB', cam_nokeep: 'This phone could not keep the photo. Keep the page open until it is up.', cam_dropq: 'Remove this photo from the phone?', cam_full: 'Your page is full: remove an amulet first',
    auto_t: 'Amulet', lens: 'Search', post: 'Post', post_done: 'Caption copied. Paste it into the post.', post_tail: 'For rent to keep. Message me.',
    hint: 'Each amulet gets its own page to share, with a LINE reserve button.', free: 'Free pages show 6 amulets; Gold shows 120.', t: 'Name', tEx: 'Phra Somdej Wat Rakhang, large mould',
    shoot: 'Take photos', shootHint: 'Front first, then back. Close-ups help: the year stamp, the edge, beside a ruler. Daylight, no flash.', pick: 'Or pick from your photos', fix: 'Fix',
    st: 'Status', st_open: 'Available', st_reserved: 'Reserved', st_sold: 'Gone', st_show: 'On show', p: 'Price', pHint: 'Empty: the page says "Ask the price"', form: 'Kind', none: '—',
    temple: 'Temple', maker: 'Monk or maker', year: 'Year (BE or CE)', mat: 'Material', mould: 'Mould', size: 'Size', sizeEx: '2.4 × 3.6 cm', cond: 'Condition', frame: 'Frame or case', cert: 'Certificate (issuer, number)',
    certEx: 'Association card no. 12345', note: 'More about it', add: 'Add an amulet', open: 'Open its page', front: 'Front', back: 'Back', terms: 'Guarantee and delivery (on every amulet page)',
    termsEx: 'Refund within 7 days if not genuine. EMS across Thailand.', tap_amulet: 'Amulet pages', tap_reserve: 'Reserve on LINE', line: 'Your LINE, for the Reserve button', lineHint: 'Each amulet page has a Reserve on LINE button that messages you here. With no LINE, the button does not show.' },
  th: { cam: 'กล้องพระ', cam_pick: 'หรือเลือกรูป', cam_hint: 'ถ่ายหนึ่งรูป ได้พระหนึ่งองค์ขึ้นบนสุดของหน้า ตัดพื้นหลังให้ รูปเก็บไว้ในเครื่องจนกว่าจะขึ้นหน้าเว็บ แอปปิดหรือเน็ตหลุดก็ไม่หาย', cam_gold: 'หน้าทอง: กล้องพระ ถ่ายหนึ่งรูป ได้พระหนึ่งองค์ ตัดพื้นหลังให้',
    cam_wait: 'รอคิว', cam_cut: 'กำลังตัดพื้นหลัง', cam_send: 'กำลังขึ้นหน้าเว็บ', cam_net: 'ไม่มีเน็ต เก็บไว้ในเครื่องแล้ว', cam_refused: 'รูปนี้ไม่ผ่าน', cam_retry: 'ลองอีกครั้ง', cam_getting: 'กำลังโหลดเครื่องมือตัด {a} จาก {b} MB', cam_nokeep: 'เครื่องเก็บรูปไม่ได้ เปิดหน้านี้ไว้จนกว่ารูปจะขึ้น', cam_dropq: 'ลบรูปนี้ออกจากเครื่อง?', cam_full: 'หน้าเต็มแล้ว ลบพระออกก่อนหนึ่งองค์',
    auto_t: 'พระองค์ที่', lens: 'ค้นหา', post: 'โพสต์', post_done: 'คัดลอกข้อความแล้ว วางในโพสต์ได้เลย', post_tail: 'ให้เช่าบูชา ทักแชทได้เลย',
    hint: 'พระแต่ละองค์มีหน้าของตัวเอง แชร์ได้ พร้อมปุ่มจองทางไลน์', free: 'หน้าฟรีแสดง 6 องค์ หน้าทองแสดง 120', t: 'ชื่อพระ', tEx: 'พระสมเด็จวัดระฆัง พิมพ์ใหญ่',
    shoot: 'ถ่ายรูป', shootHint: 'ด้านหน้าก่อน แล้วด้านหลัง ถ่ายใกล้ ๆ ช่วยได้มาก: โค้ดหรือปี ขอบ วางข้างไม้บรรทัด ใช้แสงธรรมชาติ ไม่เปิดแฟลช', pick: 'หรือเลือกจากรูปของคุณ', fix: 'แต่งรูป',
    st: 'สถานะ', st_open: 'พร้อมเช่า', st_reserved: 'จองแล้ว', st_sold: 'เช่าแล้ว', st_show: 'พระโชว์', p: 'ราคาเช่า', pHint: 'เว้นว่างไว้ หน้าเว็บจะขึ้นว่า "สอบถามราคา"', form: 'ประเภท', none: '—',
    temple: 'วัด', maker: 'เกจิ · ผู้สร้าง', year: 'ปี (พ.ศ. หรือ ค.ศ.)', mat: 'เนื้อ', mould: 'พิมพ์', size: 'ขนาด', sizeEx: '2.4 × 3.6 ซม.', cond: 'สภาพ', frame: 'กรอบ · เลี่ยม', cert: 'บัตรรับรอง (ที่ออก เลขที่)',
    certEx: 'บัตรสมาคมฯ เลขที่ 12345', note: 'รายละเอียด', add: 'เพิ่มพระ', open: 'เปิดหน้าองค์นี้', front: 'หน้า', back: 'หลัง', terms: 'การรับประกันและการจัดส่ง (แสดงทุกองค์)',
    termsEx: 'รับประกันพระแท้ ไม่แท้คืนเงินภายใน 7 วัน · ส่ง EMS ทั่วประเทศ', tap_amulet: 'หน้าพระแต่ละองค์', tap_reserve: 'จองทางไลน์', line: 'ไลน์ของคุณ สำหรับปุ่มจอง', lineHint: 'หน้าพระแต่ละองค์มีปุ่ม "จองทางไลน์" ลูกค้ากดแล้วทักมาที่ไลน์นี้ ถ้าไม่ใส่ไลน์ ปุ่มจะไม่ขึ้น' },
  zh: { cam: '佛牌相机', cam_pick: '或选照片', cam_hint: '每拍一张，网页顶部就多一尊佛牌，背景自动去除。照片留在这部手机上，直到上了网页，闪退或断网都不会丢。', cam_gold: '金卡：佛牌相机。每张照片成为一尊新佛牌，背景自动去除。',
    cam_wait: '排队中', cam_cut: '正在去除背景', cam_send: '正在放上网页', cam_net: '没有网络，已存在手机上', cam_refused: '这张照片未通过', cam_retry: '再试一次', cam_getting: '正在下载去背工具 {a} / {b} MB', cam_nokeep: '手机无法保存照片。请保持此页打开，直到上传完成。', cam_dropq: '从手机删除这张照片？', cam_full: '网页已满，请先删除一尊',
    auto_t: '佛牌', lens: '搜索', post: '发帖', post_done: '文字已复制，贴到帖子里。', post_tail: '可请供，欢迎私信。',
    hint: '每尊佛牌都有自己的网页，可以分享，带 LINE 预订按钮。', free: '免费网页显示 6 尊；金卡显示 120 尊。', t: '名称', tEx: '崇迪佛 大模',
    shoot: '拍照', shootHint: '先拍正面，再拍背面。近拍很有用：年份印记、边缘、放在尺子旁。用自然光，不开闪光灯。', pick: '或从你的照片中选', fix: '美化',
    st: '状态', st_open: '可请', st_reserved: '已预订', st_sold: '已请走', st_show: '仅展示', p: '请供价', pHint: '留空：网页显示“询价”', form: '类别', none: '—',
    temple: '寺庙', maker: '师父 · 制作', year: '年份（佛历或公历）', mat: '材质', mould: '模版', size: '尺寸', sizeEx: '2.4 × 3.6 厘米', cond: '品相', frame: '外壳', cert: '鉴定卡（机构、编号）',
    certEx: '协会鉴定卡 12345', note: '介绍', add: '添加佛牌', open: '打开这一页', front: '正面', back: '背面', terms: '保证和寄送（每尊都显示）',
    termsEx: '保真，不真 7 天内退款 · EMS 寄送', tap_amulet: '佛牌页面', tap_reserve: '在 LINE 预订', line: '你的 LINE，预订按钮用', lineHint: '每尊佛牌的网页都有“在 LINE 预订”按钮，买家会发信息到这里。不填 LINE，按钮不会出现。' },
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
.am details.more>summary{cursor:pointer;font-weight:700;margin:8px 0}.amcam{margin:0 0 14px}.amcam .shoot{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:64px;border-radius:14px;font-size:18px;font-weight:800;cursor:pointer;background:var(--ink);color:#fff}.amcam .shoot input{display:none}.amcam .shoot.ghost{min-height:48px;margin-top:8px;font-size:16px;background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line)}
.amtray{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:10px 0 0}.amtray:empty{display:none}.amtray figure{position:relative;margin:0}.amtray img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;background:#141210}.amtray figure.cut img,.amtray figure.send img,.amtray figure.wait img{opacity:.6}
.amtray figcaption{font:600 12px/1.3 system-ui;margin-top:4px}.amtray .net figcaption,.amtray .refused figcaption{color:#b3261e}.amtray button{margin:4px 4px 0 0;padding:6px 10px;border:0;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 2px var(--line);font:700 13px system-ui;cursor:pointer}
.am .act{display:flex;gap:8px;margin:0 0 10px}.am .act button{flex:1;min-height:48px;border:0;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 2px var(--line);font:800 15px system-ui;cursor:pointer}.am .seg{margin:0 0 4px}.am .seg button{padding:10px 12px}.am .over{opacity:.5}</style>`

/** The section's form. h = make.js's helpers: S, T, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold, lang. */
export function amuletsSec(h) {
  const { S, val, esc, icon, imgUrl, photoPick, rowX, seg, isGold, lineHref, lang } = h
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
      ${x.photos.length ? `<div class="act"><button type="button" data-amlens="${i}">🔍 ${A('lens')}</button><button type="button" data-ampost="${i}">📣 ${A('post')}</button></div>` : ''}
      ${x.photos.length < AM_MAX.photos ? `<label class="shoot">${icon('camera')}${A('shoot')}<input type="file" accept="image/*" multiple data-amfile="${i}"></label><p class="hint">${A('shootHint')}</p>` : ''}
      ${S.d.photos.length ? `<details class="more"><summary>${A('pick')}</summary>${photoPick(`amulets.${i}.photos`, x.photos)}</details>` : ''}
      <label class="field"><span>${A('t')}</span><input data-k="amulets.${i}.t" value="${val(x.t)}" maxlength="100" placeholder="${A('tEx')}"></label>
      <div class="field"><span>${A('st')}</span>${seg(`amulets.${i}.status`, x.status, AM_STATUS.map((k) => [k, A('st_' + k)]))}</div>
      <div class="grid2f"><label class="mini"><span>${A('p')}</span><input data-k="amulets.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label>
      <label class="mini"><span>${A('form')}</span><select data-k="amulets.${i}.form"><option value="">${A('none')}</option>${AM_FORMS.map((f) => `<option value="${f[0]}"${f[0] === x.form ? ' selected' : ''}>${esc(amLabel(AM_FORMS, f[0], lang))}</option>`).join('')}</select></label></div>
      <p class="hint" style="margin-top:-4px">${A('pHint')}</p>
      ${dynFields(`amulets.${i}`, x, { lang, val, amulet: true })}
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
  const camera = isGold()
    ? `<div class="amcam"><label class="shoot">${icon('camera')}${A('cam')}<input type="file" accept="image/*" capture="environment" data-amcam></label>
      <label class="shoot ghost">${A('cam_pick')}<input type="file" accept="image/*" multiple data-amcam></label><p class="hint">${A('cam_hint')}</p>${amcamTray()}</div>`
    : `<p class="hint">${A('cam_gold')}</p>`
  const lineF = `<label class="field"><span>${A('line')}</span><input data-k="contact.line" value="${val(S.d.contact.line)}" autocapitalize="off" placeholder="@myshop"></label>${lineHref(S.d.contact.line) ? '' : `<p class="hint" style="margin-top:-4px">${A('lineHint')}</p>`}`
  return `${CSS}${DYN_CSS}${camera}${lineF}<p class="hint">${A('hint')}${isGold() ? '' : ' ' + A('free')}</p>${list('am-mat', AM_MATERIALS)}${list('am-cond', AM_CONDS)}<div class="rows">${rows.join('')}</div>
    ${S.d.amulets.length < AM_MAX.gold ? `<button class="go ghost" data-addrow="amulets">${icon('plus')}${A('add')}</button>` : ''}
    <label class="field" style="margin-top:16px"><span>${A('terms')}</span><textarea data-k="amterms" maxlength="600" style="min-height:70px" placeholder="${A('termsEx')}">${val(S.d.amterms)}</textarea></label>`
}
