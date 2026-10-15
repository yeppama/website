import { useEffect, useState } from 'react'
import { tokens } from '../../config/designTokens.js'
import { whenFontsReady, makeFloorLabel } from '../../lib/canvasText.js'

/**
 * Marcature tecniche a pavimento sul bordo anteriore di ogni zona che le richiede.
 * È il micro-testo del brand usato come segnaletica: numero, nome, identificativo.
 */
export default function FloorLabels({ zones }) {
  const [labels, setLabels] = useState([])

  useEffect(() => {
    let alive = true
    whenFontsReady().then(() => {
      if (!alive) return
      setLabels(zones.map((zone, i) => ({ zone, index: i + 1 })).filter(({ zone }) => zone.floorLabel).map(({ zone, index }) => {
        const [[x0, z0], [x1, z1]] = zone.bounds
        return {
          id: zone.id,
          // Centrata sul bordo della zona verso l'ingresso, leggibile da chi entra.
          position: [(x0 + x1) / 2, 0.004, Math.max(z0, z1) - 0.6],
          texture: makeFloorLabel({
            index, label: zone.label, id: zone.id,
            accentColor: tokens.color.accent.flame, textColor: tokens.color.text.primary,
          }),
        }
      }))
    })
    return () => { alive = false }
  }, [zones])

  return (
    <group>
      {labels.map((l) => (
        <mesh key={l.id} position={l.position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.6, 0.9]} />
          <meshStandardMaterial
            map={l.texture} transparent depthWrite={false}
            emissive="#ffffff" emissiveMap={l.texture} emissiveIntensity={0.28}
            polygonOffset polygonOffsetFactor={-2} roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}
