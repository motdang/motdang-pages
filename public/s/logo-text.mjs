// logo-text.mjs — text for logos: Thai-aware clusters and line breaks, fitting a name to a box,
// text set on an arc. A Thai vowel or tone mark stays on its consonant, and a vowel written
// before its consonant (เ แ โ ใ ไ) travels with it, so no mark is ever left behind on a curve.

export const FALLBACK = '"Noto Sans Thai","Leelawadee UI","Thonburi","Noto Sans Myanmar","Myanmar Text","PingFang SC","Microsoft YaHei",system-ui,sans-serif'
const THAI = /[฀-๿]/
const LEAD = /^[เ-ไ]$/
const TRAIL = /^[ะา]$/

export const hasThai = (s) => THAI.test(String(s || ''))

/** False for scripts whose letters change shape with their neighbours (Burmese, Khmer, Lao, Indic): they are not set one cluster at a time round a curve. */
export const arcSafe = (s) => !/[\u0900-\u0DFF\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF]/.test(String(s || ''))

let gseg, wseg
function segmenters() {
  if (gseg !== undefined) return
  try { gseg = new Intl.Segmenter('th', { granularity: 'grapheme' }); wseg = new Intl.Segmenter('th', { granularity: 'word' }) } catch { gseg = null; wseg = null }
}

export function graphemes(s) {
  segmenters()
  s = String(s ?? '')
  if (gseg) return Array.from(gseg.segment(s), (x) => x.segment)
  return s.match(/\P{M}\p{M}*/gu) || []
}

/** What a curve can place one piece at a time: a consonant with its marks, a leading vowel with its consonant. */
export function clusters(s) {
  const g = graphemes(s), out = []
  for (let i = 0; i < g.length; i++) {
    let c = g[i]
    if (LEAD.test(c) && i + 1 < g.length && THAI.test(g[i + 1])) c += g[++i]
    while (i + 1 < g.length && TRAIL.test(g[i + 1]) && THAI.test(c)) c += g[++i]
    out.push(c)
  }
  return out
}

/** Pieces a line may break between: a word with the space after it; punctuation sticks to the word before. */
export function units(s) {
  segmenters()
  s = String(s ?? '').trim()
  const toks = wseg ? Array.from(wseg.segment(s), (x) => x.segment) : s.split(/(\s+)/).filter(Boolean)
  const out = []
  for (const t of toks) {
    if (out.length && (/^\s+$/.test(t) || /^[\p{P}\p{S}]+$/u.test(t))) out[out.length - 1] += t
    else out.push(t)
  }
  return out
}

const SKIP_EN = new Set(['the', 'a', 'an', 'of', 'and', 'at', 'in', 'on', 'for', 'by', 'to', 'de', 'la', 'le', 'el'])
const SKIP_TH = new Set(['ร้าน', 'ห้าง', 'บริษัท', 'โรงแรม', 'ที่พัก', 'คลินิก'])

/** Up to two letters for a monogram: the first of two words (small joining words left out), or Thai consonants without their marks. */
export function initials(name) {
  const s = String(name || '').trim()
  if (!s) return ''
  if (hasThai(s) && !/[a-z]/i.test(s)) {
    const firstConsonant = (w) => (w.match(/[ก-ฮ]/) || [''])[0]
    let ws = units(s).map((w) => w.trim()).filter(Boolean)
    if (ws.length > 1 && SKIP_TH.has(ws[0])) ws = ws.slice(1)
    const a = firstConsonant(ws[0] || s)
    const b = ws.length > 1 ? firstConsonant(ws[1]) : ''
    return a + b
  }
  let words = s.split(/[\s·\-_.&]+/).filter((w) => /[\p{L}\p{N}]/u.test(w))
  const strong = words.filter((w) => !SKIP_EN.has(w.toLowerCase()))
  if (strong.length) words = strong
  const first = (w) => graphemes(w)[0] || ''
  const two = words.length > 1 ? first(words[0]) + first(words[1]) : graphemes(words[0] || '').length <= 3 ? words[0] : first(words[0])
  return two.toUpperCase()
}

export const fontStr = (family, weight, size, style = '') => `${style ? style + ' ' : ''}${weight} ${size}px ${family}, ${FALLBACK}`

export function width(ctx, s, font) {
  ctx.font = font
  ctx.textAlign = 'left'
  return ctx.measureText(s).width
}

/** Width, ascent and descent of the ink of a string. */
export function ink(ctx, s, font) {
  ctx.font = font
  ctx.textAlign = 'left'
  const m = ctx.measureText(s)
  return { w: m.width, asc: m.actualBoundingBoxAscent || 0, desc: m.actualBoundingBoxDescent || 0, l: m.actualBoundingBoxLeft || 0, r: m.actualBoundingBoxRight || m.width }
}

/** Width of a line with tracking (in em) between clusters. */
export function trackedWidth(ctx, s, font, size, track = 0) {
  const w = width(ctx, s, font)
  if (!track || hasThai(s)) return w
  return w + track * size * Math.max(0, graphemes(s).length - 1)
}

/** Draw a line, with tracking, at x (left, center or right of the line) on baseline y. */
export function line(ctx, s, x, y, o = {}) {
  const { font, align = 'left', track = 0, size = 0 } = o
  if (font) ctx.font = font
  ctx.textBaseline = 'alphabetic'
  const gap = track && !hasThai(s) ? track * size : 0
  if (!gap) {
    ctx.textAlign = align
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || size * 0.08; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y) }
    if (o.fill !== null) { if (o.fill) ctx.fillStyle = o.fill; ctx.fillText(s, x, y) }
    return
  }
  const g = graphemes(s), fnt = ctx.font
  const total = trackedWidth(ctx, s, fnt, size, track)
  const px = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  ctx.textAlign = 'left'
  let done = '', n = 0
  for (const c of g) {
    const at = px + (done ? width(ctx, done, fnt) : 0) + gap * n
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || size * 0.08; ctx.lineJoin = 'round'; ctx.strokeText(c, at, y) }
    if (o.fill !== null) { if (o.fill) ctx.fillStyle = o.fill; ctx.fillText(c, at, y) }
    done += c; n++
  }
}

function breakAt(list, cuts) {
  const out = []
  let from = 0
  for (const c of [...cuts, list.length]) { out.push(list.slice(from, c).join('').trim()); from = c }
  return out.filter(Boolean)
}

/** The lines of text in n rows with the least ragged edge, breaking only between words. */
export function balance(ctx, text, font, n) {
  text = String(text).trim()
  const u = units(text)
  if (n <= 1) return [text]
  const cost = (lines) => Math.max(...lines.map((l) => width(ctx, l, font)))
  let list = u
  if (u.length < n) {
    const cl = clusters(text)
    if (cl.length < 16) return [text]
    list = cl
  }
  let best = null
  const tryCuts = (cuts) => { const l = breakAt(list, cuts), c = cost(l); if (!best || c < best.c - 0.01) best = { l, c } }
  if (n === 2) for (let a = 1; a < list.length; a++) tryCuts([a])
  else for (let a = 1; a < list.length - 1; a++) for (let b = a + 1; b < list.length; b++) tryCuts([a, b])
  return best ? best.l : [text]
}

/**
 * A name in a box. Tries one row, two, three; keeps the one that sets the largest type.
 * o: maxW, maxH, maxLines, maxSize, minSize, track (em), lhk, bias (0..1, the cost of each extra row)
 * Returns { lines, size, w, h, asc, desc, lh, font } with the font function applied at size.
 */
export function fitName(ctx, text, fontFn, o = {}) {
  const { maxW = 900, maxH = 1e9, maxLines = 2, maxSize = 200, minSize = 14, track = 0, lhk = 1, bias = 0.9 } = o
  const th = hasThai(text)
  const lhBase = (th ? 1.32 : 1.08) * lhk
  let best = null
  for (let n = 1; n <= maxLines; n++) {
    const ref = fontFn(100)
    const lines = balance(ctx, text, ref, n)
    if (lines.length < n && n > 1) break
    const wide = Math.max(...lines.map((l) => { const m = ink(ctx, l, ref); return Math.max(trackedWidth(ctx, l, ref, 100, track), m.l + m.r) }))
    let size = Math.min(maxSize, (maxW / wide) * 100)
    const tall = lines.length * lhBase
    if (tall * size > maxH) size = maxH / tall
    const score = size * bias ** (lines.length - 1)
    if (!best || score > best.score) best = { lines, size, score }
  }
  const size = Math.max(minSize * 0.5, Math.min(best.size, maxSize))
  const font = fontFn(size)
  let asc = 0, desc = 0, w = 0
  for (const l of best.lines) {
    const m = ink(ctx, l, font)
    asc = Math.max(asc, m.asc); desc = Math.max(desc, m.desc)
    w = Math.max(w, trackedWidth(ctx, l, font, size, track), m.l + m.r)
  }
  const lh = size * lhBase
  return { lines: best.lines, size, w, asc, desc, lh, h: asc + desc + (best.lines.length - 1) * lh, font, track }
}

/** Draw a fitted block with the first baseline at y; align 'center' puts x at the middle of each row. */
export function drawBlock(ctx, b, x, y, o = {}) {
  const { align = 'center', fill, stroke, lw } = o
  b.lines.forEach((l, i) => line(ctx, l, x, y + i * b.lh, { font: b.font, align, track: b.track, size: b.size, fill, stroke, lw }))
}

/** The angle a string takes on a circle of radius r at size 1 em (so size scales it). */
export function arcAngle(ctx, s, font, size, r, track = 0) {
  return trackedWidth(ctx, s, font, size, track) / r
}

/**
 * A string set on an arc, one cluster at a time. dir 'top': baseline on the circle, tops outward,
 * reading clockwise. dir 'bottom': tops inward, reading anticlockwise along the bottom.
 * mid is the angle (radians, canvas) at the middle of the string. Returns the angle spanned.
 */
export function arcText(ctx, s, o) {
  const { cx, cy, r, mid, dir = 'top', font, size, track = 0, fill, stroke, lw } = o
  const cl = clusters(s)
  if (!cl.length) return 0
  ctx.font = font
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  const gap = hasThai(s) ? 0 : track * size
  const widths = cl.map((c) => ctx.measureText(c).width)
  const starts = []
  let acc = '', total = 0
  cl.forEach((c, i) => {
    starts.push(ctx.measureText(acc).width + gap * i)
    acc += c
  })
  total = ctx.measureText(acc).width + gap * (cl.length - 1)
  const span = total / r
  const sgn = dir === 'top' ? 1 : -1
  const a0 = mid - sgn * span / 2
  cl.forEach((c, i) => {
    const a = a0 + sgn * (starts[i] + widths[i] / 2) / r
    ctx.save()
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a))
    ctx.rotate(dir === 'top' ? a + Math.PI / 2 : a - Math.PI / 2)
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || size * 0.08; ctx.lineJoin = 'round'; ctx.strokeText(c, 0, 0) }
    if (fill) { ctx.fillStyle = fill; ctx.fillText(c, 0, 0) }
    ctx.restore()
  })
  return span
}

/** Size that sets s across at most maxSpan radians of a circle of radius r. */
export function arcFit(ctx, s, fontFn, r, maxSpan, maxSize, minSize, track = 0) {
  const ref = fontFn(100)
  const w1 = trackedWidth(ctx, s, ref, 100, track) / 100
  const size = (maxSpan * r) / w1
  return Math.max(minSize, Math.min(maxSize, size))
}
