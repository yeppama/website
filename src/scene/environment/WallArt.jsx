import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useMat } from '../displays/parts.jsx'
import { useSharedTextures } from '../../lib/sharedTextures.js'

/**
 * Grafica alle pareti (fase C, 2026-10-19), da `environment.wallArt`: manifesti e murali
 * (`kind: 'image'`, piani appena staccati dal muro, trasparenza della foto rispettata) e stampe
 * della campagna in cornice (`kind: 'print'`, foto del Lookbook del contenuto: se il contenuto
 * non ce l'ha, il config non la elenca). Texture condivise in lib/sharedTextures.js; la scena
 * aspetta le immagini (Suspense): caricate a scena avviata, arrivavano a metà percorso sui telefoni
 * in rete mobile e il loro caricamento sulla GPU dava scatti (Honor, 2026-10-19: 1% low 43,5 → 25,2).
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
  const maps = useSharedTextures(items.map((x) => x.url))
  const own = useMemo(() => items.map((item, i) => {
    const map = maps[i]
    return item.kind === 'print'
      ? new THREE.MeshBasicMaterial({ map, color: printTint, toneMapped: false })
      : new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.05, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1 })
    // `maps` è un array nuovo a ogni render, ma le texture sono le stesse per ogni indirizzo (cache).
  }), [items, printTint]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => own.forEach((m) => m.dispose()), [own])
  return (
    <group>
      {items.map((item, i) => <Art key={item.id} item={item} material={own[i]} frame={frame} />)}
    </group>
  )
}
