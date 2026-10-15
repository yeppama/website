import { useEffect, useId, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useFocusTrap } from '../primitives/useFocusTrap.js'
import Button from '../primitives/Button.jsx'
import ProductSheet from '../product/ProductSheet.jsx'
import LookbookSheet from '../lookbook/LookbookSheet.jsx'

/**
 * Contenitore unico delle finestre della Fase 5: mostra la cima della pila
 * `dialogs`. Su telefono occupa lo schermo, da tablet in su è un pannello
 * centrato. Mentre è aperto il player è sospeso (vedi PlayerController).
 *
 * ESC e "Indietro" tolgono un livello, "Chiudi" e il fondo li tolgono tutti;
 * il focus resta dentro la finestra e alla fine torna a chi l'aveva aperta.
 */
export default function DialogHost({ device }) {
  const dialogs = useAppStore((s) => s.dialogs)
  const backDialog = useAppStore((s) => s.backDialog)
  const closeDialogs = useAppStore((s) => s.closeDialogs)
  const panel = useRef(null)
  const scroller = useRef(null)
  const headingId = useId()
  const open = dialogs.length > 0
  const top = dialogs[dialogs.length - 1]

  useFocusTrap(panel, open, backDialog)

  // Cambio di contenuto (Lookbook → capo, o Indietro): si riparte dall'alto e il
  // focus va sul titolo, così il lettore di schermo annuncia la nuova scheda.
  useEffect(() => {
    if (!top) return
    if (scroller.current) scroller.current.scrollTop = 0
    document.getElementById(headingId)?.focus({ preventScroll: true })
  }, [top?.kind, top?.id, headingId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const copy = storeConfig.copy
  const product = top.kind === 'product' ? storeConfig.products.find((p) => p.id === top.id) : null
  const entry = top.kind === 'lookbook' ? storeConfig.lookbook.find((l) => l.id === top.id) : null
  const eyebrow = product ? copy.product.eyebrow : copy.lookbook.eyebrow

  return (
    <div className="fixed inset-0 flex items-stretch justify-center md:items-center md:p-6" style={{ zIndex: 'var(--z-dialog)' }}>
      <button
        type="button"
        className="absolute inset-0 bg-bg-base/85 backdrop-blur-sm"
        onClick={closeDialogs}
        aria-label={copy.dialog.close}
        tabIndex={-1}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-dialog={top.kind}
        className="relative flex h-full w-full flex-col bg-bg-raised outline-none md:h-auto md:max-h-full md:max-w-5xl md:border md:border-line-strong"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {dialogs.length > 1 && <Button onClick={backDialog}>← {copy.dialog.back}</Button>}
            <p className="micro truncate">{eyebrow}</p>
          </div>
          <div className="flex items-center gap-3">
            {!device.isTouch && <p className="micro hidden sm:block">{copy.dialog.closeHint}</p>}
            <Button onClick={closeDialogs}>{copy.dialog.close}</Button>
          </div>
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 md:px-8">
          {product && <ProductSheet key={product.id} product={product} headingId={headingId} />}
          {entry && <LookbookSheet key={entry.id} entry={entry} headingId={headingId} />}
        </div>
      </div>
    </div>
  )
}
