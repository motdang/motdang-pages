// logo.mjs — the logo engine (Nan 2026-10-16: "much more developed", "beat Wix").
//
//   logoDesigns({ name, tagline, kind, accent, look, seed })  → 30 designs at once, no questions
//   drawLogo(ctx, w, h, design, D)       one design, centred in a box, clear ground allowed
//   drawSquare(ctx, size, design, D)     the profile picture: the logo on its ground
//   drawCover(ctx, w, h, design, D)      the page's cover: the logo large on a ground of its own
//
// A design is plain data (words, an icon, a face, five colours, a layout and its variant), so it
// can be kept, edited and drawn again. Layouts live in logo-layouts.mjs; the icons are the house
// dingbats (window.Dingbats), never emoji.

import { DINGBATS } from './db/names.mjs'
import { FONTS, FONT_KEYS, nameFont, smallFont, loadFonts, fontEpoch } from './logo-fonts.mjs'
import { paletteFrom, readable, contrast, mix, isHex, lum } from './logo-color.mjs'
import { hasThai, arcSafe, initials } from './logo-text.mjs'
import { rng, scaleOf } from './logo-art.mjs'
import { BASIC } from './logo-layouts.mjs'
import { CULTURE, coverGround } from './logo-culture.mjs'

// a badge sets its name round a curve; a name in a script that cannot go round one gets the straight-banner disc instead
const LAYOUTS = { ...BASIC, ...CULTURE, badge: (d, E) => (arcSafe(E.name(true)) && arcSafe(E.small()) ? BASIC.badge(d, E) : CULTURE.poster(d, E)) }

export { FONTS, FONT_KEYS, loadFonts, initials }

// ---- colours --------------------------------------------------------------------------------

/** main, deep (text on light), light (paper), accent, accent2 */
export const PALS = {
  chili: { main: '#d7261e', deep: '#2a0f0d', light: '#fff4e6', accent: '#ffb000', accent2: '#ff8a3d' },
  lacquer: { main: '#9c1c22', deep: '#3a0a0e', light: '#fff3dc', accent: '#e2b03a', accent2: '#f8dd8e' },
  night: { main: '#ff4fa3', deep: '#0b0d26', light: '#fdf6ff', accent: '#7df9ff', accent2: '#ffd76a' },
  akha: { main: '#23287a', deep: '#14173f', light: '#fffaf0', accent: '#ff2e88', accent2: '#ffd400' },
  loom: { main: '#3aa197', deep: '#1f150e', light: '#f6ead5', accent: '#e0a83e', accent2: '#c24a82' },
  jade: { main: '#1f7a5a', deep: '#0d2a22', light: '#eef7ee', accent: '#f2c14e', accent2: '#e8826b' },
  indigo: { main: '#1f3a5f', deep: '#0f1d33', light: '#f3efe6', accent: '#e2a33b', accent2: '#b6523a' },
  mango: { main: '#f59e0b', deep: '#2a1a06', light: '#fff8e6', accent: '#16794c', accent2: '#e2412e' },
  lotus: { main: '#d94f8c', deep: '#3b1030', light: '#fff1f6', accent: '#f6c445', accent2: '#3f8f6b' },
  ink: { main: '#1c1530', deep: '#0e0a1c', light: '#fff7ec', accent: '#d7261e', accent2: '#ffb000' },
  teak: { main: '#8a5a2b', deep: '#2b1b0e', light: '#f8efe0', accent: '#c9952f', accent2: '#3a7d6e' },
  sky: { main: '#2563eb', deep: '#0e1a3b', light: '#f3f7ff', accent: '#ffb000', accent2: '#ef476f' },
  matcha: { main: '#5f7f2a', deep: '#1d2a10', light: '#f6f8ea', accent: '#e2733b', accent2: '#f0c75e' },
  plum: { main: '#6b2d6e', deep: '#260f2a', light: '#fbf2ff', accent: '#e7b84a', accent2: '#ff6f91' },
  sunset: { main: '#ff5a1f', deep: '#2a0f0a', light: '#fff3e8', accent: '#ffd23f', accent2: '#7a1f5c' },
  gold: { main: '#1a140a', deep: '#0c0a07', light: '#f6e7c1', accent: '#e7b84a', accent2: '#fff0c0' },
  mono: { main: '#111827', deep: '#05070d', light: '#ffffff', accent: '#ffb000', accent2: '#d7261e' },
}
const LOOK_PAL = { poster: 'sunset', loom: 'loom', stitch: 'akha', night: 'night', lanna: 'lacquer', clean: 'sky', gold: 'gold' }
// the curated palettes that suit a kind, best first
const KIND_PALS = {
  food: ['chili', 'mango', 'jade', 'sunset', 'lotus', 'teak'],
  shop: ['lotus', 'indigo', 'mango', 'jade', 'plum', 'sky'],
  service: ['jade', 'lotus', 'teak', 'plum', 'indigo', 'matcha'],
  work: ['ink', 'indigo', 'sky', 'plum', 'mono', 'teak'],
  stay: ['teak', 'jade', 'indigo', 'matcha', 'lacquer', 'sky'],
  homes: ['indigo', 'teak', 'sky', 'jade', 'ink', 'matcha'],
  me: ['lotus', 'plum', 'sunset', 'sky', 'ink', 'jade'],
  event: ['night', 'sunset', 'lotus', 'plum', 'mango', 'sky'],
  group: ['sky', 'mango', 'jade', 'chili', 'akha', 'matcha'],
}

export const PAL_LIST = Object.keys(PALS)

/** Five colours from a main (and optionally an accent), with the text colours worked out. */
export const palFromMain = (main, accent) => paletteFrom(main, accent)

// ---- icons ----------------------------------------------------------------------------------

// the house dingbats that suit each kind, best first (names checked against db/names.mjs)
const KIND_ICONS = {
  food: ['noodles', 'khao-soi', 'chili', 'coffee', 'cha-yen', 'som-tam', 'mango-rice', 'bubble-tea', 'bread', 'cake', 'dumplings', 'sai-oua', 'ice-cream', 'teapot', 'pot', 'frying-pan', 'egg', 'burger', 'pizza', 'cocktail', 'beer', 'coconut', 'lemon', 'honey'],
  shop: ['cart', 'gift', 'kratip', 'ngob', 'bo-sang', 'lantern', 'heart', 'star', 'diamond', 'scissors', 'camera', 'kite', 'bookmark', 'flower', 'crown', 'abacus', 'coin', 'bee', 'cat'],
  service: ['lotus', 'wai', 'frangipani', 'leaf', 'scissors', 'sparkle', 'heart', 'wave', 'gear', 'key', 'lightbulb', 'sun', 'muscle', 'tuk-tuk', 'scooter', 'songthaew', 'compass', 'telephone', 'wind-chime'],
  work: ['nib', 'pencil', 'camera', 'lightbulb', 'compass', 'typewriter', 'gears', 'telescope', 'rocket', 'mic', 'note', 'abacus', 'atom', 'megaphone', 'eye', 'chat', 'key'],
  stay: ['spirit-house', 'home', 'lantern', 'moon', 'lotus', 'chedi', 'sun', 'tree', 'frangipani', 'krathong', 'sunflower', 'bo-sang', 'wind-chime', 'elephant', 'turtle', 'key'],
  homes: ['home', 'spirit-house', 'tree', 'key', 'lighthouse', 'compass', 'pin', 'diamond', 'chedi', 'sun', 'flag'],
  me: ['star', 'sparkle', 'heart', 'flower', 'smile', 'wave', 'nib', 'pencil', 'camera', 'note', 'cat', 'butterfly', 'owl', 'moon', 'rainbow', 'peace', 'wai', 'lotus'],
  event: ['lantern', 'krathong', 'party', 'balloon', 'songkran', 'sparkle', 'star', 'note', 'cake', 'gift', 'megaphone', 'music-box', 'clap', 'cocktail', 'rocket'],
  group: ['wai', 'heart', 'peace', 'clap', 'link', 'chat', 'flag', 'crown', 'tree', 'rock-on', 'muscle', 'fist', 'share', 'compass', 'scooter', 'elephant'],
  amulet: ['chedi', 'lotus', 'krathong', 'naga', 'elephant', 'wai', 'coin', 'sun', 'moon', 'frangipani', 'lantern'],
}

// words in a name or tagline that point at a dingbat (Thai and English), tried in order
const ICON_WORDS = [
  [/ข้าวซอย|khao ?soi/i, ['khao-soi', 'noodles']],
  [/ก๋วยเตี๋ยว|เส้น|บะหมี่|ราเมน|noodle|ramen|\bpho\b|pad ?thai/i, ['noodles', 'khao-soi']],
  [/ส้มตำ|som ?tam|papaya/i, ['som-tam']],
  [/ข้าวเหนียว|มะม่วง|sticky|mango/i, ['mango-rice']],
  [/ไส้อั่ว|sai ?oua|sausage/i, ['sai-oua']],
  [/กาแฟ|คาเฟ่|coffee|cafe|café|espresso|latte|roast|barista/i, ['coffee', 'teapot', 'kettle']],
  [/ชานม|ไข่มุก|bubble|boba/i, ['bubble-tea']],
  [/ชาเย็น|ชา|\btea\b|matcha|มัทฉะ/i, ['cha-yen', 'teapot']],
  [/ขนมปัง|เบเกอรี่|bakery|bread|toast/i, ['bread', 'croissant']],
  [/เค้ก|ขนม|cake|dessert|pastry/i, ['cake', 'donut']],
  [/ไอศกรีม|ไอติม|ice ?cream|gelato/i, ['ice-cream']],
  [/พิซซ่า|pizza/i, ['pizza']],
  [/เบอร์เกอร์|burger/i, ['burger']],
  [/ติ่มซำ|เกี๊ยว|ซาลาเปา|dumpling|dim ?sum/i, ['dumplings']],
  [/ย่าง|หมูกระทะ|bbq|grill|steak|ปิ้ง/i, ['frying-pan', 'pot']],
  [/ต้ม|แกง|ซุป|หม้อ|curry|soup|hot ?pot|stew/i, ['pot', 'khao-soi']],
  [/ไข่|\begg/i, ['egg']],
  [/ค็อกเทล|บาร์|cocktail|\bbar\b/i, ['cocktail', 'beer']],
  [/เบียร์|brew|beer|craft/i, ['beer']],
  [/ไวน์|wine/i, ['wine']],
  [/น้ำผลไม้|เลมอน|juice|smoothie|lemon|lime/i, ['lemon', 'coconut']],
  [/มะพร้าว|coconut/i, ['coconut']],
  [/ทุเรียน|durian/i, ['durian']],
  [/มังคุด|mangosteen/i, ['mangosteen']],
  [/น้ำผึ้ง|ผึ้ง|honey|\bbee/i, ['honey', 'bee']],
  [/ข้าว|rice|restaurant|ร้านอาหาร|kitchen|ครัว|eat|food|อาหาร/i, ['noodles', 'pot']],
  [/นวด|สปา|อโรม่า|massage|\bspa\b|aroma|wellness/i, ['lotus', 'wai', 'frangipani']],
  [/ตัดผม|ซาลอน|ทำผม|เล็บ|hair|salon|barber|nail|beauty|สวย/i, ['scissors', 'sparkle']],
  [/ตัดเสื้อ|ผ้า|ทอ|เสื้อ|tailor|textile|weav|woven|loom|cotton|silk|linen|cloth|fashion|batik/i, ['scissors', 'kratip']],
  [/เกสต์เฮาส์|โรงแรม|รีสอร์ท|โฮมสเตย์|ที่พัก|บังกะโล|วิลล่า|guest ?house|hotel|resort|hostel|homestay|home ?stay|bungalow|villa|\binn\b|\bstay\b|lodge/i, ['spirit-house', 'home', 'lantern']],
  [/วัด|พระ|amulet|temple|buddha|เครื่องราง|ศักดิ์สิทธิ์/i, ['chedi', 'lotus']],
  [/บ้าน|ที่ดิน|คอนโด|real ?estate|property|house|condo|\bland\b|homes/i, ['home', 'key']],
  [/ถ่ายภาพ|ช่างภาพ|สตูดิโอ|photo|camera|studio|film/i, ['camera']],
  [/เพลง|ดนตรี|กีตาร์|music|band|guitar|\bdj\b|sound/i, ['note', 'music-box']],
  [/หนังสือ|นักเขียน|book|write|writer|blog|story|poem/i, ['nib', 'pencil', 'typewriter']],
  [/ดอกไม้|สวน|ต้นไม้|flower|florist|garden|plant|nursery|bloom/i, ['flower', 'sunflower', 'sprout']],
  [/แมว|สัตว์เลี้ยง|หมา|cat\b|pet\b|pets|dog|vet\b/i, ['cat', 'soi-dog']],
  [/ช้าง|elephant/i, ['elephant']],
  [/มอเตอร์ไซค์|รถเช่า|เช่า|bike|cycle|scooter|motorbike|rental|rent\b/i, ['scooter', 'tuk-tuk']],
  [/ทัวร์|เที่ยว|เดินป่า|tour|travel|trek|adventure|guide/i, ['compass', 'songthaew', 'elephant']],
  [/ของฝาก|ของที่ระลึก|งานฝีมือ|แฮนด์เมด|gift|souvenir|handmade|craft|artisan/i, ['gift', 'kratip', 'ngob']],
  [/โคม|ลอยกระทง|เทศกาล|lantern|festival|krathong/i, ['lantern', 'krathong']],
  [/สงกรานต์|songkran/i, ['songkran']],
  [/งานเลี้ยง|แต่งงาน|ปาร์ตี้|party|event|wedding|celebrat/i, ['party', 'balloon', 'heart']],
  [/โยคะ|ฟิตเนส|มวย|กีฬา|วิ่ง|yoga|fitness|gym|muay|sport|\brun|runners/i, ['muscle', 'fist', 'scooter']],
  [/โรงเรียน|สอน|เรียน|เวิร์กชอป|school|tutor|class|workshop|learn/i, ['lightbulb', 'pencil']],
  [/ซ่อม|อู่|ช่าง|repair|fix|garage|tools|mechanic/i, ['gears', 'gear', 'key']],
  [/ตลาด|ร้าน|market|shop|store|mart/i, ['cart', 'kratip']],
  [/ชุมชน|กลุ่ม|ทีม|community|group|club|team|crew/i, ['wai', 'heart', 'link']],
]

/** Dingbat names the name points at, then the tagline, best first. `top` counts those from the first rule that matched. */
export function iconsFromText(name, tagline = '') {
  const out = []
  let top = 0, seen = false
  for (const part of [String(name || ''), String(tagline || '')]) {
    for (const [re, names] of ICON_WORDS) {
      if (!re.test(part)) continue
      let added = 0
      for (const n of names) if (DINGBATS[n] && !out.includes(n)) { out.push(n); added++ }
      if (!seen && added) { top = added; seen = true }
    }
  }
  out.top = top
  return out
}

/** The dingbat names that suit a kind (and the words of a name, if given), best first. */
export function iconsFor(kind, name = '', tagline = '') {
  const own = iconsFromText(name, tagline)
  const list = (KIND_ICONS[kind] || KIND_ICONS.shop).filter((n) => DINGBATS[n])
  const out = [...own, ...list.filter((n) => !own.includes(n))]
  out.top = own.top
  return out
}
/** The dingbat families a kind's suggestions come from. */
export const familiesFor = (kind, name = '', tagline = '') => [...new Set(iconsFor(kind, name, tagline).map((n) => DINGBATS[n]))]

const gbox = new Map()
/** The ink box of a glyph in units of its size from its drawing origin: { x0, y0, x1, y1 } or null. */
export function glyphBox(D, name) {
  if (!D || !name) return null
  if (gbox.has(name)) return gbox.get(name)
  if (D.has && !D.has(name)) return null
  let out = null
  try {
    const sz = 110, m = Math.round(sz * 0.4)
    const probe = document.createElement('canvas')
    const info = D.info ? D.info(name) : null
    const ratio = info?.ratio || 1
    probe.width = Math.ceil(ratio * sz + m * 2); probe.height = sz + m * 2
    const c = probe.getContext('2d', { willReadFrequently: true })
    D.draw(c, name, { size: sz, x: m, y: m, look: 'mono', ink: '#000000', px: sz })
    const { data, width, height } = c.getImageData(0, 0, probe.width, probe.height)
    let x0 = width, y0 = height, x1 = -1, y1 = -1
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 >= 0) out = { x0: (x0 - m) / sz, y0: (y0 - m) / sz, x1: (x1 + 1 - m) / sz, y1: (y1 + 1 - m) / sz }
  } catch { out = null }
  if (out) gbox.set(name, out)
  return out
}

/** Draw a dingbat so its ink fits a box (bw × bh) centred on (cx, cy). */
export function drawGlyph(ctx, D, name, cx, cy, bw, bh, st = {}) {
  const b = glyphBox(D, name)
  if (!b) return 0
  const gw = b.x1 - b.x0, gh = b.y1 - b.y0
  const s = Math.min(bw / gw, bh / gh)
  const k = scaleOf(ctx)
  D.draw(ctx, name, { weight: 1.2, ...st, size: s, x: cx - (b.x0 + gw / 2) * s, y: cy - (b.y0 + gh / 2) * s, px: s * k, dpr: k })
  return s
}

// glyphs whose hatching turns to noise in one colour: they are drawn in colour with the same outline instead
const MONO_POOR = new Set(['chili', 'egg', 'lemon', 'salt', 'donut', 'frying-pan', 'cheese', 'avocado', 'durian', 'mangosteen', 'coconut', 'honey', 'toast', 'bread', 'sai-oua', 'popcorn', 'kratip', 'ngob', 'dice', 'coin', 'top', 'magnet', 'sleepy', 'mushroom', 'owl', 'frog', 'cat', 'hedgehog', 'soi-dog', 'gecko', 'buffalo', 'rooster', 'moon', 'earth', 'ladybug', 'cactus', 'snail'])

// ---- roles ----------------------------------------------------------------------------------

/** The colours a layout draws with, from the five of the palette and light or dark ground. */
export function roles(d) {
  const p = d.pal
  const inv = !!d.inv
  const ground = inv ? p.deep : p.light
  let panel = p.main
  if (contrast(panel, ground) < 1.8) panel = contrast(p.accent, ground) >= 1.8 ? p.accent : inv ? p.light : p.deep
  const onPanel = readable(panel, [p.light, '#ffffff', p.deep], 4.5)
  let edge = p.accent
  if (contrast(edge, panel) < 1.7) edge = readable(panel, [p.accent2, p.light], 1.7)
  let edge2 = p.accent2
  if (contrast(edge2, panel) < 1.5) edge2 = onPanel
  const text = inv ? p.light : p.deep
  let brand = inv ? p.accent : p.main
  if (contrast(brand, ground) < 3) brand = text
  const dark = lum(ground) < 0.2
  return { panel, onPanel, edge, edge2, ground, text, brand, dark, ...p, inv }
}

// ---- recipes --------------------------------------------------------------------------------
// layout, variant, the faces it may take (first is the default), a palette token, inverse or not,
// icon style, capitals, and how well it suits a kind. Order here is not order shown.
//   pal: 'a' the page's accent, 'a2' the accent reversed, 'look' the page look's palette,
//        'k' a curated palette for the kind, or a PALS name

const R = (id, layout, v, fonts, pal, o = {}) => ({ id, layout, v, fonts, pal, inv: false, icon: 'auto', caps: 'auto', aff: {}, ...o })
export const RECIPES = [
  R('badge-solid', 'badge', 0, ['kanit', 'mitr', 'prompt'], 'a', { aff: { food: 3, shop: 2, group: 3, event: 2, stay: 1 } }),
  R('badge-ring', 'badge', 1, ['trirong', 'fahkwang', 'chonburi'], 'k', { icon: 'ink', aff: { food: 2, stay: 3, shop: 2, homes: 2, me: 1 } }),
  R('badge-seal', 'badge', 2, ['chonburi', 'srisakdi', 'trirong'], 'indigo', { aff: { stay: 2, work: 2, homes: 2, group: 2, event: 1 } }),
  R('chop-solid', 'chop', 0, ['kanit', 'chonburi', 'prompt'], 'chili', { aff: { food: 3, shop: 2, service: 2, stay: 1, me: 1 } }),
  R('chop-stamp', 'chop', 1, ['srisakdi', 'kanit', 'mitr'], 'k', { aff: { food: 2, shop: 3, me: 2, service: 1 } }),
  R('chop-split', 'chop', 2, ['kanit', 'mitr', 'chakra'], 'indigo', { aff: { work: 2, shop: 2, homes: 1, group: 2 } }),
  R('neon-sign', 'neon', 0, ['pattaya', 'mitr', 'sriracha'], 'night', { inv: true, aff: { food: 3, event: 3, me: 2, group: 1 } }),
  R('neon-frame', 'neon', 1, ['mitr', 'pattaya', 'kanit'], 'night', { inv: true, aff: { food: 2, event: 3, shop: 1, group: 1 } }),
  R('lanna-frame', 'lanna', 0, ['chonburi', 'srisakdi', 'trirong'], 'lacquer', { aff: { stay: 3, service: 3, food: 1, shop: 2, event: 1, homes: 1 }, looks: { lanna: 3, gold: 1 } }),
  R('lanna-gable', 'lanna', 1, ['srisakdi', 'chonburi', 'fahkwang'], 'lacquer', { inv: true, aff: { stay: 3, service: 2, homes: 1, event: 1 }, looks: { lanna: 3, gold: 3 } }),
  R('stitch-band', 'stitch', 0, ['sriracha', 'mali', 'prompt'], 'akha', { aff: { shop: 3, group: 3, me: 2, event: 1, service: 1 }, looks: { stitch: 3 } }),
  R('stitch-tag', 'stitch', 1, ['sriracha', 'mali', 'itim'], 'akha', { aff: { shop: 2, me: 3, group: 3, event: 2 }, looks: { stitch: 3 } }),
  R('woven-label', 'woven', 0, ['chonburi', 'trirong', 'srisakdi'], 'loom', { inv: true, aff: { shop: 3, service: 2, stay: 1, me: 1 }, looks: { loom: 3 } }),
  R('poster-sun', 'poster', 0, ['kanit', 'prompt', 'chakra'], 'sunset', { aff: { event: 3, food: 2, group: 3, shop: 1 }, looks: { poster: 3 } }),
  R('tag-price', 'tag', 0, ['itim', 'mali', 'sriracha'], 'a', { aff: { shop: 3, me: 2, food: 1, event: 1 } }),
  R('stack-plain', 'stacked', 0, ['prompt', 'kanit', 'mitr'], 'a', { icon: 'ink', aff: { food: 2, shop: 2, service: 2, stay: 1, homes: 1, me: 1, group: 1 }, looks: { clean: 2 } }),
  R('stack-frame', 'stacked', 1, ['trirong', 'fahkwang', 'chonburi'], 'k', { icon: 'mono', aff: { stay: 3, shop: 2, homes: 3, work: 1, food: 1 } }),
  R('stack-arch', 'stacked', 2, ['mitr', 'kanit', 'mali'], 'k', { icon: 'mono', aff: { stay: 2, service: 3, shop: 2, food: 1, me: 1 } }),
  R('stack-strip', 'stacked', 3, ['kanit', 'chakra', 'prompt'], 'a', { icon: 'ink', aff: { shop: 2, food: 2, group: 2, event: 1 } }),
  R('inline-plain', 'inline', 0, ['kanit', 'prompt', 'mitr'], 'a', { icon: 'ink', aff: { food: 2, work: 2, shop: 2, service: 2, homes: 1 }, looks: { clean: 2 } }),
  R('inline-disc', 'inline', 1, ['mitr', 'mali', 'kanit'], 'k', { icon: 'mono', aff: { service: 3, food: 1, shop: 1, me: 1, group: 1 } }),
  R('inline-pill', 'inline', 2, ['mali', 'itim', 'mitr'], 'a2', { icon: 'mono', aff: { food: 2, shop: 2, me: 2, event: 1, group: 2 } }),
  R('inline-rule', 'inline', 3, ['chakra', 'fahkwang', 'prompt'], 'ink', { icon: 'mono', aff: { work: 3, homes: 2, service: 1, shop: 1 }, looks: { clean: 2 } }),
  R('mono-circle', 'mono', 0, ['srisakdi', 'trirong', 'chonburi'], 'k', { aff: { work: 3, me: 3, service: 2, homes: 2, stay: 1 } }),
  R('mono-shield', 'mono', 1, ['trirong', 'chonburi', 'fahkwang'], 'indigo', { aff: { work: 3, homes: 3, group: 2, stay: 1 } }),
  R('mono-hex', 'mono', 2, ['kanit', 'chakra', 'mitr'], 'a', { aff: { work: 2, group: 2, shop: 1, me: 1, homes: 1 } }),
  R('word-swash', 'wordmark', 0, ['pattaya', 'charm', 'sriracha'], 'a', { aff: { me: 3, food: 2, service: 2, shop: 1, work: 1 } }),
  R('word-rules', 'wordmark', 1, ['fahkwang', 'trirong', 'chakra'], 'ink', { aff: { work: 3, homes: 2, stay: 2, shop: 1, me: 1 }, looks: { clean: 3, gold: 2 } }),
  R('word-ornament', 'wordmark', 2, ['charm', 'srisakdi', 'trirong'], 'k', { aff: { stay: 3, food: 1, service: 2, me: 2, event: 1 } }),
  R('word-bar', 'wordmark', 3, ['kanit', 'mitr', 'chakra'], 'a', { aff: { work: 2, shop: 2, group: 2, event: 2, homes: 1 }, looks: { poster: 2 } }),
  R('ribbon-circle', 'ribbon', 0, ['mitr', 'kanit', 'mali'], 'a', { icon: 'ink', aff: { food: 3, shop: 2, group: 2, event: 2, stay: 1 } }),
  R('ribbon-shield', 'ribbon', 1, ['chonburi', 'trirong', 'srisakdi'], 'k', { icon: 'ink', aff: { stay: 2, work: 2, homes: 2, group: 1, food: 1 } }),
]

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length]

function resolvePal(token, o, i, seed) {
  const accent = isHex(o.accent) ? o.accent : '#d7261e'
  const byKind = KIND_PALS[o.kind] || KIND_PALS.shop
  if (PALS[token]) return { ...PALS[token] }
  if (token === 'a') return paletteFrom(accent)
  if (token === 'a2') { const p = paletteFrom(accent); return { ...p, main: p.accent, accent: accent, accent2: p.accent2 } }
  if (token === 'look') return { ...PALS[LOOK_PAL[o.look] || 'ink'] }
  if (token === 'k') return { ...PALS[pick(byKind, i + seed)] }
  return paletteFrom(accent)
}

/** A face that suits the script of the name: faces with poor Latin shapes are skipped for Latin names. */
function usableFont(fonts, name, i) {
  const latin = /[A-Za-z]/.test(name)
  const ok = fonts.filter((k) => !(latin && FONTS[k].latin === false))
  return (ok.length ? ok : fonts)[i % (ok.length || fonts.length)]
}

/** The design a recipe makes for these words: fills fonts, palette, icon from the seed. */
export function designFrom(recipe, o, i = 0, icon = '', seed = 0) {
  const r = seed ? rng(seed * 977 + i * 131 + 7) : null
  const font = usableFont(recipe.fonts, o.name, r ? Math.floor(r() * recipe.fonts.length) : 0)
  let token = recipe.pal
  if (r && (token === 'a' || token === 'k') && r() < 0.5) token = r() < 0.5 ? 'a2' : 'k'
  const pal = resolvePal(token, o, i, seed)
  const inv = r && !['neon', 'lanna', 'woven'].includes(recipe.layout) ? (r() < 0.22 ? !recipe.inv : recipe.inv) : recipe.inv
  return {
    id: recipe.id, layout: recipe.layout, v: recipe.v,
    name: o.name, tagline: o.tagline || '', small: o.small || '',
    icon: o.icon === undefined ? icon : o.icon, iconLook: recipe.icon, font, pal, inv, caps: recipe.caps, track: 0, seed: seed + i,
  }
}

/** Order recipes for a kind and look: best matches first, layouts alternating. */
function rank(o, seed) {
  const jitter = rng(seed * 31 + 5)
  const score = (r) => (r.aff[o.kind] || 0) * 2 + (r.looks?.[o.look] || 0) * 2.5 + (seed ? jitter() * 3 : jitter() * 0.6)
  const pool = RECIPES.map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s)
  const out = []
  let lastLayout = ''
  while (pool.length) {
    let i = pool.findIndex((x) => x.r.layout !== lastLayout)
    if (i < 0) i = 0
    const [x] = pool.splice(i, 1)
    out.push(x.r); lastLayout = x.r.layout
  }
  return out
}

/**
 * At least 24 varied designs, at once. seed 0 is the first showing; any other seed re-deals the
 * faces, colours and icons of the same layouts.
 */
export function logoDesigns({ name = '', tagline = '', small = '', kind = 'shop', accent = '#d7261e', look = 'poster', seed = 0, icon } = {}) {
  const o = { name: String(name || '').trim() || 'Mot Dang', tagline: String(tagline || '').trim(), small: String(small || '').trim(), kind: KIND_ICONS[kind] ? kind : 'shop', accent, look, icon }
  const icons = iconsFor(o.kind, o.name, o.tagline)
  const core = icons.top ? Math.max(2, Math.min(icons.top, 3)) : 3
  const rest = Math.max(1, icons.length - core)
  const rnd = rng(seed * 53 + 3)
  let n = 0
  return rank(o, seed).map((r, i) => {
    let ic = ''
    if (!['wordmark', 'mono'].includes(r.layout)) {
      const far = n % 4 === 3
      const off = seed ? Math.floor(rnd() * 7) : 0
      ic = far ? icons[core + ((((n / 4) | 0) + off) % rest)] : icons[(n + off) % core]
      n++
    }
    return designFrom(r, o, i, ic || icons[0], seed)
  })
}

/** A design's words and look changed to another recipe's layout; keeps the maker's own choices. */
export function applyRecipe(d, recipe, o = {}) {
  const next = { ...d, id: recipe.id, layout: recipe.layout, v: recipe.v }
  if (!d.mine?.font) next.font = usableFont(recipe.fonts, d.name, 0)
  if (!d.mine?.pal) { next.pal = resolvePal(recipe.pal, { kind: o.kind, accent: o.accent, look: o.look }, 0, 0); next.inv = recipe.inv }
  if (!d.mine?.iconLook) next.iconLook = recipe.icon
  return next
}

// ---- drawing --------------------------------------------------------------------------------

let mctx
const measureCtx = () => mctx || (mctx = document.createElement('canvas').getContext('2d'))
const plans = new Map()

function env(d, D, ar) {
  const ctx = measureCtx()
  const R_ = roles(d)
  const f = FONTS[d.font] || FONTS.prompt
  const th = hasThai(d.name)
  const upperOk = f.caps && !th
  return {
    ctx, D, R: R_, ar: ar || 1,
    nf: nameFont(d.font), tf: smallFont(d.font), pf: smallFont('prompt'),
    face: f,
    /** The name as set: capitals when the face and the script allow it and the layout asks (or the maker did). */
    name: (prefUpper) => (d.caps === 'upper' ? d.name.toLocaleUpperCase('en') : d.caps === 'none' ? d.name : prefUpper && upperOk ? d.name.toLocaleUpperCase('en') : d.name),
    /** Tagline and the small line, one string. */
    small: () => [d.tagline, d.small].filter(Boolean).join(' · '),
    mono: initials(d.name),
    glyph: (n) => glyphBox(D, n),
    icon: (c, n, cx, cy, bw, bh, st = {}) => (D && n ? drawGlyph(c, D, n, cx, cy, bw, bh, st.look === 'mono' && MONO_POOR.has(n) ? { ...st, look: 'ink' } : st) : 0),
    hasIcon: !!(D && d.icon && glyphBox(D, d.icon)),
  }
}

/** Layout a design for a box of aspect ar (w/h): the plan holds its natural size and a draw function. */
export function planOf(d, D, ar = 1) {
  const key = JSON.stringify([d.layout, d.v, d.name, d.tagline, d.small, d.icon, d.iconLook, d.font, d.caps, d.track, d.pal, d.inv, d.seed, !!D, fontEpoch(), Math.round(ar * 4)])
  let p = plans.get(key)
  if (p) return p
  const lay = LAYOUTS[d.layout] || LAYOUTS.stacked
  const E = env(d, D, ar)
  p = lay(d, E)
  if (plans.size > 300) plans.clear()
  plans.set(key, p)
  return p
}

/** Draw a design centred in w × h with a margin (fraction of the smaller side). The ground is left clear. */
export function drawLogo(ctx, w, h, d, D, o = {}) {
  const pad = o.pad ?? 0.07
  const plan = planOf(d, D, o.ar ?? d.ar ?? 1)
  const s = Math.min((w * (1 - 2 * pad)) / plan.w, (h * (1 - 2 * pad)) / plan.h)
  const ox = (w - plan.w * s) / 2, oy = (h - plan.h * s) / 2
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(s, s)
  const k = scaleOf(ctx)
  plan.draw(ctx, { k, hair: (n) => Math.max(n, 1.25 / k), D })
  ctx.restore()
  return { w: plan.w * s, h: plan.h * s, x: ox, y: oy, s }
}

/** The ground colour a design sits on: its own, white, dark, or none (clear). */
export function groundOf(d) {
  const m = d.bg || 'auto'
  if (m === 'clear') return ''
  if (m === 'light') return '#ffffff'
  if (m === 'dark') return d.pal.deep
  return roles(d).ground
}

/** The profile picture: a square, the logo on its ground. */
export function drawSquare(ctx, size, d, D, o = {}) {
  ctx.save()
  if (o.round) { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip() }
  const g = groundOf(d)
  if (g) { ctx.fillStyle = g; ctx.fillRect(0, 0, size, size) }
  drawLogo(ctx, size, size, d, D, { pad: o.pad ?? 0.08 })
  ctx.restore()
}


/** The cover: a ground of the design's own, the logo large in the middle. */
export function drawCover(ctx, w, h, d, D) {
  coverGround(ctx, w, h, d, D, roles(d))
  drawLogo(ctx, w, h, d, D, { pad: 0.14 })
}

// ---- pictures to keep -------------------------------------------------------------------------

const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c }

/** The logo alone on a clear ground, in its own proportions, long side as given. */
export function logoCanvas(d, D, long = 2000, o = {}) {
  const plan = planOf(d, D, o.ar ?? d.ar ?? 1)
  const r = plan.w / plan.h
  const c = canvasOf(r >= 1 ? long : long * r, r >= 1 ? long / r : long)
  drawLogo(c.getContext('2d'), c.width, c.height, d, D, { pad: o.pad ?? 0.02, ar: o.ar })
  return c
}

/** The profile picture, square, on the design's ground. */
export function squareCanvas(d, D, size = 640, o = {}) {
  const c = canvasOf(size, size)
  drawSquare(c.getContext('2d'), size, d, D, o)
  return c
}

/** The page cover, 1600 × 900 as asked. */
export function coverCanvas(d, D, w = 1600, h = 900) {
  const c = canvasOf(w, h)
  drawCover(c.getContext('2d'), w, h, d, D)
  return c
}

/** A file name from the words of the name; Thai and other scripts fall back to "logo". */
export function slug(name) {
  const s = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'logo'
}

/** Everything the mock-ups and the downloads draw from. */
export function renderPack(d, D) {
  const R_ = roles(d)
  return {
    d, R: R_, ground: groundOf(d), name: d.name, tag: d.tagline || d.small || '', slug: slug(d.name),
    nat: logoCanvas(d, D, 900, { pad: 0.02 }),
    wide: logoCanvas(d, D, 1200, { pad: 0.02, ar: 2.4 }),
    sq: squareCanvas(d, D, 640),
    cov: coverCanvas(d, D, 1600, 900),
  }
}
