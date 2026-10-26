// og.mjs — which card a page or an item page shows, and the key that changes when the card would.
// NaN 2026-10-20: "All sites made by me and all 'gold' level sites should include unique share cards";
// the same day: "add a card-drawing library and some kind of user input interface on card design".
// The worker serves /card/<name>[/<t>/<id>].jpg (src/ogcard.mjs), drawn by the card library (the cards
// Worker, NaNoBotCo/cards) from specOf(); the maker chooses d.og in the builder (make-card.mjs).

import { LOOKS, lookOf } from './looks.mjs'
import { designOf } from './kinds.mjs'

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) } return (h >>> 0).toString(36) }
const PHOTO_ID = /^[a-z0-9]{12,24}$/
const HEX = /^#[0-9a-f]{6}$/i
const str = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

export const OG_LAYOUTS = ['photo', 'band', 'split', 'plain']
export const OG_FONTS = ['prompt', 'chonburi', 'sriracha', 'anton', 'serif']

/** The maker's card choices, cut to size: layout, typeface, picture and the part of it to keep, words, colour. */
export function normalizeOg(g) {
  if (!g || typeof g !== 'object') return null
  const n = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? Math.round(v * 100) / 100 : 0.5)
  return {
    layout: OG_LAYOUTS.includes(g.layout) ? g.layout : '', font: OG_FONTS.includes(g.font) ? g.font : '',
    photo: PHOTO_ID.test(g.photo || '') ? g.photo : '', fx: n(g.fx), fy: n(g.fy),
    title: str(g.title, 80), line: str(g.line, 120), accent: HEX.test(g.accent || '') ? g.accent.toLowerCase() : '',
  }
}

const varOf = (look, n) => new RegExp('--' + n + ':([^;]+)').exec(look.vars)?.[1]?.trim()

/** The look's own typeface, as near as the card library has it. */
export function fontOfLook(lookId) {
  const d = varOf(LOOKS[lookOf(lookId)], 'display') || ''
  return /Chonburi"?,\s*"?Iowan|^"?Chonburi/.test(d) ? 'chonburi' : /Sriracha/.test(d) ? 'sriracha' : /Condensed|Impact/.test(d) ? 'anton' : /Iowan|Palatino|Georgia/.test(d) ? 'serif' : 'prompt'
}

/** What one card shows. t = 'a' | 'w' | 'l' with its item x, or '' for the page itself. */
export function ogOf(site, d, t = '', x = null) {
  const name = d.name || site.name
  const gold = site.tier === 'gold'
  const g = normalizeOg(d.og) || {}
  const photo = x ? (Array.isArray(x.photos) && x.photos[0]) || '' : g.photo || d.cover || (Array.isArray(d.photos) && d.photos[0]) || ''
  const path = x ? `${site.name}/${t}/${x.id}` : site.name
  const o = { t, id: x ? x.id : '', path, title: x ? String(x.t || name) : g.title || name, tagline: x ? name : g.line || d.tagline || '', photo, gold,
    look: site.kind ? designOf(site.kind) : lookOf(site.look), accent: g.accent || d.accent || '', avatar: d.avatar || '', round: d.avround, dings: d.dings || [],
    layout: g.layout || '', font: g.font || '', fx: x ? 0.5 : g.fx ?? 0.5, fy: x ? 0.5 : g.fy ?? 0.5 }
  o.key = fnv(JSON.stringify(['v5', o.title, o.tagline, o.photo, o.gold, o.look, o.accent, o.avatar, o.round, o.layout, o.font, o.fx, o.fy, path]))
  return o
}

/** The card library's spec for a card (cards/src/draw.mjs). `img(id)` is a photo's public address. */
export function specOf(o, { img, host, lang }) {
  const look = LOOKS[lookOf(o.look)]
  const accent = o.accent || look.accent
  return {
    layout: o.photo ? o.layout || 'photo' : 'plain', font: o.font || fontOfLook(o.look), title: o.title, sub: o.tagline, lang,
    url: `${host}/${o.path}`, accent, bg: o.layout === 'band' || o.layout === 'split' ? accent : varOf(look, 'bg') || '#16120e',
    image: o.photo ? { url: img(o.photo) } : null, focus: [o.fx, o.fy], avatar: o.avatar ? { url: img(o.avatar) } : null, gold: o.gold,
  }
}
