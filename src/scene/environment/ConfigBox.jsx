import { useMemo } from 'react'
import { getMaterial } from '../../lib/materials.js'

/** Box generico descritto da config: centro, dimensioni, materiale per ID. */
export default function ConfigBox({ center, size, materialId, materials, rotationY = 0, castShadow = false, receiveShadow = true }) {
  const material = useMemo(() => getMaterial(materialId, materials[materialId]), [materialId, materials])
  return (
    <mesh position={center} rotation={[0, rotationY, 0]} castShadow={castShadow} receiveShadow={receiveShadow} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}
