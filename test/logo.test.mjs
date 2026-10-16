import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { DINGBATS } from '../public/s/db/names.mjs'
import { G } from '../public/s/make-words-logo.mjs'
import { ui, UI_LANGS } from '../public/s/make-words.mjs'
import { KINDS } from '../public/s/render.mjs'

// the engine draws on a canvas; here a stand-in that takes every call, so each layout runs
const text = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(String(font))?.[1] || 16)
function fakeCtx() {
  const state = { font: '16px x' }
  const fn = new Proxy({}, {
    get: (_, k) => {
      if (k in state) return state[k]
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      if (k === 'measureText') return (s) => { const w = String(s).length * text(state.font) * 0.55; return { width: w, actualBoundingBoxAscent: text(state.font) * 0.72, actualBoundingBoxDescent: text(state.font) * 0.2, actualBoundingBoxLeft: 0, actualBoundingBoxRight: w } }
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} })
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h })
      return () => undefined
    },
    set: (_, k, v) => { state[k] = v; return true },
  })
  return fn
}
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) }

const L = await import('../public/s/logo.mjs')
const T = await import('../public/s/logo-text.mjs')
const F = await import('../public/s/logo-fonts.mjs')
const C = await import('../public/s/logo-color.mjs')

const NAMES = [
  ['Noi Noodles', 'Khao soi since 1987'], ['ก๋วยเตี๋ยวป้านิด', 'ข้าวซอยตั้งแต่ปี 2530'], ['Ploy Studio', ''], ['ก', ''],
  ['Ban Suan Guesthouse and Garden Bungalows', 'Six rooms by the river'], ['บ้านสวนเกสต์เฮาส์ริมน้ำปิงเชียงใหม่ประเทศไทย', 'ห้องพักหกห้อง'], ['Annika', 'Writer and walker'], ['ร้านผ้าทอแม่ปิง Mae Ping', 'ผ้าฝ้าย'],
  ['A<b>&"x\'s', '<i>&amp;'], ['W'.repeat(40), 'x'.repeat(60)], ['မြန်မာအမည်', 'ဆိုင်'], ['中文名称', '你好'], ['  ', ''],
]

test('every kind gets at least 24 designs for every kind of name', () => {
  for (const kind of KINDS) for (const [name, tagline] of NAMES) {
    const ds = L.logoDesigns({ name, tagline, kind, accent: '#ff5a1f', look: 'poster' })
    assert.ok(ds.length >= 24, `${kind} ${name}: ${ds.length}`)
    assert.equal(new Set(ds.map((d) => d.id)).size, ds.length)
    assert.equal(new Set(ds.map((d) => d.layout)).size >= 12, true)
  }
})

test('a design is plain data with a face, five colours and a real icon', () => {
  for (const d of L.logoDesigns({ name: 'Noi Noodles', tagline: 'x', kind: 'food', accent: '#d7261e', look: 'night' })) {
    assert.ok(F.FONTS[d.font], d.id + ' font')
    for (const k of ['main', 'deep', 'light', 'accent', 'accent2']) assert.match(d.pal[k], /^#[0-9a-f]{6}$/i, d.id + ' ' + k)
    assert.ok(!d.icon || DINGBATS[d.icon], d.id + ' icon ' + d.icon)
    assert.deepEqual(JSON.parse(JSON.stringify(d)), d)
  }
})

test('the first showing is the same every time, and a new seed deals again', () => {
  const o = { name: 'Noi Noodles', tagline: 'since 1987', kind: 'food', accent: '#d7261e', look: 'poster' }
  assert.deepEqual(L.logoDesigns(o), L.logoDesigns(o))
  const a = JSON.stringify(L.logoDesigns(o)), b = JSON.stringify(L.logoDesigns({ ...o, seed: 3 }))
  assert.notEqual(a, b)
})

test('every layout of every design plans and draws', () => {
  for (const [name, tagline] of NAMES) for (const kind of ['food', 'stay', 'me']) {
    for (const seed of [0, 2]) for (const d of L.logoDesigns({ name, tagline, kind, accent: '#2563eb', look: 'lanna', seed })) {
      for (const inv of [false, true]) {
        const x = { ...d, inv }
        const plan = L.planOf(x, null)
        assert.ok(plan.w > 20 && plan.h > 20 && Number.isFinite(plan.w) && Number.isFinite(plan.h), `${x.id} ${name} ${plan.w}x${plan.h}`)
        const c = fakeCtx()
        assert.doesNotThrow(() => plan.draw(c, { k: 0.3, hair: (n) => n, D: null }), `${x.id} ${name}`)
        assert.doesNotThrow(() => L.drawLogo(c, 400, 300, x, null), `${x.id} ${name} drawLogo`)
      }
    }
  }
})

test('text colours read on their ground in every palette', () => {
  for (const [id, p] of Object.entries(L.PALS)) for (const inv of [false, true]) {
    const R = L.roles({ pal: p, inv })
    assert.ok(C.contrast(R.onPanel, R.panel) >= 4.5, `${id} onPanel ${inv}`)
    assert.ok(C.contrast(R.text, R.ground) >= 4.5, `${id} text ${inv}`)
    assert.ok(C.contrast(R.panel, R.ground) >= 1.5, `${id} panel ${inv}`)
  }
})

test('thai marks stay on their consonant, and a leading vowel travels with it', () => {
  for (const s of ['ก๋วยเตี๋ยวป้านิด', 'บ้านสวนเกสต์เฮาส์', 'เชียงใหม่', 'แม่ปิง', 'โรงแรม']) {
    const cl = T.clusters(s)
    assert.equal(cl.join(''), s)
    for (const c of cl) assert.ok(!/^[ัิ-ฺ็-๎]/.test(c), `${s}: ${c} starts with a mark`)
    assert.ok(cl.every((c) => !/^[เ-ไ]$/.test(c)), `${s}: a leading vowel stands alone`)
  }
  assert.deepEqual(T.clusters('เตี๋ย').slice(0, 1), ['เตี๋'])
  assert.equal(T.clusters('ป้านิด')[0], 'ป้า')
})

test('a line breaks between words, never inside a short one', () => {
  const ctx = fakeCtx()
  const fit = (s, o) => T.fitName(ctx, s, (z) => `600 ${z}px x`, { maxW: 600, maxLines: 3, ...o })
  assert.deepEqual(fit('Annika').lines, ['Annika'])
  assert.deepEqual(fit('Noi').lines, ['Noi'])
  assert.ok(fit('Hands of Mae Ping', { maxW: 300 }).lines.length >= 2)
  assert.equal(T.initials('Annika'), 'A')
  assert.equal(T.initials('Noi Noodles'), 'NN')
  assert.equal(T.initials('ก๋วยเตี๋ยวป้านิด'), 'กป')
})

test('the faces are on disk with their licences', () => {
  const dir = new URL('../public/s/fonts/', import.meta.url)
  for (const [k, f] of Object.entries(F.FONTS)) {
    assert.ok(existsSync(new URL(`OFL-${f.stem}.txt`, dir)), `OFL-${f.stem}.txt`)
    for (const w of f.files) for (const sub of ['thai', 'latin']) assert.ok(existsSync(new URL(`${f.stem}-${w}-${sub}.woff2`, dir)), `${k} ${w} ${sub}`)
    assert.ok(f.files.includes(f.w), k + ' name weight')
  }
  assert.ok(Object.keys(F.FONTS).length >= 13)
})

test('the icon words and kinds name dingbats that exist', () => {
  for (const kind of [...KINDS, 'amulet']) for (const n of L.iconsFor(kind)) assert.ok(DINGBATS[n], n)
  assert.ok(L.iconsFor('food', 'Noi Noodles')[0] === 'noodles')
  assert.ok(L.iconsFor('shop', 'ร้านกาแฟ')[0] === 'coffee')
  assert.ok(L.iconsFor('stay', 'Ban Suan Guesthouse')[0] === 'spirit-house')
})

test('the logo words are in all four languages and reach the builder', () => {
  const keys = Object.keys(G.en)
  assert.ok(keys.length > 50)
  for (const lang of Object.keys(UI_LANGS)) for (const k of keys) {
    assert.ok(G[lang][k], `${lang} ${k}`)
    assert.equal(ui(lang, k), G[lang][k])
  }
  for (const lang of Object.keys(UI_LANGS)) assert.deepEqual(Object.keys(G[lang]).sort(), keys.slice().sort(), lang)
})

test('file names come from the words, with a fallback', () => {
  assert.equal(L.slug('Noi Noodles'), 'noi-noodles')
  assert.equal(L.slug('Café Ploy!'), 'cafe-ploy')
  assert.equal(L.slug('ก๋วยเตี๋ยว'), 'logo')
})

test('no emoji in the logo files', () => {
  const dir = new URL('../public/s/', import.meta.url)
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u
  for (const f of readdirSync(dir).filter((f) => /^(logo|make-words-logo).*\.(mjs|css)$/.test(f))) {
    const src = readFileSync(new URL(f, dir), 'utf8')
    assert.ok(!emoji.test(src), f)
  }
  for (const f of ['../tools/logolab.mjs', '../tools/logolab.py']) assert.ok(!emoji.test(readFileSync(new URL(f, import.meta.url), 'utf8')), f)
})
