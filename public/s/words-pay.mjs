// words-pay.mjs — the button each kind of page leads with, and paying by PromptPay (Nan 2026-10-16:
// "built-in calls to action and near-instant monetization"). words.mjs reads this after its own.

export const P = {
  en: {
    ctaOrder: 'Order', ctaBuy: 'Buy', ctaRoom: 'Book a room', ctaBook: 'Book a time', ctaHomes: 'See the homes', ctaTicket: 'Get a ticket', ctaTip: 'Send a tip', ctaDues: 'Pay dues', ctaHire: 'Hire me', ctaJoin: 'Join us',
    pay: 'Pay by PromptPay', payHint: 'Scan with any Thai bank app. The money goes to {n}.', payOther: 'Other amount', payShow: 'Show the QR', payAmt: 'Amount', paySlip: 'Send the slip on LINE', payTotal: 'Pay {t}', payScan: 'Scan to pay {t}', payTips: 'A tip', payTicket: 'A ticket', payDues: 'Dues',
  },
  th: {
    ctaOrder: 'สั่งเลย', ctaBuy: 'ซื้อเลย', ctaRoom: 'จองห้องพัก', ctaBook: 'จองคิว', ctaHomes: 'ดูบ้าน', ctaTicket: 'ซื้อบัตร', ctaTip: 'ให้ทิป', ctaDues: 'จ่ายค่าสมาชิก', ctaHire: 'จ้างงาน', ctaJoin: 'มาร่วมกัน',
    pay: 'จ่ายด้วยพร้อมเพย์', payHint: 'สแกนด้วยแอปธนาคารไหนก็ได้ เงินเข้า {n} โดยตรง', payOther: 'จำนวนอื่น', payShow: 'แสดง QR', payAmt: 'จำนวนเงิน', paySlip: 'ส่งสลิปทางไลน์', payTotal: 'จ่าย {t}', payScan: 'สแกนจ่าย {t}', payTips: 'ทิป', payTicket: 'บัตร', payDues: 'ค่าสมาชิก',
  },
  my: {
    ctaOrder: 'မှာမယ်', ctaBuy: 'ဝယ်မယ်', ctaRoom: 'အခန်းကြိုတင်မှာ', ctaBook: 'အချိန်ကြိုတင်မှာ', ctaHomes: 'အိမ်တွေကြည့်', ctaTicket: 'လက်မှတ်ယူ', ctaTip: 'မုန့်ဖိုးပေး', ctaDues: 'အသင်းကြေးပေး', ctaHire: 'ငှားမယ်', ctaJoin: 'ပါဝင်မယ်',
    pay: 'PromptPay နဲ့ ပေးချေ', payHint: 'ထိုင်းဘဏ်အက်ပ်တစ်ခုခုနဲ့ စကင်ဖတ်ပါ။ ငွေက {n} ဆီ တိုက်ရိုက်ရောက်တယ်။', payOther: 'အခြားပမာဏ', payShow: 'QR ပြ', payAmt: 'ပမာဏ', paySlip: 'LINE မှာ စလစ်ပို့', payTotal: '{t} ပေး', payScan: '{t} ပေးဖို့ စကင်ဖတ်', payTips: 'မုန့်ဖိုး', payTicket: 'လက်မှတ်', payDues: 'အသင်းကြေး',
  },
  zh: {
    ctaOrder: '下单', ctaBuy: '购买', ctaRoom: '订房', ctaBook: '预约时间', ctaHomes: '看房源', ctaTicket: '买票', ctaTip: '打赏', ctaDues: '交会费', ctaHire: '雇我', ctaJoin: '加入我们',
    pay: '用 PromptPay 付款', payHint: '用任何泰国银行 App 扫码，钱直接到 {n}。', payOther: '其他金额', payShow: '显示二维码', payAmt: '金额', paySlip: '在 LINE 发送转账截图', payTotal: '付 {t}', payScan: '扫码付 {t}', payTips: '打赏', payTicket: '门票', payDues: '会费',
  },
  ja: {
    ctaOrder: '注文する', ctaBuy: '買う', ctaRoom: '部屋を予約', ctaBook: '時間を予約', ctaHomes: '物件を見る', ctaTicket: 'チケットを買う', ctaTip: 'チップを送る', ctaDues: '会費を払う', ctaHire: '依頼する', ctaJoin: '参加する',
    pay: 'PromptPayで支払う', payHint: 'タイの銀行アプリで読み取ってください。代金は{n}に直接届きます。', payOther: 'ほかの金額', payShow: 'QRを表示', payAmt: '金額', paySlip: 'LINEで振込明細を送る', payTotal: '{t}を支払う', payScan: '{t}をスキャンで支払う', payTips: 'チップ', payTicket: 'チケット', payDues: '会費',
  },
  ko: {
    ctaOrder: '주문하기', ctaBuy: '구매하기', ctaRoom: '객실 예약', ctaBook: '시간 예약', ctaHomes: '매물 보기', ctaTicket: '티켓 구매', ctaTip: '팁 보내기', ctaDues: '회비 내기', ctaHire: '의뢰하기', ctaJoin: '함께하기',
    pay: 'PromptPay로 결제', payHint: '태국 은행 앱으로 스캔하세요. 돈은 {n}에게 바로 갑니다.', payOther: '다른 금액', payShow: 'QR 보기', payAmt: '금액', paySlip: 'LINE으로 영수증 보내기', payTotal: '{t} 결제', payScan: '{t} 스캔해서 결제', payTips: '팁', payTicket: '티켓', payDues: '회비',
  },
  vi: {
    ctaOrder: 'Đặt món', ctaBuy: 'Mua', ctaRoom: 'Đặt phòng', ctaBook: 'Đặt lịch', ctaHomes: 'Xem nhà', ctaTicket: 'Mua vé', ctaTip: 'Gửi tiền tip', ctaDues: 'Đóng hội phí', ctaHire: 'Thuê tôi', ctaJoin: 'Tham gia',
    pay: 'Trả bằng PromptPay', payHint: 'Quét bằng ứng dụng ngân hàng Thái bất kỳ. Tiền về thẳng {n}.', payOther: 'Số tiền khác', payShow: 'Hiện mã QR', payAmt: 'Số tiền', paySlip: 'Gửi biên lai qua LINE', payTotal: 'Trả {t}', payScan: 'Quét để trả {t}', payTips: 'Tiền tip', payTicket: 'Vé', payDues: 'Hội phí',
  },
  km: {
    ctaOrder: 'កុម្ម៉ង់', ctaBuy: 'ទិញ', ctaRoom: 'កក់បន្ទប់', ctaBook: 'កក់ពេល', ctaHomes: 'មើលផ្ទះ', ctaTicket: 'ទិញសំបុត្រ', ctaTip: 'ផ្ញើលុយទឹកតែ', ctaDues: 'បង់ថ្លៃសមាជិក', ctaHire: 'ជួលខ្ញុំ', ctaJoin: 'ចូលរួម',
    pay: 'បង់តាម PromptPay', payHint: 'ស្កេនដោយកម្មវិធីធនាគារថៃណាមួយ។ លុយចូល {n} ផ្ទាល់។', payOther: 'ចំនួនផ្សេង', payShow: 'បង្ហាញ QR', payAmt: 'ចំនួនលុយ', paySlip: 'ផ្ញើបង្កាន់ដៃតាម LINE', payTotal: 'បង់ {t}', payScan: 'ស្កេនដើម្បីបង់ {t}', payTips: 'លុយទឹកតែ', payTicket: 'សំបុត្រ', payDues: 'ថ្លៃសមាជិក',
  },
  lo: {
    ctaOrder: 'ສັ່ງ', ctaBuy: 'ຊື້', ctaRoom: 'ຈອງຫ້ອງ', ctaBook: 'ຈອງເວລາ', ctaHomes: 'ເບິ່ງເຮືອນ', ctaTicket: 'ຊື້ປີ້', ctaTip: 'ໃຫ້ທິບ', ctaDues: 'ຈ່າຍຄ່າສະມາຊິກ', ctaHire: 'ຈ້າງຂ້ອຍ', ctaJoin: 'ມາຮ່ວມ',
    pay: 'ຈ່າຍດ້ວຍ PromptPay', payHint: 'ສະແກນດ້ວຍແອັບທະນາຄານໄທໃດກໍໄດ້. ເງິນເຂົ້າ {n} ໂດຍກົງ.', payOther: 'ຈຳນວນອື່ນ', payShow: 'ສະແດງ QR', payAmt: 'ຈຳນວນເງິນ', paySlip: 'ສົ່ງສະລິບທາງ LINE', payTotal: 'ຈ່າຍ {t}', payScan: 'ສະແກນຈ່າຍ {t}', payTips: 'ທິບ', payTicket: 'ປີ້', payDues: 'ຄ່າສະມາຊິກ',
  },
  id: {
    ctaOrder: 'Pesan', ctaBuy: 'Beli', ctaRoom: 'Pesan kamar', ctaBook: 'Pesan jadwal', ctaHomes: 'Lihat rumah', ctaTicket: 'Beli tiket', ctaTip: 'Kirim tip', ctaDues: 'Bayar iuran', ctaHire: 'Sewa saya', ctaJoin: 'Gabung',
    pay: 'Bayar dengan PromptPay', payHint: 'Pindai dengan aplikasi bank Thailand mana saja. Uangnya langsung ke {n}.', payOther: 'Jumlah lain', payShow: 'Tampilkan QR', payAmt: 'Jumlah', paySlip: 'Kirim bukti transfer lewat LINE', payTotal: 'Bayar {t}', payScan: 'Pindai untuk bayar {t}', payTips: 'Tip', payTicket: 'Tiket', payDues: 'Iuran',
  },
  es: {
    ctaOrder: 'Pedir', ctaBuy: 'Comprar', ctaRoom: 'Reservar habitación', ctaBook: 'Reservar hora', ctaHomes: 'Ver casas', ctaTicket: 'Comprar entrada', ctaTip: 'Dejar propina', ctaDues: 'Pagar cuota', ctaHire: 'Contrátame', ctaJoin: 'Únete',
    pay: 'Pagar con PromptPay', payHint: 'Escanea con cualquier app bancaria tailandesa. El dinero va directo a {n}.', payOther: 'Otra cantidad', payShow: 'Ver el QR', payAmt: 'Cantidad', paySlip: 'Enviar el comprobante por LINE', payTotal: 'Pagar {t}', payScan: 'Escanea para pagar {t}', payTips: 'Propina', payTicket: 'Entrada', payDues: 'Cuota',
  },
  fr: {
    ctaOrder: 'Commander', ctaBuy: 'Acheter', ctaRoom: 'Réserver une chambre', ctaBook: 'Réserver un créneau', ctaHomes: 'Voir les biens', ctaTicket: 'Prendre un billet', ctaTip: 'Laisser un pourboire', ctaDues: 'Payer la cotisation', ctaHire: 'Engagez-moi', ctaJoin: 'Rejoignez-nous',
    pay: 'Payer par PromptPay', payHint: "Scannez avec n'importe quelle appli bancaire thaïe. L'argent va directement à {n}.", payOther: 'Autre montant', payShow: 'Afficher le QR', payAmt: 'Montant', paySlip: 'Envoyer le reçu sur LINE', payTotal: 'Payer {t}', payScan: 'Scannez pour payer {t}', payTips: 'Pourboire', payTicket: 'Billet', payDues: 'Cotisation',
  },
}
