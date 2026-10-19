import { useLayoutEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { BLOOM_LAYER } from '../lighting/SelectiveBloom.jsx'

/**
 * Stanza dell'allestimento "cantiere" (docs/cantiere/PIANO.md), tutta da
 * storeConfig.environment.cantiere: cemento con le texture, neon del marchio su rete metallica,
 * poster e adesivi, pannelli luminosi del Lookbook, riquadro di sicurezza a terra, blocchi,
 * catene di contorno, cono, cartello e tubi a soffitto. Gli espositori (rack, catene coi capi,
 * tavolo) sono in scene/displays; binari e corpi illuminanti li disegnano Architecture e
 * LightFixtures, come nel negozio. Le collisioni restano solo sui box di `colliders`.
 *
 * Le texture le carica useTexture: la scena aspetta (Suspense) che ci siano tutte.
 * Con `bloom` (fase 2: Bloom vero, solo GPU dedicata) neon e bordi dei pannelli vanno sul layer
 * del bagliore e l'alone finto disegnato nelle texture sparisce: lo fa SelectiveBloom.
 */
const onBloomLayer = (o) => o?.layers.enable(BLOOM_LAYER)

function useTiled(url, repeat) {
  const tex = useTexture(url)
  const [rx, ry] = repeat
  const tiled = useMemo(() => {
    const t = tex.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [tex, rx, ry])
  useLayoutEffect(() => () => tiled.dispose(), [tiled])
  return tiled
}

/** Texture disegnata su un canvas, liberata allo smontaggio. */
function useCanvasTexture(draw, deps) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    draw(c)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => tex.dispose(), [tex])
  return tex
}

function Wall({ position, rotationY, size, texture }) {
  const map = useTiled(texture.url, [size[0] / texture.metersPerTile, size[1] / texture.metersPerTile])
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

function Shell({ W, D, H, C }) {
  const { wall, floor } = C.textures
  const floorMap = useTiled(floor.url, [W / floor.metersPerTile, D / floor.metersPerTile])
  const ceilingMap = useTiled(wall.url, [W / wall.metersPerTile, D / wall.metersPerTile])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floorMap} color={floor.tint} roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={ceilingMap} color={C.ceilingTint} roughness={0.9} />
      </mesh>
      <Wall position={[0, H / 2, -D / 2]} rotationY={0} size={[W, H]} texture={wall} />
      <Wall position={[0, H / 2, D / 2]} rotationY={Math.PI} size={[W, H]} texture={wall} />
      <Wall position={[-W / 2, H / 2, 0]} rotationY={Math.PI / 2} size={[D, H]} texture={wall} />
      <Wall position={[W / 2, H / 2, 0]} rotationY={-Math.PI / 2} size={[D, H]} texture={wall} />
    </group>
  )
}

/** Riquadro di sicurezza dipinto a terra, con la vernice consumata. */
function FloorBox({ box, color }) {
  const { center, size } = box
  const tex = useCanvasTexture((c) => {
    const w = 1024
    const h = Math.round((1024 * size[1]) / size[0])
    c.width = w; c.height = h
    const g = c.getContext('2d')
    g.strokeStyle = color; g.lineWidth = 34; g.strokeRect(24, 24, w - 48, h - 48)
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 2600; i++) {
      g.globalAlpha = Math.random() * 0.8
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 2 + Math.random() * 6)
    }
  }, [size[0], size[1], color])
  return (
    <mesh position={[center[0], 0.006, center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.7} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/**
 * Neon del marchio: il tubo disegnato su texture con l'alone dentro (bagliore finto), fuori dal
 * tone mapping; dietro, la rete metallica e una luce arancione che bagna la parete.
 * Col Bloom vero la texture ha solo il tubo (`bloomLayers`): il bagliore lo fa il Bloom.
 */
function Neon({ C, bloom }) {
  const { text, width, height, center } = C.neon
  const color = C.palette.orange
  const tex = useCanvasTexture((c) => {
    const w = 1600
    const h = Math.round((1600 * height) / width)
    c.width = w; c.height = h
    const g = c.getContext('2d')
    g.font = `900 ${Math.round(h * 0.62)}px Archivo, "Arial Black", sans-serif`
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'
    for (const [blur, alpha, lw, stroke] of bloom ? C.neon.bloomLayers : C.neon.layers) {
      g.shadowColor = color; g.shadowBlur = blur; g.globalAlpha = alpha
      g.strokeStyle = stroke ?? color; g.lineWidth = lw
      g.strokeText(text, w / 2, h / 2)
    }
  }, [text, width, height, color, bloom])
  const { mesh } = C.textures
  const meshMap = useTiled(mesh.url, [C.meshPanel.size[0] / mesh.metersPerTile, C.meshPanel.size[1] / mesh.metersPerTile])
  const L = C.neonLight
  return (
    <group>
      <mesh position={C.meshPanel.center}>
        <planeGeometry args={C.meshPanel.size} />
        <meshStandardMaterial map={meshMap} transparent alphaTest={0.25} metalness={0.8} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={center} ref={bloom ? onBloomLayer : undefined}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight position={L.position} color={L.color} intensity={L.intensity} distance={L.distance} decay={1.6} />
    </group>
  )
}

function Decal({ map, center, size, rotationY = 0, rotationZ = 0 }) {
  return (
    <mesh position={center} rotation={[0, rotationY, rotationZ]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} transparent alphaTest={0.05} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  )
}

/** Poster e adesivi: immagini su piani appena staccati dal muro. */
function Posters({ C }) {
  const posterMaps = useTexture(C.posters.map((p) => p.url))
  const stickerMaps = useTexture(C.stickers.map((s) => C.stickerUrl(s.name)))
  for (const m of [...posterMaps, ...stickerMaps]) m.colorSpace = THREE.SRGBColorSpace
  return (
    <group>
      {C.posters.map((p, i) => <Decal key={p.url} map={posterMaps[i]} center={p.center} size={p.size} rotationY={p.rotationY} />)}
      {C.stickers.map((s, i) => {
        const img = stickerMaps[i].image
        const aspect = img ? img.height / img.width : 1
        return <Decal key={s.name} map={stickerMaps[i]} center={s.center} size={[s.width, s.width * aspect]} rotationY={s.rotationY} rotationZ={s.rotationZ} />
      })}
    </group>
  )
}

/** Pannelli luminosi del Lookbook sulla parete est: foto fuori dal tone mapping, bordo e alone arancioni. */
function Lightboxes({ C, bloom }) {
  const { x, y, zs, size, photos } = C.lightboxes
  const maps = useTexture(photos)
  for (const m of maps) m.colorSpace = THREE.SRGBColorSpace
  const orange = C.palette.orange
  const halo = useCanvasTexture((c) => {
    c.width = c.height = 256
    const g = c.getContext('2d')
    const o = new THREE.Color(orange)
    const rgb = `${Math.round(o.r * 255)},${Math.round(o.g * 255)},${Math.round(o.b * 255)}`
    const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128)
    grad.addColorStop(0, `rgba(${rgb},0.55)`); grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256)
  }, [orange])
  const [w, h] = size
  const edge = 0.025
  const edges = [[0, h / 2 + edge / 2, w + edge * 2, edge], [0, -h / 2 - edge / 2, w + edge * 2, edge], [w / 2 + edge / 2, 0, edge, h], [-w / 2 - edge / 2, 0, edge, h]]
  return (
    <group>
      {zs.map((z, i) => (
        <group key={z} position={[x, y, z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0, -0.03]} visible={!bloom}>
            <planeGeometry args={[w * 1.9, h * 2.1]} />
            <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[w + 0.08, h + 0.08, 0.06]} />
            <meshStandardMaterial color={C.palette.steel} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={maps[i]} color={C.lightboxes.tint} toneMapped={false} />
          </mesh>
          {edges.map(([ex, ey, ew, eh], k) => (
            <mesh key={k} position={[ex, ey, 0.034]} ref={bloom ? onBloomLayer : undefined}>
              <planeGeometry args={[ew, eh]} />
              <meshBasicMaterial color={orange} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Istanze a partire da una lista di matrici: una draw call per tutta la lista. */
function Instances({ matrices, children, castShadow = true, receiveShadow = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current.setMatrixAt(i, m))
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [matrices])
  return (
    <instancedMesh ref={ref} args={[null, null, matrices.length]} castShadow={castShadow} receiveShadow={receiveShadow}>
      {children}
    </instancedMesh>
  )
}

const matrixOf = (position, rotation) => {
  const o = new THREE.Object3D()
  o.position.set(...position)
  o.rotation.set(...rotation)
  o.updateMatrix()
  return o.matrix.clone()
}

/** Blocchi di cemento sparsi: [x, z, rotazione]. */
function LooseBlocks({ C }) {
  const { size, color, items } = C.blocks
  const matrices = useMemo(() => items.map(([x, z, r]) => matrixOf([x, size[1] / 2, z], [0, r, 0])), [items, size])
  return (
    <Instances matrices={matrices} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </Instances>
  )
}

/** Catene di contorno: appese al soffitto e una a terra, una sola InstancedMesh. */
function Chains({ C }) {
  const { link, color } = C.chain
  const matrices = useMemo(() => {
    const list = []
    for (const c of C.chains) {
      const n = Math.round(c.length / link)
      for (let i = 0; i < n; i++) list.push(matrixOf([c.from[0], c.from[1] - i * link, c.from[2]], [0, i % 2 ? Math.PI / 2 : 0, 0]))
    }
    const { from, to, sag } = C.floorChain
    const n = Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / link)
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const bend = Math.sin(t * Math.PI) * sag
      const px = from[0] + (to[0] - from[0]) * t - bend * Math.sin(ang)
      const pz = from[1] + (to[1] - from[1]) * t + bend * Math.cos(ang)
      list.push(matrixOf([px, 0.012, pz], [i % 2 ? 0 : Math.PI / 2, -ang, Math.PI / 2]))
    }
    return list
  }, [C.chains, C.floorChain, link])
  return (
    <Instances matrices={matrices}>
      <torusGeometry args={[0.04, 0.009, 6, 12]} />
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
    </Instances>
  )
}

function Cone({ position, color }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.39, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.17, 0.7, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.083, 0.1, 0.1, 24, 1, true]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.4} />
      </mesh>
    </group>
  )
}

function Sign({ sign }) {
  const map = useTexture(sign.url)
  map.colorSpace = THREE.SRGBColorSpace
  return (
    <group position={sign.center} rotation={[sign.tilt, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[sign.size[0], sign.size[1], 0.012]} />
        <meshStandardMaterial color="#bdbab2" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.007]}>
        <planeGeometry args={sign.size} />
        <meshStandardMaterial map={map} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

/** Tubi a soffitto: cilindri da un punto all'altro. */
function Pipes({ pipes, color }) {
  return (
    <group>
      {pipes.map((p, i) => {
        const a = new THREE.Vector3(...p.from)
        const b = new THREE.Vector3(...p.to)
        const dir = b.clone().sub(a)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
        return (
          <mesh key={i} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q}>
            <cylinderGeometry args={[p.radius, p.radius, dir.length(), 12]} />
            <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function CantiereRoom({ environment, bloom = false }) {
  const C = environment.cantiere
  const [W, D] = environment.floor.size
  const H = environment.ceiling.height
  return (
    <group>
      <Shell W={W} D={D} H={H} C={C} />
      <FloorBox box={C.floorBox} color={C.palette.orange} />
      <Neon C={C} bloom={bloom} />
      <Posters C={C} />
      <Lightboxes C={C} bloom={bloom} />
      <LooseBlocks C={C} />
      <Chains C={C} />
      <Cone position={C.cone} color={C.palette.orange} />
      <Sign sign={C.sign} />
      <Pipes pipes={C.pipes} color={C.palette.pipe} />
    </group>
  )
}
