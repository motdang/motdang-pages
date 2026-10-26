// make-online.mjs — the builder's side of an online business page (Nan 2026-10-26): the package rows
// (inside the Bookings part make.js already has), the questions and answers, the news sign-up box, and
// the example business the first screen's phone shows. make.js passes its helpers in, like make-amulet.mjs.

import { ON_MAX, faqCap } from './online.mjs'

export const newFaq = () => ({ q: '', a: '' })

/** A filled example online business for the first screen's phone: a Chiang Mai English tutor. */
export function onlineExamples(th) {
  return th ? {
    currency: 'THB',
    tagline: 'สอนภาษาอังกฤษออนไลน์ สำหรับงานและการเดินทาง',
    about: 'ครูสอนภาษาอังกฤษในเชียงใหม่ สอนพูดและเขียนสำหรับงาน ตัวต่อตัวทางวิดีโอ ใช้ภาษาง่าย ตามจังหวะของคุณ',
    svc: [
      { n: 'ทดลองเรียน', mins: 30, p: '300', note: 'คุยกัน 30 นาที\nวัดระดับภาษา\nแผนเรียนเดือนแรก' },
      { n: 'แพ็กเกจรายเดือน', mins: 60, p: '3200', note: 'เรียน 60 นาที 4 ครั้ง\nตรวจการบ้านทุกสัปดาห์\nถามต่อทาง LINE ได้' },
      { n: 'คอร์สอังกฤษเพื่อการทำงาน', mins: 90, p: '9600', note: 'เรียน 90 นาที 12 ครั้ง\nอีเมล ประชุม และคุยโทรศัพท์\nมีใบรับรองตอนจบ' },
    ],
    faq: [
      { q: 'เรียนครั้งละนานเท่าไหร่', a: 'ส่วนใหญ่ 60 นาที ทดลองเรียน 30 นาที' },
      { q: 'ต้องมีอะไรบ้าง', a: 'มือถือหรือแล็ปท็อป และอินเทอร์เน็ต เรียนทางวิดีโอคอล' },
      { q: 'เปลี่ยนเวลาได้ไหม', a: 'ได้ บอกล่วงหน้า 1 วัน แล้วเรานัดเวลาใหม่' },
    ],
    quotes: [
      { q: 'พูดภาษาอังกฤษที่ทำงานได้มั่นใจขึ้นเยอะ เรียนเข้าใจง่ายและใจดี', who: 'พลอย' },
      { q: 'แผนชัดเจน การบ้านดี สัมภาษณ์งานผ่านแล้ว', who: 'คุณกิตติศักดิ์' },
    ],
  } : {
    currency: 'THB',
    tagline: 'English lessons on video, for work and travel',
    about: 'I am a teacher in Chiang Mai. I teach speaking and writing for work, one to one, on video. Lessons are in plain English, at your pace.',
    svc: [
      { n: 'Trial lesson', mins: 30, p: '300', note: 'A 30-minute call\nWe find your level\nA plan for your first month' },
      { n: 'Monthly package', mins: 60, p: '3200', note: 'Four 60-minute lessons\nHomework checked each week\nQuestions on LINE' },
      { n: 'Work English course', mins: 90, p: '9600', note: 'Twelve 90-minute lessons\nEmails, meetings and calls\nA certificate at the end' },
    ],
    faq: [
      { q: 'How long is a lesson?', a: 'Most lessons are 60 minutes. A trial lesson is 30 minutes.' },
      { q: 'What do I need?', a: 'A phone or a laptop, and the internet. We meet on a video call.' },
      { q: 'Can I change the time?', a: 'Yes. Tell me one day before and we find a new time.' },
    ],
    quotes: [
      { q: 'I speak with more confidence at work now. The lessons are clear and kind.', who: 'Ploy' },
      { q: 'A simple plan and good homework. I passed my interview.', who: 'Kittisak' },
    ],
  }
}

/** The package rows: name, price, minutes, people at once (Gold), and what is in it a line each. h = { S, T, val, rowX, num, isGold }. */
export function packageRows(h) {
  const { S, T, val, rowX, num, isGold } = h
  return S.d.svc.map((x, i) => `<div class="rowc">${rowX('svc', i)}
      <label class="field"><span>${T('pk_name')}</span><input data-k="svc.${i}.n" value="${val(x.n)}" maxlength="80" placeholder="${T('pk_nameEx')}"></label>
      <div class="grid3f"><label class="mini"><span>${T('price')}</span><input data-k="svc.${i}.p" value="${val(x.p)}" maxlength="24" inputmode="decimal"></label>
      ${num(`svc.${i}.mins`, x.mins, T('pk_mins'), 'min="10" max="720" step="5"')}${isGold() ? num(`svc.${i}.cap`, x.cap, T('b_cap'), 'min="1" max="50"') : ''}</div>
      <label class="field"><span>${T('pk_in')}</span><textarea data-k="svc.${i}.note" maxlength="400" style="min-height:96px" placeholder="${T('pk_inEx')}">${val(x.note)}</textarea></label></div>`).join('')
}

/** The questions and answers part. */
export function faqSec(h) {
  const { S, T, val, icon, rowX, isGold } = h
  const cap = faqCap(isGold())
  return `<p class="hint">${T('faq_hint')}</p><div class="rows">${S.d.faq.map((x, i) => `<div class="rowc${i >= cap ? ' over' : ''}">${rowX('faq', i)}
      <label class="field"><span>${T('faq_q')}</span><input data-k="faq.${i}.q" value="${val(x.q)}" maxlength="200" placeholder="${T('faq_qEx')}"></label>
      <label class="field"><span>${T('faq_a')}</span><textarea data-k="faq.${i}.a" maxlength="1500" style="min-height:90px">${val(x.a)}</textarea></label></div>`).join('')}</div>
      ${S.d.faq.length < ON_MAX.faq ? `<button class="go ghost" data-addrow="faq">${icon('plus')}${T('faq_add')}</button>` : ''}`
}

/** The news sign-up part: on or off, the heading and a line, and where the people go. */
export function signupSec(h) {
  const { S, T, val, esc, icon } = h
  const s = S.d.signup
  return `<label class="check"><input type="checkbox" class="sw" data-k="signup.on" ${s.on ? 'checked' : ''}>${T('su_on')}</label>
      <div ${s.on ? '' : 'hidden'}><label class="field"><span>${T('su_t')}</span><input data-k="signup.t" value="${val(s.t)}" maxlength="60" placeholder="${T('su_tEx')}"></label>
      <label class="field"><span>${T('su_note')}</span><input data-k="signup.note" value="${val(s.note)}" maxlength="160" placeholder="${T('su_noteEx')}"></label>
      <p class="hint">${T('su_hint')}</p>
      <button class="go ghost" data-tab="cust">${icon('people')}${T('su_see')}</button></div>`
}
