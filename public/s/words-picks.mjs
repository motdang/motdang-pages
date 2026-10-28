// words-picks.mjs — the swatch book on a page (picks.mjs), 2026-10-28. Any other page language reads English.

export const PKW = {
  en: { pkT: 'Samples', pkHint: 'Tap the ones you like. They go with your booking or message.', pkFrom: 'from {p}', pkBook: 'Book a time', pkLine: 'Send on LINE', pkAsk: 'Ask about these', pkClear: 'Clear' },
  th: { pkT: 'ตัวอย่าง', pkHint: 'แตะเลือกที่ชอบ แล้วส่งไปพร้อมการจองหรือข้อความ', pkFrom: 'เริ่ม {p}', pkBook: 'จองเวลา', pkLine: 'ส่งทาง LINE', pkAsk: 'ถามเรื่องนี้', pkClear: 'ล้าง' },
  my: { pkT: 'နမူနာများ', pkHint: 'ကြိုက်တာကို နှိပ်ပါ။ ချိန်းဆိုမှု သို့မဟုတ် စာနှင့်အတူ ပါသွားမည်။', pkFrom: '{p} မှစ', pkBook: 'အချိန်ချိန်းရန်', pkLine: 'LINE ဖြင့်ပို့ရန်', pkAsk: 'ဒါတွေကို မေးရန်', pkClear: 'ရှင်းရန်' },
  zh: { pkT: '样品', pkHint: '点选喜欢的，随预约或留言一起发送。', pkFrom: '{p} 起', pkBook: '预约时间', pkLine: '用 LINE 发送', pkAsk: '询问这些', pkClear: '清除' },
  ja: { pkT: 'サンプル', pkHint: '気に入ったものをタップ。予約やメッセージと一緒に送られます。', pkFrom: '{p}から', pkBook: '予約する', pkLine: 'LINEで送る', pkAsk: 'これについて聞く', pkClear: 'クリア' },
  ko: { pkT: '샘플', pkHint: '마음에 드는 것을 누르세요. 예약이나 메시지와 함께 보내집니다.', pkFrom: '{p}부터', pkBook: '예약하기', pkLine: 'LINE으로 보내기', pkAsk: '문의하기', pkClear: '지우기' },
  fr: { pkT: 'Échantillons', pkHint: 'Touchez ceux qui vous plaisent. Ils partent avec votre réservation ou votre message.', pkFrom: 'dès {p}', pkBook: 'Réserver', pkLine: 'Envoyer sur LINE', pkAsk: 'Demander', pkClear: 'Effacer' },
  es: { pkT: 'Muestras', pkHint: 'Toque los que le gustan. Van con su reserva o su mensaje.', pkFrom: 'desde {p}', pkBook: 'Reservar', pkLine: 'Enviar por LINE', pkAsk: 'Preguntar', pkClear: 'Borrar' },
}

// the builder's words for the swatch book
export const PKM = {
  en: {
    s_picks: 'Swatch book', a_picks: 'Photos of cloth, colours or tiles with a code. Customers tap the ones they like', sw_hint: 'Photos of what a customer chooses before coming in: cloth, colours, tiles, frames. A tap picks one, and the picks go with the booking or message.',
    sw_title: 'Title on the page', sw_titleHint: 'Fabrics', sw_group: 'Group', sw_groupHint: 'Wool suiting', sw_note: 'Note', sw_from: 'Price from',
    s_post: 'Post it home', a_post: 'Visitors who leave before the work is ready give a home address; it comes in as an order',
    po_hint: 'For work finished after the customer leaves. Their home address comes in the Orders tab: press Paid when the postage is paid, then Shipped with the tracking number. With Ship with Mot Dang on, Mot Dang posts it.',
    po_on: 'Show Post it home on the page', po_note: 'Your words (if you like)', po_noteHint: 'Leaving Chiang Mai before your clothes are ready? We post them home.', po_noPrice: 'No postage set: the customer sees “we tell you the price”.',
    sw_add: 'Add a group', sw_photos: 'Add photos', sw_code: 'Code', sw_n: '{n} photos', sw_full: 'The swatch book is full.',
  },
  th: {
    s_picks: 'แคตตาล็อกตัวอย่าง', a_picks: 'รูปผ้า สี หรือกระเบื้องพร้อมรหัส ลูกค้าแตะเลือกที่ชอบ', sw_hint: 'รูปของที่ลูกค้าเลือกก่อนมาร้าน เช่น ผ้า สี กระเบื้อง กรอบรูป แตะเพื่อเลือก แล้วสิ่งที่เลือกจะส่งไปพร้อมการจองหรือข้อความ',
    sw_title: 'ชื่อบนหน้าเว็บ', sw_titleHint: 'ผ้า', sw_group: 'กลุ่ม', sw_groupHint: 'ผ้าวูลตัดสูท', sw_note: 'หมายเหตุ', sw_from: 'ราคาเริ่ม',
    s_post: 'ส่งไปถึงบ้าน', a_post: 'ลูกค้าที่กลับก่อนงานเสร็จ ให้ที่อยู่บ้านไว้ เข้ามาเป็นออเดอร์',
    po_hint: 'สำหรับงานที่เสร็จหลังลูกค้ากลับ ที่อยู่บ้านเข้ามาในแท็บออเดอร์ กด จ่ายแล้ว เมื่อได้ค่าส่ง แล้วกด ส่งแล้ว พร้อมเลขพัสดุ ถ้าเปิด ส่งกับมดแดง มดแดงส่งให้',
    po_on: 'แสดง ส่งไปถึงบ้าน บนหน้าเว็บ', po_note: 'ข้อความของคุณ (ถ้าต้องการ)', po_noteHint: 'กลับก่อนชุดเสร็จ? เราส่งไปถึงบ้าน', po_noPrice: 'ยังไม่ได้ตั้งค่าส่ง ลูกค้าจะเห็น “เราแจ้งราคาให้”',
    sw_add: 'เพิ่มกลุ่ม', sw_photos: 'เพิ่มรูป', sw_code: 'รหัส', sw_n: '{n} รูป', sw_full: 'แคตตาล็อกเต็มแล้ว',
  },
}
