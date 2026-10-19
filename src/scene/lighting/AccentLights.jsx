import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BLOOM_LAYER } from './SelectiveBloom.jsx'

/**
 * Punti luce arancioni (richiesta dell'utente, 2026-10-19: "sembrano troppo cupi"), da
 * `environment.accentLights` di ciascun allestimento. Ogni voce è una barra LED che si illumina
 * da sola (nessun costo di luce) con un alone finto sul muro dietro. Solo le voci con `light`
 * accendono anche una luce vera, fino a `tier.maxAccentLights` (tier low: nessuna): ogni luce
 * in più pesa su ogni pixel di ogni superficie. Le luci vere stanno lontane dai capi: il colore
 * saturo va sulle pareti, non sui prodotti (docs/LEZIONI.md, Rendering).
 *
 * Tutte le barre sono una sola mesh e tutti gli aloni un'altra: 2 draw call qualunque sia il
 * numero di voci (misurato: una mesh per voce aggiungeva fino a 12 draw call nel negozio).
 * Con il Bloom vero (cantiere su GPU dedicata) le barre vanno sul suo layer e l'alone finto sparisce.
 * Voce: { id, center: [x, y, z], length, axis: 'x' | 'y' | 'z', facing: [nx, 0, nz],
 *         thickness?, haloSpread?, light?: { intensity, distance } }
 */
const Z = new THREE.Vector3(0, 0, 1)

function useHaloTexture(color) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const o = new THREE.Color(color)
    const rgb = `${Math.round(o.r * 255)},${Math.round(o.g * 255)},${Math.round(o.b * 255)}`
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    grad.addColorStop(0, `rgba(${rgb},0.75)`); grad.addColorStop(0.35, `rgba(${rgb},0.3)`); grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [color])
  useLayoutEffect(() => () => tex.dispose(), [tex])
  return tex
}

/** Geometrie unite di barre e aloni, nello spazio del mondo. */
function buildGeometries(items, style) {
  const bars = []
  const halos = []
  const m = new THREE.Matrix4()
  for (const it of items) {
    const t = it.thickness ?? style.thickness
    const spread = it.haloSpread ?? style.haloSpread
    const facing = new THREE.Vector3(...it.facing).normalize()
    const [x, y, z] = it.center
    const box = it.axis === 'x' ? [it.length, t, t] : it.axis === 'y' ? [t, it.length, t] : [t, t, it.length]
    bars.push(new THREE.BoxGeometry(...box).toNonIndexed().translate(x, y, z))
    // Alone: sul muro, appena dietro la barra, più largo della barra; la normale guarda la stanza.
    // Nel piano dell'alone x locale è orizzontale: una barra verticale ha l'alone alto e stretto.
    const along = it.length + spread * 1.2
    const across = spread * 2
    const plane = it.axis === 'y' ? new THREE.PlaneGeometry(across, along) : new THREE.PlaneGeometry(along, across)
    m.compose(
      new THREE.Vector3(x - facing.x * style.haloBack, y, z - facing.z * style.haloBack),
      new THREE.Quaternion().setFromUnitVectors(Z, facing),
      new THREE.Vector3(1, 1, 1),
    )
    halos.push(plane.toNonIndexed().applyMatrix4(m))
  }
  const merge = (list) => {
    const g = mergeGeometries(list, false)
    list.forEach((x) => x.dispose())
    g.computeBoundingSphere()
    return g
  }
  return { bars: merge(bars), halos: merge(halos) }
}

export default function AccentLights({ items, style, tier, bloom = false }) {
  const halo = useHaloTexture(style.color)
  const geometry = useMemo(() => (items.length ? buildGeometries(items, style) : null), [items, style])
  useLayoutEffect(() => () => { geometry?.bars.dispose(); geometry?.halos.dispose() }, [geometry])
  // Le luci vere nell'ordine del config, fino al limite del tier.
  const lit = useMemo(
    () => items.filter((it) => it.light).slice(0, tier.maxAccentLights ?? 0),
    [items, tier.maxAccentLights],
  )
  if (!geometry) return null
  return (
    <group>
      <mesh geometry={geometry.bars} ref={bloom ? (o) => o?.layers.enable(BLOOM_LAYER) : undefined}>
        <meshBasicMaterial color={style.color} toneMapped={false} />
      </mesh>
      {!bloom && (
        <mesh geometry={geometry.halos}>
          <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      {lit.map((it) => {
        const f = new THREE.Vector3(...it.facing).normalize()
        const [x, y, z] = it.center
        return (
          <pointLight key={it.id} position={[x + f.x * style.lightOffset, y, z + f.z * style.lightOffset]}
            color={style.color} intensity={it.light.intensity} distance={it.light.distance} decay={style.lightDecay} />
        )
      })}
    </group>
  )
}
