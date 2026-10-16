// logo-culture.mjs — the layouts that come from here: the red square chop, the Lanna frame and
// gable (gold on lacquer, ogee petals), the night-market neon sign, Akha cross-stitch, woven
// labels with a hem of diamonds, the poster sunburst, a price tag, and the ribbon emblem.
// Also the cover grounds that go with each.

import { fitName, drawBlock, line, ink, hasThai, clusters } from './logo-text.mjs'
import { rr, circle, star, scallop, shield, ogee, rosette, ogeeRow, layer, erode, rng, scaleOf, BANDS, stitchBand, stitchCanvas, wovenBand, cloth, hexagon } from './logo-art.mjs'
import { alpha, mix, shade, readable, contrast, lum, toHsl } from './logo-color.mjs'
import { bodyH, within, stack, smallLine } from './logo-layouts.mjs'

const TAU = Math.PI * 2
const PI = Math.PI

const metal = (c, x0, y0, x1, y1, base) => {
  const g = c.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, mix(base, '#000000', 0.38))
  g.addColorStop(0.28, mix(base, '#ffffff', 0.5))
  g.addColorStop(0.5, base)
  g.addColorStop(0.74, mix(base, '#ffffff', 0.35))
  g.addColorStop(1, mix(base, '#000000', 0.42))
  return g
}

// ---- chop -----------------------------------------------------------------------------------

function chop(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const nameT = E.name(true)
  const smallT = E.small()
  const ink_ = v === 1 ? R.brand : R.panel
  const on = v === 0 ? R.onPanel : null
  const track = d.track || 0
  const iconLook = d.iconLook === 'auto' ? 'mono' : d.iconLook
  const hasI = E.hasIcon
  const seed = d.seed | 0
  let bw = 760, bh = 760
  if (v === 2) { bw = 1000; bh = 520 }
  const inset = v === 0 ? 96 : v === 1 ? 92 : 62
  const aw = (v === 2 ? 500 : bw - inset * 2)
  const tb = smallT ? smallLine(E, d, smallT, 50, aw, { track: 0.03, maxLines: 2 }) : null
  const iconH = hasI ? (v === 2 ? 0 : 175) : 0
  const gap = 24
  const maxH = (bh - inset * 2) - iconH - (iconH ? gap : 0) - (tb ? tb.h + gap : 0)
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: aw, maxH: Math.max(150, maxH), maxLines: 3, maxSize: 200, minSize: 46, track, lhk: 0.98 })
  const M = 46
  const W = bw + M * 2, H = bh + M * 2
  const rot = v === 0 ? -0.03 : v === 1 ? -0.055 : -0.02
  return {
    w: W, h: H,
    draw(c, S) {
      c.save()
      c.translate(W / 2, H / 2); c.rotate(rot); c.translate(-bw / 2, -bh / 2)
      const lay = layer(c, bw, bh, (lc) => {
        const q = { hair: (n) => Math.max(n, 1.25 / scaleOf(lc)) }
        lc.lineJoin = 'round'
        if (v === 0) {
          lc.beginPath(); rr(lc, 0, 0, bw, bh, 42); lc.fillStyle = R.panel; lc.fill()
          lc.strokeStyle = R.onPanel; lc.lineWidth = 14; lc.beginPath(); rr(lc, 26, 26, bw - 52, bh - 52, 24); lc.stroke()
          lc.lineWidth = q.hair(4); lc.beginPath(); rr(lc, 54, 54, bw - 108, bh - 108, 12); lc.stroke()
        } else if (v === 1) {
          lc.strokeStyle = ink_; lc.lineWidth = 22; lc.beginPath(); rr(lc, 11, 11, bw - 22, bh - 22, 36); lc.stroke()
          lc.lineWidth = q.hair(5); lc.beginPath(); rr(lc, 50, 50, bw - 100, bh - 100, 14); lc.stroke()
        } else {
          lc.strokeStyle = R.panel; lc.lineWidth = 22; lc.beginPath(); rr(lc, 11, 11, bw - 22, bh - 22, 30); lc.stroke()
          if (hasI) {
            lc.beginPath()
            lc.moveTo(11 + 30, 11); lc.lineTo(392, 11); lc.lineTo(392, bh - 11); lc.lineTo(11 + 30, bh - 11)
            lc.arcTo(11, bh - 11, 11, bh - 41, 30); lc.lineTo(11, 41); lc.arcTo(11, 11, 41, 11, 30); lc.closePath()
            lc.fillStyle = R.panel; lc.fill()
          }
        }
        const colName = v === 0 ? R.onPanel : v === 1 ? ink_ : R.panel
        const colSmall = v === 0 ? R.onPanel : v === 1 ? ink_ : R.text
        let x = bw / 2
        if (v === 2) {
          if (hasI) E.icon(lc, d.icon, 196, bh / 2, 250, 300, { look: iconLook, ink: R.onPanel, bg: R.panel })
          x = hasI ? 380 + (bw - 380 - 22) / 2 : bw / 2
        }
        const total = iconH + (iconH ? gap : 0) + nb.h + (tb ? gap + tb.h : 0)
        let y = (bh - total) / 2
        if (iconH) { E.icon(lc, d.icon, bw / 2, y + iconH / 2, 220, iconH, { look: iconLook, ink: v === 0 ? R.onPanel : ink_, bg: v === 0 ? R.panel : R.ground }); y += iconH + gap }
        drawBlock(lc, nb, x, y + nb.asc, { fill: colName }); y += nb.h
        if (tb) drawBlock(lc, tb, x, y + gap + tb.asc, { fill: colSmall })
        erode(lc, bw, bh, seed + 11, v === 0 ? 0.55 : 0.9, v === 0 ? 2.6 : 3.2)
      })
      lay.put(0, 0)
      c.restore()
    },
  }
}

// ---- neon -----------------------------------------------------------------------------------

function neonText(c, S, text, x, y, font, size, col, o = {}) {
  const k = S.k
  c.save()
  c.font = font; c.textAlign = o.align || 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'
  const glow = mix(col, '#ffffff', 0.1)
  c.shadowColor = col
  for (const [b, a] of [[size * 0.55, 0.5], [size * 0.26, 0.85]]) { c.shadowBlur = b * k; c.globalAlpha = a; c.fillStyle = glow; c.fillText(text, x, y) }
  c.shadowBlur = 0; c.globalAlpha = 1
  c.fillStyle = col; c.fillText(text, x, y)
  c.strokeStyle = mix(col, '#ffffff', 0.72); c.lineWidth = Math.max(size * 0.03, 1.2 / k); c.strokeText(text, x, y)
  c.restore()
}

function vividTubes(list, panel) {
  const score = (c) => { const [, sat, l] = toHsl(c); return sat * (1 - Math.abs(l - 0.6)) }
  const lit = list.map((c) => (contrast(c, panel) < 4.5 ? mix(c, '#ffffff', 0.35) : c))
  return lit.sort((x, y) => score(y) - score(x))
}

function neon(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const night = lum(R.deep) < 0.08 ? R.deep : '#0b0d26'
  const panel = mix(night, '#000000', 0.15)
  const [t1, t2, t3] = vividTubes([R.main, R.accent, R.accent2], panel)
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const track = d.track || 0
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: 760, maxLines: 2, maxSize: v === 0 ? 190 : 160, minSize: 54, track })
  const ts = Math.max(56, Math.min(nb.size * 0.34, 66))
  const tb = smallT ? smallLine(E, d, smallT, ts, 780, { face: E.pf, track: 0.06 }) : null
  const iconH = hasI ? (v === 0 ? 220 : 300) : 0
  const pad = 100
  const W = 1000
  const inner = (iconH ? iconH + 26 : 0) + nb.h + (tb ? 40 + tb.h : 0)
  const H = inner + pad * 2
  const top = 96
  return {
    w: W, h: H + top,
    draw(c, S) {
      const k = S.k
      c.save()
      c.translate(0, top)
      c.strokeStyle = '#7d7d93'; c.lineWidth = S.hair(5); c.lineCap = 'round'
      for (const x of [170, W - 170]) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, -top + 26); c.stroke()
        for (const y of [-18, -44, -70]) { c.beginPath(); c.ellipse(x, y, 5.5, 11, 0, 0, TAU); c.stroke() }
        c.beginPath(); circle(c, x, -top + 12, 13); c.stroke()
      }
      c.beginPath(); rr(c, 0, 0, W, H, 46); c.fillStyle = panel; c.fill()
      const g = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62)
      g.addColorStop(0, alpha(t1, 0.16)); g.addColorStop(1, 'rgba(0,0,0,0)')
      c.beginPath(); rr(c, 0, 0, W, H, 46); c.fillStyle = g; c.fill()
      c.save()
      c.strokeStyle = t2; c.lineWidth = 12; c.shadowColor = t2; c.shadowBlur = 34 * k
      c.beginPath(); rr(c, 34, 34, W - 68, H - 68, 30); c.stroke()
      c.shadowBlur = 12 * k; c.stroke()
      c.shadowBlur = 0; c.strokeStyle = mix(t2, '#ffffff', 0.7); c.lineWidth = Math.max(3, 1.2 / k); c.stroke()
      c.restore()
      let y = pad + 4
      if (iconH) { E.icon(c, d.icon, W / 2, y + iconH / 2, 380, iconH, { look: 'neon', bg: panel, ink: '#ffffff' }); y += iconH + 26 }
      nb.lines.forEach((l, i) => neonText(c, S, l, W / 2, y + nb.asc + i * nb.lh, nb.font, nb.size, t1))
      y += nb.h
      if (tb) tb.lines.forEach((l, i) => neonText(c, S, l, W / 2, y + 40 + tb.asc + i * tb.lh, tb.font, tb.size, t3))
      c.restore()
    },
  }
}

// ---- lanna ----------------------------------------------------------------------------------

function lanna(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const lacquer = v === 1 && R.inv ? R.deep : R.panel
  const gold = R.edge
  const goldL = mix(gold, '#ffffff', 0.55)
  const cream = R.light
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const iconLook = d.iconLook === 'auto' ? 'mono' : d.iconLook
  const track = d.track || 0
  const maxW = v === 0 ? 660 : 540
  const nb = fitName(E.ctx, nameT, E.nf, { maxW, maxLines: 2, maxSize: v === 0 ? 150 : 130, minSize: 50, track })
  const ts = Math.max(56, Math.min(nb.size * 0.36, 62))
  const tb = smallT ? smallLine(E, d, smallT, ts, maxW + 40, { track: 0.03 }) : null
  const iconH = hasI ? (v === 0 ? 210 : 200) : 0
  const W = v === 0 ? 1000 : 880
  const chain = 54
  const content = (iconH ? iconH + 30 : 0) + nb.h + 40 + chain + (tb ? 24 + tb.h : 0)
  const top = v === 0 ? 150 : 210
  const bot = v === 0 ? 150 : 120
  const H = v === 0 ? Math.max(content + top + bot - 40, 680) : Math.max(content + top + bot + 120, 860)
  const gable = (c, w, h) => {
    c.moveTo(0, h); c.lineTo(0, h * 0.4)
    c.bezierCurveTo(0, h * 0.31, w * 0.17, h * 0.29, w * 0.31, h * 0.2)
    c.bezierCurveTo(w * 0.41, h * 0.14, w * 0.47, h * 0.07, w / 2, 0)
    c.bezierCurveTo(w * 0.53, h * 0.07, w * 0.59, h * 0.14, w * 0.69, h * 0.2)
    c.bezierCurveTo(w * 0.83, h * 0.29, w, h * 0.31, w, h * 0.4)
    c.lineTo(w, h); c.closePath()
  }
  const oy = v === 1 ? 70 : 0
  return {
    w: W, h: H + oy,
    draw(c, S) {
      c.save(); c.translate(0, oy)
      const gfill = metal(c, 0, 0, W, H, gold)
      if (v === 0) {
        c.beginPath(); rr(c, 0, 0, W, H, 22); c.fillStyle = lacquer; c.fill()
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.14)')
        c.beginPath(); rr(c, 0, 0, W, H, 22); c.fillStyle = g; c.fill()
        c.save(); c.beginPath(); rr(c, 0, 0, W, H, 22); c.clip()
        c.lineWidth = 32; c.strokeStyle = gfill; c.beginPath(); rr(c, 0, 0, W, H, 22); c.stroke()
        c.restore()
        c.lineWidth = S.hair(5); c.strokeStyle = goldL; c.beginPath(); rr(c, 46, 46, W - 92, H - 92, 8); c.stroke()
        c.lineWidth = S.hair(2.5); c.strokeStyle = alpha(goldL, 0.6); c.beginPath(); rr(c, 60, 60, W - 120, H - 120, 4); c.stroke()
        for (const [x, y] of [[62, 62], [W - 62, 62], [W - 62, H - 62], [62, H - 62]]) {
          c.beginPath(); circle(c, x, y, 66); c.fillStyle = lacquer; c.fill()
          c.lineWidth = S.hair(6); c.strokeStyle = gfill; c.stroke()
          rosette(c, x, y, 58, 8, gold, goldL, lacquer)
        }
        c.beginPath(); ogee(c, W / 2, 60, 110, 130); c.fillStyle = gfill; c.fill()
        c.beginPath(); ogee(c, W / 2, H - 60, 110, -130); c.fillStyle = gfill; c.fill()
        c.fillStyle = gfill
        c.beginPath(); ogeeRow(c, 150, W / 2 - 100, 88, 4, 36, 40); ogeeRow(c, W / 2 + 100, W - 150, 88, 4, 36, 40); c.fill()
        c.beginPath(); ogeeRow(c, 150, W / 2 - 100, H - 88, 4, 36, -40); ogeeRow(c, W / 2 + 100, W - 150, H - 88, 4, 36, -40); c.fill()
      } else {
        c.save()
        c.beginPath(); gable(c, W, H); c.fillStyle = lacquer; c.fill()
        c.clip()
        c.lineWidth = 60; c.strokeStyle = gfill; c.beginPath(); gable(c, W, H); c.stroke()
        c.lineWidth = S.hair(5); c.strokeStyle = lacquer; c.beginPath(); gable(c, W, H); c.stroke()
        c.save(); c.translate(W / 2, H / 2); c.scale(0.9, 0.915); c.translate(-W / 2, -H / 2 + H * 0.06)
        c.lineWidth = S.hair(5); c.strokeStyle = goldL; c.beginPath(); gable(c, W, H); c.stroke()
        c.restore()
        c.restore()
        const fin = (x, y, w, h, rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); ogee(c, 0, 0, w, h); c.fillStyle = gfill; c.fill(); c.restore() }
        fin(W / 2, 14, 76, 92)
        fin(W * 0.185, H * 0.3, 56, 70, -0.95)
        fin(W * 0.815, H * 0.3, 56, 70, 0.95)
        for (const x of [70, W - 70]) rosette(c, x, H - 70, 50, 8, gold, goldL, lacquer)
      }
      let y = v === 0 ? (H - content) / 2 + 6 : H * 0.215
      const cx = W / 2
      if (iconH) { E.icon(c, d.icon, cx, y + iconH / 2, 280, iconH, { look: iconLook, ink: gold, bg: lacquer }); y += iconH + 30 }
      const ng = metal(c, cx - nb.w / 2, y, cx + nb.w / 2, y + nb.h, gold)
      drawBlock(c, nb, cx, y + nb.asc, { fill: ng })
      y += nb.h + 40
      const n = 6, step = 54
      c.fillStyle = gfill
      for (let i = -n; i <= n; i++) { const big = i === 0; c.beginPath(); ogee(c, cx + i * step, y + chain - 8, big ? 46 : 28, big ? 50 : 30); c.fill() }
      y += chain
      if (tb) drawBlock(c, tb, cx, y + 24 + tb.asc, { fill: cream })
      c.restore()
    },
  }
}

// ---- stitch ---------------------------------------------------------------------------------

const width_ = (E, s, f) => { E.ctx.font = f; return E.ctx.measureText(s).width }

function stitch(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const cloth_ = R.inv ? R.deep : R.panel
  const thr = { P: R.edge, Y: R.edge2, G: mix(R.edge2, R.light, 0.5), W: R.light, B: mix(R.edge, R.light, 0.4) }
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const W = 1000
  const cell = 10
  const track = d.track || 0
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: v === 0 ? 780 : 620, maxLines: 2, maxSize: v === 0 ? 150 : 140, minSize: 52, track })
  const ts = Math.max(56, Math.min(nb.size * 0.36, 64))
  const tb = smallT ? smallLine(E, d, smallT, ts, 800, { face: E.pf, track: 0.03 }) : null
  const band = BANDS.akha
  const bandH = band.length * cell
  let H
  const iconH = hasI ? (v === 0 ? 190 : 190) : 0
  const tagH = nb.h + 110
  if (v === 0) H = (iconH ? iconH + 34 : 0) + nb.h + (tb ? 40 + tb.h : 0) + (bandH + 40) * 2 + 40
  else H = 90 + tagH + 20 + (tb ? 40 + tb.h : 0) + 44 + 5 * 12 + 36
  return {
    w: W, h: H,
    draw(c, S) {
      const cx = W / 2
      if (v === 0) {
        c.beginPath(); rr(c, 0, 0, W, H, 18); c.fillStyle = cloth_; c.fill()
        cloth(c, 0, 0, W, H, R.light, 5, 0.07)
        c.save(); c.beginPath(); rr(c, 0, 0, W, H, 18); c.clip()
        stitchBand(c, band, thr, 0, 34, W, cell)
        stitchBand(c, band, thr, 0, H - 34 - bandH, W, cell)
        c.restore()
        c.strokeStyle = alpha(R.light, 0.75); c.lineWidth = S.hair(4); c.setLineDash([14, 11]); c.lineCap = 'round'
        c.beginPath(); rr(c, 16, 16, W - 32, H - 32, 10); c.stroke(); c.setLineDash([])
        const contentH = (iconH ? iconH + 34 : 0) + nb.h + (tb ? 40 + tb.h : 0)
        let y = bandH + 74 + ((H - 2 * (bandH + 74)) - contentH) / 2
        if (iconH) {
          const pr = iconH / 2
          c.beginPath(); circle(c, cx, y + pr, pr); c.fillStyle = R.light; c.fill()
          c.setLineDash([10, 8]); c.lineCap = 'round'; c.lineWidth = S.hair(4); c.strokeStyle = R.edge; c.beginPath(); circle(c, cx, y + pr, pr - 10); c.stroke(); c.setLineDash([])
          E.icon(c, d.icon, cx, y + pr, iconH * 0.64, iconH * 0.64, { look: 'ink', ink: R.deep, bg: R.light })
          y += iconH + 34
        }
        nb.lines.forEach((l, i) => {
          const wpx = Math.ceil(width_(E, l, nb.font) / cell) + 4
          const hpx = Math.ceil((nb.asc + nb.desc + 8) / cell) + 2
          const t = document.createElement('canvas'); t.width = wpx; t.height = hpx
          const tc = t.getContext('2d')
          tc.font = nb.font.replace(/(\d+(?:\.\d+)?)px/, (m, n) => n / cell + 'px')
          tc.fillStyle = '#fff'; tc.textBaseline = 'alphabetic'; tc.textAlign = 'center'
          tc.fillText(l, wpx / 2, (nb.asc + 4) / cell)
          stitchCanvas(c, t, cx - (wpx * cell) / 2, y + i * nb.lh, wpx * cell, hpx * cell, cell, [R.edge2], { cut: 0.42, shadow: alpha('#000000', 0.3) })
        })
        y += nb.h + 40
        if (tb) drawBlock(c, tb, cx, y + tb.asc, { fill: R.light })
      } else {
        const tw = Math.min(W - 100, nb.w + 170)
        const tx = cx - tw / 2, ty = 90
        c.save()
        c.translate(cx, ty + tagH / 2); c.rotate(-0.028); c.translate(-cx, -(ty + tagH / 2))
        c.beginPath(); rr(c, tx + 18, ty + 20, tw, tagH, 46); c.fillStyle = R.edge; c.fill()
        c.beginPath(); rr(c, tx, ty, tw, tagH, 46); c.fillStyle = R.edge2; c.fill()
        c.lineWidth = S.hair(7); c.strokeStyle = mix(R.deep, R.edge2, 0.12); c.beginPath(); rr(c, tx, ty, tw, tagH, 46); c.stroke()
        c.setLineDash([16, 13]); c.lineCap = 'round'; c.lineWidth = S.hair(5); c.strokeStyle = alpha(R.deep, 0.5); c.beginPath(); rr(c, tx + 22, ty + 22, tw - 44, tagH - 44, 28); c.stroke(); c.setLineDash([])
        drawBlock(c, nb, cx + (iconH ? 30 : 0), ty + 55 + nb.asc, { fill: readable(R.edge2, [R.deep, '#14101f'], 6) })
        if (iconH) E.icon(c, d.icon, tx + 36, ty + 6, 220, 200, { look: 'paper', bg: R.ground })
        c.restore()
        let y = ty + tagH + 20 + 44
        if (tb) { drawBlock(c, tb, cx, y + tb.asc, { fill: R.text }); y += tb.h + 40 }
        stitchBand(c, BANDS.zig, thr, 60, y, W - 120, cell + 2)
      }
    },
  }
}

// ---- woven ----------------------------------------------------------------------------------

function woven(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const cloth_ = R.inv ? R.deep : mix(R.deep, R.main, 0.15)
  const thr = { W: R.light, P: R.accent2, Y: R.accent, G: R.main, B: mix(R.accent, R.deep, 0.5) }
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const track = d.track || 0
  const W = 1000
  const cell = 14
  const hem = BANDS.hem
  const hemH = hem.length * cell
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: 760, maxLines: 2, maxSize: 150, minSize: 50, track })
  const ts = Math.max(56, Math.min(nb.size * 0.36, 62))
  const tb = smallT ? smallLine(E, d, smallT, ts, 780, { track: 0.04 }) : null
  const iconH = hasI ? 190 : 0
  const content = (iconH ? iconH + 30 : 0) + nb.h + (tb ? 34 + tb.h : 0)
  const H = content + (hemH + 60) * 2 + 20
  return {
    w: W, h: H,
    draw(c, S) {
      const cx = W / 2
      c.beginPath(); rr(c, 0, 0, W, H, 10); c.fillStyle = cloth_; c.fill()
      cloth(c, 0, 0, W, H, R.light, 4, 0.07)
      c.save(); c.beginPath(); rr(c, 0, 0, W, H, 10); c.clip()
      c.fillStyle = mix(R.deep, '#000000', 0.2); c.fillRect(0, 36, W, hemH + 20); c.fillRect(0, H - 56 - hemH, W, hemH + 20)
      wovenBand(c, hem, thr, 0, 46, W, cell)
      wovenBand(c, hem, thr, 0, H - 46 - hemH, W, cell)
      c.restore()
      c.setLineDash([12, 9]); c.lineCap = 'round'; c.strokeStyle = alpha(R.light, 0.5); c.lineWidth = S.hair(3)
      c.beginPath(); rr(c, 14, 14, W - 28, H - 28, 6); c.stroke(); c.setLineDash([])
      let y = hemH + 60 + 10
      if (iconH) { E.icon(c, d.icon, cx, y + iconH / 2, 280, iconH, { look: 'mono', ink: R.edge, bg: cloth_ }); y += iconH + 30 }
      drawBlock(c, nb, cx, y + nb.asc, { fill: R.light }); y += nb.h
      if (tb) drawBlock(c, tb, cx, y + 34 + tb.asc, { fill: R.edge })
    },
  }
}

// ---- poster ---------------------------------------------------------------------------------

function poster(d, E, W0 = 1000) {
  const R = E.R
  const nameT = E.name(true)
  const smallT = E.small()
  const hasI = E.hasIcon
  const th = hasThai(nameT)
  const track = d.track || (th ? 0 : 0.02)
  const r = 500
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: 800, maxH: 340, maxLines: 2, maxSize: 210, minSize: 60, track })
  const ts = Math.max(56, Math.min(nb.size * 0.3, 70))
  const tb = smallT ? smallLine(E, d, smallT, ts, 640, { track: 0.1, maxLines: 1 }) : null
  const light = R.light
  const dark = mix(R.panel, '#000000', 0.3)
  return {
    w: r * 2, h: r * 2,
    draw(c, S) {
      const cx = r, cy = r
      c.save()
      c.beginPath(); circle(c, cx, cy, r - 6); c.clip()
      c.fillStyle = R.panel; c.fillRect(0, 0, 2 * r, 2 * r)
      const n = 28
      c.fillStyle = mix(R.panel, R.edge2, 0.28)
      for (let i = 0; i < n; i += 2) { c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r * 1.5, (i / n) * TAU, ((i + 1) / n) * TAU); c.closePath(); c.fill() }
      c.restore()
      c.lineWidth = 24; c.strokeStyle = R.edge2; c.beginPath(); circle(c, cx, cy, r - 18); c.stroke()
      c.lineWidth = S.hair(8); c.strokeStyle = R.deep; c.beginPath(); circle(c, cx, cy, r - 36); c.stroke()
      // banner
      const bw = Math.min(900, nb.w + 150), bh = nb.h + 74
      const by = cy - bh / 2 + 30, bx = cx - bw / 2
      const skew = 40
      const para = (x, y, w, h, off) => { c.beginPath(); c.moveTo(x + skew + off, y + off); c.lineTo(x + w + off, y + off); c.lineTo(x + w - skew + off, y + h + off); c.lineTo(x + off, y + h + off); c.closePath() }
      para(bx, by, bw, bh, 14); c.fillStyle = R.deep; c.fill()
      para(bx, by, bw, bh, 0); c.fillStyle = light; c.fill()
      c.lineWidth = S.hair(6); c.strokeStyle = R.deep; para(bx, by, bw, bh, 0); c.stroke()
      c.save(); c.translate(cx, cy); c.transform(1, 0, 0, 1, 0, 0); c.restore()
      drawBlock(c, nb, cx + 0, by + 37 + nb.asc, { fill: readable(light, [R.deep, '#14101f'], 6) })
      if (tb) {
        const sw = Math.min(700, tb.w + 110), sh = tb.h + 30
        const sy = by + bh + 26
        const para2 = (off) => { c.beginPath(); c.moveTo(cx - sw / 2 + 26 + off, sy + off); c.lineTo(cx + sw / 2 + off, sy + off); c.lineTo(cx + sw / 2 - 26 + off, sy + sh + off); c.lineTo(cx - sw / 2 + off, sy + sh + off); c.closePath() }
        para2(9); c.fillStyle = R.deep; c.fill()
        para2(0); c.fillStyle = R.edge2; c.fill()
        drawBlock(c, tb, cx, sy + 15 + tb.asc, { fill: readable(R.edge2, [R.deep, '#14101f'], 5) })
      }
      if (hasI) E.icon(c, d.icon, cx, cy - 250 + (tb ? 0 : 10), 260, 200, { look: 'paper', bg: R.panel })
    },
  }
}

// ---- tag ------------------------------------------------------------------------------------

function tag(d, E, W0 = 1000) {
  const R = E.R
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const track = d.track || 0
  const hole = 78
  const lead = 210
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: 640, maxLines: 2, maxSize: 160, minSize: 50, track })
  const ts = Math.max(56, Math.min(nb.size * 0.4, 68))
  const tb = smallT ? smallLine(E, d, smallT, ts, 640, { track: 0.02 }) : null
  const bh = Math.max(380, nb.h + (tb ? tb.h + 28 : 0) + 120)
  const bw = lead + 120 + nb.w + 60
  const W = Math.max(bw, 820) + 140, H = bh + 330
  const ix = 70
  return {
    w: W, h: H,
    draw(c, S) {
      c.save()
      c.translate(W / 2, H / 2); c.rotate(-0.07); c.translate(-W / 2, -H / 2)
      const x0 = 70, y0 = 250, w = W - 140, h = bh
      c.beginPath()
      c.moveTo(x0 + 110, y0); c.lineTo(x0 + w - 28, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + 28, 28); c.lineTo(x0 + w, y0 + h - 28); c.arcTo(x0 + w, y0 + h, x0 + w - 28, y0 + h, 28)
      c.lineTo(x0 + 110, y0 + h); c.lineTo(x0, y0 + h / 2); c.closePath()
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.save(); c.translate(12, 14); c.fill(); c.restore()
      c.fillStyle = R.panel; c.fill()
      c.strokeStyle = alpha(R.onPanel, 0.7); c.lineWidth = S.hair(5); c.setLineDash([16, 12]); c.lineCap = 'round'
      c.save(); c.translate(x0 + 4, y0 + 4); c.scale((w - 8) / w, (h - 8) / h); c.translate(-x0, -y0 + 0); c.restore()
      c.beginPath(); c.moveTo(x0 + 124, y0 + 22); c.lineTo(x0 + w - 34, y0 + 22); c.arcTo(x0 + w - 22, y0 + 22, x0 + w - 22, y0 + 34, 12); c.lineTo(x0 + w - 22, y0 + h - 34); c.arcTo(x0 + w - 22, y0 + h - 22, x0 + w - 34, y0 + h - 22, 12); c.lineTo(x0 + 124, y0 + h - 22); c.lineTo(x0 + 28, y0 + h / 2); c.closePath(); c.stroke(); c.setLineDash([])
      // hole and string
      const hx = x0 + 86, hy = y0 + h / 2
      c.beginPath(); circle(c, hx, hy, 30); c.fillStyle = R.ground; c.fill(); c.lineWidth = S.hair(6); c.strokeStyle = R.edge; c.stroke()
      c.strokeStyle = R.text; c.lineWidth = S.hair(7); c.lineCap = 'round'
      c.beginPath(); c.moveTo(hx + 4, hy - 4); c.bezierCurveTo(hx - 120, hy - 120, hx - 20, y0 - 130, hx + 120, y0 - 120); c.stroke()
      c.beginPath(); c.moveTo(hx - 4, hy + 4); c.bezierCurveTo(hx - 70, hy - 60, hx + 20, y0 - 80, hx + 150, y0 - 70); c.stroke()
      const tx = hx + 60 + (x0 + w - (hx + 60)) / 2
      const total = nb.h + (tb ? tb.h + 28 : 0)
      let y = y0 + (h - total) / 2
      drawBlock(c, nb, tx, y + nb.asc, { fill: R.onPanel }); y += nb.h
      if (tb) drawBlock(c, tb, tx, y + 28 + tb.asc, { fill: R.edge })
      if (hasI) E.icon(c, d.icon, x0 + w - 70, y0 - 20, 190, 170, { look: 'paper', bg: R.ground })
      c.restore()
    },
  }
}

// ---- ribbon ---------------------------------------------------------------------------------

function ribbon(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const nameT = E.name(false)
  const smallT = E.small()
  const hasI = E.hasIcon
  const track = d.track || 0
  const iconLook = d.iconLook === 'auto' ? 'ink' : d.iconLook
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: 700, maxLines: 2, maxSize: 130, minSize: 48, track })
  const ts = Math.max(56, Math.min(nb.size * 0.4, 62))
  const tb = smallT ? smallLine(E, d, smallT, ts, 780, { track: 0.04 }) : null
  const bh = nb.h + 64
  const er = 300
  const emW = v === 1 ? er * 1.8 : er * 2
  const emH = v === 1 ? er * 2.15 : er * 2
  const bw = Math.max(nb.w + 130, emW * 0.92)
  const tail = bh * 0.62
  const W = Math.max(bw + tail * 2 + 40, emW + 40)
  const emTop = 20
  const bandY = emTop + (v === 1 ? emH * 0.62 : emH - bh * 0.36)
  const H = Math.max(bandY + bh + bh * 0.3, emTop + emH) + (tb ? 34 + tb.h : 0) + 24
  const face = R.panel
  const back = shade(R.panel, lum(R.panel) > 0.3 ? -0.22 : -0.3)
  const backDark = shade(R.panel, -0.5)
  const emFill = mix(R.ground, '#ffffff', R.dark ? 0.1 : 0.55)
  return {
    w: W, h: H,
    draw(c, S) {
      const cx = W / 2, ecy = emTop + emH / 2
      const emblem = (inset) => {
        if (v === 1) shield(c, cx - emW / 2 + inset, emTop + inset, emW - inset * 2, emH - inset * 2)
        else circle(c, cx, ecy, emW / 2 - inset)
      }
      c.beginPath(); emblem(0); c.fillStyle = emFill; c.fill()
      c.lineWidth = S.hair(22); c.strokeStyle = R.panel; c.beginPath(); emblem(11); c.stroke()
      c.lineWidth = S.hair(5); c.strokeStyle = R.edge; c.beginPath(); emblem(40); c.stroke()
      if (hasI) E.icon(c, d.icon, cx, v === 1 ? emTop + emH * 0.34 : ecy - 22, emW * 0.56, emH * (v === 1 ? 0.34 : 0.46), { look: iconLook, ink: R.dark ? R.light : R.deep, bg: emFill })
      else {
        const f = fitName(E.ctx, E.mono || '?', E.nf, { maxW: emW * 0.5, maxLines: 1, maxSize: emW * 0.34, minSize: 60 })
        line(c, E.mono || '?', cx, (v === 1 ? emTop + emH * 0.36 : ecy - 18) + (f.asc - f.desc) / 2, { font: f.font, align: 'center', fill: R.brand })
      }
      const bx = cx - bw / 2, by = bandY
      const f = bh * 0.3, t = bh * 0.3, nx = bh * 0.3
      for (const sd of [-1, 1]) {
        const ix = sd < 0 ? bx + f : bx + bw - f
        const ex = sd < 0 ? bx - tail : bx + bw + tail
        c.beginPath()
        c.moveTo(ix, by + t); c.lineTo(ex, by + t); c.lineTo(ex - sd * nx, by + t + bh / 2); c.lineTo(ex, by + t + bh); c.lineTo(ix, by + t + bh); c.closePath()
        c.fillStyle = back; c.fill()
        const fx = sd < 0 ? bx : bx + bw
        c.beginPath(); c.moveTo(fx, by + bh); c.lineTo(fx + sd * f, by + bh); c.lineTo(fx + sd * f, by + bh + t); c.closePath()
        c.fillStyle = backDark; c.fill()
      }
      c.beginPath(); c.rect(bx, by, bw, bh); c.fillStyle = face; c.fill()
      c.lineWidth = S.hair(4); c.strokeStyle = alpha(R.edge, 0.9)
      c.beginPath(); c.moveTo(bx, by + 10); c.lineTo(bx + bw, by + 10); c.moveTo(bx, by + bh - 10); c.lineTo(bx + bw, by + bh - 10); c.stroke()
      drawBlock(c, nb, cx, by + 32 + nb.asc, { fill: R.onPanel })
      if (tb) drawBlock(c, tb, cx, by + bh + bh * 0.3 + 34 + tb.asc, { fill: R.text })
    },
  }
}

export const CULTURE = { chop, neon, lanna, stitch, woven, poster, tag, ribbon }

// ---- covers ---------------------------------------------------------------------------------

/** The ground a cover is drawn on, fitted to the layout's own colours. */
export function coverGround(c, w, h, d, D, R) {
  const L = d.layout
  const v = d.v | 0
  const u = Math.min(w, h)
  const r = rng((d.seed | 0) + 9)
  if (L === 'lanna') {
    c.fillStyle = R.panel; c.fillRect(0, 0, w, h)
    c.fillStyle = alpha(R.edge, 0.11)
    const g = u * 0.19
    for (let y = 0, row = 0; y < h + g; y += g, row++) for (let x = row % 2 ? g / 2 : 0; x < w + g; x += g) { c.beginPath(); ogee(c, x, y + g * 0.3, g * 0.34, g * 0.6); c.fill() }
    const gr = c.createRadialGradient(w / 2, h / 2, u * 0.2, w / 2, h / 2, w * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)')
    c.fillStyle = gr; c.fillRect(0, 0, w, h)
    return
  }
  if (L === 'neon') {
    c.fillStyle = lum(R.deep) < 0.08 ? R.deep : '#0b0d26'; c.fillRect(0, 0, w, h)
    const cols = [R.main, R.accent, R.accent2]
    for (let i = 0; i < 16; i++) {
      const x = r() * w, y = r() * h, rad = u * (0.03 + r() * 0.08)
      const g = c.createRadialGradient(x, y, 0, x, y, rad); const col = cols[i % 3]
      g.addColorStop(0, alpha(col, 0.55)); g.addColorStop(1, alpha(col, 0))
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill()
    }
    return
  }
  if (L === 'stitch' && v === 1) {
    c.fillStyle = R.ground; c.fillRect(0, 0, w, h)
    const thr = { P: R.edge, Y: R.edge2, G: R.main, W: mix(R.main, R.ground, 0.55) }
    const cell = u * 0.014
    stitchBand(c, BANDS.akha, thr, 0, h * 0.05, w, cell)
    stitchBand(c, BANDS.akha, thr, 0, h * 0.95 - BANDS.akha.length * cell, w, cell)
    return
  }
  if (L === 'stitch' || L === 'woven') {
    const cl = L === 'stitch' ? (R.inv ? R.deep : R.panel) : (R.inv ? R.deep : mix(R.deep, R.main, 0.15))
    c.fillStyle = mix(cl, '#000000', 0.38); c.fillRect(0, 0, w, h)
    cloth(c, 0, 0, w, h, R.light, 6, 0.05)
    const gr = c.createRadialGradient(w / 2, h / 2, u * 0.2, w / 2, h / 2, w * 0.7); gr.addColorStop(0, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)')
    c.fillStyle = gr; c.fillRect(0, 0, w, h)
    return
  }
  // everything else: the design's own ground, its icon laid in tiles, a soft light in the middle
  c.fillStyle = R.ground; c.fillRect(0, 0, w, h)
  const tone = R.dark ? R.light : R.panel
  const gr = c.createRadialGradient(w / 2, h / 2, u * 0.1, w / 2, h / 2, w * 0.62)
  gr.addColorStop(0, alpha(R.dark ? R.panel : R.edge, R.dark ? 0.3 : 0.24)); gr.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = gr; c.fillRect(0, 0, w, h)
  const g = u * 0.2
  if (D && d.icon && typeof document !== 'undefined') {
    const px = Math.max(24, Math.round(g * 0.62 * Math.min(2, scaleOf(c))))
    const t = document.createElement('canvas'); t.width = t.height = px
    D.draw(t.getContext('2d'), d.icon, { size: px * 0.86, x: px * 0.07, y: px * 0.07, look: 'mono', ink: tone, px: px * 0.86, weight: 1.1 })
    c.save(); c.globalAlpha = R.dark ? 0.12 : 0.1
    for (let y = g * 0.6, row = 0; y < h + g; y += g, row++) for (let x = row % 2 ? g : g / 2; x < w + g; x += g * 2 * 0.5 * 2) {
      c.save(); c.translate(x, y); c.rotate(((row + Math.round(x / g)) % 2 ? 1 : -1) * 0.2)
      c.drawImage(t, -g * 0.31, -g * 0.31, g * 0.62, g * 0.62)
      c.restore()
    }
    c.restore()
  } else {
    c.fillStyle = alpha(tone, 0.07)
    const gg = u * 0.085
    for (let y = gg / 2, row = 0; y < h; y += gg * 0.87, row++) for (let x = row % 2 ? gg : gg / 2; x < w; x += gg) { c.beginPath(); c.arc(x, y, gg * 0.11, 0, TAU); c.fill() }
  }
}
