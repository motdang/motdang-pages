// domain.mjs — a Gold page at the maker's own address (yourshop.com).
// Cloudflare for SaaS: each address is a custom hostname on the motdang.net
// zone; the maker points it at sites.motdang.net with one DNS record and
// Cloudflare issues its certificate. Off until CF_SAAS_TOKEN (SSL and
// Certificates: Edit on motdang.net) and ZONE_ID are set — the zone needs
// Cloudflare for SaaS turned on first (100 addresses free, then US$0.10 each a month).

const API = 'https://api.cloudflare.com/client/v4'
export const TARGET = 'sites.motdang.net'
export const on = (env) => !!(env.CF_SAAS_TOKEN && env.ZONE_ID)

/** A bare host name from what the maker typed, or ''. */
export function clean(v) {
  let s = String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '')
  if (!/^(?=.{4,200}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(s)) return ''
  if (/(^|\.)motdang\.net$|(^|\.)nanobotco\.|(^|\.)workers\.dev$|(^|\.)pages\.dev$/.test(s)) return ''
  return s
}

async function cf(env, method, path, body) {
  const r = await fetch(`${API}/zones/${env.ZONE_ID}/custom_hostnames${path}`, {
    method, headers: { authorization: 'Bearer ' + env.CF_SAAS_TOKEN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!j.success) throw new Error((j.errors || []).map((e) => e.message).join('; ') || 'cloudflare ' + r.status)
  return j.result
}

/** What the maker sees: 'active', or what is still missing. */
const stateOf = (h) => (h.status === 'active' && h.ssl?.status === 'active' ? 'active' : h.ssl?.status === 'pending_validation' || h.status === 'pending' ? 'pending' : String(h.ssl?.status || h.status || 'pending'))

export async function add(env, host) {
  const h = await cf(env, 'POST', '', { hostname: host, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } })
  return { id: h.id, state: stateOf(h) }
}
export async function look(env, id) { return stateOf(await cf(env, 'GET', '/' + id)) }
export async function drop(env, id) { try { await cf(env, 'DELETE', '/' + id) } catch {} }

/** The DNS records the maker adds at their registrar. */
export function records(host) {
  const apex = host.split('.').length === 2
  return apex
    ? [{ type: 'CNAME', name: '@', value: TARGET, note: 'CNAME flattening / ALIAS / ANAME' }, { type: 'CNAME', name: 'www', value: TARGET }]
    : [{ type: 'CNAME', name: host.split('.')[0], value: TARGET }]
}
