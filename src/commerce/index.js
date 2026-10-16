import { storeConfig } from '../config/storeConfig.js'
import { createMockProvider } from './mock.js'

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
 * cart = { id, lines: [{ id, variantId, quantity, merchandise: { productHandle, title, size, color, price } }],
 *          totalQuantity, subtotal: { amount, currency }, checkoutUrl }
 */
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

/** 'off' | 'mock' | 'shopify'. ?commerce=mock|off sovrascrive il config, per le prove. */
export function commerceMode() {
  const forced = params.get('commerce')
  if (forced === 'mock' || forced === 'off') return forced
  return storeConfig.commerce.provider
}

let provider
export function getProvider() {
  if (provider !== undefined) return provider
  const mode = commerceMode()
  const { commerce, products } = storeConfig
  if (mode === 'mock') {
    provider = createMockProvider({
      products, mock: commerce.mock, maxQuantity: commerce.maxQuantity,
      fail: params.get('mockerror') === '1',   // prova della gestione degli errori
    })
  } else {
    // 'shopify' arriva in Fase 8b: finché non c'è, nessun acquisto.
    if (mode === 'shopify') console.warn('commerce: fornitore Shopify non ancora disponibile (Fase 8b)')
    provider = null
  }
  return provider
}

export const commerceActive = () => getProvider() !== null
