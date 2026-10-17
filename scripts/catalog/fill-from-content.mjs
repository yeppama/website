/**
 * Compila il modello Excel con un contenuto già pronto (src/content/), sotto la riga
 * d'esempio: è il modello "compilato" da mostrare al cliente, e la prova che quel
 * contenuto rientra nel formato che l'importatore legge.
 *
 *   node scripts/catalog/fill-from-content.mjs <contenuto> [uscita.xlsx]
 *     (default: docs/<contenuto>/catalogo-<contenuto>.xlsx, dal modello docs/modello-catalogo-INTO.xlsx)
 */
import ExcelJS from 'exceljs'
import { SHEETS, FIRST_DATA_ROW } from './schema.mjs'

const [id, out = `docs/${id}/catalogo-${id}.xlsx`] = process.argv.slice(2)
const { contents } = await import('../../src/content/index.js')
const content = contents[id]
if (!content) { console.error(`uso: node scripts/catalog/fill-from-content.mjs <${Object.keys(contents).join('|')}> [uscita.xlsx]`); process.exit(1) }

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('docs/modello-catalogo-INTO.xlsx')
const fileOf = (src) => `${src.split('/').pop()}.png`

function fill(sheet, rows) {
  const ws = wb.getWorksheet(sheet.name)
  rows.forEach((r, i) => {
    const row = ws.getRow(FIRST_DATA_ROW + 1 + i)
    sheet.columns.forEach((c, j) => { row.getCell(j + 1).value = r[c.key] ?? null })
    row.commit()
  })
}

const colors = new Map()
fill(SHEETS.products, content.products.map((p) => {
  for (const c of p.colorways) colors.set(c.label, c.swatch)
  return {
    name: p.name, sku: p.sku, category: p.category, collection: p.collection, price: p.price.amount,
    sizes: p.sizes.map((s) => s.label).join(', '),
    soldOut: p.sizes.filter((s) => !s.available).map((s) => s.label).join(', '),
    colors: p.colorways.map((c) => c.label).join(', '),
    stock: 10, description: p.description, details: p.details.join('\n'),
    badge: p.badges[0] ?? null,
    lookbook: p.lookbookIds.map((lid) => content.lookbook.find((l) => l.id === lid).title).join(', '),
    photos: p.media.filter((m) => m.src).map((m) => fileOf(m.src)).join(', '),
  }
}))
fill(SHEETS.colors, [...colors].map(([name, hex]) => ({ name, hex: hex.toUpperCase() })))
fill(SHEETS.lookbook, content.lookbook.map((l) => ({
  title: l.title, subtitle: l.subtitle, season: l.season, body: l.body.join('\n'),
  images: l.images.filter((i) => i.src).map((i) => fileOf(i.src)).join(', '),
})))
await wb.xlsx.writeFile(out)
console.log(`${out}: ${content.products.length} capi, ${colors.size} colori, ${content.lookbook.length} lookbook`)
