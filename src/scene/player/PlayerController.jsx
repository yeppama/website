import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { createNavigator } from '../../lib/navigator.js'
import { moveWithCollisions } from '../../lib/collision.js'
import { rayHitsCollider, zoneAt } from '../../lib/geometry.js'
import { fovForAspect } from '../../lib/framing.js'
import { useAppStore, APP_PHASE } from '../../state/useAppStore.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'

const MOVE = {
  KeyW: [1, 0], ArrowUp: [1, 0], KeyS: [-1, 0], ArrowDown: [-1, 0],
  KeyA: [0, -1], ArrowLeft: [0, -1], KeyD: [0, 1], ArrowRight: [0, 1],
}
const SPRINT = new Set(['ShiftLeft', 'ShiftRight'])

// yaw = 0 guarda verso −z, come la camera di three. Avanti = (−sin, −cos).
const yawToward = (fromX, fromZ, toX, toZ) => Math.atan2(-(toX - fromX), -(toZ - fromZ))
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
// Il pannello del Lookbook sta dentro lo spessore del collider del muro: il raggio
// colpisce prima il collider, poi il pannello qualche centimetro dietro.
const PANEL_DEPTH_TOLERANCE = 0.3

/**
 * Controller del player — Fase 3.
 *
 * Desktop: WASD/frecce + mouse con Pointer Lock. Il lock si chiede SOLO su un
 *   click esplicito sulla scena; si rilascia da solo quando si apre il menu o
 *   la finestra perde il focus, e non si riattiva mai senza un nuovo click.
 * Mobile: niente joystick. Tap = vai lì (pavimento) o avvicinati (hotspot);
 *   trascinamento = orienta la visuale. Tap e trascinamento sono distinti da
 *   soglie di distanza e durata configurate.
 * Ogni spostamento automatico segue un percorso del navigatore, che garantisce
 *   segmenti liberi da collider; le collisioni restano comunque attive.
 */
export default function PlayerController({ config, device }) {
  const { camera, gl, size } = useThree()
  const nav = useMemo(() => createNavigator(config), [config])
  const P = config.navigation.player
  const I = config.navigation.input
  const waypoints = useMemo(() => new Map(config.navigation.waypoints.map((w) => [w.id, w])), [config])
  const pois = config.pois
  const displayById = useMemo(() => new Map(config.displays.map((d) => [d.id, d])), [config])
  const displayByCollider = useMemo(() => new Map(config.displays.map((d) => [d.colliderId, d])), [config])
  const poiByDisplay = useMemo(() => new Map(config.pois.filter((p) => p.targetDisplayId).map((p) => [p.targetDisplayId, p])), [config])
  const moveOpts = useMemo(() => ({
    radius: P.radius, colliders: config.colliders, walkableAreas: config.navigation.walkableAreas, maxStep: P.radius * 0.5,
  }), [P.radius, config])

  // Stato della simulazione: mutabile, fuori da React.
  const rt = useRef(null)
  if (!rt.current) {
    const spawn = waypoints.get(config.environment.entrance.waypointId)
    const look = waypoints.get(config.environment.entrance.lookAtWaypointId)
    // Dopo un rimontaggio (contesto WebGL perso e ripreso) si riparte da dove si era.
    const resume = usePlayerStore.getState().resumePose
    if (resume) usePlayerStore.setState({ resumePose: null })
    rt.current = {
      pos: resume ? { x: resume.x, z: resume.z } : { x: spawn.position[0], z: spawn.position[2] },
      yaw: resume ? resume.yaw : yawToward(spawn.position[0], spawn.position[2], look.position[0], look.position[2]),
      pitch: 0,
      vel: { x: 0, z: 0 },
      keys: new Set(),
      sprint: false,
      route: null,         // { points, faceAt }
      faceYaw: null,
      stuckFor: 0,
      lastLookInput: 0,
      gesture: null,       // tap/trascinamento in corso
      teleport: null,      // { waypoint, swapAt }
      poiState: Object.fromEntries(pois.map((p) => [p.id, 'hidden'])),
      lastPublish: 0,
    }
  }

  const blocked = () => {
    const app = useAppStore.getState()
    return app.phase !== APP_PHASE.EXPLORING || app.menuOpen || app.focus.state !== 'idle' || app.dialogs.length > 0
  }
  // Durante il benchmark la simulazione gira (i percorsi avanzano) ma l'input
  // dell'utente no: un tocco cambierebbe la traiettoria e falserebbe la misura.
  const inputLocked = () => blocked() || useAppStore.getState().benchRunning

  const notify = (text) => useAppStore.getState().showNotice(text)

  const cancelRoute = () => {
    if (!rt.current.route) return
    rt.current.route = null
    usePlayerStore.setState({ route: null })
  }

  const ping = (x, z, ok) => usePlayerStore.setState({ ping: { id: performance.now(), x, z, ok } })

  /**
   * Focus Mode su un espositore: cursore liberato, input azzerati, posa del
   * player salvata per il ritorno. La camera la prende FocusCameraRig.
   */
  const enterFocusFor = (display) => {
    const feature = config.features.focusMode
    if (!feature.enabled) {
      notify(`${config.copy.hints.comingInPhase} ${feature.availableInPhase}`)
      return
    }
    const r = rt.current
    r.keys.clear()
    r.vel.x = r.vel.z = 0
    // Se il player stava per voltarsi verso l'espositore (arrivo da un tap), la
    // rotazione si applica subito: altrimenti all'uscita dal Focus la camera
    // tornerebbe allo sguardo "di marcia" e poi girerebbe da sola.
    if (r.faceYaw !== null) r.yaw = r.faceYaw
    r.faceYaw = null
    cancelRoute()
    if (document.pointerLockElement) document.exitPointerLock()
    useAppStore.getState().enterFocus(display.id, {
      x: r.pos.x, z: r.pos.z, eye: P.eyeHeight, yaw: r.yaw, pitch: r.pitch, fov: camera.fov,
    })
  }

  /** Tap o click su un espositore: da vicino si apre subito, da lontano prima ci si avvicina. */
  const approachOrFocus = (display) => {
    const r = rt.current
    const w = waypoints.get(display.approachWaypointId)
    const poi = poiByDisplay.get(display.id)
    const near = Math.hypot(w.position[0] - r.pos.x, w.position[2] - r.pos.z) < 1.2 || r.poiState[poi?.id] === 'active'
    if (near) enterFocusFor(display)
    else goTo([w.position[0], w.position[2]], poi?.anchor ?? null, { focus: display.id })
  }

  /** Apre il Lookbook: tasti e percorso azzerati, cursore liberato dalla sottoscrizione più sotto. */
  const openLookbook = (lookbookId) => {
    const feature = config.features.lookbook
    if (!feature.enabled) {
      notify(`${config.copy.hints.comingInPhase} ${feature.availableInPhase}`)
      return
    }
    if (rt.current.faceYaw !== null) rt.current.yaw = rt.current.faceYaw
    rt.current.faceYaw = null
    useAppStore.getState().openDialog('lookbook', lookbookId)
  }

  /** Tap sull'hotspot del Lookbook o sul suo pannello: da vicino si apre, da lontano prima ci si avvicina. */
  const approachOrOpenLookbook = (poi) => {
    if (rt.current.poiState[poi.id] === 'active') { openLookbook(poi.targetLookbookId); return }
    const w = waypoints.get(poi.approachWaypointId)
    goTo([w.position[0], w.position[2]], poi.anchor, { lookbook: poi.targetLookbookId })
  }

  // Il pannello della parete del brand: un piano verticale rivolto verso +z.
  // Un raggio che lo colpisce apre il Lookbook a cui il pannello è legato.
  const brandPanel = config.environment.brandWall.panel
  const lookbookPoi = pois.find((p) => p.targetLookbookId === brandPanel.lookbookId) ?? null
  const panelHit = (o, d) => {
    if (Math.abs(d[2]) < 1e-6) return null
    const [cx, cy, cz] = brandPanel.center
    const t = (cz - o[2]) / d[2]
    if (t <= 0) return null
    const x = o[0] + d[0] * t
    const y = o[1] + d[1] * t
    return Math.abs(x - cx) <= brandPanel.size[0] / 2 && Math.abs(y - cy) <= brandPanel.size[1] / 2 ? t : null
  }

  /** Avvia un percorso automatico verso un punto del pavimento. */
  const goTo = (target, faceAt = null, onArrive = null) => {
    const r = rt.current
    const res = nav.plan([r.pos.x, r.pos.z], target)
    if (!res.ok) {
      ping(target[0], target[1], false)
      notify(config.copy.hints.unreachable)
      return false
    }
    r.route = { points: res.points.map((p) => [...p]), faceAt, onArrive }
    r.faceYaw = null
    r.stuckFor = 0
    ping(target[0], target[1], true)
    usePlayerStore.setState({ route: { id: performance.now(), points: [[r.pos.x, r.pos.z], ...res.points] } })
    return true
  }

  // --- Comandi dall'interfaccia (teletrasporto, avvicinamento) -----------------
  const runCommand = (cmd) => {
    const r = rt.current
    // Cammina fino a un punto, lungo un percorso validato (riusato in Fase 4 per l'avvicinamento).
    if (cmd.type === 'goto') {
      goTo(cmd.point, cmd.faceAt ?? null)
      return
    }
    // Comandi del benchmark: posa istantanea, Focus su un espositore, rotazione verso un punto.
    if (cmd.type === 'place') {
      const w = waypoints.get(cmd.waypointId)
      cancelRoute()
      r.vel.x = r.vel.z = 0
      r.pos.x = w.position[0]
      r.pos.z = w.position[2]
      if (w.lookAt) r.yaw = yawToward(r.pos.x, r.pos.z, w.lookAt[0], w.lookAt[2])
      r.pitch = 0
      r.faceYaw = null
      return
    }
    if (cmd.type === 'focus') {
      enterFocusFor(displayById.get(cmd.displayId))
      return
    }
    if (cmd.type === 'face') {
      r.faceYaw = yawToward(r.pos.x, r.pos.z, cmd.point[0], cmd.point[2])
      r.lastLookInput = 0
      return
    }
    if (cmd.type === 'teleport') {
      const w = waypoints.get(cmd.waypointId)
      // Solo destinazioni marcate sicure: il config lo garantisce (I8), qui lo si ricontrolla.
      if (!w?.safeForTeleport) return
      cancelRoute()
      r.vel.x = r.vel.z = 0
      const fadeMs = device.reducedMotion ? 0 : config.navigation.teleport.fadeMs
      r.teleport = { waypoint: w, swapAt: performance.now() + fadeMs }
      usePlayerStore.setState({ fading: fadeMs > 0 })
    }
  }

  // --- Tastiera ----------------------------------------------------------------
  useEffect(() => {
    const r = rt.current
    const down = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (SPRINT.has(e.code)) { r.sprint = true; return }
      if (!MOVE[e.code] || inputLocked()) return
      r.keys.add(e.code)
      cancelRoute()
      e.preventDefault()
    }
    const up = (e) => {
      if (SPRINT.has(e.code)) r.sprint = false
      r.keys.delete(e.code)
    }
    // Il bug classico: un tasto premuto mentre la finestra perde il focus non
    // riceve mai il keyup, e il player cammina da solo. Si azzera tutto.
    const release = () => { r.keys.clear(); r.sprint = false }
    const onVisibility = () => { if (document.hidden) release() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Menu o scheda aperti: movimento sospeso, cursore liberato ------------------
  // All'apertura si azzerano tasti, velocità e percorso: un tasto tenuto premuto
  // prima dell'apertura non deve far partire il player alla chiusura. Alla
  // chiusura il Pointer Lock NON si riprende: serve un nuovo click esplicito.
  useEffect(() => useAppStore.subscribe((s, prev) => {
    if ((s.menuOpen && !prev.menuOpen) || (s.dialogs.length && !prev.dialogs.length)) {
      rt.current.keys.clear()
      rt.current.vel.x = rt.current.vel.z = 0
      cancelRoute()
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pointer Lock ------------------------------------------------------------
  useEffect(() => {
    const canvas = gl.domElement
    const onChange = () => usePlayerStore.setState({ pointerLocked: document.pointerLockElement === canvas })
    const onError = () => notify(config.copy.hints.pointerLockFailed)
    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas || useAppStore.getState().benchRunning) return
      const r = rt.current
      r.yaw -= e.movementX * P.lookSensitivity.desktop
      r.pitch = clamp(r.pitch - e.movementY * P.lookSensitivity.desktop, P.pitchClamp[0], P.pitchClamp[1])
      r.lastLookInput = performance.now()
    }
    document.addEventListener('pointerlockchange', onChange)
    document.addEventListener('pointerlockerror', onError)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('pointerlockchange', onChange)
      document.removeEventListener('pointerlockerror', onError)
      document.removeEventListener('mousemove', onMouseMove)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [gl, P, config]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Tap e trascinamento -----------------------------------------------------
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  const handleTap = (clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    // La matrice della camera si aggiorna al render: senza questo, un tap
    // arrivato fra due fotogrammi mirerebbe dalla posa precedente.
    camera.updateMatrixWorld()
    raycaster.setFromCamera(ndc, camera)
    const o = raycaster.ray.origin.toArray()
    const d = raycaster.ray.direction.toArray()

    // 1. Hotspot visibili: sfere di tocco attorno all'ancora del POI.
    let best = { t: Infinity, kind: null }
    const tapR = config.navigation.hotspot.tapRadius
    for (const poi of pois) {
      if (rt.current.poiState[poi.id] === 'hidden') continue
      const a = poi.anchor
      const oc = [o[0] - a[0], o[1] - a[1], o[2] - a[2]]
      const b = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2]
      const c = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - tapR * tapR
      const disc = b * b - c
      if (disc < 0) continue
      const t = -b - Math.sqrt(disc)
      if (t > 0 && t < best.t) best = { t, kind: 'poi', poi }
    }
    // 2. Muri e colonne: se il dito li colpisce prima del pavimento, il tap è su di loro.
    for (const col of config.colliders) {
      const t = rayHitsCollider(o, d, col)
      if (t === null || t <= 0 || t >= best.t) continue
      const display = displayByCollider.get(col.id)
      best = display ? { t, kind: 'display', display } : { t, kind: 'wall' }
    }
    // 3. Pavimento.
    if (d[1] < -1e-4) {
      const t = -o[1] / d[1]
      if (t < best.t) best = { t, kind: 'floor', point: [o[0] + d[0] * t, o[2] + d[2] * t] }
    }

    if (best.kind === 'display') {
      approachOrFocus(best.display)
    } else if (best.kind === 'poi' && best.poi.targetDisplayId) {
      approachOrFocus(displayById.get(best.poi.targetDisplayId))
    } else if (best.kind === 'poi' && best.poi.targetLookbookId) {
      approachOrOpenLookbook(best.poi)
    } else if (best.kind === 'poi') {
      const w = waypoints.get(best.poi.approachWaypointId)
      goTo([w.position[0], w.position[2]], best.poi.anchor)
    } else if (best.kind === 'floor') {
      goTo(best.point)
    } else if (best.kind === 'wall' && lookbookPoi && panelHit(o, d) !== null && panelHit(o, d) <= best.t + PANEL_DEPTH_TOLERANCE) {
      approachOrOpenLookbook(lookbookPoi)
    } else if (best.kind === 'wall') {
      const p = [o[0] + d[0] * best.t, o[2] + d[2] * best.t]
      ping(p[0], p[1], false)
      notify(config.copy.hints.wall)
    }
  }

  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.touchAction = 'none' // niente scroll, zoom o "rimbalzo" del browser sulla scena

    const onDown = (e) => {
      if (inputLocked()) return
      const r = rt.current
      const isMouse = e.pointerType === 'mouse' && !device.isTouch
      if (isMouse) {
        if (document.pointerLockElement !== canvas) {
          // Gesto esplicito: l'unico modo per (ri)attivare il controllo del mouse.
          try {
            const res = canvas.requestPointerLock()
            if (res?.catch) res.catch(() => notify(config.copy.hints.pointerLockFailed))
          } catch {
            notify(config.copy.hints.pointerLockFailed)
          }
          return
        }
        // Click a cursore catturato: prima l'espositore sotto il mirino, poi quello attivo.
        camera.updateMatrixWorld()
        raycaster.setFromCamera(ndc.set(0, 0), camera)
        const o = raycaster.ray.origin.toArray()
        const dir = raycaster.ray.direction.toArray()
        let aimed = null
        let aimedT = config.focus.maxClickDistance
        for (const col of config.colliders) {
          const t = rayHitsCollider(o, dir, col)
          if (t !== null && t > 0 && t < aimedT) { aimedT = t; aimed = displayByCollider.get(col.id) ?? null }
        }
        if (aimed) { enterFocusFor(aimed); return }
        const pt = panelHit(o, dir)
        if (lookbookPoi && pt !== null && pt <= aimedT + PANEL_DEPTH_TOLERANCE) { openLookbook(lookbookPoi.targetLookbookId); return }
        const activeId = usePlayerStore.getState().activePoiId
        const poi = pois.find((p) => p.id === activeId)
        if (poi?.targetDisplayId) { enterFocusFor(displayById.get(poi.targetDisplayId)); return }
        if (poi?.targetLookbookId) { openLookbook(poi.targetLookbookId); return }
        if (poi?.requires && !config.features[poi.requires]?.enabled) {
          notify(`${config.copy.hints.comingInPhase} ${config.features[poi.requires].availableInPhase}`)
        }
        return
      }
      if (r.gesture) return // un solo dito alla volta
      r.gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), dragging: false }
      try { canvas.setPointerCapture?.(e.pointerId) } catch { /* puntatore già rilasciato: il gesto prosegue lo stesso */ }
    }
    const onMove = (e) => {
      const r = rt.current
      const g = r.gesture
      if (!g || g.id !== e.pointerId) return
      if (!g.dragging && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > I.tapMaxMovePx) g.dragging = true
      if (g.dragging) {
        // Convenzione "afferra la scena": la scena segue il dito.
        r.yaw += (e.clientX - g.x) * P.lookSensitivity.mobileDrag
        r.pitch = clamp(r.pitch + (e.clientY - g.y) * P.lookSensitivity.mobileDrag, P.pitchClamp[0], P.pitchClamp[1])
        r.lastLookInput = performance.now()
      }
      g.x = e.clientX
      g.y = e.clientY
    }
    const onUp = (e) => {
      const r = rt.current
      const g = r.gesture
      if (!g || g.id !== e.pointerId) return
      r.gesture = null
      if (!g.dragging && performance.now() - g.t0 <= I.tapMaxMs && !inputLocked()) handleTap(e.clientX, e.clientY)
    }
    const onCancel = (e) => { if (rt.current.gesture?.id === e.pointerId) rt.current.gesture = null }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
    }
  }, [gl, camera, device, config]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Campo visivo: in verticale lo schermo è stretto, si allarga il fov -------
  // Durante il Focus la camera è della FocusCameraRig, che all'uscita ricalcola lo
  // stesso fov per lo schermo di quel momento (il telefono può essere stato ruotato).
  useEffect(() => {
    if (useAppStore.getState().focus.state === 'idle') camera.fov = fovForAspect(P.fov, size.width / size.height)
    camera.near = config.camera.near
    camera.far = config.camera.far
    camera.updateProjectionMatrix()
  }, [camera, size, P.fov, config.camera])

  // --- Esposizione per i test, solo in modalità debug ----------------------------
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).get('debug')) return
    window.__player = rt.current
    window.__nav = nav
    window.__camera = camera
    window.__stores = { app: useAppStore, player: usePlayerStore }
  }, [nav, camera])

  // --- Simulazione ---------------------------------------------------------------
  /** Un passo di simulazione di durata `dt` (≤ maxStepDt). */
  const step = (dt, now) => {
    const r = rt.current
    const frozen = blocked() || r.teleport
    let desiredX = 0
    let desiredZ = 0
    let rate = P.damping

    if (!frozen) {
      let f = 0
      let s = 0
      for (const k of r.keys) { f += MOVE[k][0]; s += MOVE[k][1] }
      if (f || s) {
        const len = Math.hypot(f, s)
        const speed = P.walkSpeed * (r.sprint ? P.sprintMultiplier : 1)
        const fx = -Math.sin(r.yaw), fz = -Math.cos(r.yaw)
        const rx = Math.cos(r.yaw), rz = -Math.sin(r.yaw)
        desiredX = ((fx * f + rx * s) / len) * speed
        desiredZ = ((fz * f + rz * s) / len) * speed
        rate = P.acceleration
      } else if (r.route) {
        const [tx, tz] = r.route.points[0]
        const dx = tx - r.pos.x
        const dz = tz - r.pos.z
        const d = Math.hypot(dx, dz)
        if (d < P.autoMove.arriveRadius) {
          r.route.points.shift()
          if (!r.route.points.length) {
            const face = r.route.faceAt
            const arrive = r.route.onArrive
            if (face) r.faceYaw = yawToward(r.pos.x, r.pos.z, face[0], face[2])
            cancelRoute()
            if (arrive?.focus) enterFocusFor(displayById.get(arrive.focus))
            if (arrive?.lookbook) openLookbook(arrive.lookbook)
          }
        } else {
          let remaining = d
          let prev = [tx, tz]
          for (const p of r.route.points.slice(1)) { remaining += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p }
          const speed = P.autoMove.speed * clamp(remaining / 1.2, 0.3, 1)
          desiredX = (dx / d) * speed
          desiredZ = (dz / d) * speed
          rate = P.acceleration
          // Si gira nella direzione di marcia, salvo che l'utente stia guardando altrove.
          if (now - r.lastLookInput > 600) {
            const want = yawToward(0, 0, dx, dz)
            r.yaw += wrapAngle(want - r.yaw) * (1 - Math.exp(-P.autoMove.turnSpeed * dt))
          }
        }
      }
    }

    const k = 1 - Math.exp(-rate * dt)
    r.vel.x += (desiredX - r.vel.x) * k
    r.vel.z += (desiredZ - r.vel.z) * k
    if (frozen) { r.vel.x = 0; r.vel.z = 0 }

    const wantX = r.vel.x * dt
    const wantZ = r.vel.z * dt
    const moved = moveWithCollisions(r.pos, wantX, wantZ, moveOpts)

    // Un percorso che non avanza (spinto da qualcosa) si abbandona invece di spingere per sempre.
    if (r.route) {
      const want = Math.hypot(wantX, wantZ)
      r.stuckFor = want > 1e-4 && Math.hypot(moved.x, moved.z) < want * 0.2 ? r.stuckFor + dt : 0
      if (r.stuckFor > 0.6) cancelRoute()
    }

    if (r.faceYaw !== null && now - r.lastLookInput > 300) {
      const diff = wrapAngle(r.faceYaw - r.yaw)
      r.yaw += diff * (1 - Math.exp(-P.autoMove.turnSpeed * dt))
      if (Math.abs(diff) < 0.01) r.faceYaw = null
    }
  }

  useFrame((_, delta) => {
    const r = rt.current
    const now = performance.now()

    const commands = usePlayerStore.getState().drain()
    // Durante il Focus Mode la camera appartiene a FocusCameraRig: il player è
    // sospeso e i comandi (teletrasporti) vengono scartati, non accodati.
    if (useAppStore.getState().focus.state !== 'idle') return
    for (const cmd of commands) runCommand(cmd)

    // Teletrasporto: si sposta a schermo nero, poi la dissolvenza si riapre.
    if (r.teleport && now >= r.teleport.swapAt) {
      const w = r.teleport.waypoint
      r.pos.x = w.position[0]
      r.pos.z = w.position[2]
      if (w.lookAt) r.yaw = yawToward(r.pos.x, r.pos.z, w.lookAt[0], w.lookAt[2])
      r.pitch = 0
      r.teleport = null
      usePlayerStore.setState({ fading: false })
    }

    // Il tempo reale del frame, recuperato a passi brevi (vedi navigation.input).
    let remaining = Math.min(delta, I.maxCatchUp)
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, I.maxStepDt)
      step(dt, now)
      remaining -= dt
    }

    camera.position.set(r.pos.x, P.eyeHeight, r.pos.z)
    camera.rotation.set(r.pitch, r.yaw, 0, 'YXZ')

    // Prossimità ai POI con isteresi: tre soglie, così l'hotspot non sfarfalla sul bordo.
    let changed = false
    let activeId = null
    let activeDist = Infinity
    for (const poi of pois) {
      const d = Math.hypot(poi.anchor[0] - r.pos.x, poi.anchor[2] - r.pos.z)
      const { showRadius, activateRadius, hideRadius } = poi.proximity
      const prev = r.poiState[poi.id]
      let next = prev
      if (prev === 'hidden' && d < showRadius) next = 'visible'
      if (prev !== 'hidden' && d > hideRadius) next = 'hidden'
      if (next === 'visible' && d < activateRadius) next = 'active'
      if (prev === 'active' && d > activateRadius * 1.15) next = d > hideRadius ? 'hidden' : 'visible'
      if (next !== prev) { r.poiState[poi.id] = next; changed = true }
      if (next === 'active' && d < activeDist) { activeId = poi.id; activeDist = d }
    }
    const store = usePlayerStore.getState()
    if (changed || store.activePoiId !== activeId) {
      usePlayerStore.setState({ poiStates: { ...r.poiState }, activePoiId: activeId })
    }

    // Fotografia per l'interfaccia, ~10 volte al secondo.
    if (now - r.lastPublish > 100) {
      r.lastPublish = now
      const zone = zoneAt([r.pos.x, r.pos.z], config.environment.zones)
      usePlayerStore.setState({ pose: { x: r.pos.x, z: r.pos.z, yaw: r.yaw }, zoneId: zone?.id ?? null })
    }
  })

  return null
}
