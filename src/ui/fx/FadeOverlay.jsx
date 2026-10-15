import { storeConfig } from '../../config/storeConfig.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'

/** Dissolvenza a nero del teletrasporto: evita il disorientamento di un salto secco. */
export default function FadeOverlay() {
  const fading = usePlayerStore((s) => s.fading)
  return (
    <div
      className="pointer-events-none fixed inset-0 bg-bg-base"
      style={{
        zIndex: 'var(--z-quickTravel)',
        opacity: fading ? 1 : 0,
        transition: `opacity ${storeConfig.navigation.teleport.fadeMs}ms ease`,
      }}
      aria-hidden="true"
    />
  )
}
