import { storeConfig } from '../../config/storeConfig.js'
import AlertOverlay from './AlertOverlay.jsx'

/**
 * Il contesto WebGL è andato perso. Se il browser lo restituisce da solo la
 * scena si rimonta senza intervento; altrimenti "Riprova" ne chiede uno nuovo.
 * In entrambi i casi il player riparte dalla posa in cui era.
 */
export default function ContextLostOverlay({ onRetry }) {
  const copy = storeConfig.copy.errors.contextLost
  return (
    <AlertOverlay id="ctx-lost" title={copy.title} body={copy.body}
                  retryLabel={copy.retry} onRetry={onRetry} />
  )
}
