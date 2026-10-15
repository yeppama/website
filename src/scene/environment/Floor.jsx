import { useMemo } from 'react'
import { getMaterial } from '../../lib/materials.js'

/** Pavimento. Dimensioni, materiale e passo della griglia arrivano da storeConfig. */
export default function Floor({ floor, materials }) {
  const [width, depth] = floor.size
  const spec = materials[floor.materialId]
  const material = useMemo(
    () => getMaterial(floor.materialId, spec, {
      repeat: [width / floor.gridTexture.cell, depth / floor.gridTexture.cell],
      grid: floor.gridTexture,
    }),
    [floor.materialId, spec, width, depth, floor.gridTexture],
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={material}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  )
}
