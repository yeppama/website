import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useMat, HangingGarment } from './parts.jsx'

/**
 * Catena dal soffitto (allestimento del cantiere): anelli in istanza, una draw call, e il capo
 * appeso in fondo. La catena scende da `chainTop` per `chainLength`.
 */
const LINK = 0.07

export default function DisplayChain({ display, products, garments, materials }) {
  const steel = useMat(display.materialIds.frame, materials)
  const ref = useRef()
  const { chainTop, chainLength } = display
  const count = Math.round(chainLength / LINK)
  const geometry = useMemo(() => new THREE.TorusGeometry(0.04, 0.009, 6, 12), [])
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      o.position.set(0, chainTop - i * LINK, 0)
      o.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [count, chainTop])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  const bottom = chainTop - chainLength
  return (
    <group>
      <instancedMesh ref={ref} args={[geometry, steel, count]} castShadow />
      {products.map((p) => (
        <HangingGarment key={p.id} product={p} garments={garments} materials={materials} position={[0, bottom + 0.02, 0]} rotation={[0, 0, 0]} />
      ))}
    </group>
  )
}
