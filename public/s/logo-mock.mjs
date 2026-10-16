// logo-mock.mjs — the logo shown where it will be used, drawn in code: a LINE profile circle, the
// top of a page, a shop sign, a coffee cup, a paper bag, a T-shirt, a business card and a browser
// tab. Each takes a pack { nat, sq, cov, d, R } and paints a 480 × 360 scene at scale k.

import { rr, circle } from './logo-art.mjs'
import { mix, shade, alpha, lum, readable } from './logo-color.mjs'
import { nameFont, smallFont } from './logo-fonts.mjs'
import { balance } from './logo-text.mjs'

const W = 480, H = 360
const SANS = 'system-ui,-apple-system,"Segoe UI","Noto Sans Thai","Noto Sans Myanmar","PingFang SC",sans-serif'
const TAU = Math.PI * 2

function shadow(c, blur, dx, dy, col = 'rgba(0,0,0,0.28)') { c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = dx; c.shadowOffsetY = dy }
function noShadow(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0 }

/** Draw a canvas to fit a box, centred. */
function fit(c, img, x, y, w, h) {
  const s = Math.min(w / img.width, h / img.height)
  const dw = img.width * s, dh = img.height * s
  c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh }
}

/** Fill a box with a canvas, cropped to cover it. */
function cover(c, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s, sh = h / s
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function text(c, s, x, y, font, fill, align = 'left') {
  c.font = font; c.fillStyle = fill; c.textAlign = align; c.textBaseline = 'alphabetic'
  c.fillText(s, x, y)
}

/** The largest size from `size` down to `min` at which the text fits maxW. */
function fitSize(c, s, maxW, fontFn, size, min) {
  let z = size
  while (z > min) { c.font = fontFn(z); if (c.measureText(s).width <= maxW) break; z -= 0.5 }
  return z
}

/** The text in one line or two at the largest size from `size` down to `min` that fits maxW; shortened if nothing does. */
function fitLines(c, s, maxW, fontFn, size, min, maxLines = 2) {
  s = String(s)
  for (let n = 1; n <= maxLines; n++) {
    const lines = n === 1 ? [s] : balance(c, s, fontFn(size), n)
    if (lines.length < n) continue
    for (let z = size; z >= min; z -= 0.5) { c.font = fontFn(z); if (lines.every((l) => c.measureText(l).width <= maxW)) return { lines, size: z } }
  }
  const f = fontFn(min)
  return { lines: [ellipsize(c, s, maxW, f)], size: min }
}

function ellipsize(c, s, maxW, font) {
  c.font = font
  if (c.measureText(s).width <= maxW) return s
  let t = s
  while (t.length > 1 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

// ---- the scenes -----------------------------------------------------------------------------

function line(c, P) {
  const bg = c.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#e8f6ee'); bg.addColorStop(1, '#f6f8f7')
  c.fillStyle = bg; c.fillRect(0, 0, W, H)
  c.fillStyle = '#06c755'; c.fillRect(0, 0, W, 112)
  c.fillStyle = 'rgba(255,255,255,0.18)'
  c.beginPath(); c.arc(70, 30, 70, 0, TAU); c.fill(); c.beginPath(); c.arc(430, 90, 90, 0, TAU); c.fill()
  const cx = W / 2, cy = 120, r = 76
  c.save(); shadow(c, 18, 0, 6); c.beginPath(); circle(c, cx, cy, r + 6); c.fillStyle = '#fff'; c.fill(); c.restore()
  c.save(); c.beginPath(); circle(c, cx, cy, r); c.clip(); cover(c, P.sq, cx - r, cy - r, r * 2, r * 2); c.restore()
  const nm = ellipsize(c, P.name, 400, `700 26px ${SANS}`)
  text(c, nm, cx, 248, `700 26px ${SANS}`, '#1c1530', 'center')
  if (P.tag) text(c, ellipsize(c, P.tag, 380, `400 16px ${SANS}`), cx, 274, `400 16px ${SANS}`, '#5a4f6a', 'center')
  c.fillStyle = '#06c755'; c.beginPath(); rr(c, cx - 62, 296, 124, 38, 19); c.fill()
  text(c, 'LINE', cx, 322, `800 17px ${SANS}`, '#fff', 'center')
}

function page(c, P) {
  c.fillStyle = '#ece6dc'; c.fillRect(0, 0, W, H)
  const pw = 210, ph = 336, px = (W - pw) / 2, py = 12
  c.save(); shadow(c, 24, 0, 10, 'rgba(0,0,0,0.3)'); c.beginPath(); rr(c, px, py, pw, ph, 26); c.fillStyle = '#1c1530'; c.fill(); c.restore()
  c.save(); c.beginPath(); rr(c, px + 7, py + 7, pw - 14, ph - 14, 20); c.clip()
  c.fillStyle = '#fff'; c.fillRect(px, py, pw, ph)
  const cw = pw - 14, ch = cw * 0.5625
  cover(c, P.cov, px + 7, py + 7, cw, ch)
  const ay = py + 7 + ch - 24
  c.beginPath(); circle(c, px + 44, ay + 28, 33); c.fillStyle = '#fff'; c.fill()
  c.save(); c.beginPath(); circle(c, px + 44, ay + 28, 29); c.clip(); cover(c, P.sq, px + 15, ay - 1, 58, 58); c.restore()
  const pn = fitLines(c, P.name, 104, (z) => `700 ${z}px ${SANS}`, 15, 10.5)
  pn.lines.forEach((l, i) => text(c, l, px + 84, ay + 40 + i * pn.size * 1.2, `700 ${pn.size}px ${SANS}`, '#1c1530'))
  c.fillStyle = '#eee'
  for (const [w, y] of [[150, 128], [120, 142]]) { c.beginPath(); rr(c, px + 20, ay + y - 14, w, 7, 3.5); c.fill() }
  c.fillStyle = P.R.panel; c.beginPath(); rr(c, px + 20, ay + 128, 84, 30, 15); c.fill()
  c.fillStyle = '#eadfce'; c.beginPath(); rr(c, px + 112, ay + 128, 70, 30, 15); c.fill()
  c.restore()
}

function sign(c, P) {
  const wall = c.createLinearGradient(0, 0, 0, H)
  wall.addColorStop(0, '#d8cdbd'); wall.addColorStop(1, '#bfb19d')
  c.fillStyle = wall; c.fillRect(0, 0, W, H)
  c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 1
  for (let y = 0; y < H; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 22) % 2 ? 0 : 30; x < W; x += 60) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 22); c.stroke() } }
  const ar = P.wide.width / P.wide.height
  const bh = 168, bw = Math.max(236, Math.min(400, ar * (bh - 36) + 60)), bx = (W - bw) / 2, by = 96
  c.strokeStyle = '#4a4a55'; c.lineWidth = 3
  for (const x of [bx + 54, bx + bw - 54]) { c.beginPath(); c.moveTo(x, by); c.lineTo(x, 22); c.stroke(); c.beginPath(); circle(c, x, 22, 5); c.fillStyle = '#4a4a55'; c.fill() }
  c.save(); shadow(c, 22, 6, 14, 'rgba(0,0,0,0.35)')
  c.beginPath(); rr(c, bx, by, bw, bh, 14); c.fillStyle = shade(P.ground, -0.35); c.fill(); noShadow(c)
  c.beginPath(); rr(c, bx + 8, by + 8, bw - 16, bh - 16, 8); c.fillStyle = P.ground; c.fill()
  c.restore()
  fit(c, P.wide, bx + 24, by + 18, bw - 48, bh - 36)
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 318, W, 42)
  c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 312, W, 6)
}

function cup(c, P) {
  c.fillStyle = mix(P.R.ground, '#e8e1d6', 0.6); c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(0,0,0,0.06)'; c.beginPath(); c.ellipse(W / 2, 326, 120, 16, 0, 0, TAU); c.fill()
  const cx = W / 2, top = 84, bot = 316, tw = 176, bw = 124
  const body = () => { c.beginPath(); c.moveTo(cx - tw / 2, top); c.lineTo(cx + tw / 2, top); c.lineTo(cx + bw / 2, bot); c.lineTo(cx - bw / 2, bot); c.closePath() }
  c.save(); shadow(c, 16, 8, 8, 'rgba(0,0,0,0.25)'); body(); c.fillStyle = '#fbfaf7'; c.fill(); c.restore()
  c.save(); body(); c.clip()
  c.save(); c.globalCompositeOperation = 'multiply'; fit(c, P.nat, cx - 66, top + 52, 132, 150); c.restore()
  const g = c.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.28, 'rgba(255,255,255,0.35)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.22)')
  c.fillStyle = g; c.fillRect(cx - tw / 2, top, tw, bot - top)
  c.restore()
  c.beginPath(); rr(c, cx - tw / 2 - 8, top - 22, tw + 16, 26, 8); c.fillStyle = P.R.deep; c.fill()
  c.beginPath(); rr(c, cx - tw / 2 + 6, top - 40, tw - 12, 22, 8); c.fillStyle = shade(P.R.deep, 0.12); c.fill()
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(cx - tw / 2 + 14, top - 36, 20, 12)
}

function bag(c, P) {
  c.fillStyle = mix(P.R.ground, '#efe6d8', 0.6); c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(0,0,0,0.07)'; c.beginPath(); c.ellipse(W / 2, 334, 130, 14, 0, 0, TAU); c.fill()
  const bx = W / 2 - 112, by = 78, bw = 224, bh = 252
  c.strokeStyle = '#a07a52'; c.lineWidth = 6; c.lineCap = 'round'
  c.beginPath(); c.moveTo(bx + 64, by + 6); c.bezierCurveTo(bx + 64, by - 62, bx + bw - 64, by - 62, bx + bw - 64, by + 6); c.stroke()
  c.strokeStyle = '#c9a27a'; c.lineWidth = 2.5; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([])
  c.save(); shadow(c, 14, 6, 8, 'rgba(0,0,0,0.25)')
  c.beginPath(); c.rect(bx, by, bw, bh); c.fillStyle = '#c9a27a'; c.fill(); c.restore()
  const g = c.createLinearGradient(bx, 0, bx + bw, 0)
  g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)')
  c.fillStyle = g; c.fillRect(bx, by, bw, bh)
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(bx, by, bw, 26); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(bx, by + 26, bw, 2)
  c.save(); c.globalCompositeOperation = 'multiply'; fit(c, P.nat, bx + 28, by + 50, bw - 56, bh - 90); c.restore()
  c.fillStyle = 'rgba(0,0,0,0.1)'; c.beginPath(); c.moveTo(bx + bw, by); c.lineTo(bx + bw + 16, by + 14); c.lineTo(bx + bw + 16, by + bh); c.lineTo(bx + bw, by + bh); c.fill()
}

function shirt(c, P) {
  c.fillStyle = mix(P.R.ground, '#dcd6cc', 0.45); c.fillRect(0, 0, W, H)
  const sx = 2.0, ox = (W - 200 * sx) / 2, oy = 4
  const tee = () => {
    c.beginPath()
    c.moveTo(ox + 60 * sx, oy + 30 * sx); c.lineTo(ox + 20 * sx, oy + 56 * sx); c.lineTo(ox + 38 * sx, oy + 92 * sx); c.lineTo(ox + 58 * sx, oy + 80 * sx)
    c.lineTo(ox + 58 * sx, oy + 176 * sx); c.lineTo(ox + 142 * sx, oy + 176 * sx); c.lineTo(ox + 142 * sx, oy + 80 * sx); c.lineTo(ox + 162 * sx, oy + 92 * sx)
    c.lineTo(ox + 180 * sx, oy + 56 * sx); c.lineTo(ox + 140 * sx, oy + 30 * sx)
    c.bezierCurveTo(ox + 128 * sx, oy + 50 * sx, ox + 72 * sx, oy + 50 * sx, ox + 60 * sx, oy + 30 * sx); c.closePath()
  }
  const col = P.ground
  c.save(); shadow(c, 18, 0, 10, 'rgba(0,0,0,0.25)'); tee(); c.fillStyle = col; c.fill(); c.restore()
  c.save(); tee(); c.clip()
  const g = c.createLinearGradient(ox, 0, ox + 200 * sx, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.14)'); g.addColorStop(0.3, 'rgba(255,255,255,0.1)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.2)')
  c.fillStyle = g; c.fillRect(ox, oy, 200 * sx, 200 * sx)
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2
  c.beginPath(); c.moveTo(ox + 58 * sx, oy + 80 * sx); c.quadraticCurveTo(ox + 50 * sx, oy + 60 * sx, ox + 60 * sx, oy + 40 * sx); c.stroke()
  c.beginPath(); c.moveTo(ox + 142 * sx, oy + 80 * sx); c.quadraticCurveTo(ox + 150 * sx, oy + 60 * sx, ox + 140 * sx, oy + 40 * sx); c.stroke()
  c.restore()
  c.strokeStyle = shade(col, lum(col) > 0.5 ? -0.18 : 0.18); c.lineWidth = 6
  c.beginPath(); c.moveTo(ox + 60 * sx, oy + 30 * sx); c.bezierCurveTo(ox + 72 * sx, oy + 50 * sx, ox + 128 * sx, oy + 50 * sx, ox + 140 * sx, oy + 30 * sx); c.stroke()
  fit(c, P.nat, ox + 76 * sx, oy + 68 * sx, 48 * sx, 60 * sx)
}

function card(c, P) {
  const bgc = c.createLinearGradient(0, 0, W, H)
  bgc.addColorStop(0, '#e7e0d4'); bgc.addColorStop(1, '#d4ccbe')
  c.fillStyle = bgc; c.fillRect(0, 0, W, H)
  const cw = 308, ch = 176
  c.save(); c.translate(W / 2 + 36, H / 2 + 26); c.rotate(0.12)
  shadow(c, 16, 6, 10); c.beginPath(); rr(c, -cw / 2, -ch / 2, cw, ch, 8); c.fillStyle = P.R.panel; c.fill(); noShadow(c)
  c.save(); c.beginPath(); rr(c, -cw / 2, -ch / 2, cw, ch, 8); c.clip(); cover(c, P.cov, -cw / 2, -ch / 2, cw, ch); c.restore()
  c.restore()
  c.save(); c.translate(W / 2 - 30, H / 2 - 20); c.rotate(-0.07)
  shadow(c, 18, 6, 12); c.beginPath(); rr(c, -cw / 2, -ch / 2, cw, ch, 8); c.fillStyle = mix(P.R.ground, '#ffffff', P.R.dark ? 0 : 0.7); c.fill(); noShadow(c)
  const dark = lum(mix(P.R.ground, '#ffffff', P.R.dark ? 0 : 0.7)) < 0.3
  fit(c, P.sq, -cw / 2 + 16, -ch / 2 + 22, 112, 132)
  const nfn = nameFont(P.d.font), sfn = smallFont(P.d.font)
  const tx = -cw / 2 + 144
  const nm = fitLines(c, P.name, cw / 2 - 12, nfn, 22, 12)
  const nlh = nm.size * 1.18
  let y0 = -26
  nm.lines.forEach((l, i) => text(c, l, tx, y0 + i * nlh, nfn(nm.size), dark ? P.R.light : P.R.deep))
  y0 += (nm.lines.length - 1) * nlh + 20
  if (P.tag) {
    const tg = fitLines(c, P.tag, cw / 2 - 16, sfn, 12.5, 9.5)
    tg.lines.forEach((l, i) => text(c, l, tx, y0 + i * tg.size * 1.2, sfn(tg.size), P.R.brandText))
  }
  c.fillStyle = alpha(dark ? P.R.light : P.R.deep, 0.22)
  for (const [w, y] of [[110, 52], [90, 66], [102, 80]]) { c.beginPath(); rr(c, tx, y, w, 5, 2.5); c.fill() }
  c.restore()
}

function tab(c, P) {
  c.fillStyle = '#dfe3e8'; c.fillRect(0, 0, W, H)
  c.fillStyle = '#cfd5dc'; c.fillRect(0, 0, W, 54)
  c.save(); c.beginPath(); rr(c, 22, 14, 232, 40, 12); c.rect(22, 30, 232, 24); c.fillStyle = '#fff'; c.fill(); c.restore()
  c.beginPath(); rr(c, 22, 14, 232, 40, 12); c.fillStyle = '#fff'; c.fill(); c.fillRect(22, 40, 232, 14)
  c.save(); c.beginPath(); circle(c, 48, 34, 9); c.clip(); cover(c, P.sq, 39, 25, 18, 18); c.restore()
  const nm = ellipsize(c, P.name, 150, `600 14px ${SANS}`)
  text(c, nm, 66, 39, `600 14px ${SANS}`, '#1c1530')
  text(c, '×', 236, 40, `400 18px ${SANS}`, '#7a7a88', 'center')
  c.fillStyle = '#fff'; c.fillRect(0, 54, W, 52)
  c.beginPath(); rr(c, 66, 64, W - 150, 32, 16); c.fillStyle = '#eef1f4'; c.fill()
  text(c, 'sites.motdang.net/' + P.slug, 86, 85, `400 14px ${SANS}`, '#4a4a55')
  c.fillStyle = '#f4f1ea'; c.fillRect(0, 106, W, H - 106)
  c.fillStyle = '#fff'; c.beginPath(); rr(c, 36, 130, W - 72, 200, 14); c.fill()
  const sizes = [[16, 'favicon'], [32, ''], [48, ''], [64, '']]
  let x = 62
  for (const [s] of sizes) {
    c.save(); c.beginPath(); rr(c, x, 190 - s / 2, s, s, s * 0.2); c.clip(); cover(c, P.sq, x, 190 - s / 2, s, s); c.restore()
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1; c.beginPath(); rr(c, x + 0.5, 190 - s / 2 + 0.5, s - 1, s - 1, s * 0.2); c.stroke()
    text(c, String(s), x + s / 2, 190 + s / 2 + 18, `500 12px ${SANS}`, '#7a7a88', 'center')
    x += s + 24
  }
  const big = 100
  c.save(); c.beginPath(); rr(c, W - 36 - 20 - big, 190 - big / 2, big, big, 22); c.clip(); cover(c, P.sq, W - 36 - 20 - big, 190 - big / 2, big, big); c.restore()
}

export const MOCKS = [
  { id: 'line', draw: line, needs: 'sq' },
  { id: 'page', draw: page, needs: 'cov' },
  { id: 'sign', draw: sign, needs: 'wide' },
  { id: 'cup', draw: cup, needs: 'nat' },
  { id: 'bag', draw: bag, needs: 'nat' },
  { id: 'shirt', draw: shirt, needs: 'nat' },
  { id: 'card', draw: card, needs: 'sq' },
  { id: 'tab', draw: tab, needs: 'sq' },
]

/** Paint a scene into a canvas element, sized for the screen. */
export function paintMock(cv, mock, pack, cssW = 360) {
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1)
  const k = (cssW / W) * dpr
  cv.width = Math.round(W * k); cv.height = Math.round(H * k)
  cv.style.width = '100%'; cv.style.aspectRatio = `${W} / ${H}`
  const c = cv.getContext('2d')
  c.setTransform(k, 0, 0, k, 0, 0)
  c.clearRect(0, 0, W, H)
  mock.draw(c, pack)
}
