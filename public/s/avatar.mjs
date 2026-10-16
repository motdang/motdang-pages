// avatar.mjs — a drawn character for a maker with no picture (Nan 2026-10-16: "the avatar builder
// should be much more developed"). Pure functions: options in, SVG text out. Nothing here touches
// the DOM; avatar-ui.mjs makes the sheet and draws the SVG onto a canvas.
//
// The head is drawn on a 200 × 200 grid. Layers, back to front: background, back hair, body and
// outfit, mid hair (long locks), neck, ears, face, features, facial hair, front hair, glasses,
// flower, hat, earrings, frame ring. Face shapes share one skull top so every hair and hat fits all.

// ---- small helpers ---------------------------------------------------------------------------

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const rgbHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v * (1 - t) + y[i] * t)) }
const lumOf = (h) => { const [r, g, b] = hexRgb(h).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }
const seeded = (seed) => { let a = typeof seed === 'number' ? seed : parseInt(hash(String(seed)), 36); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const isHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s)

// ---- the words: every label in four languages ------------------------------------------------

const L = (en, th, my, zh) => ({ en, th, my, zh })
const O = (id, en, th, my, zh, extra) => ({ id, label: L(en, th, my, zh), ...extra })

export const SKINS = [
  O('s1', 'Skin tone 1', 'โทนผิว 1', 'အသားအရောင် ၁', '肤色 1', { c: '#fde3d3' }),
  O('s2', 'Skin tone 2', 'โทนผิว 2', 'အသားအရောင် ၂', '肤色 2', { c: '#f8d1b6' }),
  O('s3', 'Skin tone 3', 'โทนผิว 3', 'အသားအရောင် ၃', '肤色 3', { c: '#f0bd97' }),
  O('s4', 'Skin tone 4', 'โทนผิว 4', 'အသားအရောင် ၄', '肤色 4', { c: '#e6a87a' }),
  O('s5', 'Skin tone 5', 'โทนผิว 5', 'အသားအရောင် ၅', '肤色 5', { c: '#d6925e' }),
  O('s6', 'Skin tone 6', 'โทนผิว 6', 'အသားအရောင် ၆', '肤色 6', { c: '#bf7a47' }),
  O('s7', 'Skin tone 7', 'โทนผิว 7', 'အသားအရောင် ၇', '肤色 7', { c: '#a2603a' }),
  O('s8', 'Skin tone 8', 'โทนผิว 8', 'အသားအရောင် ၈', '肤色 8', { c: '#83482b' }),
  O('s9', 'Skin tone 9', 'โทนผิว 9', 'အသားအရောင် ၉', '肤色 9', { c: '#63341f' }),
  O('s10', 'Skin tone 10', 'โทนผิว 10', 'အသားအရောင် ၁၀', '肤色 10', { c: '#4a261a' }),
]

// brow: the colour eyebrows and facial hair take (a natural one when the hair is dyed)
export const HAIRC = [
  O('black', 'Black', 'ดำ', 'အနက်', '黑色', { c: '#1d1613', brow: '#1d1613' }),
  O('espresso', 'Dark brown', 'น้ำตาลเข้ม', 'အညိုရင့်', '深棕色', { c: '#3b2418', brow: '#34200f' }),
  O('brown', 'Brown', 'น้ำตาล', 'အညို', '棕色', { c: '#6b4127', brow: '#573520' }),
  O('chestnut', 'Chestnut', 'น้ำตาลแดง', 'အညိုနီ', '栗色', { c: '#8b4a2b', brow: '#6e3a22' }),
  O('honey', 'Honey', 'ทองน้ำผึ้ง', 'ပျားရည်ရောင်', '蜜金色', { c: '#cf9d4e', brow: '#8e6530' }),
  O('ginger', 'Ginger', 'แดงทองแดง', 'ဂျင်းရောင်', '姜红色', { c: '#c4572a', brow: '#93421f' }),
  O('grey', 'Grey', 'เทา', 'မီးခိုးရောင်', '灰色', { c: '#a1a7ad', brow: '#7e848a' }),
  O('white', 'White', 'ขาว', 'အဖြူ', '白色', { c: '#ecebe8', brow: '#b8b5b0' }),
  O('pink', 'Pink', 'ชมพู', 'ပန်းရောင်', '粉色', { c: '#ee6ba7', brow: '#5a2f24' }),
  O('teal', 'Teal', 'เขียวหยก', 'စိမ်းပြာရောင်', '青绿色', { c: '#1fa7a0', brow: '#2f1c12' }),
  O('violet', 'Violet', 'ม่วง', 'ခရမ်းရောင်', '紫色', { c: '#7d58c9', brow: '#2f1c12' }),
]

// the cloth palette: outfits and hats
export const CLOTH = [
  O('white', 'White', 'ขาว', 'အဖြူ', '白色', { c: '#f8f4ec' }),
  O('black', 'Black', 'ดำ', 'အနက်', '黑色', { c: '#2b2a33' }),
  O('red', 'Red', 'แดง', 'အနီ', '红色', { c: '#d7261e' }),
  O('orange', 'Orange', 'ส้ม', 'လိမ္မော်', '橙色', { c: '#ef7a1c' }),
  O('mustard', 'Yellow', 'เหลือง', 'အဝါ', '黄色', { c: '#eeb324' }),
  O('lime', 'Light green', 'เขียวอ่อน', 'အစိမ်းနု', '嫩绿色', { c: '#7bb53f' }),
  O('green', 'Green', 'เขียว', 'အစိမ်း', '绿色', { c: '#2a8a55' }),
  O('teal', 'Teal', 'เขียวน้ำทะเล', 'စိမ်းပြာ', '青色', { c: '#1d9aa5' }),
  O('sky', 'Sky blue', 'ฟ้า', 'ကောင်းကင်ပြာ', '天蓝色', { c: '#52a8e6' }),
  O('blue', 'Blue', 'น้ำเงิน', 'အပြာ', '蓝色', { c: '#2f5fcb' }),
  O('indigo', 'Indigo', 'คราม', 'နီလာရောင်', '靛蓝色', { c: '#243a78' }),
  O('violet', 'Violet', 'ม่วง', 'ခရမ်း', '紫色', { c: '#7b4dbd' }),
  O('pink', 'Pink', 'ชมพู', 'ပန်းရောင်', '粉色', { c: '#e8588c' }),
  O('brown', 'Brown', 'น้ำตาล', 'အညို', '棕色', { c: '#8a5732' }),
  O('khaki', 'Sand', 'ทราย', 'သဲရောင်', '沙色', { c: '#cdb77f' }),
]

// backgrounds are lighter so the face reads; the bold ones are there when the page is bold
export const BGC = [
  O('sun', 'Sun', 'เหลืองแดด', 'နေရောင်', '日光黄', { c: '#ffd966' }),
  O('peach', 'Peach', 'พีช', 'မက်မွန်', '蜜桃色', { c: '#ffc3a0' }),
  O('rose', 'Rose', 'ชมพูอ่อน', 'နှင်းဆီ', '玫瑰色', { c: '#ffb3cc' }),
  O('lilac', 'Lilac', 'ม่วงอ่อน', 'ခရမ်းနု', '淡紫色', { c: '#d6c1f0' }),
  O('sky', 'Sky', 'ฟ้าใส', 'ကောင်းကင်', '天空蓝', { c: '#a9d6f5' }),
  O('mint', 'Mint', 'เขียวมิ้นต์', 'ပုစီနံ', '薄荷绿', { c: '#aee8cb' }),
  O('lime', 'Lime', 'เขียวมะนาว', 'သံပုရာစိမ်း', '青柠色', { c: '#d0ec8c' }),
  O('sand', 'Sand', 'ทราย', 'သဲရောင်', '沙色', { c: '#efdcb8' }),
  O('red', 'Red', 'แดง', 'အနီ', '红色', { c: '#e2412e' }),
  O('orange', 'Orange', 'ส้ม', 'လိမ္မော်', '橙色', { c: '#f27a21' }),
  O('teal', 'Teal', 'เขียวน้ำทะเล', 'စိမ်းပြာ', '青色', { c: '#1f9aa6' }),
  O('blue', 'Blue', 'น้ำเงิน', 'အပြာ', '蓝色', { c: '#3a7bd5' }),
  O('indigo', 'Indigo', 'คราม', 'နီလာရောင်', '靛蓝色', { c: '#22386b' }),
  O('night', 'Night', 'ดำ', 'အမည်း', '夜色', { c: '#2a2438' }),
]

/** A page's accent as a background: dark colours are lightened so a face stays easy to see. */
export function softColour(hex) {
  if (!isHex(hex)) return ''
  const l = lumOf(hex)
  return l < 0.2 ? mix(hex, '#ffffff', 0.5) : l > 0.85 ? mix(hex, '#000000', 0.08) : hex
}

const colourOf = (list, v, fb) => (isHex(v) ? v : (list.find((x) => x.id === v) || list.find((x) => x.id === fb) || list[0]).c)

// ---- path tools: write the right half of a shape, get the whole -------------------------------

const rd = (v) => Math.round(v * 100) / 100
function segs(d) {
  const t = d.match(/[MLCQHVZ]|-?(?:\d+\.?\d*|\.\d+)/g) || []
  const out = []
  let i = 0, x = 0, y = 0
  while (i < t.length) {
    const c = t[i++], n = { M: 2, L: 2, C: 6, Q: 4, H: 1, V: 1, Z: 0 }[c]
    const p = t.slice(i, i + n).map(Number)
    i += n
    if (c === 'H') { out.push({ c: 'L', p: [p[0], y] }); x = p[0] } else if (c === 'V') { out.push({ c: 'L', p: [x, p[0]] }); y = p[0] } else { out.push({ c, p }); if (n) { x = p[n - 2]; y = p[n - 1] } }
  }
  return out
}
const str = (ss) => ss.map((s) => s.c + s.p.map(rd).join(' ')).join('')
/** The same path flipped left to right about x = 100. */
export const mirror = (d) => str(segs(d).map((s) => ({ c: s.c, p: s.p.map((v, i) => (i % 2 ? v : 200 - v)) })))
/** A closed shape from its right half: an open path that starts and ends on the centre line. */
export function sym(d) {
  const s = segs(d), pts = s.map((q) => q.p.slice(-2)), m = (a) => [200 - a[0], a[1]], back = []
  for (let i = s.length - 1; i >= 1; i--) {
    const q = s[i], prev = pts[i - 1]
    if (q.c === 'L') back.push({ c: 'L', p: m(prev) })
    else if (q.c === 'Q') back.push({ c: 'Q', p: [...m(q.p.slice(0, 2)), ...m(prev)] })
    else if (q.c === 'C') back.push({ c: 'C', p: [...m(q.p.slice(2, 4)), ...m(q.p.slice(0, 2)), ...m(prev)] })
  }
  const end = pts[pts.length - 1]
  return d + (end[0] === 100 ? '' : `L${200 - end[0]} ${end[1]}`) + str(back) + 'Z'
}

// ---- pens ---------------------------------------------------------------------------------------

const INK = '#2a1810'
const W1 = 3.2 // the outline
const W2 = 2.1 // detail inside a shape
const W3 = 1.5 // a hair strand
const line = (d, w = W2, c = INK, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${x}/>`
const shape = (d, fill, w = W1, x = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${x}/>`
const fill = (d, c, x = '') => `<path d="${d}" fill="${c}"${x}/>`
const g = (inner, attr = '') => `<g${attr ? ' ' + attr : ''}>${inner}</g>`
const both = (d) => d + mirror(d) // two strokes in one path

// ---- the head and the body ----------------------------------------------------------------------

// Every face shares the skull top (y 44); they differ from the cheeks down. ear: how far the ear sits from
// the centre line; chin: the lowest point.
const FACE = {
  round: { half: 'M100 44C128 44 144 62 143 90C142 118 126 141 100 141', ear: 42.5, chin: 141 },
  oval: { half: 'M100 44C126 44 140 62 140 88C140 116 124 145 100 146', ear: 39.5, chin: 146 },
  square: { half: 'M100 44C128 44 142 60 142 86C142 108 141 124 132 136C124 145 112 147 100 147', ear: 41.5, chin: 147 },
}
for (const f of Object.values(FACE)) f.d = sym(f.half)

const TORSO = 'M14 206L14 192C16 174 40 161 80 155L120 155C160 161 184 174 186 192L186 206Z'

function paint(o) {
  const skin = colourOf(SKINS, o.skin, 's4'), hc = HAIRC.find((x) => x.id === o.hairc) || HAIRC[0]
  const hat = colourOf(CLOTH, o.hatc, 'red'), out = colourOf(CLOTH, o.outc, 'teal'), scarf = colourOf(CLOTH, o.scarfc, 'red')
  return {
    skin, skinD: mix(skin, '#6a2c12', 0.26), skinL: mix(skin, '#ffffff', 0.3), blush: mix(skin, '#e23d5a', 0.62),
    hair: hc.c, hairL: mix(hc.c, '#ffffff', 0.32), brow: hc.brow,
    fade: mix(skin, hc.c, 0.6),
    hairS: lumOf(hc.c) < 0.07 ? mix(hc.c, '#ffffff', 0.22) : mix(hc.c, '#000000', 0.34),
    hat, hatD: mix(hat, '#000000', 0.3), hatL: mix(hat, '#ffffff', 0.38), scarf, scarfD: mix(scarf, '#000000', 0.3),
    tie: Math.abs(lumOf(out) - lumOf(hc.c)) < 0.08 ? '#d7261e' : out,
    out, outD: mix(out, '#000000', 0.27), outL: mix(out, '#ffffff', 0.32),
    iris: '#3a2418',
  }
}

// The head is drawn a little smaller than its 200-grid and set on the body, so the clothes get room.
const HS = 0.92 // head scale, about the neck base
const headY = (y) => 150 + (y - 150) * HS
const HEAD = 'transform="translate(100 144) scale(.92) translate(-100 -150)"'
const BODY = 'transform="translate(0 -6)"'

function neckSvg(o, c) {
  const cy = headY(FACE[o.face].chin)
  const neck = 'M87 112L87 150C87 157 82 160 77 162L123 162C118 160 113 157 113 150L113 112Z'
  return shape(neck, c.skin, W1) + fill(`M87 ${cy - 20}L113 ${cy - 20}L113 ${rd(cy + 2)}Q100 ${rd(cy + 17)} 87 ${rd(cy + 2)}Z`, c.skinD, ' opacity=".62"')
}

function earsSvg(o, c) {
  const x = 100 + FACE[o.face].ear
  const d = `M${x - 5} 90C${x + 3} 85 ${x + 11.5} 90 ${x + 11.5} 99C${x + 11.5} 108 ${x + 5} 112 ${x - 3} 110Z`
  const inner = `M${x + 3} 94C${x + 6.5} 95.5 ${x + 7} 100 ${x + 4.5} 105`
  return shape(d, c.skin) + shape(mirror(d), c.skin) + line(inner, W2, c.skinD) + line(mirror(inner), W2, c.skinD)
}

function faceSvg(o, c) {
  const f = FACE[o.face]
  const clip = `${c.id}-face`
  c.defs.push(`<clipPath id="${clip}"><path d="${f.d}"/></clipPath>`)
  // a little shade under the cheekbones and at the temples keeps the head from looking flat
  const shade = fill('M30 104C60 124 88 130 100 130C112 130 140 124 170 104L170 170L30 170Z', c.skinD, ' opacity=".16"') +
    fill('M40 40L66 40C60 62 60 84 64 108L40 108Z', c.skinD, ' opacity=".12"') + fill(mirror('M40 40L66 40C60 62 60 84 64 108L40 108Z'), c.skinD, ' opacity=".12"')
  return shape(f.d, c.skin, W1) + g(shade, `clip-path="url(#${clip})"`)
}

// ---- eyes: drawn about their own centre (0, 0), left eye at (79, 97); the right is the mirror -------------

const EYE_ALMOND = 'M-9.5 -0.8C-6 -6.8 3.5 -7.2 9.4 2.4C4.4 7 -5.5 6.8 -9.5 -0.8Z'
function eyeLocal(kind, c) {
  switch (kind) {
    case 'dot':
      return `<circle r="4.9" fill="${INK}"/><circle cx="1.7" cy="-1.9" r="1.6" fill="#fff"/>`
    case 'round':
      return `<ellipse rx="7.2" ry="7.8" fill="#fff" stroke="${INK}" stroke-width="2.2"/>` +
        `<circle cy="0.8" r="5.9" fill="${c.iris}"/><circle cy="1" r="3.1" fill="${INK}"/>` +
        `<circle cx="2.2" cy="-2.1" r="2" fill="#fff"/><circle cx="-2" cy="2.8" r="1" fill="#fff"/>` +
        line('M-8.6 -2.4C-5.2 -9 5.2 -9 8.6 -2.4', 2.9)
    case 'almond':
    case 'lashes': {
      const clip = `${c.id}-ea`
      if (!c.defs.some((d) => d.includes(`id="${clip}"`))) c.defs.push(`<clipPath id="${clip}"><path d="${EYE_ALMOND}"/></clipPath>`)
      return `<path d="${EYE_ALMOND}" fill="#fff"/>` +
        g(`<circle cy="0.2" r="5.2" fill="${c.iris}"/><circle cy="0.4" r="2.6" fill="${INK}"/><circle cx="1.8" cy="-1.8" r="1.7" fill="#fff"/>`, `clip-path="url(#${clip})"`) +
        line('M-10.6 0.4C-6.4 -7.8 4.4 -8.2 10.4 2.2', 3.3) + line('M-9.8 1.2C-5 6.8 4 7.2 9.2 2.8', 1.5) +
        (kind === 'lashes' ? line('M-10.2 -0.4L-14.2 -3.2M-8.8 -3.6L-12 -7.6M-5.6 -5.8L-7.8 -10', 2) : '')
    }
    case 'happy':
      return line('M-8.6 3.6C-6 -5.8 6 -5.8 8.6 3.6', 3.7)
    case 'calm': {
      const clip = `${c.id}-ea`
      if (!c.defs.some((d) => d.includes(`id="${clip}"`))) c.defs.push(`<clipPath id="${clip}"><path d="${EYE_ALMOND}"/></clipPath>`)
      return `<path d="${EYE_ALMOND}" fill="#fff"/>` +
        g(`<circle cy="1.6" r="5.2" fill="${c.iris}"/><circle cy="1.8" r="2.5" fill="${INK}"/><circle cx="1.8" cy="0" r="1.5" fill="#fff"/>` + fill('M-12 -9L12 -9L12 -0.2C5 -1.4 -5 -1.4 -12 -0.2Z', c.skin), `clip-path="url(#${clip})"`) +
        line('M-10.8 0.2C-5.4 -2.2 5 -2.2 10.6 1', 3.3) + line('M-9.6 2C-5 6.6 4 7 9 3.2', 1.4)
    }
    default:
      return ''
  }
}

function eyesSvg(o, c) {
  const kind = o.eyes
  const left = eyeLocal(kind === 'wink' ? 'happy' : kind, c)
  const right = eyeLocal(kind === 'wink' ? 'round' : kind, c)
  // a hair's difference between the two sides, so the face looks drawn rather than stamped
  return g(left, 'transform="translate(79 97)"') + g(right, 'transform="translate(121 96.5) scale(-1 1)"')
}

// ---- brows, nose, mouth, cheeks ------------------------------------------------------------------------

const BROWS = {
  soft: ['M-9.5 2.4C-5 -3.6 2 -4.6 9.5 -0.6', 3.8],
  arched: ['M-9.5 3.4C-4 -6.4 3 -7.4 10 -0.6', 3.3],
  bold: ['M-10 2C-3 -3.2 4 -3.6 10.4 -1.6', 5.6],
  thin: ['M-9.5 2C-4 -5 3 -6 9.5 -1.2', 2.2],
  level: ['M-9.5 0.6L9.5 -1', 3.9],
}
function browsSvg(o, c) {
  const [d, w] = BROWS[o.brows] || BROWS.soft
  const one = line(d, w, c.brow)
  return g(one, 'transform="translate(79 83)"') + g(one, 'transform="translate(121 82.2) scale(-1 1) rotate(2.5)"')
}

function noseSvg(o, c) {
  return line('M100.6 103.5C98.2 107.6 96.8 110.6 99.2 112C101.4 113.3 103.6 111.8 104 109.4', 2.2, mix(INK, c.skin, 0.12))
}

const LIP = '#d4475f'
function mouthLocal(kind, c) {
  switch (kind) {
    case 'smile': return line('M-13.5 -2.2C-8 10 8 10 13.5 -2.2', 3.6)
    case 'gentle': return line('M-8.6 -0.2C-4 5.4 4 5.4 8.6 -0.2', 3.3)
    case 'calm': return line('M-8.6 1.4C-3 3.4 3 3.4 8.6 1.4', 3.3)
    case 'smirk': return line('M-11.6 2C-4 6.8 6 5 12.4 -3.6', 3.5) + line('M13.8 -6.4C15.2 -4.4 15.2 -2.4 14 -0.8', 2)
    case 'grin':
    case 'open': {
      const big = kind === 'open'
      const d = big ? 'M-15 -3.4C-6 -1.4 6 -1.4 15 -3.4C16 8 9 17 0 17C-9 17 -16 8 -15 -3.4Z' : 'M-14 -3.4C-6 -1.4 6 -1.4 14 -3.4C14 6.6 8 12.4 0 12.4C-8 12.4 -14 6.6 -14 -3.4Z'
      const clip = `${c.id}-mo${big ? 'b' : 's'}`
      c.defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`)
      return fill(d, '#7e2a35') +
        g(fill('M-20 -6L20 -6L20 3.4C8 5 -8 5 -20 3.4Z', '#fff') + fill(`M-8 ${big ? 17 : 12.4}C-8 ${big ? 6 : 6} 8 ${big ? 6 : 6} 8 ${big ? 17 : 12.4}Z`, '#e5737f'), `clip-path="url(#${clip})"`) +
        shape(d, 'none', 3.2) + line('M-8 3.4C-3 4.6 3 4.6 8 3.4', 1.2, '#cfc4bb')
    }
    case 'lips':
      return shape('M-13.4 -0.8C-9 -5.4 -3.4 -6.6 0 -3.6C3.4 -6.6 9 -5.4 13.4 -0.8C6 1.4 -6 1.4 -13.4 -0.8Z', LIP, 2.4) +
        shape('M-13.4 -0.8C-6 1.6 6 1.6 13.4 -0.8C9.6 9.6 -9.6 9.6 -13.4 -0.8Z', mix(LIP, '#ffffff', 0.12), 2.4) +
        line('M-4.2 4.6C-1.2 6 1.2 6 4.2 4.6', 1.3, '#ffffff', ' opacity=".7"')
    default: return ''
  }
}
function mouthSvg(o, c) {
  const dy = o.beard === 'moustache' || o.beard === 'goatee' || o.beard === 'beard' ? 2.4 : 0
  return g(mouthLocal(o.mouth, c), `transform="translate(100 ${124 + dy}) rotate(-1.4)"`)
}

function cheeksSvg(o, c) {
  if (o.cheeks !== 'on') return ''
  return g('<ellipse cx="71" cy="113" rx="9.5" ry="5.8"/><ellipse cx="129" cy="113" rx="9.5" ry="5.8"/>', `fill="${c.blush}" opacity=".6"`)
}

// ---- hair: { back, mid, front } --------------------------------------------------------------------------------
// back: behind the body. mid: over the outfit, behind the head and ears. front: over the face.

const strands = (d, c, w = W3) => line(d, w, c.hairS, ' opacity=".75"')
const shine = (d, c) => line(d, 3.4, c.hairL, ' opacity=".55"')
/** Overlapping circles drawn as one cloud: outlines first, then the fills hide the inner halves. */
const bumps = (pts, r, col, w = W1) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="${w * 2}"/>`).join('') + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`).join('')
const arcPts = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180; return [rd(cx + rx * Math.cos(a)), rd(cy + ry * Math.sin(a))] })
/** A plait: leaves laid along a line, each turned the other way. */
const plait = (x0, y0, x1, y1, n, rx, ry, col) => Array.from({ length: n }, (_, i) => {
  const t = i / (n - 1), x = rd(x0 + (x1 - x0) * t), y = rd(y0 + (y1 - y0) * t), k = rx * (1 - 0.25 * t)
  return `<ellipse cx="${x}" cy="${y}" rx="${rd(k)}" ry="${ry}" transform="rotate(${i % 2 ? 26 : -26} ${x} ${y})" fill="${col}" stroke="${INK}" stroke-width="2.4"/>`
}).join('')
/** The skull cap: top is its outer top, hl the hairline at the centre; sideburns end by the ear. */
const capD = (top, hl, burn = 99) => sym(`M100 ${top}C128 ${top} 150 ${top + 17} 149 84L148 ${burn}L141.5 ${burn - 2}C141.5 88 138 78 131 72C123 66 110 ${hl} 100 ${hl}`)
/** A thick coloured stroke with an ink edge: a hair tie, a strap. */
const band = (d, w, col) => line(d, w + 3.2, INK) + line(d, w, col)

const HAIR = {
  bald: (c) => ({ front: line('M80 56C88 49 102 46 114 49', 3.6, c.skinL, ' opacity=".85"') }),
  buzz: (c) => {
    const d = sym('M100 40C127 40 147 56 146 86L145.5 97L141.5 94C141 82 134 70 121 64C113 61 106 60 100 60')
    return { front: fill(d, c.hair) + line(both('M145.5 97L146 86C147 56 127 40 100 40'), W1) + strands('M84 50C92 46 104 45 112 47', c, 1.2) }
  },
  short: (c) => {
    const d = sym('M100 35C128 35 150 52 149 84L148 99L141.5 97C141.5 88 139 80 135 75L128 69L124 78L116 68L111 76L105 66L100 71')
    return { front: shape(d, c.hair) + strands('M112 41C118 46 122 52 123 60M127 44C133 49 138 56 140 66M88 41C82 46 78 52 77 60', c) + shine('M84 46C90 40 100 38 108 40', c) }
  },
  sidepart: (c) => {
    const d = shape(capD(33, 56), c.hair)
    const swoop = 'M118 36C112 46 108 52 108 57C92 58 74 64 66 82C62 70 66 54 82 42C92 36 106 34 118 36Z'
    return { front: d + shape(swoop, c.hair) + line('M118 36C118 44 116 50 112 56', W2, c.hairS) + strands('M104 46C94 50 82 58 74 70M110 54C98 56 88 62 80 74', c) + shine('M126 40C134 44 140 52 142 62', c) }
  },
  quiff: (c) => {
    const d = shape(capD(30, 58), c.hair)
    const roll = 'M64 66C58 42 78 22 108 22C136 22 148 42 142 62C134 52 116 44 98 48C84 50 72 56 64 66Z'
    return { front: d + shape(roll, c.hair) + line('M70 60C84 46 112 40 138 54', 2, c.hairS, ' opacity=".8"') + strands('M92 32C86 38 80 46 76 54M106 28C100 34 96 40 92 46M120 30C116 36 112 40 108 44', c) + shine('M76 42C84 32 98 28 112 28', c) }
  },
  balding: (c) => {
    const side = 'M142 98C150 84 150 64 138 54C132 52 128 52 126 54C134 62 138 76 136 90Z'
    return { front: shape(side, c.hair) + shape(mirror(side), c.hair) + line('M82 56C90 49 104 46 114 49', 3.6, c.skinL, ' opacity=".8"') + strands('M140 60C144 70 144 80 141 90', c) + strands(mirror('M140 60C144 70 144 80 141 90'), c) }
  },
  bob: (c) => {
    const back = 'M100 34C142 34 162 62 160 108C159 124 158 136 154 146C142 152 128 148 124 140L76 140C72 148 58 152 46 146C42 136 41 124 40 108C38 62 58 34 100 34Z'
    const d = sym('M100 33C130 33 154 52 153 92L152 118C152 130 149 139 144 144C138 147 132 145 130 140C129 133 131 125 135 117C139 108 141 96 141 86C140 77 132 70 120 69C112 68.5 105 68.5 100 68.5')
    return { back: shape(back, c.hair), front: shape(d, c.hair) + strands('M118 38C126 44 132 52 134 62M88 38C80 44 74 52 72 62', c) + shine('M82 44C90 38 102 37 112 39', c) }
  },
  pixie: (c) => {
    const base = shape(sym('M100 36C128 36 148 52 147 84L146 98L141.5 96C141.5 88 140 82 136 76C128 68 116 64 100 64'), c.hair)
    const fringe = 'M64 66C82 50 112 50 140 72L137 86L129 78L125 90L117 77L109 86L101 74C90 70 76 72 68 80C62 76 60 70 64 66Z'
    return { front: base + shape(fringe, c.hair) + strands('M80 56C96 52 116 56 130 68M72 66C84 62 98 62 108 68', c) + shine('M84 44C92 39 102 38 110 40', c) }
  },
  medium: (c) => {
    const back = 'M100 34C142 34 160 62 158 106C157 124 160 140 168 150C162 162 146 160 138 152L62 152C54 160 38 162 32 150C40 140 43 124 42 106C40 62 58 34 100 34Z'
    const lock = 'M64 98C56 114 50 130 40 148C42 160 58 162 66 152C66 136 70 120 76 112Z'
    const d = sym('M100 36C128 36 150 54 149 90L148 104L142 98C141 84 136 72 126 66C118 61 108 60 100 60')
    return { back: shape(back, c.hair), mid: shape(lock, c.hair) + shape(mirror(lock), c.hair) + strands('M56 116C52 128 48 138 46 148', c) + strands(mirror('M56 116C52 128 48 138 46 148'), c),
      front: shape(d, c.hair) + line('M100 37L100 60', W2, c.hairS) + strands('M112 40C122 46 130 56 134 68M88 40C78 46 70 56 66 68', c) + shine('M79 49C84 44 90 41 95 40', c) }
  },
  long: (c) => {
    const back = 'M100 34C142 34 164 66 162 112C161 140 168 170 176 206L24 206C32 170 39 140 38 112C36 66 58 34 100 34Z'
    const lock = 'M64 98C54 124 46 152 42 192C48 206 66 206 72 198C68 172 70 142 78 116Z'
    const d = sym('M100 36C128 36 150 54 149 90L148 104L142 98C141 84 136 72 126 66C118 61 108 60 100 60')
    return { back: shape(back, c.hair), mid: shape(lock, c.hair) + shape(mirror(lock), c.hair) + strands('M56 124C52 142 50 162 50 184', c) + strands(mirror('M56 124C52 142 50 162 50 184'), c),
      front: shape(d, c.hair) + line('M100 37L100 60', W2, c.hairS) + strands('M112 40C122 46 130 56 134 68M88 40C78 46 70 56 66 68', c) + shine('M79 49C84 44 90 41 95 40', c) }
  },
  wavy: (c) => {
    const back = 'M100 34C142 34 164 66 162 112C160 130 168 150 164 168C172 180 168 194 176 206L24 206C32 194 28 180 36 168C32 150 40 130 38 112C36 66 58 34 100 34Z'
    const lock = 'M64 98C52 120 56 138 46 156C40 170 52 184 44 198C54 208 70 206 72 196C64 180 74 164 70 148C68 134 76 124 78 116Z'
    const d = sym('M100 36C128 36 150 54 149 90L148 104L142 98C141 84 136 72 126 66C118 61 108 60 100 60')
    const wave = 'M54 128C48 138 58 146 50 158C44 168 54 176 48 190'
    return { back: shape(back, c.hair), mid: shape(lock, c.hair) + shape(mirror(lock), c.hair) + strands(wave, c) + strands(mirror(wave), c),
      front: shape(d, c.hair) + line('M100 37L100 60', W2, c.hairS) + strands('M114 40C124 48 130 58 132 70M86 40C76 48 70 58 68 70', c) + shine('M79 49C84 44 90 41 95 40', c) }
  },
  ponytail: (c) => {
    const tail = 'M98 42C122 12 172 24 168 86C166 112 160 130 150 150C142 130 148 108 146 88C144 66 126 54 98 52Z'
    const d = sym('M100 38C128 38 149 54 148 86L147.5 97L141.5 94C141 80 134 66 121 61C113 58 106 57 100 57')
    return { back: shape(tail, c.hair) + strands('M148 70C152 92 150 112 150 132M132 40C146 42 156 56 158 74', c),
      front: shape(d, c.hair) + line('M100 39L100 57', W2, c.hairS) + shine('M79 51C84 46 90 43 95 42', c) + band('M111 40C118 36 128 38 133 45', 4.4, c.tie) }
  },
  bun: (c) => {
    const d = sym('M100 38C128 38 149 54 148 86L147.5 97L141.5 94C141 80 134 66 121 61C113 58 106 57 100 57')
    return { front: shape('M100 28m-15 0a15 15 0 1 0 30 0a15 15 0 1 0 -30 0', c.hair) + strands('M92 22C97 19 105 19 110 23M91 31C97 28 106 28 110 32', c) +
      shape(d, c.hair) + line('M100 39L100 57', W2, c.hairS) + shine('M79 51C84 46 90 43 95 42', c) + band('M89 41C96 46 104 46 111 41', 4, c.tie) }
  },
  lowbun: (c) => {
    const d = sym('M100 38C128 38 149 54 148 86L147.5 97L141.5 94C141 80 134 66 121 61C113 58 106 57 100 57')
    return { back: shape('M153 126m-18 0a18 18 0 1 0 36 0a18 18 0 1 0 -36 0', c.hair) + strands('M142 118C149 112 160 113 166 120M141 132C148 128 160 128 167 134M153 110C158 114 160 122 158 130', c) + line('M143 112L168 134', 5.2, INK) + line('M143 112L168 134', 2.6, '#f2c14e') + `<circle cx="169" cy="135" r="3.6" fill="#f2c14e" stroke="${INK}" stroke-width="1.8"/>`,
      front: shape(d, c.hair) + line('M100 39L100 57', W2, c.hairS) + shine('M79 51C84 46 90 43 95 42', c) }
  },
  topknot: (c) => {
    const fade = sym('M100 42C127 42 147 58 146 88L145.5 96L141.5 93C141 80 134 70 124 64C116 60 108 60 100 60')
    const clip = `${c.id}-tk`
    c.defs.push(`<clipPath id="${clip}"><path d="${fade}"/></clipPath>`)
    let dots = ''
    for (let i = 0; i < 80; i++) dots += `M${52 + ((i * 41) % 96)} ${44 + ((i * 29) % 52)}l.1 .1`
    const top = 'M72 66C68 46 84 36 100 36C116 36 132 46 128 66C118 58 82 58 72 66Z'
    return { front: fill(fade, c.fade) + g(line(dots, 1.7, c.hairS, ' opacity=".85"'), `clip-path="url(#${clip})"`) + line(both('M145.5 96L146 88C147 58 127 42 100 42'), W1) +
      shape('M100 26m-11 0a11 11 0 1 0 22 0a11 11 0 1 0 -22 0', c.hair) + shape(top, c.hair) + strands('M92 44C88 50 86 56 86 62M108 44C112 50 114 56 114 62M97 20C100 17 104 18 106 21', c) + shine('M84 46C90 40 100 38 108 40', c) + band('M92 37C97 41 103 41 108 37', 3.6, c.tie) }
  },
  braid: (c) => {
    const d = sym('M100 38C128 38 149 54 148 86L147.5 97L141.5 94C141 80 134 66 121 61C113 58 106 57 100 57')
    return { mid: plait(54, 104, 50, 176, 8, 8, 9.5, c.hair) + band('M43 177C47 182 54 183 58 178', 4, c.tie), front: shape(d, c.hair) + line('M100 39L100 57', W2, c.hairS) + shine('M79 51C84 46 90 43 95 42', c) }
  },
  braids: (c) => {
    const d = sym('M100 38C128 38 149 54 148 86L147.5 97L141.5 94C141 80 134 66 121 61C113 58 106 57 100 57')
    const mk = (x0, x1) => plait(x0, 104, x1, 176, 8, 8, 9.5, c.hair) + band(`M${x1 - 7} 177C${x1 - 3} 182 ${x1 + 4} 183 ${x1 + 8} 178`, 4, c.tie)
    return { mid: mk(54, 50) + mk(146, 150), front: shape(d, c.hair) + line('M100 39L100 57', W2, c.hairS) + shine('M79 51C84 46 90 43 95 42', c) }
  },
  curly: (c) => {
    const cap = shape(capD(38, 64), c.hair)
    const outer = [...arcPts(100, 82, 49, 48, 172, 368, 11), [50, 100], [150, 100]]
    const hairline = Array.from({ length: 9 }, (_, i) => { const t = (i - 4) / 4; return [rd(100 + 38 * t), rd(60 + 15 * t * t)] })
    return { front: cap + bumps(outer, 12, c.hair) + bumps(hairline, 7.2, c.hair, W1) + strands('M84 42C90 38 96 40 98 44M110 40C116 38 120 42 120 46', c, 1.6) }
  },
  afro: (c) => {
    const halo = bumps(arcPts(100, 70, 40, 40, 140, 400, 15), 19, c.hair) + fill('M100 70m-44 0a44 44 0 1 0 88 0a44 44 0 1 0 -88 0', c.hair)
    const hairline = Array.from({ length: 11 }, (_, i) => { const t = (i - 5) / 5; return [rd(100 + 40 * t), rd(58 + 17 * t * t)] })
    return { back: halo, front: fill(capD(40, 58), c.hair) + bumps(hairline, 8, c.hair) }
  },
  undercut: (c) => {
    const fade = sym('M100 41C127 41 147 57 146 88L145.5 98L141.5 95C141 82 134 70 121 64C113 61 106 60 100 60')
    const clip = `${c.id}-uc`
    c.defs.push(`<clipPath id="${clip}"><path d="${fade}"/></clipPath>`)
    let dots = ''
    for (let i = 0; i < 90; i++) dots += `M${52 + ((i * 41) % 96)} ${42 + ((i * 29) % 58)}l.1 .1`
    const crest = sym('M100 18L106 29L113 21L120 34L126 30C130 42 129 56 124 66C116 60 108 59 100 59')
    return { front: fill(fade, c.fade) + g(line(dots, 1.7, c.hairS, ' opacity=".85"'), `clip-path="url(#${clip})"`) + line(both('M145.5 98L146 88C147 57 127 41 100 41'), W1) +
      shape(crest, c.hair) + strands('M100 26L100 52M110 30C111 38 112 46 111 54M90 30C89 38 88 46 89 54M119 38C121 46 120 54 118 60M81 38C79 46 80 54 82 60', c) + shine('M92 40C96 34 102 30 108 29', c) }
  },
  hijab: (c, o) => {
    const col = c.scarf, colD = c.scarfD
    // under a hat the scarf fits close to the face, so nothing of it shows above the brim
    const under = ['cap', 'chef', 'beanie', 'wrap', 'bucket', 'ngob'].includes(o.hat)
    const outer = under
      ? 'M100 58C130 58 150 78 150 106C150 124 148 136 157 150C166 164 182 182 190 208L10 208C18 182 34 164 43 150C52 136 50 124 50 106C50 78 70 58 100 58Z'
      : 'M100 28C142 28 164 62 162 108C161 126 158 138 164 152C170 166 184 182 192 208L8 208C16 182 30 166 36 152C42 138 39 126 38 108C36 62 58 28 100 28Z'
    const hole = 'M100 62C121 62 137 76 137 99C137 119 124 135 100 137C76 135 63 119 63 99C63 76 79 62 100 62Z'
    return { front: `<path d="${outer}${hole}" fill="${col}" fill-rule="evenodd"/>` + line(outer, W1) + line(hole, W1) +
      (under ? '' : line('M60 66C50 80 46 98 46 114M140 66C150 80 154 98 154 114', W2, colD)) + line('M66 160C74 176 78 190 78 208M134 160C126 176 122 190 122 208M100 146C100 166 100 188 100 208', W2, colD, ' opacity=".8"') +
      `<circle cx="100" cy="150" r="3.6" fill="#f2c14e" stroke="${INK}" stroke-width="1.6"/>` }
  },
  scarf: (c) => {
    const cap = sym('M100 36C128 36 149 54 148 84L147 94L141.5 90C141 78 132 66 118 62C112 60 106 60 100 60')
    const sideburn = 'M142 88L148 100L141 98Z'
    const clip = `${c.id}-sc`
    c.defs.push(`<clipPath id="${clip}"><path d="${cap}"/></clipPath>`)
    let dots = ''
    for (let y = 44, r = 0; y < 90; y += 11, r++) for (let x = r % 2 ? 56 : 62; x < 150; x += 12) dots += `<circle cx="${x}" cy="${y}" r="2.3"/>`
    const bow = 'M110 46C101 42 94 32 98 24C107 24 114 32 116 42ZM118 44C127 38 136 34 142 38C142 46 132 52 120 50Z'
    return { front: shape(sideburn, c.hair, 2.4) + shape(mirror(sideburn), c.hair, 2.4) + shape(cap, c.scarf) + g(`<g fill="#fff" opacity=".85">${dots}</g>`, `clip-path="url(#${clip})"`) + shape(bow, c.scarf) + `<ellipse cx="115" cy="46" rx="7" ry="6" fill="${c.scarfD}" stroke="${INK}" stroke-width="2.4"/>` }
  },
}

// ---- outfits: shoulders and chest over one torso silhouette. A function returns the front as text, or { b, f }
// with b drawn behind the neck (a hood) ------------------------------------------------------------------------

const SHOULDER = 'M14 300L14 192C16 174 40 161 80 155'
const SHOULDER_R = 'L120 155C160 161 184 174 186 192L186 300Z'
const garment = (neck) => SHOULDER + neck + SHOULDER_R
const U_NECK = 'C84 157 90 168 100 168C110 168 116 157 120 155'
const U_BAND = 'M81 156.5C85 159 91 170.5 100 170.5C109 170.5 115 159 119 156.5'
const SEAM = 'M52 163C46 176 44 192 44 230'
const seams = (c) => line(both(SEAM), W2, c.outD)
const PAPER = '#f8f4ec'
const GOLD = '#f2c14e'
const button = (x, y, col, r = 2.3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1.5"/>`

const OUTFIT = {
  tee: (c) => {
    const gd = garment(U_NECK)
    return fill(gd, c.out) + line(U_BAND, 5.6, c.outD) + shape(gd, 'none') + seams(c)
  },
  collar: (c) => {
    const gd = garment('L100 178L120 155')
    const flap = 'M82 151C76 154 71 159 66 166L90 184L100 175Z'
    return fill(gd, c.out) + shape(gd, 'none') + shape(flap, c.outL) + shape(mirror(flap), c.outL) +
      line('M100 178L100 230', W2, c.outD) + [190, 202].map((y) => button(100, y, c.outL)).join('') + seams(c)
  },
  chef: (c) => {
    const gd = garment('L100 176L120 155')
    return fill(gd, c.out) + shape(gd, 'none') + line('M81 156.5L100 177L119 156.5', 6, c.outD) + line('M86 160C96 176 108 196 118 220', W2, c.outD) +
      [182, 194, 206].map((y, i) => button(94 + i * 5, y, c.outL, 2.7)).join('') + [182, 194, 206].map((y, i) => button(112 + i * 4, y, c.outL, 2.7)).join('') + seams(c)
  },
  apron: (c) => {
    const gd = garment(U_NECK)
    const ap = lumOf(c.out) > 0.45 ? '#2f4f86' : '#f1e5cb', apD = mix(ap, '#000000', 0.2)
    return fill(gd, c.out) + shape(gd, 'none') + line(U_BAND, 5, c.outD) + band('M82 172C82 164 84 158 87 152', 5.4, ap) + band('M118 172C118 164 116 158 113 152', 5.4, ap) +
      shape('M80 170C90 175 110 175 120 170L136 230L64 230Z', ap) + line('M81 178C92 182 108 182 119 178', W3, apD) + shape('M84 190L116 190L116 230L84 230Z', ap, W2) + line('M100 190L100 230', W3, apD) + seams(c)
  },
  hoodie: (c) => {
    const gd = garment('C82 160 90 172 100 172C110 172 118 160 118 155')
    const cord = (x) => line(`M${x} 172C${x - 1} 182 ${x - 1} 190 ${x - 2} 198`, 2.8, c.outL) + `<circle cx="${x - 2}" cy="200" r="2.4" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>`
    return { b: shape('M54 176C52 142 76 126 100 126C124 126 148 142 146 176Z', c.outD),
      f: fill(gd, c.out) + line('M80 156C84 164 90 174 100 174C110 174 116 164 120 156', 7, c.outL) + shape(gd, 'none') + line('M100 174L100 230', W2, c.outD) + cord(92) + cord(110) + seams(c) }
  },
  blouse: (c) => {
    const gd = garment('C84 156 90 165 100 165C110 165 116 156 120 155')
    const clip = `${c.id}-bl`
    c.defs.push(`<clipPath id="${clip}"><path d="${gd}"/></clipPath>`)
    let dots = ''
    for (let i = 0; i < 34; i++) dots += `<circle cx="${22 + ((i * 47) % 156)}" cy="${166 + ((i * 31) % 70)}" r="2.1"/>`
    const collar = 'M80 154C70 153 63 160 66 168C70 176 86 176 100 171L100 165C92 165 86 160 80 154Z'
    return fill(gd, c.out) + g(`<g fill="${c.outL}" opacity=".55">${dots}</g>`, `clip-path="url(#${clip})"`) + shape(gd, 'none') + shape(collar, c.outL) + shape(mirror(collar), c.outL) + button(100, 172, c.out, 2.4) + seams(c)
  },
  akha: (c) => {
    const gd = garment('L100 186L120 155')
    const cols = ['#ff2e88', '#ffd400', '#f8f4ec', '#19c37d']
    let st = ''
    for (let i = 0; i < 7; i++) { const t = i / 6, x = 82 + 16 * t, y = 158 + 24 * t; const col = cols[i % 4]; st += `<path d="M${rd(x - 2.3)} ${rd(y - 2.3)}l4.6 4.6m0 -4.6l-4.6 4.6M${rd(200 - x - 2.3)} ${rd(y - 2.3)}l4.6 4.6m0 -4.6l-4.6 4.6" stroke="${col}" stroke-width="2.1" stroke-linecap="round" fill="none"/>` }
    const strip = 'M76 155L92 155L102 176L100 194Z'
    const coin = (x, y) => `<circle cx="${x}" cy="${y}" r="3.3" fill="#e4e8ec" stroke="${INK}" stroke-width="1.5"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="1" fill="#fff"/>`
    return fill(gd, c.out) + fill('M84 158C90 166 110 166 116 158L100 186Z', '#f4e7cf') + shape(strip, '#d7261e', 2.2) + shape(mirror(strip), '#d7261e', 2.2) + st + shape(gd, 'none') +
      [0, 1, 2, 3, 4].map((i) => coin(88 + i * 6, 170 + Math.sin((i / 4) * Math.PI) * 6)).join('') +
      line('M30 190C36 178 48 168 64 162', 5, '#d7261e') + line('M26 200C32 188 46 176 62 170', 3, '#ffd400') + line(mirror('M30 190C36 178 48 168 64 162'), 5, '#d7261e') + line(mirror('M26 200C32 188 46 176 62 170'), 3, '#ffd400') + seams(c)
  },
  morhom: (c) => {
    const gd = garment('C86 153 92 164 100 164C108 164 114 153 120 155')
    const clip = `${c.id}-mh`
    c.defs.push(`<clipPath id="${clip}"><path d="${gd}"/></clipPath>`)
    let dash = ''
    for (let i = 0; i < 46; i++) { const x = 20 + ((i * 37) % 160), y = 160 + ((i * 53) % 70); dash += `M${x} ${y}l${3 + (i % 4)} ${2 - (i % 3)}` }
    return fill(gd, c.out) + g(line(dash, 2.2, c.outL, ' opacity=".42"'), `clip-path="url(#${clip})"`) + shape(gd, 'none') + line('M82 156C86 160 92 165 100 165C108 165 114 160 118 156', 4.4, c.outD) +
      line('M96 165L96 230M104 165L104 230', W2, c.outD) + [178, 192].map((y) => button(100, y, PAPER, 2.1)).join('') + seams(c)
  },
  suit: (c) => {
    const gd = garment('L100 192L120 155')
    const tie = lumOf(c.out) < 0.3 ? '#c8372d' : '#243a78'
    const lapel = 'M80 155L100 192L90 198L64 174L72 164Z'
    return fill(gd, c.out) + shape('M82 152L100 192L118 152Z', PAPER) + shape(gd, 'none') + shape(lapel, c.outL, 2.4) + shape(mirror(lapel), c.outL, 2.4) +
      shape('M82 151C78 154 74 158 72 164L92 172L100 162Z', PAPER, 2.6) + shape(mirror('M82 151C78 154 74 158 72 164L92 172L100 162Z'), PAPER, 2.6) +
      shape('M95 164L105 164L103 172L97 172Z', tie, 2.4) + shape('M97 172L103 172L108 206L100 212L92 206Z', tie, 2.4) + seams(c)
  },
  sports: (c) => {
    const gd = garment('C84 157 90 172 100 172C110 172 116 157 120 155')
    return fill(gd, c.out) + line('M81 156.5C85 160 91 173.5 100 173.5C109 173.5 115 160 119 156.5', 5.6, PAPER) + shape(gd, 'none') +
      line(both('M24 192C30 178 46 166 66 160'), 5, PAPER) + line(both('M20 204C26 190 44 176 64 169'), 3, PAPER) + seams(c)
  },
  wrap: (c) => {
    const gd = garment('L100 188L120 155')
    return fill(gd, c.out) + shape(gd, 'none') + line('M80 155L100 188L120 155', 5, c.outL) + line('M100 188C106 198 112 208 118 222', 5, c.outL) + shape('M100 188C106 198 112 208 118 222', 'none', 1.8) + seams(c)
  },
  sweater: (c) => {
    const gd = garment(U_NECK)
    let rib = ''
    for (let x = 30; x <= 170; x += 9) rib += `M${x} 178L${x} 230`
    const clip = `${c.id}-sw`
    c.defs.push(`<clipPath id="${clip}"><path d="${gd}"/></clipPath>`)
    return fill(gd, c.out) + g(line(rib, 2, c.outD, ' opacity=".45"'), `clip-path="url(#${clip})"`) + line(U_BAND, 7.4, c.outL) + shape(gd, 'none') + line('M83 158C88 166 94 172 100 172', 1.6, c.outD) + line('M117 158C112 166 106 172 100 172', 1.6, c.outD) + seams(c)
  },
  overalls: (c) => {
    const gd = garment(U_NECK), denim = '#3d5f93', denimD = '#2c4670'
    const strap = 'M70 160L86 157L84 190L66 192Z'
    return fill(gd, c.out) + line(U_BAND, 5, c.outD) + shape(gd, 'none') +
      shape(strap, denim) + shape(mirror(strap), denim) + shape('M66 188L134 188L134 300L66 300Z', denim) + line('M70 192L130 192', W3, denimD) + button(72, 191, GOLD, 3) + button(128, 191, GOLD, 3) + line('M100 192L100 230', W3, denimD)
  },
}

// ---- hats: art over the head, and keep: where hair may show (hair never rises through a hat) ---------------------------

const STRAW = '#e2b75a', STRAW_D = '#b68a30'
const FACE_EAR_MAX = 42.5 // the widest ear, for the headphones

const HAT = {
  cap: {
    keep: 'M0 200L0 74C20 70 50 70 58 70C56 46 76 29 100 29C124 29 144 46 142 70C150 70 180 70 200 74L200 200Z',
    art: (c) => shape('M58 70C56 46 76 29 100 29C124 29 144 46 142 70C130 64 70 64 58 70Z', c.hat) + line('M100 30C98 44 98 56 100 65M100 30C86 36 74 46 68 62M100 30C114 36 126 46 132 62', W2, c.hatD) +
      `<circle cx="100" cy="30.5" r="3.2" fill="${c.hatD}" stroke="${INK}" stroke-width="1.6"/>` + shape('M60 69C78 61 122 61 140 69C142 78 126 79 100 79C74 79 58 78 60 69Z', c.hatL) + line('M72 71C86 67 114 67 128 71', W3, c.hatD, ' opacity=".6"'),
  },
  bucket: {
    keep: 'M0 200L0 92L34 92L36 90C60 82 140 82 164 90L166 92L200 92L200 200Z',
    art: (c) => shape('M66 68L68 44C70 34 84 30 100 30C116 30 130 34 132 44L134 68Z', c.hat) + shape('M67 58C82 63 118 63 133 58L134 68C118 73 82 73 66 68Z', c.hatD) +
      shape('M64 66C44 70 32 80 34 92C60 82 140 82 166 92C168 80 156 70 136 66Z', c.hatL) + line('M44 84C70 76 130 76 156 84', W3, c.hatD, ' opacity=".6"') + line('M52 80C74 72 126 72 148 80', W3, c.hatD, ' opacity=".4"'),
  },
  chef: {
    keep: 'M0 200L0 68L200 68L200 200Z',
    art: (c) => shape('M64 66L64 54C48 54 40 38 52 28C58 14 78 14 86 20C92 8 112 8 118 20C128 14 148 14 150 30C160 40 152 54 136 54L136 66Z', c.hat) + shape('M62 54L138 54L138 68L62 68Z', c.hatL) + line('M82 24C80 36 80 46 82 54M100 20C100 34 100 46 100 54M118 24C120 36 120 46 118 54', W3, c.hatD),
  },
  ngob: {
    keep: 'M0 200L0 68L10 68C10 78 52 82 100 82C148 82 190 78 190 68L200 68L200 200Z',
    art: (c) => shape('M10 68C10 56 54 50 100 50C146 50 190 56 190 68C190 78 148 82 100 82C52 82 10 78 10 68Z', STRAW) + line('M24 66C50 74 150 74 176 66M40 60C64 66 136 66 160 60', W3, STRAW_D, ' opacity=".7"') +
      line('M100 52L100 80M70 52L62 80M130 52L138 80M42 56L28 78M158 56L172 78', 1.4, STRAW_D, ' opacity=".55"') +
      shape('M56 60C56 32 76 16 100 16C124 16 144 32 144 60C130 52 70 52 56 60Z', STRAW) + line('M64 46C82 38 118 38 136 46M60 54C80 46 120 46 140 54', W3, STRAW_D, ' opacity=".7"') + shape('M57 56C72 62 128 62 143 56L144 64C128 70 72 70 56 64Z', c.hat),
  },
  beanie: {
    keep: 'M0 200L0 84L54 84C60 78 140 78 146 84L200 84L200 200Z',
    art: (c) => {
      let rib = ''
      for (let x = 62; x <= 138; x += 8) rib += `M${x} ${x < 100 ? 66 + (100 - x) * 0.12 : 66 + (x - 100) * 0.12}l0 10`
      return shape('M55 82C52 50 72 26 100 26C128 26 148 50 145 82Z', c.hat) + line('M100 28C94 40 92 54 94 64M100 28C108 40 110 54 108 64M84 34C76 44 72 56 74 66M116 34C124 44 128 56 126 66', W3, c.hatD, ' opacity=".5"') +
        shape('M54 82C53 68 74 60 100 60C126 60 147 68 146 82C146 88 138 88 132 84C118 80 82 80 68 84C62 88 54 88 54 82Z', c.hatL) + line(rib, 1.8, c.hatD, ' opacity=".55"') + `<circle cx="100" cy="24" r="8.5" fill="${c.hatL}" stroke="${INK}" stroke-width="3"/>`
    },
  },
  headphones: {
    art: (c) => {
      const cup = (x) => `<ellipse cx="${x}" cy="100" rx="11" ry="16" fill="${c.hat}" stroke="${INK}" stroke-width="3.2"/><ellipse cx="${x}" cy="100" rx="6" ry="10.5" fill="${c.hatD}"/>`
      const dx = FACE_EAR_MAX + 9
      return band('M52 100C44 56 66 28 100 28C134 28 156 56 148 100', 6.4, c.hat) + cup(100 - dx) + cup(100 + dx) + line(`M${100 - dx - 4} 90C${100 - dx - 6} 98 ${100 - dx - 6} 104 ${100 - dx - 4} 110`, 2, c.hatL, ' opacity=".7"')
    },
  },
  wrap: {
    keep: 'M0 200L0 86L48 86C54 74 146 74 152 86L200 86L200 200Z',
    art: (c) => shape('M58 54C62 32 80 22 100 22C120 22 138 32 142 54C130 46 116 42 100 42C84 42 70 46 58 54Z', c.hat) +
      shape('M52 70C54 50 74 40 100 40C126 40 146 50 148 70C136 62 120 58 100 58C80 58 64 62 52 70Z', c.hatL) +
      shape('M48 86C46 72 66 62 100 62C134 62 154 72 152 86C140 77 122 73 100 73C78 73 60 77 48 86Z', c.hat) +
      line('M70 50C84 38 108 34 130 40M64 66C80 56 112 52 138 58', 1.8, c.hatD, ' opacity=".6"') +
      shape('M136 62C150 56 164 68 160 86C152 82 146 80 139 76Z', c.hat) + line('M144 66C152 70 154 78 152 82', 1.6, c.hatD, ' opacity=".7"'),
  },
  band: {
    art: (c) => shape('M56 68C72 61 128 61 144 68L145 80C130 72 70 72 55 80Z', c.hat) + line('M62 72C80 66 120 66 138 72', 1.6, c.hatL, ' opacity=".8"'),
  },
}
// ---- glasses, facial hair, earrings, a flower ---------------------------------------------------------------------------

const eyeBoth = (inner) => g(inner, 'transform="translate(79 97)"') + g(inner, 'transform="translate(121 97) scale(-1 1)"')

function glassesSvg(o, c) {
  const k = o.glasses
  if (k === 'none') return ''
  const arms = o.hair === 'hijab' ? '' : line(both('M65.8 95L55 93.6'), 3)
  const glint = (d) => line(d, 1.9, '#ffffff', ' opacity=".85"')
  const frame = { round: '<circle r="13.6" fill="#fff" fill-opacity=".1" stroke="' + INK + '" stroke-width="3.2"/>' + glint('M-8.4 -6.4C-6.6 -9 -3 -10.4 0 -10.4'),
    square: '<rect x="-13.6" y="-10.8" width="27.2" height="21.6" rx="6.5" fill="#fff" fill-opacity=".1" stroke="' + INK + '" stroke-width="3.2"/>' + glint('M-9 -6.6L-5.2 -8.4'),
    cat: `<path d="M-18 -16C-13.4 -10.8 -8 -9.8 -2 -10.2C6 -10.6 13.4 -8 14.2 -1C14.8 6.6 6.6 11 -1.4 10.8C-9.4 10.6 -14.6 6 -14.8 -1.4C-15 -7 -16.8 -12.4 -18 -16Z" fill="#fff" fill-opacity=".1" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>` + glint('M-9.4 -4.6C-8 -6.6 -5 -7.6 -2.6 -7.6'),
    sun: `<path d="M-14.6 -8.6C-6 -11.6 6 -11.6 14.6 -8.6C15.6 2 12 10.6 3 11C-6 11.4 -14 6.4 -14.6 -8.6Z" fill="${INK}" fill-opacity=".93" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>` + line('M-9.6 -3.6L-4.4 -7', 2.4, '#fff', ' opacity=".55"') }[k]
  const bridge = k === 'sun' ? line('M92 93.4C96 91.4 104 91.4 108 93.4', 3.4) : line('M92.6 96C96 93 104 93 107.4 96', 3)
  return eyeBoth(frame) + bridge + arms
}

const fhColour = (c) => c.brow
function beardSvg(o, c) {
  const k = o.beard
  if (k === 'none') return { under: '', over: '' }
  const col = fhColour(c), clip = `${c.id}-face`
  const stub = (() => { let d = ''; for (let i = 0; i < 80; i++) { const x = 58 + ((i * 37) % 84), y = 110 + ((i * 53) % 38); if (((x - 100) / 42) ** 2 + ((y - 124) / 24) ** 2 < 1) d += `M${x} ${y}l0.1 0.1` } return d })()
  if (k === 'stubble') {
    return { under: g(fill('M30 107C60 119 88 117 100 117C112 117 140 119 170 107L170 170L30 170Z', col, ' opacity=".2"') + line(stub, 1.7, col, ' opacity=".7"'), `clip-path="url(#${clip})"`), over: '' }
  }
  const mous = sym('M100 112.6C106 108.4 116 109.4 119 116C119.6 120.4 114 120 109 117.8C105 116 102.5 117 100 117')
  const must = shape(mous, col, 2.8) + line(both('M110 112C113 113 116 115 118 117'), 1.2, mix(col, '#ffffff', 0.35), ' opacity=".7"')
  if (k === 'moustache') return { under: '', over: must }
  if (k === 'goatee') return { under: shape('M91 133C93 129 107 129 109 133C111 141 105 148 100 148C95 148 89 141 91 133Z', col, 2.8), over: must }
  const full = sym('M100 113C106 113 114 114 120 119C128 117 136 110 141 99L143 101C144 118 140 132 128 144C120 152 110 156 100 156')
  return { under: `<path d="${full}M84 126.4a16 9.6 0 1 0 32 0a16 9.6 0 1 0 -32 0" fill="${col}" fill-rule="evenodd" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` + line(both('M130 112C134 120 132 130 126 138M122 140C118 146 112 150 106 152M134 124C138 130 136 138 132 142'), 1.7, mix(col, '#ffffff', 0.34), ' opacity=".55"'), over: must }
}

const METAL = '#f4b92b'
function earringsSvg(o, c) {
  const k = o.ears
  if (k === 'none' || o.hair === 'hijab' || o.hat === 'headphones') return ''
  const x0 = 100 + FACE[o.face].ear + 5.5, y = 106
  const make = (x) => (k === 'studs' ? `<circle cx="${x}" cy="${y + 2}" r="4.8" fill="${METAL}" stroke="${INK}" stroke-width="2"/><circle cx="${x - 1.4}" cy="${y + 0.6}" r="1.3" fill="#fff"/>`
    : k === 'hoops' ? `<circle cx="${x}" cy="${y + 10}" r="8.2" fill="none" stroke="${INK}" stroke-width="5.8"/><circle cx="${x}" cy="${y + 10}" r="8.2" fill="none" stroke="${METAL}" stroke-width="2.8"/>`
      : `<circle cx="${x}" cy="${y + 2}" r="3.4" fill="${METAL}" stroke="${INK}" stroke-width="1.8"/>` + line(`M${x} ${y + 5}L${x} ${y + 11}`, 1.8) + `<path d="M${x} ${y + 10}C${x + 6.4} ${y + 17} ${x + 6.4} ${y + 25} ${x} ${y + 26.6}C${x - 6.4} ${y + 25} ${x - 6.4} ${y + 17} ${x} ${y + 10}Z" fill="#1fa7a0" stroke="${INK}" stroke-width="2"/><circle cx="${x - 1.8}" cy="${y + 17}" r="1.5" fill="#fff" opacity=".8"/>`)
  return make(x0) + make(200 - x0)
}

// flowers are drawn about (0, 0) and set on the right of the head, over the hair, by the ear
const petal = (d, n, fillc, from = 0, step = 72, w = 2) => Array.from({ length: n }, (_, i) => `<path d="${d}" transform="rotate(${from + i * step})" fill="${fillc}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`).join('')
const FLOWER = {
  plumeria: () => `<g fill="#3f9b57" stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M-2 6C-12 4 -20 10 -22 20C-12 22 -4 16 -2 6Z"/><path d="M4 8C12 8 20 16 20 24C10 24 4 18 4 8Z"/></g>` +
    petal('M0 0C-8 -3 -10 -15 -2 -19C7 -18 8 -6 0 0Z', 5, '#fffaf0', -10, 72, 2) + `<circle r="3.4" fill="#f6c344" stroke="${INK}" stroke-width="1.6"/>` + line('M-2 -8C-3 -12 -2 -14 0 -16M5 -7C6 -10 5 -13 3 -15', 1.2, '#f0a1b0', ' opacity=".9"'),
  hibiscus: () => `<g fill="#3f9b57" stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M-4 8C-14 8 -22 14 -22 24C-12 24 -4 18 -4 8Z"/></g>` +
    petal('M0 0C-10 -5 -13 -17 -4 -21C5 -23 12 -16 8 -6C6 -2 3 0 0 0Z', 5, '#e03850', -4, 72, 2) + line('M0 0L6 -11', 2, '#f4b92b') + `<circle cx="6" cy="-12" r="2.2" fill="#f4b92b" stroke="${INK}" stroke-width="1.3"/><circle r="2.6" fill="#8e1830"/>`,
  jasmine: () => `<g fill="#3f9b57" stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M-6 10C-16 8 -24 14 -24 24C-14 24 -6 20 -6 10Z"/><path d="M8 12C16 10 24 18 22 26C12 26 6 20 8 12Z"/></g>` +
    [[-8, 4, 8], [8, 8, 7], [0, -9, 9]].map(([x, y, r]) => `<g transform="translate(${x} ${y})">${petal(`M0 0C-${r * 0.55} -${r * 0.4} -${r * 0.5} -${r * 1.05} 0 -${r * 1.1}C${r * 0.5} -${r * 1.05} ${r * 0.55} -${r * 0.4} 0 0Z`, 5, '#ffffff', 0, 72, 1.7)}<circle r="1.8" fill="#f6c344"/></g>`).join(''),
  marigold: () => `<g fill="#3f9b57" stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M-6 10C-16 10 -22 16 -22 25C-12 25 -6 19 -6 10Z"/></g>` +
    bumps(arcPts(0, 0, 9.6, 9.6, 0, 360, 10).slice(0, 9), 5.6, '#f08a1c', 1.6) + bumps(arcPts(0, 0, 4.6, 4.6, 0, 360, 7).slice(0, 6), 4.4, '#f7b733', 1.4) + `<circle r="2.6" fill="#c8641a"/>`,
}
function flowerSvg(o) {
  const f = FLOWER[o.flower]
  return f ? g(f(), 'transform="translate(150 78) scale(.84)"') : ''
}

// ---- frames and backgrounds ------------------------------------------------------------------------------------------

const stampPath = (() => {
  const n = 22, R = 86, r = rd(R * Math.sin(Math.PI / n))
  let d = ''
  for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2 - Math.PI / 2, x = rd(100 + R * Math.cos(a)), y = rd(100 + R * Math.sin(a)); d += k ? `A${r} ${r} 0 0 1 ${x} ${y}` : `M${x} ${y}` }
  return d + 'Z'
})()
const FRAME = {
  circle: 'M100 0A100 100 0 1 1 100 200A100 100 0 1 1 100 0Z',
  rounded: 'M52 0H148A52 52 0 0 1 200 52V148A52 52 0 0 1 148 200H52A52 52 0 0 1 0 148V52A52 52 0 0 1 52 0Z',
  arch: 'M0 200V100A100 100 0 0 1 200 100V200Z',
  stamp: stampPath,
}

const X = (x, y, col) => `<path d="M${x - 2.4} ${y - 2.4}l4.8 4.8m0 -4.8l-4.8 4.8" stroke="${col}" stroke-width="2.3" stroke-linecap="round" fill="none"/>`
const LANTERNS = [[28, 40, 9], [60, 20, 6], [152, 30, 10], [178, 74, 7], [20, 100, 6], [184, 122, 9], [34, 150, 8], [168, 160, 6], [112, 12, 5], [84, 178, 7]]

function bgSvg(o, c) {
  const col = colourOf(BGC, o.bgc, 'sun'), dark = mix(col, '#000000', 0.14), light = mix(col, '#ffffff', 0.42), id = c.id
  const base = `<rect width="200" height="200" fill="${col}"/>`
  const tiled = (w, h, inner, name) => { c.defs.push(`<pattern id="${id}-${name}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern>`); return base + `<rect width="200" height="200" fill="url(#${id}-${name})"/>` }
  switch (o.bg) {
    case 'glow':
      c.defs.push(`<radialGradient id="${id}-gl" cx="50%" cy="44%" r="64%"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${col}"/></radialGradient>`)
      return `<rect width="200" height="200" fill="url(#${id}-gl)"/>`
    case 'two': return base + fill('M0 0H200V66L0 132Z', light) + fill('M0 200V150L200 92V200Z', dark)
    case 'dots': return tiled(22, 22, `<circle cx="5.5" cy="5.5" r="4.4" fill="${dark}" opacity=".55"/><circle cx="16.5" cy="16.5" r="4.4" fill="${dark}" opacity=".55"/>`, 'dt')
    case 'rays': {
      let s = base
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, b = a + Math.PI / 16; s += `<path d="M100 96L${rd(100 + 220 * Math.cos(a))} ${rd(96 + 220 * Math.sin(a))}L${rd(100 + 220 * Math.cos(b))} ${rd(96 + 220 * Math.sin(b))}Z" fill="${dark}" opacity=".5"/>` }
      return s
    }
    case 'stitch': {
      const p = mix(col, '#ff2e88', 0.5), y = mix(col, '#ffd400', 0.62), w = mix(col, '#ffffff', 0.62), gr = mix(col, '#19c37d', 0.5)
      return tiled(32, 32, X(16, 16, p) + X(16, 8, y) + X(16, 24, y) + X(8, 16, y) + X(24, 16, y) + X(0, 0, w) + X(32, 0, w) + X(0, 32, w) + X(32, 32, w) + X(16, 0, gr) + X(16, 32, gr) + X(0, 16, gr) + X(32, 16, gr), 'sx')
    }
    case 'loom': {
      const lt = mix(col, '#ffffff', 0.5), dk = mix(col, '#000000', 0.22)
      return tiled(24, 24, `<rect width="24" height="24" fill="${dk}" opacity=".35"/><path d="M12 1L23 12L12 23L1 12Z" fill="none" stroke="${lt}" stroke-width="2.4"/><path d="M12 7L17 12L12 17L7 12Z" fill="${lt}"/><path d="M0 0L3 0L0 3ZM24 0L21 0L24 3ZM0 24L3 24L0 21ZM24 24L21 24L24 21Z" fill="${lt}"/>`, 'lm')
    }
    case 'lanna': {
      const gold = mix(col, '#b5832a', 0.82)
      return tiled(36, 36, `<path d="M18 2C25 9 27 11 34 18C27 25 25 27 18 34C11 27 9 25 2 18C9 11 11 9 18 2Z" fill="none" stroke="${gold}" stroke-width="1.9"/><circle cx="18" cy="18" r="3.2" fill="${gold}"/><path d="M18 8C20 12 20 12 24 14C20 16 20 16 18 20" fill="none" stroke="${gold}" stroke-width="1.3" opacity=".8"/><circle cx="0" cy="0" r="2" fill="${gold}"/><circle cx="36" cy="0" r="2" fill="${gold}"/><circle cx="0" cy="36" r="2" fill="${gold}"/><circle cx="36" cy="36" r="2" fill="${gold}"/>`, 'ln')
    }
    case 'lanterns': {
      const cs = ['#ff9f43', '#ff6b6b', '#ffbe5c']
      const one = ([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${rd(r * 2)}" fill="#ffd27a" opacity=".24"/><path d="M${rd(x - r * 0.7)} ${rd(y + r)}L${rd(x - r)} ${rd(y - r * 0.4)}C${rd(x - r)} ${rd(y - r * 1.5)} ${rd(x + r)} ${rd(y - r * 1.5)} ${rd(x + r)} ${rd(y - r * 0.4)}L${rd(x + r * 0.7)} ${rd(y + r)}Z" fill="${cs[i % 3]}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="${x}" cy="${rd(y + r * 0.15)}" rx="${rd(r * 0.42)}" ry="${rd(r * 0.55)}" fill="#fff6c8" opacity=".9"/>`
      return base + LANTERNS.map(one).join('')
    }
    default: return base
  }
}

// ---- assemble ---------------------------------------------------------------------------------------------------------------

const fn = (table, key, fb) => table[key] || table[fb]

/** The avatar as SVG text. size: pixels (the viewBox stays 200). opt.view: [x, y, w, h] to crop to; opt.bare: no background or frame. */
export function avatarSvg(o0, size = 200, opt = {}) {
  const o = normalizeAvatar(o0)
  const id = 'av' + hash(JSON.stringify([o, opt.view || 0, opt.bare ? 1 : 0]))
  const c = { ...paint(o), id, defs: [] }
  const h = { back: '', mid: '', front: '', ...fn(HAIR, o.hair, 'short')(c, o) }
  const hat = HAT[o.hat]
  if (hat?.keep) c.defs.push(`<clipPath id="${id}-keep"><path d="${hat.keep}"/></clipPath>`)
  const wrap = (s) => (hat?.keep && s ? g(s, `clip-path="url(#${id}-keep)"`) : s)
  const out = fn(OUTFIT, o.outfit, 'tee')(c), beard = beardSvg(o, c)
  const head = wrap(h.mid) + earsSvg(o, c) + faceSvg(o, c) + cheeksSvg(o, c) + noseSvg(o, c) + beard.under + mouthSvg(o, c) + beard.over + eyesSvg(o, c) + browsSvg(o, c) +
    wrap(h.front) + glassesSvg(o, c) + flowerSvg(o) + (hat ? hat.art(c) : '') + earringsSvg(o, c)
  const inner = g(wrap(h.back), HEAD) + g(fill(TORSO, c.skin) + (out.b || '') + neckSvg(o, c) + (typeof out === 'string' ? out : out.f), BODY) + g(head, HEAD)
  const view = opt.view || [0, 0, 200, 200], fp = FRAME[o.frame] || FRAME.circle
  let scene = inner
  if (!opt.bare) {
    c.defs.push(`<clipPath id="${id}-fr"><path d="${fp}"/></clipPath>`)
    scene = g(bgSvg(o, c) + inner, `clip-path="url(#${id}-fr)"`) + `<path d="${fp}" fill="none" stroke="${INK}" stroke-width="7" clip-path="url(#${id}-fr)"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.join(' ')}" width="${size}" height="${size}"><defs>${c.defs.join('')}</defs>${scene}</svg>`
}

const NONE = ['None', 'ไม่มี', 'မရှိ', '无']
const N = (id = 'none') => O(id, ...NONE)

// ---- every part, its options, and how a tile shows it ---------------------------------------------------
// key: the field in the options. tab: where the sheet puts it. type: 'tile' (a small drawing) or 'swatch' (a colour).
// view: the square of the 200 grid a tile shows. over: what a tile turns off so the option is what you see.
// bare: a tile without its background and frame.

const P = (key, tab, type, label, options, extra = {}) => ({ key, tab, type, label: L(...label), options, bare: true, ...extra })
const FEATURE = { hair: 'bald', hat: 'none', flower: 'none', ears: 'none', glasses: 'none' }

export const AV_PARTS = {
  skin: P('skin', 'face', 'swatch', ['Skin', 'สีผิว', 'အသားအရောင်', '肤色'], SKINS, { quiet: true }),
  face: P('face', 'face', 'tile', ['Face shape', 'รูปหน้า', 'မျက်နှာပုံ', '脸型'], [
    O('round', 'Round', 'กลม', 'ဝိုင်းဝိုင်း', '圆脸'), O('oval', 'Oval', 'รูปไข่', 'ဥပုံ', '鹅蛋脸'), O('square', 'Soft square', 'เหลี่ยมมน', 'ထောင့်ဝိုင်း', '方圆脸'),
  ], { view: [36, 32, 128, 128], over: { ...FEATURE, beard: 'none' } }),
  eyes: P('eyes', 'face', 'tile', ['Eyes', 'ดวงตา', 'မျက်လုံး', '眼睛'], [
    O('dot', 'Dots', 'จุดกลม', 'အစက်ကလေး', '圆点眼'), O('round', 'Round', 'กลมโต', 'ဝိုင်းဝိုင်း', '圆眼'), O('almond', 'Almond', 'เรียวรี', 'ဗာဒံစေ့ပုံ', '杏仁眼'),
    O('lashes', 'Lashes', 'ขนตางอน', 'မျက်တောင်ရှည်', '长睫毛'), O('happy', 'Smiling', 'ตายิ้ม', 'ပြုံးသောမျက်လုံး', '笑眼'), O('calm', 'Calm', 'ตาสงบ', 'ငြိမ်သက်သောမျက်လုံး', '温柔眼'),
    O('wink', 'Wink', 'ขยิบตา', 'မျက်စိမှိတ်', '眨眼'),
  ], { view: [52, 62, 96, 96], over: FEATURE }),
  brows: P('brows', 'face', 'tile', ['Eyebrows', 'คิ้ว', 'မျက်ခုံးမွေး', '眉毛'], [
    O('soft', 'Soft', 'โค้งอ่อน', 'ညင်သာသော', '柔和眉'), O('arched', 'Arched', 'โก่ง', 'ကွေးသော', '挑眉'), O('bold', 'Bold', 'เข้ม หนา', 'ထူသော', '浓眉'),
    O('thin', 'Thin', 'เรียวบาง', 'ပါးသော', '细眉'), O('level', 'Level', 'ตรง', 'ဖြောင့်သော', '平眉'),
  ], { view: [52, 58, 96, 96], over: FEATURE }),
  mouth: P('mouth', 'face', 'tile', ['Mouth', 'ปาก', 'ပါးစပ်', '嘴巴'], [
    O('smile', 'Smile', 'ยิ้ม', 'ပြုံး', '微笑'), O('gentle', 'Small smile', 'ยิ้มเล็ก', 'ပြုံးနုနု', '浅笑'), O('grin', 'Grin', 'ยิ้มเห็นฟัน', 'သွားပေါ်အောင်ပြုံး', '露齿笑'),
    O('open', 'Laugh', 'หัวเราะ', 'ရယ်မောသော', '大笑'), O('smirk', 'Half smile', 'ยิ้มมุมปาก', 'တစ်ဖက်ပြုံး', '歪嘴笑'), O('lips', 'Lipstick', 'ลิปสติก', 'နှုတ်ခမ်းနီ', '口红'),
    O('calm', 'Calm', 'ปากเรียบ', 'ရိုးရိုး', '平静'),
  ], { view: [56, 82, 88, 88], over: { ...FEATURE, beard: 'none' } }),
  cheeks: P('cheeks', 'face', 'tile', ['Cheeks', 'แก้ม', 'ပါးပြင်', '脸颊'], [
    O('on', 'Blush', 'แก้มแดง', 'ပါးနီ', '红脸蛋'), O('off', 'Plain', 'ไม่แต้ม', 'မနီ', '素脸'),
  ], { view: [44, 70, 112, 112], over: FEATURE }),

  hair: P('hair', 'hair', 'tile', ['Hair', 'ทรงผม', 'ဆံပင်ပုံစံ', '发型'], [
    O('buzz', 'Buzz cut', 'ผมสั้นเกรียน', 'ဆံပင်တိုတို', '寸头'), O('short', 'Short', 'ผมสั้น', 'ဆံပင်တို', '短发'), O('sidepart', 'Side part', 'แสกข้าง', 'ဘေးခြမ်းခွဲ', '侧分'),
    O('quiff', 'Quiff', 'ผมเซ็ตสูง', 'ရှေ့မြှင့်ဆံပင်', '飞机头'), O('bald', 'Bald', 'ศีรษะโล้น', 'ထိပ်ပြောင်', '光头'), O('balding', 'Thinning', 'ผมบาง', 'ဆံပင်ကျဲ', '稀发'),
    O('bob', 'Bob', 'ผมบ็อบ', 'ဘော့ဘ်ဆံပင်', '波波头'), O('pixie', 'Short cut', 'ผมซอยสั้น', 'ဆံပင်တိုကလေး', '精灵短发'), O('medium', 'Shoulder length', 'ผมประบ่า', 'ပခုံးဆံပင်', '及肩发'),
    O('long', 'Long', 'ผมยาวตรง', 'ဆံပင်ရှည်', '长直发'), O('wavy', 'Long waves', 'ผมยาวลอน', 'လှိုင်းဆံပင်ရှည်', '长波浪'), O('ponytail', 'Ponytail', 'ผมหางม้า', 'မြင်းမြီးကောက်', '马尾'),
    O('bun', 'High bun', 'มวยผมสูง', 'ဆံထုံးမြင့်', '丸子头'), O('lowbun', 'Low bun', 'มวยผมต่ำ', 'ဆံထုံးနိမ့်', '低发髻'), O('topknot', 'Top knot', 'มวยกลางศีรษะ', 'ထိပ်ဆံထုံး', '头顶发髻'),
    O('braid', 'Braid', 'ผมเปีย', 'ဆံကျစ်', '单辫'), O('braids', 'Two braids', 'ผมเปียคู่', 'ဆံကျစ်နှစ်ချောင်း', '双辫'), O('curly', 'Curly', 'ผมหยิก', 'ဆံပင်ကောက်', '卷发'),
    O('afro', 'Afro', 'ผมแอฟโฟร', 'ဆံပင်ဖောင်း', '蓬松卷发'), O('undercut', 'Undercut', 'ทรงอันเดอร์คัท', 'ဘေးတိုထိပ်မြင့်', '两侧短发'), O('hijab', 'Hijab', 'ฮิญาบ', 'ဟီဂျပ်', '希贾布'),
    O('scarf', 'Headscarf', 'ผ้าผูกผม', 'ခေါင်းစည်းပဝါ', '头巾'),
  ], { view: [16, 6, 168, 168], over: { hat: 'none', flower: 'none' } }),
  hairc: P('hairc', 'hair', 'swatch', ['Hair colour', 'สีผม', 'ဆံပင်အရောင်', '发色'], HAIRC),
  scarfc: P('scarfc', 'hair', 'swatch', ['Scarf colour', 'สีผ้า', 'ပဝါအရောင်', '头巾颜色'], CLOTH, { when: (o) => o.hair === 'hijab' || o.hair === 'scarf' }),

  outfit: P('outfit', 'clothes', 'tile', ['Clothes', 'เสื้อผ้า', 'အဝတ်အစား', '衣服'], [
    O('tee', 'T-shirt', 'เสื้อยืด', 'တီရှပ်', 'T恤'), O('collar', 'Shirt', 'เสื้อเชิ้ต', 'ရှပ်အင်္ကျီ', '衬衫'), O('chef', 'Chef jacket', 'ชุดเชฟ', 'စားဖိုမှူးအင်္ကျီ', '厨师服'),
    O('apron', 'Apron', 'ผ้ากันเปื้อน', 'အက်ပရွန်', '围裙'), O('hoodie', 'Hoodie', 'เสื้อฮู้ด', 'ဟူဒီ', '连帽衫'), O('blouse', 'Blouse', 'เสื้อสตรี', 'အမျိုးသမီးအင်္ကျီ', '女式上衣'),
    O('akha', 'Akha-style top', 'เสื้อปักลายอาข่า', 'အာခါပုံစံ ပန်းထိုးအင်္ကျီ', '阿卡风格刺绣上衣'), O('morhom', 'Mor hom indigo', 'เสื้อหม้อห้อม', 'မော်ဟွမ်အင်္ကျီ', '靛蓝土布衣'), O('suit', 'Suit', 'สูท', 'ဝတ်စုံ', '西装'),
    O('sports', 'Sports top', 'เสื้อกีฬา', 'အားကစားအင်္ကျီ', '运动衫'), O('wrap', 'Wrap tunic', 'เสื้อผูกข้าง', 'ဘေးချည်အင်္ကျီ', '交领上衣'), O('sweater', 'Sweater', 'สเวตเตอร์', 'ဆွယ်တာ', '毛衣'),
    O('overalls', 'Overalls', 'เอี๊ยม', 'ရှေ့ခံဘောင်းဘီ', '背带裤'),
  ], { view: [10, 66, 180, 180], space: 'frame', over: { hat: 'none', flower: 'none' } }),
  outc: P('outc', 'clothes', 'swatch', ['Clothes colour', 'สีเสื้อ', 'အဝတ်အရောင်', '衣服颜色'], CLOTH),

  glasses: P('glasses', 'extras', 'tile', ['Glasses', 'แว่นตา', 'မျက်မှန်', '眼镜'], [
    N(), O('round', 'Round', 'กลม', 'ဝိုင်းသော', '圆框'), O('square', 'Square', 'เหลี่ยม', 'လေးထောင့်', '方框'), O('cat', 'Cat eye', 'ทรงแมว', 'ကြောင်မျက်လုံး', '猫眼框'), O('sun', 'Sunglasses', 'แว่นกันแดด', 'နေကာမျက်မှန်', '墨镜'),
  ], { view: [50, 66, 100, 100], over: { hair: 'bald', hat: 'none', flower: 'none' } }),
  beard: P('beard', 'extras', 'tile', ['Beard', 'หนวดเครา', 'မုတ်ဆိတ်ခမ်းမွေး', '胡子'], [
    N(), O('stubble', 'Stubble', 'หนวดเคราบางๆ', 'မုတ်ဆိတ်တိုတို', '胡茬'), O('moustache', 'Moustache', 'หนวด', 'နှုတ်ခမ်းမွေး', '小胡子'), O('goatee', 'Goatee', 'เคราแพะ', 'ဆိတ်မုတ်ဆိတ်', '山羊胡'), O('beard', 'Full beard', 'เคราเต็มหน้า', 'မုတ်ဆိတ်အပြည့်', '络腮胡'),
  ], { view: [46, 78, 108, 108], over: FEATURE }),
  ears: P('ears', 'extras', 'tile', ['Earrings', 'ต่างหู', 'နားကပ်', '耳环'], [
    N(), O('studs', 'Studs', 'ต่างหูเม็ดเล็ก', 'နားကပ်ကလေး', '耳钉'), O('hoops', 'Hoops', 'ต่างหูห่วง', 'နားကွင်း', '耳圈'), O('drops', 'Drops', 'ต่างหูห้อย', 'နားဆွဲ', '耳坠'),
  ], { view: [30, 64, 140, 140], over: { hair: 'bald', hat: 'none', flower: 'none', glasses: 'none' } }),
  flower: P('flower', 'extras', 'tile', ['Flower by the ear', 'ดอกไม้ทัดหู', 'နားဘေးပန်း', '耳边的花'], [
    N(), O('plumeria', 'Plumeria', 'ลีลาวดี', 'ပန်းဖြူ', '鸡蛋花'), O('hibiscus', 'Hibiscus', 'ชบา', 'ပန်းနီ', '扶桑花'), O('jasmine', 'Jasmine', 'มะลิ', 'စံပယ်', '茉莉'), O('marigold', 'Marigold', 'ดาวเรือง', 'ပန်းဝါ', '万寿菊'),
  ], { view: [64, 30, 120, 120], over: { hat: 'none' } }),
  hat: P('hat', 'extras', 'tile', ['Hat', 'หมวก', 'ဦးထုပ်', '帽子'], [
    N(), O('cap', 'Cap', 'หมวกแก๊ป', 'ဦးထုပ်', '鸭舌帽'), O('bucket', 'Bucket hat', 'หมวกบักเก็ต', 'ဘတ်ကတ်ဦးထုပ်', '渔夫帽'), O('chef', 'Chef hat', 'หมวกเชฟ', 'စားဖိုမှူးဦးထုပ်', '厨师帽'),
    O('ngob', 'Straw hat', 'งอบ', 'ခမောက်', '斗笠'), O('beanie', 'Beanie', 'หมวกไหมพรม', 'သိုးမွေးဦးထုပ်', '针织帽'), O('headphones', 'Headphones', 'หูฟังครอบหู', 'နားကြပ်', '耳机'),
    O('wrap', 'Head wrap', 'ผ้าโพกศีรษะ', 'ခေါင်းပေါင်း', '缠头巾'), O('band', 'Headband', 'ผ้าคาดผม', 'ခေါင်းစည်းပတ်', '运动发带'),
  ], { view: [8, 0, 184, 184], over: {} }),
  hatc: P('hatc', 'extras', 'swatch', ['Hat colour', 'สีหมวก', 'ဦးထုပ်အရောင်', '帽子颜色'], CLOTH, { when: (o) => o.hat !== 'none' }),

  bg: P('bg', 'back', 'tile', ['Background', 'พื้นหลัง', 'နောက်ခံ', '背景'], [
    O('solid', 'Plain', 'สีเรียบ', 'အရောင်ရိုးရိုး', '纯色'), O('glow', 'Glow', 'เรืองแสง', 'ရောင်ခြည်', '光晕'), O('two', 'Two colours', 'สองสี', 'နှစ်ရောင်', '双色'),
    O('dots', 'Dots', 'จุด', 'အစက်', '圆点'), O('rays', 'Rays', 'รัศมี', 'ရောင်ခြည်လှိုင်း', '放射线'), O('stitch', 'Cross stitch', 'ปักกากบาท', 'ကန့်စပ်ချည်', '十字绣'),
    O('loom', 'Woven', 'ผ้าทอ', 'ယက်ကန်း', '织锦'), O('lanna', 'Lanna gold', 'ลายล้านนา', 'လန်နာရွှေ', '兰纳金纹'), O('lanterns', 'Lanterns', 'โคมไฟ', 'မီးအိမ်', '灯笼'),
  ], { view: [0, 0, 200, 200], space: 'frame', bare: false }),
  bgc: P('bgc', 'back', 'swatch', ['Background colour', 'สีพื้นหลัง', 'နောက်ခံအရောင်', '背景颜色'], BGC),
  frame: P('frame', 'back', 'tile', ['Frame', 'กรอบ', 'ဘောင်', '边框'], [
    O('circle', 'Circle', 'วงกลม', 'စက်ဝိုင်း', '圆形'), O('rounded', 'Rounded', 'สี่เหลี่ยมมน', 'ထောင့်ဝိုင်း', '圆角'), O('arch', 'Arch', 'ทรงโค้ง', 'ခုံးပုံ', '拱形'), O('stamp', 'Stamp', 'ตราประทับ', 'တံဆိပ်', '印章'),
  ], { view: [0, 0, 200, 200], space: 'frame', bare: false }),
}

export const AV_TABS = [
  { id: 'face', label: L('Face', 'หน้า', 'မျက်နှာ', '脸'), parts: ['skin', 'face', 'eyes', 'brows', 'mouth', 'cheeks'] },
  { id: 'hair', label: L('Hair', 'ผม', 'ဆံပင်', '头发'), parts: ['hair', 'hairc', 'scarfc'] },
  { id: 'clothes', label: L('Clothes', 'เสื้อผ้า', 'အဝတ်', '衣服'), parts: ['outfit', 'outc'] },
  { id: 'extras', label: L('Extras', 'เพิ่มเติม', 'အပို', '配饰'), parts: ['glasses', 'beard', 'ears', 'flower', 'hat', 'hatc'] },
  { id: 'back', label: L('Background', 'พื้นหลัง', 'နောက်ခံ', '背景'), parts: ['bg', 'bgc', 'frame'] },
]

// ---- options: defaults, checking, tiles ------------------------------------------------------------------------

export const AV_DEFAULT = {
  skin: 's4', face: 'oval', eyes: 'almond', brows: 'soft', mouth: 'smile', cheeks: 'on', hair: 'short', hairc: 'black',
  outfit: 'tee', outc: 'teal', glasses: 'none', beard: 'none', ears: 'none', flower: 'none', hat: 'none', hatc: 'red', scarfc: 'red',
  bg: 'glow', bgc: 'sun', frame: 'circle',
}
const HEXY = new Set(['hairc', 'outc', 'hatc', 'scarfc', 'bgc'])
const IDS = {}
for (const p of Object.values(AV_PARTS)) IDS[p.key] = new Set(p.options.map((x) => x.id))

/** Options made whole: a missing or unknown choice becomes the default; colours may also be #rrggbb. */
export function normalizeAvatar(o = {}) {
  const r = {}
  for (const [k, d] of Object.entries(AV_DEFAULT)) {
    const v = o?.[k]
    r[k] = IDS[k].has(v) || (HEXY.has(k) && isHex(v)) ? v : d
  }
  return r
}

/** One tile of the editor: the option v of a part, on the current character, cropped to where it shows. */
export function avatarTile(o, partId, v, size = 80) {
  const part = AV_PARTS[partId]
  return avatarSvg({ ...normalizeAvatar(o), ...(part.over || {}), [part.key]: v }, size, { view: viewOf(part), bare: part.bare })
}
/** A part's view is given on the head's own grid; the head is set smaller and the body higher, so the square moves with it. */
function viewOf(part) {
  const [x, y, w, h] = part.view
  if (part.space === 'body') return [x, y - 6, w, h]
  if (part.space === 'frame') return [x, y, w, h]
  return [rd(100 + (x - 100) * HS), rd(144 + (y - 150) * HS), rd(w * HS), rd(h * HS)]
}

/** The ids of a part's options shown for these options: a part with a `when` hides itself. */
export const partShown = (partId, o) => !AV_PARTS[partId].when || AV_PARTS[partId].when(o)

// ---- at random --------------------------------------------------------------------------------------------------

const wpick = (r, table) => { const tot = table.reduce((a, [, w]) => a + w, 0); let t = r() * tot; for (const [v, w] of table) { t -= w; if (t <= 0) return v } return table[table.length - 1][0] }
const pick = (r, a) => a[Math.floor(r() * a.length)]

const KIND_CLOTHES = {
  shop: [['apron', 3], ['collar', 3], ['tee', 3], ['akha', 1.5], ['morhom', 1.5], ['overalls', 1], ['blouse', 2]],
  food: [['chef', 3], ['apron', 4], ['tee', 2], ['collar', 1]],
  service: [['wrap', 3], ['collar', 3], ['tee', 2], ['blouse', 2], ['overalls', 1]],
  work: [['hoodie', 3], ['sweater', 3], ['collar', 3], ['suit', 2], ['tee', 2]],
  stay: [['morhom', 3], ['blouse', 3], ['collar', 3], ['akha', 1.5], ['apron', 1]],
  homes: [['suit', 4], ['collar', 4], ['blouse', 3], ['sweater', 1]],
  me: [['tee', 3], ['hoodie', 3], ['sweater', 2], ['collar', 2], ['blouse', 2], ['sports', 1], ['morhom', 1]],
  event: [['hoodie', 2], ['tee', 2], ['blouse', 2], ['suit', 2], ['akha', 2], ['sports', 1]],
  group: [['sports', 3], ['tee', 3], ['morhom', 2], ['collar', 2], ['sweater', 1], ['hoodie', 1]],
}
const SHORTS = ['buzz', 'short', 'sidepart', 'quiff', 'balding', 'undercut', 'topknot', 'curly', 'afro', 'pixie']
const LONGS = ['bob', 'medium', 'long', 'wavy', 'ponytail', 'bun', 'lowbun', 'braid', 'braids', 'pixie', 'curly']

/** A whole character from a seed (a number or any text), leaning toward the page's kind. Never a clash: one hat, no hat on a hijab,
 * facial hair only on short styles. */
export function randomAvatar(seed, kind = 'me') {
  const r = seeded(seed)
  const clothes = wpick(r, KIND_CLOTHES[kind] || KIND_CLOTHES.me)
  const long = r() < 0.5
  let hair = r() < 0.05 ? 'hijab' : r() < 0.04 ? 'scarf' : r() < 0.03 ? 'bald' : pick(r, long ? LONGS : SHORTS)
  const hairc = wpick(r, [['black', 40], ['espresso', 18], ['brown', 12], ['chestnut', 6], ['honey', 3], ['ginger', 2], ['grey', 7], ['white', 3], ['pink', 3], ['teal', 2], ['violet', 2]])
  const old = hairc === 'grey' || hairc === 'white'
  if (old && SHORTS.includes(hair) && r() < 0.5) hair = 'balding'
  const maskish = ['buzz', 'short', 'sidepart', 'quiff', 'balding', 'undercut', 'topknot', 'curly', 'afro', 'bald'].includes(hair)
  const hatTable = { food: [['chef', 4], ['cap', 1], ['beanie', 1]], shop: [['ngob', 2], ['cap', 2], ['bucket', 1]], event: [['headphones', 3], ['cap', 1], ['wrap', 1]], group: [['cap', 2], ['bucket', 2], ['band', 2]], stay: [['ngob', 1], ['bucket', 1]], service: [['cap', 1]] }[kind] || [['cap', 1], ['bucket', 1], ['beanie', 1]]
  let hat = r() < (kind === 'food' ? 0.4 : 0.22) ? wpick(r, hatTable) : 'none'
  if (hair === 'hijab' && !['none', 'chef', 'ngob'].includes(hat)) hat = 'none'
  if (hair === 'scarf' && hat !== 'none') hat = 'none'
  const o = {
    skin: wpick(r, [['s1', 3], ['s2', 10], ['s3', 16], ['s4', 18], ['s5', 16], ['s6', 12], ['s7', 9], ['s8', 7], ['s9', 5], ['s10', 4]]),
    face: pick(r, ['round', 'oval', 'square']),
    eyes: wpick(r, [['dot', 2], ['round', 3], ['almond', 4], ['lashes', long ? 4 : 1], ['happy', 3], ['calm', 2], ['wink', 1]]),
    brows: pick(r, ['soft', 'arched', 'bold', 'thin', 'level']),
    mouth: wpick(r, [['smile', 5], ['gentle', 3], ['grin', 3], ['open', 1.5], ['smirk', 1.5], ['lips', long ? 2 : 0.3], ['calm', 1]]),
    cheeks: r() < 0.55 ? 'on' : 'off',
    hair, hairc, outfit: clothes, outc: pick(r, CLOTH.filter((x) => x.id !== 'khaki').map((x) => x.id)),
    glasses: r() < 0.28 ? wpick(r, [['round', 3], ['square', 3], ['cat', long ? 2 : 0.3], ['sun', 1]]) : 'none',
    beard: maskish && r() < 0.34 ? wpick(r, [['stubble', 3], ['moustache', 2], ['goatee', 2], ['beard', 3]]) : 'none',
    ears: (long || r() < 0.2) && hair !== 'hijab' && r() < 0.5 ? pick(r, ['studs', 'hoops', 'drops']) : 'none',
    flower: long && hair !== 'hijab' && hat === 'none' && r() < 0.16 ? pick(r, ['plumeria', 'hibiscus', 'jasmine', 'marigold']) : 'none',
    hat, hatc: pick(r, CLOTH.map((x) => x.id)), scarfc: pick(r, CLOTH.filter((x) => x.id !== 'khaki').map((x) => x.id)),
    bg: pick(r, ['glow', 'solid', 'two', 'dots', 'rays', 'stitch', 'loom', 'lanna', 'lanterns']), bgc: pick(r, BGC.slice(0, 8).map((x) => x.id)), frame: 'circle',
  }
  if (o.hat === 'chef') { o.hatc = 'white'; if (r() < 0.6) o.outfit = 'chef' }
  if (o.hair === 'scarf' && o.scarfc === o.outc) o.scarfc = 'red'
  if (o.bg === 'lanterns') o.bgc = pick(r, ['night', 'indigo', 'red'])
  if (o.hat !== 'none' && o.hat !== 'headphones') { o.flower = 'none' }
  return normalizeAvatar(o)
}

// ---- ready characters for each kind of page ---------------------------------------------------------------------------
// A preset is a whole person without a background or frame: the sheet keeps the maker's own.

const PR = (id, en, th, my, zh, o) => ({ id, label: L(en, th, my, zh), o: normalizeAvatar(o) })

export const AV_PRESETS = {
  food: [
    PR('chef', 'Chef', 'เชฟ', 'စားဖိုမှူး', '厨师', { skin: 's4', face: 'round', hair: 'short', hairc: 'black', brows: 'bold', eyes: 'happy', mouth: 'grin', beard: 'moustache', hat: 'chef', hatc: 'white', outfit: 'chef', outc: 'white' }),
    PR('cook', 'Cook', 'คนครัว', 'ချက်ပြုတ်သူ', '掌勺', { skin: 's5', face: 'oval', hair: 'scarf', hairc: 'black', brows: 'soft', eyes: 'lashes', mouth: 'smile', ears: 'studs', scarfc: 'red', outfit: 'apron', outc: 'sky' }),
    PR('noodle', 'Noodle seller', 'คนขายก๋วยเตี๋ยว', 'ခေါက်ဆွဲရောင်းသူ', '面摊老板', { skin: 's5', face: 'square', hair: 'short', hairc: 'espresso', brows: 'bold', eyes: 'round', mouth: 'open', beard: 'stubble', hat: 'cap', hatc: 'orange', outfit: 'apron', outc: 'white' }),
    PR('grandma', 'Grandma’s kitchen', 'ครัวคุณยาย', 'အဘွားမီးဖိုချောင်', '外婆的厨房', { skin: 's4', face: 'round', hair: 'bun', hairc: 'grey', brows: 'soft', eyes: 'calm', mouth: 'gentle', glasses: 'round', ears: 'studs', outfit: 'blouse', outc: 'lime' }),
    PR('barista', 'Barista', 'บาริสต้า', 'ကော်ဖီဆိုင်သမား', '咖啡师', { skin: 's3', face: 'oval', hair: 'short', hairc: 'espresso', brows: 'level', eyes: 'almond', mouth: 'smirk', beard: 'stubble', cheeks: 'off', hat: 'beanie', hatc: 'indigo', outfit: 'apron', outc: 'brown' }),
    PR('baker', 'Baker', 'คนทำขนมอบ', 'မုန့်ဖုတ်သူ', '烘焙师', { skin: 's6', face: 'round', hair: 'curly', hairc: 'black', brows: 'arched', eyes: 'happy', mouth: 'open', ears: 'hoops', hat: 'band', hatc: 'pink', outfit: 'apron', outc: 'pink' }),
  ],
  shop: [
    PR('shopkeeper', 'Shopkeeper', 'เจ้าของร้าน', 'ဆိုင်ရှင်', '店主', { skin: 's3', face: 'oval', hair: 'bob', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', ears: 'studs', outfit: 'apron', outc: 'khaki' }),
    PR('potter', 'Potter', 'ช่างปั้นดิน', 'အိုးထိန်းသမား', '陶艺师', { skin: 's5', face: 'square', hair: 'scarf', hairc: 'espresso', brows: 'bold', eyes: 'happy', mouth: 'smile', beard: 'moustache', scarfc: 'teal', outfit: 'overalls', outc: 'khaki' }),
    PR('weaver', 'Weaver', 'ช่างทอผ้า', 'ရက်ကန်းသမား', '织布人', { skin: 's4', face: 'oval', hair: 'braid', hairc: 'black', brows: 'soft', eyes: 'lashes', mouth: 'smile', ears: 'hoops', outfit: 'akha', outc: 'black' }),
    PR('market', 'Market seller', 'คนขายของตลาด', 'ဈေးသည်', '市场摊主', { skin: 's5', face: 'round', hair: 'medium', hairc: 'black', brows: 'soft', eyes: 'happy', mouth: 'open', hat: 'ngob', hatc: 'red', outfit: 'morhom', outc: 'indigo' }),
    PR('elder', 'Shop elder', 'เจ้าของร้านสูงวัย', 'အသက်ကြီးသော ဆိုင်ရှင်', '老店主', { skin: 's4', face: 'square', hair: 'balding', hairc: 'grey', brows: 'bold', eyes: 'calm', mouth: 'gentle', beard: 'moustache', glasses: 'square', cheeks: 'off', outfit: 'collar', outc: 'sky' }),
    PR('online', 'Online seller', 'คนขายของออนไลน์', 'အွန်လိုင်းရောင်းသူ', '网店店主', { skin: 's3', face: 'oval', hair: 'short', hairc: 'black', brows: 'arched', eyes: 'wink', mouth: 'grin', hat: 'cap', hatc: 'blue', outfit: 'tee', outc: 'mustard' }),
  ],
  service: [
    PR('massage', 'Massage therapist', 'หมอนวด', 'အနှိပ်သည်', '按摩师', { skin: 's4', face: 'oval', hair: 'bun', hairc: 'black', brows: 'soft', eyes: 'calm', mouth: 'gentle', flower: 'jasmine', outfit: 'wrap', outc: 'teal' }),
    PR('barber', 'Barber', 'ช่างตัดผม', 'ဆံသဆရာ', '理发师', { skin: 's6', face: 'square', hair: 'quiff', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'smirk', beard: 'beard', cheeks: 'off', outfit: 'collar', outc: 'black' }),
    PR('stylist', 'Hair stylist', 'ช่างทำผม', 'ဆံပင်အလှပြင်သူ', '美发师', { skin: 's3', face: 'oval', hair: 'wavy', hairc: 'pink', brows: 'arched', eyes: 'lashes', mouth: 'lips', ears: 'hoops', outfit: 'collar', outc: 'black' }),
    PR('mechanic', 'Mechanic', 'ช่างซ่อม', 'စက်ပြင်ဆရာ', '维修师傅', { skin: 's7', face: 'round', hair: 'short', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'smile', beard: 'stubble', hat: 'cap', hatc: 'red', outfit: 'overalls', outc: 'white' }),
    PR('guide', 'Guide', 'ไกด์นำเที่ยว', 'လမ်းပြ', '导游', { skin: 's4', face: 'round', hair: 'ponytail', hairc: 'espresso', brows: 'soft', eyes: 'happy', mouth: 'grin', hat: 'bucket', hatc: 'lime', outfit: 'tee', outc: 'orange' }),
    PR('tailor', 'Tailor', 'ช่างตัดเสื้อ', 'အပ်ချုပ်သမား', '裁缝', { skin: 's2', face: 'oval', hair: 'medium', hairc: 'brown', brows: 'thin', eyes: 'almond', mouth: 'smile', glasses: 'cat', ears: 'drops', outfit: 'blouse', outc: 'violet' }),
  ],
  work: [
    PR('designer', 'Designer', 'นักออกแบบ', 'ဒီဇိုင်နာ', '设计师', { skin: 's2', face: 'oval', hair: 'bob', hairc: 'black', brows: 'level', eyes: 'almond', mouth: 'smile', glasses: 'round', outfit: 'sweater', outc: 'orange' }),
    PR('photographer', 'Photographer', 'ช่างภาพ', 'ဓာတ်ပုံဆရာ', '摄影师', { skin: 's5', face: 'square', hair: 'short', hairc: 'espresso', brows: 'soft', eyes: 'calm', mouth: 'smirk', beard: 'stubble', cheeks: 'off', hat: 'cap', hatc: 'black', outfit: 'tee', outc: 'khaki' }),
    PR('writer', 'Writer', 'นักเขียน', 'စာရေးဆရာ', '作家', { skin: 's3', face: 'round', hair: 'medium', hairc: 'grey', brows: 'soft', eyes: 'calm', mouth: 'gentle', glasses: 'cat', outfit: 'sweater', outc: 'green' }),
    PR('consultant', 'Consultant', 'ที่ปรึกษา', 'အကြံပေး', '顾问', { skin: 's4', face: 'oval', hair: 'sidepart', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', glasses: 'square', cheeks: 'off', outfit: 'suit', outc: 'indigo' }),
    PR('artist', 'Artist', 'ศิลปิน', 'ပန်းချီဆရာ', '艺术家', { skin: 's7', face: 'round', hair: 'curly', hairc: 'espresso', brows: 'arched', eyes: 'happy', mouth: 'open', ears: 'drops', outfit: 'overalls', outc: 'pink' }),
    PR('developer', 'Developer', 'นักพัฒนา', 'ဆော့ဖ်ဝဲလ်ရေးသူ', '开发者', { skin: 's3', face: 'square', hair: 'short', hairc: 'black', brows: 'level', eyes: 'dot', mouth: 'smile', glasses: 'round', cheeks: 'off', hat: 'headphones', hatc: 'black', outfit: 'hoodie', outc: 'violet' }),
  ],
  stay: [
    PR('host', 'Guesthouse host', 'เจ้าของเกสต์เฮาส์', 'တည်းခိုခန်းပိုင်ရှင်', '民宿主人', { skin: 's4', face: 'oval', hair: 'long', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', ears: 'drops', flower: 'plumeria', outfit: 'morhom', outc: 'indigo' }),
    PR('hostman', 'Host', 'เจ้าของที่พัก', 'အိမ်ရှင်', '房东', { skin: 's5', face: 'round', hair: 'short', hairc: 'black', brows: 'bold', eyes: 'happy', mouth: 'grin', beard: 'moustache', outfit: 'morhom', outc: 'indigo' }),
    PR('manager', 'Hotel manager', 'ผู้จัดการโรงแรม', 'ဟိုတယ်မန်နေဂျာ', '酒店经理', { skin: 's3', face: 'oval', hair: 'bun', hairc: 'black', brows: 'arched', eyes: 'lashes', mouth: 'lips', ears: 'studs', outfit: 'suit', outc: 'black' }),
    PR('grandmother', 'Grandmother host', 'คุณยายเจ้าบ้าน', 'အဘွားအိမ်ရှင်', '奶奶房东', { skin: 's5', face: 'round', hair: 'lowbun', hairc: 'grey', brows: 'soft', eyes: 'calm', mouth: 'gentle', ears: 'hoops', outfit: 'akha', outc: 'black' }),
    PR('hostel', 'Hostel host', 'เจ้าของโฮสเทล', 'ဟော်စတယ်ပိုင်ရှင်', '青旅老板', { skin: 's6', face: 'square', hair: 'short', hairc: 'black', brows: 'level', eyes: 'round', mouth: 'smirk', beard: 'goatee', cheeks: 'off', hat: 'cap', hatc: 'teal', outfit: 'tee', outc: 'sky' }),
    PR('breakfast', 'Breakfast host', 'คนทำอาหารเช้า', 'မနက်စာပြင်သူ', '早餐师傅', { skin: 's5', face: 'oval', hair: 'scarf', hairc: 'black', brows: 'soft', eyes: 'happy', mouth: 'smile', scarfc: 'mustard', outfit: 'apron', outc: 'lime' }),
  ],
  homes: [
    PR('agent', 'Estate agent', 'นายหน้าอสังหาฯ', 'အိမ်ခြံမြေပွဲစား', '房产经纪', { skin: 's3', face: 'oval', hair: 'sidepart', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', cheeks: 'off', outfit: 'suit', outc: 'indigo' }),
    PR('agentw', 'Property agent', 'ตัวแทนขายบ้าน', 'အိမ်ရောင်းအကျိုးဆောင်', '置业顾问', { skin: 's4', face: 'round', hair: 'bob', hairc: 'espresso', brows: 'arched', eyes: 'lashes', mouth: 'smile', ears: 'studs', outfit: 'suit', outc: 'black' }),
    PR('builder', 'Builder', 'ผู้รับเหมา', 'ဆောက်လုပ်ရေးသမား', '建筑承包商', { skin: 's6', face: 'square', hair: 'short', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'grin', beard: 'stubble', hat: 'cap', hatc: 'mustard', outfit: 'collar', outc: 'khaki' }),
    PR('landlady', 'Landlady', 'เจ้าของบ้านเช่า', 'အိမ်ငှားပိုင်ရှင်', '房东太太', { skin: 's4', face: 'round', hair: 'bun', hairc: 'grey', brows: 'soft', eyes: 'calm', mouth: 'smile', glasses: 'round', ears: 'studs', outfit: 'blouse', outc: 'teal' }),
    PR('architect', 'Architect', 'สถาปนิก', 'ဗိသုကာ', '建筑师', { skin: 's2', face: 'oval', hair: 'short', hairc: 'black', brows: 'level', eyes: 'almond', mouth: 'gentle', glasses: 'round', cheeks: 'off', outfit: 'sweater', outc: 'black' }),
    PR('caretaker', 'Caretaker', 'คนดูแลบ้าน', 'အိမ်စောင့်', '看管人', { skin: 's6', face: 'square', hair: 'balding', hairc: 'grey', brows: 'bold', eyes: 'calm', mouth: 'smile', beard: 'moustache', hat: 'ngob', hatc: 'green', outfit: 'overalls', outc: 'brown' }),
  ],
  me: [
    PR('runner', 'Runner', 'นักวิ่ง', 'ပြေးသူ', '跑步者', { skin: 's4', face: 'oval', hair: 'ponytail', hairc: 'black', brows: 'soft', eyes: 'happy', mouth: 'grin', hat: 'band', hatc: 'pink', outfit: 'sports', outc: 'teal' }),
    PR('musician', 'Musician', 'นักดนตรี', 'ဂီတပညာရှင်', '音乐人', { skin: 's5', face: 'square', hair: 'short', hairc: 'black', brows: 'level', eyes: 'calm', mouth: 'smirk', beard: 'stubble', cheeks: 'off', hat: 'beanie', hatc: 'black', outfit: 'hoodie', outc: 'mustard' }),
    PR('student', 'Student', 'นักเรียน', 'ကျောင်းသား', '学生', { skin: 's3', face: 'round', hair: 'curly', hairc: 'black', brows: 'soft', eyes: 'dot', mouth: 'grin', glasses: 'round', outfit: 'tee', outc: 'blue' }),
    PR('maker', 'Maker', 'คนทำงานฝีมือ', 'လက်မှုပညာသည်', '手艺人', { skin: 's6', face: 'oval', hair: 'scarf', hairc: 'black', brows: 'arched', eyes: 'happy', mouth: 'smile', ears: 'hoops', scarfc: 'red', outfit: 'overalls', outc: 'mustard' }),
    PR('elder', 'Elder', 'ผู้อาวุโส', 'လူကြီး', '长者', { skin: 's5', face: 'square', hair: 'balding', hairc: 'white', brows: 'bold', eyes: 'calm', mouth: 'gentle', beard: 'moustache', glasses: 'square', cheeks: 'off', outfit: 'morhom', outc: 'indigo' }),
    PR('me', 'Me', 'ฉันเอง', 'ကိုယ်တိုင်', '我', { skin: 's4', face: 'oval', hair: 'short', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', outfit: 'tee', outc: 'teal' }),
  ],
  event: [
    PR('dj', 'DJ', 'ดีเจ', 'ဒီဂျေ', 'DJ', { skin: 's4', face: 'square', hair: 'short', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'grin', glasses: 'sun', cheeks: 'off', hat: 'headphones', hatc: 'red', outfit: 'hoodie', outc: 'black' }),
    PR('singer', 'Singer', 'นักร้อง', 'အဆိုတော်', '歌手', { skin: 's3', face: 'oval', hair: 'wavy', hairc: 'espresso', brows: 'arched', eyes: 'lashes', mouth: 'lips', ears: 'drops', outfit: 'blouse', outc: 'red' }),
    PR('mc', 'Host on stage', 'พิธีกร', 'အခမ်းအနားမှူး', '主持人', { skin: 's5', face: 'oval', hair: 'quiff', hairc: 'black', brows: 'bold', eyes: 'happy', mouth: 'grin', beard: 'moustache', cheeks: 'off', outfit: 'suit', outc: 'indigo' }),
    PR('festival', 'Festival', 'งานเทศกาล', 'ပွဲတော်', '节日', { skin: 's4', face: 'round', hair: 'braids', hairc: 'black', brows: 'soft', eyes: 'happy', mouth: 'open', ears: 'hoops', flower: 'marigold', outfit: 'akha', outc: 'black' }),
    PR('organizer', 'Organizer', 'ผู้จัดงาน', 'စီစဉ်သူ', '组织者', { skin: 's6', face: 'square', hair: 'short', hairc: 'espresso', brows: 'level', eyes: 'round', mouth: 'smile', beard: 'stubble', hat: 'cap', hatc: 'orange', outfit: 'collar', outc: 'white' }),
    PR('dancer', 'Dancer', 'นักเต้น', 'ကခုန်သူ', '舞者', { skin: 's5', face: 'oval', hair: 'bun', hairc: 'black', brows: 'arched', eyes: 'almond', mouth: 'smile', ears: 'drops', flower: 'hibiscus', outfit: 'wrap', outc: 'pink' }),
  ],
  group: [
    PR('leader', 'Club leader', 'หัวหน้าชมรม', 'အသင်းခေါင်းဆောင်', '社团负责人', { skin: 's4', face: 'round', hair: 'pixie', hairc: 'espresso', brows: 'soft', eyes: 'happy', mouth: 'grin', outfit: 'sports', outc: 'blue' }),
    PR('runnerg', 'Runner', 'นักวิ่ง', 'ပြေးသူ', '跑步者', { skin: 's6', face: 'square', hair: 'buzz', hairc: 'black', brows: 'bold', eyes: 'round', mouth: 'smile', cheeks: 'off', hat: 'band', hatc: 'white', outfit: 'sports', outc: 'red' }),
    PR('teacher', 'Teacher', 'ครู', 'ဆရာ/ဆရာမ', '老师', { skin: 's3', face: 'oval', hair: 'medium', hairc: 'black', brows: 'soft', eyes: 'almond', mouth: 'smile', glasses: 'cat', outfit: 'sweater', outc: 'teal' }),
    PR('village', 'Village elder', 'ผู้ใหญ่บ้าน', 'ကျေးရွာလူကြီး', '村长', { skin: 's5', face: 'square', hair: 'balding', hairc: 'grey', brows: 'bold', eyes: 'calm', mouth: 'gentle', beard: 'moustache', cheeks: 'off', hat: 'wrap', hatc: 'white', outfit: 'morhom', outc: 'indigo' }),
    PR('volunteer', 'Volunteer', 'อาสาสมัคร', 'စေတနာ့ဝန်ထမ်း', '志愿者', { skin: 's4', face: 'round', hair: 'ponytail', hairc: 'black', brows: 'soft', eyes: 'happy', mouth: 'smile', hat: 'bucket', hatc: 'green', outfit: 'tee', outc: 'lime' }),
    PR('choir', 'Choir', 'คณะประสานเสียง', 'တေးဂီတအဖွဲ့', '合唱团', { skin: 's5', face: 'oval', hair: 'lowbun', hairc: 'espresso', brows: 'soft', eyes: 'happy', mouth: 'open', ears: 'studs', flower: 'jasmine', outfit: 'blouse', outc: 'violet' }),
  ],
}
