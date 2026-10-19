import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BLOOM_LAYER } from '../lighting/SelectiveBloom.jsx'
import { useSharedTextures } from '../../lib/sharedTextures.js'

/**
 * Stanza dell'allestimento "cantiere" (docs/cantiere/PIANO.md), tutta da
 * storeConfig.environment.cantiere: cemento con le texture, neon del marchio su rete metallica,
 * poster e adesivi, pannelli luminosi del Lookbook, riquadro di sicurezza a terra, blocchi,
 * catene di contorno, cono, cartello e tubi a soffitto. Gli espositori (rack, catene coi capi,
 * tavolo) sono in scene/displays; binari e corpi illuminanti li disegnano Architecture e
 * LightFixtures, come nel negozio. Le collisioni restano solo sui box di `colliders`.
 *
 * Le texture le carica useSharedTextures (lib/sharedTextures.js): la scena aspetta (Suspense) che
 * ci siano tutte. Le mesh con una texture della cache hanno `dispose={null}` (vedi lì).
 * Con `bloom` (fase 2: Bloom vero, solo GPU dedicata) neon e bordi dei pannelli vanno sul layer
 * del bagliore e l'alone finto disegnato nelle texture sparisce: lo fa SelectiveBloom.
 */
const onBloomLayer = (o) => o?.layers.enable(BLOOM_LAYER)

/**
 * Più pezzi con lo stesso materiale in una geometria sola: una draw call invece di una per pezzo
 * (fase 3, 2026-10-19: il cantiere superava il budget, 66 draw call su 60 nel tier low).
 * `parts`: [{ geometry, position, quaternion?, rotationY? }]. Le geometrie di partenza si liberano.
 */
function useMerged(build, deps) {
  const geometry = useMemo(() => {
    const list = build().map(({ geometry: g, position, quaternion, rotationY = 0 }) => {
      const q = quaternion ?? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...position), q, new THREE.Vector3(1, 1, 1))
      const out = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m)
      g.dispose()
      return out
    })
    const merged = mergeGeometries(list, false)
    list.forEach((g) => g.dispose())
    merged.computeBoundingSphere()
    return merged
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function useTiled(url, repeat) {
  const [tex] = useSharedTextures([url])
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
    <mesh position={center} rotation={[0, rotationY, rotationZ]} receiveShadow dispose={null}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} transparent alphaTest={0.05} roughness={0.95} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  )
}

/** Poster e adesivi: immagini su piani appena staccati dal muro. */
function Posters({ C }) {
  const posterMaps = useSharedTextures(C.posters.map((p) => p.url))
  const stickerMaps = useSharedTextures(C.stickers.map((s) => C.stickerUrl(s.name)))
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
  const maps = useSharedTextures(photos)
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
  // I pannelli guardano −x (rotazione −90°): uno spostamento locale (lx, ly, lz) va nel mondo a
  // (x + lz·sin(−90°)…) — lo fa la matrice di useMerged con la stessa rotazione dei pannelli.
  const rot = -Math.PI / 2
  const at = (z, [lx, ly, lz]) => [x + lz * Math.sin(rot) + lx * Math.cos(rot), y + ly, z + lz * Math.cos(rot) - lx * Math.sin(rot)]
  // Bordi, cornici e aloni dei tre pannelli: una mesh ciascuno invece di 12, 3 e 3.
  const edgeGeo = useMerged(() => zs.flatMap((z) => edges.map(([ex, ey, ew, eh]) => (
    { geometry: new THREE.PlaneGeometry(ew, eh), position: at(z, [ex, ey, 0.034]), rotationY: rot }))), [x, y, zs.join(), w, h])
  const frameGeo = useMerged(() => zs.map((z) => (
    { geometry: new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.06), position: at(z, [0, 0, 0]), rotationY: rot })), [x, y, zs.join(), w, h])
  const haloGeo = useMerged(() => zs.map((z) => (
    { geometry: new THREE.PlaneGeometry(w * 1.9, h * 2.1), position: at(z, [0, 0, -0.03]), rotationY: rot })), [x, y, zs.join(), w, h])
  return (
    <group>
      {!bloom && (
        <mesh geometry={haloGeo}>
          <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      <mesh geometry={frameGeo}>
        <meshStandardMaterial color={C.palette.steel} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh geometry={edgeGeo} ref={bloom ? onBloomLayer : undefined}>
        <meshBasicMaterial color={orange} toneMapped={false} />
      </mesh>
      {zs.map((z, i) => (
        <mesh key={z} position={at(z, [0, 0, 0.032])} rotation={[0, rot, 0]} dispose={null}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={maps[i]} color={C.lightboxes.tint} toneMapped={false} />
        </mesh>
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

/** Catene di contorno: appese al soffitto (e, se c'è, una a terra), una sola InstancedMesh. */
function Chains({ C }) {
  const { link, color } = C.chain
  const matrices = useMemo(() => {
    const list = []
    for (const c of C.chains) {
      const n = Math.round(c.length / link)
      for (let i = 0; i < n; i++) list.push(matrixOf([c.from[0], c.from[1] - i * link, c.from[2]], [0, i % 2 ? Math.PI / 2 : 0, 0]))
    }
    // Catena a terra facoltativa (tolta il 2026-10-19: vista dall'alto sembrava una rete).
    if (!C.floorChain) return list
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

/** Stencil a spruzzo sul pavimento: la scritta con l'ellisse del marchio, bordi sfrangiati. */
function FloorStencil({ stencil, color }) {
  const { text, center, size, rotation, opacity } = stencil
  const tex = useCanvasTexture((c) => {
    const w = 1024
    const h = Math.round((1024 * size[1]) / size[0])
    c.width = w; c.height = h
    const g = c.getContext('2d')
    g.fillStyle = color; g.strokeStyle = color
    g.lineWidth = h * 0.07
    g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.46, h * 0.4, 0, 0, Math.PI * 2); g.stroke()
    g.font = `900 ${Math.round(h * 0.46)}px Archivo, "Arial Black", sans-serif`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + h * 0.03)
    // Spruzzo: puntini attorno, poi la vernice consumata.
    for (let i = 0; i < 900; i++) {
      g.globalAlpha = Math.random() * 0.5
      g.beginPath(); g.arc(w / 2 + (Math.random() - 0.5) * w, h / 2 + (Math.random() - 0.5) * h, Math.random() * 3, 0, Math.PI * 2); g.fill()
    }
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 2200; i++) {
      g.globalAlpha = Math.random() * 0.7
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 2 + Math.random() * 5)
    }
  }, [text, size[0], size[1], color])
  return (
    <mesh position={[center[0], 0.007, center[1]]} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent opacity={opacity} depthWrite={false} roughness={0.7} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/** Nastro da cantiere teso fra due punti: strisce oblique e scritta che si ripetono. */
function CautionTape({ tape }) {
  const { text, width, color, runs } = tape
  const tex = useCanvasTexture((c) => {
    c.width = 1024; c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = color; g.fillRect(0, 0, 1024, 64)
    g.fillStyle = '#111111'
    for (let x = -64; x < 1024; x += 64) {
      g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 56, 0); g.lineTo(x + 32, 0); g.closePath(); g.fill()
    }
    g.fillStyle = color; g.fillRect(150, 10, 724, 44)
    g.fillStyle = '#111111'
    g.font = '800 34px Archivo, "Arial Black", sans-serif'
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text.trim(), 512, 33)
  }, [text, color])
  // Un tratto per segmento, con la sua ripetizione della texture (copie liberate allo smontaggio).
  const pieces = useMemo(() => runs.map((r) => {
    const a = new THREE.Vector3(...r.from)
    const b = new THREE.Vector3(...r.to)
    const len = a.distanceTo(b)
    // Il piano del nastro: lungo il segmento, in verticale, leggermente cadente al centro.
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y -= 0.04
    const yaw = Math.atan2(-(b.z - a.z), b.x - a.x)
    const pitch = Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z))
    const map = tex.clone()
    map.wrapS = THREE.RepeatWrapping
    map.repeat.set(len / (width * 16), 1)
    map.needsUpdate = true
    return { len, mid, yaw, pitch, map }
  }), [runs, tex, width])
  useLayoutEffect(() => () => pieces.forEach((p) => p.map.dispose()), [pieces])
  return (
    <group>
      {pieces.map(({ len, mid, yaw, pitch, map }, i) => {
        return (
          <mesh key={i} position={mid} rotation={[0, yaw, pitch, 'YXZ']}>
            <planeGeometry args={[len, width]} />
            <meshStandardMaterial map={map} side={THREE.DoubleSide} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

// Cono e cartello senza ombra proiettata (fase 3): piccoli, e nel tier medium ogni oggetto che
// proietta ombra si ridisegna una volta per faretto con ombra.
function Cone({ position, color }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
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
  const [map] = useSharedTextures([sign.url])
  return (
    <group position={sign.center} rotation={[sign.tilt, 0, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[sign.size[0], sign.size[1], 0.012]} />
        <meshStandardMaterial color="#bdbab2" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.007]} dispose={null}>
        <planeGeometry args={sign.size} />
        <meshStandardMaterial map={map} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}

/** Tubi a soffitto: cilindri da un punto all'altro. */
function Pipes({ pipes, color }) {
  // Tutti i tubi in una mesh (fase 3: una draw call invece di una per tubo).
  const geometry = useMerged(() => pipes.map((p) => {
    const a = new THREE.Vector3(...p.from)
    const b = new THREE.Vector3(...p.to)
    const dir = b.clone().sub(a)
    return {
      geometry: new THREE.CylinderGeometry(p.radius, p.radius, dir.length(), 12),
      position: a.clone().add(b).multiplyScalar(0.5).toArray(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    }
  }), [pipes])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.9} roughness={0.2} />
    </mesh>
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
      {C.floorStencil && <FloorStencil stencil={C.floorStencil} color={C.palette.orange} />}
      {C.tape && <CautionTape tape={C.tape} />}
      <Sign sign={C.sign} />
      <Pipes pipes={C.pipes} color={C.palette.pipe} />
    </group>
  )
}
