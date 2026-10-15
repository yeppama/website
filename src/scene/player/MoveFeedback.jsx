import { useEffect, useMemo, useRef } from 'react'
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
  // Un solo anello, riusato: a ogni tap riparte l'animazione. Montarne uno nuovo
  // per tap (chiave = id del ping) lasciava in scena gli anelli vecchi (Fase 6).
  const mesh = useRef()
  const born = useRef(-Infinity)
  useEffect(() => { born.current = performance.now() }, [ping?.id])
  useFrame(() => {
    if (!mesh.current) return
    const t = Math.min(1, (performance.now() - born.current) / durationMs)
    const s = 0.6 + t * 0.6
    mesh.current.scale.set(s * brandMotif.oval.ratio * 0.5, s * 0.5, 1)
    mesh.current.material.opacity = 1 - t
    mesh.current.visible = Boolean(ping) && t < 1
  })
  return (
    <mesh ref={mesh} position={[ping?.x ?? 0, 0.02, ping?.z ?? 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color={ping?.ok === false ? tokens.color.text.muted : tokens.color.accent.flame}
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
  // `primitive` non viene liberato da React Three Fiber: senza questo, ogni tap
  // lasciava sulla GPU una geometria e un materiale (Fase 6, misurato).
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose() }, [line])
  return <primitive object={line} />
}

export default function MoveFeedback({ feedback }) {
  const ping = usePlayerStore((s) => s.ping)
  const route = usePlayerStore((s) => s.route)
  return (
    <group>
      <Ping ping={ping} durationMs={feedback.pingMs} />
      {route && <RouteLine key={route.id} route={route} color={feedback.pathColor} />}
    </group>
  )
}
