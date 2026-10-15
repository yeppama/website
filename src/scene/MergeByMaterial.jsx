import { useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Unisce le mesh STATICHE dei figli in una mesh per materiale.
 *
 * Perché: un manichino è fatto di ~11 pezzi, cioè 11 draw call, ma usa solo 4
 * materiali. Il costo di una scena così sta nel numero di draw call, non nei
 * vertici (qualche migliaio). Unendo per materiale, il manichino ne costa 4.
 *
 * I componenti restano scritti in modo dichiarativo e leggibile: l'unione
 * avviene dopo il montaggio. Gli originali restano nel grafo ma invisibili.
 * Da NON usare per ciò che si muove o cambia (es. il marcatore del Focus):
 * quello va tenuto fuori da questo contenitore.
 */
export default function MergeByMaterial({ children, enabled = true, deps = [] }) {
  const source = useRef()
  const [merged, setMerged] = useState([])

  useLayoutEffect(() => {
    if (!enabled) return
    const root = source.current
    root.updateMatrixWorld(true)
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const byMaterial = new Map()

    root.traverse((o) => {
      if (!o.isMesh) return
      // Solo posizione, normali e uv, sempre non indicizzate: è il formato
      // comune a tutte le primitive, requisito di mergeGeometries.
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
      for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
      }
      if (!g.attributes.uv) {
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
      }
      g.clearGroups()
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld))
      const entry = byMaterial.get(o.material) ?? { geometries: [], cast: false, receive: false }
      entry.geometries.push(g)
      entry.cast ||= o.castShadow
      entry.receive ||= o.receiveShadow
      byMaterial.set(o.material, entry)
    })

    const meshes = []
    for (const [material, { geometries, cast, receive }] of byMaterial) {
      const geometry = mergeGeometries(geometries, false)
      geometries.forEach((g) => g.dispose())
      if (!geometry) continue
      geometry.computeBoundingSphere()
      meshes.push({ geometry, material, cast, receive })
    }
    root.visible = false
    setMerged(meshes)
    return () => {
      meshes.forEach((m) => m.geometry.dispose())
      root.visible = true
    }
  }, [enabled, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <group ref={source}>{children}</group>
      {merged.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} castShadow={m.cast} receiveShadow={m.receive} />
      ))}
    </>
  )
}
