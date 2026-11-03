/**
 * Test di `scripts/check-scopes.mjs`, in Node, senza rete.
 *
 * Lo script interroga il negozio dal vivo, quindi qui gira con un `fetch` finto
 * caricato prima di lui (`--import`). Si verifica solo che sondi il negozio e il
 * token che la build pubblicherebbe: con VITE_SHOPIFY_* impostate, quelli, non
 * storeConfig (audit 2026-11-02, S2). E che il token non finisca nell'output.
 *
 *   npm run test:scopes
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { storeConfig } from '../src/config/storeConfig.js'

const dir = mkdtempSync(join(tmpdir(), 'scopes-'))
const stub = join(dir, 'fake-fetch.mjs')
// Ogni chiamata stampa l'URL e se il token nell'header e' quello atteso (mai il
// token stesso). Risponde "accesso negato": lo script finisce con exit 1, ed e'
// giusto cosi' — qui conta solo cosa ha interrogato.
writeFileSync(stub, `globalThis.fetch = async (url, init) => {
  const t = init.headers['X-Shopify-Storefront-Access-Token']
  process.stderr.write('FETCH ' + url + ' token=' + (t === process.env.EXPECTED_TOKEN ? 'atteso' : 'diverso') + '\\n')
  return { status: 403, json: async () => ({ errors: [{ message: 'Access denied' }] }) }
}\n`)

const run = (env) => {
  const clean = { PATH: process.env.PATH, ...env }   // niente proxy: lo script non deve rilanciarsi
  return spawnSync(process.execPath, ['--no-warnings', '--import', stub, 'scripts/check-scopes.mjs'], { env: clean, encoding: 'utf8' })
}
const results = []
const test = (name, fn) => { try { fn(); results.push(['ok', name]) } catch (e) { results.push(['FAIL', name, e.message]) } }

test('con VITE_SHOPIFY_* sonda il dominio e il token della build', () => {
  const token = 'token-di-prova-env'
  const r = run({ VITE_SHOPIFY_DOMAIN: 'example.invalid', VITE_SHOPIFY_STOREFRONT_TOKEN: token, VITE_SHOPIFY_API_VERSION: '2099-01', EXPECTED_TOKEN: token })
  const calls = r.stderr.split('\n').filter((l) => l.startsWith('FETCH '))
  assert.ok(calls.length > 0, 'nessuna chiamata')
  for (const c of calls) {
    assert.match(c, /^FETCH https:\/\/example\.invalid\/api\/2099-01\/graphql\.json /)
    assert.match(c, /token=atteso$/)
  }
  assert.match(r.stdout, /Negozio: example\.invalid/)
  assert.match(r.stdout, /dominio da VITE_SHOPIFY_DOMAIN · token da VITE_SHOPIFY_STOREFRONT_TOKEN · versione da VITE_SHOPIFY_API_VERSION/)
  assert.ok(!r.stdout.includes(token) && !r.stderr.includes(token), 'il token compare nell\'output')
})

test('senza VITE_SHOPIFY_* usa storeConfig', () => {
  const { domain, storefrontToken } = storeConfig.commerce.shopify
  const r = run({ EXPECTED_TOKEN: storefrontToken })
  const calls = r.stderr.split('\n').filter((l) => l.startsWith('FETCH '))
  assert.ok(calls.length > 0, 'nessuna chiamata')
  for (const c of calls) {
    assert.ok(c.startsWith(`FETCH https://${domain}/`), c)
    assert.match(c, /token=atteso$/)
  }
  assert.match(r.stdout, /dominio da storeConfig · token da storeConfig/)
})

rmSync(dir, { recursive: true, force: true })
for (const [s, n, e] of results) console.log(`${s.padEnd(4)} ${n}${e ? ' — ' + e : ''}`)
if (results.some(([s]) => s !== 'ok')) process.exit(1)
