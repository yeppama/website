import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getMaterial } from '../../lib/materials.js'

/**
 * Corpi illuminanti visibili, generati dagli stessi faretti di lighting.spots:
 * un faretto in config produce sia la luce sia l'oggetto che la emette.
 *
 * Disegnati a ISTANZE: corpi, lenti e steli sono tre draw call in tutto,
 * qualunque sia il numero di faretti (prima erano tre per faretto). Ogni lente
 * prende il colore della propria luce, fuori dal tone mapping: è la sorgente.
 */
export default function LightFixtures({ spots, architecture, ceiling, materials }) {
  const { fixture, trackSection } = architecture
  const material = useMemo(() => getMaterial(fixture.materialId, materials[fixture.materialId]), [fixture.materialId, materials])
  const ceilingY = ceiling.height - trackSection - 0.08

  const bodies = useRef()
  const lenses = useRef()
  const stems = useRef()

  const geo = useMemo(() => ({
    // Il corpo è un cilindro allineato a +z: guarda verso il bersaglio dopo lookAt.
    body: new THREE.CylinderGeometry(fixture.radius, fixture.radius * 0.85, fixture.length, 16).rotateX(Math.PI / 2),
    lens: new THREE.CircleGeometry(fixture.radius * 0.78, 20).translate(0, 0, fixture.length / 2 + 0.002),
    stem: new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, 0.5, 0),
  }), [fixture])
  const lensMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const color = new THREE.Color()
    spots.forEach((spot, i) => {
      o.position.set(...spot.position)
      o.rotation.set(0, 0, 0)
      o.scale.set(1, 1, 1)
      o.lookAt(...spot.targetPosition)
      o.updateMatrix()
      bodies.current.setMatrixAt(i, o.matrix)
      lenses.current.setMatrixAt(i, o.matrix)
      lenses.current.setColorAt(i, color.set(spot.color))

      o.rotation.set(0, 0, 0)
      o.scale.set(1, Math.max(0.001, ceilingY - spot.position[1]), 1)
      o.updateMatrix()
      stems.current.setMatrixAt(i, o.matrix)
    })
    for (const m of [bodies.current, lenses.current, stems.current]) {
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
    lenses.current.instanceColor.needsUpdate = true
  }, [spots, ceilingY])

  return (
    <group>
      <instancedMesh ref={bodies} args={[geo.body, material, spots.length]} />
      <instancedMesh ref={lenses} args={[geo.lens, lensMaterial, spots.length]} />
      <instancedMesh ref={stems} args={[geo.stem, material, spots.length]} />
    </group>
  )
}
