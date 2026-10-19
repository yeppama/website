import MergeByMaterial from '../MergeByMaterial.jsx'
import { useMat } from '../displays/parts.jsx'

/**
 * Arredi senza capi (fase C, 2026-10-19: cassa, panca), da `environment.props`: blocchi con un
 * piano superiore facoltativo, uniti per materiale. Le collisioni restano sui box di `colliders`.
 * Voce: { id, center: [x, y, z] (y = metà altezza), size: [w, h, d], rotationY, materialId, top?: { materialId, thickness } }
 */
function Prop({ prop, materials }) {
  const body = useMat(prop.materialId, materials)
  const top = useMat(prop.top?.materialId ?? prop.materialId, materials)
  const [w, h, d] = prop.size
  const t = prop.top?.thickness ?? 0
  return (
    <group position={prop.center} rotation={[0, prop.rotationY ?? 0, 0]}>
      <mesh position={[0, -t / 2, 0]} material={body} castShadow receiveShadow>
        <boxGeometry args={[w, h - t, d]} />
      </mesh>
      {t > 0 && (
        <mesh position={[0, h / 2 - t / 2, 0]} material={top} castShadow receiveShadow>
          <boxGeometry args={[w + 0.04, t, d + 0.04]} />
        </mesh>
      )}
    </group>
  )
}

export default function Props({ props, materials }) {
  if (!props?.length) return null
  return (
    <MergeByMaterial>
      {props.map((p) => <Prop key={p.id} prop={p} materials={materials} />)}
    </MergeByMaterial>
  )
}
