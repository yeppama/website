import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import Floor from './environment/Floor.jsx'
import Walls from './environment/Walls.jsx'
import LightingRig from './lighting/LightingRig.jsx'

const debugParams = () => new URLSearchParams(window.location.search)

/**
 * Camera della Fase 1b: posa fissa da storeConfig, con un'oscillazione minima
 * che toglie la sensazione di fotografia morta. La navigazione arriva in Fase 3.
 * L'oscillazione si spegne da sola se l'utente ha chiesto meno animazioni.
 */
function StaticCamera({ camera, reducedMotion }) {
  const { camera: cam } = useThree()
  const debugKey = debugParams().get('debug')
  const pose = camera.debugPoses?.[debugKey] ?? camera.staticPose
  const base = useRef(new THREE.Vector3(...pose.position))
  const target = useRef(new THREE.Vector3(...pose.target))

  useEffect(() => {
    cam.position.copy(base.current)
    cam.lookAt(target.current)
    cam.fov = pose.fov
    cam.near = camera.near
    cam.far = camera.far
    cam.updateProjectionMatrix()
  }, [cam, camera, pose])

  const sway = camera.idleSway
  useFrame(({ clock }) => {
    if (!sway.enabled || reducedMotion || pose !== camera.staticPose) return
    const t = (clock.elapsedTime / sway.periodSeconds) * Math.PI * 2
    cam.position.set(
      base.current.x + Math.sin(t) * sway.amplitude,
      base.current.y + Math.sin(t * 0.6) * sway.amplitude * 0.5,
      base.current.z,
    )
    cam.lookAt(target.current)
  })

  return null
}

/**
 * Limite reale del frame rate.
 *
 * Il Canvas gira in `frameloop="demand"`: non rende nulla finché qualcuno non
 * chiama `invalidate()`. Questo ciclo lo chiama al massimo `targetFps` volte al
 * secondo, quindi su uno schermo a 120 Hz si rende a 60, non a 120.
 * La soglia al 90% dell'intervallo assorbe il jitter di requestAnimationFrame:
 * con una soglia esatta, su uno schermo a 60 Hz si salterebbe un frame su due.
 */
function FrameLimiter({ targetFps }) {
  const { invalidate } = useThree()
  useEffect(() => {
    const interval = (1000 / targetFps) * 0.9
    let last = 0
    let raf = requestAnimationFrame(function loop(now) {
      if (now - last >= interval) {
        last = now
        invalidate()
      }
      raf = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(raf)
  }, [targetFps, invalidate])
  return null
}

/** Segnala "pronto" solo dopo che la scena ha davvero prodotto dei fotogrammi. */
function FirstFrameSignal({ onStage }) {
  const frames = useRef(0)
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    frames.current += 1
    if (frames.current >= 2) {
      done.current = true
      onStage?.('frame')
    }
  })
  return null
}

function SceneContents({ config, tier }) {
  const { environment, lighting } = config

  // NOTA: qui c'era un `useEffect(() => disposeMaterialCache, [])`. In StrictMode
  // React monta, smonta e rimonta: al primo smontaggio le texture venivano
  // distrutte sulla GPU mentre i `useMemo` dei componenti continuavano a puntare
  // ai materiali vecchi, che restavano senza mappa. Il pavimento perdeva la griglia.
  // Il disposal va legato alla distruzione del contesto WebGL, non a un unmount
  // di React: viene affrontato in Fase 6 con un percorso di teardown verificato.

  return (
    <>
      <Floor floor={environment.floor} materials={lighting.materials} />
      <Walls
        walls={environment.walls}
        ceiling={environment.ceiling}
        floor={environment.floor}
        materials={lighting.materials}
      />
      <LightingRig lighting={lighting} tier={tier} fog={environment.fog} />
    </>
  )
}

export default function StoreCanvas({ config, device, onStage }) {
  const tier = config.performance.tiers[device.tier]
  const params = debugParams()
  // In modalità debug il target fps è sovrascrivibile, per verificare che il limite funzioni.
  const targetFps = params.get('debug') && Number(params.get('fps')) > 0
    ? Number(params.get('fps'))
    : config.performance.targetFps

  // Il modulo del motore 3D è arrivato e il componente è montato.
  useEffect(() => { onStage?.('module') }, [onStage])

  return (
    <Canvas
      frameloop="demand"
      dpr={tier.dprRange}
      shadows={tier.maxShadowCasters > 0}
      gl={{ antialias: tier.antialias, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = THREE.SRGBColorSpace
        scene.background = new THREE.Color(config.environment.fog.color)
        // Aggancio di ispezione, attivo solo con ?debug=: serve a verificare la
        // scena dall'esterno senza inquinare il percorso normale.
        if (params.get('debug')) {
          window.__scene = scene
          window.__gl = gl
        }
        onStage?.('context')
      }}
    >
      <StaticCamera camera={config.camera} reducedMotion={device.reducedMotion} />
      <FrameLimiter targetFps={targetFps} />
      <FirstFrameSignal onStage={onStage} />
      <Suspense fallback={null}>
        <SceneContents config={config} tier={tier} />
      </Suspense>
    </Canvas>
  )
}
