import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../state/useAppStore.js'

/**
 * Luci di scena. Il budget delle ombre viene dal tier (D3-A): i faretti sono
 * ordinati per `priority` e solo i primi `maxShadowCasters` proiettano ombra.
 * Sul tier low nessuno la proietta: lì l'ombra sarà un'ellisse a terra.
 */
function Spot({ spot, castShadow, shadowMapSize, registry }) {
  const light = useRef()
  const target = useRef()

  useEffect(() => {
    registry.current.set(spot.id, { light: light.current, base: spot.intensity, color: new THREE.Color(spot.color) })
    return () => registry.current.delete(spot.id)
  }, [spot, registry])

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

/**
 * In Focus Mode la luce passa dal mondo editoriale al mondo "studio": il faretto
 * dell'espositore sale e si raffredda verso il bianco studio, tutto il resto si
 * abbassa. Le intensità si avvicinano al bersaglio in modo esponenziale, così
 * entrata e uscita sono dissolvenze e non interruttori.
 */
export default function LightingRig({ lighting, tier, fog, displays, focusConfig }) {
  const registry = useRef(new Map())
  const ambient = useRef()
  const hemi = useRef()
  const studio = useMemo(() => new THREE.Color(focusConfig.lighting.studioColor), [focusConfig])
  const spotOfDisplay = useMemo(() => new Map(displays.map((d) => [d.id, d.spotlightId])), [displays])

  useFrame((_, delta) => {
    const f = useAppStore.getState().focus
    const on = f.state === 'entering' || f.state === 'focused'
    const focusSpot = on ? spotOfDisplay.get(f.displayId) : null
    const L = focusConfig.lighting
    const k = 1 - Math.exp(-delta / (L.blendMs / 1000 / 3))
    for (const [id, s] of registry.current) {
      if (!s.light) continue
      const isFocus = id === focusSpot
      const wantI = s.base * (isFocus ? L.spotBoost : on ? L.othersDim : 1)
      s.light.intensity += (wantI - s.light.intensity) * k
      s.light.color.lerp(isFocus ? studio : s.color, k)
    }
    const dim = on ? L.ambientDim : 1
    if (ambient.current) ambient.current.intensity += (lighting.ambient.intensity * dim - ambient.current.intensity) * k
    if (hemi.current) hemi.current.intensity += (lighting.hemisphere.intensity * dim - hemi.current.intensity) * k
  })

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
      <ambientLight ref={ambient} intensity={lighting.ambient.intensity} color={lighting.ambient.color} />
      <hemisphereLight
        ref={hemi}
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
          registry={registry}
        />
      ))}
    </group>
  )
}
