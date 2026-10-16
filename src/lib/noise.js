/**
 * Rumore procedurale per il velo di grana (D6-B).
 *
 * Vive in un modulo separato da materials.js di proposito: quello importa
 * three, e GrainOverlay fa parte del bundle iniziale. Tenerli insieme
 * trascinerebbe l'intero motore 3D nel primo caricamento.
 */
const cache = new Map()

/**
 * mode 'overlay' — rumore grigio pieno, da fondere con mix-blend-mode: overlay.
 * mode 'alpha'   — solo granelli scuri su trasparente, fusione normale. Imita
 *   l'overlay dove conta: scurisce mezzitoni e luci, lascia il nero com'è (il
 *   bianco aggiunto lo alzerebbe a grigio). Costa molto meno al compositore:
 *   su Iris Xe l'overlay toglieva ~22 fps (docs/PERF.md).
 */
export function makeGrainDataUrl(size = 256, mode = 'overlay') {
  const key = `${size}:${mode}`
  if (cache.has(key)) return cache.get(key)

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random()
    if (mode === 'alpha') {
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 0
      image.data[i + 3] = Math.max(0, 1 - 2 * v) * 255
    } else {
      image.data[i] = image.data[i + 1] = image.data[i + 2] = (v * 255) | 0
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}
