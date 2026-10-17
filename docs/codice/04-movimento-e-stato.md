# Movimento, Focus e stato condiviso

Questo gruppo di file fa muovere il visitatore nel negozio e tiene la "memoria comune" del sito. I quattro file in `src/scene/player/` vivono dentro la scena 3D: leggono tastiera, mouse e dita, spostano la camera, la portano davanti a un capo nel Focus Mode, disegnano gli indicatori fluttuanti (hotspot) e il cerchio arancio con la linea del percorso dopo un tocco. I cinque file in `src/state/` sono gli "store": cassetti di dati condivisi fra la scena 3D e l'interfaccia 2D (menu, schede, minimappa, carrello). Quasi tutti i numeri che regolano il movimento (velocità, soglie, tempi) non sono scritti qui ma in `src/config/storeConfig.js`, soprattutto in `navigation` e `focus`: in genere è lì che si interviene.

## `src/scene/player/PlayerController.jsx` (592 righe)

È il "pilota" del visitatore: legge tastiera, mouse e tocchi, calcola dove si trova il player a ogni fotogramma (con le collisioni contro i box `colliders`), segue i percorsi automatici, gestisce il teletrasporto e decide quando aprire il Focus o il Lookbook. Lo monta `src/scene/StoreCanvas.jsx`; i bottoni dell'interfaccia (barra "Vai a", benchmark) gli parlano solo attraverso `usePlayerStore`. Si possono cambiare senza rischi i valori che legge dal config (`navigation.player`, `navigation.input`, `navigation.teleport`, `navigation.hotspot`, `focus.maxClickDistance`); alcuni piccoli numeri sono scritti direttamente nel codice e sono segnalati sotto. Non vanno toccate a cuor leggero la formula dell'angolo (`yawToward`), la logica dei sotto-passi della simulazione e le regole di blocco dell'input: sono state corrette dopo difetti reali.

**r. 1–4** `import { useEffect, useMemo, useRef } from 'react'` — Carica gli strumenti di base. Da React arrivano gli "hook": funzioni speciali che un componente usa per ricordare dati fra un disegno e l'altro (`useRef`, `useMemo`) o per eseguire codice quando compare o scompare (`useEffect`). Da React Three Fiber arrivano `useFrame` (codice eseguito a ogni fotogramma della scena 3D) e `useThree` (accesso a camera, canvas e dimensioni dello schermo). `THREE` è la libreria 3D. La riga 4 è vuota.

**r. 5–11** `import { createNavigator } from '../../lib/navigator.js'` — Carica le funzioni di supporto: il navigatore che calcola i percorsi aggirando gli ostacoli, lo spostamento con collisioni, i calcoli geometrici (raggio che colpisce un box, zona in cui si trova un punto), il calcolo del campo visivo (`fovForAspect`) e i due store usati qui. La riga 11 è vuota.

**r. 12–15** `const MOVE = { KeyW: [1, 0], ArrowUp: [1, 0], ...` — Tabella dei tasti di movimento: W e freccia su = avanti, S e freccia giù = indietro, A e freccia sinistra = di lato a sinistra, D e freccia destra = a destra. Il primo numero è avanti/indietro, il secondo è il passo laterale. Per aggiungere altri tasti (per esempio ZQSD per tastiere francesi) si aggiunge una voce qui.

**r. 16–17** `const SPRINT = new Set(['ShiftLeft', 'ShiftRight'])` — I tasti che fanno correre: i due Shift. La riga 17 è vuota.

**r. 18–19** `const yawToward = (fromX, fromZ, toX, toZ) => Math.atan2(...)` — Calcola l'angolo orizzontale (lo "yaw", la rotazione della testa a destra/sinistra) per guardare da un punto verso un altro. Segue la stessa convenzione di three.js (angolo 0 = guardare verso −z); il commento lo ricorda. Da non modificare: tutte le rotazioni del player dipendono da qui.

**r. 20** `const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))` — Riporta un angolo fra −180° e +180°, così quando il player si gira sceglie sempre la via più corta invece di fare un giro intero.

**r. 21** `const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)` — Piccola funzione che tiene un numero dentro un minimo e un massimo (usata per non far guardare troppo in alto o in basso).

**r. 22–25** `const PANEL_DEPTH_TOLERANCE = 0.3` — Tolleranza di 30 cm per il pannello della parete del brand: il pannello sta "dentro" lo spessore del box di collisione del muro, quindi un tocco colpisce prima il box e poi il pannello poco dietro. Con questa tolleranza il tocco conta comunque come tocco sul pannello. La riga 25 è vuota.

**r. 26–37** `/** Controller del player — Fase 3. ...` — Commento che riassume il comportamento: su desktop WASD/frecce e mouse col Pointer Lock (il cursore "catturato" dalla scena, che si attiva solo con un click esplicito e non si riattiva mai da solo); su telefono niente joystick, un tocco = vai lì o avvicinati, trascinare = guardarsi intorno; ogni spostamento automatico segue un percorso sicuro.

**r. 38** `export default function PlayerController({ config, device }) {` — Inizio del componente. Riceve la configurazione del negozio (`config`, cioè `storeConfig`) e il profilo del dispositivo (`device`: touch o no, movimento ridotto, ecc.).

**r. 39** `const { camera, gl, size } = useThree()` — Prende la camera della scena, il disegnatore WebGL (da cui si ricava l'elemento canvas) e le dimensioni dello schermo.

**r. 40** `const nav = useMemo(() => createNavigator(config), [config])` — Crea il navigatore dei percorsi una volta sola (`useMemo` = calcola e ricorda, rifà il calcolo solo se il config cambia).

**r. 41–42** `const P = config.navigation.player` — Scorciatoie: `P` sono le impostazioni del player (altezza occhi, raggio, velocità, sensibilità), `I` quelle dell'input (soglie del tocco, passi di simulazione). Entrambe stanno in `storeConfig.navigation`.

**r. 43** `const waypoints = useMemo(() => new Map(...waypoints...` — Prepara un elenco dei waypoint (i punti di riferimento del negozio, per esempio "Ingresso", "Archivio") cercabili per id.

**r. 44** `const pois = config.pois` — I POI ("punti d'interesse"): i punti dove compare un hotspot, come un espositore o il Lookbook.

**r. 45–47** `const displayById = useMemo(() => new Map(...` — Tre elenchi di ricerca rapida: espositore per id, espositore per id del suo box di collisione (serve per capire se un tocco ha colpito un espositore) e POI per espositore collegato.

**r. 48–51** `const moveOpts = useMemo(() => ({ radius: P.radius, ...` — Le opzioni per lo spostamento con collisioni: raggio del corpo del player (`navigation.player.radius`, 35 cm), i box contro cui urtare, le aree calpestabili e il passo massimo (metà del raggio, per non "saltare" attraverso un muro sottile). Allargare il raggio rende il player più "grosso": passa meno facilmente fra i mobili. La riga 51 è vuota.

**r. 52–54** `const rt = useRef(null)` — Qui inizia lo "stato della simulazione": posizione, velocità, tasti premuti… Sta in un `useRef`, cioè in una scatola che React non osserva: cambiarla 60 volte al secondo non fa ridisegnare nulla, ed è voluto. Viene preparata una sola volta.

**r. 55–56** `const spawn = waypoints.get(...entrance.waypointId)` — Il punto di partenza (waypoint d'ingresso) e il punto verso cui guardare all'inizio, entrambi scelti in `storeConfig.environment.entrance`.

**r. 57–59** `const resume = usePlayerStore.getState().resumePose` — Se la scena è stata ricostruita (per esempio dopo una perdita del contesto grafico), c'è una posa salvata da cui ripartire: la si legge e la si cancella, così vale una volta sola.

**r. 60–64** `rt.current = { pos: resume ? ... : { x: spawn.position[0], ...` — Posizione iniziale (quella salvata o quella dell'ingresso), direzione dello sguardo (salvata, oppure calcolata verso il punto di partenza dello sguardo), inclinazione su/giù a zero e velocità a zero.

**r. 65–66** `keys: new Set(), sprint: false,` — I tasti di movimento tenuti premuti in questo momento e se si sta correndo.

**r. 67–68** `route: null, faceYaw: null,` — Il percorso automatico in corso (punti da seguire e dove guardare all'arrivo) e l'angolo verso cui girarsi dolcemente, se ce n'è uno.

**r. 69–70** `stuckFor: 0, lastLookInput: 0,` — Da quanto tempo il player è "incastrato" mentre segue un percorso, e l'ultimo istante in cui l'utente ha mosso la visuale (serve per non girargli la testa mentre sta guardando altrove).

**r. 71–72** `gesture: null, teleport: null,` — Il tocco o trascinamento in corso sullo schermo, e il teletrasporto in corso (destinazione e momento in cui spostarsi).

**r. 73–74** `poiState: Object.fromEntries(pois.map((p) => [p.id, 'hidden'])),` — Lo stato di vicinanza di ogni POI, all'inizio tutti "nascosti", e l'ultima volta che la posizione è stata comunicata all'interfaccia.

**r. 75–77** `}` — Chiusura della preparazione. La riga 77 è vuota.

**r. 78–81** `const blocked = () => { ... app.dialogs.length > 0 }` — Dice se il player deve stare fermo: è vero quando non si è ancora entrati nel negozio, quando il menu è aperto, quando il Focus è in corso o quando c'è una scheda aperta.

**r. 82–87** `const inputLocked = () => blocked() || ...benchRunning` — Oltre ai casi sopra, l'input dell'utente viene ignorato durante il benchmark (un tocco falserebbe la misura) e durante la dissolvenza del teletrasporto. La riga 87 è vuota.

**r. 88–89** `const notify = (text) => useAppStore.getState().showNotice(text)` — Scorciatoia per mostrare un breve messaggio sopra la scena (per esempio "Non raggiungibile"). La riga 89 è vuota.

**r. 90–95** `const cancelRoute = () => {` — Annulla il percorso automatico e lo comunica allo store, così la linea tratteggiata sul pavimento sparisce. La riga 95 è vuota.

**r. 96–97** `const ping = (x, z, ok) => usePlayerStore.setState({ ping: ... })` — Fa comparire l'anello di conferma nel punto toccato: arancio se raggiungibile (`ok` vero), grigio se no. La riga 97 è vuota.

**r. 98–101** `/** Focus Mode su un espositore: ...` — Commento: entrare nel Focus significa liberare il cursore, azzerare i tasti e salvare la posa per il ritorno; poi la camera passa a `FocusCameraRig`.

**r. 102–107** `const enterFocusFor = (display) => { ... if (!feature.enabled) {` — Inizio dell'ingresso nel Focus. Se il Focus è spento in `storeConfig.features.focusMode`, mostra il messaggio "In arrivo nella Fase N" (testo da `copy.hints.comingInPhase`) e si ferma.

**r. 108–110** `r.keys.clear(); r.vel.x = r.vel.z = 0` — Dimentica i tasti premuti e ferma il player.

**r. 111–115** `if (r.faceYaw !== null) r.yaw = r.faceYaw` — Se il player si stava ancora girando verso l'espositore, la rotazione viene completata subito: altrimenti, uscendo dal Focus, la camera tornerebbe allo sguardo "di marcia" e poi girerebbe da sola.

**r. 116–117** `cancelRoute() ... document.exitPointerLock()` — Annulla il percorso e libera il cursore del mouse, così si possono usare i bottoni del pannello del Focus.

**r. 118–122** `useAppStore.getState().enterFocus(display.id, { x: r.pos.x, ...` — Chiede allo store di avviare il Focus su quell'espositore, consegnando la posa di ritorno (posizione, altezza occhi, direzione, inclinazione, campo visivo). La riga 122 è vuota.

**r. 123–127** `const approachOrFocus = (display) => {` — Gestisce il tocco o click su un espositore: trova il waypoint da cui avvicinarsi (`approachWaypointId` dell'espositore) e il POI collegato.

**r. 128** `const near = Math.hypot(...) < 1.2 || ...` — Il player è considerato "vicino" se è a meno di 1,2 m dal punto d'avvicinamento o se l'hotspot dell'espositore è già attivo. Il valore 1,2 è scritto qui nel codice, non nel config.

**r. 129–132** `if (near) enterFocusFor(display) else goTo(...)` — Se è vicino apre subito il Focus; altrimenti cammina fino al punto d'avvicinamento, guardando l'hotspot, e all'arrivo apre il Focus. La riga 132 è vuota.

**r. 133–139** `const openLookbook = (lookbookId) => { ... if (!feature.enabled) {` — Apertura del Lookbook: se la funzione è spenta in `features.lookbook`, mostra "In arrivo nella Fase N".

**r. 140–144** `if (rt.current.faceYaw !== null) rt.current.yaw = ...` — Completa la rotazione in corso e apre la scheda del Lookbook nella pila delle schede. Il blocco dei tasti e il rilascio del cursore li fa la sottoscrizione delle righe 259–266. La riga 144 è vuota.

**r. 145–151** `const approachOrOpenLookbook = (poi) => {` — Come per gli espositori: se l'hotspot del Lookbook è attivo (si è vicini) lo apre, altrimenti cammina fino al suo waypoint d'avvicinamento e lo apre all'arrivo. La riga 151 è vuota.

**r. 152–155** `const brandPanel = config.environment.brandWall.panel` — Il pannello della parete del brand (posizione e dimensioni in `storeConfig.environment.brandWall.panel`) e il POI del Lookbook a cui il pannello è legato.

**r. 156–160** `const panelHit = (o, d) => { ... const t = (cz - o[2]) / d[2]` — Calcola se un raggio (la linea che parte dall'occhio verso il punto toccato) colpisce il piano del pannello: se il raggio è parallelo al pannello o va nella direzione opposta, non lo colpisce.

**r. 161–165** `const x = o[0] + d[0] * t ... ? t : null` — Trova il punto colpito sul piano e controlla che stia dentro il rettangolo del pannello; restituisce la distanza oppure "niente". La riga 165 è vuota.

**r. 166–168** `const goTo = (target, faceAt = null, onArrive = null) => {` — Avvia una camminata automatica verso un punto del pavimento. `faceAt` è dove guardare all'arrivo, `onArrive` cosa fare all'arrivo (aprire un Focus o il Lookbook).

**r. 169–174** `const res = nav.plan([r.pos.x, r.pos.z], target)` — Chiede al navigatore un percorso. Se non esiste (punto dentro un ostacolo o irraggiungibile) mostra l'anello grigio e il messaggio `copy.hints.unreachable`, e si ferma.

**r. 175–177** `r.route = { points: ..., faceAt, onArrive }` — Salva il percorso (una copia dei punti), annulla rotazioni in sospeso e azzera il contatore di "incastro".

**r. 178–182** `ping(target[0], target[1], true)` — Mostra l'anello arancio e pubblica il percorso nello store, così `MoveFeedback` disegna la linea tratteggiata. La riga 182 è vuota.

**r. 183–185** `const runCommand = (cmd) => {` — Esegue un comando arrivato dall'interfaccia (i bottoni non muovono il player direttamente: lasciano un comando in coda in `usePlayerStore`).

**r. 186–190** `if (cmd.type === 'goto') { goTo(cmd.point, cmd.faceAt ?? null)` — Comando "vai a un punto": cammina lungo un percorso valido.

**r. 191–202** `if (cmd.type === 'place') { ... r.pos.x = w.position[0]` — Comando usato dal benchmark: mette il player istantaneamente su un waypoint, fermo, con lo sguardo verso il suo `lookAt` e la testa dritta.

**r. 203–206** `if (cmd.type === 'focus') { enterFocusFor(...)` — Comando del benchmark: apre il Focus su un espositore.

**r. 207–211** `if (cmd.type === 'face') { r.faceYaw = yawToward(...)` — Comando del benchmark: girati dolcemente verso un punto.

**r. 212–215** `if (cmd.type === 'teleport') { ... if (!w?.safeForTeleport) return` — Comando della barra "Vai a": accetta solo waypoint segnati `safeForTeleport: true` in config (doppio controllo oltre alla regola I8 del validatore).

**r. 216–222** `const fadeMs = device.reducedMotion ? 0 : ...fadeMs` — Annulla il percorso, ferma il player e programma lo spostamento dopo la dissolvenza al nero (`navigation.teleport.fadeMs`, oggi 220 ms; zero se l'utente ha chiesto "movimento ridotto" nel sistema). Accende `fading` nello store, che fa comparire il velo nero. Aumentare `fadeMs` rende la dissolvenza più lenta. La riga 222 chiude la funzione.

**r. 223–226** `// --- Tastiera ---  useEffect(() => {` — Riga vuota, titolo della sezione e inizio di un `useEffect` che si collega alla tastiera quando la scena compare.

**r. 227–234** `const down = (e) => { if (e.metaKey || e.ctrlKey ...` — Tasto premuto: ignora le combinazioni con Ctrl/Alt/Cmd (scorciatoie del browser); Shift accende la corsa; un tasto di movimento, se l'input non è bloccato, viene aggiunto ai tasti premuti, annulla il percorso automatico e impedisce al browser di scorrere la pagina con le frecce.

**r. 235–238** `const up = (e) => { if (SPRINT.has(e.code)) r.sprint = false` — Tasto rilasciato: spegne la corsa o toglie il tasto dall'elenco.

**r. 239–242** `const release = () => { r.keys.clear(); r.sprint = false }` — Se la finestra perde il focus (cambio di app, altra scheda) il rilascio del tasto non arriva mai e il player camminerebbe da solo: in quei casi si azzera tutto.

**r. 243–246** `window.addEventListener('keydown', down)` — Si mette in ascolto di tasti premuti, tasti rilasciati, perdita del focus e pagina nascosta.

**r. 247–253** `return () => { window.removeEventListener('keydown', down)` — Quando la scena scompare, toglie gli ascoltatori (pulizia). Le parentesi quadre vuote alla riga 253 dicono di collegarsi una volta sola.

**r. 254–258** `// --- Menu o scheda aperti: movimento sospeso ...` — Riga vuota e commento: all'apertura di menu o scheda si azzerano tasti, velocità e percorso; alla chiusura il cursore non viene ricatturato da solo, serve un nuovo click.

**r. 259–266** `useEffect(() => useAppStore.subscribe((s, prev) => {` — "Sottoscrizione" allo store: una funzione chiamata a ogni cambiamento dello stato dell'app. Se il menu si è appena aperto o la prima scheda si è appena aperta, ferma il player, annulla il percorso e libera il cursore.

**r. 267–271** `// --- Pointer Lock --- ... const onChange = ...` — Riga vuota, titolo, inizio dell'effetto del Pointer Lock. `onChange` scrive nello store se il cursore è catturato dalla scena (l'HUD lo usa per mostrare il mirino e i suggerimenti giusti).

**r. 272** `const onError = () => notify(config.copy.hints.pointerLockFailed)` — Se il browser rifiuta la cattura del cursore, mostra il messaggio previsto in `copy.hints.pointerLockFailed`.

**r. 273–279** `r.yaw -= e.movementX * P.lookSensitivity.desktop` — Muovendo il mouse a cursore catturato si gira la testa: il movimento orizzontale cambia la direzione, quello verticale l'inclinazione, entro i limiti `navigation.player.pitchClamp`. La sensibilità è `navigation.player.lookSensitivity.desktop` (oggi 0,0022): aumentarla fa girare più in fretta. Durante il benchmark il mouse è ignorato.

**r. 280–282** `document.addEventListener('pointerlockchange', onChange)` — Si mette in ascolto dei tre eventi.

**r. 283–290** `return () => { ... document.exitPointerLock()` — Pulizia allo smontaggio: toglie gli ascoltatori e, se il cursore era catturato, lo libera. La riga 290 è vuota.

**r. 291–294** `const raycaster = useMemo(() => new THREE.Raycaster(), [])` — Titolo della sezione tocchi e preparazione di due oggetti riusati: il "raycaster" (lo strumento che lancia un raggio dalla camera attraverso il punto toccato) e un vettore per le coordinate dello schermo. La riga 294 è vuota.

**r. 295–297** `const handleTap = (clientX, clientY) => {` — Gestione di un tocco (o click senza cursore catturato): converte la posizione sullo schermo in coordinate da −1 a +1, come le vuole three.

**r. 298–303** `camera.updateMatrixWorld()` — Aggiorna la camera prima di mirare (un tocco può arrivare fra due fotogrammi) e prepara il raggio: punto d'origine `o` e direzione `d`.

**r. 304–309** `// 1. Hotspot visibili ... for (const poi of pois) {` — Prima prova: gli hotspot visibili. Ognuno ha una sfera di tocco invisibile attorno al suo punto; il raggio `navigation.hotspot.tapRadius` (0,9 m) decide quanto è facile colpirli. Gli hotspot nascosti sono saltati.

**r. 310–318** `const oc = [o[0] - a[0], o[1] - a[1], o[2] - a[2]]` — Calcolo matematico dell'incontro fra raggio e sfera; tiene il colpo più vicino.

**r. 319–325** `// 2. Muri e colonne ... for (const col of config.colliders) {` — Seconda prova: i box di collisione. Se il raggio colpisce un box prima di quanto trovato finora, il tocco è su quel box: un espositore se il box appartiene a un espositore, altrimenti un muro.

**r. 326–331** `// 3. Pavimento. if (d[1] < -1e-4) {` — Terza prova: il pavimento (altezza zero), solo se il raggio scende. Se è il colpo più vicino, il tocco vale come "vai qui". La riga 331 è vuota.

**r. 332–337** `if (best.kind === 'display') { approachOrFocus(best.display)` — Decisione: espositore toccato o hotspot di un espositore → avvicinati o apri il Focus; hotspot del Lookbook → avvicinati o apri il Lookbook.

**r. 338–342** `} else if (best.kind === 'poi') {` — Hotspot generico → cammina fino al suo waypoint guardandolo; pavimento → cammina fin lì.

**r. 343–344** `} else if (best.kind === 'wall' && lookbookPoi ...` — Muro colpito, ma il raggio colpisce anche il pannello della parete del brand subito dietro (entro la tolleranza delle righe 22–25): apre o avvicina il Lookbook.

**r. 345–351** `} else if (best.kind === 'wall') {` — Muro normale: anello grigio dove si è toccato e il messaggio `copy.hints.wall`. Chiusura della funzione; la riga 351 è vuota.

**r. 352–355** `canvas.style.touchAction = 'none'` — Inizio dell'effetto che ascolta dita e mouse sulla scena. Toglie al browser lo scorrimento, lo zoom e il "rimbalzo" sulla scena, che altrimenti ruberebbero i gesti. La riga 355 è vuota.

**r. 356–359** `const onDown = (e) => { if (inputLocked()) return` — Dito o mouse premuto: se l'input è bloccato non fa nulla; distingue un vero mouse su un dispositivo non touch.

**r. 360–370** `if (isMouse) { if (document.pointerLockElement !== canvas) {` — Col mouse, se il cursore non è ancora catturato, questo click serve solo a catturarlo (l'unico modo per attivare il controllo del mouse). Se il browser rifiuta, mostra il messaggio d'errore.

**r. 371–375** `raycaster.setFromCamera(ndc.set(0, 0), camera)` — A cursore catturato il click mira dal centro dello schermo (il mirino): prepara il raggio da lì.

**r. 376–382** `let aimedT = config.focus.maxClickDistance` — Cerca l'espositore sotto il mirino, ma solo entro `focus.maxClickDistance` (7,5 m): più lontano il click non apre nulla. Se un muro è davanti all'espositore, vince il muro. Se c'è un espositore, apre subito il Focus.

**r. 383–384** `const pt = panelHit(o, dir)` — Se il mirino è sul pannello della parete del brand (entro la stessa distanza, con la tolleranza), apre il Lookbook.

**r. 385–388** `const activeId = usePlayerStore.getState().activePoiId` — Altrimenti usa l'hotspot attivo in quel momento (quello vicino): apre il suo Focus o il suo Lookbook.

**r. 389–393** `if (poi?.requires && !config.features[poi.requires]?.enabled) {` — Se l'hotspot attivo richiede una funzione ancora spenta, mostra "In arrivo nella Fase N". Fine del ramo mouse.

**r. 394–397** `if (r.gesture) return // un solo dito alla volta` — Per il tocco: si segue un dito alla volta. Registra dove e quando è iniziato il gesto e chiede al browser di continuare a mandare gli eventi di quel dito anche se esce dalla scena.

**r. 398–401** `const onMove = (e) => { ... if (!g || g.id !== e.pointerId) return` — Dito che si muove: considera solo il dito del gesto in corso.

**r. 402** `if (!g.dragging && ... > I.tapMaxMovePx) g.dragging = true` — Se il dito si è spostato più di `navigation.input.tapMaxMovePx` (10 pixel), il gesto diventa un trascinamento e non sarà più un tocco. Alzare la soglia rende più facile toccare con un dito "tremolante", ma il trascinamento parte più tardi.

**r. 403–408** `r.yaw += (e.clientX - g.x) * P.lookSensitivity.mobileDrag` — Durante il trascinamento la scena segue il dito ("afferra la scena"): orizzontale gira la testa, verticale la inclina. Sensibilità in `navigation.player.lookSensitivity.mobileDrag` (0,0045).

**r. 409–411** `g.x = e.clientX; g.y = e.clientY` — Ricorda l'ultima posizione del dito per il prossimo movimento.

**r. 412–418** `const onUp = (e) => { ... performance.now() - g.t0 <= I.tapMaxMs` — Dito sollevato: se non c'è stato trascinamento ed è durato al massimo `navigation.input.tapMaxMs` (350 ms), è un tocco e viene gestito da `handleTap`. Un dito tenuto premuto più a lungo non sposta il player.

**r. 419–420** `const onCancel = (e) => { ... rt.current.gesture = null }` — Se il sistema annulla il gesto (per esempio arriva una notifica), lo si dimentica. La riga 420 è vuota.

**r. 421–424** `canvas.addEventListener('pointerdown', onDown)` — Si mette in ascolto dei quattro eventi del puntatore sulla scena.

**r. 425–432** `return () => { canvas.removeEventListener('pointerdown', onDown)` — Pulizia allo smontaggio. La riga 432 è vuota.

**r. 433–442** `camera.fov = fovForAspect(P.fov, size.width / size.height)` — Campo visivo ("fov", quanto si vede). Quando cambia la dimensione dello schermo lo ricalcola: in verticale, su telefono, lo allarga per vedere abbastanza ai lati (`navigation.player.fov`: 60° verticali, almeno 50° orizzontali, al massimo 85°). Durante il Focus non lo tocca, perché la camera è di `FocusCameraRig`. Imposta anche le distanze minima e massima di disegno (`config.camera.near` e `far`). La riga 442 è vuota.

**r. 443–451** `if (!new URLSearchParams(...).get('debug')) return` — Solo con `?debug=` nell'indirizzo: espone player, navigatore, camera e store alla console del browser, per i test automatici. In uso normale non fa nulla. La riga 451 è vuota.

**r. 452–456** `const frozen = blocked() || r.teleport` — Inizio di un "passo di simulazione": un piccolo avanzamento del tempo di durata `dt`. Se il player è bloccato o in teletrasporto, è "congelato".

**r. 457–460** `let desiredX = 0 ... let rate = P.damping` — Velocità desiderata (zero se nessuno spinge) e quanto in fretta ci si arriva: di base `navigation.player.damping` (10), la frenata. Più alto = si ferma più di colpo. La riga 460 è vuota.

**r. 461–464** `for (const k of r.keys) { f += MOVE[k][0]; s += MOVE[k][1] }` — Somma i tasti premuti per ottenere la direzione avanti/indietro e laterale.

**r. 465–472** `const speed = P.walkSpeed * (r.sprint ? P.sprintMultiplier : 1)` — Con un tasto premuto: velocità di camminata `navigation.player.walkSpeed` (3 m/s), moltiplicata per `sprintMultiplier` (1,6) con Shift; la direzione segue lo sguardo; in diagonale non si va più veloci. Si accelera con `acceleration` (14): più alto = scatto più pronto.

**r. 473–477** `} else if (r.route) { const [tx, tz] = r.route.points[0]` — Senza tasti ma con un percorso automatico: prende il prossimo punto del percorso e la distanza.

**r. 478–487** `if (d < P.autoMove.arriveRadius) { r.route.points.shift()` — Se il punto è a meno di `navigation.player.autoMove.arriveRadius` (25 cm) lo considera raggiunto e passa al successivo. All'ultimo punto: si gira verso il punto da guardare, chiude il percorso ed esegue l'azione d'arrivo (apre il Focus o il Lookbook).

**r. 488–495** `const speed = P.autoMove.speed * clamp(remaining / 1.2, 0.3, 1)` — Altrimenti cammina verso il punto alla velocità `autoMove.speed` (3,4 m/s), rallentando dolcemente negli ultimi 1,2 m (fino al 30% della velocità): un arrivo morbido. I valori 1,2 e 0,3 sono scritti qui nel codice.

**r. 496–503** `if (now - r.lastLookInput > 600) {` — Durante il cammino automatico la testa si gira verso la direzione di marcia, con velocità `autoMove.turnSpeed` (6), a meno che l'utente non abbia mosso la visuale negli ultimi 600 ms (numero nel codice). Poi si chiudono i blocchi.

**r. 504–509** `const k = 1 - Math.exp(-rate * dt)` — La velocità reale si avvicina a quella desiderata in modo morbido (accelerazione/frenata regolari a qualunque numero di fotogrammi). Se congelato, ferma tutto. La riga 509 è vuota.

**r. 510–513** `const moved = moveWithCollisions(r.pos, wantX, wantZ, moveOpts)` — Calcola lo spostamento di questo passo e lo applica rispettando i box di collisione e le aree calpestabili: contro un muro il player scivola lungo il muro invece di attraversarlo. La riga 513 è vuota.

**r. 514–520** `r.stuckFor = ... < want * 0.2 ? r.stuckFor + dt : 0` — Se durante un percorso il player avanza meno del 20% di quanto vorrebbe per più di 0,6 secondi, il percorso viene abbandonato invece di spingere per sempre contro un ostacolo. Valori scritti nel codice. La riga 520 è vuota.

**r. 521–526** `if (r.faceYaw !== null && now - r.lastLookInput > 300) {` — Rotazione dolce verso un angolo richiesto (per esempio verso l'espositore all'arrivo), sospesa se l'utente ha mosso la visuale negli ultimi 300 ms. Finita quando manca meno di mezzo grado circa. Fine del passo di simulazione.

**r. 527–531** `useFrame((_, delta) => {` — Il cuore del componente: `useFrame` esegue questo codice a ogni fotogramma. `delta` è il tempo trascorso dal fotogramma precedente. La riga 531 è vuota.

**r. 532–537** `const commands = usePlayerStore.getState().drain()` — Ritira i comandi accodati dall'interfaccia. Durante il Focus il player è sospeso e i comandi vengono scartati (non rimandati a dopo). Altrimenti li esegue. La riga 537 è vuota.

**r. 538–539** `// Teletrasporto ... if (r.teleport && now >= r.teleport.swapAt) {` — Se un teletrasporto è in corso ed è arrivato il momento (schermo nero)…

**r. 540–550** `r.pos.x = w.position[0] ... fading: false` — …sposta il player sul waypoint, lo fa guardare verso il `lookAt` del waypoint, raddrizza la testa, annulla percorsi e rotazioni e spegne la dissolvenza, che si riapre sulla nuova posizione.

**r. 551–558** `let remaining = Math.min(delta, I.maxCatchUp) ... step(dt, now)` — Fa avanzare la simulazione del tempo reale trascorso, a passi di al massimo `navigation.input.maxStepDt` (0,05 s): così anche a pochi fotogrammi al secondo la camminata resta alla velocità giusta e non attraversa i muri. Oltre `maxCatchUp` (0,25 s, per esempio tornando da un'altra scheda del browser) si accetta un leggero rallentamento invece di un salto. La riga 558 è vuota.

**r. 559–561** `camera.position.set(r.pos.x, P.eyeHeight, r.pos.z)` — Mette la camera dove sta il player, all'altezza degli occhi `navigation.player.eyeHeight` (1,65 m), con direzione e inclinazione calcolate. La riga 561 è vuota.

**r. 562–565** `// Prossimità ai POI con isteresi ... let activeId = null` — Inizio del calcolo di vicinanza agli hotspot. "Isteresi" vuol dire usare soglie diverse per accendere e spegnere, così l'hotspot non lampeggia quando si sta proprio sul bordo.

**r. 566–577** `const { showRadius, activateRadius, hideRadius } = poi.proximity` — Per ogni POI: compare (semitrasparente) sotto `showRadius`, sparisce sopra `hideRadius`, diventa attivo (pieno) sotto `activateRadius`, e smette di essere attivo solo oltre il 115% di quella distanza (1,15 è nel codice). Le tre distanze sono per POI, in `storeConfig.pois[].proximity` (oggi 7 / 3,2 / 9 m): cambiarle fa comparire gli hotspot prima o dopo. Fra i POI attivi viene scelto il più vicino.

**r. 578–582** `if (changed || store.activePoiId !== activeId) {` — Solo se qualcosa è cambiato, scrive gli stati nello store (gli hotspot e i suggerimenti dell'HUD si aggiornano). Scrivere a ogni fotogramma farebbe ridisegnare l'interfaccia inutilmente. La riga 582 è vuota.

**r. 583–588** `if (now - r.lastPublish > 100) {` — Circa 10 volte al secondo (ogni 100 ms) comunica posizione, direzione e zona attuale all'interfaccia: minimappa e HUD si aggiornano senza pesare sul disegno 3D.

**r. 589–592** `}) return null }` — Fine del ciclo per fotogramma. Il componente non disegna nulla di suo (`return null`): fa solo muovere la camera.

## `src/scene/player/FocusCameraRig.jsx` (124 righe)

Guida la camera durante il Focus Mode: la porta dolcemente dalla posizione del visitatore alla posa di Focus dell'espositore, la tiene lì con un leggero movimento "che respira", e all'uscita la riporta esattamente dove era. Inquadra il capo nella parte di schermo lasciata libera dal pannello del Focus. Lo monta `src/scene/StoreCanvas.jsx`. Le pose e i tempi si cambiano in config (`displays[].focusCamera`: posizione, bersaglio, fov, `enterMs`, `exitMs`; `focus.idleDrift`, `focus.minHorizontalFov`, `focus.maxVerticalFov`); la logica degli stati qui sotto è delicata e va lasciata com'è.

**r. 1–6** `import { useEffect, useMemo, useRef } from 'react'` — Strumenti di React, React Three Fiber e three, lo store dell'app e i calcoli d'inquadratura di `lib/framing.js` (campo visivo per lo schermo, parte di schermo libera, inquadratura del Focus). La riga 6 è vuota.

**r. 7–9** `const ease = (t) => (t < 0.5 ? 4 * t * t * t : ...)` — `ease` rende il movimento morbido: parte piano, accelera, rallenta all'arrivo. `lerp` calcola un valore intermedio fra due (a metà strada, a un terzo…). La riga 9 è vuota.

**r. 10–16** `/** Camera del Focus Mode. ...` — Commento: all'ingresso la camera va dalla posa corrente alla posa del Focus, all'uscita torna dove l'aveva lasciata il player; si interpolano posizione, orientamento e campo visivo; da fermi c'è una piccola deriva.

**r. 17–22** `* Il capo si inquadra nella parte di schermo ...` — Commento: il capo si inquadra sopra il pannello (telefono in verticale) o alla sua sinistra (orizzontale e desktop); l'inquadratura si ricalcola a ogni fotogramma, quindi segue il pannello che compare o il telefono che ruota.

**r. 23** `export default function FocusCameraRig({ config, ... }) {` — Inizio del componente. Riceve il config e l'informazione "movimento ridotto" (preferenza di accessibilità del sistema: se attiva, niente animazioni).

**r. 24–26** `const { camera, size } = useThree()` — Prende camera e dimensioni dello schermo; le dimensioni vengono tenute sempre aggiornate in una scatola (`sizeRef`) leggibile a ogni fotogramma.

**r. 27–29** `const tr = useRef(null)` — Tre memorie: la transizione in corso (`tr`, ingresso o uscita), la posa di Focus dell'espositore e la vista attuale (campo visivo e spostamento del centro dell'immagine).

**r. 30–33** `const helper = useMemo(() => new THREE.PerspectiveCamera(), [])` — Una camera "d'appoggio" invisibile, usata solo per calcolare l'orientamento che guarda il bersaglio; e un elenco degli espositori per id. La riga 33 è vuota.

**r. 34–39** `const framingFor = (fc) => {` — Calcola l'inquadratura ideale: legge il rettangolo del pannello del Focus dallo store, ricava la parte di schermo libera e chiede a `focusFraming` il campo visivo e lo spostamento del centro. Usa `focus.minHorizontalFov` (34°) e `focus.maxVerticalFov` (72°) del config.

**r. 40–41** `const playerFov = () => fovForAspect(...)` — Il campo visivo del player per lo schermo attuale, lo stesso calcolo del controller: serve per tornare giusti all'uscita. La riga 41 è vuota.

**r. 42–51** `const applyView = (fov, x, y) => { ... camera.setViewOffset(...)` — Applica alla camera un campo visivo e uno spostamento del centro dell'immagine (`setViewOffset`): il capo si sposta nella parte libera dello schermo senza muovere la camera. Se lo spostamento è praticamente nullo lo toglie del tutto (`clearViewOffset`), così il player non eredita nulla.

**r. 52–53** `const snapshot = () => ({ pos: camera.position.clone(), ...` — Riga vuota e "fotografia" della camera in questo istante (posizione, orientamento, vista): è il punto di partenza di ogni transizione.

**r. 54–58** `useEffect(() => useAppStore.subscribe((s, prev) => {` — Riga vuota e sottoscrizione allo store dell'app: reagisce solo quando cambia lo stato del Focus. Il Focus è una "macchina a stati": passa sempre per `idle` (fermo) → `entering` (in entrata) → `focused` (davanti al capo) → `exiting` (in uscita) → `idle`. La riga 58 è vuota.

**r. 59–66** `if (f.state === 'entering') {` — All'ingresso: prende la posa di Focus dell'espositore dal config (`displays[].focusCamera`), calcola l'orientamento che guarda il `target` e avvia la transizione d'ingresso dalla posa attuale. Durata `focusCamera.enterMs` (1100 ms), zero con movimento ridotto. La riga 66 è vuota.

**r. 67–74** `if (f.state === 'exiting') { const r = f.returnPose` — All'uscita: ricostruisce la posa salvata dal player all'ingresso e avvia la transizione di ritorno dalla posizione attuale della camera (anche a metà ingresso). Durata `focusCamera.exitMs` (800 ms).

**r. 75–80** `useFrame(({ clock }, delta) => { const t = tr.current` — Riga vuota e codice eseguito a ogni fotogramma. Se c'è una transizione, calcola a che punto è (da 0 a 1) e la ammorbidisce con `ease`.

**r. 81–86** `if (t.kind === 'enter') {` — Ingresso: l'inquadratura d'arrivo si ricalcola a ogni fotogramma (il pannello compare proprio durante l'ingresso); posizione, orientamento (con "slerp", rotazione senza scatti), campo visivo e spostamento si avvicinano alla meta.

**r. 87–91** `} else { camera.position.lerpVectors(t.from.pos, t.to.pos, e)` — Uscita: stessa cosa verso la posa del player, con campo visivo del player e spostamento a zero.

**r. 92–102** `if (k >= 1) { tr.current = null ... store.finishFocusExit()` — Transizione finita. Dopo l'ingresso lo stato passa a `focused` (solo se nel frattempo non si è già chiesto di uscire). Dopo l'uscita rimette la vista del player e chiude il Focus (`idle`): da lì `PlayerController` riprende la camera.

**r. 103–110** `if (...focus.state === 'focused' && focusPose.current) {` — Riga vuota. Da fermi nel Focus: se il telefono ruota o il pannello cambia altezza (altro capo), l'inquadratura raggiunge la nuova meta con una breve rincorsa invece che a scatti (subito con movimento ridotto). Il 10 è la rapidità della rincorsa, scritta nel codice.

**r. 111–121** `const d = config.focus.idleDrift ... camera.position.set(` — La "deriva": la camera oscilla di pochissimo attorno alla posa di Focus, così l'immagine non è immobile. Ampiezza e durata di un ciclo in `focus.idleDrift` (3,5 cm, 9 secondi): aumentare l'ampiezza rende il movimento più visibile. Spenta con movimento ridotto.

**r. 122–124** `return null }` — Riga vuota; il componente non disegna nulla, muove solo la camera.

## `src/scene/player/Hotspots.jsx` (98 righe)

Disegna gli hotspot, le etichette arancio fluttuanti sopra gli espositori e il Lookbook, con il filo che li collega al pavimento. Il loro stato (nascosto, visibile, attivo) lo decide `PlayerController` in base alla distanza; qui si decide solo come appaiono. Lo monta `StoreCanvas.jsx` passando `config.pois` e `config.navigation.hotspot`. Colore, larghezza, ampiezza e periodo dell'ondeggiamento si cambiano in `navigation.hotspot`; i testi nelle etichette sono i `label` dei POI. Da lasciare com'è il fatto che gli hotspot restino sempre montati (scelta fatta per evitare scatti su telefono).

**r. 1–7** `import { useEffect, useMemo, useRef, useState } from 'react'` — Strumenti di React e della scena, i colori del sito (`designTokens`), le funzioni che disegnano l'etichetta come immagine (`canvasText.js`) e i due store. La riga 7 è vuota.

**r. 8–15** `/** Indicatori fluttuanti dei POI. ...` — Commento: tre stati (nascosto = non disegnato, visibile = semitrasparente, attivo = pieno e un po' più grande); l'etichetta guarda sempre la camera e un filo sottile la ancora al pavimento.

**r. 16** `function Hotspot({ poi, texture, state, style }) {` — Il singolo hotspot: riceve il POI, l'immagine dell'etichetta, lo stato e lo stile.

**r. 17–21** `const group = useRef() ... const hidden = state === 'hidden'` — Riferimenti all'etichetta e al suo materiale, memoria di "era nascosto", una fase casuale (così gli hotspot non ondeggiano tutti insieme) e se è nascosto ora.

**r. 22–25** `useFrame(({ camera, clock }) => {` — Riga vuota; a ogni fotogramma, se nascosto, si limita a ricordarlo.

**r. 26–31** `if (wasHidden.current) { ... group.current.scale.setScalar(1)` — Quando ricompare riparte da semitrasparente e dimensione normale, invece di riprendere da com'era quando è sparito.

**r. 32** `group.current.quaternion.copy(camera.quaternion)` — L'etichetta prende lo stesso orientamento della camera: si vede sempre di fronte.

**r. 33–34** `group.current.position.y = Math.sin(t) * style.bob` — Ondeggiamento su e giù: ampiezza `navigation.hotspot.bob` (6 cm) e durata di un ciclo `bobPeriodSeconds` (3,2 s).

**r. 35–37** `const target = state === 'active' ? 1.12 : 1` — Da attivo l'etichetta cresce del 12%, avvicinandosi gradualmente (0,15 per fotogramma). Valori scritti nel codice.

**r. 38–43** `const o = state === 'active' ? 1 : 0.55` — Opacità: piena da attivo, 55% da solo visibile, con passaggio graduale. Valori nel codice. La riga 43 è vuota.

**r. 44–45** `const [x, y, z] = poi.anchor` — La posizione dell'hotspot nello spazio, presa da `pois[].anchor` nel config. La riga 45 è vuota.

**r. 46–49** `<group position={[x, y, z]} visible={!hidden} ...>` — L'hotspot è sempre presente nella scena e viene solo reso invisibile: smontarlo e rimontarlo ricreava risorse grafiche a ogni avvicinamento. Il segno `warmup` fa sì che venga disegnato una volta durante il caricamento, per evitare uno scatto al primo uso.

**r. 50–53** `<cylinderGeometry args={[0.006, 0.006, y, 4]} />` — Il filo verticale: un cilindro sottilissimo dall'etichetta al pavimento, colore `navigation.hotspot.pinColor`, trasparente al 35%.

**r. 54–59** `<planeGeometry args={[style.width, style.width / 2]} />` — L'etichetta vera e propria: un rettangolo largo `navigation.hotspot.width` (0,9 m) e alto la metà, con sopra l'immagine dell'etichetta.

**r. 60–63** `)` — Chiusura dell'hotspot singolo. La riga 63 è vuota.

**r. 64** `export default function Hotspots({ pois, style }) {` — Il componente principale, che crea un hotspot per ogni POI.

**r. 65–69** `const states = usePlayerStore((s) => s.poiStates)` — Legge dallo store gli stati di vicinanza e se il Focus è in corso; prepara lo spazio per le immagini delle etichette. Leggere un campo dello store così significa "ridisegnami quando cambia". La riga 69 è vuota.

**r. 70–72** `useEffect(() => { let alive = true; let made = null` — Inizio della preparazione delle etichette.

**r. 73–77** `whenFontsReady().then(() => {` — Aspetta che i caratteri del sito siano caricati, poi disegna un'immagine per ogni etichetta con il testo `label` del POI, nel colore `navigation.hotspot.color` e col colore del testo dai token.

**r. 78–82** `for (const t of Object.values(made)) gl.initTexture(t)` — Manda subito le immagini alla scheda grafica (non al primo avvicinamento, che su telefono causava uno scatto) e le rende disponibili.

**r. 83–88** `return () => { alive = false; if (made) ... t.dispose() }` — Pulizia: se la scena sparisce, libera le immagini dalla memoria grafica. La riga 88 è vuota.

**r. 89** `if (!textures) return null` — Finché le etichette non sono pronte non disegna nulla.

**r. 90–92** `<group visible={!inFocus}>` — Durante il Focus tutti gli hotspot si nascondono (senza smontarli).

**r. 93–98** `{pois.map((poi) => ( <Hotspot key={poi.id} ...` — Un hotspot per ogni POI, con il suo stato (nascosto se non ancora calcolato). Chiusura del file.

## `src/scene/player/MoveFeedback.jsx` (83 righe)

Mostra la conferma visiva dei tocchi: un anello ellittico (la forma del logo) sul punto toccato, arancio se raggiungibile e grigio se no, e la linea tratteggiata del percorso che il player sta seguendo. Legge `ping` e `route` da `usePlayerStore`, scritti da `PlayerController`. Lo monta `StoreCanvas.jsx` passando `config.navigation.feedback`: durata dell'anello (`pingMs`) e colore della linea (`pathColor`) si cambiano lì. Da non cambiare la scelta di un solo anello e una sola linea riusati: era la cura a una perdita di memoria e a scatti misurati.

**r. 1–6** `import { useEffect, useMemo, useRef } from 'react'` — Strumenti di React, del ciclo dei fotogrammi, di three, la forma e i colori del marchio (`brandMotif`, `tokens`) e lo store del player. La riga 6 è vuota.

**r. 7–12** `/** Conferma visiva dei tap: ...` — Commento: ellisse del marchio sul punto toccato e linea del percorso; vedere il percorso è anche una prova che aggira colonne e mobili.

**r. 13** `function Ping({ ping, durationMs }) {` — L'anello di conferma.

**r. 14–18** `useEffect(() => { born.current = performance.now() }, [ping?.id])` — Un solo anello riusato: a ogni nuovo tocco (nuovo `id`) si segna l'ora di nascita e l'animazione riparte.

**r. 19–26** `const t = Math.min(1, (... - born.current) / durationMs)` — A ogni fotogramma: l'anello si allarga dal 60% al 120% e svanisce, nel tempo `navigation.feedback.pingMs` (650 ms). La forma è schiacciata secondo il rapporto dell'ellisse del logo (`brandMotif.oval.ratio`). Finita l'animazione diventa invisibile.

**r. 27–31** `<mesh ref={mesh} position={[ping?.x ?? 0, 0.02, ...]}` — L'anello è appoggiato a 2 cm dal pavimento, disteso orizzontale, nel punto toccato; è nascosto all'inizio e segnato `warmup` per essere disegnato una volta al caricamento.

**r. 32** `<ringGeometry args={[0.82, 1, 48]} />` — La forma: un anello sottile (raggio interno 82% di quello esterno).

**r. 33–34** `color={ping?.ok === false ? ...muted : ...flame}` — Grigio se il punto non è raggiungibile, Flame Orange se lo è. Colori dai token del design (`designTokens.js`).

**r. 35–38** `</mesh> ) }` — Chiusura dell'anello. La riga 38 è vuota.

**r. 39–40** `const toPoints = (points) => points.map(...)` — Trasforma i punti del percorso in punti 3D a 2,5 cm dal pavimento. La riga 40 è vuota.

**r. 41–46** `/** Una sola linea per tutta la visita: ...` — Commento: una sola linea per tutta la visita, a cui si cambia solo la forma; ricrearla a ogni percorso faceva ricompilare il suo programma grafico.

**r. 47** `function RouteLine({ route, color }) {` — La linea del percorso.

**r. 48–49** `LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.18` — L'aspetto della linea: tratteggio di 25 cm con spazi di 18 cm, opaca all'80%. Questi valori sono scritti qui; il colore viene da `navigation.feedback.pathColor`.

**r. 50–57** `const l = new THREE.Line(...) ... l.userData.warmup = true` — Crea la linea con due punti coincidenti (una forma valida ma invisibile, per il riscaldamento), nascosta, sempre considerata dal disegno e segnata per il riscaldamento.

**r. 58–66** `useEffect(() => { if (!route) { line.visible = false; return }` — Riga vuota. Quando arriva un nuovo percorso, sostituisce la forma della linea con i nuovi punti, ricalcola il tratteggio, libera la forma vecchia e mostra la linea. Senza percorso la nasconde.

**r. 67–71** `line.geometry.dispose(); line.material.dispose()` — Riga vuota e pulizia: allo smontaggio della scena libera forma e materiale (React Three Fiber non lo fa da solo per questo tipo di oggetto). Poi inserisce la linea nella scena.

**r. 72–73** `}` — Chiusura. La riga 73 è vuota.

**r. 74–76** `export default function MoveFeedback({ feedback }) {` — Il componente principale: legge dallo store l'ultimo tocco (`ping`) e il percorso (`route`).

**r. 77–83** `<Ping ping={ping} durationMs={feedback.pingMs} />` — Disegna l'anello e la linea con i valori del config. Fine del file.

## `src/state/useAppStore.js` (94 righe)

È lo store principale dell'app, creato con Zustand: un contenitore di dati condiviso da cui ogni componente legge solo ciò che gli serve, e che si ridisegna solo quando quel dato cambia. Contiene la fase dell'app (avvio, istruzioni, esplorazione), il menu, i messaggi brevi, la macchina a stati del Focus e la pila delle schede aperte. Lo usano quasi tutti: scena 3D, HUD, menu, schede, benchmark. Si può cambiare senza rischi la durata predefinita dei messaggi (r. 57); i nomi degli stati e dei campi invece sono letti da molti file e non vanno rinominati.

**r. 1–2** `import { create } from 'zustand'` — Carica Zustand, la libreria degli store. La riga 2 è vuota.

**r. 3–9** `/** Stato condiviso fra la UI 2D e la scena 3D. ...` — Commento: si usa Zustand e non il "Context" di React perché la posizione cambia molte volte al secondo e ogni componente deve aggiornarsi solo per il dato che usa.

**r. 10–17** `export const APP_PHASE = { BOOT: 'boot', ONBOARDING: ... }` — Le fasi dell'app: `boot` (si controlla che il dispositivo supporti la grafica 3D), `onboarding` (istruzioni, si aspetta "Entra"), `loading` (caricamento della scena), `exploring` (si visita), `unsupported` (dispositivo non adatto). La riga 17 è vuota.

**r. 18** `export const useAppStore = create((set, get) => ({` — Crea lo store. `set` cambia i dati, `get` li legge.

**r. 19–20** `phase: APP_PHASE.BOOT, device: null,` — Si parte dalla fase di avvio; il profilo del dispositivo viene riempito più tardi.

**r. 21–25** `menuOpen: false, activeZoneId: null, ...` — Menu chiuso, zona attiva, inquadratura fissa corrente (usata nella Fase 2), preferenza "movimento ridotto" e fase del caricamento.

**r. 26–27** `notice: null, // messaggio breve mostrato sopra la scena` — Il messaggio breve in sovraimpressione (nessuno all'inizio). La riga 27 è vuota.

**r. 28–32** `focus: { state: 'idle', displayId: null, ... },` — La macchina a stati del Focus: stato attuale (`idle → entering → focused → exiting → idle`), espositore guardato, quale capo dell'espositore è mostrato e posa a cui tornare. Si può uscire in qualunque momento, anche durante l'ingresso.

**r. 33–36** `focusPanelRect: null,` — Il rettangolo occupato sullo schermo dal pannello del Focus, scritto dal pannello stesso: la camera inquadra il capo nella parte libera. La riga 36 è vuota.

**r. 37–41** `dialogs: [],` — La pila delle schede aperte (prodotto, Lookbook, carrello, pagine legali): "Indietro" toglie l'ultima, "Chiudi" le toglie tutte. Finché la pila non è vuota il player sta fermo. La riga 41 è vuota.

**r. 42–46** `gpuLost: false, benchRunning: false,` — Se il contesto grafico è andato perso (si mostra "Riprova") e se è in corso il benchmark (input dell'utente ignorato). La riga 46 è vuota.

**r. 47–50** `setPhase: (phase) => set({ phase }),` — Comandi semplici per cambiare fase, profilo del dispositivo, movimento ridotto e zona attiva.

**r. 51–52** `setShot: (shot) => set({ activeShotId: shot.id, ... }),` — Cambia inquadratura fissa e insieme la sua zona, così HUD e minimappa restano coerenti.

**r. 53–54** `setLoadStage: (loadStage) => set({ loadStage }),` — Aggiorna la fase del caricamento. La riga 54 è vuota.

**r. 55–62** `showNotice: (text, ms = 2600) => {` — Mostra un messaggio breve che sparisce da solo dopo 2,6 secondi (valore predefinito modificabile qui; chi chiama può passarne un altro). Un numero identificativo impedisce che il timer di un messaggio vecchio cancelli quello nuovo. La riga 62 è vuota.

**r. 63–65** `toggleMenu: () => set({ menuOpen: !get().menuOpen }),` — Apre/chiude il menu, oppure lo chiude. La riga 65 è vuota.

**r. 66–69** `enterFocus: (displayId, returnPose) => {` — Avvia il Focus (stato `entering`) solo se non ce n'è già uno, partendo dal primo capo e chiudendo il menu.

**r. 70–73** `exitFocus: () => { ... set({ focus: { ...f, state: 'exiting' } })` — Chiede l'uscita dal Focus, valida sia durante l'ingresso sia da fermi.

**r. 74–76** `setFocusState: (state) => set(...)` — Cambia lo stato del Focus (usato dalla camera per passare a `focused`), registra il rettangolo del pannello e chiude del tutto il Focus tornando a `idle` a fine uscita.

**r. 77–80** `cycleProduct: (delta, count) => set((s) => ({` — Passa al capo successivo o precedente dello stesso espositore, ricominciando dal primo dopo l'ultimo. La riga 80 è vuota.

**r. 81–87** `openDialog: (kind, id) => {` — Apre una scheda. Se quella scheda è già nella pila (per esempio Lookbook → capo → di nuovo lo stesso Lookbook) si torna a quel livello invece di accumularne altri, così "Indietro" non gira in tondo.

**r. 88–90** `backDialog: () => set(...slice(0, -1)...)` — "Indietro" toglie l'ultima scheda; "Chiudi" svuota la pila. La riga 90 è vuota.

**r. 91–94** `enterStore: () => { if (get().phase === APP_PHASE.ONBOARDING) ...` — Il bottone "Entra": dalle istruzioni si passa all'esplorazione. Fine dello store.

## `src/state/usePlayerStore.js` (33 righe)

Store del player: la "bacheca" dove `PlayerController` pubblica posizione, zona, hotspot attivi, percorso e tocchi, e dove l'interfaccia lascia i suoi comandi (teletrasporto, vai a…). Lo usano minimappa, HUD, barra "Vai a", velo della dissolvenza, hotspot, linea del percorso e benchmark. Non contiene valori da tarare: i campi sono letti da molti file e non vanno rinominati.

**r. 1–2** `import { create } from 'zustand'` — Carica Zustand. La riga 2 è vuota.

**r. 3–13** `/** Stato del player condiviso con l'interfaccia. ...` — Commento: la simulazione vive nel controller e qui arriva solo una "fotografia" circa 10 volte al secondo più gli eventi; l'interfaccia comanda il player accodando comandi, che il controller esegue al fotogramma successivo.

**r. 14** `export const usePlayerStore = create((set, get) => ({` — Crea lo store.

**r. 15–16** `pose: { x: 0, z: 0, yaw: 0 }, zoneId: null,` — Posizione e direzione del player (per la minimappa) e zona del negozio in cui si trova.

**r. 17** `pointerLocked: false,` — Se il cursore del mouse è catturato dalla scena.

**r. 18–19** `poiStates: {}, activePoiId: null,` — Lo stato di ogni hotspot (nascosto, visibile, attivo) e quello attivo più vicino.

**r. 20–22** `route: null, ping: null, fading: false,` — Il percorso automatico in corso (per la linea tratteggiata), l'ultimo tocco (per l'anello) e se è in corso la dissolvenza del teletrasporto.

**r. 23–24** `resumePose: null,` — La posa da cui ripartire se la scena viene ricostruita dopo una perdita del contesto grafico.

**r. 25–26** `commands: [],` — La coda dei comandi in attesa. La riga 26 è vuota.

**r. 27** `issue: (command) => set(...)` — Aggiunge un comando in coda (per esempio `{ type: 'teleport', waypointId }`).

**r. 28–32** `drain: () => { const commands = get().commands ...` — Il controller ritira tutti i comandi in coda e la svuota.

**r. 33** `}))` — Fine dello store.

## `src/state/usePerfStore.js` (11 righe)

Piccolo store con le misure delle prestazioni da mostrare nell'HUD `?perf=1`. Lo scrive `src/scene/debug/PerfProbe.jsx` e lo leggono `PerfHud` e il pannello del benchmark. Non c'è nulla da tarare.

**r. 1–2** `import { create } from 'zustand'` — Carica Zustand. La riga 2 è vuota.

**r. 3–6** `/** Fotografia delle prestazioni per l'HUD, ...` — Commento: i dati arrivano poche volte al secondo; i campioni grezzi stanno in `lib/perf.js`.

**r. 7** `export const usePerfStore = create(() => ({` — Crea lo store (senza comandi: chi scrive usa direttamente `setState`).

**r. 8–10** `stats: null, memory: null, dpr: null,` — Ultime misure (fotogrammi al secondo, tempi, oggetti disegnati), risorse occupate sulla scheda grafica e densità dei pixel dello schermo.

**r. 11** `}))` — Fine dello store.

## `src/state/useCartStore.js` (117 righe)

Store del carrello e del catalogo commerciale: carica da Shopify (o dal negozio di prova) prezzi, varianti e disponibilità, ricorda il carrello fra una visita e l'altra e gestisce aggiunte, quantità e rimozioni, con i messaggi d'errore. Lo usano la scheda prodotto, il bottone e la scheda del carrello, il menu e `App.jsx` (che lo avvia). Si cambiano in config, non qui: `commerce.maxQuantity` (massimo per riga, oggi 10), `commerce.cartStorageKey` (nome con cui il browser ricorda il carrello) e i testi `copy.cart.*`. La logica di ripristino e di nuovo tentativo è stata corretta dopo difetti reali: da non toccare senza i test `e2e-phase8a`.

**r. 1–4** `import { create } from 'zustand'` — Carica Zustand, il config e `getProvider`, che restituisce il fornitore commerciale attivo (Shopify, negozio di prova o nessuno). La riga 4 è vuota.

**r. 5** `const { commerce } = storeConfig` — Scorciatoia per le impostazioni `storeConfig.commerce`.

**r. 6** `const readId = () => { try { ... localStorage.getItem` — Legge dalla memoria del browser l'identificativo del carrello salvato; se il browser la blocca (navigazione privata) restituisce "niente" senza errori.

**r. 7** `const writeId = (id) => { try { ... localStorage.setItem` — Salva l'identificativo del carrello, o lo cancella se vuoto; se la memoria è bloccata il carrello vive solo finché la pagina resta aperta.

**r. 8–13** `/** Carrello e catalogo commerciale. ...` — Riga vuota e commento: prezzi e disponibilità vengono solo dal fornitore; se non risponde, il capo risulta "non disponibile", mai con un prezzo di storeConfig.

**r. 14** `export const useCartStore = create((set, get) => ({` — Crea lo store.

**r. 15–20** `catalog: {}, catalogStatus: 'idle', cart: null, ...` — Il catalogo (capi per `handle`, il nome del capo su Shopify), lo stato del suo caricamento, il carrello, se un'operazione è in corso e l'ultimo errore da mostrare. La riga 20 è vuota.

**r. 21–27** `init: async () => { if (!getProvider()) return` — Avvio: se il commercio è attivo carica insieme catalogo e carrello salvato. "async" indica un'operazione che aspetta la rete. La riga 27 è vuota.

**r. 28–31** `loadCatalog: async () => { ... set({ catalogStatus: 'loading' })` — Carica il catalogo, ma non se è già in caricamento o già pronto (dopo un errore invece si può riprovare: è il "Riprova" della scheda).

**r. 32–35** `const handles = storeConfig.products.map(...)` — Chiede al fornitore i capi elencati in `storeConfig.products[].commerce.handle` e li conserva; stato "pronto".

**r. 36–41** `} catch (e) { console.warn(...); set({ catalogStatus: 'error' })` — Se fallisce, segna l'errore (l'interfaccia mostrerà "non disponibile"). La riga 41 è vuota.

**r. 42–45** `restoreCart: async () => { ... if (!provider || !id) return` — Ripristino del carrello salvato, solo se c'è un fornitore e un carrello ricordato.

**r. 46–52** `const cart = await provider.getCart(id)` — Chiede il carrello al fornitore. Se nel frattempo l'utente ha già creato un carrello nuovo aggiungendo un capo, vale il suo. Se il carrello salvato non esiste più (scaduto o già pagato) lo dimentica: se ne creerà uno nuovo al primo acquisto.

**r. 53–57** `} catch (e) { console.warn(...) }` — Se il ripristino fallisce, lo annota nella console senza disturbare l'utente. La riga 57 è vuota.

**r. 58–60** `clearError: () => { if (get().error) set({ error: null }) },` — Cancella l'ultimo errore, così aprendo un'altra scheda non lo si trascina dietro. La riga 60 è vuota.

**r. 61–67** `run: async (operation, { retryOnNewCart = false } = {}) => {` — Il motore di ogni operazione sul carrello: una alla volta (se una è in corso, la nuova viene ignorata); segna "in corso" e cancella l'errore precedente.

**r. 68–76** `const attempt = async () => { let cart = get().cart; if (!cart) {` — Un tentativo: se non c'è ancora un carrello lo crea dal fornitore e lo ricorda nel browser, poi esegue l'operazione richiesta.

**r. 77–80** `try { let cart; try { cart = await attempt()` — Prova a eseguire.

**r. 81–89** `const gone = old && await provider.getCart(old.id)...` — Se fallisce, controlla se il carrello salvato non esiste più (scaduto, o pagato in un'altra scheda). In quel caso lo dimentica e, solo per le aggiunte, riprova una volta su un carrello nuovo; altrimenti l'errore prosegue.

**r. 90–96** `if (cart.warnings?.length) {` — Se il fornitore ha eseguito l'operazione solo in parte (per esempio merce esaurita), mostra il carrello com'è davvero e l'avviso `copy.cart.stockWarning`, senza confermare.

**r. 97–98** `set({ cart, pending: false }); return true` — Tutto bene: aggiorna il carrello e conferma.

**r. 99–105** `error: storeConfig.copy.cart.error` — Errore definitivo: mostra il testo `copy.cart.error`. La riga 105 è vuota.

**r. 106–112** `add: (variantId, quantity = 1) => {` — Aggiunge una variante (capo + taglia + colore). Rispetta il massimo per riga `commerce.maxQuantity`: se è già raggiunto mostra `copy.cart.maxReached`, altrimenti aggiunge al massimo quanto manca. È l'unica operazione che riprova su un carrello nuovo.

**r. 113–115** `setQuantity: (lineId, quantity) => get().run(...` — Cambia la quantità di una riga: a zero o meno la rimuove, altrimenti la imposta senza superare il massimo.

**r. 116–117** `remove: (lineId) => get().run(...removeLines...)` — Rimuove una riga dal carrello. Fine dello store.

## `src/state/useLegalStore.js` (25 righe)

Store delle pagine legali (condizioni di vendita, recesso, privacy…) lette dal fornitore commerciale. Le carica la prima volta che servono (menu o scheda aperti) e le tiene in memoria. Lo usano il menu e `src/ui/legal/LegalSheet.jsx`. Quali pagine chiedere e in che ordine si decide in `storeConfig.commerce.policies`; i testi veri si scrivono su Shopify, non qui.

**r. 1–4** `import { create } from 'zustand'` — Carica Zustand, il config e la funzione che dà il fornitore attivo. La riga 4 è vuota.

**r. 5–9** `/** Pagine legali lette dal fornitore ...` — Commento: caricate alla prima richiesta e tenute in memoria; dopo un errore, una nuova richiesta riprova.

**r. 10** `export const useLegalStore = create((set, get) => ({` — Crea lo store.

**r. 11–13** `status: 'idle', policies: [],` — Stato del caricamento e l'elenco delle pagine (solo quelle pubblicate sul negozio, nell'ordine del config). La riga 13 è vuota.

**r. 14–17** `load: async () => { ... set({ status: 'loading' })` — Avvia il caricamento, ma non se il commercio è spento, se è già in corso o se è già fatto.

**r. 18–19** `policies: await provider.getPolicies(...policies)` — Chiede al fornitore le pagine elencate in `commerce.policies` e le conserva.

**r. 20–24** `} catch (e) { ... set({ status: 'error' })` — Se fallisce, lo annota e segna l'errore: alla prossima apertura riproverà.

**r. 25** `}))` — Fine dello store.
