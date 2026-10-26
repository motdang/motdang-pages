// words-online.mjs — what a reader meets on an online business page (Nan 2026-10-26): the packages,
// the questions and answers, the news sign-up box, and the confirm email and page that go with it.
// Thai, English, Burmese, Chinese; any other page language reads English. Plain short words.

export const O = {
  en: {
    packages: 'Packages', pkgBook: 'Book a call', pkgAsk: 'Ask', pkgMore: 'More packages', askPkg: 'I would like to ask about: {n}',
    faqT: 'Questions and answers',
    joinT: 'Get our news', joinNote: 'One email a month at most. First we send a link to confirm.',
    joinName: 'Your name (if you like)', joinMail: 'Your email', joinGo: 'Join',
    joinSent: 'Check your email. Press the link to confirm.', joinFail: 'Not sent. Try again.', joinBad: 'Check the email address.',
    joinPreview: 'Visitors join your list here.',
    jSubject: 'Confirm: news from {n}', jHi: 'Press the button to get news from {n}. One email a month at most.', jBtn: 'Yes, send me the news',
    jIgnore: 'If you did not ask for this, do nothing.',
    jAsk: 'Get news from {n}?', jYes: 'Yes, join', jDone: 'You are on the list for {n}.', jBad: 'This link does not work.', jLeave: 'Leave the list',
  },
  th: {
    packages: 'แพ็กเกจ', pkgBook: 'จองคิวคุย', pkgAsk: 'สอบถาม', pkgMore: 'แพ็กเกจอื่น', askPkg: 'สนใจสอบถาม: {n}',
    faqT: 'คำถามและคำตอบ',
    joinT: 'รับข่าวจากเรา', joinNote: 'ส่งอีเมลเดือนละครั้งไม่เกิน ก่อนอื่นเราส่งลิงก์ให้กดยืนยัน',
    joinName: 'ชื่อ (ใส่หรือไม่ก็ได้)', joinMail: 'อีเมลของคุณ', joinGo: 'สมัคร',
    joinSent: 'ดูอีเมลของคุณ แล้วกดลิงก์เพื่อยืนยัน', joinFail: 'ยังไม่ได้ส่ง ลองอีกครั้ง', joinBad: 'ตรวจอีเมลอีกครั้ง',
    joinPreview: 'ผู้เข้าชมสมัครรับข่าวตรงนี้',
    jSubject: 'ยืนยัน: ข่าวจาก {n}', jHi: 'กดปุ่มเพื่อรับข่าวจาก {n} ส่งเดือนละครั้งไม่เกิน', jBtn: 'ใช่ ส่งข่าวมาให้ฉัน',
    jIgnore: 'ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร',
    jAsk: 'รับข่าวจาก {n} ไหม', jYes: 'ใช่ รับ', jDone: 'คุณอยู่ในรายชื่อของ {n} แล้ว', jBad: 'ลิงก์นี้ใช้ไม่ได้', jLeave: 'เลิกรับข่าว',
  },
  my: {
    packages: 'ပက်ကေ့ချ်များ', pkgBook: 'စကားပြောချိန် ချိန်းရန်', pkgAsk: 'မေးရန်', pkgMore: 'ထပ်ရှိသော ပက်ကေ့ချ်များ', askPkg: 'မေးလိုပါသည်: {n}',
    faqT: 'မေးခွန်းနှင့် အဖြေများ',
    joinT: 'ကျွန်ုပ်တို့၏ သတင်းရယူပါ', joinNote: 'တစ်လလျှင် အီးမေးလ်တစ်စောင်ထက် မပိုပါ။ အတည်ပြုရန် လင့်ခ်ကို အရင်ပို့မည်။',
    joinName: 'သင့်အမည် (ထည့်လိုလျှင်)', joinMail: 'သင့်အီးမေးလ်', joinGo: 'ဝင်ရန်',
    joinSent: 'အီးမေးလ်ကြည့်ပါ။ အတည်ပြုရန် လင့်ခ်ကိုနှိပ်ပါ။', joinFail: 'မပို့ရသေးပါ။ ထပ်ကြိုးစားပါ။', joinBad: 'အီးမေးလ်လိပ်စာကို စစ်ပါ။',
    joinPreview: 'လာရောက်ကြည့်သူများ ဤနေရာတွင် ဝင်ပါမည်။',
    jSubject: 'အတည်ပြုရန်: {n} မှ သတင်း', jHi: '{n} မှ သတင်းရယူရန် ခလုတ်ကိုနှိပ်ပါ။ တစ်လလျှင် အီးမေးလ်တစ်စောင်ထက် မပိုပါ။', jBtn: 'ဟုတ်ကဲ့၊ သတင်းပို့ပါ',
    jIgnore: 'သင်မတောင်းဆိုခဲ့လျှင် ဘာမှမလုပ်ပါနှင့်။',
    jAsk: '{n} မှ သတင်းရယူမလား', jYes: 'ဟုတ်ကဲ့၊ ဝင်မည်', jDone: 'သင်သည် {n} ၏ စာရင်းထဲတွင် ရှိပါပြီ။', jBad: 'ဤလင့်ခ် အလုပ်မလုပ်ပါ။', jLeave: 'စာရင်းမှ ထွက်ရန်',
  },
  zh: {
    packages: '套餐', pkgBook: '预约通话', pkgAsk: '咨询', pkgMore: '更多套餐', askPkg: '我想咨询：{n}',
    faqT: '问与答',
    joinT: '订阅我们的消息', joinNote: '每月最多一封邮件。我们先发一个确认链接。',
    joinName: '你的名字（可不填）', joinMail: '你的邮箱', joinGo: '订阅',
    joinSent: '请查看邮箱，点链接确认。', joinFail: '没发出去，请再试一次。', joinBad: '请检查邮箱地址。',
    joinPreview: '访客在这里订阅。',
    jSubject: '请确认：来自 {n} 的消息', jHi: '点按钮接收来自 {n} 的消息。每月最多一封邮件。', jBtn: '好，给我发消息',
    jIgnore: '如果不是你申请的，不用做任何事。',
    jAsk: '接收来自 {n} 的消息吗？', jYes: '好，订阅', jDone: '你已在 {n} 的名单上。', jBad: '这个链接无法使用', jLeave: '退出名单',
  },
}

/** The phrase `k` in `lang`, English when the language has none; {x} filled from `v`. */
export function ow(lang, k, v) {
  let s = (O[lang] && O[lang][k]) || O.en[k] || k
  if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b)
  return s
}
/** Thai first, the page's own language beside it (English, Burmese or Chinese; English for the rest). */
export const owBoth = (lang, k, v) => [ow('th', k, v), ow(lang === 'my' || lang === 'zh' ? lang : 'en', k, v)]

/** The words the page's own script needs, for the sign-up box. */
export const JOIN_KEYS = ['joinSent', 'joinFail', 'joinBad', 'pkgAsk', 'askPkg']
