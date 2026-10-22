// words-cust.mjs — what a reader meets for the customer list, the monthly news and the day-before
// reminders (Nan 2026-10-22): the tick box on the forms, the guest page's LINE button, the reminder and
// news emails, the unsubscribe page. Thai first; English, Burmese and Chinese beside it.

export const C = {
  th: {
    newsOpt: 'ข่าวจาก {n} เดือนละครั้งไม่เกิน', newsMail: 'อีเมลสำหรับข่าว',
    remindLine: 'เตือนฉันทาง LINE', lineSet: 'ตั้งเตือนทาง LINE แล้ว {t}', lineAdd: 'เพิ่ม Mot Dang เป็นเพื่อนใน LINE เพื่อรับข้อความ', lineAddBtn: 'เพิ่มเพื่อน', lineFail: 'ยังตั้งเตือนไม่ได้ ลองอีกครั้ง', lineSoon: 'ใกล้เวลาแล้ว ตั้งเตือนทาง LINE ไม่ทัน', // stylecheck: allow — เตือน names the feature (a reminder), not advice
    remTomorrow: 'พรุ่งนี้', remSubject: 'เตือนการจอง', remWhen: 'เวลา', remWhere: 'สถานที่', remMap: 'แผนที่', remCall: 'โทร', remManage: 'การจองของคุณ · ยกเลิกได้ที่นี่', // stylecheck: allow — เตือน names the feature (a reminder), not advice
    svcWhat: 'บริการ', svcWhen: 'เวลา', svcPeople: 'จำนวนคน', svcName: 'ชื่อ',
    newsFrom: 'ข่าวจาก', newsOpen: 'เปิดหน้าเว็บ', newsWhy: 'คุณได้รับอีเมลนี้เพราะติ๊กรับข่าวจาก {n}', newsStop: 'ไม่รับข่าวอีก',
    unsubDone: 'ไม่รับข่าวจาก {n} แล้ว', unsubUndo: 'รับข่าวต่อ', unsubBack: 'รับข่าวจาก {n} ต่อแล้ว', unsubBad: 'ลิงก์นี้ใช้ไม่ได้',
  },
  en: {
    newsOpt: 'News from {n}, once a month at most', newsMail: 'Email for news',
    remindLine: 'Remind me on LINE', lineSet: 'LINE reminder set for {t}', lineAdd: 'Add Mot Dang as a friend on LINE to receive it', lineAddBtn: 'Add friend', lineFail: 'The reminder was not set. Try again.', lineSoon: 'Too close to set a LINE reminder',
    remTomorrow: 'Tomorrow', remSubject: 'Booking reminder', remWhen: 'Time', remWhere: 'Place', remMap: 'Map', remCall: 'Call', remManage: 'Your booking · cancel here',
    svcWhat: 'Service', svcWhen: 'Time', svcPeople: 'People', svcName: 'Name',
    newsFrom: 'News from', newsOpen: 'Open the page', newsWhy: 'You get this email because you ticked news from {n}', newsStop: 'Stop these emails',
    unsubDone: 'No more news from {n}', unsubUndo: 'Keep sending', unsubBack: 'News from {n} is back on', unsubBad: 'This link does not work',
  },
  my: {
    newsOpt: '{n} ထံမှ သတင်း၊ တစ်လလျှင် တစ်ကြိမ်ထက် မပိုပါ', newsMail: 'သတင်းအတွက် အီးမေးလ်',
    remindLine: 'LINE ဖြင့် သတိပေးပါ', lineSet: 'LINE သတိပေးချက် {t} တွင် သတ်မှတ်ပြီး', lineAdd: 'မက်ဆေ့ချ်ရရန် LINE တွင် Mot Dang ကို သူငယ်ချင်းအဖြစ် ထည့်ပါ', lineAddBtn: 'သူငယ်ချင်းထည့်ရန်', lineFail: 'သတိပေးချက် မသတ်မှတ်နိုင်ပါ။ ထပ်စမ်းပါ။', lineSoon: 'အချိန်နီးလွန်း၍ LINE သတိပေးချက် မသတ်မှတ်နိုင်ပါ',
    remTomorrow: 'မနက်ဖြန်', remSubject: 'ကြိုတင်မှာယူမှု သတိပေးချက်', remWhen: 'အချိန်', remWhere: 'နေရာ', remMap: 'မြေပုံ', remCall: 'ဖုန်းခေါ်ရန်', remManage: 'သင့်ကြိုတင်မှာယူမှု · ဤနေရာတွင် ပယ်ဖျက်နိုင်သည်',
    svcWhat: 'ဝန်ဆောင်မှု', svcWhen: 'အချိန်', svcPeople: 'လူအရေအတွက်', svcName: 'အမည်',
    newsFrom: 'သတင်း -', newsOpen: 'ဝဘ်စာမျက်နှာဖွင့်ရန်', newsWhy: '{n} ထံမှ သတင်းကို အမှန်ခြစ်ထားသောကြောင့် ဤအီးမေးလ်ရရှိသည်', newsStop: 'ဤအီးမေးလ်များ ရပ်ရန်',
    unsubDone: '{n} ထံမှ သတင်း မရတော့ပါ', unsubUndo: 'ဆက်လက်ရယူရန်', unsubBack: '{n} ထံမှ သတင်း ပြန်ရပါမည်', unsubBad: 'ဤလင့်ခ်သည် အလုပ်မလုပ်ပါ',
  },
  zh: {
    newsOpt: '来自 {n} 的消息，每月最多一次', newsMail: '接收消息的邮箱',
    remindLine: '用 LINE 提醒我', lineSet: '已设置 LINE 提醒：{t}', lineAdd: '请在 LINE 上添加 Mot Dang 为好友，才能收到', lineAddBtn: '添加好友', lineFail: '提醒没有设置成功，请再试一次。', lineSoon: '时间太近，来不及设置 LINE 提醒',
    remTomorrow: '明天', remSubject: '预约提醒', remWhen: '时间', remWhere: '地点', remMap: '地图', remCall: '拨打电话', remManage: '你的预约 · 在这里取消',
    svcWhat: '服务', svcWhen: '时间', svcPeople: '人数', svcName: '姓名',
    newsFrom: '来自', newsOpen: '打开网页', newsWhy: '你收到这封邮件，是因为你勾选了接收 {n} 的消息', newsStop: '不再接收',
    unsubDone: '不再接收 {n} 的消息', unsubUndo: '继续接收', unsubBack: '已恢复接收 {n} 的消息', unsubBad: '这个链接无法使用',
  },
}

/** One phrase in a language (Thai when the language has none), with {x} filled. */
export function cw(lang, k, v) {
  let s = (C[lang] && C[lang][k]) || C.th[k] || k
  if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b)
  return s
}
/** The second language beside Thai: the page's own when it is English, Burmese or Chinese, else English. */
export const beside = (lang) => (lang === 'my' || lang === 'zh' ? lang : 'en')
/** Thai first, the other language after it. */
export const both = (lang, k, v) => [cw('th', k, v), cw(beside(lang), k, v)]
