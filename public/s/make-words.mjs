// make-words.mjs — the builder's words, and the directory's.

import { Z } from './make-words-more.mjs'
import { GM } from './make-words-gold.mjs'
import { Y } from './make-words-try.mjs'
import { X } from './make-words-edit.mjs'
import { W } from './make-words-pick.mjs'
import { A } from './make-words-avatar.mjs'
import { G } from './make-words-logo.mjs'
import { Q } from './make-words-doodle.mjs'
import { K } from './make-words-card.mjs'
import { N } from './make-words-cust.mjs'
import { N as NL } from './make-words-line.mjs'
import { B } from './make-words-gbp.mjs'

export const UI_LANGS = { th: 'ไทย', en: 'English', my: 'မြန်မာ', zh: '中文' }

const U = {
  en: {
    title: 'Make your own page', mine: 'Your pages', start: 'Start', next: 'Next', back: 'Back',
    q1: 'What is it for?', q2: 'What is it called?', q3: 'Pick a look',
    k_shop: 'Shop', k_food: 'Food', k_service: 'Service', k_me: 'Me', k_event: 'Event', k_group: 'Group or club',
    h_shop: 'Hours · prices · map', h_food: 'Menu · GrabFood · map', h_service: 'Prices · LINE · area', h_me: 'Links · photos',
    h_event: 'Date · place · countdown', h_group: 'About · links · meetings',
    name: 'Name', addr: 'Web address', addrHint: 'small letters a–z, 0–9 and -',
    a_ok: 'Available', a_mine: 'Your page — open it', reopened: 'Your page is here.', a_taken: 'Taken', a_reserved: 'Not allowed', a_shape: '3 to 30 letters', a_wait: 'Checking…',
    s_words: 'Name and words', tagline: 'One line under the name', about: 'About',
    s_photos: 'Photos', cover: 'Top photo', addPhotos: 'Add photos', makeCover: 'Use at the top', remove: 'Remove',
    s_contact: 'Contact', phone: 'Phone', line: 'LINE ID or @ shop ID', whatsapp: 'WhatsApp', facebook: 'Facebook page',
    instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', email: 'Email', web: 'Website',
    s_map: 'Map', here: 'Use where I am', paste: 'Paste a Google Maps link', pasteGo: 'Use link', photoPin: 'Use where the photo was taken',
    dragHint: 'Move the map until the pin sits on your door.', address: 'Address in words', country: 'Country',
    noMap: 'No live map here. The pin and directions work.', noPin: 'No pin yet', pinSet: 'Pin set', clearPin: 'Remove pin',
    s_hours: 'Hours', open24: 'Open 24 hours', closed: 'Closed', sameAll: 'Same every day', note: 'Note',
    s_items: 'Menu or prices', item: 'Item', price: 'Price', details: 'Details', addItem: 'Add a line', currency: 'Currency',
    s_order: 'Order online', grabfood: 'GrabFood shop link', lineman: 'LINE MAN shop link',
    s_links: 'Links', linkText: 'Words on the button', linkUrl: 'Link', addLink: 'Add a link',
    s_event: 'Date and time', starts: 'Starts', ends: 'Ends',
    s_look: 'Look', colour: 'Colour', counter: 'Visit counter', pageLang: 'Page language',
    addMore: 'Add', preview: 'Preview', edit: 'Edit',
    publish: 'Put it online', save: 'Save', saved: 'Saved', saving: 'Saving…',
    live: 'Your page is online', held: 'Saved. It goes online after a check.', draft: 'Saved as a draft',
    editLink: 'Your edit link', editHint: 'This link opens the editor. Send it to yourself on LINE.',
    sendSelf: 'Send to myself on LINE', copy: 'Copy', copied: 'Copied', open: 'Open my page', sign: 'Print a sign', share: 'Share',
    del: 'Delete this page', delAsk: 'Delete this page for good?',
    e_quota: 'Too many for today. Try again tomorrow.', e_refused: 'This photo cannot go on a page.', e_net: 'No connection. Try again.',
    e_link: 'This edit link does not open a page.', e_name: 'Pick another web address.', e_coords: 'No place in that link.',
    d_title: 'Pages', d_all: 'All', d_none: 'No pages.', d_make: 'Make your own page',
    nf: 'No page at this address.', nf_free: 'This address is free.', nf_make: 'Make it yours', nf_draft: 'This page is being made.',
    nf_gone: 'This page was taken down.', open_tab: 'Open',
  },
  th: {
    title: 'ทำเว็บของคุณเอง', mine: 'เว็บของคุณ', start: 'เริ่ม', next: 'ต่อไป', back: 'กลับ',
    q1: 'ทำเว็บเรื่องอะไร', q2: 'ชื่ออะไร', q3: 'เลือกแบบ',
    k_shop: 'ร้านค้า', k_food: 'ร้านอาหาร', k_service: 'งานบริการ', k_me: 'ตัวฉัน', k_event: 'งานอีเวนต์', k_group: 'กลุ่ม ชมรม',
    h_shop: 'เวลาเปิด · ราคา · แผนที่', h_food: 'เมนู · GrabFood · แผนที่', h_service: 'ราคา · ไลน์ · พื้นที่', h_me: 'ลิงก์ · รูป',
    h_event: 'วัน · สถานที่ · นับถอยหลัง', h_group: 'เกี่ยวกับ · ลิงก์ · นัดพบ',
    name: 'ชื่อ', addr: 'ที่อยู่เว็บ', addrHint: 'ตัวอังกฤษพิมพ์เล็ก a–z ตัวเลข 0–9 และ -',
    a_ok: 'ใช้ได้', a_mine: 'เว็บของคุณ กดเปิดได้เลย', reopened: 'เว็บของคุณอยู่ที่นี่', a_taken: 'มีคนใช้แล้ว', a_reserved: 'ใช้ชื่อนี้ไม่ได้', a_shape: '3 ถึง 30 ตัว', a_wait: 'กำลังดู…',
    s_words: 'ชื่อและคำอธิบาย', tagline: 'ประโยคสั้นๆ ใต้ชื่อ', about: 'เกี่ยวกับ',
    s_photos: 'รูป', cover: 'รูปด้านบน', addPhotos: 'เพิ่มรูป', makeCover: 'ใช้เป็นรูปด้านบน', remove: 'เอาออก',
    s_contact: 'ติดต่อ', phone: 'เบอร์โทร', line: 'ไอดีไลน์ หรือ @ไอดีร้าน', whatsapp: 'WhatsApp', facebook: 'เพจเฟซบุ๊ก',
    instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', email: 'อีเมล', web: 'เว็บไซต์',
    s_map: 'แผนที่', here: 'ใช้ตำแหน่งที่ฉันอยู่', paste: 'วางลิงก์ Google Maps', pasteGo: 'ใช้ลิงก์', photoPin: 'ใช้ตำแหน่งที่ถ่ายรูป',
    dragHint: 'เลื่อนแผนที่จนหมุดอยู่ตรงหน้าร้าน', address: 'ที่อยู่', country: 'ประเทศ',
    noMap: 'ที่นี่ไม่มีแผนที่สด หมุดและการนำทางใช้ได้', noPin: 'ยังไม่ได้ปักหมุด', pinSet: 'ปักหมุดแล้ว', clearPin: 'เอาหมุดออก',
    s_hours: 'เวลาเปิด', open24: 'เปิด 24 ชั่วโมง', closed: 'ปิด', sameAll: 'ทุกวันเหมือนกัน', note: 'หมายเหตุ',
    s_items: 'เมนู หรือ ราคา', item: 'รายการ', price: 'ราคา', details: 'รายละเอียด', addItem: 'เพิ่มรายการ', currency: 'สกุลเงิน',
    s_order: 'สั่งออนไลน์', grabfood: 'ลิงก์ร้านใน GrabFood', lineman: 'ลิงก์ร้านใน LINE MAN',
    s_links: 'ลิงก์', linkText: 'คำบนปุ่ม', linkUrl: 'ลิงก์', addLink: 'เพิ่มลิงก์',
    s_event: 'วันและเวลา', starts: 'เริ่ม', ends: 'จบ',
    s_look: 'แบบ', colour: 'สี', counter: 'ตัวนับคนเข้าชม', pageLang: 'ภาษาของหน้าเว็บ',
    addMore: 'เพิ่ม', preview: 'ดูตัวอย่าง', edit: 'แก้ไข',
    publish: 'เผยแพร่', save: 'บันทึก', saved: 'บันทึกแล้ว', saving: 'กำลังบันทึก…',
    live: 'เว็บของคุณออนไลน์แล้ว', held: 'บันทึกแล้ว รอตรวจก่อนออนไลน์', draft: 'บันทึกเป็นฉบับร่าง',
    editLink: 'ลิงก์สำหรับแก้ไข', editHint: 'ลิงก์นี้เปิดหน้าแก้ไขเว็บ ส่งเก็บไว้ในไลน์ของคุณ',
    sendSelf: 'ส่งเข้าไลน์ตัวเอง', copy: 'คัดลอก', copied: 'คัดลอกแล้ว', open: 'เปิดเว็บของฉัน', sign: 'พิมพ์ป้าย', share: 'แชร์',
    del: 'ลบเว็บนี้', delAsk: 'ลบเว็บนี้ถาวรไหม',
    e_quota: 'วันนี้ทำครบแล้ว ลองใหม่พรุ่งนี้', e_refused: 'รูปนี้ใส่ในเว็บไม่ได้', e_net: 'ไม่มีสัญญาณ ลองอีกครั้ง',
    e_link: 'ลิงก์แก้ไขนี้เปิดเว็บไม่ได้', e_name: 'เลือกที่อยู่เว็บอื่น', e_coords: 'ลิงก์นี้ไม่มีตำแหน่ง',
    d_title: 'หน้าเว็บ', d_all: 'ทั้งหมด', d_none: 'ไม่มีเว็บ', d_make: 'ทำเว็บของคุณเอง',
    nf: 'ไม่มีเว็บที่อยู่นี้', nf_free: 'ที่อยู่นี้ว่าง', nf_make: 'ทำเป็นของคุณ', nf_draft: 'กำลังทำเว็บนี้อยู่',
    nf_gone: 'เว็บนี้ถูกลบแล้ว', open_tab: 'เปิด',
  },
  my: {
    title: 'ကိုယ်ပိုင်စာမျက်နှာလုပ်ရန်', mine: 'သင့်စာမျက်နှာများ', start: 'စတင်ရန်', next: 'ရှေ့ဆက်', back: 'နောက်သို့',
    q1: 'ဘာအတွက်လဲ', q2: 'နာမည်ဘာလဲ', q3: 'ပုံစံရွေးပါ',
    k_shop: 'ဆိုင်', k_food: 'စားသောက်ဆိုင်', k_service: 'ဝန်ဆောင်မှု', k_me: 'ကိုယ်တိုင်', k_event: 'ပွဲ', k_group: 'အဖွဲ့ / အသင်း',
    h_shop: 'ဖွင့်ချိန် · ဈေး · မြေပုံ', h_food: 'မီနူး · GrabFood · မြေပုံ', h_service: 'ဈေး · LINE · နေရာ', h_me: 'လင့်ခ် · ဓာတ်ပုံ',
    h_event: 'ရက် · နေရာ · ရေတွက်ချိန်', h_group: 'အကြောင်း · လင့်ခ် · တွေ့ဆုံပွဲ',
    name: 'နာမည်', addr: 'ဝက်ဘ်လိပ်စာ', addrHint: 'အင်္ဂလိပ်စာလုံးအသေး a–z၊ 0–9 နှင့် -',
    a_ok: 'သုံးလို့ရသည်', a_mine: 'သင့်စာမျက်နှာ — ဖွင့်ပါ', reopened: 'သင့်စာမျက်နှာ ဒီမှာပါ။', a_taken: 'သုံးပြီးသား', a_reserved: 'ခွင့်မပြု', a_shape: 'စာလုံး ၃ မှ ၃၀', a_wait: 'စစ်နေသည်…',
    s_words: 'နာမည်နှင့် စာ', tagline: 'နာမည်အောက်က စာတစ်ကြောင်း', about: 'အကြောင်း',
    s_photos: 'ဓာတ်ပုံ', cover: 'အပေါ်ဓာတ်ပုံ', addPhotos: 'ဓာတ်ပုံထည့်ရန်', makeCover: 'အပေါ်မှာသုံးရန်', remove: 'ဖယ်ရန်',
    s_contact: 'ဆက်သွယ်ရန်', phone: 'ဖုန်း', line: 'LINE ID သို့မဟုတ် @ဆိုင် ID', whatsapp: 'WhatsApp', facebook: 'Facebook စာမျက်နှာ',
    instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', email: 'အီးမေးလ်', web: 'ဝက်ဘ်ဆိုက်',
    s_map: 'မြေပုံ', here: 'ကျွန်ုပ်ရှိရာနေရာကိုသုံးရန်', paste: 'Google Maps လင့်ခ် ကူးထည့်ပါ', pasteGo: 'လင့်ခ်သုံးရန်', photoPin: 'ဓာတ်ပုံရိုက်ခဲ့သည့်နေရာကိုသုံးရန်',
    dragHint: 'ပင်သည် သင့်တံခါးပေါ်ရောက်သည်အထိ မြေပုံကိုရွှေ့ပါ။', address: 'လိပ်စာ', country: 'နိုင်ငံ',
    noMap: 'ဤနေရာတွင် တိုက်ရိုက်မြေပုံမရှိပါ။ ပင်နှင့် လမ်းညွှန်အလုပ်လုပ်သည်။', noPin: 'ပင်မရှိသေး', pinSet: 'ပင်ထားပြီး', clearPin: 'ပင်ဖယ်ရန်',
    s_hours: 'ဖွင့်ချိန်', open24: '၂၄ နာရီဖွင့်', closed: 'ပိတ်', sameAll: 'နေ့တိုင်းအတူတူ', note: 'မှတ်ချက်',
    s_items: 'မီနူး သို့မဟုတ် ဈေးနှုန်း', item: 'ပစ္စည်း', price: 'ဈေး', details: 'အသေးစိတ်', addItem: 'တစ်ကြောင်းထည့်ရန်', currency: 'ငွေကြေး',
    s_order: 'အွန်လိုင်းမှာရန်', grabfood: 'GrabFood ဆိုင်လင့်ခ်', lineman: 'LINE MAN ဆိုင်လင့်ခ်',
    s_links: 'လင့်ခ်များ', linkText: 'ခလုတ်ပေါ်ကစာ', linkUrl: 'လင့်ခ်', addLink: 'လင့်ခ်ထည့်ရန်',
    s_event: 'ရက်နှင့်အချိန်', starts: 'စမည်', ends: 'ပြီးမည်',
    s_look: 'ပုံစံ', colour: 'အရောင်', counter: 'ကြည့်ရှုသူရေတွက်စက်', pageLang: 'စာမျက်နှာဘာသာစကား',
    addMore: 'ထည့်ရန်', preview: 'အစမ်းကြည့်ရန်', edit: 'ပြင်ရန်',
    publish: 'အွန်လိုင်းတင်ရန်', save: 'သိမ်းရန်', saved: 'သိမ်းပြီး', saving: 'သိမ်းနေသည်…',
    live: 'သင့်စာမျက်နှာ အွန်လိုင်းရောက်ပြီ', held: 'သိမ်းပြီး။ စစ်ဆေးပြီးမှ အွန်လိုင်းတက်မည်။', draft: 'မူကြမ်းအဖြစ်သိမ်းပြီး',
    editLink: 'ပြင်ဆင်ရန်လင့်ခ်', editHint: 'ဤလင့်ခ်က ပြင်ဆင်ရေးစာမျက်နှာကိုဖွင့်သည်။ LINE ဖြင့် ကိုယ့်ထံပို့ထားပါ။',
    sendSelf: 'LINE ဖြင့် ကိုယ့်ထံပို့ရန်', copy: 'ကူးရန်', copied: 'ကူးပြီး', open: 'ကျွန်ုပ်စာမျက်နှာဖွင့်ရန်', sign: 'ဆိုင်းဘုတ်ပရင့်ထုတ်ရန်', share: 'မျှဝေရန်',
    del: 'ဤစာမျက်နှာကိုဖျက်ရန်', delAsk: 'ဤစာမျက်နှာကို အပြီးဖျက်မလား',
    e_quota: 'ယနေ့အတွက် များလွန်းသည်။ မနက်ဖြန်ပြန်ကြိုးစားပါ။', e_refused: 'ဤဓာတ်ပုံကို စာမျက်နှာပေါ်တင်၍မရပါ။', e_net: 'ချိတ်ဆက်မှုမရှိ။ ထပ်ကြိုးစားပါ။',
    e_link: 'ဤလင့်ခ်ဖြင့် စာမျက်နှာမဖွင့်နိုင်ပါ။', e_name: 'အခြားလိပ်စာရွေးပါ။', e_coords: 'ဤလင့်ခ်တွင် နေရာမပါပါ။',
    d_title: 'စာမျက်နှာများ', d_all: 'အားလုံး', d_none: 'စာမျက်နှာမရှိ။', d_make: 'ကိုယ်ပိုင်စာမျက်နှာလုပ်ရန်',
    nf: 'ဤလိပ်စာတွင် စာမျက်နှာမရှိပါ။', nf_free: 'ဤလိပ်စာ အလွတ်ဖြစ်သည်။', nf_make: 'သင့်အတွက်ယူရန်', nf_draft: 'ဤစာမျက်နှာကို လုပ်နေဆဲဖြစ်သည်။',
    nf_gone: 'ဤစာမျက်နှာကို ဖယ်ရှားပြီးဖြစ်သည်။', open_tab: 'ဖွင့်ရန်',
  },
  zh: {
    title: '做你自己的网页', mine: '你的网页', start: '开始', next: '下一步', back: '返回',
    q1: '做什么用？', q2: '叫什么名字？', q3: '选个样式',
    k_shop: '商店', k_food: '餐饮', k_service: '服务', k_me: '个人', k_event: '活动', k_group: '团体 · 俱乐部',
    h_shop: '营业时间 · 价格 · 地图', h_food: '菜单 · GrabFood · 地图', h_service: '价格 · LINE · 服务区域', h_me: '链接 · 照片',
    h_event: '日期 · 地点 · 倒计时', h_group: '介绍 · 链接 · 聚会',
    name: '名字', addr: '网址', addrHint: '小写字母 a–z、数字 0–9 和 -',
    a_ok: '可以用', a_mine: '你的网页，打开它', reopened: '你的网页在这里。', a_taken: '已被使用', a_reserved: '不能用', a_shape: '3 到 30 个字符', a_wait: '检查中…',
    s_words: '名字和介绍', tagline: '名字下面的一句话', about: '介绍',
    s_photos: '照片', cover: '顶部大图', addPhotos: '添加照片', makeCover: '放在顶部', remove: '删除',
    s_contact: '联系方式', phone: '电话', line: 'LINE ID 或 @店铺 ID', whatsapp: 'WhatsApp', facebook: 'Facebook 主页',
    instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', email: '电子邮件', web: '网站',
    s_map: '地图', here: '用我现在的位置', paste: '粘贴 Google 地图链接', pasteGo: '使用链接', photoPin: '用照片拍摄的位置',
    dragHint: '移动地图，让图钉对准你的门口。', address: '地址', country: '国家',
    noMap: '这里没有实时地图。图钉和导航可以用。', noPin: '还没有图钉', pinSet: '已放图钉', clearPin: '删除图钉',
    s_hours: '营业时间', open24: '24 小时营业', closed: '休息', sameAll: '每天一样', note: '备注',
    s_items: '菜单或价格', item: '项目', price: '价格', details: '说明', addItem: '加一行', currency: '货币',
    s_order: '网上点餐', grabfood: 'GrabFood 店铺链接', lineman: 'LINE MAN 店铺链接',
    s_links: '链接', linkText: '按钮上的字', linkUrl: '链接', addLink: '加一个链接',
    s_event: '日期和时间', starts: '开始', ends: '结束',
    s_look: '样式', colour: '颜色', counter: '访问计数器', pageLang: '网页语言',
    addMore: '添加', preview: '预览', edit: '编辑',
    publish: '发布上线', save: '保存', saved: '已保存', saving: '保存中…',
    live: '你的网页已上线', held: '已保存，审核后上线。', draft: '已存为草稿',
    editLink: '你的编辑链接', editHint: '这个链接打开编辑页面。用 LINE 发给自己保存。',
    sendSelf: '用 LINE 发给自己', copy: '复制', copied: '已复制', open: '打开我的网页', sign: '打印店招', share: '分享',
    del: '删除这个网页', delAsk: '永久删除这个网页？',
    e_quota: '今天做太多了，明天再试。', e_refused: '这张照片不能放上网页。', e_net: '没有网络，请再试一次。',
    e_link: '这个编辑链接打不开网页。', e_name: '请换一个网址。', e_coords: '这个链接里没有位置。',
    d_title: '网页', d_all: '全部', d_none: '没有网页。', d_make: '做你自己的网页',
    nf: '这个网址没有网页。', nf_free: '这个网址还空着。', nf_make: '拿来用', nf_draft: '这个网页正在制作中。',
    nf_gone: '这个网页已被撤下。', open_tab: '打开',
  },
}


// sites.motdang.net, 2026-10-13: the drawing, pictures, messages, traffic, Gold.
const V = {
  en: {
    addrBase: 'sites.motdang.net/', heroMake: 'A page for your shop, your food, your work or your party. On your phone, in five minutes.',
    t_edit: 'Page', t_msgs: 'Messages', t_stats: 'Traffic', t_gold: 'Gold',
    s_drawing: 'Drawing', drawingOn: 'Draw my place on the page', drawingHint: 'Drawn from your name, kind and hours, lit by the sun where you are. Pick what it looks like:',
    s_msg: 'Messages', msgOn: 'A message form on the page', notifyEmail: 'Email me a copy of each message', notifyGo: 'Send', notifyWait: 'Open the email we sent and press Confirm.',
    notifyOk: 'Copies go to {e}', notifyOff: 'Stop the copies', notifyNo: 'Email is not sending today. Messages wait here in Messages.',
    pdBtn: 'Free pictures', pdTitle: 'Free pictures', pdHint: 'Public domain and CC0, from Wikimedia Commons, the Cleveland Museum of Art and Openverse. Your page credits each one.',
    pdSearch: 'temple, noodles, elephant, flowers…', pdNone: 'No pictures for that. Try another word, in English.', pdBusy: 'Adding…',
    s_dings: 'Moving drawings', dingsHint: 'Up to six, beside your name. Each one moves when tapped.',
    s_video: 'Video', videoUrl: 'YouTube or Vimeo link',
    s_spots: 'Around here', spotsHint: 'Your favourite places nearby, on your drawn map.', spotAdd: 'Add a place', spotName: 'Name', spotNote: 'Why go',
    spotHere: 'Use where the map is', spotPaste: 'Paste a Maps link',
    goldLock: 'With Gold', goldOpen: 'See Gold',
    m_none: 'No messages yet. When a reader writes, it comes here.', m_read: 'Read', m_unread: 'Mark unread', m_del: 'Delete', m_held: 'Maybe spam', m_reply: 'Reply', m_all: 'Mark all read',
    st_people: 'People', st_views: 'Visits', st_taps: 'Taps', st_machines: 'Machines', st_today: 'Today', st_week: '7 days', st_month: '30 days', st_year: 'A year',
    st_day: 'People a day', st_from: 'Where they came from', st_cc: 'Countries', st_dev: 'Devices', st_hours: 'Hour of day', st_tapsBy: 'What they pressed', st_csv: 'Download CSV',
    st_empty: 'Share your page and visits show up here.', st_direct: 'Typed in or scanned', st_machinesNote: 'Search engines, link previews and other programs, counted apart from people.',
    dev_phone: 'Phone', dev_tablet: 'Tablet', dev_computer: 'Computer',
    g_lead: 'Your page, in gold.', g_price: '฿{p} a year', g_pay: 'Get Gold', g_scan: 'Scan with any Thai bank app. The amount ends in .{s} so we know it is yours.',
    g_slip: 'Send the bank slip', g_wait: 'Slip received. Gold turns on when it is checked.', g_on: 'Gold until {d}', g_thanks: 'Gold is on.', g_nopp: 'PromptPay is not set up yet.',
    g_f1: 'The Gold leaf look', g_f2: 'Your page on Google and other search engines', g_f3: '120 photos and a video', g_f4: 'Around here: your own places on your drawn map',
    g_f5: 'A year of traffic, and a CSV of it', g_f6: 'First in the list of pages, with a gold star', g_free: 'Free', g_freeList: 'Everything else on this page',
  },
  th: {
    addrBase: 'sites.motdang.net/', heroMake: 'เว็บของร้าน ของกิน งานบริการ หรืองานของคุณ ทำบนมือถือ เสร็จในห้านาที',
    t_edit: 'หน้าเว็บ', t_msgs: 'ข้อความ', t_stats: 'คนเข้าชม', t_gold: 'ทอง',
    s_drawing: 'ภาพวาด', drawingOn: 'วาดร้านของฉันบนหน้าเว็บ', drawingHint: 'วาดจากชื่อ ประเภท และเวลาเปิด แสงตามดวงอาทิตย์ที่ร้านคุณ เลือกแบบที่ใช่:',
    s_msg: 'ข้อความ', msgOn: 'มีช่องส่งข้อความบนหน้าเว็บ', notifyEmail: 'ส่งสำเนาข้อความมาที่อีเมลฉัน', notifyGo: 'ส่ง', notifyWait: 'เปิดอีเมลที่เราส่งไป แล้วกด ยืนยัน',
    notifyOk: 'สำเนาส่งไปที่ {e}', notifyOff: 'หยุดส่งสำเนา', notifyNo: 'วันนี้ส่งอีเมลไม่ได้ ข้อความรออยู่ที่แท็บ ข้อความ',
    pdBtn: 'รูปฟรี', pdTitle: 'รูปฟรี', pdHint: 'รูปสาธารณสมบัติและ CC0 จาก Wikimedia Commons, Cleveland Museum of Art และ Openverse หน้าเว็บของคุณใส่เครดิตให้ทุกรูป',
    pdSearch: 'temple, noodles, elephant, flowers…', pdNone: 'ไม่เจอรูป ลองคำอื่นเป็นภาษาอังกฤษ', pdBusy: 'กำลังใส่…',
    s_dings: 'รูปวาดขยับได้', dingsHint: 'ได้ถึงหกรูป ข้างชื่อร้าน แตะแล้วขยับ',
    s_video: 'วิดีโอ', videoUrl: 'ลิงก์ YouTube หรือ Vimeo',
    s_spots: 'แถวนี้', spotsHint: 'ที่โปรดของคุณแถวนี้ บนแผนที่วาดมือของคุณ', spotAdd: 'เพิ่มที่', spotName: 'ชื่อ', spotNote: 'ทำไมต้องไป',
    spotHere: 'ใช้จุดกลางแผนที่', spotPaste: 'วางลิงก์แผนที่',
    goldLock: 'มีในทอง', goldOpen: 'ดูแบบทอง',
    m_none: 'ยังไม่มีข้อความ ลูกค้าเขียนมาเมื่อไหร่ จะมาอยู่ตรงนี้', m_read: 'อ่านแล้ว', m_unread: 'ยังไม่อ่าน', m_del: 'ลบ', m_held: 'อาจเป็นสแปม', m_reply: 'ตอบ', m_all: 'อ่านแล้วทั้งหมด',
    st_people: 'คน', st_views: 'ครั้งที่เข้าชม', st_taps: 'กดปุ่ม', st_machines: 'โปรแกรม', st_today: 'วันนี้', st_week: '7 วัน', st_month: '30 วัน', st_year: 'หนึ่งปี',
    st_day: 'คนต่อวัน', st_from: 'มาจากไหน', st_cc: 'ประเทศ', st_dev: 'เครื่อง', st_hours: 'ชั่วโมงของวัน', st_tapsBy: 'กดอะไรบ้าง', st_csv: 'ดาวน์โหลด CSV',
    st_empty: 'แชร์หน้าเว็บของคุณ แล้วจำนวนคนจะขึ้นตรงนี้', st_direct: 'พิมพ์เองหรือสแกน', st_machinesNote: 'เสิร์ชเอนจิน ตัวแสดงลิงก์ และโปรแกรมอื่น นับแยกจากคน',
    dev_phone: 'มือถือ', dev_tablet: 'แท็บเล็ต', dev_computer: 'คอมพิวเตอร์',
    g_lead: 'หน้าเว็บของคุณ ฉบับทอง', g_price: '฿{p} ต่อปี', g_pay: 'สมัครทอง', g_scan: 'สแกนด้วยแอปธนาคารไหนก็ได้ ยอดลงท้ายด้วย .{s} เพื่อให้รู้ว่าเป็นของคุณ',
    g_slip: 'ส่งสลิป', g_wait: 'ได้รับสลิปแล้ว ทองเปิดเมื่อตรวจเสร็จ', g_on: 'ทองถึง {d}', g_thanks: 'เปิดทองแล้ว', g_nopp: 'ยังไม่ได้ตั้งพร้อมเพย์',
    g_f1: 'แบบทองคำเปลว', g_f2: 'หน้าเว็บขึ้นบน Google และเสิร์ชเอนจินอื่น', g_f3: 'รูป 120 รูปและวิดีโอ', g_f4: 'แถวนี้: ที่ของคุณเองบนแผนที่วาดมือ',
    g_f5: 'สถิติคนเข้าชมหนึ่งปี และไฟล์ CSV', g_f6: 'ขึ้นก่อนในรายชื่อเว็บ มีดาวทอง', g_free: 'ฟรี', g_freeList: 'ทุกอย่างที่เหลือในหน้านี้',
  },
  my: {
    addrBase: 'sites.motdang.net/', heroMake: 'သင့်ဆိုင်၊ အစားအစာ၊ ဝန်ဆောင်မှု သို့မဟုတ် ပွဲအတွက် စာမျက်နှာ။ ဖုန်းဖြင့် ငါးမိနစ်အတွင်း။',
    t_edit: 'စာမျက်နှာ', t_msgs: 'စာများ', t_stats: 'ဝင်ကြည့်သူ', t_gold: 'ရွှေ',
    s_drawing: 'ပုံဆွဲ', drawingOn: 'ကျွန်ုပ်၏နေရာကို ပုံဆွဲပါ', drawingHint: 'အမည်၊ အမျိုးအစားနှင့် ဖွင့်ချိန်မှ ဆွဲသည်။ ပုံစံရွေးပါ:',
    s_msg: 'စာများ', msgOn: 'စာပို့ရန်ပုံစံ', notifyEmail: 'စာတိုင်း၏မိတ္တူကို အီးမေးလ်ဖြင့်ပို့ပါ', notifyGo: 'ပို့ရန်', notifyWait: 'ကျွန်ုပ်တို့ပို့သော အီးမေးလ်ကိုဖွင့်ပြီး Confirm နှိပ်ပါ။',
    notifyOk: 'မိတ္တူများ {e} သို့ ပို့သည်', notifyOff: 'မိတ္တူရပ်ရန်', notifyNo: 'ယနေ့ အီးမေးလ်မပို့နိုင်ပါ။ စာများ ဤနေရာတွင် စောင့်နေသည်။',
    pdBtn: 'အခမဲ့ပုံများ', pdTitle: 'အခမဲ့ပုံများ', pdHint: 'Public domain နှင့် CC0 ပုံများ။ ပုံတိုင်းကို ခရက်ဒစ်ပေးသည်။',
    pdSearch: 'temple, noodles, elephant, flowers…', pdNone: 'ပုံမတွေ့ပါ။ အင်္ဂလိပ်စကားလုံးဖြင့် ထပ်ရှာပါ။', pdBusy: 'ထည့်နေသည်…',
    s_dings: 'လှုပ်ရှားသောပုံများ', dingsHint: 'အမည်ဘေးတွင် ခြောက်ပုံအထိ။',
    s_video: 'ဗီဒီယို', videoUrl: 'YouTube သို့မဟုတ် Vimeo လင့်ခ်',
    s_spots: 'ဤအနီး', spotsHint: 'အနီးရှိ သင်နှစ်သက်သောနေရာများ။', spotAdd: 'နေရာထည့်ရန်', spotName: 'အမည်', spotNote: 'ဘာကြောင့်သွားသင့်လဲ',
    spotHere: 'မြေပုံအလယ်ကိုသုံးရန်', spotPaste: 'မြေပုံလင့်ခ်ထည့်ရန်',
    goldLock: 'ရွှေဖြင့်', goldOpen: 'ရွှေကြည့်ရန်',
    m_none: 'စာမရှိသေးပါ။', m_read: 'ဖတ်ပြီး', m_unread: 'မဖတ်ရသေး', m_del: 'ဖျက်ရန်', m_held: 'စပမ်းဖြစ်နိုင်', m_reply: 'ပြန်ဖြေရန်', m_all: 'အားလုံးဖတ်ပြီး',
    st_people: 'လူ', st_views: 'ဝင်ကြည့်မှု', st_taps: 'နှိပ်မှု', st_machines: 'ပရိုဂရမ်များ', st_today: 'ယနေ့', st_week: '၇ ရက်', st_month: '၃၀ ရက်', st_year: 'တစ်နှစ်',
    st_day: 'တစ်ရက်လျှင် လူ', st_from: 'ဘယ်ကလာလဲ', st_cc: 'နိုင်ငံများ', st_dev: 'စက်များ', st_hours: 'နာရီ', st_tapsBy: 'ဘာနှိပ်လဲ', st_csv: 'CSV ဒေါင်းလုဒ်',
    st_empty: 'စာမျက်နှာကို မျှဝေပါ။', st_direct: 'ရိုက်ထည့် သို့မဟုတ် စကန်', st_machinesNote: 'ရှာဖွေရေးအင်ဂျင်နှင့် အခြားပရိုဂရမ်များ။',
    dev_phone: 'ဖုန်း', dev_tablet: 'တက်ဘလက်', dev_computer: 'ကွန်ပျူတာ',
    g_lead: 'သင့်စာမျက်နှာ ရွှေဖြင့်။', g_price: 'တစ်နှစ် ฿{p}', g_pay: 'ရွှေယူရန်', g_scan: 'ထိုင်းဘဏ်အက်ပ်ဖြင့် စကန်ပါ။ ပမာဏ .{s} ဖြင့်ဆုံးသည်။',
    g_slip: 'ဘဏ်ပြေစာပို့ရန်', g_wait: 'ပြေစာရပြီ။ စစ်ပြီးမှ ရွှေဖွင့်မည်။', g_on: '{d} အထိ ရွှေ', g_thanks: 'ရွှေဖွင့်ပြီ။', g_nopp: 'PromptPay မပြင်ဆင်ရသေးပါ။',
    g_f1: 'ရွှေဆိုင်းပုံစံ', g_f2: 'Google တွင် ပေါ်သည်', g_f3: 'ဓာတ်ပုံ ၄၈ ပုံနှင့် ဗီဒီယို', g_f4: 'ဤအနီး- သင့်နေရာများ မြေပုံပေါ်တွင်',
    g_f5: 'တစ်နှစ်စာ စာရင်းနှင့် CSV', g_f6: 'စာရင်းတွင် ရှေ့ဆုံး၊ ရွှေကြယ်', g_free: 'အခမဲ့', g_freeList: 'ကျန်အားလုံး',
  },
  zh: {
    addrBase: 'sites.motdang.net/', heroMake: '为你的店、美食、手艺或活动做一个网页。用手机，五分钟。',
    t_edit: '网页', t_msgs: '留言', t_stats: '访问', t_gold: '金卡',
    s_drawing: '手绘', drawingOn: '把我的店画在网页上', drawingHint: '按店名、类型和营业时间来画，光线跟着你那里的太阳。选一个样子：',
    s_msg: '留言', msgOn: '网页上放留言框', notifyEmail: '每条留言抄送到我的邮箱', notifyGo: '发送', notifyWait: '打开我们发的邮件，按“确认”。',
    notifyOk: '抄送到 {e}', notifyOff: '停止抄送', notifyNo: '今天邮件发不出去，留言在“留言”里等你。',
    pdBtn: '免费图片', pdTitle: '免费图片', pdHint: '来自 Wikimedia Commons、克利夫兰艺术博物馆和 Openverse 的公有领域与 CC0 图片，网页会为每张图署名。',
    pdSearch: 'temple, noodles, elephant, flowers…', pdNone: '没找到，换个英文词试试。', pdBusy: '正在添加…',
    s_dings: '会动的小画', dingsHint: '名字旁边最多六个，点一下会动。',
    s_video: '视频', videoUrl: 'YouTube 或 Vimeo 链接',
    s_spots: '附近', spotsHint: '你喜欢的附近地方，标在你的手绘地图上。', spotAdd: '加一个地方', spotName: '名字', spotNote: '为什么值得去',
    spotHere: '用地图中心', spotPaste: '粘贴地图链接',
    goldLock: '金卡专享', goldOpen: '看看金卡',
    m_none: '还没有留言。有人写来就会出现在这里。', m_read: '已读', m_unread: '标为未读', m_del: '删除', m_held: '可能是垃圾信息', m_reply: '回复', m_all: '全部已读',
    st_people: '人数', st_views: '访问次数', st_taps: '点击', st_machines: '程序', st_today: '今天', st_week: '7 天', st_month: '30 天', st_year: '一年',
    st_day: '每天人数', st_from: '从哪里来', st_cc: '国家', st_dev: '设备', st_hours: '一天中的时间', st_tapsBy: '点了什么', st_csv: '下载 CSV',
    st_empty: '分享你的网页，访问就会显示在这里。', st_direct: '直接输入或扫码', st_machinesNote: '搜索引擎、链接预览等程序，与人分开统计。',
    dev_phone: '手机', dev_tablet: '平板', dev_computer: '电脑',
    g_lead: '你的网页，金色版。', g_price: '每年 ฿{p}', g_pay: '开通金卡', g_scan: '用任何泰国银行 App 扫码。金额尾数是 .{s}，这样我们知道是你。',
    g_slip: '发送转账凭证', g_wait: '凭证已收到，核对后开通金卡。', g_on: '金卡到 {d}', g_thanks: '金卡已开通。', g_nopp: 'PromptPay 还没设置好。',
    g_f1: '金箔样式', g_f2: '网页能出现在 Google 等搜索引擎', g_f3: '120 张照片和一个视频', g_f4: '附近：你的地方标在手绘地图上',
    g_f5: '一年的访问数据，可下载 CSV', g_f6: '在网页列表里排前面，带金星', g_free: '免费', g_freeList: '本页其他一切',
  },
}

// each table in turn in the maker's language, then each in English (the tables: words for the steps, the
// editor, the pickers, the avatar maker, the logo maker, the doodles, the share card)
const TABLES = [U, V, Z, Y, X, W, A, G, Q, K, N]
TABLES.push(GM) // reading a menu from a photo, receipts (make-words-gold.mjs)
TABLES.push(NL) // edit by LINE (make-words-line.mjs)
TABLES.push(B) // Google profile (make-words-gbp.mjs)
export function ui(lang, k) {
  for (const t of TABLES) if (t[lang] && t[lang][k]) return t[lang][k]
  for (const t of TABLES) if (t.en[k]) return t.en[k]
  return k
}

/** The reader's language from Accept-Language, among the builder's four. */
export function pickLang(header) {
  for (const part of String(header || '').toLowerCase().split(',')) {
    const l = part.trim().slice(0, 2)
    if (UI_LANGS[l]) return l
  }
  return 'th'
}
