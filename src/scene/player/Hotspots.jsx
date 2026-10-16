import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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
  const wasHidden = useRef(true)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const hidden = state === 'hidden'

  useFrame(({ camera, clock }) => {
    if (!group.current) return
    if (hidden) { wasHidden.current = true; return }
    // Riapparendo riparte da com'era quando veniva rimontato: semitrasparente, scala 1.
    if (wasHidden.current) {
      wasHidden.current = false
      group.current.scale.setScalar(1)
      if (material.current) material.current.opacity = 0.55
    }
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

  const [x, y, z] = poi.anchor

  // Sempre montato, nascosto quando fuori raggio: smontarlo e rimontarlo ricreava
  // geometrie e materiali a ogni avvicinamento e dopo ogni Focus (docs/PERF.md).
  return (
    <group position={[x, y, z]} visible={!hidden} userData={{ warmup: true }}>
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
  const { gl } = useThree()

  useEffect(() => {
    let alive = true
    let made = null
    whenFontsReady().then(() => {
      if (!alive) return
      made = Object.fromEntries(pois.map((p) => [p.id, makeHotspot({
        label: p.label, color: style.color, textColor: tokens.color.text.primary,
      })]))
      // Gli hotspot nascosti non sono in scena: le loro texture si caricano subito,
      // non al primo avvicinamento (scatto misurato su telefono, docs/PERF.md).
      for (const t of Object.values(made)) gl.initTexture(t)
      setTextures(made)
    })
    return () => {
      alive = false
      if (made) for (const t of Object.values(made)) t.dispose()
    }
  }, [pois, style.color, gl])

  if (!textures) return null
  // In Focus gli hotspot si nascondono, non si smontano.
  return (
    <group visible={!inFocus}>
      {pois.map((poi) => (
        <Hotspot key={poi.id} poi={poi} texture={textures[poi.id]} state={states[poi.id] ?? 'hidden'} style={style} />
      ))}
    </group>
  )
}
