// studio.mjs — a photo made over in the maker's browser (Nan 2026-10-15: "take a bad
// photo and turn it into a great doodle"). A quick fix, or a drawing in one of five
// styles: ink, wash, riso, lacquer gold (ลายรดน้ำ), pop. Pixel work on an ImageData-like
// { data, width, height }; the result goes up like any photo and is looked at the same way.

export const STYLES = ['fix', 'ink', 'wash', 'riso', 'gold', 'pop']

const PAPER = [248, 242, 228]
const INK = [34, 30, 28]
const RISO_BLUE = [0, 120, 191]
const RISO_PINK = [255, 72, 176]
const LACQUER = [22, 17, 14]
const GOLD_LO = [196, 146, 52], GOLD_HI = [250, 226, 140]
const POP = [[247, 208, 70], [138, 206, 242], [244, 154, 193], [98, 176, 74], [226, 65, 46]], POP_DARK = [34, 56, 107], POP_LIGHT = [255, 241, 208]

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const hex = (h, f) => (/^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : f)

// ---- blur: three box passes stand in for a gaussian -------------------------------------

function radii(sigma) {
  const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1)
  let wl = Math.floor(ideal); if (wl % 2 === 0) wl--
  const m = Math.round((12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4))
  return [0, 1, 2].map((i) => ((i < m ? wl : wl + 2) - 1) / 2)
}
function boxH(a, b, w, h, r) {
  const k = 1 / (2 * r + 1)
  for (let y = 0; y < h; y++) {
    const o = y * w
    let s = 0
    for (let x = -r; x <= r; x++) s += a[o + clamp(x, 0, w - 1)]
    for (let x = 0; x < w; x++) { b[o + x] = s * k; s += a[o + Math.min(x + r + 1, w - 1)] - a[o + Math.max(x - r, 0)] }
  }
}
function boxV(a, b, w, h, r) {
  const k = 1 / (2 * r + 1)
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += a[clamp(y, 0, h - 1) * w + x]
    for (let y = 0; y < h; y++) { b[y * w + x] = s * k; s += a[Math.min(y + r + 1, h - 1) * w + x] - a[Math.max(y - r, 0) * w + x] }
  }
}
export function blur(f, w, h, sigma) {
  const out = Float32Array.from(f)
  if (sigma < 0.4) return out
  const t = new Float32Array(f.length)
  for (const r of radii(sigma)) { const ri = Math.max(0, Math.round(r)); if (!ri) continue; boxH(out, t, w, h, ri); boxV(t, out, w, h, ri) }
  return out
}

// ---- reading the photo --------------------------------------------------------------------

function channels(src) {
  const n = src.width * src.height, d = src.data
  const r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n)
  for (let i = 0, j = 0; j < n; i += 4, j++) { r[j] = d[i] / 255; g[j] = d[i + 1] / 255; b[j] = d[i + 2] / 255 }
  return [r, g, b]
}
const lumOf = ([r, g, b]) => { const l = new Float32Array(r.length); for (let i = 0; i < l.length; i++) l[i] = 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i]; return l }

function pct(f, ps) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < f.length; i++) hist[clamp((f[i] * 255) | 0, 0, 255)]++
  return ps.map((p) => { const want = f.length * p; let s = 0; for (let i = 0; i < 256; i++) { s += hist[i]; if (s >= want) return i / 255 } return 1 })
}

/** Light stretched to the photo's own range, mid-grey moved to the middle: a dark phone photo reads like a bright one. */
function levels(l) {
  const [lo, mid0, hi] = pct(l, [0.01, 0.5, 0.99])
  const span = Math.max(0.08, hi - lo)
  const mid = clamp((mid0 - lo) / span, 0.05, 0.95)
  const gam = clamp(Math.log(0.55) / Math.log(mid), 0.45, 2.2)
  const out = new Float32Array(l.length)
  for (let i = 0; i < l.length; i++) out[i] = Math.pow(clamp((l[i] - lo) / span, 0, 1), gam)
  return out
}

// ---- the pen --------------------------------------------------------------------------------

/** Ink where the photo has edges: a difference of two blurs, dark side of each edge. */
function lines(l, w, h, s, weight = 1) {
  const a = blur(l, w, h, 0.9 * s), b = blur(l, w, h, 1.6 * s)
  const t0 = 0.005 / weight, t1 = 0.026 / weight
  const out = new Float32Array(l.length)
  for (let i = 0; i < l.length; i++) out[i] = smooth(t0, t1, b[i] - a[i])
  return out
}

/** Smooth noise, cell px apart, -1..1: a hand that wobbles and paper that is not flat. */
function noise(w, h, cell, seed) {
  const R = rng(seed), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2
  const g = new Float32Array(gw * gh).map(() => R() * 2 - 1)
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const fy = y / cell, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty)
    for (let x = 0; x < w; x++) {
      const fx = x / cell, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx)
      const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1]
      out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
    }
  }
  return out
}

/** A map read where a wobbling hand would have put it. */
function wobble(f, w, h, s, seed) {
  const nx = noise(w, h, 46 * s, seed), ny = noise(w, h, 46 * s, seed + 7), amp = 1.6 * s
  const out = new Float32Array(f.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    out[i] = f[clamp(Math.round(y + ny[i] * amp), 0, h - 1) * w + clamp(Math.round(x + nx[i] * amp), 0, w - 1)]
  }
  return out
}

/** Pen hatching in the shade: one way past 0.56, crossed past 0.75, dense past 0.9. */
function hatch(shade, w, h, s, seed) {
  const p = 6.5 * s, hw = 0.55 * s, j = noise(w, h, 30 * s, seed)
  const out = new Float32Array(shade.length)
  const stroke = (u) => { const f = ((u / p) % 1 + 1) % 1; return clamp(hw - Math.min(f, 1 - f) * p + 0.6, 0, 1) }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = shade[i] + j[i] * 0.05
    if (v < 0.56) continue
    let k = stroke(x + y + j[i] * 2 * s) * smooth(0.56, 0.66, v)
    if (v > 0.75) k = Math.max(k, stroke(x - y + j[i] * 2 * s) * smooth(0.75, 0.84, v))
    if (v > 0.9) k = Math.max(k, stroke(x * 0.5 + y * 1.3 + 3) * smooth(0.9, 0.96, v))
    out[i] = k
  }
  return out
}

/** Dots on a 45° grid, bigger where amount is higher. */
function halftone(amount, w, h, cell, rough) {
  const out = new Float32Array(amount.length), q = Math.SQRT1_2
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, u = (x + y) * q, v = (x - y) * q
    const cu = ((u % cell) + cell) % cell - cell / 2, cv = ((v % cell) + cell) % cell - cell / 2
    const r = cell * 0.56 * Math.sqrt(clamp(amount[i], 0, 1)) + (rough ? rough[i] * 0.5 : 0)
    out[i] = clamp(r - Math.hypot(cu, cv) + 0.5, 0, 1)
  }
  return out
}

/** Paper: a slow blotch and a fine tooth. */
function paper(w, h, s, seed) {
  const slow = noise(w, h, 120 * s, seed + 3), R = rng(seed + 11)
  const out = new Float32Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = slow[i] * 0.035 + (R() - 0.5) * 0.05
  return out
}

// ---- colour ---------------------------------------------------------------------------------

/** k colour centres from a sample of the photo. */
function kmeans([r, g, b], k, seed) {
  const n = r.length, R = rng(seed), m = Math.min(n, 4000)
  const S = Array.from({ length: m }, () => (R() * n) | 0)
  const C = [[r[S[0]], g[S[0]], b[S[0]]]]
  while (C.length < k) { // the next centre: the sample farthest from those so far
    let best = 0, bi = 0
    for (let t = 0; t < m; t += 3) { const i = S[t]; let dm = 9; for (const c of C) dm = Math.min(dm, (r[i] - c[0]) ** 2 + (g[i] - c[1]) ** 2 + (b[i] - c[2]) ** 2); if (dm > best) { best = dm; bi = i } }
    C.push([r[bi], g[bi], b[bi]])
  }
  for (let it = 0; it < 10; it++) {
    const sum = C.map(() => [0, 0, 0, 0])
    for (const i of S) { const c = nearest(C, r[i], g[i], b[i]); sum[c][0] += r[i]; sum[c][1] += g[i]; sum[c][2] += b[i]; sum[c][3]++ }
    sum.forEach((x, c) => { if (x[3]) C[c] = [x[0] / x[3], x[1] / x[3], x[2] / x[3]] })
  }
  return C
}
function nearest(C, r, g, b) { let bi = 0, bd = 9; for (let c = 0; c < C.length; c++) { const d = (r - C[c][0]) ** 2 + (g - C[c][1]) ** 2 + (b - C[c][2]) ** 2; if (d < bd) { bd = d; bi = c } } return bi }

function hsl([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function rgb([h, s, l]) {
  if (!s) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
}

/** Flat colour regions: the photo blurred, then each pixel takes its nearest of k colours. */
function flats(ch, w, h, s, k, seed) {
  const bl = ch.map((c) => blur(c, w, h, 2.6 * s))
  const C = kmeans(bl, k, seed)
  const lab = new Uint8Array(w * h)
  for (let i = 0; i < lab.length; i++) lab[i] = nearest(C, bl[0][i], bl[1][i], bl[2][i])
  return { C, lab }
}

/** Where one flat meets another. */
function seams(lab, w, h) {
  const e = new Float32Array(lab.length)
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; if (lab[i] !== lab[i + 1] || lab[i] !== lab[i + w]) e[i] = 1 }
  return e
}

// ---- the styles -------------------------------------------------------------------------------

function out(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } }
function put(o, i, r, g, b) { const j = i * 4; o.data[j] = r; o.data[j + 1] = g; o.data[j + 2] = b; o.data[j + 3] = 255 }

const STYLE = {
  /** Levels per channel, a little warmth and colour, a little sharper. */
  fix(src, { w, h, s }) {
    const ch = channels(src), l = lumOf(ch)
    const [llo, lhi] = pct(l, [0.005, 0.995])
    const mean = ch.map((c) => c.reduce((a, b) => a + b, 0) / c.length), grey = (mean[0] + mean[1] + mean[2]) / 3
    const fixed = ch.map((c, k) => {
      const [lo, hi] = pct(c, [0.005, 0.995])
      const a = lo * 0.6 + llo * 0.4, b = hi * 0.6 + lhi * 0.4, bal = 1 + ((grey / Math.max(0.05, mean[k])) - 1) * 0.4
      const o = new Float32Array(c.length)
      for (let i = 0; i < c.length; i++) o[i] = clamp(((c[i] - a) / Math.max(0.1, b - a)) * bal, 0, 1)
      return o
    })
    const soft = fixed.map((c) => blur(c, w, h, 1.3 * s))
    const o = out(w, h)
    for (let i = 0; i < w * h; i++) {
      let px = fixed.map((c, k) => clamp(c[i] + 0.55 * (c[i] - soft[k][i]), 0, 1))
      const [hh, ss, ll] = hsl(px)
      px = rgb([hh, clamp(ss * 1.14, 0, 1), clamp(Math.pow(ll, 0.96), 0, 1)])
      put(o, i, px[0] * 255 + 5, px[1] * 255 + 1, px[2] * 255 - 5)
    }
    return o
  },

  /** Pen and ink on paper: outlines, hatching in the shade. */
  ink(src, { w, h, s, seed }) {
    const l = levels(lumOf(channels(src)))
    const ln = wobble(lines(l, w, h, s), w, h, s, seed)
    const sh = hatch(blur(l, w, h, 3 * s).map((v) => 1 - v), w, h, s, seed)
    const pp = paper(w, h, s, seed), o = out(w, h)
    for (let i = 0; i < w * h; i++) {
      const k = Math.max(ln[i], sh[i] * 0.8), t = 1 + pp[i]
      put(o, i, (PAPER[0] * (1 - k) + INK[0] * k) * t, (PAPER[1] * (1 - k) + INK[1] * k) * t, (PAPER[2] * (1 - k) + INK[2] * k) * t)
    }
    return o
  },

  /** Watercolour: flat washes that pool at their edges, a brown pen over them. */
  wash(src, { w, h, s, seed }) {
    const ch = channels(src), l = levels(lumOf(ch))
    const { C, lab } = flats(ch, w, h, s, 7, seed)
    const tint = C.map((c) => { const [hh, ss, ll] = hsl(c); return rgb([hh, clamp(ss * 1.2 + 0.08 * smooth(0.06, 0.2, ss), 0, 0.55), clamp(0.4 + ll * 0.6, 0, 0.95)]).map((v, k) => v * 0.72 + (PAPER[k] / 255) * 0.28) })
    const pool = blur(seams(lab, w, h), w, h, 1.4 * s)
    const grain = noise(w, h, 9 * s, seed + 5), bloom = noise(w, h, 70 * s, seed + 9)
    const ln = wobble(lines(l, w, h, s, 0.8), w, h, s, seed)
    const pp = paper(w, h, s, seed), o = out(w, h), pen = [70, 52, 40]
    for (let i = 0; i < w * h; i++) {
      const c = tint[lab[i]], dark = 1 - Math.min(0.32, pool[i] * 0.42) - grain[i] * 0.035 - bloom[i] * 0.04, k = ln[i] * 0.85, t = 1 + pp[i]
      put(o, i, ((c[0] * 255 * dark) * (1 - k) + pen[0] * k) * t, ((c[1] * 255 * dark) * (1 - k) + pen[1] * k) * t, ((c[2] * 255 * dark) * (1 - k) + pen[2] * k) * t)
    }
    return o
  },

  /** Two inks off a risograph, a hair out of register: dots of the accent, lines in blue. */
  riso(src, { w, h, s, seed, accent }) {
    const l = levels(lumOf(channels(src)))
    const acc = hex(accent, RISO_PINK), blueish = Math.abs(hsl(acc.map((v) => v / 255))[0] - 0.57) < 0.09
    const A = blueish ? RISO_PINK : acc // a blue accent would vanish into the blue ink
    const shade = blur(l, w, h, 1.4 * s).map((v) => clamp(Math.pow(1 - v, 1.7) * 0.8, 0, 1))
    const rough = noise(w, h, 3 * s, seed + 2)
    const dots = halftone(shade, w, h, 5.5 * s, rough)
    const ln = wobble(lines(l, w, h, s), w, h, s, seed)
    const deep = hatch(shade, w, h, s * 1.2, seed)
    const dx = Math.round(2 * s), dy = Math.round(1.2 * s), pp = paper(w, h, s, seed), o = out(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, j = clamp(y - dy, 0, h - 1) * w + clamp(x - dx, 0, w - 1)
      const a = dots[j] * 0.9, b = Math.max(ln[i], deep[i] * 0.7) * 0.92, t = 1 + pp[i] * 0.8
      const px = PAPER.map((p, k) => p * (1 - a * (1 - A[k] / 255)) * (1 - b * (1 - RISO_BLUE[k] / 255)) * t)
      put(o, i, px[0], px[1], px[2])
    }
    return o
  },

  /** Gold on black lacquer, as ลายรดน้ำ: lines and the light parts hatched in gold leaf. */
  gold(src, { w, h, s, seed }) {
    const l = levels(lumOf(channels(src)))
    const ln = wobble(lines(l, w, h, s), w, h, s, seed)
    const lit = hatch(blur(l, w, h, 3 * s).map((v) => clamp(v * 1.1, 0, 1)), w, h, s, seed + 1)
    const k0 = new Float32Array(w * h)
    for (let i = 0; i < k0.length; i++) k0[i] = Math.max(ln[i], lit[i] * 0.55)
    const glow = blur(k0, w, h, 2.2 * s), leaf = noise(w, h, 18 * s, seed + 4), slow = noise(w, h, 140 * s, seed + 6)
    const R = rng(seed + 8), o = out(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, cx = x / w - 0.5, cy = y / h - 0.5
      const vig = 1 - (cx * cx + cy * cy) * 0.9 + slow[i] * 0.08
      const g = clamp(0.5 + leaf[i] * 0.5 + (1 - y / h) * 0.15, 0, 1)
      const gc = GOLD_LO.map((v, k) => v + (GOLD_HI[k] - v) * g)
      const k = clamp(k0[i] * (0.86 + R() * 0.14), 0, 1), gl = glow[i] * 0.35
      put(o, i, ...LACQUER.map((v, c) => v * vig * (1 - k) + gc[c] * k + gc[c] * gl * (1 - k)))
    }
    return o
  },

  /** Comic print: a few loud flats, fat black outlines, dots in the light. */
  pop(src, { w, h, s, seed, accent }) {
    const ch = channels(src), l = levels(lumOf(ch))
    const { C, lab } = flats(ch, w, h, s, 5, seed)
    // each flat takes the print colour nearest its hue; the darkest navy, the lightest cream
    const inks = [hex(accent, [240, 74, 0]), ...POP].map((c) => c.map((v) => v / 255))
    const hues = inks.map(hsl)
    const loud = C.map((c) => {
      const [hh, ss, ll] = hsl(c)
      if (ll < 0.15) return POP_DARK.map((v) => v / 255)
      if (ll > 0.8) return POP_LIGHT.map((v) => v / 255)
      if (ss < 0.14) return inks[0]
      let bi = 0, bd = 9
      hues.forEach((x, i) => { const d = Math.min(Math.abs(x[0] - hh), 1 - Math.abs(x[0] - hh)); if (d < bd) { bd = d; bi = i } })
      return inks[bi]
    })
    const ln = lines(l, w, h, s * 1.5, 1.3), edge = seams(lab, w, h)
    const thick = blur(Float32Array.from(ln, (v, i) => Math.max(v, edge[i] * 0.7)), w, h, 0.9 * s)
    const light = blur(l, w, h, 1.5 * s).map((v) => smooth(0.55, 0.95, v) * 0.38)
    const dots = halftone(light, w, h, 6 * s), o = out(w, h)
    for (let i = 0; i < w * h; i++) {
      const c = loud[lab[i]], k = smooth(0.18, 0.42, thick[i]), dk = dots[i] * 0.45
      put(o, i, ...c.map((v) => (v * 255 * (1 - dk) + v * 120 * dk) * (1 - k) + 22 * k))
    }
    return o
  },
}

/** The photo made over. src: ImageData-like; style: one of STYLES; opt: { accent, seed }. */
export function makeOver(src, style, opt = {}) {
  const w = src.width, h = src.height
  const o = { w, h, s: Math.max(0.3, Math.max(w, h) / 900), seed: opt.seed || 1015, accent: opt.accent || '' }
  const fixed = STYLE.fix(src, o) // every drawing starts from the fixed photo
  return style === 'fix' || !STYLE[style] ? fixed : STYLE[style](fixed, o)
}

/** Width and height for working on a photo of w×h, the long side at most max. */
export function fit(w, h, max) { const r = Math.min(1, max / Math.max(w, h)); return [Math.max(1, Math.round(w * r)), Math.max(1, Math.round(h * r))] }
