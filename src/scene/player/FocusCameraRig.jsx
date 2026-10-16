import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../state/useAppStore.js'
import { fovForAspect, freeRegion, focusFraming } from '../../lib/framing.js'

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a, b, t) => a + (b - a) * t

/**
 * Camera del Focus Mode. Quando lo stato passa a `entering` prende la camera
 * dalla posa corrente e la porta sulla posa di Focus dell'espositore; a
 * `exiting` la riporta esattamente dove il player l'aveva lasciata.
 * Interpola posizione, orientamento (slerp, niente scatti di rotazione) e fov.
 * Nello stato `focused` aggiunge una deriva minima, così l'immagine respira.
 *
 * Il capo si inquadra nella parte di schermo che il pannello del Focus lascia
 * libera (lib/framing.js): sopra il pannello in verticale, alla sua sinistra in
 * orizzontale e su desktop. Fov e centro di proiezione si ricalcolano a ogni
 * fotogramma, quindi seguono il pannello che compare, cambia altezza o il telefono
 * che ruota. All'uscita si torna al fov del player per lo schermo di quel momento.
 */
export default function FocusCameraRig({ config, reducedMotion }) {
  const { camera, size } = useThree()
  const sizeRef = useRef(size)
  sizeRef.current = size
  const tr = useRef(null)
  const focusPose = useRef(null)
  const view = useRef({ fov: camera.fov, x: 0, y: 0 })
  // Una camera d'appoggio: il suo lookAt orienta già −z verso il bersaglio.
  const helper = useMemo(() => new THREE.PerspectiveCamera(), [])
  const displays = useMemo(() => new Map(config.displays.map((d) => [d.id, d])), [config])

  const framingFor = (fc) => {
    const { width, height } = sizeRef.current
    const region = freeRegion(width, height, useAppStore.getState().focusPanelRect)
    return focusFraming({ width, height, region, fov: fc.fov,
      minHorizontal: config.focus.minHorizontalFov, maxVertical: config.focus.maxVerticalFov })
  }
  const playerFov = () => fovForAspect(config.navigation.player.fov, sizeRef.current.width / sizeRef.current.height)

  // Fov e spostamento del centro di proiezione (pixel CSS). A spostamento nullo la
  // camera torna senza view offset: il player non ne eredita nulla.
  const applyView = (fov, x, y) => {
    view.current = { fov, x, y }
    camera.fov = fov
    const { width, height } = sizeRef.current
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) camera.clearViewOffset()
    else camera.setViewOffset(width, height, x, y, width, height)
    camera.updateProjectionMatrix()
  }

  const snapshot = () => ({ pos: camera.position.clone(), quat: camera.quaternion.clone(), ...view.current, fov: camera.fov })

  useEffect(() => useAppStore.subscribe((s, prev) => {
    const f = s.focus
    if (f.state === prev.focus.state) return

    if (f.state === 'entering') {
      const fc = displays.get(f.displayId).focusCamera
      helper.position.set(...fc.position)
      helper.lookAt(...fc.target)
      focusPose.current = { pos: helper.position.clone(), quat: helper.quaternion.clone(), fc }
      tr.current = { kind: 'enter', from: snapshot(), start: performance.now(), duration: reducedMotion ? 0 : fc.enterMs }
    }

    if (f.state === 'exiting') {
      const r = f.returnPose
      const e = new THREE.Euler(r.pitch, r.yaw, 0, 'YXZ')
      const to = { pos: new THREE.Vector3(r.x, r.eye, r.z), quat: new THREE.Quaternion().setFromEuler(e) }
      const fc = displays.get(f.displayId).focusCamera
      tr.current = { kind: 'exit', from: snapshot(), to, start: performance.now(), duration: reducedMotion ? 0 : fc.exitMs }
    }
  }), [camera, displays, helper, reducedMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }, delta) => {
    const t = tr.current
    if (t) {
      const k = t.duration ? Math.min(1, (performance.now() - t.start) / t.duration) : 1
      const e = ease(k)
      if (t.kind === 'enter') {
        // L'arrivo si ricalcola a ogni fotogramma: il pannello compare durante l'ingresso.
        const goal = framingFor(focusPose.current.fc)
        camera.position.lerpVectors(t.from.pos, focusPose.current.pos, e)
        camera.quaternion.slerpQuaternions(t.from.quat, focusPose.current.quat, e)
        applyView(lerp(t.from.fov, goal.fov, e), lerp(t.from.x, goal.offsetX, e), lerp(t.from.y, goal.offsetY, e))
      } else {
        camera.position.lerpVectors(t.from.pos, t.to.pos, e)
        camera.quaternion.slerpQuaternions(t.from.quat, t.to.quat, e)
        applyView(lerp(t.from.fov, playerFov(), e), lerp(t.from.x, 0, e), lerp(t.from.y, 0, e))
      }
      if (k >= 1) {
        tr.current = null
        const store = useAppStore.getState()
        if (t.kind === 'enter' && store.focus.state === 'entering') store.setFocusState('focused')
        if (t.kind === 'exit') {
          applyView(playerFov(), 0, 0)
          store.finishFocusExit()
        }
      }
      return
    }

    if (useAppStore.getState().focus.state === 'focused' && focusPose.current) {
      // Telefono ruotato o pannello cambiato (altro capo, altra altezza): ci si
      // arriva con una breve rincorsa invece che a scatti.
      const goal = framingFor(focusPose.current.fc)
      const a = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 10)
      const v = view.current
      applyView(lerp(v.fov, goal.fov, a), lerp(v.x, goal.offsetX, a), lerp(v.y, goal.offsetY, a))
      if (!reducedMotion) {
        const d = config.focus.idleDrift
        const ang = (clock.elapsedTime / d.periodSeconds) * Math.PI * 2
        camera.position.set(
          focusPose.current.pos.x + Math.sin(ang) * d.amplitude,
          focusPose.current.pos.y + Math.sin(ang * 0.7) * d.amplitude * 0.5,
          focusPose.current.pos.z + Math.cos(ang) * d.amplitude * 0.6,
        )
      }
    }
  })

  return null
}
