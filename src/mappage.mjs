// mappage.mjs — /map: a page's drawn map. Mot Dang's doodle-map engine
// (motdang.net/sites/doodle-map/map.js) draws the ground a piece at a time
// from the world tile archive, in any country, with the page's pin at the
// middle. The page frames it; a tap opens it to the whole screen. Its base is
// motdang.net, so the engine's own data, places and links come from there.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])

const CSS = `:root{--paper:#f5ecd7;--ink:#2b2118;--mute:#6d5d4b;--card:#fffaf0;--line:#d9c9a8;--red:#d9473b;--blue:#2f6fbf}
*{box-sizing:border-box;min-width:0}html,body{margin:0;height:100%;overflow:hidden;background:var(--paper)}
body{color:var(--ink);font:16px/1.55 Mali,"Sarabun","Noto Sans Thai",system-ui,sans-serif}a{color:var(--blue)}
[data-lang="th"] .en,[data-lang="en"] .th{display:none}
.stage{position:relative;height:100vh;height:100dvh;background:var(--paper)}
#map{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
#loading{position:absolute;inset:0;display:grid;place-items:center;color:#6d5d4b;font-size:1.1rem;pointer-events:none}#loading[hidden]{display:none}
.cartouche{display:none}
.tools{position:absolute;right:12px;top:12px;width:min(250px,calc(100% - 24px));display:flex;flex-direction:column;gap:6px;align-items:stretch}
.tools input{font:inherit;font-size:.9rem;padding:6px 10px;border:2px solid #2b2118;border-radius:10px 6px 12px 6px;background:#fffaf0;color:#2b2118}
#found{display:flex;flex-direction:column;gap:2px}#found button{font:inherit;font-size:.85rem;text-align:left;padding:4px 10px;border:1px solid #d9c9a8;border-radius:6px;background:#fffaf0;color:#2b2118;cursor:pointer}
.fly{display:none}
.chip{flex:none;white-space:nowrap;font:inherit;font-size:.78rem;padding:3px 9px;border:1.5px solid #2b2118;border-radius:12px 8px 12px 9px;background:#fffaf0;color:#2b2118;cursor:pointer;display:flex;align-items:center;gap:4px;opacity:.45}.chip.on{opacity:1;box-shadow:2px 2px 0 rgba(43,33,24,.25)}
#legend{position:absolute;left:0;right:0;bottom:44px;display:flex;gap:6px;overflow-x:auto;padding:4px 12px;scrollbar-width:none}#legend::-webkit-scrollbar{display:none}
#card{position:absolute;right:12px;bottom:96px;width:min(320px,calc(100% - 24px));max-height:calc(100% - 200px);overflow:auto;background:var(--card);color:var(--ink);border:2px solid var(--ink);border-radius:8px 16px 10px 14px;padding:12px 14px;box-shadow:4px 4px 0 rgba(43,33,24,.25)}
#card .x{position:absolute;right:6px;top:4px;font:inherit;font-size:1.3rem;border:0;background:none;color:var(--ink);cursor:pointer}#card h3{margin:.1em 0;font-size:1.2rem;line-height:1.25;padding-right:20px}
#card .kind{margin:0;font-size:.78rem;font-weight:700}#card .alt{margin:0;color:var(--mute);font-size:.9rem}#card img{width:100%;border-radius:6px;display:block}#card figcaption{font-size:.7rem;color:var(--mute)}
@media (max-width:640px){.tools{top:auto;bottom:96px;right:12px;left:12px;width:auto}.tools input{display:none}#card{left:12px;right:12px;width:auto;bottom:12px;max-height:60%;z-index:3}}
.embed:not(.tool) .tools,.embed:not(.tool) #legend,.embed:not(.tool) #card{display:none}
.embed:not(.tool) #map{touch-action:pan-y;cursor:pointer}
#shut,#full{display:none}
.embed.tool #shut{display:block;position:absolute;left:14px;top:14px;font:inherit;font-size:1.3rem;line-height:1;width:44px;height:44px;border:2px solid #2b2118;border-radius:50%;background:#fffaf0;color:#2b2118;cursor:pointer;z-index:4}
.embed:not(.tool) #full{display:block;position:absolute;left:50%;bottom:18px;transform:translateX(-50%) rotate(-1deg);background:#fffaf0;border:2px solid #2b2118;border-radius:10px 14px 9px 12px;padding:6px 14px;color:#2b2118;font-size:.95rem;font-weight:600;box-shadow:3px 3px 0 rgba(43,33,24,.25);pointer-events:none;white-space:nowrap}`

/** The map page for ?pin=lat,lng&pn=name&a=accent&z=zoom. */
export function mapPage(url, nonce, lang) {
  const q = url.searchParams
  const [lat, lng] = (q.get('pin') || '').split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) return null
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const r = 0.5, rl = r / cos
  const cfg = {
    lat0: lat, view: [lat, lng], span: 0.03, bound: [lat - r, lat + r, lng - rl, lng + rl], smin: 1400, zmax: 18,
    tiles: 'https://motdang.net/tiles/world.pmtiles', tbox: [lng - rl * 2, lat - r * 2, lng + rl * 2, lat + r * 2], tminz: 9,
    ground: null, spots: null, culture: null, live: 'none', moat: null, core: [lat - 0.04, lat + 0.04, lng - 0.04 / cos, lng + 0.04 / cos],
    rides: [0, 0, 0, 0], river: null, walk: null, rushHex: null, gauge: null, midAt: 4000, ttMin: 7000, waterEdge: false, mustAt: 0,
    lookScale: 1.1, ferries: [], landmarks: [], insets: {},
  }
  const l = lang === 'th' ? 'th' : 'en'
  return `<!doctype html><html lang="${l}" data-lang="${l}" translate="no" class="notranslate"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex">
<base href="https://motdang.net/"><title>${esc(q.get('pn') || 'Map')}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>
<section class="stage" aria-label="map"><canvas id="map" role="img" aria-label="${esc(q.get('pn') || '')}"></canvas>
<div id="loading"><span class="th">กำลังวาด…</span><span class="en">Drawing…</span></div>
<div class="cartouche"><h1></h1><p class="ed"></p><p class="live" id="live"></p><p class="for"></p></div>
<div class="tools"><input id="find" type="search" placeholder="ค้นหา · find" autocomplete="off" aria-label="find a place"><div id="found"></div><div class="fly"></div></div>
<div id="legend" aria-label="kinds"></div><div id="card" hidden></div>
<button type="button" id="shut" aria-label="close the map">×</button>
<p id="full"><span class="th">แตะเพื่อเปิดแผนที่วาดมือ</span><span class="en">Tap to open the drawn map</span></p></section>
<script nonce="${nonce}">window.DOODLE=${JSON.stringify(cfg)};</script>
<script src="vendor/pmtiles.js"></script><script src="sites/doodle-map/map.js"></script>
<script nonce="${nonce}">if(document.fonts)document.fonts.ready.then(function(){window.dispatchEvent(new CustomEvent('mdlang',{detail:'${l}'}))});</script>
</body></html>`
}
