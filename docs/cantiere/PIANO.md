# Allestimento "cantiere" — piano

Proposto dall'utente il 2026-10-18 (prompt "construction site concept store"), analizzato insieme.
Si parte solo con `Approvato, procedi` e le scelte aperte qui sotto.

## Deciso

- **Affiancare**, non sostituire: il cantiere è un secondo allestimento, scelto come il contenuto
  (stessa navigazione, Focus, schede, carrello). Nulla di quanto fatto finora si perde.
- **Immagini**: le genera l'utente con Gemini dai prompt di `PROMPT-IMMAGINI.md`.
- **Capi in 3D (GLB)**: l'utente vuole vederli girare in questo ambiente.

## Dal prompt: cosa si prende

| Elemento | Verdetto |
|---|---|
| Stanza compatta ~10×8×4 m | sì |
| Cemento, tubi, catene, binari, linea arancione a terra, cono, cartello, blocchi di cemento | sì, forme da codice e istanze |
| 3 pannelli luminosi del Lookbook | sì, con le foto della campagna |
| Poster e adesivi | sì, immagini da Gemini su piani |
| Logo neon su rete | sì, con alone finto; Bloom vero da decidere |
| Capi GLB | sì, vedi prova sotto |
| OrbitControls con distanza limitata | no: si resta in prima persona, il limite lo danno muri e collisioni |
| AO precalcolata | no (serve Blender): ombre finte a terra |
| Numeri di luci del prompt | no: si tarano sulla scena vera |

## Prova di un capo in 3D (2026-10-18)

Felpa nera (`p001`) da **una sola foto** (la foto fronte della demo), Higgsfield SAM 3D, 1 credito.

| | originale | ridotto |
|---|---|---|
| peso | 1,6 MB | **120 KB** |
| triangoli | 25 740 | **3 860** |
| texture | PNG ~1 MB | WebP 1024 px |

Riduzione: `npx @gltf-transform/cli@4 simplify --ratio 0.15 --error 0.01`, poi `resize --width 1024
--height 1024`, poi `webp`. A occhio la versione ridotta è quasi identica (fronte, fianco, retro); resta un
puntino arancione sul retro, da una cucitura della texture. Il modello arriva senza normali: si calcolano
al caricamento. File in `media-sorgenti/cantiere/` (fuori da git).

Conti: 7 capi ≈ 0,85 MB e ≈ 27 000 triangoli, dentro il budget del tier basso (140 000; oggi la scena ne
disegna ~6 700). Da misurare sui telefoni.

Limite: con 1 credito a capo ne servono altri ~6; restano 0,8 crediti (piano gratuito). Alternative: un
piano Higgsfield a pagamento, oppure un altro servizio da foto a 3D (Meshy, Tripo, Hunyuan3D) usando le
foto fronte della demo, più le viste laterali e del retro di `PROMPT-IMMAGINI.md` §D. Il GLB che arriva
passa dalla stessa riduzione.

## Scelte dell'utente (2026-10-18)

1. Arancione del marchio `#F98E30`.
2. Bloom vero solo sui computer con scheda video dedicata; alone finto per tutti gli altri.
3. Modelli 3D con Higgsfield (piano basic, 70 crediti): fatti tutti e 7 i capi (SAM 3D, 1 credito l'uno;
   il cargo al secondo tentativo), ridotti con `scripts/cantiere/reduce-glb.sh` a 80–136 KB l'uno.
4. Primo passo: immagine di prova.
5. Pannelli del Lookbook orizzontali 16:9 (le foto di campagna sono arrivate orizzontali).

## Immagine di prova (2026-10-19)

Pagina separata `prova-cantiere.html` (tolta con la fase 1: il cantiere ora è nel negozio vero). Stanza 10×8×4,
texture di Gemini, neon con alone finto, rete metallica, 2 pareti di poster, adesivi, cartello, 3 pannelli
luminosi, tavolo di blocchi (istanze) con pile di capi piegati, rack di tubi con 5 capi GLB, 2 pantaloni GLB
appesi a catene (anelli in istanza), cono, tubi e binari a soffitto, 6 faretti. Camera che gira attorno
(OrbitControls) con 7 viste preimpostate: è una pagina per guardare, non il negozio.

Misurato in SwiftShader (non vale come misura di velocità): 44–91 draw call e 60–85 mila triangoli
secondo la vista, ombre comprese. Screenshot: `prova-cantiere.jpg`.

Imparato: un capo GLB sdraiato su un tavolo sembra gonfio (il modello nasce dal capo indossato): sul
tavolo pile di capi piegati. Le normali calcolate sul modello ridotto davano un capo a faccette (vertici
divisi sulle cuciture della texture): `toCreasedNormals` a 60° lo rende liscio.

## Fasi

1. **Fatta (2026-10-19, "Approvato, procedi alla fase 1").** Il cantiere è il secondo allestimento del
   negozio: si apre con `?allestimento=cantiere` (o `VITE_LAYOUT=cantiere` nella build); senza, il negozio
   di sempre, invariato. Concordato prima di partire: stessa navigazione del negozio (camminata in prima
   persona, Focus, schede, carrello, minimappa, "Vai a", Indietro, indicatori a terra), niente camera che
   gira attorno; rack, catene e tavolo diventano espositori veri; tutti gli oggetti di scena della prova.
   - `src/layouts/cantiere.js`: stanza, muri, collider, grafo, espositori, POI, luci, inquadrature,
     benchmark, collocazione dei capi (`placement`). `src/layouts/index.js` sceglie l'allestimento;
     `storeConfig` sostituisce solo le parti con coordinate, il resto (testi, giocatore, commercio) è comune.
   - Scena: `scene/environment/CantiereRoom.jsx` (stanza e oggetti di scena), espositori `pipeRack`,
     `chain`, `blockTable` in `scene/displays/`, capo 3D `HangingGarment` (GLB se il contenuto ha
     `model3d.glb`, altrimenti il capo piatto con la foto o la sagoma). Il pannello del Lookbook si tocca
     anche su una parete perpendicolare a x (`panel.axis: 'x'`).
   - Il segnale "pronto" e il riscaldamento della GPU partono dopo il caricamento di texture e GLB:
     l'onboarding copre l'attesa.
   - Spostati rispetto alla prova, per far passare il player: tavolo a z = 0,7 (fra tavolo e catene non
     c'era corridoio), punti di passaggio di rack e catene; pantaloni abbassati a 1,1–2,3 m (erano sopra
     la testa, e l'hotspot ci finiva sopra); blocchi, tubi e catene con materiali propri.
   - Verifiche: `scripts/e2e/e2e-cantiere.mjs` (30), `npm run test:content` controlla le invarianti di
     ogni contenuto in ogni allestimento. Screenshot: `scripts/e2e/shots-cantiere.mjs`.
   - Misurato in SwiftShader (non è velocità): 49–91 draw call, 42–69 mila triangoli secondo la vista.
2. **Fatta (2026-10-19, "Approvato, procedi alla fase 2").** Bloom vero solo sul tier `high`, che è
   già "GPU dedicata riconosciuta" (`DISCRETE_GPU` in `deviceProfile.js`); su `medium` e `low` l'alone
   finto di sempre.
   - `scene/lighting/SelectiveBloom.jsx`: la scena si disegna a schermo come prima (stesso tone mapping,
     stesso antialias); a metà risoluzione si fa una maschera (scena in nero per le occlusioni, poi solo
     gli oggetti sul layer 1), la si sfoca con `UnrealBloomPass` di three e la si somma sopra. Nessuna
     dipendenza nuova (+3 kB gzip nel chunk 3D). Sul layer 1: il neon e i bordi dei 3 pannelli.
   - Col Bloom il neon usa `neon.bloomLayers` (solo il tubo) e l'alone dei pannelli è spento.
     Parametri in `cantiere.bloom` (`tiers`, `strength` 1,0, `radius` 0,4, `resolutionScale` 0,5).
     `&bloom=1|0` con `?perf=1`, `?bench=1` o `?debug=` lo forza per confrontare.
   - Il negozio non ha `cantiere.bloom`: il suo codice di rendering non cambia.
   - Costo misurato in SwiftShader (non è velocità): stessa vista sul neon 84 → 153 draw call, perché
     la maschera ridisegna la scena. Oltre il budget di 120 del tier high scritto per il negozio;
     su una GPU dedicata è da misurare (non eseguito: nel container non c'è).
   - Verifiche: `e2e-cantiere.mjs` 36 (6 nuove: low senza Bloom, high col Bloom, Focus e uscita col
     Bloom, `&bloom=0`, costo). Screenshot `bloom-neon.png`, `bloom-spento-neon.png`.
3. Luci, prestazioni, prova sui telefoni (iPhone, Pixel, Honor): da fare, servono le misure dell'utente.
