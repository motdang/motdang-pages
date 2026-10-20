// make-market.mjs — a page made at the stall, in three screens (NaN 2026-10-20: "sign up a
// customer on the spot", Kamthieng and Warorot, 3 Nov). Opened from a QR code:
//   /make?by=<seller>#m=kamthieng&kind=amulet   ·   /make?by=<seller>#m=warorot&kind=shop
// 1 the shop's name · 2 LINE or phone · 3 the first thing: a photo, a name, today's price, and
// for made things how many a month and the lowest price — then it goes online and the usual
// "it's online" sheet hands over the link, the QR and the edit key. Everything else waits in
// the builder. make.js runs it; this file holds the words and the screens.

const W = {
  th: {
    s1: 'หน้าเว็บร้านคุณ ฟรี ใน 2 นาที', s1b: 'ลูกค้าเห็นของ เห็นราคา ทักไลน์ได้เลย', name: 'ชื่อร้าน', namePh: 'เช่น ผ้าทอป้าศรี', namePhAm: 'เช่น พระเครื่องลุงแก้ว', next: 'ต่อไป',
    s2: 'ลูกค้าติดต่อคุณทางไหน', line: 'ไลน์ไอดี', linePh: '@ร้านของฉัน หรือ ไอดีไลน์', phone: 'เบอร์โทร', pp: 'พร้อมเพย์ (ถ้ามี ลูกค้าโอนได้เลย)', ppPh: 'เบอร์โทรหรือเลขบัตร',
    s3am: 'พระองค์แรก', s3: 'ของชิ้นแรก', shoot: 'ถ่ายรูป', reshoot: 'ถ่ายใหม่', tAm: 'ชื่อพระ', tAmPh: 'เช่น เหรียญครูบาศรีวิชัย ปี 2482', t: 'ชื่อของ', tPh: 'เช่น ผ้าพันคอทอมือ',
    p: 'ราคาวันนี้', per: 'เดือนหนึ่งขายได้กี่ชิ้น', low: 'ราคาต่ำสุดที่รับได้',
    dynItem: 'ราคาจะขยับเองทุกวันจันทร์ ขายดี ขึ้น ขายช้า ลง ไม่ต่ำกว่าราคาต่ำสุดของคุณ', dynAm: 'ราคาจะขึ้นเองทุกวันจันทร์ ถ้ามีคนถามรุ่นนี้หลายคน ไม่มีคนถาม ราคาเท่าเดิม',
    go: 'ขึ้นออนไลน์', wait: 'กำลังขึ้นออนไลน์…', back: '‹ ย้อน', step: 'ขั้นที่ {n} จาก 3', needName: 'ใส่ชื่อร้านก่อน', needReach: 'ใส่ไลน์หรือเบอร์โทรอย่างน้อยหนึ่งอย่าง', needT: 'ใส่ชื่อและราคา',
    gold: 'หน้าเว็บนี้ฟรี 30 วันแรกเป็นหน้าทอง ใช้ได้ทุกอย่าง หลังจากนั้นหน้าเว็บยังออนไลน์ต่อแบบฟรี', more: 'เพิ่มของอีก', prices: 'ราคาและปุ่มขายแล้ว',
  },
  en: {
    s1: 'Your shop\'s page, free, in 2 minutes', s1b: 'Buyers see your things and prices and message you on LINE.', name: 'Shop name', namePh: 'e.g. Auntie Sri\'s Weaving', namePhAm: 'e.g. Uncle Kaew\'s Amulets', next: 'Next',
    s2: 'How do buyers reach you?', line: 'LINE ID', linePh: '@myshop or your LINE ID', phone: 'Phone', pp: 'PromptPay (if you have one, buyers can pay at once)', ppPh: 'Phone or ID number',
    s3am: 'Your first amulet', s3: 'Your first thing', shoot: 'Take a photo', reshoot: 'Take it again', tAm: 'Amulet name', tAmPh: 'e.g. Kruba Srivichai coin, BE 2482', t: 'What is it', tPh: 'e.g. Handwoven scarf',
    p: 'Price today', per: 'How many can you sell a month?', low: 'Lowest price you would take',
    dynItem: 'The price moves itself every Monday: sells well, up; sells slowly, down; never under your lowest.', dynAm: 'The price goes up itself every Monday when many people ask about this batch. No asks, it stays.',
    go: 'Put it online', wait: 'Putting it online…', back: '‹ Back', step: 'Step {n} of 3', needName: 'Type the shop name first', needReach: 'Give a LINE ID or a phone, at least one', needT: 'Give it a name and a price',
    gold: 'This page is free. Its first 30 days are Gold, everything on; after that it stays online free.', more: 'Add more things', prices: 'Prices and the Sold button',
  },
}
export const mw = (lang, k, v = {}) => String((W[lang] && W[lang][k]) || W.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '')

/** The markets a QR can name, and the kind of page each one starts. */
export const MARKETS = { kamthieng: 'amulet', warorot: 'shop' }

export const MARKET_CSS = `<style>.mk{max-width:520px;margin:0 auto;padding:18px 16px 40px}.mk .st{margin:0 0 6px;color:var(--mute,#5a4f6a);font-weight:700}.mk h1{margin:0 0 6px;font:900 30px/1.15 var(--display,system-ui)}
.mk .sub{margin:0 0 18px;font-size:18px}.mk .field span{font-size:17px;font-weight:800}.mk input{font-size:20px;min-height:58px}.mk .go{width:100%;min-height:64px;font-size:21px;margin-top:6px}
.mk .shot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;aspect-ratio:4/3;border-radius:18px;background:var(--ink,#1c1530);color:#fff;font:900 22px system-ui;cursor:pointer;overflow:hidden;margin:0 0 14px;position:relative}
.mk .shot input{display:none}.mk .shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.mk .shot .re{position:absolute;right:10px;bottom:10px;padding:6px 12px;border-radius:99px;background:rgba(0,0,0,.6);font-size:15px}
.mk .grid2f{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mk .dynnote{margin:4px 0 14px;padding:10px 12px;border-radius:12px;background:#e8f5ec;color:#0b5130;font-weight:700}.mk .backb{background:none;border:0;padding:8px 0;font:700 16px system-ui;color:var(--mute,#5a4f6a);cursor:pointer}
.mk .goldnote{margin:18px 0 0;color:var(--mute,#5a4f6a);font-size:15px}</style>`

/** One screen. s: 1, 2 or 3. x: the first thing (item or amulet). busy: a photo or the save under way. */
export function marketStep(s, { lang, esc, val, icon, d, kind, x, img, busy }) {
  const M = (k, v) => esc(mw(lang, k, v))
  const am = kind === 'amulet'
  const head = `${MARKET_CSS}<section class="mk">${s > 1 ? `<button class="backb" data-mback>${M('back')}</button>` : ''}<p class="st">${M('step', { n: s })}</p>`
  if (s === 1) return head + `<h1>${M('s1')}</h1><p class="sub">${M('s1b')}</p>
    <label class="field"><span>${M('name')}</span><input id="mkname" maxlength="60" autocomplete="off" placeholder="${M(am ? 'namePhAm' : 'namePh')}" value="${val(d?.name || '')}"></label>
    <button class="go red" data-mnext="1">${M('next')} →</button><p class="goldnote">${M('gold')}</p></section>`
  if (s === 2) return head + `<h1>${M('s2')}</h1>
    <label class="field"><span>${M('line')}</span><input data-mk="contact.line" value="${val(d.contact.line || '')}" autocapitalize="off" autocomplete="off" placeholder="${M('linePh')}"></label>
    <label class="field"><span>${M('phone')}</span><input data-mk="contact.phone" value="${val(d.contact.phone || '')}" inputmode="tel" autocomplete="tel"></label>
    ${am ? '' : `<label class="field"><span>${M('pp')}</span><input data-mk="pay.pp" value="${val(d.pay.pp || '')}" inputmode="numeric" placeholder="${M('ppPh')}"></label>`}
    <button class="go red" data-mnext="2">${M('next')} →</button></section>`
  const ph = x?.photos?.[0]
  return head + `<h1>${M(am ? 's3am' : 's3')}</h1>
    <label class="shot">${ph ? `<img src="${esc(img(ph))}" alt=""><span class="re">${M('reshoot')}</span>` : busy ? '…' : `${icon('camera')}${M('shoot')}`}<input type="file" accept="image/*" capture="environment" data-mkshot></label>
    <label class="field"><span>${M(am ? 'tAm' : 't')}</span><input data-mx="${am ? 't' : 'n'}" value="${val(x?.[am ? 't' : 'n'] || '')}" maxlength="${am ? 100 : 80}" placeholder="${M(am ? 'tAmPh' : 'tPh')}"></label>
    <div class="grid2f"><label class="field"><span>${M('p')}</span><input data-mx="p" value="${val(x?.p || '')}" inputmode="numeric" maxlength="12" placeholder="฿"></label>
    ${am ? '' : `<label class="field"><span>${M('per')}</span><input data-mx="dyn.per" value="${val(x?.dyn?.per || '')}" inputmode="numeric" maxlength="6"></label>`}</div>
    ${am ? '' : `<label class="field"><span>${M('low')}</span><input data-mx="dyn.low" value="${val(x?.dyn?.low || '')}" inputmode="numeric" maxlength="8" placeholder="฿"></label>`}
    <p class="dynnote">${M(am ? 'dynAm' : 'dynItem')}</p>
    <button class="go red" data-mnext="3"${busy ? ' disabled' : ''}>${M(busy ? 'wait' : 'go')}</button></section>`
}
