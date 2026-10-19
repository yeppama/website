/**
 * storeConfig.js — il "CMS locale".
 *
 * Unica fonte di verità per mappa, luci, collider, navigazione, prodotti e testi.
 * Nessun componente di scena o di interfaccia contiene una coordinata, un colore,
 * un prezzo o una frase: tutto arriva da qui, e le relazioni usano ID.
 *
 * Unità: metri. Y verso l'alto. Rotazioni in radianti.
 *
 * Marchio, capi, Lookbook e i testi che cambiano col marchio stanno in
 * `src/content/` (scelto con VITE_CONTENT): qui c'è il negozio, uguale per tutti.
 */
import content from '../content/index.js'
import { layouts, layoutId } from '../layouts/index.js'

// Colonne strutturali: una griglia dichiarata qui, da cui derivano sia la
// geometria visibile sia i collider. Nessun componente conosce queste posizioni.
const COLUMN_GRID = { xs: [-9, 9], zs: [12, 4, -4, -12], size: [0.7, 4.2, 0.7] }
// Margine invisibile attorno agli espositori: il player si ferma prima di toccare
// maniche, grucce e pile (richiesta dell'utente, 2026-10-17). Allarga i collider degli
// espositori su entrambi i lati del piano; l'altezza resta quella del mobile.
const DISPLAY_CLEARANCE = 0.2
const guarded = (c) => ({ ...c, size: [c.size[0] + 2 * DISPLAY_CLEARANCE, c.size[1], c.size[2] + 2 * DISPLAY_CLEARANCE] })
// Corridoi laterali del grafo di navigazione, fra le colonne e le pareti.
const AISLE_X = 10.35
const AISLE_ZS = [16, 8, 0, -8, -16]
const aisleId = (side, z) => `wp-aisle-${side}-${z < 0 ? 'm' : 'p'}${Math.abs(z)}`
const AISLE_WAYPOINTS = ['w', 'e'].flatMap((side) => AISLE_ZS.map((z) => ({
  id: aisleId(side, z), position: [side === 'w' ? -AISLE_X : AISLE_X, 0, z], label: null, safeForTeleport: false,
})))
const AISLE_LINKS = ['w', 'e'].flatMap((side) => [
  // catena lungo il corridoio
  ...AISLE_ZS.slice(1).map((z, i) => [aisleId(side, AISLE_ZS[i]), aisleId(side, z)]),
  // raccordi con il grafo centrale
  ['wp-entrance', aisleId(side, 16)],
  [side === 'w' ? 'wp-new-01' : 'wp-arch-01', aisleId(side, 8)],
  ['wp-hall-02', aisleId(side, 0)],
  ['wp-look-01', aisleId(side, -8)],
])

const COLUMNS = COLUMN_GRID.xs.flatMap((x) => COLUMN_GRID.zs.map((z) => ({
  id: `col-${x < 0 ? 'w' : 'e'}-${z < 0 ? 'm' : 'p'}${Math.abs(z)}`,
  position: [x, 0, z],
  size: COLUMN_GRID.size,
  materialId: 'mat-concrete-raw',
  colliderId: `colb-${x < 0 ? 'w' : 'e'}-${z < 0 ? 'm' : 'p'}${Math.abs(z)}`,
  groundShadow: true,
})))

// Dove sta ogni capo lo dice il contenuto (products[].displayId); l'espositore li
// elenca nello stesso ordine. Un espositore con un capo solo prende il suo nome
// anche sull'etichetta del POI, altrimenti resta il nome dell'espositore.
// Un allestimento diverso dal negozio (src/layouts/) ricolloca i capi nei suoi espositori.
const layout = layouts[layoutId]
const products = layout
  ? content.products.map((p) => ({ ...p, displayId: layout.placement[p.id] ?? null }))
  : content.products
const productsOn = (displayId) => products.filter((p) => p.displayId === displayId).map((p) => p.id)
const poiLabel = (displayId, fallback) => {
  const ids = productsOn(displayId)
  return ids.length === 1 ? products.find((p) => p.id === ids[0]).name : fallback
}
const mainLookbookId = content.lookbook[0]?.id ?? null

export const storeConfig = {
  meta: {
    schemaVersion: '1.0.0',
    brand: content.brand,
    units: 'meters',
  },

  performance: {
    targetFps: 60,
    toneMappingExposure: 0.85,
    tiers: {
      // maxAccentLights: luci vere arancioni accese dai punti luce d'accento (scene/lighting/AccentLights.jsx).
      high:   { dprRange: [1, 2],    maxShadowCasters: 2, shadowMapSize: 1024, envMapResolution: 256, antialias: true,  maxAccentLights: 3 },
      medium: { dprRange: [1, 1.5],  maxShadowCasters: 2, shadowMapSize: 512,  envMapResolution: 128, antialias: true,  maxAccentLights: 2 },
      low:    { dprRange: [0.75, 1], maxShadowCasters: 0, shadowMapSize: 256,  envMapResolution: 64,  antialias: false, maxAccentLights: 0 },
    },
    // HUD prestazioni (Fase 6): finestra delle statistiche e frequenza di aggiornamento.
    // Si attiva con ?perf=1 (anche in produzione) e durante il benchmark (?bench=1).
    monitor: { windowMs: 5000, publishHz: 2 },
    budgets: {
      drawCalls: { high: 120, medium: 80, low: 60 },
      triangles: { high: 400000, medium: 220000, low: 140000 },
      initialJsGzipKb: 380,
    },
    // D3-A: quando maxShadowCasters = 0, l'ombra diventa un'ellisse a terra.
    groundShadow: { mode: 'blob', opacity: 0.45, radiusScale: 1.15 },
    // D6-B: velo di grana sopra il canvas, fuori dalla pipeline WebGL.
    postFx: {
      // blend 'alpha' (scelta dell'utente, 2026-10-16): solo granelli scuri, fusione
      // normale. L'overlay costava da solo ~20 fps su un portatile Iris Xe a 1920×911
      // (39,5 contro 56,2 con 'alpha', docs/PERF.md) e alzava il nero. 'overlay' resta
      // disponibile qui e, per confronto, con ?perf=1&grain=overlay.
      // Tier low senza grana (scelta dell'utente, 2026-10-16): sull'Honor con Adreno 619
      // la grana dava 4 fotogrammi oltre 50 ms (max 140 ms), senza nessuno (docs/PERF.md).
      grain: { mode: 'overlay', blend: 'alpha', opacity: { high: 0.14, medium: 0.12, low: 0 },
               alphaOpacity: { high: 0.2, medium: 0.18, low: 0 }, tileSize: 256, animateHz: 12 },
      vignette: { enabled: true, strength: 0.38 },
    },
  },

  // Cosa esiste davvero in questa build. L'interfaccia legge questi flag e non
  // promette comandi che non funzionano ancora: un'istruzione per una funzione
  // spenta viene mostrata come "in arrivo", non come un comando.
  features: {
    navigation:   { enabled: true,  availableInPhase: 3 },
    focusMode:    { enabled: true,  availableInPhase: 4 },
    productModal: { enabled: true,  availableInPhase: 5 },
    lookbook:     { enabled: true,  availableInPhase: 5 },
    // Nessun acquisto in questo prototipo: il bottone c'è, spento, e lo dichiara.
    checkout:     { enabled: false, availableInPhase: 8 },
  },

  // Percorso di benchmark (?bench=1, PLAN §5.3): sempre la stessa traiettoria,
  // così le misure di dispositivi diversi sono confrontabili. ~40 s.
  // place: posa istantanea · hold: fermo · walk: percorso del navigatore ·
  // focus: Focus Mode su un espositore · face: rotazione verso un punto.
  benchmark: {
    warmupMs: 2500,
    stepTimeoutMs: 30000,
    suggestedRuns: 3,
    steps: [
      { type: 'place', waypointId: 'wp-entrance', label: 'Ingresso' },
      { type: 'hold', ms: 2000, label: 'Ingresso' },
      { type: 'walk', waypointId: 'wp-new-01', faceAt: [-7.7, 1.25, 6.6], label: 'Nuovi Arrivi' },
      { type: 'focus', displayId: 'disp-mannequin-01', holdMs: 3500, label: 'Focus · manichino' },
      { type: 'walk', waypointId: 'wp-arch-01', faceAt: [6.5, 0.95, 7.0], label: 'Archivio' },
      { type: 'focus', displayId: 'disp-plinth-01', holdMs: 3500, label: 'Focus · plinto' },
      { type: 'walk', waypointId: 'wp-look-01', faceAt: [0, 1.6, -14], label: 'Lookbook' },
      { type: 'face', point: [-10, 1.6, -9], ms: 2500, label: 'Lookbook' },
      { type: 'face', point: [10, 1.6, -9], ms: 2500, label: 'Lookbook' },
      { type: 'walk', waypointId: 'wp-entrance', label: 'Ritorno' },
    ],
  },

  // Commercio (Fase 8, docs/PLAN-8.md). Shopify è la fonte di verità di prezzi,
  // varianti e giacenze; qui solo il collegamento (products[].commerce.handle) e le
  // regole del carrello. provider: 'off' (nessun acquisto) | 'mock' (negozio di
  // prova, nessun pagamento) | 'shopify' (Fase 8b). ?commerce=mock lo forza per le prove.
  commerce: {
    provider: content.commerce?.provider ?? 'off',
    country: 'IT',
    maxQuantity: 10,
    cartStorageKey: 'into-cart-id',
    mock: { latencyMs: 250, storageKey: 'into-mock-carts', checkoutUrl: '#checkout-di-prova',
            // Pagine legali del negozio di prova: segnaposto dichiarato, con la formattazione
            // che le policy di Shopify usano davvero (titoletti, elenchi, link).
            policyHtml: '<p>Testo segnaposto. Nel negozio vero questa pagina arriva da Shopify, dove la scrive il venditore.</p>' +
              '<h2>Sezione</h2><ul><li>Primo punto</li><li>Secondo punto</li></ul>' +
              '<p>Contatti: <a href="mailto:info@example.com">info@example.com</a></p>' },
    // Pagine legali (preparazione della Fase 8d): i testi stanno su Shopify (Impostazioni →
    // Informative), li scrive il venditore e il sito li legge con la Storefront API.
    // Nessun testo legale nel codice. Il menu mostra solo quelle pubblicate; il controllo
    // `npm run check:catalog -- --launch` le pretende tutte prima della vendita.
    policies: [
      { id: 'terms-of-sale',    field: 'termsOfSale' },
      { id: 'refund',           field: 'refundPolicy' },
      { id: 'shipping',         field: 'shippingPolicy' },
      { id: 'privacy',          field: 'privacyPolicy' },
      { id: 'terms-of-service', field: 'termsOfService' },
      { id: 'legal-notice',     field: 'legalNotice' },
      { id: 'contact',          field: 'contactInformation' },
    ],
    // Fase 8b: negozio di SVILUPPO dell'agenzia (nessun pagamento reale). Il token è
    // quello PUBBLICO del canale Headless, fatto per stare nel codice del sito; il
    // token privato non va mai qui. In 8c dominio e token diventano quelli del
    // cliente. Le variabili d'ambiente VITE_SHOPIFY_* li sostituiscono senza commit.
    shopify: {
      domain: 'into-industries-dev.myshopify.com',
      storefrontToken: 'b01d16e3db47daf418b38cf9cef3e240',
      apiVersion: '2026-10',   // ultima stabile al 2026-10-16, supportata fino al 2027-10-16 (shopify.dev)
      // Negozio di sviluppo: solo pagamenti di prova. Lo si dice in scheda e carrello.
      testMode: true,
      // Nomi delle opzioni Shopify che corrispondono a taglia e colore.
      optionNames: { size: ['Taglia', 'Size'], color: ['Colore', 'Color'] },
    },
  },

  // Stadi reali del caricamento. Il peso è la quota della barra assegnata allo
  // stadio: non misura byte, misura passaggi che avvengono davvero.
  loading: {
    stages: [
      { id: 'boot',    progress: 0.15, label: 'Avvio' },
      { id: 'module',  progress: 0.6,  label: 'Motore 3D' },
      { id: 'context', progress: 0.8,  label: 'Contesto WebGL' },
      { id: 'frame',   progress: 1.0,  label: 'Primo fotogramma' },
    ],
  },

  // Focus Mode (Fase 4): la camera lascia il player e va sul prodotto. La luce
  // passa dal mondo editoriale al mondo "studio" del brand: il faretto
  // dell'espositore sale e si raffredda, il resto della scena si abbassa.
  focus: {
    // Il "mondo studio" nasce dal contrasto (il resto si spegne), non da più luce
    // sul capo: con un aumento forte, il nero diventava grigio e il chiaro bruciava.
    lighting: { spotBoost: 1.15, studioColor: '#f6f3ec', othersDim: 0.3, ambientDim: 0.6, blendMs: 700 },
    // Come per il player: in verticale il fov della posa si allarga quanto basta
    // a garantire questo campo orizzontale, senza superare il massimo.
    minHorizontalFov: 34,
    maxVerticalFov: 72,
    idleDrift: { amplitude: 0.035, periodSeconds: 9 },
    // Click a cursore catturato: un espositore oltre questa distanza non si apre.
    maxClickDistance: 7.5,
    vignetteStrength: 0.55,
  },

  // Segnaposto 3D dei capi: forma dalla categoria, colore dalla prima variante.
  garments: {
    shapeByCategory: { Hoodie: 'top', Jacket: 'top', 'T-Shirt': 'top', Pants: 'bottom' },
    materialId: 'mat-fabric',
    cordColor: '#f98e30',   // il cordino della reference: un dettaglio, non una campitura
    // Capi con la foto (contenuto con `model3d`): misure del capo appeso e ritagli della
    // foto (frazioni del riquadro del capo: x0, y0, x1, y1 con y dall'alto) per il busto
    // del manichino e per il capo in cima alle pile piegate.
    photo: {
      topWidth: 0.74,
      bottomHeight: 1.0,
      shellCrop: { Hoodie: [0.26, 0.17, 0.74, 0.96], default: [0.25, 0.04, 0.75, 0.96] },
      stackCrop: { top: [0.28, 0.22, 0.72, 0.58], bottom: [0.12, 0.0, 0.88, 0.32] },
      roughness: 0.9,
      // Soglia della trasparenza della foto: sotto è fondo, sopra è capo.
      alphaTest: 0.5,
    },
    // Capi in 3D (contenuto `model3d.glb`, allestimento del cantiere): il GLB ridotto, scalato
    // all'altezza della sua forma. Arriva senza normali: si mediano fra vertici vicini, salvo
    // spigoli oltre `creaseAngle` (calcolate a facce darebbero un capo sfaccettato).
    model: { height: { top: 0.72, bottom: 1.0 }, creaseAngle: Math.PI / 3, roughness: 0.9 },
  },

  // Camera della Fase 1b: posa fissa. La navigazione arriva in Fase 3.
  // Fase 2: inquadrature statiche. La camera non si muove liberamente (quella è
  // la Fase 3): passa da una posa fissa all'altra con una transizione.
  camera: {
    defaultShotId: 'shot-entrance',
    transitionMs: 1400,
    shots: [
      { id: 'shot-entrance', label: 'Ingresso',     zoneId: 'zone-entrance',
        position: [0, 1.75, 15.5],  target: [0, 1.85, -4],   fov: 54 },
      { id: 'shot-new',      label: 'Nuovi Arrivi', zoneId: 'zone-new',
        position: [-1.4, 1.7, 13.2], target: [-7.2, 0.7, 6.0], fov: 52 },
      { id: 'shot-archive',  label: 'Archivio',     zoneId: 'zone-archive',
        position: [1.4, 1.7, 13.2],  target: [7.2, 0.7, 6.0],  fov: 52 },
      { id: 'shot-lookbook', label: 'Brand Wall',   zoneId: 'zone-lookbook',
        position: [0, 1.6, -3.5],   target: [0, 2.2, -18],   fov: 56 },
      { id: 'shot-portal',   label: 'Uscita',       zoneId: 'zone-entrance',
        position: [0, 1.7, 6.5],    target: [0, 1.8, 18],    fov: 56 },
    ],
    idleSway: { enabled: true, amplitude: 0.055, periodSeconds: 14 },
    near: 0.1,
    far: 70,
    // Pose alternative per la verifica visiva, attivabili con ?debug=<chiave>.
    // Servono a me per controllare la scena, non all'utente finale.
    debugPoses: {
      top:   { position: [0, 30, 0.1], target: [0, 0, 0], fov: 60 },
      front: { position: [0, 2.0, 16.5], target: [0, 1.2, -18], fov: 70 },
    },
  },

  environment: {
    floor: {
      size: [24, 36],
      materialId: 'mat-concrete-polished',
      gridTexture: { cell: 3.0, lineWidth: 0.022, tint: '#3e3f48' },
    },
    ceiling: { height: 4.2, materialId: 'mat-ceiling-matte', visible: true },
    // Ogni muro è puramente visivo. La collisione vive in `colliders` via colliderId.
    // Il vano d'ingresso è l'assenza di un segmento, non un foro booleano.
    walls: [
      { id: 'wall-n',       from: [-12, -18], to: [ 12, -18], height: 4.2, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-wall-n' },
      { id: 'wall-e',       from: [ 12, -18], to: [ 12,  18], height: 4.2, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-wall-e' },
      { id: 'wall-w',       from: [-12, -18], to: [-12,  18], height: 4.2, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-wall-w' },
      { id: 'wall-s-left',  from: [-12,  18], to: [ -1.5, 18], height: 4.2, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-wall-s-left' },
      { id: 'wall-s-right', from: [  1.5, 18], to: [ 12,  18], height: 4.2, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-wall-s-right' },
    ],
    zones: [
      { id: 'zone-entrance', label: 'Ingresso',     bounds: [[-4, 12], [4, 18]],   accentColor: 'accent.flame',   ambientBoost: 0.15, floorLabel: false },
      { id: 'zone-new',      label: 'Nuovi Arrivi', bounds: [[-11, 2], [-2, 12]],  accentColor: 'accent.flame',   ambientBoost: 0.0,  floorLabel: true },
      { id: 'zone-archive',  label: 'Archivio',     bounds: [[2, 2], [11, 12]],    accentColor: 'accent.flame', ambientBoost: -0.05, floorLabel: true },
      { id: 'zone-lookbook', label: 'Lookbook',     bounds: [[-6, -16], [6, -6]],  accentColor: 'accent.bone',    ambientBoost: 0.1,  floorLabel: true },
    ],
    entrance: {
      waypointId: 'wp-entrance', lookAtWaypointId: 'wp-hall-01',
      // L'architrave è sopra la testa: niente collider, non deve bloccare il passaggio.
      lintel:    { center: [0, 3.65, 18], size: [3.2, 1.1, 0.2], materialId: 'mat-plaster-dark' },
      threshold: { center: [0, 0.006, 17.75], size: [3.0, 0.012, 0.14], materialId: 'mat-accent-flame' },
      // Oltre la soglia si intravede il mondo "studio" del brand: senza, il vano
      // della porta è un rettangolo nero e l'inquadratura d'uscita non ha soggetto.
      exteriorGlow: { center: [0, 1.6, 18.9], size: [3.4, 3.4], color: '#dcdcd8', intensity: 0.62 },
    },

    architecture: {
      columns: COLUMNS,
      // Pedane "studio": il mondo chiaro del brand, sotto le zone espositive.
      // 6 cm: calpestabili, senza collider.
      platforms: [
        { id: 'plat-new',     zoneId: 'zone-new',      center: [-6.5, 0.03, 7.0],  size: [5.0, 0.06, 4.0], materialId: 'mat-bone-seamless' },
        { id: 'plat-archive', zoneId: 'zone-archive',  center: [6.5, 0.03, 7.0],   size: [5.0, 0.06, 4.0], materialId: 'mat-bone-seamless' },
        { id: 'plat-look',    zoneId: 'zone-lookbook', center: [0, 0.03, -15.6],   size: [8.0, 0.06, 4.4], materialId: 'mat-bone-seamless' },
      ],
      // Binari a soffitto: giustificano i faretti. Un faretto che pende dal nulla
      // si legge come un effetto, uno appeso a un binario come architettura.
      ceilingTracks: [
        { id: 'track-w',      from: [-6.5, 12.5], to: [-6.5, 2.0],  materialId: 'mat-steel-dark' },
        { id: 'track-e',      from: [6.5, 12.5],  to: [6.5, 2.0],   materialId: 'mat-steel-dark' },
        { id: 'track-c',      from: [0, 15.0],    to: [0, -14.0],   materialId: 'mat-steel-dark' },
        { id: 'track-wash-w', from: [-10.5, 13.0], to: [-10.5, 1.0], materialId: 'mat-steel-dark' },
        { id: 'track-wash-e', from: [10.5, 13.0],  to: [10.5, 1.0],  materialId: 'mat-steel-dark' },
      ],
      trackSection: 0.08,
      fixture: { radius: 0.11, length: 0.28, materialId: 'mat-steel-dark' },
    },

    // Parete del brand: il punto di fuga dell'inquadratura d'ingresso.
    // P1: il logo vettoriale non è ancora arrivato, quindi il segno è il wordmark
    // tipografico di fallback dichiarato in assets.registry.
    brandWall: {
      sign:  { assetId: 'asset-logo-primary', center: [0, 2.95, -17.86], width: 5.4, color: '#f98e30' },
      panel: { lookbookId: mainLookbookId, center: [0, 1.15, -17.86], size: [4.8, 1.5], materialId: 'mat-sign-panel' },
    },
    // Spenta per scelta dell'utente (2026-10-16): le Fasi 2–6 sono state approvate
    // senza, perché fino alla Fase 6 non veniva disegnata. Anteprima con ?fog=1.
    fog: { enabled: false, color: '#060606', near: 26, far: 72 },
    // Punti luce arancioni (2026-10-19, "troppo cupi"): barre LED sui muri lontano dai capi.
    // Le prime voci con `light` accendono anche una luce vera, fino a tier.maxAccentLights.
    accentLights: [
      { id: 'led-w-deep', center: [-11.86, 2.1, -12], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [1, 0, 0], light: { intensity: 30, distance: 11 } },
      { id: 'led-e-deep', center: [11.86, 2.1, -12], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [-1, 0, 0], light: { intensity: 30, distance: 11 } },
      { id: 'led-n-w', center: [-6.5, 2.1, -17.86], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [0, 0, 1], light: { intensity: 24, distance: 10 } },
      { id: 'led-n-e', center: [6.5, 2.1, -17.86], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [0, 0, 1] },
      { id: 'led-w-mid', center: [-11.86, 2.1, -4], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [1, 0, 0] },
      { id: 'led-e-mid', center: [11.86, 2.1, -4], length: 3.0, axis: 'y', thickness: 0.08, haloSpread: 1.0, facing: [-1, 0, 0] },
      { id: 'led-door', center: [0, 3.3, 17.86], length: 3.4, axis: 'x', thickness: 0.07, haloSpread: 0.7, facing: [0, 0, -1] },
    ],
  },

  lighting: {
    // Aspetto comune dei punti luce d'accento (environment.accentLights di ogni allestimento).
    accent: { color: '#f98e30', thickness: 0.045, haloBack: 0.03, haloSpread: 0.55, lightOffset: 0.35, lightDecay: 2 },
    ambient:    { intensity: 0.95, color: '#8d9298' },
    hemisphere: { skyColor: '#343840', groundColor: '#0d0d0f', intensity: 0.6 },
    // Ordinati per `priority`: il tier taglia dalla coda oltre maxShadowCasters.
    spots: [
      { id: 'spot-hall-studio', priority: 1, kind: 'studio', zoneId: 'zone-new',
        position: [-6.5, 3.95, 10.2], targetPosition: [-6.5, 0.6, 6.6],
        angle: 0.5, penumbra: 0.65, intensity: 140, distance: 26, decay: 1.4,
        color: '#fff1e2', castShadow: true },
      { id: 'spot-hall-flame',  priority: 2, kind: 'flame', zoneId: 'zone-archive',
        position: [6.5, 3.95, 10.0], targetPosition: [6.5, 0, 7.0],
        angle: 0.52, penumbra: 0.8, intensity: 125, distance: 26, decay: 1.4,
        color: '#ffe6cc', castShadow: true },
      { id: 'spot-entrance',    priority: 3, kind: 'flame', zoneId: 'zone-entrance',
        position: [0, 3.95, 13.0], targetPosition: [0, 0, 9.5],
        angle: 0.62, penumbra: 0.9, intensity: 150, distance: 18, decay: 1.6,
        color: '#f98e30', castShadow: false },
      { id: 'spot-deep',        priority: 4, kind: 'studio', zoneId: 'zone-lookbook',
        position: [0, 3.95, -11.5], targetPosition: [0, 1.1, -17.8],
        angle: 0.58, penumbra: 0.7, intensity: 400, distance: 24, decay: 1.3,
        color: '#e8edf2', castShadow: false },
      { id: 'spot-portal', priority: 7, kind: 'studio', zoneId: 'zone-entrance',
        position: [0, 3.95, 12.5], targetPosition: [0, 1.6, 18.0],
        angle: 0.75, penumbra: 0.9, intensity: 240, distance: 16, decay: 1.4,
        color: '#e9edf2', castShadow: false },
      { id: 'spot-rack', priority: 8, kind: 'studio', zoneId: 'zone-new',
        position: [-10.5, 3.95, 9.4], targetPosition: [-11.5, 1.15, 8.0],
        angle: 0.62, penumbra: 0.75, intensity: 95, distance: 12, decay: 1.4,
        color: '#f2efe8', castShadow: false },
      { id: 'spot-wall-01', priority: 9, kind: 'flame', zoneId: 'zone-archive',
        position: [10.5, 3.95, 9.4], targetPosition: [11.55, 1.4, 8.0],
        angle: 0.62, penumbra: 0.75, intensity: 90, distance: 12, decay: 1.4,
        color: '#f6ece0', castShadow: false },
      { id: 'spot-wash-w', priority: 5, kind: 'studio', zoneId: 'zone-new',
        position: [-10.5, 3.95, 3.0], targetPosition: [-11.8, 1.6, -8.0],
        angle: 0.95, penumbra: 1.0, intensity: 300, distance: 34, decay: 1.1,
        color: '#c9d2dc', castShadow: false },
      { id: 'spot-wash-e', priority: 6, kind: 'flame', zoneId: 'zone-archive',
        position: [10.5, 3.95, 3.0], targetPosition: [11.8, 1.6, -8.0],
        angle: 0.95, penumbra: 1.0, intensity: 260, distance: 34, decay: 1.1,
        color: '#ffad5e', castShadow: false },
    ],
    materials: {
      'mat-concrete-polished': { color: '#1b1c21', roughness: 0.5, metalness: 0.08, grid: true },
      'mat-plaster-dark':      { color: '#17181d', roughness: 0.9, metalness: 0.0 },
      'mat-ceiling-matte':     { color: '#0a0a0c', roughness: 1.0,  metalness: 0.0 },
      'mat-steel-brushed':     { color: '#8d9298', roughness: 0.32, metalness: 0.95 },
      'mat-mannequin':         { color: '#cfd2d6', roughness: 0.42, metalness: 0.08 },
      'mat-bone-seamless':     { color: '#dcdcd8', roughness: 0.95, metalness: 0.0 },
      'mat-concrete-raw':      { color: '#3a3b40', roughness: 0.96, metalness: 0.0 },
      'mat-steel-dark':        { color: '#2a2c31', roughness: 0.38, metalness: 0.85 },
      'mat-sign-panel':        { color: '#0d0d0f', roughness: 0.7,  metalness: 0.0 },
      // Tessuto: il colore arriva dalla variante del prodotto, qui solo la risposta alla luce.
      'mat-fabric':            { color: '#ffffff', roughness: 0.93, metalness: 0.0 },
      'mat-mannequin-matte':   { color: '#d9d6cf', roughness: 0.55, metalness: 0.02 },
      'mat-accent-flame':      { color: '#f98e30', roughness: 0.4,  metalness: 0.0, emissive: '#f98e30', emissiveIntensity: 0.6 },
      // Allestimento del cantiere: tubi neri del rack, catene, blocchi di cemento.
      'mat-pipe-black':        { color: '#121214', roughness: 0.35, metalness: 0.9 },
      'mat-chain-steel':       { color: '#5a5148', roughness: 0.2,  metalness: 0.9 },
      'mat-cinder-block':      { color: '#8a8984', roughness: 0.95, metalness: 0.0 },
    },
  },

  // TASSATIVO: il player collide SOLO contro questi box, mai contro le mesh visibili.
  colliders: [
    { id: 'col-wall-n',       center: [0, 2.1, -18],    size: [24.4, 4.2, 0.4], rotationY: 0 },
    { id: 'col-wall-e',       center: [12, 2.1, 0],     size: [0.4, 4.2, 36.4], rotationY: 0 },
    { id: 'col-wall-w',       center: [-12, 2.1, 0],    size: [0.4, 4.2, 36.4], rotationY: 0 },
    { id: 'col-wall-s-left',  center: [-6.75, 2.1, 18], size: [10.5, 4.2, 0.4], rotationY: 0 },
    { id: 'col-wall-s-right', center: [6.75, 2.1, 18],  size: [10.5, 4.2, 0.4], rotationY: 0 },
    guarded({ id: 'col-disp-mann-01', center: [-7.7, 1.0, 6.6],   size: [0.9, 2.0, 0.9],  rotationY: 0.42 }),
    guarded({ id: 'col-disp-mann-02', center: [-5.3, 1.0, 6.6],   size: [0.9, 2.0, 0.9],  rotationY: -0.42 }),
    guarded({ id: 'col-disp-rack-01', center: [-11.55, 1.0, 8.0], size: [2.3, 2.0, 0.5],  rotationY: Math.PI / 2 }),
    guarded({ id: 'col-disp-wall-01', center: [11.62, 1.2, 8.0],  size: [2.1, 2.4, 0.35], rotationY: -Math.PI / 2 }),
    ...COLUMNS.map((c) => ({ id: c.colliderId, center: [c.position[0], c.size[1] / 2, c.position[2]], size: c.size, rotationY: 0 })),
    guarded({ id: 'col-plinth-01',    center: [6.5, 0.6, 7.0],  size: [1.5, 1.2, 1.5],  rotationY: 0 }),
  ],

  navigation: {
    player: {
      eyeHeight: 1.65, radius: 0.35,
      walkSpeed: 3.0, sprintMultiplier: 1.6, acceleration: 14, damping: 10,
      lookSensitivity: { desktop: 0.0022, mobileDrag: 0.0045, mouseDrag: 0.0035 },
      pitchClamp: [-1.2, 1.2],
      // In verticale lo schermo è stretto: il fov verticale si allarga quanto basta
      // a garantire un campo orizzontale minimo, senza superare il massimo.
      fov: { vertical: 60, minHorizontal: 50, maxVertical: 85 },
      autoMove: { speed: 3.4, arriveRadius: 0.25, turnSpeed: 6.0 },
    },
    walkableAreas: [{ id: 'walk-hall', bounds: [[-11, -17], [11, 17]] }],
    input: {
      // Un tocco diventa trascinamento oltre questa distanza o durata: sotto
      // entrambe è un tap. Senza soglie, ogni sguardo diventerebbe uno spostamento.
      tapMaxMovePx: 10,
      tapMaxMs: 350,
      // Un frame lento si recupera in più passi da al massimo `maxStepDt`, così la
      // camminata resta in tempo reale anche a pochi fps. Oltre `maxCatchUp`
      // (es. ritorno da un'altra scheda) si accetta il rallentatore, non il salto.
      maxStepDt: 0.05,
      maxCatchUp: 0.25,
    },
    teleport: { fadeMs: 220 },
    hotspot: { color: '#f98e30', width: 0.9, bob: 0.06, bobPeriodSeconds: 3.2, tapRadius: 0.9, pinColor: '#f98e30',
               // Indicatore a terra davanti all'espositore (pois[].floorMarker): si vede anche
               // guardando in basso, quando l'hotspot sopra è fuori dall'inquadratura, e si tocca.
               floor: { radius: 0.36, ratio: 1.7, ring: 0.16, pulseSeconds: 2.4, tapScale: 1.4 } },
    feedback: { pingMs: 650, pathColor: '#f98e30' },
    waypoints: [
      { id: 'wp-entrance', position: [0, 0, 15.5],  label: 'Ingresso',      safeForTeleport: true,  lookAt: [0, 1.65, 10] },
      { id: 'wp-hall-01',  position: [0, 0, 10.0],  label: null,            safeForTeleport: false },
      { id: 'wp-new-01',   position: [-6.5, 0, 9.0], label: 'Nuovi Arrivi', safeForTeleport: true,  lookAt: [-6.5, 1.4, 7.0] },
      { id: 'wp-arch-01',  position: [6.5, 0, 9.0],  label: 'Archivio',     safeForTeleport: true,  lookAt: [6.5, 1.1, 7.0] },
      { id: 'wp-hall-02',  position: [0, 0, 0.0],   label: null,            safeForTeleport: false },
      { id: 'wp-look-01',  position: [0, 0, -9.0],  label: 'Lookbook',      safeForTeleport: true,  lookAt: [0, 1.6, -14] },
      ...AISLE_WAYPOINTS,
    ],
    // Le diagonali wp-new-01/wp-arch-01 → wp-hall-02 sono state rimosse in Fase 2:
    // l'invariante I16 ha rilevato che la seconda attraversava il plinto, e la
    // prima passava solo grazie alla rotazione del manichino. Il grafo resta
    // connesso attraverso wp-hall-01.
    links: [
      ['wp-entrance', 'wp-hall-01'], ['wp-hall-01', 'wp-new-01'], ['wp-hall-01', 'wp-arch-01'],
      ['wp-hall-01', 'wp-hall-02'], ['wp-hall-02', 'wp-look-01'],
      ...AISLE_LINKS,
    ],
    quickTravel: [
      { id: 'qt-entrance', waypointId: 'wp-entrance', label: 'Ingresso', zoneId: 'zone-entrance' },
      { id: 'qt-new',      waypointId: 'wp-new-01',   label: 'Nuovi Arrivi', zoneId: 'zone-new' },
      { id: 'qt-archive',  waypointId: 'wp-arch-01',  label: 'Archivio', zoneId: 'zone-archive' },
      { id: 'qt-look',     waypointId: 'wp-look-01',  label: 'Lookbook', zoneId: 'zone-lookbook' },
    ],
  },

  // Espositori e POI sono definiti ma non ancora renderizzati: arrivano in Fase 2 e 4.
  // Fase 4: cinque espositori, uno per ogni tipo previsto dallo schema.
  // Ogni espositore porta con sé collider, faretto, hotspot e posa di Focus.
  displays: [
    { id: 'disp-mannequin-01', kind: 'mannequin', zoneId: 'zone-new', label: 'Nuovi Arrivi · 01',
      position: [-7.7, 0.06, 6.6], rotationY: 0.42,
      colliderId: 'col-disp-mann-01', approachWaypointId: 'wp-new-01',
      assetId: 'asset-mannequin-a', materialIds: { body: 'mat-mannequin-matte', base: 'mat-steel-dark' },
      productIds: productsOn('disp-mannequin-01'), poiId: 'poi-new-01', spotlightId: 'spot-hall-studio', groundShadow: true,
      focusCamera: { position: [-6.78, 1.5, 8.62], target: [-7.7, 1.25, 6.6], fov: 40, enterMs: 1100, exitMs: 800 } },
    { id: 'disp-mannequin-02', kind: 'mannequin', zoneId: 'zone-new', label: 'Nuovi Arrivi · 02',
      position: [-5.3, 0.06, 6.6], rotationY: -0.42,
      colliderId: 'col-disp-mann-02', approachWaypointId: 'wp-new-01',
      assetId: 'asset-mannequin-a', materialIds: { body: 'mat-mannequin-matte', base: 'mat-steel-dark' },
      productIds: productsOn('disp-mannequin-02'), poiId: 'poi-new-02', spotlightId: 'spot-hall-studio', groundShadow: true,
      focusCamera: { position: [-6.22, 1.5, 8.62], target: [-5.3, 1.25, 6.6], fov: 40, enterMs: 1100, exitMs: 800 } },
    { id: 'disp-rack-01', kind: 'rack', zoneId: 'zone-new', label: 'Rack · Tees',
      position: [-11.55, 0, 8.0], rotationY: Math.PI / 2,
      colliderId: 'col-disp-rack-01', approachWaypointId: 'wp-aisle-w-p8',
      assetId: 'asset-rack-a', materialIds: { frame: 'mat-steel-dark' },
      productIds: productsOn('disp-rack-01'), poiId: 'poi-rack-01', spotlightId: 'spot-rack', groundShadow: true,
      focusCamera: { position: [-8.95, 1.5, 8.0], target: [-11.55, 1.2, 8.0], fov: 48, enterMs: 1100, exitMs: 800 } },
    { id: 'disp-plinth-01', kind: 'plinth', zoneId: 'zone-archive', label: 'Archivio · Plinto',
      position: [6.5, 0.06, 7.0], rotationY: 0,
      colliderId: 'col-plinth-01', approachWaypointId: 'wp-arch-01',
      assetId: 'asset-plinth-a', materialIds: { body: 'mat-concrete-raw' },
      productIds: productsOn('disp-plinth-01'), poiId: 'poi-arch-01', spotlightId: 'spot-hall-flame', groundShadow: true,
      focusCamera: { position: [6.5, 1.95, 9.45], target: [6.5, 0.95, 7.0], fov: 42, enterMs: 1100, exitMs: 800 } },
    { id: 'disp-wall-01', kind: 'wall', zoneId: 'zone-archive', label: 'Archivio · Parete',
      position: [11.62, 0, 8.0], rotationY: -Math.PI / 2,
      colliderId: 'col-disp-wall-01', approachWaypointId: 'wp-aisle-e-p8',
      assetId: 'asset-wall-a', materialIds: { panel: 'mat-bone-seamless', frame: 'mat-steel-dark' },
      productIds: productsOn('disp-wall-01'), poiId: 'poi-wall-01', spotlightId: 'spot-wall-01', groundShadow: false,
      focusCamera: { position: [9.0, 1.55, 8.0], target: [11.55, 1.45, 8.0], fov: 46, enterMs: 1100, exitMs: 800 } },
  ],

  pois: [
    { id: 'poi-new-01', type: 'display', label: poiLabel('disp-mannequin-01', 'Nuovi Arrivi · 01'), anchor: [-7.7, 2.3, 6.6],
      proximity: { showRadius: 7.0, activateRadius: 3.2, hideRadius: 9.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-mannequin-01', approachWaypointId: 'wp-new-01', floorMarker: [-7.3, 7.4], requires: 'focusMode' },
    { id: 'poi-new-02', type: 'display', label: poiLabel('disp-mannequin-02', 'Nuovi Arrivi · 02'), anchor: [-5.3, 2.3, 6.6],
      proximity: { showRadius: 7.0, activateRadius: 3.2, hideRadius: 9.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-mannequin-02', approachWaypointId: 'wp-new-01', floorMarker: [-5.7, 7.4], requires: 'focusMode' },
    { id: 'poi-rack-01', type: 'display', label: poiLabel('disp-rack-01', 'Rack · Tees'), anchor: [-11.15, 2.4, 8.0],
      proximity: { showRadius: 6.5, activateRadius: 2.2, hideRadius: 8.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-rack-01', approachWaypointId: 'wp-aisle-w-p8', floorMarker: [-10.75, 8.0], requires: 'focusMode' },
    { id: 'poi-arch-01', type: 'display', label: poiLabel('disp-plinth-01', 'Archivio'), anchor: [6.5, 1.85, 7.0],
      proximity: { showRadius: 7.0, activateRadius: 2.8, hideRadius: 9.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-plinth-01', approachWaypointId: 'wp-arch-01', floorMarker: [6.5, 8.25], requires: 'focusMode' },
    { id: 'poi-wall-01', type: 'display', label: poiLabel('disp-wall-01', 'Archivio · Parete'), anchor: [11.2, 2.85, 8.0],
      proximity: { showRadius: 6.5, activateRadius: 2.2, hideRadius: 8.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-wall-01', approachWaypointId: 'wp-aisle-e-p8', floorMarker: [10.9, 8.0], requires: 'focusMode' },
    { id: 'poi-look-01', type: 'lookbook', label: 'Brand Story', anchor: [0, 2.0, -14.0],
      proximity: { showRadius: 9.0, activateRadius: 3.0, hideRadius: 11.0 }, icon: 'book',
      prompt: { desktop: 'Click per aprire', mobile: 'Tap per aprire' }, targetLookbookId: mainLookbookId, approachWaypointId: 'wp-look-01', floorMarker: [0, -12.6], requires: 'lookbook' },
  ],

  products,

  // Lookbook / Brand Story (Fase 5): dal contenuto scelto. La relazione con i
  // prodotti è bidirezionale (products[].lookbookIds ↔ lookbook[].productIds, I21).
  lookbook: content.lookbook,

  assets: {
    registry: {
      'asset-mannequin-a':  { type: 'primitive', primitive: 'capsule', args: [0.28, 1.1, 8, 16] },
      'asset-plinth-a':     { type: 'primitive', primitive: 'box', args: [1.2, 0.9, 1.2] },
      'asset-rack-a':       { type: 'primitive', primitive: 'rack', args: [2.2, 1.75, 0.45] },
      'asset-wall-a':       { type: 'primitive', primitive: 'panel', args: [2.0, 2.4, 0.3] },
      // P1: in attesa del vettoriale. Finché manca si usa il fallback tipografico.
      'asset-logo-primary': { type: 'texture', url: null,
                              fallback: { kind: 'wordmark' },
                              tint: { onDark: '#f2f0ea', onLight: '#060606' } },
    },
  },

  placeholders: {
    ratios: { '1:1': [1, 1], '16:9': [16, 9], '4:5': [4, 5] },
    variants: {
      product:   { bg: '#111214', fg: '#8a9099', pattern: 'grid',     showCategory: true,  grain: true },
      editorial: { bg: '#0a0a0b', fg: '#f98e30', pattern: 'diagonal', showCategory: false, grain: true },
      studio:    { bg: '#dcdcd8', fg: '#060606', pattern: 'none',     showCategory: true,  grain: false },
    },
    skeleton: { shimmerMs: 1400, minVisibleMs: 400, timeoutMs: 8000 },
    // Cornice fissa della galleria del Lookbook: immagini di ratio diverso ci
    // stanno dentro senza cambiarne l'altezza, così i bottoni non saltano.
    galleryFrame: [16, 10],
    // Cornice dell'immagine della scheda prodotto su schermo basso (telefono in
    // orizzontale): alta quanto lo schermo permette, larga di conseguenza. 4:5 come
    // le foto prodotto (docs/CONTENUTI.md).
    productFrame: [4, 5],
  },

  // Foto vere (demo e, dalla 8c, catalogo del cliente). Ogni foto `src` è pubblicata in
  // più larghezze (`<src>-<w>.webp`, da `npm run media:build`): il browser sceglie la più
  // piccola che basta, così un telefono non scarica la versione da desktop. Senza `src`
  // resta il segnaposto grafico dichiarato.
  media: {
    widths: [400, 800, 1400],
    quality: 78,
    // Ritaglio delle foto prodotto generate in 3:4 verso il 4:5 delle schede.
    productRatio: '4:5',
    // Capi 3D (livello leggero): la foto scontornata del fronte applicata sulla sagoma.
    // Una texture sola per capo, piccola: 7 capi ≈ 12 MB di memoria GPU con le mipmap.
    texture: { width: 512 },
    // Scontorno automatico dei capi scuri su fondo chiaro: distanza dal colore del fondo
    // (0–255) sotto cui un pixel collegato ai bordi è fondo. Alta (100): le ombre morbide del fondo
    // restano fondo, i capi scuri distano 150 e oltre. I capi chiari si scontornano
    // fuori (file `<nome>-cutout.png`, scripts/media/process.py).
    cutoutThreshold: 100,
  },

  copy: {
    onboarding: {
      eyebrow: 'Negozio immersivo · prototipo',
      desktop: {
        heading: 'Navigazione desktop',
        lines: [
          { text: 'Click sulla scena per guardarti attorno col mouse', requires: 'navigation' },
          { text: 'WASD o frecce per muoverti · Shift per correre',   requires: 'navigation' },
          { text: 'ESC per liberare il cursore',                      requires: 'navigation' },
          { text: 'Menu → Vai a per spostarti subito',                requires: 'navigation' },
          { text: 'Click su un espositore per esaminarlo',            requires: 'focusMode' },
        ],
        // Con "Solo mouse": niente tastiera né cursore catturato, come su telefono.
        mouseLines: [
          { text: 'Trascina col mouse per guardarti attorno',  requires: 'navigation' },
          { text: 'Click sul pavimento per spostarti',         requires: 'navigation' },
          { text: 'Menu → Vai a per spostarti subito',         requires: 'navigation' },
          { text: 'Click su un espositore per esaminarlo',     requires: 'focusMode' },
        ],
        modes: {
          label: 'Come vuoi muoverti',
          keyboard: { title: 'Tastiera e mouse', hint: 'WASD per camminare, il mouse guarda' },
          mouse: { title: 'Solo mouse', hint: 'Trascina per guardare, click per andare' },
        },
        cta: 'Entra',
      },
      mobile: {
        heading: 'Navigazione mobile',
        lines: [
          { text: 'Tap sul pavimento per spostarti',            requires: 'navigation' },
          { text: 'Trascina per orientare la visuale',          requires: 'navigation' },
          { text: 'Usa la barra in basso per spostarti subito', requires: 'navigation' },
          { text: 'Tap su un espositore per esaminarlo',        requires: 'focusMode' },
        ],
        cta: 'Entra',
      },
      loading: 'Caricamento ambiente',
      ready: 'pronto',
      comingSoon: 'in arrivo',
      phaseNotice: 'Prototipo in costruzione. I comandi segnati "in arrivo" non sono ancora attivi.',
    },
    focus: {
      exit: 'Esci',
      exitHint: 'ESC per uscire',
      previous: 'Precedente',
      next: 'Successivo',
      details: 'Scheda completa',
      colorways: 'Varianti colore',
      of: 'di',
    },
    // Segnaposto grafico (immagini senza foto): stati e sigle.
    placeholder: { loading: 'Immagine in caricamento', label: 'Segnaposto', unlabeled: 'senza etichetta', error: 'ERRORE', mark: 'PLH' },
    // Pannello della parete del brand, disegnato su texture.
    brandWall: { eyebrow: 'LOOKBOOK · BRAND STORY', corner: 'APRI LA BRAND STORY →' },
    // Finestre di dialogo della Fase 5: scheda prodotto e Lookbook.
    dialog: { close: 'Chiudi', back: 'Indietro', closeHint: 'ESC per chiudere' },
    product: {
      eyebrow: 'Scheda prodotto',
      sizes: 'Taglia',
      colorways: 'Colore',
      soldOut: 'esaurita',
      chooseSize: 'Scegli una taglia',
      selected: 'Selezione',
      media: 'Immagini',
      details: 'Dettagli',
      inLookbook: 'Nel lookbook',
      purchaseClosed: 'Acquisti non ancora aperti',
    },
    lookbook: {
      eyebrow: 'Brand Story',
      gallery: 'Immagini della campagna',
      galleryRole: 'galleria',
      previous: 'Immagine precedente',
      next: 'Immagine successiva',
      image: 'Immagine',
      products: 'Capi del look',
      origin: 'Origine',
      open: 'Apri la Brand Story',
    },
    hud: {
      menu: 'Menu', close: 'Chiudi', focusExit: 'Esci', youAreHere: 'Sei qui',
      noZone: 'Corridoio',
      lockPrompt: 'Click per guardarti attorno',
      lockPromptSub: 'WASD per muoverti · ESC per liberare il cursore',
      quickTravel: 'Vai a',
      minimap: 'pianta',
      zones: 'zone',
      inputTouch: 'touch',
      inputPointer: 'puntatore',
      tier: 'tier',
    },
    hints: {
      unreachable: 'Punto non raggiungibile',
      wall: 'Lì c\'è un muro',
      pointerLockFailed: 'Il browser non ha concesso il controllo del mouse: riprova con un click',
      notAvailable: 'Non ancora disponibile',
      tooFar: 'Avvicinati per esaminare',
    },
    menu: {
      title: 'Indice',
      closeLabel: 'Chiudi menu',
      sections: [
        { id: 'sec-travel', label: 'Vai a' },
        { id: 'sec-products', label: 'Capi' },
        { id: 'sec-brand', label: 'Brand' },
        { id: 'sec-legal', label: 'Informazioni legali' },
      ],
    },
    perf: {
      title: 'Prestazioni',
      fps: 'fps p50',
      low: '1% low',
      frame: 'p95 ms',
      calls: 'draw call',
      tris: 'triangoli',
      memory: 'geo / tex / prog',
      window: 'finestra',
      tier: 'tier',
      dpr: 'dpr',
      cap: 'cap',
      softwareWarning: 'Rendering software: questi numeri non valgono come misura reale',
    },
    bench: {
      title: 'Benchmark',
      seconds: 's',
      fxOff: '(grana off)',
      grain: 'grana',
      segments: 'Tratti (p50 / 1% low · fotogramma max · n oltre 50 ms)',
      stutter: 'Scatti (peggior run)',
      warmup: 'Avvio fra poco · non toccare lo schermo',
      running: 'In corso · non toccare lo schermo',
      step: 'Passo',
      abort: 'Interrompi',
      aborted: 'Interrotto',
      failed: 'Passo non riuscito',
      done: 'Completato',
      run: 'Run',
      repeat: 'Ripeti',
      copy: 'Copia riga per PERF.md',
      copied: 'Copiato',
      copyManual: 'Seleziona il testo e copialo',
      close: 'Chiudi',
      median: 'Mediana p50',
      worst: 'Peggiore 1% low',
      runsHint: 'Protocollo: 3 run per dispositivo. Si riporta la mediana dei p50 e il peggiore 1% low.',
      device: 'Dispositivo',
      fill: 'da compilare',
      realYes: 'da confermare',
      realNo: 'NO · rendering software',
    },
    cart: {
      title: 'Carrello',
      open: 'Carrello',
      empty: 'Il carrello è vuoto.',
      continue: 'Continua a esplorare',
      add: 'Aggiungi al carrello',
      adding: 'Aggiunta in corso',
      added: 'Aggiunto al carrello',
      openCart: 'Apri il carrello',
      chooseSize: 'Scegli una taglia',
      soldOut: 'Esaurito',
      unavailable: 'Prezzo e disponibilità non raggiungibili. Riprova più tardi.',
      retry: 'Riprova',
      quantity: 'Quantità',
      decrease: 'Diminuisci',
      increase: 'Aumenta',
      remove: 'Rimuovi',
      subtotal: 'Subtotale',
      taxNote: 'IVA inclusa. Spedizione calcolata al pagamento.',
      checkout: 'Vai al pagamento',
      mockBanner: 'Negozio di prova: nessun pagamento reale',
      devStoreBanner: 'Negozio Shopify di sviluppo: solo pagamenti di prova',
      mockCheckout: 'Negozio di prova: qui si aprirebbe la cassa di Shopify. Nessun ordine è stato creato.',
      error: 'Il carrello non ha risposto. Riprova.',
      maxReached: 'Quantità massima raggiunta',
      stockWarning: 'Quantità non disponibile: il carrello mostra quella che è stato possibile aggiungere.',
    },
    errors: {
      contextLost: {
        title: 'Contesto grafico perso',
        body: 'Il browser ha interrotto il rendering 3D: succede se la GPU si resetta o se la pagina resta a lungo in background.',
        retry: 'Riprova',
      },
      webgl: {
        title: 'WebGL non disponibile',
        body: 'Questo dispositivo o browser non supporta il rendering 3D richiesto.',
        hint: 'Prova con Chrome, Edge, Firefox o Safari aggiornati, con accelerazione hardware attiva.',
        renderer: 'renderer rilevato',
      },
    },
    legal: {
      priceNotice: 'Prezzi e disponibilità sono dati dimostrativi. Nessun acquisto è possibile.',
      eyebrow: 'Informazioni legali',
      policies: {
        'terms-of-sale': 'Condizioni di vendita',
        refund: 'Recesso, resi e rimborsi',
        shipping: 'Spedizioni',
        privacy: 'Privacy',
        'terms-of-service': 'Termini del servizio',
        'legal-notice': 'Note legali',
        contact: 'Contatti',
      },
      loading: 'Caricamento',
      unavailable: 'Testi legali non raggiungibili. Riprova più tardi.',
      retry: 'Riprova',
      none: 'Testi legali non ancora pubblicati dal venditore.',
      missing: 'Questo testo non è ancora stato pubblicato dal venditore.',
      mockNotice: 'Negozio di prova: testo segnaposto, non valido come documento legale.',
    },
  },
}

// Testi del contenuto scelto, fusi sopra quelli comuni (stesse chiavi).
function mergeInto(base, extra) {
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') mergeInto(base[k], v)
    else base[k] = v
  }
}
mergeInto(storeConfig.copy, content.copy)

// Allestimento: sostituisce la stanza e tutto ciò che ha coordinate (muri, collider, grafo,
// espositori, POI, luci, inquadrature, percorso del benchmark). Giocatore, input, materiali,
// testi e commercio restano quelli comuni.
storeConfig.layout = { id: layoutId }
if (layout) {
  const L = layout.build({ productsOn, poiLabel, mainLookbookId })
  storeConfig.performance.toneMappingExposure = L.performance.toneMappingExposure
  Object.assign(storeConfig.camera, L.camera)
  storeConfig.environment = L.environment
  storeConfig.lighting = { ...storeConfig.lighting, ...L.lighting }
  storeConfig.colliders = L.colliders
  Object.assign(storeConfig.navigation, L.navigation)
  storeConfig.displays = L.displays
  storeConfig.pois = L.pois
  storeConfig.benchmark.steps = L.benchmark.steps
}

export default storeConfig
