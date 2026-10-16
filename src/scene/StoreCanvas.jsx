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
import FocusCameraRig from './player/FocusCameraRig.jsx'
import Displays from './displays/Displays.jsx'
import PerfProbe from './debug/PerfProbe.jsx'
import { useAppStore } from '../state/useAppStore.js'
import { retainGpuCaches, releaseGpuCaches } from '../lib/gpuCaches.js'
import { whenFontsReady } from '../lib/canvasText.js'

const debugParams = () => new URLSearchParams(window.location.search)

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Camera della Fase 2: inquadrature statiche da storeConfig.camera.shots.
 * Al cambio di inquadratura la camera viaggia dalla posa corrente alla nuova
 * (posizione, punto guardato, fov) con un'interpolazione morbida; a riposo
 * aggiunge un'oscillazione minima. Con "riduci animazioni" il cambio è un taglio
 * netto e l'oscillazione è spenta. La navigazione libera arriva in Fase 3.
 */
function CameraRig({ camera, reducedMotion, debugPoseFor }) {
  const { camera: cam } = useThree()
  const activeShotId = useAppStore((s) => s.activeShotId)
  const key = debugParams().get('debug')
  const debugPose = debugPoseFor(key)
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

/**
 * Ciclo di vita della GPU legato al Canvas, non ai singoli componenti: le cache
 * condivise si liberano solo quando il Canvas sparisce davvero (vedi gpuCaches).
 * Il contesto WebGL lo distrugge React Three Fiber allo smontaggio.
 */
function GpuLifecycle() {
  useEffect(() => {
    retainGpuCaches()
    return releaseGpuCaches
  }, [])
  return null
}

/**
 * Riscaldamento della GPU durante il caricamento (Fase 6). Senza, il motore
 * compila gli shader e carica geometrie e texture solo quando un oggetto entra
 * per la prima volta nell'inquadratura: misurato su iPhone e Pixel come scatti
 * isolati alla prima visita di una zona (docs/PERF.md). Qui si fa tutto subito,
 * dietro l'onboarding: un solo fotogramma pesante che nessuno vede.
 * Con ?perf=1 o ?bench=1, `&warm=0` lo spegne per confrontare.
 */
function GpuWarmup({ enabled }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (!enabled) return
    let alive = true
    // Le texture tipografiche nascono dopo i font, e i loro mesh un commit dopo.
    whenFontsReady().then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!alive) return
      const culled = []
      const shown = []
      scene.traverse((o) => {
        if (o.isMesh && o.frustumCulled) { o.frustumCulled = false; culled.push(o) }
        // Solo gli oggetti marcati (anello del tap, linea del percorso, hotspot):
        // gli altri nascosti, come le sorgenti di MergeByMaterial, restano tali.
        if (o.userData.warmup && !o.visible) { o.visible = true; shown.push(o) }
        const materials = o.material ? [].concat(o.material) : []
        for (const m of materials) for (const v of Object.values(m)) if (v?.isTexture) gl.initTexture(v)
      })
      gl.compile(scene, camera)
      gl.render(scene, camera)
      for (const o of culled) o.frustumCulled = true
      for (const o of shown) o.visible = false
      if (debugParams().get('debug')) window.__warmedUp = true
    })))
    return () => { alive = false }
  }, [enabled, gl, scene, camera])
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
  // ?fog=1 / ?fog=0: anteprima della nebbia senza cambiare il config.
  const fogParam = debugParams().get('fog')
  const fog = { ...environment.fog, enabled: fogParam === '1' ? true : fogParam === '0' ? false : environment.fog.enabled }

  // Niente disposal qui: in StrictMode questo componente si smonta e rimonta, e
  // liberare le cache a quel punto lasciava materiali vivi senza texture (Fase 2).
  // Il rilascio è legato al Canvas: vedi GpuLifecycle e lib/gpuCaches.js.

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
      <Displays config={config} />
      <GroundShadows
        objects={[
          ...environment.architecture.columns,
          // Sotto gli espositori, l'impronta è quella del loro collider.
          ...config.displays.filter((d) => d.groundShadow).map((d) => {
            const c = config.colliders.find((x) => x.id === d.colliderId)
            return { id: d.id, position: d.position, size: c.size, groundShadow: true }
          }),
        ]}
        groundShadow={config.performance.groundShadow}
        enabled={tier.maxShadowCasters === 0}
      />
      <LightingRig lighting={lighting} tier={tier} fog={fog} displays={config.displays} focusConfig={config.focus} />
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

export default function StoreCanvas({ config, device, onStage, onContextLost, onContextRestored }) {
  const tier = config.performance.tiers[device.tier]
  const params = debugParams()
  // In modalità debug il target fps è sovrascrivibile, per verificare che il limite funzioni.
  const targetFps = params.get('debug') && Number(params.get('fps')) > 0
    ? Number(params.get('fps'))
    : config.performance.targetFps

  const debugKey = params.get('debug')
  // Pose fisse di verifica: pianta, inquadrature della Fase 2, pose di Focus degli espositori.
  const debugPoseFor = (key) => config.camera.debugPoses?.[key]
    ?? config.camera.shots.find((x) => x.id === key)
    ?? config.displays.find((d) => d.id === key)?.focusCamera
  const staticView = Boolean(debugPoseFor(debugKey))

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
        gl.toneMappingExposure = config.performance.toneMappingExposure
        gl.outputColorSpace = THREE.SRGBColorSpace
        scene.background = new THREE.Color(config.environment.fog.color)
        // Aggancio di ispezione, attivo solo con ?debug=: serve a verificare la
        // scena dall'esterno senza inquinare il percorso normale.
        if (params.get('debug')) {
          window.__scene = scene
          window.__gl = gl
        }
        // Perdita del contesto (GPU resettata, app in background su mobile, troppi
        // contesti aperti): preventDefault permette al browser di restituirlo.
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(canvas) })
        canvas.addEventListener('webglcontextrestored', () => onContextRestored?.(canvas))
        onStage?.('context')
      }}
    >
      {/* Fase 3: la camera è gli occhi del player. Le pose fisse restano solo per
          la verifica (?debug=top | front | <id inquadratura>). */}
      {staticView
        ? <CameraRig camera={config.camera} reducedMotion={device.reducedMotion} debugPoseFor={debugPoseFor} />
        : (
          <>
            <PlayerController config={config} device={device} />
            <FocusCameraRig config={config} reducedMotion={device.reducedMotion} />
          </>
        )}
      <Hotspots pois={config.pois} style={config.navigation.hotspot} />
      <MoveFeedback feedback={config.navigation.feedback} />
      <FrameLimiter targetFps={targetFps} />
      <FirstFrameSignal onStage={onStage} />
      <GpuLifecycle />
      <GpuWarmup enabled={!((params.get('perf') || params.get('bench') || params.get('debug')) && params.get('warm') === '0')} />
      <PerfProbe monitor={config.performance.monitor} />
      <Suspense fallback={null}>
        <SceneContents config={config} tier={tier} />
      </Suspense>
    </Canvas>
  )
}
