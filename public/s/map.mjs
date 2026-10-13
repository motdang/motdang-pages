// map.mjs — the live map, loaded only when somebody asks for it: the builder's
// pin picker and the reader's full-screen map. MapLibre, pmtiles and the
// tiles come from motdang.net itself; the ground is Mot Dang's own style.

const NORTH = [97.3, 17.0, 100.6, 20.5] // cm-cr.pmtiles covers this box
const MAIN = '' // /vendor and /tiles are read from motdang.net through this Worker
const WORLD = MAIN + '/tiles/world.pmtiles'
const LOCAL = MAIN + '/tiles/cm-cr.pmtiles'

let ready = null
function load() {
  if (ready) return ready
  const add = (tag, attrs) => new Promise((ok, no) => {
    const el = document.createElement(tag)
    Object.assign(el, attrs)
    el.onload = ok; el.onerror = no
    document.head.appendChild(el)
  })
  ready = Promise.all([
    add('link', { rel: 'stylesheet', href: MAIN + '/vendor/maplibre-gl.css' }),
    add('script', { src: MAIN + '/vendor/pmtiles.js' }).then(() => add('script', { src: MAIN + '/vendor/maplibre-gl.js' })),
  ]).then(async () => {
    const proto = new window.pmtiles.Protocol()
    window.maplibregl.addProtocol('pmtiles', proto.tile)
    return true
  })
  return ready
}

let worldOk = null
async function hasWorld() {
  if (worldOk !== null) return worldOk
  try { const r = await fetch(WORLD, { method: 'HEAD' }); worldOk = r.ok } catch { worldOk = false }
  return worldOk
}

const inNorth = (lng, lat) => lng >= NORTH[0] && lng <= NORTH[2] && lat >= NORTH[1] && lat <= NORTH[3]

async function style(lng, lat) {
  const s = await (await fetch('/s/style.json')).json()
  const world = await hasWorld()
  const file = world ? WORLD : LOCAL
  s.sources.p.url = 'pmtiles://' + new URL(file, location.href).href
  s.glyphs = new URL('/s/glyphs/', location.href).href + '{fontstack}/{range}.pbf'
  return { style: s, covered: world || inNorth(lng, lat) }
}

const PIN = (accent) => {
  const d = document.createElement('div')
  d.innerHTML = `<svg viewBox="0 0 48 48" width="46" height="46"><path d="M24 46s15-15.5 15-26a15 15 0 0 0-30 0c0 10.5 15 26 15 26z" fill="${accent || '#d7261e'}" stroke="#fff" stroke-width="3"/><circle cx="24" cy="20" r="6" fill="#fff"/></svg>`
  d.style.cssText = 'width:46px;height:46px;transform:translateY(-21px)'
  return d
}

/** Reader's map: a full-screen layer with the pin and "where am I". */
export async function view(lat, lng, zoom, accent) {
  await load()
  const { style: s, covered } = await style(lng, lat)
  if (!covered) return false
  const box = document.createElement('div')
  box.className = 'mapfull'
  box.innerHTML = '<button class="x" aria-label="close">×</button><div style="position:absolute;inset:0"></div>'
  document.body.appendChild(box)
  const map = new window.maplibregl.Map({ container: box.lastChild, style: s, center: [lng, lat], zoom: zoom || 16, attributionControl: { compact: true }, localIdeographFontFamily: 'sans-serif' })
  map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
  map.addControl(new window.maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right')
  new window.maplibregl.Marker({ element: PIN(accent), anchor: 'center' }).setLngLat([lng, lat]).addTo(map)
  const close = () => { map.remove(); box.remove(); document.removeEventListener('keydown', esc) }
  const esc = (e) => { if (e.key === 'Escape') close() }
  box.firstChild.onclick = close
  document.addEventListener('keydown', esc)
  return true
}

/** Builder's picker in `el`: the pin stays in the middle and the map moves
 *  under it. onMove({lat, lng, zoom}) after each move. */
export async function picker(el, { lat, lng, zoom, accent, onMove }) {
  await load()
  const { style: s, covered } = await style(lng, lat)
  const map = new window.maplibregl.Map({ container: el, style: s, center: [lng, lat], zoom: zoom || 16, canvasContextAttributes: { preserveDrawingBuffer: true }, preserveDrawingBuffer: true, attributionControl: { compact: true }, localIdeographFontFamily: 'sans-serif' })
  map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
  const pin = PIN(accent)
  pin.style.cssText += ';position:absolute;left:50%;top:50%;margin:-23px 0 0 -23px;pointer-events:none;z-index:3'
  el.appendChild(pin)
  map.on('moveend', () => { const c = map.getCenter(); onMove && onMove({ lat: c.lat, lng: c.lng, zoom: Math.round(map.getZoom() * 10) / 10 }) })
  return {
    map, covered,
    go(lat, lng, z) { map.jumpTo({ center: [lng, lat], zoom: z || map.getZoom() }) },
    /** The map as it looks now, 1200×750 JPEG, waited until the tiles are drawn. */
    snap() {
      return new Promise((ok) => {
        const take = () => {
          const src = map.getCanvas()
          const c = document.createElement('canvas')
          c.width = 1200; c.height = 750
          const g = c.getContext('2d')
          const sw = src.width, sh = src.height, r = Math.max(1200 / sw, 750 / sh)
          g.drawImage(src, (1200 - sw * r) / 2, (750 - sh * r) / 2, sw * r, sh * r)
          // a map that never drew (a hidden tab) reads back black: no picture then
          let lit = 0
          for (const [x, y] of [[150, 150], [600, 375], [1050, 600], [300, 600], [900, 150]]) { const p = g.getImageData(x, y, 1, 1).data; if (p[0] + p[1] + p[2] > 30) lit++ }
          if (!lit) return ok(null)
          c.toBlob(ok, 'image/jpeg', 0.84)
        }
        let done = false
        const once = () => { if (!done) { done = true; take() } }
        const frame = () => { map.once('render', once); map.triggerRepaint(); setTimeout(once, 1500) }
        if (map.loaded() && map.areTilesLoaded()) frame()
        else { map.once('idle', frame); setTimeout(once, 9000) }
      })
    },
  }
}
