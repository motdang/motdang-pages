// studio.mjs — a photo made over in the maker's browser (Nan 2026-10-15: "take a bad photo and
// turn it into a great doodle"). A quick fix, or a drawing in one of the styles in STYLES. Pixel
// work on an ImageData-like { data, width, height }; the result goes up like any photo and is
// looked at the same way. The tools are in studio-core.mjs.

import { clamp, smooth, mix, hex, fit, blur, guided, planesOf, lumOf, axis, pct, levels, stretch, toOk, fromOk, okOf, kuwahara, kmeans, assign, mode, dropSpecks, flow, noise, tile, hatch, edges, chains, seams, drawChains, shrink, grow, growLabels, isoChains, box, cracks } from './studio-core.mjs'
export { fit }

export const STYLES = ['fix', 'doodle', 'ink', 'wash', 'riso', 'gold', 'pop', 'mural', 'cyan']
// the ones the builder and the front page offer (Nan 2026-10-16: "Prune what isn't good or useful"): the drawn
// looks come from Doodle it on a photo (doodle.mjs), which draws them far better; the rest stay for tools/bands.py
export const SHOWN = ['fix', 'wash', 'riso', 'cyan']

const PAPER = [248, 242, 228]
const INK = [32, 28, 30]
const RAW = new Set(['cyan']) // styles that read the photo itself, not the fixed copy
const WORK = 480 // the long side the heavy work is done at; the drawing is finished at the photo's own size

function out(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } }
const B2F = Float32Array.from({ length: 256 }, (_, i) => i / 255)
const bytesOf = ([r, g, b]) => { const n = r.length, d = new Uint8ClampedArray(n * 4); for (let i = 0, j = 0; i < n; i++, j += 4) { d[j] = r[i] * 255 + 0.5; d[j + 1] = g[i] * 255 + 0.5; d[j + 2] = b[i] * 255 + 0.5; d[j + 3] = 255 } return d }

// ---- the quick fix ------------------------------------------------------------------------------------

/** What the photo needs, read off a small copy of it: how warm or cool the light was, the black and white points, the light as it falls; and how much of all that, a flat photo wanting more than a punchy one. */
function analyse(src) {
  const [aw, ah] = fit(src.width, src.height, 320), [r, g, b] = planesOf(src, aw, ah), n = aw * ah
  let sr = 0, sg = 0, sb = 0, sn = 0, sat = 0
  for (let i = 0; i < n; i++) { // the nearly grey pixels say what colour the light was
    const mx = Math.max(r[i], g[i], b[i]), mn = Math.min(r[i], g[i], b[i]), c = mx - mn, y = (mx + mn) / 2
    sat += c / (mx + 0.02)
    if (y > 0.1 && y < 0.95 && c < 0.3) { const t = 1 - c / 0.3, k = t * t; sr += r[i] * k; sg += g[i] * k; sb += b[i] * k; sn += k }
  }
  let gain = [1, 1, 1]
  if (sn > n * 0.03) { const t = 0.275 * Math.log(Math.max(0.02, sr / sn) / Math.max(0.02, sb / sn)); gain = [clamp(Math.exp(-t), 0.85, 1.2), 1, clamp(Math.exp(t), 0.85, 1.2)] } // warm against cool only: a greenish grey is foliage, not a cast
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) y[i] = 0.2126 * clamp(r[i] * gain[0], 0, 1) + 0.7152 * clamp(g[i] * gain[1], 0, 1) + 0.0722 * clamp(b[i] * gain[2], 0, 1)
  const [lo, hi] = pct(y, [0.004, 0.996]), black = Math.min(lo, 0.14) * 0.9, scale = Math.min(1.6, 1 / Math.max(0.35, Math.max(hi, 0.6) - black))
  const amt = 0.3 + 0.7 * Math.max(clamp((scale - 1) / 0.5, 0, 1), 1 - smooth(0.16, 0.4, sat / n)) // 1 for a dull photo, less for one that already has its colour and range
  for (let i = 0; i < n; i++) y[i] = clamp((y[i] - black) * scale, 0, 1)
  const base = guided(y, aw, ah, Math.max(2, Math.round(Math.max(aw, ah) * 0.05)), 0.02), [p10, med] = pct(base, [0.1, 0.5])
  const gm = clamp(Math.log(0.42) / Math.log(clamp(med, 0.04, 0.96)), 0.75, 1.08), lift = clamp(0.06 - Math.pow(p10, gm), 0, 0.08) * amt
  const D = new Float32Array(n * 2) // per spot: how much to stretch the fine light, and what to add to it
  for (let i = 0; i < n; i++) {
    const b0 = base[i], g0 = Math.pow(b0, mix(1, gm, amt)), bp = g0 + lift * (1 - g0) * (1 - g0), c = 0.32 * amt * smooth(0.03, 0.2, b0)
    D[i * 2] = c; D[i * 2 + 1] = bp - (1 + c) * b0
  }
  return { aw, ah, gain, black, scale, D, amt }
}

/** The fix applied to every pixel: colour cast, levels, the light's local stretch, vibrance, a little sharpening. */
function fixBytes(src, P, sharp) {
  const { width: w, height: h, data: d } = src, o = out(w, h), od = o.data, X = axis(w, P.aw), Y = axis(h, P.ah), D = P.D, [g0, g1, g2] = P.gain, bk = P.black, sc = P.scale, sa = 0.12 * P.amt, va = 0.45 * P.amt
  for (let y = 0; y < h; y++) {
    const r0 = Y.i0[y] * P.aw, r1 = Y.i1[y] * P.aw, fy = Y.f[y], ya = Math.max(0, y - 1) * w, yb = Math.min(h - 1, y + 1) * w
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a0 = (r0 + X.i0[x]) * 2, a1 = (r0 + X.i1[x]) * 2, b0 = (r1 + X.i0[x]) * 2, b1 = (r1 + X.i1[x]) * 2, fx = X.f[x]
      const top = D[a0] + (D[a1] - D[a0]) * fx, bot = D[b0] + (D[b1] - D[b0]) * fx, c = top + (bot - top) * fy
      const t2 = D[a0 + 1] + (D[a1 + 1] - D[a0 + 1]) * fx, b2 = D[b0 + 1] + (D[b1 + 1] - D[b0 + 1]) * fx, add = t2 + (b2 - t2) * fy
      const R0 = B2F[d[i]], G0 = B2F[d[i + 1]], B0 = B2F[d[i + 2]], m0 = Math.max(R0, G0, B0), s0 = (m0 - Math.min(R0, G0, B0)) / (m0 + 0.02) // how colourful the pixel was
      let r = (R0 * g0 - bk) * sc, g = (G0 * g1 - bk) * sc, b = (B0 * g2 - bk) * sc
      const y0 = 0.2126 * r + 0.7152 * g + 0.0722 * b, yo = (1 + c) * y0 + add
      let k = Math.max(0.05, yo + 0.015) / (Math.max(0, y0) + 0.015); k = k > 3.5 ? 3.5 : k
      r *= k; g *= k; b *= k
      if (k > 1.15) { const yk = 0.2126 * r + 0.7152 * g + 0.0722 * b, de = Math.min(0.35, (k - 1.15) * 0.12); r += (yk - r) * de; g += (yk - g) * de; b += (yk - b) * de } // light brought up into the shadows comes up a little paler
      if (r > 1) r = 1; if (g > 1) g = 1; if (b > 1) b = 1; if (r < 0) r = 0; if (g < 0) g = 0; if (b < 0) b = 0
      r += sa * (r * r * (3 - 2 * r) - r); g += sa * (g * g * (3 - 2 * g) - g); b += sa * (b * b * (3 - 2 * b) - b) // an S in the contrast
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / (mx + 0.02), f = 1.02 + va * (1 - sat) * (1 - sat), yl = 0.2126 * r + 0.7152 * g + 0.0722 * b
      r = yl + (r - yl) * f; g = yl + (g - yl) * f; b = yl + (b - yl) * f
      const s1 = (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) + 0.02), lim = s0 * 1.2 + 0.05 // held near the colour the photo had
      if (s1 > lim) { const t = lim / s1, yc = 0.2126 * r + 0.7152 * g + 0.0722 * b; r = yc + (r - yc) * t; g = yc + (g - yc) * t; b = yc + (b - yc) * t }
      if (sharp) { const l = (4 * d[i + 1] - d[(ya + x) * 4 + 1] - d[(yb + x) * 4 + 1] - d[(y * w + Math.max(0, x - 1)) * 4 + 1] - d[(y * w + Math.min(w - 1, x + 1)) * 4 + 1]) / 255, e = 0.4 * l * smooth(0.006, 0.04, Math.abs(l)); r += e; g += e; b += e }
      od[i] = r * 255 + 0.5; od[i + 1] = g * 255 + 0.5; od[i + 2] = b * 255 + 0.5; od[i + 3] = 255
    }
  }
  return o
}

/** The photo fixed, as planes the long side WORK at most: what every drawing starts from. */
function work(src, size = WORK) {
  const [ww, wh] = fit(src.width, src.height, size), small = { width: ww, height: wh, data: bytesOf(planesOf(src, ww, wh)) }
  const P = planesOf(fixBytes(small, analyse(small), false), ww, wh)
  return { w: ww, h: wh, r: P[0], g: P[1], b: P[2], l: lumOf(P) }
}

/** Colour families by the Oklab hue, in degrees: pink, red, orange, yellow, green, teal, blue, violet. */
const FAMILY_EDGES = [18, 42, 78, 118, 178, 228, 288, 345]
const hue = (a, b) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
const family = (a, b) => { const h = hue(a, b); for (let i = 0; i < 8; i++) if (h < FAMILY_EDGES[i]) return i; return 0 }
const rgbOf = (h) => hex(h, [0, 0, 0])

// ---- flat regions ----------------------------------------------------------------------------------------------

/** The photo as k flat colours: shrunk to a coarse grid, calmed by Kuwahara, grouped in Oklab, edges rounded, small patches joined to a neighbour (min..big of the grid, the more alike the bigger).
 *  Gives { w, h (the grid), k, lab, C (Oklab centres), n (pixels each), P (the calmed planes) }. */
function flats(W, k, seed, { size = 320, kw = [2, 3], mr = 3, min = 0.0004, big = 0.004 } = {}) {
  const [w, h] = fit(W.w, W.h, size), n = w * h
  let P = toOk(shrink([W.r, W.g, W.b], W.w, W.h, w, h))
  for (const r of kw) P = kuwahara(P, w, h, r)
  const [cw, ch] = fit(W.w, W.h, 96), C0 = kmeans(toOk(shrink([W.r, W.g, W.b], W.w, W.h, cw, ch)), k), lab = mode(assign(P, C0), k, w, h, mr) // the colours are found on a small copy, so they are the same at any size
  dropSpecks(lab, w, h, k, Math.max(4, Math.round(n * min)), C0, Math.max(6, Math.round(n * big)))
  const sum = Array.from({ length: k }, () => [0, 0, 0, 0])
  for (let i = 0; i < n; i++) { const t = sum[lab[i]]; t[0] += P[0][i]; t[1] += P[1][i]; t[2] += P[2][i]; t[3]++ }
  return { w, h, k, lab, P, C: sum.map((t, c) => (t[3] ? [t[0] / t[3], t[1] / t[3], t[2] / t[3]] : C0[c])), n: sum.map((t) => t[3]) }
}

/** The lines a pen would put in: where the light of the work copy changes most (the strongest fraction q of it), as chains on the work copy's grid, with how strong each place is.
 *  Gives { chains, m, hi }; draw them with drawChains(…, { ww: W.w, m, hi }). */
function fine(W, Y, q, { sigma = 1.3, min = 12, floor = 0.02, lo = 0.5, adapt = 0 } = {}) {
  const E = edges(Y, W.w, W.h, sigma, q, floor, lo, adapt)
  return { chains: chains(E.on, W.w, W.h, min), m: E.m, hi: E.hi }
}

/** Where each flat's light stands among the picture's, 0 for the darkest to 1 for the lightest, by the area they cover. */
function lightRank(F) {
  const n = F.w * F.h, rank = new Float32Array(F.k), order = F.C.map((c, i) => i).sort((x, y) => F.C[x][0] - F.C[y][0])
  let run = 0
  for (const i of order) { rank[i] = (run + F.n[i] / 2) / n; run += F.n[i] }
  return rank
}

/** Small dark marks: what the photo has darker than its surroundings and no bigger than an eye (eyes, brows, nostrils, a mouth, a strand of hair), as a plane 0..1 on the work copy's grid.
 *  A busy place needs more to count, so a face shows its features and a hedge does not turn to speckle. */
function marks(W, Y, { reach = 3.2, need = 0.05 } = {}) {
  const n = W.w * W.h, fine = blur(Y, W.w, W.h, 0.8), around = blur(Y, W.w, W.h, reach), d = new Float32Array(n), a = new Float32Array(n)
  for (let i = 0; i < n; i++) { d[i] = around[i] - fine[i]; a[i] = Math.abs(d[i]) }
  const act = blur(a, W.w, W.h, 0.07 * Math.max(W.w, W.h)), m = new Float32Array(n)
  for (let i = 0; i < n; i++) m[i] = smooth(need + 1.6 * act[i], need + 1.6 * act[i] + 0.035, d[i])
  return blur(m, W.w, W.h, 0.7)
}

/** A byte mask as a plane of 0 and 1. */
function toFloat(m) { const o = new Float32Array(m.length); for (let i = 0; i < o.length; i++) o[i] = m[i] ? 1 : 0; return o }

/** Plane q of an interleaved grid F (stride st), read at the fraction (fx, fy) between the corners a0 a1 (top) and b0 b1 (bottom), which are offsets already times st. */
function bil(F, q, a0, a1, b0, b1, fx, fy) { const t = F[a0 + q] + (F[a1 + q] - F[a0 + q]) * fx, u = F[b0 + q] + (F[b1 + q] - F[b0 + q]) * fx; return t + (u - t) * fy }

// ---- the styles -------------------------------------------------------------------------------------------

const STYLE = {
  /** The light and colour put right, the way a good phone app would: cast, levels, shadows, a little vibrance. */
  fix(src) { return fixBytes(src, analyse(src), true) },

  /** Pen and ink on paper: a contour that leans on the pen, hatching that thickens into cross-hatching in the shade, solid ink in the darkest places, the lights left white. */
  ink(W, o) {
    const { w: ww, h: wh } = W, { w, h, s, seed } = o, n = ww * wh, k = w / ww
    const Y = levels(W.l, 0.54), tone = blur(Y, ww, wh, 1.8), F = new Float32Array(n * 2), blot = noise(ww, wh, 70, seed + 3), solid = new Float32Array(n)
    for (let i = 0; i < n; i++) { const t = 1 - tone[i]; tone[i] = t * t * (3 - 2 * t) * 0.35 + t * 0.65; solid[i] = tone[i] > 0.93 ? 1 : 0 } // a little S in the tone: whiter lights, darker darks
    const fill = blur(solid, ww, wh, 1.1) // the blacks as shapes: rounded like a brush filled them, cut crisp at the picture's own size
    for (let i = 0; i < n; i++) { F[i * 2] = fill[i]; F[i * 2 + 1] = blot[i] }
    const ink = new Uint8Array(w * h), [fx, fy] = flow(Y, ww, wh, 4), D = fine(W, Y, 0.07, { floor: 0.035, min: 14, adapt: 0.6 }), stop = new Float32Array(D.m.length)
    for (let i = 0; i < stop.length; i++) stop[i] = D.m[i] / D.hi
    for (const [i, [ang, thr, da, fk]] of [[-0.785, 0.4, 4.6, 0.35], [0.785, 0.58, 4.6, 0.2], [-0.12, 0.74, 3.8, 0.12]].entries()) hatch(ink, w, h, tone, ww, wh, fx, fy, { ang, thr, da: da * s, len: 34 * s, fk, r: 0.46 * s, seed: seed + 31 + i, jit: 0.45, stop, stopAt: 1.1 })
    drawChains(ink, w, h, D.chains, k, { ww, r: 0.85 * s, nx: noise(ww, wh, 40, seed + 5), ny: noise(ww, wh, 40, seed + 6), nz: noise(ww, wh, 14, seed + 8), m: D.m, hi: D.hi, taper: 0.55 })
    const X = axis(w, ww), Y2 = axis(h, wh), g1 = tile(seed + 3), g2 = tile(seed + 4, 1.6), r = out(w, h), d = r.data
    for (let y = 0; y < h; y++) {
      const r0 = Y2.i0[y] * ww, r1 = Y2.i1[y] * ww, fy2 = Y2.f[y]
      for (let x = 0; x < w; x++) {
        const a0 = (r0 + X.i0[x]) * 2, a1 = (r0 + X.i1[x]) * 2, b0 = (r1 + X.i0[x]) * 2, b1 = (r1 + X.i1[x]) * 2, fx2 = X.f[x]
        const T = bil(F, 0, a0, a1, b0, b1, fx2, fy2), B = bil(F, 1, a0, a1, b0, b1, fx2, fy2)
        const i = y * w + x, kk = Math.max(ink[i] / 255, smooth(0.45, 0.55, T) * 0.94)
        const gi = ((x + 37) & 255) | (((y + 91) & 255) << 8), gj = ((x + 5) & 255) | (((y + 150) & 255) << 8), t = 1 + 0.03 * B + 0.05 * g1[gi] + 0.03 * g2[gj], j = i * 4
        for (let q = 0; q < 3; q++) d[j + q] = (PAPER[q] * (1 - kk) + INK[q] * kk) * t
        d[j + 3] = 255
      }
    }
    return r
  },

  /** A doodle: a few bright flat colours, round shapes, a steady marker line, a darker flat where the photo is in shade, a few strokes of light. */
  doodle(W, o) {
    const { w, h, s, seed } = o, F = flats(W, 7, seed, { size: 400, kw: [2, 3], mr: 3, min: 0.0006, big: 0.008 }), fw = F.w, fh = F.h, n = fw * fh, k = w / fw
    // each flat takes a colour from the family of its hue, and the tone of its light; its shade a step darker and round the wheel, its shine lighter
    const PAL = [['#ffc9dc', '#ff6fa3', '#c04a82', '#4a2150'], ['#ffa795', '#f2514a', '#b03343', '#4d1d3f'], ['#ffd2a0', '#ff9a30', '#d9692a', '#55233a'], ['#fff39a', '#ffd23f', '#eaa522', '#4a3a2c'], ['#c4eba8', '#55b85f', '#2b8556', '#123f43'], ['#b4ece6', '#3fc0c2', '#2395a0', '#13304f'], ['#b6d3f8', '#4e8be3', '#3555b0', '#1d2459'], ['#e0c6f4', '#a066d6', '#6a45a8', '#2b1f58'], ['#fff4dc', '#d9d3ee', '#8b91d2', '#3b3f80', '#1f1d4a']].map((t) => t.map(rgbOf))
    const CUT = [[0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.58, 0.22, 0.09], [0.72, 0.46, 0.22, 0.09]] // where the light of each flat falls from one tone to the next: the last is a deep colour for the darkest
    const darker = (rgb, k2) => { // a shade is deeper and a step round the colour wheel: warm colours to warmer (yellow to orange), cool to cooler (green to teal)
      const [L, a, b] = okOf(rgb.map((v) => v / 255)), c = Math.max(0.03, Math.hypot(a, b) * 1.12), hd = hue(a, b), h2 = Math.atan2(b, a) + (hd < 125 || hd >= 330 ? -0.36 : 0.3)
      return fromOk(L * k2, c * Math.cos(h2), c * Math.sin(h2)).map((v) => v * 255)
    }
    const [lo, hi0] = pct(F.P[0], [0.03, 0.97]), ids = [], cls = F.C.map(([L0, a, b]) => {
      const L = clamp((L0 - lo) / Math.max(0.1, hi0 - lo), 0, 1), c = Math.hypot(a, b), f = c < 0.015 ? 8 : family(a, b), T = PAL[f]
      let t = 0; while (t < CUT[f].length && L < CUT[f][t]) t++
      if (c < 0.05 && f < 8 && L >= 0.4) t = 0 // a washed-out colour stays pastel
      ids.push(f * 5 + t)
      const own = T[t]
      return { own, shade: darker(own, 0.8), shine: own.map((v) => v + (255 - v) * 0.62) }
    })
    const flat = new Uint8Array(n), idc = Array.from({ length: 45 }, (_, i) => [i, 0, 0]) // the flats that came out one colour are one: no line between them
    for (let i = 0; i < n; i++) flat[i] = ids[F.lab[i]]
    const Y = F.P[0], dl = new Float32Array(n)
    for (let i = 0; i < n; i++) dl[i] = Y[i] - F.C[F.lab[i]][0]
    const db = blur(dl, fw, fh, 3.2), cut = new Float32Array(F.k), light = new Float32Array(n)
    for (let c = 0; c < F.k; c++) { // per flat, where its darkest quarter begins (and not at all where the flat is even)
      const v = []; for (let i = 0; i < n; i++) if (F.lab[i] === c) v.push(db[i])
      v.sort((a, b) => a - b); cut[c] = v.length > 60 ? Math.min(v[(v.length * 0.24) | 0], -0.03) : -9
    }
    const sh = new Float32Array(n)
    for (let i = 0; i < n; i++) { sh[i] = db[i] < cut[F.lab[i]] ? 1 : 0; light[i] = clamp(db[i] * 7, 0, 1) }
    const shade = blur(sh, fw, fh, 1.8) // the shade as a shape: its corners rounded and its specks gone, then cut crisp at the picture's own size
    const [fx, fy] = flow(Y, fw, fh, 3), lines = new Uint8Array(w * h), lit = new Uint8Array(w * h)
    hatch(lit, w, h, light, fw, fh, fx, fy, { ang: -0.785, thr: 0.6, da: 15 * s, len: 17 * s, fk: 0.3, r: 1.1 * s, seed: seed + 33, soft: 0.1, jit: 0.5 })
    const nx = noise(fw, fh, 24, seed + 5), ny = noise(fw, fh, 24, seed + 6), nz = noise(fw, fh, 9, seed + 8), D = fine(W, levels(W.l), 0.03, { min: 22, sigma: 1.6, adapt: 0.5 })
    drawChains(lines, w, h, chains(seams(flat, fw, fh, idc, 0.5), fw, fh, 8), k, { ww: fw, r: 2.3 * s, nx, ny, nz, amp: 0.9, taper: 0.2 })
    drawChains(lines, w, h, D.chains, w / W.w, { ww: W.w, r: 1.4 * s, a: 0.92, nx: noise(W.w, W.h, 30, seed + 7), ny: noise(W.w, W.h, 30, seed + 9), amp: 0.7, taper: 0.45, m: D.m, hi: D.hi })
    const mk = grow(marks(W, levels(W.l)), W.w, W.h, w, h)
    for (let i = 0; i < mk.length; i++) { const v = smooth(0.42, 0.58, mk[i]) * 255; if (v > lines[i]) lines[i] = v }
    const lab = growLabels(F.lab, fw, fh, w, h), sg = grow(shade, fw, fh, w, h), g = tile(seed + 3, 1.2), r = out(w, h), d = r.data, dx = Math.round(2.4 * s), dy = Math.round(1.6 * s), LINE = [44, 30, 62]
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, j = i * 4, p = Math.max(0, y - dy) * w + Math.max(0, x - dx), C = cls[lab[p]], e = lines[i] / 255, sd = smooth(0.46, 0.54, sg[p]), li = lit[i] / 255 * 0.9, t = 1 + 0.025 * g[((x + 37) & 255) | (((y + 91) & 255) << 8)]
      for (let q = 0; q < 3; q++) { const c = (C.own[q] * (1 - sd) + C.shade[q] * sd) * (1 - li) + C.shine[q] * li; d[j + q] = (c * (1 - e) + LINE[q] * e) * t }
      d[j + 3] = 255
    }
    return r
  },

  /** Comic print: loud flat colours, fat black outlines, Ben-Day dots for the shade, the light and the greys. */
  pop(W, o) {
    const { w, h, s, seed } = o, F = flats(W, 6, seed, { size: 380, kw: [2, 3], mr: 3, min: 0.0015, big: 0.01 }), fw = F.w, fh = F.h, n = fw * fh, k = w / fw
    const RED = [232, 40, 44], ORANGE = [255, 146, 28], YEL = [255, 212, 0], CYAN = [86, 198, 240], BLUE = [28, 70, 160], PINK = [255, 150, 188], GREEN = [34, 168, 96], FLESH = [255, 190, 156], CREAM = [255, 247, 226], BLACK = [22, 20, 26], MID = hex(o.accent, BLUE)
    const SHADE = new Map([[CREAM, BLACK], [YEL, ORANGE], [FLESH, RED], [PINK, RED], [ORANGE, RED], [CYAN, BLUE], [RED, BLACK], [GREEN, BLACK], [BLUE, BLACK], [MID, BLACK], [BLACK, BLACK]]) // the ink its shade is dotted in
    // what each flat becomes: a flat colour, or a colour of dots on cream (dot: its ink and how much of the cream it covers)
    const [lo, hi0] = pct(F.P[0], [0.01, 0.99]), role = ([L0, a, b]) => { // the photo's own light, stretched, so each has its blacks and its creams
      const L = 0.08 + 0.9 * clamp((L0 - lo) / Math.max(0.1, hi0 - lo), 0, 1), c = Math.hypot(a, b), f = family(a, b)
      if (L < 0.13) return { flat: BLACK }
      if (c < 0.04) return L > 0.88 ? { flat: CREAM } : L > 0.7 ? { flat: CREAM, dot: CYAN, cov: 0.3 } : L > 0.5 ? { flat: CREAM, dot: BLACK, cov: 0.32 } : L > 0.34 ? { flat: MID } : L > 0.24 ? { flat: MID, dot: BLACK, cov: 0.45 } : { flat: BLACK }
      if (L < 0.36) return f === 4 || f === 5 ? { flat: GREEN } : f >= 6 ? { flat: BLUE } : L < 0.2 ? { flat: BLACK } : { flat: RED, dot: BLACK, cov: 0.34 } // deep colours keep their hue; a dark red is red under black dots
      if (f === 0 || f === 1) return c > 0.1 || L < 0.6 ? { flat: RED } : { flat: FLESH }
      if (f === 2) return c > 0.1 ? { flat: ORANGE } : L > 0.8 ? { flat: CREAM, dot: ORANGE, cov: 0.25 } : { flat: FLESH, dot: RED, cov: 0.15 }
      if (f === 3) return { flat: YEL }
      if (f === 4) return c > 0.08 || L < 0.55 ? { flat: GREEN } : { flat: CREAM, dot: GREEN, cov: 0.3 }
      if (f === 5 || f === 6) return L > 0.66 ? { flat: CYAN } : { flat: BLUE }
      return L > 0.7 ? { flat: CREAM, dot: BLUE, cov: 0.3 } : { flat: f === 7 ? BLUE : PINK }
    }
    const R = F.C.map(role), Y = F.P[0], dl = new Float32Array(n)
    for (let i = 0; i < n; i++) dl[i] = Y[i] - F.C[F.lab[i]][0]
    const lab = growLabels(F.lab, fw, fh, w, h), shade = grow(blur(dl, fw, fh, 1.8), fw, fh, w, h)
    const lines = new Uint8Array(w * h), nx = noise(fw, fh, 24, seed + 5), ny = noise(fw, fh, 24, seed + 6), nz = noise(fw, fh, 9, seed + 8), D = fine(W, levels(W.l), 0.03, { min: 22, sigma: 1.5, adapt: 0.6 })
    drawChains(lines, w, h, chains(seams(F.lab, fw, fh, F.C, 0.1), fw, fh, 8), k, { ww: fw, r: 2.4 * s, nx, ny, nz, amp: 0.5, taper: 0.15 })
    drawChains(lines, w, h, D.chains, w / W.w, { ww: W.w, r: 1.5 * s, nx: noise(W.w, W.h, 30, seed + 7), ny: noise(W.w, W.h, 30, seed + 9), amp: 0.5, taper: 0.45, m: D.m, hi: D.hi })
    const mk = grow(marks(W, levels(W.l)), W.w, W.h, w, h)
    for (let i = 0; i < mk.length; i++) { const v = smooth(0.42, 0.58, mk[i]) * 255; if (v > lines[i]) lines[i] = v }
    const cell = Math.max(3.6, 8.2 * s), q = Math.SQRT1_2 / cell, g = tile(seed + 3, 1.0), r = out(w, h), d = r.data, dx = Math.round(1.8 * s), dy = Math.round(1.2 * s)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, sy = Math.max(0, y - dy) * w + Math.max(0, x - dx), ro = R[lab[sy]], v = shade[sy], e = lines[i] / 255
      let cov = ro.dot ? ro.cov : 0, ink = ro.dot || BLACK
      if (v < -0.025) { const sh = clamp((-v - 0.025) * 6, 0, 0.75); if (sh > cov) { cov = sh; ink = ro.dot ? BLACK : SHADE.get(ro.flat) } }
      else if (v > 0.045 && !ro.dot && ro.flat !== CREAM && ro.flat !== YEL) { cov = clamp((v - 0.045) * 6, 0, 0.6); ink = CREAM }
      let p = 0
      if (cov > 0.01) { const u = (x + y) * q, t = (x - y) * q, cu = (u - Math.floor(u) - 0.5) * cell, cv = (t - Math.floor(t) - 0.5) * cell; p = clamp(cell * 0.56 * Math.sqrt(cov) - Math.sqrt(cu * cu + cv * cv) + 0.5, 0, 1) }
      const gr = 1 + 0.025 * g[((x + 37) & 255) | (((y + 91) & 255) << 8)], j = i * 4
      for (let c = 0; c < 3; c++) { const px = ro.flat[c] * (1 - p) + ink[c] * p; d[j + c] = (px * (1 - e) + BLACK[c] * e) * gr }
      d[j + 3] = 255
    }
    return r
  },

  /** Two inks off a risograph, a hair out of register: pink for the warm and the middle, blue for the cool and the dark, each in its own screen of dots. */
  riso(W, o) {
    const { w: ww, h: wh } = W, { w, h, s, seed } = o, n = ww * wh, PINK = hex(o.accent, [255, 72, 176]), BLUE = [0, 120, 191], PAPER2 = [247, 241, 226]
    const [, ca0, cb0] = okOf(PINK.map((v) => v / 255)), ch = hue(ca0, cb0), A = Math.hypot(ca0, cb0) > 0.03 && ch > 200 && ch < 295 ? [255, 72, 176] : PINK // a blue accent would vanish into the blue ink
    const Y0 = levels(W.l, 0.58), soft = blur(Y0, ww, wh, 2.5), Y = new Float32Array(n), [, oa, ob] = toOk([W.r, W.g, W.b]), wsum = new Float32Array(n)
    for (let i = 0; i < n; i++) wsum[i] = oa[i] + 0.35 * ob[i]
    const warm = blur(wsum, ww, wh, 2)
    for (let i = 0; i < n; i++) Y[i] = clamp(Y0[i] + 0.7 * (Y0[i] - soft[i]), 0, 1)
    const F = new Float32Array(n * 2) // the two plates: how much ink each wants, 0..1
    for (let i = 0; i < n; i++) {
      const g = 1 - Y[i], wm = smooth(-0.05, 0.06, warm[i])
      F[i * 2] = clamp(Math.pow(smooth(0.06, 0.8, g), 0.9) * (0.5 + 0.7 * wm) * 0.95, 0, 1)
      F[i * 2 + 1] = clamp(Math.pow(smooth(0.3, 0.95, g), 1.1) * (0.45 + 0.75 * (1 - wm)) * 0.95, 0, 1)
    }
    const X = axis(w, ww), Y2 = axis(h, wh), g1 = tile(seed + 3, 0.8), g2 = tile(seed + 4, 2), g3 = tile(seed + 5, 0.5), starve = noise(w >> 2, h >> 2, 110 * s / 4, seed + 6), qw = w >> 2, r = out(w, h), d = r.data
    const cell = Math.max(3.2, 6.2 * s), cA = Math.cos(0.26) / cell, sA = Math.sin(0.26) / cell, cB = Math.cos(1.31) / cell, sB = Math.sin(1.31) / cell, bx = 3.4 * s, by = 2 * s // the blue screen sits off the pink by a few pixels
    const dot = (dens, fu, fv) => { // a round dot below half coverage, round holes above; fu, fv the place in its cell, 0..1
      if (dens <= 0.02) return 0
      if (dens >= 0.98) return 1
      if (dens <= 0.5) { const e = (fu - 0.5) * (fu - 0.5) + (fv - 0.5) * (fv - 0.5), rr = Math.sqrt(dens / Math.PI); return clamp((rr - Math.sqrt(e)) * cell + 0.5, 0, 1) }
      const cu = fu < 0.5 ? fu : 1 - fu, cv = fv < 0.5 ? fv : 1 - fv, rr = Math.sqrt((1 - dens) / Math.PI)
      return 1 - clamp((rr - Math.sqrt(cu * cu + cv * cv)) * cell + 0.5, 0, 1)
    }
    for (let y = 0; y < h; y++) {
      const r0 = Y2.i0[y] * ww, r1 = Y2.i1[y] * ww, fy = Y2.f[y]
      for (let x = 0; x < w; x++) {
        const a0 = (r0 + X.i0[x]) * 2, a1 = (r0 + X.i1[x]) * 2, b0 = (r1 + X.i0[x]) * 2, b1 = (r1 + X.i1[x]) * 2, fx = X.f[x]
        const pp = bil(F, 0, a0, a1, b0, b1, fx, fy), pq = bil(F, 1, a0, a1, b0, b1, fx, fy)
        const gr = g1[((x + 37) & 255) | (((y + 91) & 255) << 8)], go = g2[((x + 150) & 255) | (((y + 11) & 255) << 8)], gf = g3[((x + 5) & 255) | (((y + 77) & 255) << 8)], sv = starve[Math.min(starve.length - 1, (y >> 2) * qw + (x >> 2))]
        const ua = x * cA + y * sA, va = -x * sA + y * cA, ub = (x - bx) * cB + (y - by) * sB, vb = -(x - bx) * sB + (y - by) * cB
        const ia = dot(pp + gr * 0.06, ua - Math.floor(ua), va - Math.floor(va)) * (0.9 + 0.1 * go + 0.1 * gr + 0.05 * sv), ib = dot(pq + gr * 0.06, ub - Math.floor(ub), vb - Math.floor(vb)) * (0.9 + 0.1 * go - 0.1 * gr - 0.05 * sv)
        const j = (y * w + x) * 4, t = 1 + 0.035 * gr + 0.02 * gf
        for (let c = 0; c < 3; c++) d[j + c] = PAPER2[c] * (1 - ia * 0.92 * (1 - A[c] / 255)) * (1 - ib * 0.92 * (1 - BLUE[c] / 255)) * t
        d[j + 3] = 255
      }
    }
    return r
  },

  /** Gold on black lacquer, as ลายรดน้ำ: the subject cut out flat in gold leaf, fine gold lines in its half-lights, an echo line round it, thin dark lines within, a border. */
  gold(W, o) {
    const { w: ww, h: wh } = W, { w, h, s, seed } = o, n = ww * wh, k = w / ww, m = Math.min(w, h), GOLD_LO = [190, 138, 46], GOLD_HI = [255, 234, 156], LACQUER = [19, 14, 12]
    const Y0 = levels(W.l, 0.5), loc = blur(Y0, ww, wh, 0.05 * Math.max(ww, wh)), T = blur(Y0, ww, wh, 1.2)
    for (let i = 0; i < n; i++) T[i] = clamp(0.5 + 1.1 * (T[i] - loc[i]) + 0.7 * (T[i] - 0.5), 0, 1) // bright against its surroundings, and bright
    let rim = 0, rim2 = 0, mid = 0, nr = 0, nm = 0 // a plain bright ground round a darker subject: gold the subject, not the ground (the foot of the picture is left out: a subject stands on it)
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
      const v = T[y * ww + x]
      if (y < wh * 0.12 || ((x < ww * 0.1 || x > ww * 0.9) && y < wh * 0.8)) { rim += v; rim2 += v * v; nr++ } else if (Math.abs(x / ww - 0.5) < 0.25 && Math.abs(y / wh - 0.5) < 0.25) { mid += v; nm++ }
    }
    const flip = smooth(0.06, 0.2, rim / nr - mid / nm) * (1 - smooth(0.1, 0.2, Math.sqrt(Math.max(0, rim2 / nr - (rim / nr) ** 2))))
    if (flip > 0) for (let i = 0; i < n; i++) T[i] = T[i] * (1 - flip) + (1 - T[i]) * flip
    const [t2, t1] = pct(T, [0.5, 0.68]), L3 = new Uint8Array(n) // black, gold lines, flat gold
    for (let i = 0; i < n; i++) L3[i] = T[i] > t1 ? 2 : T[i] > t2 ? 1 : 0
    dropSpecks(L3, ww, wh, 3, Math.round(n * 0.0009))
    const mk = (f) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = f(L3[i]) ? 1 : 0; return a }
    const solid = mk((l) => l === 2), lit = mk((l) => l >= 1), g2 = blur(solid, ww, wh, 1), g1 = blur(lit, ww, wh, 1), wide = blur(lit, ww, wh, 3.5)
    const ink = new Uint8Array(w * h), echo = new Uint8Array(w * h), nx = noise(ww, wh, 40, seed + 7), ny = noise(ww, wh, 40, seed + 8)
    ;[[0.3, 0.75, 0.9], [0.14, 0.55, 0.7]].forEach(([lv, r, a]) => drawChains(echo, w, h, isoChains(wide, ww, wh, lv, 24), k, { ww, r: r * s, a, nx, ny, amp: 0.5, taper: 0.3 })) // the echoes outside
    drawChains(ink, w, h, isoChains(blur(solid, ww, wh, 3), ww, wh, 0.74, 18), k, { ww, r: 0.45 * s, a: 0.9, nx, ny, amp: 0.5, taper: 0.3 }) // a fine dark line close inside the gold
    const inl = new Uint8Array(w * h), half = blur(mk((l) => l === 1), ww, wh, 1.6), [fx, fy] = flow(Y0, ww, wh, 3.5) // the half-lights hatched in fine lines that follow the form
    hatch(inl, w, h, half, ww, wh, fx, fy, { ang: -0.6, thr: 0.5, da: 4.4 * s, len: 46 * s, fk: 0.65, r: 0.5 * s, a: 1, seed: seed + 41, soft: 0.12, jit: 0.15 })
    const D = fine(W, Y0, 0.07, { sigma: 1.2, min: 12, floor: 0.035 })
    drawChains(ink, w, h, D.chains, k, { ww, r: 0.58 * s, nx, ny, amp: 0.7, m: D.m, hi: D.hi })
    const leaf = noise(ww, wh, 26, seed + 6), glow = blur(lit, ww, wh, 9), F = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) { F[i * 4] = g2[i]; F[i * 4 + 1] = g1[i]; F[i * 4 + 2] = leaf[i]; F[i * 4 + 3] = glow[i] }
    const X = axis(w, ww), Y2 = axis(h, wh), gt = tile(seed + 3, 0.8), dust = tile(seed + 9, 0.9), r = out(w, h), d = r.data, u = Math.max(1, 0.0032 * m), band = 0.04 * m, DOT = 0.017 * m, LEAF = 0.085 * m, c235 = 0.0235 * m, c045 = 0.045 * m
    // what only depends on the column or the row, worked out once: the sheets of leaf, their seams, the dark at the edges
    const SW = Math.ceil(w / LEAF) + 1, SH = Math.ceil(h / LEAF) + 1, LH = new Float32Array(SW * SH), colI = new Int32Array(w), colS = new Float32Array(w), colV = new Float32Array(w), colT = new Float32Array(w)
    for (let q = 0; q < SW * SH; q++) LH[q] = (Math.imul(((q % SW) * 73856093) ^ (((q / SW) | 0) * 19349663), 2654435761) >>> 0) / 4294967296
    for (let x = 0; x < w; x++) { const sx = x / LEAF, si = Math.floor(sx), f = sx - si; colI[x] = si; colS[x] = Math.min(f, 1 - f) * LEAF; colV[x] = x / w - 0.5; colT[x] = Math.min(x, w - 1 - x) }
    for (let y = 0; y < h; y++) {
      const r0 = Y2.i0[y] * ww, r1 = Y2.i1[y] * ww, fy = Y2.f[y], ly = y / LEAF, lyi = Math.floor(ly), lyf = ly - lyi, rowS = Math.min(lyf, 1 - lyf) * LEAF, rowLH = lyi * SW, vy = y / h - 0.5, vy2 = vy * vy, ty = Math.min(y, h - 1 - y), top = 0.25 * (1 - y / h)
      const yd = ((y + 201) & 255) << 8, yg = ((y + 77) & 255) << 8
      for (let x = 0; x < w; x++) {
        const a0 = (r0 + X.i0[x]) * 4, a1 = (r0 + X.i1[x]) * 4, b0 = (r1 + X.i0[x]) * 4, b1 = (r1 + X.i1[x]) * 4, fx = X.f[x], i = y * w + x
        const wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy
        const m2 = F[a0] * wa + F[a1] * wb + F[b0] * wc + F[b1] * wd, m1 = F[a0 + 1] * wa + F[a1 + 1] * wb + F[b0 + 1] * wc + F[b1 + 1] * wd
        const M2 = m2 <= 0.42 ? 0 : m2 >= 0.58 ? 1 : smooth(0.42, 0.58, m2), M1 = m1 <= 0.42 ? 0 : m1 >= 0.58 ? 1 : smooth(0.42, 0.58, m1), e = ink[i] / 255, ring = echo[i] / 255
        let gold = M2
        if (M1 > M2) { const l = M1 * inl[i] / 255; if (l > gold) gold = l } // fine gold lines in the half-lights
        if (e > 0) gold = gold + e - 2 * gold * e * (gold > 0.5 ? 1 : 0.5) // the dark lines cut into the gold; thin gold lines on the black
        if (ring > 0) { const g = ring * (1 - M1); if (g > gold) gold = g }
        if (gold < 0.5) { const gl = F[a0 + 3] * wa + F[a1 + 3] * wb + F[b0 + 3] * wc + F[b1 + 3] * wd, sp2 = dust[((x + 11) & 255) | yd], th = 0.57 - 0.3 * gl; if (sp2 > th) { const g = 0.6 * smooth(th, th + 0.1 + 0.04 * gl, sp2); if (g > gold) gold = g } } // gold dust sprinkled round the leaf
        const tx = colT[x], t = tx < ty ? tx : ty
        if (o.frame && t < band + 2) { // the border: a thin line, a thick line, a row of dots between them, a ring at each corner
          const a = tx < ty ? y : x, ex = (a / DOT - Math.floor(a / DOT) - 0.5) * DOT, ey = t - c235
          let edge = Math.max(clamp(0.5 * u + 0.5 - Math.abs(t - 0.016 * m), 0, 1), clamp(0.9 * u + 0.5 - Math.abs(t - 0.031 * m), 0, 1), clamp(0.0042 * m + 0.5 - Math.sqrt(ex * ex + ey * ey), 0, 1))
          if (tx < c045 && ty < c045) { const cd = Math.hypot(tx - c235, ty - c235); edge = Math.max(edge * smooth(0.0095 * m, 0.0105 * m, cd), clamp(0.9 * u + 0.5 - Math.abs(cd - 0.0155 * m), 0, 1), clamp(0.005 * m + 0.5 - cd, 0, 1)) }
          gold = gold * smooth(band - u, band, t) * (1 - edge) + edge
        }
        const j = i * 4, vx = colV[x], seam = colS[x] < rowS ? colS[x] : rowS, lh = LH[rowLH + colI[x]], ds = vx + vy - 0.1, da = (ds < 0 ? -ds : ds) * 2
        let tone = 0.5 + 0.16 * (F[a0 + 2] * wa + F[a1 + 2] * wb + F[b0 + 2] * wc + F[b1 + 2] * wd) + top + 0.12 * (lh - 0.5) // a sheet of leaf laid beside another: its tone a little different, a hair of a seam between
        if (seam < 0.9) tone -= 0.12 * smooth(0.9, 0.2, seam) * (lh > 0.5 ? 1 : -1)
        tone = tone < 0 ? 0 : tone > 1 ? 1 : tone
        const sp = 1 - 0.1 * clamp(gt[((x + 5) & 255) | yg] * 4 - 1.3, 0, 1), dark = (1 - (vx * vx + vy2) * 0.9) * (da < 0.6 ? 1 + 0.35 * smooth(0.6, 0, da) : 1) * (1 - gold), gl2 = sp * gold
        d[j] = LACQUER[0] * dark + (GOLD_LO[0] + (GOLD_HI[0] - GOLD_LO[0]) * tone) * gl2; d[j + 1] = LACQUER[1] * dark + (GOLD_LO[1] + (GOLD_HI[1] - GOLD_LO[1]) * tone) * gl2; d[j + 2] = LACQUER[2] * dark + (GOLD_LO[2] + (GOLD_HI[2] - GOLD_LO[2]) * tone) * gl2; d[j + 3] = 255
      }
    }
    return r
  },
  /** Watercolour: a soft underwash, pale flat washes that darken where they dry, the shade glazed over, white paper left in the lights, a loose pen line on top. */
  wash(W, o) {
    const { w, h, s, seed } = o, F = flats(W, 12, seed, { size: 420, kw: [1, 2], mr: 2, min: 0.0005, big: 0.0025 }), fw = F.w, fh = F.h, n = fw * fh
    const Y = F.P[0], dl = new Float32Array(n), bl = F.P.map((p) => blur(p, fw, fh, 9))
    for (let i = 0; i < n; i++) dl[i] = Y[i] - F.C[F.lab[i]][0]
    const db = blur(dl, fw, fh, 1.6), pool = blur(toFloat(seams(F.lab, fw, fh, F.C, 0.06)), fw, fh, 1), bloom = noise(fw, fh, 36, seed + 9), PG = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], GL = new Float32Array(n)
    const col = F.C.map(([L, a, b]) => { const k = 1.12 + 0.4 * (1 - L), c = Math.hypot(a, b) * k, q = c > 0.19 ? 0.19 / c : 1; return fromOk(clamp(0.6 + 0.4 * L, 0, 0.98), (a * k + (a > 0 ? 0.008 : 0)) * q, (b * k + (b > 0 ? 0.008 : 0)) * q) }) // each flat as a pale wash, the darker ones deeper in colour
    for (let i = 0; i < n; i++) {
      const c = col[F.lab[i]], rs = 1 - 0.9 * smooth(0.72, 0.9, Y[i]) // the brightest parts stay paper
      for (let q = 0; q < 3; q++) PG[q][i] = 1 - (1 - c[q]) * rs
      GL[i] = rs * (smooth(0.015, 0.08, -db[i]) * 0.7 + 0.5 * smooth(0.45, 0.15, Y[i])) // the shade and the dark are glazed again, in the same pigment: deeper, not greyer
    }
    // the paint at the coarse size: underwash, wash dried darker at its edges, glaze, as how much of the paper's light each channel keeps
    const P0 = new Float32Array(n * 3), dry = 0.55, Ps = PG.map((x) => blur(x, fw, fh, 0.7)), gl = blur(GL, fw, fh, 1.6), COOL = [0.9, 0.94, 1]
    for (let i = 0; i < n; i++) {
      const rs = 1 - 0.9 * smooth(0.72, 0.9, Y[i]), dr = 1 + dry * clamp(pool[i] * 1.5, 0, 1), lo = 1 + 0.16 * bloom[i], [ur, ug, ub] = fromOk(clamp(0.82 + 0.18 * bl[0][i], 0, 1), bl[1][i] * 0.8, bl[2][i] * 0.8), U = [ur, ug, ub], g = gl[i]
      for (let q = 0; q < 3; q++) P0[i * 3 + q] = (1 - (1 - U[q]) * (0.25 + 0.75 * rs)) * Math.pow(Math.max(0, 1 - (1 - Ps[q][i]) * dr * lo), 1 + 2.4 * g) * Math.pow(COOL[q], g * 1.6)
    }
    const YL = levels(W.l), s1 = blur(YL, W.w, W.h, 1), s2 = blur(YL, W.w, W.h, 4), DET = new Float32Array(W.w * W.h) // the small brush: what the photo has finer than the washes, darker or lighter than its surroundings
    for (let i = 0; i < DET.length; i++) DET[i] = s1[i] - s2[i]
    const ink = new Uint8Array(w * h), D = fine(W, YL, 0.06, { min: 14, lo: 0.55, adapt: 0.6 })
    drawChains(ink, w, h, D.chains, w / W.w, { ww: W.w, r: 0.85 * s, a: 0.9, nx: noise(W.w, W.h, 22, seed + 5), ny: noise(W.w, W.h, 22, seed + 6), nz: noise(W.w, W.h, 9, seed + 8), amp: 1.4, taper: 0.5, gap: noise(W.w, W.h, 14, seed + 10), gapAt: -0.35 })
    const X = axis(w, fw), Y2 = axis(h, fh), XD = axis(w, W.w), YD = axis(h, W.h), g1 = tile(seed + 3, 0.8), g2 = tile(seed + 4, 2.2), g3 = tile(seed + 6, 0.5), r = out(w, h), d = r.data, PEN = [74, 52, 48], m = Math.min(w, h), vv = noise(w >> 2, h >> 2, 30, seed + 12), vw = w >> 2, fr = 0.045 * m
    for (let y = 0; y < h; y++) {
      const r0 = Y2.i0[y] * fw, r1 = Y2.i1[y] * fw, fy = Y2.f[y], e0 = YD.i0[y] * W.w, e1 = YD.i1[y] * W.w, ey = YD.f[y]
      for (let x = 0; x < w; x++) {
        const a0 = (r0 + X.i0[x]) * 3, a1 = (r0 + X.i1[x]) * 3, b0 = (r1 + X.i0[x]) * 3, b1 = (r1 + X.i1[x]) * 3, fx = X.f[x]
        const dt0 = DET[e0 + XD.i0[x]] + (DET[e0 + XD.i1[x]] - DET[e0 + XD.i0[x]]) * XD.f[x], dt1 = DET[e1 + XD.i0[x]] + (DET[e1 + XD.i1[x]] - DET[e1 + XD.i0[x]]) * XD.f[x], det = dt0 + (dt1 - dt0) * ey
        const i = y * w + x, j = i * 4, ga = g1[((x + 37) & 255) | (((y + 91) & 255) << 8)], gb = g2[((x + 5) & 255) | (((y + 150) & 255) << 8)], gc = g3[((x + 99) & 255) | (((y + 3) & 255) << 8)]
        const tooth = o.g * (0.5 * (ga + 0.4 * gc) + 0.12 * gb) // paper's tooth: pigment settles in the dips, and is not even
        let edge = 1
        const t = Math.min(x, y, w - 1 - x, h - 1 - y)
        if (o.frame && t < fr) edge = smooth(0.012, 0.03, t / m + 0.014 * vv[Math.min(vv.length - 1, (y >> 2) * vw + (x >> 2))] + 0.006 * ga)
        const e = ink[i] / 255 * 0.9, sh = (1 - e) * (1 + 0.025 * gc + 0.012 * ga)
        for (let q = 0; q < 3; q++) {
          let dk = 1 - bil(P0, q, a0, a1, b0, b1, fx, fy) // the pigment, and how thick
          dk = dk * (1 - 2.2 * det) - 0.5 * det * smooth(0.04, 0.2, dk) // the small brush: more pigment where the photo is darker than round it, less where lighter, none in the paper
          const p = 1 - dk * (1 + tooth * (0.09 + 0.5 * dk)) * edge
          d[j + q] = PAPER[q] * (p < 0 ? 0 : p) * sh + PEN[q] * e
        }
        d[j + 3] = 255
      }
    }
    return r
  },

  /** A Lanna temple mural, as at Wat Phumin: flat ochre, brick, indigo and cream under a steady black brush line, on plaster that has aged. */
  mural(W, o) {
    const { w, h, s, seed } = o, F = flats(W, 11, seed, { size: 384, kw: [2], mr: 2, min: 0.0006, big: 0.003 }), fw = F.w, fh = F.h, n = fw * fh, k = w / fw
    const PAL = [[238, 222, 184], [208, 154, 62], [174, 68, 42], [118, 42, 30], [44, 53, 88], [30, 23, 20]] // cream, ochre, brick, deep brick, indigo, soot
    // each flat takes one of them by where its light ranks in the picture (by area), the cool ones to indigo
    const rank = lightRank(F), pick = F.C.map(([L, a, b], i) => {
      const r = rank[i], c = Math.hypot(a, b), hh = hue(a, b)
      if (c > 0.035 && hh > 195 && hh < 315) return r < 0.08 ? 5 : r < 0.76 ? 4 : 0 // cool: indigo
      if (c > 0.035 && hh > 105 && hh <= 195) return r < 0.2 ? 5 : r < 0.58 ? 4 : r < 0.82 ? 1 : 0 // green: foliage to soot and indigo, its lights to ochre
      if (c > 0.07 && (hh < 40 || hh >= 315)) return r < 0.2 ? 3 : r < 0.9 ? 2 : 0 // red: brick
      if (c > 0.06 && hh >= 40) return r < 0.12 ? 3 : r < 0.4 ? 2 : r < 0.93 ? 1 : 0 // orange and yellow: brick in the dark, ochre in the light
      return r < 0.09 ? 5 : r < 0.25 ? 3 : r < 0.45 ? 2 : r < 0.74 ? 1 : 0 // the rest by its light
    })
    const lab2 = new Uint8Array(F.lab.length), pidx = PAL.map((c, i) => [i, 0, 0])
    for (let i = 0; i < lab2.length; i++) lab2[i] = pick[F.lab[i]]
    dropSpecks(lab2, fw, fh, 6, Math.round(n * 0.0008))
    const ink = new Uint8Array(w * h), Y = F.P[0], nx = noise(fw, fh, 24, seed + 5), ny = noise(fw, fh, 24, seed + 6), nz = noise(fw, fh, 9, seed + 8)
    drawChains(ink, w, h, chains(seams(F.lab, fw, fh, F.C, 0.04), fw, fh, 8), k, { ww: fw, r: 0.85 * s, a: 0.9, nx, ny, nz, amp: 0.8, taper: 0.15 })
    const D = fine(W, levels(W.l), 0.035, { min: 18, sigma: 1.4, adapt: 0.5 })
    drawChains(ink, w, h, D.chains, w / W.w, { ww: W.w, r: 0.85 * s, a: 0.9, nx: noise(W.w, W.h, 30, seed + 7), ny: noise(W.w, W.h, 30, seed + 9), amp: 0.7, taper: 0.45, m: D.m, hi: D.hi })
    drawChains(ink, w, h, chains(seams(lab2, fw, fh, pidx, 0.5), fw, fh, 8), k, { ww: fw, r: 1.85 * s, nx, ny, nz, amp: 0.8, taper: 0.1 }) // the steady brush line round each shape
    const mk = grow(marks(W, levels(W.l)), W.w, W.h, w, h)
    for (let i = 0; i < mk.length; i++) { const v = smooth(0.42, 0.58, mk[i]) * 235; if (v > ink[i]) ink[i] = v }
    const inner = new Float32Array(n), ind = new Float32Array(n) // the depths of a big flat: where a pattern may run
    for (let c = 0; c < PAL.length; c++) {
      let any = 0
      for (let i = 0; i < n; i++) { ind[i] = lab2[i] === c ? 1 : 0; any |= ind[i] }
      if (!any) continue
      const bx = box(ind, fw, fh, 8)
      for (let i = 0; i < n; i++) if (ind[i] && bx[i] > 0.9) { const v = smooth(0.9, 1, bx[i]); if (v > inner[i]) inner[i] = v }
    }
    // the plaster, painted at half size: cracks, paint lost, stains and fading; the lines and the grain go on at the picture's own size
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1), hs = s / 2, qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2), qs = s / 4
    const crk = new Uint8Array(hw * hh)
    cracks(crk, hw, hh, 110 * hs, seed + 15, { r: 0.75 * hs, a: 0.7, cover: 0.62, bend: 0.07 })
    cracks(crk, hw, hh, 34 * hs, seed + 17, { r: 0.5 * hs, a: 0.5, cover: 0.3, bend: 0.1 })
    const cr = new Float32Array(qw * qh) // how cracked each place is, as a soft field at quarter size
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) { const i = Math.min(hh - 1, y * 2) * hw + Math.min(hw - 2, x * 2); cr[y * qw + x] = (crk[i] + crk[i + 1] + crk[Math.min(crk.length - 1, i + hw)] + crk[Math.min(crk.length - 1, i + hw + 1)]) / 1020 }
    const soft = (f, cell) => blur(f, qw, qh, 0.3 * cell) // value noise sits on a grid; a blur takes the grid out of it
    const crb = blur(cr, qw, qh, 2.5 * qs * 2), lossB = soft(noise(qw, qh, 60 * qs, seed + 19), 60 * qs), lossN = soft(noise(qw, qh, 13 * qs, seed + 14), 13 * qs), slow = soft(noise(qw, qh, 70 * qs, seed + 12), 70 * qs), mid = soft(noise(qw, qh, 22 * qs, seed + 13), 22 * qs)
    const Q = new Float32Array(qw * qh * 3)
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) { // paint lost to the plaster: in clusters, along the cracks, more of it towards the foot of the wall
      const i = y * qw + x; Q[i * 3] = lossB[i] * 0.6 + lossN[i] * 0.4 + 0.46 * (y / qh) + 1.6 * crb[i] - 0.4; Q[i * 3 + 1] = slow[i]; Q[i * 3 + 2] = mid[i]
    }
    const lab = growLabels(lab2, fw, fh, hw, hh), dpt = grow(inner, fw, fh, hw, hh), wp = noise(hw, hh, 20, seed + 5), XQ = axis(hw, qw), YQ = axis(hh, qh), col = noise(hw, 2, 13 * s, seed + 16)
    const g1 = tile(seed + 3, 0.7), g2 = tile(seed + 4, 1.8), SOOT = PAL[5], CREAM = PAL[0], pitch = 6 * s, LINT = [0.9, 0.8, 0.6], HP = new Float32Array(hw * hh * 4)
    for (let y = 0; y < hh; y++) {
      const q0 = YQ.i0[y] * qw, q1 = YQ.i1[y] * qw, qy = YQ.f[y], drip = 0.5 + 0.5 * (1 - y / hh) * (1 - y / hh)
      for (let x = 0; x < hw; x++) {
        const i = y * hw + x, a0 = (q0 + XQ.i0[x]) * 3, a1 = (q0 + XQ.i1[x]) * 3, b0 = (q1 + XQ.i0[x]) * 3, b1 = (q1 + XQ.i1[x]) * 3, qx = XQ.f[x]
        const lv = bil(Q, 0, a0, a1, b0, b1, qx, qy), sl = bil(Q, 1, a0, a1, b0, b1, qx, qy), md = bil(Q, 2, a0, a1, b0, b1, qx, qy), st = col[x] * drip
        const loss = smooth(0.4, 0.46, lv), lip = smooth(0.35, 0.4, lv) - loss, stain = smooth(0.1, 0.9, sl * 0.6 + st * 0.55 + 0.2), fade = 0.05 + 0.13 * smooth(-0.1, 0.6, md + 0.5 * sl), crack = crk[i] / 255
        let pat = 0 // a pattern in the depths of the big flats: a lattice of fine lines, a dot where they cross
        const dp = dpt[i]
        if (dp > 0.01) {
          const wv = 0.9 * wp[i], u = (x + y + wv * 4) / pitch, v = (x - y + wv * 4) / pitch, du = Math.abs(u - Math.round(u)), dv = Math.abs(v - Math.round(v))
          pat = dp * Math.max(smooth(0.07, 0.02, Math.min(du, dv)) * 0.5, smooth(0.16, 0.07, Math.sqrt(du * du + dv * dv)) * 0.9)
        }
        const base = PAL[lab[i]], j = i * 4, dk = 1 - 0.2 * stain
        for (let q = 0; q < 3; q++) {
          let c = base[q] * (1 - 0.2 * pat) // the pattern darkens its flat
          c = c * (1 - fade) + CREAM[q] * fade
          c *= 1 - 0.2 * stain * (0.4 + (1 - LINT[q]) * 1.2)
          c = c * (1 - loss) + CREAM[q] * 0.93 * loss
          c *= 1 - 0.3 * lip
          c *= 1 - 0.6 * crack * 0.7
          HP[j + q] = c
        }
        HP[j + 3] = loss
      }
    }
    const X = axis(w, hw), Y2 = axis(h, hh), r = out(w, h), d = r.data, m = Math.min(w, h), t0 = 0.012 * m, t1 = 0.034 * m, u2 = Math.max(1, 0.0032 * m), bd = 0.021 * m, colT = new Float32Array(w)
    for (let x = 0; x < w; x++) colT[x] = Math.min(x, w - 1 - x)
    for (let y = 0; y < h; y++) {
      const r0 = Y2.i0[y] * hw, r1 = Y2.i1[y] * hw, fy = Y2.f[y], ty = Math.min(y, h - 1 - y), yA = ((y + 91) & 255) << 8, yB = ((y + 150) & 255) << 8
      for (let x = 0; x < w; x++) {
        const a0 = (r0 + X.i0[x]) * 4, a1 = (r0 + X.i1[x]) * 4, b0 = (r1 + X.i0[x]) * 4, b1 = (r1 + X.i1[x]) * 4, fx = X.f[x], i = y * w + x, j = i * 4
        const wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy
        const e = ink[i] / 255 * (1 - 0.5 * (HP[a0 + 3] * wa + HP[a1 + 3] * wb + HP[b0 + 3] * wc + HP[b1 + 3] * wd)), gr = 0.98 + 0.05 * g1[((x + 37) & 255) | yA] + 0.05 * g2[((x + 5) & 255) | yB]
        let edge = 0, band = 0
        const tx = colT[x], t = tx < ty ? tx : ty
        if (o.frame && t < t1 + 2) { // a border: a thick line, a band of deep brick with cream dots, a thin line
          const along = (tx < ty ? y : x) / bd, dot = Math.hypot((along - Math.round(along)) * bd, t - 0.0235 * m)
          edge = t < t0 ? 1 : Math.max(clamp(u2 * 1.2 + 0.5 - Math.abs(t - t0), 0, 1), clamp(u2 * 0.7 + 0.5 - Math.abs(t - t1), 0, 1))
          band = smooth(t0, t0 + 1, t) * smooth(t1, t1 - 1, t) * (1 - clamp(0.004 * m + 0.5 - dot, 0, 1))
        }
        for (let q = 0; q < 3; q++) {
          let c = (HP[a0 + q] * wa + HP[a1 + q] * wb + HP[b0 + q] * wc + HP[b1 + q] * wd) * gr
          if (band) c = c * (1 - band) + PAL[3][q] * gr * band
          if (e > 0) c = c * (1 - e) + SOOT[q] * e
          d[j + q] = edge ? c * (1 - edge) + SOOT[q] * edge : c
        }
        d[j + 3] = 255
      }
    }
    return r
  },
  /** A cyanotype, the sun print: the light of the photo in Prussian blues on cream paper, brushed on with a rough edge. Reads the photo itself, not the fixed copy. */
  cyan(_, o, src) {
    const { w, h, s, seed } = o, [aw, ah] = fit(w, h, 320), L0 = lumOf(planesOf(src, aw, ah)), f = stretch(L0, 0.5), TAB = Float32Array.from({ length: 1024 }, (_, i) => f(i / 1023))
    const Y = new Float32Array(aw * ah)
    for (let i = 0; i < Y.length; i++) Y[i] = f(L0[i])
    const bg = grow(blur(Y, aw, ah, 4), aw, ah, w, h), STOPS = [[0, 4, 26, 51], [0.16, 8, 50, 92], [0.4, 28, 104, 160], [0.66, 120, 178, 214], [0.86, 214, 235, 245], [1, 247, 250, 246]]
    const LUT = new Float32Array(257 * 3)
    for (let i = 0; i <= 256; i++) { const t = i / 256; let k = 0; while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++; const [t0, ...c0] = STOPS[k], [t1, ...c1] = STOPS[k + 1], u = clamp((t - t0) / (t1 - t0), 0, 1); for (let q = 0; q < 3; q++) LUT[i * 3 + q] = c0[q] + (c1[q] - c0[q]) * u }
    const qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2), mot = noise(qw, qh, 50 * s / 4, seed + 4), g1 = tile(seed + 3, 0.7), g2 = tile(seed + 5, 3), m = Math.min(w, h), r = out(w, h), d = r.data, sd = src.data, PAPER2 = [244, 238, 222], fr = 0.09 * m
    const brush = noise(Math.max(w, h), 2, 46 * s, seed + 6), bristle = noise(Math.max(w, h), 2, 3.2 * s, seed + 7), wob = noise(qw, qh, 140 * s / 4, seed + 8), kl = 1023 / 255
    for (let y = 0; y < h; y++) {
      const qy = Math.min(qh - 1, y >> 2) * qw
      for (let x = 0; x < w; x++) {
        const i = y * w + x, j = i * 4, a = g1[((x + 37) & 255) | (((y + 91) & 255) << 8)], b = g2[((x + 5) & 255) | (((y + 150) & 255) << 8)], q4 = qy + Math.min(qw - 1, x >> 2)
        let v = TAB[((0.2126 * sd[j] + 0.7152 * sd[j + 1] + 0.0722 * sd[j + 2]) * kl) | 0]
        v += 0.55 * (v - bg[i]) + 0.03 * mot[q4] + 0.012 * a + 0.01 * b // the photo's own light, its detail pushed, the coating gone on unevenly
        v = (v < 0 ? 0 : v > 1 ? 1 : v) * (0.97 + 0.04 * b)
        let e = 1
        const tx = x < w - 1 - x ? x : w - 1 - x, ty = y < h - 1 - y ? y : h - 1 - y, tt = tx < ty ? tx : ty
        if (o.frame && tt < fr) {
          const t = tt / m, along = (tx < ty ? y : x) % Math.max(w, h), br = brush[along], bs = bristle[along]
          const edgeAt = t + 0.011 * br + 0.008 * wob[q4] + 0.0035 * bs // where the brush stopped, strayed a little, and left the marks of its bristles
          e = smooth(0.015, 0.021, edgeAt)
          v = v * (1 - 0.3 * (1 - smooth(0.02, 0.075, edgeAt))) + 0.08 * (1 - smooth(0.015, 0.04, edgeAt)) + 0.025 * bs * (1 - smooth(0.02, 0.09, t)) // a little of the pooling at the edge, and its streaks
        }
        const li = ((v < 0 ? 0 : v > 1 ? 1 : v) * 256 | 0) * 3, gr = 1 + 0.012 * a
        d[j] = (PAPER2[0] * (1 - e) + LUT[li] * e) * gr; d[j + 1] = (PAPER2[1] * (1 - e) + LUT[li + 1] * e) * gr; d[j + 2] = (PAPER2[2] * (1 - e) + LUT[li + 2] * e) * gr; d[j + 3] = 255
      }
    }
    return r
  },
}

/** The photo made over. src: ImageData-like; style: one of STYLES; opt: { accent, seed, frame }. */
export function makeOver(src, style, opt = {}) {
  const w = src.width, h = src.height
  const sc = Math.max(0.55, Math.max(w, h) / 900), o = { w, h, s: sc, g: Math.min(1, 0.45 + 0.55 * sc), seed: opt.seed || 1015, accent: opt.accent || '', frame: opt.frame !== false } // s: how big a pen stroke is; g: how rough the paper (grain a pixel wide is coarse on a small picture)
  return style === 'fix' || !STYLE[style] ? STYLE.fix(src, o) : STYLE[style](RAW.has(style) ? null : work(src), o, src)
}
