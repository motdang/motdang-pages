// pd.mjs — the picture library: public-domain and CC0 pictures a maker can
// put on a page, each with its credit. Three sources, asked together:
// Wikimedia Commons (files whose structured data says public domain or CC0),
// the Cleveland Museum of Art (its open-access works, CC0), and Openverse
// (public-domain mark and CC0 only). Answers are cached for a day.

const UA = 'motdang-pages/1.0 (https://sites.motdang.net; nan@motdang.net)'
const TIMEOUT = 6000

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const cut = (s, n) => { s = strip(s); return s.length > n ? s.slice(0, n - 1) + '…' : s }

async function get(url, ms = TIMEOUT) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: ac.signal, cf: { cacheTtl: 86400, cacheEverything: true } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null } finally { clearTimeout(t) }
}

/** Commons: files with P6216 = public domain, or P275 = CC0, bitmaps only. */
export async function commons(q, n = 18) {
  const s = `${q} haswbstatement:P6216=Q19652|P275=Q6938433 filetype:bitmap`
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6' +
    `&gsrlimit=${n}&gsrsearch=${encodeURIComponent(s)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&iiextmetadatafilter=LicenseShortName|Artist|ObjectName|LicenseUrl`
  const j = await get(u)
  const pages = Object.values(j?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0))
  return pages.map((p) => {
    const ii = p.imageinfo?.[0]
    if (!ii || !ii.thumburl) return null
    const m = ii.extmetadata || {}
    const lic = strip(m.LicenseShortName?.value) || 'Public domain'
    if (!/^(public domain|pd|cc0)/i.test(lic)) return null
    const small = ii.width > 500 && /\/\d+px-/.test(ii.thumburl) ? ii.thumburl.replace(/\/\d+px-/, '/500px-') : ii.thumburl
    return {
      id: 'c:' + p.pageid, from: 'commons',
      title: cut(m.ObjectName?.value || p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), 120),
      by: cut(m.Artist?.value, 120) || 'Unknown', src: ii.descriptionurl,
      license: /cc0/i.test(lic) ? 'CC0' : 'Public domain', licenseUrl: /cc0/i.test(lic) ? 'https://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/publicdomain/mark/1.0/',
      thumb: small, big: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight,
    }
  }).filter(Boolean)
}

/** The Cleveland Museum of Art: its open-access works, CC0. */
export async function cleveland(q, n = 12) {
  const j = await get(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&cc0=1&has_image=1&limit=${n}&fields=id,title,creators,images,url,creation_date`)
  return (j?.data || []).filter((a) => a.images?.web?.url).map((a) => ({
    id: 'm:' + a.id, from: 'cleveland', title: cut(a.title, 120), by: cut(a.creators?.[0]?.description, 120) || 'Unknown',
    src: a.url || `https://clevelandart.org/art/${a.id}`, license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    thumb: a.images.web.url, big: a.images.web.url, w: Number(a.images.web.width) || null, h: Number(a.images.web.height) || null, date: cut(a.creation_date, 40),
  }))
}

/** Openverse: public-domain mark and CC0 only. 200 asks a day without a key. */
export async function openverse(q, n = 12) {
  const j = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=pdm,cc0&page_size=${n}&mature=false`)
  return (j?.results || []).filter((r) => r.url && /^https:/.test(r.url)).map((r) => ({
    id: 'o:' + r.id, from: 'openverse', title: cut(r.title, 120) || 'Untitled', by: cut(r.creator, 120) || 'Unknown',
    src: r.foreign_landing_url || r.url, license: r.license === 'cc0' ? 'CC0' : 'Public domain', licenseUrl: r.license_url,
    thumb: r.thumbnail || r.url, big: r.url, w: r.width || null, h: r.height || null, via: r.source,
  }))
}

/** All three, interleaved so each source shows near the top. */
export async function search(q) {
  q = String(q || '').trim().slice(0, 80)
  if (!q) return []
  const [a, b, c] = await Promise.all([commons(q), cleveland(q), openverse(q)])
  const out = [], seen = new Set()
  for (let i = 0; i < 24; i++) for (const list of [a, b, c]) {
    const x = list[i]
    if (x && !seen.has(x.big)) { seen.add(x.big); out.push(x) }
  }
  return out.slice(0, 48)
}


/** The picture a maker picked, looked up again at its source so the credit
 *  is the source's, not the browser's. The pick with `big`, its address, or null. */
export async function lookup(id) {
  const m = /^([cmo]):([\w-]{1,64})$/.exec(String(id || ''))
  if (!m) return null
  let pick = null
  if (m[1] === 'c') {
    const j = await get('https://commons.wikimedia.org/w/api.php?action=query&format=json&pageids=' + m[2] +
      '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280&iiextmetadatafilter=LicenseShortName|Artist|ObjectName|LicenseUrl')
    const p = Object.values(j?.query?.pages || {})[0]
    const ii = p?.imageinfo?.[0], md = ii?.extmetadata || {}
    const lic = strip(md.LicenseShortName?.value)
    if (ii?.thumburl && /^(public domain|pd|cc0)/i.test(lic)) pick = { id, from: 'commons', title: cut(md.ObjectName?.value || p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), 120),
      by: cut(md.Artist?.value, 120) || 'Unknown', src: ii.descriptionurl, license: /cc0/i.test(lic) ? 'CC0' : 'Public domain',
      licenseUrl: /cc0/i.test(lic) ? 'https://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/publicdomain/mark/1.0/', big: ii.thumburl }
  } else if (m[1] === 'm') {
    const j = await get(`https://openaccess-api.clevelandart.org/api/artworks/${encodeURIComponent(m[2])}`)
    const a = j?.data
    if (a && a.share_license_status === 'CC0' && a.images?.web?.url) pick = { id, from: 'cleveland', title: cut(a.title, 120), by: cut(a.creators?.[0]?.description, 120) || 'Unknown',
      src: a.url || `https://clevelandart.org/art/${a.id}`, license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', big: a.images.web.url }
  } else {
    const r = await get(`https://api.openverse.org/v1/images/${encodeURIComponent(m[2])}/`)
    if (r?.url && (r.license === 'cc0' || r.license === 'pdm')) pick = { id, from: 'openverse', title: cut(r.title, 120) || 'Untitled', by: cut(r.creator, 120) || 'Unknown',
      src: r.foreign_landing_url || r.url, license: r.license === 'cc0' ? 'CC0' : 'Public domain', licenseUrl: r.license_url, big: r.url, via: r.source }
  }
  return pick
}

/** The picture's bytes, for the maker's browser to shrink. { pick, bytes } or { error }. */
export async function take(id) {
  const pick = await lookup(id)
  if (!pick) return { error: 'not-free' }
  let host = ''
  try { host = new URL(pick.big).hostname } catch {}
  if (!/^https:/.test(pick.big) || !host.includes('.') || /^[\d.]+$|:/.test(host)) return { error: 'host' }
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 15000)
  try {
    const r = await fetch(pick.big, { headers: { 'user-agent': UA }, signal: ac.signal })
    if (!r.ok) return { error: 'fetch' }
    const len = Number(r.headers.get('content-length') || 0)
    if (len > 15_000_000) return { error: 'big' }
    const bytes = new Uint8Array(await r.arrayBuffer())
    if (bytes.length > 15_000_000) return { error: 'big' }
    delete pick.big
    return { pick, bytes }
  } catch { return { error: 'fetch' } } finally { clearTimeout(t) }
}
