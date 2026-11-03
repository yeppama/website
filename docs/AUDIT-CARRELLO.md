# Il carrello di INTO industries — codice per audit esterno

Negozio streetwear navigabile in 3D, con carrello Shopify headless.
Generato il 2026-11-03 dal commit `c6408c9`, branch `audit/correzioni-2026-11`, con `npm run docs:carrello`.
Il codice è letto dai file in quel momento, non riscritto.

> **È una fotografia.** Appena qualcuno tocca uno di quei file, questo documento
> invecchia. Si legge per spiegare il carrello a qualcuno da fuori, mai per sapere
> com'è il codice oggi. Per mandarlo di nuovo a un revisore si rigenera
> (`npm run docs:carrello`), non si aggiorna a mano.
>
> Sostituisce la versione del 2026-10-30 (`f9f0ff6`), scritta a mano, che dopo le
> correzioni dell'audit del 2026-11-02 diceva cose non più vere.

## Cosa fa, in due righe

Chi naviga il negozio 3D (o la versione senza 3D) apre un capo, sceglie taglia e colore
e lo aggiunge al carrello. Il carrello vive su Shopify: il sito non ha database, non
conserva dati di chi compra e non vede mai i dati di pagamento. Il pagamento avviene
sulla cassa di Shopify, sul dominio di Shopify.

## I quattro strati, e cosa c'è in ciascuno

| Strato | File | Responsabilità |
|---|---|---|
| Interfaccia | `ui/cart/CartSheet.jsx` | mostra righe, totali di riga, subtotale; annuncia i cambi; manda alla cassa |
| Stato | `state/useCartStore.js`, `state/useLegalStore.js`, `state/leaveGuard.js` | quando chiamare, riprova, limiti, errori; avviso in uscita |
| Contratto | `commerce/index.js` | cosa deve offrire un fornitore, e quale usare |
| Adapter | `commerce/shopify.js` | le chiamate vere alla Storefront API |

Dove guardare per primi, se il tempo è poco: `safeCheckoutUrl` in `commerce/shopify.js`
(sezione 4), la funzione `run` in `useCartStore.js` (sezione 2) e `checkout` /
`canCheckout` in `CartSheet.jsx` (sezione 1).

---

## 1. Interfaccia

### `src/ui/cart/CartSheet.jsx`

> L'ultima schermata del sito prima della cassa di Shopify. Non calcola niente: righe, quantità, totali di riga e subtotale arrivano dallo stato; da `storeConfig` prende solo i nomi leggibili di taglia e colore, l'immagine e i testi. Senza un `checkoutUrl` valido il bottone del pagamento è spento e lo dice.

```jsx
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
```


---

## 2. Stato

### `src/state/useCartStore.js`

> Decide *quando* chiamare il fornitore: crea il carrello se manca, riprova una volta su un carrello nuovo se quello salvato è scaduto, accetta solo quantità intere, limita al massimo del config, distingue errori e avvisi, resta occupato mentre ripristina il carrello salvato. Contiene anche `useShownPrice`, la regola per cui un prezzo di configurazione non può mai sostituire quello del fornitore.

```js
import { create } from 'zustand'
import { storeConfig } from '../config/storeConfig.js'
import { getProvider } from '../commerce/index.js'
import { formatPrice } from '../lib/format.js'

const { commerce } = storeConfig
const readId = () => { try { return localStorage.getItem(commerce.cartStorageKey) } catch { return null } }
const writeId = (id) => { try { id ? localStorage.setItem(commerce.cartStorageKey, id) : localStorage.removeItem(commerce.cartStorageKey) } catch { /* solo in memoria */ } }

/**
 * Carrello e catalogo commerciale. Prezzi, varianti e disponibilità vengono solo
 * dal fornitore: se non risponde, `catalogStatus` è 'error' e l'interfaccia mostra
 * "non disponibile", mai un prezzo di storeConfig.
 */
export const useCartStore = create((set, get) => ({
  catalog: {},              // { [handle]: { handle, title, variants } }
  catalogStatus: 'idle',    // idle | loading | ready | error
  cart: null,
  pending: false,
  error: null,              // ultima operazione fallita (testo dal config)

  // Avvio: catalogo e carrello salvato. Il catalogo si può ricaricare dopo un
  // errore (loadCatalog), il carrello si ripristina una volta sola.
  init: async () => {
    if (!getProvider()) return
    await Promise.all([get().loadCatalog(), get().restoreCart()])
  },

  loadCatalog: async () => {
    const provider = getProvider()
    if (!provider || get().catalogStatus === 'loading' || get().catalogStatus === 'ready') return
    set({ catalogStatus: 'loading' })
    try {
      const handles = storeConfig.products.map((p) => p.commerce?.handle).filter(Boolean)
      const list = await provider.getProducts(handles)
      set({ catalog: Object.fromEntries(list.map((p) => [p.handle, p])), catalogStatus: 'ready' })
    } catch (e) {
      console.warn('commerce: catalogo non disponibile', e)
      set({ catalogStatus: 'error' })
    }
  },

  restoreCart: async () => {
    const provider = getProvider()
    const id = readId()
    if (!provider || !id || get().pending) return
    // Occupato finché il carrello salvato non è tornato: un'aggiunta in questa
    // finestra creava un carrello nuovo e il ripristino lo scartava, o il
    // contrario (audit 2026-11-02, §4-bis punto 2). Il bottone "Aggiungi" resta
    // in attesa (aria-disabled) per il tempo di una risposta.
    set({ pending: true })
    try {
      const cart = await provider.getCart(id)
      if (get().cart || readId() !== id) return
      if (!cart) writeId(null)   // scaduto o già pagato: se ne crea uno nuovo al primo acquisto
      set({ cart })
    } catch (e) {
      console.warn('commerce: carrello non ripristinato', e)
    } finally {
      set({ pending: false })
    }
  },

  // L'errore riguarda l'ultima operazione: aprendo un'altra scheda non si trascina.
  clearError: () => { if (get().error) set({ error: null }) },

  // Esegue un'operazione sul carrello, creandolo se serve. Una alla volta.
  // Se il carrello salvato non esiste più (scaduto, o pagato in un'altra scheda),
  // lo si dimentica e, per le aggiunte, si riprova una volta su un carrello nuovo.
  run: async (operation, { retryOnNewCart = false } = {}) => {
    const provider = getProvider()
    if (!provider || get().pending) return false
    set({ pending: true, error: null })
    const attempt = async () => {
      let cart = get().cart
      if (!cart) {
        cart = await provider.createCart()
        writeId(cart.id)
        set({ cart })
      }
      return operation(provider, cart.id)
    }
    try {
      let cart
      try {
        cart = await attempt()
      } catch (e) {
        const old = get().cart
        const gone = old && await provider.getCart(old.id).then((c) => !c, () => false)
        if (!gone) throw e
        writeId(null)
        set({ cart: null })
        if (!retryOnNewCart) throw e
        cart = await attempt()
      }
      // Operazione eseguita solo in parte (es. merce esaurita): si mostra il
      // carrello com'è davvero e si avvisa, senza confermare.
      if (cart.warnings?.length) {
        console.warn('commerce: avvisi dal fornitore', cart.warnings)
        set({ cart, pending: false, error: storeConfig.copy.cart.stockWarning })
        return false
      }
      set({ cart, pending: false })
      return true
    } catch (e) {
      console.warn('commerce: operazione sul carrello non riuscita', e)
      set({ pending: false, error: storeConfig.copy.cart.error })
      return false
    }
  },

  add: (variantId, quantity = 1) => {
    // Solo interi positivi: Math.min(NaN, room) è NaN e Math.min(-5, room) è -5, e
    // arriverebbero al fornitore come quantità (audit 2026-11-02, T15).
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.resolve(false)
    // Il massimo per riga vale per ogni fornitore, non solo per quello finto.
    const line = get().cart?.lines.find((l) => l.variantId === variantId)
    const room = commerce.maxQuantity - (line?.quantity ?? 0)
    if (room <= 0) { set({ error: storeConfig.copy.cart.maxReached }); return Promise.resolve(false) }
    return get().run((p, id) => p.addLines(id, [{ variantId, quantity: Math.min(quantity, room) }]), { retryOnNewCart: true })
  },
  // 0 rimuove la riga; un valore che non è un intero ≥ 0 non parte.
  setQuantity: (lineId, quantity) => (!Number.isInteger(quantity) || quantity < 0 ? Promise.resolve(false) : get().run((p, id) => (quantity <= 0
    ? p.removeLines(id, [lineId])
    : p.updateLines(id, [{ lineId, quantity: Math.min(quantity, commerce.maxQuantity) }])))),
  remove: (lineId) => get().run((p, id) => p.removeLines(id, [lineId])),
}))

/**
 * Prezzo da mostrare per un capo fuori dalla scheda (menu, Focus, Lookbook).
 * Senza commercio è quello di storeConfig, dichiarato dimostrativo; con il commercio
 * attivo viene solo dal fornitore (il più basso fra le varianti del colore, o fra
 * tutte): finché non risponde '…', se non risponde '—', mai il prezzo di storeConfig.
 */
export function useShownPrice(product, colorwayId = null) {
  const active = getProvider() !== null
  const entry = useCartStore((s) => s.catalog[product.commerce?.handle])
  const status = useCartStore((s) => s.catalogStatus)
  if (!active) return { price: product.price, label: formatPrice(product.price, storeConfig.meta.brand.locale) }
  const variants = entry?.variants.filter((v) => !colorwayId || v.color === colorwayId) ?? []
  const price = variants.reduce((min, v) => (!min || v.price.amount < min.amount ? v.price : min), null)
  if (price) return { price, label: formatPrice(price, storeConfig.meta.brand.locale) }
  const missing = status === 'error' || (status === 'ready' && !entry)
  return { price: null, label: missing ? '—' : '…' }
}
```

### `src/state/useLegalStore.js`

> Le informative pubblicate dal venditore su Shopify, caricate alla prima richiesta. Nessun testo legale sta nel codice.

```js
import { create } from 'zustand'
import { storeConfig } from '../config/storeConfig.js'
import { getProvider } from '../commerce/index.js'

/**
 * Pagine legali lette dal fornitore (preparazione della Fase 8d). Si caricano alla
 * prima richiesta (menu aperto o scheda aperta) e restano in memoria; dopo un errore
 * una nuova richiesta riprova.
 */
export const useLegalStore = create((set, get) => ({
  status: 'idle',      // idle | loading | ready | error
  policies: [],        // [{ id, title, body }] solo quelle pubblicate, nell'ordine del config

  load: async () => {
    const provider = getProvider()
    if (!provider || get().status === 'loading' || get().status === 'ready') return
    set({ status: 'loading' })
    try {
      set({ policies: await provider.getPolicies(storeConfig.commerce.policies), status: 'ready' })
    } catch (e) {
      console.warn('commerce: testi legali non disponibili', e)
      set({ status: 'error' })
    }
  },
}))
```

### `src/state/leaveGuard.js`

> Avviso del browser prima di lasciare il sito con capi nel carrello. Si spegne prima della navigazione verso la cassa (`allowLeave` in `CartSheet`).

```js
import { storeConfig } from '../config/storeConfig.js'
import { useCartStore } from './useCartStore.js'

/**
 * Avviso prima di lasciare il sito (richiesta dell'utente, 2026-11-03).
 *
 * È la finestra del browser (`beforeunload`), non una nostra: il testo lo
 * sceglie il browser e non si può cambiare, Chrome la mostra solo dopo che la
 * persona ha toccato o cliccato la pagina, e Safari su iPhone in pratica la
 * ignora. Per questo non è l'unica protezione: il carrello è già salvato da
 * Shopify e si ritrova alla visita dopo.
 *
 * Quando scatta lo decide `features.leaveWarning.when`:
 *   'cart'   → solo con almeno un capo nel carrello (default: chi non ha
 *              comprato niente non perde niente, e un avviso a ogni chiusura
 *              di scheda insegna a ignorarlo);
 *   'always' → a ogni uscita.
 * Mai verso la cassa di Shopify: lì si sta andando a pagare (`allowLeave`).
 */
let allowed = false

/** Una sola navigazione voluta (la cassa) passa senza avviso. */
export function allowLeave() { allowed = true }

export function shouldWarn() {
  const f = storeConfig.features.leaveWarning
  if (!f?.enabled || allowed) return false
  if (f.when === 'always') return true
  return (useCartStore.getState().cart?.totalQuantity ?? 0) > 0
}

export function installLeaveGuard() {
  const onBeforeUnload = (e) => {
    if (!shouldWarn()) return
    e.preventDefault()
    // Chrome e Edge prima della 119 vogliono anche returnValue impostato.
    e.returnValue = ''
  }
  // Tornando con Indietro dalla cassa la pagina può riprendere dalla cache del
  // browser: il permesso dato per la cassa non deve restare acceso.
  const onPageShow = () => { allowed = false }
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('pageshow', onPageShow)
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('pageshow', onPageShow)
  }
}
```

### `src/state/useAppStore.js` (righe 98-106)

> La pila delle schede. `CartSheet` usa solo `openDialog` e `closeDialogs`; il resto dello store non lo tocca.

```js
  openDialog: (kind, id) => {
    const stack = get().dialogs
    // Già nella pila (Lookbook → capo → di nuovo il Lookbook): si torna lì invece
    // di accumulare livelli, così "Indietro" non gira in tondo.
    const at = stack.findIndex((d) => d.kind === kind && d.id === id)
    set({ dialogs: at >= 0 ? stack.slice(0, at + 1) : [...stack, { kind, id }] })
  },
  backDialog: () => set((s) => ({ dialogs: s.dialogs.slice(0, -1) })),
  closeDialogs: () => set({ dialogs: [] }),
```


---

## 3. Contratto del commercio

### `src/commerce/index.js`

> Definisce cosa deve offrire un fornitore e sceglie quale usare: finto, Shopify, o nessuno. Gli interruttori da query string valgono solo nelle build di prova; la build decide che cosa è produzione e fallisce chiusa (`vite.config.js`, `isProduction`).

```js
import { storeConfig } from '../config/storeConfig.js'
import { createMockProvider } from './mock.js'
import { createShopifyProvider } from './shopify.js'

/**
 * Punto d'ingresso del commercio (Fase 8, docs/PLAN-8.md).
 *
 * Contratto di ogni fornitore (mock oggi, Shopify in 8b), tutto asincrono:
 *   getProducts(handles)          → [{ handle, title, variants: [{ id, size, color, price, available }] }]
 *   createCart()                  → cart
 *   getCart(id)                   → cart | null (scaduto o inesistente)
 *   addLines(id, [{ variantId, quantity }])     → cart
 *   updateLines(id, [{ lineId, quantity }])     → cart   (quantità 0 = rimuovi)
 *   removeLines(id, [lineId])                   → cart
 *   getPolicies(commerce.policies) → [{ id, title, body (HTML del venditore, da ripulire) }], solo quelle pubblicate
 * cart = { id, lines: [{ id, variantId, quantity, merchandise: { productHandle, title, size, color, price } }],
 *          totalQuantity, subtotal: { amount, currency }, checkoutUrl }
 */
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

// Gli interruttori da query string valgono solo nelle build di prova. In
// produzione un link con ?commerce=shopify accenderebbe il carrello su un sito
// dove gli acquisti non sono ancora aperti, e ?commerce=off li spegnerebbe per
// chi riceve il link. Il valore lo decide vite.config.js.
const overrideAllowed = Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_COMMERCE_OVERRIDE === '1'

/** 'off' | 'mock' | 'shopify'. ?commerce=mock|shopify|off sovrascrive il config nelle build di prova. */
export function commerceMode() {
  const forced = overrideAllowed ? params.get('commerce') : null
  if (forced === 'mock' || forced === 'off' || forced === 'shopify') return forced
  return storeConfig.commerce.provider
}

/** Paese dell'acquirente. Solo in diagnosi (?debug) si può forzare con &country=XX. */
export function commerceCountry() {
  const forced = overrideAllowed && params.get('debug') && params.get('country')
  return /^[A-Z]{2}$/.test(forced ?? '') ? forced : storeConfig.commerce.country
}

/** Lingua dei testi chiesti al fornitore (pagine legali), dalla lingua del sito: it-IT → IT. */
export const commerceLanguage = () => storeConfig.meta.brand.locale.slice(0, 2).toUpperCase()

let provider
export function getProvider() {
  if (provider !== undefined) return provider
  const mode = commerceMode()
  const { commerce, products } = storeConfig
  if (mode === 'mock') {
    provider = createMockProvider({
      products, mock: commerce.mock, maxQuantity: commerce.maxQuantity, policyTitles: storeConfig.copy.legal.policies,
      fail: overrideAllowed && params.get('mockerror') === '1',   // prova della gestione degli errori
    })
  } else if (mode === 'shopify') {
    const env = import.meta.env ?? {}
    const shopify = {
      ...commerce.shopify,
      domain: env.VITE_SHOPIFY_DOMAIN || commerce.shopify.domain,
      storefrontToken: env.VITE_SHOPIFY_STOREFRONT_TOKEN || commerce.shopify.storefrontToken,
      apiVersion: env.VITE_SHOPIFY_API_VERSION || commerce.shopify.apiVersion,
    }
    provider = shopify.domain && shopify.storefrontToken
      ? createShopifyProvider({ products, shopify, country: commerceCountry(), language: commerceLanguage() })
      : null
    if (!provider) console.warn('commerce: Shopify senza dominio o token, acquisti spenti')
  } else {
    provider = null
  }
  return provider
}

export const commerceActive = () => getProvider() !== null

/** Avviso da mostrare in scheda e carrello quando non si vende davvero, o null. */
export function testBanner() {
  const mode = commerceMode()
  if (mode === 'mock') return storeConfig.copy.cart.mockBanner
  if (mode === 'shopify' && storeConfig.commerce.shopify.testMode) return storeConfig.copy.cart.devStoreBanner
  return null
}
```


---

## 4. Adapter Shopify

### `src/commerce/shopify.js`

> L'unico file che parla con la Storefront API. Query del catalogo (handle come variabili GraphQL) e delle pagine legali, cinque operazioni sul carrello, traduzione delle varianti Shopify negli id di taglia e colore del progetto (con avviso per quelle scartate), totale di riga da Shopify, e `safeCheckoutUrl`.

```js
/**
 * Fornitore Shopify (Fase 8b): Storefront API dal browser, con il token PUBBLICO
 * del canale Headless (pensato per stare nel codice del sito: legge il catalogo e
 * gestisce carrelli, non ordini né clienti). Il pagamento avviene sulla cassa di
 * Shopify (`checkoutUrl`): nessun dato di pagamento passa dal sito.
 *
 * Stesso contratto del fornitore finto (vedi commerce/index.js). Le varianti di
 * Shopify si traducono negli id di taglia e colore di storeConfig confrontando i
 * valori delle opzioni con le etichette (`sizes[].label`, `colorways[].label`).
 * `fetchImpl` si può sostituire nei test.
 */
const PRODUCT_FIELDS = `
  handle
  title
  variants(first: 100) {
    nodes {
      id
      availableForSale
      price { amount currencyCode }
      selectedOptions { name value }
    }
  }`

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          price { amount currencyCode }
          selectedOptions { name value }
          product { handle title }
        }
      }
    }
  }`

const money = (m) => ({ amount: Number(m.amount), currency: m.currencyCode })

export function createShopifyProvider({ products, shopify, country, language = null, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
  const endpoint = `https://${shopify.domain}/api/${shopify.apiVersion}/graphql.json`
  const byHandle = new Map(products.filter((p) => p.commerce?.handle).map((p) => [p.commerce.handle, p]))
  const names = shopify.optionNames
  const match = (list, value) => list.some((n) => n.toLowerCase() === String(value).toLowerCase())

  // Taglia e colore di una variante Shopify, negli id di storeConfig.
  const optionsOf = (handle, selectedOptions) => {
    const product = byHandle.get(handle)
    const pick = (accepted) => selectedOptions.find((o) => match(accepted, o.name))?.value
    const sizeLabel = pick(names.size)
    const colorLabel = pick(names.color)
    const size = product?.sizes.find((s) => match([s.label], sizeLabel))?.id ?? null
    const color = product?.colorways.find((c) => match([c.label], colorLabel))?.id
      ?? (product?.colorways.length === 1 && colorLabel === undefined ? product.colorways[0].id : null)
    return { size, color }
  }

  async function request(query, variables = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': shopify.storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`shopify: HTTP ${res.status}`)
      const json = await res.json()
      if (json.errors?.length) throw new Error(`shopify: ${json.errors.map((e) => e.message).join('; ')}`)
      return json.data
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * L'URL della cassa finisce in window.location.assign (ui/cart/CartSheet.jsx):
   * è l'unico valore che arriva da fuori e diventa una navigazione. Oggi la
   * fonte è la Storefront API su HTTPS, quindi è attendibile; questo controllo
   * serve al giorno in cui non lo fosse — un negozio compromesso, un cambio
   * dell'API — perché un "javascript:" lì dentro verrebbe eseguito nel contesto
   * del sito. Se l'URL non convince, il carrello resta senza cassa: il bottone
   * "Vai al pagamento" si disabilita e dice perché (CartSheet), invece di
   * portare l'utente chissà dove.
   */
  // Host ammessi per la cassa: il negozio da cui arriva il carrello e, se il
  // config li elenca, i domini propri del negozio. Con un dominio personalizzato
  // Shopify restituisce il checkoutUrl sul dominio primario: senza la lista, alla
  // 8c la cassa si chiuderebbe in silenzio (audit 2026-11-02, T1-bis).
  const checkoutHosts = new Set([shopify.domain, ...(shopify.checkoutHosts ?? [])].map((h) => String(h).toLowerCase()))
  const safeCheckoutUrl = (raw) => {
    try {
      const url = new URL(String(raw))
      if (url.protocol === 'https:' && checkoutHosts.has(url.hostname)) return url.href
      console.warn('shopify: checkoutUrl scartato', url.protocol, url.hostname)
      return null
    } catch {
      return null
    }
  }

  const view = (cart) => ({
    id: cart.id,
    checkoutUrl: safeCheckoutUrl(cart.checkoutUrl),
    totalQuantity: cart.totalQuantity,
    subtotal: money(cart.cost.subtotalAmount),
    lines: cart.lines.nodes.map((l) => {
      const handle = l.merchandise.product.handle
      const { size, color } = optionsOf(handle, l.merchandise.selectedOptions)
      return {
        id: l.id,
        variantId: l.merchandise.id,
        quantity: l.quantity,
        // Totale di riga calcolato da Shopify (sconti compresi), non dal sito (T5).
        total: l.cost?.totalAmount ? money(l.cost.totalAmount) : null,
        merchandise: { productHandle: handle, title: l.merchandise.product.title, size, color, price: money(l.merchandise.price) },
      }
    }),
  })

  // Le mutazioni del carrello restituiscono userErrors (operazione rifiutata) e
  // warnings (operazione eseguita solo in parte: es. merce esaurita aggiunta con
  // quantità 0). Gli avvisi viaggiano col carrello: il chiamante non deve
  // confermare un'aggiunta che non c'è stata (Fase 8b, verificato dal vivo).
  const mutate = async (field, query, variables) => {
    const data = await request(query, { ...variables, country })
    const result = data[field]
    if (result.userErrors?.length) throw new Error(`shopify: ${result.userErrors.map((e) => e.message).join('; ')}`)
    return { ...view(result.cart), warnings: (result.warnings ?? []).map((w) => ({ code: w.code, message: w.message })) }
  }

  return {
    name: 'shopify',

    async getProducts(handles) {
      if (!handles.length) return []
      // Un alias per handle: una sola richiesta, nessuna sintassi di ricerca. Gli
      // handle viaggiano come variabili, mai dentro il testo della query
      // (mappa_dati_sicurezza §4; audit 2026-11-02, T18).
      const decl = handles.map((_, i) => `$h${i}: String!`).join(', ')
      const fields = handles.map((_, i) => `p${i}: product(handle: $h${i}) { ${PRODUCT_FIELDS} }`).join('\n')
      const vars = Object.fromEntries(handles.map((h, i) => [`h${i}`, h]))
      const data = await request(`query Products($country: CountryCode, ${decl}) @inContext(country: $country) {
        localization { availableCountries { isoCode } }
        ${fields}
      }`, { country, ...vars })
      // Un negozio che non vende nel paese configurato risponde col contesto del
      // suo mercato principale (prezzi in un'altra valuta) e poi dichiara la merce
      // esaurita al carrello. Meglio dirlo subito: il capo risulta non disponibile.
      const countries = data.localization.availableCountries.map((c) => c.isoCode)
      if (!countries.includes(country)) {
        throw new Error(`shopify: il negozio non vende in ${country} (mercati attivi: ${countries.join(', ')})`)
      }
      return handles.map((_, i) => data[`p${i}`]).filter(Boolean).map((p) => {
        const mapped = p.variants.nodes.map((v) => ({
          id: v.id,
          ...optionsOf(p.handle, v.selectedOptions),
          price: money(v.price),
          available: v.availableForSale,
        }))
        // Una variante la cui taglia o colore su Shopify non coincide con le
        // etichette del config ("Medium" invece di "M") sparisce dal sito: lo si
        // dice, altrimenti il capo sembra solo esaurito (audit 2026-11-02, T19).
        const dropped = mapped.filter((v) => !v.size || !v.color)
        if (dropped.length) console.warn(`shopify: ${dropped.length} varianti di ${p.handle} senza taglia/colore corrispondenti`, dropped.map((v) => v.id))
        return { handle: p.handle, title: p.title, variants: mapped.filter((v) => v.size && v.color) }
      })
    },

    createCart: () => mutate('cartCreate', `
      mutation CartCreate($country: CountryCode) @inContext(country: $country) {
        cartCreate(input: { buyerIdentity: { countryCode: $country } }) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, {}),

    async getCart(id) {
      const data = await request(`query Cart($id: ID!, $country: CountryCode) @inContext(country: $country) { cart(id: $id) { ${CART_FIELDS} } }`, { id, country })
      return data.cart ? view(data.cart) : null
    },

    addLines: (cartId, lines) => mutate('cartLinesAdd', `
      mutation Add($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })) }),

    updateLines: (cartId, lines) => mutate('cartLinesUpdate', `
      mutation Update($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lines: lines.map((l) => ({ id: l.lineId, quantity: l.quantity })) }),

    // Pagine legali (preparazione della 8d): le scrive il venditore su Shopify. Si
    // chiedono nella lingua del sito; se il negozio non l'ha pubblicata, Shopify
    // risponde nella sua lingua predefinita (verificato dal vivo). Solo quelle con testo.
    async getPolicies(policies) {
      const fields = policies.map((p) => `${p.field} { title body }`).join(' ')
      const data = await request(`query Policies($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
        shop { ${fields} }
      }`, { country, language })
      return policies
        .map((p) => ({ id: p.id, ...data.shop[p.field] }))
        .filter((p) => p.body?.trim())
        .map(({ id, title, body }) => ({ id, title, body }))
    },

    removeLines: (cartId, lineIds) => mutate('cartLinesRemove', `
      mutation Remove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode) @inContext(country: $country) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } warnings { code message } }
      }`, { cartId, lineIds }),
  }
}
```


---

## 5. Utility e configurazione

### `src/lib/format.js`

> `formatPrice` formatta importo e valuta che arrivano dal fornitore, sempre con due decimali come la cassa. Nessun componente decide come si scrive un prezzo.

```js
/**
 * Formattazione per l'interfaccia. La lingua viene da `meta.brand.locale`:
 * nessun componente decide come si scrive un prezzo.
 */
const cache = new Map()

export function formatPrice({ amount, currency }, locale) {
  const key = `${locale}|${currency}`
  if (!cache.has(key)) {
    cache.set(key, new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // Sempre due decimali (189,00 €), come la cassa di Shopify: con 189 € in
      // vetrina e 189,00 € al pagamento sembrano due prezzi (audit 2026-11-02, T23).
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }))
  }
  return cache.get(key).format(amount)
}

/** 1 → "01": i contatori del brand hanno sempre due cifre. */
export const pad2 = (n) => String(n).padStart(2, '0')
```

### `src/config/storeConfig.js` (righe 156-198)

> Estratto: il blocco `commerce`. Lo `storefrontToken` è il token **pubblico** del canale Headless, fatto per stare nel codice del sito: non è una credenziale trapelata, e il repository è pubblico per scelta. I suoi permessi sono ridotti ai quattro che il sito usa (verificato sul negozio di sviluppo il 2026-10-30, su quello del cliente il 2026-11-03). Il token privato dell'amministrazione non entra mai nel sorgente.

```js
  commerce: {
    provider: content.commerce?.provider ?? 'off',
    country: 'IT',
    maxQuantity: 10,
    cartStorageKey: 'into-cart-id',
    mock: { latencyMs: 250, storageKey: 'into-mock-carts', checkoutUrl: '#checkout-di-prova',
            // Pagine legali del negozio di prova: segnaposto dichiarato, con la formattazione
            // che le policy di Shopify usano davvero (titoletti, elenchi, link).
            policyHtml: '<p>Testo segnaposto. Nel negozio vero questa pagina arriva da Shopify, dove la scrive il venditore.</p>' +
              '<h2>Sezione</h2><ul><li>Primo punto</li><li>Secondo punto</li></ul>' +
              '<p>Contatti: <a href="mailto:info@example.com">info@example.com</a></p>' },
    // Pagine legali (preparazione della Fase 8d): i testi stanno su Shopify (Impostazioni →
    // Informative), li scrive il venditore e il sito li legge con la Storefront API.
    // Nessun testo legale nel codice. Il menu mostra solo quelle pubblicate; il controllo
    // `npm run check:catalog -- --launch` le pretende tutte prima della vendita.
    policies: [
      { id: 'terms-of-sale',    field: 'termsOfSale' },
      { id: 'refund',           field: 'refundPolicy' },
      { id: 'shipping',         field: 'shippingPolicy' },
      { id: 'privacy',          field: 'privacyPolicy' },
      { id: 'terms-of-service', field: 'termsOfService' },
      { id: 'legal-notice',     field: 'legalNotice' },
      { id: 'contact',          field: 'contactInformation' },
    ],
    // Fase 8b: negozio di SVILUPPO dell'agenzia (nessun pagamento reale). Il token è
    // quello PUBBLICO del canale Headless, fatto per stare nel codice del sito; il
    // token privato non va mai qui. In 8c dominio e token diventano quelli del
    // cliente. Le variabili d'ambiente VITE_SHOPIFY_* li sostituiscono senza commit.
    shopify: {
      domain: 'into-industries-dev.myshopify.com',
      storefrontToken: 'b01d16e3db47daf418b38cf9cef3e240',
      apiVersion: '2026-10',   // ultima stabile al 2026-10-16, supportata fino al 2027-10-16 (shopify.dev)
      // Negozio di sviluppo: solo pagamenti di prova. Lo si dice in scheda e carrello.
      testMode: true,
      // Nomi delle opzioni Shopify che corrispondono a taglia e colore.
      optionNames: { size: ['Taglia', 'Size'], color: ['Colore', 'Color'] },
      // Host della cassa oltre a `domain`. Con un dominio personalizzato Shopify
      // manda il checkoutUrl sul dominio primario (es. 'shop.cliente.it'): alla 8c
      // va aggiunto qui, nello stesso commit di dominio, token e CSP. Vuoto = solo
      // `domain`. Solo nomi host, senza protocollo né percorso.
      checkoutHosts: [],
    },
  },
```

### `src/config/storeConfig.js` (righe 790-821)

> Estratto: tutte le stringhe che il carrello mostra. Nessun testo è scritto nei componenti.

```js
    cart: {
      title: 'Carrello',
      open: 'Carrello',
      empty: 'Il carrello è vuoto.',
      continue: 'Continua a esplorare',
      add: 'Aggiungi al carrello',
      adding: 'Aggiunta in corso',
      added: 'Aggiunto al carrello',
      openCart: 'Apri il carrello',
      chooseSize: 'Scegli una taglia',
      soldOut: 'Esaurito',
      unavailable: 'Prezzo e disponibilità non raggiungibili. Riprova più tardi.',
      retry: 'Riprova',
      quantity: 'Quantità',
      decrease: 'Diminuisci',
      increase: 'Aumenta',
      remove: 'Rimuovi',
      subtotal: 'Subtotale',
      taxNote: 'IVA inclusa. Spedizione calcolata al pagamento.',
      checkout: 'Vai al pagamento',
      checkoutUnavailable: 'Il pagamento non è disponibile in questo momento. Riprova tra poco.',
      mockBanner: 'Negozio di prova: nessun pagamento reale',
      devStoreBanner: 'Negozio Shopify di sviluppo: solo pagamenti di prova',
      mockCheckout: 'Negozio di prova: qui si aprirebbe la cassa di Shopify. Nessun ordine è stato creato.',
      error: 'Il carrello non ha risposto. Riprova.',
      maxReached: 'Quantità massima raggiunta',
      // Prezzo unitario sotto il totale di riga, quando la quantità è più di 1.
      each: 'cad.',
      // Annunci per i lettori di schermo dopo un cambio riuscito: "<capo>: quantità 3", "<capo> rimosso dal carrello".
      removed: 'rimosso dal carrello',
      stockWarning: 'Quantità non disponibile: il carrello mostra quella che è stato possibile aggiungere.',
    },
```


---

## 6. Sottocomponenti usati dal carrello

**Nessuno esclusivo.** `CartSheet` compone tre primitive condivise con il resto
dell'interfaccia, che per questo non sono riportate:

| File | Righe | File che lo usano |
|---|---|---|
| `src/ui/primitives/Button.jsx` | 43 | 14 |
| `src/ui/primitives/MediaImage.jsx` | 56 | 5 |
| `src/ui/primitives/PlaceholderImage.jsx` | 118 | 2 |

Sono presentazionali: nessuna tocca prezzi, quantità o l'URL di pagamento.

---

## 7. Note per chi legge

**L'URL della cassa.** È l'unico valore che arriva dalla rete e diventa una
navigazione (`window.location.assign`). `safeCheckoutUrl` lo accetta solo se è
`https:` **e** l'host è esattamente il dominio del negozio o uno di
`commerce.shopify.checkoutHosts` (i domini propri del negozio, in minuscolo,
controllati all'avvio). Altrimenti il carrello resta senza cassa: il bottone «Vai al
pagamento» è **spento e spiega perché** (`checkoutUnavailable`), e in console resta
il motivo dello scarto. Fallisce chiuso, ma non in silenzio.

**I prezzi non vengono dalla configurazione.** Col commercio attivo importo, valuta,
totale di riga e subtotale arrivano solo dal fornitore; `useShownPrice` mostra `—`
se non risponde, mai il prezzo di `storeConfig`. Il totale di riga lo calcola Shopify
(sconti compresi), non il sito.

**La quantità è limitata due volte**, nell'interfaccia (il `+` è spento a
`maxQuantity`, con «Quantità massima raggiunta» visibile) e nello store, che accetta
solo interi e taglia a `maxQuantity` prima di chiamare il fornitore.

**Gli avvisi non vengono ingoiati.** Le mutazioni distinguono `userErrors` (operazione
rifiutata, diventa un'eccezione) da `warnings` (eseguita solo in parte, es. merce
esaurita: il carrello torna com'è davvero, con l'avviso). Chi chiama non conferma mai
un'aggiunta che non c'è stata.

**Ogni richiesta ha un timeout** di 10 secondi, e un controllo sui mercati fa fallire
subito il caricamento se il negozio non vende nel paese configurato.

**Accessibilità.** I bottoni restano col focus mentre il fornitore risponde
(`aria-disabled`, non `disabled`); dopo una rimozione il focus va al titolo o a
«Continua»; ogni cambio riuscito si annuncia in una regione `role="status"`; l'errore
compare sopra il bottone del pagamento.

**La rete.** La CSP (`vercel.json`) permette chiamate solo al dominio del negozio;
la build si ferma se `connect-src` e il dominio configurato non coincidono.

**Cosa il carrello non fa:** non conserva dati di chi compra (in `localStorage` solo
l'id del carrello, chiave `into-cart-id`), non tocca dati di pagamento, non chiama
direttamente nessuna API: passa sempre dal fornitore.

**Stato della verifica.** `e2e-phase8a` (fornitore finto e Shopify simulato) e
`test:commerce` (contratto, senza rete) girano a ogni modifica. La prova dal vivo sul
negozio Shopify di sviluppo è `e2e-phase8b`: 12 su 12 il 2026-10-30, cassa compresa.
Non è stata rilanciata dopo le correzioni del 2026-11-03, perché l'ambiente di lavoro
non raggiungeva Shopify: va rifatta prima di unire.
