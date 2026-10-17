import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { brandMotif, tokens } from '../../config/designTokens.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import { floorHeightAt } from '../../lib/geometry.js'

/**
 * Conferma visiva dei tap: un'ellisse del marchio sul punto toccato (arancio se
 * raggiungibile, grigia se no) e la linea del percorso validato che il player
 * sta seguendo. Rendere visibile il percorso è anche una prova: si vede che
 * aggira colonne e mobili invece di attraversarli.
 */
function Ping({ ping, durationMs, platforms }) {
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
    // userData.warmup: GpuWarmup lo disegna una volta durante il caricamento, così il
    // primo tap non paga il primo uso del suo shader (docs/PERF.md, indagine primo uso).
    <mesh ref={mesh} position={[ping?.x ?? 0, (ping ? floorHeightAt([ping.x, ping.z], platforms) : 0) + 0.02, ping?.z ?? 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}
          userData={{ warmup: true }}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color={ping?.ok === false ? tokens.color.text.muted : tokens.color.accent.flame}
        transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

const toPoints = (points, platforms = []) => points.map(([x, z]) => new THREE.Vector3(x, floorHeightAt([x, z], platforms) + 0.025, z))

/**
 * Una sola linea per tutta la visita: a ogni percorso cambia solo la geometria.
 * Creare e distruggere linea e materiale a ogni percorso faceva ricompilare lo
 * shader a ogni cammino (misurato: 2 compilazioni + 1 link per cammino).
 * Senza percorso la linea è nascosta, non smontata.
 */
function RouteLine({ route, color, platforms }) {
  const line = useMemo(() => {
    const material = new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.8, toneMapped: false })
    // Due punti coincidenti: una geometria valida da disegnare durante il riscaldamento.
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(toPoints([[0, 0], [0, 0]])), material)
    l.computeLineDistances()
    l.visible = false
    l.frustumCulled = false
    l.userData.warmup = true
    return l
  }, [color])

  useEffect(() => {
    if (!route) { line.visible = false; return }
    const previous = line.geometry
    line.geometry = new THREE.BufferGeometry().setFromPoints(toPoints(route.points, platforms))
    line.computeLineDistances()
    previous.dispose()
    line.visible = true
  }, [route, line, platforms])

  // `primitive` non viene liberato da React Three Fiber: geometria e materiale
  // si liberano qui, allo smontaggio della scena.
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose() }, [line])
  return <primitive object={line} />
}

export default function MoveFeedback({ feedback, platforms }) {
  const ping = usePlayerStore((s) => s.ping)
  const route = usePlayerStore((s) => s.route)
  return (
    <group>
      <Ping ping={ping} durationMs={feedback.pingMs} platforms={platforms} />
      <RouteLine route={route} color={feedback.pathColor} platforms={platforms} />
    </group>
  )
}
