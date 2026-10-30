# Il carrello di INTO industries — codice per audit esterno

Negozio streetwear navigabile in 3D, con carrello Shopify headless.
Estratto il 2026-10-30 dal commit `f9f0ff6`, branch `sviluppo`.
Codice copiato testualmente dai file, non riscritto.

> **E' una fotografia, come `docs/codice/`.** Il codice qui dentro e' copiato, non
> incluso: appena qualcuno tocca uno di quei file, questo documento invecchia senza
> dare nessun segnale. Si legge per spiegare il carrello a qualcuno da fuori, mai per
> sapere com'e' il codice oggi — per quello si aprono i file. Se serve mandarlo di
> nuovo a un revisore, si rigenera invece di aggiornarlo a mano.

## Cosa fa, in due righe

Chi naviga il negozio 3D apre un capo, sceglie taglia e colore e lo aggiunge al
carrello. Il carrello vive su Shopify: il sito non ha database, non conserva dati di
chi compra e non vede mai i dati di pagamento — il pagamento avviene sulla cassa di
Shopify, sul dominio di Shopify.

## I quattro strati, e cosa c'e' in ciascuno

| Strato | File | Responsabilita' |
|---|---|---|
| Interfaccia | `ui/cart/CartSheet.jsx` | mostra righe, quantita', subtotale, manda alla cassa |
| Stato | `state/useCartStore.js`, `state/useLegalStore.js` | quando chiamare, riprova, limiti, errori |
| Contratto | `commerce/index.js` | cosa deve offrire un fornitore, e quale usare |
| Adapter | `commerce/shopify.js` | le chiamate vere alla Storefront API |

Dove guardare per primi, se il tempo e' poco: `safeCheckoutUrl` in `commerce/shopify.js`
(sezione 4), la funzione `run` in `useCartStore.js` (sezione 2) e il metodo `checkout`
in `CartSheet.jsx` (sezione 1).

---

## 1. Interfaccia

### `src/ui/cart/CartSheet.jsx`

> L'ultima schermata del sito prima che l'acquirente passi al dominio di Shopify. Non calcola niente: righe, quantita' e totale arrivano dallo stato; da `storeConfig` prende solo i nomi leggibili di taglia e colore, l'immagine e i testi.

```jsx
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
```


---

## 2. Stato

### `src/state/useCartStore.js`

> Decide *quando* chiamare il fornitore: crea il carrello se manca, riprova una volta su un carrello nuovo se quello salvato e' scaduto, limita le quantita', distingue errori e avvisi. Contiene anche `useShownPrice`, la regola per cui un prezzo di configurazione non puo' mai sostituire quello del fornitore.

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
    if (!provider || !id) return
    try {
      const cart = await provider.getCart(id)
      // Nel frattempo l'utente può aver già aggiunto un capo (nuovo carrello):
      // vale il suo, non quello ripristinato.
      if (get().cart || readId() !== id) return
      if (!cart) writeId(null)   // scaduto o già pagato: se ne crea uno nuovo al primo acquisto
      set({ cart })
    } catch (e) {
      console.warn('commerce: carrello non ripristinato', e)
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
    // Il massimo per riga vale per ogni fornitore, non solo per quello finto.
    const line = get().cart?.lines.find((l) => l.variantId === variantId)
    const room = commerce.maxQuantity - (line?.quantity ?? 0)
    if (room <= 0) { set({ error: storeConfig.copy.cart.maxReached }); return Promise.resolve(false) }
    return get().run((p, id) => p.addLines(id, [{ variantId, quantity: Math.min(quantity, room) }]), { retryOnNewCart: true })
  },
  setQuantity: (lineId, quantity) => get().run((p, id) => (quantity <= 0
    ? p.removeLines(id, [lineId])
    : p.updateLines(id, [{ lineId, quantity: Math.min(quantity, commerce.maxQuantity) }]))),
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

### `src/state/useAppStore.js (righe 92-100)`

> La pila delle schede. `CartSheet` usa solo `openDialog` e `closeDialogs`; il resto dello store (fase dell'app, Focus, camera) non lo tocca.

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

> Definisce cosa deve offrire un fornitore e sceglie quale usare: finto, Shopify, o nessuno. Gli interruttori da query string valgono solo nelle build di prova — in produzione un link con `?commerce=shopify` accenderebbe il carrello su un sito dove gli acquisti non sono aperti.

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

> L'unico file che parla con la Storefront API. Query del catalogo e delle pagine legali, cinque operazioni sul carrello, traduzione delle varianti Shopify negli id di taglia e colore del progetto, e `safeCheckoutUrl`.

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
   * del sito. Se l'URL non convince, il carrello resta senza cassa e il bottone
   * non compare, invece di portare l'utente chissà dove.
   */
  const safeCheckoutUrl = (raw) => {
    try {
      const url = new URL(String(raw))
      // Stesso negozio da cui arriva il carrello: niente domini di terzi.
      return url.protocol === 'https:' && url.hostname === shopify.domain ? url.href : null
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
      // Un alias per handle: una sola richiesta, nessuna sintassi di ricerca.
      const fields = handles.map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { ${PRODUCT_FIELDS} }`).join('\n')
      const data = await request(`query Products($country: CountryCode) @inContext(country: $country) {
        localization { availableCountries { isoCode } }
        ${fields}
      }`, { country })
      // Un negozio che non vende nel paese configurato risponde col contesto del
      // suo mercato principale (prezzi in un'altra valuta) e poi dichiara la merce
      // esaurita al carrello. Meglio dirlo subito: il capo risulta non disponibile.
      const countries = data.localization.availableCountries.map((c) => c.isoCode)
      if (!countries.includes(country)) {
        throw new Error(`shopify: il negozio non vende in ${country} (mercati attivi: ${countries.join(', ')})`)
      }
      return handles.map((_, i) => data[`p${i}`]).filter(Boolean).map((p) => ({
        handle: p.handle,
        title: p.title,
        variants: p.variants.nodes.map((v) => ({
          id: v.id,
          ...optionsOf(p.handle, v.selectedOptions),
          price: money(v.price),
          available: v.availableForSale,
        })).filter((v) => v.size && v.color),
      }))
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

> `formatPrice` formatta importo e valuta che arrivano dal fornitore. Nessun componente decide come si scrive un prezzo.

```js
/**
 * Formattazione per l'interfaccia. La lingua viene da `meta.brand.locale`:
 * nessun componente decide come si scrive un prezzo.
 */
const cache = new Map()

export function formatPrice({ amount, currency }, locale) {
  const key = `${locale}|${currency}|${Number.isInteger(amount)}`
  if (!cache.has(key)) {
    cache.set(key, new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // 189 € e non 189,00 €: i decimali compaiono solo quando esistono.
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }))
  }
  return cache.get(key).format(amount)
}

/** 1 → "01": i contatori del brand hanno sempre due cifre. */
export const pad2 = (n) => String(n).padStart(2, '0')
```

### `src/config/storeConfig.js (righe 155-196)`

> Estratto: il blocco `commerce`. Il `storefrontToken` qui sotto e' il token **pubblico** del canale Headless, fatto per stare nel codice del sito: non e' una credenziale trapelata, e il repository e' pubblico per scelta. Il token privato dell'amministrazione non entra mai nel sorgente.

```js
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
    },
  },

  // Stadi reali del caricamento. Il peso è la quota della barra assegnata allo
  // stadio: non misura byte, misura passaggi che avvengono davvero.
  loading: {
    stages: [
      { id: 'boot',    progress: 0.15, label: 'Avvio' },
```

### `src/config/storeConfig.js (righe 778-804)`

> Estratto: tutte le stringhe che il carrello mostra. Nessun testo e' scritto nei componenti.

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
      mockBanner: 'Negozio di prova: nessun pagamento reale',
      devStoreBanner: 'Negozio Shopify di sviluppo: solo pagamenti di prova',
      mockCheckout: 'Negozio di prova: qui si aprirebbe la cassa di Shopify. Nessun ordine è stato creato.',
      error: 'Il carrello non ha risposto. Riprova.',
      maxReached: 'Quantità massima raggiunta',
      stockWarning: 'Quantità non disponibile: il carrello mostra quella che è stato possibile aggiungere.',
    },
```


---

## 6. Sottocomponenti usati esclusivamente dal carrello

**Nessuno.** `CartSheet` compone tre primitive condivise con il resto
dell'interfaccia, che per questo non sono riportate:

| File | Righe | Quanti file lo usano |
|---|---|---|
| `src/ui/primitives/Button.jsx` | 34 | 15 |
| `src/ui/primitives/MediaImage.jsx` | 56 | 6 |
| `src/ui/primitives/PlaceholderImage.jsx` | 112 | 3 |

Sono presentazionali e nessuna tocca prezzi, quantita' o l'URL di pagamento.

---

## 7. Note per chi legge

**L'URL della cassa.** E' l'unico valore che arriva dalla rete e diventa una
navigazione (`window.location.assign`). `safeCheckoutUrl` lo accetta solo se e'
`https:` **e** l'host e' esattamente il dominio del negozio; altrimenti il carrello
resta senza cassa e il bottone non compare. Fallisce chiuso.

**I prezzi non vengono dalla configurazione.** Col commercio attivo importo, valuta e
subtotale arrivano solo dal fornitore; `useShownPrice` mostra `—` se non risponde, mai
il prezzo di `storeConfig`. Il totale lo calcola Shopify.

**La quantita' e' limitata due volte**, nell'interfaccia (il `+` si disabilita a
`maxQuantity`) e nello store, che taglia a `maxQuantity` prima di chiamare il fornitore.

**Gli avvisi non vengono ingoiati.** Le mutazioni distinguono `userErrors` (operazione
rifiutata, diventa un'eccezione) da `warnings` (eseguita solo in parte, es. merce
esaurita: il carrello torna com'e' davvero, con l'avviso). Chi chiama non conferma mai
un'aggiunta che non c'e' stata.

**Ogni richiesta ha un timeout** di 10 secondi, e un controllo sui mercati fa fallire
subito il caricamento se il negozio non vende nel paese configurato, invece di lasciare
che il problema emerga alla cassa con i prezzi in un'altra valuta.

**Cosa il carrello non fa:** non conserva dati di chi compra (in `localStorage` solo
l'id del carrello, chiave `into-cart-id`), non tocca dati di pagamento, non chiama
direttamente nessuna API — passa sempre dal fornitore.

**Stato della verifica al 2026-10-30:** la suite `e2e-phase8b` interroga il negozio
Shopify di sviluppo dal vivo e passa 12 controlli su 12, cassa compresa: catalogo,
varianti, prezzi in EUR, carrello creato, aggiornato, ritrovato dopo un ricaricamento e
svuotato, pagine legali, e l'apertura della cassa con capo, taglia e prezzo giusti.
