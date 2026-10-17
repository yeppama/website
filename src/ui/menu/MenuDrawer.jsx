import { useEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { usePlayerStore } from '../../state/usePlayerStore.js'
import { useLegalStore } from '../../state/useLegalStore.js'
import { useShownPrice } from '../../state/useCartStore.js'
import { useFocusTrap } from '../primitives/useFocusTrap.js'
import CartButton from '../cart/CartButton.jsx'
import { commerceActive } from '../../commerce/index.js'
import MediaImage from '../primitives/MediaImage.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Menu a tendina. Contenuto generato da storeConfig: zone, capi, brand.
 * Chiusura con Esc, focus trattenuto nel pannello e riportato sull'elemento che
 * l'ha aperto. Capi e Brand Story aprono le loro schede sopra il menu: chiuse
 * quelle, si torna qui. Con il commercio attivo, in fondo le pagine legali pubblicate
 * dal venditore (lette dal fornitore all'apertura del menu).
 */
export default function MenuDrawer() {
  const open = useAppStore((s) => s.menuOpen)
  const close = useAppStore((s) => s.closeMenu)
  const issue = usePlayerStore((s) => s.issue)
  const zoneId = usePlayerStore((s) => s.zoneId)
  const openDialog = useAppStore((s) => s.openDialog)
  const panel = useRef(null)
  const legal = useLegalStore()

  useFocusTrap(panel, open, close)
  useEffect(() => { if (open && commerceActive()) legal.load() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const { brand } = storeConfig.meta
  const { zones } = storeConfig.environment
  const { quickTravel } = storeConfig.navigation
  const menu = storeConfig.copy.menu
  const { features } = storeConfig
  const lookbook = storeConfig.lookbook.find((l) => l.id === storeConfig.environment.brandWall.panel.lookbookId)

  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--z-modal)' }}>
      <button
        className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm"
        onClick={close}
        aria-label={menu.closeLabel}
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
          <div className="flex gap-2">
            {commerceActive() && <CartButton />}
            <Button onClick={close}>{storeConfig.copy.hud.close}</Button>
          </div>
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
                    <span className="micro">{here ? `● ${storeConfig.copy.hud.youAreHere}` : qt.waypointId}</span>
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
              <ProductCard key={product.id} product={product} disabled={!features.productModal.enabled}
                           onOpen={() => openDialog('product', product.id)} />
            ))}
          </div>
          {!commerceActive() && <p className="micro mt-4">{storeConfig.copy.legal.priceNotice}</p>}
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

        {commerceActive() && (
          <section className="mt-10" aria-labelledby="menu-legal" data-testid="menu-legal">
            <h3 id="menu-legal" className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
              {menu.sections.find((s) => s.id === 'sec-legal').label}
            </h3>
            {(legal.status === 'idle' || legal.status === 'loading') && <p className="micro">{storeConfig.copy.legal.loading}</p>}
            {legal.status === 'error' && (
              <>
                <p className="micro" role="alert" style={{ color: 'var(--color-state-danger)' }}>{storeConfig.copy.legal.unavailable}</p>
                <Button className="mt-3" onClick={legal.load}>{storeConfig.copy.legal.retry}</Button>
              </>
            )}
            {legal.status === 'ready' && !legal.policies.length && <p className="micro">{storeConfig.copy.legal.none}</p>}
            {legal.status === 'ready' && legal.policies.length > 0 && (
              <ul className="grid gap-px bg-line-subtle">
                {legal.policies.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => openDialog('legal', p.id)}
                            className="flex w-full items-center justify-between gap-3 bg-bg-raised px-3 py-3 text-left text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                            style={{ minHeight: 'var(--touch-min)', fontSize: 'var(--text-sm)' }}>
                      {storeConfig.copy.legal.policies[p.id]}
                      <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </aside>
    </div>
  )
}

/** Capo nell'indice: prima foto, nome, codice e prezzo (dal fornitore se il commercio è attivo). */
function ProductCard({ product, disabled, onOpen }) {
  const { label } = useShownPrice(product)
  return (
    <article>
      <button type="button" className="group block w-full text-left" disabled={disabled} onClick={onOpen}>
        <MediaImage media={product.media[0]} ratio={storeConfig.media.productRatio} category={product.category}
                    seed={product.id} sizes="(min-width: 640px) 12rem, 45vw" />
        <span className="mt-2 block font-display font-bold uppercase text-text-primary group-hover:text-accent-flame"
              style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </span>
        <span className="micro mt-0.5 block" data-testid="menu-price">
          {product.sku} · {label}
        </span>
      </button>
    </article>
  )
}
