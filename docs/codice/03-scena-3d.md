# Scena 3D (src/scene, senza il player)

Questi file costruiscono il negozio tridimensionale che si vede nel browser: il "contenitore" 3D (`StoreCanvas`), il pavimento, i muri, l'architettura, la parete del brand, le scritte a terra, le ombre finte, le luci, i corpi dei faretti, gli espositori con i capi e due strumenti di verifica (collider visibili e misura delle prestazioni). Non contengono quasi mai dati del negozio: posizioni, dimensioni, colori, materiali e intensità delle luci arrivano da `src/config/storeConfig.js`. Per spostare, ricolorare o aggiungere qualcosa si cambia di norma il config, non questi file. Il movimento del visitatore (cartella `src/scene/player/`) è spiegato altrove.

## `src/scene/StoreCanvas.jsx` (306 righe)

È il componente principale della scena: crea il Canvas (la superficie su cui three.js disegna in 3D) e ci mette dentro tutto il negozio, la camera, il limitatore di fotogrammi, il riscaldamento della GPU e la sonda delle prestazioni. Lo usa `src/App.jsx`, che lo carica "pigramente" (solo quando serve) per non appesantire l'apertura del sito. Qui si decide l'ordine e il collegamento dei pezzi; i valori (fps, esposizione, tier grafici, colore di fondo) stanno in `storeConfig.performance` e `storeConfig.environment`. Da cambiare con cautela: un errore qui spegne l'intera scena.

**r. 1** `import { Suspense, useRef, useEffect } from 'react'` — Prende da React tre strumenti: `Suspense` (mostra "niente" finché un pezzo non è pronto), `useRef` (una scatola dove conservare un valore fra un fotogramma e l'altro) e `useEffect` (codice da eseguire quando il componente compare o cambia).

**r. 2** `import { Canvas, useFrame, useThree } from ...` — Prende dalla libreria React Three Fiber: `Canvas` (la finestra 3D), `useFrame` (codice eseguito a ogni fotogramma disegnato) e `useThree` (accesso a camera, scena e motore di disegno).

**r. 3** `import { frameScheduler } from '../lib/frameScheduler.js'` — La regola che decide quando disegnare un fotogramma per non superare gli fps desiderati (vedi `FrameLimiter` più sotto).

**r. 4–5** `import * as THREE from 'three'` — La libreria three.js intera (vettori, colori, costanti). La riga 5 è vuota.

**r. 6–11** `import Floor from './environment/Floor.jsx'` — I pezzi dell'ambiente: pavimento, muri, architettura, parete del brand, scritte a terra, ombre "blob".

**r. 12–13** `import LightingRig from './lighting/LightingRig.jsx'` — Le luci vere e proprie e i corpi visibili dei faretti.

**r. 14** `import ColliderDebug from './debug/ColliderDebug.jsx'` — Lo strumento che mostra i collider (le scatole invisibili contro cui si urta), solo in verifica.

**r. 15–18** `import PlayerController from './player/PlayerController.jsx'` — I pezzi del visitatore: movimento, hotspot (i bollini cliccabili), segnale del tap, camera del Focus. Sono spiegati in un altro capitolo.

**r. 19–20** `import Displays from './displays/Displays.jsx'` — Gli espositori con i capi e la sonda che misura le prestazioni.

**r. 21** `import { useAppStore } from '../state/useAppStore.js'` — Lo "stato" generale dell'app (qui serve per sapere quale inquadratura fissa è attiva).

**r. 22** `import { retainGpuCaches, releaseGpuCaches } ...` — Le funzioni che tengono vivi o liberano materiali e texture condivisi nella memoria della scheda grafica.

**r. 23–24** `import { whenFontsReady } from '../lib/canvasText.js'` — Una promessa che si compie quando i font del sito sono caricati: serve prima di disegnare le scritte. Riga 24 vuota.

**r. 25–26** `const debugParams = () => new URLSearchParams(...)` — Piccola funzione che legge i parametri dell'indirizzo (per esempio `?debug=top`). Riga 26 vuota.

**r. 27–28** `const easeInOutCubic = (t) => ...` — Curva di "accelera e rallenta": rende morbido il passaggio da un'inquadratura all'altra. Riga 28 vuota.

**r. 29–35** `/** Camera della Fase 2: inquadrature statiche ...` — Commento: descrive la camera a inquadrature fisse, oggi usata solo per le verifiche con `?debug=`.

**r. 36** `function CameraRig({ camera, reducedMotion, debugPoseFor })` — Inizio del componente della camera fissa. Un componente è un pezzo di interfaccia (qui di scena) riutilizzabile, scritto come funzione.

**r. 37** `const { camera: cam } = useThree()` — Prende la camera reale di three.js, cioè l'"occhio" da cui si guarda la scena.

**r. 38** `const activeShotId = useAppStore((s) => s.activeShotId)` — Legge quale inquadratura è attiva nello stato dell'app.

**r. 39–40** `const debugPose = debugPoseFor(key)` — Legge il valore di `?debug=` e cerca la posa fissa corrispondente.

**r. 41–44** `const shot = debugPose ?? camera.shots.find(...)` — Sceglie l'inquadratura: prima la posa di verifica, poi quella attiva, altrimenti quella predefinita (`camera.defaultShotId` in storeConfig). Riga 44 vuota.

**r. 45–49** `const current = useRef({ position: ..., target: ..., fov })` — Ricorda dove si trova la camera adesso: posizione, punto guardato e fov (l'ampiezza del campo visivo, in gradi verticali).

**r. 50–51** `const transition = useRef(null)` — Ricorda il viaggio in corso verso una nuova inquadratura, se c'è. Riga 51 vuota.

**r. 52–56** `cam.near = camera.near` — Imposta le distanze minima e massima entro cui la camera vede (`near` 0,1 m e `far` 70 m in storeConfig). Oltre `far` gli oggetti spariscono. Riga 56 vuota.

**r. 57–58** `const goal = { position: ..., target: ..., fov }` — Quando cambia l'inquadratura, prepara la posa di arrivo.

**r. 59–63** `if (reducedMotion) { current.current = goal ...` — Se il visitatore ha chiesto al sistema di ridurre le animazioni, la camera salta subito alla nuova posa senza viaggio.

**r. 64–70** `transition.current = { from: ..., goal, start: ... }` — Altrimenti registra partenza, arrivo e ora d'inizio del viaggio. Riga 70 vuota.

**r. 71** `const sway = camera.idleSway` — Le impostazioni della leggera oscillazione a riposo (`camera.idleSway` in storeConfig: attiva, ampiezza 0,055 m, periodo 14 s).

**r. 72–73** `useFrame(({ clock }) => { const tr = transition.current` — Codice eseguito a ogni fotogramma: prima guarda se c'è un viaggio in corso.

**r. 74–81** `const t = Math.min(1, (performance.now() - tr.start) / ...)` — Calcola a che punto è il viaggio (da 0 a 1, in base a `camera.transitionMs` = 1400 ms nel config), lo ammorbidisce con la curva e sposta posizione, punto guardato e fov fra partenza e arrivo; a 1 il viaggio finisce.

**r. 82–83** `cam.position.copy(current.current.position)` — Mette la camera nella posizione calcolata. Riga 82 vuota.

**r. 84–88** `if (!tr && sway.enabled && !reducedMotion && !debugPose)` — Solo a riposo, con oscillazione attiva e senza posa di verifica, aggiunge un piccolo ondeggiamento sinusoidale a destra-sinistra e su-giù.

**r. 89** `cam.lookAt(current.current.target)` — Gira la camera verso il punto da guardare.

**r. 90–93** `if (cam.fov !== current.current.fov) {` — Se il campo visivo è cambiato lo applica e ricalcola la proiezione (necessario in three.js dopo ogni cambio di fov).

**r. 94–98** `return null` — Fine del codice per fotogramma; il componente non disegna nulla di suo, comanda solo la camera. Riga 98 vuota.

**r. 99–108** `/** Limite reale del frame rate. ...` — Commento: spiega che la scena disegna solo su richiesta e che questo ciclo la richiede a ritmo regolare, mai sopra il target (120 Hz → 60, 90 Hz → 90, 144 Hz → 72).

**r. 109–110** `function FrameLimiter({ targetFps }) { const { ...` — Inizio del limitatore; `invalidate` è il comando "disegna un fotogramma".

**r. 111–118** `const due = frameScheduler(targetFps)` — A ogni aggiornamento dello schermo (`requestAnimationFrame`) chiede alla regola se è il momento di disegnare e, se sì, chiama `invalidate()`. Quando il componente sparisce il ciclo si ferma.

**r. 119–121** `return null` — Non disegna nulla. Riga 121 vuota.

**r. 122–126** `/** Ciclo di vita della GPU legato al Canvas ...` — Commento: le cache condivise si liberano solo quando il Canvas sparisce davvero.

**r. 127–134** `function GpuLifecycle() { useEffect(() => { ...` — Alla comparsa del Canvas "prenota" le cache della scheda grafica, alla scomparsa le rilascia (con un ritardo che evita di distruggerle in un rimontaggio immediato, vedi `lib/gpuCaches.js`). Riga 134 vuota.

**r. 135–142** `/** Riscaldamento della GPU durante il caricamento ...` — Commento: prepara subito tutti gli shader (i piccoli programmi che la scheda grafica usa per colorare) e le texture, così non ci sono scatti alla prima visita di una zona. Con `?perf=1` o `?bench=1` e `&warm=0` si spegne.

**r. 143–144** `function GpuWarmup({ enabled }) { const { gl, scene ...` — Inizio; prende il motore di disegno (`gl`), la scena e la camera.

**r. 145–147** `if (!enabled) return; let alive = true` — Se spento non fa nulla; `alive` serve a non lavorare se il componente è già sparito.

**r. 148–150** `whenFontsReady().then(() => requestAnimationFrame(...` — Aspetta i font e poi due fotogrammi, perché le texture delle scritte nascono dopo i font.

**r. 151–152** `const culled = []; const shown = []` — Due elenchi per ricordare cosa verrà modificato temporaneamente.

**r. 153–154** `if (o.isMesh && o.frustumCulled) { o.frustumCulled = false` — Scorre ogni oggetto della scena. Una mesh è un oggetto visibile (forma + materiale). Normalmente three.js salta ciò che è fuori inquadratura: qui lo obbliga a considerare tutto.

**r. 155–157** `if (o.userData.warmup && !o.visible) { o.visible = true` — Rende visibili per un attimo solo gli oggetti marcati per il riscaldamento (anello del tap, linea del percorso, hotspot).

**r. 158–159** `for (const m of materials) ... gl.initTexture(v)` — Carica subito sulla scheda grafica ogni texture (immagine applicata a una superficie) usata dai materiali.

**r. 160–162** `gl.compile(scene, camera); gl.render(scene, camera)` — Fine del giro; compila tutti gli shader e disegna un fotogramma "pesante" che nessuno vede, dietro la schermata d'ingresso.

**r. 163–164** `for (const o of culled) o.frustumCulled = true` — Rimette tutto come prima: torna il salto degli oggetti fuori inquadratura e gli oggetti marcati tornano nascosti.

**r. 165** `if (debugParams().get('debug')) window.__warmedUp = true` — Solo in verifica, lascia un segnale che i test automatici leggono.

**r. 166–171** `return () => { alive = false }` — Chiude le funzioni e, alla scomparsa del componente, annulla il lavoro in attesa. Riga 171 vuota.

**r. 172** `/** Segnala "pronto" solo dopo che la scena ...` — Commento del componente seguente.

**r. 173–175** `function FirstFrameSignal({ onStage }) { const frames = ...` — Conta i fotogrammi disegnati e ricorda se il segnale è già partito.

**r. 176–183** `if (frames.current >= 2) { done.current = true; ...` — Dopo 2 fotogrammi veri avvisa l'app (`onStage('frame')`), che così può togliere la schermata di caricamento.

**r. 184–186** `return null` — Non disegna nulla. Riga 186 vuota.

**r. 187–188** `function SceneContents({ config, tier }) { const { ...` — Il contenuto del negozio. `tier` è il livello grafico scelto per il dispositivo (high, medium, low).

**r. 189** `const showColliders = debugParams().get('debug') && ...` — I collider si vedono solo con `?debug=...&colliders=1`.

**r. 190–192** `const fog = { ...environment.fog, enabled: ... }` — La nebbia: di norma come dice `environment.fog.enabled` (oggi spenta per scelta), ma `?fog=1` o `?fog=0` la forzano per un'anteprima.

**r. 193–197** `// Niente disposal qui: in StrictMode ...` — Commento: spiega perché qui non si libera memoria (lo fa `GpuLifecycle`). Righe 193 e 197 vuote.

**r. 198–199** `return ( <>` — Inizio dell'elenco dei pezzi della scena (`<>` è un contenitore invisibile).

**r. 200** `<Floor floor={environment.floor} materials={lighting.mat ...` — Il pavimento, con dati e materiali dal config.

**r. 201–206** `<Walls walls={environment.walls} ceiling=...` — Muri e soffitto.

**r. 207** `<Architecture environment={environment} materials=... />` — Colonne, pedane, binari, architrave e soglia.

**r. 208–214** `<BrandWall brandWall={environment.brandWall} ...` — La parete del brand con insegna e pannello del Lookbook.

**r. 215** `<FloorLabels zones={environment.zones} />` — Le scritte tecniche a pavimento delle zone.

**r. 216** `<Displays config={config} />` — Tutti gli espositori con i capi.

**r. 217–228** `<GroundShadows objects={[ ...columns, ...displays ]}` — Le ombre finte a terra sotto colonne ed espositori che hanno `groundShadow: true`; per gli espositori l'impronta è quella del loro collider. Compaiono solo se il tier non ha ombre vere (`maxShadowCasters` uguale a 0, cioè il tier low).

**r. 229** `<LightingRig lighting={lighting} tier={tier} fog={fog} ...` — Tutte le luci, la nebbia e il cambio di luce del Focus.

**r. 230–235** `<LightFixtures spots={lighting.spots} ...` — I corpi visibili dei faretti appesi al soffitto.

**r. 236** `{showColliders && <ColliderDebug ... />}` — Solo in verifica, mostra collider e grafo dei percorsi.

**r. 237–240** `</>` — Fine del contenuto. Riga 240 vuota.

**r. 241–242** `export default function StoreCanvas({ config, device, ... })` — Il componente esportato. Riceve il config, le caratteristiche del dispositivo e le funzioni con cui avvisa l'app (avanzamento, contesto grafico perso o restituito). Sceglie il tier grafico in `performance.tiers`.

**r. 243** `const params = debugParams()` — Legge i parametri dell'indirizzo.

**r. 244–248** `const targetFps = params.get('debug') && Number(...) > 0` — Il tetto di fotogrammi al secondo: quello del config (`performance.targetFps` = 60), salvo in verifica con `&fps=N`. Cambiarlo nel config cambia il ritmo per tutti. Riga 248 vuota.

**r. 249** `const debugKey = params.get('debug')` — Il valore di `?debug=`.

**r. 250–253** `const debugPoseFor = (key) => config.camera.debugPoses?. ...` — Trova una posa fissa: fra quelle di verifica (`camera.debugPoses`), le inquadrature (`camera.shots`) o la posa di Focus di un espositore.

**r. 254–255** `const staticView = Boolean(debugPoseFor(debugKey))` — Se c'è una posa fissa la camera resta ferma e il visitatore non si muove. Riga 255 vuota.

**r. 256–258** `useEffect(() => { onStage?.('module') }, [onStage])` — Avvisa l'app che il modulo 3D è arrivato. Riga 258 vuota.

**r. 259–260** `return ( <Canvas` — Inizio del Canvas.

**r. 261** `frameloop="demand"` — Disegna solo quando qualcuno lo chiede (il `FrameLimiter`): risparmia batteria e permette il tetto di fps.

**r. 262** `dpr={tier.dprRange}` — La densità di pixel ammessa dal tier (per esempio da 1 a 2 su high). Più alta = più nitido ma più pesante.

**r. 263** `shadows={tier.maxShadowCasters > 0}` — Attiva le ombre vere solo se il tier ne consente almeno una.

**r. 264** `gl={{ antialias: tier.antialias, ... alpha: false }}` — Impostazioni del motore: smussatura dei bordi secondo il tier, richiesta della scheda grafica più potente, fondo non trasparente.

**r. 265** `onCreated={({ gl, scene }) => {` — Codice eseguito una volta, appena il Canvas è creato.

**r. 266–268** `gl.toneMapping = THREE.ACESFilmicToneMapping` — Il "tone mapping" adatta luci forti allo schermo con una resa cinematografica; l'esposizione viene da `performance.toneMappingExposure` (0,85): alzarla schiarisce tutta la scena. La terza riga imposta lo spazio colore standard degli schermi.

**r. 269** `scene.background = new THREE.Color(config.environment.fo ...` — Il colore di fondo della scena è quello della nebbia nel config (`#060606`, il nero del negozio).

**r. 270–275** `if (params.get('debug')) { window.__scene = scene` — Solo in verifica, espone scena e motore ai test automatici.

**r. 276–280** `canvas.addEventListener('webglcontextlost', ...)` — Se il browser perde il contesto grafico (GPU resettata, app in background), lo trattiene per poterlo riavere e avvisa l'app, che mostra "Riprova"; avvisa anche quando torna.

**r. 281–283** `onStage?.('context')` — Avvisa l'app che il contesto grafico è pronto; chiude le impostazioni del Canvas.

**r. 284–285** `{/* Fase 3: la camera è gli occhi del player ...` — Commento: le pose fisse servono solo alla verifica.

**r. 286–293** `{staticView ? <CameraRig ... /> : (<PlayerController ...` — Con una posa fissa usa la camera ferma; altrimenti il visitatore che si muove e la camera del Focus.

**r. 294** `<Hotspots pois={config.pois} style={config.navigation.ho ...` — I punti d'interesse cliccabili.

**r. 295** `<MoveFeedback feedback={config.navigation.feedback} />` — L'anello e la linea che mostrano dove si sta andando dopo un tap.

**r. 296–298** `<FrameLimiter targetFps={targetFps} />` — Mette in scena limitatore di fps, segnale del primo fotogramma e ciclo di vita della memoria grafica.

**r. 299** `<GpuWarmup enabled={!(... && params.get('warm') === '0')} />` — Il riscaldamento, sempre attivo salvo `&warm=0` insieme a `?perf`, `?bench` o `?debug`.

**r. 300** `<PerfProbe monitor={config.performance.monitor} />` — La sonda delle prestazioni.

**r. 301–303** `<Suspense fallback={null}> <SceneContents ... />` — Il contenuto del negozio, dentro `Suspense`: se un pezzo non è pronto non si mostra nulla al suo posto invece di bloccare tutto.

**r. 304–306** `</Canvas> ) }` — Fine del Canvas e del componente.

## `src/scene/MergeByMaterial.jsx` (72 righe)

Contenitore che unisce in pochi oggetti tutti i pezzi fermi che ha dentro, uno per materiale, per far lavorare meno la scheda grafica. Lo usano `Walls`, `Architecture` e `Displays`. Non contiene dati del negozio: è un meccanismo tecnico e di norma non va toccato. Non ci si deve mettere dentro nulla che si muova o cambi.

**r. 1–4** `import { useLayoutEffect, useRef, useState } from 'react'` — Strumenti di React (`useLayoutEffect` esegue codice subito dopo che i pezzi sono montati, `useState` tiene un valore che, se cambia, ridisegna), three.js e la funzione che fonde più geometrie (forme) in una. Riga 4 vuota.

**r. 5–16** `/** Unisce le mesh STATICHE dei figli ...` — Commento: un manichino ha ~11 pezzi ma 4 materiali; ogni pezzo costa una "draw call" (un ordine di disegno alla scheda grafica), quindi unirli per materiale porta il costo a 4. Gli originali restano ma invisibili.

**r. 17** `export default function MergeByMaterial({ children ...` — Il componente: riceve i pezzi da unire (`children`), un interruttore e un elenco di valori che, se cambiano, fanno rifare l'unione.

**r. 18–19** `const source = useRef(); const [merged, setMerged] = ...` — Un riferimento al gruppo degli originali e l'elenco delle mesh unite.

**r. 20–22** `useLayoutEffect(() => { if (!enabled) return` — Dopo il montaggio: se l'unione è spenta non fa nulla. Riga 20 vuota.

**r. 23–24** `root.updateMatrixWorld(true)` — Calcola la posizione esatta nel mondo di ogni pezzo.

**r. 25** `const toRoot = new THREE.Matrix4().copy(root.matrixWorld ...` — Prepara il calcolo per esprimere ogni pezzo rispetto al contenitore.

**r. 26–27** `const byMaterial = new Map()` — Un elenco "materiale → pezzi che lo usano". Riga 27 vuota.

**r. 28–29** `root.traverse((o) => { if (!o.isMesh) return` — Scorre tutti i figli e considera solo le mesh.

**r. 30–32** `let g = o.geometry.index ? o.geometry.toNonIndexed() : ...` — Fa una copia della forma in un formato uniforme, requisito per poterle fondere.

**r. 33–35** `if (!['position', 'normal', 'uv'].includes(name)) ...` — Tiene solo posizione dei vertici, normali (per la luce) e coordinate delle texture; toglie il resto.

**r. 36–38** `if (!g.attributes.uv) { g.setAttribute('uv', ...` — Se la forma non ha coordinate di texture ne aggiunge di vuote, perché tutte devono averle.

**r. 39** `g.clearGroups()` — Toglie eventuali suddivisioni interne della forma.

**r. 40** `g.applyMatrix4(...)` — "Cuoce" nella copia la posizione, rotazione e scala del pezzo.

**r. 41–45** `const entry = byMaterial.get(o.material) ?? { ... }` — Aggiunge la copia al gruppo del suo materiale e ricorda se almeno un pezzo proietta o riceve ombra.

**r. 46–48** `const meshes = []` — Fine del giro; prepara l'elenco dei risultati. Riga 47 vuota.

**r. 49–50** `const geometry = mergeGeometries(geometries, false)` — Per ogni materiale fonde tutte le copie in una sola forma.

**r. 51** `geometries.forEach((g) => g.dispose())` — Libera la memoria delle copie intermedie.

**r. 52–54** `if (!geometry) continue; geometry.computeBoundingSphere()` — Se la fusione fallisce salta; altrimenti calcola l'ingombro (serve a three.js per sapere quando è in inquadratura) e registra la mesh unita.

**r. 55–56** `root.visible = false` — Nasconde gli originali. Riga 55 chiude il ciclo.

**r. 57** `setMerged(meshes)` — Salva le mesh unite: React le disegnerà.

**r. 58–61** `return () => { meshes.forEach((m) => m.geometry.dispose())` — Alla scomparsa o al rifacimento libera le forme unite e rende di nuovo visibili gli originali.

**r. 62** `}, [enabled, ...deps])` — L'unione si rifà se cambia l'interruttore o uno dei valori indicati.

**r. 63–66** `<group ref={source}>{children}</group>` — Disegna il gruppo degli originali (poi nascosto). Un `group` è un contenitore che sposta insieme i suoi figli. Riga 63 vuota.

**r. 67–69** `{merged.map((m, i) => ( <mesh key={i} geometry=...` — Disegna una mesh per ogni materiale, con le ombre come gli originali.

**r. 70–72** `</> ) }` — Fine del componente.

## `src/scene/environment/Floor.jsx` (21 righe)

Disegna il pavimento: un rettangolo piatto con la griglia tecnica disegnata come texture. Lo usa `StoreCanvas`. Dimensioni, materiale e passo della griglia sono in `storeConfig.environment.floor` e il colore in `lighting.materials`: si cambiano lì.

**r. 1–2** `import { useMemo } from 'react'` — `useMemo` ricorda un risultato e lo ricalcola solo se i suoi ingredienti cambiano; `getMaterial` crea (o riusa) un materiale. Un materiale descrive come una superficie reagisce alla luce: colore, ruvidità, metallo.

**r. 3–4** `/** Pavimento. Dimensioni, materiale ... arrivano da ...` — Commento. Riga 3 vuota.

**r. 5** `export default function Floor({ floor, materials })` — Il componente: riceve i dati del pavimento e l'elenco dei materiali.

**r. 6** `const [width, depth] = floor.size` — Larghezza e profondità del pavimento in metri (dal config).

**r. 7** `const spec = materials[floor.materialId]` — La descrizione del materiale scelto per il pavimento.

**r. 8–14** `getMaterial(floor.materialId, spec, { repeat: [...], grid })` — Crea il materiale con la griglia ripetuta tante volte quante celle entrano nel pavimento (`gridTexture.cell` nel config). Cambiare `cell` rende i quadretti più grandi o più piccoli.

**r. 15–17** `<mesh rotation={[-Math.PI / 2, 0, 0]} ... receiveShadow` — Disegna il pavimento: un piano girato di 90° per stare orizzontale, al livello zero, che riceve le ombre. Riga 15 vuota.

**r. 18** `<planeGeometry args={[width, depth]} />` — La forma: un rettangolo delle dimensioni del config.

**r. 19–21** `</mesh> ) }` — Fine.

## `src/scene/environment/Walls.jsx` (49 righe)

Costruisce i muri a partire dai segmenti descritti in `storeConfig.environment.walls` (punto di partenza, punto d'arrivo, altezza, spessore, materiale) e, se attivo, il soffitto. Lo usa `StoreCanvas`. Per spostare un muro o aprire un passaggio si cambia il config: l'ingresso è semplicemente un tratto senza segmento. Ricordare che le collisioni dei muri sono nei `colliders` del config, non qui.

**r. 1–3** `import MergeByMaterial from '../MergeByMaterial.jsx'` — Strumenti: ricordo dei calcoli, creazione dei materiali, unione per materiale.

**r. 4–9** `/** Muri generati dai segmenti in storeConfig. ...` — Commento: il vano d'ingresso è l'assenza di un muro, non un buco ritagliato. Riga 4 vuota.

**r. 10** `function Wall({ wall, materials })` — Il componente di un singolo muro.

**r. 11–19** `const { position, rotationY, length } = useMemo(() => {` — Dai due estremi del segmento calcola il centro (a metà altezza), l'angolo e la lunghezza del muro.

**r. 20–24** `const material = useMemo(() => getMaterial(wall.material ...` — Prende il materiale del muro indicato nel config. Riga 20 vuota.

**r. 25–27** `<mesh position={position} rotation={[0, -rotationY, 0]} ...` — Disegna il muro nel punto e con l'angolo calcolati; riceve e proietta ombra. Riga 25 vuota.

**r. 28** `<boxGeometry args={[length, wall.height, wall.thickness]} />` — La forma: una scatola lunga quanto il segmento, alta e spessa come dice il config.

**r. 29–31** `</mesh> ) }` — Fine del singolo muro.

**r. 32–33** `export default function Walls({ walls, ceiling, floor ...` — Il componente esportato. Riga 32 vuota.

**r. 34–37** `const ceilingMaterial = useMemo(...)` — Il materiale del soffitto, dal config.

**r. 38–40** `return ( <MergeByMaterial>` — Tutti i muri e il soffitto vanno nel contenitore che li unisce per materiale. Riga 38 vuota.

**r. 41** `{walls.map((wall) => <Wall key={wall.id} ... />)}` — Un muro per ogni segmento del config.

**r. 42–43** `{ceiling.visible && ( <mesh rotation={[Math.PI / 2, 0 ...` — Se `ceiling.visible` è vero nel config, disegna il soffitto: un piano orizzontale all'altezza `ceiling.height`, rivolto verso il basso.

**r. 44** `<planeGeometry args={floor.size} />` — Il soffitto è grande quanto il pavimento.

**r. 45–49** `</mesh> )} </MergeByMaterial> ) }` — Fine.

## `src/scene/environment/Architecture.jsx` (57 righe)

Disegna gli elementi architettonici: colonne, pedane, binari a soffitto, architrave e soglia dell'ingresso e il rettangolo luminoso che simula la luce esterna. Lo usa `StoreCanvas`. Tutti i dati vengono da `storeConfig.environment.architecture` ed `environment.entrance`; le collisioni di questi oggetti sono invece nei `colliders` del config, quindi spostando una colonna bisogna spostare anche il suo collider.

**r. 1–3** `import ConfigBox from './ConfigBox.jsx'` — Il box generico descritto dal config e il contenitore che unisce per materiale. Riga 3 vuota.

**r. 4–8** `/** Elementi architettonici della Fase 2 ...` — Commento: elenca gli elementi e ricorda che la collisione vive in `colliders`.

**r. 9** `export default function Architecture({ environment ...` — Il componente; `merge` permette di spegnere l'unione (oggi nessuno lo spegne).

**r. 10** `const { architecture: arch, entrance, ceiling } = ...` — Prende dal config le tre parti che servono.

**r. 11** `const trackY = ceiling.height - arch.trackSection / 2 - 0.08` — L'altezza dei binari: appena sotto il soffitto, 8 cm più in basso. Il numero 0,08 è scritto qui (ed è lo stesso usato dai corpi dei faretti).

**r. 12–14** `return ( <MergeByMaterial enabled={merge}>` — Tutto va nel contenitore che unisce per materiale. Riga 12 vuota.

**r. 15–24** `{arch.columns.map((c) => ( <ConfigBox ... castShadow` — Una scatola per ogni colonna del config, appoggiata a terra (centro a metà altezza), che proietta ombra.

**r. 25–27** `{arch.platforms.map((p) => ( <ConfigBox ... />` — Una scatola per ogni pedana "studio", con centro e dimensioni del config. Riga 25 vuota.

**r. 28–33** `{arch.ceilingTracks.map((t) => { ... Math.hypot(...)` — Per ogni binario a soffitto calcola la lunghezza dai due estremi. Riga 28 vuota.

**r. 34–45** `<ConfigBox center={[...]} size={[arch.trackSection, ...` — Disegna il binario: una barra a sezione quadrata (`trackSection` nel config, 8 cm), girata nella direzione giusta, che non riceve ombre.

**r. 46–48** `<ConfigBox {...entrance.lintel} materials={materials} />` — Architrave e soglia dell'ingresso, con tutti i dati presi dal config. Riga 46 vuota.

**r. 49–54** `{entrance.exteriorGlow && ( <mesh ... <meshBasicMaterial ...` — Se il config lo prevede, un pannello semitrasparente oltre l'ingresso che simula la luce del giorno. Usa un materiale "basic", che non reagisce alle luci: colore, dimensioni e intensità (opacità 0,62) si cambiano in `entrance.exteriorGlow`.

**r. 55–57** `</MergeByMaterial> ) }` — Fine.

## `src/scene/environment/ConfigBox.jsx` (12 righe)

Un mattoncino riutilizzabile: una scatola con centro, dimensioni, materiale e rotazione presi dal config. Lo usa `Architecture`. Non contiene valori del negozio; non serve modificarlo.

**r. 1–2** `import { getMaterial } from '../../lib/materials.js'` — Ricordo dei calcoli e creazione dei materiali.

**r. 3–4** `/** Box generico descritto da config ... */` — Commento. Riga 3 vuota.

**r. 5** `export default function ConfigBox({ center, size ...` — Il componente. Per difetto non è ruotato, non proietta ombra e la riceve.

**r. 6** `const material = useMemo(() => getMaterial(materialId, ...` — Prende il materiale indicato per ID (condiviso con gli altri oggetti dello stesso materiale).

**r. 7–8** `return ( <mesh position={center} rotation={[0 ...` — Disegna la mesh nel centro indicato, ruotata solo attorno all'asse verticale.

**r. 9** `<boxGeometry args={size} />` — La forma: una scatola delle dimensioni indicate (larghezza, altezza, profondità).

**r. 10–12** `</mesh> ) }` — Fine.

## `src/scene/environment/BrandWall.jsx` (77 righe)

Disegna la parete del brand: l'insegna con il wordmark INTO dentro l'ellisse e, sotto, il pannello del Lookbook. Lo usa `StoreCanvas`. Posizione, dimensioni, colore dell'insegna e voce del Lookbook mostrata sono in `storeConfig.environment.brandWall`; i testi vengono da `meta.brand` e `lookbook`. Quando arriverà il logo vettoriale, il punto da cambiare è indicato alle righe 25–32.

**r. 1–5** `import { whenFontsReady, makeWordmarkSign ...` — Strumenti: React, three.js, i token del design (colori del marchio), i materiali e le funzioni che disegnano insegna e pannello come immagini.

**r. 6–14** `/** Parete del brand: insegna ... e, sotto, il pannello ...` — Commento: l'insegna non è illuminata e non passa dal tone mapping, così mantiene l'arancio esatto del marchio come un'insegna retroilluminata. Riga 6 vuota.

**r. 15** `export default function BrandWall({ brandWall, brand ...` — Il componente.

**r. 16** `const [textures, setTextures] = useState(null)` — Le immagini disegnate; all'inizio non ci sono.

**r. 17** `const entry = lookbook.find((l) => l.id === ...` — La voce del Lookbook da mostrare sul pannello (scelta in config con `panel.lookbookId`).

**r. 18** `const logo = assets.registry[brandWall.sign.assetId]` — Il logo indicato in config nel registro delle risorse.

**r. 19–22** `useEffect(() => { let alive = true; let made = null` — Alla comparsa prepara le immagini; `alive` evita di lavorare se il componente è già sparito. Riga 19 vuota.

**r. 23–24** `whenFontsReady().then(() => { if (!alive) return` — Aspetta i font, altrimenti le scritte uscirebbero con un carattere sbagliato per sempre.

**r. 25–32** `const sign = logo.url ? null : makeWordmarkSign({ ... })` — Finché il logo non ha un file (`url: null`), disegna l'insegna tipografica con wordmark, descrittore e colori dal config. Se in futuro `url` avrà un valore, oggi l'insegna semplicemente non compare: questo codice andrà completato per caricare il file del logo.

**r. 33–39** `const panel = makeLookbookPanel({ title, subtitle, ... bg })` — Disegna il pannello con titolo e sottotitolo della voce del Lookbook, l'arancio Flame e il colore del testo dai token, il fondo del colore del materiale del pannello.

**r. 40–42** `made = { sign, panel }; setTextures(made)` — Salva le immagini: la parete si ridisegna con esse.

**r. 43–48** `return () => { alive = false; made?.sign?.texture.dispose()` — Alla scomparsa (o al cambio dei dati) libera le immagini dalla memoria grafica.

**r. 49–57** `const panelMaterial = useMemo(() => { ... base.clone()` — Crea il materiale del pannello: copia quello del config, ci applica l'immagine e porta il colore a bianco (altrimenti three.js moltiplicherebbe colore e immagine scurendola). Riga 49 vuota.

**r. 58–59** `useEffect(() => () => panelMaterial?.dispose() ...` — La copia appartiene a questo componente: la libera lui quando non serve più.

**r. 60–62** `if (!textures) return null; const { sign, panel } = ...` — Finché le immagini non sono pronte non disegna nulla; poi prende posizione e dimensioni dal config. Riga 60 vuota.

**r. 63–65** `return ( <group>` — Inizio del disegno. Riga 63 vuota.

**r. 66–71** `{textures.sign && ( <mesh position={sign.center}> ...` — L'insegna: un rettangolo largo `sign.width` (config) e alto in proporzione all'immagine, con un materiale che ignora le luci, trasparente e fuori dal tone mapping.

**r. 72–74** `<mesh position={panel.center} material={panelMaterial} ...` — Il pannello del Lookbook nella posizione e dimensione del config; riceve le ombre.

**r. 75–77** `</group> ) }` — Fine.

## `src/scene/environment/FloorLabels.jsx` (51 righe)

Disegna a terra le marcature tecniche delle zone (numero, nome, identificativo), sul bordo verso l'ingresso. Lo usa `StoreCanvas`. Quali zone le hanno e con che nome si decide in `storeConfig.environment.zones` (`floorLabel`, `label`); in questo file sono invece scritte la misura della targa (3,6 × 0,9 m), lo scostamento dal bordo (0,6 m) e la luminosità.

**r. 1–3** `import { whenFontsReady, makeFloorLabel } from ...` — Strumenti di React, i token del design e le funzioni che aspettano i font e disegnano la targa.

**r. 4–8** `/** Marcature tecniche a pavimento ...` — Commento. Riga 4 vuota.

**r. 9** `export default function FloorLabels({ zones })` — Il componente: riceve l'elenco delle zone.

**r. 10** `const [labels, setLabels] = useState([])` — Le targhe pronte; all'inizio nessuna.

**r. 11–14** `useEffect(() => { let alive = true; let made = []` — Alla comparsa prepara le targhe. Riga 11 vuota.

**r. 15–16** `whenFontsReady().then(() => { if (!alive) return` — Aspetta i font.

**r. 17** `zones.map((zone, i) => ...).filter(({ zone }) => ...` — Numera le zone nell'ordine del config (1, 2, 3…) e tiene solo quelle con `floorLabel` attivo.

**r. 18** `const [[x0, z0], [x1, z1]] = zone.bounds` — I due angoli della zona, dal config.

**r. 19–20** `return { id: zone.id,` — Inizio della descrizione della targa.

**r. 21–22** `position: [(x0 + x1) / 2, 0.004, Math.max(z0, z1) - 0.6]` — Posizione: centrata in larghezza, 4 mm sopra il pavimento (per non "sfarfallare" con esso), 60 cm dentro il bordo verso l'ingresso. Il valore 0,6 si può cambiare qui per avvicinare o allontanare la scritta dal bordo.

**r. 23–26** `texture: makeFloorLabel({ index, label: zone.label, id: ...` — Disegna l'immagine della targa con numero, nome e identificativo della zona, nei colori arancio e osso del marchio.

**r. 27–29** `} }) setLabels(made)` — Salva le targhe.

**r. 30** `})` — Fine dell'attesa dei font.

**r. 31–35** `return () => { alive = false; for (const l of made) ...` — Alla scomparsa libera le immagini.

**r. 36–38** `return ( <group>` — Inizio del disegno. Riga 36 vuota.

**r. 39–41** `<mesh key={l.id} position={l.position} ...` — Una targa per zona, distesa a terra.

**r. 42–46** `<meshStandardMaterial map={l.texture} transparent ... ...` — Il materiale: l'immagine trasparente, un leggero bagliore proprio (0,28: alzandolo la scritta si legge meglio al buio ma sembra luminosa) e un accorgimento (`polygonOffset`) per non confondersi col pavimento.

**r. 47–51** `</mesh> ))} </group> ) }` — Fine.

## `src/scene/environment/GroundShadows.jsx` (26 righe)

Disegna le ombre "blob": macchie scure sfumate sotto colonne ed espositori, usate solo sui dispositivi deboli (tier low) dove le ombre vere sono spente. Lo usa `StoreCanvas`, che decide quali oggetti e quando. Opacità e grandezza si regolano in `storeConfig.performance.groundShadow`; quali oggetti l'hanno con `groundShadow: true` nel config.

**r. 1–2** `import { getBlobTexture } from '../../lib/canvasText.js'` — `useMemo` e l'immagine della macchia sfumata (condivisa da tutte le ombre).

**r. 3–7** `/** D3-A — ombre "blob" a terra. Compaiono SOLO ...` — Commento: sopra il tier low sarebbero una seconda ombra sotto quella vera. Riga 3 vuota.

**r. 8** `export default function GroundShadows({ objects ...` — Il componente: oggetti, impostazioni e interruttore.

**r. 9** `const texture = useMemo(() => (enabled ? ...` — Prende l'immagine della macchia solo se servono le ombre.

**r. 10** `if (!enabled) return null` — Se spente non disegna nulla.

**r. 11–14** `return ( <group> {objects.filter((o) => ...` — Per ogni oggetto che vuole l'ombra. Riga 11 vuota.

**r. 15** `const r = Math.max(o.size[0], o.size[2]) * ...` — Il raggio della macchia: il lato più lungo dell'oggetto per `radiusScale` (1,15 nel config). Alzarlo allarga le ombre.

**r. 16–17** `<mesh key={o.id} position={[o.position[0], 0.003 ...` — Un quadrato disteso a terra, 3 mm sopra il pavimento, sotto l'oggetto.

**r. 18** `<planeGeometry args={[r * 2, r * 2]} />` — Lato pari al diametro della macchia.

**r. 19–20** `<meshBasicMaterial color="#000000" map={texture} ... ...` — Materiale nero, trasparente, con l'opacità del config (0,45): alzarla scurisce le ombre.

**r. 21–26** `</mesh> ) })} </group> ) }` — Fine.

## `src/scene/lighting/LightingRig.jsx` (123 righe)

Crea tutte le luci del negozio (ambiente, emisfera, faretti) e gestisce il passaggio alla luce "studio" quando si entra nel Focus su un capo. Lo usa `StoreCanvas`. Posizione, colore, intensità, apertura e ombre dei faretti sono in `storeConfig.lighting`; i valori del cambio di luce del Focus in `storeConfig.focus.lighting`; quanti faretti fanno ombra vera dipende dal tier in `performance.tiers`. Qui restano scritti solo due valori tecnici delle ombre (righe 42–43).

**r. 1–4** `import { useAppStore } from '../../state/useAppStore.js'` — Strumenti di React, React Three Fiber, three.js e lo stato dell'app (per sapere se il Focus è attivo).

**r. 5–10** `/** Luci di scena. Il budget delle ombre viene dal tier ...` — Commento: i faretti sono ordinati per `priority` e solo i primi `maxShadowCasters` fanno ombra; sul tier low nessuno. Riga 5 vuota.

**r. 11–13** `function Spot({ spot, castShadow, shadowMapSize, registry })` — Il componente di un faretto. Una luce "spot" è un cono di luce come un faretto vero. Tiene un riferimento alla luce e al punto verso cui punta.

**r. 14–18** `registry.current.set(spot.id, { light, base: ...` — Iscrive il faretto in un registro con la sua intensità e il suo colore di partenza, così il Focus può alzarli e abbassarli; lo cancella quando sparisce. Riga 14 vuota.

**r. 19–25** `light.current.target = target.current` — Collega il faretto al punto da illuminare (in three.js un faretto guarda verso un oggetto "bersaglio"). Riga 19 vuota.

**r. 26–29** `return ( <group> <object3D ref={target} ...` — Disegna il bersaglio invisibile nella posizione del config (`targetPosition`). Riga 26 vuota.

**r. 30–38** `<spotLight ref={light} position={spot.position} ...` — La luce con i valori del config: posizione, apertura del cono (`angle`), morbidezza del bordo (`penumbra`), intensità, distanza massima, attenuazione (`decay`) e colore. Si cambiano tutti in `lighting.spots`.

**r. 39–41** `castShadow={castShadow} shadow-mapSize-width={shadowMapSize}` — Se proietta un'ombra e con quale nitidezza: la "shadow map" è l'immagine in cui la luce calcola le ombre, più grande = più nitida e più pesante (dal tier).

**r. 42–43** `shadow-bias={-0.0012} shadow-normalBias={0.03}` — Due correzioni tecniche che evitano righe e macchie nelle ombre. Valori scritti qui; meglio non toccarli senza controllare a schermo.

**r. 44–48** `/> </group> ) }` — Fine del faretto. Riga 48 vuota.

**r. 49–54** `/** In Focus Mode la luce passa dal mondo editoriale ...` — Commento: nel Focus il faretto dell'espositore sale e si avvicina al bianco "studio", il resto si abbassa, con una dissolvenza.

**r. 55** `export default function LightingRig({ lighting, tier ...` — Il componente esportato.

**r. 56–57** `const registry = useRef(new Map()); const { scene } = ...` — Il registro dei faretti e la scena.

**r. 58–64** `scene.fog = new THREE.Fog(fog.color, fog.near, fog.far)` — Se la nebbia è attiva, la mette sulla scena con colore e distanze del config (`environment.fog`); la toglie quando non serve. Oggi è spenta per scelta.

**r. 65–66** `const ambient = useRef(); const hemi = useRef()` — Riferimenti alla luce ambiente e a quella "emisfera", per poterle abbassare nel Focus.

**r. 67** `const studio = useMemo(() => new THREE.Color(focusConfig ...` — Il colore "studio" del Focus (`focus.lighting.studioColor` nel config).

**r. 68** `const spotOfDisplay = useMemo(() => new ...` — Per ogni espositore, il suo faretto (`spotlightId` nel config).

**r. 69–70** `useFrame((_, delta) => {` — Codice eseguito a ogni fotogramma; `delta` è il tempo passato dal fotogramma precedente. Riga 69 vuota.

**r. 71–74** `const f = useAppStore.getState().focus; const on = ...` — Legge lo stato del Focus; "acceso" se si sta entrando o si è dentro; trova il faretto dell'espositore inquadrato; prende i valori del Focus dal config.

**r. 75** `const k = 1 - Math.exp(-delta / (L.blendMs / 1000 / 3))` — Quanto avvicinarsi al valore desiderato in questo fotogramma. `blendMs` (700 ms nel config) è la durata della dissolvenza: alzarlo la rende più lenta.

**r. 76–77** `for (const [id, s] of registry.current) { if (!s.light) ...` — Per ogni faretto registrato.

**r. 78–79** `const wantI = s.base * (isFocus ? L.spotBoost : on ? ...` — L'intensità voluta: quella del config moltiplicata per `spotBoost` (1,15) se è il faretto del Focus, per `othersDim` (0,3) se è un altro faretto durante il Focus, invariata fuori dal Focus.

**r. 80** `s.light.intensity += (wantI - s.light.intensity) * k` — Avvicina gradualmente l'intensità al valore voluto.

**r. 81–82** `s.light.color.lerp(isFocus ? studio : s.color, k)` — Avvicina gradualmente il colore: al bianco studio il faretto del Focus, al proprio colore originale gli altri.

**r. 83** `const dim = on ? L.ambientDim : 1` — Nel Focus anche la luce generale si abbassa (`ambientDim` 0,6 nel config).

**r. 84** `if (ambient.current) ambient.current.intensity += ...` — Avvicina gradualmente l'intensità della luce ambiente.

**r. 85** `if (hemi.current) hemi.current.intensity += ...` — Stesso per la luce emisfera.

**r. 86–87** `})` — Fine del codice per fotogramma. Riga 87 vuota.

**r. 88–92** `[...lighting.spots].sort((a, b) => a.priority - b.priority)` — Ordina i faretti per `priority` (1 = più importante). Riga 92 vuota.

**r. 93–94** `// Quali faretti possono proiettare ombra ...` — Commento e inizio del calcolo.

**r. 95–96** `const allowed = new Set(); let budget = ...` — Elenco dei faretti con ombra e quanti ne permette il tier (2 su high e medium, 0 su low).

**r. 97–101** `if (budget > 0 && spot.castShadow) { ...` — Dà l'ombra ai primi faretti, in ordine di priorità, che nel config hanno `castShadow: true`, finché il budget lo consente. Per dare l'ombra a un altro faretto si cambiano `priority` e `castShadow` nel config.

**r. 102–104** `return ( <group>` — Inizio del disegno delle luci. Riga 102 vuota.

**r. 105** `<ambientLight ref={ambient} intensity=... color=... />` — Luce ambiente: illumina tutto in modo uniforme, senza direzione né ombre. Valori in `lighting.ambient`.

**r. 106–111** `<hemisphereLight ref={hemi} ... groundColor=... />` — Luce emisfera: un colore che viene dall'alto (`skyColor`) e uno dal basso (`groundColor`), per un riempimento morbido. Valori in `lighting.hemisphere`.

**r. 112–120** `{spots.map((spot) => ( <Spot key={spot.id} ... ...` — Un faretto per ogni voce del config, con o senza ombra secondo il calcolo sopra.

**r. 121–123** `</group> ) }` — Fine.

## `src/scene/lighting/LightFixtures.jsx` (62 righe)

Disegna i corpi visibili dei faretti (cilindro, lente colorata, stelo fino al binario) a partire dalla stessa lista `lighting.spots` del config: aggiungere un faretto nel config aggiunge sia la luce sia il suo corpo. Lo usa `StoreCanvas`. Le misure del corpo e il materiale sono in `storeConfig.environment.architecture.fixture`; qui restano lo spessore dello stelo e la risoluzione delle forme.

**r. 1–3** `import { getMaterial } from '../../lib/materials.js'` — Strumenti di React, three.js e materiali.

**r. 4–12** `/** Corpi illuminanti visibili, generati dagli stessi ...` — Commento: sono disegnati "a istanze", cioè la scheda grafica disegna tutte le copie di una forma con un solo ordine (3 in tutto invece di 3 per faretto). Ogni lente prende il colore della propria luce. Riga 4 vuota.

**r. 13** `export default function LightFixtures({ spots ...` — Il componente.

**r. 14** `const { fixture, trackSection } = architecture` — Le misure del corpo faretto e la sezione del binario, dal config.

**r. 15** `const material = useMemo(() => getMaterial(fixture.mater ...` — Il materiale del corpo (oggi acciaio scuro, scelto nel config).

**r. 16–17** `const ceilingY = ceiling.height - trackSection - 0.08` — L'altezza a cui arriva lo stelo: sotto il binario. Riga 17 vuota.

**r. 18–21** `const bodies = useRef(); const lenses = useRef(); const ...` — Riferimenti ai tre gruppi di copie: corpi, lenti, steli. Riga 21 vuota.

**r. 22–23** `const geo = useMemo(() => ({ // Il corpo è un cilindro ...` — Inizio delle tre forme.

**r. 24** `body: new THREE.CylinderGeometry(fixture.radius, ...)` — Il corpo: un cilindro leggermente rastremato, con raggio e lunghezza dal config, girato per puntare in avanti.

**r. 25** `lens: new THREE.CircleGeometry(fixture.radius * 0.78, 20)...` — La lente: un disco poco più piccolo del corpo, sulla sua faccia anteriore.

**r. 26–27** `stem: new THREE.CylinderGeometry(0.012, 0.012, 1 ...` — Lo stelo: un cilindretto di 1,2 cm di raggio, lungo 1 m e poi allungato per ogni faretto.

**r. 28–29** `const lensMaterial = useMemo(() => new ...` — Materiale delle lenti: non reagisce alle luci e non passa dal tone mapping, così appare acceso del colore della sua luce. Riga 29 vuota.

**r. 30–32** `useLayoutEffect(() => { const o = new THREE.Object3D()` — Dopo il montaggio, prepara un oggetto di appoggio per calcolare le posizioni e un colore.

**r. 33–38** `spots.forEach((spot, i) => { o.position.set(...spot.posi ...` — Per ogni faretto mette l'oggetto d'appoggio nella posizione del config e lo gira verso il bersaglio (`targetPosition`).

**r. 39–41** `bodies.current.setMatrixAt(i, o.matrix)` — Applica quella posizione alla copia numero `i` del corpo e della lente; colora la lente col colore della luce del config.

**r. 42–46** `o.scale.set(1, Math.max(0.001, ceilingY - ...` — Per lo stelo: stessa posizione, nessuna rotazione, allungato in verticale fino al binario.

**r. 47–50** `m.instanceMatrix.needsUpdate = true; ...` — Avvisa three.js che le posizioni sono cambiate e ricalcola l'ingombro delle copie. Riga 47 chiude il giro.

**r. 51–53** `lenses.current.instanceColor.needsUpdate = true` — Avvisa che anche i colori delle lenti sono cambiati; il calcolo si rifà se cambiano i faretti.

**r. 54–56** `return ( <group>` — Inizio del disegno. Riga 54 vuota.

**r. 57** `<instancedMesh ref={bodies} args={[geo.body, material ...` — Tutte le copie dei corpi, una per faretto.

**r. 58** `<instancedMesh ref={lenses} args={[geo.lens ...` — Tutte le lenti.

**r. 59** `<instancedMesh ref={stems} args={[geo.stem, material ...` — Tutti gli steli.

**r. 60–62** `</group> ) }` — Fine.

## `src/scene/displays/Displays.jsx` (42 righe)

Mette nel negozio tutti gli espositori elencati in `storeConfig.displays`, ognuno disegnato dal componente del suo tipo (`kind`: manichino, plinto, rack, parete), e aggiunge il marcatore del capo attivo durante il Focus. Lo usa `StoreCanvas`. Posizione, rotazione e capi esposti si cambiano nel config; per un nuovo tipo di espositore bisognerebbe scrivere un componente e aggiungerlo all'elenco della riga 9.

**r. 1–8** `import { useAppStore } from '../../state/useAppStore.js'` — Lo stato dell'app (per il Focus), il contenitore che unisce per materiale, il marcatore e i quattro tipi di espositore. Riga 8 vuota.

**r. 9** `const BY_KIND = { mannequin: DisplayMannequin, plinth: ...` — L'elenco "tipo → componente": il valore `kind` nel config deve essere una di queste quattro parole.

**r. 10–12** `const MARKER = { plinth: plinthMarker, rack: rackMarker }` — Solo plinto e rack, che hanno più capi, mostrano quale è attivo. Riga 12 vuota.

**r. 13–17** `/** Tutti gli espositori di storeConfig.displays ...` — Commento: il componente conosce solo la propria forma, mai il proprio posto nel negozio.

**r. 18** `export default function Displays({ config, merge = true })` — Il componente.

**r. 19** `const focus = useAppStore((s) => s.focus)` — Legge lo stato del Focus; quando cambia, gli espositori si ridisegnano.

**r. 20–21** `const productById = new Map(config.products.map((p) => ...` — Un elenco per trovare un prodotto dal suo ID. Riga 21 vuota.

**r. 22–23** `return config.displays.map((d) => { const Component = ...` — Per ogni espositore del config sceglie il componente del suo tipo.

**r. 24** `const active = focus.state !== 'idle' && ...` — Se il Focus è su questo espositore, quale capo è attivo; altrimenti nessuno.

**r. 25–27** `const marker = MARKER[d.kind] && active !== null && ...` — Calcola dove mettere il marcatore, solo se il tipo lo prevede, c'è un capo attivo e i capi sono più di uno.

**r. 28–29** `<group key={d.id} position={d.position} rotation={[0 ...` — Un gruppo nella posizione e rotazione dell'espositore scritte nel config.

**r. 30–37** `<MergeByMaterial enabled={merge}> <Component ...` — Dentro il contenitore che unisce per materiale, il componente dell'espositore con i suoi prodotti, le impostazioni dei capi (`garments`) e i materiali.

**r. 38** `{marker && <ActiveMarker position={marker} ...` — Il marcatore, fuori dall'unione perché si sposta, del colore degli hotspot (config).

**r. 39–42** `</group> ) }) }` — Fine.

## `src/scene/displays/parts.jsx` (62 righe)

Pezzi comuni agli espositori: il materiale del tessuto colorato, un aiuto per i materiali, il cordino arancio, il capo appeso piatto e il marcatore del Focus. Lo usano i quattro componenti degli espositori e `Displays`. Il colore del tessuto viene dalla prima variante di colore del prodotto in config, il colore del cordino da `garments.cordColor`; qui restano alcune misure (spessore del cordino, misure del marcatore).

**r. 1–4** `import { getGarmentGeometry } from '../../lib/garments.js'` — `useMemo`, i materiali e le forme dei capi. Riga 4 vuota.

**r. 5–6** `export function useFabric(product, garments, materials)` — Funzione che dà il materiale del tessuto di un prodotto.

**r. 7** `const swatch = product.colorways[0].swatch` — Usa il colore della prima variante del prodotto (config): per cambiare il colore del capo in vetrina si cambia l'ordine o il `swatch` delle varianti.

**r. 8–12** `getMaterial(...${swatch}, { ...materials[garments.materi ...` — Crea un materiale tessuto (ruvidità ecc. dal config) col colore della variante; prodotti dello stesso colore condividono lo stesso materiale.

**r. 13–14** `export function useMat(id, materials)` — Aiuto: il materiale con un certo ID. Riga 13 vuota.

**r. 15–17** `return useMemo(() => getMaterial(id, materials[id]) ...` — Lo crea o lo riusa. Riga 17 vuota.

**r. 18–19** `export function Cord({ position, length = 0.24, spread ...` — Il cordino: due fili che pendono; lunghezza e distanza fra i fili hanno un valore di base.

**r. 20–24** `getMaterial(cord:${color}, { color, roughness: 0.6, ... ...` — Il materiale del cordino, con un lieve bagliore proprio (0,15) perché l'arancio si noti. Condiviso da tutti i cordini.

**r. 25–27** `return ( <group position={position}> {[-spread ...` — Due fili, uno a sinistra e uno a destra.

**r. 28–30** `<mesh ... castShadow> <cylinderGeometry args={[0.006 ...` — Ogni filo: un cilindro sottilissimo (6 mm di raggio) che pende verso il basso.

**r. 31–35** `))} </group> ) }` — Fine del cordino. Riga 35 vuota.

**r. 36–37** `export function FlatGarment({ product, garments ...` — Il capo appeso piatto, usato da rack e parete.

**r. 38** `const kind = garments.shapeByCategory[product.category]` — La sagoma (sopra o sotto) secondo la categoria del prodotto, come indicato in `garments.shapeByCategory` del config.

**r. 39–40** `const fabric = useFabric(...); const geometry = ...` — Il tessuto colorato e la forma della sagoma.

**r. 41–43** `<group position={position} rotation={rotation}> <mesh ...` — Disegna la sagoma nel punto indicato; proietta e riceve ombra.

**r. 44** `{kind === 'bottom' && <Cord position={[0, 0.47, 0.03]} ...` — Per i pantaloni, il cordino in vita.

**r. 45–48** `</group> ) }` — Fine. Riga 48 vuota.

**r. 49–55** `/** Indicatore del capo selezionato in Focus Mode ...` — Commento: è la piccola ellisse del marchio; è trasparente con opacità piena per riusare uno shader già pronto e non causare uno scatto.

**r. 56–58** `<mesh position={position} rotation={[-Math.PI / 2, 0 ...` — Un anello (raggi 5,5 e 6,8 cm) disteso in orizzontale e allargato in un'ellisse (rapporto 2,2): cambiando `ratio` o i raggi cambia la forma del marcatore.

**r. 59** `<meshBasicMaterial color={color} transparent ...` — Materiale non illuminato, del colore esatto passato.

**r. 60–62** `</mesh> ) }` — Fine.

## `src/scene/displays/DisplayMannequin.jsx` (62 righe)

Disegna un manichino da sartoria (base, asta, busto, collo, testa astratta) con il capo indossato: maniche, cappuccio e cordini per le felpe. Lo usa `Displays` per gli espositori con `kind: 'mannequin'`. Posizione e materiali sono nel config (`displays[].materialIds`); le proporzioni del manichino sono invece scritte qui in metri.

**r. 1–3** `import { getTorsoGeometry, getWornShellGeometry } from ...` — Le forme del busto e del capo indossato, e gli aiuti comuni. Riga 3 vuota.

**r. 4–8** `/** Manichino: busto da sartoria su asta e base ...` — Commento: testa senza volto, altezza totale circa 1,8 m.

**r. 9–10** `const TORSO_BASE = 0.86` — Altezza da terra a cui inizia il busto (86 cm). Cambiarla alza o abbassa busto, maniche, collo e testa insieme. Riga 10 vuota.

**r. 11** `export default function DisplayMannequin({ display ...` — Il componente.

**r. 12–13** `const body = useMat(display.materialIds.body, ...)` — I materiali del corpo e della base, scelti nel config.

**r. 14–15** `const product = products[0]; const fabric = useFabric(...)` — Il manichino mostra solo il primo prodotto dell'espositore, col suo tessuto.

**r. 16–18** `const isTop = garments.shapeByCategory[product.category] ...` — Se il capo è "sopra" (felpa, t-shirt); solo in quel caso si disegnano capo, maniche ecc. Riga 17 vuota.

**r. 19–22** `<mesh position={[0, 0.015, 0]} ... <cylinderGeometry ...` — La base: un disco di circa 27 cm di raggio, alto 3 cm.

**r. 23–26** `<mesh position={[0, TORSO_BASE / 2, 0]} ... ...` — L'asta sottile dalla base al busto. Riga 26 vuota.

**r. 27** `<group position={[0, TORSO_BASE, 0]} scale={[1, 1, 0.62]}>` — Un gruppo all'altezza del busto, schiacciato in profondità (62%): un busto è più largo che spesso.

**r. 28** `<mesh geometry={getTorsoGeometry()} material={body} ... />` — Il busto.

**r. 29** `{isTop && <mesh geometry={getWornShellGeometry()} ...` — Il capo indossato, un guscio appena più grande del busto.

**r. 30–33** `</group> {/* Maniche: il busto non ha braccia, il capo ...` — Fine del gruppo e commento. Riga 31 vuota.

**r. 34–39** `{isTop && [-1, 1].map((side) => ( <mesh ... ...` — Le due maniche: capsule lunghe 42 cm, ai lati delle spalle, leggermente aperte.

**r. 40–41** `{/* Cappuccio della felpa, adagiato dietro il collo. */}` — Commento. Riga 40 vuota.

**r. 42–48** `{isTop && product.category === 'Hoodie' && ( ... ...` — Solo per la categoria "Hoodie": il cappuccio, una porzione di sfera inclinata dietro il collo. Il nome di categoria deve corrispondere esattamente a quello del config. Riga 48 vuota.

**r. 49–51** `<mesh position={[0, TORSO_BASE + 0.7, 0]} ... ...` — Il collo.

**r. 52–55** `<mesh position={[0, TORSO_BASE + 0.85, 0]} ...` — La testa: una sfera di 10 cm leggermente ovale. Riga 55 vuota.

**r. 56–59** `{isTop && product.category === 'Hoodie' && ( <Cord ... />` — Per le felpe, i cordini arancio al collo.

**r. 60–62** `</group> ) }` — Fine.

## `src/scene/displays/DisplayRack.jsx` (58 righe)

Disegna un rack da parete (due montanti, piedi, traversa) con i capi appesi rivolti verso la sala, ciascuno con una copia dietro che suggerisce lo stock. Lo usa `Displays` per `kind: 'rack'`, e fornisce anche la posizione del marcatore del capo attivo. Larghezza e altezza del rack sono scritte qui (righe 8–9); i capi e il materiale del telaio vengono dal config.

**r. 1–2** `import { useMat, FlatGarment } from './parts.jsx'` — Aiuti comuni. Riga 2 vuota.

**r. 3–7** `/** Rack a parete: due montanti, traversa, piedi ...` — Commento.

**r. 8–10** `const L = 2.2; const H = 1.75` — Larghezza (2,2 m) e altezza della traversa (1,75 m). Cambiarle cambia tutto il rack e la distribuzione dei capi; il collider nel config va adeguato a mano. Riga 10 vuota.

**r. 11–13** `function Hanger({ x, material }) { return ( <group ...` — La gruccia, appesa alla traversa nel punto `x`.

**r. 14–16** `<mesh position={[0, 0.045, 0]} ... <torusGeometry ...` — Il gancio: un anello aperto sottile.

**r. 17–19** `<mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI ...` — La barra orizzontale della gruccia, larga 44 cm.

**r. 20–23** `</group> ) }` — Fine della gruccia. Riga 23 vuota.

**r. 24–25** `const slotX = (count, i) => -L / 2 + (L * (i + 0.5)) / count` — Divide la larghezza in parti uguali e mette ogni capo al centro della sua parte. Riga 25 vuota.

**r. 26–28** `export const rackMarker = (count, i) => [slotX(count ...` — Dove sta il marcatore del capo attivo: sopra il suo posto, 18 cm più su della traversa. Riga 28 vuota.

**r. 29–30** `export default function DisplayRack({ ... }) { const ...` — Il componente e il materiale del telaio (config).

**r. 31–33** `const slots = products.map((_, i) => ...` — Le posizioni dei capi. Riga 32 vuota.

**r. 34–39** `{[-L / 2, L / 2].map((x) => ( ... <boxGeometry ...` — Ai due estremi: i montanti verticali (3,5 cm di sezione).

**r. 40–44** `<mesh position={[x, 0.015, 0]} ... args={[0.05, 0.03, 0.45]}` — I piedi, profondi 45 cm.

**r. 45–48** `<mesh position={[0, H, 0]} ... cylinderGeometry ...` — La traversa: un tubo orizzontale lungo quanto il rack. Riga 48 vuota.

**r. 49–51** `{products.map((p, i) => ( <group key={p.id}> <Hanger ... />` — Per ogni prodotto: la gruccia.

**r. 52** `<FlatGarment ... position={[slots[i] + 0.03, H - 0.42 ...` — La copia dietro, un po' spostata e ruotata, per suggerire che ce ne sono altri.

**r. 53** `<FlatGarment ... position={[slots[i], H - 0.4, 0.03]} ...` — Il capo davanti, rivolto verso la sala.

**r. 54–58** `</group> ))} </group> ) }` — Fine.

## `src/scene/displays/DisplayPlinth.jsx` (52 righe)

Disegna il plinto: un blocco di cemento con un piano d'acciaio e i capi piegati in pile. Lo usa `Displays` per `kind: 'plinth'` e fornisce la posizione del marcatore. Le misure sono scritte qui (righe 8–9). Attenzione: il materiale del piano è indicato direttamente qui per ID (`'mat-steel-dark'`, riga 36) invece che nel config: è un'eccezione alla regola, se si rinomina quel materiale nel config va cambiato anche qui.

**r. 1–2** `import { useMat, useFabric, Cord } from './parts.jsx'` — Aiuti comuni. Riga 2 vuota.

**r. 3–7** `/** Plinto: blocco in cemento con piano in acciaio ...` — Commento.

**r. 8–10** `const H = 0.9; const W = 1.2` — Altezza (90 cm) e lato (1,2 m) del blocco. Il collider nel config va adeguato a mano. Riga 10 vuota.

**r. 11–13** `function FoldedStack({ product, garments, materials, x }) {` — Una pila di capi piegati: tessuto del prodotto, 3 strati.

**r. 14–15** `return ( <group position={[x, H + 0.02, 0]}>` — La pila sta sopra il piano, nel punto `x`.

**r. 16–21** `{Array.from({ length: layers }, (_, i) => ( ... ...` — Ogni strato è una scatola di 40 × 5 × 31 cm, leggermente sfalsata e ruotata per sembrare piegata a mano.

**r. 22–24** `{garments.shapeByCategory[product.category] === ...` — Per i pantaloni, un piccolo cordino che esce dalla pila.

**r. 25–28** `</group> ) }` — Fine della pila. Riga 28 vuota.

**r. 29–30** `const slotX = (count, i) => (count === 1 ? 0 : -W / 4 + ...)` — Distribuisce le pile lungo la metà centrale del plinto (un solo capo al centro). Riga 30 vuota.

**r. 31–33** `export const plinthMarker = (count, i) => [slotX(count ...` — Il marcatore del capo attivo, sopra la sua pila. Riga 33 vuota.

**r. 34–35** `export default function DisplayPlinth(...) { const body ...` — Il componente e il materiale del blocco, dal config.

**r. 36** `const plate = useMat('mat-steel-dark', materials)` — Il materiale del piano, scritto qui per ID (vedi sopra).

**r. 37–39** `const slots = products.map((_, i) => ...` — Le posizioni delle pile. Riga 38 vuota.

**r. 40–43** `<mesh position={[0, H / 2, 0]} ... <boxGeometry ...` — Il blocco.

**r. 44–46** `<mesh position={[0, H + 0.01, 0]} ... args={[W + 0.02 ...` — Il piano d'acciaio, spesso 2 cm, che sporge di 1 cm per lato.

**r. 47–49** `{products.map((p, i) => ( <FoldedStack ... x={slots[i]} />` — Una pila per ogni prodotto dell'espositore.

**r. 50–52** `</group> ) }` — Fine.

## `src/scene/displays/DisplayWall.jsx` (41 righe)

Disegna la vetrina a parete: un fondale chiaro incorniciato, una mensola e un solo capo appeso piatto. Lo usa `Displays` per `kind: 'wall'`. Le misure sono scritte qui (righe 7–9); i materiali del fondale e della cornice vengono dal config (`displays[].materialIds`).

**r. 1–2** `import { useMat, FlatGarment } from './parts.jsx'` — Aiuti comuni. Riga 2 vuota.

**r. 3–6** `/** Vetrina a parete: un fondale chiaro incorniciato ...` — Commento.

**r. 7–10** `const W = 2.0; const H = 2.4; const BOTTOM = 0.25` — Larghezza (2 m) e altezza (2,4 m) del fondale e altezza da terra del suo bordo inferiore (25 cm). Riga 10 vuota.

**r. 11** `export default function DisplayWall({ display ...` — Il componente.

**r. 12–13** `const panel = useMat(display.materialIds.panel, ...)` — I materiali del fondale e della cornice, dal config.

**r. 14–15** `const product = products[0]; const isBottom = ...` — Mostra solo il primo prodotto e guarda se è un capo "sotto".

**r. 16–18** `return ( <group position={[0, 0, -0.1]}>` — Tutta la vetrina è arretrata di 10 cm verso il muro. Riga 16 vuota.

**r. 19–21** `<mesh position={[0, BOTTOM + H / 2, 0]} material={panel} ...` — Il fondale: una lastra spessa 4 cm.

**r. 22–26** `{[[0, BOTTOM + H, W + 0.06, 0.03], [0, BOTTOM, ...]].map(...` — I due listelli orizzontali della cornice, in alto e in basso.

**r. 27–31** `{[-W / 2 - 0.015, W / 2 + 0.015].map((x) => ( ...` — I due listelli verticali della cornice, ai lati.

**r. 32–34** `<mesh position={[0, BOTTOM + 0.42, 0.14]} ... args={[W ...` — La mensola, larga il 70% del fondale, a 42 cm sopra il bordo inferiore.

**r. 35–38** `<FlatGarment ... position={[0, isBottom ? BOTTOM + 1.25 ...` — Il capo appeso: più in basso se è un pantalone, più in alto se è un capo "sopra".

**r. 39–41** `</group> ) }` — Fine.

## `src/scene/debug/ColliderDebug.jsx` (40 righe)

Strumento di verifica: rende visibili i collider (le scatole invisibili contro cui il visitatore si ferma) e il grafo dei percorsi (punti e collegamenti). Si attiva solo con `?debug=<posa>&colliders=1` e non fa parte dell'esperienza normale. Lo usa `StoreCanvas`. I colori scritti qui servono solo a questa vista e si possono cambiare senza effetti sul sito.

**r. 1–3** `import * as THREE from 'three'` — `useMemo` e three.js. Riga 3 vuota.

**r. 4–8** `/** Rende visibili ciò che di solito non si vede ...` — Commento.

**r. 9** `export default function ColliderDebug({ colliders ...` — Il componente: collider e navigazione dal config.

**r. 10–11** `const byId = new Map(navigation.waypoints.map((w) => ...` — Prepara il calcolo delle linee del grafo e un elenco per trovare un waypoint (punto di passaggio) dal suo ID.

**r. 12–13** `const points = []; for (const [a, b] of navigation.links) {` — Per ogni collegamento fra due waypoint.

**r. 14–16** `points.push(pa[0], 0.05, pa[2], pb[0], 0.05, pb[2])` — Aggiunge una linea fra i due punti, 5 cm sopra il pavimento.

**r. 17** `}` — Fine del giro.

**r. 18–19** `const geometry = new THREE.BufferGeometry(); ...` — Costruisce la forma con tutte le linee.

**r. 20–22** `return new THREE.LineSegments(geometry, new ...` — Le linee, in azzurro, non toccate dal tone mapping. Riga 22 vuota.

**r. 23–24** `return ( <group>` — Inizio del disegno.

**r. 25–30** `{colliders.map((c) => ( <mesh ... <meshBasicMaterial ...` — Ogni collider come scatola "fil di ferro" (solo spigoli) arancio, con posizione, rotazione e dimensioni del config.

**r. 31** `<primitive object={graph} />` — Inserisce nella scena l'oggetto delle linee preparato sopra.

**r. 32–37** `{navigation.waypoints.map((w) => ( <mesh ... ...` — Ogni waypoint come pallina: più grande e azzurra se si può raggiungere col teletrasporto (`safeForTeleport`), più piccola e grigia altrimenti.

**r. 38–40** `</group> ) }` — Fine.

## `src/scene/debug/PerfProbe.jsx` (27 righe)

Sonda delle prestazioni: a ogni fotogramma registra tempo, ordini di disegno e triangoli, e poche volte al secondo pubblica un riassunto per l'HUD `?perf=1` e per il benchmark. Lo usa `StoreCanvas`. La frequenza di pubblicazione e la finestra di misura sono in `storeConfig.performance.monitor`; non incide sull'aspetto del negozio.

**r. 1–5** `import { sampler } from '../../lib/perf.js'` — `useRef`, `useFrame` e `useThree`, il campionatore delle misure e lo stato delle prestazioni letto dall'HUD. Riga 5 vuota.

**r. 6–10** `/** Registra ogni fotogramma nel campionatore ...` — Commento: i contatori del motore si azzerano a ogni disegno, quindi letti qui descrivono il fotogramma precedente, che è quello misurato.

**r. 11** `export default function PerfProbe({ monitor })` — Il componente.

**r. 12–13** `const { gl } = useThree(); const lastPublish = useRef(0)` — Il motore di disegno e il momento dell'ultima pubblicazione.

**r. 14–15** `useFrame(() => { const now = performance.now()` — A ogni fotogramma legge l'ora precisa. Riga 14 vuota.

**r. 16–17** `sampler.frame(now, gl.info.render.calls ...` — Registra il fotogramma con il numero di draw call e di triangoli disegnati.

**r. 18–19** `if (now - lastPublish.current < 1000 / ...` — Pubblica solo `publishHz` volte al secondo (2 nel config) e ricorda quando l'ha fatto.

**r. 20–21** `usePerfStore.setState({ stats: sampler.window(monitor.wi ...` — Pubblica le statistiche degli ultimi `windowMs` millisecondi (5000 nel config).

**r. 22** `memory: { geometries: ..., textures: ..., programs: ... }` — Pubblica anche quante forme, texture e shader sono in memoria grafica (utile per scoprire perdite di memoria).

**r. 23–25** `dpr: gl.getPixelRatio(), }) })` — E la densità di pixel in uso; fine del codice per fotogramma.

**r. 26–27** `return null }` — Non disegna nulla; fine.
