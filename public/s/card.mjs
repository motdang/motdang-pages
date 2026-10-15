// card.mjs — a page's share card, 1200×630 (Nan 2026-10-15: "all sites should have maximally
// cool share cards"). The page's picture fills the card (its cover, else the drawing of the
// place, else its look's colours under a pattern of its dingbats); the avatar and the Gold
// mark sit top left; the name, in the page's own typeface, is sized so no word breaks; the
// address sits at the foot. The builder draws it and uploads it as the page's card; the tiles
// on the front page and /all show it.

import { LOOKS, lookOf } from './render.mjs'

const W = 1200, H = 630, PAD = 64

const varOf = (look, n) => new RegExp('--' + n + ':([^;]+)').exec(look.vars)?.[1]?.trim()
const lum = (h) => { const m = /^#([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 1; const v = parseInt(m[1], 16); return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255 }

function cover(g, img, x, y, w, h, fx = 0.5, fy = 0.5) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height
  const r = Math.max(w / iw, h / ih), dw = iw * r, dh = ih * r
  g.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh)
}

/** Lines of `text` that fit `width`, at the largest size from `big` down that keeps every word whole. */
function fit(g, text, width, big, small, max, font, room = Infinity, extra = () => 0) {
  const words = String(text).trim().split(/\s+/).filter(Boolean)
  for (let fs = big; fs >= small; fs -= 4) {
    g.font = font(fs)
    if (words.some((w) => g.measureText(w).width > width)) continue
    const lines = []
    let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > width) { lines.push(cur); cur = w } else cur = t }
    if (cur) lines.push(cur)
    if (lines.length <= max && lines.length * fs * 1.02 + extra(fs) <= room) return { fs, lines }
  }
  g.font = font(small)
  return { fs: small, lines: [String(text)] }
}

function ant(g, x, y, s, fill) {
  g.save(); g.translate(x, y); g.scale(s / 54, s / 54)
  g.fillStyle = '#d7261e'; g.beginPath(); g.roundRect(0, 0, 54, 54, 13); g.fill()
  g.fillStyle = fill; for (const [cx, r] of [[15, 6], [27, 5], [40, 8]]) { g.beginPath(); g.arc(cx, 27, r, 0, 7); g.fill() }
  g.restore()
}

/**
 * Draw the card. o = { look, accent, name, tagline, url, gold, kind, cover: image|null, drawing: canvas|null,
 *   avatar: image|null, round, dings: [names], D: window.Dingbats|null, focus: [fx, fy] }
 */
export function drawCard(g, o) {
  const look = LOOKS[lookOf(o.look)]
  const bg = varOf(look, 'bg') || '#fff7ec', inkLook = varOf(look, 'ink') || '#111111'
  const accent = o.accent || look.accent
  const display = varOf(look, 'display') || '"Prompt",system-ui,sans-serif'
  const weight = varOf(look, 'h1w') || '800'
  const pic = o.cover || o.drawing
  g.save()
  g.fillStyle = pic ? '#0b0906' : bg; g.fillRect(0, 0, W, H)

  if (pic) {
    cover(g, pic, 0, 0, W, H, ...(o.focus || [0.5, 0.5]))
    const dark = g.createLinearGradient(0, 0, W * 0.75, 0)
    dark.addColorStop(0, 'rgba(8,6,4,.82)'); dark.addColorStop(0.55, 'rgba(8,6,4,.42)'); dark.addColorStop(1, 'rgba(8,6,4,0)')
    g.fillStyle = dark; g.fillRect(0, 0, W, H)
    const foot = g.createLinearGradient(0, H * 0.55, 0, H)
    foot.addColorStop(0, 'rgba(8,6,4,0)'); foot.addColorStop(1, 'rgba(8,6,4,.7)')
    g.fillStyle = foot; g.fillRect(0, 0, W, H)
  } else {
    // no picture: the look's colours, a glow of the accent, the page's dingbats scattered large
    const glow = g.createRadialGradient(W * 0.82, H * 0.3, 20, W * 0.82, H * 0.3, W * 0.7)
    glow.addColorStop(0, accent + '55'); glow.addColorStop(1, accent + '00')
    g.fillStyle = glow; g.fillRect(0, 0, W, H)
    const names = (o.dings && o.dings.length ? o.dings : ['sparkle', 'star']).slice(0, 6)
    if (o.D) {
      const spots = [[0.78, 0.18, 150, -0.12], [0.93, 0.52, 110, 0.2], [0.7, 0.62, 90, 0.08], [0.88, 0.86, 70, -0.2], [0.6, 0.12, 60, 0.3], [0.97, 0.12, 54, -0.3]]
      spots.forEach(([fx, fy, s, rot], i) => {
        const n = names[i % names.length]
        g.save(); g.translate(fx * W, fy * H); g.rotate(rot); g.globalAlpha = i < 2 ? 1 : 0.85
        try { o.D.draw(g, n, { size: s, x: -s / 2, y: -s / 2, look: lum(bg) < 0.4 ? 'neon' : 'paper' }) } catch {}
        g.restore()
      })
    }
  }

  const onPic = !!pic || lum(bg) < 0.45
  const ink = onPic ? '#fff8ec' : inkLook
  let y = PAD

  // avatar and the Gold mark
  let x = PAD
  if (o.avatar) {
    const s = 112
    g.save()
    if (o.round !== false) { g.beginPath(); g.arc(x + s / 2, y + s / 2, s / 2, 0, 7); g.clip() }
    cover(g, o.avatar, x, y, s, s)
    g.restore()
    if (o.round !== false) { g.lineWidth = 5; g.strokeStyle = o.gold ? '#e9b43b' : '#fff8ec'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s / 2 - 2, 0, 7); g.stroke() }
    x += s + 22
  }
  if (o.gold) {
    const gy = o.avatar ? y + 38 : y
    const lg = g.createLinearGradient(x, 0, x + 150, 0)
    lg.addColorStop(0, '#9c6a1c'); lg.addColorStop(0.45, '#f8dd8e'); lg.addColorStop(1, '#d9a441')
    g.fillStyle = lg; g.beginPath(); g.roundRect(x, gy, 132, 40, 20); g.fill()
    g.fillStyle = '#2a1a04'; g.font = '800 20px system-ui,"Prompt",sans-serif'; g.fillText('★ GOLD', x + 20, gy + 27)
  }
  if (!o.avatar && !o.gold) { g.fillStyle = accent; g.fillRect(PAD, y, 120, 12) }

  // the name, never broken inside a word
  const tw = pic ? W * 0.62 : W * 0.56
  const name = String(o.name || '').trim()
  const tag = String(o.tagline || '').trim().slice(0, 90)
  const font = (fs) => `${weight} ${fs}px ${display}`
  const top = o.avatar || o.gold ? 200 : 130, foot = H - 122
  const tagOf = (fs) => (tag ? Math.max(26, Math.min(38, fs * 0.36)) * 2.9 : 0)
  const { fs, lines } = fit(g, name, tw, 132, 44, 3, font, foot - top, tagOf)
  const tagFs = Math.max(26, Math.min(38, fs * 0.36))
  const block = lines.length * fs * 1.02 + tagOf(fs)
  y = Math.max(top, foot - block)
  g.fillStyle = ink
  g.textBaseline = 'alphabetic'
  if (onPic) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24 }
  g.font = font(fs)
  for (const l of lines) { y += fs * 0.98; g.fillText(l, PAD, y) }
  g.shadowBlur = 0
  if (tag) {
    g.font = `500 ${tagFs}px "Prompt",system-ui,"Noto Sans Thai",sans-serif`
    g.globalAlpha = 0.9
    const t = fit(g, tag, tw, tagFs, 20, 2, (s) => `500 ${s}px "Prompt",system-ui,"Noto Sans Thai",sans-serif`, foot - y - 8, () => 0)
    let ty = y + t.fs * 1.5
    for (const l of t.lines) { g.fillText(l, PAD, ty); ty += t.fs * 1.3 }
    g.globalAlpha = 1
  }

  // the address
  ant(g, PAD, H - 98, 46, '#fff')
  g.fillStyle = ink; g.font = '700 30px ui-monospace,"SF Mono",Menlo,monospace'
  g.fillText(String(o.url || '').replace(/^https?:\/\//, ''), PAD + 62, H - 64)

  // a gold page gets a gilt frame
  if (o.gold) {
    const fr = g.createLinearGradient(0, 0, W, H)
    fr.addColorStop(0, '#9c6a1c'); fr.addColorStop(0.3, '#f8dd8e'); fr.addColorStop(0.5, '#d9a441'); fr.addColorStop(0.8, '#f3c552'); fr.addColorStop(1, '#9c6a1c')
    g.strokeStyle = fr; g.lineWidth = 6; g.strokeRect(18, 18, W - 36, H - 36)
    g.lineWidth = 1.5; g.strokeRect(30, 30, W - 60, H - 60)
  }
  g.restore()
}

/** Everything that changes the card, as one string: a new card is drawn when it differs. */
export const cardKey = (site, d) => JSON.stringify([site.look, d.accent, d.name, d.tagline, d.cover, d.avatar, d.avround, site.tier === 'gold', d.dings, site.name, d.drawing && !d.cover ? d.scene || site.kind : ''])
export const CARD = { W, H }
