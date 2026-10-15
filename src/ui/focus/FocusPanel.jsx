import { useEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import Button from '../primitives/Button.jsx'

/**
 * Pannello del Focus Mode. Compare già durante l'ingresso, così "Esci" è
 * disponibile da subito: l'uscita non deve mai aspettare la fine di una
 * transizione. ESC funziona allo stesso modo.
 * La scheda completa con taglie e immagini è la Fase 5: qui si dichiara.
 */
export default function FocusPanel({ device }) {
  const focus = useAppStore((s) => s.focus)
  const exitFocus = useAppStore((s) => s.exitFocus)
  const cycleProduct = useAppStore((s) => s.cycleProduct)
  const exitButton = useRef(null)
  const visible = focus.state === 'entering' || focus.state === 'focused'

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

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center p-4 sm:justify-end sm:p-6"
      style={{ zIndex: 'var(--z-modal)' }}
    >
      <section
        aria-label={product.name}
        aria-live="polite"
        className="pointer-events-auto w-full max-w-sm border border-line-strong bg-bg-base/85 p-5 backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="micro">{display.label}</p>
          {multi && <p className="micro">{focus.productIndex + 1} {copy.of} {products.length}</p>}
        </div>

        <h2 className="mt-3 font-display font-black uppercase leading-none text-text-primary"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {product.name}
        </h2>
        <p className="micro mt-2">{product.category} · {product.collection} · {product.sku}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-text-primary" style={{ fontSize: 'var(--text-lg)' }}>
            {product.price.amount} {product.price.currency}
          </p>
          <ul className="flex gap-2" aria-label="Varianti colore">
            {product.colorways.map((cw) => (
              <li key={cw.id} title={cw.label}
                  className="h-4 w-4 border border-line-strong" style={{ background: cw.swatch }} />
            ))}
          </ul>
        </div>

        <p className="micro mt-4 border-t border-line-subtle pt-3">{copy.detailsSoon}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
        <p className="micro mt-2" style={{ opacity: 0.7 }}>{storeConfig.copy.legal.priceNotice}</p>
      </section>
    </div>
  )
}
