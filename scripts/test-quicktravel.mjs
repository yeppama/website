/**
 * "Sei qui" in "Vai a": una sola voce, anche quando due destinazioni stanno nella
 * stessa zona (cantiere: Ingresso e Catene in zone-c-entrance). Audit 2026-11-02, N3.
 * In Node, senza browser, su entrambi gli allestimenti.
 *
 *   npm run test:quicktravel
 *
 * L'allestimento si legge una volta all'import (layouts/index.js): ogni allestimento
 * gira in un processo suo, con VITE_LAYOUT impostato.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

if (!process.env.VITE_LAYOUT) {
  let failed = false
  for (const layout of ['negozio', 'cantiere']) {
    const r = spawnSync(process.execPath, [process.argv[1]], { env: { ...process.env, VITE_LAYOUT: layout }, stdio: 'inherit' })
    failed ||= r.status !== 0
  }
  process.exit(failed ? 1 : 0)
}

const layout = process.env.VITE_LAYOUT
const { storeConfig } = await import('../src/config/storeConfig.js')
const { layoutId } = await import('../src/layouts/index.js')
const { currentQuickTravelId } = await import('../src/lib/navigator.js')
const { quickTravel, waypoints } = storeConfig.navigation
const wp = (id) => waypoints.find((w) => w.id === id).position
const results = []
const test = (name, fn) => { try { const n = fn(); results.push(['ok', name, n ?? '']) } catch (e) { results.push(['FAIL', name, e.message]) } }

test(`${layout}: allestimento caricato davvero`, () => assert.equal(layoutId, layout))
test(`${layout}: su ogni destinazione di "Vai a" è segnata quella, e una sola`, () => {
  for (const q of quickTravel) {
    const [x, , z] = wp(q.waypointId)
    const here = currentQuickTravelId(quickTravel, waypoints, q.zoneId, { x, z, yaw: 0 })
    assert.equal(here, q.id, `su ${q.label} risulta ${here}`)
  }
  return `${quickTravel.length} destinazioni`
})
test(`${layout}: fuori da ogni zona nessuna voce`, () => {
  assert.equal(currentQuickTravelId(quickTravel, waypoints, null, { x: 0, z: 0, yaw: 0 }), null)
})
if (layout === 'cantiere') {
  test('cantiere: il caso coperto esiste davvero (due voci nella stessa zona)', () => {
    const per = quickTravel.reduce((m, q) => m.set(q.zoneId, (m.get(q.zoneId) ?? 0) + 1), new Map())
    assert.ok([...per.values()].some((n) => n > 1), 'nessuna zona con due destinazioni')
  })
}

for (const [s, n, e] of results) console.log(`${s.padEnd(4)} ${n}${e ? ' — ' + e : ''}`)
if (results.some(([s]) => s !== 'ok')) process.exit(1)
