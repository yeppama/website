import into from './into.js'
import demo from './demo.js'

/**
 * Contenuto scelto alla pubblicazione: VITE_CONTENT=into|demo (variabile di Vite o
 * d'ambiente per gli script Node). Senza variabile, quello di INTO.
 *
 * Il contenuto porta marchio, capi, Lookbook, dove sta ogni capo (products[].displayId),
 * il fornitore del commercio e i testi che cambiano da un contenuto all'altro
 * (`copy`, fusi sopra quelli di storeConfig). Tutto il resto (negozio, luci, percorsi,
 * interfaccia) è codice comune: è ciò che rende il sito riusabile per un altro marchio.
 */
export const contents = { into, demo }

const chosen = import.meta.env?.VITE_CONTENT ?? globalThis.process?.env?.VITE_CONTENT ?? 'into'
if (!contents[chosen]) throw new Error(`VITE_CONTENT="${chosen}": contenuto inesistente (${Object.keys(contents).join(', ')})`)

export default contents[chosen]
