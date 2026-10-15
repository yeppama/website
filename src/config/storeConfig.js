/**
 * storeConfig.js — il "CMS locale".
 *
 * Unica fonte di verità per mappa, luci, collider, navigazione, prodotti e testi.
 * Nessun componente di scena o di interfaccia contiene una coordinata, un colore,
 * un prezzo o una frase: tutto arriva da qui, e le relazioni usano ID.
 *
 * Unità: metri. Y verso l'alto. Rotazioni in radianti.
 */

export const storeConfig = {
  meta: {
    schemaVersion: '1.0.0',
    brand: {
      id: 'into-industries',
      name: 'INTO industries',
      wordmark: 'INTO',
      descriptor: 'industries',
      origin: { city: 'Florence', country: 'Italy', coords: "43°46'N 11°15'E" },
      credit: 'Curated and produced by Tommaso Inturrisi',
      tagline: "We're just looking for somewhere",   // P3: da confermare
      currency: 'EUR',
      logo: { assetId: 'asset-logo-primary', shape: 'oval', onDark: 'invert' },
    },
    units: 'meters',
  },

  performance: {
    targetFps: 60,
    tiers: {
      high:   { dprRange: [1, 2],    maxShadowCasters: 2, shadowMapSize: 1024, envMapResolution: 256, antialias: true },
      medium: { dprRange: [1, 1.5],  maxShadowCasters: 2, shadowMapSize: 512,  envMapResolution: 128, antialias: true },
      low:    { dprRange: [0.75, 1], maxShadowCasters: 0, shadowMapSize: 256,  envMapResolution: 64,  antialias: false },
    },
    budgets: {
      drawCalls: { high: 120, medium: 80, low: 60 },
      triangles: { high: 400000, medium: 220000, low: 140000 },
      initialJsGzipKb: 380,
    },
    // D3-A: quando maxShadowCasters = 0, l'ombra diventa un'ellisse a terra.
    groundShadow: { mode: 'blob', opacity: 0.45, radiusScale: 1.15 },
    // D6-B: velo di grana sopra il canvas, fuori dalla pipeline WebGL.
    postFx: {
      grain: { mode: 'overlay', opacity: { high: 0.14, medium: 0.12, low: 0.1 }, tileSize: 256, animateHz: 12 },
      vignette: { enabled: true, strength: 0.38 },
    },
  },

  // Cosa esiste davvero in questa build. L'interfaccia legge questi flag e non
  // promette comandi che non funzionano ancora: un'istruzione per una funzione
  // spenta viene mostrata come "in arrivo", non come un comando.
  features: {
    navigation:   { enabled: false, availableInPhase: 3 },
    focusMode:    { enabled: false, availableInPhase: 4 },
    productModal: { enabled: false, availableInPhase: 5 },
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

  // Camera della Fase 1b: posa fissa. La navigazione arriva in Fase 3.
  camera: {
    staticPose: { position: [0, 1.75, 15.5], target: [0, 1.5, -2], fov: 52 },
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
      { id: 'zone-entrance', label: 'Ingresso',     bounds: [[-4, 12], [4, 18]],   accentColor: 'accent.flame',   ambientBoost: 0.15 },
      { id: 'zone-new',      label: 'Nuovi Arrivi', bounds: [[-11, 2], [-2, 12]],  accentColor: 'accent.flame',   ambientBoost: 0.0 },
      { id: 'zone-archive',  label: 'Archivio',     bounds: [[2, 2], [11, 12]],    accentColor: 'accent.flame', ambientBoost: -0.05 },
      { id: 'zone-lookbook', label: 'Lookbook',     bounds: [[-6, -16], [6, -6]],  accentColor: 'accent.bone',    ambientBoost: 0.1 },
    ],
    entrance: { waypointId: 'wp-entrance', lookAtWaypointId: 'wp-hall-01' },
    fog: { enabled: true, color: '#060606', near: 26, far: 72 },
  },

  lighting: {
    ambient:    { intensity: 0.95, color: '#8d9298' },
    hemisphere: { skyColor: '#343840', groundColor: '#0d0d0f', intensity: 0.6 },
    // Ordinati per `priority`: il tier taglia dalla coda oltre maxShadowCasters.
    spots: [
      { id: 'spot-hall-studio', priority: 1, kind: 'studio', zoneId: 'zone-new',
        position: [-5.5, 3.9, 6.0], targetPosition: [-5.5, 0, 4.0],
        angle: 0.5, penumbra: 0.65, intensity: 420, distance: 26, decay: 1.4,
        color: '#fff1e2', castShadow: true },
      { id: 'spot-hall-flame',  priority: 2, kind: 'flame', zoneId: 'zone-archive',
        position: [5.5, 3.9, 6.0], targetPosition: [5.5, 0, 4.0],
        angle: 0.52, penumbra: 0.8, intensity: 360, distance: 26, decay: 1.4,
        color: '#ffa04a', castShadow: true },
      { id: 'spot-entrance',    priority: 3, kind: 'flame', zoneId: 'zone-entrance',
        position: [0, 4.0, 13.0], targetPosition: [0, 0, 9.5],
        angle: 0.62, penumbra: 0.9, intensity: 150, distance: 18, decay: 1.6,
        color: '#f98e30', castShadow: false },
      { id: 'spot-deep',        priority: 4, kind: 'studio', zoneId: 'zone-lookbook',
        position: [0, 3.8, -12.0], targetPosition: [0, 1.4, -17.5],
        angle: 0.58, penumbra: 0.7, intensity: 400, distance: 24, decay: 1.3,
        color: '#e8edf2', castShadow: false },
      { id: 'spot-wash-w', priority: 5, kind: 'studio', zoneId: 'zone-new',
        position: [-10.5, 4.0, 10.0], targetPosition: [-11.8, 1.6, 0.0],
        angle: 0.95, penumbra: 1.0, intensity: 520, distance: 34, decay: 1.1,
        color: '#c9d2dc', castShadow: false },
      { id: 'spot-wash-e', priority: 6, kind: 'flame', zoneId: 'zone-archive',
        position: [10.5, 4.0, 10.0], targetPosition: [11.8, 1.6, 0.0],
        angle: 0.95, penumbra: 1.0, intensity: 460, distance: 34, decay: 1.1,
        color: '#ffad5e', castShadow: false },
    ],
    materials: {
      'mat-concrete-polished': { color: '#1b1c21', roughness: 0.5, metalness: 0.08, grid: true },
      'mat-plaster-dark':      { color: '#17181d', roughness: 0.9, metalness: 0.0 },
      'mat-ceiling-matte':     { color: '#0a0a0c', roughness: 1.0,  metalness: 0.0 },
      'mat-steel-brushed':     { color: '#8d9298', roughness: 0.32, metalness: 0.95 },
      'mat-mannequin':         { color: '#cfd2d6', roughness: 0.42, metalness: 0.08 },
      'mat-bone-seamless':     { color: '#dcdcd8', roughness: 0.95, metalness: 0.0 },
      'mat-accent-flame':      { color: '#f98e30', roughness: 0.4,  metalness: 0.0, emissive: '#f98e30', emissiveIntensity: 0.6 },
    },
  },

  // TASSATIVO: il player collide SOLO contro questi box, mai contro le mesh visibili.
  colliders: [
    { id: 'col-wall-n',       center: [0, 2.1, -18],    size: [24.4, 4.2, 0.4], rotationY: 0 },
    { id: 'col-wall-e',       center: [12, 2.1, 0],     size: [0.4, 4.2, 36.4], rotationY: 0 },
    { id: 'col-wall-w',       center: [-12, 2.1, 0],    size: [0.4, 4.2, 36.4], rotationY: 0 },
    { id: 'col-wall-s-left',  center: [-6.75, 2.1, 18], size: [10.5, 4.2, 0.4], rotationY: 0 },
    { id: 'col-wall-s-right', center: [6.75, 2.1, 18],  size: [10.5, 4.2, 0.4], rotationY: 0 },
    { id: 'col-disp-mann-01', center: [-6.5, 1.0, 7.0], size: [1.2, 2.0, 1.2],  rotationY: 0.4 },
    { id: 'col-plinth-01',    center: [6.5, 0.5, 7.0],  size: [1.4, 1.0, 1.4],  rotationY: 0 },
  ],

  navigation: {
    player: {
      eyeHeight: 1.65, radius: 0.35,
      walkSpeed: 3.0, sprintMultiplier: 1.6, acceleration: 14, damping: 10,
      lookSensitivity: { desktop: 0.0022, mobileDrag: 0.0045 },
      pitchClamp: [-1.2, 1.2],
      autoMove: { speed: 3.4, arriveRadius: 0.25, turnSpeed: 6.0 },
    },
    walkableAreas: [{ id: 'walk-hall', bounds: [[-11, -17], [11, 17]] }],
    waypoints: [
      { id: 'wp-entrance', position: [0, 0, 15.5],  label: 'Ingresso',      safeForTeleport: true,  lookAt: [0, 1.65, 10] },
      { id: 'wp-hall-01',  position: [0, 0, 10.0],  label: null,            safeForTeleport: false },
      { id: 'wp-new-01',   position: [-6.5, 0, 9.0], label: 'Nuovi Arrivi', safeForTeleport: true,  lookAt: [-6.5, 1.4, 7.0] },
      { id: 'wp-arch-01',  position: [6.5, 0, 9.0],  label: 'Archivio',     safeForTeleport: true,  lookAt: [6.5, 1.1, 7.0] },
      { id: 'wp-hall-02',  position: [0, 0, 0.0],   label: null,            safeForTeleport: false },
      { id: 'wp-look-01',  position: [0, 0, -9.0],  label: 'Lookbook',      safeForTeleport: true,  lookAt: [0, 1.6, -14] },
    ],
    links: [
      ['wp-entrance', 'wp-hall-01'], ['wp-hall-01', 'wp-new-01'], ['wp-hall-01', 'wp-arch-01'],
      ['wp-hall-01', 'wp-hall-02'], ['wp-hall-02', 'wp-look-01'],
      ['wp-new-01', 'wp-hall-02'], ['wp-arch-01', 'wp-hall-02'],
    ],
    quickTravel: [
      { id: 'qt-entrance', waypointId: 'wp-entrance', label: 'Ingresso' },
      { id: 'qt-new',      waypointId: 'wp-new-01',   label: 'Nuovi Arrivi' },
      { id: 'qt-archive',  waypointId: 'wp-arch-01',  label: 'Archivio' },
      { id: 'qt-look',     waypointId: 'wp-look-01',  label: 'Lookbook' },
    ],
  },

  // Espositori e POI sono definiti ma non ancora renderizzati: arrivano in Fase 2 e 4.
  displays: [
    { id: 'disp-mannequin-01', kind: 'mannequin', zoneId: 'zone-new',
      position: [-6.5, 0, 7.0], rotationY: 0.4,
      colliderId: 'col-disp-mann-01', approachWaypointId: 'wp-new-01',
      assetId: 'asset-mannequin-a', materialIds: { body: 'mat-mannequin', base: 'mat-steel-brushed' },
      productIds: ['prod-001'], poiId: 'poi-new-01', spotlightId: 'spot-hall-studio',
      focusCamera: { position: [-6.5, 1.55, 9.2], target: [-6.5, 1.35, 7.0], fov: 42, enterMs: 900, exitMs: 650 } },
    { id: 'disp-plinth-01', kind: 'plinth', zoneId: 'zone-archive',
      position: [6.5, 0, 7.0], rotationY: 0,
      colliderId: 'col-plinth-01', approachWaypointId: 'wp-arch-01',
      assetId: 'asset-plinth-a', materialIds: { body: 'mat-steel-brushed' },
      productIds: ['prod-002', 'prod-003'], poiId: 'poi-arch-01', spotlightId: 'spot-hall-flame',
      focusCamera: { position: [6.5, 1.3, 8.8], target: [6.5, 1.0, 7.0], fov: 38, enterMs: 900, exitMs: 650 } },
  ],

  pois: [
    { id: 'poi-new-01', type: 'display', label: 'Nuovi Arrivi', anchor: [-6.5, 1.9, 7.0],
      proximity: { showRadius: 7.0, activateRadius: 2.6, hideRadius: 9.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per avvicinarti' }, targetDisplayId: 'disp-mannequin-01' },
    { id: 'poi-arch-01', type: 'display', label: 'Archivio', anchor: [6.5, 1.6, 7.0],
      proximity: { showRadius: 7.0, activateRadius: 2.6, hideRadius: 9.0 }, icon: 'tag',
      prompt: { desktop: 'Click per esaminare', mobile: 'Tap per avvicinarti' }, targetDisplayId: 'disp-plinth-01' },
    { id: 'poi-look-01', type: 'lookbook', label: 'Brand Story', anchor: [0, 2.0, -14.0],
      proximity: { showRadius: 9.0, activateRadius: 3.0, hideRadius: 11.0 }, icon: 'book',
      prompt: { desktop: 'Click per aprire', mobile: 'Tap per aprire' }, targetLookbookId: 'lb-001' },
  ],

  products: [
    { id: 'prod-001', sku: 'INT-001', name: 'Heavy Hoodie', category: 'Hoodie', collection: 'DROP 01',
      price: { amount: 189, currency: 'EUR' },
      description: 'Testo segnaposto descrittivo del capo, due o tre righe di copy editoriale.',
      details: ['Cotone pesante segnaposto', 'Vestibilità oversize', 'Made in Florence'],
      sizes: [{ id: 'xs', label: 'XS', available: false }, { id: 's', label: 'S', available: true },
              { id: 'm', label: 'M', available: true }, { id: 'l', label: 'L', available: true },
              { id: 'xl', label: 'XL', available: false }],
      colorways: [{ id: 'cw-black', label: 'Black', swatch: '#0d0d0d' }, { id: 'cw-bone', label: 'Bone', swatch: '#e8e2d4' }],
      media: [{ id: 'm1', ratio: '4:5', label: 'Front', variant: 'product' },
              { id: 'm2', ratio: '4:5', label: 'Back', variant: 'product' },
              { id: 'm3', ratio: '16:9', label: 'Detail', variant: 'editorial' }],
      displayId: 'disp-mannequin-01', lookbookIds: ['lb-001'], badges: ['NEW'] },
    { id: 'prod-002', sku: 'INT-002', name: 'Cargo Pant', category: 'Pants', collection: 'DROP 01',
      price: { amount: 229, currency: 'EUR' },
      description: 'Testo segnaposto descrittivo del capo.',
      details: ['Tessuto tecnico segnaposto', 'Gamba ampia', 'Cordino flame orange'],
      sizes: [{ id: 's', label: 'S', available: true }, { id: 'm', label: 'M', available: true },
              { id: 'l', label: 'L', available: false }],
      colorways: [{ id: 'cw-black', label: 'Black', swatch: '#0d0d0d' }],
      media: [{ id: 'm1', ratio: '4:5', label: 'Front', variant: 'product' },
              { id: 'm2', ratio: '1:1', label: 'Detail', variant: 'editorial' }],
      displayId: 'disp-plinth-01', lookbookIds: ['lb-001'], badges: [] },
    { id: 'prod-003', sku: 'INT-003', name: 'Box Tee', category: 'T-Shirt', collection: 'ARCHIVE',
      price: { amount: 89, currency: 'EUR' },
      description: 'Testo segnaposto descrittivo del capo.',
      details: ['Jersey pesante segnaposto', 'Spalla scesa'],
      sizes: [{ id: 'm', label: 'M', available: true }, { id: 'l', label: 'L', available: true }],
      colorways: [{ id: 'cw-bone', label: 'Bone', swatch: '#e8e2d4' }],
      media: [{ id: 'm1', ratio: '1:1', label: 'Front', variant: 'product' }],
      displayId: 'disp-plinth-01', lookbookIds: [], badges: ['ARCHIVE'] },
  ],

  lookbook: [
    { id: 'lb-001', title: 'DROP 01', subtitle: 'Placeholder subtitle', zoneId: 'zone-lookbook',
      body: ['Paragrafo segnaposto uno.', 'Paragrafo segnaposto due.'],
      images: [{ id: 'lbi1', ratio: '16:9', label: 'Campaign 01', variant: 'editorial' },
               { id: 'lbi2', ratio: '1:1', label: 'Detail 01', variant: 'editorial' }],
      productIds: ['prod-001'] },
  ],

  assets: {
    registry: {
      'asset-mannequin-a':  { type: 'primitive', primitive: 'capsule', args: [0.28, 1.1, 8, 16] },
      'asset-plinth-a':     { type: 'primitive', primitive: 'box', args: [1.2, 0.9, 1.2] },
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
  },

  copy: {
    onboarding: {
      eyebrow: 'Negozio immersivo · prototipo',
      desktop: {
        heading: 'Navigazione desktop',
        lines: [
          { text: 'WASD o frecce per muoverti',           requires: 'navigation' },
          { text: 'Muovi il mouse per guardarti attorno', requires: 'navigation' },
          { text: 'Click su un espositore per esaminarlo', requires: 'focusMode' },
          { text: 'ESC per liberare il cursore',          requires: 'navigation' },
        ],
        cta: 'Entra',
      },
      mobile: {
        heading: 'Navigazione mobile',
        lines: [
          { text: 'Tap sul pavimento per spostarti',            requires: 'navigation' },
          { text: 'Trascina per orientare la visuale',          requires: 'navigation' },
          { text: 'Tap su un espositore per esaminarlo',        requires: 'focusMode' },
          { text: 'Usa la barra in basso per spostarti subito', requires: 'navigation' },
        ],
        cta: 'Entra',
      },
      loading: 'Caricamento ambiente',
      comingSoon: 'in arrivo · fase',
      phaseNotice: 'Prototipo in costruzione. I comandi segnati "in arrivo" non sono ancora attivi.',
    },
    hud: { menu: 'Menu', close: 'Chiudi', focusExit: 'Esci', youAreHere: 'Sei qui' },
    hints: {
      navigationLocked: 'La navigazione arriva nella Fase 3.',
    },
    menu: {
      title: 'Indice',
      sections: [
        { id: 'sec-zones', label: 'Zone' },
        { id: 'sec-products', label: 'Capi' },
        { id: 'sec-brand', label: 'Brand' },
      ],
    },
    errors: {
      webgl: {
        title: 'WebGL non disponibile',
        body: 'Questo dispositivo o browser non supporta il rendering 3D richiesto.',
        hint: 'Prova con Chrome, Edge, Firefox o Safari aggiornati, con accelerazione hardware attiva.',
      },
    },
    legal: { priceNotice: 'Prezzi e disponibilità sono dati dimostrativi. Nessun acquisto è possibile.' },
  },
}

export default storeConfig
