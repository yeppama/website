# PLAN §3

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 3. Schema di `src/config/storeConfig.js`

Unità: metri. Sistema di coordinate: Y verso l'alto, scala 1 unità = 1 m. Rotazioni: radianti,
espresse come `rotationY` singolo dove sufficiente (tutti gli elementi architettonici).

### 3.1 Struttura di primo livello

```js
export const storeConfig = {
  meta,            // versione schema, brand, unità
  performance,     // tier di dispositivo, budget, politica ombre
  environment,     // pavimento, soffitto, muri, zone, ingresso
  lighting,        // ambient + array di faretti
  colliders,       // bounding box invisibili (unica fonte delle collisioni)
  navigation,      // waypoint, link, bounds pavimento, teletrasporti, parametri player
  displays,        // espositori fisici (manichini, plinti, rack, pannelli a muro)
  products,        // catalogo demo
  pois,            // punti di interesse (hotspot) — indipendenti dai modelli 3D
  lookbook,        // storytelling di brand
  assets,          // registro asset con fallback a primitive
  placeholders,    // design system dei segnaposto 2D
  copy,            // tutti i testi dell'interfaccia (i18n-ready)
};
```

### 3.2 `meta`, `performance`

```js
meta: {
  schemaVersion: '1.0.0',
  brand: {
    id: 'into-industries',
    name: 'INTO Industries',
    wordmark: 'INTO',                    // il marchio nel logo; "industries" è il descrittore
    origin: { city: 'Florence', country: 'Italy', coords: '43°46\'N 11°15\'E' },
    credit: 'Curated and produced by Tommaso Inturrisi',
    tagline: "We're just looking for somewhere",   // da confermare: micro-testo del logo
    currency: 'EUR',
    logo: { assetId: 'asset-logo-primary', shape: 'oval', onDark: 'invert' },
  },
  units: 'meters',
},

performance: {
  targetFps: 60,              // cap hard: il loop non renderizza oltre
  // I tier sono risolti a runtime da lib/deviceProfile.js e NON sono hardcoded nei componenti.
  tiers: {
    high:   { dprRange: [1, 2],   maxShadowCasters: 4, shadowMapSize: 1024, softShadows: true,  envMapResolution: 256, antialias: true  },
    medium: { dprRange: [1, 1.5], maxShadowCasters: 2, shadowMapSize: 512,  softShadows: false, envMapResolution: 128, antialias: true  },
    low:    { dprRange: [0.75, 1], maxShadowCasters: 0, shadowMapSize: 256, softShadows: false, envMapResolution: 64,  antialias: false },
  },
  // Budget dichiarati: la Fase 6 li verifica, non li scopre.
  budgets: {
    drawCalls:  { high: 120, medium: 80,  low: 60  },
    triangles:  { high: 400000, medium: 220000, low: 140000 },
    programs:   { high: 30, medium: 24, low: 18 },
    initialJsGzipKb: 380,
  },
  // Sostituto delle ombre real-time quando maxShadowCasters = 0 (vedi D3)
  groundShadow: { mode: 'blob', opacity: 0.45, radiusScale: 1.15 },
  // Grana: firma visiva del brand. `overlay` = velo in compositing fuori dalla pipeline WebGL
  // (costo ~0 sul render loop); `postprocess` = passaggio a schermo intero. Vedi D6.
  postFx: {
    grain:     { mode: 'overlay', opacity: { high: 0.14, medium: 0.12, low: 0.10 },
                 tileSize: 256, animateHz: 12, blend: 'overlay' },
    vignette:  { enabled: true, strength: 0.38 },     // CSS radial-gradient, costo nullo
    chromatic: { enabled: false },                     // solo tier high, valutato in Fase 6
  },
},
```

### 3.3 `environment`

```js
environment: {
  floor: {
    size: [24, 36],                 // X, Z
    materialId: 'mat-concrete-polished',
    gridTexture: { cell: 1.0, lineWidth: 0.012, tint: '#1a1a1a' },
  },
  ceiling: { height: 4.2, materialId: 'mat-ceiling-matte', visible: true },
  walls: [
    // Ogni muro è puramente VISIVO. La sua collisione vive in `colliders` via colliderId.
    { id: 'wall-n', from: [-12, -18], to: [ 12, -18], height: 4.2, thickness: 0.2,
      materialId: 'mat-plaster-dark', colliderId: 'col-wall-n' },
    { id: 'wall-s', from: [-12,  18], to: [ 12,  18], height: 4.2, thickness: 0.2,
      materialId: 'mat-plaster-dark', colliderId: 'col-wall-s',
      opening: { center: [0, 18], width: 3.0, height: 2.6 } }, // ingresso
    // ... wall-e, wall-w, divisori interni
  ],
  zones: [
    { id: 'zone-entrance',  label: 'Ingresso',     bounds: [[-4, 12], [4, 18]],
      accentColor: 'accent.ember', ambientBoost: 0.15 },
    { id: 'zone-new',       label: 'Nuovi Arrivi', bounds: [[-11, 2], [-2, 12]],
      accentColor: 'accent.ember', ambientBoost: 0.0 },
    { id: 'zone-archive',   label: 'Archivio',     bounds: [[2, 2], [11, 12]],
      accentColor: 'accent.crimson', ambientBoost: -0.05 },
    { id: 'zone-lookbook',  label: 'Lookbook',     bounds: [[-6, -16], [6, -6]],
      accentColor: 'accent.bone', ambientBoost: 0.1 },
  ],
  entrance: { waypointId: 'wp-entrance', lookAtWaypointId: 'wp-hall-01' },
  fog: { enabled: true, color: '#070707', near: 14, far: 44 },
},
```

### 3.4 `lighting`

```js
lighting: {
  ambient:     { intensity: 0.18, color: '#9aa0a6' },
  hemisphere:  { skyColor: '#2a2d31', groundColor: '#0a0a0a', intensity: 0.22 },
  environment: { preset: 'procedural-studio', intensity: 0.35 }, // env map generata, non HDRI esterna
  // Ordinati per `priority`: il tier taglia dalla coda quando supera maxShadowCasters.
  spots: [
    { id: 'spot-new-01', priority: 1, zoneId: 'zone-new', targetDisplayId: 'disp-mannequin-01',
      position: [-6.5, 3.8, 7.0], angle: 0.42, penumbra: 0.6, intensity: 28, distance: 14,
      decay: 1.6, color: '#fff1e2', kind: 'studio', castShadow: true, volumetricHint: false },
    { id: 'spot-archive-01', priority: 2, zoneId: 'zone-archive', targetDisplayId: 'disp-plinth-01',
      position: [6.5, 3.8, 7.0], angle: 0.40, penumbra: 0.7, intensity: 24, distance: 14,
      decay: 1.7, color: '#ff7a33', kind: 'ember', castShadow: true, volumetricHint: false },
    { id: 'spot-entrance', priority: 3, zoneId: 'zone-entrance', targetPosition: [0, 0, 15],
      position: [0, 4.0, 15.5], angle: 0.55, penumbra: 0.8, intensity: 18, distance: 12,
      decay: 1.5, color: '#ff5a1f', kind: 'ember', castShadow: false },
    // ...
  ],
  materials: {
    'mat-concrete-polished': { type: 'standard', color: '#15161a', roughness: 0.55, metalness: 0.05, grid: true },
    'mat-plaster-dark':      { type: 'standard', color: '#101114', roughness: 0.9,  metalness: 0.0 },
    'mat-ceiling-matte':     { type: 'standard', color: '#0a0a0c', roughness: 1.0,  metalness: 0.0 },
    'mat-steel-brushed':     { type: 'standard', color: '#8d9298', roughness: 0.32, metalness: 0.95 },
    'mat-mannequin':         { type: 'standard', color: '#cfd2d6', roughness: 0.42, metalness: 0.08 },
    'mat-accent-ember':      { type: 'standard', color: '#ff5a1f', roughness: 0.4, emissive: '#ff5a1f', emissiveIntensity: 0.45 },
    'mat-accent-crimson':    { type: 'standard', color: '#c21025', roughness: 0.45, emissive: '#c21025', emissiveIntensity: 0.25 },
    'mat-bone-seamless':     { type: 'standard', color: '#dcdcd8', roughness: 0.95, metalness: 0.0 }, // fondo "studio" dietro i display
  },
},
```

### 3.5 `colliders` — unica fonte delle collisioni

```js
// TASSATIVO: il player collide SOLO contro questi box. Nessun raycast sulle mesh visibili.
colliders: [
  { id: 'col-wall-n',       type: 'box', center: [0, 2.1, -18], size: [24.4, 4.2, 0.4], rotationY: 0 },
  { id: 'col-wall-s-left',  type: 'box', center: [-7.6, 2.1, 18], size: [8.8, 4.2, 0.4], rotationY: 0 },
  { id: 'col-wall-s-right', type: 'box', center: [ 7.6, 2.1, 18], size: [8.8, 4.2, 0.4], rotationY: 0 },
  { id: 'col-disp-mann-01', type: 'box', center: [-6.5, 1.0, 7.0], size: [1.2, 2.0, 1.2], rotationY: 0.4 },
  { id: 'col-plinth-01',    type: 'box', center: [ 6.5, 0.5, 7.0], size: [1.4, 1.0, 1.4], rotationY: 0 },
],
```

Nota: `rotationY` implica collider OBB. Il risolutore in `lib/collision.js` lavora nello spazio
locale del box (trasforma la posizione del player, risolve come AABB, ritrasforma) — resta un test
box/cerchio, non una collisione mesh.

### 3.6 `navigation`

```js
navigation: {
  player: {
    eyeHeight: 1.65, radius: 0.35,
    walkSpeed: 3.0, sprintMultiplier: 1.6, acceleration: 14, damping: 10,
    lookSensitivity: { desktop: 0.0022, mobileDrag: 0.0045 },
    pitchClamp: [-1.2, 1.2],
    autoMove: { speed: 3.4, arriveRadius: 0.25, turnSpeed: 6.0, cornerSmoothing: 0.4 },
  },
  // Rettangoli di pavimento calpestabile: un tap fuori da questi è ignorato.
  walkableAreas: [
    { id: 'walk-hall',     bounds: [[-11, -17], [11, 17]] },
    { id: 'walk-lookbook', bounds: [[-6, -16], [6, -6]] },
  ],
  // Nodi del grafo. `safeForTeleport` marca le sole destinazioni usabili dalla QuickTravelBar.
  waypoints: [
    { id: 'wp-entrance', position: [0, 0, 15.5], label: 'Ingresso',      safeForTeleport: true,  lookAt: [0, 1.65, 10] },
    { id: 'wp-hall-01',  position: [0, 0, 10.0], label: null,            safeForTeleport: false },
    { id: 'wp-new-01',   position: [-6.5, 0, 9.0], label: 'Nuovi Arrivi', safeForTeleport: true,  lookAt: [-6.5, 1.4, 7.0] },
    { id: 'wp-arch-01',  position: [ 6.5, 0, 9.0], label: 'Archivio',     safeForTeleport: true,  lookAt: [6.5, 1.1, 7.0] },
    { id: 'wp-hall-02',  position: [0, 0, 0.0],   label: null,            safeForTeleport: false },
    { id: 'wp-look-01',  position: [0, 0, -9.0],  label: 'Lookbook',      safeForTeleport: true,  lookAt: [0, 1.6, -14] },
  ],
  // Archi bidirezionali. Il costo è la distanza euclidea, calcolata a runtime (non duplicato nei dati).
  links: [
    ['wp-entrance', 'wp-hall-01'],
    ['wp-hall-01', 'wp-new-01'],
    ['wp-hall-01', 'wp-arch-01'],
    ['wp-hall-01', 'wp-hall-02'],
    ['wp-hall-02', 'wp-look-01'],
    ['wp-new-01', 'wp-hall-02'],
    ['wp-arch-01', 'wp-hall-02'],
  ],
  // Barra UI mobile: riferimenti a waypoint, mai coordinate.
  quickTravel: [
    { id: 'qt-entrance', waypointId: 'wp-entrance', label: 'Ingresso' },
    { id: 'qt-new',      waypointId: 'wp-new-01',   label: 'Nuovi Arrivi' },
    { id: 'qt-archive',  waypointId: 'wp-arch-01',  label: 'Archivio' },
    { id: 'qt-look',     waypointId: 'wp-look-01',  label: 'Lookbook' },
  ],
},
```

**Algoritmo di spostamento mobile (specifica, da implementare in Fase 3):**
1. Il tap produce un raycast contro il piano del pavimento e contro i soli hitbox degli espositori.
2. Se colpisce un espositore → percorso verso `displays[].approachWaypointId`, poi Focus Mode.
3. Se colpisce il pavimento: il punto è accettato solo se dentro `walkableAreas` e fuori da ogni
   collider (con margine `player.radius`); altrimenti il tap è ignorato con feedback visivo negativo.
4. Il percorso è: `[posizione attuale] → nodo più vicino raggiungibile → A*(links) → nodo più vicino
   alla destinazione → [punto finale]`. I due segmenti terminali sono accettati solo se liberi da
   collider (test di sweep); se non lo sono, il percorso termina sul nodo.
5. Il teletrasporto non interpola: posiziona il player su un waypoint con `safeForTeleport: true`,
   con un fade nero di ~220 ms per evitare disorientamento.

### 3.7 `displays`

```js
displays: [
  {
    id: 'disp-mannequin-01',
    kind: 'mannequin',              // mannequin | plinth | rack | wall
    zoneId: 'zone-new',
    position: [-6.5, 0, 7.0], rotationY: 0.4,
    colliderId: 'col-disp-mann-01',       // ← la collisione NON è derivata dal modello
    approachWaypointId: 'wp-new-01',      // dove il tap-to-move porta il player
    assetId: 'asset-mannequin-a',         // risolto via `assets.registry`
    materialIds: { body: 'mat-mannequin', base: 'mat-steel-brushed' },
    productIds: ['prod-001'],
    poiId: 'poi-new-01',                  // hotspot associato (POI autonomo)
    focusCamera: {                        // posa assoluta della camera in Focus Mode
      position: [-6.5, 1.55, 9.2], target: [-6.5, 1.35, 7.0],
      fov: 42, enterMs: 900, exitMs: 650, easing: 'easeInOutCubic',
    },
    spotlightId: 'spot-new-01',
  },
  {
    id: 'disp-plinth-01', kind: 'plinth', zoneId: 'zone-archive',
    position: [6.5, 0, 7.0], rotationY: 0,
    colliderId: 'col-plinth-01', approachWaypointId: 'wp-arch-01',
    assetId: 'asset-plinth-a', materialIds: { body: 'mat-steel-brushed' },
    productIds: ['prod-002', 'prod-003'], poiId: 'poi-arch-01',
    focusCamera: { position: [6.5, 1.3, 8.8], target: [6.5, 1.0, 7.0], fov: 38, enterMs: 900, exitMs: 650, easing: 'easeInOutCubic' },
    spotlightId: 'spot-archive-01',
  },
],
```

### 3.8 `products` (catalogo demo, prezzi fittizi)

```js
products: [
  {
    id: 'prod-001',
    sku: 'PLH-001',
    name: 'Placeholder Heavy Hoodie',
    category: 'Hoodie',
    collection: 'DROP 01',
    price: { amount: 189.00, currency: 'EUR', compareAt: null },  // FITTIZIO — nessun checkout
    description: 'Testo segnaposto descrittivo del capo, due o tre righe di copy.',
    details: ['100% cotone segnaposto', 'Vestibilità oversize', 'Made in Placeholder'],
    sizes: [                                     // selettore demo, nessuno stock reale
      { id: 'xs', label: 'XS', available: false },
      { id: 's',  label: 'S',  available: true  },
      { id: 'm',  label: 'M',  available: true  },
      { id: 'l',  label: 'L',  available: true  },
      { id: 'xl', label: 'XL', available: false },
    ],
    colorways: [
      { id: 'cw-black', label: 'Black', swatch: '#0d0d0d', materialOverride: null },
      { id: 'cw-bone',  label: 'Bone',  swatch: '#e8e2d4', materialOverride: null },
    ],
    // Nessun URL: il placeholder è generato dal componente <PlaceholderImage />
    media: [
      { id: 'm1', ratio: '4:5', label: 'Front',  variant: 'product' },
      { id: 'm2', ratio: '4:5', label: 'Back',   variant: 'product' },
      { id: 'm3', ratio: '16:9', label: 'Detail', variant: 'editorial' },
    ],
    displayId: 'disp-mannequin-01',
    lookbookIds: ['lb-001'],
    badges: ['NEW'],
  },
],
```

### 3.9 `pois` — indipendenti dai modelli 3D (requisito Fase 3)

```js
pois: [
  { id: 'poi-new-01', type: 'display', label: 'Nuovi Arrivi',
    anchor: [-6.5, 1.9, 7.0],                 // posizione assoluta dell'hotspot nel mondo
    proximity: { showRadius: 7.0, activateRadius: 2.6, hideRadius: 9.0 },
    icon: 'tag', prompt: { desktop: 'Click per esaminare', mobile: 'Tap per avvicinarti' },
    targetDisplayId: 'disp-mannequin-01' },
  { id: 'poi-look-01', type: 'lookbook', label: 'Brand Story',
    anchor: [0, 2.0, -14.0],
    proximity: { showRadius: 9.0, activateRadius: 3.0, hideRadius: 11.0 },
    icon: 'book', prompt: { desktop: 'Click per aprire', mobile: 'Tap per aprire' },
    targetLookbookId: 'lb-001' },
],
```

Le tre soglie (`show`/`activate`/`hide`) con isteresi evitano lo sfarfallio dell'hotspot quando il
player si muove sul bordo del raggio.

### 3.10 `lookbook`, `assets`, `placeholders`, `copy`

```js
lookbook: [
  { id: 'lb-001', title: 'DROP 01', subtitle: 'Placeholder subtitle',
    body: ['Paragrafo segnaposto uno.', 'Paragrafo segnaposto due.'],
    images: [ { id: 'lbi1', ratio: '16:9', label: 'Campaign 01', variant: 'editorial' },
              { id: 'lbi2', ratio: '1:1',  label: 'Detail 01',   variant: 'editorial' } ],
    productIds: ['prod-001'], zoneId: 'zone-lookbook' },
],

assets: {
  registry: {
    // `fallback` garantisce che la scena renderizzi anche senza i .glb (Fasi 2-3).
    'asset-mannequin-a': { type: 'gltf', url: '/models/mannequin_a.glb',
                           fallback: { primitive: 'capsule', args: [0.28, 1.1, 8, 16] },
                           lod: [{ distance: 0, url: '/models/mannequin_a.glb' },
                                 { distance: 12, primitive: 'capsule', args: [0.28, 1.1, 4, 8] }] },
    'asset-plinth-a':    { type: 'primitive', primitive: 'box', args: [1.2, 0.9, 1.2] },
    // Logo fornito dal brand. In 3D va usato come decalcomania su piano, mai come mesh.
    'asset-logo-primary': { type: 'texture', url: '/brand/logo-primary.svg',
                            fallback: { primitive: 'plane', args: [1.6, 0.5] },
                            tint: { onDark: '#f2f0ea', onLight: '#060606' } },
  },
  draco: false,     // valutato in Fase 6 se i .glb superano 1 MB
},

placeholders: {
  ratios: { '1:1': [1, 1], '16:9': [16, 9], '4:5': [4, 5] },
  variants: {
    product:   { bg: '#111214', fg: '#8a9099', pattern: 'grid',  showCategory: true },
    editorial: { bg: '#0a0a0b', fg: '#ff5a1f', pattern: 'diagonal', showCategory: false, grain: true },
    studio:    { bg: '#dcdcd8', fg: '#060606', pattern: 'none',     showCategory: true,  grain: false },
  },
  skeleton: { shimmerMs: 1400, minVisibleMs: 400 },  // minVisibleMs evita il flash dello skeleton
},

copy: {
  onboarding: {
    title: 'INTO',                    // il descrittore 'industries' ha peso tipografico minore
    desktop: { heading: 'Navigazione desktop',
               lines: ['WASD o frecce per muoverti', 'Muovi il mouse per guardarti attorno',
                       'Click su un espositore per esaminarlo', 'ESC per liberare il cursore'],
               cta: 'Entra' },
    mobile:  { heading: 'Navigazione mobile',
               lines: ['Tap sul pavimento per spostarti', 'Trascina per orientare la visuale',
                       'Tap su un espositore per esaminarlo', 'Usa la barra in basso per spostarti subito'],
               cta: 'Entra' },
  },
  hud: { focusExit: 'Esci', menu: 'Menu', loading: 'Caricamento ambiente' },
  errors: {
    webgl: { title: 'WebGL non disponibile',
             body: 'Questo dispositivo o browser non supporta il rendering 3D richiesto.',
             hint: 'Prova con Chrome, Edge, Firefox o Safari aggiornati, con accelerazione hardware attiva.' },
  },
  legal: { priceNotice: 'Prezzi e disponibilità sono dati dimostrativi. Nessun acquisto è possibile.' },
},
```

### 3.11 Invarianti referenziali (validate da `validateStoreConfig.js`, solo in DEV)

| # | Invariante | Conseguenza se violata |
|---|---|---|
| I1 | ogni `displays[].colliderId` esiste in `colliders` | espositore attraversabile |
| I2 | ogni `displays[].approachWaypointId` esiste in `navigation.waypoints` | tap-to-move senza destinazione |
| I3 | ogni `displays[].productIds[]` esiste in `products` | modale prodotto vuota |
| I4 | ogni `products[].displayId` punta a un display che lo contiene (bidirezionalità) | catalogo e scena divergono |
| I5 | ogni `pois[].targetDisplayId` / `targetLookbookId` esiste | hotspot inerte |
| I6 | ogni `navigation.links[]` referenzia waypoint esistenti | A* fallisce a runtime |
| I7 | il grafo dei waypoint è **connesso** (una sola componente) | zone irraggiungibili su mobile |
| I8 | ogni `quickTravel[].waypointId` ha `safeForTeleport: true` | teletrasporto dentro un muro |
| I9 | nessun waypoint cade dentro un collider (margine `player.radius`) | player bloccato all'arrivo |
| I10 | ogni waypoint è dentro almeno una `walkableAreas` | incoerenza nav/geometria |
| I11 | ogni `materialIds`/`materialId` esiste in `lighting.materials` | materiale nero |
| I12 | ogni `assetId` esiste in `assets.registry` e ha `fallback` o `url` | mesh mancante |
| I13 | ogni `media[].ratio` esiste in `placeholders.ratios` | layout rotto |
| I14 | ogni `spots[].targetDisplayId` esiste (se presente) | faretto puntato nel vuoto |
| I15 | ogni istruzione dell'onboarding richiede una funzione esistente in `features` | l'interfaccia promette comandi senza sapere se esistono |
| I16 | nessun collegamento del grafo attraversa un collider (margine `player.radius`) | in Fase 3 il player cammina dentro un mobile o una colonna |
| I17 | ogni inquadratura ha una zona valida e la camera fuori dai collider; `defaultShotId` esiste | camera dentro una colonna, HUD incoerente |
| I18 | colonne, pedane, binari e parete del brand referenziano materiali, collider, asset e lookbook esistenti | geometria nera o pannello vuoto |
| I19 | ogni espositore ha un tipo supportato, un faretto esistente, un POI che lo referenzia a sua volta, e la camera di Focus fuori dai collider e dentro il negozio | Focus dentro una colonna, hotspot che apre l'espositore sbagliato |
| I20 | ogni prodotto ha una forma segnaposto per la sua categoria e almeno una variante colore | capo invisibile o senza colore |
| I21 | Lookbook e catalogo si citano a vicenda (`products[].lookbookIds` ↔ `lookbook[].productIds`); immagini del lookbook con ratio previsti | Brand Story e scheda prodotto divergono |
| I22 | ogni prodotto ha immagini, taglie e una valuta che la locale del brand sa formattare | scheda vuota o eccezione di `Intl` a runtime |

Il validatore lancia un errore bloccante in `import.meta.env.DEV` e viene eliminato dal bundle di
produzione via tree-shaking. **Questo è il meccanismo che rende il data-driven affidabile:** senza
validazione, un ID sbagliato diventa un bug runtime silenzioso.

---

