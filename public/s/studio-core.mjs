// studio-core.mjs — the picture studio's tools: planes of a photo, blurs, colour, flat regions,
// the pen. studio.mjs draws the styles with them. Plain arrays, no dependencies; the same file
// runs in the browser and in node (tools/makeover.mjs, tools/studiolab.mjs).

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
export const mix = (a, b, t) => a + (b - a) * t
export function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
export const hex = (h, f) => (/^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : f)

/** Width and height for working on a photo of w×h, the long side at most max. */
export function fit(w, h, max) { const r = Math.min(1, max / Math.max(w, h)); return [Math.max(1, Math.round(w * r)), Math.max(1, Math.round(h * r))] }

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
let ACC = new Float32Array(0)
function boxV(a, b, w, h, r) {
  const k = 1 / (2 * r + 1)
  if (ACC.length < w) ACC = new Float32Array(w)
  ACC.fill(0, 0, w)
  for (let y = -r; y <= r; y++) { const o = clamp(y, 0, h - 1) * w; for (let x = 0; x < w; x++) ACC[x] += a[o + x] }
  for (let y = 0; y < h; y++) {
    const o = y * w, add = Math.min(y + r + 1, h - 1) * w, sub = Math.max(y - r, 0) * w
    for (let x = 0; x < w; x++) { b[o + x] = ACC[x] * k; ACC[x] += a[add + x] - a[sub + x] }
  }
}
let TMP = new Float32Array(0)
/** A box blur of half-width r (a window 2r+1 wide), one pass each way. */
export function box(f, w, h, r) {
  const out = new Float32Array(f.length)
  if (r < 1) { out.set(f); return out }
  if (TMP.length < f.length) TMP = new Float32Array(f.length)
  boxH(f, TMP, w, h, r); boxV(TMP, out, w, h, r)
  return out
}
export function blur(f, w, h, sigma) {
  const out = new Float32Array(f)
  if (sigma < 0.4) return out
  if (TMP.length < f.length) TMP = new Float32Array(f.length)
  for (const r of radii(sigma)) { const ri = Math.max(0, Math.round(r)); if (!ri) continue; boxH(out, TMP, w, h, ri); boxV(TMP, out, w, h, ri) }
  return out
}

/** Edge-keeping blur (a guided filter, the plane its own guide): flat parts go soft, edges stay. */
export function guided(p, w, h, r, eps) {
  const m = box(p, w, h, r), n = p.length, pp = new Float32Array(n)
  for (let i = 0; i < n; i++) pp[i] = p[i] * p[i]
  const q = box(pp, w, h, r), a = pp, b = new Float32Array(n)
  for (let i = 0; i < n; i++) { const v = Math.max(0, q[i] - m[i] * m[i]); a[i] = v / (v + eps); b[i] = m[i] - a[i] * m[i] }
  const ma = box(a, w, h, r), mb = box(b, w, h, r)
  for (let i = 0; i < n; i++) ma[i] = ma[i] * p[i] + mb[i]
  return ma
}

// ---- reading the photo --------------------------------------------------------------------------

/** The photo as r, g, b planes (0..1) at tw×th, each new pixel the mean of the old ones under it. */
export function planesOf(src, tw, th) {
  const { width: w, height: h, data: d } = src
  const P = [0, 1, 2].map(() => new Float32Array(tw * th))
  if (tw === w && th === h) { for (let i = 0, j = 0; j < tw * th; i += 4, j++) { P[0][j] = d[i] / 255; P[1][j] = d[i + 1] / 255; P[2][j] = d[i + 2] / 255 } return P }
  const rx = w / tw, ry = h / th, [p0, p1, p2] = P, cr = new Float32Array(w), cg = new Float32Array(w), cb = new Float32Array(w), kx = 1 / (255 * rx * ry)
  for (let oy = 0; oy < th; oy++) { // a row of new pixels at a time: the old rows under it summed (the first and last shared with the rows above and below), then each run of old pixels across
    const a = oy * ry, b = a + ry, j0 = a | 0, j1 = Math.min(h, Math.ceil(b))
    cr.fill(0); cg.fill(0); cb.fill(0)
    for (let j = j0; j < j1; j++) {
      const f = Math.min(b, j + 1) - Math.max(a, j)
      for (let x = 0, q = j * w * 4; x < w; x++, q += 4) { cr[x] += d[q] * f; cg[x] += d[q + 1] * f; cb[x] += d[q + 2] * f }
    }
    for (let ox = 0; ox < tw; ox++) {
      const xa = ox * rx, xb = xa + rx, i0 = xa | 0, i1 = Math.min(w, Math.ceil(xb)), f0 = Math.min(xb, i0 + 1) - xa
      let sr = cr[i0] * f0, sg = cg[i0] * f0, sb = cb[i0] * f0
      for (let i = i0 + 1; i < i1 - 1; i++) { sr += cr[i]; sg += cg[i]; sb += cb[i] }
      if (i1 - 1 > i0) { const f1 = xb - (i1 - 1); sr += cr[i1 - 1] * f1; sg += cg[i1 - 1] * f1; sb += cb[i1 - 1] * f1 }
      const o = oy * tw + ox
      p0[o] = sr * kx; p1[o] = sg * kx; p2[o] = sb * kx
    }
  }
  return P
}
export const lumOf = ([r, g, b]) => { const l = new Float32Array(r.length); for (let i = 0; i < l.length; i++) l[i] = 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i]; return l }

/** Where each of n output pixels sits among m source pixels: the two it lies between and the weight of the second. */
export function axis(n, m) {
  const i0 = new Int32Array(n), i1 = new Int32Array(n), f = new Float32Array(n), k = m / n
  for (let i = 0; i < n; i++) { const u = clamp((i + 0.5) * k - 0.5, 0, m - 1), a = u | 0; i0[i] = a; i1[i] = Math.min(a + 1, m - 1); f[i] = u - a }
  return { i0, i1, f }
}
/** Planes ww×wh made smaller, tw×th: each new pixel the mean of the old ones under it. */
export function shrink(P, ww, wh, tw, th) {
  if (tw >= ww && th >= wh) return P
  const rx = ww / tw, ry = wh / th
  return P.map((f) => {
    const t = new Float32Array(tw * wh), o = new Float32Array(tw * th)
    for (let y = 0; y < wh; y++) for (let ox = 0; ox < tw; ox++) { const a = ox * rx, b = a + rx, i1 = Math.min(ww, Math.ceil(b)); let sm = 0; for (let i = a | 0; i < i1; i++) sm += f[y * ww + i] * (Math.min(b, i + 1) - Math.max(a, i)); t[y * tw + ox] = sm / rx }
    for (let oy = 0; oy < th; oy++) { const a = oy * ry, b = a + ry, j1 = Math.min(wh, Math.ceil(b)); for (let x = 0; x < tw; x++) { let sm = 0; for (let j = a | 0; j < j1; j++) sm += t[j * tw + x] * (Math.min(b, j + 1) - Math.max(a, j)); o[oy * tw + x] = sm / ry } }
    return o
  })
}
/** A plane stretched to w×h, smoothly. */
export function grow(f, fw, fh, w, h) {
  const X = axis(w, fw), Y = axis(h, fh), o = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const r0 = Y.i0[y] * fw, r1 = Y.i1[y] * fw, fy = Y.f[y]
    for (let x = 0; x < w; x++) {
      const a = f[r0 + X.i0[x]], b = f[r0 + X.i1[x]], c = f[r1 + X.i0[x]], d = f[r1 + X.i1[x]], fx = X.f[x]
      o[y * w + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
    }
  }
  return o
}

/** The levels (0..1) below which the fractions ps of a plane lie. */
export function pct(f, ps) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < f.length; i++) hist[clamp((f[i] * 255) | 0, 0, 255)]++
  return ps.map((p) => { const want = f.length * p; let s = 0; for (let i = 0; i < 256; i++) { s += hist[i]; if (s >= want) return i / 255 } return 1 })
}
/** A plane's light stretched to its own range, its middle moved to mid: a dark photo reads like a bright one. */
export function levels(l, mid = 0.55) {
  const f = stretch(l, mid), out = new Float32Array(l.length)
  for (let i = 0; i < l.length; i++) out[i] = f(l[i])
  return out
}
/** The curve levels() applies, as a function of one light, to be used at another size. */
export function stretch(l, mid = 0.55) {
  const [lo, mid0, hi] = pct(l, [0.01, 0.5, 0.99])
  const span = Math.max(0.08, hi - lo), m = clamp((mid0 - lo) / span, 0.05, 0.95), gam = clamp(Math.log(mid) / Math.log(m), 0.45, 2.2)
  return (v) => Math.pow(clamp((v - lo) / span, 0, 1), gam)
}

// ---- colour: Oklab, a Lab that keeps hue steady ----------------------------------------------------

const GAM = new Float32Array(1024).map((_, i) => { const c = i / 1023; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
/** Oklab planes L (0..1), a, b (about ±0.3) from sRGB planes. */
export function toOk([r, g, b]) {
  const n = r.length, L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const R = GAM[(r[i] * 1023 + 0.5) | 0], G = GAM[(g[i] * 1023 + 0.5) | 0], Bl = GAM[(b[i] * 1023 + 0.5) | 0]
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * Bl), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * Bl), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * Bl)
    L[i] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    A[i] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    B[i] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  }
  return [L, A, B]
}
const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)
/** sRGB (0..1) of one Oklab colour; too vivid for the screen, it gives up chroma, not hue. */
export function fromOk(L, a, b) {
  for (let t = 0; t < 8; t++) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    if (t === 7 || (r >= -0.002 && r <= 1.002 && g >= -0.002 && g <= 1.002 && bl >= -0.002 && bl <= 1.002)) return [clamp(enc(clamp(r, 0, 1)), 0, 1), clamp(enc(clamp(g, 0, 1)), 0, 1), clamp(enc(clamp(bl, 0, 1)), 0, 1)]
    a *= 0.88; b *= 0.88
  }
}
export const okOf = (rgb) => { const [L, A, B] = toOk(rgb.map((v) => Float32Array.of(v))); return [L[0], A[0], B[0]] }

// ---- flat regions ---------------------------------------------------------------------------------------

/** Kuwahara: each pixel takes the mean of the calmest of the four squares around it (half-width r), so colours go flat and edges stay sharp. P: three planes w×h; wt: how much each counts in "calm". */
export function kuwahara(P, w, h, r, wt = [1, 1.6, 1.6]) {
  const n = w * h, M = [], calm = new Float32Array(n), q = new Float32Array(n)
  for (let c = 0; c < 3; c++) {
    const m = box(P[c], w, h, r), p = P[c]
    for (let i = 0; i < n; i++) q[i] = p[i] * p[i]
    const m2 = box(q, w, h, r), k = wt[c]
    for (let i = 0; i < n; i++) { const v = m2[i] - m[i] * m[i]; if (v > 0) calm[i] += k * v } // the variance, summed over the planes: how restless the square about each pixel is
    M.push(m)
  }
  const O = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], [m0, m1, m2] = M, [o0, o1, o2] = O
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - r) * w, yb = Math.min(h - 1, y + r) * w
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - r), xb = Math.min(w - 1, x + r), i0 = ya + xa, i1 = ya + xb, i2 = yb + xa, i3 = yb + xb
      let bi = i0, bv = calm[i0]
      if (calm[i1] < bv) { bv = calm[i1]; bi = i1 }
      if (calm[i2] < bv) { bv = calm[i2]; bi = i2 }
      if (calm[i3] < bv) { bv = calm[i3]; bi = i3 }
      const o = y * w + x
      o0[o] = m0[bi]; o1[o] = m1[bi]; o2[o] = m2[bi]
    }
  }
  return O
}

/** k colour centres [L, a, b] from the planes, by median cut (the box of colours that varies most is split at its middle, vivid colours counting more) and a few passes to settle them.
 *  Nothing random in it: the same photo gives the same centres. Give it a small picture, a hundred pixels across, and it gives them at whatever size the photo is later drawn. */
export function kmeans([L, A, B], k, wa = 1.4) {
  const n = L.length, w = new Float32Array(n), ix = new Int32Array(n), ch = [L, A, B], sc = [1, wa, wa], boxes = [[0, n]]
  for (let i = 0; i < n; i++) { w[i] = 1 + 3 * Math.hypot(A[i], B[i]); ix[i] = i }
  const spread = ([s, e]) => { // the axis the box varies most along, and how much, counting how many and how vivid
    let tot = 0; const m = [0, 0, 0], v = [0, 0, 0]
    for (let t = s; t < e; t++) { const i = ix[t]; tot += w[i]; for (let c = 0; c < 3; c++) m[c] += w[i] * ch[c][i] }
    for (let c = 0; c < 3; c++) m[c] /= tot || 1
    for (let t = s; t < e; t++) { const i = ix[t]; for (let c = 0; c < 3; c++) v[c] += w[i] * (ch[c][i] - m[c]) ** 2 * sc[c] * sc[c] }
    let ax = 0; for (let c = 1; c < 3; c++) if (v[c] > v[ax]) ax = c
    return [v[ax], ax]
  }
  const sp = [spread(boxes[0])]
  while (boxes.length < k) {
    let bi = 0; for (let i = 1; i < boxes.length; i++) if (sp[i][0] > sp[bi][0]) bi = i
    const [s, e] = boxes[bi], ax = sp[bi][1], v = ch[ax]
    if (e - s < 2 || sp[bi][0] <= 1e-9) break
    const part = Array.from(ix.subarray(s, e)).sort((x, y) => v[x] - v[y])
    let half = 0; for (const i of part) half += w[i]
    half /= 2
    let acc = 0, cut = 0
    for (; cut < part.length - 1; cut++) { acc += w[part[cut]]; if (acc >= half) break }
    part.forEach((i, t) => { ix[s + t] = i })
    boxes.splice(bi, 1, [s, s + cut + 1], [s + cut + 1, e])
    sp.splice(bi, 1, spread(boxes[bi]), spread(boxes[bi + 1]))
  }
  const C = boxes.map(([s, e]) => { let tot = 0; const m = [0, 0, 0]; for (let t = s; t < e; t++) { const i = ix[t]; tot += w[i]; for (let c = 0; c < 3; c++) m[c] += w[i] * ch[c][i] } return m.map((x) => x / (tot || 1)) })
  while (C.length < k) C.push(C[C.length - 1].slice()) // a picture of one colour has fewer to give: the last is repeated, and no pixel is ever nearest to the copy
  const k2 = C.length, w2 = wa * wa
  for (let it = 0; it < 6; it++) {
    const sum = C.map(() => [0, 0, 0, 0])
    for (let i = 0; i < n; i++) {
      let bc = 0, bd = 9
      for (let c = 0; c < k2; c++) { const dl = L[i] - C[c][0], da = A[i] - C[c][1], db = B[i] - C[c][2], d = dl * dl + w2 * (da * da + db * db); if (d < bd) { bd = d; bc = c } }
      const t = sum[bc]; t[0] += L[i] * w[i]; t[1] += A[i] * w[i]; t[2] += B[i] * w[i]; t[3] += w[i]
    }
    sum.forEach((t, c) => { if (t[3]) C[c] = [t[0] / t[3], t[1] / t[3], t[2] / t[3]] })
  }
  return C
}
/** Which of the centres each pixel is nearest to. */
export function assign([L, A, B], C, wa = 1.4) {
  const n = L.length, k = C.length, lab = new Uint8Array(n), cl = Float32Array.from(C, (c) => c[0]), ca = Float32Array.from(C, (c) => c[1]), cb = Float32Array.from(C, (c) => c[2]), w2 = wa * wa
  for (let i = 0; i < n; i++) {
    let bc = 0, bd = 9
    for (let c = 0; c < k; c++) { const da = A[i] - ca[c], db = B[i] - cb[c], dl = L[i] - cl[c], d = dl * dl + w2 * (da * da + db * db); if (d < bd) { bd = d; bc = c } }
    lab[i] = bc
  }
  return lab
}
/** Each pixel takes the label most of the pixels around it (half-width r) have: edges round off, specks go. */
export function mode(lab, k, w, h, r) {
  const n = lab.length, best = new Float32Array(n).fill(-1), out = new Uint8Array(n), ind = new Float32Array(n), t = new Float32Array(n)
  const seen = new Uint8Array(k); for (let i = 0; i < n; i++) seen[lab[i]] = 1
  for (let c = 0; c < k; c++) {
    if (!seen[c]) continue
    for (let i = 0; i < n; i++) ind[i] = lab[i] === c ? 1 : 0
    boxH(ind, t, w, h, r); boxV(t, ind, w, h, r)
    for (let i = 0; i < n; i++) if (ind[i] > best[i]) { best[i] = ind[i]; out[i] = c }
  }
  return out
}
/** Patches that are small join a neighbour: those under min pixels, the neighbour they touch most. Given the centres C, a patch is let off when it differs
 *  from its neighbours (colour distance up to 0.3) and has to be as big as big pixels when it hardly differs, and joins the neighbour nearest in colour. */
export function dropSpecks(lab, w, h, k, min, C = null, big = min) {
  const n = lab.length, seen = new Uint8Array(n), stack = new Int32Array(n), list = new Int32Array(n), tally = new Int32Array(k), D = new Float32Array(k * k)
  if (C) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) D[i * k + j] = Math.sqrt((C[i][0] - C[j][0]) ** 2 + (C[i][1] - C[j][1]) ** 2 + (C[i][2] - C[j][2]) ** 2)
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0]) continue
    const c = lab[s0]; let top = 0, cnt = 0
    stack[top++] = s0; seen[s0] = 1
    while (top) { // flood the patch, keeping its pixels in list
      const i = stack[--top]; list[cnt++] = i
      const x = i % w, y = (i / w) | 0
      if (x > 0 && !seen[i - 1] && lab[i - 1] === c) { seen[i - 1] = 1; stack[top++] = i - 1 }
      if (x < w - 1 && !seen[i + 1] && lab[i + 1] === c) { seen[i + 1] = 1; stack[top++] = i + 1 }
      if (y > 0 && !seen[i - w] && lab[i - w] === c) { seen[i - w] = 1; stack[top++] = i - w }
      if (y < h - 1 && !seen[i + w] && lab[i + w] === c) { seen[i + w] = 1; stack[top++] = i + w }
    }
    if (cnt >= big) continue
    tally.fill(0)
    for (let t = 0; t < cnt; t++) {
      const i = list[t], x = i % w, y = (i / w) | 0
      if (x > 0 && lab[i - 1] !== c) tally[lab[i - 1]]++
      if (x < w - 1 && lab[i + 1] !== c) tally[lab[i + 1]]++
      if (y > 0 && lab[i - w] !== c) tally[lab[i - w]]++
      if (y < h - 1 && lab[i + w] !== c) tally[lab[i + w]]++
    }
    let bc = c, bt = 0, tot = 0, near = 9
    for (let q = 0; q < k; q++) tot += tally[q]
    for (let q = 0; q < k; q++) {
      if (q === c || !tally[q]) continue
      if (C ? tally[q] >= tot * 0.15 && D[c * k + q] < near : tally[q] > bt) { near = C ? D[c * k + q] : near; bt = tally[q]; bc = q }
    }
    if (bc === c) continue
    const need = C ? min + (big - min) * (1 - smooth(0.04, 0.3, near)) : min
    if (cnt >= need) continue
    for (let t = 0; t < cnt; t++) lab[list[t]] = bc
  }
  return lab
}

// ---- noise, and which way things run -------------------------------------------------------------------------------

/** Smooth noise, cell px apart, -1..1: a hand that wobbles and paper that is not flat. */
export function noise(w, h, cell, seed) {
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
/** A 256×256 tile of grain (about ±0.5), blurred by sigma if given; read it at (x & 255, y & 255). */
export function tile(seed, sigma = 0) {
  const R = rng(seed), t = new Float32Array(65536).map(() => R() - 0.5)
  if (!sigma) return t
  const b = blur(t, 256, 256, sigma)
  let v = 0; for (let i = 0; i < b.length; i++) v += b[i] * b[i]
  const k = 0.289 / Math.sqrt(v / b.length) // the same spread as the unblurred tile
  for (let i = 0; i < b.length; i++) b[i] *= k
  return b
}
/** Which way the lines of a plane run: the angle doubled, as (cos, sin) planes, weighted by how sure it is. */
export function flow(l, w, h, sigma) {
  const n = l.length, gx = new Float32Array(n), gy = new Float32Array(n)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; gx[i] = l[i + 1] - l[i - 1]; gy[i] = l[i + w] - l[i - w] }
  const xx = new Float32Array(n), xy = new Float32Array(n), yy = new Float32Array(n)
  for (let i = 0; i < n; i++) { xx[i] = gx[i] * gx[i]; xy[i] = gx[i] * gy[i]; yy[i] = gy[i] * gy[i] }
  const a = blur(xx, w, h, sigma), b = blur(xy, w, h, sigma), c = blur(yy, w, h, sigma), cx = gx, cy = gy
  for (let i = 0; i < n; i++) {
    const s = a[i] + c[i] + 1e-6 // the vector's length is the coherence: 0 where nothing lines up, 1 where all does
    cx[i] = -(a[i] - c[i]) / s; cy[i] = -2 * b[i] / s // the line runs across the gradient
  }
  return [cx, cy]
}

// ---- the pen --------------------------------------------------------------------------------------------------------------

/** One pen stroke along n points (px, py) into the ink bytes (w×h): radius r in pixels, thin at both ends, a the darkness (0..1); pw, if given, leans on the pen point by point. */
export function pen(ink, w, h, px, py, n, r, a, pw, taper = 0.7) {
  let len = 0
  for (let i = 1; i < n; i++) { const dx = px[i] - px[i - 1], dy = py[i] - py[i - 1]; len += Math.sqrt(dx * dx + dy * dy) }
  if (len < 0.01) return
  const step = Math.max(0.6, r * 0.8), top = a * 255
  let run = 0
  for (let i = 1; i < n; i++) {
    const dx = px[i] - px[i - 1], dy = py[i] - py[i - 1], sl = Math.sqrt(dx * dx + dy * dy), cnt = Math.max(1, Math.ceil(sl / step))
    for (let t = 0; t < cnt; t++) {
      const u = (t + 0.5) / cnt, cx = px[i - 1] + dx * u, cy = py[i - 1] + dy * u, e = (run + sl * u) / len, ee = e < 0.02 ? 0.02 : e > 0.98 ? 0.98 : e
      const rr = r * (1 - taper + taper * Math.sqrt(Math.sin(Math.PI * ee))) * (pw ? pw[i - 1] + (pw[i] - pw[i - 1]) * u : 1), reach = rr + 0.5, reach2 = reach * reach
      const x0 = Math.max(0, (cx - reach) | 0), x1 = Math.min(w - 1, (cx + reach) | 0), y0 = Math.max(0, (cy - reach) | 0), y1 = Math.min(h - 1, (cy + reach) | 0)
      for (let y = y0; y <= y1; y++) {
        const ey = y + 0.5 - cy
        for (let x = x0; x <= x1; x++) {
          const ex = x + 0.5 - cx, d2 = ex * ex + ey * ey
          if (d2 >= reach2) continue
          const cov = (reach - Math.sqrt(d2)) * top, j = y * w + x
          if (cov > ink[j]) ink[j] = cov > top ? top : cov
        }
      }
    }
    run += sl
  }
}

/** Hatching: strokes laid on a slanted lattice (angle ang, rows da apart, strokes about len long) where the shade t (a plane ww×wh) is past thr, bending with the flow
 *  (fx, fy) by fk; written into ink (w×h bytes). The shade decides which seeds draw, and a stroke stops where it thins out, or where the plane stop (if given) is past stopAt: at a contour.
 *  jit is how far a row strays from its place, as a fraction of da. */
export function hatch(ink, w, h, t, ww, wh, fx, fy, { ang, thr, da, len, fk, r, a = 0.95, seed, soft = 0.18, jit = 0.7, stop = null, stopAt = 1 }) {
  const R = rng(seed), diag = Math.hypot(w, h), dx0 = Math.cos(ang), dy0 = Math.sin(ang), ax = -dy0, ay = dx0, sx = ww / w, sy = wh / h, along = len * 0.7
  const step = Math.max(0.8, r * 1.4), half = Math.ceil((len * 1.4) / step / 2) + 1, PX = new Float32Array(2 * half + 1), PY = new Float32Array(2 * half + 1), cb = Math.cos(2 * ang), sb = Math.sin(2 * ang)
  const at = (x, y) => clamp((y * sy) | 0, 0, wh - 1) * ww + clamp((x * sx) | 0, 0, ww - 1)
  for (let u = -diag / 2; u < diag / 2; u += da) for (let v = -diag / 2; v < diag / 2; v += along) {
    const cu = u + (R() - 0.5) * da * jit, cv = v + (R() - 0.5) * along * 0.6, x0 = w / 2 + cu * ax + cv * dx0, y0 = h / 2 + cu * ay + cv * dy0
    if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) continue
    const i0 = at(x0, y0)
    if (R() > smooth(thr - 0.04, thr + soft, t[i0]) || (stop && stop[i0] > stopAt)) continue
    const reach = Math.max(2, Math.round((len * (0.75 + 0.5 * R())) / step / 2)), ends = [0, 0]
    for (let k = 0; k < 2; k++) { // out from the seed, one way then the other, along the flow, until the shade runs out
      const dir = k ? 1 : -1, o = half + dir; let x = x0, y = y0, vx = dx0 * dir, vy = dy0 * dir, m = 0
      for (let q = 0; q < reach && q < half; q++) {
        const i = at(x, y), qx = (1 - fk) * cb + fk * fx[i], qy = (1 - fk) * sb + fk * fy[i], th = 0.5 * Math.atan2(qy, qx)
        let ex = Math.cos(th), ey = Math.sin(th)
        if (ex * vx + ey * vy < 0) { ex = -ex; ey = -ey }
        vx = ex; vy = ey; x += vx * step; y += vy * step
        if (x < 0 || y < 0 || x >= w || y >= h) break
        const j = at(x, y)
        if (t[j] < thr - 0.1 || (stop && stop[j] > stopAt)) break
        PX[o + dir * q] = x; PY[o + dir * q] = y; m++
      }
      ends[k] = m
    }
    PX[half] = x0; PY[half] = y0
    const lo = half - ends[0], cnt = ends[0] + 1 + ends[1]
    if (cnt > 1) pen(ink, w, h, PX.subarray(lo, lo + cnt), PY.subarray(lo, lo + cnt), cnt, r, a)
  }
}

// ---- lines ------------------------------------------------------------------------------------------------------------

/** Edges of a plane: thin lines where it changes most (after a blur of sigma), kept where among the strongest fraction q of the picture (and above floor) or touching one that is.
 *  Gives { on (a byte mask), m (the strength), hi (the strength a line needs to count as strong) }. */
export function edges(l, w, h, sigma, q, floor = 0.02, lo = 0.5, adapt = 0) {
  const n = w * h, s = blur(l, w, h, sigma), m = new Float32Array(n), gx = new Float32Array(n), gy = new Float32Array(n), cand = new Uint8Array(n)
  let top = 1e-6, mean = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; gx[i] = s[i + 1] - s[i - 1]; gy[i] = s[i + w] - s[i - w]; m[i] = Math.hypot(gx[i], gy[i]) * 0.5; mean += m[i] }
  if (adapt) { // where the picture is quiet, its few edges count for more: a face against a wall still gets its eyes drawn
    mean /= n
    const loc = blur(m, w, h, 0.06 * Math.max(w, h))
    for (let i = 0; i < n; i++) m[i] *= clamp(Math.pow(mean / (loc[i] + 0.2 * mean), adapt), 0.7, 3)
  }
  for (let i = 0; i < n; i++) if (m[i] > top) top = m[i]
  const hist = new Uint32Array(512); for (let i = 0; i < n; i++) hist[Math.min(511, (m[i] / top * 511) | 0)]++
  let acc = 0, b = 511; while (b > 0 && acc + hist[b] < n * q) acc += hist[b--]
  const hi = Math.max(floor, ((b + 1) / 511) * top), low = hi * lo
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, v = m[i]
    if (v < low) continue
    const ax = Math.abs(gx[i]), ay = Math.abs(gy[i]) // the two pixels along the gradient: the line stays where the change peaks
    const a = ay <= 0.4142 * ax ? i - 1 : ax <= 0.4142 * ay ? i - w : gx[i] * gy[i] > 0 ? i - w - 1 : i - w + 1
    const c = ay <= 0.4142 * ax ? i + 1 : ax <= 0.4142 * ay ? i + w : gx[i] * gy[i] > 0 ? i + w + 1 : i + w - 1
    if (v >= m[a] && v >= m[c]) cand[i] = 1
  }
  const on = new Uint8Array(n), stack = new Int32Array(n)
  let top2 = 0
  for (let i = 0; i < n; i++) if (cand[i] && m[i] >= hi) { on[i] = 1; stack[top2++] = i }
  while (top2) { // a weak edge stays when it joins a strong one
    const i = stack[--top2], x = i % w, y = (i / w) | 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
      const j = yy * w + xx
      if (cand[j] && !on[j]) { on[j] = 1; stack[top2++] = j }
    }
  }
  return { on, m, hi }
}
/** The lines of a thin mask as chains of points [x0, y0, x1, y1, …] (pixel centres, lightly smoothed), those shorter than min pixels left out. */
export function chains(on, w, h, min) {
  const n = w * h, seen = new Uint8Array(n), res = [], DX = [-1, 1, 0, 0, -1, 1, -1, 1], DY = [0, 0, -1, 1, -1, -1, 1, 1]
  const follow = (p, list, vx, vy) => {
    let x = p % w, y = (p / w) | 0
    for (;;) {
      let best = -1, bs = -9
      for (let k = 0; k < 8; k++) {
        const xx = x + DX[k], yy = y + DY[k]
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        const j = yy * w + xx
        if (!on[j] || seen[j]) continue
        const sc = (DX[k] * vx + DY[k] * vy) / Math.hypot(DX[k], DY[k]) - (k > 3 ? 0.05 : 0)
        if (sc > bs) { bs = sc; best = k }
      }
      if (best < 0) return
      vx = DX[best]; vy = DY[best]; x += vx; y += vy
      seen[y * w + x] = 1; list.push(x, y)
    }
  }
  for (let p = 0; p < n; p++) {
    if (!on[p] || seen[p]) continue
    seen[p] = 1
    const a = [], b = []
    follow(p, a, 0, 0); follow(p, b, 0, 0)
    const pts = []
    for (let i = b.length - 2; i >= 0; i -= 2) pts.push(b[i], b[i + 1])
    pts.push(p % w, (p / w) | 0)
    for (let i = 0; i < a.length; i += 2) pts.push(a[i], a[i + 1])
    const cnt = pts.length / 2
    if (cnt < min) continue
    const sm = new Float32Array(pts.length) // a moving average over seven points, the ends left where they are
    for (let i = 0; i < cnt; i++) {
      const lo = Math.max(0, i - 3), hi = Math.min(cnt - 1, i + 3), k = Math.min(i - lo, hi - i) // the window shrinks towards the ends so they stay
      let sx = 0, sy = 0
      for (let j = i - k; j <= i + k; j++) { sx += pts[j * 2]; sy += pts[j * 2 + 1] }
      sm[i * 2] = sx / (2 * k + 1) + 0.5; sm[i * 2 + 1] = sy / (2 * k + 1) + 0.5
    }
    res.push(sm)
  }
  return res
}

/** Where one flat meets another (labels lab, centres C, w×h): a thin mask, only where the two colours differ by more than thr. */
export function seams(lab, w, h, C, thr) {
  const k = C.length, D = new Float32Array(k * k), on = new Uint8Array(w * h)
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) D[i * k + j] = Math.sqrt((C[i][0] - C[j][0]) ** 2 + (C[i][1] - C[j][1]) ** 2 + (C[i][2] - C[j][2]) ** 2)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, l = lab[i]
    if ((x < w - 1 && lab[i + 1] !== l && D[l * k + lab[i + 1]] > thr) || (y < h - 1 && lab[i + w] !== l && D[l * k + lab[i + w]] > thr)) on[i] = 1
  }
  return on
}
/** Chains (from chains() or isoChains(), found on a grid ww px across) drawn as pen strokes k times as big: radius r, darkness a, a hand that wobbles by amp (planes nx, ny) and leans (plane nz);
 *  m and hi, if given, make the strong edges heavier; gap (a plane) and gapAt lift the pen where the plane is below gapAt, so the line is lost and found. */
export function drawChains(ink, w, h, chs, k, { ww, r, a = 1, nx, ny, nz, amp = 0.8, taper = 0.7, m, hi, gap, gapAt = -0.5 }) {
  const wh = Math.round(h / k)
  for (const c of chs) {
    const np = c.length / 2, px = new Float32Array(np), py = new Float32Array(np), pw = new Float32Array(np), up = gap ? new Uint8Array(np) : null; let st = 0
    for (let i = 0; i < np; i++) {
      const x = c[i * 2], y = c[i * 2 + 1], j = Math.min(wh - 1, y | 0) * ww + Math.min(ww - 1, x | 0)
      px[i] = (x + (nx ? nx[j] * amp : 0)) * k; py[i] = (y + (ny ? ny[j] * amp : 0)) * k; pw[i] = nz ? 0.85 + 0.3 * nz[j] : 1
      if (m) st += m[j]
      if (gap) up[i] = gap[j] < gapAt ? 1 : 0
    }
    if (m) st = clamp(st / np / hi, 0.6, 2)
    const rr = m ? r * (0.8 + 0.35 * st) : r, aa = m ? clamp(0.55 + 0.4 * st, 0.6, 1) : a
    if (!gap) { pen(ink, w, h, px, py, np, rr, aa, pw, taper); continue }
    for (let i = 0; i < np;) { // the pen runs on while the plane stays above the level, a piece of the line at a time
      if (up[i]) { i++; continue }
      let j = i; while (j < np && !up[j]) j++
      if (j - i > 2) pen(ink, w, h, px.subarray(i, j), py.subarray(i, j), j - i, rr, aa, pw.subarray(i, j), taper)
      i = j
    }
  }
}

/** Labels of a coarse ww×wh grid stretched to w×h with their edges kept smooth: where the four nearest coarse pixels disagree, the label with most weight wins. */
export function growLabels(lab, ww, wh, w, h) {
  const X = axis(w, ww), Y = axis(h, wh), o = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const r0 = Y.i0[y] * ww, r1 = Y.i1[y] * ww, fy = Y.f[y]
    for (let x = 0; x < w; x++) {
      const a = lab[r0 + X.i0[x]], b = lab[r0 + X.i1[x]], c = lab[r1 + X.i0[x]], d = lab[r1 + X.i1[x]]
      if (a === b && b === c && c === d) { o[y * w + x] = a; continue }
      const fx = X.f[x], wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy
      let best = a, bw = wa + (b === a ? wb : 0) + (c === a ? wc : 0) + (d === a ? wd : 0), t
      if (b !== a && (t = wb + (c === b ? wc : 0) + (d === b ? wd : 0)) > bw) { bw = t; best = b }
      if (c !== a && c !== b && (t = wc + (d === c ? wd : 0)) > bw) { bw = t; best = c }
      if (d !== a && d !== b && d !== c && wd > bw) best = d
      o[y * w + x] = best
    }
  }
  return o
}

/** The lines where a plane (w×h) crosses a level, as chains of points [x0, y0, x1, y1, …] (pixel centres; marching squares), those shorter than min points left out. */
export function isoChains(f, w, h, level, min = 8) {
  const n = w * h, adj = new Int32Array(4 * n).fill(-1), HI = (i) => (f[i] >= level ? 1 : 0)
  const link = (a, b) => { if (adj[2 * a] < 0) adj[2 * a] = b; else adj[2 * a + 1] = b; if (adj[2 * b] < 0) adj[2 * b] = a; else adj[2 * b + 1] = a }
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const i = y * w + x, c = HI(i) | (HI(i + 1) << 1) | (HI(i + w + 1) << 2) | (HI(i + w) << 3)
    if (c === 0 || c === 15) continue
    const T = i, B = i + w, L = n + i, R = n + i + 1
    switch (c) {
      case 1: case 14: link(T, L); break
      case 2: case 13: link(T, R); break
      case 3: case 12: link(L, R); break
      case 4: case 11: link(R, B); break
      case 6: case 9: link(T, B); break
      case 7: case 8: link(L, B); break
      default: { // the saddles: the middle decides which way they join
        const mid = (f[i] + f[i + 1] + f[i + w] + f[i + w + 1]) * 0.25 >= level
        if ((c === 5) === mid) { link(T, R); link(L, B) } else { link(T, L); link(R, B) }
      }
    }
  }
  const seen = new Uint8Array(2 * n), res = []
  const at = (e) => { // where the line crosses edge e
    if (e < n) { const t = (level - f[e]) / (f[e + 1] - f[e] || 1e-9); return [(e % w) + t + 0.5, ((e / w) | 0) + 0.5] }
    const i = e - n, t = (level - f[i]) / (f[i + w] - f[i] || 1e-9); return [(i % w) + 0.5, ((i / w) | 0) + t + 0.5]
  }
  const walk = (e0) => {
    const pts = []
    let prev = -1, e = e0
    while (e >= 0 && !seen[e]) {
      seen[e] = 1; const p = at(e); pts.push(p[0], p[1])
      const a = adj[2 * e], b = adj[2 * e + 1], nx = a >= 0 && a !== prev && !seen[a] ? a : b >= 0 && b !== prev && !seen[b] ? b : -1
      prev = e; e = nx
    }
    return pts
  }
  for (let e = 0; e < 2 * n; e++) if (!seen[e] && adj[2 * e] >= 0 && adj[2 * e + 1] < 0) { const p = walk(e); if (p.length >= 2 * min) res.push(Float32Array.from(p)) } // open lines first
  for (let e = 0; e < 2 * n; e++) if (!seen[e] && adj[2 * e] >= 0) { const p = walk(e); if (p.length >= 2 * min) { p.push(p[0], p[1]); res.push(Float32Array.from(p)) } } // then the loops
  return res
}

/** A hash of a lattice point, 0..1. */
const hash = (x, y, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
/** Smooth value noise at (x, y), the lattice cell px apart, -1..1. */
const vnoise = (x, y, cell, s) => {
  const u = x / cell, v = y / cell, x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s)
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1
}
/** Cracks in plaster: the lines between cells of about size px (a jittered lattice, each cell the ground nearest its own point), broken up and bent, drawn as pen strokes into ink (w×h bytes).
 *  Only where a slow noise passes cover (0..1: how much of the wall is cracked); r the radius of the line, a its darkness. */
export function cracks(ink, w, h, size, seed, { r = 0.6, a = 0.8, cover = 0.5, bend = 0.06 }) {
  const gw = Math.ceil(w / size) + 2, gh = Math.ceil(h / size) + 2, px = new Float32Array(gw * gh), py = new Float32Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { px[gy * gw + gx] = (gx - 0.5 + 0.12 + hash(gx, gy, seed) * 0.76) * size; py[gy * gw + gx] = (gy - 0.5 + 0.12 + hash(gx, gy, seed + 77) * 0.76) * size }
  const thr = (1 - cover) * 1.3 - 0.65, X = [], Yv = [], T = [], X2 = [], Y2 = [], T2 = [] // the cell, as a polygon, clipped by the lines half way to its neighbours
  const lack = (x, y) => vnoise(x, y, size * 5, seed + 9) + 0.5 * vnoise(x, y, size * 1.3, seed + 11) // where it is below thr the wall is whole
  for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
    const me = gy * gw + gx, cx = px[me], cy = py[me], hs = size * 1.6
    if (lack(cx, cy) < thr - 0.55) continue // a cell far inside whole wall draws nothing: not worked out
    X.length = 0; Yv.length = 0; T.length = 0
    X.push(cx - hs, cx + hs, cx + hs, cx - hs); Yv.push(cy - hs, cy - hs, cy + hs, cy + hs); T.push(-1, -1, -1, -1)
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue
      const gx2 = gx + dx, gy2 = gy + dy
      if (gx2 < 0 || gy2 < 0 || gx2 >= gw || gy2 >= gh) continue
      const j = gy2 * gw + gx2, nx = px[j] - cx, ny = py[j] - cy, c = (nx * (px[j] + cx) + ny * (py[j] + cy)) / 2
      X2.length = 0; Y2.length = 0; T2.length = 0
      const m = X.length
      for (let k = 0; k < m; k++) {
        const k2 = (k + 1) % m, ax = X[k], ay = Yv[k], bx = X[k2], by = Yv[k2], da = nx * ax + ny * ay - c, db = nx * bx + ny * by - c
        if (da <= 0) {
          X2.push(ax); Y2.push(ay); T2.push(T[k])
          if (db > 0) { const t = da / (da - db); X2.push(ax + (bx - ax) * t); Y2.push(ay + (by - ay) * t); T2.push(j) }
        } else if (db <= 0) { const t = da / (da - db); X2.push(ax + (bx - ax) * t); Y2.push(ay + (by - ay) * t); T2.push(T[k]) }
      }
      X.length = 0; Yv.length = 0; T.length = 0
      for (let k = 0; k < X2.length; k++) { X.push(X2[k]); Yv.push(Y2[k]); T.push(T2[k]) }
      if (X.length < 3) break
    }
    for (let k = 0; k < X.length; k++) {
      if (T[k] <= me) continue // each shared edge once
      const k2 = (k + 1) % X.length, ax = X[k], ay = Yv[k], bx = X[k2], by = Yv[k2], len = Math.hypot(bx - ax, by - ay), segs = Math.max(2, Math.round(len / (6 * (size / 40 + 0.5)))), nxp = -(by - ay) / (len || 1), nyp = (bx - ax) / (len || 1)
      const qx = new Float32Array(segs + 1), qy = new Float32Array(segs + 1)
      for (let q = 0; q <= segs; q++) {
        const t = q / segs, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, o = (q === 0 || q === segs ? 0 : 1) * vnoise(x, y, size * 0.45, seed + 3) * size * bend
        qx[q] = x + nxp * o; qy[q] = y + nyp * o
      }
      for (let q = 0; q < segs;) { // the line runs where the wall is cracked, in pieces
        const mx = (qx[q] + qx[q + 1]) / 2, my = (qy[q] + qy[q + 1]) / 2
        if (lack(mx, my) < thr) { q++; continue }
        let e = q + 1
        while (e < segs && lack((qx[e] + qx[e + 1]) / 2, (qy[e] + qy[e + 1]) / 2) >= thr) e++
        if (e - q >= 1) pen(ink, w, h, qx.subarray(q, e + 1), qy.subarray(q, e + 1), e - q + 1, r, a, null, 0.3)
        q = e
      }
    }
  }
}
