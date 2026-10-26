// domain.mjs — a Gold page at the maker's own address (yourshop.com).
// Cloudflare for SaaS: each address is a custom hostname on the motdang.net
// zone; the maker points it at sites.motdang.net with one DNS record and
// Cloudflare issues its certificate. Each address also gets its own Worker
// route (yourshop.com/* → motdang-pages): the zone's catch-all */* is not used,
// because motdang.net itself and nan.motdang.net live on the same zone.
// A bare domain brings www with it. Off until CF_SAAS_TOKEN (SSL and
// Certificates: Edit, Workers Routes: Edit on motdang.net) and ZONE_ID are set.
// Cloudflare for SaaS: 100 addresses free, then US$0.10 each a month.

const API = 'https://api.cloudflare.com/client/v4'
export const TARGET = 'sites.motdang.net'
export const on = (env) => !!(env.CF_SAAS_TOKEN && env.ZONE_ID)
const SCRIPT = (env) => env.SCRIPT_NAME || 'motdang-pages'

/** A bare host name from what the maker typed, or ''. */
export function clean(v) {
  let s = String(v || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '')
  if (!/^(?=.{4,200}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(s)) return ''
  if (/(^|\.)motdang\.net$|(^|\.)nanobotco\.|(^|\.)workers\.dev$|(^|\.)pages\.dev$/.test(s)) return ''
  return s
}

async function api(env, method, path, body) {
  const r = await fetch(`${API}/zones/${env.ZONE_ID}${path}`, {
    method, headers: { authorization: 'Bearer ' + env.CF_SAAS_TOKEN, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!j.success) throw new Error((j.errors || []).map((e) => e.message).join('; ') || 'cloudflare ' + r.status)
  return j.result
}
const cf = (env, method, path, body) => api(env, method, '/custom_hostnames' + path, body)

/** The hosts one address stands for: a bare domain brings www. */
export const hostsOf = (host) => (host.split('.').length === 2 ? [host, 'www.' + host] : [host])

async function route(env, host) {
  try { await api(env, 'POST', '/workers/routes', { pattern: host + '/*', script: SCRIPT(env) }) } catch (e) {
    if (!/already|duplicate|exists/i.test(String(e.message))) throw e
  }
}
async function unroute(env, host) {
  try {
    const all = await api(env, 'GET', '/workers/routes')
    for (const r of all || []) if (r.pattern === host + '/*') await api(env, 'DELETE', '/workers/routes/' + r.id)
  } catch {}
}

/** What the maker sees: 'active', or what is still missing. */
const stateOf = (h) => (h.status === 'active' && h.ssl?.status === 'active' ? 'active' : h.ssl?.status === 'pending_validation' || h.status === 'pending' ? 'pending' : String(h.ssl?.status || h.status || 'pending'))

/** Adds the address (and www for a bare domain): its custom hostnames and Worker routes.
 *  domain_id keeps the hostname ids joined by commas; the first is the address itself. */
export async function add(env, host) {
  const ids = []
  try {
    for (const h of hostsOf(host)) {
      await route(env, h)
      const r = await cf(env, 'POST', '', { hostname: h, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } })
      ids.push(r.id)
    }
  } catch (e) { await drop(env, ids.join(','), host); throw e }
  return { id: ids.join(','), state: 'pending' }
}
/** 'active' once every host of the address is active, else the first state still missing. */
export async function look(env, id) {
  const states = []
  for (const one of String(id).split(',').filter(Boolean)) states.push(stateOf(await cf(env, 'GET', '/' + one)))
  return states.find((x) => x !== 'active') || 'active'
}
export async function drop(env, id, host) {
  for (const one of String(id || '').split(',').filter(Boolean)) { try { await cf(env, 'DELETE', '/' + one) } catch {} }
  if (host) for (const h of hostsOf(host)) await unroute(env, h)
}

/** The DNS records the maker adds at their registrar. */
export function records(host) {
  const apex = host.split('.').length === 2
  return apex
    ? [{ type: 'CNAME', name: '@', value: TARGET, note: 'CNAME flattening / ALIAS / ANAME' }, { type: 'CNAME', name: 'www', value: TARGET }]
    : [{ type: 'CNAME', name: host.split('.')[0], value: TARGET }]
}
