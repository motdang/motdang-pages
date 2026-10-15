import { test } from 'node:test'
import assert from 'node:assert/strict'
import { link, read } from '../src/slipq.mjs'
import { sha } from '../src/worker.mjs'

const env = { SESSION_SECRET: 's3cret' }
test('slip link opens its own payment only', async () => {
  const u = await link(env, 'https://sites.motdang.net', 'abcdefghij12', sha)
  const path = new URL(u).pathname
  assert.deepEqual(await read(env, path, sha), { payId: 'abcdefghij12', img: false })
  assert.deepEqual(await read(env, path + '/slip', sha), { payId: 'abcdefghij12', img: true })
  assert.equal(await read(env, path.replace('abcdefghij12', 'abcdefghij13'), sha), null)
  assert.equal(await read({ SESSION_SECRET: 'other' }, path, sha), null)
  const old = path.replace(/\.([a-z0-9]+)\./, '.' + Math.floor(Date.now() / 1000 - 10).toString(36) + '.')
  assert.deepEqual(await read(env, old, sha), { expired: true })
})
