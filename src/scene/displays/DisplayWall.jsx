import { useMat, FlatGarment } from './parts.jsx'

/**
 * Vetrina a parete: un fondale chiaro incorniciato — il mondo "studio" del
 * brand portato sul muro — con un solo capo appeso piatto e una mensola.
 */
const W = 2.0
const H = 2.4
const BOTTOM = 0.25

export default function DisplayWall({ display, products, garments, materials }) {
  const panel = useMat(display.materialIds.panel, materials)
  const frame = useMat(display.materialIds.frame, materials)
  const product = products[0]
  const isBottom = garments.shapeByCategory[product.category] === 'bottom'

  return (
    <group position={[0, 0, -0.1]}>
      <mesh position={[0, BOTTOM + H / 2, 0]} material={panel} receiveShadow>
        <boxGeometry args={[W, H, 0.04]} />
      </mesh>
      {[[0, BOTTOM + H, W + 0.06, 0.03], [0, BOTTOM, W + 0.06, 0.03]].map(([x, y, w, h], i) => (
        <mesh key={`h${i}`} position={[x, y, 0.03]} material={frame} castShadow>
          <boxGeometry args={[w, h, 0.05]} />
        </mesh>
      ))}
      {[-W / 2 - 0.015, W / 2 + 0.015].map((x) => (
        <mesh key={x} position={[x, BOTTOM + H / 2, 0.03]} material={frame} castShadow>
          <boxGeometry args={[0.03, H + 0.03, 0.05]} />
        </mesh>
      ))}
      <mesh position={[0, BOTTOM + 0.42, 0.14]} material={frame} castShadow receiveShadow>
        <boxGeometry args={[W * 0.7, 0.025, 0.24]} />
      </mesh>
      <FlatGarment
        product={product} garments={garments} materials={materials}
        position={[0, isBottom ? BOTTOM + 1.25 : BOTTOM + 1.45, 0.08]} rotation={[0, 0, 0]}
      />
    </group>
  )
}
