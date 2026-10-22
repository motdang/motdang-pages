// make-words-gold.mjs — the builder's words for reading a menu from a photo and for receipts, 2026-10-22.
// Burmese and Chinese are machine quality.

export const GM = {
  en: {
    mr_btn: 'Read a menu photo', mr_why: 'Pick or take a photo of a paper menu or price board.', mr_reading: 'Reading…',
    mr_found: '{n} lines. Tick the ones to add.', mr_none: 'No lines found. Try a closer, brighter photo.',
    mr_fail: 'Could not read it. Try again.', mr_quota: 'Too many reads today. Try again tomorrow.',
    mr_add: 'Add {n}', mr_sec: 'Section in details', mr_cancel: 'Cancel', mr_added: '{n} added', mr_full: 'The list is full. {n} did not fit.',
    mr_all: 'All', mr_row: 'Add this line',
    rc_head: 'Receipt', rc_tax: 'Tax ID', rc_taxHint: 'Printed on each receipt with the name, address and phone from your page.',
    rc_open: 'Receipt', bk_depIn: 'Deposit received',
  },
  th: {
    mr_btn: 'อ่านเมนูจากรูป', mr_why: 'เลือกหรือถ่ายรูปเมนูกระดาษหรือป้ายราคา', mr_reading: 'กำลังอ่าน…',
    mr_found: 'ได้ {n} รายการ ติ๊กอันที่จะเพิ่ม', mr_none: 'ไม่พบรายการ ลองถ่ายใกล้ขึ้นและสว่างขึ้น',
    mr_fail: 'อ่านไม่ได้ ลองใหม่', mr_quota: 'วันนี้อ่านครบแล้ว ลองใหม่พรุ่งนี้',
    mr_add: 'เพิ่ม {n}', mr_sec: 'ใส่หมวดในรายละเอียด', mr_cancel: 'ยกเลิก', mr_added: 'เพิ่มแล้ว {n}', mr_full: 'รายการเต็มแล้ว เพิ่มไม่ได้ {n}',
    mr_all: 'ทั้งหมด', mr_row: 'เพิ่มรายการนี้',
    rc_head: 'ใบเสร็จรับเงิน', rc_tax: 'เลขประจำตัวผู้เสียภาษี', rc_taxHint: 'พิมพ์บนใบเสร็จทุกใบ พร้อมชื่อ ที่อยู่ และเบอร์โทรจากเว็บของคุณ',
    rc_open: 'ใบเสร็จ', bk_depIn: 'รับมัดจำแล้ว',
  },
  my: {
    mr_btn: 'ဓာတ်ပုံထဲက မီနူးကို ဖတ်ရန်', mr_why: 'စာရွက်မီနူး သို့မဟုတ် ဈေးနှုန်းဘုတ်ကို ရွေးပါ၊ ဓာတ်ပုံရိုက်ပါ။', mr_reading: 'ဖတ်နေသည်…',
    mr_found: 'စာကြောင်း {n} ကြောင်း။ ထည့်မည့်ဟာတွေကို အမှန်ခြစ်ပါ။', mr_none: 'ဘာမှ မတွေ့ပါ။ ပိုနီးပြီး ပိုလင်းတဲ့ ဓာတ်ပုံနဲ့ ကြိုးစားပါ။',
    mr_fail: 'ဖတ်မရပါ။ ပြန်ကြိုးစားပါ။', mr_quota: 'ယနေ့ ဖတ်တာ များလွန်းသည်။ မနက်ဖြန်ပြန်ကြိုးစားပါ။',
    mr_add: '{n} ထည့်ရန်', mr_sec: 'အမျိုးအစားကို အသေးစိတ်ထဲထည့်', mr_cancel: 'မလုပ်တော့ပါ', mr_added: '{n} ထည့်ပြီး', mr_full: 'စာရင်းပြည့်ပြီ။ {n} မဆန့်ပါ။',
    mr_all: 'အားလုံး', mr_row: 'ဤစာကြောင်းကို ထည့်ရန်',
    rc_head: 'ငွေလက်ခံဖြတ်ပိုင်း', rc_tax: 'အခွန်ထမ်းအမှတ်', rc_taxHint: 'သင့်စာမျက်နှာက အမည်၊ လိပ်စာ၊ ဖုန်းနဲ့အတူ ပြေစာတိုင်းမှာ ပါမည်။',
    rc_open: 'ငွေလက်ခံဖြတ်ပိုင်း', bk_depIn: 'စပ်ယ်ငွေ ရပြီး',
  },
  zh: {
    mr_btn: '从照片读取菜单', mr_why: '选择或拍一张纸质菜单或价格牌的照片。', mr_reading: '正在读取…',
    mr_found: '共 {n} 行。勾选要添加的。', mr_none: '没有找到。请拍近一点、亮一点。',
    mr_fail: '读取失败，请再试。', mr_quota: '今天读取太多了，明天再试。',
    mr_add: '添加 {n} 行', mr_sec: '分类放进说明', mr_cancel: '取消', mr_added: '已添加 {n} 行', mr_full: '列表已满，{n} 行放不下。',
    mr_all: '全部', mr_row: '添加这一行',
    rc_head: '收据', rc_tax: '税号', rc_taxHint: '与网页上的名称、地址、电话一起印在每张收据上。',
    rc_open: '收据', bk_depIn: '已收订金',
  },
}
