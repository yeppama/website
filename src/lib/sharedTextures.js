import { use } from 'react'
import * as THREE from 'three'
import { registerGpuCache } from './gpuCaches.js'

/**
 * Texture da file condivise fra i componenti (grafica alle pareti del negozio, immagini del
 * cantiere): una per indirizzo, liberate solo quando l'ultimo Canvas si smonta (lib/gpuCaches.js,
 * docs/DECISIONI.md "Memoria GPU"). Sostituisce `useTexture` di drei: con quella cache un
 * rimontaggio della scena lasciava risorse diverse dalla prima (docs/LEZIONI.md, 2026-10-19).
 *
 * - `getSharedTexture(url)`: subito, l'immagine arriva dopo (la mappa resta la stessa, lo shader
 *   non si ricompila).
 * - `useSharedTextures(urls)`: sospende la scena (Suspense) finché le immagini non ci sono, come
 *   faceva useTexture: il segnale "pronto" e il riscaldamento della GPU partono dopo.
 * - `loadSharedTexture(url)`: la promessa, per chi deve sapere se l'immagine è arrivata (e con
 *   quali dimensioni) senza sospendere la scena né farla fallire — l'insegna del brand, che senza
 *   il file torna al wordmark tipografico.
 * Chi usa queste texture in un materiale scritto in JSX mette `dispose={null}` sulla mesh: React
 * Three Fiber, smontandola, libererebbe anche la `map`, che appartiene alla cache.
 */
const entries = new Map()
registerGpuCache(() => {
  for (const e of entries.values()) e.texture.dispose()
  entries.clear()
})

function entry(url) {
  if (!entries.has(url)) {
    let resolve, reject
    const ready = new Promise((res, rej) => { resolve = res; reject = rej })
    const texture = new THREE.TextureLoader().load(url, () => resolve(texture), undefined, () => {
      console.warn(`immagine non caricata ${url}`)
      reject(new Error(`immagine non caricata ${url}`))
    })
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    ready.catch(() => {})
    entries.set(url, { texture, ready })
  }
  return entries.get(url)
}

export const getSharedTexture = (url) => entry(url).texture

export const loadSharedTexture = (url) => entry(url).ready

export function useSharedTextures(urls) {
  return urls.map((url) => use(entry(url).ready))
}
