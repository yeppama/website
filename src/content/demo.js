import into from './into.js'
import media from './demo.media.json' with { type: 'json' }

/**
 * Contenuto della demo "negozio finito" (docs/PIANO-DEMO.md): lo stesso marchio con
 * un catalogo inventato ma credibile, per mostrare al cliente il sito come sarà.
 *
 * Nomi, prezzi, taglie, colori e handle sono gli stessi dei capi di prova già caricati
 * sul negozio Shopify di sviluppo, così carrello e cassa funzionano senza toccarlo.
 * Testi e foto sono inventati: le foto sono generate con l'IA (docs/demo/FOTO.md),
 * nessun capo o immagine di altri marchi. Ogni foto ha la sua cartella in
 * public/media/demo/, preparata da `npm run media:build`.
 */
const photo = (name) => `/media/demo/${name}`
// Foto per il capo 3D: texture scontornata e riquadro del capo, se già preparata.
const garment3d = (name) => (media[name] ? { name, texture: `${photo(name)}-tex.webp`, ...media[name] } : { name })
// Capo in 3D (GLB ridotto, scripts/cantiere/reduce-glb.sh), nel colore della prima variante.
// Lo usa l'allestimento del cantiere; il negozio resta coi capi fotografici.
const glb = (code) => `/cantiere/capi/${code}.glb`

const base = Object.fromEntries(into.products.map((p) => [p.id, p]))

export default {
  id: 'demo',
  brand: into.brand,
  // Negozio Shopify di sviluppo: prezzi e disponibilità veri, cassa vera con pagamento
  // di prova. ?commerce=mock lo sostituisce col negozio finto, ?commerce=off lo spegne.
  commerce: { provider: 'shopify' },
  copy: {
    onboarding: {
      eyebrow: 'Negozio immersivo · anteprima',
      phaseNotice: 'Anteprima con catalogo dimostrativo: capi, testi e foto sono di prova, le foto generate con l\'IA.',
    },
  },
  products: [
    { ...base['prod-001'],
      description: 'Felpa con cappuccio in french terry da 480 g/m², garzata all\'interno. Spalla scesa, corpo ampio e polsini alti: sta larga senza perdere forma. Cordini Flame Orange.',
      details: ['French terry di cotone, 480 g/m²', 'Vestibilità oversize: prendi la tua taglia', 'Cordini in cotone cerato Flame Orange', 'Tinta in capo e prelavata'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', colorwayId: 'cw-black', src: photo('p001-front-black') },
              { id: 'm4', ratio: '4:5', label: 'Fronte', variant: 'product', colorwayId: 'cw-bone', src: photo('p001-front-bone') },
              { id: 'm2', ratio: '4:5', label: 'Retro', variant: 'product', colorwayId: 'cw-black', src: photo('p001-back-black') },
              { id: 'm3', ratio: '16:9', label: 'Dettaglio', variant: 'editorial', src: photo('p001-detail') }],
      model3d: { ...garment3d('p001-front-black'), glb: glb('p001'), byColorway: { 'cw-bone': garment3d('p001-front-bone') } } },
    { ...base['prod-002'],
      description: 'Cargo in ripstop di cotone e nylon, gamba ampia e dritta, tasconi laterali a soffietto. Coulisse in vita con cordino Flame Orange, orli regolabili con stopper.',
      details: ['Ripstop 60% cotone, 40% nylon', 'Gamba ampia, cavallo basso', 'Sei tasche, due a soffietto', 'Coulisse e orli regolabili'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p002-front') },
              { id: 'm2', ratio: '1:1', label: 'Dettaglio', variant: 'editorial', src: photo('p002-detail') }],
      model3d: { ...garment3d('p002-front'), glb: glb('p002') } },
    { ...base['prod-003'],
      description: 'T-shirt dal taglio squadrato in jersey pesante da 260 g/m². Corta in vita, larga di spalle, collo a costina compatta.',
      details: ['Jersey di cotone, 260 g/m²', 'Taglio boxy, lunghezza corta', 'Collo a costina alto 2 cm'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p003-front') }],
      model3d: { ...garment3d('p003-front'), glb: glb('p003') } },
    { ...base['prod-004'],
      description: 'Giacca da lavoro in canvas di cotone da 12 oz, taglio boxy, bottoni in metallo. Quattro tasche applicate, interno sfoderato con cuciture ribattute.',
      details: ['Canvas di cotone, 12 oz', 'Taglio boxy, spalla dritta', 'Quattro tasche applicate', 'Bottoni in ottone brunito'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p004-front') },
              { id: 'm2', ratio: '1:1', label: 'Dettaglio', variant: 'editorial', src: photo('p004-detail') }],
      model3d: { ...garment3d('p004-front'), glb: glb('p004') } },
    { ...base['prod-005'],
      description: 'T-shirt in jersey con l\'ellisse del marchio stampata in Flame Orange sul petto. Stampa ad acqua: morbida al tatto, non si crepa coi lavaggi.',
      details: ['Jersey di cotone, 200 g/m²', 'Vestibilità regolare', 'Stampa ad acqua sul petto'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p005-front') }],
      model3d: { ...garment3d('p005-front'), glb: glb('p005') } },
    { ...base['prod-006'],
      description: 'Maglia a manica lunga in jersey pesante, spalla scesa, polsini a costina lunghi da arricciare sul polso.',
      details: ['Jersey di cotone, 240 g/m²', 'Spalla scesa', 'Polsini a costina da 12 cm'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p006-front') }],
      model3d: { ...garment3d('p006-front'), glb: glb('p006') } },
    { ...base['prod-007'],
      description: 'Pantalone da tuta in nylon tecnico leggero con fodera in rete. Bande laterali e cordino in vita Flame Orange, zip alle caviglie.',
      details: ['Nylon tecnico, fodera in rete', 'Gamba dritta e morbida', 'Zip alle caviglie', 'Bande laterali Flame Orange'],
      media: [{ id: 'm1', ratio: '4:5', label: 'Fronte', variant: 'product', src: photo('p007-front') },
              { id: 'm2', ratio: '1:1', label: 'Dettaglio', variant: 'editorial', src: photo('p007-detail') }],
      model3d: { ...garment3d('p007-front'), glb: glb('p007') } },
  ],
  lookbook: [
    { ...into.lookbook[0],
      subtitle: 'Oltrarno, dopo la chiusura',
      body: [
        'DROP 01 nasce di notte, quando le botteghe di Oltrarno abbassano le serrande e la città resta a chi la cammina. Capi pesanti, colori che non chiedono attenzione, un solo dettaglio acceso.',
        'Cotone garzato, canvas da lavoro, nylon tecnico: materiali scelti per durare più di una stagione. Il Flame Orange sta dove serve, in un cordino o in una cucitura.',
      ],
      images: [{ id: 'lbi1', ratio: '16:9', label: 'Campagna 01', variant: 'editorial', src: photo('lb-campaign-01') },
               { id: 'lbi2', ratio: '4:5', label: 'Look 01', variant: 'editorial', src: photo('lb-look-01') },
               { id: 'lbi3', ratio: '1:1', label: 'Dettaglio 01', variant: 'editorial', src: photo('lb-detail-01') },
               { id: 'lbi4', ratio: '16:9', label: 'Campagna 02', variant: 'editorial', src: photo('lb-campaign-02') },
               { id: 'lbi5', ratio: '4:5', label: 'Look 02', variant: 'editorial', src: photo('lb-look-02') }] },
  ],
}
