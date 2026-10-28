import cantiere from './cantiere.js'

/**
 * Allestimento del negozio: 'negozio' (la sala grande, definita in storeConfig) o 'cantiere'
 * (src/layouts/cantiere.js). Si sceglie con `?allestimento=cantiere` nell'indirizzo, così la
 * stessa pubblicazione mostra entrambi; altrimenti con VITE_LAYOUT (Vite o ambiente per gli
 * script Node); senza nulla, il negozio. Un valore sconosciuto torna al negozio.
 */
export const layouts = { negozio: null, cantiere }

const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('allestimento') : null
const requested = fromUrl ?? import.meta.env?.VITE_LAYOUT ?? globalThis.process?.env?.VITE_LAYOUT ?? 'negozio'

// Object.hasOwn e non l'operatore `in`: `?allestimento=constructor` (o __proto__,
// toString) passerebbe il controllo, perché quelle chiavi esistono su
// Object.prototype, e poi `layouts[layoutId]` restituirebbe una funzione invece
// di un allestimento.
export const layoutId = Object.hasOwn(layouts, requested) ? requested : 'negozio'
if (layoutId !== requested && typeof console !== 'undefined') console.warn(`allestimento "${requested}" inesistente: si usa il negozio`)
