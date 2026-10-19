import * as THREE from 'three'
import { registerGpuCache } from './gpuCaches.js'

/**
 * Texture della grafica alle pareti (fase C, 2026-10-19): una per immagine, condivise e liberate
 * solo quando l'ultimo Canvas si smonta (lib/gpuCaches.js, docs/DECISIONI.md "Memoria GPU").
 * Con la cache di drei (`useTexture`) un rimontaggio della scena lasciava texture in più
 * (`e2e-phase6.mjs`, 2026-10-19). Il caricamento non sospende la scena: l'immagine arriva dietro
 * l'onboarding e la mappa resta la stessa, quindi lo shader non si ricompila.
 */
const textures = new Map()
registerGpuCache(() => {
  for (const t of textures.values()) t.dispose()
  textures.clear()
})

export function getWallTexture(url) {
  if (!textures.has(url)) {
    const t = new THREE.TextureLoader().load(url, undefined, undefined, () => console.warn(`grafica: immagine non caricata ${url}`))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    textures.set(url, t)
  }
  return textures.get(url)
}
