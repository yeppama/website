import { create } from 'zustand'
import { storeConfig } from '../config/storeConfig.js'
import { getProvider } from '../commerce/index.js'

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
