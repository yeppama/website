# PLAN.md — Store Streetwear Immersivo 3D
**Fase 0 — Pianificazione, Architettura Dati e Stime**
Versione documento: **1.0** · Data: 2026-10-15 · Stato: **decisioni chiuse — in attesa del comando di avanzamento**
> Changelog 1.8 — **Fase 7 eseguita (2026-10-16), opzione A scelta dall'utente:** produzione su
> `main` con contenuti dimostrativi dichiarati, fuori dai motori di ricerca (`noindex`) finché non
> arrivano i contenuti reali del cliente (`docs/CONTENUTI.md`). Aggiunti `vercel.json` (header di
> sicurezza, cache), meta Open Graph, README. Tutte le suite verdi sulla build pubblicata.
> Changelog 1.7 — **Fase 6 chiusa dall'utente (2026-10-16)** con scostamento dichiarato: il
> portatile di riferimento (Iris Xe, 1920×911) misura 57,1 / 39,2 contro la soglia stimata 58 / 45.
> iPhone (Safari 26) e Pixel superano le soglie mobile. Dopo le misure reali: tier rivisto (GPU
> integrate e iPhone in medium), grana con fusione `alpha` (D6 rivista), riscaldamento della GPU e
> nessuna compilazione al primo uso. Nebbia corretta ma spenta. Android di fascia media non misurato.
> Changelog 1.6 — **Fase 6 consegnata.** Memoria GPU: cache condivise legate al ciclo di vita del
> Canvas (`lib/gpuCaches.js`), perdite per tap eliminate (linea del percorso e anello del ping),
> stabilità verificata dentro la sessione e su 12 rimontaggi. Perdita del contesto WebGL gestita
> (overlay, ripristino automatico, posa conservata). HUD prestazioni `?perf=1` e benchmark `?bench=1`
> attivi anche in produzione; `r3f-perf` non adottato (l'HUD legge `gl.info` direttamente, zero
> dipendenze). `docs/PERF.md` creato: protocollo, soglie, registro con la sola riga software
> marcata come non valida. Verifica responsive automatica su 8 formati: corretta la minimappa che in
> orizzontale spingeva fuori schermo la barra "Vai a".
> Changelog 1.5 — **Fase 5 consegnata.** Scheda prodotto 2D (galleria segnaposto, colori e taglie
> come gruppi radio da tastiera, prezzo formattato con `meta.brand.locale`, acquisto spento e
> dichiarato dalla feature `checkout`) e Lookbook / Brand Story da `lookbook` e `meta.brand`. Le
> finestre sono una pila (`dialogs`): dal Lookbook a un capo e ritorno. Trappola del focus comune a
> schede e menu. Invarianti estese a 22 (I21 Lookbook ↔ catalogo, I22 dati della scheda).
> Struttura reale: `ui/dialog/DialogHost.jsx`, `ui/product/ProductSheet.jsx` + `OptionGroup.jsx`,
> `ui/lookbook/LookbookSheet.jsx`, `ui/primitives/useFocusTrap.js`, `lib/format.js`.
> Changelog 1.4 — **Fase 4 consegnata.** Cinque espositori (manichino ×2, rack, plinto, parete),
> sette prodotti demo, Focus Mode come macchina a stati interrompibile. Invarianti estese a 20
> (I19 espositori, I20 forme dei capi). Illuminazione ritarata: i faretti dei prodotti sono bianco
> caldo, il colore d'atmosfera resta su pareti e accenti. Geometrie statiche unite per materiale e
> corpi illuminanti a istanze: sul tier low la zona più densa scende da 64 a 31 draw call.
> Changelog 1.3 — **Fase 3 consegnata.** Grafo di navigazione esteso con due corridoi laterali
> (16 waypoint, 21 collegamenti): il test sui percorsi ha trovato il 2% dei punti calpestabili
> invisibile da ogni nodo. Corretta la convenzione di rotazione dei collider, speculare rispetto a
> three fino alla Fase 2. Ogni destinazione rapida dichiara la sua `zoneId`; ogni POI il suo
> `approachWaypointId` e la funzione che richiede.
> Changelog 1.2 — **Fase 2 consegnata.** Invarianti estese a 18 (I15–I18, §3.11). Grafo di
> navigazione corretto: rimosse le diagonali verso `wp-hall-02`, una delle quali attraversava il
> plinto (rilevato da I16). P4 risolta per assunzione: logo come insegna sulla parete di fondo.
> Changelog 1.1 — accento primario sostituito: **Flame Orange, PANTONE 15-1157 TPG (#F98E30)**
> al posto dell'arancio-rosso `#ff5a1f`; token rinominato `ember` → `flame`. Nessun rosso di brand:
> `#c21025` sopravvive solo come colore di stato per gli errori.
> Changelog 1.0 — **tutte le decisioni chiuse** (D1-A, D2-A, D3-A, D4-B, D6-B, D7-A; brand:
> INTO Industries, logo fornito). Piano esecutivo: nessuna ambiguità residua.
> Changelog 0.4 — L1 (hosting) **risolta**: integrazione Vercel attiva e verificata. Aggiunti
> L12 e la decisione D7 (doppio hosting).
> Changelog 0.3 — aggiunta §10: capacità e limiti dell'ambiente, **verificati**, con piano di
> prevenzione per ciascuno. Versioni pacchetti allineate al registry reale.
> Changelog 0.2 — D5 risolta parzialmente (direzione visiva da reference; nome brand ancora aperto):
> palette riscritta, direzione artistica in §4.4, nuova decisione D6 (grana).

> Questo documento è l'unico output della Fase 0. Nessun progetto è stato inizializzato,
> nessuna dipendenza installata, nessun codice applicativo scritto.

---

## 0. Sommario esecutivo e tensioni del brief

Quattro tensioni andavano risolte prima di scrivere codice. **Tutte chiuse il 2026-10-15.**

| # | Tensione | Esito |
|---|----------|-------|
| **T1** | Faretti con ombre vs 60 fps mobile | **Chiusa → D3-A.** Max 2 ombre reali su tier high/medium, 0 su low con ombre "blob" a terra |
| **T2** | Ordine Fase 1 → Fase 2 | **Chiusa → D4-B.** La Fase 1 diventa **Fase 1b**: UI + blockout minimo, così è valutabile |
| **T3** | Tap-to-move con percorsi validi | **Chiusa.** Grafo waypoint + A* + sweep, modellato in `navigation.links` dalla Fase 0 |
| **T4** | Grana pesante vs budget mobile | **Chiusa → D6-B.** Velo in compositing, fuori dalla pipeline WebGL |

<details><summary>Analisi originale delle tensioni (conservata per tracciabilità)</summary>

| # | Tensione | Impatto se non decisa ora |
|---|----------|---------------------------|
| T1 | "Faretti SpotLight + ombre proiettate" vs "60 fps su mobile" | Ogni SpotLight con `castShadow` costa un render pass aggiuntivo della scena. 4 spot con ombre = 5 pass. Su GPU mobile integrate questo è il singolo costo dominante. Rifarlo in Fase 6 significa riscrivere `lighting` e i materiali. |
| T2 | Ordine Fase 1 (UI overlay) → Fase 2 (3D) | Il deliverable della Fase 1 è una UI che fluttua sul nulla: non è valutabile esteticamente né dimostra la promessa "impressionante dal primo prototipo". |
| T3 | "Tap su pavimento" + "percorsi validati che non attraversano i collider" | Implica pathfinding, non un semplice `lerp` verso il punto toccato. Serve un grafo di waypoint navigabile con A*, e la proiezione del tap sul nodo raggiungibile più vicino. Va modellato in `storeConfig.js` dall'inizio (campo `navigation.links`), non aggiunto in Fase 3. |
| T4 | Grana pesante (firma del brand) vs budget mobile | La grana è un passaggio a schermo intero dopo il rendering: stesso tipo di costo delle ombre. Senza grana il negozio non somiglia al brand; con grana "vera" si perde il margine su mobile. |

</details>

Le decisioni che le hanno chiuse sono in §7, con le opzioni scartate e il motivo.

---

## 1. Stack tecnico (con motivazione)

| Livello | Scelta | Perché questa e non l'alternativa |
|---|---|---|
| Build tool | **Vite 8** (8.3.4 verificata sul registry) | Dev server con HMR istantaneo, `build` Rollup con code-splitting. L'alternativa (Next.js) aggiunge SSR che per una scena WebGL è peso morto: la scena non è renderizzabile server-side e il routing è interno alla scena 3D. |
| UI framework | **React 19** | Richiesto dal brief ed è il prerequisito di React Three Fiber. Il modello dichiarativo paga nella UI overlay (modali, HUD, onboarding), dove lo stato è complesso. |
| Renderer 3D | **Three.js 0.186 via React Three Fiber 9.8** (verificate) | R3F non è un wrapper lento: è un reconciler che costruisce lo stesso scene graph di Three.js. Il vantaggio reale è che la scena diventa un albero di componenti alimentabile da `storeConfig.js` con un `.map()`, che è esattamente il requisito data-driven. Three.js puro imporrebbe un layer imperativo scritto a mano per fare la stessa cosa. |
| Helper 3D | **@react-three/drei** (selettivo) | Si importano solo i moduli usati (`<Html>`, `<useGLTF>`, `<AdaptiveDpr>`, `<Detailed>`, `<SoftShadows>`). È tree-shakeable: nessun import globale. |
| Styling | **Tailwind CSS 4.3** ✅ *(D1-A, confermata)* | L'estetica brutalist vive di spaziature rigide, bordi secchi, tipografia a scala fissa: un sistema di token a classi è più coerente e produce meno CSS runtime di styled-components, che inietta stili a ogni render. Con il canvas WebGL che compete per il main thread, zero CSS-in-JS runtime è un vantaggio misurabile. |
| Stato globale | **Zustand 5.0** ✅ *(D2-A, approvata)* | Lo stato condiviso (fase app, focus mode, modale aperta, device profile, posizione player) è letto sia dentro che fuori il canvas. Con Context di React ogni cambio di stato ri-renderizza i consumer: dentro un `useFrame` a 60 Hz è inaccettabile. Zustand permette sottoscrizioni selettive e letture non reattive (`getState()`) dal render loop. |
| Animazioni UI | **Framer Motion 12** | Transizioni di modali/onboarding. Usato **solo** nella UI 2D; le transizioni di camera sono fatte con interpolazione manuale in `useFrame` (nessun sistema di animazione esterno dentro il render loop). |
| Linting | ESLint 9 + plugin React Hooks | Le regole sugli hook intercettano gli errori più comuni in R3F (hook condizionali dentro componenti di scena). |
| Deploy | **Vercel via integrazione Git** (Fase 7, ma da attivare prima — vedi §10) | Build statica, preview per branch, header di cache configurabili per i `.glb`. Netlify è equivalente: la scelta non è vincolante. |

**Esplicitamente escluso in questa fase:** physics engine (Rapier/Cannon). Il brief impone collisioni
via bounding box semplificate: un risolutore AABB scritto a mano (~80 righe) copre il caso d'uso
"il player non attraversa i muri" senza aggiungere 500 kB di WASM e un passo di simulazione per frame.

---

## 2. Architettura delle cartelle

```
/
├── PLAN.md                        # questo documento
├── README.md
├── index.html                     # entry Vite, <noscript> + contenitore fallback
├── package.json
├── vite.config.js
├── tailwind.config.js             # mappa i token di designTokens.js su classi utility
├── postcss.config.js
├── eslint.config.js
├── docs/
│   ├── PERF.md                    # log delle misurazioni (dalla Fase 6; schema in §5)
│   └── DECISIONS.md               # registro decisioni (ADR brevi)
├── public/
│   ├── models/                    # .glb segnaposto low-poly (Fase 4)
│   └── textures/                  # solo ciò che non è generabile proceduralmente
└── src/
    ├── main.jsx                   # bootstrap: probe WebGL → App | WebGLFallback
    ├── App.jsx                    # orchestratore: Onboarding / Canvas / UI overlay
    │
    ├── config/                    # ── IL "CMS LOCALE" — unica fonte di verità ──
    │   ├── storeConfig.js         # mappa, POI, espositori, prodotti, luci, collider, waypoint
    │   ├── designTokens.js        # palette, tipografia, spaziature, z-index, durate
    │   └── validateStoreConfig.js # validatore delle invarianti referenziali (solo DEV)
    │
    ├── state/
    │   ├── useAppStore.js         # store Zustand: appPhase, device, focus, modal, hud
    │   └── usePlayerStore.js      # posizione/rotazione player (scritto da useFrame, non reattivo)
    │
    ├── lib/                       # logica pura, zero React, testabile in isolamento
    │   ├── navGraph.js            # costruzione grafo + A* + proiezione punto→nodo
    │   ├── collision.js           # risolutore AABB a scivolamento (sweep & slide)
    │   ├── materials.js           # factory materiali PBR procedurali + texture a griglia (canvas)
    │   ├── cameraPath.js          # easing/interpolazione pose camera (Focus Mode)
    │   ├── deviceProfile.js       # rilevamento touch/puntatore + tier prestazionale
    │   └── perf.js                # campionamento fps, p1% low, contatori render
    │
    ├── hooks/
    │   ├── useDeviceProfile.js
    │   ├── useKeyboardMove.js     # WASD/frecce → vettore di input
    │   ├── usePointerLook.js      # Pointer Lock desktop + gestione perdita focus
    │   ├── useDragLook.js         # orientamento mobile via trascinamento (≠ tap)
    │   ├── useTapToMove.js        # raycast → waypoint/pavimento/espositore → percorso
    │   ├── useProximity.js        # distanza player ↔ POI → stato hotspot
    │   └── useFocusCamera.js      # ingresso/uscita Focus Mode
    │
    ├── scene/                     # ── tutto generato da storeConfig, zero letterali ──
    │   ├── StoreCanvas.jsx        # <Canvas>, dpr adattivo, tone mapping, color space
    │   ├── environment/
    │   │   ├── Floor.jsx  Ceiling.jsx  Walls.jsx  Zone.jsx  Entrance.jsx
    │   ├── lighting/
    │   │   ├── AmbientRig.jsx     # ambient + hemisphere + env map
    │   │   └── SpotRig.jsx        # faretti da config, budget ombre per tier
    │   ├── colliders/
    │   │   ├── ColliderSet.jsx    # AABB invisibili (nessuna geometria renderizzata)
    │   │   └── ColliderDebug.jsx  # wireframe, attivo solo con ?debug=1
    │   ├── displays/
    │   │   ├── Display.jsx        # dispatcher per `kind`
    │   │   ├── DisplayMannequin.jsx  DisplayPlinth.jsx  DisplayRack.jsx  DisplayWall.jsx
    │   │   └── Hotspot.jsx        # indicatore floating (POI, non legato al modello)
    │   ├── navigation/
    │   │   ├── WaypointMarkers.jsx   # visibili solo su mobile
    │   │   └── MoveTargetPing.jsx
    │   └── player/
    │       ├── PlayerController.jsx  # integra input → collisione → camera
    │       ├── DesktopControls.jsx  MobileControls.jsx
    │       └── FocusCameraRig.jsx
    │
    ├── ui/
    │   ├── onboarding/
    │   │   ├── LoaderScreen.jsx      # progresso reale da useProgress
    │   │   └── ControlsPrimer.jsx    # istruzioni divergenti desktop / mobile
    │   ├── hud/
    │   │   ├── Crosshair.jsx  Minimap.jsx  ProximityPrompt.jsx
    │   │   └── QuickTravelBar.jsx    # barra teletrasporto (solo mobile)
    │   ├── menu/ MenuDrawer.jsx
    │   ├── product/ ProductModal.jsx  SizeSelector.jsx       # Fase 5
    │   ├── lookbook/ LookbookPanel.jsx                        # Fase 5
    │   ├── primitives/
    │   │   ├── PlaceholderImage.jsx  # 1:1 / 16:9 / 4:5 + skeleton + etichetta stabile
    │   │   ├── Skeleton.jsx  Button.jsx  Panel.jsx  Tag.jsx
    │   └── fallback/ WebGLFallback.jsx
    │
    └── styles/
        └── index.css              # reset + @theme Tailwind + keyframes skeleton
```

**Regola architetturale non negoziabile:** nessun file sotto `src/scene/`, `src/ui/` o `src/hooks/`
contiene un numero di posizione, un nome di prodotto, un colore esadecimale, un testo o un percorso
asset. Tutto arriva da `src/config/`. Un componente di scena riceve un oggetto di config come prop e
ne interpreta i campi. Il controllo è automatizzabile con una regola ESLint `no-restricted-syntax`
sui letterali numerici nelle prop di posizione (da valutare in Fase 2).

---

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

## 4. Design system

### 4.1 Token (`src/config/designTokens.js`)

```js
export const tokens = {
  // Palette derivata dalla reference fornita (screenshot griglia Instagram, vedi §4.4).
  // Sistema a DUE fondi: nero editoriale (negozio) e osso/studio (prodotto in Focus Mode).
  color: {
    bg:      { base: '#060606', raised: '#0c0c0d', overlay: 'rgba(6,6,6,0.86)',
               studio: '#dcdcd8' },                       // fondo seamless dei product shot
    surface: { 1: '#101011', 2: '#17171a', 3: '#202024' },
    border:  { subtle: '#232326', strong: '#3a3a40', hard: '#f2f0ea' },
    text:    { primary: '#f2f0ea',   // bianco osso, non bianco puro
               secondary: '#9b9b96', muted: '#5c5c58', inverse: '#060606' },
    accent:  { flame: '#f98e30',     // PANTONE 15-1157 TPG Flame Orange — accento UNICO (v1.1)
               bone:  '#f2f0ea' },   // il "terzo colore" è l'assenza di colore
    state:   { danger: '#c21025', ok: '#9b9b96' },        // unico rosso ammesso: stato d'errore
  },
  type: {
    // Due famiglie, non più: una condensata bold per i titoli, una mono per i dati.
    // Tre registri, come nella reference: gotico per i titoli d'impatto, grottesca
    // stretta per le etichette, mono per i micro-dati tecnici.
    family: { gothic:  '"UnifrakturCook", "Pirata One", serif',   // usare con parsimonia
              display: '"Archivo Expanded", "Arial Black", system-ui, sans-serif',
              mono:    '"JetBrains Mono", ui-monospace, monospace' },
    scale: { xs: '0.6875rem', sm: '0.8125rem', base: '0.9375rem',
             lg: '1.25rem', xl: '2rem', '2xl': '3.25rem', '3xl': '5rem' },
    tracking: { tight: '-0.02em', normal: '0', wide: '0.08em', brutal: '0.18em' },
    weight: { regular: 400, bold: 700, black: 900 },
  },
  space: { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radius: { none: '0', sm: '2px' },          // spigoli vivi, nessuna eccezione
  border: { hairline: '1px', thick: '2px' },
  shadow: { none: 'none', hard: '4px 4px 0 #000' },
  motion: { fast: 140, base: 240, slow: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  z: { canvas: 0, hotspot: 10, hud: 20, quickTravel: 25, modal: 40, onboarding: 50, fallback: 60 },
  breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1440 },
  touchTarget: { min: 44 },                  // px, requisito di accessibilità mobile
};
```

Direzione estetica: vedi §4.4. In sintesi — fondo quasi nero, bianco osso come testo, **arancione
brace come unico accento vivo**, rosso tecnico in dosi minime, zero border-radius, bordi hairline,
grana su tutto. Il 3D fornisce il calore (i faretti ember); la UI resta monocroma e tecnica.

### 4.2 `<PlaceholderImage />` — contratto API

```jsx
<PlaceholderImage
  ratio="4:5"                 // '1:1' | '16:9' | '4:5' — obbligatorio
  label="Front"               // etichetta SEMPRE visibile (segnaposto intenzionale)
  category="Hoodie"           // mostrata se variants[variant].showCategory
  variant="product"           // 'product' | 'editorial'
  state="placeholder"         // 'placeholder' | 'loading' | 'error'  ← stati distinti
  seed="prod-001"             // determina il pattern procedurale (stabile tra i render)
  className=""
/>
```

Comportamento richiesto:
- `ratio` applicato con `aspect-ratio` CSS: **nessun layout shift**, il box è dimensionato prima del contenuto.
- `state="loading"` → skeleton con shimmer, durata minima `skeleton.minVisibleMs` per evitare il flash,
  e **timeout**: oltre 8 s passa a `state="error"`. Nessuno skeleton infinito, mai.
- `state="placeholder"` → pattern procedurale (griglia o diagonali, da `variant`) + etichetta +
  categoria **stabilmente visibili**. È il caso di default in tutte le fasi 1-7.
- `state="error"` → bordo `state.danger`, etichetta, nessun shimmer.
- Il segnaposto intenzionale è visivamente distinto dal caricamento: il primo ha pattern e testo
  nitidi, il secondo è un blocco animato senza testo.

### 4.3 Placeholder 3D

| Elemento | Primitiva | Trattamento |
|---|---|---|
| Manichino | capsule + box base, o `.glb` low-poly (< 2k tri) | `mat-mannequin`, roughness media, un faretto dedicato |
| Plinto espositivo | box smussato | `mat-steel-brushed`, metalness alta per catturare il faretto |
| Rack | cilindri + box | `mat-steel-brushed` |
| Pannello a muro | plane | materiale emissivo tenue + `<Html>` con `<PlaceholderImage />` |
| Pavimento | plane | texture a griglia generata su `<canvas>` (nessun file, nessuna richiesta di rete) |

Le texture a griglia sono generate proceduralmente in `lib/materials.js` e messe in cache per ID
materiale: un solo `CanvasTexture` condiviso, non una per mesh.

### 4.4 Direzione artistica (derivata dalla reference)

**Fonte:** screenshot della griglia Instagram di `@into_industries` fornito il 2026-10-15.
**Limite dichiarato:** instagram.com non è raggiungibile da questo container (`ENOTFOUND`): la lettura
è basata esclusivamente sullo screenshot, non sul profilo. Se la griglia non è rappresentativa del
brand, questa sezione va rivista.

**Cosa ho letto nella reference**

| Elemento | Osservazione | Traduzione nel progetto |
|---|---|---|
| Due mondi visivi | Product shot su fondo grigio-osso seamless, luce morbida e frontale **vs** poster editoriali nero profondo, grana pesante, contrasto estremo | **Mappa direttamente sulla nostra architettura:** il negozio è il mondo nero; il Focus Mode su un prodotto alza una pozza di luce chiara che cita il fondo studio. La transizione di Focus (Fase 4) diventa un passaggio editoriale→studio, non solo un movimento di camera |
| Accento | Arancione brace: cordino sui pantaloni, auto in fiamme, iride. Usato in dosi piccolissime su grandi campiture nere | `accent.ember` `#ff5a1f`. Nella scena 3D è la temperatura dei faretti d'atmosfera, non una vernice sugli oggetti |
| Accento secondario | Rosso tecnico `#c21025` su fondo chiaro (poster "STAR USURPER", "DESTINY Paths") | `accent.crimson`, riservato a stati e micro-dati. Mai insieme all'ember nello stesso blocco |
| Bianco | Osso, mai puro | `#f2f0ea` per tutto il testo primario |
| Grana | Su tutte le immagini editoriali, pesante, è la firma | `performance.postFx.grain` — vedi **D6** |
| Tipografia | Tre registri: gotico/blackletter per l'impatto, grottesca stretta per le etichette, mono micro per i dati tecnici (crocini di registro, codici, numeri di serie) | `type.family` a tre voci. Il gotico va dosato: uno per schermata, mai nella UI funzionale |
| Densità | Micro-testo tecnico ovunque, crocini, mirini, codici | Vale come **texture**, non come informazione. Nel 3D diventa decalcomania sui pannelli; nella UI diventa l'etichetta mono di `<PlaceholderImage />` |

**Regole operative che ne derivano**

1. **Il nero è il protagonista, non il fondo.** Niente grigi medi: si passa da `#060606` a `#dcdcd8`, poco in mezzo.
2. **Un solo accento acceso per inquadratura.** Ember *oppure* crimson, mai entrambi.
3. **La luce calda sostituisce la vernice calda.** Gli oggetti restano desaturati; il colore lo mette il faretto. Questo tiene i materiali economici e coerenti.
4. **Tutto ha grana.** Il 3D pulito è fuori brand. La grana è anche l'alleato tecnico che maschera shadow map a bassa risoluzione e banding — vedi D3.
5. **Il gotico non entra mai in un bottone.** Solo titoli di schermata, loader e lookbook.

**Correzione alla v0.2 di questo documento.** Avevo trattato `into_industries` come una reference
esterna da non usare. È invece **il brand del progetto**: nome e logo sono stati forniti il
2026-10-15. Quella nota cautelativa è annullata. Assumo che tu abbia il mandato per usare marchio
e logo; se non fosse così, dimmelo e li sostituisco con segnaposto.

### 4.5 Il logo e cosa ne ricavo

**Letto dal file fornito** (150×150 px, PNG — vedi nota sul formato più sotto):

| Elemento | Osservazione | Uso nel progetto |
|---|---|---|
| **Ovale di contenimento** | Il marchio `INTO` è racchiuso in un'ellisse nera dal tratto spesso, stile targhetta industriale/automotive | **Questo è il regalo più grande del logo.** L'ellisse diventa il motivo geometrico ricorrente: la forma dell'**ombra a terra** (che D3-A ci impone comunque di disegnare), la sagoma degli **hotspot** di prossimità, il bordo dei bottoni primari. Il brand si ripete nella meccanica, non solo nei cartelli |
| **Fondo chiaro** | Il logo vive su bianco/osso, non su nero | Conferma il sistema a due fondi di §4.4: il mondo "studio" non è un vezzo, è identità. Serve una variante invertita per il negozio scuro (`logo.onDark`) |
| **Accento caldo dentro il marchio** | Elemento arancione/rosso all'interno dell'ovale | Conferma `accent.ember` come primario |
| **Micro-testo denso attorno** | `WE'RE JUST LOOKING FOR … SOMEWHERE`, `FLORENCE©ITALY`, coordinate `43°46'N 11°15'E`, `CURATED AND PRODUCED BY TOMMASO INTURRISI`, `®` | Conferma la regola "densità tecnica come texture". Questi dati non sono decorazione: diventano **contenuto reale** del Lookbook / Brand Story (Fase 5) e vivono in `meta.brand`, non scritti a mano nei componenti |
| **`( industries*)`** | Descrittore in minuscolo sotto il marchio, separato | Gerarchia: `INTO` è il marchio, `industries` è il descrittore. Nell'insegna 3D e nei titoli vanno trattati con pesi diversi, mai come una parola sola |

**Problema pratico, da risolvere prima della Fase 2:** il file ricevuto è un **PNG 150×150 px su
fondo bianco**. È sufficiente per leggere la direzione, **non** per usarlo: a quella risoluzione
un'insegna 3D o un titolo a schermo intero risultano sgranati, e il fondo bianco opaco non si
scontorna su scena scura. **Mi serve l'originale vettoriale (`.svg`, `.ai` o `.pdf`)**, o in
subordine un PNG a fondo trasparente ≥ 2000 px. Fino ad allora uso un segnaposto tipografico e lo
dichiaro: `assets.registry['asset-logo-primary'].fallback`.

---

## 5. Dispositivi, browser e misurazione delle prestazioni

### 5.1 Dispositivi di riferimento

| Tier | Dispositivo | Risoluzione / DPR | Soglia di accettazione |
|---|---|---|---|
| **high** | Desktop con GPU dedicata (classe GTX 1650 / M2 o superiore) | 1920×1080 @1 | 60 fps stabili, p1% ≥ 50 |
| **medium** (target primario desktop) | Laptop con GPU integrata (Iris Xe / Apple M1) | 1920×1080 @1–2 | p50 ≥ 58 fps, p1% ≥ 45 |
| **medium** (target primario mobile) | iPhone 12 / SE 3ª gen | 390×844 @2 (DPR capped 1.5) | p50 ≥ 55 fps, p1% ≥ 40 |
| **low** (pavimento) | Android mid-range (Pixel 6a / Galaxy A54) | 412×915 @1 | p50 ≥ 40 fps, nessun crash, interazioni reattive |

**Il target "60 fps" è un obiettivo di tier medium/high. Sul tier low l'obiettivo dichiarato è 40 fps
con qualità ridotta** (zero ombre dinamiche, DPR 0.75–1, env map 64). Promettere 60 fps su un
Android mid-range con faretti e ombre sarebbe una dichiarazione che non potrei onorare.

### 5.2 Browser

Supportati: Chrome/Edge ≥ 120, Firefox ≥ 121, Safari ≥ 16.4 (desktop e iOS).
Requisito tecnico: **WebGL2**. Senza WebGL2 → schermata di fallback (Fase 6), non un downgrade.
Pointer Lock non esiste su iOS/Android: è la ragione tecnica per cui il percorso mobile è
Tap-to-Move e non WASD + look, non una semplificazione di comodo.

### 5.3 Protocollo di misurazione

1. **Strumentazione in-app:** `lib/perf.js` campiona il delta di frame in `useFrame` e calcola
   p50, p95 e **p1% low** (il valore che rivela gli stutter, che la media nasconde) su finestre di 5 s.
   HUD attivabile con `?debug=1`. In Fase 6 si aggiunge `r3f-perf` per drawcall/triangoli/programmi.
2. **Percorso di benchmark riproducibile:** un tour scriptato di ~40 s (`?bench=1`) che attraversa
   ingresso → nuovi arrivi → archivio → lookbook → focus su due prodotti. Stessa traiettoria a ogni
   run, 3 run per dispositivo, si riporta la **mediana** dei p50 e il **peggiore** dei p1%.
3. **Strumenti esterni:** Chrome DevTools Performance (long task, GC), `WEBGL_debug_renderer_info`
   per registrare la GPU reale, Lighthouse mobile per il caricamento (LCP, TBT, peso bundle).
4. **Registro:** ogni misurazione va in `docs/PERF.md` con data, dispositivo, GPU rilevata, browser,
   build commit, tier attivo, p50/p95/p1%, drawcall, triangoli e **se la misura è su hardware reale
   o in emulazione**.

### 5.4 Limite dichiarato dell'ambiente di lavoro (sintesi — dettaglio verificato in §10)

Questa sessione gira in un container cloud Linux senza GPU e senza display: posso eseguire la build
di produzione, avviare il dev server, aprire le pagine con Chromium headless (Playwright è
preinstallato) e catturare screenshot ed errori di console, con rendering **software (SwiftShader)**.
Di conseguenza:

- **Eseguibile qui:** build, dev server, errori runtime di console, screenshot di layout, verifica
  che la scena WebGL si inizializzi, peso del bundle, validazione di `storeConfig`.
- **NON eseguibile qui:** qualsiasi numero di fps rappresentativo, test su hardware reale,
  test touch su dispositivo fisico, resa di ombre/tone mapping come su GPU reale.

Gli fps misurati in questo ambiente non verranno **mai** riportati come se fossero prestazioni reali.
Le misurazioni di §5.3 su dispositivi fisici vanno eseguite da te, sui dispositivi di §5.1; io
fornirò l'HUD, il percorso di benchmark e il modulo di `docs/PERF.md` da compilare.

---

## 6. Roadmap: dipendenze, complessità, rischi

```
F0 ──> F1b ──> F2 ──> F3 ──> F4 ──> F5 ──> F6 ──> F7 ──> (F8)
```
Con D4-B la Fase 1 assorbe un blockout minimo e diventa **F1b**: la catena torna lineare, e ogni
consegna è valutabile per conto suo. F2 approfondisce l'ambiente che F1b ha abbozzato.

| Fase | Oggetto | Complessità | Rischi principali | Definition of Done |
|---|---|---|---|---|
| **F0** | Piano e schema dati | **Bassa** | Schema incompleto → refactor a cascata nelle fasi 3-5. Mitigazione: invarianti I1-I14 definite ora. | `PLAN.md` approvato |
| **F1b** | Setup, design system, onboarding, HUD **+ blockout minimo** (pavimento, 4 muri, 2 faretti) | **Media** *(era Bassa-Media: il blockout aggiunge ~mezza giornata)* | Font display: il blackletter del brand è probabilmente proprietario (L7) → uso un open font e lo dichiaro. Logo in bassa risoluzione (§4.5) → segnaposto tipografico finché non arriva il vettoriale | Build ok, dev server ok, onboarding desktop/mobile, `<PlaceholderImage />` nei 3 ratio e 3 stati, **e i cartelli visibili dentro un ambiente**, quindi giudicabili |
| **F2** | Blockout + lighting | **Media** | **Il rischio estetico maggiore del progetto.** Luci e materiali decidono se l'esperienza impressiona. Secondo rischio: budget ombre (T1/D3). | Scena generata 100% da config, camera statica, 4 inquadrature screenshot, zero errori console |
| **F3** | Navigazione ibrida | **Alta** | Pointer Lock: perdita di focus, ESC, re-entry solo su gesto esplicito (bug sottili e specifici per browser). Tap vs drag: discriminare per soglia px + tempo. A* + sweep: percorsi che tagliano gli angoli dentro i collider. | Desktop WASD+look senza penetrazione muri; mobile tap-to-move e teletrasporto; hotspot con isteresi |
| **F4** | Modelli segnaposto + Focus Camera | **Media** | Focus Mode è una macchina a stati (free → entering → focused → exiting → free): gli input vanno congelati, le uscite devono essere sempre possibili, anche su perdita di focus. Ombre proiettate = ritorno di T1. | Focus in/out fluido su ogni display, nessuno stato bloccato, ombre entro il budget del tier |
| **F5** | Modali prodotto + Lookbook | **Media** | Movimento sospeso e ripristinato in modo coerente (il bug classico: chiusura modale con un tasto ancora premuto → il player parte da solo). Focus trap e accessibilità da tastiera. | Modali da `storeConfig`, movimento sospeso/ripristinato correttamente, lookbook navigabile |
| **F6** | Performance, responsive, fallback | **Media-Alta** | Disposal GPU: i leak si vedono solo dopo molti cicli di montaggio/smontaggio. Rischio dichiarativo: non poter testare su dispositivi reali da qui (§5.4). | HUD perf, cap 60 fps, disposal verificato, fallback WebGL, `docs/PERF.md` compilato con misure reali |
| **F7** | Build e deploy | **Bassa** | ~~Blocco di rete~~ **risolto**: integrazione Vercel attiva, Production e Preview verificate (§10.4). Da F1b in poi ogni push produce un URL pubblico | Dominio di produzione verificato da te sul tuo browser (io non raggiungo gli URL pubblicati, L12) |
| **F8** | E-commerce reale | **Alta** | Non eseguita. Solo su tuo comando esplicito futuro. | — |

**Percorso critico:** F2 (estetica) e F3 (navigazione). Sono le due fasi dove un errore è costoso da
correggere dopo. Suggerisco di dedicare a entrambe un giro di revisione in più.

---

## 7. Decisioni — TUTTE CHIUSE (2026-10-15)

| # | Decisione | Scelta | Opzioni scartate e perché |
|---|---|---|---|
| **D1** | Styling | **A — Tailwind 4.3** | *Styled-components:* costruisce gli stili nel browser dell'utente, sullo stesso thread già occupato dal canvas 3D. Con Tailwind gli stili esistono già prima che la pagina si apra |
| **D2** | Stato globale | **A — Zustand 5.0** | *Context di React:* a ogni cambio ri-renderizza tutti i consumer; con la posizione del player che cambia 60 volte al secondo è insostenibile. *Emitter a mano:* funziona, ma è codice mio in più senza vantaggi |
| **D3** | Ombre | **A — ibrida** | Max 2 ombre reali su tier high/medium, **0 su low** con ombre "blob" ellittiche a terra. *Tutte reali:* il tier low scende sotto i 30 fps. *Lightmap pre-cotte:* la resa migliore, ma invalidano il principio data-driven — spostare un espositore in config lascerebbe l'ombra dov'era |
| **D4** | Ordine fasi | **B — Fase 1b** | La Fase 1 include un blockout minimo (pavimento, 4 muri, 2 faretti), così la UI è giudicabile dentro un ambiente. *Ordine originale:* consegna cartelli nel vuoto, su cui non è possibile dare un giudizio |
| **D5** | Brand | **Chiusa: INTO Industries** | Nome, logo, origine (Florence, Italy), coordinate e credito in `meta.brand`. Palette e direzione in §4.4, lettura del logo in §4.5 |
| **D6** | Grana | **B — velo in compositing** | Texture di rumore sopra il canvas, `mix-blend-mode`, animata a ~12 Hz: la pipeline WebGL non la vede. *Post-processing reale:* resa perfetta ma costo a schermo intero proprio dove D3 sta risparmiando. Lo schema resta commutabile via `performance.postFx.grain.mode` · **Rivista il 2026-10-16:** fusione `alpha` (solo granelli scuri) al posto di `mix-blend-mode: overlay`, che su Iris Xe costava ~20 fps e alzava il nero (docs/PERF.md). Scelta dell'utente dopo confronto a vista e misure |
| **D7** | Doppio hosting | **A — solo Vercel** | Dichiarato sistemato da te. **Non verificabile da qui** (§10.4, punto 4) |

### 7.1 Punti ancora aperti (non bloccanti per la Fase 1b)

| | Cosa manca | Entro quando | Se non arriva |
|---|---|---|---|
| **P1** | **Logo vettoriale** (`.svg` / `.ai` / `.pdf`) o PNG trasparente ≥ 2000 px. Il file ricevuto è 150×150 px su fondo bianco | **Fase 2** (prima dell'insegna 3D) | Uso un segnaposto tipografico e lo dichiaro |
| **P2** | **Font del marchio**, se ne esiste uno proprietario con licenza | Fase 1b | Uso un open font vicino e dichiaro che non è identico (L7) |
| **P3** | **Conferma della tagline** `We're just looking for somewhere` — l'ho letta dal micro-testo del logo a bassa risoluzione, potrebbe essere incompleta | Fase 5 (Lookbook) | La marco come da verificare nel file di configurazione |
| ~~P4~~ | ~~Il logo deve comparire in 3D?~~ | **Fase 2: risolta per assunzione** | Insegna sulla parete di fondo (punto di fuga dell'ingresso) con wordmark nell'ellisse del marchio, pannello Lookbook sotto. Da confermare o correggere |

## 8. Verifiche della Fase 0

| Verifica | Stato | Nota |
|---|---|---|
| Stack tecnico motivato | **Eseguita** | §1, con alternative scartate e motivo |
| Schema `storeConfig.js` completo | **Eseguita** | §3, 11 sezioni + 14 invarianti |
| Design system placeholder 2D/3D | **Eseguita** | §4, API di `<PlaceholderImage />` e trattamento 3D |
| Dispositivi/browser e misurazione | **Eseguita** | §5, con soglie differenziate per tier |
| Roadmap, dipendenze, complessità, rischi | **Eseguita** | §6, con Definition of Done per fase |
| Architettura delle cartelle | **Eseguita** | §2 |
| Build di produzione | **Non applicabile** | Nessun progetto inizializzato: la Fase 0 produce solo documentazione |
| Avvio dev server | **Non applicabile** | Idem |
| Verifica UI nel browser | **Non applicabile** | Nessuna UI esistente |
| Misurazione fps reale | **Bloccata (ambiente)** | Container senza GPU, §5.4. Richiede i tuoi dispositivi fisici |
| Lettura della reference di brand | **Parziale** | instagram.com non raggiungibile dal container (`ENOTFOUND`): §4.4 deriva dal solo screenshot fornito |
| Lettura del logo | **Parziale** | File a 150×150 px: sufficiente per la direzione, insufficiente per l'uso (P1) |
| Hosting Vercel (Production + Preview) | **Eseguita** | §10.4, deployment `7098935169` e `7099073171`, entrambi `success` |
| Disattivazione di GitHub Pages | **Bloccata (ambiente)** | API negata dal proxy. Dichiarata da te, da confermare in F1b |
| Chiusura di tutte le decisioni | **Eseguita** | §7 |

---

## 9. Stato

**Fase 0 completata. Tutte le decisioni sono chiuse. Nessuna fase successiva è autorizzata.**

| | |
|---|---|
| Decisioni | D1-A · D2-A · D3-A · D4-B · D5 (INTO Industries) · D6-B · D7-A — **tutte chiuse** |
| Limiti | L1 risolta e verificata · L2, L3, L4, L12 permanenti e dichiarati · gli altri mitigati |
| Hosting | Vercel attivo, Production e Preview verificate |
| Aperti non bloccanti | P1 logo vettoriale · P2 font · P3 tagline · P4 logo in 3D (§7.1) |

Il piano è esecutivo: non resta nessuna ambiguità che mi impedisca di scrivere la prima riga di
codice. Manca solo il tuo comando esplicito:

> **`Approvato, procedi alla fase 1b`**

---

## 10. Capacità e limiti dell'ambiente di lavoro (verificati)

Tutte le righe seguenti sono state **misurate** in questa sessione il 2026-10-15, non stimate.

### 10.1 Cosa funziona

| Capacità | Esito verificato | Conseguenza per il piano |
|---|---|---|
| CPU / RAM / disco | 4 core, 16 GB RAM, 31 GB liberi | Ampiamente sufficienti. Non è un collo di bottiglia |
| Node / npm | v22.22.0 / 10.9.4 | OK |
| Registry npm | `HTTP 200`; `three@0.186.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `vite@8.3.4`, `react@19.3.1`, `tailwindcss@4.3.3`, `zustand@5.0.15` tutti risolvibili | Installazione dipendenze: nessun ostacolo |
| Chromium headless | Presente in `/opt/pw-browsers` (1194) | Posso aprire le pagine, catturare screenshot, leggere errori di console |
| **WebGL2** | **Attivo**: `ANGLE (Google, Vulkan 1.3.0 SwiftShader)`, `MAX_TEXTURE_SIZE 8192`, `OES_texture_float_linear` ✓, `EXT_texture_filter_anisotropic` ✓ | **Posso renderizzare e verificare visivamente la scena 3D** in tutte le fasi 2-6. In software, quindi lento, ma corretto |
| Google Fonts | `css2` API `HTTP 200`, `fonts.gstatic.com` raggiungibile | Posso scaricare i font e **auto-ospitarli** |
| GitHub | `api.github.com HTTP 200`, push verificato | Commit e push funzionano |

### 10.2 Limiti, gravità e prevenzione

| # | Limite | Gravità | Prevenzione |
|---|---|---|---|
| **L1** | ~~Vercel e Netlify irraggiungibili dal container~~ → **RISOLTA il 2026-10-15** con l'integrazione Git | ~~Bloccante~~ → **chiusa per la produzione** | Integrazione Vercel ↔ GitHub attiva e **verificata** (§10.4). Il container resta fuori dal percorso di deploy: il 403 del proxy è irrilevante. Resta da confermare che i branch di lavoro producano una **Preview** (vedi §10.4, punto 3) |
| **L2** | **Nessuna GPU.** Rendering software (SwiftShader) | **Bloccante per le misure di prestazioni** | Non eliminabile. Io consegno l'HUD prestazioni, il percorso di benchmark scriptato (`?bench=1`) e il modulo `docs/PERF.md`; **le misure le esegui tu** sui dispositivi di §5.1. Nessun fps di questo ambiente verrà mai riportato come reale |
| **L3** | **Nessun dispositivo touch reale.** Safari iOS non è emulabile (motore e gesti di sistema diversi) | **Alta su F3 e F6** | Io testo con eventi touch emulati in Chromium (copre la logica: tap vs drag, soglie, pathfinding). Il comportamento reale di Pointer Events, gesti di sistema e bounce di Safari li verifichi tu su device — **e per farlo ti serve L1 risolta** |
| **L4** | **Giudizio estetico.** Lo screenshot software è corretto nei contenuti, ma non è il tuo monitor | **Media su F2 e F4** | Gli screenshot li uso come controllo di correttezza ("c'è tutto, è nel posto giusto, nessun errore"), mai come verdetto estetico. Quello resta tuo, ed è il motivo per cui la Fase 2 ha bisogno di un tuo giro di revisione |
| **L5** | **CDN bloccati** (`cdn.jsdelivr.net`, `unpkg.com`) | Nulla | Nessun `<script src>` esterno nel progetto: tutto passa da npm e finisce nel bundle. È anche la scelta corretta a prescindere |
| **L6** | **Google Fonts a runtime** = l'utente finale scarica da Google (latenza + implicazioni privacy/GDPR) | Bassa, ma reale | **Auto-ospitare**: scarico i `.woff2` in `public/fonts/` e li servo dal nostro dominio. Più veloce e senza terze parti. Lo faccio in Fase 1 |
| **L7** | **Font blackletter della reference**: quasi certamente proprietario o custom | Media su F1 | Uso un open font vicino (`UnifrakturCook`, `Pirata One`) e **dichiaro che non è identico**. Se hai la licenza del font reale, mandamelo e lo sostituisco: è un campo in `type.family` |
| **L8** | **Librerie di modelli 3D bloccate** (`sketchfab.com`, `poly.pizza`). **Blender non installato** | Bassa fino a F4 | Il piano usa già primitive e `assets.registry.fallback`, quindi F2-F3 non ne risentono. Per F4: genero i `.glb` proceduralmente da codice (esportatore glTF in Node), oppure me li fornisci tu |
| **L9** | **Instagram irraggiungibile** | Bassa | §4.4 è derivata dal tuo screenshot. Se serve più materiale, mandami altri screenshot |
| **L10** | **Container effimero**: a fine sessione tutto ciò che non è committato è perso, e `node_modules` va reinstallato a ogni sessione | Media, attrito ricorrente su 8 fasi | Committo e pusho alla fine di **ogni** fase (già nella procedura). Aggiungo in F1 un hook `SessionStart` che esegue `npm ci` all'avvio di ogni nuova sessione, così non perdo tempo a ogni ripresa |
| **L11** | **Rendering software lento**: un frame complesso può richiedere secondi | Bassa | Gli screenshot di verifica si fanno con attese esplicite sul frame, non con timeout a caso. Allunga le mie verifiche, non il tuo prodotto |
| **L12** | **Gli URL pubblicati sono irraggiungibili dal container**: `*.vercel.app` e `*.github.io` danno lo stesso 403 del proxy | Media, permanente | Posso confermare **che** un deploy è riuscito leggendo i Deployment di GitHub (stato, URL, commit), ma **non posso vedere cosa renderizza la pagina pubblicata**. La verifica visiva dell'URL live è tua. La mia verifica visiva resta sul dev server locale, che controllo per intero |

### 10.4 Stato dell'hosting — verificato il 2026-10-15

Letto dai Deployment di GitHub (unica fonte accessibile dal container, vedi L12).

1. **Vercel è collegato e funziona.**
   `vercel[bot]` · deployment `7098935169` · environment `Production` · stato **`success`**
   URL: `https://website-86fz9ag8q-yeppama.vercel.app`
   Commit servito: `08dedcb` (*Initial commit*, branch `main`).

2. **Quel deploy non contiene nulla di utile, ed è normale.** `main` contiene il solo `README.md`:
   nessun `package.json`, nessun `index.html`. Alla Fase 0 non esiste ancora un'applicazione.
   Non c'è niente da riparare. Dalla Fase 1, Vercel rileva da sé il preset Vite dal `package.json`
   (`npm run build` → `dist/`): nessuna configurazione manuale prevista.

3. **Le Preview sui branch di lavoro funzionano — verificato.**
   I primi push del branch (16:27, 16:34, 16:41 UTC) precedevano il collegamento di Vercel
   (16:56 UTC) e Vercel non recupera i push passati: l'assenza iniziale di Preview non era un
   problema di configurazione. Il push `ad66912` (17:02 UTC) ha prodotto in pochi secondi il
   deployment `7099073171` · environment `Preview` · stato **`success`**
   · URL `https://website-6ba3qxais-yeppama.vercel.app`.
   **Conseguenza operativa: da ogni fase in poi, ogni push sul branch di lavoro ti dà un URL
   pubblico da aprire sul telefono**, senza passare da `main`. Il requisito della Fase 3 (provare
   la navigazione mobile su un dispositivo vero) è coperto con tre fasi di anticipo.

   Nota per le verifiche future: Vercel registra il Deployment con `ref` = **SHA del commit**, non
   il nome del branch. Filtrare i Deployment per `?ref=<branch>` restituisce sempre una lista vuota
   e **non** significa che le preview manchino: va letta la lista completa.

4. **GitHub Pages: disattivato secondo quanto dichiarato — non verificabile da qui.**
   Era attivo (deployment `7098059202`, `success`, `https://yeppama.github.io/website/` su `main`).
   D7 è stata chiusa su "A — solo Vercel" e tu l'hai dichiarato sistemato.
   **Non posso confermarlo:** gli endpoint `/pages` e `/environments` dell'API GitHub sono negati
   dal proxy di questa sessione (`403 — Access to this GitHub API path is not permitted`), e il
   Deployment storico resta comunque in elenco anche dopo la disattivazione, quindi non è una prova.
   **Test reale, in Fase 1b:** dopo il primo push con l'applicazione, se `yeppama.github.io/website/`
   serve ancora qualcosa, Pages è rimasto acceso. Lo verifichi tu dal browser (L12).

### 10.3 Cosa mi serve da te, e quando

| Quando | Cosa | Perché |
|---|---|---|
| ~~Ora~~ | ~~Decisioni D1-D7~~ | **Tutte chiuse** (§7) |
| ~~Ora o in F1~~ | ~~Nome del brand~~ | **Fatto: INTO Industries** |

| ~~Entro F2~~ | ~~Collegamento Vercel ↔ GitHub~~ | **Fatto e verificato** (§10.4) |
| **Entro F2** | **Logo vettoriale** (P1) | Il PNG 150×150 su fondo bianco non è usabile per un'insegna 3D |
| **Entro F2** | Risposta a P4: il logo va messo in 3D o solo nella UI? | Cambia dove costruisco muri e faretti |
| **In F1b** | Conferma visiva su `yeppama.github.io/website/` (D7, §10.4) | Io non raggiungo gli URL pubblicati |
| **Da F2 in poi** | Il tuo giudizio estetico su screenshot | Io non posso darmelo da solo (L4) |
| **Da F3 in poi** | Prove sul tuo telefono | L3 non è aggirabile |
| **In F6** | Misure fps sui dispositivi di §5.1 | L2 non è aggirabile |
| **Opzionale, F1/F4** | Font proprietario, `.glb` tuoi | Sostituzioni dirette, nessun refactor |
