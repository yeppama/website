import ConfigBox from './ConfigBox.jsx'
import MergeByMaterial from '../MergeByMaterial.jsx'

/**
 * Elementi architettonici della Fase 2, tutti da storeConfig.environment:
 * colonne, pedane "studio", binari a soffitto, architrave e soglia d'ingresso.
 * La collisione di questi oggetti NON è derivata da qui: vive in `colliders`.
 */
export default function Architecture({ environment, materials, merge = true }) {
  const { architecture: arch, entrance, ceiling } = environment
  const trackY = ceiling.height - arch.trackSection / 2 - 0.08

  return (
    <MergeByMaterial enabled={merge}>
      {arch.columns.map((c) => (
        <ConfigBox
          key={c.id}
          center={[c.position[0], c.size[1] / 2, c.position[2]]}
          size={c.size}
          materialId={c.materialId}
          materials={materials}
          castShadow
        />
      ))}

      {arch.platforms.map((p) => (
        <ConfigBox key={p.id} center={p.center} size={p.size} materialId={p.materialId} materials={materials} />
      ))}

      {arch.ceilingTracks.map((t) => {
        const [x0, z0] = t.from
        const [x1, z1] = t.to
        const length = Math.hypot(x1 - x0, z1 - z0)
        return (
          <ConfigBox
            key={t.id}
            center={[(x0 + x1) / 2, trackY, (z0 + z1) / 2]}
            size={[arch.trackSection, arch.trackSection, length]}
            rotationY={Math.atan2(x1 - x0, z1 - z0)}
            materialId={t.materialId}
            materials={materials}
            receiveShadow={false}
          />
        )
      })}

      {entrance.lintel && <ConfigBox {...entrance.lintel} materials={materials} />}
      {entrance.threshold && <ConfigBox {...entrance.threshold} materials={materials} />}
      {entrance.exteriorGlow && (
        <mesh position={entrance.exteriorGlow.center} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={entrance.exteriorGlow.size} />
          <meshBasicMaterial color={entrance.exteriorGlow.color} transparent opacity={entrance.exteriorGlow.intensity} />
        </mesh>
      )}
    </MergeByMaterial>
  )
}
