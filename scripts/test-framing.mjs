/**
 * Test dell'inquadratura (src/lib/framing.js) contro la camera vera di three.js:
 * il punto inquadrato deve cadere al centro della parte di schermo che il pannello
 * del Focus lascia libera, e il campo verticale della posa deve riempire quella parte.
 *
 *   npm run test:framing
 */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { storeConfig } from '../src/config/storeConfig.js'
import { fovForAspect, freeRegion, focusFraming } from '../src/lib/framing.js'
import { frameScheduler } from '../src/lib/frameScheduler.js'

const results = []
const test = (name, fn) => { try { const n = fn(); results.push(['ok', name, n ?? '']) } catch (e) { results.push(['FAIL', name, e.message]) } }
const close = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a.toFixed(2)} invece di ${b.toFixed(2)}`)
const F = storeConfig.focus
const P = storeConfig.navigation.player.fov

// Proietta un punto e restituisce le coordinate in pixel CSS.
function project(camera, W, H, point) {
  const v = point.clone().project(camera)
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }
}
function cameraFor(W, H, framing) {
  const cam = new THREE.PerspectiveCamera(framing.fov, W / H, 0.1, 100)
  cam.position.set(0, 0, 0)
  cam.lookAt(0, 0, -1)
  if (framing.offsetX || framing.offsetY) cam.setViewOffset(W, H, framing.offsetX, framing.offsetY, W, H)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return cam
}

// Formati: telefono in orizzontale e in verticale, desktop. Pannello come lo mette FocusPanel.
const FORMATS = [
  { name: 'iPhone 16 orizzontale', W: 852, H: 393, panel: { left: 520, top: 95, right: 840, bottom: 381 } },
  { name: 'iPhone SE orizzontale', W: 667, H: 375, panel: { left: 335, top: 80, right: 655, bottom: 363 } },
  { name: 'iPhone 16 verticale', W: 393, H: 852, panel: { left: 16, top: 470, right: 377, bottom: 836 } },
  { name: 'desktop', W: 1280, H: 720, panel: { left: 872, top: 380, right: 1256, bottom: 696 } },
]

test('fov del player: stessa formula di prima (campo orizzontale minimo, massimo verticale)', () => {
  for (const aspect of [0.46, 0.75, 1, 1.78, 2.17]) {
    const old = Math.min(P.maxVertical, Math.max(P.vertical,
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(P.minHorizontal) / 2) / aspect))))
    close(fovForAspect(P, aspect), old, 1e-9, `aspect ${aspect}`)
  }
})

test('regione libera: a sinistra del pannello in orizzontale, sopra in verticale, tutto lo schermo senza pannello', () => {
  const [land, , port] = FORMATS
  assert.deepEqual(freeRegion(land.W, land.H, land.panel), { x: 0, y: 0, w: 520, h: 393 })
  assert.deepEqual(freeRegion(port.W, port.H, port.panel), { x: 0, y: 0, w: 393, h: 470 })
  assert.deepEqual(freeRegion(800, 600, null), { x: 0, y: 0, w: 800, h: 600 })
})

for (const f of FORMATS) {
  test(`${f.name}: il bersaglio cade al centro della parte libera, fuori dal pannello`, () => {
    const region = freeRegion(f.W, f.H, f.panel)
    const framing = focusFraming({ width: f.W, height: f.H, region, fov: 40, minHorizontal: F.minHorizontalFov, maxVertical: F.maxVerticalFov })
    const cam = cameraFor(f.W, f.H, framing)
    const p = project(cam, f.W, f.H, new THREE.Vector3(0, 0, -5))
    close(p.x, region.x + region.w / 2, 0.5, 'x')
    close(p.y, region.y + region.h / 2, 0.5, 'y')
    const inside = p.x >= f.panel.left && p.x <= f.panel.right && p.y >= f.panel.top && p.y <= f.panel.bottom
    assert.equal(inside, false, 'il bersaglio è sotto il pannello')
    // Il campo verticale della posa (o quello allargato per il campo orizzontale
    // minimo) riempie l'altezza della regione: il bordo del campo cade sul bordo.
    const inRegion = fovForAspect({ vertical: 40, minHorizontal: F.minHorizontalFov, maxVertical: 179 }, region.w / region.h)
    if (framing.fov < F.maxVerticalFov) {
      const edge = new THREE.Vector3(0, Math.tan(THREE.MathUtils.degToRad(inRegion) / 2) * 5, -5)
      close(project(cam, f.W, f.H, edge).y, region.y, 0.5, 'bordo superiore del campo')
    }
    return `centro ${Math.round(p.x)},${Math.round(p.y)} · fov ${framing.fov.toFixed(1)}°`
  })
}

test('senza pannello: nessuno spostamento, fov della posa (come prima)', () => {
  const r = focusFraming({ width: 1280, height: 720, region: freeRegion(1280, 720, null), fov: 40, minHorizontal: F.minHorizontalFov, maxVertical: F.maxVerticalFov })
  assert.equal(r.offsetX, 0); assert.equal(r.offsetY, 0); close(r.fov, 40, 1e-9, 'fov')
})

test('regione molto bassa: il fov non supera il massimo configurato', () => {
  const r = focusFraming({ width: 400, height: 900, region: { x: 0, y: 0, w: 400, h: 120 }, fov: 40, minHorizontal: F.minHorizontalFov, maxVertical: F.maxVerticalFov })
  assert.ok(r.fov <= F.maxVerticalFov)
})

// Limitatore di fps (lib/frameScheduler.js): su schermi a frequenze diverse si
// devono ottenere ~60 fps, non 37/45/48 come con la regola "tempo dall'ultimo".
test('limitatore: ~60 fps su schermi a 60, 75, 90, 120, 144, 165, 240 Hz; 30 su uno a 30 Hz', () => {
  const out = []
  for (const hz of [30, 60, 75, 90, 120, 144, 165, 240]) {
    const due = frameScheduler(60)
    let renders = 0, seed = hz
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const seconds = 5
    for (let i = 0; i < hz * seconds; i++) if (due(i * (1000 / hz) + (rand() - 0.5))) renders++
    const fps = renders / seconds
    const want = Math.min(60, hz)
    assert.ok(Math.abs(fps - want) <= 1.5, `${hz} Hz → ${fps.toFixed(1)} fps invece di ${want}`)
    out.push(`${hz}→${fps.toFixed(0)}`)
  }
  return out.join(' ')
})

for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
const failed = results.filter((r) => r[0] === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} test superati`)
process.exit(failed ? 1 : 0)
