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
