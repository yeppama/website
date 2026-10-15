/**
 * Rumore procedurale per il velo di grana (D6-B).
 *
 * Vive in un modulo separato da materials.js di proposito: quello importa
 * three, e GrainOverlay fa parte del bundle iniziale. Tenerli insieme
 * trascinerebbe l'intero motore 3D nel primo caricamento.
 */
const cache = new Map()

export function makeGrainDataUrl(size = 256) {
  if (cache.has(size)) return cache.get(size)

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = (Math.random() * 255) | 0
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)

  const url = canvas.toDataURL('image/png')
  cache.set(size, url)
  return url
}
