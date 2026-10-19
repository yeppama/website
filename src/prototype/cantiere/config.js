/**
 * Prova dell'allestimento "cantiere" (docs/cantiere/PIANO.md): stanza compatta 10 × 8 × 4 m.
 * Pagina separata dal sito: serve a vedere la direzione estetica e come girano i capi in 3D
 * prima di portare l'allestimento nel negozio vero (navigazione, Focus, schede, carrello).
 * Unità in metri, origine al centro del pavimento, +z verso l'ingresso.
 */
const A = '/cantiere/'

export const cantiere = {
  room: { width: 10, depth: 8, height: 4 },
  palette: {
    concreteDark: '#1a1a1a',
    concreteGrey: '#7a7a7a',
    orange: '#f98e30',          // arancione del marchio (scelta dell'utente, 2026-10-18)
    white: '#ffffff',
    steel: '#1c1d20',
  },
  textures: {
    wall: { url: `${A}cemento-parete.webp`, metersPerTile: 4 },
    floor: { url: `${A}cemento-pavimento.webp`, metersPerTile: 3, tint: '#8c8c8c' },
    mesh: { url: `${A}rete-metallica.webp`, metersPerTile: 1.2 },
  },
  neon: { text: 'INTO', width: 3.2, height: 1.1, center: [0, 2.35, -3.82], glow: 1.0 },
  meshPanel: { center: [0, 2.3, -3.95], size: [4.4, 2.4] },
  posters: [
    { url: `${A}poster-collage-01.webp`, center: [-4.97, 1.75, 1.9], size: [2.9, 1.62], rotationY: Math.PI / 2 },
    { url: `${A}poster-collage-02.webp`, center: [-3.75, 1.6, -3.97], size: [2.2, 1.23], rotationY: 0 },
  ],
  stickers: [
    { name: 'into', center: [2.75, 1.45, -3.96], width: 0.34, rotationZ: 0.12 },
    { name: 'pericolo', center: [3.05, 1.1, -3.96], width: 0.26, rotationZ: -0.1 },
    { name: 'strisce', center: [2.6, 0.95, -3.96], width: 0.3, rotationZ: 0.05 },
    { name: 'zero-uno', center: [-4.96, 0.75, 3.1], width: 0.3, rotationZ: -0.06, rotationY: Math.PI / 2 },
    { name: 'lavori', center: [-4.96, 0.62, 0.35], width: 0.34, rotationZ: 0.08, rotationY: Math.PI / 2 },
    { name: 'freccia', center: [4.96, 0.9, 3.4], width: 0.22, rotationZ: 0, rotationY: -Math.PI / 2 },
    { name: 'attenzione', center: [-2.35, 0.55, -3.96], width: 0.26, rotationZ: -0.14 },
    { name: 'codice', center: [4.96, 2.75, -3.2], width: 0.3, rotationZ: 0.1, rotationY: -Math.PI / 2 },
  ],
  lightboxes: {
    x: 4.93, y: 1.75, zs: [-2.3, 0, 2.3], size: [1.6, 0.9],
    photos: [`${A}cantiere-look-01.webp`, `${A}cantiere-look-02.webp`, `${A}cantiere-look-03.webp`],
  },
  sign: { url: `${A}cartello-cantiere.webp`, center: [3.55, 0.48, -3.72], size: [1.2, 0.67], tilt: -0.18 },
  // Rack di tubi neri contro la parete sinistra; i capi guardano verso la sala (+x).
  rack: {
    x: -4.25, zFrom: -2.8, zTo: 1.0, height: 1.95,
    garments: [
      { model: `${A}capi/p001.glb`, height: 0.72 },
      { model: `${A}capi/p004.glb`, height: 0.72 },
      { model: `${A}capi/p006.glb`, height: 0.74 },
      { model: `${A}capi/p005.glb`, height: 0.7 },
      { model: `${A}capi/p003.glb`, height: 0.68 },
    ],
  },
  // Tavolo di blocchi di cemento al centro, sopra la linea di sicurezza a terra.
  table: {
    center: [0, 0, 0.3], plate: [1.6, 0.04, 0.7],
    // Pile di capi piegati (forme semplici nei colori del catalogo): un capo 3D sdraiato
    // sembra gonfio, perché il modello nasce dal capo indossato.
    stacks: [
      { offset: [-0.4, 0], color: '#0f0f10', layers: 4 },
      { offset: [0.05, 0.02], color: '#e6e0d2', layers: 3 },
      { offset: [0.48, -0.02], color: '#0f0f10', layers: 2 },
    ],
  },
  floorBox: { center: [0, 0.3], size: [2.8, 1.9] },
  cone: [1.85, 1.75],
  blocks: [[3.0, -3.55, 0], [3.42, -3.55, 0], [3.2, -3.55, 1], [-4.5, 2.95, 0], [-4.5, 3.4, 0.3], [1.3, -2.6, 0.7]],
  // Catene dal soffitto; due reggono i pantaloni, appesi come in un cantiere.
  chains: [
    { from: [-1.7, 4, -1.6], length: 1.4, garment: { model: `${A}capi/p002.glb`, height: 1.0, rotationY: 0.5 } },
    { from: [-0.9, 4, -2.2], length: 1.2, garment: { model: `${A}capi/p007.glb`, height: 1.0, rotationY: -0.3 } },
    { from: [1.9, 4, -0.9], length: 1.1 },
    { from: [-2.6, 4, 2.2], length: 0.9 },
  ],
  floorChain: { from: [0.95, -0.55], to: [2.3, 0.9], sag: 0.35 },
  pipes: [
    { from: [-5, 3.72, -1.6], to: [5, 3.72, -1.6], radius: 0.07 },
    { from: [-5, 3.6, 1.4], to: [5, 3.6, 1.4], radius: 0.05 },
    { from: [3.4, 3.8, -4], to: [3.4, 3.8, 4], radius: 0.09 },
  ],
  tracks: [
    { from: [-3.2, 3.85, -3], to: [-3.2, 3.85, 3] },
    { from: [0, 3.85, -3], to: [0, 3.85, 3] },
    { from: [3.2, 3.85, -3], to: [3.2, 3.85, 3] },
  ],
  lights: {
    ambient: 0.45,
    hemisphere: { sky: '#ffffff', ground: '#2a2a2a', intensity: 0.6 },
    spots: [
      { position: [-3.0, 3.8, -0.9], target: [-4.25, 1.3, -0.9], intensity: 45, angle: 0.85, penumbra: 0.7, color: '#fff3e6', shadow: true },
      { position: [0, 3.8, 0.9], target: [0, 0.7, 0.3], intensity: 34, angle: 0.5, penumbra: 0.7, color: '#fff3e6', shadow: true },
      { position: [3.2, 3.8, 0], target: [4.9, 1.6, 0], intensity: 16, angle: 0.95, penumbra: 0.9, color: '#ffffff' },
      { position: [0, 3.8, -2.4], target: [0, 2.2, -4], intensity: 18, angle: 0.8, penumbra: 0.8, color: '#ffffff' },
      // Luce sui pantaloni appesi alle catene e lavaggio della parete d'ingresso.
      { position: [-1.3, 3.8, -0.6], target: [-1.3, 1.9, -1.9], intensity: 22, angle: 0.6, penumbra: 0.8, color: '#fff3e6' },
      { position: [0, 3.8, 2.4], target: [0, 1.5, 4], intensity: 10, angle: 1.0, penumbra: 1, color: '#ffffff' },
    ],
    neonLight: { position: [0, 2.3, -3.3], color: '#f98e30', intensity: 6, distance: 6 },
  },
  views: [
    { label: 'Ingresso', position: [0.2, 1.65, 3.7], target: [0, 1.5, -2] },
    { label: 'Rack', position: [-1.6, 1.55, 0.6], target: [-4.25, 1.3, -0.8] },
    { label: 'Lookbook', position: [1.2, 1.6, 0.4], target: [4.9, 1.7, 0] },
    { label: 'Neon', position: [0.3, 1.6, -0.6], target: [0, 2.2, -4] },
    { label: 'Tavolo', position: [0.9, 1.5, 2.0], target: [0, 0.6, 0.3] },
    { label: 'Catene', position: [0.4, 1.6, 0.6], target: [-1.3, 2.0, -1.9] },
    { label: 'Felpa 3D', position: [-2.9, 1.45, -2.42], target: [-4.25, 1.38, -2.42] },
  ],
}
