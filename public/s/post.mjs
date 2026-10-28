// post.mjs — "Post it home" on a Gold page (Nan 2026-10-28, for Fashion King: "ship stuff once it's been made, so
// short-term visitors to cm can get a package at home"). A visitor who leaves before the work is ready gives a home
// address; it comes in as an order in the Orders tab (orders.mjs postHome). The maker presses Paid when the postage is
// paid, then Shipped with a tracking number, or Mot Dang posts it (shipjob.mjs) when the page ships with Mot Dang.
// The postage is the page's own shipping prices (d.ship.th, d.ship.world).

const str = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n)

export function normalizePost(d, o) {
  const p = d.post && typeof d.post === 'object' ? d.post : {}
  o.post = { on: !!p.on, note: str(p.note, 240) }
  return o
}

export const PW = {
  en: {
    postT: 'Post it home', postHint: 'Leaving before it is ready? Give us your home address. We post it to you and email the tracking number.',
    postTH: 'In Thailand {p}', postWorld: 'Abroad {p}', postAsk: 'Postage: we tell you the price',
    postName: 'Your name', postEmail: 'Email, for the tracking number', postReach: 'Phone, LINE or WhatsApp', postAddr: 'Home address', postCc: 'Country',
    postWhat: 'What we are making, or your booking number', postSend: 'Send my address', postDone: 'We have your address.', postPage: 'Your parcel page',
    postBad: 'Check the name, email and address.', postFail: 'Not sent. Try again.',
  },
  th: {
    postT: 'ส่งไปถึงบ้าน', postHint: 'กลับก่อนงานเสร็จ? ให้ที่อยู่บ้านไว้ เราส่งไปให้ และส่งเลขพัสดุทางอีเมล',
    postTH: 'ในไทย {p}', postWorld: 'ต่างประเทศ {p}', postAsk: 'ค่าส่ง: เราแจ้งราคาให้',
    postName: 'ชื่อของคุณ', postEmail: 'อีเมล สำหรับเลขพัสดุ', postReach: 'โทร LINE หรือ WhatsApp', postAddr: 'ที่อยู่บ้าน', postCc: 'ประเทศ',
    postWhat: 'งานที่สั่ง หรือเลขการจอง', postSend: 'ส่งที่อยู่', postDone: 'ได้รับที่อยู่แล้ว', postPage: 'หน้าพัสดุของคุณ',
    postBad: 'ตรวจชื่อ อีเมล และที่อยู่', postFail: 'ยังไม่ได้ส่ง ลองอีกครั้ง',
  },
  zh: {
    postT: '寄到家', postHint: '离开时还没做好？留下家庭地址，我们寄给你，并用邮件发送快递单号。',
    postTH: '泰国境内 {p}', postWorld: '国外 {p}', postAsk: '邮费：我们告诉你价格',
    postName: '你的名字', postEmail: '邮箱，用于快递单号', postReach: '电话、LINE 或 WhatsApp', postAddr: '家庭地址', postCc: '国家',
    postWhat: '我们在做什么，或你的预约号', postSend: '发送地址', postDone: '我们收到了你的地址。', postPage: '你的包裹页面',
    postBad: '请检查名字、邮箱和地址。', postFail: '没有发送，请再试一次。',
  },
  fr: {
    postT: 'Envoi à domicile', postHint: 'Vous partez avant que ce soit prêt ? Donnez-nous votre adresse. Nous vous l’envoyons et vous écrivons le numéro de suivi.',
    postTH: 'En Thaïlande {p}', postWorld: 'À l’étranger {p}', postAsk: 'Port : nous vous donnons le prix',
    postName: 'Votre nom', postEmail: 'E-mail, pour le numéro de suivi', postReach: 'Téléphone, LINE ou WhatsApp', postAddr: 'Adresse', postCc: 'Pays',
    postWhat: 'Ce que nous faisons pour vous, ou votre numéro de réservation', postSend: 'Envoyer mon adresse', postDone: 'Nous avons votre adresse.', postPage: 'Votre colis',
    postBad: 'Vérifiez le nom, l’e-mail et l’adresse.', postFail: 'Non envoyé. Réessayez.',
  },
}
export const pw = (lang, k, v) => {
  let s = (PW[lang] && PW[lang][k]) || PW.en[k] || k
  if (v) for (const [a, b] of Object.entries(v)) s = s.replace('{' + a + '}', b)
  return s
}

/** The part on the page: the prices, then the form. h = { lang, esc, H2, icon, d, money, sym } */
export function postSection(h) {
  const { lang, esc, H2, icon, d, money, sym } = h
  const P = (k, v) => esc(pw(lang, k, v))
  const th = d.ship.th, world = d.ship.world
  const prices = [th ? P('postTH', { p: money(th, sym) }) : '', world ? P('postWorld', { p: money(world, sym) }) : ''].filter(Boolean)
  return `<section class="card rise post" id="post">${H2('post', P('postT'))}<p>${d.post.note ? esc(d.post.note) : P('postHint')}</p>` +
    `<p class="postp">${icon('route')}<b>${prices.length ? prices.join(' · ') : P('postAsk')}</b></p>` +
    `<form class="msgf postf" id="postf" data-born="0"><input name="name" maxlength="80" autocomplete="name" required placeholder="${P('postName')}" aria-label="${P('postName')}">` +
    `<input name="email" type="email" maxlength="254" autocomplete="email" required placeholder="${P('postEmail')}" aria-label="${P('postEmail')}">` +
    `<input name="reach" maxlength="120" autocomplete="tel" placeholder="${P('postReach')}" aria-label="${P('postReach')}">` +
    `<textarea name="addr" maxlength="400" required autocomplete="street-address" placeholder="${P('postAddr')}" aria-label="${P('postAddr')}" style="min-height:90px"></textarea>` +
    `<label class="postcc"><span>${P('postCc')}</span><select name="cc" data-lang="${esc(lang)}"><option value="">—</option></select></label>` +
    `<textarea name="note" maxlength="400" placeholder="${P('postWhat')}" aria-label="${P('postWhat')}" style="min-height:60px"></textarea>` +
    `<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">` +
    `<button class="btn" type="submit" data-t="post">${icon('route')}${P('postSend')}</button></form></section>`
}

/** The words page.js needs for the form's answers. */
export const postW = (lang) => ['postDone', 'postPage', 'postBad', 'postFail'].map((k) => [k, pw(lang, k)])

export const POST_CSS = `.post .postp{display:flex;align-items:center;gap:8px;margin:0 0 14px;color:var(--acc-ink)}.post .postp .i{flex:none}
.postcc{display:flex;flex-direction:column;gap:4px;font:600 15px var(--body)}.postcc select{min-height:52px;padding:0 12px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--ink);font:500 17px var(--body)}
`
