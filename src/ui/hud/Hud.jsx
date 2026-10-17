import { storeConfig } from '../../config/storeConfig.js'
import { brandMotif } from '../../config/designTokens.js'
import { useAppStore } from '../../state/useAppStore.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import Minimap from './Minimap.jsx'
import QuickTravelBar from './QuickTravelBar.jsx'
import Button from '../primitives/Button.jsx'
import CartButton from '../cart/CartButton.jsx'
import { commerceActive } from '../../commerce/index.js'

/**
 * Interfaccia sovrapposta alla scena. `pointer-events-none` sul contenitore e
 * `auto` solo sugli elementi interattivi: il resto dello schermo resta libero
 * per il Pointer Lock (desktop) e per tap e trascinamento (mobile).
 */
function Crosshair() {
  const w = 18
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
      <div style={{
        width: w, height: w / brandMotif.oval.ratio * 1.6,
        border: '1.5px solid var(--color-text-primary)', borderRadius: '50%', opacity: 0.85,
      }} />
    </div>
  )
}

function LockPrompt() {
  const copy = storeConfig.copy.hud
  return (
    <div className="pointer-events-none flex justify-center">
      <div className="border border-line-strong bg-bg-base/75 px-5 py-3 text-center backdrop-blur-sm">
        <p className="font-display font-bold uppercase text-text-primary"
           style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
          {copy.lockPrompt}
        </p>
        <p className="micro mt-1">{copy.lockPromptSub}</p>
      </div>
    </div>
  )
}

/**
 * Il capo (o la Brand Story) più vicino. È un bottone: si apre da qui anche quando
 * l'espositore è alle spalle o fuori dall'inquadratura, per esempio da dietro un
 * manichino. Con il cursore catturato basta un click ovunque, come prima.
 */
function ProximityPrompt({ poi, isTouch }) {
  const { features, copy } = storeConfig
  const feature = poi.requires ? features[poi.requires] : null
  const locked = feature && !feature.enabled
  const issue = usePlayerStore((s) => s.issue)
  return (
    <div className="pointer-events-none flex justify-center" role="status" aria-live="polite">
      <button type="button" disabled={locked} onClick={() => issue({ type: 'activate', poiId: poi.id })}
              data-testid="proximity-prompt"
              className="pointer-events-auto flex items-center gap-3 border border-line-strong bg-bg-base/80 px-4 py-2 text-left backdrop-blur-sm transition-colors hover:border-accent-flame disabled:cursor-default"
              style={{ minHeight: 'var(--touch-min)' }}>
        <span className="micro" style={{ color: 'var(--color-accent-flame)' }}>●</span>
        <span className="font-display font-bold uppercase text-text-primary"
              style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
          {poi.label}
        </span>
        <span className="micro">
          {locked ? copy.hints.notAvailable : (isTouch ? poi.prompt.mobile : poi.prompt.desktop)}
        </span>
      </button>
    </div>
  )
}

export default function Hud({ device }) {
  const { brand } = storeConfig.meta
  const copy = storeConfig.copy.hud
  const menuOpen = useAppStore((s) => s.menuOpen)
  const toggleMenu = useAppStore((s) => s.toggleMenu)
  const zoneId = usePlayerStore((s) => s.zoneId)
  const locked = usePlayerStore((s) => s.pointerLocked)
  const activePoiId = usePlayerStore((s) => s.activePoiId)
  const inFocus = useAppStore((s) => s.focus.state !== 'idle')
  // Mirino e invito a catturare il cursore solo con "tastiera e mouse".
  const controlMode = useAppStore((s) => s.controlMode)
  const keyboard = !device.isTouch && controlMode === 'keyboard'

  const zone = storeConfig.environment.zones.find((z) => z.id === zoneId)
  const poi = storeConfig.pois.find((p) => p.id === activePoiId)

  return (
    <>
      {keyboard && locked && !inFocus && <Crosshair />}

      <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-4 sm:p-6" style={{ zIndex: 'var(--z-hud)' }}>
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display font-black uppercase leading-none text-text-primary"
               style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-brutal)' }}>
              {brand.wordmark}
            </p>
            <p className="micro mt-1" data-testid="zone-label">{zone ? zone.label : copy.noZone}</p>
          </div>
          <div className={`pointer-events-auto flex gap-2 ${inFocus ? 'invisible' : ''}`}>
            {commerceActive() && <CartButton />}
            <Button onClick={toggleMenu} aria-expanded={menuOpen} aria-controls="menu-drawer">
              {menuOpen ? copy.close : copy.menu}
            </Button>
          </div>
        </header>

        <footer className={`flex flex-col gap-3 ${inFocus ? 'invisible' : ''}`}>
          {/* Prompt impilati nella stessa colonna: non possono sovrapporsi a
              nessuna altezza di schermo, qualunque sia la taglia della minimappa. */}
          {poi && <ProximityPrompt poi={poi} isTouch={device.isTouch} />}
          {keyboard && !locked && !menuOpen && <LockPrompt />}
          <div className="flex items-end justify-between gap-4">
            <Minimap />
            <div className="text-right">
              <p className="micro">{device.isTouch ? copy.inputTouch : copy.inputPointer} · {copy.tier} {device.tier}</p>
              <p className="micro mt-1">{brand.origin.coords}</p>
            </div>
          </div>
          {device.isTouch && <QuickTravelBar />}
        </footer>
      </div>
    </>
  )
}
