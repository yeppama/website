/**
 * Test dell'importatore del catalogo (scripts/catalog/), in Node, senza rete.
 *
 * Si parte dal modello Excel vero (docs/modello-catalogo-INTO.xlsx), lo si compila
 * da codice e lo si reimporta. Il primo test è un giro completo: i 7 capi
 * dimostrativi di storeConfig scritti nel modello devono dare lo stesso CSV di
 * scripts/export-shopify-csv.mjs e gli stessi capi. Gli altri provano un errore alla volta.
 *
 *   npm run test:catalog
 */
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { storeConfig } from '../src/config/storeConfig.js'
import { SHEETS, QUESTIONS, FIRST_DATA_ROW } from './catalog/schema.mjs'
import { importCatalog } from './catalog/importer.mjs'
import { toShopifyCsv, productHtml } from './catalog/shopify-csv.mjs'

const TEMPLATE = 'docs/modello-catalogo-INTO.xlsx'
const vendor = storeConfig.meta.brand.name
const results = []
async function test(name, fn) {
  try { const note = await fn(); results.push(['ok', name, note ?? '']) }
  catch (e) { results.push(['FAIL', name, e.message]) }
}

const load = async () => { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(TEMPLATE); return wb }
// Scrive le righe sotto quella d'esempio, che resta al suo posto e deve essere ignorata.
function fill(wb, sheet, rows) {
  const ws = wb.getWorksheet(sheet.name)
  rows.forEach((row, i) => {
    sheet.columns.forEach((c, j) => { ws.getRow(FIRST_DATA_ROW + 1 + i).getCell(j + 1).value = row[c.key] ?? null })
  })
}

// I capi dimostrativi come li scriverebbe il cliente.
const demoColors = [...new Map(storeConfig.products.flatMap((p) => p.colorways).map((c) => [c.label, c])).values()]
  .map((c) => ({ name: c.label, hex: c.swatch.toUpperCase() }))
const demoLookbook = storeConfig.lookbook.map((l) => ({ title: l.title, subtitle: l.subtitle, season: l.season,
  body: l.body.join('\n'), images: l.images.map((i) => `${i.id}.jpg`).join(', ') }))
const demoProducts = storeConfig.products.map((p) => ({
  name: p.name, sku: p.sku, category: p.category, collection: p.collection, price: p.price.amount,
  sizes: p.sizes.map((s) => s.label).join(', '), soldOut: p.sizes.filter((s) => !s.available).map((s) => s.label).join(', '),
  colors: p.colorways.map((c) => c.label).join(', '), stock: 10, description: p.description,
  details: p.details.join('\n'), badge: p.badges[0] ?? null,
  lookbook: p.lookbookIds.map((id) => storeConfig.lookbook.find((l) => l.id === id).title).join(', '),
  photos: 'fronte.jpg',
}))
async function demoWorkbook() {
  const wb = await load()
  fill(wb, SHEETS.colors, demoColors)
  fill(wb, SHEETS.lookbook, demoLookbook)
  fill(wb, SHEETS.products, demoProducts)
  return wb
}

await test('giro completo: i capi dimostrativi danno lo stesso CSV dell\'esportatore della 8b', async () => {
  const r = importCatalog(await demoWorkbook(), { vendor })
  assert.equal(r.ok, true, r.errors.join(' | '))
  const expected = toShopifyCsv(storeConfig.products.map((p) => ({
    handle: p.commerce.handle, title: p.name, bodyHtml: productHtml(p.description, p.details), type: p.category,
    tags: [p.collection, ...p.badges], price: p.price.amount, sku: p.sku, stock: 10, sizes: p.sizes,
    colors: p.colorways.map((c) => c.label),
  })), { vendor })
  assert.equal(r.csv, expected)
  return `${r.csv.trim().split('\n').length - 1} varianti, riga d'esempio ignorata`
})

await test('giro completo: capi e lookbook nella forma di storeConfig', async () => {
  const r = importCatalog(await demoWorkbook(), { vendor })
  assert.equal(r.products.length, storeConfig.products.length)
  r.products.forEach((got, i) => {
    const want = storeConfig.products[i]
    assert.equal(got.id, want.id)
    assert.equal(got.commerce.handle, want.commerce.handle)
    assert.deepEqual(got.price, want.price)
    assert.deepEqual(got.sizes, want.sizes)
    assert.deepEqual(got.colorways, want.colorways)
    assert.deepEqual(got.details, want.details)
    assert.deepEqual(got.lookbookIds, want.lookbookIds)
    assert.deepEqual(got.badges, want.badges)
    assert.equal(got.displayId, null, 'la posizione 3D non si inventa')
  })
  // Nel lookbook l'ordine dei capi segue il foglio Capi (in storeConfig era scelto a mano).
  assert.deepEqual([...r.lookbook[0].productIds].sort(), [...storeConfig.lookbook[0].productIds].sort())
  assert.deepEqual(r.lookbook[0].body, storeConfig.lookbook[0].body)
  assert.ok(r.decisions.some((d) => d.includes('Posizione nel negozio 3D')))
})

async function withProduct(change, extra = {}) {
  const wb = await load()
  fill(wb, SHEETS.colors, [{ name: 'Black', hex: '#0D0D0D' }, ...(extra.colors ?? [])])
  fill(wb, SHEETS.lookbook, extra.lookbook ?? [])
  const base = { name: 'Heavy Hoodie', category: 'Hoodie', price: 189, sizes: 'S, M', colors: 'Black', stock: 5, description: 'Testo.' }
  fill(wb, SHEETS.products, [{ ...base, ...change }, ...(extra.products ?? [])])
  return importCatalog(wb, { vendor, photoFiles: extra.photoFiles ?? null })
}
const expectError = async (change, pattern, extra) => {
  const r = await withProduct(change, extra)
  assert.equal(r.ok, false, 'doveva fallire')
  assert.ok(r.errors.some((e) => pattern.test(e)), `nessun errore come ${pattern}: ${r.errors.join(' | ')}`)
  assert.equal(r.csv, undefined, 'con errori non si producono uscite')
  return r.errors.find((e) => pattern.test(e))
}

await test('campo obbligatorio vuoto: errore con foglio, riga e colonna', () =>
  expectError({ price: null }, /^Capi, riga 3, "Prezzo € IVA inclusa \*": campo obbligatorio vuoto/))
await test('prezzo non valido', () => expectError({ price: '189 euro circa' }, /non è un prezzo valido/))
await test('prezzi scritti all\'italiana', async () => {
  for (const [raw, want] of [['189,50 €', 189.5], ['1.234,50', 1234.5], ['189.50', 189.5], ['€ 89', 89]]) {
    const r = await withProduct({ price: raw })
    assert.equal(r.ok, true, `${raw}: ${r.errors.join(' | ')}`)
    assert.equal(r.products[0].price.amount, want, raw)
  }
})
await test('colore non elencato nel foglio Colori', () => expectError({ colors: 'Black, Navy' }, /"Navy" non è nel foglio Colori/))
await test('taglia esaurita che non è fra le taglie', () => expectError({ soldOut: 'XL' }, /"XL" non è fra le taglie/))
await test('due capi con lo stesso indirizzo', () =>
  expectError({}, /avrebbero lo stesso indirizzo "heavy-hoodie"/, { products: [{ name: 'Heavy  hoodie', category: 'Hoodie', price: 1, sizes: 'M', colors: 'Black', stock: 1, description: 'x' }] }))
await test('lookbook inesistente', () => expectError({ lookbook: 'DROP 99' }, /lookbook "DROP 99" non è nel foglio Lookbook/))
await test('etichetta non prevista', () => expectError({ badge: 'SALE' }, /"SALE" non è un'etichetta prevista/))
await test('codice colore non valido', () => expectError({}, /"nero" non è un codice HEX/, { colors: [{ name: 'Bone', hex: 'nero' }] }))
await test('foto dichiarata ma assente dalla cartella', () =>
  expectError({ photos: 'a.jpg, b.jpg' }, /"b.jpg" non è nella cartella/, { photoFiles: new Set(['a.jpg']) }))
await test('pezzi non interi', () => expectError({ stock: 2.5 }, /non è un numero intero di pezzi/))

await test('categoria senza sagoma 3D: da decidere, non errore', async () => {
  const r = await withProduct({ category: 'Cap' })
  assert.equal(r.ok, true, r.errors.join(' | '))
  assert.ok(r.decisions.some((d) => d.includes('"Cap" senza sagoma 3D')))
})
await test('maiuscole e accenti tollerati dove non cambiano il senso', async () => {
  const r = await withProduct({ category: 'hoodie', colors: 'black', badge: 'new', soldOut: 's' })
  assert.equal(r.ok, true, r.errors.join(' | '))
  assert.equal(r.products[0].category, 'Hoodie')
  assert.deepEqual(r.products[0].badges, ['NEW'])
  assert.equal(r.products[0].sizes[0].available, false)
})
await test('colonne spostate: si trovano per intestazione', async () => {
  const wb = await demoWorkbook()
  const ws = wb.getWorksheet(SHEETS.products.name)
  ws.spliceColumns(2, 0, [])   // il cliente inserisce una colonna vuota dopo il nome
  const r = importCatalog(wb, { vendor })
  assert.equal(r.ok, true, r.errors.join(' | '))
  assert.equal(r.products[0].price.amount, storeConfig.products[0].price.amount)
})
await test('avvisi: niente foto, niente inglese, colore inutilizzato', async () => {
  const r = await withProduct({}, { colors: [{ name: 'Bone' }] })
  assert.equal(r.ok, true)
  for (const p of [/nessuna foto/, /senza descrizione inglese/, /"Bone" non è usato/, /"Bone" senza codice colore/]) {
    assert.ok(r.warnings.some((w) => p.test(w)), `manca l'avviso ${p}`)
  }
})
await test('risposte dei fogli Brand e Domande', async () => {
  const wb = await demoWorkbook()
  wb.getWorksheet(QUESTIONS.brand.name).getRow(6).getCell(2).value = "We're just looking for somewhere"
  wb.getWorksheet(QUESTIONS.decisions.name).getRow(2).getCell(2).value = 'sì'
  const r = importCatalog(wb, { vendor })
  assert.equal(r.answers.brand.tagline.a, "We're just looking for somewhere")
  assert.equal(r.answers.decisions.pricesFinal.a, 'sì')
})
await test('testo HTML protetto nel CSV', async () => {
  const r = await withProduct({ description: 'Cotone <b>pesante</b> & "morbido"' })
  assert.ok(r.csv.includes('Cotone &lt;b&gt;pesante&lt;/b&gt; &amp; ""morbido""'))
})

const failed = results.filter((r) => r[0] !== 'ok')
for (const [status, name, note] of results) console.log(`  ${status === 'ok' ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} test superati`)
process.exit(failed.length ? 1 : 0)
