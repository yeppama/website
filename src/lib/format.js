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
