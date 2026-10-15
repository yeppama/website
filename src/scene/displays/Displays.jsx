import { useAppStore } from '../../state/useAppStore.js'
import MergeByMaterial from '../MergeByMaterial.jsx'
import { ActiveMarker } from './parts.jsx'
import DisplayMannequin from './DisplayMannequin.jsx'
import DisplayPlinth, { plinthMarker } from './DisplayPlinth.jsx'
import DisplayRack, { rackMarker } from './DisplayRack.jsx'
import DisplayWall from './DisplayWall.jsx'

const BY_KIND = { mannequin: DisplayMannequin, plinth: DisplayPlinth, rack: DisplayRack, wall: DisplayWall }
// Solo gli espositori con più prodotti hanno bisogno di indicare quale è attivo.
const MARKER = { plinth: plinthMarker, rack: rackMarker }

/**
 * Tutti gli espositori di storeConfig.displays, ciascuno disegnato dal
 * componente del suo `kind`. Posizione e rotazione vengono dal config; il
 * componente conosce solo la propria forma, mai il proprio posto nel negozio.
 */
export default function Displays({ config, merge = true }) {
  const focus = useAppStore((s) => s.focus)
  const productById = new Map(config.products.map((p) => [p.id, p]))

  return config.displays.map((d) => {
    const Component = BY_KIND[d.kind]
    const active = focus.state !== 'idle' && focus.displayId === d.id ? focus.productIndex : null
    const marker = MARKER[d.kind] && active !== null && d.productIds.length > 1
      ? MARKER[d.kind](d.productIds.length, active)
      : null
    return (
      <group key={d.id} position={d.position} rotation={[0, d.rotationY, 0]}>
        <MergeByMaterial enabled={merge}>
          <Component
            display={d}
            products={d.productIds.map((id) => productById.get(id))}
            garments={config.garments}
            materials={config.lighting.materials}
          />
        </MergeByMaterial>
        {marker && <ActiveMarker position={marker} color={config.navigation.hotspot.color} />}
      </group>
    )
  })
}
