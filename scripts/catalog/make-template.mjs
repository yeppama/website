/**
 * Genera il modello Excel che il cliente compila con catalogo, colori, lookbook,
 * marchio e decisioni aperte (preparazione della Fase 8c).
 *
 *   node scripts/catalog/make-template.mjs [file.xlsx]     (default: docs/modello-catalogo-INTO.xlsx)
 *
 * Si apre in Excel, Numbers e Google Fogli. Colonne, aiuti e menu a tendina
 * vengono da schema.mjs, lo stesso schema che legge l'importatore.
 */
import ExcelJS from 'exceljs'
import { SHEETS, QUESTIONS, FIRST_DATA_ROW, LAST_VALIDATED_ROW, EXAMPLE_PREFIX } from './schema.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'

const out = process.argv[2] ?? 'docs/modello-catalogo-INTO.xlsx'
const brand = storeConfig.meta.brand.name
const INK = 'FF060606'
const BONE = 'FFF2F0EA'
const FLAME = 'FFF98E30'
const MUTED = 'FF8A9099'

const wb = new ExcelJS.Workbook()
wb.creator = brand
wb.created = wb.modified = new Date('2026-10-16T00:00:00Z')   // file riproducibile

const headerStyle = (cell) => {
  cell.font = { bold: true, color: { argb: BONE } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } }
  cell.alignment = { vertical: 'middle', wrapText: true }
  cell.border = { bottom: { style: 'medium', color: { argb: FLAME } } }
}

// ── Leggimi ─────────────────────────────────────────────────────────────────
const readme = wb.addWorksheet('Leggimi', { properties: { tabColor: { argb: FLAME } } })
readme.getColumn(1).width = 110
const lines = [
  [`${brand} · catalogo per il negozio online`, { bold: true, size: 16 }],
  ['Questo file contiene tutto quello che serve per mettere in vendita i capi nel negozio 3D e su Shopify.', {}],
  ['', {}],
  ['Come compilarlo', { bold: true, size: 13 }],
  [`1. Foglio "${SHEETS.products.name}": una riga per capo. I campi con * sono obbligatori.`, {}],
  [`   La riga che comincia con "${EXAMPLE_PREFIX}" è un esempio: potete lasciarla, viene ignorata.`, {}],
  ['   Passate il mouse sopra un\'intestazione (o toccatela) per leggere le istruzioni della colonna.', {}],
  [`2. Foglio "${SHEETS.colors.name}": ogni colore usato nei capi, con lo stesso nome.`, {}],
  [`3. Foglio "${SHEETS.lookbook.name}": la storia della collezione, se c'è.`, {}],
  [`4. Fogli "${QUESTIONS.brand.name}" e "${QUESTIONS.decisions.name}": rispondete nella colonna "Risposta".`, {}],
  ['5. Foto: mettetele tutte in una cartella "foto", con esattamente i nomi scritti nei fogli. JPG o PNG, fondo uniforme.', {}],
  ['6. Inglese: le colonne EN servono per la versione inglese del sito, dopo il lancio. Se potete, compilatele ora.', {}],
  ['7. Rimandate questo file e la cartella "foto".', {}],
  ['', {}],
  ['Se un dato non c\'è ancora, lasciate la cella vuota e scrivetelo nelle Note: meglio un vuoto dichiarato che un dato inventato.', { italic: true }],
]
for (const [text, font] of lines) {
  const row = readme.addRow([text])
  row.getCell(1).font = { name: 'Arial', ...font }
  row.getCell(1).alignment = { wrapText: true }
}

// ── Fogli tabellari ─────────────────────────────────────────────────────────
for (const sheet of Object.values(SHEETS)) {
  const ws = wb.addWorksheet(sheet.name, { views: [{ state: 'frozen', ySplit: 1, xSplit: 1 }] })
  ws.columns = sheet.columns.map((c) => ({ key: c.key, width: c.width }))
  const header = ws.getRow(1)
  sheet.columns.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.header
    headerStyle(cell)
    if (c.help) cell.note = { texts: [{ text: c.help }], margins: { insetmode: 'auto' } }
  })
  header.height = 34

  const example = ws.getRow(FIRST_DATA_ROW)
  sheet.columns.forEach((c, i) => {
    const cell = example.getCell(i + 1)
    cell.value = sheet.example[c.key] ?? null
    cell.font = { italic: true, color: { argb: MUTED } }
    cell.alignment = { vertical: 'top', wrapText: Boolean(c.wrap) }
  })

  sheet.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1)
    if (c.wrap) col.alignment = { vertical: 'top', wrapText: true }
    const letter = col.letter
    const range = `${letter}${FIRST_DATA_ROW}:${letter}${LAST_VALIDATED_ROW}`
    let rule = null
    if (c.type === 'choice') {
      rule = { type: 'list', allowBlank: !c.required, formulae: [`"${c.choices.join(',')}"`],
        showErrorMessage: true, errorStyle: c.strict ? 'stop' : 'warning',
        errorTitle: c.header, error: c.help }
    } else if (c.type === 'money') {
      rule = { type: 'decimal', operator: 'greaterThan', formulae: [0], allowBlank: true,
        showErrorMessage: true, errorStyle: 'stop', errorTitle: c.header, error: 'Solo un numero maggiore di zero, es. 189 o 189,50' }
    } else if (c.type === 'int') {
      rule = { type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true,
        showErrorMessage: true, errorStyle: 'stop', errorTitle: c.header, error: 'Solo un numero intero, 0 o più' }
    }
    if (rule) ws.dataValidations.add(range, rule)
  })
}

// ── Domande a risposta libera ───────────────────────────────────────────────
for (const group of Object.values(QUESTIONS)) {
  const ws = wb.addWorksheet(group.name, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [{ width: 58 }, { width: 50 }, { width: 44 }]
  const header = ws.getRow(1)
  ;['Domanda', 'Risposta', 'Oggi sul sito / note'].forEach((t, i) => { header.getCell(i + 1).value = t; headerStyle(header.getCell(i + 1)) })
  header.height = 24
  for (const item of group.items) {
    const row = ws.addRow([item.q, null, item.now || null])
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E8' } }
    row.getCell(3).font = { italic: true, color: { argb: MUTED } }
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
  }
}

await wb.xlsx.writeFile(out)
console.log(`modello scritto in ${out}`)
