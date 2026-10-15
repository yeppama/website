/**
 * Geometria sul piano del pavimento (x, z) e raggi in 3D, contro box orientati.
 *
 * Logica pura, senza three né React: la usano il validatore del config, il
 * risolutore delle collisioni e il navigatore. I collider ruotano solo attorno a Y.
 *
 * CONVENZIONE — identica a quella di three (Object3D.rotation.y = θ):
 *   locale → mondo:  x =  lx·cosθ + lz·sinθ     z = −lx·sinθ + lz·cosθ
 *   mondo → locale:  lx = x·cosθ − z·sinθ        lz = x·sinθ + z·cosθ
 * Fino alla Fase 2 il segno era invertito: un collider ruotato risultava
 * speculare rispetto al box che three disegna. Il test in
 * scripts/test-navigation.mjs confronta questa funzione con la matrice di three.
 */

export function toLocal([x, z], collider) {
  const t = collider.rotationY || 0
  const dx = x - collider.center[0]
  const dz = z - collider.center[2]
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [dx * c - dz * s, dx * s + dz * c]
}

export function toWorld([lx, lz], collider) {
  const t = collider.rotationY || 0
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [collider.center[0] + lx * c + lz * s, collider.center[2] - lx * s + lz * c]
}

/** Il punto cade dentro il box, allargato di `margin`? */
export function pointInCollider(point, collider, margin = 0) {
  const [lx, lz] = toLocal(point, collider)
  return Math.abs(lx) <= collider.size[0] / 2 + margin && Math.abs(lz) <= collider.size[2] / 2 + margin
}

/**
 * Un cerchio di raggio r compenetra il box? Modello esatto (angoli arrotondati),
 * lo stesso del risolutore delle collisioni. `pointInCollider` con margine è
 * invece un box allargato ad angoli vivi: più prudente, usato per i percorsi.
 */
export function circleOverlapsCollider(point, collider, radius) {
  const [lx, lz] = toLocal(point, collider)
  const qx = Math.min(Math.max(lx, -collider.size[0] / 2), collider.size[0] / 2)
  const qz = Math.min(Math.max(lz, -collider.size[2] / 2), collider.size[2] / 2)
  return (lx - qx) ** 2 + (lz - qz) ** 2 < radius * radius
}

/**
 * Il segmento a→b attraversa il box allargato di `margin`? Metodo delle "slab".
 * Con margin = raggio del player risponde a "un corpo largo così passa?".
 */
export function segmentHitsCollider(a, b, collider, margin = 0) {
  const p = toLocal(a, collider)
  const q = toLocal(b, collider)
  const half = [collider.size[0] / 2 + margin, collider.size[2] / 2 + margin]
  let t0 = 0
  let t1 = 1
  for (let axis = 0; axis < 2; axis++) {
    const d = q[axis] - p[axis]
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(p[axis]) > half[axis]) return false
      continue
    }
    let tn = (-half[axis] - p[axis]) / d
    let tf = (half[axis] - p[axis]) / d
    if (tn > tf) [tn, tf] = [tf, tn]
    t0 = Math.max(t0, tn)
    t1 = Math.min(t1, tf)
    if (t0 > t1) return false
  }
  return true
}

/**
 * Distanza lungo un raggio 3D fino al box (o null). Serve al tap: se il dito
 * colpisce una colonna o un muro prima del pavimento, il punto non è valido.
 */
export function rayHitsCollider(origin, dir, collider) {
  const [ox, oz] = toLocal([origin[0], origin[2]], collider)
  const t = collider.rotationY || 0
  const c = Math.cos(t)
  const s = Math.sin(t)
  const dx = dir[0] * c - dir[2] * s
  const dz = dir[0] * s + dir[2] * c
  const o = [ox, origin[1] - collider.center[1], oz]
  const d = [dx, dir[1], dz]
  const half = [collider.size[0] / 2, collider.size[1] / 2, collider.size[2] / 2]
  let t0 = 0
  let t1 = Infinity
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(d[axis]) < 1e-9) {
      if (Math.abs(o[axis]) > half[axis]) return null
      continue
    }
    let tn = (-half[axis] - o[axis]) / d[axis]
    let tf = (half[axis] - o[axis]) / d[axis]
    if (tn > tf) [tn, tf] = [tf, tn]
    t0 = Math.max(t0, tn)
    t1 = Math.min(t1, tf)
    if (t0 > t1) return null
  }
  return t0
}

/** In quale zona cade un punto del pavimento? */
export function zoneAt([x, z], zones) {
  return zones.find(({ bounds: [[x0, z0], [x1, z1]] }) =>
    x >= Math.min(x0, x1) && x <= Math.max(x0, x1) &&
    z >= Math.min(z0, z1) && z <= Math.max(z0, z1)) ?? null
}

export function inAnyArea([x, z], areas) {
  return areas.some(({ bounds: [[x0, z0], [x1, z1]] }) =>
    x >= Math.min(x0, x1) && x <= Math.max(x0, x1) &&
    z >= Math.min(z0, z1) && z <= Math.max(z0, z1))
}

/** Riporta un punto dentro l'area calpestabile più vicina. */
export function clampToAreas([x, z], areas) {
  let best = null
  let bestD = Infinity
  for (const { bounds: [[x0, z0], [x1, z1]] } of areas) {
    const cx = Math.min(Math.max(x, Math.min(x0, x1)), Math.max(x0, x1))
    const cz = Math.min(Math.max(z, Math.min(z0, z1)), Math.max(z0, z1))
    const d = (cx - x) ** 2 + (cz - z) ** 2
    if (d < bestD) { bestD = d; best = [cx, cz] }
  }
  return best ?? [x, z]
}
