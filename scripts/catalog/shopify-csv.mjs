/**
 * CSV dei prodotti nel formato di importazione di Shopify (Prodotti → Importa).
 * Una riga per variante taglia × colore; i campi del prodotto solo sulla prima.
 * Opzioni "Taglia" e "Colore": gli stessi nomi che il fornitore Shopify del sito
 * riconosce (storeConfig.commerce.shopify.optionNames).
 *
 * item = { handle, title, bodyHtml, type, tags[], price, sku?, stock, grams?,
 *          sizes: [{ label, available }], colors: [label] }
 */
const BASE = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Variant SKU',
  'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable']
const WEIGHT = ['Variant Grams', 'Variant Weight Unit']

const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Descrizione + dettagli come HTML semplice, con il testo protetto. */
export const productHtml = (description, details = []) =>
  `<p>${escapeHtml(description)}</p>` + (details.length ? `<ul>${details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : '')

export function toShopifyCsv(items, { vendor }) {
  // Le colonne del peso solo se serve: il CSV dimostrativo della 8b resta identico.
  const withWeight = items.some((i) => Number.isInteger(i.grams))
  const header = [...BASE, ...(withWeight ? WEIGHT : []), 'Status']
  const rows = [header.map(q).join(',')]
  for (const p of items) {
    let first = true
    for (const size of p.sizes) {
      for (const color of p.colors) {
        rows.push([
          p.handle,
          first ? p.title : '',
          first ? p.bodyHtml : '',
          first ? vendor : '',
          first ? p.type : '',
          first ? p.tags.filter(Boolean).join(', ') : '',
          first ? 'TRUE' : '',
          'Taglia', size.label, 'Colore', color,
          p.sku ? `${p.sku}-${size.label}-${color}`.toUpperCase().replace(/\s+/g, '') : '',
          'shopify', size.available ? p.stock : 0, 'deny', 'manual',
          p.price.toFixed(2), 'TRUE', 'TRUE',
          ...(withWeight ? [Number.isInteger(p.grams) ? p.grams : '', Number.isInteger(p.grams) ? 'g' : ''] : []),
          first ? 'active' : '',
        ].map(q).join(','))
        first = false
      }
    }
  }
  return rows.join('\n') + '\n'
}
