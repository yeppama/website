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
 * cart = { id, lines: [{ id, variantId, quantity, merchandise: { productHandle, title, size, color, price } }],
 *          totalQuantity, subtotal: { amount, currency }, checkoutUrl }
 */
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

/** 'off' | 'mock' | 'shopify'. ?commerce=mock|shopify|off sovrascrive il config, per le prove. */
export function commerceMode() {
  const forced = params.get('commerce')
  if (forced === 'mock' || forced === 'off' || forced === 'shopify') return forced
  return storeConfig.commerce.provider
}

/** Paese dell'acquirente. Solo in diagnosi (?debug) si può forzare con &country=XX. */
export function commerceCountry() {
  const forced = params.get('debug') && params.get('country')
  return /^[A-Z]{2}$/.test(forced ?? '') ? forced : storeConfig.commerce.country
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
  } else if (mode === 'shopify') {
    const env = import.meta.env ?? {}
    const shopify = {
      ...commerce.shopify,
      domain: env.VITE_SHOPIFY_DOMAIN || commerce.shopify.domain,
      storefrontToken: env.VITE_SHOPIFY_STOREFRONT_TOKEN || commerce.shopify.storefrontToken,
      apiVersion: env.VITE_SHOPIFY_API_VERSION || commerce.shopify.apiVersion,
    }
    provider = shopify.domain && shopify.storefrontToken
      ? createShopifyProvider({ products, shopify, country: commerceCountry() })
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
