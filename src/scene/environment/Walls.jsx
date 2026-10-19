import { useMemo } from 'react'
import { getMaterial } from '../../lib/materials.js'
import MergeByMaterial from '../MergeByMaterial.jsx'

/**
 * Muri generati dai segmenti in storeConfig.
 * Il vano d'ingresso è l'assenza di un segmento, non un foro booleano: più
 * economico da renderizzare e più semplice da riconfigurare.
 */
function Wall({ wall, materials }) {
  const { position, rotationY, length } = useMemo(() => {
    const [x0, z0] = wall.from
    const [x1, z1] = wall.to
    return {
      position: [(x0 + x1) / 2, wall.height / 2, (z0 + z1) / 2],
      rotationY: Math.atan2(z1 - z0, x1 - x0),
      length: Math.hypot(x1 - x0, z1 - z0),
    }
  }, [wall])

  const material = useMemo(
    () => getMaterial(wall.materialId, materials[wall.materialId]),
    [wall.materialId, materials],
  )

  return (
    <mesh position={position} rotation={[0, -rotationY, 0]} receiveShadow castShadow material={material}>
      <boxGeometry args={[length, wall.height, wall.thickness]} />
    </mesh>
  )
}

export default function Walls({ walls, ceiling, floor, materials }) {
  const ceilingMaterial = useMemo(
    () => getMaterial(ceiling.materialId, materials[ceiling.materialId]),
    [ceiling.materialId, materials],
  )

  return (
    <MergeByMaterial>
      {walls.map((wall) => <Wall key={wall.id} wall={wall} materials={materials} />)}
      {ceiling.visible && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[floor.center?.[0] ?? 0, ceiling.height, floor.center?.[1] ?? 0]} material={ceilingMaterial}>
          <planeGeometry args={floor.size} />
        </mesh>
      )}
    </MergeByMaterial>
  )
}
