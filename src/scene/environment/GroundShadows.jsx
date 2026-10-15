import { useMemo } from 'react'
import { getBlobTexture } from '../../lib/canvasText.js'

/**
 * D3-A — ombre "blob" a terra. Compaiono SOLO sul tier senza ombre reali: sopra
 * quel tier sarebbero una seconda ombra sotto la prima.
 */
export default function GroundShadows({ objects, groundShadow, enabled }) {
  const texture = useMemo(() => (enabled ? getBlobTexture() : null), [enabled])
  if (!enabled) return null

  return (
    <group>
      {objects.filter((o) => o.groundShadow).map((o) => {
        const r = Math.max(o.size[0], o.size[2]) * groundShadow.radiusScale
        return (
          <mesh key={o.id} position={[o.position[0], 0.003, o.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[r * 2, r * 2]} />
            <meshBasicMaterial color="#000000" map={texture} transparent opacity={groundShadow.opacity}
              depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        )
      })}
    </group>
  )
}
