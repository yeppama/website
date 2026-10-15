import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import Floor from './environment/Floor.jsx'
import Walls from './environment/Walls.jsx'
import Architecture from './environment/Architecture.jsx'
import BrandWall from './environment/BrandWall.jsx'
import FloorLabels from './environment/FloorLabels.jsx'
import GroundShadows from './environment/GroundShadows.jsx'
import LightingRig from './lighting/LightingRig.jsx'
import LightFixtures from './lighting/LightFixtures.jsx'
import ColliderDebug from './debug/ColliderDebug.jsx'
import PlayerController from './player/PlayerController.jsx'
import Hotspots from './player/Hotspots.jsx'
import MoveFeedback from './player/MoveFeedback.jsx'
import { useAppStore } from '../state/useAppStore.js'

const debugParams = () => new URLSearchParams(window.location.search)

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Camera della Fase 2: inquadrature statiche da storeConfig.camera.shots.
 * Al cambio di inquadratura la camera viaggia dalla posa corrente alla nuova
 * (posizione, punto guardato, fov) con un'interpolazione morbida; a riposo
 * aggiunge un'oscillazione minima. Con "riduci animazioni" il cambio è un taglio
 * netto e l'oscillazione è spenta. La navigazione libera arriva in Fase 3.
 */
function CameraRig({ camera, reducedMotion }) {
  const { camera: cam } = useThree()
  const activeShotId = useAppStore((s) => s.activeShotId)
  const key = debugParams().get('debug')
  const debugPose = camera.debugPoses?.[key] ?? camera.shots.find((x) => x.id === key)
  const shot = debugPose
    ?? camera.shots.find((x) => x.id === activeShotId)
    ?? camera.shots.find((x) => x.id === camera.defaultShotId)

  const current = useRef({
    position: new THREE.Vector3(...shot.position),
    target: new THREE.Vector3(...shot.target),
    fov: shot.fov,
  })
  const transition = useRef(null)

  useEffect(() => {
    cam.near = camera.near
    cam.far = camera.far
  }, [cam, camera.near, camera.far])

  useEffect(() => {
    const goal = { position: new THREE.Vector3(...shot.position), target: new THREE.Vector3(...shot.target), fov: shot.fov }
    if (reducedMotion) {
      current.current = goal
      transition.current = null
      return
    }
    transition.current = {
      from: { position: current.current.position.clone(), target: current.current.target.clone(), fov: current.current.fov },
      goal,
      start: performance.now(),
    }
  }, [shot, reducedMotion])

  const sway = camera.idleSway
  useFrame(({ clock }) => {
    const tr = transition.current
    if (tr) {
      const t = Math.min(1, (performance.now() - tr.start) / camera.transitionMs)
      const e = easeInOutCubic(t)
      current.current.position.lerpVectors(tr.from.position, tr.goal.position, e)
      current.current.target.lerpVectors(tr.from.target, tr.goal.target, e)
      current.current.fov = tr.from.fov + (tr.goal.fov - tr.from.fov) * e
      if (t >= 1) transition.current = null
    }

    cam.position.copy(current.current.position)
    if (!tr && sway.enabled && !reducedMotion && !debugPose) {
      const k = (clock.elapsedTime / sway.periodSeconds) * Math.PI * 2
      cam.position.x += Math.sin(k) * sway.amplitude
      cam.position.y += Math.sin(k * 0.6) * sway.amplitude * 0.5
    }
    cam.lookAt(current.current.target)
    if (cam.fov !== current.current.fov) {
      cam.fov = current.current.fov
      cam.updateProjectionMatrix()
    }
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
  const showColliders = debugParams().get('debug') && debugParams().get('colliders') === '1'

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
      <Architecture environment={environment} materials={lighting.materials} />
      <BrandWall
        brandWall={environment.brandWall}
        brand={config.meta.brand}
        lookbook={config.lookbook}
        assets={config.assets}
        materials={lighting.materials}
      />
      <FloorLabels zones={environment.zones} />
      <GroundShadows
        objects={environment.architecture.columns}
        groundShadow={config.performance.groundShadow}
        enabled={tier.maxShadowCasters === 0}
      />
      <LightingRig lighting={lighting} tier={tier} fog={environment.fog} />
      <LightFixtures
        spots={lighting.spots}
        architecture={environment.architecture}
        ceiling={environment.ceiling}
        materials={lighting.materials}
      />
      {showColliders && <ColliderDebug colliders={config.colliders} navigation={config.navigation} />}
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

  const debugKey = params.get('debug')
  const staticView = Boolean(config.camera.debugPoses?.[debugKey] ?? config.camera.shots.find((x) => x.id === debugKey))

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
      {/* Fase 3: la camera è gli occhi del player. Le pose fisse restano solo per
          la verifica (?debug=top | front | <id inquadratura>). */}
      {staticView
        ? <CameraRig camera={config.camera} reducedMotion={device.reducedMotion} />
        : <PlayerController config={config} device={device} />}
      <Hotspots pois={config.pois} style={config.navigation.hotspot} />
      <MoveFeedback feedback={config.navigation.feedback} />
      <FrameLimiter targetFps={targetFps} />
      <FirstFrameSignal onStage={onStage} />
      <Suspense fallback={null}>
        <SceneContents config={config} tier={tier} />
      </Suspense>
    </Canvas>
  )
}
