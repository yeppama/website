/**
 * Allestimento "cantiere" (docs/cantiere/PIANO.md): stanza compatta 10 × 8 × 4 m, cemento,
 * oggetti da cantiere, capi in 3D. Affianca l'allestimento del negozio senza toccarlo: stessa
 * navigazione, Focus, schede e carrello, perché riempie le stesse chiavi di storeConfig.
 *
 * Origine al centro del pavimento, +z verso l'ingresso, metri. Qui stanno solo le parti che
 * cambiano con l'allestimento; il resto (testi, prestazioni, commercio) resta in storeConfig.
 * `build` riceve i capi già collocati (`productsOn`) e l'id del Lookbook.
 */
const A = '/cantiere/'
const W = 10
const D = 8
const H = 4
const HW = W / 2
const HD = D / 2
// Stesso margine invisibile del negozio attorno agli espositori (vedi DISPLAY_CLEARANCE).
const CLEARANCE = 0.2
const guarded = (c) => ({ ...c, size: [c.size[0] + 2 * CLEARANCE, c.size[1], c.size[2] + 2 * CLEARANCE] })

// Dove sta ogni capo in questo allestimento: sostituisce products[].displayId del contenuto.
// Va prima di `build`, perché gli espositori elencano i capi già collocati.
const placement = {
  'prod-001': 'disp-c-rack', 'prod-004': 'disp-c-rack', 'prod-006': 'disp-c-rack', 'prod-005': 'disp-c-rack',
  'prod-002': 'disp-c-chain-01', 'prod-007': 'disp-c-chain-02',
  'prod-003': 'disp-c-table',
}

function build({ productsOn, poiLabel, mainLookbookId }) {
  return {
    performance: { toneMappingExposure: 1.0 },

    camera: {
      defaultShotId: 'shot-c-entrance',
      shots: [
        { id: 'shot-c-entrance', label: 'Ingresso', zoneId: 'zone-c-entrance', position: [0, 1.7, 3.6], target: [0, 1.6, -3], fov: 56 },
        { id: 'shot-c-rack', label: 'Rack', zoneId: 'zone-c-rack', position: [-1.6, 1.55, 0.6], target: [-4.25, 1.3, -0.9], fov: 56 },
        { id: 'shot-c-look', label: 'Lookbook', zoneId: 'zone-c-look', position: [2.2, 1.6, 0.4], target: [4.9, 1.7, 0], fov: 56 },
      ],
      debugPoses: {
        top: { position: [0, 13, 0.1], target: [0, 0, 0], fov: 60 },
        front: { position: [0, 1.8, 3.8], target: [0, 1.4, -4], fov: 70 },
      },
    },

    environment: {
      floor: { size: [W, D], materialId: 'mat-concrete-polished' },
      ceiling: { height: H, materialId: 'mat-ceiling-matte', visible: true },
      // Muri: per la minimappa e le collisioni. Li disegna la stanza del cantiere, con la texture.
      walls: [
        { id: 'wall-c-n', from: [-HW, -HD], to: [HW, -HD], height: H, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-c-wall-n' },
        { id: 'wall-c-s', from: [-HW, HD], to: [HW, HD], height: H, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-c-wall-s' },
        { id: 'wall-c-w', from: [-HW, -HD], to: [-HW, HD], height: H, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-c-wall-w' },
        { id: 'wall-c-e', from: [HW, -HD], to: [HW, HD], height: H, thickness: 0.2, materialId: 'mat-plaster-dark', colliderId: 'col-c-wall-e' },
      ],
      zones: [
        { id: 'zone-c-entrance', label: 'Ingresso', bounds: [[-HW, 2], [HW, HD]], floorLabel: false },
        { id: 'zone-c-rack', label: 'Rack', bounds: [[-HW, -HD], [-2, 2]], floorLabel: false },
        { id: 'zone-c-center', label: 'Cantiere', bounds: [[-2, -HD], [2, 2]], floorLabel: false },
        { id: 'zone-c-look', label: 'Lookbook', bounds: [[2, -HD], [HW, 2]], floorLabel: false },
      ],
      entrance: { waypointId: 'wp-c-entrance', lookAtWaypointId: 'wp-c-neon' },
      architecture: {
        columns: [],
        platforms: [],
        ceilingTracks: [
          { id: 'track-c-w', from: [-3.2, -3], to: [-3.2, 3], materialId: 'mat-steel-dark' },
          { id: 'track-c-c', from: [0, -3], to: [0, 3], materialId: 'mat-steel-dark' },
          { id: 'track-c-e', from: [3.2, -3], to: [3.2, 3], materialId: 'mat-steel-dark' },
        ],
        trackSection: 0.06,
        fixture: { radius: 0.08, length: 0.2, materialId: 'mat-steel-dark' },
      },
      // Niente insegna: il marchio è il neon. Il "pannello" è la parete dei pannelli luminosi:
      // toccarla apre il Lookbook, come la parete del brand nel negozio. Guarda verso −x.
      brandWall: {
        sign: null,
        panel: { lookbookId: mainLookbookId, center: [4.93, 1.75, 0], size: [6.4, 1.1], axis: 'x', materialId: 'mat-sign-panel' },
      },
      fog: { enabled: false, color: '#0e0e0e', near: 12, far: 30 },

      // Tutto ciò che la stanza del cantiere disegna (scene/environment/CantiereRoom.jsx).
      cantiere: {
        palette: { orange: '#f98e30', steel: '#1c1d20', pipe: '#2a2b2e' },
        ceilingTint: '#777777',
        textures: {
          wall: { url: `${A}cemento-parete.webp`, metersPerTile: 4 },
          floor: { url: `${A}cemento-pavimento.webp`, metersPerTile: 3, tint: '#8c8c8c' },
          mesh: { url: `${A}rete-metallica.webp`, metersPerTile: 1.2 },
        },
        // Strati del tubo [sfocatura, opacità, spessore, colore] (null = l'arancione). `layers` con
        // l'alone finto; `bloomLayers` solo il tubo, quando il bagliore lo fa il Bloom vero.
        neon: { text: 'INTO', width: 3.2, height: 1.1, center: [0, 2.35, -3.82],
          layers: [[90, 0.55, 26, null], [40, 0.8, 18, null], [12, 1, 12, '#ffd2a8'], [0, 1, 5, '#fff6ee']],
          bloomLayers: [[30, 0.9, 20, null], [10, 1, 13, null], [0, 1, 9, '#ffd2a8'], [0, 1, 4, '#fff6ee']] },
        // Bloom vero (fase 2, scelta 2 dell'utente): solo sui tier elencati, cioè GPU dedicata.
        // Maschera e sfocatura a `resolutionScale` dello schermo (scene/lighting/SelectiveBloom.jsx).
        bloom: { tiers: ['high'], strength: 1.0, radius: 0.4, threshold: 0, resolutionScale: 0.5 },
        neonLight: { position: [0, 2.3, -3.3], color: '#f98e30', intensity: 6, distance: 6 },
        meshPanel: { center: [0, 2.3, -3.95], size: [4.4, 2.4] },
        posters: [
          { url: `${A}poster-collage-01.webp`, center: [-4.97, 1.75, 2.4], size: [2.6, 1.45], rotationY: Math.PI / 2 },
          { url: `${A}poster-collage-02.webp`, center: [-3.75, 1.6, -3.97], size: [2.2, 1.23], rotationY: 0 },
        ],
        stickerUrl: (name) => `${A}adesivo-${name}.webp`,
        stickers: [
          { name: 'into', center: [2.75, 1.45, -3.96], width: 0.34, rotationZ: 0.12 },
          { name: 'pericolo', center: [3.05, 1.1, -3.96], width: 0.26, rotationZ: -0.1 },
          { name: 'strisce', center: [2.6, 0.95, -3.96], width: 0.3, rotationZ: 0.05 },
          { name: 'zero-uno', center: [-4.96, 0.75, 3.4], width: 0.3, rotationZ: -0.06, rotationY: Math.PI / 2 },
          { name: 'lavori', center: [-4.96, 0.62, 1.4], width: 0.34, rotationZ: 0.08, rotationY: Math.PI / 2 },
          { name: 'freccia', center: [4.96, 0.9, 3.4], width: 0.22, rotationZ: 0, rotationY: -Math.PI / 2 },
          { name: 'attenzione', center: [-2.35, 0.55, -3.96], width: 0.26, rotationZ: -0.14 },
          { name: 'codice', center: [4.96, 2.75, -3.2], width: 0.3, rotationZ: 0.1, rotationY: -Math.PI / 2 },
        ],
        lightboxes: {
          x: 4.93, y: 1.75, zs: [-2.3, 0, 2.3], size: [1.6, 0.9], tint: '#e6e6e6',
          photos: [`${A}cantiere-look-01.webp`, `${A}cantiere-look-02.webp`, `${A}cantiere-look-03.webp`],
        },
        sign: { url: `${A}cartello-cantiere.webp`, center: [3.55, 0.48, -3.72], size: [1.2, 0.67], tilt: -0.18 },
        floorBox: { center: [0, 0.7], size: [2.8, 1.9] },
        cone: [3.6, 2.7],
        // Blocchi sparsi [x, z, rotazione]; quelli del tavolo li disegna l'espositore.
        blocks: { size: [0.39, 0.19, 0.19], color: '#8a8984',
          items: [[3.0, -3.55, 0], [3.42, -3.55, 0], [3.2, -3.55, 1], [-4.5, 2.95, 0], [-4.5, 3.4, 0.3], [1.3, -2.6, 0.7]] },
        chain: { link: 0.07, color: '#5a5148' },
        chains: [
          { from: [1.9, 4, -0.9], length: 1.1 },
          { from: [-2.6, 4, 2.2], length: 0.9 },
        ],
        floorChain: { from: [0.95, -0.55], to: [2.3, 0.9], sag: 0.35 },
        pipes: [
          { from: [-5, 3.72, -1.6], to: [5, 3.72, -1.6], radius: 0.07 },
          { from: [-5, 3.6, 1.4], to: [5, 3.6, 1.4], radius: 0.05 },
          { from: [3.4, 3.8, -4], to: [3.4, 3.8, 4], radius: 0.09 },
        ],
      },
    },

    // Il player collide solo con questi box. Gli oggetti a terra hanno il loro, i pannelli
    // luminosi e i poster stanno nello spessore dei muri.
    colliders: [
      { id: 'col-c-wall-n', center: [0, H / 2, -HD - 0.1], size: [W + 0.4, H, 0.2], rotationY: 0 },
      { id: 'col-c-wall-s', center: [0, H / 2, HD + 0.1], size: [W + 0.4, H, 0.2], rotationY: 0 },
      { id: 'col-c-wall-w', center: [-HW - 0.1, H / 2, 0], size: [0.2, H, D + 0.4], rotationY: 0 },
      { id: 'col-c-wall-e', center: [HW + 0.1, H / 2, 0], size: [0.2, H, D + 0.4], rotationY: 0 },
      guarded({ id: 'col-c-rack', center: [-4.25, 1.0, -0.9], size: [4.0, 2.0, 0.5], rotationY: Math.PI / 2 }),
      guarded({ id: 'col-c-chain-01', center: [-1.7, 1.65, -1.6], size: [0.5, 1.3, 0.35], rotationY: 0.5 }),
      guarded({ id: 'col-c-chain-02', center: [-0.9, 1.85, -2.2], size: [0.5, 1.3, 0.35], rotationY: -0.3 }),
      guarded({ id: 'col-c-table', center: [0, 0.35, 0.7], size: [1.6, 0.7, 0.7], rotationY: 0 }),
      { id: 'col-c-sign', center: [3.3, 0.5, -3.6], size: [1.4, 1.0, 0.6], rotationY: 0 },
      { id: 'col-c-cone', center: [3.6, 0.4, 2.7], size: [0.45, 0.8, 0.45], rotationY: 0 },
      { id: 'col-c-blocks-w', center: [-4.5, 0.3, 3.2], size: [0.6, 0.6, 0.9], rotationY: 0 },
      { id: 'col-c-block', center: [1.3, 0.2, -2.6], size: [0.45, 0.4, 0.45], rotationY: 0 },
    ],

    navigation: {
      walkableAreas: [{ id: 'walk-c', bounds: [[-HW + 0.2, -HD + 0.2], [HW - 0.2, HD - 0.2]] }],
      waypoints: [
        { id: 'wp-c-entrance', position: [0, 0, 3.0], label: 'Ingresso', safeForTeleport: true, lookAt: [0, 1.6, -3] },
        { id: 'wp-c-center', position: [0, 0, 1.9], label: null, safeForTeleport: false },
        { id: 'wp-c-left', position: [-2.2, 0, 1.6], label: null, safeForTeleport: false },
        { id: 'wp-c-rack', position: [-2.9, 0, -0.5], label: 'Rack', safeForTeleport: true, lookAt: [-4.25, 1.3, -0.9] },
        { id: 'wp-c-chains', position: [-1.3, 0, -0.45], label: 'Catene', safeForTeleport: true, lookAt: [-1.3, 1.7, -1.9] },
        { id: 'wp-c-neon', position: [0.8, 0, -1.4], label: 'Neon', safeForTeleport: false },
        { id: 'wp-c-look', position: [3.2, 0, 0], label: 'Lookbook', safeForTeleport: true, lookAt: [4.9, 1.7, 0] },
        { id: 'wp-c-right', position: [2.4, 0, 1.4], label: null, safeForTeleport: false },
      ],
      links: [
        ['wp-c-entrance', 'wp-c-center'], ['wp-c-center', 'wp-c-left'], ['wp-c-left', 'wp-c-rack'],
        ['wp-c-left', 'wp-c-chains'], ['wp-c-rack', 'wp-c-chains'], ['wp-c-chains', 'wp-c-neon'],
        ['wp-c-neon', 'wp-c-look'], ['wp-c-look', 'wp-c-right'], ['wp-c-right', 'wp-c-center'],
      ],
      quickTravel: [
        { id: 'qt-c-entrance', waypointId: 'wp-c-entrance', label: 'Ingresso', zoneId: 'zone-c-entrance' },
        { id: 'qt-c-rack', waypointId: 'wp-c-rack', label: 'Rack', zoneId: 'zone-c-rack' },
        { id: 'qt-c-chains', waypointId: 'wp-c-chains', label: 'Catene', zoneId: 'zone-c-center' },
        { id: 'qt-c-look', waypointId: 'wp-c-look', label: 'Lookbook', zoneId: 'zone-c-look' },
      ],
    },

    displays: [
      // Rack di tubi neri contro la parete sinistra; i capi guardano la sala (+x).
      { id: 'disp-c-rack', kind: 'pipeRack', zoneId: 'zone-c-rack', label: 'Rack',
        position: [-4.25, 0, -0.9], rotationY: Math.PI / 2, length: 3.6, height: 1.95,
        colliderId: 'col-c-rack', approachWaypointId: 'wp-c-rack',
        assetId: 'asset-rack-a', materialIds: { frame: 'mat-pipe-black' },
        productIds: productsOn('disp-c-rack'), poiId: 'poi-c-rack', spotlightId: 'spot-c-rack', groundShadow: false,
        focusCamera: { position: [-1.3, 1.6, -0.9], target: [-4.25, 1.3, -0.9], fov: 50, enterMs: 1100, exitMs: 800 } },
      // Pantaloni appesi a catene dal soffitto.
      { id: 'disp-c-chain-01', kind: 'chain', zoneId: 'zone-c-center', label: 'Catena · 01',
        position: [-1.7, 0, -1.6], rotationY: 0.5, chainTop: H, chainLength: 1.9,
        colliderId: 'col-c-chain-01', approachWaypointId: 'wp-c-chains',
        assetId: 'asset-rack-a', materialIds: { frame: 'mat-chain-steel' },
        productIds: productsOn('disp-c-chain-01'), poiId: 'poi-c-chain-01', spotlightId: 'spot-c-chains', groundShadow: false,
        focusCamera: { position: [-1.45, 1.65, 0.15], target: [-1.7, 1.6, -1.6], fov: 46, enterMs: 1100, exitMs: 800 } },
      { id: 'disp-c-chain-02', kind: 'chain', zoneId: 'zone-c-center', label: 'Catena · 02',
        position: [-0.9, 0, -2.2], rotationY: -0.3, chainTop: H, chainLength: 1.7,
        colliderId: 'col-c-chain-02', approachWaypointId: 'wp-c-chains',
        assetId: 'asset-rack-a', materialIds: { frame: 'mat-chain-steel' },
        productIds: productsOn('disp-c-chain-02'), poiId: 'poi-c-chain-02', spotlightId: 'spot-c-chains', groundShadow: false,
        focusCamera: { position: [-0.4, 1.75, -0.75], target: [-0.9, 1.8, -2.2], fov: 46, enterMs: 1100, exitMs: 800 } },
      // Tavolo di blocchi di cemento con pile di capi piegati, sopra la linea di sicurezza.
      { id: 'disp-c-table', kind: 'blockTable', zoneId: 'zone-c-center', label: 'Tavolo',
        position: [0, 0, 0.7], rotationY: 0,
        colliderId: 'col-c-table', approachWaypointId: 'wp-c-center',
        assetId: 'asset-plinth-a', materialIds: { body: 'mat-cinder-block' },
        productIds: productsOn('disp-c-table'), poiId: 'poi-c-table', spotlightId: 'spot-c-table', groundShadow: true,
        extraStacks: [{ x: -0.42, color: '#0f0f10', layers: 4 }, { x: 0.48, color: '#0f0f10', layers: 2 }],
        focusCamera: { position: [0, 1.45, 2.35], target: [0, 0.75, 0.7], fov: 44, enterMs: 1100, exitMs: 800 } },
    ],

    pois: [
      { id: 'poi-c-rack', type: 'display', label: poiLabel('disp-c-rack', 'Rack'), anchor: [-4.0, 2.3, -0.9],
        proximity: { showRadius: 5.0, activateRadius: 2.4, hideRadius: 6.5 }, icon: 'tag',
        prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-c-rack', approachWaypointId: 'wp-c-rack', floorMarker: [-3.3, -0.9], requires: 'focusMode' },
      { id: 'poi-c-chain-01', type: 'display', label: poiLabel('disp-c-chain-01', 'Catena · 01'), anchor: [-1.7, 2.45, -1.6],
        proximity: { showRadius: 4.5, activateRadius: 1.9, hideRadius: 6.0 }, icon: 'tag',
        prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-c-chain-01', approachWaypointId: 'wp-c-chains', floorMarker: [-1.75, -0.95], requires: 'focusMode' },
      { id: 'poi-c-chain-02', type: 'display', label: poiLabel('disp-c-chain-02', 'Catena · 02'), anchor: [-0.9, 2.65, -2.2],
        proximity: { showRadius: 4.5, activateRadius: 1.9, hideRadius: 6.0 }, icon: 'tag',
        prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-c-chain-02', approachWaypointId: 'wp-c-chains', floorMarker: [-0.75, -1.45], requires: 'focusMode' },
      { id: 'poi-c-table', type: 'display', label: poiLabel('disp-c-table', 'Tavolo'), anchor: [0, 1.5, 0.7],
        proximity: { showRadius: 4.5, activateRadius: 2.2, hideRadius: 6.0 }, icon: 'tag',
        prompt: { desktop: 'Click per esaminare', mobile: 'Tap per esaminare' }, targetDisplayId: 'disp-c-table', approachWaypointId: 'wp-c-center', floorMarker: [1.15, 1.75], requires: 'focusMode' },
      { id: 'poi-c-look', type: 'lookbook', label: 'Brand Story', anchor: [4.55, 2.75, 0],
        proximity: { showRadius: 5.0, activateRadius: 2.2, hideRadius: 6.5 }, icon: 'book',
        prompt: { desktop: 'Click per aprire', mobile: 'Tap per aprire' }, targetLookbookId: mainLookbookId, approachWaypointId: 'wp-c-look', floorMarker: [4.0, 0.9], requires: 'lookbook' },
    ],

    lighting: {
      ambient: { intensity: 0.45, color: '#ffffff' },
      hemisphere: { skyColor: '#ffffff', groundColor: '#2a2a2a', intensity: 0.6 },
      spots: [
        { id: 'spot-c-rack', priority: 1, position: [-3.0, 3.8, -0.9], targetPosition: [-4.25, 1.3, -0.9],
          angle: 0.85, penumbra: 0.7, intensity: 45, distance: 12, decay: 1.5, color: '#fff3e6', castShadow: true },
        { id: 'spot-c-table', priority: 2, position: [0, 3.8, 1.3], targetPosition: [0, 0.7, 0.7],
          angle: 0.5, penumbra: 0.7, intensity: 34, distance: 12, decay: 1.5, color: '#fff3e6', castShadow: true },
        { id: 'spot-c-chains', priority: 3, position: [-1.3, 3.8, -0.6], targetPosition: [-1.3, 1.6, -1.9],
          angle: 0.6, penumbra: 0.8, intensity: 22, distance: 12, decay: 1.5, color: '#fff3e6', castShadow: false },
        { id: 'spot-c-look', priority: 4, position: [3.2, 3.8, 0], targetPosition: [4.9, 1.6, 0],
          angle: 0.95, penumbra: 0.9, intensity: 16, distance: 12, decay: 1.5, color: '#ffffff', castShadow: false },
        { id: 'spot-c-neon', priority: 5, position: [0, 3.8, -2.4], targetPosition: [0, 2.2, -4],
          angle: 0.8, penumbra: 0.8, intensity: 18, distance: 12, decay: 1.5, color: '#ffffff', castShadow: false },
        { id: 'spot-c-front', priority: 6, position: [0, 3.8, 2.4], targetPosition: [0, 1.5, 4],
          angle: 1.0, penumbra: 1, intensity: 10, distance: 12, decay: 1.5, color: '#ffffff', castShadow: false },
      ],
    },

    benchmark: {
      steps: [
        { type: 'place', waypointId: 'wp-c-entrance', label: 'Ingresso' },
        { type: 'hold', ms: 2000, label: 'Ingresso' },
        { type: 'walk', waypointId: 'wp-c-rack', faceAt: [-4.25, 1.3, -0.9], label: 'Rack' },
        { type: 'focus', displayId: 'disp-c-rack', holdMs: 3500, label: 'Focus · rack' },
        { type: 'walk', waypointId: 'wp-c-chains', faceAt: [-1.3, 1.7, -1.9], label: 'Catene' },
        { type: 'focus', displayId: 'disp-c-chain-01', holdMs: 3500, label: 'Focus · catena' },
        { type: 'walk', waypointId: 'wp-c-look', faceAt: [4.9, 1.7, 0], label: 'Lookbook' },
        { type: 'face', point: [0, 2.2, -4], ms: 2500, label: 'Neon' },
        { type: 'walk', waypointId: 'wp-c-entrance', label: 'Ritorno' },
      ],
    },
  }
}

export default { id: 'cantiere', placement, build }
