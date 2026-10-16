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

  init: async () => {
    const provider = getProvider()
    if (!provider || get().catalogStatus !== 'idle') return
    set({ catalogStatus: 'loading' })
    try {
      const handles = storeConfig.products.map((p) => p.commerce?.handle).filter(Boolean)
      const list = await provider.getProducts(handles)
      set({ catalog: Object.fromEntries(list.map((p) => [p.handle, p])), catalogStatus: 'ready' })
    } catch (e) {
      console.warn('commerce: catalogo non disponibile', e)
      set({ catalogStatus: 'error' })
    }
    const id = readId()
    if (!id) return
    try {
      const cart = await provider.getCart(id)
      if (!cart) writeId(null)   // scaduto: se ne crea uno nuovo al primo acquisto
      set({ cart })
    } catch (e) {
      console.warn('commerce: carrello non ripristinato', e)
    }
  },

  // Esegue un'operazione sul carrello, creandolo se serve. Una alla volta.
  run: async (operation) => {
    const provider = getProvider()
    if (!provider || get().pending) return false
    set({ pending: true, error: null })
    try {
      let cart = get().cart
      if (!cart) {
        cart = await provider.createCart()
        writeId(cart.id)
      }
      cart = await operation(provider, cart.id)
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
    return get().run((p, id) => p.addLines(id, [{ variantId, quantity: Math.min(quantity, room) }]))
  },
  setQuantity: (lineId, quantity) => get().run((p, id) => (quantity <= 0
    ? p.removeLines(id, [lineId])
    : p.updateLines(id, [{ lineId, quantity: Math.min(quantity, commerce.maxQuantity) }]))),
  remove: (lineId) => get().run((p, id) => p.removeLines(id, [lineId])),
}))
