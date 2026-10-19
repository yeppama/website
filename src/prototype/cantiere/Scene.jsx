import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { cantiere as C } from './config.js'

/**
 * Prova dell'allestimento "cantiere": la stanza e i suoi oggetti come componenti (RoomShell,
 * NeonLogo, ClothingRack, PropsManager, Lightboxes), tutto letto da config.js.
 * Gli oggetti ripetuti (blocchi, anelli delle catene) sono InstancedMesh: una draw call ciascuno.
 */
const { room, palette } = C
const HW = room.width / 2
const HD = room.depth / 2

function useTiled(url, repeat) {
  const tex = useTexture(url)
  return useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, repeat[0], repeat[1]]) // eslint-disable-line react-hooks/exhaustive-deps
}

function Wall({ position, rotationY, size }) {
  const map = useTiled(C.textures.wall.url, [size[0] / C.textures.wall.metersPerTile, size[1] / C.textures.wall.metersPerTile])
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

export function RoomShell() {
  const floor = useTiled(C.textures.floor.url, [room.width / C.textures.floor.metersPerTile, room.depth / C.textures.floor.metersPerTile])
  const ceiling = useTiled(C.textures.wall.url, [room.width / 4, room.depth / 4])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial map={floor} color={C.textures.floor.tint} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, room.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial map={ceiling} color="#777" roughness={0.9} />
      </mesh>
      <Wall position={[0, room.height / 2, -HD]} rotationY={0} size={[room.width, room.height]} />
      <Wall position={[0, room.height / 2, HD]} rotationY={Math.PI} size={[room.width, room.height]} />
      <Wall position={[-HW, room.height / 2, 0]} rotationY={Math.PI / 2} size={[room.depth, room.height]} />
      <Wall position={[HW, room.height / 2, 0]} rotationY={-Math.PI / 2} size={[room.depth, room.height]} />
      <FloorBox />
    </group>
  )
}

/** Riquadro di sicurezza dipinto a terra, sbiadito: una texture disegnata una volta. */
function FloorBox() {
  const { center, size } = C.floorBox
  const tex = useMemo(() => {
    const w = 1024, h = Math.round(1024 * size[1] / size[0])
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')
    g.strokeStyle = palette.orange; g.lineWidth = 34; g.strokeRect(24, 24, w - 48, h - 48)
    // Vernice consumata: si cancellano a caso piccoli tratti.
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 2600; i++) { g.globalAlpha = Math.random() * 0.8; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 2 + Math.random() * 6) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [size])
  return (
    <mesh position={[center[0], 0.006, center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.7} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/**
 * Logo neon: tubo disegnato su texture con l'alone già dentro (bagliore finto, nessun Bloom),
 * fuori dal tone mapping; dietro la rete metallica, una luce arancione che bagna la parete.
 */
export function NeonLogo() {
  const { text, width, height, center } = C.neon
  const tex = useMemo(() => {
    const w = 1600, h = Math.round(1600 * height / width)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')
    g.font = `900 ${Math.round(h * 0.62)}px Archivo, "Arial Black", sans-serif`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.lineJoin = 'round'
    for (const [blur, alpha, lw, color] of [[90, 0.55, 26, palette.orange], [40, 0.8, 18, palette.orange], [12, 1, 12, '#ffd2a8'], [0, 1, 5, '#fff6ee']]) {
      g.shadowColor = palette.orange; g.shadowBlur = blur; g.globalAlpha = alpha
      g.strokeStyle = color; g.lineWidth = lw
      g.strokeText(text, w / 2, h / 2)
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [text, width, height])
  const mesh = useTiled(C.textures.mesh.url, [C.meshPanel.size[0] / C.textures.mesh.metersPerTile, C.meshPanel.size[1] / C.textures.mesh.metersPerTile])
  const L = C.lights.neonLight
  return (
    <group>
      <mesh position={C.meshPanel.center}>
        <planeGeometry args={C.meshPanel.size} />
        <meshStandardMaterial map={mesh} transparent alphaTest={0.25} metalness={0.8} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={center}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight position={L.position} color={L.color} intensity={L.intensity} distance={L.distance} decay={1.6} />
    </group>
  )
}

function Decal({ url, center, size, rotationY = 0, rotationZ = 0 }) {
  const map = useTexture(url)
  map.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh position={center} rotation={[0, rotationY, rotationZ]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} transparent alphaTest={0.05} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  )
}

export function Posters() {
  return (
    <group>
      {C.posters.map((p) => <Decal key={p.url} {...p} />)}
      {C.stickers.map((s) => <Sticker key={s.name} {...s} />)}
    </group>
  )
}

function Sticker({ name, center, width, rotationY = 0, rotationZ = 0 }) {
  const map = useTexture(`/cantiere/adesivo-${name}.webp`)
  const aspect = map.image ? map.image.height / map.image.width : 1
  return <Decal url={`/cantiere/adesivo-${name}.webp`} center={center} size={[width, width * aspect]} rotationY={rotationY} rotationZ={rotationZ} />
}

/** Tre pannelli luminosi 16:9 sulla parete destra, bordo arancione che brilla e alone sul muro. */
export function Lightboxes() {
  const { x, y, zs, size, photos } = C.lightboxes
  const maps = useTexture(photos)
  maps.forEach((m) => { m.colorSpace = THREE.SRGBColorSpace })
  const halo = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128)
    grad.addColorStop(0, 'rgba(249,142,48,0.55)'); grad.addColorStop(1, 'rgba(249,142,48,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const [w, h] = size
  const edge = 0.025
  return (
    <group>
      {zs.map((z, i) => (
        <group key={z} position={[x, y, z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0, -0.03]}>
            <planeGeometry args={[w * 1.9, h * 2.1]} />
            <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[w + 0.08, h + 0.08, 0.06]} />
            <meshStandardMaterial color={palette.steel} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={maps[i]} color="#e6e6e6" toneMapped={false} />
          </mesh>
          {[[0, h / 2 + edge / 2, w + edge * 2, edge], [0, -h / 2 - edge / 2, w + edge * 2, edge], [w / 2 + edge / 2, 0, edge, h], [-w / 2 - edge / 2, 0, edge, h]].map(([ex, ey, ew, eh], k) => (
            <mesh key={k} position={[ex, ey, 0.034]}>
              <planeGeometry args={[ew, eh]} />
              <meshBasicMaterial color={palette.orange} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/**
 * Capo in 3D: il GLB ridotto, scalato all'altezza voluta. Il modello arriva senza normali e coi
 * vertici divisi sulle cuciture della texture: calcolarle così darebbe un capo a faccette. Le
 * normali si mediano fra vertici nella stessa posizione, salvo spigoli oltre 60°.
 */
function Garment({ url, height, position, rotation }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const o = scene.clone(true)
    o.traverse((m) => {
      if (!m.isMesh) return
      if (!m.geometry.attributes.normal) m.geometry = toCreasedNormals(m.geometry, Math.PI / 3)
      m.castShadow = true
      m.receiveShadow = true
      m.material.roughness = 0.9
      m.material.metalness = 0
    })
    const box = new THREE.Box3().setFromObject(o)
    const s = height / (box.max.y - box.min.y)
    o.scale.setScalar(s)
    return o
  }, [scene, height])
  return <primitive object={obj} position={position} rotation={rotation} />
}

export function ClothingRack() {
  const { x, zFrom, zTo, height, garments } = C.rack
  const pipe = <meshStandardMaterial color="#121214" metalness={0.9} roughness={0.35} />
  const step = (zTo - zFrom) / garments.length
  return (
    <group>
      {[zFrom - 0.2, zTo + 0.2].map((z) => (
        <mesh key={z} position={[x, height / 2, z]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, height, 10]} />{pipe}
        </mesh>
      ))}
      <mesh position={[x, height, (zFrom + zTo) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, zTo - zFrom + 0.44, 10]} />{pipe}
      </mesh>
      {[zFrom - 0.2, zTo + 0.2].map((z) => (
        <mesh key={`f${z}`} position={[x + 0.1, 0.02, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.6, 10]} />{pipe}
        </mesh>
      ))}
      {garments.map((g, i) => {
        const z = zFrom + step * (i + 0.5)
        return (
          <group key={g.model}>
            <mesh position={[x, height - 0.06, z]}>
              <torusGeometry args={[0.03, 0.004, 6, 16, Math.PI * 1.3]} />{pipe}
            </mesh>
            <Garment url={g.model} height={g.height} position={[x + 0.02, height - 0.1 - g.height / 2, z]} rotation={[0, Math.PI / 2, 0]} />
          </group>
        )
      })}
    </group>
  )
}

const BLOCK = [0.39, 0.19, 0.19]

/** Blocchi di cemento: tavolo e blocchi sparsi, una sola InstancedMesh. */
function CinderBlocks() {
  const ref = useRef()
  const { center, plate, stacks } = C.table
  const items = useMemo(() => {
    const list = []
    for (const sx of [-0.55, 0.55]) for (let lvl = 0; lvl < 3; lvl++) {
      for (const dz of [-0.2, 0.2]) list.push([center[0] + sx, BLOCK[1] / 2 + lvl * BLOCK[1], center[2] + dz, lvl % 2 ? 0.03 : -0.02])
    }
    for (const [bx, bz, rot] of C.blocks) list.push([bx, BLOCK[1] / 2, bz, rot])
    return list
  }, [center])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    items.forEach(([px, py, pz, rot], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot)
      ref.current.setMatrixAt(i, m.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(1, 1, 1)))
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items])
  const top = BLOCK[1] * 3
  return (
    <group>
      <instancedMesh ref={ref} args={[null, null, items.length]} castShadow receiveShadow>
        <boxGeometry args={BLOCK} />
        <meshStandardMaterial color="#8a8984" roughness={0.95} />
      </instancedMesh>
      <mesh position={[center[0], top + plate[1] / 2, center[2]]} castShadow receiveShadow>
        <boxGeometry args={plate} />
        <meshStandardMaterial color="#2b2c2f" metalness={0.85} roughness={0.35} />
      </mesh>
      {stacks.map((st) => Array.from({ length: st.layers }, (_, k) => (
        <mesh key={`${st.offset}-${k}`} castShadow receiveShadow
              position={[center[0] + st.offset[0] + (k % 2) * 0.01, top + plate[1] + 0.025 + k * 0.05, center[2] + st.offset[1]]}
              rotation={[0, (k - 1) * 0.04, 0]}>
          <boxGeometry args={[0.36, 0.045, 0.3]} />
          <meshStandardMaterial color={st.color} roughness={0.95} />
        </mesh>
      )))}
    </group>
  )
}

/** Anelli di catena: catene appese al soffitto e una a terra, una sola InstancedMesh. */
function Chains() {
  const ref = useRef()
  const LINK = 0.07
  const links = useMemo(() => {
    const list = []
    for (const c of C.chains) {
      const n = Math.round(c.length / LINK)
      for (let i = 0; i < n; i++) list.push({ p: [c.from[0], c.from[1] - i * LINK, c.from[2]], r: [0, i % 2 ? Math.PI / 2 : 0, 0] })
    }
    const { from, to, sag } = C.floorChain
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    const n = Math.round(len / LINK)
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const px = from[0] + (to[0] - from[0]) * t + Math.sin(t * Math.PI) * sag * -Math.sin(ang)
      const pz = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * sag * Math.cos(ang)
      list.push({ p: [px, 0.012, pz], r: [i % 2 ? 0 : Math.PI / 2, -ang, Math.PI / 2] })
    }
    return list
  }, [])
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    links.forEach(({ p, r }, i) => { o.position.set(...p); o.rotation.set(...r); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix) })
    ref.current.instanceMatrix.needsUpdate = true
  }, [links])
  return (
    <group>
      <instancedMesh ref={ref} args={[null, null, links.length]} castShadow>
        <torusGeometry args={[0.04, 0.009, 6, 12]} />
        <meshStandardMaterial color="#5a5148" metalness={0.9} roughness={0.2} />
      </instancedMesh>
      {C.chains.filter((c) => c.garment).map((c) => (
        <Garment key={c.garment.model} url={c.garment.model} height={c.garment.height}
                 position={[c.from[0], c.from[1] - c.length - c.garment.height / 2 + 0.02, c.from[2]]}
                 rotation={[0, c.garment.rotationY ?? 0, 0]} />
      ))}
    </group>
  )
}

function Cone() {
  const [x, z] = C.cone
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
        <meshStandardMaterial color="#c4621c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.39, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.17, 0.7, 24]} />
        <meshStandardMaterial color={palette.orange} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.083, 0.1, 0.1, 24, 1, true]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.4} />
      </mesh>
    </group>
  )
}

function Sign() {
  const { url, center, size, tilt } = C.sign
  const map = useTexture(url)
  map.colorSpace = THREE.SRGBColorSpace
  return (
    <group position={center} rotation={[tilt, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size[0], size[1], 0.012]} />
        <meshStandardMaterial color="#bdbab2" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={size} />
        <meshStandardMaterial map={map} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

/** Soffitto industriale: tubi e binari dei faretti. */
function Ceiling() {
  const tube = (from, to, r, key, color = '#2a2b2e') => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return (
      <mesh key={key} position={mid} quaternion={q}>
        <cylinderGeometry args={[r, r, dir.length(), 12]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
      </mesh>
    )
  }
  return (
    <group>
      {C.pipes.map((p, i) => tube(p.from, p.to, p.radius, `p${i}`))}
      {C.tracks.map((t, i) => tube(t.from, t.to, 0.025, `t${i}`, '#111214'))}
      {C.lights.spots.map((s, i) => (
        <mesh key={`f${i}`} position={[s.position[0], s.position[1] - 0.08, s.position[2]]}>
          <cylinderGeometry args={[0.07, 0.09, 0.18, 14]} />
          <meshStandardMaterial color="#0d0d0f" metalness={0.8} roughness={0.3} emissive="#fff3e6" emissiveIntensity={0.05} />
        </mesh>
      ))}
    </group>
  )
}

export function PropsManager() {
  return (
    <group>
      <CinderBlocks />
      <Chains />
      <Cone />
      <Sign />
      <Ceiling />
    </group>
  )
}

function Lights() {
  const L = C.lights
  return (
    <group>
      <ambientLight intensity={L.ambient} />
      <hemisphereLight args={[L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity]} />
      {L.spots.map((s, i) => <Spot key={i} {...s} />)}
    </group>
  )
}

function Spot({ position, target, intensity, angle, penumbra, color, shadow }) {
  const light = useRef()
  const { scene } = useThree()
  useEffect(() => {
    light.current.target.position.set(...target)
    scene.add(light.current.target)
    return () => scene.remove(light.current?.target)
  }, [target, scene])
  return (
    <spotLight ref={light} position={position} intensity={intensity} angle={angle} penumbra={penumbra} color={color}
      decay={1.5} distance={12} castShadow={Boolean(shadow)} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
  )
}

/** Camera: si guarda attorno ruotando (OrbitControls, limiti dentro la stanza); le viste la spostano. */
function CameraRig({ view }) {
  const controls = useRef()
  const { camera } = useThree()
  useEffect(() => {
    const v = C.views[view]
    camera.position.set(...v.position)
    controls.current.target.set(...v.target)
    controls.current.update()
  }, [view, camera])
  return (
    <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={0.6} maxDistance={6}
      minPolarAngle={0.35} maxPolarAngle={Math.PI / 2 + 0.15} rotateSpeed={0.6} />
  )
}

function Stats({ onStats }) {
  const last = useRef(0)
  useFrame(({ gl, clock }) => {
    if (clock.elapsedTime - last.current < 0.5) return
    last.current = clock.elapsedTime
    onStats({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, geometries: gl.info.memory.geometries })
  })
  return null
}

export default function Scene({ view, onStats, onReady }) {
  return (
    <>
      <CameraRig view={view} />
      <Lights />
      <Suspense fallback={null}>
        <RoomShell />
        <NeonLogo />
        <Posters />
        <Lightboxes />
        <ClothingRack />
        <PropsManager />
        <Ready onReady={onReady} />
      </Suspense>
      <Stats onStats={onStats} />
    </>
  )
}

function Ready({ onReady }) {
  useEffect(() => { onReady() }, [onReady])
  return null
}
