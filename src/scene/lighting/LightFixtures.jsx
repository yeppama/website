import { useLayoutEffect, useMemo, useRef } from 'react'
import { getMaterial } from '../../lib/materials.js'

/**
 * Corpi illuminanti visibili, generati dagli stessi faretti di lighting.spots:
 * un faretto in config produce sia la luce sia l'oggetto che la emette.
 * La lente usa il colore della luce, fuori dal tone mapping: è la sorgente.
 */
function Fixture({ spot, fixture, ceilingY, material }) {
  const group = useRef()
  useLayoutEffect(() => {
    group.current.lookAt(...spot.targetPosition)
  }, [spot.targetPosition])

  const stem = Math.max(0, ceilingY - spot.position[1])

  return (
    <group position={spot.position}>
      {stem > 0.01 && (
        <mesh position={[0, stem / 2, 0]} material={material}>
          <cylinderGeometry args={[0.012, 0.012, stem, 6]} />
        </mesh>
      )}
      <group ref={group}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={material}>
          <cylinderGeometry args={[fixture.radius, fixture.radius * 0.85, fixture.length, 16]} />
        </mesh>
        <mesh position={[0, 0, fixture.length / 2 + 0.002]}>
          <circleGeometry args={[fixture.radius * 0.78, 20]} />
          <meshBasicMaterial color={spot.color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export default function LightFixtures({ spots, architecture, ceiling, materials }) {
  const { fixture, trackSection } = architecture
  const material = useMemo(() => getMaterial(fixture.materialId, materials[fixture.materialId]), [fixture.materialId, materials])
  const ceilingY = ceiling.height - trackSection - 0.08

  return (
    <group>
      {spots.map((spot) => (
        <Fixture key={spot.id} spot={spot} fixture={fixture} ceilingY={ceilingY} material={material} />
      ))}
    </group>
  )
}
