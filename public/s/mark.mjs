// mark.mjs — an avatar or a cover made from parts (Nan 2026-10-15: "design from elements
// provided in a dashboard"): a shape, a colour, a pattern, a dingbat, letters, a typeface.
// Drawn on a canvas with the dingbat library (window.Dingbats) and uploaded like a photo.

export const SHAPES = ['circle', 'squircle', 'stamp', 'square']
export const PATTERNS = ['plain', 'rays', 'dots', 'rings', 'tiles', 'stripes']
export const MARK_COLOURS = ['#f04a00', '#e2412e', '#e85a8b', '#8e4fa8', '#3a7bd5', '#22386b', '#1f9aa6', '#2e8b57', '#62b04a', '#e9b43b', '#f7d046', '#c98a4b', '#1e1e1e', '#fff1d0']
export const FACES = { Prompt: '600', Chonburi: '400', Sriracha: '400' }

const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
/** Ink that reads on bg. */
export const inkOn = (bg) => (lum(bg) > 0.36 ? '#1e1e1e' : '#ffffff')
const mix = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')

/** Up to two letters from a name: the first of each of two words, or the first Thai consonant. */
export function initials(name) {
  const s = String(name || '').trim()
  if (!s) return ''
  const th = /[ก-ฮ]/.exec(s)
  if (th && !/[a-z]/i.test(s)) return th[0]
  const words = s.split(/[\s·\-_.]+/).filter((w) => /[\p{L}\p{N}]/u.test(w))
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || '').toUpperCase()
}

export function markDefaults(name = '', accent = '#f04a00') {
  return { shape: 'circle', bg: accent, pat: 'rays', glyph: '', letters: initials(name), font: 'Prompt', ink: '' }
}

let loaded = null
/** The three typefaces the maker can pick, from the page fonts. */
export function loadFaces() {
  if (loaded || typeof FontFace === 'undefined') return loaded || Promise.resolve()
  const sub = { latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122', thai: 'U+0E01-0E5B,U+200C-200D,U+25CC' }
  const files = { Prompt: 'prompt-600', Chonburi: 'chonburi-400', Sriracha: 'sriracha-400' }
  loaded = Promise.all(Object.entries(files).flatMap(([n, f]) => ['latin', 'thai'].map((s) => {
    const ff = new FontFace(n, `url(/s/fonts/${f}-${s}.woff2)`, { weight: FACES[n], unicodeRange: sub[s] })
    document.fonts.add(ff)
    return ff.load().catch(() => null)
  })))
  return loaded
}

function shapePath(ctx, shape, x, y, s) {
  ctx.beginPath()
  if (shape === 'circle') ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2)
  else if (shape === 'square') ctx.rect(x, y, s, s)
  else if (shape === 'squircle') {
    const n = 4.2, c = s / 2
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t)
      const px = x + c + c * Math.sign(ct) * Math.abs(ct) ** (2 / n), py = y + c + c * Math.sign(st) * Math.abs(st) ** (2 / n)
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
  } else { // stamp: a scalloped edge
    const c = s / 2, k = 22
    for (let i = 0; i <= k * 8; i++) {
      const t = (i / (k * 8)) * Math.PI * 2, r = c * (0.94 + 0.06 * Math.cos(t * k))
      const px = x + c + r * Math.cos(t), py = y + c + r * Math.sin(t)
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
  }
  ctx.closePath()
}

function glyphWidth(D, name, size) {
  const c = document.createElement('canvas').getContext('2d')
  return D.draw(c, name, { size })
}

function pattern(ctx, o, w, h, D) {
  const tone = mix(o.bg, lum(o.bg) > 0.36 ? '#000000' : '#ffffff', 0.13), u = Math.min(w, h)
  ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = tone; ctx.strokeStyle = tone
  if (o.pat === 'rays') {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h), n = 18
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + Math.PI / n); ctx.closePath(); ctx.fill() }
  } else if (o.pat === 'dots') {
    const g = u * 0.11, r = u * 0.024
    for (let y = 0, row = 0; y < h + g; y += g * 0.87, row++) for (let x = row % 2 ? g / 2 : 0; x < w + g; x += g) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() }
  } else if (o.pat === 'rings') {
    ctx.lineWidth = u * 0.035
    for (let r = u * 0.08; r < Math.hypot(w, h) / 2; r += u * 0.1) { ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke() }
  } else if (o.pat === 'stripes') {
    ctx.lineWidth = u * 0.045
    for (let x = -h; x < w + h; x += u * 0.12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke() }
  } else if (o.pat === 'tiles' && D) { // drawn on a layer of its own, then laid down faint
    const name = o.glyph || 'sparkle', g = u * 0.2, sz = u * 0.1
    const layer = document.createElement('canvas'); layer.width = w; layer.height = h
    const lc = layer.getContext('2d')
    for (let y = 0, row = 0; y < h + g; y += g, row++) for (let x = row % 2 ? g / 2 : 0; x < w + g; x += g) {
      lc.save(); lc.translate(x, y); lc.rotate(((row + Math.round(x / g)) % 2 ? 1 : -1) * 0.2)
      D.draw(lc, name, { size: sz, x: -sz / 2, y: -sz / 2, look: 'mono', ink: tone })
      lc.restore()
    }
    ctx.save(); ctx.globalAlpha = 0.28; ctx.drawImage(layer, 0, 0); ctx.restore()
  }
}

/** Words broken into at most `max` lines that fit `width` at the largest size from `big` down. */
function wrap(ctx, text, width, big, small, max, face) {
  const words = String(text).split(/\s+/).filter(Boolean)
  for (let fs = big; fs >= small; fs *= 0.92) {
    ctx.font = face(fs)
    const lines = []
    let cur = ''
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd
      if (ctx.measureText(t).width <= width || !cur) cur = t
      else { lines.push(cur); cur = wd }
    }
    if (cur) lines.push(cur)
    if (lines.length <= max && lines.every((l) => ctx.measureText(l).width <= width)) return { fs, lines }
  }
  ctx.font = face(small)
  return { fs: small, lines: [String(text)] }
}

/** A square mark, size×size, its shape cut from a clear ground. */
export function drawMark(ctx, size, o, D) {
  const ink = o.ink || inkOn(o.bg)
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  shapePath(ctx, o.shape, 0, 0, size)
  ctx.clip()
  pattern(ctx, o, size, size, D)
  const hasG = o.glyph && D, hasL = !!o.letters
  if (hasG) {
    const gs = size * (hasL ? 0.4 : 0.58)
    const gw = glyphWidth(D, o.glyph, gs)
    D.draw(ctx, o.glyph, { size: gs, x: (size - gw) / 2, y: hasL ? size * 0.14 : (size - gs) / 2, look: 'paper' })
  }
  if (hasL) {
    const fs = size * (hasG ? 0.26 : o.letters.length > 1 ? 0.42 : 0.56)
    ctx.font = `${FACES[o.font] || 600} ${fs}px "${o.font}", "Prompt", system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink
    ctx.fillText(o.letters, size / 2, hasG ? size * 0.73 : size * 0.53, size * 0.78)
  }
  ctx.restore()
  if (o.shape === 'stamp') { ctx.save(); shapePath(ctx, 'circle', size * 0.09, size * 0.09, size * 0.82); ctx.setLineDash([size * 0.012, size * 0.016]); ctx.lineWidth = size * 0.008; ctx.strokeStyle = ink; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore() }
}

/** A cover, w×h: the pattern, the dingbat large, the name and the tagline. */
export function drawCover(ctx, w, h, o, D, title, tagline) {
  const ink = o.ink || inkOn(o.bg)
  pattern(ctx, o, w, h, D)
  const hasG = o.glyph && D
  let tx = w / 2, tw = w * 0.84, align = 'center'
  if (hasG) {
    const gs = h * 0.5, gw = glyphWidth(D, o.glyph, gs)
    D.draw(ctx, o.glyph, { size: gs, x: w * 0.27 - gw / 2, y: (h - gs) / 2, look: 'paper' })
    tx = w * 0.5; tw = w * 0.44; align = 'left'
  }
  ctx.fillStyle = ink; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'
  const face = (fs) => `${FACES[o.font] || 600} ${fs}px "${o.font}", "Prompt", system-ui, sans-serif`
  const { fs, lines } = wrap(ctx, String(title || o.letters || '').trim(), tw, h * 0.2, h * 0.06, 3, face)
  const lh = fs * 1.08, block = lines.length * lh + (tagline ? fs * 0.7 : 0)
  let y = (h - block) / 2 + fs * 0.86
  for (const l of lines) { ctx.fillText(l, tx, y, tw); y += lh }
  if (tagline) {
    ctx.font = `400 ${Math.max(h * 0.042, fs * 0.3)}px "Prompt", system-ui, sans-serif`; ctx.globalAlpha = 0.86
    ctx.fillText(String(tagline).slice(0, 80), tx, y - lh + fs * 0.62, tw)
    ctx.globalAlpha = 1
  }
}
