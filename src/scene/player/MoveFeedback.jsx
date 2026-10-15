import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { brandMotif, tokens } from '../../config/designTokens.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'

/**
 * Conferma visiva dei tap: un'ellisse del marchio sul punto toccato (arancio se
 * raggiungibile, grigia se no) e la linea del percorso validato che il player
 * sta seguendo. Rendere visibile il percorso è anche una prova: si vede che
 * aggira colonne e mobili invece di attraversarli.
 */
function Ping({ ping, durationMs }) {
  const mesh = useRef()
  const born = useRef(performance.now())
  useFrame(() => {
    if (!mesh.current) return
    const t = Math.min(1, (performance.now() - born.current) / durationMs)
    const s = 0.6 + t * 0.6
    mesh.current.scale.set(s * brandMotif.oval.ratio * 0.5, s * 0.5, 1)
    mesh.current.material.opacity = 1 - t
    mesh.current.visible = t < 1
  })
  return (
    <mesh ref={mesh} position={[ping.x, 0.02, ping.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color={ping.ok ? tokens.color.accent.flame : tokens.color.text.muted}
        transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function RouteLine({ route, color }) {
  const line = useMemo(() => {
    const pts = route.points.map(([x, z]) => new THREE.Vector3(x, 0.025, z))
    const geometry = new THREE.BufferGeometry().setFromPoints(pts)
    const material = new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.8, toneMapped: false })
    const l = new THREE.Line(geometry, material)
    l.computeLineDistances()
    return l
  }, [route, color])
  return <primitive object={line} />
}

export default function MoveFeedback({ feedback }) {
  const ping = usePlayerStore((s) => s.ping)
  const route = usePlayerStore((s) => s.route)
  return (
    <group>
      {ping && <Ping key={ping.id} ping={ping} durationMs={feedback.pingMs} />}
      {route && <RouteLine key={route.id} route={route} color={feedback.pathColor} />}
    </group>
  )
}
