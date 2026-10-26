import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as dom from '../src/domain.mjs'

function fakeCf() {
  const calls = [], routes = [], hosts = {}
  let n = 0
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url), m = init.method || 'GET', body = init.body ? JSON.parse(init.body) : null
    calls.push(`${m} ${u.pathname.replace(/^.*\/zones\/Z/, '')}`)
    const ok = (result) => new Response(JSON.stringify({ success: true, result }))
    if (u.pathname.endsWith('/workers/routes') && m === 'POST') { routes.push({ id: 'r' + ++n, ...body }); return ok({}) }
    if (u.pathname.endsWith('/workers/routes') && m === 'GET') return ok(routes)
    if (/\/workers\/routes\//.test(u.pathname) && m === 'DELETE') { const id = u.pathname.split('/').pop(); routes.splice(routes.findIndex((r) => r.id === id), 1); return ok({}) }
    if (u.pathname.endsWith('/custom_hostnames') && m === 'POST') { const id = 'h' + ++n; hosts[id] = { id, hostname: body.hostname, status: 'pending', ssl: { status: 'pending_validation' } }; return ok(hosts[id]) }
    if (/custom_hostnames\//.test(u.pathname) && m === 'GET') return ok(hosts[u.pathname.split('/').pop()])
    if (/custom_hostnames\//.test(u.pathname) && m === 'DELETE') { delete hosts[u.pathname.split('/').pop()]; return ok({}) }
    return new Response(JSON.stringify({ success: false, errors: [{ message: 'unexpected ' + m + ' ' + u.pathname }] }))
  }
  return { calls, routes, hosts }
}
const env = { CF_SAAS_TOKEN: 't', ZONE_ID: 'Z' }

test('a bare domain brings www; a subdomain stands alone', () => {
  assert.deepEqual(dom.hostsOf('shop.com'), ['shop.com', 'www.shop.com'])
  assert.deepEqual(dom.hostsOf('book.shop.co.th'), ['book.shop.co.th'])
})

test('add routes each host to the Worker and makes its hostname; drop undoes both', async () => {
  const cf = fakeCf()
  const r = await dom.add(env, 'shop.com')
  assert.equal(r.id.split(',').length, 2)
  assert.deepEqual(cf.routes.map((x) => [x.pattern, x.script]), [['shop.com/*', 'motdang-pages'], ['www.shop.com/*', 'motdang-pages']])
  assert.equal(Object.keys(cf.hosts).length, 2)
  assert.equal(await dom.look(env, r.id), 'pending')
  for (const h of Object.values(cf.hosts)) { h.status = 'active'; h.ssl.status = 'active' }
  assert.equal(await dom.look(env, r.id), 'active')
  await dom.drop(env, r.id, 'shop.com')
  assert.equal(cf.routes.length, 0)
  assert.equal(Object.keys(cf.hosts).length, 0)
})

test('no catch-all route is ever made', async () => {
  const cf = fakeCf()
  await dom.add(env, 'a.example.org')
  assert.ok(cf.routes.every((x) => x.pattern !== '*/*' && !x.pattern.startsWith('*')))
})

test('clean refuses motdang.net and its own hosts', () => {
  assert.equal(dom.clean('https://Shop.com/menu'), 'shop.com')
  assert.equal(dom.clean('sites.motdang.net'), '')
  assert.equal(dom.clean('x.workers.dev'), '')
})
