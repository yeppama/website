import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../state/useAppStore.js'

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Camera del Focus Mode. Quando lo stato passa a `entering` prende la camera
 * dalla posa corrente e la porta sulla posa di Focus dell'espositore; a
 * `exiting` la riporta esattamente dove il player l'aveva lasciata.
 * Interpola posizione, orientamento (slerp, niente scatti di rotazione) e fov.
 * Nello stato `focused` aggiunge una deriva minima, così l'immagine respira.
 */
export default function FocusCameraRig({ config, reducedMotion }) {
  const { camera } = useThree()
  const tr = useRef(null)
  const focusPose = useRef(null)
  // Una camera d'appoggio: il suo lookAt orienta già −z verso il bersaglio.
  const helper = useMemo(() => new THREE.PerspectiveCamera(), [])
  const displays = useMemo(() => new Map(config.displays.map((d) => [d.id, d])), [config])

  const snapshot = () => ({ pos: camera.position.clone(), quat: camera.quaternion.clone(), fov: camera.fov })

  useEffect(() => useAppStore.subscribe((s, prev) => {
    const f = s.focus
    if (f.state === prev.focus.state) return

    if (f.state === 'entering') {
      const fc = displays.get(f.displayId).focusCamera
      helper.position.set(...fc.position)
      helper.lookAt(...fc.target)
      const to = { pos: helper.position.clone(), quat: helper.quaternion.clone(), fov: fc.fov }
      focusPose.current = to
      tr.current = { kind: 'enter', from: snapshot(), to, start: performance.now(), duration: reducedMotion ? 0 : fc.enterMs }
    }

    if (f.state === 'exiting') {
      const r = f.returnPose
      const e = new THREE.Euler(r.pitch, r.yaw, 0, 'YXZ')
      const to = { pos: new THREE.Vector3(r.x, r.eye, r.z), quat: new THREE.Quaternion().setFromEuler(e), fov: r.fov }
      const fc = displays.get(f.displayId).focusCamera
      tr.current = { kind: 'exit', from: snapshot(), to, start: performance.now(), duration: reducedMotion ? 0 : fc.exitMs }
    }
  }), [camera, displays, helper, reducedMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    const t = tr.current
    if (t) {
      const k = t.duration ? Math.min(1, (performance.now() - t.start) / t.duration) : 1
      const e = ease(k)
      camera.position.lerpVectors(t.from.pos, t.to.pos, e)
      camera.quaternion.slerpQuaternions(t.from.quat, t.to.quat, e)
      camera.fov = t.from.fov + (t.to.fov - t.from.fov) * e
      camera.updateProjectionMatrix()
      if (k >= 1) {
        tr.current = null
        const store = useAppStore.getState()
        if (t.kind === 'enter' && store.focus.state === 'entering') store.setFocusState('focused')
        if (t.kind === 'exit') store.finishFocusExit()
      }
      return
    }

    if (useAppStore.getState().focus.state === 'focused' && focusPose.current && !reducedMotion) {
      const d = config.focus.idleDrift
      const a = (clock.elapsedTime / d.periodSeconds) * Math.PI * 2
      camera.position.set(
        focusPose.current.pos.x + Math.sin(a) * d.amplitude,
        focusPose.current.pos.y + Math.sin(a * 0.7) * d.amplitude * 0.5,
        focusPose.current.pos.z + Math.cos(a) * d.amplitude * 0.6,
      )
    }
  })

  return null
}
