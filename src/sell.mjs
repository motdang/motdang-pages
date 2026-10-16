// sell.mjs — /sell: the work Hom does, open to more people like Hom (NaN 2026-10-16).
//
//   /sell                 the work and the pay, and the sign-up (English · ไทย · မြန်မာ)
//   /sell/<id>.<tok>      a seller's kit: their QR, this month, what to say, their payouts
//   /h/<id>.<exp>.<sig>   Beer's link for a sign-up: Yes · No (no password)
//   /p/<id>.<exp>.<sig>   Beer's link for a payout: the seller's PromptPay QR, Paid
//
// The money side is sellers.mjs.

import { qrSvg } from '../public/s/render.mjs'
import { promptPayPayload, normalisePayee } from './promptpay.mjs'
import { LADDER, START, BONUS, freeId, standing } from './sellers.mjs'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const nf = (n) => new Intl.NumberFormat('en').format(n)
const LANGS = { en: 'English', th: 'ไทย', my: 'မြန်မာ' }
const EXAMPLE = 'motdang-net'
const BEER_DAYS = 30

// ---- words --------------------------------------------------------------------------

const W = {
  en: {
    title: 'Sell for Mot Dang', h1: (r) => `Sell pages to shops. Keep ${r}%.`,
    lead: 'Shops and hotels in Chiang Mai buy a year of their own page on Mot Dang. You show them, they pay by PromptPay, and your share is paid on the 1st of the month.',
    work: 'The work', price: 'Price', you: 'You get', example: 'Example to show',
    gold: ['Gold year', 'any shop, café, clinic, service'], hotel: ['Hotel year', 'hotels, guesthouses, hostels: guests book rooms on the page'],
    pay: 'Pay',
    ladder: (r, t, l) => `Start at ${r}%. Each month the share moves one step on ${l}: sell 80% of ฿${t} or more, one step up; under 60%, one step down.`,
    paid: 'Paid on the 1st, to your PromptPay.', bring: (b) => `Bring a seller: ฿${b} when they sell their first plan.`,
    money: 'Customers pay only through the QR on their own page. No cash.',
    need: 'You need', needs: 'A phone, LINE, a PromptPay number, and time to walk into shops. Thai, Burmese or English.',
    steps: 'Steps', s: ['Sign up below.', 'Beer sends you your kit on LINE: your QR, an example page, what to say.', 'Visit shops. They scan your QR, make their page with you in about 5 minutes, and pay.', 'Each sale shows on your kit page as it happens.'],
    signup: 'Sign up', f: { name: 'Name', phone: 'Phone', line: 'LINE ID', pp: 'PromptPay (phone or ID card number)', area: 'Where you can go', langs: 'Languages you speak', via: 'Who sent you', send: 'Send' },
    thanks: (n) => `Thank you, ${n}. Beer will message you on LINE.`, bad: 'Name, phone and PromptPay, please.', badpp: 'PromptPay: a 10-digit phone or a 13-digit ID card number.',
    kit: (n) => `${n} · your kit`, month: 'This month', plans: 'Plans', sales: 'Sales', share: 'Share', get: 'You get', target: 'Target',
    qr: 'Your QR', qrnote: 'Shops scan this with the phone camera. It opens the page maker with your name on it.', save: 'Save picture',
    say: 'What to say', how: 'At the shop',
    k: ['Hotels and guesthouses first: the bigger sale.', 'Show the example page on your phone.', 'They scan your QR and make the page with you: name, kind, photos, LINE, map pin.', 'They send the edit link to themselves on LINE. It is the only key.', 'Tap Gold, pick the year, pay the exact amount in the bank app, upload the slip.', 'Not today? The page stays, Gold free for 30 days. Go back on day 25; a later sale is still yours.'],
    bringH: 'Bring a seller', bringN: (b) => `฿${b} when they sell their first plan. Send them this link:`, lineSend: 'Send on LINE', brought: 'Brought',
    pays: 'Payouts', isPaid: 'paid', isDue: 'due', ask: 'Questions: Beer on LINE · Discord #sales', waiting: 'Beer has your sign-up. Your kit opens here once she says yes.',
  },
  th: {
    title: 'ขายกับมดแดง', h1: (r) => `ขายหน้าเว็บให้ร้านค้า รับ ${r}%`,
    lead: 'ร้านค้าและโรงแรมในเชียงใหม่ซื้อหน้าเว็บของตัวเองบนมดแดงเป็นรายปี คุณไปเสนอ ร้านจ่ายผ่านพร้อมเพย์ ส่วนแบ่งของคุณจ่ายทุกวันที่ 1 ของเดือน',
    work: 'งาน', price: 'ราคา', you: 'คุณได้', example: 'ตัวอย่างให้ร้านดู',
    gold: ['ทองรายปี', 'ร้าน คาเฟ่ คลินิก งานบริการ ทุกแบบ'], hotel: ['โรงแรมรายปี', 'โรงแรม เกสต์เฮาส์ โฮสเทล แขกจองห้องบนหน้าเว็บ'],
    pay: 'ค่าตอบแทน',
    ladder: (r, t, l) => `เริ่มที่ ${r}% ทุกเดือนส่วนแบ่งขยับหนึ่งขั้นบน ${l}: ขายได้ 80% ของ ฿${t} ขึ้นไป ขึ้นหนึ่งขั้น ต่ำกว่า 60% ลงหนึ่งขั้น`,
    paid: 'จ่ายทุกวันที่ 1 เข้าพร้อมเพย์ของคุณ', bring: (b) => `ชวนคนขายมาเพิ่ม: รับ ฿${b} เมื่อเขาขายได้ครั้งแรก`,
    money: 'ลูกค้าจ่ายผ่าน QR บนหน้าเว็บของเขาเท่านั้น ไม่รับเงินสด',
    need: 'สิ่งที่ต้องมี', needs: 'มือถือ LINE เบอร์พร้อมเพย์ และเวลาเดินเข้าร้าน พูดไทย พม่า หรืออังกฤษ',
    steps: 'ขั้นตอน', s: ['สมัครด้านล่าง', 'เบียร์ส่งชุดของคุณทาง LINE: QR ของคุณ หน้าตัวอย่าง และคำพูดที่ใช้', 'ไปตามร้าน ร้านสแกน QR ของคุณ ทำหน้าเว็บด้วยกันประมาณ 5 นาที แล้วจ่าย', 'ยอดขายแต่ละครั้งขึ้นในหน้าชุดของคุณทันที'],
    signup: 'สมัคร', f: { name: 'ชื่อ', phone: 'เบอร์โทร', line: 'LINE ID', pp: 'พร้อมเพย์ (เบอร์โทรหรือเลขบัตรประชาชน)', area: 'พื้นที่ที่ไปได้', langs: 'ภาษาที่พูดได้', via: 'ใครแนะนำมา', send: 'ส่ง' },
    thanks: (n) => `ขอบคุณ ${n} เบียร์จะทักไปทาง LINE`, bad: 'กรอกชื่อ เบอร์โทร และพร้อมเพย์', badpp: 'พร้อมเพย์: เบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก',
    kit: (n) => `${n} · ชุดของคุณ`, month: 'เดือนนี้', plans: 'แผนที่ขาย', sales: 'ยอดขาย', share: 'ส่วนแบ่ง', get: 'คุณได้', target: 'เป้า',
    qr: 'QR ของคุณ', qrnote: 'ร้านสแกนด้วยกล้องมือถือ เปิดหน้าทำเว็บที่มีชื่อคุณ', save: 'บันทึกรูป',
    say: 'คำพูด', how: 'ที่ร้าน',
    k: ['ไปโรงแรมและเกสต์เฮาส์ก่อน ยอดใหญ่กว่า', 'เปิดหน้าตัวอย่างในมือถือให้ดู', 'ร้านสแกน QR ของคุณ แล้วทำหน้าเว็บด้วยกัน: ชื่อ ประเภท รูป LINE หมุดแผนที่', 'ให้ร้านส่งลิงก์แก้ไขเข้า LINE ตัวเอง ลิงก์นี้เป็นกุญแจเดียว', 'กด Gold เลือกแผนรายปี จ่ายตรงยอดในแอปธนาคาร อัปโหลดสลิป', 'ยังไม่ซื้อ? หน้าเว็บยังอยู่ ใช้ทองฟรี 30 วัน กลับไปวันที่ 25 จ่ายทีหลังก็ยังนับเป็นของคุณ'],
    bringH: 'ชวนคนขาย', bringN: (b) => `รับ ฿${b} เมื่อเขาขายได้ครั้งแรก ส่งลิงก์นี้ให้เขา:`, lineSend: 'ส่งทาง LINE', brought: 'ชวนมาแล้ว',
    pays: 'การจ่ายเงิน', isPaid: 'จ่ายแล้ว', isDue: 'รอจ่าย', ask: 'สงสัย ถามเบียร์ทาง LINE · Discord #sales', waiting: 'เบียร์ได้ใบสมัครแล้ว ชุดของคุณจะเปิดที่นี่เมื่อเบียร์ตอบรับ',
  },
  my: {
    title: 'Mot Dang အတွက် ရောင်းပါ', h1: (r) => `ဆိုင်များကို စာမျက်နှာ ရောင်းပါ။ ${r}% ရယူပါ။`,
    lead: 'ချင်းမိုင်ရှိ ဆိုင်များနှင့် ဟိုတယ်များသည် Mot Dang ပေါ်တွင် ကိုယ်ပိုင်စာမျက်နှာကို တစ်နှစ်စာ ဝယ်ကြသည်။ သင်က ပြသပါ၊ သူတို့က PromptPay ဖြင့် ပေးချေပါ၊ သင့်ဝေစုကို လဆန်း ၁ ရက်နေ့ ပေးပါသည်။',
    work: 'အလုပ်', price: 'ဈေး', you: 'သင်ရမည်', example: 'ပြရန် နမူနာ',
    gold: ['ရွှေ တစ်နှစ်', 'ဆိုင်၊ ကော်ဖီဆိုင်၊ ဆေးခန်း၊ ဝန်ဆောင်မှု မည်သည့်ဆိုင်မဆို'], hotel: ['ဟိုတယ် တစ်နှစ်', 'ဟိုတယ်၊ တည်းခိုခန်း၊ ဟော်စတယ် · ဧည့်သည်များ စာမျက်နှာပေါ်တွင် အခန်းမှာနိုင်'],
    pay: 'လစာ',
    ladder: (r, t, l) => `${r}% မှ စတင်သည်။ လစဉ် ဝေစုသည် ${l} ပေါ်တွင် တစ်ဆင့် ရွေ့သည်: ฿${t} ၏ 80% နှင့်အထက် ရောင်းလျှင် တစ်ဆင့်တက်၊ 60% အောက် တစ်ဆင့်ဆင်း။`,
    paid: 'လဆန်း ၁ ရက်နေ့ သင့် PromptPay သို့ ပေးသည်။', bring: (b) => `ရောင်းသူ တစ်ဦး ခေါ်လာပါ: သူ ပထမဆုံး ရောင်းရသောအခါ ฿${b}။`,
    money: 'ဖောက်သည်များ သူတို့စာမျက်နှာရှိ QR မှသာ ပေးချေသည်။ ငွေသား မယူရ။',
    need: 'လိုအပ်သည်', needs: 'ဖုန်း၊ LINE၊ PromptPay နံပါတ်နှင့် ဆိုင်များသို့ သွားရန် အချိန်။ ထိုင်း၊ မြန်မာ သို့မဟုတ် အင်္ဂလိပ်။',
    steps: 'အဆင့်များ', s: ['အောက်တွင် စာရင်းသွင်းပါ။', 'Beer က LINE ဖြင့် သင့်ကိရိယာကို ပို့မည်: သင့် QR၊ နမူနာစာမျက်နှာ၊ ပြောရမည့်စကား။', 'ဆိုင်များသို့ သွားပါ။ သူတို့က သင့် QR ကို စကင်ဖတ်၊ သင်နှင့်အတူ ၅ မိနစ်ခန့်ဖြင့် စာမျက်နှာ ပြုလုပ်ပြီး ပေးချေသည်။', 'ရောင်းချမှုတိုင်း သင့်ကိရိယာစာမျက်နှာတွင် ချက်ချင်း ပေါ်သည်။'],
    signup: 'စာရင်းသွင်းရန်', f: { name: 'နာမည်', phone: 'ဖုန်း', line: 'LINE ID', pp: 'PromptPay (ဖုန်း သို့မဟုတ် မှတ်ပုံတင်နံပါတ်)', area: 'သွားနိုင်သောနေရာ', langs: 'ပြောနိုင်သောဘာသာစကား', via: 'ဘယ်သူ ညွှန်းလိုက်သလဲ', send: 'ပို့ပါ' },
    thanks: (n) => `ကျေးဇူးတင်ပါသည် ${n}။ Beer က LINE ဖြင့် ဆက်သွယ်ပါမည်။`, bad: 'နာမည်၊ ဖုန်းနှင့် PromptPay ဖြည့်ပါ။', badpp: 'PromptPay: ဖုန်း ၁၀ လုံး သို့မဟုတ် မှတ်ပုံတင် ၁၃ လုံး',
    kit: (n) => `${n} · သင့်ကိရိယာ`, month: 'ဤလ', plans: 'ရောင်းရ', sales: 'ရောင်းအား', share: 'ဝေစု', get: 'သင်ရမည်', target: 'ပစ်မှတ်',
    qr: 'သင့် QR', qrnote: 'ဆိုင်များ ဖုန်းကင်မရာဖြင့် စကင်ဖတ်ပါ။ သင့်နာမည်ပါသော စာမျက်နှာပြုလုပ်ရန် ဖွင့်ပေးသည်။', save: 'ပုံ သိမ်းရန်',
    say: 'ပြောရမည့်စကား', how: 'ဆိုင်တွင်',
    k: ['ဟိုတယ်နှင့် တည်းခိုခန်းများ အရင်။', 'နမူနာစာမျက်နှာကို သင့်ဖုန်းဖြင့် ပြပါ။', 'သူတို့က သင့် QR ကို စကင်ဖတ်ပြီး အတူတကွ ပြုလုပ်ပါ: နာမည်၊ အမျိုးအစား၊ ဓာတ်ပုံ၊ LINE၊ မြေပုံပင်။', 'ပြင်ဆင်ရန်လင့်ခ်ကို သူတို့ကိုယ်တိုင် LINE ဖြင့် ပို့ထားခိုင်းပါ။ ထိုလင့်ခ်သည် တစ်ခုတည်းသောသော့ ဖြစ်သည်။', 'Gold ကိုနှိပ်ပါ။ တစ်နှစ်ရွေးပါ။ ဘဏ်အက်ပ်ဖြင့် ပမာဏအတိအကျ ပေးချေပြီး ဘဏ်စလစ်ကို တင်ပါ။', 'ယနေ့မဝယ်သေးလျှင် စာမျက်နှာ ကျန်ရှိပြီး ရွှေ ရက် ၃၀ အခမဲ့ ရသည်။ ၂၅ ရက်မြောက်နေ့ ပြန်သွားပါ။ နောက်မှ ပေးချေလျှင်လည်း ရောင်းချမှုသည် သင့်ထံ ရှိနေသည်။'],
    bringH: 'ရောင်းသူ ခေါ်ရန်', bringN: (b) => `သူ ပထမဆုံး ရောင်းရသောအခါ ฿${b}။ ဤလင့်ခ်ကို ပို့ပါ:`, lineSend: 'LINE ဖြင့် ပို့ရန်', brought: 'ခေါ်ခဲ့သူ',
    pays: 'ပေးငွေ', isPaid: 'ပေးပြီး', isDue: 'ပေးရန်', ask: 'မေးခွန်း: Beer (LINE) · Discord #sales', waiting: 'Beer ထံ သင့်စာရင်း ရောက်ပြီ။ သူ လက်ခံပြီးနောက် သင့်ကိရိယာ ဤနေရာတွင် ပွင့်မည်။',
  },
}

// Thai lines for the shop, from Hom's sheet (annual-plans, 2026-10-15)
const SAY = ['สวัสดีครับ/ค่ะ มาจาก motdang.net ครับ/ค่ะ', 'เราทำหน้าเว็บร้านให้ มีแผนที่ ปุ่ม LINE ปุ่ม Grab ลูกค้าหาร้านเจอง่าย', 'ดูตัวอย่างนี้ได้ไหมครับ/คะ',
  (g) => `ทองรายปี ${g} บาท ใช้ได้ทั้งปี`, (h) => `โรงแรมรายปี ${h} บาท แขกจองห้องตรงกับร้าน ไม่เสียค่าคอม 15% ให้ Agoda`, 'จ่ายปีเดียว 10 เดือน ได้ 12 เดือน',
  'ลองทำหน้าเว็บตอนนี้เลยไหมครับ/คะ ใช้เวลา 5 นาที ใช้ทองฟรี 30 วัน', 'สแกน QR นี้ด้วยกล้องมือถือได้เลยครับ/ค่ะ']

export function langOf(url, request, fallback) {
  const q = url.searchParams.get('l')
  if (LANGS[q]) return q
  if (fallback && LANGS[fallback]) return fallback
  const a = (request.headers.get('accept-language') || '').toLowerCase()
  return /^(my|bur)/.test(a) ? 'my' : /^th/.test(a) ? 'th' : 'en'
}

// ---- the page frame -----------------------------------------------------------------

const CSS = `*{box-sizing:border-box}body{margin:0;background:#fff7ec;color:#1c1530;font:400 18px/1.55 "Prompt",system-ui,-apple-system,"Segoe UI","Noto Sans Thai","Noto Sans Myanmar","Myanmar Text",sans-serif}
main{max-width:640px;margin:0 auto;padding:12px 16px 56px}a{color:#a3140f}
.langs{display:flex;gap:14px;justify-content:flex-end;font-size:15px;padding-top:4px}.langs b{color:#1c1530}
.top{background:#d7261e;color:#fff;margin:10px -16px 0;padding:26px 16px 22px;border-radius:0 0 22px 22px}
.top h1{font:400 34px/1.15 "Chonburi","Prompt",system-ui,serif;margin:6px 0 10px}.top p{margin:0;color:#ffe9d6}.ant{width:40px;height:40px}
h2{font:400 24px/1.2 "Chonburi","Prompt",system-ui,serif;margin:30px 0 10px}
.work{display:grid;gap:10px}.job{background:#fff;border:2px solid #1c1530;border-radius:14px;padding:14px;display:grid;grid-template-columns:1fr auto;gap:2px 12px}
.job b{font-size:20px}.job small{color:#5a4f6a;grid-column:1}.job .n{grid-row:1/3;grid-column:2;text-align:right}.job .n s{text-decoration:none;display:block;font-size:14px;color:#5a4f6a}.job .n strong{font-size:26px;color:#a3140f}
ul,ol{padding-left:22px;margin:0}li{margin:6px 0}.ladder{display:flex;gap:6px;margin:10px 0}.ladder span{flex:1;text-align:center;border:2px solid #1c1530;border-radius:10px;padding:6px 0;font-weight:600}.ladder .on{background:#ffb000}
form{display:grid;gap:12px;background:#fff;border:2px solid #1c1530;border-radius:16px;padding:16px}label{display:grid;gap:4px;font-size:15px;color:#5a4f6a}
input{font:inherit;padding:12px;border:2px solid #ecd8bf;border-radius:10px;background:#fff;color:#1c1530;width:100%}input:focus{outline:none;border-color:#d7261e}
button,.btn{font:600 18px "Prompt",system-ui,sans-serif;padding:15px;border-radius:12px;border:2px solid #1c1530;background:#ffb000;color:#000;cursor:pointer;text-align:center;text-decoration:none;display:block}
.btn.line{background:#06c755;color:#fff;border-color:#06c755}.err{color:#a3140f;font-weight:600}.ok{background:#fff;border:2px solid #06c755;border-radius:14px;padding:16px;font-size:20px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.tiles div{background:#fff;border:2px solid #1c1530;border-radius:12px;padding:8px;text-align:center}.tiles small{display:block;font-size:13px;color:#5a4f6a}.tiles b{font-size:20px}
.qrbox{background:#fff;border:2px solid #1c1530;border-radius:16px;padding:14px;text-align:center}.qrbox svg{width:min(100%,300px);height:auto}.mono{font:600 15px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
.say{background:#fff;border-left:6px solid #d7261e;border-radius:8px;padding:10px 14px}.say p{margin:4px 0}.hint{color:#5a4f6a;font-size:15px}
table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #ecd8bf}.amt{font-size:40px;font-weight:700;margin:4px 0}
@media (max-width:380px){.tiles{grid-template-columns:repeat(2,1fr)}}`

const ANT = '<img class="ant" src="/s/ant.svg" alt="">'

function shell(lang, title, inner, { nonce, og, noindex = true, langs = '' } = {}) {
  return `<!doctype html><html lang="${lang}" translate="no" class="notranslate"><head><meta charset="utf-8"><meta name="google" content="notranslate"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${noindex ? '<meta name="robots" content="noindex">' : ''}<link rel="icon" href="/s/ant.svg"><meta name="theme-color" content="#d7261e">${og || ''}
<link rel="preload" href="/s/fonts/chonburi-400-thai.woff2" as="font" type="font/woff2" crossorigin>
<style>@font-face{font-family:"Chonburi";font-display:swap;src:url(/s/fonts/chonburi-400-thai.woff2) format("woff2");unicode-range:U+0E01-0E5B}@font-face{font-family:"Chonburi";font-display:swap;src:url(/s/fonts/chonburi-400-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:"Prompt";font-display:swap;src:url(/s/fonts/prompt-400-thai.woff2) format("woff2");unicode-range:U+0E01-0E5B}@font-face{font-family:"Prompt";font-display:swap;src:url(/s/fonts/prompt-400-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:"Prompt";font-weight:600;font-display:swap;src:url(/s/fonts/prompt-600-thai.woff2) format("woff2");unicode-range:U+0E01-0E5B}@font-face{font-family:"Prompt";font-weight:600;font-display:swap;src:url(/s/fonts/prompt-600-latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+2000-206F}
${CSS}</style></head><body><main>${langs}${inner}</main>${nonce ? `<script nonce="${nonce}">${SAVE_JS}</script>` : ''}</body></html>`
}

const langBar = (lang, href) => `<nav class="langs">${Object.entries(LANGS).map(([k, v]) => k === lang ? `<b>${v}</b>` : `<a href="${esc(href(k))}">${v}</a>`).join('')}</nav>`

// "Save picture": the QR as a PNG, for a bank app's "scan from picture" or a phone's photos
const SAVE_JS = `document.querySelectorAll('[data-save]').forEach(function(b){b.addEventListener('click',function(){var s=document.getElementById(b.dataset.save).querySelector('svg');var x=new XMLSerializer().serializeToString(s);var i=new Image();i.onload=function(){var c=document.createElement('canvas');c.width=c.height=900;var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,900,900);g.imageSmoothingEnabled=false;g.drawImage(i,0,0,900,900);c.toBlob(function(p){var a=document.createElement('a');a.href=URL.createObjectURL(p);a.download=b.dataset.name+'.png';document.body.appendChild(a);a.click();a.remove()},'image/png')};i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x)})})`

// ---- signed links --------------------------------------------------------------------

async function sig(env, sha, what, id, exp) {
  return (await sha(`${env.SESSION_SECRET || 'dev'}|${what}|${id}|${exp}`)).slice(0, 24)
}
/** Beer's link for a sign-up (h) or a payout (p). */
export async function beerLink(env, sha, origin, what, id, days = BEER_DAYS) {
  const exp = Math.floor(Date.now() / 1000 + days * 86400).toString(36)
  return `${origin}/${what}/${id}.${exp}.${await sig(env, sha, what, id, exp)}`
}
export async function readBeer(env, sha, what, path) {
  const m = new RegExp(`^/${what}/([a-z0-9-]{2,30})\\.([a-z0-9]{1,10})\\.([a-f0-9]{24})$`).exec(path)
  if (!m) return null
  if (parseInt(m[2], 36) * 1000 < Date.now()) return { expired: true }
  return m[3] === (await sig(env, sha, what, m[1], m[2])) ? { id: m[1] } : null
}
/** A seller's own kit link: good until their key changes. */
export async function kitLink(env, sha, origin, s) {
  return `${origin}/sell/${s.id}.${await sig(env, sha, 'kit', s.id, s.key)}`
}
async function readKit(env, sha, path) {
  const m = /^\/sell\/([a-z0-9-]{2,30})\.([a-f0-9]{24})$/.exec(path)
  if (!m) return null
  const s = await env.DB.prepare('SELECT * FROM seller WHERE id = ?').bind(m[1]).first()
  return s && s.key && m[2] === (await sig(env, sha, 'kit', s.id, s.key)) ? s : null
}

const PP = (v) => { try { normalisePayee(v); return String(v).replace(/\D/g, '') } catch { return null } }
const lineShare = (text) => `https://line.me/R/share?text=${encodeURIComponent(text)}`
const randKey = () => [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('')

// ---- routes ----------------------------------------------------------------------------

/** Everything under /sell, /h/ and /p/. `d` = { html, sha, take, sender, plans, tellBeer, postPeople, postSales, ctx } */
export async function route(request, env, path, url, origin, d) {
  const m = request.method
  if ((path === '/sell' || path === '/sell/') && m === 'GET') return d.html(await signupPage(env, url, request, origin, d), 200, { cache: 'public, max-age=300' })
  if (path === '/sell' && m === 'POST') return d.html(await join(request, env, url, origin, d), 200)
  if (path.startsWith('/sell/')) {
    const s = await readKit(env, d.sha, path)
    if (!s) return new Response('', { status: 404 })
    const nonce = randKey()
    return d.html(await kitPage(env, s, url, request, origin, d, nonce), 200, { nonce })
  }
  if (path.startsWith('/h/')) return beerSignup(request, env, path, url, origin, d)
  if (path.startsWith('/p/')) return beerPayout(request, env, path, url, origin, d)
  return null
}

// ---- /sell ------------------------------------------------------------------------------

async function signupPage(env, url, request, origin, d, { lang = langOf(url, request), err = '', form = {} } = {}) {
  const w = W[lang]
  const p = d.plans
  const share = (b) => nf(Math.round((b * START.rate) / 100))
  const by = String(form.via || url.searchParams.get('by') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  const via = by && await env.DB.prepare("SELECT id, name FROM seller WHERE id = ? AND status = 'on'").bind(by).first()
  const href = (k) => `/sell?l=${k}${via ? '&by=' + via.id : ''}`
  const f = (k, name, type = 'text', extra = '') => `<label>${w.f[k]}<input name="${name}" type="${type}" value="${esc(form[name] || '')}" ${extra}></label>`
  const title = `${w.title} · ${W.th.title}`
  const og = `<meta name="description" content="${esc(w.lead)}"><meta property="og:type" content="website"><meta property="og:url" content="${origin}/sell"><meta property="og:title" content="${esc(w.h1(START.rate))} · ${esc(W.th.h1(START.rate))}">
<meta property="og:description" content="${esc(w.lead)}"><meta property="og:image" content="${origin}/s/sell-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`
  return shell(lang, title, `<header class="top">${ANT}<h1>${esc(w.h1(START.rate))}</h1><p>${esc(w.lead)}</p></header>
<h2>${w.work}</h2><div class="work">
<div class="job"><b>${w.gold[0]}</b><small>${w.gold[1]}</small><div class="n"><s>${w.price} ฿${nf(p.gold)}</s>${w.you} <strong>฿${share(p.gold)}</strong></div></div>
<div class="job"><b>${w.hotel[0]}</b><small>${w.hotel[1]}</small><div class="n"><s>${w.price} ฿${nf(p.hotel)}</s>${w.you} <strong>฿${share(p.hotel)}</strong></div></div>
</div><p class="hint">${w.example}: <a href="${origin}/${EXAMPLE}">sites.motdang.net/${EXAMPLE}</a></p>
<h2>${w.pay}</h2><div class="ladder">${LADDER.map((r) => `<span${r === START.rate ? ' class="on"' : ''}>${r}%</span>`).join('')}</div>
<ul><li>${esc(w.ladder(START.rate, nf(START.target), LADDER.join(' · ')))}</li><li>${w.paid}</li><li>${esc(w.bring(BONUS))}</li><li>${w.money}</li></ul>
<h2>${w.need}</h2><p>${w.needs}</p>
<h2>${w.steps}</h2><ol>${w.s.map((x) => `<li>${x}</li>`).join('')}</ol>
<h2 id="join">${w.signup}</h2>${err ? `<p class="err">${esc(err)}</p>` : ''}
<form method="post" action="/sell#join"><input type="hidden" name="l" value="${lang}">
${f('name', 'name', 'text', 'required maxlength="60" autocomplete="name"')}${f('phone', 'phone', 'tel', 'required maxlength="20" autocomplete="tel"')}${f('line', 'line', 'text', 'maxlength="40"')}
${f('pp', 'promptpay', 'text', 'required inputmode="numeric" maxlength="20"')}${f('area', 'area', 'text', 'maxlength="80"')}${f('langs', 'langs', 'text', 'maxlength="80"')}
${via ? `<input type="hidden" name="via" value="${esc(via.id)}"><p class="hint">${w.f.via}: <b>${esc(via.name)}</b></p>` : f('via', 'via', 'text', 'maxlength="24"')}
<button>${w.f.send}</button></form>`, { og, noindex: false, langs: langBar(lang, href) })
}

async function join(request, env, url, origin, d) {
  const fd = await request.formData()
  const form = Object.fromEntries(['name', 'phone', 'line', 'promptpay', 'area', 'langs', 'via', 'l'].map((k) => [k, String(fd.get(k) || '').trim().slice(0, 80)]))
  const lang = LANGS[form.l] ? form.l : 'en'
  const w = W[lang]
  if (!form.name || !form.phone || !form.promptpay) return signupPage(env, url, request, origin, d, { lang, err: w.bad, form })
  const pp = PP(form.promptpay)
  if (!pp) return signupPage(env, url, request, origin, d, { lang, err: w.badpp, form })
  if (!(await d.take(env, await d.sender(request, env), 'join'))) return shell(lang, w.title, `<p class="ok">${esc(w.thanks(form.name))}</p>`)
  const via = form.via && await env.DB.prepare("SELECT id, name FROM seller WHERE id = ? AND status = 'on'").bind(form.via.toLowerCase()).first()
  const id = await freeId(env, form.name)
  const auto = env.SELLER_AUTO === '1'
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO seller (id, name, rate, target, created, status, phone, line, promptpay, area, langs, lang, via, key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, form.name.slice(0, 60), START.rate, START.target, now.slice(0, 10), auto ? 'on' : 'new', form.phone, form.line || null, pp, form.area || null, form.langs || null, lang, via?.id || null, randKey()).run()
  const link = await beerLink(env, d.sha, origin, 'h', id)
  const who = `${form.name} · ${form.phone}${form.line ? ' · LINE ' + form.line : ''}${form.area ? '\n' + form.area : ''}${form.langs ? ' · ' + form.langs : ''}${via ? '\nvia ' + via.name : ''}`
  d.ctx.waitUntil(Promise.all([
    d.postPeople(`🙋 **New seller** · ${who}\n${auto ? 'Selling now' : 'Beer: yes or no'} → ${link}`),
    d.tellBeer(`คนขายใหม่ · New seller\n${who}\n${link}`),
  ]).catch((e) => console.error(e)))
  if (auto) {
    const s = await env.DB.prepare('SELECT * FROM seller WHERE id = ?').bind(id).first()
    return shell(lang, w.title, `<p class="ok">${esc(w.thanks(form.name))}</p><p><a class="btn" href="${esc(await kitLink(env, d.sha, origin, s))}">${esc(w.kit(form.name))}</a></p>`)
  }
  return shell(lang, w.title, `<header class="top">${ANT}<h1>${esc(w.thanks(form.name))}</h1></header>`)
}

// ---- the kit ------------------------------------------------------------------------------

async function kitPage(env, s, url, request, origin, d, nonce) {
  const lang = langOf(url, request, url.searchParams.get('l') ? null : s.lang)
  const w = W[lang]
  if (s.status !== 'on') return shell(lang, w.kit(s.name), `<header class="top">${ANT}<h1>${esc(w.kit(s.name))}</h1><p>${esc(w.waiting)}</p></header>`)
  const st = await standing(env, s)
  const make = `${origin}/make?by=${s.id}`
  const recruit = `${origin}/sell?by=${s.id}`
  const p = d.plans
  const sayLines = SAY.map((x) => typeof x === 'function' ? null : x)
  sayLines[3] = SAY[3](nf(p.gold)); sayLines[4] = SAY[4](nf(p.hotel))
  return shell(lang, w.kit(s.name), `<header class="top">${ANT}<h1>${esc(w.kit(s.name))}</h1><p>${esc(st.month)} · ${w.target} ฿${nf(s.target)}</p></header>
<h2>${w.month}</h2><div class="tiles"><div><small>${w.plans}</small><b>${st.n}</b></div><div><small>${w.sales}</small><b>฿${nf(st.sales)}</b></div><div><small>${w.share}</small><b>${s.rate}%</b></div><div><small>${w.get}</small><b>฿${nf(st.owed)}</b></div></div>
<div class="ladder">${LADDER.map((r) => `<span${r === s.rate ? ' class="on"' : ''}>${r}%</span>`).join('')}</div>
<h2>${w.qr}</h2><div class="qrbox" id="qr-make">${qrSvg(make, { label: w.qr })}<p class="mono">${esc(make.replace(/^https?:\/\//, ''))}</p><p class="hint">${w.qrnote}</p><button data-save="qr-make" data-name="${esc(s.id)}-qr">${w.save}</button></div>
<p class="hint">${w.example}: <a href="${origin}/${EXAMPLE}">sites.motdang.net/${EXAMPLE}</a></p>
<h2>${w.how}</h2><ol>${w.k.map((x) => `<li>${x}</li>`).join('')}</ol>
<h2>${w.say}</h2><div class="say" lang="th">${sayLines.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
<h2>${w.bringH}</h2><p>${esc(w.bringN(BONUS))}</p><p class="mono">${esc(recruit.replace(/^https?:\/\//, ''))}</p>
<a class="btn line" href="${esc(lineShare(`${W.th.h1(START.rate)} · ${W.en.h1(START.rate)}\n${recruit}`))}">${w.lineSend}</a>
${st.brought.length ? `<p class="hint">${w.brought}: ${st.brought.map(esc).join(', ')}</p>` : ''}
${st.pays.length ? `<h2>${w.pays}</h2><table>${st.pays.map((x) => `<tr><td>${esc(x.month)}</td><td>฿${nf(x.baht)}</td><td>${x.status === 'paid' ? '✓ ' + w.isPaid : w.isDue}</td></tr>`).join('')}</table>` : ''}
<p class="hint" style="margin-top:28px">${w.ask}${s.promptpay ? ` · PromptPay …${esc(s.promptpay.slice(-4))}` : ''}</p>`, { nonce, langs: langBar(lang, (k) => `${url.pathname}?l=${k}`) })
}

// ---- Beer's links ---------------------------------------------------------------------------

const BEER_CSS = 'h1{font-size:26px;margin:8px 0}.row{display:flex;gap:10px}.row button{flex:1}button.no{background:#fff}'
const expired = (d) => d.html(shell('th', 'Link', '<p class="ok">ลิงก์หมดอายุ ใช้ sites.motdang.net/admin<br>This link has expired; use sites.motdang.net/admin.</p>'), 410)

async function beerSignup(request, env, path, url, origin, d) {
  const q = await readBeer(env, d.sha, 'h', path)
  if (!q) return new Response('', { status: 404 })
  if (q.expired) return expired(d)
  if (request.method === 'POST' && sameOrigin(request, url)) {
    const act = String((await request.formData()).get('act') || '')
    if (act === 'ok') await setSeller(env, q.id, 'on')
    if (act === 'no' || act === 'off') await setSeller(env, q.id, 'off')
    return Response.redirect(url.origin + path, 303)
  }
  const s = await env.DB.prepare('SELECT * FROM seller WHERE id = ?').bind(q.id).first()
  if (!s) return new Response('', { status: 404 })
  const via = s.via && await env.DB.prepare('SELECT name FROM seller WHERE id = ?').bind(s.via).first()
  const kit = await kitLink(env, d.sha, origin, s)
  const hello = `${W.th.kit(s.name)} · ${W[s.lang || 'en'].kit(s.name)}\n${kit}`
  const body = `<style>${BEER_CSS}</style><h1>${esc(s.name)}</h1>
<table><tr><td>โทร · Phone</td><td><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></td></tr><tr><td>LINE</td><td>${esc(s.line || '—')}</td></tr><tr><td>PromptPay</td><td>${esc(s.promptpay || '—')}</td></tr>
<tr><td>พื้นที่ · Area</td><td>${esc(s.area || '—')}</td></tr><tr><td>ภาษา · Languages</td><td>${esc(s.langs || '—')}</td></tr><tr><td>แนะนำโดย · Via</td><td>${esc(via?.name || '—')}</td></tr><tr><td>สมัคร · Signed up</td><td>${esc(s.created)}</td></tr></table>
${s.status === 'new' ? `<p>ให้ขายในนามมดแดงไหม · Can ${esc(s.name)} sell for Mot Dang?</p><form method="post" class="row"><button name="act" value="ok">✓ ได้ · Yes</button><button class="no" name="act" value="no">✕ ไม่ · No</button></form>`
    : s.status === 'on' ? `<p class="ok">✓ ขายได้แล้ว · Selling. ${s.rate}%</p><p>ส่งชุดนี้ให้ ${esc(s.name)} ทาง LINE · Send ${esc(s.name)} their kit on LINE:</p><p class="mono">${esc(kit)}</p>
<a class="btn line" href="${esc(lineShare(hello))}">ส่งทาง LINE · Send on LINE</a><form method="post" style="margin-top:28px;border:0;padding:0;background:none"><button class="no" name="act" value="off">หยุด · Stop</button></form>`
    : '<p class="ok">✕ ไม่ได้ขาย · Not selling.</p>'}`
  return d.html(shell('th', s.name, body), 200)
}

async function setSeller(env, id, status) {
  await env.DB.prepare('UPDATE seller SET status = ? WHERE id = ?').bind(status, id).run()
}

async function beerPayout(request, env, path, url, origin, d) {
  const q = await readBeer(env, d.sha, 'p', path)
  if (!q) return new Response('', { status: 404 })
  if (q.expired) return expired(d)
  if (request.method === 'POST' && sameOrigin(request, url)) {
    const f = await request.formData()
    if (f.get('act') === 'paid') await payoutPaid(env, q.id)
    const pp = PP(String(f.get('promptpay') || ''))
    if (pp) await env.DB.prepare('UPDATE seller SET promptpay = ? WHERE id = (SELECT seller FROM payout WHERE id = ?)').bind(pp, q.id).run()
    return Response.redirect(url.origin + path, 303)
  }
  const po = await env.DB.prepare('SELECT payout.*, seller.name, seller.promptpay FROM payout JOIN seller ON seller.id = payout.seller WHERE payout.id = ?').bind(q.id).first()
  if (!po) return new Response('', { status: 404 })
  const nonce = randKey()
  let qr = ''
  if (po.promptpay && po.status !== 'paid') {
    try { qr = qrSvg(promptPayPayload({ payeeId: po.promptpay, satang: po.baht * 100, ref: `MD ${po.month}` }), { label: 'PromptPay' }) } catch { qr = '' }
  }
  const body = `<style>${BEER_CSS}</style><h1>${esc(po.name)} · ${esc(po.month)}</h1><p class="amt">฿${nf(po.baht)}</p>
${po.status === 'paid' ? `<p class="ok">✓ จ่ายแล้ว · Paid ${esc((po.paid_at || '').slice(0, 10))}</p>`
    : `${qr ? `<div class="qrbox" id="qr-pay">${qr}<p class="mono">PromptPay ${esc(po.promptpay)}</p><button data-save="qr-pay" data-name="pay-${esc(po.seller)}-${esc(po.month)}">บันทึกรูป · Save picture</button></div>
<p class="hint">แอปธนาคาร → สแกน → เลือกรูป · Bank app → Scan → pick the picture</p>`
      : `<form method="post"><label>พร้อมเพย์ของ ${esc(po.name)} · ${esc(po.name)}'s PromptPay<input name="promptpay" inputmode="numeric" maxlength="20" required></label><button>บันทึก · Save</button></form>`}
<form method="post" style="margin-top:16px;border:0;padding:0;background:none"><button name="act" value="paid">✓ โอนแล้ว · Paid</button></form>`}`
  return d.html(shell('th', `${po.name} ฿${po.baht}`, body, { nonce }), 200, { nonce })
}

export async function payoutPaid(env, id) {
  await env.DB.prepare("UPDATE payout SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'due'").bind(new Date().toISOString(), id).run()
}

function sameOrigin(request, url) {
  const o = request.headers.get('origin')
  return !o || o === url.origin
}

/** For /admin: every seller, and the payouts still due. */
export async function adminRows(env, sha, origin) {
  const ss = (await env.DB.prepare("SELECT * FROM seller ORDER BY status = 'new' DESC, status = 'on' DESC, created DESC").all()).results
  const due = (await env.DB.prepare("SELECT payout.*, seller.name FROM payout JOIN seller ON seller.id = payout.seller WHERE payout.status = 'due' ORDER BY month").all()).results
  return {
    sellers: await Promise.all(ss.map(async (s) => ({ ...s, kit: s.key ? await kitLink(env, sha, origin, s) : '', beer: await beerLink(env, sha, origin, 'h', s.id) }))),
    due: await Promise.all(due.map(async (p) => ({ ...p, link: await beerLink(env, sha, origin, 'p', p.id) }))),
  }
}
