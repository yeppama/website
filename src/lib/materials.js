import * as THREE from 'three'

/**
 * Materiali PBR e texture generate proceduralmente.
 *
 * Niente file di texture: la griglia del pavimento è disegnata su <canvas> una
 * volta sola e condivisa. Una texture per mesh costerebbe memoria video per nulla.
 */

const textureCache = new Map()
const materialCache = new Map()

/** Griglia tecnica: linee sottili su fondo scuro, nello spirito del micro-testo del brand. */
export function getGridTexture({ cell = 1, lineWidth = 0.014, tint = '#1d1d20', base = '#15161a' } = {}) {
  const key = `grid:${cell}:${lineWidth}:${tint}:${base}`
  if (textureCache.has(key)) return textureCache.get(key)

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  const px = Math.max(1, Math.round(lineWidth * size))
  ctx.strokeStyle = tint
  ctx.lineWidth = px
  ctx.beginPath()
  ctx.moveTo(0, px / 2); ctx.lineTo(size, px / 2)
  ctx.moveTo(px / 2, 0); ctx.lineTo(px / 2, size)
  ctx.stroke()

  // Crocino di registro al centro: densità tecnica, coerente con l'identità.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 1
  const c = size / 2
  const r = size * 0.035
  ctx.beginPath()
  ctx.moveTo(c - r, c); ctx.lineTo(c + r, c)
  ctx.moveTo(c, c - r); ctx.lineTo(c, c + r)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  textureCache.set(key, texture)
  return texture
}

/**
 * Materiale da una voce di lighting.materials. Condiviso per ID: mesh diverse
 * con lo stesso materialId riusano la stessa istanza, quindi lo stesso shader.
 */
export function getMaterial(materialId, spec, { repeat, grid } = {}) {
  const key = `${materialId}:${repeat?.join('x') ?? ''}`
  if (materialCache.has(key)) return materialCache.get(key)

  const params = {
    color: new THREE.Color(spec.color),
    roughness: spec.roughness ?? 0.8,
    metalness: spec.metalness ?? 0,
  }
  if (spec.emissive) {
    params.emissive = new THREE.Color(spec.emissive)
    params.emissiveIntensity = spec.emissiveIntensity ?? 0.3
  }
  if (spec.grid) {
    // I parametri della griglia arrivano da storeConfig, non da default interni.
    const texture = getGridTexture({ ...grid, base: spec.color })
    if (repeat) texture.repeat.set(repeat[0], repeat[1])
    params.map = texture
    // three moltiplica `color` per `map`. Poiché la texture contiene già il
    // colore di base, lasciare entrambi significa elevarlo al quadrato: il
    // pavimento diventa quasi nero e la griglia sparisce. Con la mappa,
    // il colore deve essere bianco e la tinta la decide la texture.
    params.color = new THREE.Color(0xffffff)
  }

  const material = new THREE.MeshStandardMaterial(params)
  materialCache.set(key, material)
  return material
}

/** Libera tutto ciò che vive sulla GPU. Chiamato allo smontaggio della scena. */
export function disposeMaterialCache() {
  for (const material of materialCache.values()) material.dispose()
  for (const texture of textureCache.values()) texture.dispose()
  materialCache.clear()
  textureCache.clear()
}
