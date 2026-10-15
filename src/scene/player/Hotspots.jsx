import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { tokens } from '../../config/designTokens.js'
import { whenFontsReady, makeHotspot } from '../../lib/canvasText.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import { useAppStore } from '../../state/useAppStore.js'

/**
 * Indicatori fluttuanti dei POI. Leggono solo `pois` di storeConfig e lo stato
 * di prossimità calcolato dal controller: non dipendono dai modelli 3D.
 *   hidden  → non disegnato
 *   visible → semitrasparente
 *   active  → pieno e leggermente ingrandito
 * Sempre rivolti alla camera; un filo sottile li ancora al pavimento.
 */
function Hotspot({ poi, texture, state, style }) {
  const group = useRef()
  const material = useRef()
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(({ camera, clock }) => {
    if (!group.current) return
    group.current.quaternion.copy(camera.quaternion)
    const t = (clock.elapsedTime / style.bobPeriodSeconds) * Math.PI * 2 + phase
    group.current.position.y = Math.sin(t) * style.bob
    const target = state === 'active' ? 1.12 : 1
    const sc = group.current.scale.x + (target - group.current.scale.x) * 0.15
    group.current.scale.setScalar(sc)
    if (material.current) {
      const o = state === 'active' ? 1 : 0.55
      material.current.opacity += (o - material.current.opacity) * 0.15
    }
  })

  if (state === 'hidden') return null
  const [x, y, z] = poi.anchor

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, -y / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, y, 4]} />
        <meshBasicMaterial color={style.pinColor} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <group ref={group}>
        <mesh>
          <planeGeometry args={[style.width, style.width / 2]} />
          <meshBasicMaterial ref={material} map={texture} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export default function Hotspots({ pois, style }) {
  const states = usePlayerStore((s) => s.poiStates)
  const inFocus = useAppStore((s) => s.focus.state !== 'idle')
  const [textures, setTextures] = useState(null)

  useEffect(() => {
    let alive = true
    whenFontsReady().then(() => {
      if (!alive) return
      setTextures(Object.fromEntries(pois.map((p) => [p.id, makeHotspot({
        label: p.label, color: style.color, textColor: tokens.color.text.primary,
      })])))
    })
    return () => { alive = false }
  }, [pois, style.color])

  if (!textures || inFocus) return null
  return pois.map((poi) => (
    <Hotspot key={poi.id} poi={poi} texture={textures[poi.id]} state={states[poi.id] ?? 'hidden'} style={style} />
  ))
}
