// make-words-avatar.mjs — the words of the avatar sheet (avatar-ui.mjs). The names of parts and options,
// the tabs and the ready characters carry their own four languages in avatar.mjs.
// make-words.mjs reads this table after its own; English fills any gap. av_lang is the language of T.

export const A = {
  en: {
    av_lang: 'en', av_open: 'Draw a character', av_title: 'Draw your avatar', av_hint: 'Pick a character, then change anything.',
    av_start: 'Start from', av_shuffle: 'Shuffle', av_undo: 'Undo', av_use: 'Use as my avatar', av_pagecolour: 'Page colour', av_now: 'Now',
  },
  th: {
    av_lang: 'th', av_open: 'วาดตัวการ์ตูน', av_title: 'วาดรูปโปรไฟล์ของคุณ', av_hint: 'เลือกตัวการ์ตูน แล้วแก้ได้ทุกอย่าง',
    av_start: 'เริ่มจาก', av_shuffle: 'สุ่ม', av_undo: 'ย้อนกลับ', av_use: 'ใช้เป็นรูปโปรไฟล์', av_pagecolour: 'สีของเว็บ', av_now: 'ตอนนี้',
  },
  my: {
    av_lang: 'my', av_open: 'ကာတွန်းဇာတ်ကောင် ဆွဲမယ်', av_title: 'သင့်ပရိုဖိုင်ပုံကို ဆွဲပါ', av_hint: 'ဇာတ်ကောင်တစ်ခုရွေးပြီး ကြိုက်သလို ပြင်ပါ။',
    av_start: 'ဒီကစမယ်', av_shuffle: 'ကျပန်း', av_undo: 'နောက်ပြန်', av_use: 'ပရိုဖိုင်ပုံအဖြစ် သုံးမယ်', av_pagecolour: 'စာမျက်နှာအရောင်', av_now: 'လက်ရှိ',
  },
  zh: {
    av_lang: 'zh', av_open: '画一个角色', av_title: '画你的头像', av_hint: '选一个角色，再随意修改。',
    av_start: '从这里开始', av_shuffle: '随机', av_undo: '撤销', av_use: '用作头像', av_pagecolour: '页面颜色', av_now: '当前',
  },
}
