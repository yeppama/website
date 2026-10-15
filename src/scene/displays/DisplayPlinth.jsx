import { useMat, useFabric, Cord } from './parts.jsx'

/**
 * Plinto: blocco in cemento con piano in acciaio e i capi piegati in pile.
 * Le pile sono distribuite lungo X; la pila del prodotto attivo in Focus Mode
 * riceve il marcatore.
 */
const H = 0.9
const W = 1.2

function FoldedStack({ product, garments, materials, x }) {
  const fabric = useFabric(product, garments, materials)
  const layers = 3
  return (
    <group position={[x, H + 0.02, 0]}>
      {Array.from({ length: layers }, (_, i) => (
        <mesh key={i} position={[(i % 2) * 0.012, 0.03 + i * 0.052, (i % 2) * -0.01]} rotation={[0, (i - 1) * 0.04, 0]}
          material={fabric} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.05, 0.31]} />
        </mesh>
      ))}
      {garments.shapeByCategory[product.category] === 'bottom' && (
        <Cord position={[0.12, 0.03 + layers * 0.052, 0.155]} length={0.12} spread={0.03} color={garments.cordColor} />
      )}
    </group>
  )
}

const slotX = (count, i) => (count === 1 ? 0 : -W / 4 + (i * W) / 2 / Math.max(1, count - 1))

/** Dove sta il marcatore del prodotto attivo, nello spazio dell'espositore. */
export const plinthMarker = (count, i) => [slotX(count, i), H + 0.27, 0]

export default function DisplayPlinth({ display, products, garments, materials }) {
  const body = useMat(display.materialIds.body, materials)
  const plate = useMat('mat-steel-dark', materials)
  const slots = products.map((_, i) => slotX(products.length, i))

  return (
    <group>
      <mesh position={[0, H / 2, 0]} material={body} castShadow receiveShadow>
        <boxGeometry args={[W, H, W]} />
      </mesh>
      <mesh position={[0, H + 0.01, 0]} material={plate} castShadow receiveShadow>
        <boxGeometry args={[W + 0.02, 0.02, W + 0.02]} />
      </mesh>
      {products.map((p, i) => (
        <FoldedStack key={p.id} product={p} garments={garments} materials={materials} x={slots[i]} />
      ))}
    </group>
  )
}
