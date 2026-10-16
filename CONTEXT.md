# CONTEXT — INTO industries · negozio streetwear immersivo 3D

> Stato al 2026-10-15 · branch `claude/cool-edison-2svzgj` · Fase 6 consegnata
> Il piano completo (schema dati, roadmap, limiti dell'ambiente) è in `PLAN.md` v1.6. Registro prestazioni: `docs/PERF.md`.

## 1. Stato attuale

Prototipo web 3D navigabile in prima persona del brand INTO industries (Florence), con architettura data-driven pronta per un e-commerce reale. **Fasi 0–6 completate, verificate e pubblicate**; in attesa del comando dell'utente `Approvato, procedi alla fase 7` (verifica del deploy di produzione). Le misure di prestazioni su dispositivi reali mancano: le fa l'utente con `?bench=1` (procedura in `docs/PERF.md`).

## 2. Decisioni tecniche

**Stack (versioni verificate sul registry npm)**
- Vite 8.3.4 · React 19.3.1 · three 0.186.1 · @react-three/fiber 9.8.2 · @react-three/drei 10.7.9 (quasi inutilizzato) · Tailwind 4.3.3 via `@tailwindcss/vite` · Zustand 5.0.15 · `playwright-core` (solo test).
- **Tailwind** (D1): zero CSS-in-JS a runtime, il main thread serve al canvas.
- **Zustand** (D2): stato letto a 60 Hz dal render loop; Context ridisegnerebbe tutti i consumer.

**Architettura data-driven**
- `src/config/storeConfig.js` è l'unica fonte di verità: mappa, muri, collider, luci, waypoint, espositori, POI, prodotti, lookbook, testi, feature flag. Relazioni solo per ID. Nessun componente contiene coordinate, colori, prezzi o frasi.
- `src/config/validateStoreConfig.js`: 22 invarianti (I1–I22), errore bloccante solo in DEV, rimosso dal bundle di produzione.
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
- Grana (D6-B): velo CSS sopra il canvas, fuori da WebGL; tessera dimensionata per `devicePixelRatio`. Dal 2026-10-16 fusione `alpha` (solo granelli scuri) invece di `mix-blend-mode: overlay`, che su Iris Xe costava ~20 fps e alzava il nero.
- `frameloop="demand"` + `FrameLimiter` (cap reale a `performance.targetFps`).
- `StoreCanvas` caricato con `lazy()`: JS iniziale 92 kB gzip (budget 380), chunk 3D 258 kB differito. **Niente `manualChunks`.**
- Geometrie statiche unite per materiale (`MergeByMaterial`), corpi illuminanti a istanze. Costo misurato nella zona più densa: 31 draw call su tier low (budget 60), 40 su high (budget 120).
- Memoria GPU (Fase 6): le cache condivise (`materials.js`, `garments.js`, ombra blob in `canvasText.js`) si registrano in `lib/gpuCaches.js` e si liberano solo quando l'ultimo Canvas si smonta, con rilascio differito di un turno e annullato da un rimontaggio (StrictMode-safe). Texture per montaggio (hotspot, marcature, parete del brand) liberate nel cleanup del loro effetto. Il contesto lo distrugge R3F allo smontaggio.
- Perdita del contesto WebGL: `preventDefault`, overlay `ContextLostOverlay` con "Riprova"; se il browser lo restituisce, rimontaggio automatico. Il rimontaggio cambia `key` al Canvas, il player riprende da `usePlayerStore.resumePose`, un Focus in corso si chiude. I canvas sostituiti sono in un `WeakSet`: la loro perdita forzata allo smontaggio non riapre l'overlay.
- HUD prestazioni `?perf=1` (anche in produzione) e benchmark `?bench=1` (percorso in `storeConfig.benchmark`, ~40 s, run ripetibili, riga pronta per `docs/PERF.md`). Campionatore in `lib/perf.js` alimentato da `PerfProbe` dentro il Canvas: fps = render reali, intervalli > 250 ms scartati. Durante il benchmark `benchRunning` blocca l'input (non la simulazione) e un velo copre la scena. Commit della build in `__BUILD_COMMIT__` (vite `define`, da `VERCEL_GIT_COMMIT_SHA` o git).
- Tier (Fase 6, dopo la prima misura reale): `high` solo con GPU dedicata riconosciuta nella stringa del renderer (`DISCRETE_GPU` in `deviceProfile.js`); le integrate vanno in `medium`. Verificato da `npm run test:device` con le stringhe dei dispositivi misurati.
- Misure reali (docs/PERF.md): Pixel (PowerVR, medium) 60,2 / 49,8 → **superata**; Vivobook (Iris Xe) in high per errore 31,6 / 14,9, in medium corretto 37,2 / 16,5 → **fallita**. Il benchmark riporta anche il dettaglio per tratto. Diagnosi chiusa: il costo principale era la grana overlay (vedi Fase 6 sotto). Parametri di confronto `&fx=0`, `&grain=overlay|alpha`, `&warm=0`, `&tier=`.
- Scatti al primo uso (indagine 2026-10-16, `docs/PERF.md`), corretti col via dell'utente: linea del percorso unica e permanente (cambia solo la geometria), anello del tap e hotspot disegnati nel riscaldamento (`userData.warmup`: `GpuWarmup` li rende visibili per quel solo fotogramma), hotspot sempre montati e nascosti (anche in Focus), marcatore del Focus `transparent` (riusa lo shader dell'anello). Verificato: dopo il riscaldamento 2 cammini + Focus col marcatore = 0 compilazioni shader, 8 upload di buffer.
- Benchmark: per tratto anche fotogramma max e n oltre 50 ms; riga "Scatti" (max, > 50 ms, > 250 ms a pagina visibile, nel peggior run).
- **Nebbia:** fino alla Fase 6 non era mai disegnata (agganciata a un gruppo). Ora `LightingRig` la mette su `scene.fog`, ma `environment.fog.enabled` è `false` per scelta dell'utente (2026-10-16). Anteprima con `?fog=1` (anche in produzione).
- Nero dei capi: su telefono reale "un pelo grigio", **accettato dall'utente per ora** (2026-10-15).
- Luce: **faretti dei prodotti bianco caldo; il colore d'atmosfera solo su pareti (wall-wash) e accenti.** Esposizione in config (`performance.toneMappingExposure: 0.85`).

**Navigazione e interazione**
- Collisioni solo cerchio-contro-box (`colliders`), mai sulle mesh. Convenzione di rotazione identica a `Object3D.rotation.y` di three.
- Grafo di 16 waypoint (centro + due corridoi laterali a x = ±10.35). Percorso: diretto se libero, altrimenti Dijkstra da ogni nodo visibile + string pulling. Ogni segmento è libero da collider con margine `player.radius`.
- Desktop: WASD/frecce, Shift corsa, Pointer Lock **solo su click esplicito**, mai riattivato da solo.
- Mobile: tap = vai/avvicinati; trascinamento = guarda (soglie `navigation.input`); barra "Vai a" solo verso waypoint `safeForTeleport`.
- Focus Mode: macchina a stati `idle → entering → focused → exiting → idle`, interrompibile in ogni stato. La luce "studio" nasce dal contrasto (gli altri faretti scendono), non da più luce sul capo.
- Schede (Fase 5): pila `dialogs` in `useAppStore`, una sola finestra visibile (`DialogHost`, z `dialog` = 45, sopra menu e Focus). Si aprono da: "Scheda completa" nel Focus, capi del menu, "Apri la Brand Story" nel menu, hotspot `poi-look-01`, pannello della parete del brand (tap o click col mirino), capi del Lookbook. ESC/Indietro tolgono un livello, Chiudi/fondo tutti; riaprire una voce già nella pila torna lì invece di accumulare.
- Con una scheda aperta `blocked()` è vero; all'apertura tasti, velocità e percorso si azzerano e il Pointer Lock si rilascia; alla chiusura non si riprende da solo.
- `useFocusTrap` (schede e menu): pila globale di trappole, solo l'ultima risponde; ESC catturato in fase di cattura sulla finestra con `stopPropagation`, così non chiude anche il menu o il Focus sotto. Il focus torna a chi ha aperto.
- Hosting: integrazione Git di Vercel; ogni push sul branch produce una Preview. GitHub Pages disattivato (dichiarato dall'utente, non verificabile dal container).

## 3. Codice di riferimento

**Struttura**
```
src/config/        storeConfig.js · designTokens.js · validateStoreConfig.js
src/lib/           geometry.js · collision.js · navigator.js · materials.js · garments.js · canvasText.js · noise.js · deviceProfile.js · format.js · gpuCaches.js · perf.js · bench.js
src/state/         useAppStore.js · usePlayerStore.js · usePerfStore.js
src/scene/         StoreCanvas.jsx · MergeByMaterial.jsx · environment/ · lighting/ · displays/ · player/ · debug/
src/ui/            onboarding/ · hud/ · menu/ · focus/ · dialog/ · product/ · lookbook/ · perf/ · bench/ · primitives/ · fx/ · fallback/
scripts/           generate-theme.js · test-navigation.mjs · e2e/e2e-phase{1b,2,3,4,5,6}.mjs
docs/              PERF.md (registro delle misure, da compilare dall'utente)
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
npm run test:nav                       # logica di navigazione, 9 test
npm run test:device                    # scelta del tier da stringhe GPU reali, 12 test
npx vite preview --port 4173 &         # poi, per ogni suite:
node scripts/e2e/e2e-phase6.mjs http://127.0.0.1:4173/ <cartella-output>   # 22 verifiche, ~10 min (fase 5: 34)
# `pkill -f "vite preview"` dentro un comando che contiene quella stringa uccide la shell stessa: usare `setsid` all'avvio e `pkill -f "port 4173"` a parte
# CHROMIUM_PATH sovrascrive il Chromium di default (/opt/pw-browsers/chromium-1194/…)
```

**Parametri di debug** (attivi solo con `?debug=`): `?debug=top|front|<id inquadratura>|<id espositore>` (camera fissa), `&colliders=1` (collider + grafo), `&tier=low|medium|high`, `&fps=N`. Espone `window.__player`, `__nav`, `__camera`, `__stores`, `__scene`, `__gl`, `__remountScene()`, `__benchResult`.
**Parametri anche in produzione:** `?perf=1` (HUD prestazioni), `?bench=1` (benchmark); con entrambi `&tier=`, `&fx=0`, `&grain=overlay|alpha`, `&warm=0`. `?fog=1|0` anteprima della nebbia.

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
- Telefono in orizzontale (844×390): la minimappa larga `sm:w-44` (alta 264 px) spingeva la barra "Vai a" fuori dallo schermo. Ora `[@media(max-height:520px)]:w-16`. Trovato dalla verifica responsive della Fase 6, non a occhio.
- Un testo lungo (l'avviso di rendering software) allargava l'HUD prestazioni su mezza scena: pannelli informativi a larghezza fissa.
- Prompt fissi in percentuale e prompt nel flusso si sovrappongono: stessa colonna, impilati.
- Una barra a scorrimento con l'ultima voce tagliata sembra un difetto: griglia a colonne uguali, corpo `clamp()`, verificata a 320/360/390/430 px.
- Tasti premuti all'apertura del menu o alla perdita di focus: azzerarli, o il player cammina da solo.

**Test e processo**
- Un comando interrotto o rifiutato dall'utente può aver già applicato una parte delle modifiche: prima di ogni commit leggere `git diff`, non fidarsi di `git add -A`. In Fase 6 una riduzione d'intensità fermata dall'utente è finita nel commit `7945fa8` senza che venisse dichiarata.
- In questo container il desktop rende a 1–2 fps: i test aspettano **condizioni**, mai millisecondi fissi; dopo uno spostamento forzato aspettano che la camera abbia raggiunto il player.
- Il sistema di luci del Focus riporta le intensità al config ogni fotogramma: modificarle a mano dal test non ha effetto.
- I test devono leggere i valori di taratura dal config, non ricopiarli.
- Selettori per etichetta ambigui (stesso testo in menu e barra): restringere al contenitore.
- Heredoc bash non quotati espandono i `${…}` dei template JS: usare `<<'EOF'`.
- **Committare solo dopo aver letto l'esito**: una catena `… | tail && git commit` committa anche con test rossi.
- Il Pointer Lock funziona nel Chromium headless di questo ambiente.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, né l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA, non nome del branch).

## 5. Prossimi passi

**Regole di processo (dall'utente):** una fase alla volta; si avanza solo col comando esplicito `Approvato, procedi alla fase X`; a fine fase build, dev server, verifica nel browser, report che distingue eseguito / non eseguito / bloccato, poi stop. Fase 8 (e-commerce reale) solo su comando futuro.

- ~~Fase 5~~ — consegnata: scheda prodotto, Lookbook / Brand Story, trappola del focus, I21–I22, suite `e2e-phase5.mjs`.
- ~~Fase 6~~ — consegnata: memoria GPU stabile e rilasciata al teardown, perdita di contesto gestita, HUD `?perf=1`, benchmark `?bench=1`, `docs/PERF.md`, verifica responsive su 8 formati. **Manca la parte che solo l'utente può fare: le misure su dispositivi reali.**
- **Fase 6, aperta su un punto:** grana decisa dall'utente il 2026-10-16: **`alpha`** (granelli scuri, fusione normale), intensità `alphaOpacity` 0,2 / 0,18 / 0,15, ora predefinita. Vivobook con alpha: 56,2 / 36,8 contro soglia 58 / 45 → ancora sotto. Gli scatti residui (1% low ~37–40 anche senza grana) sono concentrati nel primo cammino e nel primo Focus su Vivobook e iPhone anche col riscaldamento: lavoro fatto al primo uso, indagine in corso. iPhone (Safari 26): `Apple GPU` su touch → medium, 58,8 / 55,6 con overlay e 58,8 / 52,6 con alpha. `GpuWarmup` in `StoreCanvas` (`&warm=0` per confronto); gli hotspot caricano le texture alla creazione.
- **Fase 7** — verifica del deploy di produzione su `main` (l'URL pubblico lo verifica l'utente).
- **Aperti:** P1 logo vettoriale (oggi PNG 150×150 → wordmark tipografico di riserva) · P3 conferma tagline "We're just looking for somewhere" (ora visibile come titolo nella Brand Story: va confermata prima di un lancio) · dati prodotto reali · testi e immagini reali del Lookbook (oggi segnaposto dichiarati).
- **In attesa di riscontro dall'utente:** righe di `docs/PERF.md` mancanti: un computer (tier medium/high), un Android di fascia media (tier low, soglia p50 ≥ 40), un iPhone con Safari (già misurato: Pixel di punta, tier medium, superato) · checklist mobile della fase 5 (scheda prodotto e Lookbook su un telefono vero, in verticale e in orizzontale) · checklist mobile della fase 4 (telefono in orizzontale, tap-avvicinamento-Focus, resa del nero) e sensibilità del trascinamento (`navigation.player.lookSensitivity.mobileDrag`).
