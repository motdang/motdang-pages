// makeover.mjs — the picture studio from the command line, for tools/bands.py:
// node tools/makeover.mjs <in.rgba> <w> <h> <style> <accent> <out.rgba>
import { readFileSync, writeFileSync } from 'node:fs'
import { makeOver } from '../public/s/studio.mjs'

const [inp, w, h, style, accent, out] = process.argv.slice(2)
const data = new Uint8ClampedArray(readFileSync(inp))
const r = makeOver({ width: +w, height: +h, data }, style, { accent: accent === '-' ? '' : accent })
writeFileSync(out, r.data)
