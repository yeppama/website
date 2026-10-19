/**
 * Focus su un capo preciso (`focusCamera.perItem`, rack del cantiere): dove sta il capo `index`
 * e da dove lo guarda la camera. I capi stanno lungo l'asse x locale dell'espositore
 * (`length`), rivolti verso +z locale. Lo usano la camera del Focus e l'invariante I19.
 */
export function focusItemPose(display, index) {
  const it = display.focusCamera.perItem
  const count = display.productIds.length
  const lx = -display.length / 2 + (display.length * (index + 0.5)) / count
  const c = Math.cos(display.rotationY ?? 0)
  const s = Math.sin(display.rotationY ?? 0)
  // Locale → mondo con la rotazione di three: x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ.
  const world = (x, z) => [display.position[0] + x * c + z * s, display.position[2] - x * s + z * c]
  const [tx, tz] = world(lx, 0)
  const [px, pz] = world(lx + it.sideOffset, it.distance)
  return { eye: [px, it.eyeHeight, pz], target: [tx, it.targetHeight, tz] }
}
