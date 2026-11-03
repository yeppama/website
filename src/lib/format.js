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
