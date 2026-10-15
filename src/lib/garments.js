import * as THREE from 'three'

/**
 * Geometrie segnaposto dei capi, generate da codice e condivise.
 *
 * Una silhouette 2D (sopra: maglia/felpa/giacca; sotto: pantalone) estrusa di
 * pochi centimetri: si legge come capo a qualsiasi distanza, costa poche
 * centinaia di triangoli, e una volta creata è riusata da tutti gli espositori.
 */

const cache = new Map()

function topShape() {
  const s = new THREE.Shape()
  s.moveTo(-0.09, 0.34)
  s.lineTo(-0.24, 0.31)
  s.lineTo(-0.39, 0.2)
  s.lineTo(-0.33, 0.08)
  s.lineTo(-0.25, 0.14)
  s.lineTo(-0.26, -0.34)
  s.lineTo(0.26, -0.34)
  s.lineTo(0.25, 0.14)
  s.lineTo(0.33, 0.08)
  s.lineTo(0.39, 0.2)
  s.lineTo(0.24, 0.31)
  s.lineTo(0.09, 0.34)
  s.quadraticCurveTo(0, 0.26, -0.09, 0.34)
  return s
}

function bottomShape() {
  const s = new THREE.Shape()
  s.moveTo(-0.2, 0.5)
  s.lineTo(0.2, 0.5)
  s.lineTo(0.23, -0.5)
  s.lineTo(0.05, -0.5)
  s.lineTo(0, 0.16)
  s.lineTo(-0.05, -0.5)
  s.lineTo(-0.23, -0.5)
  s.lineTo(-0.2, 0.5)
  return s
}

/** Silhouette estrusa: 'top' (larga 0,78 m, alta 0,68) o 'bottom' (0,46 × 1,0). */
export function getGarmentGeometry(kind) {
  const key = `flat:${kind}`
  if (cache.has(key)) return cache.get(key)
  const shape = kind === 'bottom' ? bottomShape() : topShape()
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 6,
  })
  g.translate(0, 0, -0.0175)
  g.computeVertexNormals()
  cache.set(key, g)
  return g
}

/**
 * Profilo del busto da sartoria (raggio, altezza), ruotato attorno all'asse Y.
 * La sezione circolare viene poi schiacciata in profondità: un busto è più
 * largo che spesso.
 */
const TORSO_PROFILE = [
  [0.0, 0.0], [0.17, 0.0], [0.19, 0.06], [0.175, 0.22], [0.2, 0.4],
  [0.235, 0.52], [0.25, 0.58], [0.17, 0.64], [0.07, 0.66], [0.0, 0.66],
]

export function getTorsoGeometry(scale = 1) {
  const key = `torso:${scale}`
  if (cache.has(key)) return cache.get(key)
  const pts = TORSO_PROFILE.map(([r, y]) => new THREE.Vector2(r * scale, y))
  const g = new THREE.LatheGeometry(pts, 28)
  g.computeVertexNormals()
  cache.set(key, g)
  return g
}

/** Il capo indossato: lo stesso profilo, un filo più largo, aperto in alto e in basso. */
export function getWornShellGeometry() {
  const key = 'shell:top'
  if (cache.has(key)) return cache.get(key)
  const pts = TORSO_PROFILE.slice(1, 8).map(([r, y]) => new THREE.Vector2(r * 1.07 + 0.006, y))
  pts.unshift(new THREE.Vector2(0.2, -0.06))
  const g = new THREE.LatheGeometry(pts, 28)
  g.computeVertexNormals()
  cache.set(key, g)
  return g
}
