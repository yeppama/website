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
import { toShopifyCsv, productHtml } from './catalog/shopify-csv.mjs'

const STOCK = 10

process.stdout.write(toShopifyCsv(storeConfig.products.map((p) => ({
  handle: p.commerce.handle,
  title: p.name,
  bodyHtml: productHtml(p.description, p.details),
  type: p.category,
  tags: [p.collection, ...p.badges],
  price: p.price.amount,
  sku: p.sku,
  stock: STOCK,
  sizes: p.sizes,
  colors: p.colorways.map((c) => c.label),
})), { vendor: storeConfig.meta.brand.name }))
