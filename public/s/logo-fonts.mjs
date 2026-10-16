// logo-fonts.mjs — the typefaces a logo can take. Each has a Thai and a Latin file under
// public/s/fonts/ (SIL Open Font License, a text file beside each), loaded when first used under
// the family name "Logo <name>" so they never collide with the page's own faces.

import { FALLBACK, fontStr } from './logo-text.mjs'

const SUBSETS = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122',
  thai: 'U+0E01-0E5B,U+200C-200D,U+25CC',
}

// key → family, file stem, weight for the name, weight for small lines, the character of the face
// caps: false for faces that read badly in capitals (scripts, hands)
export const FONTS = {
  kanit: { fam: 'Kanit', stem: 'kanit', w: 800, tw: 400, files: [400, 800], cls: 'bold', caps: true },
  prompt: { fam: 'Prompt', stem: 'prompt', w: 600, tw: 400, files: [400, 600], cls: 'clean', caps: true },
  mitr: { fam: 'Mitr', stem: 'mitr', w: 600, tw: 400, files: [400, 600], cls: 'round', caps: true },
  itim: { fam: 'Itim', stem: 'itim', w: 400, tw: 400, files: [400], cls: 'hand', caps: false },
  mali: { fam: 'Mali', stem: 'mali', w: 700, tw: 400, files: [400, 700], cls: 'cute', caps: false },
  pattaya: { fam: 'Pattaya', stem: 'pattaya', w: 400, tw: 0, files: [400], cls: 'script', caps: false },
  sriracha: { fam: 'Sriracha', stem: 'sriracha', w: 400, tw: 0, files: [400], cls: 'brush', caps: false },
  charm: { fam: 'Charm', stem: 'charm', w: 700, tw: 0, files: [700], cls: 'calligraphy', caps: false },
  srisakdi: { fam: 'Srisakdi', stem: 'srisakdi', w: 700, tw: 0, files: [700], cls: 'decor', caps: false, latin: false },
  chonburi: { fam: 'Chonburi', stem: 'chonburi', w: 400, tw: 0, files: [400], cls: 'display', caps: true },
  trirong: { fam: 'Trirong', stem: 'trirong', w: 700, tw: 400, files: [400, 700], cls: 'serif', caps: true },
  fahkwang: { fam: 'Fahkwang', stem: 'fahkwang', w: 700, tw: 400, files: [400, 700], cls: 'fashion', caps: true },
  chakra: { fam: 'Chakra Petch', stem: 'chakra-petch', w: 700, tw: 400, files: [400, 700], cls: 'tech', caps: true },
}
export const FONT_KEYS = Object.keys(FONTS)

const base = (() => { try { return new URL('./fonts/', import.meta.url).href } catch { return '/s/fonts/' } })()
const asked = new Map()
let epoch = 0

/** Bumps each time a face finishes loading, so a drawing made earlier knows to measure again. */
export const fontEpoch = () => epoch

const family = (key) => `"Logo ${(FONTS[key] || FONTS.prompt).fam}"`

/** font(size) for the name in a face. */
export function nameFont(key, weight) {
  const f = FONTS[key] || FONTS.prompt
  return (size) => fontStr(family(key), weight || f.w, size)
}

/** font(size) for a small line: the face's lighter weight, or Prompt for faces with only one. */
export function smallFont(key, weight) {
  const f = FONTS[key] || FONTS.prompt
  if (!f.tw) return (size) => fontStr(family('prompt'), weight || 400, size)
  return (size) => fontStr(family(key), weight || f.tw, size)
}

/** CSS font-family for DOM samples of a face. */
export const cssFamily = (key) => `${family(key)},${FALLBACK}`
export const cssWeight = (key) => (FONTS[key] || FONTS.prompt).w

function add(key, weight) {
  const f = FONTS[key]
  const id = key + weight
  if (asked.has(id)) return asked.get(id)
  if (typeof FontFace === 'undefined' || typeof document === 'undefined') return Promise.resolve()
  const p = Promise.all(['latin', 'thai'].map((sub) => {
    const ff = new FontFace(`Logo ${f.fam}`, `url(${base}${f.stem}-${weight}-${sub}.woff2) format("woff2")`, { weight: String(weight), unicodeRange: SUBSETS[sub], display: 'swap' })
    document.fonts.add(ff)
    return ff.load().catch(() => null)
  })).then(() => { epoch++ })
  asked.set(id, p)
  return p
}

/** Load the faces for these keys (the name weight and the small weight of each). */
export function loadFonts(keys = FONT_KEYS) {
  const jobs = []
  for (const k of new Set(keys)) {
    const f = FONTS[k]
    if (!f) continue
    jobs.push(add(k, f.w))
    if (f.tw) jobs.push(add(k, f.tw))
    else jobs.push(add('prompt', FONTS.prompt.tw))
  }
  return Promise.all(jobs)
}
