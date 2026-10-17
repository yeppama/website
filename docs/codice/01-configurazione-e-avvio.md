# Configurazione e avvio

Questo gruppo di file contiene i "dati" del sito e il punto in cui il sito si accende. `storeConfig.js` è il magazzino di tutti i contenuti (prodotti, prezzi, testi, posizioni, luci), `designTokens.js` raccoglie colori e caratteri, `validateStoreConfig.js` controlla che i dati siano coerenti fra loro. Gli altri file (`index.html`, `vite.config.js`, `vercel.json`, `main.jsx`, `App.jsx`) sono la pagina vuota che il browser riceve, le istruzioni per costruire e pubblicare il sito, e il "regista" che decide quale schermata mostrare. Nella maggior parte dei casi, per cambiare un contenuto basta toccare `storeConfig.js`.

## `src/config/storeConfig.js` (789 righe)

È l'unica fonte di verità del negozio: ogni coordinata, colore, prezzo, frase e regola sta qui, e i componenti la leggono. Lo usano praticamente tutti i file della scena 3D e dell'interfaccia, più gli script di test e di controllo del catalogo. È sicuro cambiare testi, prezzi, colori, intensità delle luci, tempi e soglie; bisogna invece fare attenzione agli `id` (sono "nomi di riferimento" usati per collegare i pezzi fra loro: se ne cambi uno, va cambiato ovunque compare) e alle posizioni di muri, collider e waypoint, che il validatore controlla con le invarianti I1–I25. Unità: metri; l'asse Y va verso l'alto; gli angoli sono in radianti (3,14 = mezzo giro).

**r. 1–10** `/** storeConfig.js — il "CMS locale". ...` — Commento iniziale (tutto ciò che sta fra `/**` e `*/` è una nota per chi legge, il computer la ignora). Spiega la regola del progetto: niente contenuti dentro i componenti, tutto qui, collegato per ID. Ricorda le unità: metri, Y in alto, rotazioni in radianti. La riga 10 è vuota.

**r. 11–13** `const COLUMN_GRID = { xs: [-9, 9], zs: [12, 4, -4, -12], ...` — `const` crea un valore con un nome, che poi non cambia. Qui si dichiara la griglia delle colonne di cemento: due file (a x = −9 e x = +9) per quattro posizioni in profondità (z = 12, 4, −4, −12), e ogni colonna è larga 0,7 m, alta 4,2 m, profonda 0,7 m. Da questa griglia nascono sia le colonne visibili sia i loro collider. Se aggiungi un valore a `zs` compare un'altra coppia di colonne, ma il validatore controllerà che non tagli i percorsi (I16) e che nessun waypoint ci cada dentro (I9).

**r. 14–16** `const AISLE_X = 10.35` — I due corridoi laterali percorribili, fra le colonne e le pareti: stanno a 10,35 m dal centro, a destra e a sinistra, e hanno punti di passaggio alle profondità 16, 8, 0, −8, −16. Spostarli può rendere i percorsi non validi (il validatore lo segnala).

**r. 17** `const aisleId = (side, z) => ...` — Una piccola funzione (una "ricetta" che riceve dei dati e restituisce un risultato) che costruisce il nome di un punto di corridoio, ad esempio `wp-aisle-w-p8` (lato ovest, z = +8) o `wp-aisle-e-m16`. Altri punti del file usano questi nomi (es. l'espositore rack si avvicina da `wp-aisle-w-p8`): se cambi la regola dei nomi, quei riferimenti si rompono.

**r. 18–20** `const AISLE_WAYPOINTS = ['w', 'e'].flatMap(...)` — Genera in automatico i 10 waypoint dei corridoi (5 per lato). Un waypoint è un punto del pavimento usato dal navigatore per calcolare i percorsi. Questi non hanno etichetta e non sono destinazioni sicure per il teletrasporto (`safeForTeleport: false`).

**r. 21–29** `const AISLE_LINKS = ['w', 'e'].flatMap((side) => [ ...` — Genera i collegamenti fra i waypoint dei corridoi: una catena da un punto al successivo lungo ogni corridoio, più quattro raccordi con i punti centrali (ingresso, Nuovi Arrivi o Archivio, centro sala, Lookbook). Un collegamento è un tratto che il player può percorrere in linea retta; il validatore controlla che nessuno attraversi un ostacolo (I16).

**r. 30–38** `const COLUMNS = COLUMN_GRID.xs.flatMap(...)` — Trasforma la griglia della riga 13 in un elenco di 8 colonne, ognuna con un nome (`col-w-p12` ecc.), posizione, misure, materiale `mat-concrete-raw` (cemento grezzo), il nome del suo collider e l'ombra a terra attiva. La riga 30 è vuota. Il materiale si può cambiare con un altro nome presente in `lighting.materials`.

**r. 39–40** `export const storeConfig = {` — Inizia l'oggetto principale. `export` vuol dire "rendi disponibile agli altri file": è così che i componenti possono leggerlo con `import`. Le parentesi graffe `{ }` racchiudono un "oggetto", cioè un insieme di voci nome: valore.

**r. 41–42** `meta: { schemaVersion: '1.0.0',` — Sezione dei dati generali. `schemaVersion` è il numero di versione della struttura di questo file; oggi nessun componente lo legge, serve come promemoria.

**r. 43–47** `brand: { id: 'into-industries', name: 'INTO industries', ...` — Identità del marchio: nome completo, parola principale del logo tipografico (`INTO`) e descrittore (`industries`, mostrato fra parentesi). Cambiando `wordmark` o `descriptor` cambia la scritta sulla parete del brand e nelle schermate.

**r. 48** `origin: { city: 'Florence', country: 'Italy', coords: ... }` — Città, paese e coordinate mostrati come "firma" nell'onboarding, nel menu, nella Brand Story e nella pagina di errore. Testo libero, modificabile.

**r. 49** `credit: 'Curated and produced by Tommaso Inturrisi'` — La riga di credito mostrata in onboarding, menu e Lookbook. Testo libero.

**r. 50** `tagline: "We're just looking for somewhere"` — Lo slogan, oggi visibile come titolo nella Brand Story. Il commento ricorda che va confermato dal cliente (punto aperto P3).

**r. 51** `currency: 'EUR'` — La valuta del marchio.

**r. 52–53** `locale: 'it-IT'` — La lingua/paese per formattare prezzi e numeri: con `it-IT` un prezzo appare come "189 €". Con `en-GB` apparirebbe "€189". Deve essere un codice valido, altrimenti il validatore (I22) dà errore.

**r. 54** `logo: { assetId: 'asset-logo-primary', shape: 'oval', o ...` — Collega il logo alla voce `asset-logo-primary` del registro degli asset (in fondo al file); l'id deve esistere lì.

**r. 55–57** `units: 'meters',` — Chiude `brand`, dichiara che le misure sono in metri (informativo, non letto dal codice) e chiude `meta`.

**r. 58–60** `performance: { targetFps: 60,` — Inizia la sezione prestazioni (la riga 58 è vuota). `targetFps` è il tetto di immagini al secondo: se cambi 60 in 30 il sito disegna al massimo 30 immagini al secondo, consuma meno batteria ma il movimento è meno fluido.

**r. 61** `toneMappingExposure: 0.85` — L'"esposizione" della scena, come su una macchina fotografica: un numero più alto schiarisce tutto, più basso scurisce. Attenzione al nero dei capi: alzandolo troppo diventa grigio.

**r. 62–66** `tiers: { high: { dprRange: [1, 2], maxShadowCasters: 2, ...` — Tre livelli di qualità scelti in base al dispositivo (high = GPU dedicata, medium = integrata, low = telefoni economici). Per ciascuno: la nitidezza (`dprRange`, quanti pixel reali per pixel dello schermo), quanti faretti proiettano ombre vere, la risoluzione delle ombre e l'antialiasing (bordi smussati). `envMapResolution` oggi non è letto dal codice. Aumentare i valori del livello low può rallentare i telefoni economici.

**r. 67–69** `monitor: { windowMs: 5000, publishHz: 2 }` — Impostazioni dell'HUD prestazioni (`?perf=1`): calcola le statistiche sugli ultimi 5 secondi e aggiorna i numeri 2 volte al secondo.

**r. 70–74** `budgets: { drawCalls: ..., triangles: ..., initialJsGzi ...` — I limiti di "costo" che il progetto si è dato (quante chiamate di disegno, quanti triangoli, quanto JavaScript iniziale). Sono letti solo da un test automatico (`e2e-phase4.mjs`), non cambiano il sito.

**r. 75–76** `groundShadow: { mode: 'blob', opacity: 0.45, radiusScal ...` — Le ombre "finte" a forma di ellisse sotto gli oggetti, usate quando un livello non ha ombre vere. `opacity` è quanto è scura (0 invisibile, 1 nera), `radiusScale` quanto è più larga dell'oggetto.

**r. 77–84** `postFx: { // blend 'alpha' (scelta dell'utente, ...` — Inizia la sezione degli effetti sopra l'immagine 3D; i commenti spiegano perché la grana usa la fusione `alpha` (l'altra, `overlay`, costava circa 20 fps su un portatile) e perché nel livello low la grana è spenta.

**r. 85–86** `grain: { mode: 'overlay', blend: 'alpha', opacity: {... ...` — La grana tipo pellicola. `blend` sceglie la fusione; con `alpha` contano i valori di `alphaOpacity` (0,2 / 0,18 / 0 per high / medium / low), con `overlay` quelli di `opacity`. `tileSize` è la misura della tessera di rumore in pixel, `animateHz` quante volte al secondo la grana si muove. Il campo `mode` non è letto dal codice. Mettere 0 in un livello spegne la grana su quel livello.

**r. 87–89** `vignette: { enabled: true, strength: 0.38 },` — La vignettatura (bordi dello schermo più scuri): `strength` più alto = bordi più scuri. Le righe 88–89 chiudono `postFx` e `performance`.

**r. 90–94** `features: {` — Riga vuota, commento e inizio dei "feature flag": interruttori che dicono cosa esiste davvero nel sito. L'interfaccia li legge e, per una funzione spenta, scrive "in arrivo" invece di mostrare un comando che non funziona.

**r. 95–98** `navigation: { enabled: true, availableInPhase: 3 },` — Navigazione, Focus Mode, scheda prodotto e Lookbook: tutti accesi. Mettere `enabled: false` a una voce la nasconde o la disattiva nell'interfaccia; `availableInPhase` è il numero di fase mostrato nel messaggio "in arrivo".

**r. 99–101** `checkout: { enabled: false, availableInPhase: 8 },` — L'acquisto diretto dalla scheda è spento: il bottone c'è ma è disabilitato e lo dichiara. Chiude `features`.

**r. 102–107** `benchmark: {` — Riga vuota, commento e inizio del percorso di prova delle prestazioni (`?bench=1`): sempre la stessa traiettoria di circa 40 secondi, così si possono confrontare dispositivi diversi.

**r. 108–110** `warmupMs: 2500, stepTimeoutMs: 30000, suggestedRuns: 3,` — Attesa iniziale di 2,5 s prima di misurare, massimo 30 s per ogni passo prima di dichiararlo fallito, e 3 ripetizioni consigliate (`suggestedRuns` è un promemoria, non letto dal codice).

**r. 111–122** `steps: [ { type: 'place', waypointId: 'wp-entrance', .. ...` — I passi del percorso: posa all'ingresso, sosta, camminata verso Nuovi Arrivi, Focus sul manichino, camminata all'Archivio, Focus sul plinto, Lookbook, due rotazioni dello sguardo, ritorno. Gli `id` di waypoint ed espositori devono esistere; le `label` sono i nomi dei tratti nel resoconto. Cambiare il percorso rende le nuove misure non confrontabili con quelle vecchie in `docs/PERF.md`.

**r. 123** `},` — Chiude `benchmark`.

**r. 124–129** `commerce: {` — Riga vuota, commento e inizio della sezione commercio. Il commento spiega che prezzi, varianti e giacenze reali vengono da Shopify; qui stanno solo il collegamento e le regole.

**r. 130** `provider: 'off',` — Chi gestisce gli acquisti: `'off'` (nessuno), `'mock'` (negozio di prova senza pagamenti), `'shopify'` (negozio vero). Oggi è spento; si può forzare per le prove con `?commerce=mock` o `?commerce=shopify` nell'indirizzo. Altri valori sono rifiutati dal validatore (I24).

**r. 131** `country: 'IT',` — Il paese per cui Shopify calcola prezzi e disponibilità. Se il negozio non vende in quel paese il catalogo va in "non disponibile".

**r. 132** `maxQuantity: 10,` — Quantità massima di uno stesso capo nel carrello. Deve essere un numero intero almeno 1 (I24).

**r. 133** `cartStorageKey: 'into-cart-id',` — Il nome con cui il browser ricorda il carrello fra una visita e l'altra. Cambiarlo fa "dimenticare" i carrelli già salvati dai visitatori.

**r. 134–139** `mock: { latencyMs: 250, storageKey: ..., checkoutUrl: . ...` — Impostazioni del negozio di prova: risponde con 250 ms di ritardo simulato, salva i carrelli finti sotto `into-mock-carts`, finge la cassa con `#checkout-di-prova`, e usa un testo segnaposto (in HTML, con titoletto ed elenco) per le pagine legali di prova.

**r. 140–144** `policies: [` — Commento e inizio dell'elenco delle pagine legali. I testi non stanno nel codice: li scrive il venditore su Shopify (Impostazioni → Informative) e il sito li legge.

**r. 145–152** `{ id: 'terms-of-sale', field: 'termsOfSale' }, ...` — Le sette pagine legali, ognuna con un id interno e il nome del campo Shopify da cui leggerla. Ogni id deve avere un'etichetta in `copy.legal.policies` (righe 770–778) e ogni campo deve essere uno dei sette che Shopify espone (I25). Il menu mostra solo quelle effettivamente pubblicate.

**r. 153–157** `shopify: {` — Commento e inizio dei dati del negozio Shopify. Oggi è il negozio di SVILUPPO (nessun pagamento reale). Il token qui è quello pubblico, fatto apposta per stare nel sito; quello privato non va mai scritto qui. Le variabili d'ambiente `VITE_SHOPIFY_*` (impostate su Vercel) possono sostituire dominio e token senza toccare il file.

**r. 158** `domain: 'into-industries-dev.myshopify.com',` — L'indirizzo del negozio Shopify. Nella fase 8c diventerà quello del cliente.

**r. 159** `storefrontToken: 'b01d16e3db47daf418b38cf9cef3e240',` — La chiave pubblica per leggere catalogo e carrello. Cambia insieme al dominio; se non corrisponde al negozio, il catalogo risulta "non disponibile".

**r. 160** `apiVersion: '2026-10',` — La versione dell'interfaccia di Shopify usata; supportata fino a ottobre 2027, poi va aggiornata.

**r. 161–162** `testMode: true,` — Dichiara che è un negozio di prova: scheda e carrello mostrano l'avviso "solo pagamenti di prova". Da mettere a `false` col negozio vero.

**r. 163–164** `optionNames: { size: ['Taglia', 'Size'], color: ['Color ...` — I nomi delle opzioni su Shopify che il sito riconosce come taglia e colore. Se su Shopify l'opzione si chiama in un altro modo (es. "Misura"), va aggiunto qui, altrimenti le varianti non si collegano.

**r. 165–166** `},` — Chiudono `shopify` e `commerce`.

**r. 167–171** `loading: { stages: [` — Riga vuota, commento e inizio degli stadi della barra di caricamento. Ogni stadio è un passaggio reale, non una misura di byte.

**r. 172–175** `{ id: 'boot', progress: 0.15, label: 'Avvio' }, ...` — I quattro stadi (avvio, motore 3D, contesto WebGL, primo fotogramma) con la quota della barra raggiunta (da 0 a 1) e il nome mostrato. Si possono cambiare `progress` e `label`; gli `id` sono usati da `App.jsx` e dalla scena e non vanno toccati.

**r. 176–177** `], },` — Chiudono l'elenco e la sezione `loading`.

**r. 178–182** `focus: {` — Riga vuota, commento e inizio delle regole del Focus Mode (quando la camera va su un prodotto).

**r. 183–185** `lighting: { spotBoost: 1.15, studioColor: '#f6f3ec', ot ...` — La luce durante il Focus: il faretto dell'espositore sale del 15% e prende il colore `#f6f3ec`, gli altri faretti scendono al 30%, la luce d'ambiente al 60%, il passaggio dura 700 ms. Il commento avverte: aumentare molto `spotBoost` rende il nero grigio.

**r. 186–189** `minHorizontalFov: 34, maxVerticalFov: 72,` — L'angolo di visuale nel Focus: su un telefono in verticale si allarga quanto basta a vedere almeno 34° in orizzontale, senza superare 72° in verticale.

**r. 190** `idleDrift: { amplitude: 0.035, periodSeconds: 9 },` — Il leggero ondeggiare della camera ferma sul prodotto: ampiezza e durata di un ciclo. Mettere 0 lo spegne.

**r. 191–192** `maxClickDistance: 7.5,` — Su desktop, un espositore cliccato col mirino si apre solo entro 7,5 m; oltre compare "Avvicinati per esaminare".

**r. 193–194** `vignetteStrength: 0.55, },` — Quanto si scuriscono i bordi dello schermo durante il Focus. Chiude `focus`.

**r. 195–197** `garments: {` — Riga vuota, commento e inizio dei capi "segnaposto" 3D (forme semplici al posto dei modelli veri).

**r. 198** `shapeByCategory: { Hoodie: 'top', Jacket: 'top', 'T-Shi ...` — Ogni categoria di prodotto diventa una forma: sopra (`top`) o pantalone (`bottom`). Un prodotto con una categoria nuova (es. "Shorts") richiede di aggiungerla qui, altrimenti il validatore dà errore (I20).

**r. 199** `materialId: 'mat-fabric',` — Il materiale "tessuto" usato per i capi; il colore viene dalla variante del prodotto.

**r. 200–201** `cordColor: '#f98e30', },` — Il colore del cordino disegnato su alcuni capi (arancio del brand). Chiude `garments`.

**r. 202–206** `camera: {` — Riga vuota, commenti e inizio delle inquadrature fisse della camera (nate nelle Fasi 1b e 2, prima della navigazione libera).

**r. 207–208** `defaultShotId: 'shot-entrance', transitionMs: 1400,` — L'inquadratura iniziale e la durata del passaggio da una all'altra (1,4 s). Il default deve esistere fra gli `shots` (I17).

**r. 209–220** `shots: [ { id: 'shot-entrance', label: 'Ingresso', ... } ...` — Cinque inquadrature, ognuna con nome, zona, posizione della camera, punto guardato e angolo di visuale (`fov`). La prima fissa la zona iniziale mostrata nell'HUD. La camera non deve cadere dentro un collider (I17).

**r. 221** `idleSway: { enabled: true, amplitude: 0.055, periodSeco ...` — Ondeggiamento lento della camera nelle inquadrature fisse; `enabled: false` lo spegne.

**r. 222–223** `near: 0.1, far: 70,` — La distanza minima e massima che la camera vede (in metri): oggetti più vicini di 10 cm o più lontani di 70 m non vengono disegnati.

**r. 224–230** `debugPoses: { top: ..., front: ... }, },` — Due pose di controllo (vista dall'alto e frontale) attivabili con `?debug=top` o `?debug=front`, servono solo per verifiche. La riga 230 chiude `camera`.

**r. 231–232** `environment: {` — Riga vuota e inizio dell'ambiente: pavimento, soffitto, muri, zone, architettura.

**r. 233–237** `floor: { size: [24, 36], materialId: ..., gridTexture: ...` — Il pavimento: 24 m di larghezza per 36 di profondità, cemento lucido, con una griglia disegnata (celle di 3 m, linee sottili, colore `#3e3f48`). Cambiare `size` senza spostare i muri lascia buchi o sporgenze.

**r. 238** `ceiling: { height: 4.2, materialId: 'mat-ceiling-matte' ...` — Il soffitto: altezza 4,2 m, materiale opaco scuro; `visible: false` lo toglie.

**r. 239–241** `walls: [` — Commento e inizio dei muri: sono solo grafica, la collisione sta nei `colliders` collegati da `colliderId`. La porta d'ingresso è un tratto di muro mancante.

**r. 242–247** `{ id: 'wall-n', from: [-12, -18], to: [ 12, -18], heigh ...` — I cinque muri (nord, est, ovest, e i due pezzi del lato sud ai lati della porta), con punto di inizio e fine sul pavimento, altezza, spessore, materiale e collider. Se sposti un muro, sposta anche il collider corrispondente (righe 359–363), altrimenti si cammina attraverso il muro o si urta l'aria.

**r. 248–253** `zones: [ { id: 'zone-entrance', label: 'Ingresso', boun ...` — Le quattro zone del negozio (Ingresso, Nuovi Arrivi, Archivio, Lookbook) con il rettangolo che le delimita. `label` è il nome mostrato nell'HUD e scritto a terra se `floorLabel: true`. `accentColor` e `ambientBoost` oggi non sono letti dal codice (le scritte a terra usano direttamente l'arancio dei token).

**r. 254–255** `entrance: { waypointId: 'wp-entrance', lookAtWaypointId ...` — L'ingresso: il player parte dal waypoint d'ingresso guardando verso il centro sala.

**r. 256–257** `lintel: { center: [0, 3.65, 18], size: [3.2, 1.1, 0.2] ...` — L'architrave sopra la porta; non ha collider perché è sopra la testa.

**r. 258** `threshold: { center: [0, 0.006, 17.75], ..., materialId ...` — La soglia arancione luminosa a terra sulla porta.

**r. 259–262** `exteriorGlow: { center: [0, 1.6, 18.9], size: [3.4, 3.4 ...` — Il chiarore chiaro oltre la porta, il "mondo studio" del brand; senza, la porta sarebbe un rettangolo nero. `intensity` più alta = più luminoso. Chiude `entrance`.

**r. 263–265** `architecture: { columns: COLUMNS,` — Riga vuota, inizio dell'architettura; le colonne vengono dall'elenco generato alle righe 30–38.

**r. 266–272** `platforms: [ { id: 'plat-new', zoneId: 'zone-new', cent ...` — Le tre pedane chiare sotto le zone espositive, alte 6 cm: si calpestano e non hanno collider. Zona e materiale devono esistere (I18).

**r. 273–281** `ceilingTracks: [ { id: 'track-w', from: [-6.5, 12.5], t ...` — I cinque binari a soffitto da cui "pendono" i faretti, con inizio, fine e materiale. Sono solo grafica.

**r. 282–284** `trackSection: 0.08, fixture: { radius: 0.11, length: 0. ...` — Spessore dei binari (8 cm) e misura dei corpi dei faretti. Chiude `architecture`.

**r. 285–289** `brandWall: {` — Riga vuota, commento e inizio della parete del brand in fondo al negozio. Il commento ricorda che il logo vettoriale non è ancora arrivato (P1): si usa la scritta tipografica.

**r. 290** `sign: { assetId: 'asset-logo-primary', center: [0, 2.95 ...` — L'insegna: posizione, larghezza 5,4 m e colore dell'ellisse. L'asset deve esistere (I18).

**r. 291–292** `panel: { lookbookId: 'lb-001', center: ..., size: [4.8 ...` — Il pannello sotto l'insegna che apre il Lookbook `lb-001` (deve esistere, I18). Chiude `brandWall`.

**r. 293–296** `fog: { enabled: false, color: '#060606', near: 26, far: ...` — La nebbia, spenta per scelta dell'utente; si può vedere in anteprima con `?fog=1`. Se accesa, inizia a 26 m e copre tutto a 72 m. La riga 296 chiude `environment`.

**r. 297–298** `lighting: {` — Riga vuota e inizio delle luci.

**r. 299** `ambient: { intensity: 0.95, color: '#8d9298' },` — Luce diffusa uniforme su tutto. Più alta = scena meno contrastata.

**r. 300** `hemisphere: { skyColor: '#343840', groundColor: '#0d0d0 ...` — Luce "cielo/terra": un colore dall'alto e uno dal basso, per dare volume.

**r. 301–302** `spots: [` — Commento e inizio dei faretti. Sono ordinati per `priority`: nei livelli che permettono ombre vere, solo i primi (fino a `maxShadowCasters`) proiettano ombra.

**r. 303–306** `{ id: 'spot-hall-studio', priority: 1, kind: 'studio' ...` — Faretto principale di Nuovi Arrivi, sui manichini. `position` è dove sta, `targetPosition` dove punta, `angle` l'apertura del cono, `penumbra` quanto è sfumato il bordo, `intensity` la potenza, `distance` e `decay` come si attenua con la distanza, `color` il colore (bianco caldo sui prodotti, per non falsarne il colore). `kind` e `zoneId` sono etichette descrittive, oggi non lette dal codice.

**r. 307–310** `{ id: 'spot-hall-flame', priority: 2, ... color: '#ffe6 ...` — Faretto dell'Archivio sul plinto, bianco caldo, con ombra.

**r. 311–314** `{ id: 'spot-entrance', priority: 3, ... color: '#f98e30 ...` — Faretto arancione sul pavimento dell'ingresso (colore d'atmosfera, non su un prodotto).

**r. 315–318** `{ id: 'spot-deep', priority: 4, ... intensity: 400, ... },` — Faretto che illumina la parete del brand in fondo.

**r. 319–322** `{ id: 'spot-portal', priority: 7, ... },` — Faretto rivolto verso la porta d'ingresso, illumina l'uscita.

**r. 323–326** `{ id: 'spot-rack', priority: 8, ... },` — Faretto sul rack delle magliette (lato ovest).

**r. 327–330** `{ id: 'spot-wall-01', priority: 9, ... },` — Faretto sulla vetrina a parete (lato est).

**r. 331–334** `{ id: 'spot-wash-w', priority: 5, ... color: '#c9d2dc' ...` — Luce radente sulla parete ovest (wall-wash), freddina.

**r. 335–339** `{ id: 'spot-wash-e', priority: 6, ... color: '#ffad5e' ...` — Luce radente sulla parete est, aranciata. Chiude l'elenco dei faretti. Gli id dei faretti usati dagli espositori (`spotlightId`) devono esistere (I19).

**r. 340–349** `materials: { 'mat-concrete-polished': { color: '#1b1c21 ...` — I materiali di superfici e oggetti: colore, `roughness` (0 = lucido a specchio, 1 = opaco) e `metalness` (0 = non metallo, 1 = metallo). `grid: true` disegna la griglia sul pavimento. Cambiare `color` cambia il colore di tutto ciò che usa quel materiale. Gli id sono citati da muri, colonne, pedane, espositori: se ne rinomini uno, il validatore (I11, I18) lo segnala.

**r. 350–351** `'mat-fabric': { color: '#ffffff', roughness: 0.93, meta ...` — Il tessuto dei capi: bianco perché il colore vero arriva dalla variante del prodotto.

**r. 352** `'mat-mannequin-matte': { color: '#d9d6cf', ... },` — Il manichino opaco.

**r. 353** `'mat-accent-flame': { color: '#f98e30', ..., emissive: ...` — Il materiale arancione che "emette" luce propria (usato per la soglia). `emissiveIntensity` più alta = più luminoso.

**r. 354–355** `}, },` — Chiudono `materials` e `lighting`.

**r. 356–358** `colliders: [` — Riga vuota, commento e inizio dei collider: le scatole invisibili contro cui il player si ferma. Regola del progetto: le collisioni avvengono solo contro queste, mai contro gli oggetti visibili.

**r. 359–363** `{ id: 'col-wall-n', center: [0, 2.1, -18], size: [24.4 ...` — I collider dei cinque muri: centro, misure (larghezza, altezza, profondità) e rotazione. Devono combaciare con i muri delle righe 242–247.

**r. 364–367** `{ id: 'col-disp-mann-01', center: [-7.7, 1.0, 6.6], siz ...` — I collider dei due manichini, del rack e della vetrina a parete, ruotati come i loro espositori. Se sposti un espositore (righe 428–458) sposta anche il suo collider.

**r. 368** `...COLUMNS.map((c) => ({ id: c.colliderId, ... }))` — Aggiunge in automatico un collider per ogni colonna generata dalla griglia (i tre puntini `...` "versano" un elenco dentro un altro).

**r. 369–370** `{ id: 'col-plinth-01', center: [6.5, 0.6, 7.0], size: [ ...` — Collider del plinto dell'Archivio. Chiude l'elenco.

**r. 371–373** `navigation: { player: {` — Riga vuota, inizio della navigazione e delle caratteristiche del player (il visitatore).

**r. 374** `eyeHeight: 1.65, radius: 0.35,` — Altezza degli occhi (1,65 m) e "ingombro" del visitatore (cerchio di 35 cm). Un raggio più grande lo fa fermare più lontano dagli ostacoli e può rendere invalidi alcuni percorsi (I9, I16).

**r. 375** `walkSpeed: 3.0, sprintMultiplier: 1.6, acceleration: 14 ...` — Velocità di camminata (3 m/s), quanto più veloce si va tenendo Shift (×1,6), quanto in fretta si accelera e si frena.

**r. 376** `lookSensitivity: { desktop: 0.0022, mobileDrag: 0.0045 },` — Quanto gira lo sguardo muovendo il mouse o trascinando il dito. Valori più alti = rotazione più rapida.

**r. 377** `pitchClamp: [-1.2, 1.2],` — Quanto si può guardare in basso e in alto (circa ±69°).

**r. 378–380** `fov: { vertical: 60, minHorizontal: 50, maxVertical: 85 },` — Angolo di visuale del player: 60° in verticale, allargato su schermi stretti per garantire almeno 50° in orizzontale, mai oltre 85°.

**r. 381** `autoMove: { speed: 3.4, arriveRadius: 0.25, turnSpeed: ...` — Camminata automatica dopo un tap o un "Vai a": velocità, a quanti cm dalla meta si considera arrivato, velocità di rotazione.

**r. 382–383** `}, walkableAreas: [{ id: 'walk-hall', bounds: [[-11, -1 ...` — Chiude `player` e definisce il rettangolo calpestabile del negozio. Ogni waypoint deve starci dentro (I10).

**r. 384–388** `input: { tapMaxMovePx: 10, tapMaxMs: 350,` — Su touch, un tocco conta come "tap" (vai lì) se il dito si muove meno di 10 pixel e dura meno di 350 ms; altrimenti è un trascinamento (guarda attorno).

**r. 389–394** `maxStepDt: 0.05, maxCatchUp: 0.25, },` — Come si recupera il tempo quando un fotogramma arriva in ritardo: a passi di massimo 0,05 s, fino a 0,25 s; oltre si accetta il rallentatore invece di un salto. Chiude `input`.

**r. 395** `teleport: { fadeMs: 220 },` — Durata della dissolvenza al nero del teletrasporto ("Vai a").

**r. 396** `hotspot: { color: '#f98e30', width: 0.9, bob: 0.06, bob ...` — I segni sopra gli espositori: colore, larghezza, quanto e quanto lentamente fluttuano, e il raggio entro cui un tap li "prende".

**r. 397** `feedback: { pingMs: 650, pathColor: '#f98e30' },` — Durata dell'anello che appare dove si tocca e colore della linea del percorso.

**r. 398–399** `waypoints: [ { id: 'wp-entrance', position: [0, 0, 15.5 ...` — Inizio dei punti di navigazione; il primo è l'ingresso, destinazione sicura per il teletrasporto e con `lookAt`, il punto verso cui guardare all'arrivo.

**r. 400** `{ id: 'wp-hall-01', position: [0, 0, 10.0], label: null ...` — Punto di passaggio a centro sala, senza nome.

**r. 401** `{ id: 'wp-new-01', position: [-6.5, 0, 9.0], label: 'Nu ...` — Punto davanti a Nuovi Arrivi.

**r. 402** `{ id: 'wp-arch-01', position: [6.5, 0, 9.0], label: 'Ar ...` — Punto davanti all'Archivio.

**r. 403** `{ id: 'wp-hall-02', position: [0, 0, 0.0], label: null ...` — Centro del negozio.

**r. 404** `{ id: 'wp-look-01', position: [0, 0, -9.0], label: 'Loo ...` — Punto davanti alla zona Lookbook.

**r. 405–406** `...AISLE_WAYPOINTS, ],` — Aggiunge i 10 punti dei corridoi generati alle righe 18–20 e chiude l'elenco. Nessun waypoint può cadere dentro un collider (I9).

**r. 407–415** `links: [ ['wp-entrance', 'wp-hall-01'], ... ...AISLE_LI ...` — I collegamenti percorribili fra waypoint, più quelli dei corridoi. Il commento spiega che due diagonali sono state tolte perché attraversavano il plinto. Tutto il grafo deve restare collegato (I7) e nessun tratto può attraversare un collider (I16).

**r. 416–421** `quickTravel: [ { id: 'qt-entrance', waypointId: 'wp-ent ...` — Le destinazioni della barra "Vai a": nome mostrato, waypoint di arrivo, zona. Il waypoint deve essere `safeForTeleport: true` (I8). L'etichetta si può cambiare liberamente.

**r. 422** `},` — Chiude `navigation`.

**r. 423–427** `displays: [` — Riga vuota, commenti e inizio degli espositori: ognuno porta con sé collider, faretto, hotspot e posa della camera per il Focus.

**r. 428–433** `{ id: 'disp-mannequin-01', kind: 'mannequin', zoneId: ' ...` — Primo manichino di Nuovi Arrivi: tipo, zona, nome, posizione e rotazione, collider, waypoint di avvicinamento, forma, materiali, prodotti esposti (`prod-001`), POI, faretto, ombra, e la posa della camera nel Focus (posizione, punto guardato, angolo, durate di entrata e uscita in ms). `kind` deve essere uno fra mannequin, plinth, rack, wall (I19); ogni id citato deve esistere (I1–I5, I11, I12, I19).

**r. 434–439** `{ id: 'disp-mannequin-02', ... productIds: ['prod-004'] ...` — Secondo manichino, con la Work Jacket.

**r. 440–445** `{ id: 'disp-rack-01', kind: 'rack', ... productIds: ['p ...` — Il rack delle magliette sulla parete ovest, con due capi.

**r. 446–451** `{ id: 'disp-plinth-01', kind: 'plinth', ... productIds: ...` — Il plinto dell'Archivio, con due capi.

**r. 452–458** `{ id: 'disp-wall-01', kind: 'wall', ... productIds: ['p ...` — La vetrina a parete dell'Archivio (senza ombra a terra). Chiude l'elenco. Per spostare un espositore cambia `position` e anche il collider e la `focusCamera`, che non deve finire dentro un ostacolo (I19).

**r. 459–460** `pois: [` — Riga vuota e inizio dei POI (punti d'interesse): i segni cliccabili sopra gli espositori.

**r. 461–463** `{ id: 'poi-new-01', type: 'display', label: 'Heavy Hood ...` — Il POI del primo manichino: nome mostrato, punto in aria dove appare, distanze di comparsa (`showRadius` 7 m), attivazione (3,2 m) e scomparsa (9 m), testo del suggerimento su desktop e mobile, espositore che apre, waypoint di avvicinamento, funzione richiesta. Etichette e testi sono modificabili; l'espositore deve puntare a questo POI e viceversa (I19).

**r. 464–466** `{ id: 'poi-new-02', ... label: 'Work Jacket', ... },` — POI del secondo manichino.

**r. 467–469** `{ id: 'poi-rack-01', ... label: 'Rack · Tees', ... },` — POI del rack.

**r. 470–472** `{ id: 'poi-arch-01', ... label: 'Archivio', ... },` — POI del plinto.

**r. 473–475** `{ id: 'poi-wall-01', ... label: 'Track Pant', ... },` — POI della vetrina a parete.

**r. 476–479** `{ id: 'poi-look-01', type: 'lookbook', label: 'Brand St ...` — POI della zona Lookbook: invece di un espositore apre il Lookbook `lb-001`. Chiude l'elenco.

**r. 480–481** `products: [` — Riga vuota e inizio del catalogo. I dati qui sono dimostrativi; con il commercio attivo prezzo, taglie disponibili e varianti arrivano da Shopify.

**r. 482–494** `{ id: 'prod-001', sku: 'INT-001', name: 'Heavy Hoodie' ...` — La felpa Heavy Hoodie: codice, nome, categoria (deve esistere in `garments.shapeByCategory`, I20), collezione, prezzo (cambiando 189 cambia il prezzo mostrato quando il commercio è spento), descrizione, dettagli in elenco, taglie con disponibilità, varianti colore con il loro campione, immagini (proporzione, nome, stile del segnaposto), `commerce.handle` (il nome del capo su Shopify: minuscole, cifre, trattini, unico, I23), espositore, lookbook e bollini ("NEW"). L'espositore deve elencarla (I4), il lookbook pure (I21).

**r. 495–505** `{ id: 'prod-002', ... name: 'Cargo Pant', ... amount: 2 ...` — Pantalone Cargo, 229 €, sul plinto, nel lookbook.

**r. 506–514** `{ id: 'prod-003', ... name: 'Box Tee', ... amount: 89 ... },` — Maglietta Box Tee, 89 €, collezione ARCHIVE, sul plinto.

**r. 515–524** `{ id: 'prod-004', ... name: 'Work Jacket', ... amount: ...` — Giacca da lavoro, 269 €, sul secondo manichino, nel lookbook.

**r. 525–534** `{ id: 'prod-005', ... name: 'Logo Tee', ... amount: 79 ...` — Maglietta col logo, 79 €, sul rack.

**r. 535–543** `{ id: 'prod-006', ... name: 'Longsleeve', ... amount: 9 ...` — Maglia a manica lunga, 99 €, sul rack.

**r. 544–553** `{ id: 'prod-007', ... name: 'Track Pant', ... amount: 1 ...` — Pantalone tecnico, 189 €, sulla vetrina a parete. Chiude il catalogo.

**r. 554–558** `lookbook: [` — Riga vuota, commento e inizio del Lookbook / Brand Story. Testi e immagini sono segnaposto dichiarati; il legame con i prodotti va scritto in entrambe le direzioni (I21).

**r. 559–560** `{ id: 'lb-001', title: 'DROP 01', subtitle: 'Placeholde ...` — Titolo, sottotitolo (scritti anche sul pannello della parete del brand), zona e stagione. Testi modificabili.

**r. 561–564** `body: [ 'Paragrafo segnaposto uno: ...', ... ],` — I paragrafi del racconto; se ne possono aggiungere altri come nuove righe fra virgolette.

**r. 565–567** `images: [{ id: 'lbi1', ratio: '16:9', label: 'Campaign ...` — Le immagini della galleria: proporzione (deve esistere in `placeholders.ratios`, I21), nome e stile. Almeno una è obbligatoria.

**r. 568–569** `productIds: ['prod-001', 'prod-004', 'prod-002'] }, ],` — I capi del look; ognuno deve citare `lb-001` nei suoi `lookbookIds`. Chiude l'elenco.

**r. 570–572** `assets: { registry: {` — Riga vuota e inizio del registro delle forme e immagini.

**r. 573–576** `'asset-mannequin-a': { type: 'primitive', primitive: 'c ...` — Le forme semplici usate dagli espositori (capsula, scatola, rack, pannello) con le loro misure. Saranno sostituibili da modelli veri.

**r. 577–580** `'asset-logo-primary': { type: 'texture', url: null, fal ...` — Il logo: senza file (`url: null`, in attesa del vettoriale, P1) si usa la scritta tipografica; `tint` dà il colore su fondo scuro e chiaro.

**r. 581–582** `}, },` — Chiudono `registry` e `assets`.

**r. 583–585** `placeholders: { ratios: { '1:1': [1, 1], '16:9': [16, 9 ...` — Riga vuota, inizio dei segnaposto delle immagini e proporzioni ammesse. Per usare un'immagine 3:2 va aggiunta qui.

**r. 586–590** `variants: { product: { bg: '#111214', fg: '#8a9099', pa ...` — I tre stili dei riquadri segnaposto (prodotto, editoriale, studio): colore di fondo, colore dei segni, motivo, se scrivere la categoria, se mettere la grana.

**r. 591** `skeleton: { shimmerMs: 1400, minVisibleMs: 400, timeout ...` — Il riquadro "in caricamento" delle immagini: durata del luccichio, tempo minimo visibile, dopo quanto si arrende.

**r. 592–594** `galleryFrame: [16, 10],` — La cornice fissa della galleria del Lookbook (16:10), così i bottoni non saltano fra immagini di forma diversa.

**r. 595–599** `productFrame: [4, 5], },` — La cornice dell'immagine della scheda prodotto sul telefono in orizzontale (4:5 come le foto prodotto). Chiude `placeholders`.

**r. 600–602** `copy: { onboarding: {` — Riga vuota e inizio di `copy`, cioè tutti i testi dell'interfaccia. Qui si possono cambiare tutte le frasi tra virgolette; i nomi a sinistra dei due punti invece non vanno toccati, perché i componenti li cercano per nome. Prima sezione: la schermata d'ingresso.

**r. 603** `eyebrow: 'Negozio immersivo · prototipo',` — La riga piccola in alto nella schermata d'ingresso.

**r. 604–606** `desktop: { heading: 'Navigazione desktop', lines: [` — Titolo delle istruzioni su computer.

**r. 607–612** `{ text: 'Click sulla scena per guardarti attorno col mo ...` — Le istruzioni per computer, una per riga. `requires` dice da quale funzione dipende: se quella funzione è spenta, la riga appare come "in arrivo". Il valore deve essere un nome di `features` (I15).

**r. 613–614** `cta: 'Entra', },` — Il testo del bottone d'ingresso su computer.

**r. 615–617** `mobile: { heading: 'Navigazione mobile', lines: [` — Titolo delle istruzioni su telefono.

**r. 618–622** `{ text: 'Tap sul pavimento per spostarti', requires: 'n ...` — Le istruzioni per telefono, con la stessa regola di `requires`.

**r. 623–624** `cta: 'Entra', },` — Bottone d'ingresso su telefono.

**r. 625–626** `loading: 'Caricamento ambiente', ready: 'pronto',` — Testi della barra di caricamento.

**r. 627** `comingSoon: 'in arrivo · fase',` — Etichetta delle istruzioni non ancora attive.

**r. 628–629** `phaseNotice: 'Prototipo in costruzione. ...', },` — Avviso del prototipo nella schermata d'ingresso. Chiude `onboarding`.

**r. 630–638** `focus: { exit: 'Esci', exitHint: 'ESC per uscire', ... ...` — Testi del pannello del Focus: uscita, precedente/successivo, "Scheda completa", varianti colore, "di" (come in "1 di 2").

**r. 639–640** `dialog: { close: 'Chiudi', back: 'Indietro', closeHint: ...` — Testi comuni alle finestre (schede).

**r. 641–651** `product: { eyebrow: 'Scheda prodotto', sizes: 'Taglia' ...` — Testi della scheda prodotto: titoletti, "esaurita", "Scegli una taglia", "Nel lookbook".

**r. 652–662** `lookbook: { eyebrow: 'Brand Story', gallery: ..., open: ...` — Testi della Brand Story e della sua galleria (anche quelli letti dai lettori di schermo per i non vedenti, come "Immagine precedente").

**r. 663–670** `hud: { menu: 'Menu', close: 'Chiudi', ..., minimap: 'pi ...` — Testi dell'interfaccia sopra la scena: menu, "Sei qui", "Corridoio" (quando non si è in nessuna zona), invito a cliccare per guardarsi attorno, "Vai a", minimappa.

**r. 671–678** `hints: { navigationLocked: ..., unreachable: 'Punto non ...` — I brevi avvisi temporanei: punto non raggiungibile, muro, mouse non concesso, "Avvicinati per esaminare".

**r. 679–688** `menu: { title: 'Indice', closeLabel: 'Chiudi menu', sec ...` — Titolo del menu e nomi delle sue sezioni. La sezione `sec-legal` deve esistere (I25); le etichette si possono cambiare.

**r. 689–699** `perf: { title: 'Prestazioni', fps: 'fps p50', ... },` — Testi dell'HUD prestazioni (`?perf=1`), strumento tecnico.

**r. 700–706** `bench: { title: 'Benchmark', seconds: 's', ... stutter: ...` — Inizio dei testi del pannello del benchmark: titolo, unità, intestazioni dei risultati.

**r. 707–713** `warmup: 'Avvio fra poco · non toccare lo schermo', ... ...` — Stati del benchmark: avvio, in corso, passo, interrompi, interrotto, fallito, completato.

**r. 714–720** `run: 'Run', repeat: 'Ripeti', copy: 'Copia riga per PER ...` — Bottoni e etichette dei risultati (ripeti, copia, chiudi, mediana).

**r. 721–727** `worst: 'Peggiore 1% low', runsHint: ..., realNo: 'NO · ...` — Ultime etichette del benchmark (protocollo, dispositivo, "da compilare"). Chiude `bench`.

**r. 728–736** `cart: { title: 'Carrello', open: 'Carrello', empty: 'Il ...` — Testi del carrello: titolo, carrello vuoto, "Continua a esplorare", "Aggiungi al carrello" e i suoi stati.

**r. 737–745** `chooseSize: 'Scegli una taglia', soldOut: 'Esaurito', u ...` — Taglia mancante, esaurito, prezzo non raggiungibile, riprova, quantità e i bottoni più/meno/rimuovi, subtotale.

**r. 746–754** `taxNote: 'IVA inclusa. Spedizione calcolata al pagament ...` — Nota sull'IVA, bottone della cassa, avvisi del negozio di prova e di sviluppo, messaggi d'errore e di quantità. Chiude `cart`. Da rileggere con attenzione prima della vendita vera.

**r. 755–760** `errors: { contextLost: { title: 'Contesto grafico perso ...` — Testi della finestra che appare quando la scheda grafica interrompe il 3D.

**r. 761–766** `webgl: { title: 'WebGL non disponibile', body: ..., hin ...` — Testi della pagina mostrata quando il dispositivo non supporta il 3D. Chiude `errors`.

**r. 767–769** `legal: { priceNotice: 'Prezzi e disponibilità sono dati ...` — Avviso dei prezzi dimostrativi (mostrato oggi in menu, Focus e scheda) e titoletto delle pagine legali. Con la vendita vera l'avviso va tolto o cambiato (è un punto aperto della fase 8c).

**r. 770–778** `policies: { 'terms-of-sale': 'Condizioni di vendita', . ...` — I nomi delle pagine legali nel menu. Ogni id di `commerce.policies` (righe 145–151) deve avere qui il suo nome (I25).

**r. 779–785** `loading: 'Caricamento', unavailable: ..., none: ..., mi ...` — Stati delle pagine legali: in caricamento, non raggiungibili, non ancora pubblicate, testo segnaposto del negozio di prova. Chiude `legal`.

**r. 786–787** `}, }` — Chiudono `copy` e l'intero `storeConfig`.

**r. 788–789** `export default storeConfig` — Riga vuota e seconda forma di esportazione, per chi importa il file senza le parentesi graffe. Non va toccata.

## `src/config/designTokens.js` (55 righe)

Contiene i "token" grafici: colori, caratteri, misure, tempi e livelli di sovrapposizione. Lo script `scripts/generate-theme.js` li trasforma in variabili CSS (file `theme.generated.css`) a ogni avvio e build, e alcuni componenti 3D li leggono direttamente. È sicuro cambiare i valori dei colori e delle misure (cambiano in tutto il sito); non bisogna rinominare le chiavi, perché diventano nomi di classi e variabili usati nei componenti.

**r. 1–8** `/** Design token — fonte unica di verità per colori, ...` — Commento: palette del brand (nero profondo, osso, Flame Orange come unico accento), il rosso ammesso solo per gli errori, nessun componente inventa colori.

**r. 9** `export const tokens = {` — Inizia l'oggetto dei token, esportato perché altri file lo possano usare.

**r. 10–11** `color: { bg: { base: '#060606', raised: '#0c0c0d', stud ...` — I colori di fondo: nero del negozio, nero leggermente più chiaro per pannelli in rilievo, grigio chiaro "studio". Diventano le classi Tailwind come `bg-bg-base`. Cambiare `base` cambia il fondo di tutto il sito.

**r. 12** `surface: { 1: '#101011', 2: '#17171a', 3: '#202024' },` — Tre livelli di superfici scure per pannelli e schede.

**r. 13** `line: { subtle: '#232326', strong: '#3a3a40', hard: '#f ...` — Colori delle linee e dei bordi, da quasi invisibile a pieno.

**r. 14** `text: { primary: '#f2f0ea', secondary: '#9b9b96', muted ...` — Colori del testo: osso principale, grigio secondario, grigio spento, nero per testo su fondo chiaro.

**r. 15–17** `accent: { flame: '#f98e30', bone: '#f2f0ea' },` — L'arancio del brand (simulazione a schermo del PANTONE 15-1157 TPG) e l'osso. Cambiando `flame` cambiano bottoni, contorni di focus, scritte a terra e insegna.

**r. 18–21** `state: { danger: '#c21025', ok: '#9b9b96' }, },` — Colori di stato: il rosso solo per gli errori. Chiude `color`.

**r. 22–25** `type: { family: {` — Riga vuota, inizio della tipografia e delle famiglie di caratteri. Il commento ricorda che il gotico è solo per i titoli di schermata.

**r. 26** `gothic: '"UnifrakturCook", "Pirata One", serif',` — Carattere gotico dei titoli, con alternative se non si carica.

**r. 27** `display: '"Archivo", "Arial Narrow", system-ui, sans-serif',` — Carattere principale di tutto il testo.

**r. 28–29** `mono: '"JetBrains Mono", ui-monospace, ...', },` — Carattere a spaziatura fissa per etichette tecniche e piccole. Chiude `family`. I file dei caratteri stanno in `public/fonts`.

**r. 30–33** `scale: { xs: '0.6875rem', sm: '0.8125rem', base: '0.937 ...` — Le dimensioni del testo (1 rem = 16 pixel): `base` = 15 px. Ingrandire `base` ingrandisce il testo normale ovunque.

**r. 34** `tracking: { tight: '-0.02em', normal: '0', wide: '0.08e ...` — La spaziatura fra lettere, da stretta a molto larga.

**r. 35–36** `weight: { regular: 400, bold: 700, black: 900 }, },` — I pesi del carattere; oggi non vengono trasformati in variabili né letti dal codice. Chiude `type`.

**r. 37–38** `space: { 0: '0', 1: '4px', 2: '8px', ... 16: '64px' },` — Riga vuota e la scala degli spazi (margini, distanze), disponibile come variabili `--spacing-s1` ecc.

**r. 39** `radius: { none: '0', sm: '2px' },` — Arrotondamento degli angoli: quasi nullo, scelta stilistica "spigoli vivi".

**r. 40** `border: { hairline: '1px', thick: '2px' },` — Spessori dei bordi; oggi non letti dal codice.

**r. 41** `motion: { fast: 140, base: 240, slow: 420, easing: ... },` — Durate delle animazioni in millisecondi e curva di accelerazione; diventano le variabili CSS `--motion-*`.

**r. 42–43** `z: { canvas: 0, hotspot: 10, hud: 20, ..., dialog: 45 ...` — L'ordine di sovrapposizione degli strati: più alto = sta sopra. Le schede (45) stanno sopra menu e Focus; l'onboarding (50) sopra tutto tranne la pagina d'errore (60). Cambiare questi numeri può far finire un pannello sotto un altro.

**r. 44** `breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1440 },` — Larghezze di schermo di riferimento; oggi non lette dal codice (Tailwind usa le sue).

**r. 45–46** `touchTarget: { min: 44 }, }` — Altezza minima in pixel dei bottoni toccabili (variabile `--touch-min`): sotto 44 diventano difficili da premere col dito. Chiude `tokens`.

**r. 47–52** `/** L'ellisse del marchio è il motivo geometrico ricorr ...` — Riga vuota e commento: l'ovale del logo è riusato per ombre, hotspot e bottoni.

**r. 53–55** `export const brandMotif = { oval: { ratio: 2.9, strokeR ...` — Le proporzioni dell'ovale: 2,9 volte più largo che alto, con contorno spesso il 5,5% dell'altezza. Usato da HUD, bottone primario, anello del tap e disegni su canvas. Cambiare `ratio` cambia la forma di tutti questi elementi insieme.

## `src/config/validateStoreConfig.js` (268 righe)

Controlla che `storeConfig.js` sia coerente: che ogni id citato esista, che i percorsi non attraversino ostacoli, che le relazioni siano scritte nei due versi. Lo chiama `App.jsx` all'avvio, ma solo in sviluppo (`npm run dev`): se trova errori blocca il sito e li elenca nella console del browser, con il codice dell'invariante (I1–I25). Non serve modificarlo per cambiare contenuti; va aggiornato solo se si aggiunge un nuovo tipo di dato o di regola.

**r. 1–10** `/** Validatore delle invarianti referenziali di storeCo ...` — Commento: perché esiste (un id sbagliato non dà errore da solo, diventa un muro attraversabile o un faretto nel vuoto) e che gira solo in sviluppo. La riga 10 è vuota.

**r. 11** `import { pointInCollider, segmentHitsCollider, inAnyAre ...` — `import` prende strumenti da un altro file: qui tre calcoli geometrici (punto dentro una scatola, segmento che attraversa una scatola, punto dentro l'area calpestabile).

**r. 12–13** `const ids = (list) => new Set(list.map((item) => item.id))` — Riga vuota e piccola funzione che, dato un elenco, raccoglie tutti i suoi `id` in un "insieme" in cui cercare velocemente.

**r. 14–17** `export function validateStoreConfig(config) { const err ...` — Riga vuota e inizio della funzione di controllo. Prepara un elenco vuoto di errori e una scorciatoia `fail` che aggiunge un errore nella forma "[I3] messaggio".

**r. 18–28** `const colliderIds = ids(config.colliders) ...` — Riga vuota e raccolta di tutti gli id esistenti per tipo (collider, waypoint, prodotti, espositori, POI, lookbook, materiali, asset, proporzioni), più una mappa dei waypoint per nome.

**r. 29–39** `for (const d of config.displays) { if (!colliderIds.has ...` — Riga vuota e controllo di ogni espositore (`for` ripete le istruzioni per ogni elemento): collider (I1), waypoint di avvicinamento (I2), prodotti (I3), POI (I5), asset (I12) e materiali (I11) devono esistere.

**r. 40–46** `for (const p of config.products) { ... fail('I4', ...` — Riga vuota e controllo di ogni prodotto: l'espositore citato deve esistere e deve elencare il prodotto (I4); le proporzioni delle immagini devono essere previste (I13).

**r. 47–53** `for (const poi of config.pois) { ...` — Riga vuota e controllo dei POI: waypoint, espositore e lookbook esistenti (I5), funzione richiesta presente in `features` (I15).

**r. 54–57** `for (const [a, b] of config.navigation.links) { ... fai ...` — Riga vuota e controllo che ogni collegamento unisca due waypoint esistenti (I6).

**r. 58–66** `// I7 — il grafo deve essere un'unica componente connes ...` — Riga vuota, commento e preparazione del controllo I7: costruisce per ogni waypoint l'elenco dei vicini e parte dal primo waypoint.

**r. 67–74** `while (queue.length) { ... fail('I7', 'grafo non connes ...` — Visita tutti i punti raggiungibili; se ne resta qualcuno non raggiunto, lo segnala come irraggiungibile (su telefono quella zona sarebbe inaccessibile).

**r. 75–82** `for (const qt of config.navigation.quickTravel) { ... f ...` — Riga vuota e controllo della barra "Vai a": zona e waypoint esistenti, e waypoint marcato sicuro per il teletrasporto (I8).

**r. 83–91** `const margin = config.navigation.player.radius ...` — Riga vuota; usando il raggio del player come margine, controlla che nessun waypoint cada dentro un collider (I9) e che stia nell'area calpestabile (I10).

**r. 92–98** `for (const wall of config.environment.walls) { ...` — Riga vuota; i muri devono avere materiale (I11) e collider (I1) esistenti, così come pavimento e soffitto il loro materiale.

**r. 99–103** `for (const spot of config.lighting.spots) { ... fail('I ...` — Riga vuota; ogni faretto deve avere un bersaglio valido (I14).

**r. 104–111** `// I16 — nessun collegamento del grafo attraversa un co ...` — Riga vuota, commento e inizio del controllo I16: per ogni collegamento prende i due waypoint (se uno manca lo salta, l'ha già segnalato I6).

**r. 112–117** `for (const c of config.colliders) { if (segmentHitsColl ...` — Per ogni collider verifica che il tratto, allargato del raggio del player, non lo attraversi; altrimenti segnala "link attraversa il collider".

**r. 118–128** `// I17 — inquadrature: zona esistente, camera fuori dai ...` — Riga vuota, commento e controllo delle inquadrature fisse: default esistente, zona esistente, camera non dentro un collider (margine 20 cm).

**r. 129–135** `// I18 — architettura e parete del brand: riferimenti v ...` — Riga vuota, commento e controllo delle colonne (collider e materiale esistenti).

**r. 136–142** `for (const pl of arch.platforms) { ...` — Pedane (zona e materiale) e binari a soffitto (materiale) devono esistere (I18).

**r. 143–146** `const bw = config.environment.brandWall ...` — Insegna e pannello della parete del brand: asset, lookbook e materiale esistenti (I18).

**r. 147–152** `// I19 — espositori: tipo supportato, faretto esistente, ...` — Riga vuota, commento e preparazione: i tipi ammessi (mannequin, plinth, rack, wall), gli id dei faretti, la mappa dei POI. Per un nuovo tipo di espositore va aggiunto qui.

**r. 153–158** `for (const d of config.displays) { if (!KINDS.has(d.kin ...` — Per ogni espositore: tipo ammesso, faretto esistente, almeno un prodotto, POI che punta indietro allo stesso espositore.

**r. 159–164** `const [fx, , fz] = d.focusCamera.position ...` — La camera del Focus non deve cadere dentro un collider (margine 15 cm) né fuori dal negozio.

**r. 165–169** `// I20 — ogni prodotto ha una forma segnaposto ...` — Riga vuota, commento; ogni prodotto deve avere una categoria nota in `garments.shapeByCategory` e almeno una variante colore.

**r. 170–176** `// Id ripetuti farebbero vendere la variante sbagliata ...` — Controlla che dentro un prodotto due colori o due taglie non abbiano lo stesso id. Chiude il ciclo.

**r. 177–180** `// I21 — Lookbook e catalogo si citano a vicenda ...` — Riga vuota, commento e mappa dei lookbook per nome.

**r. 181–189** `for (const l of config.lookbook) { ...` — Per ogni lookbook: proporzioni delle immagini previste, almeno un'immagine, ogni capo elencato esiste e cita a sua volta il lookbook.

**r. 190–196** `for (const prod of config.products) { for (const lid of ...` — Verso opposto: ogni lookbook citato da un capo esiste e elenca il capo.

**r. 197–208** `// I22 — ogni scheda prodotto ha di che riempirsi ...` — Riga vuota, commento; ogni prodotto deve avere immagini, taglie e una valuta che la lingua del brand sappia formattare (prova a creare il formattatore; se fallisce, `catch` cattura l'errore e lo registra).

**r. 209–219** `// I23 — ogni capo è collegato al commercio con un hand ...` — Riga vuota, commento; ogni capo deve avere un `commerce.handle` presente, scritto solo con minuscole, cifre e trattini, e diverso da tutti gli altri.

**r. 220–231** `// I24 — regole del commercio coerenti. ...` — Riga vuota, commento; il fornitore deve essere off/mock/shopify, la quantità massima un intero ≥ 1, la chiave del carrello presente; con Shopify servono dominio, token e versione; servono i nomi delle opzioni di taglia e colore.

**r. 232–236** `// I25 — pagine legali: ogni voce legge un campo che la ...` — Riga vuota, commento, elenco dei sette campi Shopify ammessi e insieme degli id già visti.

**r. 237–243** `for (const p of c?.policies ?? []) { ...` — Ogni pagina legale: campo ammesso, id non duplicato, etichetta presente nei testi; il menu deve avere la sezione `sec-legal`.

**r. 244–254** `// I15 — ogni istruzione dell'onboarding richiede una f ...` — Riga vuota, commento; ogni riga di istruzioni (desktop e mobile) deve citare in `requires` una funzione esistente in `features`.

**r. 255–257** `return errors }` — Riga vuota; la funzione restituisce l'elenco degli errori trovati e si chiude.

**r. 258–261** `export function assertStoreConfig(config) { if (!import ...` — Riga vuota, commento e seconda funzione, quella chiamata all'avvio: se il sito non è in modalità sviluppo esce subito senza fare niente (così in produzione il controllo non costa nulla).

**r. 262–268** `const errors = validateStoreConfig(config) ... throw ne ...` — Esegue il controllo; se ci sono errori li scrive nella console e "lancia" un errore che ferma il sito in sviluppo; altrimenti scrive "25 invarianti verificate, nessun errore".

## `index.html` (32 righe)

È la pagina che il browser scarica per prima: quasi vuota, con il titolo, le informazioni per motori di ricerca e anteprime social, e il punto in cui React disegna il sito. Vite la usa come punto di partenza della build. Si possono cambiare in sicurezza titolo e descrizioni; va tolta la riga `robots` quando i contenuti saranno reali; non vanno toccati `id="root"` e lo script finale.

**r. 1** `<!doctype html>` — Dichiara che è una pagina HTML moderna.

**r. 2** `<html lang="it">` — Inizio della pagina; la lingua è l'italiano (utile a lettori di schermo e traduttori automatici).

**r. 3** `<head>` — Inizio dell'intestazione, la parte non visibile con le informazioni sulla pagina.

**r. 4** `<meta charset="UTF-8" />` — Codifica dei caratteri, necessaria per accenti e simboli.

**r. 5** `<meta name="viewport" content="width=device-width, init ...` — Dice al telefono di usare la larghezza reale dello schermo senza zoom. Non va cambiata (il valore `viewport-fit=cover` è stato tolto apposta per tenere il sito fuori dalla Dynamic Island dell'iPhone).

**r. 6** `<meta name="theme-color" content="#060606" />` — Colore della barra del browser su telefono: il nero del negozio.

**r. 7** `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` — L'icona della scheda del browser, file `public/favicon.svg`.

**r. 8** `<title>INTO industries</title>` — Il titolo mostrato nella scheda del browser e nei risultati di ricerca. Modificabile.

**r. 9** `<meta name="description" content="INTO industries, Flor ...` — La descrizione per i motori di ricerca. Da aggiornare quando i contenuti non saranno più dimostrativi.

**r. 10–12** `<meta name="robots" content="noindex, nofollow" />` — Commento e istruzione ai motori di ricerca di non indicizzare il sito. Da togliere coi contenuti reali, insieme all'header `X-Robots-Tag` in `vercel.json`; se resta, Google non mostrerà il sito.

**r. 13–15** `<meta property="og:type" content="website" /> ...` — Informazioni per le anteprime quando il link è condiviso (WhatsApp, Facebook ecc.): tipo, titolo, descrizione. Modificabili.

**r. 16** `<meta name="twitter:card" content="summary" />` — Formato dell'anteprima su X/Twitter.

**r. 17–20** `<style> html, body, #root { ... background: #060606; } ...` — Un piccolo stile scritto direttamente qui per colorare subito di nero la pagina, prima che arrivi il resto: evita un lampo bianco all'apertura. Se cambi il fondo del sito nei token, cambialo anche qui.

**r. 21** `</head>` — Fine dell'intestazione.

**r. 22** `<body>` — Inizio del corpo, la parte visibile.

**r. 23** `<div id="root"></div>` — Il contenitore vuoto in cui React disegnerà tutto il sito. L'`id` `root` è cercato da `main.jsx`: non va cambiato.

**r. 24–29** `<noscript> ... Questa esperienza richiede JavaScript at ...` — Il messaggio mostrato solo a chi ha JavaScript disattivato: la parola INTO e una frase. Il testo si può cambiare.

**r. 30** `<script type="module" src="/src/main.jsx"></script>` — Carica il programma del sito, a partire da `main.jsx`. Nella build Vite sostituisce questo indirizzo con i file finali.

**r. 31–32** `</body> </html>` — Chiudono corpo e pagina.

## `vite.config.js` (23 righe)

È la configurazione di Vite, lo strumento che durante lo sviluppo serve il sito e per la pubblicazione lo "costruisce" in file ottimizzati. Lo usano `npm run dev`, `npm run build` e Vercel. Di solito non serve toccarlo; in particolare non va aggiunto `manualChunks` (vedi righe 18–20).

**r. 1** `import { defineConfig } from 'vite'` — Prende da Vite la funzione per scrivere la configurazione.

**r. 2** `import react from '@vitejs/plugin-react'` — Il componente aggiuntivo che insegna a Vite a leggere i file React (`.jsx`).

**r. 3** `import tailwindcss from '@tailwindcss/vite'` — Il componente aggiuntivo per Tailwind, il sistema di stili a classi.

**r. 4** `import { execSync } from 'node:child_process'` — Uno strumento per lanciare un comando del computer (qui `git`).

**r. 5–7** `// Commit della build, riportato dal benchmark ...` — Riga vuota e commento: il codice del commit da cui è costruito il sito viene scritto nei risultati del benchmark.

**r. 8–11** `function buildCommit() { if (process.env.VERCEL_GIT_COM ...` — Funzione che trova le prime 7 cifre del commit: su Vercel dalla variabile che Vercel fornisce, in locale chiedendolo a git, altrimenti scrive "locale".

**r. 12–15** `export default defineConfig({ plugins: [react(), tailwi ...` — Riga vuota, poi: la configurazione vera: attiva React e Tailwind, e sostituisce nel codice la parola `__BUILD_COMMIT__` con il codice del commit trovato sopra.

**r. 16–17** `build: { target: 'es2022',` — Impostazioni della build: il codice prodotto è per browser moderni (JavaScript del 2022).

**r. 18–20** `// Niente manualChunks: forzare three in un chunk nomin ...` — Commento-avvertimento: dividere a mano i file faceva caricare subito three.js (il motore 3D) annullando il caricamento differito della scena.

**r. 21–23** `chunkSizeWarningLimit: 1000, }, })` — Alza a 1000 kB la soglia oltre cui Vite avvisa che un file è grande (il motore 3D lo è per natura). Chiude la configurazione.

## `vercel.json` (23 righe)

Configura Vercel, il servizio che pubblica il sito a ogni push: aggiunge alle risposte del server alcune intestazioni di sicurezza, il blocco dei motori di ricerca e le regole di cache. Il formato è JSON (dati puri, senza commenti). Si può togliere la riga `X-Robots-Tag` coi contenuti reali; le altre intestazioni conviene lasciarle.

**r. 1–2** `{ "$schema": "https://openapi.vercel.sh/vercel.json",` — Inizio del file e indirizzo dello schema, che permette agli editor di controllare che il file sia scritto bene.

**r. 3** `"headers": [` — Inizio dell'elenco delle regole di intestazioni.

**r. 4–5** `{ "source": "/(.*)",` — Prima regola: vale per tutte le pagine e tutti i file del sito.

**r. 6** `"headers": [` — Inizio delle intestazioni di questa regola.

**r. 7** `{ "key": "X-Robots-Tag", "value": "noindex, nofollow" },` — Dice ai motori di ricerca di non indicizzare nulla. Da togliere coi contenuti reali, insieme alla riga `robots` di `index.html`.

**r. 8** `{ "key": "X-Content-Type-Options", "value": "nosniff" },` — Sicurezza: il browser non deve "indovinare" il tipo dei file.

**r. 9** `{ "key": "Referrer-Policy", "value": "strict-origin-whe ...` — Quando si esce verso un altro sito, gli si comunica solo il dominio di provenienza, non la pagina esatta.

**r. 10** `{ "key": "X-Frame-Options", "value": "SAMEORIGIN" },` — Impedisce ad altri siti di incorporare questo dentro una loro pagina.

**r. 11** `{ "key": "Permissions-Policy", "value": "camera=(), mic ...` — Vieta al sito l'uso di fotocamera, microfono, posizione e pagamenti del browser. Se un giorno servisse uno di questi, andrebbe tolto da qui.

**r. 12–13** `] },` — Chiudono l'elenco e la prima regola.

**r. 14–17** `{ "source": "/assets/(.*)", "headers": [{ "key": "Cache ...` — I file costruiti da Vite (che cambiano nome a ogni modifica) possono essere tenuti in memoria dal browser per un anno: le visite successive sono più veloci.

**r. 18–21** `{ "source": "/fonts/(.*)", ... "max-age=604800" }` — I caratteri tipografici vengono tenuti in memoria per una settimana (604 800 secondi). Se sostituisci un font con lo stesso nome, alcuni visitatori vedranno il vecchio per qualche giorno.

**r. 22–23** `] }` — Chiudono l'elenco delle regole e il file.

## `src/main.jsx` (10 righe)

È il primo file JavaScript eseguito: avvia React e gli dice di disegnare il componente `App` dentro il contenitore `root` di `index.html`. Carica anche il foglio di stile generale. Non c'è nulla da cambiare qui nell'uso normale.

**r. 1** `import { StrictMode } from 'react'` — Prende da React la "modalità rigorosa", che in sviluppo esegue alcuni controlli in più per scovare errori (in produzione non cambia nulla).

**r. 2** `import { createRoot } from 'react-dom/client'` — Prende lo strumento che collega React alla pagina.

**r. 3** `import App from './App.jsx'` — Prende il componente principale del sito. Un "componente" è un pezzo di interfaccia scritto come funzione.

**r. 4** `import './styles/index.css'` — Carica gli stili generali (Tailwind, token, font, regole di base come fondo nero e niente scorrimento della pagina).

**r. 5–10** `createRoot(document.getElementById('root')).render( <St ...` — Riga vuota, poi: trova il contenitore `root` nella pagina e ci disegna `App`, avvolto nella modalità rigorosa. La scrittura `<App />`, simile all'HTML, si chiama JSX: è il modo in cui React descrive l'interfaccia.

## `src/App.jsx` (172 righe)

È il "regista" del sito: decide se mostrare la pagina di errore (dispositivo senza 3D), la schermata d'ingresso con la barra di caricamento o il negozio vero con HUD, menu, Focus e schede. Gestisce anche il ripristino della scena 3D quando la scheda grafica si blocca. Non contiene testi né valori da cambiare (tutto viene da `storeConfig.js`); modificarlo serve solo per aggiungere o togliere interi pezzi di interfaccia.

**r. 1** `import { useEffect, useCallback, useRef, useState, lazy ...` — Prende da React alcuni "hook" (strumenti che danno memoria e reazioni a un componente): `useState` ricorda un valore che, quando cambia, ridisegna; `useRef` ricorda un valore senza ridisegnare; `useEffect` esegue azioni dopo il disegno; `useCallback` conserva una funzione fra un disegno e l'altro; `lazy` e `Suspense` servono a caricare un pezzo in un secondo momento.

**r. 2** `import { storeConfig } from './config/storeConfig.js'` — Prende tutti i dati del negozio.

**r. 3** `import { assertStoreConfig } from './config/validateSto ...` — Prende il controllo di coerenza dei dati.

**r. 4** `import { getDeviceProfile } from './lib/deviceProfile.js'` — Prende la funzione che riconosce il dispositivo (telefono o computer, scheda grafica, livello di qualità, supporto WebGL 2).

**r. 5** `import { useAppStore, APP_PHASE } from './state/useAppS ...` — Prende lo "stato" generale dell'app (un deposito condiviso, gestito con Zustand, che tutti i componenti possono leggere) e l'elenco delle fasi: boot, onboarding, exploring, unsupported.

**r. 6** `import { usePlayerStore } from './state/usePlayerStore.js'` — Prende lo stato del player (posizione, percorso).

**r. 7** `import { useCartStore } from './state/useCartStore.js'` — Prende lo stato del carrello.

**r. 8–11** `const StoreCanvas = lazy(() => import('./scene/StoreCan ...` — Riga vuota, commento e caricamento differito della scena 3D: il motore three.js è pesante, così la schermata d'ingresso appare subito e la scena si scarica intanto.

**r. 12–19** `import OnboardingScreen from ...` — Riga vuota e import dei primi pezzi d'interfaccia: schermata d'ingresso, HUD, avvisi temporanei, menu, pannello del Focus, contenitore delle schede, grana.

**r. 20–25** `import FadeOverlay from ... BenchPanel ...` — Altri pezzi d'interfaccia: dissolvenza del teletrasporto, pagina "WebGL non disponibile", finestra del contesto perso, barriera d'errore della scena, HUD prestazioni, pannello del benchmark.

**r. 26–27** `const MOVE_KEYS = new Set(['KeyW', 'KeyA', ...])` — Riga vuota e l'elenco dei tasti di movimento (WASD e frecce), usato per avvisare se la navigazione fosse spenta.

**r. 28** `const stageOrder = storeConfig.loading.stages.map((s) = ...` — L'ordine degli stadi di caricamento, preso dal config.

**r. 29** `const params = new URLSearchParams(window.location.search)` — Legge i parametri dell'indirizzo (la parte dopo `?`, ad esempio `?perf=1`).

**r. 30** `const showPerf = Boolean(params.get('perf') || params.g ...` — L'HUD prestazioni si mostra con `?perf=1` o `?bench=1`.

**r. 31** `const runBench = Boolean(params.get('bench'))` — Il benchmark parte solo con `?bench=1`.

**r. 32–36** `/** Orchestratore. Decide fra schermata di fallback, on ...` — Riga vuota e commento che descrive il componente.

**r. 37** `export default function App() {` — Inizia il componente principale. React lo richiama ("ridisegna") ogni volta che cambia uno dei valori che legge.

**r. 38–47** `const phase = useAppStore((s) => s.phase) ...` — Legge dallo stato generale i valori e i comandi che servono: la fase attuale, il dispositivo, l'ingresso nel negozio, l'inquadratura, lo stadio di caricamento, gli avvisi, e se la scheda grafica ha perso il contesto (`gpuLost`).

**r. 48–49** `const [sceneKey, setSceneKey] = useState(0)` — Commento e un contatore: quando aumenta, React butta via la scena 3D e ne crea una nuova da zero.

**r. 50–52** `const retired = useRef(new WeakSet())` — Commento e un elenco delle superfici 3D già sostituite: quando ne viene buttata una, il browser segnala una "perdita di contesto" che va ignorata perché non è un guasto nuovo.

**r. 53–59** `const remountScene = useCallback((canvas) => { ...` — Riga vuota, poi: inizia la funzione che ricostruisce la scena: per prima cosa segna come "ritirata" la superficie 3D vecchia (o tutte quelle presenti, se non è indicata quale).

**r. 60–63** `usePlayerStore.setState({ resumePose: ... })` — Commento e salvataggio della posizione del visitatore, così la scena nuova riparte da lì; se era in corso un Focus, viene chiuso (la sua camera apparteneva alla scena vecchia).

**r. 64–67** `useAppStore.setState({ gpuLost: false }) setSceneKey((k ...` — Toglie l'avviso di contesto perso e aumenta il contatore, che fa ricostruire la scena.

**r. 68–75** `const sceneFailures = useRef(0) const onSceneError = us ...` — Commento e gestione degli errori della scena: a ogni errore aumenta un conteggio; al terzo di fila mostra la pagina "WebGL non disponibile", prima offre la finestra con "Riprova". Il numero 3 si può cambiare per essere più o meno pazienti.

**r. 76–79** `const onContextLost = useCallback((canvas) => { ... gpu ...` — Riga vuota, poi: quando la scheda grafica perde il contesto, mostra la finestra "Contesto grafico perso", salvo che si tratti di una superficie già ritirata.

**r. 80–83** `useEffect(() => { if (params.get('debug')) window.__rem ...` — Riga vuota, poi: solo con `?debug=` rende disponibile ai test il comando per ricostruire la scena.

**r. 84–89** `useEffect(() => { useCartStore.getState().init() ...` — Riga vuota, poi: commento e avvio del carrello all'apertura: se un fornitore (prova o Shopify) è attivo, carica il catalogo e il carrello salvato; con `provider: 'off'` non fa nulla. In debug espone il carrello ai test.

**r. 90–97** `useEffect(() => { assertStoreConfig(storeConfig) const ...` — Riga vuota, poi: all'avvio: controlla la coerenza del config (solo in sviluppo), riconosce il dispositivo e lo salva, poi passa alla schermata d'ingresso se il dispositivo supporta WebGL 2, altrimenti alla pagina di errore.

**r. 98–102** `const { shots, defaultShotId } = storeConfig.camera ...` — Riga vuota, commento e impostazione dell'inquadratura iniziale (quella di `defaultShotId`), che fissa anche la zona mostrata nell'HUD. Fine dell'effetto.

**r. 103–110** `const onStage = useCallback((stage) => { ...` — Riga vuota, poi: commento e funzione chiamata dalla scena a ogni passo del caricamento: la barra avanza solo in avanti, mai indietro; quando arriva il primo fotogramma, azzera il conteggio degli errori.

**r. 111–113** `const exploring = phase === APP_PHASE.EXPLORING const n ...` — Riga vuota, poi: due scorciatoie: se si è dentro il negozio, e se la navigazione è accesa nei feature flag.

**r. 114–122** `useEffect(() => { if (!exploring || navigationOn) return ...` — Riga vuota, poi: commento e caso di riserva: se la navigazione fosse spenta, premere un tasto di movimento mostra l'avviso `copy.hints.navigationLocked` invece del silenzio. Oggi la navigazione è accesa, quindi non scatta.

**r. 123–125** `if (!device) return null if (phase === APP_PHASE.UNSUPP ...` — Riga vuota, poi: finché il dispositivo non è riconosciuto non disegna nulla; se non supporta il 3D mostra la pagina di errore.

**r. 126–128** `const stage = storeConfig.loading.stages.find(...) cons ...` — Riga vuota, poi: trova lo stadio di caricamento attuale (per percentuale e nome della barra); `ready` è vero quando la scena ha disegnato il primo fotogramma.

**r. 129–137** `return ( <div className="relative h-full w-full"> <div ...` — Riga vuota, poi: inizia il disegno: un contenitore a tutto schermo e, dentro, lo strato della scena 3D (livello `--z-canvas` dei token). `className` sono le classi Tailwind che danno lo stile. Il tocco sullo strato mostra l'avviso se la navigazione fosse spenta.

**r. 138–145** `<SceneErrorBoundary key={sceneKey} onError={onSceneErro ...` — La scena 3D, protetta da una "barriera d'errore" (se si rompe non lascia la pagina vuota) e caricata in differita. Riceve config, dispositivo e le funzioni per caricamento, perdita e ripristino del contesto. La `key` legata al contatore permette di ricostruirla.

**r. 146–150** `<GrainOverlay ... /> {showPerf && exploring && <PerfHud ...` — Riga vuota, poi: gli strati sopra la scena: grana e vignettatura, HUD prestazioni (solo con `?perf` o `?bench`), finestra del contesto perso (solo quando serve), dissolvenza del teletrasporto.

**r. 151–160** `{exploring ? ( <> <Hud ... /> <NoticeToast /> <FocusPan ...` — Riga vuota, poi: se si è dentro il negozio: HUD, avvisi, pannello del Focus, menu, contenitore delle schede e, con `?bench=1`, il pannello del benchmark. Il simbolo `? :` sceglie fra due alternative.

**r. 161–169** `) : ( <OnboardingScreen device={device} ready={ready} p ...` — Altrimenti, la schermata d'ingresso con istruzioni, barra di caricamento (percentuale e nome dello stadio) e bottone "Entra", che chiama `enterStore` per entrare nel negozio.

**r. 170–172** `</div> ) }` — Chiudono il contenitore, il disegno e il componente.
