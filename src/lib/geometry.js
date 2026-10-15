/**
 * Geometria 2D sul piano del pavimento (x, z), contro box orientati (OBB).
 *
 * Logica pura, senza three né React: la usano il validatore del config oggi e
 * il risolutore delle collisioni in Fase 3. I collider ruotano solo attorno a Y,
 * quindi basta portare i punti nello spazio locale del box e trattarlo come AABB.
 */

function toLocal([x, z], collider) {
  const [cx, , cz] = collider.center
  const a = -(collider.rotationY || 0)
  const dx = x - cx
  const dz = z - cz
  return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]
}

/** Il punto cade dentro il box, allargato di `margin`? */
export function pointInCollider(point, collider, margin = 0) {
  const [lx, lz] = toLocal(point, collider)
  return Math.abs(lx) <= collider.size[0] / 2 + margin && Math.abs(lz) <= collider.size[2] / 2 + margin
}

/**
 * Il segmento a→b attraversa il box allargato di `margin`?
 * Metodo delle "slab": si restringe l'intervallo [t0, t1] del parametro del
 * segmento asse per asse; se resta non vuoto, c'è intersezione.
 * Con margin = raggio del player, risponde a "un corpo largo così passa?".
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

/** In quale zona cade un punto del pavimento? */
export function zoneAt([x, z], zones) {
  return zones.find(({ bounds: [[x0, z0], [x1, z1]] }) =>
    x >= Math.min(x0, x1) && x <= Math.max(x0, x1) &&
    z >= Math.min(z0, z1) && z <= Math.max(z0, z1)) ?? null
}
