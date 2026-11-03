import { useEffect, useRef, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { formatPrice } from '../../lib/format.js'
import { commerceMode, testBanner } from '../../commerce/index.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useCartStore } from '../../state/useCartStore.js'
import { useLegalStore } from '../../state/useLegalStore.js'
import { allowLeave } from '../../state/leaveGuard.js'
import PlaceholderImage from '../primitives/PlaceholderImage.jsx'
import MediaImage from '../primitives/MediaImage.jsx'
import Button from '../primitives/Button.jsx'

const variantLabel = (size, color, line) => [size?.label ?? line.merchandise.size, color?.label ?? line.merchandise.color].filter(Boolean).join(' · ')
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
  // Un solo annuncio per i lettori di schermo dopo ogni cambio riuscito: il
  // numero cambia sullo schermo, ma chi non lo vede deve sentirlo (T3, WCAG 4.1.3).
  const [announcement, setAnnouncement] = useState('')
  const continueRef = useRef(null)
  // Dopo una rimozione il bottone che aveva il focus sparisce con la riga: il focus
  // va sul titolo della scheda, o su "Continua" se il carrello è rimasto vuoto,
  // invece di cadere sul <body> fuori dalla finestra (audit 2026-11-02, T4).
  const afterRemoval = () => requestAnimationFrame(() => {
    const empty = (useCartStore.getState().cart?.lines?.length ?? 0) === 0
    ;(empty ? continueRef.current : document.getElementById(headingId))?.focus({ preventScroll: true })
  })
  const announceRemoved = (line) => setAnnouncement(`${line.merchandise.title} ${t.removed}`)
  const removeLine = async (line) => { if (await remove(line.id)) { announceRemoved(line); afterRemoval() } }
  const changeQuantity = async (line, quantity) => {
    const ok = await setQuantity(line.id, quantity)
    if (!ok) return
    if (quantity <= 0) { announceRemoved(line); afterRemoval(); return }
    // La quantità vera è quella del fornitore, che può averla limitata.
    const now = useCartStore.getState().cart?.lines.find((l) => l.id === line.id)?.quantity ?? quantity
    setAnnouncement(`${line.merchandise.title}: ${t.quantity} ${now}`)
  }
  const lines = cart?.lines ?? []
  const mock = commerceMode() === 'mock'
  // Fase 8d: le pagine legali si raggiungono dal menu e dalla cassa. Qui è
  // l'ultima schermata nostra prima di Shopify, quindi è l'ultimo punto in cui
  // chi compra può leggere condizioni, recesso e spedizioni senza perdere il
  // carrello: la scheda legale si apre sopra questa e Indietro riporta qui.
  // Solo le pagine con un'etichetta: un id senza testo darebbe un bottone muto (T2).
  const policies = useLegalStore((s) => s.policies).filter((p) => Object.hasOwn(storeConfig.copy.legal.policies, p.id))
  const loadPolicies = useLegalStore((s) => s.load)
  useEffect(() => { loadPolicies() }, [loadPolicies])

  // Senza un checkoutUrl valido (scartato da safeCheckoutUrl, o assente) il bottone
  // non deve restare attivo e muto: si disabilita e lo dice (audit 2026-11-02, T1-bis).
  const canCheckout = mock || Boolean(cart?.checkoutUrl)
  const checkout = () => {
    // Nel negozio di prova non esiste una cassa: si dice cosa succederebbe.
    // Prima del controllo sull'URL, così la nota compare anche se il carrello
    // finto non ne ha uno.
    if (mock) { setCheckoutNote(t.mockCheckout); return }
    if (!cart?.checkoutUrl) return
    // Si va a pagare: l'avviso "vuoi lasciare il sito?" qui sarebbe un ostacolo.
    allowLeave()
    window.location.assign(cart.checkoutUrl)
  }

  const errorText = error && <p className="micro mt-3" role="alert" data-testid="cart-error" style={{ color: 'var(--color-state-danger)' }}>{error}</p>

  return (
    <div className="mx-auto grid max-w-2xl gap-6" aria-busy={pending}>
      {/* div e non header: dentro la finestra un <header> diventa un secondo
          punto di riferimento "banner" della pagina (axe, audit 2026-11-02 N10). */}
      <div>
        {testBanner() && <p className="micro mb-2" style={{ color: 'var(--color-accent-flame)' }}>{testBanner()}</p>}
        <h2 id={headingId} tabIndex={-1}
            className="font-display font-black uppercase leading-none text-text-primary outline-none"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {t.title}
        </h2>
      </div>

      {lines.length === 0 ? (
        <div className="grid justify-items-start gap-4">
          <p className="text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{t.empty}</p>
          <Button ref={continueRef} onClick={closeDialogs}>{t.continue}</Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-px bg-line-subtle" data-testid="cart-lines">
            {lines.map((line, i) => {
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
                    {/* Un capo che il config non conosce non ha una scheda da aprire:
                        titolo come testo, non come bottone che non fa niente (T8). */}
                    {product ? (
                      <button type="button" onClick={() => openDialog('product', product.id)}
                              className="flex items-center text-left font-display font-bold uppercase text-text-primary hover:text-accent-flame"
                              style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)', minHeight: 'var(--touch-min)' }}>
                        {line.merchandise.title}
                      </button>
                    ) : (
                      <p className="flex items-center font-display font-bold uppercase text-text-primary"
                         style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-tight)', minHeight: 'var(--touch-min)' }}>
                        {line.merchandise.title}
                      </p>
                    )}
                    {/* Senza taglia o colore riconosciuti non resta un " · " orfano. */}
                    {variantLabel(size, color, line) && <p className="micro mt-1">{variantLabel(size, color, line)}</p>}
                    {/* Totale di riga dal fornitore, non calcolato qui; sotto, il prezzo
                        unitario quando i pezzi sono più di uno (T5). */}
                    <p className="micro mt-1 text-text-primary" data-testid="cart-line-total">
                      {formatPrice(line.total ?? line.merchandise.price, locale)}
                    </p>
                    {line.quantity > 1 && (
                      <p className="micro mt-0.5" data-testid="cart-line-unit">{formatPrice(line.merchandise.price, locale)} {t.each}</p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    {/* aria-disabled e non disabled: il bottone premuto resta col focus
                        mentre il fornitore risponde (Button.jsx). */}
                    <Button aria-label={`${t.decrease}: ${line.merchandise.title}`} aria-disabled={pending || undefined}
                            onClick={() => changeQuantity(line, line.quantity - 1)}>−</Button>
                    {/* aria-label su uno span senza ruolo non si legge: testo nascosto
                        fuori dallo span col numero, che i test leggono (T3). */}
                    <span className="sr-only">{t.quantity}:</span>
                    <span className="min-w-[2ch] text-center font-mono text-text-primary" data-testid="cart-qty">{line.quantity}</span>
                    <Button aria-label={`${t.increase}: ${line.merchandise.title}`} aria-disabled={pending || line.quantity >= maxQuantity || undefined}
                            aria-describedby={line.quantity >= maxQuantity ? `cart-max-${i}` : undefined}
                            onClick={() => changeQuantity(line, line.quantity + 1)}>+</Button>
                    <Button className="ml-auto sm:ml-2" aria-disabled={pending || undefined} onClick={() => removeLine(line)}
                            aria-label={`${t.remove}: ${line.merchandise.title}`}>{t.remove}</Button>
                  </div>
                  {/* Visibile e non in un title: su telefono e da tastiera il title non compare (T6). */}
                  {line.quantity >= maxQuantity && (
                    <p id={`cart-max-${i}`} className="micro col-span-2 sm:col-span-3" data-testid="cart-max">{t.maxReached}</p>
                  )}
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
            {/* Errore subito sopra l'azione, non in fondo dopo i link legali: su
                telefono lì non si vede (T7). */}
            {errorText}
            <Button variant="primary" className="mt-4 w-full" disabled={pending || !canCheckout} onClick={checkout}
                    aria-describedby={!canCheckout && !pending ? 'cart-checkout-unavailable' : undefined}
                    data-testid="cart-checkout">{t.checkout}</Button>
            {!canCheckout && !pending && (
              <p id="cart-checkout-unavailable" className="micro mt-2" role="status" data-testid="cart-checkout-unavailable">{t.checkoutUnavailable}</p>
            )}
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

      {lines.length === 0 && errorText}
      <p className="sr-only" role="status" data-testid="cart-announce">{announcement}</p>
    </div>
  )
}
