import { storeConfig } from '../../config/storeConfig.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'

/**
 * Barra di teletrasporto (mobile). Solo destinazioni sicure configurate in
 * navigation.quickTravel: il config garantisce che siano `safeForTeleport` (I8)
 * e il controller lo ricontrolla prima di spostare il player.
 */
export default function QuickTravelBar() {
  const issue = usePlayerStore((s) => s.issue)
  const zoneId = usePlayerStore((s) => s.zoneId)
  const { quickTravel } = storeConfig.navigation

  return (
    // Colonne uguali che riempiono la larghezza: una voce tagliata dal bordo
    // dello schermo sembra un errore anche se la barra scorre.
    <nav aria-label={storeConfig.copy.hud.quickTravel} className="pointer-events-auto">
      <ul className="grid gap-px bg-line-subtle" style={{ gridTemplateColumns: `repeat(${quickTravel.length}, minmax(0, 1fr))` }}>
        {quickTravel.map((qt) => {
          const here = Boolean(zoneId) && qt.zoneId === zoneId
          return (
            <li key={qt.id} className="flex">
              <button
                type="button"
                onClick={() => issue({ type: 'teleport', waypointId: qt.waypointId })}
                className={`h-full w-full bg-bg-base/85 px-1 py-2 text-center font-display font-bold uppercase leading-tight backdrop-blur-sm ${here ? 'text-accent-flame' : 'text-text-primary'}`}
                // Il corpo scala con la larghezza: a 320 px una parola sola come
                // LOOKBOOK deve ancora entrare. Mai sotto 9 px.
                style={{ minHeight: 'var(--touch-min)', fontSize: 'clamp(0.5625rem, 2.7vw, var(--text-xs))', letterSpacing: '0.02em' }}
              >
                {qt.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
