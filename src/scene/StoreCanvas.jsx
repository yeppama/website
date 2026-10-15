import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import Floor from './environment/Floor.jsx'
import Walls from './environment/Walls.jsx'
import LightingRig from './lighting/LightingRig.jsx'

/**
 * Camera della Fase 1b: posa fissa da storeConfig, con un'oscillazione minima
 * che toglie la sensazione di fotografia morta. La navigazione arriva in Fase 3.
 * L'oscillazione si spegne da sola se l'utente ha chiesto meno animazioni.
 */
function StaticCamera({ camera, reducedMotion }) {
  const { camera: cam } = useThree()
  const debugKey = new URLSearchParams(window.location.search).get('debug')
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

/** Limita il frame rate al target dichiarato in config: niente frame sprecati. */
function FrameLimiter({ targetFps }) {
  const last = useRef(0)
  const { invalidate } = useThree()
  useFrame(({ clock }) => {
    const min = 1 / targetFps
    const now = clock.elapsedTime
    if (now - last.current < min) return
    last.current = now
    invalidate()
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

export default function StoreCanvas({ config, device, onReady }) {
  const tier = config.performance.tiers[device.tier]

  return (
    <Canvas
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
        if (new URLSearchParams(window.location.search).get('debug')) {
          window.__scene = scene
          window.__gl = gl
        }
        onReady?.()
      }}
    >
      <StaticCamera camera={config.camera} reducedMotion={device.reducedMotion} />
      <FrameLimiter targetFps={config.performance.targetFps} />
      <Suspense fallback={null}>
        <SceneContents config={config} tier={tier} />
      </Suspense>
    </Canvas>
  )
}
