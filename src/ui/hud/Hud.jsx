import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import Minimap from './Minimap.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Interfaccia sovrapposta alla scena. `pointer-events-none` sul contenitore e
 * `auto` solo sugli elementi interattivi: in Fase 3 il resto dello schermo deve
 * restare libero per il Pointer Lock e per il tap-to-move.
 */
export default function Hud({ device }) {
  const { brand } = storeConfig.meta
  const copy = storeConfig.copy.hud
  const menuOpen = useAppStore((s) => s.menuOpen)
  const toggleMenu = useAppStore((s) => s.toggleMenu)
  const activeZoneId = useAppStore((s) => s.activeZoneId)
  const activeShotId = useAppStore((s) => s.activeShotId)
  const shot = storeConfig.camera.shots.find((x) => x.id === activeShotId)

  return (
    <div className="pointer-events-none fixed inset-0 p-4 sm:p-6" style={{ zIndex: 'var(--z-hud)' }}>
      <div className="flex h-full flex-col justify-between">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display font-black uppercase leading-none text-text-primary"
               style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-brutal)' }}>
              {brand.wordmark}
            </p>
            <p className="micro mt-1">{shot ? shot.label : brand.descriptor}</p>
          </div>

          <div className="pointer-events-auto">
            <Button onClick={toggleMenu} aria-expanded={menuOpen} aria-controls="menu-drawer">
              {menuOpen ? copy.close : copy.menu}
            </Button>
          </div>
        </header>

        <footer className="flex items-end justify-between gap-4">
          <Minimap activeZoneId={activeZoneId} />
          <div className="text-right">
            <p className="micro">{device.isTouch ? 'touch' : 'puntatore'} · tier {device.tier}</p>
            <p className="micro mt-1">{brand.origin.coords}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
