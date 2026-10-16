import { useEffect, useLayoutEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { formatPrice } from '../../lib/format.js'
import Button from '../primitives/Button.jsx'

/**
 * Pannello del Focus Mode. Compare già durante l'ingresso, così "Esci" è
 * disponibile da subito: l'uscita non deve mai aspettare la fine di una
 * transizione. ESC funziona allo stesso modo.
 * "Scheda completa" apre la scheda prodotto (Fase 5) sopra il Focus: chiusa la
 * scheda si torna qui, con la camera ancora sul capo.
 * Il pannello dichiara dove sta (`focusPanelRect`): la camera inquadra il capo
 * nella parte di schermo che resta libera. Su schermi bassi (telefono in
 * orizzontale) si compatta.
 */
export default function FocusPanel({ device }) {
  const focus = useAppStore((s) => s.focus)
  const exitFocus = useAppStore((s) => s.exitFocus)
  const cycleProduct = useAppStore((s) => s.cycleProduct)
  const openDialog = useAppStore((s) => s.openDialog)
  const setPanelRect = useAppStore((s) => s.setFocusPanelRect)
  const exitButton = useRef(null)
  const panel = useRef(null)
  const visible = focus.state === 'entering' || focus.state === 'focused'

  useLayoutEffect(() => {
    if (!visible || !panel.current) return
    const measure = () => {
      const r = panel.current.getBoundingClientRect()
      setPanelRect({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(panel.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); setPanelRect(null) }
  }, [visible, setPanelRect])

  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') exitFocus() }
    window.addEventListener('keydown', onKey)
    exitButton.current?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, exitFocus])

  if (!visible) return null

  const display = storeConfig.displays.find((d) => d.id === focus.displayId)
  const products = display.productIds.map((id) => storeConfig.products.find((p) => p.id === id))
  const product = products[focus.productIndex]
  const copy = storeConfig.copy.focus
  const multi = products.length > 1
  const sheet = storeConfig.features.productModal

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center p-4 sm:justify-end sm:p-6 short:p-3"
      style={{ zIndex: 'var(--z-modal)' }}
    >
      <section
        ref={panel}
        aria-label={product.name}
        aria-live="polite"
        data-testid="focus-panel"
        className="pointer-events-auto w-full max-w-sm border border-line-strong bg-bg-base/85 p-5 backdrop-blur-md short:max-w-xs short:p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="micro">{display.label}</p>
          {multi && <p className="micro">{focus.productIndex + 1} {copy.of} {products.length}</p>}
        </div>

        <h2 className="mt-3 font-display font-black uppercase leading-none text-text-primary short:mt-2"
            style={{ fontSize: 'clamp(var(--text-lg), 6.5vh, var(--text-xl))', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </h2>
        <p className="micro mt-2">{product.category} · {product.collection} · {product.sku}</p>

        <div className="mt-4 flex items-center justify-between gap-3 short:mt-2">
          <p className="font-mono text-text-primary" style={{ fontSize: 'var(--text-lg)' }}>
            {formatPrice(product.price, storeConfig.meta.brand.locale)}
          </p>
          <ul className="flex gap-2" aria-label="Varianti colore">
            {product.colorways.map((cw) => (
              <li key={cw.id} title={cw.label}
                  className="h-4 w-4 border border-line-strong" style={{ background: cw.swatch }} />
            ))}
          </ul>
        </div>

        <div className="mt-4 border-t border-line-subtle pt-3 short:mt-2 short:pt-2">
          {sheet.enabled ? (
            <Button className="w-full" onClick={() => openDialog('product', product.id)}>{copy.details} →</Button>
          ) : (
            <p className="micro">{storeConfig.copy.hints.comingInPhase} {sheet.availableInPhase}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 short:mt-2">
          {multi && (
            <>
              <Button onClick={() => cycleProduct(-1, products.length)} aria-label={copy.previous}>←</Button>
              <Button onClick={() => cycleProduct(1, products.length)} aria-label={copy.next}>→</Button>
            </>
          )}
          <Button ref={exitButton} variant="primary" className="ml-auto" onClick={exitFocus}>
            {copy.exit}
          </Button>
        </div>
        {!device.isTouch && <p className="micro mt-3 text-right">{copy.exitHint}</p>}
        <p className="micro mt-2 short:mt-1.5" style={{ opacity: 0.7 }}>{storeConfig.copy.legal.priceNotice}</p>
      </section>
    </div>
  )
}
