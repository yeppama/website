# CONTEXT — INTO industries · negozio streetwear immersivo 3D

> Stato al 2026-10-16 · branch `claude/cool-edison-2svzgj` (avanti rispetto a `main`, che resta alla Fase 7) · **Fase 8b chiusa** (ordine di prova #1001 pagato su Shopify) · **preparazione 8c/8d eseguita** (modello Excel del catalogo, import, controllo dal vivo, pagine legali da Shopify) · **telefono in orizzontale corretto** (Focus e schede) · **controllo completo del sito** (16 difetti confermati, 15 corretti) · 8c in attesa del catalogo del cliente e del comando
> Il piano completo (schema dati, roadmap, limiti dell'ambiente) è in `PLAN.md` v1.6. Registro prestazioni: `docs/PERF.md`.

## 1. Stato attuale

Prototipo web 3D navigabile in prima persona del brand INTO industries (Florence), con architettura data-driven pronta per un e-commerce reale. **Fasi 0–7 completate.** In produzione su `main` con contenuti dimostrativi dichiarati e `noindex` (opzione A, scelta dell'utente). Fase 6 chiusa con lo scostamento del portatile Iris Xe accettato. Prossimo: inserire i contenuti reali del cliente quando arrivano (`docs/CONTENUTI.md`) e collegare il dominio. Fase 8 (e-commerce reale) solo su comando.

## 2. Decisioni tecniche

**Stack (versioni verificate sul registry npm)**
- Vite 8.3.4 · React 19.3.1 · three 0.186.1 · @react-three/fiber 9.8.2 · @react-three/drei 10.7.9 (quasi inutilizzato) · Tailwind 4.3.3 via `@tailwindcss/vite` · Zustand 5.0.15 · `playwright-core` (solo test).
- **Tailwind** (D1): zero CSS-in-JS a runtime, il main thread serve al canvas.
- **Zustand** (D2): stato letto a 60 Hz dal render loop; Context ridisegnerebbe tutti i consumer.

**Architettura data-driven**
- `src/config/storeConfig.js` è l'unica fonte di verità: mappa, muri, collider, luci, waypoint, espositori, POI, prodotti, lookbook, testi, feature flag. Relazioni solo per ID. Nessun componente contiene coordinate, colori, prezzi o frasi.
- `src/config/validateStoreConfig.js`: 25 invarianti (I1–I25), errore bloccante solo in DEV, rimosso dal bundle di produzione.
- `src/config/designTokens.js` è l'unica fonte dei token; `scripts/generate-theme.js` genera `src/styles/theme.generated.css` (gitignored) in `predev`/`prebuild`.
- `features` in config (`navigation`, `focusMode`, `productModal`, `lookbook` attivi; `checkout` spento, fase 8): l'interfaccia mostra "In arrivo nella Fase N" per ciò che non esiste. Il bottone d'acquisto della scheda c'è, disabilitato, e lo dice.
- Prezzi formattati con `Intl.NumberFormat` e `meta.brand.locale` (`it-IT` → `189 €`), via `lib/format.js`.

**Identità visiva**
- Accento unico **Flame Orange #F98E30** (PANTONE 15-1157 TPG, simulazione a schermo), token `accent.flame`. Fondi `#060606` (negozio) e `#dcdcd8` (studio). Testo osso `#f2f0ea`. Il rosso `#c21025` solo come stato d'errore.
- Nome `INTO industries`: wordmark `INTO` + descrittore `(industries*)`, mai una parola sola.
- Motivo geometrico: l'ellisse del logo (`brandMotif.oval.ratio = 2.9`) riusata per hotspot, ping dei tap, ombre blob, bottone primario, minimappa.
- Font auto-ospitati in `public/fonts` (Archivo, JetBrains Mono, UnifrakturCook).

**Rendering e prestazioni**
- Ombre (D3-A): max 2 faretti con ombra reale su tier high/medium; tier low nessuna shadow map + ombre blob ellittiche.
- Grana (D6-B): velo CSS sopra il canvas, fuori da WebGL; tessera dimensionata per `devicePixelRatio`. Dal 2026-10-16 fusione `alpha` (solo granelli scuri) invece di `mix-blend-mode: overlay`, che su Iris Xe costava ~20 fps e alzava il nero. Nel tier low niente grana (telefoni economici: picchi fino a 140 ms sull'Adreno 619).
- `frameloop="demand"` + `FrameLimiter` (cap reale a `performance.targetFps`). Dal 2026-10-16 ritmo regolare (`lib/frameScheduler.js`): un fotogramma ogni k vsync, k = frequenza ÷ target per difetto (60 Hz → 60, 90 → 90, 120 → 60, 144 → 72). La regola vecchia ("tempo dall'ultimo ≥ 90%") dava 45 a 90 Hz; il primo correttivo (a scadenze) dava 60 irregolari a 90 Hz, alternando 11 e 22 ms (Pixel 7: mediana fra 50 e 88, 1% low 44). Il p50 del benchmark misura gli intervalli: con ritmo irregolare inganna, guardare anche l'1% low.
- `StoreCanvas` caricato con `lazy()`: JS iniziale 92 kB gzip (budget 380), chunk 3D 258 kB differito. **Niente `manualChunks`.**
- Geometrie statiche unite per materiale (`MergeByMaterial`), corpi illuminanti a istanze. Costo misurato nella zona più densa: 31 draw call su tier low (budget 60), 40 su high (budget 120).
- Memoria GPU (Fase 6): le cache condivise (`materials.js`, `garments.js`, ombra blob in `canvasText.js`) si registrano in `lib/gpuCaches.js` e si liberano solo quando l'ultimo Canvas si smonta, con rilascio differito di un turno e annullato da un rimontaggio (StrictMode-safe). Texture per montaggio (hotspot, marcature, parete del brand) liberate nel cleanup del loro effetto. Il contesto lo distrugge R3F allo smontaggio.
- Errore della scena 3D (contesto WebGL non creato, modulo 3D non scaricato): `SceneErrorBoundary` attorno al Canvas mostra l'overlay "Riprova" invece di una pagina vuota; dopo 3 errori di fila senza un fotogramma, la pagina di WebGL non disponibile. L'overlay è l'ultima trappola del focus: Tab ed ESC non arrivano a schede o menu sotto.
- Perdita del contesto WebGL: `preventDefault`, overlay `ContextLostOverlay` con "Riprova"; se il browser lo restituisce, rimontaggio automatico. Il rimontaggio cambia `key` al Canvas, il player riprende da `usePlayerStore.resumePose`, un Focus in corso si chiude. I canvas sostituiti sono in un `WeakSet`: la loro perdita forzata allo smontaggio non riapre l'overlay.
- HUD prestazioni `?perf=1` (anche in produzione) e benchmark `?bench=1` (percorso in `storeConfig.benchmark`, ~40 s, run ripetibili, riga pronta per `docs/PERF.md`). Campionatore in `lib/perf.js` alimentato da `PerfProbe` dentro il Canvas: fps = render reali, intervalli > 250 ms scartati. Durante il benchmark `benchRunning` blocca l'input (non la simulazione) e un velo copre la scena. Commit della build in `__BUILD_COMMIT__` (vite `define`, da `VERCEL_GIT_COMMIT_SHA` o git).
- Tier (Fase 6, dopo la prima misura reale): `high` solo con GPU dedicata riconosciuta nella stringa del renderer (`DISCRETE_GPU` in `deviceProfile.js`); le integrate vanno in `medium`. Su telefono (2026-10-16): GPU economiche (`BUDGET_MOBILE_GPU`: Adreno < 650, Mali G31/G51/G52/G57/G68/T, PowerVR GE/GM) → `low` anche con 8 core: un Honor con Adreno 619 finiva in medium e faceva 9,7 fps. Verificato da `npm run test:device` con le stringhe dei dispositivi misurati.
- Misure reali (docs/PERF.md): Pixel (PowerVR, medium) 60,2 / 49,8 → **superata**; Vivobook (Iris Xe) in high per errore 31,6 / 14,9, in medium corretto 37,2 / 16,5 → **fallita**. Il benchmark riporta anche il dettaglio per tratto. Diagnosi chiusa: il costo principale era la grana overlay (vedi Fase 6 sotto). Parametri di confronto `&fx=0`, `&grain=overlay|alpha`, `&warm=0`, `&tier=`.
- Scatti al primo uso (indagine 2026-10-16, `docs/PERF.md`), corretti col via dell'utente: linea del percorso unica e permanente (cambia solo la geometria), anello del tap e hotspot disegnati nel riscaldamento (`userData.warmup`: `GpuWarmup` li rende visibili per quel solo fotogramma), hotspot sempre montati e nascosti (anche in Focus), marcatore del Focus `transparent` (riusa lo shader dell'anello). Verificato: dopo il riscaldamento 2 cammini + Focus col marcatore = 0 compilazioni shader, 8 upload di buffer.
- Misure dopo le correzioni (47844b8): Vivobook 57,1 / 39,2, max 77 ms, 3 fotogrammi > 50 ms in ~40 s (soglia 58 / 45 non raggiunta di poco); iPhone 58,8 / 55,6, max 36 ms, 0 > 50 ms (superata). Nebbia: l'utente ha confermato "senza nebbia".
- Benchmark: per tratto anche fotogramma max e n oltre 50 ms; riga "Scatti" (max, > 50 ms, > 250 ms a pagina visibile, nel peggior run).
- **Nebbia:** fino alla Fase 6 non era mai disegnata (agganciata a un gruppo). Ora `LightingRig` la mette su `scene.fog`, ma `environment.fog.enabled` è `false` per scelta dell'utente (2026-10-16). Anteprima con `?fog=1` (anche in produzione).
- Nero dei capi: su telefono reale "un pelo grigio", **accettato dall'utente per ora** (2026-10-15).
- Luce: **faretti dei prodotti bianco caldo; il colore d'atmosfera solo su pareti (wall-wash) e accenti.** Esposizione in config (`performance.toneMappingExposure: 0.85`).

**Navigazione e interazione**
- Collisioni solo cerchio-contro-box (`colliders`), mai sulle mesh. Convenzione di rotazione identica a `Object3D.rotation.y` di three.
- Grafo di 16 waypoint (centro + due corridoi laterali a x = ±10.35). Percorso: diretto se libero, altrimenti Dijkstra da ogni nodo visibile + string pulling. Ogni segmento è libero da collider con margine `player.radius`.
- Desktop: WASD/frecce, Shift corsa, Pointer Lock **solo su click esplicito**, mai riattivato da solo.
- Durante la dissolvenza del teletrasporto l'input è bloccato e allo scambio il percorso si annulla. Il navigatore, se il player è appoggiato a un collider (box allargato ad angoli vivi), riprova da un punto libero a 10–35 cm (`plan` → `planFrom`).
- Mobile: tap = vai/avvicinati; trascinamento = guarda (soglie `navigation.input`); barra "Vai a" solo verso waypoint `safeForTeleport`.
- Focus Mode: macchina a stati `idle → entering → focused → exiting → idle`, interrompibile in ogni stato. La luce "studio" nasce dal contrasto (gli altri faretti scendono), non da più luce sul capo.
- Inquadratura del Focus (2026-10-16): il pannello dichiara il suo rettangolo (`useAppStore.focusPanelRect`); `FocusCameraRig` inquadra il capo nella parte di schermo libera (sopra il pannello in verticale, a sinistra in orizzontale e su desktop) con `camera.setViewOffset`, senza muovere la camera. Fov e spostamento si ricalcolano a ogni fotogramma (pannello che compare, altro capo, telefono ruotato); all'uscita fov del player per lo schermo di quel momento e `clearViewOffset`. Calcoli in `lib/framing.js` (`fovForAspect`, condiviso col player), provati con la camera di three in `npm run test:framing`.
- Schermo basso: variante Tailwind `short` = `@media (max-height: 520px) and (orientation: landscape)` (conta l'altezza: un telefono in orizzontale è largo come un tablet; una finestra bassa ma stretta resta col layout verticale). La minimappa usa ancora `[@media(max-height:520px)]` senza orientamento, di proposito. In `short` il pannello del Focus sta sempre a destra (anche sotto i 640 px di larghezza) e scorre se è più alto dello schermo. Schede a tutto schermo con intestazione compatta; scheda prodotto con immagine misurata sull'altezza (`--sheet-frame-h`, `placeholders.productFrame`) ferma a sinistra e, a destra, prima colori, taglie e acquisto; pannello del Focus compatto.
- `viewport-fit=cover` tolto (2026-10-16): nessun elemento usava `env(safe-area-inset-*)`, quindi in orizzontale marchio e pannelli potevano finire sotto la Dynamic Island. Safari ora tiene la pagina nell'area sicura e colora le fasce col fondo nero.
- Schede (Fase 5): pila `dialogs` in `useAppStore`, una sola finestra visibile (`DialogHost`, z `dialog` = 45, sopra menu e Focus). Si aprono da: "Scheda completa" nel Focus, capi del menu, "Apri la Brand Story" nel menu, hotspot `poi-look-01`, pannello della parete del brand (tap o click col mirino), capi del Lookbook. ESC/Indietro tolgono un livello, Chiudi/fondo tutti; riaprire una voce già nella pila torna lì invece di accumulare.
- Con una scheda aperta `blocked()` è vero; all'apertura tasti, velocità e percorso si azzerano e il Pointer Lock si rilascia; alla chiusura non si riprende da solo.
- `useFocusTrap` (schede e menu): pila globale di trappole, solo l'ultima risponde; ESC catturato in fase di cattura sulla finestra con `stopPropagation`, così non chiude anche il menu o il Focus sotto. Il focus torna a chi ha aperto.
- Hosting: integrazione Git di Vercel; ogni push sul branch produce una Preview. GitHub Pages disattivato (dichiarato dall'utente, non verificabile dal container).

## 3. Codice di riferimento

**Struttura**
```
src/config/        storeConfig.js · designTokens.js · validateStoreConfig.js
src/lib/           geometry.js · collision.js · navigator.js · materials.js · garments.js · canvasText.js · noise.js · deviceProfile.js · format.js · gpuCaches.js · perf.js · bench.js
src/commerce/      index.js (modo e contratto del fornitore) · mock.js (negozio di prova) · shopify.js (Storefront API)
src/lib/sanitizeHtml.js   filtro dell'HTML esterno (pagine legali del venditore)
src/state/         useAppStore.js · usePlayerStore.js · usePerfStore.js · useCartStore.js · useLegalStore.js
src/scene/         StoreCanvas.jsx · MergeByMaterial.jsx · environment/ · lighting/ · displays/ · player/ · debug/
src/ui/            onboarding/ · hud/ · menu/ · focus/ · dialog/ · product/ · lookbook/ · cart/ · legal/ · perf/ · bench/ · primitives/ · fx/ · fallback/
scripts/           generate-theme.js · test-navigation.mjs · test-framing.mjs · test-catalog.mjs · export-shopify-csv.mjs · e2e/e2e-phase{1b,2,3,4,5,6,8a,8b}.mjs · e2e/e2e-landscape.mjs
scripts/catalog/   schema.mjs (colonne del modello) · make-template.mjs · importer.mjs · import.mjs · shopify-csv.mjs · check.mjs
docs/              PERF.md (registro delle misure) · CONTENUTI.md (cosa serve dal cliente) · modello-catalogo-INTO.xlsx (da compilare) · PLAN-8.md
docs/MANUALE.md    come funziona il sito e "voglio cambiare X → dove" (per l'utente)
docs/codice/       spiegazione riga per riga di tutti gli 80 file del sito (commit ac1cb32): da aggiornare quando un file cambia molto
```

**Geometria (`src/lib/geometry.js`) — convenzione di three, verificata contro le sue matrici**
```js
// mondo → locale            lx = dx·cosθ − dz·sinθ    lz = dx·sinθ + dz·cosθ
// locale → mondo            x = cx + lx·cosθ + lz·sinθ    z = cz − lx·sinθ + lz·cosθ
toLocal([x, z], collider)            toWorld([lx, lz], collider)
pointInCollider(point, collider, margin = 0)          // box allargato ad angoli vivi: prudente, per i percorsi
circleOverlapsCollider(point, collider, radius)       // angoli arrotondati: modello fisico esatto
segmentHitsCollider(a, b, collider, margin = 0)       // metodo delle slab sul piano
rayHitsCollider(origin, dir, collider) → t | null     // 3D, per i tap
zoneAt([x, z], zones)   inAnyArea([x, z], areas)   clampToAreas([x, z], areas)
```

**Collisioni e percorsi**
```js
moveWithCollisions(pos, dx, dz, { radius, colliders, walkableAreas, maxStep })  // muta pos, sotto-passi < raggio
createNavigator(config) → { plan(from, to), isWalkable(p), clear(a, b), nodes }
// plan → { ok: true, points: [[x, z], …] } | { ok: false, reason: 'blocked' | 'unreachable' }
```

**Simulazione in tempo reale anche a pochi fps (`PlayerController`)**
```js
let remaining = Math.min(delta, I.maxCatchUp)          // 0.25 s: oltre, rallentatore invece di salto
while (remaining > 1e-6) { const dt = Math.min(remaining, I.maxStepDt); step(dt, now); remaining -= dt }
```

**Limite fps reale**
```jsx
<Canvas frameloop="demand"> … // FrameLimiter: rAF proprio, invalidate() se now − last ≥ (1000 / fps) · 0.9
```

**Materiale con texture** — `getMaterial(id, spec, { repeat, grid })`: se c'è una mappa, `color = 0xffffff` (three moltiplica colore × mappa).

**Stato e comandi**
```js
useAppStore: openDialog(kind: 'product' | 'lookbook', id), backDialog(), closeDialogs(),
             enterFocus(displayId, returnPose{ x, z, eye, yaw, pitch, fov }), exitFocus(), setFocusState(s),
             finishFocusExit(), cycleProduct(delta, count), showNotice(text, ms)
usePlayerStore.getState().issue({ type: 'teleport', waypointId })          // solo waypoint safeForTeleport
usePlayerStore.getState().issue({ type: 'goto', point: [x, z], faceAt? })
// usati dal benchmark: { type: 'place', waypointId } · { type: 'focus', displayId } · { type: 'face', point }
```

**Unione delle geometrie statiche** — `<MergeByMaterial enabled>{…mesh statiche…}</MergeByMaterial>`; ciò che si muove (es. `ActiveMarker`) va tenuto fuori.

**Comandi**
```bash
npm run dev | build | preview          # predev/prebuild rigenerano i token
npm run test:nav                       # logica di navigazione, 10 test
npm run test:device                    # scelta del tier da stringhe GPU reali, 13 test
npm run test:commerce                  # contratto del fornitore Shopify con fetch finto, 10 test
npm run test:catalog                   # importatore del catalogo sul modello Excel vero, 22 test
npm run test:framing                   # inquadratura del Focus contro la camera di three e limitatore di fps, 9 test
# e2e-landscape.mjs: Focus e schede su 5 formati bassi (anche Safari con le barre, 852×330, e 568×320), verticale e desktop; rotazione durante il Focus
npm run catalog:template               # rigenera docs/modello-catalogo-INTO.xlsx dallo schema
npm run catalog:import -- <file.xlsx> [uscita] [--foto <cartella>]   # resoconto.md sempre; CSV Shopify, bozza dei capi, testi EN solo senza errori
npm run check:catalog -- [--domain x --token y] [--launch]           # DAL VIVO: storeConfig ↔ Shopify (criterio della 8c); --launch pretende le pagine legali
# e2e-phase8b.mjs <base> <out> [PAESE]: prova DAL VIVO sul negozio di sviluppo (serve rete verso *.myshopify.com), 12 verifiche con STORE_PASSWORD
# e2e-phase8a.mjs: carrello col negozio di prova (?commerce=mock) e pagine legali (filtro HTML attaccato apposta), 45 verifiche
npx vite preview --port 4173 &         # poi, per ogni suite:
node scripts/e2e/e2e-phase6.mjs http://127.0.0.1:4173/ <cartella-output>   # 30 verifiche, ~4 min (fase 5: 34)
# `pkill -f "vite preview"` dentro un comando che contiene quella stringa uccide la shell stessa: usare `setsid` all'avvio e `pkill -f "port 4173"` a parte
# CHROMIUM_PATH sovrascrive il Chromium di default (/opt/pw-browsers/chromium-1194/…)
```

**Parametri di debug** (attivi solo con `?debug=`): `?debug=top|front|<id inquadratura>|<id espositore>` (camera fissa), `&colliders=1` (collider + grafo), `&tier=low|medium|high`, `&fps=N`. Espone `window.__player`, `__nav`, `__camera`, `__stores`, `__scene`, `__gl`, `__remountScene()`, `__benchResult`.
**Parametri anche in produzione:** `?perf=1` (HUD prestazioni), `?bench=1` (benchmark); con entrambi `&tier=`, `&fx=0`, `&grain=overlay|alpha`, `&warm=0`. `?fog=1|0` anteprima della nebbia. `?commerce=mock` negozio di prova (`&mockerror=1` fornitore in errore). `?commerce=shopify` negozio Shopify di sviluppo.

## 4. Lezioni apprese & edge case

**Rendering**
- `color` + `map` con lo stesso colore = colore al quadrato (pavimento nero, griglia invisibile). Con una mappa il colore va a bianco.
- Il dispose della cache GPU su unmount React rompe tutto in StrictMode (texture distrutte, materiali ancora referenziati). Risolto in Fase 6 legandolo al Canvas con rilascio differito (`gpuCaches.js`).
- `<primitive object>` non viene liberato da R3F: la linea del percorso lasciava geometria e materiale a ogni tap. E un `<Ping key={id}>` rimontato a ogni tap lasciava l'anello vecchio in scena (causa interna a R3F non isolata): ora un solo anello riusato. Misurato: 33 → 81 geometrie in 24 spostamenti prima, stabile dopo.
- `gl.info.memory` cresce legittimamente la prima volta che un oggetto viene disegnato: i test di perdita vanno fatti dopo un riscaldamento, e a pochi fps un hotspot può comparire solo al secondo giro.
- Ripristino del contesto: smontare il Canvas vecchio forza un'altra perdita di contesto, che arriva dopo il rimontaggio. Va ignorata (canvas ritirati).
- In SwiftShader il p50 reale è ~10–14 fps: il test del limitatore usa un tetto di 10, non 20.
- `manualChunks` su three lo metteva fra i `modulepreload`, annullando il lazy import. E un componente del bundle iniziale che importa `materials.js` trascina dentro tutto three: le utilità 2D stanno in `noise.js`.
- Senza `frameloop="demand"`, `invalidate()` non fa nulla: il "limitatore" girava a 120 fps su schermi a 120 Hz.
- Con oggetti vicino alle luci, i valori tarati per pareti vuote sovraespongono: un nero (albedo 0.004) diventa mezzotono o caramello. Si misura sulla scena vera (felpa ≤ ~51/255, pedana ~229/255).
- Faretti di colore saturo sui prodotti ne falsano il colore. Prodotti in bianco caldo, colore sulle pareti.
- Il fov in three è **verticale**: in verticale su telefono va allargato (regola `minHorizontal`), sia per il player sia per il Focus.
- Gli eventi di input possono arrivare fra due fotogrammi: `camera.updateMatrixWorld()` prima di ogni raycast.

**Navigazione**
- La convenzione di rotazione dei collider era speculare rispetto a three (corretta in fase 3). Va testata contro le matrici di three, non a ragionamento.
- Grafo troppo rado: il 2% del pavimento era invisibile da ogni nodo → corridoi laterali. Considerare tutti i nodi visibili, non i 3 più vicini.
- Tagliare `dt` a frame lenti porta la simulazione al rallentatore: si recupera il tempo a sotto-passi.
- L'invariante I16 ha trovato un collegamento che attraversava il plinto: ogni nuovo collider va validato contro i collegamenti del grafo.
- Uscendo dal Focus dopo un avvicinamento, la rotazione verso l'espositore va applicata prima di salvare la posa di ritorno.

**UX**
- Test verdi non dicono che la resa è giusta: in Fase 5 la galleria del Lookbook tagliava l'immagine 16:9 e le miniature troncavano l'etichetta, con 34/34. Guardare sempre gli screenshot.
- Immagini di ratio diversi in una cornice fissa: `h-full` + `aspect-ratio` sfora se l'immagine è più larga della cornice; scegliere in JS fra `w-full` e `h-full` confrontando i ratio.
- Su telefono nome e prezzo vanno sopra la galleria, o un 4:5 a tutta larghezza li spinge sotto la piega.
- Mai istruzioni per comandi che non esistono: l'utente ha creduto rotto il touch. Feature flag + I15.
- L'onboarding deve scorrere: su un telefono in orizzontale (~390 px) "Entra" era irraggiungibile.
- Telefono in orizzontale (segnalato dall'utente il 2026-10-16): il pannello del Focus copriva il capo e la scheda mostrava solo un'immagine più alta dello schermo. Le verifiche della Fase 6 controllavano che i bottoni fossero nello schermo, non che il capo fosse visibile: ora `e2e-landscape.mjs` proietta il capo e controlla che non cada sotto il pannello. Ruotare il telefono durante il Focus lasciava il fov del vecchio orientamento anche dopo l'uscita: corretto.
- Telefono in orizzontale (844×390): la minimappa larga `sm:w-44` (alta 264 px) spingeva la barra "Vai a" fuori dallo schermo. Ora `[@media(max-height:520px)]:w-16`. Trovato dalla verifica responsive della Fase 6, non a occhio.
- Un testo lungo (l'avviso di rendering software) allargava l'HUD prestazioni su mezza scena: pannelli informativi a larghezza fissa.
- Prompt fissi in percentuale e prompt nel flusso si sovrappongono: stessa colonna, impilati.
- Una barra a scorrimento con l'ultima voce tagliata sembra un difetto: griglia a colonne uguali, corpo `clamp()`, verificata a 320/360/390/430 px.
- Tasti premuti all'apertura del menu o alla perdita di focus: azzerarli, o il player cammina da solo.

**Test e processo**
- Le richieste dirette di Playwright (`ctx.request`) non passano dal proxy del container: le verifiche di rete si fanno dal browser (`page.goto`, `fetch` nella pagina).
- Una pagina che risponde 200 non è per forza quella attesa: la "cassa" Shopify era la pagina `/password`. Controllare l'indirizzo d'arrivo.
- Script Python che riscrivono file: `open(p,'w')` svuota il file prima di `write()`. Una virgola in coda ha reso il contenuto una tupla, `write()` è fallito e `storeConfig.js` è rimasto vuoto (ripristinato da git). Controllare la dimensione del file dopo ogni riscrittura.
- Un comando interrotto o rifiutato dall'utente può aver già applicato una parte delle modifiche: prima di ogni commit leggere `git diff`, non fidarsi di `git add -A`. In Fase 6 una riduzione d'intensità fermata dall'utente è finita nel commit `7945fa8` senza che venisse dichiarata.
- In questo container il desktop rende a 1–2 fps: i test aspettano **condizioni**, mai millisecondi fissi; dopo uno spostamento forzato aspettano che la camera abbia raggiunto il player.
- Il sistema di luci del Focus riporta le intensità al config ogni fotogramma: modificarle a mano dal test non ha effetto.
- I test devono leggere i valori di taratura dal config, non ricopiarli.
- Selettori per etichetta ambigui (stesso testo in menu e barra): restringere al contenitore.
- Heredoc bash non quotati espandono i `${…}` dei template JS: usare `<<'EOF'`.
- **Committare solo dopo aver letto l'esito**: una catena `… | tail && git commit` committa anche con test rossi.
- Il Pointer Lock funziona nel Chromium headless di questo ambiente.
- Il `fetch` di Node ignora `HTTPS_PROXY`: senza `NODE_USE_ENV_PROXY=1` nel container fallisce (ENOTFOUND). `check.mjs` si rilancia da solo con la variabile se trova un proxy.
- Da quando il container raggiunge il negozio di sviluppo, il test "Shopify irraggiungibile" taglia la rete da sé (`page.route(...).abort`): un test che dipende dalla rete chiusa smette di provare qualcosa quando la rete si apre.
- Shopify con `@inContext(language: IT)` su un negozio senza italiano risponde nella lingua predefinita, senza errore (verificato).
- `pkill -f "port 4173"` uccide anche la shell che lo esegue (exit 144), perché la sua riga contiene la stessa stringa: è innocuo se è l'unico comando, ma poi va controllato con `curl` che il server sia davvero fermo.
- Un workflow con molti agenti può fermarsi per il limite di utilizzo della sessione: il primo controllo completo ha finito 2 agenti su 14. Dichiararlo, non presentare la parte fatta come completa.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, né l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA, non nome del branch).

## 5. Prossimi passi

**Regole di processo (dall'utente):** una fase alla volta; si avanza solo col comando esplicito `Approvato, procedi alla fase X`; a fine fase build, dev server, verifica nel browser, report che distingue eseguito / non eseguito / bloccato, poi stop. Fase 8 (e-commerce reale) solo su comando futuro.

- ~~Fase 5~~ — consegnata: scheda prodotto, Lookbook / Brand Story, trappola del focus, I21–I22, suite `e2e-phase5.mjs`.
- ~~Fase 6~~ — **chiusa dall'utente il 2026-10-16.** Memoria GPU stabile, perdita di contesto gestita, HUD `?perf=1`, benchmark `?bench=1` con dettaglio per tratto e scatti, `docs/PERF.md`, verifica responsive su 8 formati, tier corretto (GPU integrate → medium, iPhone → medium), grana `alpha`, riscaldamento GPU e niente lavoro al primo uso. Misure reali: Pixel 60,2 / 49,8 ✓ · iPhone 58,8 / 55,6 ✓ · Vivobook 57,1 / 39,2 ✗ di poco, **scostamento accettato dall'utente** (carico costante della GPU integrata, 3 fotogrammi > 50 ms in ~40 s). Android di fascia bassa misurato il 2026-10-16: Honor Adreno 619 9,7 fps in medium (tier sbagliato, corretto), in low (corretto) 59,9 / 43,5 → superata; con grana 4 fotogrammi > 50 ms, senza 0: grana spenta nel tier low (**decisione dell'utente, 2026-10-16**; `alphaOpacity.low = 0`, la vignettatura resta). Pixel 7 (Mali-G710, 90 Hz) 90,1 / 71,4 col limitatore a ritmo regolare; Pixel 10 60,2 / 55,2.
- Storia della Fase 6 (dettagli in `docs/PERF.md`): grana `alpha` scelta dall'utente (intensità 0,2 / 0,18 / 0,15); diagnosi Vivobook: overlay ~20 fps; scatti al primo uso eliminati (linea del percorso, hotspot, anello, marcatore); nebbia agganciata correttamente ma spenta per scelta dell'utente.
- **Fase 7 — eseguita con l'opzione A (2026-10-16):** l'utente ha scelto di andare in produzione subito, con i segnaposto dichiarati, senza aspettare il materiale del cliente. `main` portato in avanti (fast-forward) allo stato del branch di lavoro; Vercel pubblica la produzione da `main`. Il sito di produzione è fuori dai motori di ricerca (`X-Robots-Tag` in `vercel.json` + meta robots in `index.html`): da togliere coi contenuti reali. `vercel.json` aggiunge anche header di sicurezza e cache lunga per `/assets`.
- Storico: la Fase 7 era stata approvata con condizione ("se tutto ok, approvato procedi alla fase 7"), cioè parte quando arriva il materiale e risulta completo e utilizzabile. I contenuti vengono **dal cliente** dell'utente (l'utente fa da tramite). Dominio: acquistato, verrà fornito a materiale pronto. Finché il materiale non c'è, non si tocca `main` e non si pubblica in produzione.
- Opzione B scelta dall'utente (2026-10-16): prima i contenuti reali, poi la produzione. L'utente manderà brand identity e logo; elenco completo di cosa serve in `docs/CONTENUTI.md`. La produzione è pubblica (la protezione di Vercel copre solo le anteprime): niente contenuti segnaposto non dichiarati. iPhone misurato = iPhone 16.
- **Fase 8b — chiusa (2026-10-16):** `src/commerce/shopify.js` (Storefront API dal browser, token pubblico, `@inContext(country)`, carrello `cartCreate/cartLinesAdd/Update/Remove`, varianti tradotte negli id di storeConfig dalle opzioni `Taglia`/`Colore`). Negozio di sviluppo `into-industries-dev.myshopify.com`, token pubblico, API **2026-10** (ultima stabile, fino al 2027-10-16) in `storeConfig.commerce.shopify` (sostituibili con `VITE_SHOPIFY_*`); `testMode` → avviso. Provider di default ancora `off`; `?commerce=shopify` per provarlo; `?debug=x&country=XX` forza il paese (diagnosi). Rete del container aperta dall'utente verso `into-industries-dev.myshopify.com` e `shopify.dev`.
  - Dal vivo (`e2e-phase8b.mjs`, argomento paese opzionale): con `US` catalogo, varianti, carrello, quantità, subtotale, persistenza e rimozione funzionano su Shopify. **Il negozio vende solo in US/USD**: per IT Shopify segna la merce esaurita (`MERCHANDISE_OUT_OF_STOCK`) e la aggiunge con quantità 0. **La cassa porta a `/password`** (protezione dei negozi di sviluppo).
  - Correzioni nate dalla prova dal vivo: i `warnings` delle mutazioni del carrello arrivano con il carrello e il negozio non conferma l'aggiunta (`copy.cart.stockWarning`); `getProducts` legge `localization.availableCountries` e, se il paese non c'è, il catalogo va in errore ("non disponibile") invece di mostrare prezzi in un'altra valuta.
  - Negozio configurato dall'utente (IT/EUR, spedizione, gateway di prova). `STORE_PASSWORD=… node scripts/e2e/e2e-phase8b.mjs <base> <out>`: **12/12 dal vivo con l'Italia** (con le pagine legali), cassa compresa (capo, taglia, 567,00 € in EUR). La password del negozio si passa solo come variabile d'ambiente: mai in un file.
- **Preparazione 8c/8d — eseguita (2026-10-16, "approvato passo 1 e 2"):**
  - **Modello del catalogo** `docs/modello-catalogo-INTO.xlsx` (fogli Leggimi, Capi, Colori, Lookbook, Brand, Domande; menu a tendina, aiuti sulle intestazioni, riga d'esempio ignorata, colonne EN per la 8f). Generato da `scripts/catalog/schema.mjs`, che usa anche l'importatore.
  - **Import** (`npm run catalog:import`): errori con foglio/riga/colonna in italiano; uscite solo senza errori: `shopify-catalogo.csv`, `catalogo.bozza.js` (forma di storeConfig, `displayId` null: la posizione 3D la decide una persona), `traduzioni.en.json`, `resoconto.md` con le risposte di Brand e Domande. Cartella `catalogo-importato/` fuori da git. Giro completo verificato: i 7 capi dimostrativi danno lo stesso CSV dell'esportatore della 8b.
  - **Controllo dal vivo** (`npm run check:catalog`): negozio di sviluppo allineato (0 errori); negozio del cliente: 7 errori attesi (vuoto), IT/EUR e lingua IT ok.
  - **Pagine legali da Shopify** (`commerce.policies`, I25): 7 campi della Storefront API (condizioni di vendita, recesso, spedizioni, privacy, termini, note legali, contatti), chiesti nella lingua del sito; il menu mostra solo quelle pubblicate, la scheda `kind: 'legal'` mostra l'HTML del venditore ripulito da `sanitizeHtml`. Dal vivo sul negozio di sviluppo: la privacy generata da Shopify (16 276 caratteri) si apre e si legge. Entrambi i negozi oggi hanno solo quella, **in inglese**.
  - Difetto trovato e non corretto (fuori dal compito): con il commercio attivo menu, pannello del Focus e capi del Lookbook mostrano ancora i prezzi di storeConfig e la nota "Nessun acquisto è possibile" (anche nella scheda prodotto). Da sistemare in 8c, tutto insieme.
- **Controllo completo del sito (2026-10-16, chiesto dall'utente):** workflow di revisione, 7 revisori (camera e stato dell'orizzontale, navigazione, Focus/schede/menu, commercio, GPU/prestazioni, configurazione/script) + un verificatore per segnalazione. 17 segnalazioni, 16 confermate, 0 smentite. Corrette: pannello del Focus a destra sotto i 640 px; input bloccato durante il teletrasporto; percorso da un player appoggiato a un ostacolo; trappola del focus dell'overlay di contesto perso; testi scritti nei componenti spostati in `copy` (`onboarding.ready`, `focus.colorways`, `hud.minimap`, `menu.closeLabel`, `hud.youAreHere`); nome accessibile dei campioni colore; carrello scaduto o già pagato dimenticato e aggiunta ritentata su un carrello nuovo; errore del carrello che non segue su un altro capo; ripristino del carrello che non sovrascrive uno appena creato; catalogo in errore che si riprova ("Riprova" nella scheda); limitatore di fps; barriera d'errore della scena; importatore (colonna facoltativa cancellata, formule con errore, colori con lo stesso codice) e I20 (id di taglia/colore ripetuti). Non corretto: prezzi col commercio attivo (8c).
- **Negozio del cliente (da trasferire):** `into-industries-ayehghmw.myshopify.com`, token pubblico in `docs/PLAN-8.md` §6. Verificato in sola lettura: EUR, IT, lingua italiana predefinita, catalogo vuoto. Rete del container aperta verso questo host.
  - **Pagamento di prova fatto dall'utente a mano** (dal container no: i campi carta vengono da `checkout.pci.shopifyinc.com`, bloccato dal proxy insieme a `cdn.shopify.com` e ai domini `*.shopifysvc.com`). Anteprima `bb6b5b3` con `?commerce=shopify` → ordine **#1001**: Heavy Hoodie M / Black, 189,00 € in EUR, spedizione Standard gratuita in Italia, carta di prova `1`, "Pagato", canale "Into Industries Dev Headless". Verificato dagli screenshot dell'utente (conferma e pannello ordini), non dal container: il token pubblico non legge gli ordini.
  - Non verificato: carrello vuoto al ritorno sul sito dopo l'ordine ([Probabile] `cart(id)` di un carrello completato è `null` → `useCartStore.init` cancella l'id). Rimandati alla 8e: tariffe di spedizione reali (ora gratuita), foto dei capi su Shopify (la cassa mostra un segnaposto), ritorno dalla cassa al sito ("Ordine ricevuto", piano §3) e dove porta "continua gli acquisti" di Shopify.
- **Fase 8a — consegnata (2026-10-16):** carrello completo col negozio di prova. `src/commerce/` (contratto del fornitore in `index.js`, `mock.js`), `src/state/useCartStore.js`, `src/ui/cart/` (`CartSheet` come scheda `kind: 'cart'` della pila `dialogs`, `CartButton` in HUD e menu). `storeConfig.commerce` (provider `off` di default, `?commerce=mock` per provarlo, `&mockerror=1` simula il fornitore in errore), `products[].commerce.handle`. Invarianti I23 (handle valido e unico) e I24 (regole del commercio); oggi 25 con I25. Con commercio attivo prezzo, varianti e taglie disponibili vengono solo dal fornitore; se non risponde il capo è "non disponibile", mai col prezzo di storeConfig. Suite `e2e-phase8a.mjs` (oggi 45 verifiche, con le pagine legali).
- **Fase 8 — piano:** `docs/PLAN-8.md`. Decisioni: Shopify headless, account del cliente a suo nome, vendita UE in EUR, carrello. Sotto-fasi 8a (carrello con fornitore finto, nessuna dipendenza) → 8b (negozio Shopify di sviluppo) → 8c (catalogo del cliente) → 8d (dati e pagine legali) → 8e (messa in vendita). 8a e 8b chiuse; 8c in attesa del catalogo del cliente.
- ~~Fase 7~~ — produzione su `main` (opzione A). L'URL pubblico lo verifica l'utente: dal container `*.vercel.app` non è raggiungibile.
- **Piccole incongruenze trovate scrivendo `docs/codice/` (2026-10-17, non corrette):** testi scritti nei componenti invece che in `copy` (`canvasText.js` r. 88 e 100, fra cui "IN ARRIVO FASE 5" ormai falso; `PlaceholderImage` "ERRORE", "PLH", "Segnaposto:"; `WebGLFallback` "renderer rilevato"; `PerfHud` "tier/dpr/cap"; `Hud.jsx` "touch/puntatore"; `Minimap.jsx` "zone") · `placeholders.skeleton.minVisibleMs` mai applicato · campi di config letti da nessuno (`zones[].accentColor/ambientBoost`, `spots[].kind/zoneId`, `tiers.*.envMapResolution`, `grain.mode`, `benchmark.suggestedRuns`, token `weight/border/breakpoint`) · variabili inutilizzate (`pad` in Minimap, `zones` in MenuDrawer, `zoneAt` riesportato da deviceProfile) · commento "12 passi" della grana (sono 10) · `font-display` ripetuto in fonts.css · `browserLabel` del benchmark probabilmente scrive "Chrome" anche per Edge/Opera · griglia del pavimento condivisa fra materiali con la stessa griglia.
- **Demo "negozio finito" (2026-10-17):** piano in `docs/PIANO-DEMO.md`, da fare in una sessione nuova sul branch `demo/vetrina` (creato da questo branch, non da `main`). Parte solo con `Approvato, procedi con la demo` e le tre scelte (scopo, foto, capi 3D).
- **Aperti:** P1 logo vettoriale (oggi PNG 150×150 → wordmark tipografico di riserva) · P3 conferma tagline "We're just looking for somewhere" (ora visibile come titolo nella Brand Story: va confermata prima di un lancio) · dati prodotto reali · testi e immagini reali del Lookbook (oggi segnaposto dichiarati).
- **In attesa di riscontro dall'utente:** misura su un Android di fascia media (tier low, soglia p50 ≥ 40), mai fatta · checklist mobile della fase 5 (scheda prodotto e Lookbook su un telefono vero, in verticale e in orizzontale) · checklist mobile della fase 4 (telefono in orizzontale, tap-avvicinamento-Focus, resa del nero) e sensibilità del trascinamento (`navigation.player.lookSensitivity.mobileDrag`).
