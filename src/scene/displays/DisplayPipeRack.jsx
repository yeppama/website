import { useMat, HangingGarment } from './parts.jsx'

/**
 * Rack di tubi neri (allestimento del cantiere): due montanti, traversa, piedi a terra. I capi
 * pendono dalla traversa rivolti verso +z locale, distribuiti sulla lunghezza `display.length`.
 */
const R = 0.022
const slotX = (length, count, i) => -length / 2 + (length * (i + 0.5)) / count

/** Dove sta il marcatore del prodotto attivo, nello spazio dell'espositore. */
export const pipeRackMarker = (count, i, display) => [slotX(display.length, count, i), display.height + 0.16, 0.05]

export default function DisplayPipeRack({ display, products, garments, materials }) {
  const pipe = useMat(display.materialIds.frame, materials)
  const { length: L, height: H } = display
  const ends = [-L / 2 - 0.2, L / 2 + 0.2]
  return (
    <group>
      {ends.map((x) => (
        <group key={x}>
          <mesh position={[x, H / 2, 0]} material={pipe} castShadow>
            <cylinderGeometry args={[R, R, H, 10]} />
          </mesh>
          <mesh position={[x, 0.02, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={pipe} castShadow>
            <cylinderGeometry args={[R, R, 0.6, 10]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} material={pipe} castShadow>
        <cylinderGeometry args={[R, R, L + 0.44, 10]} />
      </mesh>
      {products.map((p, i) => {
        const x = slotX(L, products.length, i)
        return (
          <group key={p.id}>
            <mesh position={[x, H - 0.06, 0]} rotation={[0, Math.PI / 2, 0]} material={pipe}>
              <torusGeometry args={[0.03, 0.004, 6, 16, Math.PI * 1.3]} />
            </mesh>
            <HangingGarment product={p} garments={garments} materials={materials} position={[x, H - 0.1, 0.02]} rotation={[0, 0, 0]} />
          </group>
        )
      })}
    </group>
  )
}
