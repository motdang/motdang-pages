// makeover.mjs — the picture studio from the command line, for tools/bands.py:
// node tools/makeover.mjs <in.rgba> <w> <h> <style> <accent> <out.rgba> [frame]
// The border some styles draw (gold, mural, watercolour, sun print) stays off unless a seventh word, frame, asks for it.
import { readFileSync, writeFileSync } from 'node:fs'
import { makeOver } from '../public/s/studio.mjs'

const [inp, w, h, style, accent, out, frame] = process.argv.slice(2)
const data = new Uint8ClampedArray(readFileSync(inp))
const r = makeOver({ width: +w, height: +h, data }, style, { accent: accent === '-' ? '' : accent, frame: frame === 'frame' })
writeFileSync(out, r.data)
