// logo-color.mjs — colour arithmetic for the logo maker: mixing, contrast, a palette from one colour.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')

/** '#abc' or '#aabbcc' → [r, g, b] 0..255. Anything else gives a neutral grey. */
export function rgb(c) {
  let s = String(c || '').trim()
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + [...s.slice(1)].map((x) => x + x).join('')
  if (!/^#[0-9a-f]{6}$/i.test(s)) return [128, 128, 128]
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
}
export const toHex = ([r, g, b]) => '#' + hex2(r) + hex2(g) + hex2(b)
export const isHex = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ''))

export function mix(a, b, t) {
  const x = rgb(a), y = rgb(b)
  return toHex(x.map((v, i) => v * (1 - t) + y[i] * t))
}
export const alpha = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})` }

export function lum(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** The first of the candidates that reads on bg at ratio min, else black or white, whichever reads better. */
export function readable(bg, candidates, min = 4.5) {
  for (const c of candidates) if (c && contrast(c, bg) >= min) return c
  return contrast('#ffffff', bg) >= contrast('#14101f', bg) ? '#ffffff' : '#14101f'
}

/** Darken (t < 0) or lighten (t > 0) towards black or white. */
export const shade = (c, t) => (t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t))

export function toHsl(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
export function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255])
}

// A second colour that sits well beside the first, by the first's hue.
const PARTNER = [
  [15, '#f2b632'], [45, '#1f6f78'], [75, '#d94f3d'], [150, '#f4c542'], [190, '#f08a4b'],
  [250, '#f2b632'], [290, '#f2c14e'], [335, '#f6c445'], [361, '#f2b632'],
]

/** Five colours from one: main, deep (text on light), light (paper), accent and accent2. */
export function paletteFrom(main, accent = '', accent2 = '') {
  const [h, s] = toHsl(main)
  const partner = (PARTNER.find(([m]) => h < m) || PARTNER[PARTNER.length - 1])[1]
  const deep = fromHsl(h, clamp(s * 0.55, 0.12, 0.6), 0.1)
  const light = fromHsl(h, clamp(s * 0.4, 0.1, 0.5), 0.95)
  return { main, deep, light, accent: accent || partner, accent2: accent2 || mix(partner, '#ffffff', 0.45) }
}

/** The colour a mark of this fill is outlined in: deep for light fills, light for dark ones. */
export const outlineOn = (fill, p) => (lum(fill) > 0.32 ? p.deep : p.light)
