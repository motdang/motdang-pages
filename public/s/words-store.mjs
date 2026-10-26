// words-store.mjs — the words a page and a buyer's order page print for the online shop and the downloads
// (Nan 2026-10-26). Thai, English, Burmese, Chinese; short words for readers whose first language is another one.
// sw() falls back to the page's other words (words.mjs), then to English.

import { word } from './words.mjs'

export const SW = {
  en: {
    shop: 'Shop', buy: 'Buy', addCart: 'Add to cart', buyNow: 'Buy now', sold: 'Sold out', left: 'Only {n} left', qty: 'Quantity',
    more: 'More products', allShop: 'All the products', askAbout: 'Ask about this product', noPrice: 'Ask the price',
    shipH: 'Shipping', shTh: 'Thailand {p}', shWorld: 'Abroad {p}', shFree: 'Free over {p}', shThFree: 'Free in Thailand', shMot: 'Mot Dang ships your parcel',
    dls: 'Downloads', dl1: 'Download', dlGet: 'You get the file after the shop sees your payment.',
    cart: 'Cart', cartN: '{n} in your cart', checkout: 'Check out', cartEmpty: 'Your cart is empty.', rm: 'Remove', added: 'Added to your cart',
    fName: 'Your name', fReach: 'Phone or LINE', fEmail: 'Email', fEmailDl: 'Email (your download is sent here)', fAddr: 'Address for the parcel',
    fCc: 'Country', fNote: 'Note (optional)', fCode: 'Discount code', fApply: 'Apply',
    tSub: 'Items', tDisc: 'Discount', tShip: 'Shipping', tTotal: 'Total', go: 'Order and pay', goWait: 'Please wait…', payNext: 'Next you get a PromptPay QR for the exact amount.',
    eEmpty: 'Nothing is chosen yet.', eLines: 'This page sells one product at a time.', eItem: 'This is not for sale now.', eStock: 'There are not enough in stock.',
    eOpt: 'The options are not chosen.', eName: 'Your name is missing.', eReach: 'A phone number, LINE ID or email is missing.', eEmail: 'Your email is missing. The download is sent there.',
    eAddr: 'The address for the parcel is missing.', eCc: 'The country is not chosen.', eAbroad: 'This shop does not ship abroad.', eCode: 'This code does not work.',
    eNopay: 'This shop cannot take orders yet.', eGold: 'This is not for sale now.', eQuota: 'Too many tries today.', eHeld: 'The order could not be sent.', eNet: 'No signal.',
    oTitle: 'Your order', oRef: 'Order', oWait: 'Waiting for your payment', oSlipIn: 'Slip sent. The shop will check it.', oPaid: 'Paid. Thank you.',
    oNo: 'The shop did not see your payment.', oGone: 'This order is cancelled.',
    oPay: 'Pay with PromptPay', oScan: 'Scan with your bank app. Pay exactly {a}.', oSlip: 'Send your slip', oSend: 'Send', oSlipHint: 'A picture of the slip from your bank app.',
    oItems: 'Your things', oShipTo: 'Sent to', oTrack: 'Tracking number', oSoon: 'The shop will send it soon.', oMot: 'Mot Dang ships this parcel.',
    oDl: 'Your downloads', oDlLeft: '{n} left', oDlEnd: 'This download has ended.', oDlWait: 'Downloads open after the shop sees your payment.',
    oShop: 'Back to the shop', oKeep: 'This page is your link to this order.', oSlipGot: 'Thank you. The shop will check your slip.',
  },
  th: {
    shop: 'ร้านค้า', buy: 'ซื้อ', addCart: 'ใส่ตะกร้า', buyNow: 'ซื้อเลย', sold: 'หมดแล้ว', left: 'เหลือ {n} ชิ้น', qty: 'จำนวน',
    more: 'สินค้าอื่น', allShop: 'สินค้าทั้งหมด', askAbout: 'ถามเรื่องสินค้านี้', noPrice: 'สอบถามราคา',
    shipH: 'การจัดส่ง', shTh: 'ในประเทศ {p}', shWorld: 'ต่างประเทศ {p}', shFree: 'ส่งฟรีเมื่อซื้อครบ {p}', shThFree: 'ส่งฟรีในประเทศ', shMot: 'มดแดงส่งพัสดุให้',
    dls: 'ดาวน์โหลด', dl1: 'ดาวน์โหลด', dlGet: 'ได้ไฟล์หลังร้านเห็นว่าเงินเข้าแล้ว',
    cart: 'ตะกร้า', cartN: 'ในตะกร้า {n} ชิ้น', checkout: 'ชำระเงิน', cartEmpty: 'ตะกร้าว่าง', rm: 'เอาออก', added: 'ใส่ตะกร้าแล้ว',
    fName: 'ชื่อของคุณ', fReach: 'เบอร์โทรหรือไลน์', fEmail: 'อีเมล', fEmailDl: 'อีเมล (ส่งไฟล์ให้ที่นี่)', fAddr: 'ที่อยู่จัดส่ง',
    fCc: 'ประเทศ', fNote: 'หมายเหตุ (ไม่ใส่ก็ได้)', fCode: 'โค้ดส่วนลด', fApply: 'ใช้โค้ด',
    tSub: 'ราคาสินค้า', tDisc: 'ส่วนลด', tShip: 'ค่าส่ง', tTotal: 'รวม', go: 'สั่งซื้อและชำระเงิน', goWait: 'รอสักครู่…', payNext: 'ขั้นต่อไปจะได้คิวอาร์พร้อมเพย์ตามยอดนี้',
    eEmpty: 'ยังไม่ได้เลือกสินค้า', eLines: 'หน้านี้ขายทีละอย่าง', eItem: 'สินค้านี้ยังไม่ขายตอนนี้', eStock: 'ของในสต็อกไม่พอ',
    eOpt: 'ยังไม่ได้เลือกตัวเลือก', eName: 'ยังไม่ได้ใส่ชื่อ', eReach: 'ยังไม่ได้ใส่เบอร์โทร ไลน์ หรืออีเมล', eEmail: 'ยังไม่ได้ใส่อีเมล ไฟล์ส่งไปที่นี่',
    eAddr: 'ยังไม่ได้ใส่ที่อยู่จัดส่ง', eCc: 'ยังไม่ได้เลือกประเทศ', eAbroad: 'ร้านนี้ไม่ส่งต่างประเทศ', eCode: 'โค้ดนี้ใช้ไม่ได้',
    eNopay: 'ร้านนี้ยังรับออเดอร์ไม่ได้', eGold: 'สินค้านี้ยังไม่ขายตอนนี้', eQuota: 'วันนี้ลองหลายครั้งแล้ว', eHeld: 'ส่งออเดอร์ไม่ได้', eNet: 'ไม่มีสัญญาณ',
    oTitle: 'ออเดอร์ของคุณ', oRef: 'ออเดอร์', oWait: 'รอคุณชำระเงิน', oSlipIn: 'ส่งสลิปแล้ว ร้านจะตรวจ', oPaid: 'ชำระแล้ว ขอบคุณ',
    oNo: 'ร้านยังไม่เห็นเงินเข้า', oGone: 'ออเดอร์นี้ยกเลิกแล้ว',
    oPay: 'จ่ายด้วยพร้อมเพย์', oScan: 'สแกนด้วยแอปธนาคาร จ่ายให้ตรง {a}', oSlip: 'ส่งสลิป', oSend: 'ส่ง', oSlipHint: 'รูปสลิปจากแอปธนาคาร',
    oItems: 'ของที่สั่ง', oShipTo: 'ส่งไปที่', oTrack: 'เลขพัสดุ', oSoon: 'ร้านจะส่งให้เร็ว ๆ นี้', oMot: 'มดแดงส่งพัสดุนี้ให้',
    oDl: 'ไฟล์ของคุณ', oDlLeft: 'เหลือ {n} ครั้ง', oDlEnd: 'ดาวน์โหลดหมดเวลาแล้ว', oDlWait: 'ดาวน์โหลดได้หลังร้านเห็นว่าเงินเข้าแล้ว',
    oShop: 'กลับไปที่ร้าน', oKeep: 'หน้านี้คือลิงก์ของออเดอร์นี้', oSlipGot: 'ขอบคุณ ร้านจะตรวจสลิปของคุณ',
  },
  my: {
    shop: 'ဆိုင်', buy: 'ဝယ်ရန်', addCart: 'ခြင်းထဲထည့်ရန်', buyNow: 'ယခုဝယ်ရန်', sold: 'ကုန်သွားပြီ', left: '{n} ခုသာ ကျန်တော့သည်', qty: 'အရေအတွက်',
    more: 'အခြားပစ္စည်းများ', allShop: 'ပစ္စည်းအားလုံး', askAbout: 'ဤပစ္စည်းအကြောင်း မေးရန်', noPrice: 'စျေးမေးရန်',
    shipH: 'ပို့ဆောင်ခ', shTh: 'ထိုင်းနိုင်ငံအတွင်း {p}', shWorld: 'ပြည်ပ {p}', shFree: '{p} ကျော်ရင် အခမဲ့', shThFree: 'ထိုင်းနိုင်ငံအတွင်း အခမဲ့', shMot: 'Mot Dang က ပါဆယ်ပို့ပေးသည်',
    dls: 'ဒေါင်းလုဒ်', dl1: 'ဒေါင်းလုဒ်လုပ်ရန်', dlGet: 'ဆိုင်က ငွေရပြီးမှ ဖိုင်ရမည်',
    cart: 'ခြင်း', cartN: 'ခြင်းထဲ {n} ခု', checkout: 'ငွေပေးချေရန်', cartEmpty: 'ခြင်းထဲ ဘာမှမရှိပါ', rm: 'ဖယ်ရန်', added: 'ခြင်းထဲထည့်ပြီး',
    fName: 'သင့်အမည်', fReach: 'ဖုန်း သို့မဟုတ် LINE', fEmail: 'အီးမေးလ်', fEmailDl: 'အီးမေးလ် (ဖိုင်ကို ဤနေရာသို့ ပို့မည်)', fAddr: 'ပါဆယ်ပို့ရန် လိပ်စာ',
    fCc: 'နိုင်ငံ', fNote: 'မှတ်ချက် (မရေးလည်းရ)', fCode: 'လျှော့စျေးကုဒ်', fApply: 'သုံးမည်',
    tSub: 'ပစ္စည်းဈေး', tDisc: 'လျှော့စျေး', tShip: 'ပို့ခ', tTotal: 'စုစုပေါင်း', go: 'မှာယူပြီး ငွေပေးရန်', goWait: 'ခဏစောင့်ပါ…', payNext: 'နောက်တစ်ဆင့်တွင် ဤငွေပမာဏအတွက် PromptPay QR ရမည်',
    eEmpty: 'ရွေးထားတာ မရှိသေးပါ', eLines: 'ဤစာမျက်နှာတွင် တစ်ခါလျှင် ပစ္စည်းတစ်ခုသာ ရောင်းသည်', eItem: 'ဤပစ္စည်းကို ယခု မရောင်းပါ', eStock: 'လက်ကျန်မလောက်ပါ',
    eOpt: 'ရွေးစရာများ မရွေးရသေးပါ', eName: 'အမည် မရေးရသေးပါ', eReach: 'ဖုန်းနံပါတ်၊ LINE သို့မဟုတ် အီးမေးလ် မရေးရသေးပါ', eEmail: 'အီးမေးလ် မရေးရသေးပါ။ ဖိုင်ကို ထိုနေရာသို့ ပို့မည်',
    eAddr: 'ပါဆယ်ပို့ရန် လိပ်စာ မရေးရသေးပါ', eCc: 'နိုင်ငံ မရွေးရသေးပါ', eAbroad: 'ဤဆိုင်သည် ပြည်ပသို့ မပို့ပါ', eCode: 'ဤကုဒ် အသုံးမပြုနိုင်ပါ',
    eNopay: 'ဤဆိုင်သည် မှာယူမှု မလက်ခံနိုင်သေးပါ', eGold: 'ဤပစ္စည်းကို ယခု မရောင်းပါ', eQuota: 'ယနေ့ အကြိမ်များလွန်းသည်', eHeld: 'မှာယူမှု မပို့နိုင်ပါ', eNet: 'လိုင်းမရပါ',
    oTitle: 'သင့်မှာယူမှု', oRef: 'မှာယူမှု', oWait: 'သင့်ငွေပေးချေမှုကို စောင့်နေသည်', oSlipIn: 'ငွေလွှဲပြေစာ ပို့ပြီး။ ဆိုင်က စစ်မည်', oPaid: 'ငွေပေးပြီး။ ကျေးဇူးတင်ပါသည်',
    oNo: 'ဆိုင်က ငွေမရသေးပါ', oGone: 'ဤမှာယူမှုကို ပယ်ဖျက်ပြီး',
    oPay: 'PromptPay ဖြင့် ပေးရန်', oScan: 'ဘဏ်အက်ပ်ဖြင့် စကင်ဖတ်ပါ။ {a} အတိအကျ ပေးပါ', oSlip: 'ငွေလွှဲပြေစာ ပို့ရန်', oSend: 'ပို့ရန်', oSlipHint: 'ဘဏ်အက်ပ်မှ ပြေစာဓာတ်ပုံ',
    oItems: 'မှာထားသောပစ္စည်း', oShipTo: 'ပို့ရမည့်နေရာ', oTrack: 'ခြေရာခံနံပါတ်', oSoon: 'ဆိုင်က မကြာမီ ပို့ပေးမည်', oMot: 'Mot Dang က ဤပါဆယ်ကို ပို့ပေးသည်',
    oDl: 'သင့်ဒေါင်းလုဒ်များ', oDlLeft: '{n} ကြိမ် ကျန်သည်', oDlEnd: 'ဤဒေါင်းလုဒ် ကုန်ဆုံးပြီ', oDlWait: 'ဆိုင်က ငွေရပြီးမှ ဒေါင်းလုဒ်ဖွင့်မည်',
    oShop: 'ဆိုင်သို့ ပြန်သွားရန်', oKeep: 'ဤစာမျက်နှာသည် သင့်မှာယူမှု လင့်ခ် ဖြစ်သည်', oSlipGot: 'ကျေးဇူးတင်ပါသည်။ ဆိုင်က သင့်ပြေစာကို စစ်မည်',
  },
  zh: {
    shop: '商店', buy: '购买', addCart: '加入购物车', buyNow: '立即购买', sold: '已售完', left: '仅剩 {n} 件', qty: '数量',
    more: '更多商品', allShop: '全部商品', askAbout: '询问这件商品', noPrice: '询价',
    shipH: '运费', shTh: '泰国境内 {p}', shWorld: '海外 {p}', shFree: '满 {p} 免运费', shThFree: '泰国境内包邮', shMot: 'Mot Dang 帮你寄包裹',
    dls: '下载', dl1: '下载', dlGet: '店家看到付款后，你就能拿到文件。',
    cart: '购物车', cartN: '购物车里有 {n} 件', checkout: '去结账', cartEmpty: '购物车是空的。', rm: '移除', added: '已加入购物车',
    fName: '你的名字', fReach: '电话或 LINE', fEmail: '邮箱', fEmailDl: '邮箱（下载文件发到这里）', fAddr: '收件地址',
    fCc: '国家', fNote: '备注（可不填）', fCode: '优惠码', fApply: '使用',
    tSub: '商品', tDisc: '优惠', tShip: '运费', tTotal: '合计', go: '下单并付款', goWait: '请稍等…', payNext: '下一步会出现这个金额的 PromptPay 二维码。',
    eEmpty: '还没选东西。', eLines: '这个网页一次只卖一种。', eItem: '这件商品现在不卖。', eStock: '库存不够。',
    eOpt: '规格还没选。', eName: '还没写名字。', eReach: '还没写电话、LINE 或邮箱。', eEmail: '还没写邮箱，文件会发到这里。',
    eAddr: '还没写收件地址。', eCc: '还没选国家。', eAbroad: '这家店不寄海外。', eCode: '这个优惠码不能用。',
    eNopay: '这家店还不能接单。', eGold: '这件商品现在不卖。', eQuota: '今天试太多次了。', eHeld: '订单没发出去。', eNet: '没有信号。',
    oTitle: '你的订单', oRef: '订单', oWait: '等你付款', oSlipIn: '已发送转账凭证，店家会核对。', oPaid: '已付款，谢谢。',
    oNo: '店家没有收到款。', oGone: '这个订单已取消。',
    oPay: '用 PromptPay 付款', oScan: '用银行 App 扫码，请付 {a} 整。', oSlip: '发送转账凭证', oSend: '发送', oSlipHint: '银行 App 里转账凭证的照片。',
    oItems: '你订的东西', oShipTo: '寄到', oTrack: '快递单号', oSoon: '店家很快就会寄出。', oMot: '这个包裹由 Mot Dang 寄出。',
    oDl: '你的下载', oDlLeft: '还能下载 {n} 次', oDlEnd: '这个下载已过期。', oDlWait: '店家看到付款后才能下载。',
    oShop: '回到商店', oKeep: '这个页面是这个订单的链接。', oSlipGot: '谢谢，店家会核对你的凭证。',
  },
}

/** The words for `lang`: this table, then the page's other words, then English. {n}, {p} and {a} fill from `vars`. */
export function sw(lang, k, vars) {
  let s = (SW[lang] && SW[lang][k]) || SW.en[k]
  if (!s) return word(lang, k, vars)
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.split('{' + a + '}').join(b)
  return s
}
