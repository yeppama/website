import { useAppStore } from '../../state/useAppStore.js'
import MergeByMaterial from '../MergeByMaterial.jsx'
import { ActiveMarker } from './parts.jsx'
import DisplayMannequin from './DisplayMannequin.jsx'
import DisplayPlinth, { plinthMarker } from './DisplayPlinth.jsx'
import DisplayRack, { rackMarker } from './DisplayRack.jsx'
import DisplayWall from './DisplayWall.jsx'
import DisplayPipeRack, { pipeRackMarker } from './DisplayPipeRack.jsx'
import DisplayChain from './DisplayChain.jsx'
import DisplayBlockTable, { blockTableMarker } from './DisplayBlockTable.jsx'

const BY_KIND = {
  mannequin: DisplayMannequin, plinth: DisplayPlinth, rack: DisplayRack, wall: DisplayWall,
  pipeRack: DisplayPipeRack, chain: DisplayChain, blockTable: DisplayBlockTable,
}
// Solo gli espositori con più prodotti hanno bisogno di indicare quale è attivo.
const MARKER = { plinth: plinthMarker, rack: rackMarker, pipeRack: pipeRackMarker, blockTable: blockTableMarker }
// Espositori con capi 3D caricati o anelli e blocchi in istanza: l'unione delle geometrie
// li spezzerebbe (le istanze diventerebbero una sola, i GLB arrivano dopo).
const NO_MERGE = new Set(['pipeRack', 'chain', 'blockTable'])

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
      ? MARKER[d.kind](d.productIds.length, active, d)
      : null
    return (
      <group key={d.id} position={d.position} rotation={[0, d.rotationY, 0]}>
        <MergeByMaterial enabled={merge && !NO_MERGE.has(d.kind)}>
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
