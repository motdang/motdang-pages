// make-words-card.mjs — the share card part's words (NaN 2026-10-20: "add a card-drawing library and some
// kind of user input interface on card design").

export const K = {
  en: {
    s_card: 'Share card', a_card: 'The picture your link carries', og_why: 'What people see when your link is shared on LINE, Facebook and the rest.',
    og_layout: 'Layout', og_l_photo: 'Picture behind', og_l_band: 'Picture above', og_l_split: 'Picture beside', og_l_plain: 'Words only',
    og_font: 'Lettering', og_f_prompt: 'Modern', og_f_chonburi: 'Classic', og_f_sriracha: 'Handwritten', og_f_anton: 'Tall', og_f_serif: 'Elegant',
    og_pic: 'Picture', og_focus: 'Tap the card to choose the part of the picture to keep.',
    og_title: 'Big words', og_line: 'Line under', og_seeItem: 'Card of', og_page: 'The page',
    og_items: 'Each item page gets its own card in this style, with its own photo and name.',
    og_draft: 'The card on your link changes when you publish.', og_err: 'The card did not draw. Try again in a moment.',
  },
  th: {
    s_card: 'การ์ดแชร์', a_card: 'ภาพที่ไปกับลิงก์ของคุณ', og_why: 'สิ่งที่คนเห็นเมื่อแชร์ลิงก์ของคุณใน LINE, Facebook และที่อื่น',
    og_layout: 'รูปแบบ', og_l_photo: 'รูปเต็มการ์ด', og_l_band: 'รูปด้านบน', og_l_split: 'รูปด้านข้าง', og_l_plain: 'ตัวหนังสืออย่างเดียว',
    og_font: 'ตัวอักษร', og_f_prompt: 'ทันสมัย', og_f_chonburi: 'คลาสสิก', og_f_sriracha: 'ลายมือ', og_f_anton: 'สูงแคบ', og_f_serif: 'หรูหรา',
    og_pic: 'รูป', og_focus: 'แตะการ์ดเพื่อเลือกส่วนของรูปที่จะเก็บไว้',
    og_title: 'คำตัวใหญ่', og_line: 'บรรทัดใต้', og_seeItem: 'การ์ดของ', og_page: 'หน้าหลัก',
    og_items: 'หน้าของแต่ละชิ้นได้การ์ดของตัวเองแบบนี้ พร้อมรูปและชื่อของมัน',
    og_draft: 'การ์ดบนลิงก์ของคุณเปลี่ยนเมื่อกดเผยแพร่', og_err: 'วาดการ์ดไม่สำเร็จ ลองอีกครั้งในอีกสักครู่',
  },
  my: {
    s_card: 'မျှဝေကတ်', a_card: 'သင့်လင့်ခ်နှင့်အတူ ပါသွားမည့်ပုံ', og_why: 'သင့်လင့်ခ်ကို LINE၊ Facebook စသည်တို့တွင် မျှဝေသောအခါ လူတွေမြင်ရမည့်ပုံ။',
    og_layout: 'ပုံစံ', og_l_photo: 'ပုံနောက်ခံ', og_l_band: 'ပုံအပေါ်', og_l_split: 'ပုံဘေး', og_l_plain: 'စာသားသာ',
    og_font: 'စာလုံး', og_f_prompt: 'ခေတ်ဆန်', og_f_chonburi: 'ရိုးရာ', og_f_sriracha: 'လက်ရေး', og_f_anton: 'ရှည်', og_f_serif: 'ခန့်ညား',
    og_pic: 'ပုံ', og_focus: 'ပုံ၏ ထားလိုသောအပိုင်းကို ရွေးရန် ကတ်ကို နှိပ်ပါ။',
    og_title: 'စာလုံးကြီး', og_line: 'အောက်စာကြောင်း', og_seeItem: 'ကတ်', og_page: 'စာမျက်နှာ',
    og_items: 'ပစ္စည်းစာမျက်နှာတစ်ခုစီသည် ဤပုံစံဖြင့် ကိုယ်ပိုင်ပုံနှင့် အမည်ပါသော ကတ်ရသည်။',
    og_draft: 'ထုတ်ဝေသောအခါ သင့်လင့်ခ်ရှိ ကတ် ပြောင်းမည်။', og_err: 'ကတ် မဆွဲနိုင်ပါ။ ခဏနေ ထပ်ကြိုးစားပါ။',
  },
  zh: {
    s_card: '分享卡片', a_card: '链接带着的那张图', og_why: '你的链接在 LINE、Facebook 等处分享时，别人看到的样子。',
    og_layout: '版式', og_l_photo: '整图', og_l_band: '图在上', og_l_split: '图在旁', og_l_plain: '只有文字',
    og_font: '字体', og_f_prompt: '现代', og_f_chonburi: '经典', og_f_sriracha: '手写', og_f_anton: '瘦高', og_f_serif: '典雅',
    og_pic: '图片', og_focus: '点卡片，选图片要保留的部分。',
    og_title: '大字', og_line: '下面一行', og_seeItem: '卡片：', og_page: '网页本身',
    og_items: '每个物品页都有这种样式的卡片，配它自己的照片和名字。',
    og_draft: '发布后，链接上的卡片才会更新。', og_err: '卡片没画出来，稍后再试。',
  },
}
