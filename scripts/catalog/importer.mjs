/**
 * Legge il modello di catalogo compilato dal cliente (schema.mjs) e ne ricava:
 *   - i capi in forma di storeConfig (bozza: la posizione nel negozio 3D la decide una persona);
 *   - il CSV per l'importazione in Shopify;
 *   - i testi inglesi, tenuti da parte per la Fase 8f;
 *   - le risposte dei fogli Brand e Domande.
 * Gli errori bloccano (dato mancante o incoerente); gli avvisi no (dato da decidere).
 * Ogni messaggio dice foglio, riga e colonna, in italiano: va letto anche dal cliente.
 */
import { SHEETS, QUESTIONS, EXAMPLE_PREFIX, FIRST_DATA_ROW, CATEGORIES, slug } from './schema.mjs'
import { toShopifyCsv, productHtml } from './shopify-csv.mjs'

/** Testo di una cella di exceljs, qualunque sia il suo tipo. */
export function cellText(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.replace(/\r\n?/g, '\n').trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('').replace(/\r\n?/g, '\n').trim()
  if ('result' in value) return cellText(value.result)
  if ('text' in value) return cellText(value.text)
  // Errori di formula (#N/A…) o formule senza valore calcolato: mai "[object Object]".
  return ''
}

/** Il problema di una cella che non ha un valore leggibile, o null. */
function cellProblem(value) {
  if (value == null || typeof value !== 'object' || value instanceof Date || Array.isArray(value.richText)) return null
  if (value.error) return `la cella contiene l'errore ${value.error}`
  if ('result' in value && value.result && typeof value.result === 'object' && value.result.error) return `la formula dà ${value.result.error}`
  if ('formula' in value || 'sharedFormula' in value) return 'result' in value ? null : 'formula senza valore calcolato (riaprire e salvare il file in Excel)'
  if (!('text' in value)) return 'valore non leggibile'
  return null
}

const splitList = (s) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean)
const splitLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const same = (a, b) => a.localeCompare(b, 'it', { sensitivity: 'accent' }) === 0
const isExample = (first) => first.toUpperCase().startsWith(EXAMPLE_PREFIX)

function parseMoney(raw) {
  const s = raw.replace(/€|eur/gi, '').replace(/\s/g, '')
  // 1.234,50 → 1234.50 · 189,5 → 189.5 · 189.50 → 189.50
  const normalized = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const n = Number(normalized)
  return n > 0 ? n : null
}

/** Righe di un foglio tabellare come oggetti { _row, key: testo }, esempi e righe vuote esclusi. */
function readTable(wb, sheet, errors, warnings) {
  const ws = wb.getWorksheet(sheet.name)
  if (!ws) { errors.push(`Manca il foglio "${sheet.name}".`); return [] }
  const header = ws.getRow(1)
  const found = new Map()
  for (const c of sheet.columns) {
    // Le colonne si cercano per intestazione: se il cliente ne sposta una, si trova lo stesso.
    let at = null
    header.eachCell((cell, n) => { if (at == null && same(cellText(cell.value), c.header)) at = n })
    if (at != null) found.set(c.key, at)
  }
  // Solo se il foglio non ha nessuna intestazione riconoscibile si va per posizione;
  // altrimenti una colonna che manca è assente, mai letta da quella accanto.
  const positional = found.size === 0
  const colOf = new Map(sheet.columns.map((c, i) => [c.key, positional ? i + 1 : found.get(c.key) ?? null]))
  if (positional) warnings.push(`${sheet.name}: intestazioni non riconosciute, colonne lette nell'ordine del modello.`)
  for (const c of sheet.columns) {
    if (colOf.get(c.key) != null) continue
    if (c.required) errors.push(`${sheet.name}: manca la colonna "${c.header}".`)
    else warnings.push(`${sheet.name}: colonna "${c.header}" non trovata, considerata vuota.`)
  }
  const rows = []
  for (let r = FIRST_DATA_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const obj = { _row: r }
    for (const c of sheet.columns) {
      const at = colOf.get(c.key)
      if (at == null) { obj[c.key] = ''; continue }
      const value = row.getCell(at).value
      obj[c.key] = cellText(value)
      const problem = cellProblem(value)
      if (problem) (obj._problems ??= []).push(`${sheet.name}, riga ${r}, "${c.header}": ${problem}.`)
    }
    const values = sheet.columns.map((c) => obj[c.key]).filter(Boolean)
    if (!values.length) continue
    if (isExample(obj[sheet.columns[0].key])) continue
    if (obj._problems) errors.push(...obj._problems)
    rows.push(obj)
  }
  return rows
}

function readAnswers(wb, group) {
  const ws = wb.getWorksheet(group.name)
  const answers = {}
  if (!ws) return answers
  group.items.forEach((item, i) => {
    // Si cerca la domanda per testo; se il cliente l'ha riscritta, vale la posizione.
    let rowNo = i + 2
    for (let r = 2; r <= ws.rowCount; r++) if (same(cellText(ws.getRow(r).getCell(1).value), item.q)) { rowNo = r; break }
    answers[item.key] = { q: item.q, a: cellText(ws.getRow(rowNo).getCell(2).value) }
  })
  return answers
}

/**
 * @param wb  workbook di exceljs già caricato
 * @param opts { vendor, photoFiles?: Set<string> (nomi dei file presenti, se la cartella è stata fornita) }
 */
export function importCatalog(wb, { vendor, photoFiles = null }) {
  const errors = []
  const warnings = []
  const decisions = []
  const at = (sheet, row, col) => `${sheet.name}, riga ${row}${col ? `, "${col.header}"` : ''}`
  const colByKey = (sheet) => Object.fromEntries(sheet.columns.map((c) => [c.key, c]))

  // ── Colori ──
  const S_COL = SHEETS.colors
  const C = colByKey(S_COL)
  const colors = []
  for (const r of readTable(wb, S_COL, errors, warnings)) {
    if (!r.name) { errors.push(`${at(S_COL, r._row, C.name)}: nome mancante.`); continue }
    if (colors.some((c) => same(c.name, r.name))) errors.push(`${at(S_COL, r._row, C.name)}: il colore "${r.name}" è già elencato.`)
    else {
      const twin = colors.find((c) => slug(c.name) === slug(r.name))
      if (twin) errors.push(`${at(S_COL, r._row, C.name)}: "${r.name}" e "${twin.name}" diventano lo stesso codice colore ("cw-${slug(r.name)}"). Usate nomi che differiscono per lettere, non per punteggiatura o accenti.`)
    }
    let hex = null
    if (r.hex) {
      const m = r.hex.match(/^#?([0-9a-f]{6})$/i)
      if (m) hex = `#${m[1].toLowerCase()}`
      else errors.push(`${at(S_COL, r._row, C.hex)}: "${r.hex}" non è un codice HEX (es. #0D0D0D).`)
    } else {
      warnings.push(`${at(S_COL, r._row, C.hex)}: "${r.name}" senza codice colore. Va ricavato da una foto del tessuto.`)
    }
    colors.push({ name: r.name, nameEn: r.nameEn || null, hex, used: false })
  }

  // ── Lookbook ──
  const S_LB = SHEETS.lookbook
  const L = colByKey(S_LB)
  const lookbooks = []
  for (const r of readTable(wb, S_LB, errors, warnings)) {
    if (!r.title) { errors.push(`${at(S_LB, r._row, L.title)}: titolo mancante.`); continue }
    if (lookbooks.some((l) => same(l.title, r.title))) errors.push(`${at(S_LB, r._row, L.title)}: "${r.title}" è già elencato.`)
    if (!r.body) errors.push(`${at(S_LB, r._row, L.body)}: testo mancante.`)
    const images = r.images ? splitList(r.images) : []
    if (images.length < 3) warnings.push(`${at(S_LB, r._row, L.images)}: ${images.length} immagini, ne servono almeno 3 (16:9, 4:5, 1:1).`)
    lookbooks.push({ ...r, images, products: [] })
  }

  // ── Capi ──
  const S_PR = SHEETS.products
  const P = colByKey(S_PR)
  const items = []
  for (const r of readTable(wb, S_PR, errors, warnings)) {
    const where = (key) => at(S_PR, r._row, P[key])
    for (const c of S_PR.columns) if (c.required && !r[c.key]) errors.push(`${where(c.key)}: campo obbligatorio vuoto.`)
    if (!r.name) continue

    const handle = slug(r.name)
    if (!handle) errors.push(`${where('name')}: il nome "${r.name}" non produce un indirizzo valido.`)
    const twin = items.find((i) => i.handle === handle)
    if (twin) errors.push(`${where('name')}: "${r.name}" e "${twin.name}" (riga ${twin._row}) avrebbero lo stesso indirizzo "${handle}". Cambiate uno dei due nomi.`)
    if (r.sku && items.some((i) => i.sku && same(i.sku, r.sku))) errors.push(`${where('sku')}: codice "${r.sku}" già usato.`)

    const price = r.price ? parseMoney(r.price) : null
    if (r.price && price == null) errors.push(`${where('price')}: "${r.price}" non è un prezzo valido (es. 189 o 189,50).`)

    const stock = r.stock === '' ? null : Number(r.stock)
    if (r.stock !== '' && !(Number.isInteger(stock) && stock >= 0)) errors.push(`${where('stock')}: "${r.stock}" non è un numero intero di pezzi.`)
    const grams = r.weight === '' ? null : Number(r.weight)
    if (r.weight !== '' && !(Number.isInteger(grams) && grams >= 0)) errors.push(`${where('weight')}: "${r.weight}" non è un peso in grammi.`)

    const sizeLabels = r.sizes ? splitList(r.sizes) : []
    const dupSize = sizeLabels.find((s, i) => sizeLabels.findIndex((t) => same(t, s)) !== i)
    if (dupSize) errors.push(`${where('sizes')}: la taglia "${dupSize}" è ripetuta.`)
    const soldOut = r.soldOut ? splitList(r.soldOut) : []
    for (const s of soldOut) if (!sizeLabels.some((t) => same(t, s))) errors.push(`${where('soldOut')}: "${s}" non è fra le taglie del capo.`)
    const sizeIds = sizeLabels.map(slug)
    if (new Set(sizeIds).size !== sizeIds.length && !dupSize) errors.push(`${where('sizes')}: due taglie diventano uguali una volta semplificate (${sizeLabels.join(', ')}).`)

    const colorNames = r.colors ? splitList(r.colors) : []
    const capoColors = []
    for (const name of colorNames) {
      const c = colors.find((x) => same(x.name, name))
      if (!c) errors.push(`${where('colors')}: il colore "${name}" non è nel foglio ${S_COL.name}.`)
      else if (capoColors.includes(c)) errors.push(`${where('colors')}: il colore "${name}" è ripetuto.`)
      else { c.used = true; capoColors.push(c) }
    }

    if (r.category && !CATEGORIES.includes(r.category)) {
      const known = CATEGORIES.find((c) => same(c, r.category))
      if (known) r.category = known
      else decisions.push(`${where('category')}: categoria "${r.category}" senza sagoma 3D. Decidere se usa la sagoma "sopra" o "sotto" o se ne serve una nuova.`)
    }
    if (r.badge && !['NEW', 'ARCHIVE'].includes(r.badge.toUpperCase())) errors.push(`${where('badge')}: "${r.badge}" non è un'etichetta prevista (NEW, ARCHIVE o vuoto).`)

    const lbTitles = r.lookbook ? splitList(r.lookbook) : []
    const capoLookbooks = []
    for (const t of lbTitles) {
      const l = lookbooks.find((x) => same(x.title, t))
      if (!l) errors.push(`${where('lookbook')}: il lookbook "${t}" non è nel foglio ${S_LB.name}.`)
      else capoLookbooks.push(l)
    }

    const photos = r.photos ? splitList(r.photos) : []
    if (!photos.length) warnings.push(`${where('photos')}: nessuna foto, resterà il segnaposto grafico.`)
    if (photoFiles) for (const f of photos) if (!photoFiles.has(f)) errors.push(`${where('photos')}: il file "${f}" non è nella cartella delle foto.`)
    if (stock === 0) warnings.push(`${where('stock')}: 0 pezzi, tutte le varianti risultano esaurite finché le giacenze non vengono inserite su Shopify.`)

    const item = {
      _row: r._row, name: r.name, handle, sku: r.sku || null, category: r.category, collection: r.collection || null,
      price, stock, grams, sizeLabels, soldOut, colors: capoColors, description: r.description,
      descriptionEn: r.descriptionEn || null, details: r.details ? splitLines(r.details) : [],
      detailsEn: r.detailsEn ? splitLines(r.detailsEn) : [], badge: r.badge ? r.badge.toUpperCase() : null,
      lookbooks: capoLookbooks, photos, notes: r.notes || null,
    }
    for (const l of capoLookbooks) l.products.push(item)
    items.push(item)
  }

  if (!items.length) errors.push(`${S_PR.name}: nessun capo compilato (la riga d'esempio non conta).`)
  for (const c of colors) if (!c.used) warnings.push(`${S_COL.name}: "${c.name}" non è usato da nessun capo.`)
  for (const l of lookbooks) if (!l.products.length) warnings.push(`${S_LB.name}: "${l.title}" non è collegato a nessun capo.`)
  const noEn = items.filter((i) => !i.descriptionEn).length
  if (noEn) warnings.push(`${noEn} capi su ${items.length} senza descrizione inglese: serviranno per la versione inglese (fase 8f).`)
  if (items.length) decisions.push(`Posizione nel negozio 3D: ${items.length} capi da assegnare agli espositori (\`displayId\` nella bozza).`)

  const answers = { brand: readAnswers(wb, QUESTIONS.brand), decisions: readAnswers(wb, QUESTIONS.decisions) }
  if (errors.length) return { ok: false, errors, warnings, decisions, answers }

  // ── Uscite ──
  const pad = (n) => String(n).padStart(3, '0')
  const lookbookIds = new Map(lookbooks.map((l, i) => [l, `lb-${pad(i + 1)}`]))
  const productIds = new Map(items.map((it, i) => [it, `prod-${pad(i + 1)}`]))
  const products = items.map((it) => ({
    id: productIds.get(it), sku: it.sku, name: it.name, category: it.category, collection: it.collection,
    price: { amount: it.price, currency: 'EUR' },
    description: it.description, details: it.details,
    sizes: it.sizeLabels.map((label) => ({ id: slug(label), label, available: !it.soldOut.some((s) => same(s, label)) })),
    colorways: it.colors.map((c) => ({ id: `cw-${slug(c.name)}`, label: c.name, swatch: c.hex })),
    // Il rapporto delle foto si conferma sui file: qui si assume il 4:5 delle foto prodotto.
    media: it.photos.length
      ? it.photos.map((file, i) => ({ id: `m${i + 1}`, ratio: '4:5', label: file, variant: 'product', file }))
      : [{ id: 'm1', ratio: '4:5', label: 'Front', variant: 'product' }],
    commerce: { handle: it.handle },
    displayId: null,
    lookbookIds: it.lookbooks.map((l) => lookbookIds.get(l)),
    badges: it.badge ? [it.badge] : [],
  }))
  const lookbook = lookbooks.map((l) => ({
    id: lookbookIds.get(l), title: l.title, subtitle: l.subtitle || null, season: l.season || null,
    body: splitLines(l.body),
    images: l.images.map((file, i) => ({ id: `lbi${i + 1}`, ratio: '4:5', label: file, variant: 'editorial', file })),
    productIds: l.products.map((p) => productIds.get(p)),
  }))
  const translations = {
    products: Object.fromEntries(items.map((it) => [it.handle, { description: it.descriptionEn, details: it.detailsEn }])),
    colors: Object.fromEntries(colors.filter((c) => c.nameEn).map((c) => [c.name, c.nameEn])),
    lookbook: Object.fromEntries(lookbooks.map((l) => [l.title, l.bodyEn ? splitLines(l.bodyEn) : null])),
  }
  const csv = toShopifyCsv(items.map((it) => ({
    handle: it.handle, title: it.name, bodyHtml: productHtml(it.description, it.details), type: it.category,
    tags: [it.collection, it.badge], price: it.price, sku: it.sku, stock: it.stock, grams: it.grams,
    sizes: it.sizeLabels.map((label) => ({ label, available: !it.soldOut.some((s) => same(s, label)) })),
    colors: it.colors.map((c) => c.name),
  })), { vendor })

  return { ok: true, errors, warnings, decisions, answers, products, lookbook, translations, csv,
    photos: items.flatMap((it) => it.photos), notes: items.filter((i) => i.notes).map((i) => `${i.name}: ${i.notes}`) }
}

/** Resoconto leggibile (Markdown) da mandare anche al cliente. */
export function report(result, { source }) {
  const out = [`# Resoconto del catalogo`, '', `File: \`${source}\``, '']
  if (result.ok) {
    out.push(`**Esito: importabile.** ${result.products.length} capi, ${result.lookbook.length} lookbook, ` +
      `${result.csv.trim().split('\n').length - 1} varianti per Shopify.`, '')
  } else {
    out.push(`**Esito: da correggere.** ${result.errors.length} errori: nessun file di uscita prodotto.`, '')
  }
  const section = (title, list) => { if (list?.length) out.push(`## ${title}`, '', ...list.map((x) => `- ${x}`), '') }
  section('Errori (bloccano l\'importazione)', result.errors)
  section('Da decidere', result.decisions)
  section('Avvisi', result.warnings)
  section('Note del cliente', result.notes)
  for (const [title, group] of [['Brand', result.answers.brand], ['Domande', result.answers.decisions]]) {
    const items = Object.values(group)
    if (!items.length) continue
    out.push(`## ${title}`, '')
    for (const { q, a } of items) out.push(`- **${q}** ${a ? a.replace(/\n/g, ' / ') : '_senza risposta_'}`)
    out.push('')
  }
  return out.join('\n')
}
