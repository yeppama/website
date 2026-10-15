import { useMemo, useRef, useEffect } from 'react'

/**
 * Luci di scena. Il budget delle ombre viene dal tier (D3-A): i faretti sono
 * ordinati per `priority` e solo i primi `maxShadowCasters` proiettano ombra.
 * Sul tier low nessuno la proietta: lì l'ombra sarà un'ellisse a terra.
 */
function Spot({ spot, castShadow, shadowMapSize }) {
  const light = useRef()
  const target = useRef()

  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current
      light.current.target.updateMatrixWorld()
    }
  }, [])

  return (
    <group>
      <object3D ref={target} position={spot.targetPosition} />
      <spotLight
        ref={light}
        position={spot.position}
        angle={spot.angle}
        penumbra={spot.penumbra}
        intensity={spot.intensity}
        distance={spot.distance}
        decay={spot.decay}
        color={spot.color}
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.0012}
        shadow-normalBias={0.03}
      />
    </group>
  )
}

export default function LightingRig({ lighting, tier, fog }) {
  const spots = useMemo(
    () => [...lighting.spots].sort((a, b) => a.priority - b.priority),
    [lighting.spots],
  )

  // Quali faretti possono proiettare ombra, entro il budget del tier.
  const shadowCasters = useMemo(() => {
    const allowed = new Set()
    let budget = tier.maxShadowCasters
    for (const spot of spots) {
      if (budget > 0 && spot.castShadow) { allowed.add(spot.id); budget -= 1 }
    }
    return allowed
  }, [spots, tier.maxShadowCasters])

  return (
    <group>
      {fog.enabled && <fog attach="fog" args={[fog.color, fog.near, fog.far]} />}
      <ambientLight intensity={lighting.ambient.intensity} color={lighting.ambient.color} />
      <hemisphereLight
        intensity={lighting.hemisphere.intensity}
        color={lighting.hemisphere.skyColor}
        groundColor={lighting.hemisphere.groundColor}
      />
      {spots.map((spot) => (
        <Spot
          key={spot.id}
          spot={spot}
          castShadow={shadowCasters.has(spot.id)}
          shadowMapSize={tier.shadowMapSize}
        />
      ))}
    </group>
  )
}
