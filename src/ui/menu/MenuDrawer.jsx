import { useEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import PlaceholderImage from '../primitives/PlaceholderImage.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Menu a tendina. Contenuto generato da storeConfig: zone, capi, brand.
 * Chiusura con Esc e focus riportato sull'elemento che l'ha aperto.
 */
export default function MenuDrawer() {
  const open = useAppStore((s) => s.menuOpen)
  const close = useAppStore((s) => s.closeMenu)
  const panel = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement
    panel.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [open, close])

  if (!open) return null

  const { brand } = storeConfig.meta
  const { zones } = storeConfig.environment
  const menu = storeConfig.copy.menu

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
          <ul className="grid gap-px bg-line-subtle">
            {zones.map((zone) => (
              <li key={zone.id} className="flex items-center justify-between bg-bg-raised px-3 py-3">
                <span className="font-display font-bold uppercase text-text-primary"
                      style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
                  {zone.label}
                </span>
                <span className="micro">{zone.id}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h3 className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[1].label}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {storeConfig.products.map((product) => (
              <article key={product.id}>
                <PlaceholderImage
                  ratio={product.media[0].ratio}
                  variant={product.media[0].variant}
                  label={product.media[0].label}
                  category={product.category}
                  seed={product.id}
                />
                <p className="mt-2 font-display font-bold uppercase text-text-primary"
                   style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)' }}>
                  {product.name}
                </p>
                <p className="micro mt-0.5">
                  {product.sku} · {product.price.amount} {product.price.currency}
                </p>
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
        </section>
      </aside>
    </div>
  )
}
