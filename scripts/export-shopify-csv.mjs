/**
 * Esporta i capi di storeConfig in un CSV importabile in Shopify (Prodotti → Importa),
 * per popolare il negozio di sviluppo della Fase 8b con gli stessi handle del negozio 3D.
 *
 *   node scripts/export-shopify-csv.mjs > docs/shopify-prodotti-di-prova.csv
 *
 * Una riga per variante (taglia × colore). Le taglie non disponibili hanno giacenza 0
 * e vendita bloccata. Prezzi e testi sono quelli dimostrativi.
 */
import { storeConfig } from '../src/config/storeConfig.js'

const header = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Variant SKU',
  'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable', 'Status']
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const rows = [header.map(q).join(',')]
const STOCK = 10

for (const p of storeConfig.products) {
  let first = true
  for (const size of p.sizes) {
    for (const cw of p.colorways) {
      rows.push([
        p.commerce.handle,
        first ? p.name : '',
        first ? `<p>${p.description}</p><ul>${p.details.map((d) => `<li>${d}</li>`).join('')}</ul>` : '',
        first ? storeConfig.meta.brand.name : '',
        first ? p.category : '',
        first ? [p.collection, ...p.badges].join(', ') : '',
        first ? 'TRUE' : '',
        'Taglia', size.label, 'Colore', cw.label,
        `${p.sku}-${size.label}-${cw.label}`.toUpperCase().replace(/\s+/g, ''),
        'shopify', size.available ? STOCK : 0, 'deny', 'manual',
        p.price.amount.toFixed(2), 'TRUE', 'TRUE',
        first ? 'active' : '',
      ].map(q).join(','))
      first = false
    }
  }
}
process.stdout.write(rows.join('\n') + '\n')
