/**
 * Importa il modello di catalogo compilato dal cliente.
 *
 *   node scripts/catalog/import.mjs <file.xlsx> [cartella-uscita] [--foto <cartella>]
 *
 * Scrive sempre resoconto.md (errori, avvisi, decisioni, risposte del cliente).
 * Solo se non ci sono errori scrive anche:
 *   shopify-catalogo.csv   da importare in Shopify (Prodotti → Importa)
 *   catalogo.bozza.js      capi e lookbook nella forma di storeConfig, da rivedere e posizionare
 *   traduzioni.en.json     testi inglesi, per la Fase 8f
 * Esce con codice 1 se ci sono errori. La cartella d'uscita di default non va in git:
 * contiene i dati del cliente.
 */
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { importCatalog, report } from './importer.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'

const args = process.argv.slice(2)
const fotoAt = args.indexOf('--foto')
const photoDir = fotoAt >= 0 ? args[fotoAt + 1] : null
const [file, outDir = 'catalogo-importato'] = args.filter((_, i) => fotoAt < 0 || (i !== fotoAt && i !== fotoAt + 1))
if (!file) {
  console.error('uso: node scripts/catalog/import.mjs <file.xlsx> [cartella-uscita] [--foto <cartella>]')
  process.exit(2)
}

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(file)
const photoFiles = photoDir ? new Set(fs.readdirSync(photoDir)) : null
const result = importCatalog(wb, { vendor: storeConfig.meta.brand.name, photoFiles })

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'resoconto.md'), report(result, { source: path.basename(file) }))
if (result.ok) {
  fs.writeFileSync(path.join(outDir, 'shopify-catalogo.csv'), result.csv)
  fs.writeFileSync(path.join(outDir, 'catalogo.bozza.js'),
    `// Bozza generata da scripts/catalog/import.mjs da ${path.basename(file)}.\n` +
    '// Da rivedere prima di entrare in storeConfig: displayId (posizione nel negozio 3D) è da\n' +
    '// assegnare, il rapporto delle foto (4:5) va confermato sui file, i colori senza HEX hanno swatch null.\n' +
    `export const products = ${JSON.stringify(result.products, null, 2)}\n\n` +
    `export const lookbook = ${JSON.stringify(result.lookbook, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, 'traduzioni.en.json'), JSON.stringify(result.translations, null, 2) + '\n')
}

console.log(`${result.ok ? 'importabile' : 'da correggere'}: ${result.errors.length} errori, ` +
  `${result.warnings.length} avvisi, ${result.decisions.length} decisioni → ${path.join(outDir, 'resoconto.md')}`)
for (const e of result.errors) console.log(`  ✗ ${e}`)
process.exit(result.ok ? 0 : 1)
