/**
 * Schema del modello di catalogo da far compilare al cliente (preparazione della Fase 8c).
 * Unica definizione delle colonne: la usano sia il generatore del file Excel
 * (make-template.mjs) sia l'importatore (import.mjs), così non possono divergere.
 *
 * Le righe il cui primo campo comincia con EXAMPLE_PREFIX sono esempi e vengono ignorate.
 */
import { storeConfig } from '../../src/config/storeConfig.js'

export const EXAMPLE_PREFIX = 'ESEMPIO'
export const FIRST_DATA_ROW = 2          // riga 1 = intestazioni
export const LAST_VALIDATED_ROW = 300    // fin dove valgono i menu a tendina

// Categorie con una sagoma 3D (storeConfig.garments). Altre si possono scrivere,
// ma l'importatore le segnala: serve decidere la sagoma.
export const CATEGORIES = Object.keys(storeConfig.garments.shapeByCategory)
export const BADGES = ['NEW', 'ARCHIVE']

// type: text | list (separata da virgole) | lines (una voce per riga) | money | int | choice | hex
export const SHEETS = {
  products: {
    name: 'Capi',
    title: 'Un capo per riga. I campi con * sono obbligatori.',
    columns: [
      { key: 'name', header: 'Nome *', type: 'text', required: true, width: 26,
        help: 'Nome del capo come comparirà sul sito e su Shopify. Es. Heavy Hoodie' },
      { key: 'sku', header: 'Codice (SKU)', type: 'text', width: 14,
        help: 'Codice interno, se esiste. Es. INT-001' },
      { key: 'category', header: 'Categoria *', type: 'choice', choices: CATEGORIES, strict: false, required: true, width: 14,
        help: `Una fra: ${CATEGORIES.join(', ')}. Se il capo è di un altro tipo scrivilo: servirà una sagoma nuova nel negozio 3D.` },
      { key: 'collection', header: 'Collezione', type: 'text', width: 14, help: 'Es. DROP 01' },
      { key: 'price', header: 'Prezzo € IVA inclusa *', type: 'money', required: true, width: 14,
        help: 'Prezzo al pubblico in euro, IVA inclusa. Solo il numero: 189 oppure 189,50' },
      { key: 'sizes', header: 'Taglie *', type: 'list', required: true, width: 18,
        help: 'Tutte le taglie del capo, separate da virgola, nell\'ordine giusto. Es. XS, S, M, L, XL' },
      { key: 'soldOut', header: 'Taglie esaurite', type: 'list', width: 14,
        help: 'Le taglie (fra quelle sopra) oggi non disponibili. Es. XS, XL' },
      { key: 'colors', header: 'Colori *', type: 'list', required: true, width: 18,
        help: 'Colori del capo separati da virgola, con gli stessi nomi del foglio Colori. Es. Black, Bone' },
      { key: 'stock', header: 'Pezzi per variante *', type: 'int', required: true, width: 12,
        help: 'Quanti pezzi disponibili per ogni combinazione taglia × colore. Metti 0 se le giacenze le inserirete direttamente su Shopify.' },
      { key: 'weight', header: 'Peso (g)', type: 'int', width: 10,
        help: 'Peso del capo imballato, in grammi. Serve se la spedizione costa in base al peso.' },
      { key: 'description', header: 'Descrizione IT *', type: 'text', required: true, width: 44, wrap: true,
        help: '2–3 righe di testo in italiano.' },
      { key: 'descriptionEn', header: 'Descrizione EN', type: 'text', width: 44, wrap: true,
        help: 'La stessa descrizione in inglese (per la versione inglese del sito, dopo il lancio).' },
      { key: 'details', header: 'Dettagli IT', type: 'lines', width: 34, wrap: true,
        help: '2–4 punti: materiale, vestibilità, produzione. Uno per riga (Alt+Invio in Excel, Ctrl+Invio in Google Fogli).' },
      { key: 'detailsEn', header: 'Dettagli EN', type: 'lines', width: 34, wrap: true,
        help: 'Gli stessi dettagli in inglese, uno per riga.' },
      { key: 'badge', header: 'Etichetta', type: 'choice', choices: BADGES, strict: true, width: 11,
        help: `${BADGES.join(' oppure ')}, o vuoto.` },
      { key: 'lookbook', header: 'Lookbook', type: 'list', width: 14,
        help: 'Titolo del lookbook (foglio Lookbook) in cui compare il capo, se c\'è.' },
      { key: 'photos', header: 'Foto (nomi dei file)', type: 'list', width: 30,
        help: 'Nomi dei file delle foto, separati da virgola, nella cartella "foto". Fronte e retro in 4:5 (es. 1600×2000 px), dettagli in 1:1 o 16:9.' },
      { key: 'notes', header: 'Note', type: 'text', width: 30, wrap: true, help: 'Qualsiasi cosa da sapere su questo capo.' },
    ],
    example: {
      name: `${EXAMPLE_PREFIX} · Heavy Hoodie`, sku: 'INT-001', category: 'Hoodie', collection: 'DROP 01', price: 189,
      sizes: 'XS, S, M, L, XL', soldOut: 'XS', colors: 'Black, Bone', stock: 10, weight: 800,
      description: 'Felpa in cotone pesante, tinta in capo.', descriptionEn: 'Heavyweight cotton hoodie, garment dyed.',
      details: 'Cotone 480 g/m²\nVestibilità oversize\nMade in Florence',
      detailsEn: '480 gsm cotton\nOversized fit\nMade in Florence',
      badge: 'NEW', lookbook: 'DROP 01', photos: 'heavy-hoodie-fronte.jpg, heavy-hoodie-retro.jpg', notes: '',
    },
  },
  colors: {
    name: 'Colori',
    title: 'Un colore per riga. Il nome deve essere uguale a quello usato nel foglio Capi.',
    columns: [
      { key: 'name', header: 'Nome *', type: 'text', required: true, width: 20, help: 'Es. Black' },
      { key: 'nameEn', header: 'Nome EN', type: 'text', width: 20, help: 'Solo se in inglese è diverso.' },
      { key: 'hex', header: 'Codice colore (HEX)', type: 'hex', width: 20,
        help: 'Es. #0D0D0D. Se non lo conoscete, lasciate vuoto e mandate una foto del tessuto: lo ricaviamo noi.' },
      { key: 'notes', header: 'Note', type: 'text', width: 30 },
    ],
    example: { name: `${EXAMPLE_PREFIX} · Black`, nameEn: '', hex: '#0D0D0D', notes: '' },
  },
  lookbook: {
    name: 'Lookbook',
    title: 'Una storia (collezione o campagna) per riga.',
    columns: [
      { key: 'title', header: 'Titolo *', type: 'text', required: true, width: 18, help: 'Es. DROP 01. Usato anche nel foglio Capi.' },
      { key: 'subtitle', header: 'Sottotitolo', type: 'text', width: 26 },
      { key: 'season', header: 'Stagione', type: 'text', width: 10, help: 'Es. FW26' },
      { key: 'body', header: 'Testo IT *', type: 'lines', required: true, width: 50, wrap: true,
        help: '2 paragrafi brevi, separati da una riga vuota o da un a-capo.' },
      { key: 'bodyEn', header: 'Testo EN', type: 'lines', width: 50, wrap: true },
      { key: 'images', header: 'Immagini (nomi dei file)', type: 'list', width: 34,
        help: '3 o più: una 16:9, una 4:5, una 1:1.' },
      { key: 'notes', header: 'Note', type: 'text', width: 30 },
    ],
    example: {
      title: `${EXAMPLE_PREFIX} · DROP 01`, subtitle: 'Sottotitolo', season: 'FW26',
      body: 'Primo paragrafo.\nSecondo paragrafo.', bodyEn: 'First paragraph.\nSecond paragraph.',
      images: 'campagna-01.jpg, look-01.jpg, dettaglio-01.jpg', notes: '',
    },
  },
}

// Domande a risposta libera: marchio (docs/CONTENUTI.md §1) e decisioni che
// bloccano le fasi 8c–8e. L'importatore le riporta nel resoconto così come sono.
export const QUESTIONS = {
  brand: {
    name: 'Brand',
    items: [
      { key: 'logo', q: 'Logo vettoriale (nome del file .svg, .ai o .pdf)', now: 'Oggi un wordmark tipografico di riserva' },
      { key: 'logoDark', q: 'Versione del logo per fondo scuro (nome del file)', now: 'Il negozio 3D è nero' },
      { key: 'colors', q: 'Colori del brand (HEX o Pantone + HEX)', now: 'Flame Orange #F98E30 · nero #060606 · osso #F2F0EA' },
      { key: 'fonts', q: 'Font del brand (nome; file con licenza web se proprietario)', now: 'Archivo · JetBrains Mono · UnifrakturCook' },
      { key: 'tagline', q: 'Tagline esatta (maiuscole e punteggiatura comprese)', now: "We're just looking for somewhere" },
      { key: 'origin', q: 'Città e coordinate', now: "Florence, Italy · 43°46'N 11°15'E" },
      { key: 'credit', q: 'Credito', now: 'Curated and produced by Tommaso Inturrisi' },
      { key: 'guidelines', q: 'Manuale d\'uso del marchio, se esiste (nome del file)', now: '' },
    ],
  },
  decisions: {
    name: 'Domande',
    items: [
      { key: 'pricesFinal', q: 'I prezzi del foglio Capi sono definitivi? (sì / no)', now: '' },
      { key: 'shipCountries', q: 'In quali paesi spedite? (solo Italia, tutta l\'UE, elenco)', now: 'Oggi solo Italia' },
      { key: 'shipRates', q: 'Quanto costa la spedizione? (tariffa fissa, gratuita sopra una soglia, per peso)', now: '' },
      { key: 'returns', q: 'Resi: entro quanti giorni, chi paga la spedizione del reso?', now: 'Il recesso per legge è di almeno 14 giorni' },
      { key: 'ownerEmail', q: 'Email del proprietario del negozio Shopify (riceverà il trasferimento)', now: 'Deve essere un\'email che userete per anni' },
      { key: 'seller', q: 'Ragione sociale, sede legale, P.IVA, REA, PEC o email', now: 'Obbligatori sul sito per la vendita online' },
      { key: 'contact', q: 'Email e telefono per l\'assistenza clienti', now: '' },
      { key: 'english', q: 'Testi in inglese: chi li scrive e per quando?', now: 'La versione inglese arriva dopo il lancio' },
    ],
  },
}

/** Testo per l'handle Shopify: minuscole, cifre e trattini (invariante I23). */
export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
