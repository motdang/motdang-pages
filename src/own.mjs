// own.mjs — a Gold page with its own design (Nan 2026-10-28, for Fashion King: "On sites.motdang.net"). The page's
// own HTML and files are made for it by the Mot Dang team and put in R2 under own/<site id>/, by the team only (they run
// on this origin, beside every editor). The page record keeps everything else: bookings, messages, orders, stats, the
// editor. d.own = { v } turns it on; while the files are missing the page draws as every other page does.
// Served at /<name>/ (with the slash, so the files it names resolve under it) and /<name>/<file>.

const TYPES = {
  html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', mjs: 'text/javascript; charset=utf-8', js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml', woff2: 'font/woff2',
}
export const FILE = /^[a-z0-9_-][a-z0-9._-]*(\/[a-z0-9_-][a-z0-9._-]*)*\.[a-z0-9]{2,5}$/i

/** Whether a site's record turns its own design on. */
export const ownOn = (d) => !!(d && d.own && typeof d.own === 'object' && /^[a-z0-9-]{4,40}$/.test(String(d.own.v || '')))

export const CSP_OWN = (nonce) => `default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; ` + // stylecheck: allow (a CSP keyword)
  `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-src 'self' https://www.openstreetmap.org; ` +
  `frame-ancestors 'self'; base-uri 'none'; form-action 'self'`

/** The page's own index.html, every inline script given this response's nonce; null when there is none. */
export async function ownPage(env, siteId, nonce) {
  const obj = await env.MEDIA.get(`own/${siteId}/index.html`)
  if (!obj) return null
  const h = (await obj.text()).replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`)
  return new Response(h, { headers: { 'content-type': TYPES.html, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'content-security-policy': CSP_OWN(nonce), 'x-robots-tag': 'notranslate' } })
}

/** One of the page's own files (never another HTML page); null when it is not there. */
export async function ownFile(env, siteId, rest) {
  if (!FILE.test(rest) || rest.split('/').some((x) => x.startsWith('.'))) return null
  const ext = rest.split('.').pop().toLowerCase(), type = TYPES[ext]
  if (!type || ext === 'html') return null
  const obj = await env.MEDIA.get(`own/${siteId}/${rest}`)
  if (!obj) return null
  return new Response(obj.body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=600', 'x-content-type-options': 'nosniff' } })
}
