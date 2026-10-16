// logo-layouts.mjs — the logo layouts. Each takes a design and an environment (colours, faces,
// the dingbat runtime) and returns a plan: { w, h, draw(ctx, S) } in its own units. A plan is
// worked out once for a design; draw puts it on any canvas at any size.
//
// Names are fitted, not assumed: one row or two, the type as large as the box allows, Thai set
// by whole clusters so no mark is left behind. An icon is placed by its ink, not its box.

import { fitName, drawBlock, line, arcText, arcFit, arcAngle, ink, width, trackedWidth, clusters, balance, hasThai, fontStr } from './logo-text.mjs'
import { rr, circle, star, scallop, hexagon, shield, arch, ogee, fan, spiral, layer, erode, swash, rng, scaleOf, BANDS, stitchGrid, stitchBand, stitchCanvas, wovenBand, cloth } from './logo-art.mjs'
import { alpha, mix, shade, readable, contrast, lum } from './logo-color.mjs'

const TAU = Math.PI * 2
const PI = Math.PI

/** Cap height of a font for a text: the body that a curve or a box centres on. */
export function bodyH(E, font, text) {
  return ink(E.ctx, hasThai(text) ? 'ก' : 'H', font).asc
}

/** Try the layout at narrower widths until its shape fits the box it will be drawn in. */
export function within(fn, d, E, widths = [1000, 800, 640, 520]) {
  let best = null
  const target = Math.max(1.1, E.ar * 1.35)
  for (const w of widths) {
    const p = fn(d, E, w)
    if (!best) best = p
    if (p.w / p.h <= target) return p
    if (p.w / p.h < best.w / best.h) best = p
  }
  return best
}

/** Stack blocks top to bottom, centred on the plan's middle; returns { w, h, draw }. */
export function stack(items, o = {}) {
  const gap = o.gap ?? 0
  let w = 0, h = 0
  const placed = []
  for (const it of items.filter(Boolean)) {
    if (placed.length && it.gap !== null) h += it.gap ?? gap
    placed.push({ it, y: h })
    h += it.h
    w = Math.max(w, it.w || 0)
  }
  const pad = o.pad ?? 0
  const W = Math.max(w, o.minW || 0) + pad * 2, H = h + pad * 2
  return { w: W, h: H, draw: (ctx, S) => { for (const { it, y } of placed) it.draw(ctx, W / 2, pad + y, S) } }
}

export const smallLine = (E, d, text, size, maxW, o = {}) => {
  const f = o.face || E.tf
  return fitName(E.ctx, text, f, { maxW, maxLines: o.maxLines ?? 2, maxSize: size, minSize: size * 0.62, track: o.track ?? 0, bias: 0.97 })
}

// ---- stacked --------------------------------------------------------------------------------

function stacked(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const upper = v === 1
  const nameT = E.name(upper)
  const smallT = E.small()
  const track = d.track || (upper ? 0.06 : 0)
  const col = v === 3 ? R.onPanel : v === 1 ? R.text : R.brand
  const iconLook = d.iconLook === 'auto' ? (v === 0 ? 'ink' : 'mono') : d.iconLook
  const iconInk = v === 2 ? R.onPanel : v === 1 ? R.brand : R.text
  const maxW = W0 * 0.84
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: v === 3 ? maxW * 0.86 : maxW, maxLines: 2, maxSize: (v === 1 ? 150 : 175) * (E.hasIcon ? 1 : 1.3), minSize: 44, track })
  const ts = Math.max(56, Math.min(nb.size * 0.34, 74))
  const tb = smallT ? smallLine(E, d, smallT, ts, maxW, { track: upper ? 0.14 : 0.04 }) : null
  const hasI = E.hasIcon
  const gi = E.glyph(d.icon)
  const ratio = gi ? Math.min(1.5, (gi.x1 - gi.x0) / (gi.y1 - gi.y0)) : 1
  const iconH = hasI ? Math.min(nb.w * 0.62 / ratio, nb.w < 380 ? 300 : 340, W0 * 0.36) : 0
  const iconW = iconH * ratio
  const items = []
  const pad = v === 1 ? 70 : 0

  if (hasI && v === 2) {
    const aw = Math.max(iconW * 1.5, 250), ah = aw * 1.2
    items.push({ h: ah, w: aw, draw: (c, cx, y) => {
      c.beginPath(); arch(c, cx - aw / 2, y, aw, ah); c.fillStyle = R.panel; c.fill()
      c.lineWidth = 8; c.strokeStyle = R.edge; c.beginPath(); arch(c, cx - aw / 2 + 16, y + 16, aw - 32, ah - 32); c.stroke()
      E.icon(c, d.icon, cx, y + ah * 0.56, aw * 0.58, ah * 0.52, { look: iconLook, ink: R.onPanel, bg: R.panel })
    } })
  } else if (hasI) {
    items.push({ h: iconH, w: iconW, draw: (c, cx, y) => E.icon(c, d.icon, cx, y + iconH / 2, iconW, iconH, { look: iconLook, ink: iconLook === 'ink' ? (R.dark ? R.light : R.deep) : iconInk, bg: R.ground }) })
  }

  const gapIcon = v === 2 ? 46 : 34
  if (v === 3) {
    const sw = nb.w + 120, sh = nb.h + 60
    items.push({ gap: hasI ? gapIcon : 0, h: sh, w: sw, draw: (c, cx, y) => {
      c.beginPath(); rr(c, cx - sw / 2, y, sw, sh, 26); c.fillStyle = R.panel; c.fill()
      c.lineWidth = 5; c.strokeStyle = R.edge; c.beginPath(); rr(c, cx - sw / 2 + 12, y + 12, sw - 24, sh - 24, 16); c.stroke()
      drawBlock(c, nb, cx, y + 30 + nb.asc, { fill: R.onPanel })
    } })
  } else {
    items.push({ gap: hasI ? gapIcon : 0, h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: col }) })
  }
  if (tb) {
    if (v === 0 || v === 2) items.push({ gap: 26, h: 8, w: 150, draw: (c, cx, y) => { c.fillStyle = R.edge; c.beginPath(); rr(c, cx - 75, y, 150, 8, 4); c.fill() } })
    items.push({ gap: v === 0 || v === 2 ? 28 : 34, h: tb.h, w: tb.w, draw: (c, cx, y) => drawBlock(c, tb, cx, y + tb.asc, { fill: v === 3 ? R.text : R.text }) })
  }
  const out = stack(items, { pad })
  if (v === 1) {
    const inner = out.draw
    out.draw = (c, S) => {
      c.lineJoin = 'miter'
      c.strokeStyle = R.brand; c.lineWidth = S.hair(9); c.beginPath(); c.rect(S.hair(9) / 2, S.hair(9) / 2, out.w - S.hair(9), out.h - S.hair(9)); c.stroke()
      c.lineWidth = S.hair(3); c.beginPath(); c.rect(26, 26, out.w - 52, out.h - 52); c.stroke()
      c.fillStyle = R.ground
      for (const [x, y] of [[26, 26], [out.w - 26, 26], [26, out.h - 26], [out.w - 26, out.h - 26]]) { c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fillStyle = R.edge; c.fill(); c.fillStyle = R.ground }
      inner(c, S)
    }
  }
  return out
}

// ---- inline ---------------------------------------------------------------------------------

/** A rough height of the text block of a name, to size padding before the lines are set. */
const nbEstimate = (E, text, font) => (hasThai(text) ? 150 : 120)

function inlineOne(d, E, W0) {
  const v = d.v | 0, R = E.R
  const hasI = E.hasIcon
  const nameT = E.name(v === 3)
  const smallT = E.small()
  const iconLook = d.iconLook === 'auto' ? (v === 0 ? 'ink' : 'mono') : d.iconLook
  const gi = E.glyph(d.icon)
  const ratio = gi ? Math.min(1.3, (gi.x1 - gi.x0) / (gi.y1 - gi.y0)) : 1
  const track = d.track || (v === 3 ? 0.05 : 0)
  const padL = v === 2 ? (hasI ? 36 : 90) : 0, padY = v === 2 ? 34 : 0
  const padR = v === 2 ? 64 + Math.max(0, (nbEstimate(E, nameT, E.nf) * 1.0 + padY * 2 + 80) * 0.18) : 0
  const gap = hasI ? (v === 2 ? 40 : 52) : v === 2 ? 28 : 0
  const ruleW = v === 3 && hasI ? 56 : 0
  const guess = hasI ? 230 * ratio : 0
  const budget = Math.max(260, W0 - padL - padR - guess - gap - ruleW)
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: budget, maxLines: 2, maxSize: 150, minSize: 44, track })
  const ts = Math.max(56, Math.min(nb.size * 0.36, 72))
  const tb = smallT ? smallLine(E, d, smallT, ts, budget, { track: 0.03 }) : null
  const textH = nb.h + (tb ? 24 + tb.h : 0)
  const textW = Math.max(nb.w, tb ? tb.w : 0)
  let leadW = 0, leadH = 0
  if (hasI) {
    if (v === 1) { leadH = Math.max(textH * 1.12, nb.size * 1.9); leadW = leadH }
    else if (v === 2) { leadH = textH + 36; leadW = leadH }
    else { leadH = Math.max(textH * 1.02, nb.size * 1.7); leadW = leadH * ratio }
  }
  const H = Math.max(textH, leadH) + 2 * padY
  const Wt = padL + leadW + gap + ruleW + textW + padR
  const col = v === 2 ? R.onPanel : R.brand
  const tcol = v === 2 ? R.onPanel : R.text
  return {
    w: Wt, h: H,
    draw(c, S) {
      const cy = H / 2
      if (v === 2) {
        c.beginPath(); rr(c, 0, 0, Wt, H, H / 2); c.fillStyle = R.panel; c.fill()
        c.lineWidth = S.hair(5); c.strokeStyle = R.edge; c.beginPath(); rr(c, 11, 11, Wt - 22, H - 22, (H - 22) / 2); c.stroke()
      }
      let x = padL
      if (hasI) {
        if (v === 1) {
          c.beginPath(); circle(c, x + leadW / 2, cy, leadW / 2); c.fillStyle = R.panel; c.fill()
          c.lineWidth = S.hair(5); c.strokeStyle = R.edge; c.beginPath(); circle(c, x + leadW / 2, cy, leadW / 2 - 12); c.stroke()
          E.icon(c, d.icon, x + leadW / 2, cy, leadW * 0.6, leadW * 0.6, { look: iconLook, ink: R.onPanel, bg: R.panel })
        } else if (v === 2) {
          const disc = contrast(R.ground, R.panel) >= 1.8 ? R.ground : R.light
          c.beginPath(); circle(c, x + leadW / 2, cy, leadW / 2 - 6); c.fillStyle = disc; c.fill()
          E.icon(c, d.icon, x + leadW / 2, cy, leadW * 0.62, leadW * 0.62, { look: iconLook === 'ink' ? 'ink' : 'mono', ink: readable(disc, [R.deep, R.light], 4.5), bg: disc })
        } else {
          E.icon(c, d.icon, x + leadW / 2, cy, leadW, leadH, { look: iconLook, ink: iconLook === 'ink' ? (R.dark ? R.light : R.deep) : R.brand, bg: R.ground })
        }
        x += leadW + gap
        if (v === 3) {
          c.fillStyle = R.edge
          c.beginPath(); rr(c, x - gap / 2 - ruleW / 2 + 4, cy - leadH * 0.5, S.hair(8), leadH, 4); c.fill()
          x += ruleW
        }
      }
      const top = cy - textH / 2
      drawBlock(c, nb, x, top + nb.asc, { align: 'left', fill: col })
      if (tb) drawBlock(c, tb, x, top + nb.h + 24 + tb.asc, { align: 'left', fill: tcol })
    },
  }
}
const inline = (d, E) => within(inlineOne, d, E, [1000, 780, 600, 480])

// ---- badge ----------------------------------------------------------------------------------

function badge(d, E) {
  const v = d.v | 0, R = E.R
  const r = 500
  const nameT = E.name(true)
  const smallT = E.small()
  const th = hasThai(nameT)
  const track = d.track || (th ? 0 : 0.07)
  const panel = v === 1 ? R.ground : v === 2 ? R.edge : R.panel
  const onPanel = v === 1 ? R.text : v === 2 ? readable(R.edge, [R.deep, '#14101f'], 5) : R.onPanel
  const ring = v === 1 ? R.panel : v === 2 ? R.panel : R.edge
  const med = v === 0 ? shade(R.panel, lum(R.panel) > 0.3 ? -0.14 : 0.1) : R.ground
  const medR = r * 0.5
  const bandIn = medR + 40
  const bandOut = r - (v === 0 ? 56 : v === 1 ? 92 : 74)
  const mid = (bandIn + bandOut) / 2
  const bw = bandOut - bandIn
  const iconLook = d.iconLook === 'auto' ? (v === 0 ? 'mono' : 'ink') : d.iconLook
  const long = clusters(nameT).length > 20
  const two = long ? balance(E.ctx, nameT, E.nf(100), 2) : null
  const topT = two ? two[0] : nameT
  const botT = two ? two[1] : smallT
  const deg = (a) => (a * PI) / 180
  const gapA = deg(22)
  const sizeCap = Math.min(bw * 0.8, 150)
  let ts, nfont
  if (two) {
    const a = arcFit(E.ctx, topT, E.nf, mid, deg(150), sizeCap, 40, track), b = arcFit(E.ctx, botT, E.nf, mid, deg(150), sizeCap, 40, track)
    ts = Math.min(a, b)
  } else ts = arcFit(E.ctx, topT, E.nf, mid, botT ? deg(206) : deg(250), sizeCap, 44, track)
  nfont = E.nf(ts)
  const thT = arcAngle(E.ctx, topT, nfont, ts, mid, track)
  const botMax = Math.max(deg(60), Math.min(deg(140), 2 * PI - thT - 2 * gapA))
  let botSize = 0, bfont = null, thB = 0
  if (botT) {
    if (two) { botSize = ts; bfont = nfont }
    else { botSize = arcFit(E.ctx, botT, E.tf, mid, botMax, Math.min(bw * 0.52, ts * 0.66), 38, 0.05); bfont = E.tf(botSize) }
    thB = arcAngle(E.ctx, botT, bfont, botSize, mid, two ? track : 0.05)
  }
  const ch = bodyH(E, nfont, topT)
  const bch = botSize ? bodyH(E, bfont, botT) : 0
  const rTop = mid - ch / 2, rBot = mid + bch / 2
  const inT = two ? smallT : ''
  const starA = botT ? ((-PI / 2 + thT / 2) + (PI / 2 - thB / 2)) / 2 : 0
  return {
    w: r * 2, h: r * 2,
    draw(c, S) {
      const cx = r, cy = r
      c.beginPath()
      if (v === 2) scallop(c, cx, cy, r - 2, 36, 0.035); else circle(c, cx, cy, r - 2)
      c.fillStyle = panel; c.fill()
      if (v === 1) { c.lineWidth = S.hair(22); c.strokeStyle = ring; c.beginPath(); circle(c, cx, cy, r - 24); c.stroke(); c.lineWidth = S.hair(5); c.beginPath(); circle(c, cx, cy, r - 68); c.stroke() }
      else { c.lineWidth = S.hair(v === 2 ? 8 : 9); c.strokeStyle = ring; c.beginPath(); circle(c, cx, cy, r - (v === 2 ? 50 : 26)); c.stroke() }
      c.beginPath(); circle(c, cx, cy, medR); c.fillStyle = med; c.fill()
      c.lineWidth = S.hair(9); c.strokeStyle = v === 0 ? R.edge : R.panel; c.beginPath(); circle(c, cx, cy, medR); c.stroke()
      if (v === 0) { c.lineWidth = S.hair(3); c.strokeStyle = alpha(R.edge, 0.55); c.beginPath(); circle(c, cx, cy, medR - 16); c.stroke() }
      arcText(c, topT, { cx, cy, r: rTop, mid: -PI / 2, dir: 'top', font: nfont, size: ts, track, fill: onPanel })
      if (botT) arcText(c, botT, { cx, cy, r: rBot, mid: PI / 2, dir: 'bottom', font: bfont, size: botSize, track: two ? track : 0.05, fill: v === 0 ? R.edgeText : onPanel })
      const markCol = v === 0 ? R.edge : R.panel
      c.fillStyle = markCol
      const sr = Math.min(bw * 0.22, 32)
      if (botT) {
        for (const a of [starA, PI - starA]) { c.beginPath(); star(c, cx + Math.cos(a) * mid, cy + Math.sin(a) * mid, sr, sr * 0.42, 5, -PI / 2); c.fill() }
      } else {
        for (const off of [-0.2, 0, 0.2]) {
          const a = PI / 2 + off, x = cx + Math.cos(a) * mid, y = cy + Math.sin(a) * mid
          c.beginPath(); if (off) circle(c, x, y, sr * 0.34); else star(c, x, y, sr * 1.15, sr * 0.48, 5, -PI / 2); c.fill()
        }
      }
      if (E.hasIcon) {
        const ih = inT ? medR * 1.05 : medR * 1.36
        E.icon(c, d.icon, cx, cy - (inT ? medR * 0.15 : 0), medR * 1.44, ih, { look: iconLook, ink: iconLook === 'mono' ? (v === 0 ? R.onPanel : R.brand) : (lum(med) < 0.2 ? R.light : R.deep), bg: med })
      } else {
        const f = E.nf(medR * 0.95)
        line(c, E.mono, cx, cy + bodyH(E, f, E.mono) / 2, { font: f, align: 'center', fill: v === 0 ? R.onPanel : R.brand })
      }
      if (inT) {
        const f = fitName(E.ctx, inT, E.tf, { maxW: medR * 1.6, maxLines: 1, maxSize: 56, minSize: 30 })
        drawBlock(c, f, cx, cy + medR * 0.66 + f.asc * 0.3, { fill: v === 0 ? R.onPanel : R.text })
      }
    },
  }
}

// ---- monogram -------------------------------------------------------------------------------

function mono(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const letters = E.mono || '?'
  const smallT = E.small()
  const nameT = E.name(true)
  const S0 = 560
  const track = d.track || (hasThai(nameT) ? 0 : 0.1)
  const f = E.nf
  const lf = fitName(E.ctx, letters, f, { maxW: S0 * (v === 1 ? 0.5 : 0.58), maxLines: 1, maxSize: S0 * (letters.length > 1 ? 0.5 : 0.62), minSize: 60 })
  const nb = fitName(E.ctx, nameT, f, { maxW: W0 * 0.86, maxLines: 2, maxSize: 110, minSize: 40, track })
  const ts = Math.max(56, Math.min(nb.size * 0.5, 64))
  const tb = smallT ? smallLine(E, d, smallT, ts, W0 * 0.86, { track: 0.04 }) : null
  const items = [
    { h: S0, w: S0, draw: (c, cx, y, S) => {
      const x = cx - S0 / 2
      const mid = [cx, y + S0 / 2]
      c.beginPath()
      if (v === 0) circle(c, mid[0], mid[1], S0 / 2)
      else if (v === 1) shield(c, x + S0 * 0.06, y, S0 * 0.88, S0)
      else hexagon(c, mid[0], mid[1], S0 / 2, PI / 6)
      c.fillStyle = v === 2 ? R.ground : R.panel; c.fill()
      c.lineJoin = 'round'
      if (v === 0) { c.lineWidth = S.hair(10); c.strokeStyle = R.edge; c.beginPath(); circle(c, mid[0], mid[1], S0 / 2 - 22); c.stroke() }
      if (v === 1) { c.lineWidth = S.hair(10); c.strokeStyle = R.edge; c.beginPath(); shield(c, x + S0 * 0.06 + 24, y + 26, S0 * 0.88 - 48, S0 - 56); c.stroke() }
      if (v === 2) { c.lineWidth = S.hair(26); c.strokeStyle = R.panel; c.beginPath(); hexagon(c, mid[0], mid[1], S0 / 2 - 13, PI / 6); c.stroke(); c.lineWidth = S.hair(6); c.strokeStyle = R.edge; c.beginPath(); hexagon(c, mid[0], mid[1], S0 / 2 - 52, PI / 6); c.stroke() }
      const col = v === 2 ? R.panel : R.onPanel
      line(c, letters, mid[0], mid[1] + (lf.asc - lf.desc) / 2 + (v === 1 ? 10 : 0), { font: lf.font, align: 'center', fill: col })
    } },
    { gap: 44, h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: R.text }) },
  ]
  if (tb) items.push({ gap: 22, h: tb.h, w: tb.w, draw: (c, cx, y) => drawBlock(c, tb, cx, y + tb.asc, { fill: R.brandText }) })
  return stack(items)
}

// ---- wordmark -------------------------------------------------------------------------------

function wordmark(d, E, W0 = 1000) {
  const v = d.v | 0, R = E.R
  const nameT = E.name(v === 1 || v === 3)
  const smallT = E.small()
  const th = hasThai(nameT)
  const track = d.track || (v === 1 ? (th ? 0 : 0.09) : 0)
  const nb = fitName(E.ctx, nameT, E.nf, { maxW: W0, maxLines: 2, maxSize: v === 3 ? 230 : 250, minSize: 60, track })
  const ts = Math.max(56, Math.min(nb.size * (v === 1 ? 0.36 : 0.34), 80))
  const tb = smallT ? smallLine(E, d, smallT, ts, Math.min(W0, Math.max(nb.w * 1.1, 560)), { track: v === 1 ? 0.16 : 0.05 }) : null
  const items = []
  const nameCol = v === 3 ? R.text : R.brand
  if (v === 1) {
    const rw = Math.max(nb.w, tb ? tb.w : 0) + 80
    items.push({ h: 14, w: rw, draw: (c, cx, y, S) => { c.fillStyle = R.edge; c.fillRect(cx - rw / 2, y + 4, rw, S.hair(5)); c.fillRect(cx - rw / 2, y + 14, rw, S.hair(2)) } })
    items.push({ gap: 38, h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: R.text }) })
    items.push({ gap: 36, h: 14, w: rw, draw: (c, cx, y, S) => { c.fillStyle = R.edge; c.fillRect(cx - rw / 2, y, rw, S.hair(2)); c.fillRect(cx - rw / 2, y + 9, rw, S.hair(5)); c.beginPath(); c.moveTo(cx, y - 8); c.lineTo(cx + 12, y + 7); c.lineTo(cx, y + 22); c.lineTo(cx - 12, y + 7); c.closePath(); c.fillStyle = R.brand; c.fill() } })
    if (tb) items.push({ gap: 30, h: tb.h, w: tb.w, draw: (c, cx, y) => drawBlock(c, tb, cx, y + tb.asc, { fill: R.brandText }) })
  } else if (v === 3) {
    const bw = nb.w + 40, bh = tb ? tb.h + 44 : 0
    items.push({ h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: R.brand }) })
    if (tb) items.push({ gap: 26, h: bh, w: bw, draw: (c, cx, y) => {
      c.beginPath(); rr(c, cx - bw / 2, y, bw, bh, 10); c.fillStyle = R.panel; c.fill()
      drawBlock(c, tb, cx, y + 22 + tb.asc, { fill: R.onPanel })
    } })
  } else if (v === 2) {
    items.push({ h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: R.brand }) })
    const ow = Math.min(nb.w * 0.8, 640)
    items.push({ gap: 34, h: 40, w: ow, draw: (c, cx, y, S) => {
      const cy = y + 20
      c.strokeStyle = R.edge; c.fillStyle = R.edge; c.lineWidth = S.hair(5); c.lineCap = 'round'
      c.beginPath(); c.moveTo(cx - ow / 2, cy); c.lineTo(cx - 44, cy); c.moveTo(cx + 44, cy); c.lineTo(cx + ow / 2, cy); c.stroke()
      c.beginPath(); c.moveTo(cx, cy - 20); c.lineTo(cx + 20, cy); c.lineTo(cx, cy + 20); c.lineTo(cx - 20, cy); c.closePath(); c.fill()
      for (const s of [-1, 1]) { c.beginPath(); circle(c, cx + s * 34, cy, 5); c.fill() }
    } })
    if (tb) items.push({ gap: 26, h: tb.h, w: tb.w, draw: (c, cx, y) => drawBlock(c, tb, cx, y + tb.asc, { fill: R.text }) })
  } else {
    items.push({ h: nb.h, w: nb.w, draw: (c, cx, y) => drawBlock(c, nb, cx, y + nb.asc, { fill: nameCol }) })
    const sw = nb.w * 0.82
    items.push({ gap: 14, h: 40, w: sw, draw: (c, cx, y) => { c.beginPath(); swash(c, cx - sw / 2, cx + sw / 2, y + 22, 22, 26); c.fillStyle = R.edge; c.fill() } })
    if (tb) items.push({ gap: 22, h: tb.h, w: tb.w, draw: (c, cx, y) => drawBlock(c, tb, cx, y + tb.asc, { fill: R.text }) })
  }
  return stack(items)
}

export const BASIC = { stacked, inline, badge, mono, wordmark }
