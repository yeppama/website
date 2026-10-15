import { useMat, FlatGarment } from './parts.jsx'

/**
 * Rack a parete: due montanti, traversa, piedi. I capi sono appesi "face-out",
 * rivolti verso la sala (+z locale), ciascuno con una seconda copia dietro che
 * suggerisce lo stock.
 */
const L = 2.2
const H = 1.75

function Hanger({ x, material }) {
  return (
    <group position={[x, H - 0.02, 0.02]}>
      <mesh position={[0, 0.045, 0]} material={material}>
        <torusGeometry args={[0.025, 0.004, 6, 16, Math.PI * 1.4]} />
      </mesh>
      <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <cylinderGeometry args={[0.005, 0.005, 0.44, 6]} />
      </mesh>
    </group>
  )
}

const slotX = (count, i) => -L / 2 + (L * (i + 0.5)) / count

/** Dove sta il marcatore del prodotto attivo, nello spazio dell'espositore. */
export const rackMarker = (count, i) => [slotX(count, i), H + 0.18, 0.05]

export default function DisplayRack({ display, products, garments, materials }) {
  const frame = useMat(display.materialIds.frame, materials)
  const slots = products.map((_, i) => slotX(products.length, i))

  return (
    <group>
      {[-L / 2, L / 2].map((x) => (
        <group key={x}>
          <mesh position={[x, H / 2, 0]} material={frame} castShadow>
            <boxGeometry args={[0.035, H, 0.035]} />
          </mesh>
          <mesh position={[x, 0.015, 0]} material={frame} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.03, 0.45]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} material={frame} castShadow>
        <cylinderGeometry args={[0.014, 0.014, L + 0.04, 10]} />
      </mesh>

      {products.map((p, i) => (
        <group key={p.id}>
          <Hanger x={slots[i]} material={frame} />
          <FlatGarment product={p} garments={garments} materials={materials} position={[slots[i] + 0.03, H - 0.42, -0.06]} rotation={[0, 0.02, 0]} />
          <FlatGarment product={p} garments={garments} materials={materials} position={[slots[i], H - 0.4, 0.03]} rotation={[0, 0, 0]} />
        </group>
      ))}
    </group>
  )
}
