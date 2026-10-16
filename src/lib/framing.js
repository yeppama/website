/**
 * Inquadratura della camera, condivisa da player e Focus Mode. Solo numeri, senza
 * three: si prova in Node con `npm run test:framing`.
 *
 * Il fov di three è VERTICALE: su uno schermo stretto lo si allarga quanto basta a
 * garantire un campo orizzontale minimo, senza superare un massimo.
 */
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** Fov verticale per un rapporto larghezza/altezza, con campo orizzontale minimo. */
export function fovForAspect({ vertical, minHorizontal, maxVertical }, aspect) {
  const fromHorizontal = deg(2 * Math.atan(Math.tan(rad(minHorizontal) / 2) / aspect))
  return Math.min(maxVertical, Math.max(vertical, fromHorizontal))
}

/**
 * La parte di schermo che il pannello del Focus lascia libera: il rettangolo più
 * grande fra quelli a sinistra, a destra, sopra e sotto il pannello. In verticale è
 * quella sopra, in orizzontale (e su desktop) quella a sinistra.
 * `panel` = { left, top, right, bottom } in pixel CSS, o null se non c'è.
 */
export function freeRegion(width, height, panel) {
  const full = { x: 0, y: 0, w: width, h: height }
  if (!panel) return full
  const candidates = [
    { x: 0, y: 0, w: panel.left, h: height },
    { x: panel.right, y: 0, w: width - panel.right, h: height },
    { x: 0, y: 0, w: width, h: panel.top },
    { x: 0, y: panel.bottom, w: width, h: height - panel.bottom },
  ].filter((r) => r.w > 0 && r.h > 0)
  if (!candidates.length) return full
  return candidates.reduce((best, r) => (r.w * r.h > best.w * best.h ? r : best))
}

/**
 * Inquadratura del capo nella parte libera dello schermo.
 * Il fov della posa vale per la regione libera (con lo stesso campo orizzontale
 * minimo); lo si converte nel fov dell'intero schermo e si sposta il centro di
 * proiezione al centro della regione (`camera.setViewOffset`). La camera non si
 * muove: cambia solo dove cade l'immagine.
 * → { fov, offsetX, offsetY } con offset in pixel CSS (positivo = immagine verso sinistra/l'alto).
 */
export function focusFraming({ width, height, region, fov, minHorizontal, maxVertical }) {
  const inRegion = fovForAspect({ vertical: fov, minHorizontal, maxVertical: 179 }, region.w / region.h)
  const full = deg(2 * Math.atan(Math.tan(rad(inRegion) / 2) * (height / region.h)))
  return {
    fov: Math.min(maxVertical, full),
    offsetX: width / 2 - (region.x + region.w / 2),
    offsetY: height / 2 - (region.y + region.h / 2),
  }
}
