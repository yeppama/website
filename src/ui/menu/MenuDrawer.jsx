import { useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { formatPrice } from '../../lib/format.js'
import { useAppStore } from '../../state/useAppStore.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import { useFocusTrap } from '../primitives/useFocusTrap.js'
import PlaceholderImage from '../primitives/PlaceholderImage.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Menu a tendina. Contenuto generato da storeConfig: zone, capi, brand.
 * Chiusura con Esc, focus trattenuto nel pannello e riportato sull'elemento che
 * l'ha aperto. Capi e Brand Story aprono le loro schede sopra il menu: chiuse
 * quelle, si torna qui.
 */
export default function MenuDrawer() {
  const open = useAppStore((s) => s.menuOpen)
  const close = useAppStore((s) => s.closeMenu)
  const issue = usePlayerStore((s) => s.issue)
  const zoneId = usePlayerStore((s) => s.zoneId)
  const openDialog = useAppStore((s) => s.openDialog)
  const panel = useRef(null)

  useFocusTrap(panel, open, close)

  if (!open) return null

  const { brand } = storeConfig.meta
  const { quickTravel } = storeConfig.navigation
  const menu = storeConfig.copy.menu
  const { features } = storeConfig
  const lookbook = storeConfig.lookbook.find((l) => l.id === storeConfig.environment.brandWall.panel.lookbookId)

  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
      <button
        className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm"
        onClick={close}
        aria-label="Chiudi menu"
        tabIndex={-1}
      />
      <aside
        id="menu-drawer"
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={menu.title}
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line-subtle bg-bg-raised p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="micro">{menu.title}</p>
          {/* Il bottone del HUD resta sotto il pannello: senza questo, l'unico
              modo di chiudere sarebbe Esc o il fondo, non evidenti su touch. */}
          <Button onClick={close}>{storeConfig.copy.hud.close}</Button>
        </div>

        <section className="mt-8">
          <h3 className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[0].label}
          </h3>
          {/* Teletrasporto verso le destinazioni sicure configurate (Fase 3). */}
          <ul className="grid gap-px bg-line-subtle">
            {quickTravel.map((qt, i) => {
              const here = Boolean(zoneId) && qt.zoneId === zoneId
              return (
                <li key={qt.id}>
                  <button
                    type="button"
                    onClick={() => { issue({ type: 'teleport', waypointId: qt.waypointId }); close() }}
                    aria-current={here ? 'true' : undefined}
                    className="flex w-full items-center justify-between gap-3 bg-bg-raised px-3 py-3 text-left transition-colors hover:bg-surface-2"
                    style={{ minHeight: 'var(--touch-min)' }}
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="micro" style={{ color: here ? 'var(--color-accent-flame)' : undefined }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`font-display font-bold uppercase ${here ? 'text-accent-flame' : 'text-text-primary'}`}
                            style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
                        {qt.label}
                      </span>
                    </span>
                    <span className="micro">{here ? '● sei qui' : qt.waypointId}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h3 className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[1].label}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {storeConfig.products.map((product) => (
              <article key={product.id}>
                <button type="button" className="group block w-full text-left"
                        disabled={!features.productModal.enabled}
                        onClick={() => openDialog('product', product.id)}>
                  <PlaceholderImage
                    ratio={product.media[0].ratio}
                    variant={product.media[0].variant}
                    label={product.media[0].label}
                    category={product.category}
                    seed={product.id}
                  />
                  <span className="mt-2 block font-display font-bold uppercase text-text-primary group-hover:text-accent-flame"
                        style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)' }}>
                    {product.name}
                  </span>
                  <span className="micro mt-0.5 block">
                    {product.sku} · {formatPrice(product.price, brand.locale)}
                  </span>
                </button>
              </article>
            ))}
          </div>
          <p className="micro mt-4">{storeConfig.copy.legal.priceNotice}</p>
        </section>

        <section className="mt-10">
          <h3 className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[2].label}
          </h3>
          <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{brand.tagline}</p>
          <div className="rule my-4" />
          <p className="micro">{brand.origin.city}, {brand.origin.country} · {brand.origin.coords}</p>
          <p className="micro mt-1">{brand.credit}</p>
          {features.lookbook.enabled && lookbook && (
            <Button className="mt-5" onClick={() => openDialog('lookbook', lookbook.id)}>
              {storeConfig.copy.lookbook.open} →
            </Button>
          )}
        </section>
      </aside>
    </div>
  )
}
