import { toLocal, toWorld, clampToAreas } from './geometry.js'

/**
 * Collisioni del player: un cerchio di raggio r contro i box di `colliders`.
 * TASSATIVO dal brief: nessun calcolo sulle mesh visibili, solo questi box.
 *
 * Il movimento è diviso in sotto-passi più corti del raggio (niente "tunnelling"
 * attraverso una colonna sottile a velocità alta o con un frame lento); dopo ogni
 * sotto-passo il cerchio viene spinto fuori da ogni box che compenetra, lungo la
 * normale del punto più vicino. Spingere solo lungo la normale lascia intatta la
 * componente tangente del moto: è questo che fa "scivolare" lungo i muri invece
 * di fermarsi di colpo.
 */

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

/** Spinge il punto fuori da tutti i collider. Restituisce true se ha corretto qualcosa. */
export function resolvePenetration(pos, radius, colliders) {
  let corrected = false
  for (let iter = 0; iter < 4; iter++) {
    let moved = false
    for (const c of colliders) {
      const [lx, lz] = toLocal([pos.x, pos.z], c)
      const hx = c.size[0] / 2
      const hz = c.size[2] / 2
      const qx = clamp(lx, -hx, hx)
      const qz = clamp(lz, -hz, hz)
      const nx = lx - qx
      const nz = lz - qz
      const d2 = nx * nx + nz * nz
      if (d2 >= radius * radius) continue

      let px
      let pz
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2)
        px = qx + (nx / d) * radius
        pz = qz + (nz / d) * radius
      } else {
        // Centro dentro il box: si esce dal lato più vicino.
        const ox = hx - Math.abs(lx)
        const oz = hz - Math.abs(lz)
        if (ox < oz) { px = Math.sign(lx || 1) * (hx + radius); pz = lz }
        else { px = lx; pz = Math.sign(lz || 1) * (hz + radius) }
      }
      const [wx, wz] = toWorld([px, pz], c)
      pos.x = wx
      pos.z = wz
      moved = true
      corrected = true
    }
    if (!moved) break
  }
  return corrected
}

/**
 * Sposta `pos` di (dx, dz) rispettando collider e aree calpestabili.
 * `pos` viene modificato; restituisce lo spostamento effettivamente avvenuto.
 */
export function moveWithCollisions(pos, dx, dz, { radius, colliders, walkableAreas, maxStep }) {
  const startX = pos.x
  const startZ = pos.z
  const dist = Math.hypot(dx, dz)
  const steps = Math.max(1, Math.ceil(dist / maxStep))
  for (let i = 0; i < steps; i++) {
    pos.x += dx / steps
    pos.z += dz / steps
    resolvePenetration(pos, radius, colliders)
    const [cx, cz] = clampToAreas([pos.x, pos.z], walkableAreas)
    pos.x = cx
    pos.z = cz
  }
  return { x: pos.x - startX, z: pos.z - startZ }
}
