import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Rende visibili ciò che di solito non si vede: i collider (scatole in
 * wireframe) e il grafo di navigazione (nodi e collegamenti).
 * Attivo solo con `?debug=<posa>&colliders=1`. Non fa parte dell'esperienza.
 */
export default function ColliderDebug({ colliders, navigation }) {
  const graph = useMemo(() => {
    const byId = new Map(navigation.waypoints.map((w) => [w.id, w]))
    const points = []
    for (const [a, b] of navigation.links) {
      const pa = byId.get(a).position
      const pb = byId.get(b).position
      points.push(pa[0], 0.05, pa[2], pb[0], 0.05, pb[2])
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#4fd1ff', toneMapped: false }))
  }, [navigation])

  return (
    <group>
      {colliders.map((c) => (
        <mesh key={c.id} position={c.center} rotation={[0, c.rotationY || 0, 0]}>
          <boxGeometry args={c.size} />
          <meshBasicMaterial color="#f98e30" wireframe toneMapped={false} />
        </mesh>
      ))}
      <primitive object={graph} />
      {navigation.waypoints.map((w) => (
        <mesh key={w.id} position={[w.position[0], 0.05, w.position[2]]}>
          <sphereGeometry args={[w.safeForTeleport ? 0.28 : 0.16, 12, 8]} />
          <meshBasicMaterial color={w.safeForTeleport ? '#4fd1ff' : '#9b9b96'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
