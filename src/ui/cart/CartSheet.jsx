import { useEffect, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { formatPrice } from '../../lib/format.js'
import { commerceMode, testBanner } from '../../commerce/index.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useCartStore } from '../../state/useCartStore.js'
import { useLegalStore } from '../../state/useLegalStore.js'
import PlaceholderImage from '../primitives/PlaceholderImage.jsx'
import MediaImage from '../primitives/MediaImage.jsx'
import Button from '../primitives/Button.jsx'

const productByHandle = new Map(storeConfig.products.filter((p) => p.commerce).map((p) => [p.commerce.handle, p]))

/**
 * Carrello (Fase 8a). È una scheda della pila `dialogs`: sospende il movimento,
 * trattiene il focus, ESC la chiude. Righe, quantità e totale vengono dal
 * fornitore; da storeConfig solo nomi leggibili di taglia e colore e l'immagine.
 */
export default function CartSheet({ headingId }) {
  // Un errore rimasto da una scheda prodotto non riguarda il carrello.
  useEffect(() => { useCartStore.getState().clearError() }, [])
  const t = storeConfig.copy.cart
  const { locale } = storeConfig.meta.brand
  const { maxQuantity } = storeConfig.commerce
  const cart = useCartStore((s) => s.cart)
  const pending = useCartStore((s) => s.pending)
  const error = useCartStore((s) => s.error)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const remove = useCartStore((s) => s.remove)
  const openDialog = useAppStore((s) => s.openDialog)
  const closeDialogs = useAppStore((s) => s.closeDialogs)
  const [checkoutNote, setCheckoutNote] = useState(null)
  const lines = cart?.lines ?? []
  const mock = commerceMode() === 'mock'
  // Fase 8d: le pagine legali si raggiungono dal menu e dalla cassa. Qui è
  // l'ultima schermata nostra prima di Shopify, quindi è l'ultimo punto in cui
  // chi compra può leggere condizioni, recesso e spedizioni senza perdere il
  // carrello: la scheda legale si apre sopra questa e Indietro riporta qui.
  const policies = useLegalStore((s) => s.policies)
  const loadPolicies = useLegalStore((s) => s.load)
  useEffect(() => { loadPolicies() }, [loadPolicies])

  const checkout = () => {
    if (!cart?.checkoutUrl) return
    // Nel negozio di prova non esiste una cassa: si dice cosa succederebbe.
    if (mock) { setCheckoutNote(t.mockCheckout); return }
    window.location.assign(cart.checkoutUrl)
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6" aria-busy={pending}>
      <header>
        {testBanner() && <p className="micro mb-2" style={{ color: 'var(--color-accent-flame)' }}>{testBanner()}</p>}
        <h2 id={headingId} tabIndex={-1}
            className="font-display font-black uppercase leading-none text-text-primary outline-none"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {t.title}
        </h2>
      </header>

      {lines.length === 0 ? (
        <div className="grid justify-items-start gap-4">
          <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{t.empty}</p>
          <Button onClick={closeDialogs}>{t.continue}</Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-px bg-line-subtle" data-testid="cart-lines">
            {lines.map((line) => {
              const product = productByHandle.get(line.merchandise.productHandle)
              const size = product?.sizes.find((s) => s.id === line.merchandise.size)
              const color = product?.colorways.find((c) => c.id === line.merchandise.color)
              return (
                <li key={line.id} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 bg-bg-raised py-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center" data-testid="cart-line">
                  {product ? (
                    <MediaImage media={product.media.find((m) => m.colorwayId === line.merchandise.color) ?? product.media[0]}
                                ratio="1:1" sizes="5rem" seed={`${product.id}-${line.merchandise.color}`} compact />
                  ) : <PlaceholderImage ratio="1:1" compact />}
                  <div className="min-w-0">
                    <button type="button" onClick={() => product && openDialog('product', product.id)}
                            className="flex items-center text-left font-display font-bold uppercase text-text-primary hover:text-accent-flame"
                            style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)', minHeight: 'var(--touch-min)' }}>
                      {line.merchandise.title}
                    </button>
                    <p className="micro mt-1">{size?.label ?? line.merchandise.size} · {color?.label ?? line.merchandise.color}</p>
                    <p className="micro mt-1 text-text-primary">{formatPrice(line.merchandise.price, locale)}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <Button aria-label={`${t.decrease}: ${line.merchandise.title}`} disabled={pending}
                            onClick={() => setQuantity(line.id, line.quantity - 1)}>−</Button>
                    <span className="min-w-[2ch] text-center font-mono text-text-primary" aria-label={t.quantity} data-testid="cart-qty">{line.quantity}</span>
                    <Button aria-label={`${t.increase}: ${line.merchandise.title}`} disabled={pending || line.quantity >= maxQuantity}
                            title={line.quantity >= maxQuantity ? t.maxReached : undefined}
                            onClick={() => setQuantity(line.id, line.quantity + 1)}>+</Button>
                    <Button className="ml-auto sm:ml-2" disabled={pending} onClick={() => remove(line.id)}
                            aria-label={`${t.remove}: ${line.merchandise.title}`}>{t.remove}</Button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line-subtle pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="micro">{t.subtotal}</p>
              <p className="font-mono text-text-primary" style={{ fontSize: 'var(--text-lg)' }} data-testid="cart-subtotal">
                {formatPrice(cart.subtotal, locale)}
              </p>
            </div>
            <p className="micro mt-2">{t.taxNote}</p>
            <Button variant="primary" className="mt-4 w-full" disabled={pending} onClick={checkout}>{t.checkout}</Button>
            {checkoutNote && <p className="micro mt-3" role="status" style={{ color: 'var(--color-accent-flame)' }}>{checkoutNote}</p>}
            {policies.length > 0 && (
              <nav className="mt-4" aria-labelledby="cart-legal" data-testid="cart-legal">
                <h3 id="cart-legal" className="micro mb-2">{storeConfig.copy.legal.eyebrow}</h3>
                {/* Bersaglio alto quanto il minimo tattile: sul telefono questi
                    sono gli ultimi comandi prima di pagare, e una riga di testo
                    alta 20 px si sbaglia a toccare. */}
                <ul className="flex flex-wrap gap-x-4">
                  {policies.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => openDialog('legal', p.id)}
                              className="inline-flex items-center justify-center underline underline-offset-4 text-text-secondary transition-colors hover:text-text-primary"
                              style={{ fontSize: 'var(--text-sm)', minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)' }}>
                        {storeConfig.copy.legal.policies[p.id]}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </>
      )}

      {error && <p className="micro" role="alert" style={{ color: 'var(--color-state-danger)' }}>{error}</p>}
    </div>
  )
}
