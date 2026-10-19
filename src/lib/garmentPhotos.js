import * as THREE from 'three'
import { registerGpuCache } from './gpuCaches.js'
import { markShadowsDirty } from './staticShadows.js'

/**
 * Capi 3D col livello "leggero" (docs/PIANO-DEMO.md): la foto scontornata del fronte
 * applicata sulla sagoma. Una texture per foto, condivisa da tutte le mesh che la usano.
 *
 * Il materiale nasce subito con una mappa trasparente di 1×1 e prende la foto quando
 * arriva: cambiare una mappa con un'altra non ricompila lo shader (la presenza della
 * mappa è la stessa), quindi il riscaldamento della GPU vale anche dopo il caricamento
 * e nessuno scatto arriva a scena avviata. Le mesh unite da MergeByMaterial usano la
 * stessa istanza di materiale, quindi vedono la foto anche loro.
 *
 * `photo` = { texture: url, bbox: [x0, y0, x1, y1] } con il riquadro del capo nella
 * foto, normalizzato e con y dall'alto (lo calcola `npm run media:build`).
 */

const textures = new Map()
const materials = new Map()
const geometries = new Map()
registerGpuCache(() => {
  for (const t of textures.values()) t.dispose()
  for (const m of materials.values()) m.dispose()
  for (const g of geometries.values()) g.dispose()
  textures.clear(); materials.clear(); geometries.clear()
  empty?.dispose(); empty = null
})

let empty = null
function emptyTexture() {
  if (empty) return empty
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  empty = new THREE.CanvasTexture(canvas)
  empty.colorSpace = THREE.SRGBColorSpace
  return empty
}

function loadInto(url, material) {
  if (!textures.has(url)) {
    const texture = new THREE.TextureLoader().load(url, () => {
      for (const m of materials.values()) if (m.userData.photoUrl === url) m.map = texture
      // La sagoma scontornata del capo cambia l'ombra che proietta: le ombre statiche si rifanno.
      markShadowsDirty()
    }, undefined, () => console.warn(`capo 3D: foto non caricata ${url}`))
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    textures.set(url, texture)
  }
  // Già arrivata (un altro materiale l'ha chiesta prima): subito sulla mesh.
  const texture = textures.get(url)
  if (texture.image) material.map = texture
}

/**
 * Materiale con la foto. `cutout`: la sagoma la decide la trasparenza della foto
 * (capi appesi); senza, la foto copre una forma già fatta (busto, pile piegate).
 */
export function getPhotoMaterial(url, { cutout, roughness = 0.93 }, alphaTest) {
  const key = `${url}:${cutout ? 'cut' : 'solid'}`
  if (materials.has(key)) return materials.get(key)
  const material = new THREE.MeshStandardMaterial({
    map: emptyTexture(), roughness, metalness: 0,
    // Senza scontorno il fondo trasparente della foto non deve mai vedersi: la mesh
    // usa solo la parte interna del capo (uv ritagliate sul riquadro).
    ...(cutout ? { alphaTest, side: THREE.DoubleSide } : {}),
  })
  material.userData.photoUrl = url
  materials.set(key, material)
  loadInto(url, material)
  return material
}

/**
 * Piano con la foto intera, scalato in modo che il capo (il suo riquadro nella foto)
 * misuri `size` metri sul lato indicato e abbia il centro nell'origine.
 */
export function getPhotoCardGeometry(photo, aspect, { width, height }) {
  const key = `card:${photo.texture}:${width}:${height}`
  if (geometries.has(key)) return geometries.get(key)
  const [x0, y0, x1, y1] = photo.bbox
  // Altezza della foto in metri, dal lato che comanda (larghezza per i capi sopra,
  // altezza per i pantaloni).
  const photoH = height ? height / (y1 - y0) : (width / (x1 - x0)) / aspect
  const photoW = photoH * aspect
  const g = new THREE.PlaneGeometry(photoW, photoH)
  g.translate((0.5 - (x0 + x1) / 2) * photoW, ((y0 + y1) / 2 - 0.5) * photoH, 0)
  geometries.set(key, g)
  return g
}

/** Rettangolo della foto (u0, v0, u1, v1 con v dal basso) dentro il riquadro del capo. */
export function cropInBox(photo, [cx0, cy0, cx1, cy1]) {
  const [x0, y0, x1, y1] = photo.bbox
  const u = (t) => x0 + (x1 - x0) * t
  const v = (t) => 1 - (y0 + (y1 - y0) * t)
  return [u(cx0), v(cy1), u(cx1), v(cy0)]
}

/** Piano w × d (orizzontale, rivolto in alto) che mostra un ritaglio della foto. */
export function getPhotoPatchGeometry(photo, crop, w, d) {
  const key = `patch:${photo.texture}:${crop.join(',')}:${w}:${d}`
  if (geometries.has(key)) return geometries.get(key)
  const g = new THREE.PlaneGeometry(w, d)
  g.rotateX(-Math.PI / 2)
  const [u0, v0, u1, v1] = cropInBox(photo, crop)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0))
  geometries.set(key, g)
  return g
}

/**
 * Metà davanti (`side` = 'front', z ≥ 0) o dietro ('back') di una geometria: triangoli scelti
 * dal baricentro, geometria non indicizzata. Il capo del manichino si divide così perché il
 * davanti porta la foto e il retro la stoffa: due mesh con un materiale ciascuna, che
 * MergeByMaterial sa unire (un materiale doppio no).
 */
export function getHalfGeometry(source, side) {
  const key = `half:${source.uuid}:${side}`
  if (geometries.has(key)) return geometries.get(key)
  const all = source.index ? source.toNonIndexed() : source.clone()
  const pos = all.attributes.position
  const keep = []
  for (let t = 0; t < pos.count; t += 3) {
    const z = pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)
    if ((z >= 0) === (side === 'front')) keep.push(t, t + 1, t + 2)
  }
  const g = new THREE.BufferGeometry()
  for (const [name, attr] of Object.entries(all.attributes)) {
    const out = new Float32Array(keep.length * attr.itemSize)
    keep.forEach((v, i) => { for (let k = 0; k < attr.itemSize; k++) out[i * attr.itemSize + k] = attr.array[v * attr.itemSize + k] })
    g.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize))
  }
  all.dispose()
  geometries.set(key, g)
  return g
}

/**
 * Proiezione frontale su una geometria già fatta (il davanti del capo indossato del
 * manichino): x e y del vertice diventano coordinate nella foto, dentro il ritaglio `crop`
 * del riquadro del capo. Solo il davanti: fino al 2026-10-19 il retro riceveva la stessa foto
 * specchiata, e passando dietro al manichino si vedeva il fronte (segnalato dall'utente).
 */
export function projectPhotoFront(source, photo, crop) {
  const key = `front:${source.uuid}:${photo.texture}:${crop.join(',')}`
  if (geometries.has(key)) return geometries.get(key)
  const g = source.clone()
  g.computeBoundingBox()
  const { min, max } = g.boundingBox
  const [u0, v0, u1, v1] = cropInBox(photo, crop)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const s = (pos.getX(i) - min.x) / (max.x - min.x)
    const t = (pos.getY(i) - min.y) / (max.y - min.y)
    uv.setXY(i, u0 + s * (u1 - u0), v0 + t * (v1 - v0))
  }
  geometries.set(key, g)
  return g
}
