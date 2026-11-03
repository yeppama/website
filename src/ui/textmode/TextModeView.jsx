import { useEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { commerceActive } from '../../commerce/index.js'
import CartButton from '../cart/CartButton.jsx'
import ProductGrid from '../catalog/ProductGrid.jsx'
import LegalLinks from '../legal/LegalLinks.jsx'
import Button from '../primitives/Button.jsx'

/**
 * Modalità testo (audit 2026-11-02, N1): il negozio senza la scena 3D. Stessi capi,
 * stesse schede, Lookbook, carrello e pagine legali, aperti da DialogHost come nel
 * negozio 3D. Serve a chi non ha WebGL (prima trovava solo un messaggio), a chi ha
 * un telefono che il 3D non regge e a chi usa un lettore di schermo.
 *
 * Nessun contenuto qui: tutto da storeConfig.copy.textMode e dal resto del config.
 */
export default function TextModeView({ device }) {
  const { brand } = storeConfig.meta
  const t = storeConfig.copy.textMode
  const menu = storeConfig.copy.menu
  const { features } = storeConfig
  const openDialog = useAppStore((s) => s.openDialog)
  const leaveTextMode = useAppStore((s) => s.leaveTextMode)
  const lookbook = storeConfig.lookbook.find((l) => l.id === storeConfig.environment.brandWall.panel.lookbookId)
  const heading = useRef(null)

  // Il bottone che ha portato qui (onboarding o fallback) non c'è più: il focus va
  // sul titolo, così il lettore di schermo annuncia la pagina nuova.
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])

  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-contain bg-bg-base" data-testid="text-mode">
      <main className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-12 sm:py-12">
        <header className="flex items-start justify-between gap-4">
          <p className="font-display font-black uppercase leading-none text-text-primary"
             style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-brutal)' }}>
            {brand.wordmark}
          </p>
          {commerceActive() && <CartButton />}
        </header>

        <h1 ref={heading} tabIndex={-1} className="mt-10 font-display font-black uppercase leading-none text-text-primary outline-none"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {t.title}
        </h1>
        <p className="mt-4 text-text-secondary" style={{ fontSize: 'var(--text-base)' }}>
          {device.webgl2 ? t.intro : t.unsupported}
        </p>
        {device.webgl2 && (
          <Button className="mt-5" onClick={leaveTextMode} data-testid="text-mode-3d">{t.back3d} →</Button>
        )}

        <section className="mt-10" aria-labelledby="text-products">
          <h2 id="text-products" className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[1].label}
          </h2>
          <ProductGrid columns="grid-cols-2 sm:grid-cols-3" />
        </section>

        <section className="mt-10" aria-labelledby="text-brand">
          <h2 id="text-brand" className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>
            {menu.sections[2].label}
          </h2>
          <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{brand.tagline}</p>
          {features.lookbook.enabled && lookbook && (
            <Button className="mt-5" onClick={() => openDialog('lookbook', lookbook.id)}>
              {storeConfig.copy.lookbook.open} →
            </Button>
          )}
        </section>

        <LegalLinks id="text-legal" testId="text-legal" as="h2" />

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <p className="micro">{brand.origin.city}, {brand.origin.country} · {brand.origin.coords}</p>
          <p className="micro text-right">{brand.credit}</p>
        </footer>
      </main>
    </div>
  )
}
