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
    <nav aria-label={storeConfig.copy.hud.quickTravel} className="pointer-events-auto -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-px bg-line-subtle" style={{ minWidth: 'max-content' }}>
        {quickTravel.map((qt) => {
          const here = Boolean(zoneId) && qt.zoneId === zoneId
          return (
            <li key={qt.id}>
              <button
                type="button"
                onClick={() => issue({ type: 'teleport', waypointId: qt.waypointId })}
                className={`whitespace-nowrap bg-bg-base/85 px-4 font-display font-bold uppercase backdrop-blur-sm ${here ? 'text-accent-flame' : 'text-text-primary'}`}
                style={{ minHeight: 'var(--touch-min)', fontSize: 'var(--text-xs)', letterSpacing: 'var(--tracking-wide)' }}
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
