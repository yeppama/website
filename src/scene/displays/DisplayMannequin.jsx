import { getTorsoGeometry, getWornShellGeometry } from '../../lib/garments.js'
import { useMat, useFabric, Cord } from './parts.jsx'

/**
 * Manichino: busto da sartoria su asta e base circolare, con il capo indossato.
 * Il busto è un tornito schiacciato in profondità; testa astratta, senza volto:
 * l'attenzione resta sul capo. Altezza totale ~1,8 m.
 */
const TORSO_BASE = 0.86

export default function DisplayMannequin({ display, products, garments, materials }) {
  const body = useMat(display.materialIds.body, materials)
  const base = useMat(display.materialIds.base, materials)
  const product = products[0]
  const fabric = useFabric(product, garments, materials)
  const isTop = garments.shapeByCategory[product.category] === 'top'

  return (
    <group>
      <mesh position={[0, 0.015, 0]} material={base} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.03, 32]} />
      </mesh>
      <mesh position={[0, TORSO_BASE / 2, 0]} material={base} castShadow>
        <cylinderGeometry args={[0.014, 0.014, TORSO_BASE, 8]} />
      </mesh>

      <group position={[0, TORSO_BASE, 0]} scale={[1, 1, 0.62]}>
        <mesh geometry={getTorsoGeometry()} material={body} castShadow receiveShadow />
        {isTop && <mesh geometry={getWornShellGeometry()} material={fabric} castShadow receiveShadow />}
      </group>

      {/* Maniche: il busto non ha braccia, il capo sì. Pendono leggermente
          aperte dalle spalle, come su un busto da vetrina. */}
      {isTop && [-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.27, TORSO_BASE + 0.34, 0]} rotation={[0, 0, side * 0.16]}
          material={fabric} castShadow receiveShadow>
          <capsuleGeometry args={[0.062, 0.42, 4, 12]} />
        </mesh>
      ))}

      {/* Cappuccio della felpa, adagiato dietro il collo. */}
      {isTop && product.category === 'Hoodie' && (
        <mesh position={[0, TORSO_BASE + 0.66, -0.07]} rotation={[0.5, 0, 0]} scale={[1.05, 0.62, 0.8]}
          material={fabric} castShadow receiveShadow>
          <sphereGeometry args={[0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        </mesh>
      )}

      <mesh position={[0, TORSO_BASE + 0.7, 0]} material={body} castShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.1, 16]} />
      </mesh>
      <mesh position={[0, TORSO_BASE + 0.85, 0]} scale={[0.82, 1.05, 0.9]} material={body} castShadow>
        <sphereGeometry args={[0.1, 24, 16]} />
      </mesh>

      {/* Felpa: i cordini al collo, il dettaglio arancio della reference. */}
      {isTop && product.category === 'Hoodie' && (
        <Cord position={[0, TORSO_BASE + 0.6, 0.11]} length={0.26} spread={0.045} color={garments.cordColor} />
      )}
    </group>
  )
}
