/**
 * Test della logica pura di navigazione: geometria, collisioni, percorsi.
 * Nessun browser: gira in Node e verifica le garanzie su cui poggia la Fase 3.
 *
 *   npm run test:nav
 */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { storeConfig } from '../src/config/storeConfig.js'
import { pointInCollider, circleOverlapsCollider, rayHitsCollider, inAnyArea } from '../src/lib/geometry.js'
import { moveWithCollisions } from '../src/lib/collision.js'
import { createNavigator } from '../src/lib/navigator.js'

let seed = 42
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const range = (a, b) => a + rnd() * (b - a)

const { colliders } = storeConfig
const { player, walkableAreas } = storeConfig.navigation
const r = player.radius
const opts = { radius: r, colliders, walkableAreas, maxStep: r * 0.5 }
// Modello fisico esatto: cerchio contro box ad angoli arrotondati, con 0,1 mm di tolleranza.
const inside = (p) => colliders.find((c) => circleOverlapsCollider([p.x, p.z], c, r - 1e-4))

const results = []
function test(name, fn) {
  try { const note = fn(); results.push(['ok', name, note ?? '']) }
  catch (e) { results.push(['FAIL', name, e.message]) }
}

test('geometria coerente con la rotazione di three (2000 punti, collider ruotati)', () => {
  for (let i = 0; i < 2000; i++) {
    const c = { center: [range(-5, 5), 1, range(-5, 5)], size: [range(0.3, 4), 2, range(0.3, 4)], rotationY: range(-3.2, 3.2) }
    const o = new THREE.Object3D(); o.position.set(...c.center); o.rotation.y = c.rotationY; o.updateMatrixWorld()
    const lx = range(-3, 3); const lz = range(-3, 3)
    const expected = Math.abs(lx) <= c.size[0] / 2 && Math.abs(lz) <= c.size[2] / 2
    if (Math.abs(Math.abs(lx) - c.size[0] / 2) < 1e-6 || Math.abs(Math.abs(lz) - c.size[2] / 2) < 1e-6) continue
    const w = new THREE.Vector3(lx, 0, lz).applyMatrix4(o.matrixWorld)
    assert.equal(pointInCollider([w.x, w.z], c), expected, `punto ${i}`)
  }
})

test('raggio 3D: colpisce il box ruotato dove three lo disegna', () => {
  const c = { center: [2, 1, -3], size: [3, 2, 0.5], rotationY: 0.7 }
  const o = new THREE.Object3D(); o.position.set(...c.center); o.rotation.y = c.rotationY; o.updateMatrixWorld()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...c.size)); mesh.position.copy(o.position); mesh.rotation.copy(o.rotation); mesh.updateMatrixWorld()
  const ray = new THREE.Raycaster()
  for (let i = 0; i < 500; i++) {
    const origin = new THREE.Vector3(range(-6, 6), range(0.5, 3), range(4, 8))
    const dir = new THREE.Vector3(range(-1, 1), range(-0.4, 0.2), -1).normalize()
    ray.set(origin, dir)
    const hit = ray.intersectObject(mesh)[0]
    const t = rayHitsCollider(origin.toArray(), dir.toArray(), c)
    if (hit) assert.ok(t !== null && Math.abs(t - hit.distance) < 1e-4, `raggio ${i}: three ${hit.distance} vs ${t}`)
    else assert.equal(t, null, `raggio ${i}: falso positivo`)
  }
})

test('spingere contro il muro nord per 10 s non lo attraversa mai', () => {
  const pos = { x: 0, z: -15 }
  for (let i = 0; i < 450; i++) {
    moveWithCollisions(pos, 0, -player.walkSpeed * player.sprintMultiplier / 45, opts)
    assert.ok(!inside(pos), `frame ${i}: dentro ${inside(pos)?.id}`)
  }
  assert.ok(pos.z >= -17.0001, `z = ${pos.z}`)
})

test('in diagonale contro un muro si scivola lungo il muro', () => {
  const pos = { x: -5, z: -16.9 }
  const before = pos.x
  for (let i = 0; i < 45; i++) moveWithCollisions(pos, 0.05, -0.05, opts)
  assert.ok(pos.x - before > 2, `avanzato lungo il muro solo di ${(pos.x - before).toFixed(2)} m`)
  assert.ok(!inside(pos))
})

test('niente tunnelling: un salto di 6 m dritto contro una colonna si ferma davanti', () => {
  const col = colliders.find((c) => c.id === 'colb-w-p4')
  const pos = { x: col.center[0], z: col.center[2] + 3 }
  moveWithCollisions(pos, 0, -6, opts)
  assert.ok(pos.z > col.center[2], `finito oltre la colonna, z = ${pos.z.toFixed(2)}`)
  assert.ok(!inside(pos))
})

test('fuzz: 20 000 movimenti casuali, mai dentro un collider né fuori dall\'area', () => {
  const pos = { x: 0, z: 14 }
  for (let i = 0; i < 20000; i++) {
    moveWithCollisions(pos, range(-0.4, 0.4), range(-0.4, 0.4), opts)
    assert.ok(!inside(pos), `passo ${i}: dentro ${inside(pos)?.id} a ${pos.x.toFixed(2)},${pos.z.toFixed(2)}`)
    assert.ok(inAnyArea([pos.x, pos.z], walkableAreas), `passo ${i}: fuori area`)
  }
})

test('navigatore: 3000 coppie casuali, ogni segmento di ogni percorso è libero', () => {
  const nav = createNavigator(storeConfig)
  let ok = 0; let blocked = 0; let unreachable = 0
  for (let i = 0; i < 3000; i++) {
    let from
    do { from = [range(-11, 11), range(-17, 17)] } while (!nav.isWalkable(from))
    const to = [range(-12, 12), range(-18, 18)]
    const res = nav.plan(from, to)
    if (!res.ok) {
      if (res.reason === 'blocked') { blocked++; assert.ok(!nav.isWalkable(to), `rifiutato un punto valido ${to}`) }
      else unreachable++
      continue
    }
    ok++
    let cur = from
    for (const p of res.points) {
      assert.ok(nav.clear(cur, p), `percorso ${i}: segmento ${cur} → ${p} attraversa un collider`)
      cur = p
    }
    assert.deepEqual(res.points.at(-1), to)
  }
  assert.equal(unreachable, 0, `${unreachable} destinazioni valide irraggiungibili`)
  return `${ok} pianificati, ${blocked} rifiutati perché non calpestabili, 0 irraggiungibili`
})

test('tap dentro una colonna o fuori dal negozio: rifiutato', () => {
  const nav = createNavigator(storeConfig)
  assert.equal(nav.plan([0, 14], [-9, 4]).reason, 'blocked')
  assert.equal(nav.plan([0, 14], [0, 25]).reason, 'blocked')
  assert.equal(nav.plan([0, 14], [14, 0]).reason, 'blocked')
})

test('teletrasporto: ogni destinazione rapida è calpestabile', () => {
  const nav = createNavigator(storeConfig)
  for (const qt of storeConfig.navigation.quickTravel) {
    const w = storeConfig.navigation.waypoints.find((x) => x.id === qt.waypointId)
    assert.ok(w.safeForTeleport && nav.isWalkable([w.position[0], w.position[2]]), qt.id)
  }
})

test('appoggiato a un ostacolo: il tocco porta comunque a destinazione', () => {
  // Si spinge il player contro ogni collider da 16 direzioni con la fisica vera,
  // poi si pianifica verso il centro del negozio da dove si è fermato.
  const nav = createNavigator(storeConfig)
  const { player, walkableAreas } = storeConfig.navigation
  const opts = { radius: player.radius, colliders: storeConfig.colliders, walkableAreas, maxStep: player.radius * 0.5 }
  const target = [0, 0]
  let tried = 0; const failures = []
  for (const c of storeConfig.colliders) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const pos = { x: c.center[0] + Math.cos(a) * 3, z: c.center[2] + Math.sin(a) * 3 }
      if (!nav.isWalkable([pos.x, pos.z])) continue
      for (let t = 0; t < 120; t++) moveWithCollisions(pos, -Math.cos(a) * 0.05, -Math.sin(a) * 0.05, opts)
      tried++
      const res = nav.plan([pos.x, pos.z], target)
      if (!res.ok) failures.push(`${c.id}@${k}: ${res.reason}`)
    }
  }
  assert.equal(failures.length, 0, failures.slice(0, 5).join('; '))
  return `${tried} posizioni a contatto, tutte con un percorso`
})

const failed = results.filter(([s]) => s === 'FAIL')
for (const [s, name, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${name}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} test superati`)
process.exit(failed.length ? 1 : 0)
