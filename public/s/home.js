// home.js — sites.motdang.net/: why make a page, shown rather than told.
// The hero draws the visitor's own shop with Mot Dang's auto-doodler as they
// type its name; the phones run the real page renderer on example pages; the
// toys are the tools a page carries. Thai, English, Burmese and Chinese.

import { render, LOOKS, LOOK_IDS, qrSvg } from './render.mjs'
import { makeOver } from './studio.mjs'
import { drawCover, drawMark, loadFaces, inkOn } from './mark.mjs'

const $ = (s, el = document) => el.querySelector(s)
const store = { get(k, d) { try { const v = localStorage.getItem('mdh:' + k); return v === null ? d : v } catch { return d } }, set(k, v) { try { localStorage.setItem('mdh:' + k, v) } catch {} } }
const LANGS = { th: 'ไทย', en: 'EN', my: 'မြန်မာ', zh: '中文' }
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

const W = {
  th: {
    putOnline: 'ขึ้นออนไลน์เลย', s2ph: 'ชื่อร้านหรือชื่อคุณ',
    k_stay: 'ที่พัก',
    bk: "สตูดิโอรูป", b_path: "ซ้ายคือรูปจากมือถือ ขวาคือสีน้ำ", b_pai: "ทุ่งนาที่ปาย พิมพ์แบบริโซ่", b_wat: "วัดเชียงมั่น เป็นลายรดน้ำ", b_map: "เชียงใหม่ ปี 2433 ทุกหน้าเว็บมีแผนที่วาดมือ", picH: "รูปมืด กลายเป็นรูปสวย", picSub: "ทุกหน้าเว็บมีสตูดิโอรูป แตะเลือกแบบ รูปข้างล่างตั้งใจให้มืดและเบลอ", s_raw: "รูปเดิม", s_rawP: "มืดและเบลอ", s_fix: "แก้แสง", s_fixP: "แสงและสีกลับมา", s_ink: "ลายเส้นปากกา", s_inkP: "เส้นและแรเงา", s_wash: "สีน้ำ", s_washP: "สีซึมที่ขอบ", s_riso: "พิมพ์ริโซ่", s_risoP: "หมึกสองสี จุดและเส้น", s_gold: "ลายรดน้ำ", s_goldP: "ทองบนพื้นดำ", s_pop: "การ์ตูน", s_popP: "สีจัด เส้นหนา", mkH: "ไม่มีรูปเลย?", mkP: "ประกอบภาพปกหรือรูปโปรไฟล์เอง: สี ลาย ไอคอนหนึ่งใน 267 แบบ และชื่อของคุณ", mkGo: "อีกแบบ", t_work: "พอร์ตผลงาน", t_workP: "ผลงานแต่ละชิ้นมีหน้าของตัวเอง กรองตามแท็ก พร้อมคำพูดจากลูกค้า", t_face: "รูปโปรไฟล์", t_faceP: "หน้าคุณ โลโก้ หรือประกอบเอง วางข้างชื่อ", f9: "สตูดิโอรูป รูปโปรไฟล์ พอร์ตผลงาน 6 ชิ้น", pics: "รูป",
    stayH: 'โรงแรม เกสต์เฮาส์: รับจองเอง', staySub: 'ห้องพัก ปฏิทินคืนว่าง ปฏิทิน Airbnb · Booking.com · Agoda ตรงกันทุก 30 นาที แขกจ่ายเข้าพร้อมเพย์หรือลิงก์ของคุณ', calcNight: 'ราคาต่อคืน', calcNights: 'คืนที่ขายผ่านแอปต่อเดือน', calcOta: 'ค่าคอม 15%', calcFlat: 'ทองสำหรับโรงแรม', mo: 'ต่อเดือน', hotelPrice: 'โรงแรมที่รับจองห้อง: ฿{p} ต่อเดือน', calcKeep: 'เก็บไว้ได้ต่อปี', calcSrc: 'Agoda ราว 15% Booking.com 10–25% ส่วนใหญ่ราว 15%', stayGo: 'ทำหน้าเว็บโรงแรม', yr: 'ต่อปี',
    make: 'ทำเว็บของฉัน', kicker: 'มดแดง · เว็บของคุณเอง', h1: 'ร้านของคุณ <em>วาดเสร็จ</em> ขึ้นเว็บในห้านาที',
    lead: 'คนหาร้านคุณจากมือถือ ให้เขาเจอหน้าที่สวย โทรได้ แอดไลน์ได้ เรียก Grab มาถึงหน้าร้าน แล้วคุณเห็นว่าใครมาบ้าง',
    tryLabel: 'พิมพ์ชื่อร้านของคุณ แล้วดูภาพวาด', tryGo: 'ทำเว็บนี้เลย', tryPh: 'ร้านของคุณ', tapSky: 'แตะภาพ: เช้า เย็น กลางคืน',
    k_food: 'ร้านอาหาร', k_cafe: 'ร้านกาแฟ', k_shop: 'ร้านค้า', k_service: 'งานบริการ', k_event: 'งาน · อีเวนต์', k_me: 'ตัวฉัน',
    whyH: 'คนรู้จักร้านคุณ ก่อนเดินมาถึงหน้าร้าน',
    why1h: 'เจอคุณบนมือถือ', why1: 'ลิงก์เดียว ส่งในไลน์ แปะในเฟซบุ๊ก หรือพิมพ์เป็นป้ายคิวอาร์ไว้หน้าร้าน',
    why2h: 'แตะเดียว ถึงคุณ', why2: 'โทร แอดไลน์ สั่งอาหาร นำทาง เรียก Grab และส่งข้อความหาคุณ ได้จากหน้าเดียว',
    why3h: 'เป็นของคุณ', why3: 'ภาพวาดร้านของคุณเอง แผนที่วาดมือ สีและลายที่คุณเลือก ไม่เหมือนใคร',
    exH: 'หน้าเว็บจริง จากตัวทำเว็บจริง', exSub: 'สามตัวอย่าง เลื่อนดู แตะได้ทุกอย่าง',
    toysH: 'ทุกอย่างที่ลูกค้าต้องการ ในหน้าเดียว',
    t_draw: 'ภาพวาดร้านคุณ', t_drawP: 'มดแดงวาดร้านจากชื่อ ประเภท และเวลาเปิด ป้ายหน้าร้านมีชื่อคุณ แสงตามดวงอาทิตย์จริง',
    t_line: 'ไลน์', t_lineP: 'ปุ่มแอดไลน์ คิวอาร์ไลน์ และสั่งจากเมนูทางไลน์',
    t_grab: 'เรียก Grab มาที่ร้าน', t_grabP: 'ใน 8 ประเทศของ Grab ลูกค้าแตะแล้วแอปเปิดพร้อมปลายทาง',
    t_open: 'เปิดอยู่ไหม', t_openP: 'ตามเวลาเปิดของคุณ ในเขตเวลาของร้าน', t_openB: 'เปิดอยู่ · ปิด 20:00',
    t_map: 'แผนที่วาดมือ', t_mapP: 'ทุกประเทศ ซอยต่อซอย มีหมุดร้านคุณตรงกลาง',
    t_msg: 'กล่องข้อความ', t_msgP: 'ลูกค้าเขียนถึงคุณ สำเนาส่งเข้าอีเมลได้', t_msg1: 'พรุ่งนี้เปิดกี่โมงคะ', t_msg2: '9 โมงค่ะ 🙏',
    t_stats: 'ใครมาบ้าง', t_statsP: 'คนต่อวัน มาจากไหน กดปุ่มอะไร แยกคนกับโปรแกรม',
    t_share: 'แชร์ได้ทุกที่', t_shareP: 'ไลน์ เฟซบุ๊ก วอตส์แอป คิวอาร์ รูปสำหรับสตอรี่ และป้าย A4 พิมพ์ได้',
    t_lang: 'สิบสองภาษา', t_langP: 'ป้ายบนหน้าเว็บเป็นภาษาที่คุณเลือก',
    t_pics: 'รูปฟรี มีเครดิต', t_picsP: 'รูปสาธารณสมบัติจาก Wikimedia Commons, Cleveland Museum of Art และ Openverse ใส่เครดิตให้ทุกรูป',
    looksH: 'เก้าแบบ เลือกที่ใช่', looksSub: 'แตะภาพวาดในแต่ละแบบ ขยับได้ทุกอัน',
    tiersH: 'ฟรี หรือ ทอง', freeH: 'ฟรี', goldH: 'ทอง', makeFree: 'เริ่มฟรี', makeGold: 'เริ่มเลย ทองฟรี 30 วันแรก', perYear: 'ต่อปี',
    goldFine: 'จ่ายด้วยพร้อมเพย์ในตัวทำเว็บ ส่งสลิป แล้วเปิดทอง',
    f1: 'หน้าเว็บที่ sites.motdang.net/ชื่อคุณ', f2: 'ภาพวาดร้าน แผนที่วาดมือ รูปวาดขยับได้', f3: 'ไลน์ Grab โทร นำทาง สั่งอาหาร', f4: 'กล่องข้อความ และสำเนาทางอีเมล',
    f5: 'สถิติคนเข้าชม 30 วัน', f6: 'รูป 12 รูป รูปฟรีมีเครดิต', f7: 'แชร์ คิวอาร์ รูปสตอรี่ ป้าย A4', f8: 'ปฏิทิน แผนที่สามแบบ ดิงแบตทั้งคลัง',
    liveH: '{n} เว็บออนไลน์แล้ว ใน {c} ประเทศ', allPages: 'ดูเว็บทั้งหมด', random: 'สุ่มเว็บ',
    howH: 'สามขั้น ห้านาที', step1: 'เลือกว่าทำเพื่ออะไร', step2: 'ตั้งชื่อ ได้ที่อยู่เว็บ', step3: 'เลือกแบบ กดขึ้นออนไลน์',
    t_sign: 'ป้ายพิมพ์ได้', t_signP: 'ป้าย A4 มีคิวอาร์หน้าเว็บ คิวอาร์ไลน์ เบอร์ และเวลาเปิด ติดหน้าร้านได้เลย', t_gold: 'ทอง', t_goldP: 'แบบลายคำทอง ขึ้น Google รูปมากขึ้น วิดีโอ และที่โปรดของคุณบนแผนที่',
    ex: 'ตัวอย่าง',
  },
  en: {
    putOnline: 'Put it online', s2ph: 'Your shop or your name',
    k_stay: 'Guesthouse',
    bk: "Picture studio", b_path: "A phone photo on the left. Watercolour on the right.", b_pai: "Rice fields in Pai, printed in riso.", b_wat: "Wat Chiang Man, in gold lacquer.", b_map: "Chiang Mai in 1890. Every page gets a drawn map.", picH: "A dim photo becomes a good picture", picSub: "Every page has a picture studio. Tap a style. The photo below is dim and soft on purpose.", s_raw: "The photo", s_rawP: "dim and soft", s_fix: "Fixed", s_fixP: "light and colour put right", s_ink: "Pen and ink", s_inkP: "lines and hatching", s_wash: "Watercolour", s_washP: "washes that pool at the edges", s_riso: "Riso print", s_risoP: "two inks, dots and lines", s_gold: "Gold lacquer", s_goldP: "gold on black, as lai rot nam", s_pop: "Comic", s_popP: "loud colours, fat lines", mkH: "No photo at all?", mkP: "Build a cover or an avatar from parts: a colour, a pattern, one of 267 dingbats, your name.", mkGo: "Another", t_work: "Portfolio", t_workP: "Your work, each project on its own page, filtered by tag, with what clients said.", t_face: "Avatar", t_faceP: "Your face, your logo, or one built from parts, beside your name.", f9: "Picture studio, an avatar, a portfolio of 6 projects", pics: "Pictures",
    stayH: 'Hotels and guesthouses: take your own bookings', staySub: 'Rooms, a calendar of nights, Airbnb · Booking.com · Agoda calendars kept in step every 30 minutes, guests paying your PromptPay or your own link.', calcNight: 'Price a night', calcNights: 'Nights sold through apps a month', calcOta: 'Commission at 15%', calcFlat: 'Gold for hotels', mo: 'a month', hotelPrice: 'Hotels taking room bookings: ฿{p} a month', calcKeep: 'Kept in a year', calcSrc: 'Agoda about 15%; Booking.com 10–25%, most often about 15%.', stayGo: 'Make a hotel page', yr: 'a year',
    make: 'Make my page', kicker: 'Mot Dang · your own page', h1: 'Your shop, <em>drawn</em> and online in five minutes',
    lead: 'People look for you on their phones. Give them a page worth landing on: call, add you on LINE, send a Grab to your door, and you see who came.',
    tryLabel: 'Type your shop’s name and watch it drawn', tryGo: 'Make this page', tryPh: 'Your Shop', tapSky: 'Tap the drawing: morning, evening, night',
    k_food: 'Restaurant', k_cafe: 'Café', k_shop: 'Shop', k_service: 'Service', k_event: 'Event', k_me: 'Me',
    whyH: 'People meet your shop before they reach your door',
    why1h: 'Found on a phone', why1: 'One link to send on LINE, post on Facebook, or print as a QR sign for the counter.',
    why2h: 'One tap to you', why2: 'Call, add on LINE, order food, get directions, ride Grab and message you, all from one page.',
    why3h: 'Yours alone', why3: 'A drawing of your own place, a hand-drawn map, your colours and your look.',
    exH: 'Pages from the page maker itself', exSub: 'Three examples. Swipe them; every button works.',
    toysH: 'What a customer needs, on one page',
    t_draw: 'Your place, drawn', t_drawP: 'Mot Dang draws your shop from its name, kind and hours: your name on the sign, lit by the real sun.',
    t_line: 'LINE', t_lineP: 'Add-friend button, LINE QR, and orders from your menu straight to LINE.',
    t_grab: 'Grab to your door', t_grabP: 'In Grab’s eight countries a tap opens the app with you as the drop-off.',
    t_open: 'Open now?', t_openP: 'From your hours, in your shop’s own time zone.', t_openB: 'Open now · closes 20:00',
    t_map: 'A hand-drawn map', t_mapP: 'Any country, down to the lane, your pin in the middle.',
    t_msg: 'Messages', t_msgP: 'Customers write to you; a copy can come to your email.', t_msg1: 'What time do you open tomorrow?', t_msg2: '9 am 🙏',
    t_stats: 'Who came', t_statsP: 'People a day, where they came from, what they pressed. Machines counted apart.',
    t_share: 'Shared everywhere', t_shareP: 'LINE, Facebook, WhatsApp, a QR, a picture for stories, and a printable A4 sign.',
    t_lang: 'Twelve languages', t_langP: 'The labels on your page, in the language you pick.',
    t_pics: 'Free pictures, credited', t_picsP: 'Public-domain pictures from Wikimedia Commons, the Cleveland Museum of Art and Openverse, each one credited.',
    looksH: 'Nine looks. Pick yours.', looksSub: 'Tap the drawing on each one; they all move.',
    tiersH: 'Free, or Gold', freeH: 'Free', goldH: 'Gold', makeFree: 'Start free', makeGold: 'Start: the first 30 days are Gold', perYear: 'a year',
    goldFine: 'Pay with PromptPay inside the page maker, send the slip, and Gold turns on.',
    f1: 'Your page at sites.motdang.net/yourname', f2: 'Your place drawn, a hand-drawn map, moving drawings', f3: 'LINE, Grab, call, directions, food orders', f4: 'Messages, with copies by email',
    f5: '30 days of traffic', f6: '12 photos, plus free credited pictures', f7: 'Share, QR, story picture, A4 sign', f8: 'A calendar, three map looks, the whole dingbat library',
    liveH: '{n} pages online in {c} countries', allPages: 'See every page', random: 'A page at random',
    howH: 'Three steps, five minutes', step1: 'Pick what it is for', step2: 'Name it and get your address', step3: 'Pick a look and put it online',
    t_sign: 'A sign to print', t_signP: 'An A4 sign with your page’s QR, your LINE QR, phone and hours, for the counter or the door.', t_gold: 'Gold', t_goldP: 'Gold leaf looks, Google, more photos, a video, and your favourite places on your map.',
    ex: 'Example',
  },
  my: {
    putOnline: 'အွန်လိုင်းတင်မယ်', s2ph: 'ဆိုင်အမည် သို့မဟုတ် သင့်အမည်',
    k_stay: 'တည်းခိုခန်း',
    bk: "ဓာတ်ပုံစတူဒီယို", b_path: "ဘယ်ဘက်မှာ ဖုန်းဓာတ်ပုံ။ ညာဘက်မှာ ရေဆေး။", b_pai: "ပိုင်မြို့က စပါးခင်းတွေ၊ ရီဆိုပုံနှိပ်နဲ့။", b_wat: "ရွှေယွန်းနဲ့ ဝပ်ချင်းမန်ဘုရား။", b_map: "၁၈၉၀ ခုနှစ်က ချင်းမိုင်။ စာမျက်နှာတိုင်းမှာ ရေးဆွဲထားတဲ့ မြေပုံပါတယ်။", picH: "မှုန်ဝါးတဲ့ဓာတ်ပုံက ပုံကောင်းတစ်ပုံ ဖြစ်လာတယ်", picSub: "စာမျက်နှာတိုင်းမှာ ဓာတ်ပုံစတူဒီယိုပါတယ်။ စတိုင်တစ်ခုကို နှိပ်ပါ။ အောက်ကဓာတ်ပုံက တမင်တကာ မှုန်ဝါးပျော့ပျောင်းထားတာပါ။", s_raw: "ဓာတ်ပုံ", s_rawP: "မှုန်ဝါးပြီး ပျော့ပျောင်းတယ်", s_fix: "ပြင်ထားပြီး", s_fixP: "အလင်းနဲ့ အရောင်ကို မှန်အောင်လုပ်ထားတယ်", s_ink: "မှင်နဲ့ ဘောပင်", s_inkP: "မျဉ်းကြောင်းတွေနဲ့ အရိပ်ခြယ်တာ", s_wash: "ရေဆေး", s_washP: "အနားတွေမှာ စုနေတဲ့ ရေဆေးခြယ်ချက်တွေ", s_riso: "ရီဆိုပုံနှိပ်", s_risoP: "မှင်နှစ်ရောင်၊ အစက်တွေနဲ့ မျဉ်းကြောင်းတွေ", s_gold: "ရွှေယွန်း", s_goldP: "အနက်ပေါ်မှာ ရွှေ၊ လာယ်ရော့နမ်လိုပဲ", s_pop: "ကာတွန်း", s_popP: "ကျယ်လောင်တဲ့အရောင်တွေ၊ မျဉ်းထူတွေ", mkH: "ဓာတ်ပုံ လုံးဝမရှိဘူးလား။", mkP: "အစိတ်အပိုင်းတွေကနေ ကာဗာ ဒါမှမဟုတ် ပရိုဖိုင်ပုံတစ်ခု ဆောက်ပါ။ အရောင်တစ်ရောင်၊ ပုံစံတစ်ခု၊ သင်္ကေတပုံ ၂၆၇ ခုထဲက တစ်ခု၊ နာမည်။", mkGo: "နောက်တစ်ခု", t_work: "လက်ရာစုစည်းမှု", t_workP: "ခင်ဗျားရဲ့အလုပ်တွေ၊ ပရောဂျက်တစ်ခုစီက သူ့စာမျက်နှာပေါ်မှာ၊ တဂ်နဲ့ စစ်ထုတ်ထားတယ်၊ ဖောက်သည်တွေပြောတာတွေပါတယ်။", t_face: "ပရိုဖိုင်ပုံ", t_faceP: "ခင်ဗျားရဲ့မျက်နှာ၊ လိုဂို၊ ဒါမှမဟုတ် အစိတ်အပိုင်းတွေကနေ ဆောက်ထားတဲ့ပုံ၊ နာမည်ဘေးမှာ။", f9: "ဓာတ်ပုံစတူဒီယို၊ ပရိုဖိုင်ပုံ၊ ပရောဂျက် ၆ ခုရဲ့ လက်ရာစုစည်းမှု", pics: "ဓာတ်ပုံတွေ",
    stayH: 'ဟိုတယ်၊ တည်းခိုခန်း- ကိုယ်တိုင်ကြိုတင်မှာယူမှုလက်ခံ', staySub: 'အခန်းများ၊ ညများ၏ပြက္ခဒိန်၊ Airbnb · Booking.com · Agoda ပြက္ခဒိန်များ ၃၀ မိနစ်တိုင်း ညှိ၊ ဧည့်သည်များ သင့် PromptPay သို့ ပေးချေ။', calcNight: 'တစ်ညဈေး', calcNights: 'အက်ပ်မှ တစ်လရောင်းသည့်ည', calcOta: 'ကော်မရှင် 15%', calcFlat: 'ဟိုတယ်အတွက် ရွှေ', mo: 'တစ်လ', hotelPrice: 'အခန်းကြိုတင်မှာယူမှုလက်ခံသော ဟိုတယ်- တစ်လ ฿{p}', calcKeep: 'တစ်နှစ်တွင် ကျန်ရှိ', calcSrc: 'Agoda ~15%; Booking.com 10–25%, များသောအားဖြင့် ~15%', stayGo: 'ဟိုတယ်စာမျက်နှာလုပ်ရန်', yr: 'တစ်နှစ်',
    make: 'စာမျက်နှာလုပ်ရန်', kicker: 'Mot Dang · သင့်ကိုယ်ပိုင်စာမျက်နှာ', h1: 'သင့်ဆိုင်ကို <em>ပုံဆွဲ</em>ပြီး ငါးမိနစ်အတွင်း အွန်လိုင်းတင်ပါ',
    lead: 'လူတွေက ဖုန်းနဲ့ သင့်ကိုရှာကြတယ်။ ဖုန်းခေါ်၊ LINE ထည့်၊ Grab ခေါ်နိုင်ပြီး ဘယ်သူလာလဲ သင်မြင်ရမယ်။',
    tryLabel: 'သင့်ဆိုင်အမည်ရိုက်ပြီး ပုံဆွဲတာကြည့်ပါ', tryGo: 'ဒီစာမျက်နှာလုပ်ရန်', tryPh: 'သင့်ဆိုင်', tapSky: 'ပုံကိုနှိပ်ပါ- နံနက်၊ ညနေ၊ ည',
    k_food: 'စားသောက်ဆိုင်', k_cafe: 'ကော်ဖီဆိုင်', k_shop: 'ဆိုင်', k_service: 'ဝန်ဆောင်မှု', k_event: 'ပွဲ', k_me: 'ကျွန်ုပ်',
    whyH: 'လူတွေက ဆိုင်ရှေ့မရောက်ခင် သင့်ဆိုင်ကို သိကြတယ်',
    why1h: 'ဖုန်းပေါ်မှာတွေ့', why1: 'LINE မှာပို့၊ Facebook မှာတင်၊ QR ဆိုင်းဘုတ်အဖြစ် ပရင့်ထုတ်နိုင်သော လင့်ခ်တစ်ခု။',
    why2h: 'တစ်ချက်နှိပ်ရုံ', why2: 'ဖုန်းခေါ်၊ LINE ထည့်၊ အစားမှာ၊ လမ်းညွှန်၊ Grab နှင့် စာပို့ — စာမျက်နှာတစ်ခုတည်းမှ။',
    why3h: 'သင့်ကိုယ်ပိုင်', why3: 'သင့်ဆိုင်၏ပုံဆွဲ၊ လက်ရေးမြေပုံ၊ သင့်အရောင်။',
    exH: 'တကယ့်စာမျက်နှာများ', exSub: 'ဥပမာသုံးခု။ ပွတ်ဆွဲကြည့်ပါ။',
    toysH: 'ဖောက်သည်လိုအပ်သမျှ စာမျက်နှာတစ်ခုတည်းတွင်',
    t_draw: 'သင့်ဆိုင်ပုံဆွဲ', t_drawP: 'အမည်၊ အမျိုးအစား၊ ဖွင့်ချိန်မှ ဆွဲသည်။', t_line: 'LINE', t_lineP: 'LINE ထည့်ရန်ခလုတ်၊ QR နှင့် LINE မှမှာယူခြင်း။',
    t_grab: 'Grab ခေါ်ရန်', t_grabP: 'Grab ၏နိုင်ငံ ၈ ခုတွင်။', t_open: 'ဖွင့်ထားလား', t_openP: 'သင့်ဖွင့်ချိန်အတိုင်း။', t_openB: 'ယခုဖွင့်ထားသည် · 20:00 ပိတ်',
    t_map: 'လက်ရေးမြေပုံ', t_mapP: 'မည်သည့်နိုင်ငံမဆို။', t_msg: 'စာများ', t_msgP: 'ဖောက်သည်များ သင့်ထံ စာရေးနိုင်သည်။', t_msg1: 'မနက်ဖြန် ဘယ်အချိန်ဖွင့်လဲ', t_msg2: 'မနက် ၉ နာရီ 🙏',
    t_stats: 'ဘယ်သူလာလဲ', t_statsP: 'တစ်ရက်လျှင်လူ၊ ဘယ်ကလာလဲ၊ ဘာနှိပ်လဲ။', t_share: 'နေရာတိုင်းမျှဝေ', t_shareP: 'LINE, Facebook, QR, စတိုရီပုံ, A4 ဆိုင်းဘုတ်။',
    t_lang: 'ဘာသာ ၁၂ မျိုး', t_langP: 'သင်ရွေးသောဘာသာဖြင့်။', t_pics: 'အခမဲ့ပုံများ', t_picsP: 'Public domain ပုံများ၊ ခရက်ဒစ်ပါ။',
    looksH: 'ပုံစံ ကိုးမျိုး', looksSub: 'ပုံဆွဲကိုနှိပ်ပါ။', tiersH: 'အခမဲ့ သို့မဟုတ် ရွှေ', freeH: 'အခမဲ့', goldH: 'ရွှေ', makeFree: 'အခမဲ့စတင်ရန်', makeGold: 'စတင်ပြီး ရွှေသို့', perYear: 'တစ်နှစ်',
    goldFine: 'PromptPay ဖြင့်ပေးချေပြီး ပြေစာပို့ပါ။',
    f1: 'sites.motdang.net/သင့်အမည်', f2: 'ဆိုင်ပုံဆွဲ၊ လက်ရေးမြေပုံ', f3: 'LINE, Grab, ဖုန်း, လမ်းညွှန်', f4: 'စာများနှင့် အီးမေးလ်မိတ္တူ', f5: 'ရက် ၃၀ စာရင်း', f6: 'ဓာတ်ပုံ ၁၂ ပုံ', f7: 'မျှဝေ၊ QR၊ A4 ဆိုင်းဘုတ်',
    liveH: 'နိုင်ငံ {c} ခုတွင် စာမျက်နှာ {n} ခု', allPages: 'စာမျက်နှာအားလုံး', random: 'ကျပန်း',
        t_sign: 'ပရင့်ဆိုင်းဘုတ်', t_signP: 'QR နှင့် ဖွင့်ချိန်ပါသော A4 ဆိုင်းဘုတ်။', t_gold: 'ရွှေ', t_goldP: 'ရွှေပုံစံ၊ Google၊ ဓာတ်ပုံပိုများ၊ ဗီဒီယို။',
howH: 'အဆင့်သုံးဆင့်', step1: 'ဘာအတွက်လဲ ရွေးပါ', step2: 'အမည်ပေးပါ', step3: 'ပုံစံရွေးပြီး အွန်လိုင်းတင်ပါ', ex: 'ဥပမာ',
  },
  zh: {
    putOnline: '上线', s2ph: '店名或你的名字',
    k_stay: '民宿',
    bk: "图片工作室", b_path: "左边是手机照片，右边是水彩。", b_pai: "拜县的稻田，孔版印刷。", b_wat: "清曼寺，泰式金漆。", b_map: "1890 年的清迈。每个网页都有手绘地图。", picH: "暗照片，变成好图片", picSub: "每个网页都有图片工作室。点一个样式。下面这张照片是故意调暗、调模糊的。", s_raw: "原图", s_rawP: "又暗又糊", s_fix: "调光", s_fixP: "光线和颜色调好", s_ink: "钢笔线描", s_inkP: "线条和排线", s_wash: "水彩", s_washP: "颜色在边缘晕开", s_riso: "孔版印刷", s_risoP: "两种墨，网点和线", s_gold: "泰式金漆", s_goldP: "黑底描金", s_pop: "漫画", s_popP: "大色块，粗线条", mkH: "一张照片都没有？", mkP: "用零件拼一个封面或头像：颜色、图案、267 个小图标之一，还有你的名字。", mkGo: "换一个", t_work: "作品集", t_workP: "每个项目都有自己的网页，按标签筛选，附客户评价。", t_face: "头像", t_faceP: "你的脸、你的标志，或用零件拼一个，放在名字旁边。", f9: "图片工作室、头像、6 个项目的作品集", pics: "图片",
    stayH: '酒店、民宿：自己接预订', staySub: '客房、空房日历，每 30 分钟同步 Airbnb · Booking.com · Agoda 日历，客人付款到你的 PromptPay 或你自己的链接。', calcNight: '每晚价格', calcNights: '每月通过 App 卖出的晚数', calcOta: '15% 佣金', calcFlat: '酒店金卡', mo: '每月', hotelPrice: '接受客房预订的酒店：每月 ฿{p}', calcKeep: '一年多留下', calcSrc: 'Agoda 约 15%；Booking.com 10–25%，多数约 15%。', stayGo: '做酒店网页', yr: '每年',
    make: '做我的网页', kicker: 'Mot Dang · 你自己的网页', h1: '你的店，<em>画好了</em>，五分钟上线',
    lead: '大家用手机找你。给他们一个值得停留的网页：打电话、加 LINE、叫 Grab 到店门口，还能看到谁来过。',
    tryLabel: '输入店名，看它被画出来', tryGo: '做这个网页', tryPh: '你的店', tapSky: '点一下画：早上、傍晚、夜里',
    k_food: '餐厅', k_cafe: '咖啡店', k_shop: '商店', k_service: '服务', k_event: '活动', k_me: '我自己',
    whyH: '客人到店之前，先认识你的店',
    why1h: '手机上找到你', why1: '一个链接，发 LINE、贴 Facebook，或印成二维码放在柜台。',
    why2h: '一点就到你', why2: '打电话、加 LINE、点餐、导航、叫 Grab、给你留言，都在一个页面。',
    why3h: '独一无二', why3: '你自己店的手绘、手绘地图、你的颜色和样式。',
    exH: '用网页工具做出来的真网页', exSub: '三个例子，滑动看看，每个按钮都能用。',
    toysH: '客人需要的，都在一页',
    t_draw: '你的店，画出来', t_drawP: '按店名、类型和营业时间画，招牌上是你的名字，光线跟着真太阳。', t_line: 'LINE', t_lineP: '加好友按钮、LINE 二维码，菜单直接用 LINE 下单。',
    t_grab: '叫 Grab 到店', t_grabP: '在 Grab 的八个国家，一点就打开 App，目的地是你。', t_open: '现在开门吗', t_openP: '按你的营业时间和时区。', t_openB: '营业中 · 20:00 打烊',
    t_map: '手绘地图', t_mapP: '任何国家，细到小巷，你的位置在中间。', t_msg: '留言', t_msgP: '客人给你留言，副本可发到邮箱。', t_msg1: '明天几点开门？', t_msg2: '早上 9 点 🙏',
    t_stats: '谁来过', t_statsP: '每天人数、从哪里来、点了什么，程序单独统计。', t_share: '到处分享', t_shareP: 'LINE、Facebook、WhatsApp、二维码、快拍图片、可打印 A4 店招。',
    t_lang: '十二种语言', t_langP: '网页上的标签用你选的语言。', t_pics: '免费图片，带署名', t_picsP: '来自 Wikimedia Commons、克利夫兰艺术博物馆和 Openverse 的公有领域图片，每张都署名。',
    looksH: '九种样式，选你喜欢的', looksSub: '点一下每个样式里的画，都会动。',
    tiersH: '免费，或金卡', freeH: '免费', goldH: '金卡', makeFree: '免费开始', makeGold: '开始：前 30 天是金卡', perYear: '每年',
    goldFine: '在网页工具里用 PromptPay 付款，发送凭证，金卡就开通。',
    f1: '你的网页：sites.motdang.net/你的名字', f2: '店的手绘、手绘地图、会动的小画', f3: 'LINE、Grab、电话、导航、点餐', f4: '留言，可抄送到邮箱',
    f5: '30 天访问数据', f6: '12 张照片，外加带署名的免费图片', f7: '分享、二维码、快拍图片、A4 店招', f8: '日历、三种地图样式、全部小图标',
    liveH: '{c} 个国家，{n} 个网页已上线', allPages: '看所有网页', random: '随便看看',
    t_sign: '可打印的店招', t_signP: 'A4 店招，有网页二维码、LINE 二维码、电话和营业时间，贴在门口。', t_gold: '金卡', t_goldP: '金箔样式、上 Google、更多照片、视频，还有你的地图收藏。',
    howH: '三步，五分钟', step1: '选用途', step2: '起名字，拿到网址', step3: '选样式，上线', ex: '例子',
  },
}
const GOLD = {
  th: ['รับจอง ประกาศขายเช่า ปุ่มไปหน้า Agoda และ Booking.com ของคุณ', 'โปรโมชั่นตั้งเวลา นับถอยหลัง', 'หน้าเว็บ 12 ภาษา', 'แบบลายคำทองและริโซ่', 'หน้าเว็บขึ้นบน Google และเสิร์ชเอนจินอื่น', 'รูป 120 รูปและวิดีโอ', 'พอร์ตผลงาน 60 ชิ้น', 'แถวนี้: ที่ของคุณเองบนแผนที่วาดมือ', 'สถิติหนึ่งปี และไฟล์ CSV', 'ขึ้นก่อนในรายชื่อเว็บ มีดาวทอง', 'ทุกอย่างในแบบฟรี'],
  en: ['Bookings, listings to sell or rent, buttons to your Agoda and Booking.com pages', 'Timed offers with a countdown', 'Your page in 12 languages', 'Gold leaf and Riso looks', 'Your page on Google and other search engines', '120 photos and a video', 'A portfolio of 60 projects', 'Around here: your own places on your drawn map', 'A year of traffic, and a CSV', 'First in the list of pages, with a gold star', 'Everything in Free'],
  my: ['ကြိုတင်မှာယူမှု၊ အိမ်ကြော်ငြာ၊ Agoda နှင့် Booking.com ခလုတ်များ', 'နောက်ပြန်ရေတွက်သည့် ပရိုမိုးရှင်း', 'ဘာသာစကား ၁၂ မျိုး', 'ရွှေနှင့် Riso ပုံစံများ', 'Google တွင် ပေါ်သည်', 'ဓာတ်ပုံ ၁၂၀ ပုံနှင့် ဗီဒီယို', 'ပရောဂျက် ၆၀ ရဲ့ လက်ရာစုစည်းမှု', 'ဤအနီး- သင့်နေရာများ မြေပုံပေါ်တွင်', 'တစ်နှစ်စာ စာရင်းနှင့် CSV', 'စာရင်းတွင် ရှေ့ဆုံး', 'အခမဲ့ရှိသမျှ'],
  zh: ['预约、买卖租赁房源、通往你 Agoda 和 Booking.com 页面的按钮', '带倒计时的限时优惠', '网页有 12 种语言', '金箔和 Riso 两种样式', '网页能出现在 Google 等搜索引擎', '120 张照片和一个视频', '60 个项目的作品集', '附近：你的地方标在手绘地图上', '一年的访问数据和 CSV', '在网页列表里排前面，带金星', '免费版的一切'],
}
const GOLD_DING = ['key', 'megaphone', 'chat', 'crown', 'search', 'camera', 'nib', 'compass', 'calendar', 'star', 'check']
const FREE_DING = ['link', 'pencil', 'telephone', 'envelope', 'calendar', 'camera', 'share', 'sparkle', 'nib']

let L = store.get('lang', (navigator.language || 'th').slice(0, 2))
if (!W[L]) L = 'th'
const w = (k) => (W[L] && W[L][k]) || W.en[k] || ''

// ---- the hero: the visitor's shop, drawn as they type ----------------------------------------
const KINDS = [['food', 'restaurant', 'noodles'], ['cafe', 'cafe', 'coffee'], ['shop', 'clothes', 'cart'], ['service', 'massage', 'gear'], ['event', 'market', 'party']]
let kind = 0, alt = null, typed = ''
const ALTS = [null, 38, 2, -6, -22]
let ai = 0

function load(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s) }) }
const ready = load('/front/skyline.js').then(() => load('/front/doodler.js'))
const dbs = load('/s/db/core.js').then(() => Promise.all(['signals', 'classic', 'kitchen', 'faces', 'lanna', 'curious'].map((f) => load('/s/db/' + f + '.js'))))

const cv = $('#drawn'), cx = cv.getContext('2d')
let CW = 0, CH = 0, last = 0, visible = true
function size() { const dpr = Math.min(2, devicePixelRatio || 1); CW = cv.clientWidth; CH = cv.clientHeight; cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0) }
function paint(t) {
  const D = window.MDDOODLER
  if (!D || !CW) return
  const nm = typed || w('tryPh')
  cx.clearRect(0, 0, CW, CH)
  try { D.portrait(cx, CW, CH, t, { set: KINDS[kind][1], alt: ALTS[ai], place: { id: 'home-' + nm, name: nm, nameTh: nm, nameEn: nm, cat: KINDS[kind][0], sub: [KINDS[kind][1]], hours: 'Mo-Su 08:00-21:00', lat: 18.7883, lng: 98.9853 } }) } catch {}
}
function loop(t) { if (visible && t - last > 33) { last = t; paint(t) } requestAnimationFrame(loop) }
ready.then(() => { size(); paint(4000); addEventListener('mddoodler', () => paint(performance.now())); if (!REDUCED) requestAnimationFrame(loop) }).catch(() => { $('#stage').hidden = true })
addEventListener('resize', () => { size(); paint(4000) })
new IntersectionObserver((es) => { visible = es[0].isIntersecting }).observe(cv)
$('#stage').onclick = () => { ai = (ai + 1) % ALTS.length; paint(performance.now()); if (window.Dingbats?.burst) { const r = cv.getBoundingClientRect(); try { window.Dingbats.burst(r.left + r.width / 2, r.top + r.height / 2, { names: ['sparkle', 'star', 'lantern'], n: 10 }) } catch {} } }
$('#tn').addEventListener('input', (e) => { typed = e.target.value.trim(); paint(performance.now()) })
$('#try').onsubmit = (e) => {
  e.preventDefault()
  const k = KINDS[kind][0], pk = k === 'cafe' ? 'food' : k
  const q = new URLSearchParams({ kind: pk })
  if (typed) q.set('title', typed)
  location.href = '/make#' + q
}

function chips() {
  $('#chips').innerHTML = KINDS.map(([k, , d], i) => `<button type="button" data-k="${i}"${i === kind ? ' class="on"' : ''}><i data-dingbat="${d}" data-look="ink" data-play="hover"></i>${w('k_' + k)}</button>`).join('')
  $('#chips').querySelectorAll('button').forEach((b) => (b.onclick = () => { kind = +b.dataset.k; chips(); paint(performance.now()) }))
}

// ---- example pages, drawn by the real renderer --------------------------------------------
const wk = (a, b) => Array.from({ length: 7 }, (_, i) => (i === 2 ? null : [[a, b]]))
// the example pages' pictures: made over by the picture studio from CC0 photos (tools/bands.py)
const EXP = { exkhaosoi0000: 'khaosoi', exkhaosoi2000: 'khaosoi2', exbungalow000: 'bungalow', expaifields00: 'paifields', exlanterns000: 'lanternsx',
  exwatgold0000: 'watgold', expathwash000: 'pathwash', exmapink00000: 'mapink', expairiso0000: 'pairiso' }
let EXCR = {}, AVATAR = ''
const exImg = (id, small) => (id === 'exavatar00000' ? AVATAR : EXP[id] ? `/s/home/ex-${EXP[id]}${small ? '-s' : ''}.webp` : '')
const exCredits = (ids) => Object.fromEntries(ids.filter((id) => EXCR[EXP[id]]).map((id) => [id, EXCR[EXP[id]]]))
const th = () => L === 'th'
const EXAMPLES = () => [
  { name: 'example-studio', look: 'clean', lang: L, kind: 'work', tier: 'gold', d: {
    name: th() ? 'มดแดงสตูดิโอ' : 'Ant House Studio', tagline: th() ? 'ป้าย เมนู ฉลาก และเว็บ สำหรับร้านเล็ก ๆ ในภาคเหนือ' : 'Signs, menus, labels and websites for small shops in the north',
    avatar: 'exavatar00000', cover: 'exmapink00000', photos: ['exmapink00000', 'exwatgold0000', 'expathwash000', 'expairiso0000', 'exkhaosoi0000'], accent: '#d7261e', drawing: false,
    works: [
      { id: 'w1map', t: th() ? 'แผนที่เมืองเก่า' : 'Old city map', client: th() ? 'ชุมชนประตูท่าแพ' : 'Tha Phae Gate community', year: '2026', tags: 'Maps, Print', photos: ['exmapink00000'] },
      { id: 'w2wat', t: th() ? 'โปสเตอร์ลายรดน้ำ' : 'Gold lacquer posters', client: th() ? 'วัดในเวียง' : 'Wats in the old city', year: '2026', tags: 'Print', photos: ['exwatgold0000'] },
      { id: 'w3path', t: th() ? 'ป้ายทางเดินโคมไฟ' : 'Lantern path signs', client: th() ? 'บ้านพักแม่ฮ่องสอน' : 'A Mae Hong Son homestay', year: '2025', tags: 'Signs', photos: ['expathwash000'] },
      { id: 'w4pai', t: th() ? 'ฉลากข้าวปาย' : 'Pai rice labels', client: th() ? 'นาข้าวปาย' : 'Pai rice farmers', year: '2025', tags: 'Packaging, Print', photos: ['expairiso0000'] },
    ],
    quotes: [{ q: th() ? 'แผนที่สวยจนคนถ่ายรูปกับป้าย' : 'People stop to take photos of the map.', who: th() ? 'ป้าแดง ตลาดประตูท่าแพ' : 'Pa Daeng, Tha Phae market' }],
    contact: { line: '@example' }, msg: true } },
  { name: 'example-khao-soi', look: 'lanna', lang: L, kind: 'food', d: {
    name: th() ? 'ข้าวซอยบ้านมด' : 'Ant House Khao Soi', tagline: th() ? 'ข้าวซอยไก่สูตรเชียงใหม่ น้ำแกงเคี่ยวทุกเช้า' : 'Chiang Mai chicken khao soi, the curry simmered every morning',
    cover: 'exkhaosoi0000', photos: ['exkhaosoi0000', 'exkhaosoi2000'],
    items: [{ n: th() ? 'ข้าวซอยไก่' : 'Khao soi, chicken', p: '60' }, { n: th() ? 'ข้าวซอยเนื้อ' : 'Khao soi, beef', p: '70' }, { n: th() ? 'น้ำเงี้ยว' : 'Nam ngiao', p: '55' }],
    hours: { on: true, tz: 'Asia/Bangkok', week: wk('09:00', '16:00') }, contact: { line: '@example' }, place: { lat: 18.7953, lng: 98.9937, cc: 'TH', zoom: 17 }, msg: true } },
  { name: 'example-pai', look: 'loom', lang: L, kind: 'stay', tier: 'gold', d: {
    name: th() ? 'บ้านมดปาย' : 'Ant House Pai', tagline: th() ? 'บังกะโลริมทุ่งนา ห้านาทีจากถนนคนเดิน' : 'Bungalows by the rice fields, five minutes from the walking street',
    cover: 'exbungalow000', photos: ['exbungalow000', 'expaifields00'], drawing: false,
    rooms: [{ id: 'r1bun', n: th() ? 'บังกะโลวิวนา' : 'Field-view bungalow', guests: 2, beds: th() ? 'เตียงคู่' : 'Double bed', p: '1200', photos: ['exbungalow000', 'expaifields00'] }],
    ota: { agoda: 'https://www.agoda.com/', booking: 'https://www.booking.com/' }, contact: { line: '@example' }, msg: true } },
  { name: 'example-night', look: 'gold', lang: L, kind: 'event', tier: 'gold', d: {
    name: th() ? 'คืนโคมบ้านมด' : 'Ant House Lantern Night', tagline: th() ? 'ดนตรีสด โคมลอย ของกินริมทาง' : 'Live music, lanterns and street food',
    cover: 'exlanterns000', photos: ['exlanterns000'], dings: ['lantern', 'string-lights', 'note'],
    contact: { line: '@example' }, msg: true } },
]
async function avatar() {
  try {
    await dbs; await loadFaces()
    const c = document.createElement('canvas'); c.width = c.height = 256
    drawMark(c.getContext('2d'), 256, { shape: 'stamp', bg: '#d7261e', pat: 'rays', glyph: 'nib', letters: 'AH', font: 'Prompt', ink: '#ffffff' }, window.Dingbats || null)
    AVATAR = c.toDataURL('image/png')
  } catch {}
}
function phones() {
  const labels = [[w('t_work'), 'Clean'], [w('k_food'), 'Lanna'], [w('k_stay'), 'Loom ★'], [w('k_event'), 'Gold leaf ★']]
  const list = EXAMPLES()
  $('#rail').innerHTML = list.map((x, i) => `<div class="phone"><div class="shell"><iframe title="${w('ex')}" loading="lazy" data-i="${i}"></iframe></div><p><span class="ex">${w('ex')}</span><br>${labels[i][0]}<small>${labels[i][1]}</small></p></div>`).join('')
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return
    io.unobserve(e.target)
    const x = list[+e.target.dataset.i]
    const d = { ...x.d, credits: exCredits([...new Set([x.d.cover, ...(x.d.photos || [])].filter(Boolean))]) }
    e.target.srcdoc = render({ ...x, d, status: 'live', views: 1200 + 37 * +e.target.dataset.i }, { preview: true, gold: x.tier === 'gold', hotel: false, origin: location.origin, img: exImg })
    // an example's buttons stay inside it: no call, chat or map leaves the page
    e.target.onload = () => { try { e.target.contentDocument.addEventListener('click', (ev) => { const a = ev.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) ev.preventDefault() }, true) } catch {} }
  }), { rootMargin: '300px' })
  $('#rail').querySelectorAll('iframe').forEach((f) => io.observe(f))
}

// ---- the toys ------------------------------------------------------------------------------
const HELLO = ['เปิดอยู่', 'Open now', 'ယခုဖွင့်ထားသည်', '营业中', '営業中', '영업 중', 'Đang mở cửa', 'កំពុងបើក', 'ເປີດຢູ່', 'Buka sekarang', 'Abierto', 'Ouvert']
function toys() {
  const days = [3, 5, 4, 8, 12, 9, 14, 11, 18, 16, 22, 19, 27, 24]
  $('#toys').innerHTML = [
    `<div class="toy rise" data-go="draw"><div class="art"><i data-dingbat="pencil" data-look="riso"></i></div><h3>${w('t_draw')}</h3><p>${w('t_drawP')}</p></div>`,
    `<div class="toy line rise"><div class="art">${qrSvg('https://sites.motdang.net/make', { dark: '#06c755', light: '#0e1f3d', label: 'LINE' })}</div><h3>${w('t_line')}</h3><p>${w('t_lineP')}</p></div>`,
    `<div class="toy grab rise"><div class="art"><i data-dingbat="scooter" data-look="ink"></i></div><h3>${w('t_grab')}</h3><p>${w('t_grabP')}</p></div>`,
    `<div class="toy rise"><div class="art"><span class="badge"><i></i>${w('t_openB')}</span></div><h3>${w('t_open')}</h3><p>${w('t_openP')}</p></div>`,
    `<div class="toy map rise"><iframe loading="lazy" title="${w('t_map')}" data-src="/map?pin=18.7883,98.9853&amp;pn=${encodeURIComponent(w('tryPh'))}&amp;embed=1&amp;look=doodle"></iframe><div class="tx"><h3>${w('t_map')}</h3><p>${w('t_mapP')}</p></div></div>`,
    `<div class="toy rise"><div class="art" style="display:flex;flex-direction:column;gap:8px;place-items:stretch"><span class="bubble">${w('t_msg1')}</span><span class="bubble b2">${w('t_msg2')}</span></div><h3>${w('t_msg')}</h3><p>${w('t_msgP')}</p></div>`,
    `<div class="toy rise"><div class="art"><div class="minibars" style="width:100%">${days.map((n, i) => `<i style="height:${(n / 27) * 100}%;animation-delay:${i * 50}ms"></i>`).join('')}</div></div><h3>${w('t_stats')}</h3><p>${w('t_statsP')}</p></div>`,
    `<div class="toy rise"><div class="art"><i data-dingbat="share" data-look="riso"></i></div><h3>${w('t_share')}</h3><p>${w('t_shareP')}</p></div>`,
    `<div class="toy rise"><div class="art"><span class="words12" id="w12">${HELLO[0]}</span></div><h3>${w('t_lang')}</h3><p>${w('t_langP')}</p></div>`,
    `<div class="toy rise"><div class="art"><i data-dingbat="sparkle" data-look="riso"></i></div><h3>${w('t_pics')}</h3><p>${w('t_picsP')}</p></div>`,
    `<div class="toy rise"><div class="art"><span class="a4"><b>${esc(typed || w('tryPh'))}</b>${qrSvg('https://sites.motdang.net/', { dark: '#000', light: '#fff', label: 'QR' })}</span></div><h3>${w('t_sign')}</h3><p>${w('t_signP')}</p></div>`,
    `<a class="toy rise" href="/make#kind=work" style="text-decoration:none"><div class="art"><i data-dingbat="nib" data-look="riso"></i></div><h3>${w('t_work')}</h3><p>${w('t_workP')}</p></a>`,
    `<a class="toy rise" href="#pictures" style="text-decoration:none"><div class="art"><i data-dingbat="smile" data-look="paper"></i></div><h3>${w('t_face')}</h3><p>${w('t_faceP')}</p></a>`,
    `<a class="toy gold rise" href="#gold"><div class="art"><i data-dingbat="crown" data-look="paper"></i></div><h3>${w('t_gold')}</h3><p>${w('t_goldP')}</p></a>`,
  ].join('')
  $('#toys').querySelector('[data-go=draw]').onclick = () => $('#stage').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' })
  const mio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { mio.disconnect(); e.target.src = e.target.dataset.src } }), { rootMargin: '200px' })
  $('#toys').querySelectorAll('iframe[data-src]').forEach((f) => mio.observe(f))
  let n = 0
  clearInterval(toys.t)
  toys.t = setInterval(() => { const el = $('#w12'); if (el) el.textContent = HELLO[++n % HELLO.length] }, 1300)
  rise()
}

function looks() {
  $('#looks').innerHTML = LOOK_IDS.map((id) => {
    const Lk = LOOKS[id]
    return `<button class="lk" data-look="${id}" style="${(Lk.vars.replace(/\s+/g, ' ') + ';--accent:' + Lk.accent).replace(/"/g, '&quot;')}">${Lk.art}${Lk.gold ? '<span class="gl">★ Gold</span>' : ''}<b>${typed || w('tryPh')}</b><small>${Lk.label}</small><span class="acc"></span></button>`
  }).join('')
  $('#looks').querySelectorAll('.lk').forEach((b) => (b.onclick = () => { const a = b.querySelector('.art'); a.classList.remove('go'); void a.getBoundingClientRect(); a.classList.add('go') }))
}

// hotels: what 15% commission costs against the flat Gold year
function calc(price) {
  const nf = new Intl.NumberFormat(L), N = $('#cN'), M = $('#cM')
  if (!N) return
  const draw = () => {
    const n = +N.value, m = +M.value, ota = Math.round(n * m * 12 * 0.15), keep = Math.max(0, ota - price)
    $('#cvN').textContent = '฿' + nf.format(n); $('#cvM').textContent = nf.format(m)
    $('#vOta').textContent = '฿' + nf.format(ota) + ' ' + w('yr'); $('#vFlat').textContent = '฿' + nf.format(price) + ' ' + w('yr') + ' · ฿' + nf.format(Math.round(price / 12)) + ' ' + w('mo')
    const top = Math.max(ota, price)
    $('#bOta').style.width = (ota / top) * 100 + '%'; $('#bFlat').style.width = Math.max(1.5, (price / top) * 100) + '%'
    $('#vKeep').textContent = '฿' + nf.format(keep)
  }
  N.oninput = M.oninput = draw
  draw()
}

function tiers(price, hotel) {
  calc((hotel || 555) * 12)
  $('#freeList').innerHTML = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'].map((k, i) => `<li><i data-dingbat="${FREE_DING[i]}" data-look="ink"></i><span>${w(k)}</span></li>`).join('')
  $('#goldList').innerHTML = GOLD[L].map((t, i) => `<li><i data-dingbat="${GOLD_DING[i]}" data-look="paper"></i><span>${t}</span></li>`).join('')
  $('#goldPrice').innerHTML = `฿${new Intl.NumberFormat(L).format(price)} <small>${w('perYear')}</small><span class="hotelp">${w('hotelPrice').replace('{p}', new Intl.NumberFormat(L).format(hotel || 555))}</span>`
}


// ---- the lantern night: lanterns rising over the photo (2026-10-15) --------------------------
function lanterns() {
  const c = $('#lanterns')
  if (!c || REDUCED) return
  const x = c.getContext('2d'), R = (() => { let a = 1015; return () => ((a = (a * 16807) % 2147483647) / 2147483647) })()
  let W = 0, H = 0, on = true
  const L = Array.from({ length: 26 }, () => ({ x: R(), y: R(), z: 0.35 + R() * 0.9, s: R() * 6.28, v: 0.25 + R() * 0.5 }))
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0) }
  fit(); addEventListener('resize', fit)
  new IntersectionObserver((es) => { on = es[0].isIntersecting }).observe($('.hero'))
  let last = 0
  const draw = (t) => {
    requestAnimationFrame(draw)
    if (!on || t - last < 33) return
    const dt = Math.min(60, t - last); last = t
    x.clearRect(0, 0, W, H)
    for (const l of L) {
      l.y -= (l.v * l.z * dt) / 60000; if (l.y < -0.08) { l.y = 1.08; l.x = R() }
      const px = (l.x + Math.sin(t / 3200 + l.s) * 0.012) * W, py = l.y * H, r = 9 * l.z
      const flick = 0.82 + Math.sin(t / 180 + l.s * 7) * 0.08
      const g = x.createRadialGradient(px, py, 0, px, py, r * 4)
      g.addColorStop(0, `rgba(255,190,90,${0.42 * flick * l.z})`); g.addColorStop(1, 'rgba(255,140,40,0)')
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 4, 0, 6.29); x.fill()
      x.fillStyle = `rgba(255,${200 + 30 * flick},${120 + 40 * flick},${0.9 * l.z})`
      x.beginPath(); x.moveTo(px - r * 0.62, py - r); x.lineTo(px + r * 0.62, py - r); x.lineTo(px + r * 0.48, py + r * 0.7); x.lineTo(px - r * 0.48, py + r * 0.7); x.closePath(); x.fill()
      x.fillStyle = `rgba(255,250,220,${0.85 * flick})`; x.beginPath(); x.arc(px, py + r * 0.45, r * 0.22, 0, 6.29); x.fill()
    }
  }
  requestAnimationFrame(draw)
}

// ---- the picture studio, live: a dim photo, fixed or drawn on a tap ---------------------------
const SAMPLE = new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = '/s/home/sample.webp' })
const SKEYS = ['raw', 'fix', 'ink', 'wash', 'riso', 'gold', 'pop']
let sNow = 'gold'
async function studio() {
  const b = $('#sbtns')
  b.innerHTML = SKEYS.map((k) => `<button type="button" data-s="${k}"${k === sNow ? ' class="on"' : ''}>${w('s_' + k)}<small>${w('s_' + k + 'P')}</small></button>`).join('')
  b.querySelectorAll('button').forEach((x) => (x.onclick = () => { sNow = x.dataset.s; b.querySelectorAll('button').forEach((y) => y.classList.toggle('on', y === x)); showStyle() }))
  showStyle()
}
let srcPx = null
async function showStyle() {
  const c = $('#sdemo'), im = await SAMPLE.catch(() => null)
  if (!im) return
  c.width = im.naturalWidth; c.height = im.naturalHeight
  const x = c.getContext('2d', { willReadFrequently: true })
  if (!srcPx) { x.drawImage(im, 0, 0); srcPx = x.getImageData(0, 0, c.width, c.height) }
  $('#scap').textContent = w('s_' + sNow)
  if (sNow === 'raw') { x.putImageData(srcPx, 0, 0); return }
  await new Promise((r) => setTimeout(r, 0))
  const o = makeOver(srcPx, sNow, { accent: '#f04a00' })
  x.putImageData(new ImageData(o.data, o.width, o.height), 0, 0)
}

// ---- a cover from parts, shuffled ---------------------------------------------------------------
const COVERS = [['#e9b43b', 'tiles', 'noodles', 'Chonburi'], ['#22386b', 'rays', 'lantern', 'Prompt'], ['#1f9aa6', 'dots', 'koi', 'Sriracha'], ['#e85a8b', 'stripes', 'lotus', 'Chonburi'], ['#1e1e1e', 'rings', 'elephant', 'Prompt'], ['#62b04a', 'tiles', 'coffee', 'Sriracha']]
let cvI = 0
async function cover() {
  await dbs.catch(() => {}); await loadFaces()
  const c = $('#mdemo'), [bg, pat, glyph, font] = COVERS[cvI % COVERS.length]
  c.width = 800; c.height = 450
  drawCover(c.getContext('2d'), 800, 450, { bg, pat, glyph, font, ink: inkOn(bg), letters: '' }, window.Dingbats || null, typed || w('tryPh'), w('mkTag'))
}

function credits() {
  fetch('/s/home/credits.json').then((r) => r.json()).then((cr) => {
    document.querySelectorAll('[data-cr]').forEach((el) => { const c = cr[el.dataset.cr]; if (c) el.innerHTML = `${esc(c.title)} · ${esc(c.license)} · <a href="${esc(c.src)}" rel="noopener">Wikimedia Commons</a>` })
    $('#credits').innerHTML = w('pics') + ': ' + Object.values(cr).map((c) => `<a href="${esc(c.src)}" rel="noopener">${esc(c.title)}</a> (${esc(c.license)})`).join(' · ')
  }).catch(() => {})
}

// ---- the three steps, done here: what for, the name and its address, the look → the page ------
const STEP_KINDS = [['food', 'noodles'], ['shop', 'cart'], ['service', 'gear'], ['work', 'nib'], ['stay', 'key'], ['event', 'party'], ['me', 'wave']]
const FREE_LOOKS = LOOK_IDS
const inkFor = (Lk) => { const bg = /--bg:#([0-9a-f]{6})/i.exec(Lk.vars)?.[1] || 'ffffff', v = parseInt(bg, 16); return (0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 < 0.45 ? '#fff8ec' : /--ink:(#[0-9a-f]{6})/i.exec(Lk.vars)?.[1] || '#111' }
let sKind = 'food', sLook = 'poster', sName = ''
const slug = (n) => n.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
function steps() {
  $('#s1').innerHTML = STEP_KINDS.map(([k, d]) => `<button type="button" data-k="${k}"${k === sKind ? ' class="on"' : ''}><i data-dingbat="${d}" data-look="ink" data-play="hover"></i>${w(k === 'work' ? 't_work' : 'k_' + k)}</button>`).join('')
  $('#s1').querySelectorAll('button').forEach((b) => (b.onclick = () => { sKind = b.dataset.k; steps() }))
  $('#s3').innerHTML = FREE_LOOKS.map((id) => { const Lk = LOOKS[id]; return `<button type="button" data-l="${id}" title="${Lk.label}" aria-label="${Lk.label}" style="${(Lk.vars.replace(/\s+/g, ' ') + ';--accent:' + Lk.accent + ';color:' + inkFor(Lk)).replace(/"/g, '&quot;')}"${id === sLook ? ' class="on"' : ''}>Aa${Lk.gold ? '<i class="g">★</i>' : ''}</button>` }).join('')
  $('#s3').querySelectorAll('button').forEach((b) => (b.onclick = () => { sLook = b.dataset.l; steps() }))
  $('#s2').placeholder = w('s2ph')
  const sl = slug(sName)
  $('#s2a').textContent = 'sites.motdang.net/' + (sl.length >= 3 ? sl : sName ? '…' : slug(w('s2ph')))
  const q = new URLSearchParams({ kind: sKind, look: sLook, go: '1' })
  if (sName) q.set('title', sName)
  $('#s3go').href = '/make#' + q
}
$('#s2').addEventListener('input', (e) => { sName = e.target.value.trim(); steps() })

let COUNT = null
function live() {
  if (!COUNT || COUNT.live < 3) { $('#live').hidden = true; return }
  $('#live').hidden = false
  $('#liveH').textContent = w('liveH').replace('{n}', new Intl.NumberFormat(L).format(COUNT.live)).replace('{c}', new Intl.NumberFormat(L).format(COUNT.countries))
  $('#latest').innerHTML = COUNT.latest.map((p) => {
    const Lk = LOOKS[p.look] || LOOKS.poster
    const pic = p.card || p.cover ? `<img src="${p.card || p.cover}" alt="" loading="lazy">` : esc(p.title)
    return `<a href="/${esc(p.name)}"><span class="pic" style="${(Lk.vars.replace(/\s+/g, ' ')).replace(/"/g, '&quot;')}">${pic}</span><span class="t">${p.gold ? '★ ' : ''}${esc(p.title)}</span></a>`
  }).join('')
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function rise() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -6% 0px' })
  document.querySelectorAll('.rise:not(.in)').forEach((el) => (REDUCED ? el.classList.add('in') : io.observe(el)))
}

function words() {
  document.documentElement.lang = L
  document.querySelectorAll('[data-w]').forEach((el) => { const k = el.dataset.w; if (k === 'h1') el.innerHTML = w(k); else el.textContent = w(k) })
  $('#tn').placeholder = w('tryPh')
  $('#langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button data-l="${k}"${k === L ? ' class="on"' : ''}>${v}</button>`).join('')
  $('#langs').querySelectorAll('button').forEach((b) => (b.onclick = () => { L = b.dataset.l; store.set('lang', L); all() }))
}

function all() {
  words(); chips(); phones(); toys(); looks(); tiers(COUNT?.price || 3000, COUNT?.hotel || 555); live(); studio(); cover(); credits(); steps()
  paint(performance.now())
}
all()
lanterns()
$('#mshuffle').onclick = () => { cvI++; cover() }
$('#tn').addEventListener('change', () => cover())
Promise.all([fetch('/s/home/examples.json').then((r) => r.json()).then((j) => { EXCR = j }).catch(() => {}), avatar()]).then(() => phones())
fetch('/api/count').then((r) => r.json()).then((j) => { COUNT = j; tiers(j.price, j.hotel); live() }).catch(() => {})
dbs.catch(() => {})
