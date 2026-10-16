// logo-art.mjs — shapes and ornaments for logos, drawn in code: rounded boxes, stars, scallops,
// the Lanna ogee petal and corner fan, cross-stitch and woven bands, ribbons, a brush swash,
// ink erosion for a pressed chop. Everything draws in the units of the current transform.

/** A small seeded generator, so a design looks the same every time. */
export function rng(seed) {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pixels per unit under the current transform. */
export const scaleOf = (ctx) => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b) || 1 }

const TAU = Math.PI * 2

export function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function circle(ctx, cx, cy, r) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath() }

export function star(ctx, cx, cy, r1, r2, n = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1
    i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  ctx.closePath()
}

/** A disc with a scalloped edge: n bites of depth d (fraction of r). */
export function scallop(ctx, cx, cy, r, n = 28, d = 0.045) {
  const steps = n * 10
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const rr_ = r * (1 - d + d * Math.abs(Math.cos((t * n) / 2)))
    const x = cx + Math.cos(t) * rr_, y = cy + Math.sin(t) * rr_
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}

export function hexagon(ctx, cx, cy, r, rot = Math.PI / 6) {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3
    i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  ctx.closePath()
}

/** A heater shield, w wide and h tall with its point at the bottom. */
export function shield(ctx, x, y, w, h) {
  const cx = x + w / 2
  ctx.moveTo(x, y + h * 0.08)
  ctx.quadraticCurveTo(cx, y - h * 0.04, x + w, y + h * 0.08)
  ctx.lineTo(x + w, y + h * 0.5)
  ctx.bezierCurveTo(x + w, y + h * 0.78, cx + w * 0.2, y + h * 0.92, cx, y + h)
  ctx.bezierCurveTo(cx - w * 0.2, y + h * 0.92, x, y + h * 0.78, x, y + h * 0.5)
  ctx.closePath()
}

/** An arch window: a rectangle with a round top. */
export function arch(ctx, x, y, w, h) {
  const r = w / 2
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, 0)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
}

/** An ogee petal, the Thai pointed arch: base on y, tip h above it, w wide, centred on cx. */
export function ogee(ctx, cx, y, w, h) {
  const l = cx - w / 2, r = cx + w / 2
  ctx.moveTo(l, y)
  ctx.bezierCurveTo(l, y - h * 0.5, cx - w * 0.06, y - h * 0.46, cx, y - h)
  ctx.bezierCurveTo(cx + w * 0.06, y - h * 0.46, r, y - h * 0.5, r, y)
  ctx.closePath()
}

/** Petals fanned out of a point, radiating through span radians from rot; adds subpaths, fill after. */
export function fan(ctx, x, y, len, n = 5, rot = 0, span = Math.PI / 2) {
  for (let i = 0; i < n; i++) {
    const a = rot + (n === 1 ? span / 2 : (span * i) / (n - 1))
    const k = i === 0 || i === n - 1 ? 0.74 : i % 2 ? 0.88 : 1
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + Math.PI / 2)
    ogee(ctx, 0, 0, len * 0.34 * k, len * k)
    ctx.restore()
  }
}

/** A spiral that winds in to its centre: the curl at the end of a tendril. */
export function spiral(ctx, cx, cy, r0, turns, rot, sign = 1) {
  const N = 40
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = rot + sign * turns * Math.PI * 2 * t, r = r0 * (1 - t * 0.86)
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
}

/** A lotus rosette: n petals around a centre, alternating two tones, a bud in the middle. */
export function rosette(ctx, cx, cy, R, n, a, b, centre) {
  const step = TAU / n
  for (let i = 0; i < n; i++) {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(i * step - Math.PI / 2)
    ctx.beginPath()
    const L = R, W = R * 0.62, s0 = R * 0.22
    ctx.moveTo(s0, 0)
    ctx.bezierCurveTo(s0 + L * 0.22, -W * 0.55, s0 + L * 0.58, -W * 0.5, s0 + L * 0.78, 0)
    ctx.bezierCurveTo(s0 + L * 0.58, W * 0.5, s0 + L * 0.22, W * 0.55, s0, 0)
    ctx.closePath()
    ctx.fillStyle = i % 2 ? b : a
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.24, 0, TAU); ctx.fillStyle = centre; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, TAU); ctx.fillStyle = a; ctx.fill()
}

/** A kranok flame: base at the origin, tip up (negative y), length L, an S in its body and a curl at the tip. Adds a subpath. */
export function flame(ctx, L, W = 0.3, bend = 0.3) {
  const w = L * W
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-w * 1.1, -L * 0.18, -w * 0.9, -L * 0.55, bend * L * 0.4, -L * 0.8)
  ctx.bezierCurveTo(bend * L * 0.8, -L * 0.9, bend * L * 0.9, -L * 0.97, bend * L * 1.15, -L)
  ctx.bezierCurveTo(w * 0.1 + bend * L * 0.2, -L * 0.7, w * 1.1, -L * 0.45, w * 0.8, -L * 0.18)
  ctx.bezierCurveTo(w * 0.6, -L * 0.07, w * 0.3, -L * 0.02, 0, 0)
  ctx.closePath()
}

/** A wheel of kranok flames about a centre, each turning the same way: the Lanna corner. */
export function kranokWheel(ctx, cx, cy, R, n, a, b, centre) {
  for (let i = 0; i < n; i++) {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate((i * TAU) / n); ctx.translate(0, -R * 0.3)
    ctx.beginPath(); flame(ctx, R * 0.85, 0.3, 0.32)
    ctx.fillStyle = i % 2 ? b : a
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, TAU); ctx.fillStyle = centre; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.15, 0, TAU); ctx.fillStyle = a; ctx.fill()
}

/** A row of ogee petals along a line from x0 to x1, base on y, tips up (h > 0) or down (h < 0). */
export function ogeeRow(ctx, x0, x1, y, n, w, h) {
  const step = (x1 - x0) / n
  for (let i = 0; i < n; i++) ogee(ctx, x0 + step * (i + 0.5), y, w, h)
}

/** An offscreen layer at the device resolution of the current transform; call .put() to lay it down. */
export function layer(ctx, w, h, draw) {
  let k = scaleOf(ctx)
  const cap = 4096
  k = Math.min(k, cap / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k))
  const lc = c.getContext('2d')
  lc.scale(k, k)
  draw(lc, k)
  return { canvas: c, ctx: lc, k, put: (x = 0, y = 0, a = 1) => { if (a !== 1) { ctx.save(); ctx.globalAlpha *= a } ctx.drawImage(c, x, y, w, h); if (a !== 1) ctx.restore() } }
}

/** Take small bites out of what a layer holds: the worn edge of a pressed stamp. */
export function erode(lc, w, h, seed, amount = 1, size = 3) {
  const r = rng(seed)
  lc.save()
  lc.globalCompositeOperation = 'destination-out'
  const n = Math.round(((w * h) / 900) * amount)
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, s = size * (0.25 + r() * r() * 1.5)
    lc.globalAlpha = 0.5 + r() * 0.5
    lc.beginPath()
    if (r() < 0.8) lc.arc(x, y, s, 0, Math.PI * 2)
    else { lc.moveTo(x, y); lc.lineTo(x + (r() - 0.5) * s * 8, y + (r() - 0.5) * s * 2) ; lc.lineWidth = s * 0.5; lc.stroke(); continue }
    lc.fill()
  }
  lc.restore()
}

/** A tapered brush stroke along a gentle S: the underline under a script name. */
export function swash(ctx, x0, x1, y, amp = 10, thick = 9, flick = 1) {
  const w = x1 - x0
  const top = (t) => y + Math.sin(t * Math.PI * 1.1) * amp * 0.5
  ctx.moveTo(x0, y + amp * 0.1)
  const N = 24
  for (let i = 0; i <= N; i++) {
    const t = i / N, th = thick * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.3 * t)
    ctx.lineTo(x0 + w * t, top(t) - th / 2 - (flick ? t * t * amp * 0.9 : 0))
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N, th = thick * Math.sin(Math.PI * Math.pow(t, 0.7)) * (1 - 0.3 * t)
    ctx.lineTo(x0 + w * t, top(t) + th / 2 - (flick ? t * t * amp * 0.9 : 0))
  }
  ctx.closePath()
}

/** Cross-stitch grids, one letter a cell: P pink, Y yellow, G green, W white, B blue, '.' cloth. */
export const BANDS = {
  akha: [
    '.....P...........P......',
    '....PYP.........PYP.....',
    '...PYGYP...W...PYGYP....',
    '..PYGWGYP.WPW.PYGWGYP...',
    '.PYGWPWGYPWPWPYGWPWGYP..',
    '..PYGWGYP.WPW.PYGWGYP...',
    '...PYGYP...W...PYGYP....',
    '....PYP.........PYP.....',
    '.....P...........P......',
  ],
  zig: [
    'P.....P.....P.....P.....',
    '.P...P.P...P.P...P.P....',
    '..P.P...P.P...P.P...P...',
    '...P.....P.....P.....P..',
  ],
  tri: [
    '..Y.....Y.....Y.....Y...',
    '.YYY...YYY...YYY...YYY..',
    'YYYYY.YYYYY.YYYYY.YYYYY.',
  ],
  hem: [
    '...W...W...W...W...W...W',
    '..WPW.WPW.WPW.WPW.WPW.WP',
    '.WPYPWPYPWPYPWPYPWPYPWPY',
    '..WPW.WPW.WPW.WPW.WPW.WP',
    '...W...W...W...W...W...W',
  ],
  dots: [
    'W...Y...P...G...',
    '.W...Y...P...G..',
  ],
}

/** Paint a stitch grid: each cell an X of two threads. colours maps a letter to a colour. */
export function stitchGrid(ctx, rows, colours, x, y, cell, o = {}) {
  const lw = cell * (o.thick || 0.4)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = lw
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = colours[row[i]]
      if (!c) continue
      const a = x + i * cell + cell * 0.14, b = y + j * cell + cell * 0.14, e = cell * 0.72
      ctx.strokeStyle = c
      ctx.beginPath()
      ctx.moveTo(a, b); ctx.lineTo(a + e, b + e)
      ctx.moveTo(a + e, b); ctx.lineTo(a, b + e)
      ctx.stroke()
    }
  })
  ctx.restore()
}

/** A band repeated to fill width w (cells of size cell), starting at x. */
export function stitchBand(ctx, rows, colours, x, y, w, cell, o = {}) {
  const cols = rows[0].length
  const n = Math.ceil(w / (cols * cell))
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y - cell, w, rows.length * cell + cell * 2); ctx.clip()
  for (let i = 0; i < n; i++) stitchGrid(ctx, rows, colours, x + i * cols * cell, y, cell, o)
  ctx.restore()
}

/**
 * Cross-stitch anything: src is a canvas; each cell where the source has colour gets an X in the
 * nearest thread of the list. Used for a name and an icon sewn on cloth.
 */
export function stitchCanvas(ctx, src, x, y, w, h, cell, threads, o = {}) {
  const cols = Math.max(1, Math.round(w / cell)), rows = Math.max(1, Math.round(h / cell))
  const t = document.createElement('canvas')
  t.width = cols; t.height = rows
  const tc = t.getContext('2d', { willReadFrequently: true })
  tc.imageSmoothingEnabled = true
  tc.imageSmoothingQuality = 'high'
  tc.drawImage(src, 0, 0, cols, rows)
  const px = tc.getImageData(0, 0, cols, rows).data
  const rgbT = threads.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)))
  const cw = w / cols, ch = h / rows, lw = Math.min(cw, ch) * (o.thick || 0.42)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = lw
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = (j * cols + i) * 4, a = px[k + 3] / 255
    if (a < (o.cut ?? 0.45)) continue
    let best = 0, bd = 1e9
    if (threads.length > 1) rgbT.forEach((c, n) => { const d = (c[0] - px[k]) ** 2 + (c[1] - px[k + 1]) ** 2 + (c[2] - px[k + 2]) ** 2; if (d < bd) { bd = d; best = n } })
    const col = threads[best]
    const x0 = x + i * cw + cw * 0.14, y0 = y + j * ch + ch * 0.14, ex = cw * 0.72, ey = ch * 0.72
    if (o.shadow) {
      ctx.strokeStyle = o.shadow
      ctx.beginPath(); ctx.moveTo(x0 + cw * 0.08, y0 + ch * 0.1); ctx.lineTo(x0 + ex + cw * 0.08, y0 + ey + ch * 0.1); ctx.moveTo(x0 + ex + cw * 0.08, y0 + ch * 0.1); ctx.lineTo(x0 + cw * 0.08, y0 + ey + ch * 0.1); ctx.stroke()
    }
    ctx.strokeStyle = col
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ex, y0 + ey); ctx.moveTo(x0 + ex, y0); ctx.lineTo(x0, y0 + ey); ctx.stroke()
  }
  ctx.restore()
}

/** Woven pixels: each cell a small raised square of thread on dark cloth. */
export function wovenGrid(ctx, rows, colours, x, y, cell) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = colours[row[i]]
      if (!c) continue
      ctx.fillStyle = c
      ctx.beginPath()
      rr(ctx, x + i * cell + cell * 0.06, y + j * cell + cell * 0.06, cell * 0.88, cell * 0.88, cell * 0.16)
      ctx.fill()
    }
  })
}

export function wovenBand(ctx, rows, colours, x, y, w, cell) {
  const cols = rows[0].length
  const n = Math.ceil(w / (cols * cell))
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, rows.length * cell); ctx.clip()
  for (let i = 0; i < n; i++) wovenGrid(ctx, rows, colours, x + i * cols * cell, y, cell)
  ctx.restore()
}

/** Light threads across a cloth rectangle: warp and weft, for the woven and stitched labels. */
export function cloth(ctx, x, y, w, h, tone, step = 4, a = 0.07) {
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  ctx.strokeStyle = tone
  ctx.globalAlpha = a
  ctx.lineWidth = Math.max(0.5, step * 0.22)
  ctx.beginPath()
  for (let i = 0; i <= w; i += step) { ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h) }
  ctx.stroke()
  ctx.beginPath()
  for (let j = 0; j <= h; j += step) { ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j) }
  ctx.stroke()
  ctx.restore()
}
