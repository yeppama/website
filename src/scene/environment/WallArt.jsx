import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useMat } from '../displays/parts.jsx'
import { getWallTexture } from '../../lib/wallTextures.js'

/**
 * Grafica alle pareti (fase C, 2026-10-19), da `environment.wallArt`: manifesti e murali
 * (`kind: 'image'`, piani appena staccati dal muro, trasparenza della foto rispettata) e stampe
 * della campagna in cornice (`kind: 'print'`, foto del Lookbook del contenuto: se il contenuto
 * non ce l'ha, il config non la elenca). Texture condivise in lib/wallTextures.js.
 *
 * I materiali nascono qui e passano alla mesh come proprietà: un materiale scritto in JSX, allo
 * smontaggio, viene liberato da React Three Fiber insieme alla sua `map`, cioè la texture
 * condivisa, ancora in uso nel Canvas rimontato.
 * Voce: { id, kind, url, center: [x, y, z], size: [w, h], rotationY }
 */
function Art({ item, material, frame }) {
  const [w, h] = item.size
  const print = item.kind === 'print'
  return (
    <group position={item.center} rotation={[0, item.rotationY ?? 0, 0]}>
      {print && (
        <mesh position={[0, 0, 0.012]} material={frame} castShadow>
          <boxGeometry args={[w + 0.12, h + 0.12, 0.04]} />
        </mesh>
      )}
      {/* La stampa è retroilluminata, fuori dal tone mapping come i pannelli del cantiere: si legge
          anche sulla parete d'ingresso, dove nessun faretto arriva (e nessuno se ne aggiunge). */}
      <mesh position={[0, 0, print ? 0.034 : 0]} material={material} receiveShadow={!print}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}

export default function WallArt({ items, frameMaterialId, printTint, materials }) {
  const frame = useMat(frameMaterialId, materials)
  const own = useMemo(() => items.map((item) => {
    const map = getWallTexture(item.url)
    return item.kind === 'print'
      ? new THREE.MeshBasicMaterial({ map, color: printTint, toneMapped: false })
      : new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.05, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 })
  }), [items, printTint])
  useLayoutEffect(() => () => own.forEach((m) => m.dispose()), [own])
  return (
    <group>
      {items.map((item, i) => <Art key={item.id} item={item} material={own[i]} frame={frame} />)}
    </group>
  )
}
