// The drawn map is a picture until it is opened: a clear cover over it takes the tap and lets a scroll through to the
// page (Nan 2026-10-28: "map is too sensitive to scroll on trackpad").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../public/s/render.mjs'

test('the drawn map carries a cover that opens it', () => {
  const h = render({ name: 'shop', kind: 'service', lang: 'en', status: 'live', tier: 'gold', d: { name: 'Shop', place: { lat: 18.78, lng: 98.99, cc: 'TH', addr: 'Sridonchai Rd' }, contact: { phone: '081 234 5678' } } })
  assert.match(h, /<div class="dmap" id="dmap"[^>]*><iframe [^>]*><\/iframe><button type="button" class="dshield" data-t="map" aria-label="Open the drawn map"><\/button><\/div>/)
  assert.match(h, /\.dmap\.full \.dshield\{display:none\}/)
})
