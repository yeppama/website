# CONTEXT — INTO industries · negozio streetwear immersivo 3D

> Stato al 2026-10-15 · branch `claude/determined-thompson-yfnsdc` · ultimo commit applicativo `fafa31f`
> Il piano completo (schema dati, roadmap, limiti dell'ambiente) è in `PLAN.md` v1.4.

## 1. Stato attuale

Prototipo web 3D navigabile in prima persona del brand INTO industries (Florence), con architettura data-driven pronta per un e-commerce reale. **Fasi 0–4 completate, verificate e pubblicate**; in attesa del comando dell'utente `Approvato, procedi alla fase 5` (schede prodotto 2D + Lookbook).

## 2. Decisioni tecniche

**Stack (versioni verificate sul registry npm)**
- Vite 8.3.4 · React 19.3.1 · three 0.186.1 · @react-three/fiber 9.8.2 · @react-three/drei 10.7.9 (quasi inutilizzato) · Tailwind 4.3.3 via `@tailwindcss/vite` · Zustand 5.0.15 · `playwright-core` (solo test).
- **Tailwind** (D1): zero CSS-in-JS a runtime, il main thread serve al canvas.
- **Zustand** (D2): stato letto a 60 Hz dal render loop; Context ridisegnerebbe tutti i consumer.

**Architettura data-driven**
- `src/config/storeConfig.js` è l'unica fonte di verità: mappa, muri, collider, luci, waypoint, espositori, POI, prodotti, lookbook, testi, feature flag. Relazioni solo per ID. Nessun componente contiene coordinate, colori, prezzi o frasi.
- `src/config/validateStoreConfig.js`: 20 invarianti (I1–I20), errore bloccante solo in DEV, rimosso dal bundle di produzione.
- `src/config/designTokens.js` è l'unica fonte dei token; `scripts/generate-theme.js` genera `src/styles/theme.generated.css` (gitignored) in `predev`/`prebuild`.
- `features` in config (`navigation`, `focusMode` attivi; `productModal` spento, fase 5): l'interfaccia mostra "in arrivo · fase N" per ciò che non esiste.

**Identità visiva**
- Accento unico **Flame Orange #F98E30** (PANTONE 15-1157 TPG, simulazione a schermo), token `accent.flame`. Fondi `#060606` (negozio) e `#dcdcd8` (studio). Testo osso `#f2f0ea`. Il rosso `#c21025` solo come stato d'errore.
- Nome `INTO industries`: wordmark `INTO` + descrittore `(industries*)`, mai una parola sola.
- Motivo geometrico: l'ellisse del logo (`brandMotif.oval.ratio = 2.9`) riusata per hotspot, ping dei tap, ombre blob, bottone primario, minimappa.
- Font auto-ospitati in `public/fonts` (Archivo, JetBrains Mono, UnifrakturCook).

**Rendering e prestazioni**
- Ombre (D3-A): max 2 faretti con ombra reale su tier high/medium; tier low nessuna shadow map + ombre blob ellittiche.
- Grana (D6-B): velo CSS sopra il canvas, fuori da WebGL; tessera dimensionata per `devicePixelRatio`.
- `frameloop="demand"` + `FrameLimiter` (cap reale a `performance.targetFps`).
- `StoreCanvas` caricato con `lazy()`: JS iniziale 76 kB gzip, chunk 3D differito. **Niente `manualChunks`.**
- Geometrie statiche unite per materiale (`MergeByMaterial`), corpi illuminanti a istanze. Costo misurato nella zona più densa: 31 draw call su tier low (budget 60), 40 su high (budget 120).
- Luce: **faretti dei prodotti bianco caldo; il colore d'atmosfera solo su pareti (wall-wash) e accenti.** Esposizione in config (`performance.toneMappingExposure: 0.85`).

**Navigazione e interazione**
- Collisioni solo cerchio-contro-box (`colliders`), mai sulle mesh. Convenzione di rotazione identica a `Object3D.rotation.y` di three.
- Grafo di 16 waypoint (centro + due corridoi laterali a x = ±10.35). Percorso: diretto se libero, altrimenti Dijkstra da ogni nodo visibile + string pulling. Ogni segmento è libero da collider con margine `player.radius`.
- Desktop: WASD/frecce, Shift corsa, Pointer Lock **solo su click esplicito**, mai riattivato da solo.
- Mobile: tap = vai/avvicinati; trascinamento = guarda (soglie `navigation.input`); barra "Vai a" solo verso waypoint `safeForTeleport`.
- Focus Mode: macchina a stati `idle → entering → focused → exiting → idle`, interrompibile in ogni stato. La luce "studio" nasce dal contrasto (gli altri faretti scendono), non da più luce sul capo.
- Hosting: integrazione Git di Vercel; ogni push sul branch produce una Preview. GitHub Pages disattivato (dichiarato dall'utente, non verificabile dal container).

## 3. Codice di riferimento

**Struttura**
```
src/config/        storeConfig.js · designTokens.js · validateStoreConfig.js
src/lib/           geometry.js · collision.js · navigator.js · materials.js · garments.js · canvasText.js · noise.js · deviceProfile.js
src/state/         useAppStore.js · usePlayerStore.js
src/scene/         StoreCanvas.jsx · MergeByMaterial.jsx · environment/ · lighting/ · displays/ · player/ · debug/
src/ui/            onboarding/ · hud/ · menu/ · focus/ · primitives/ · fx/ · fallback/
scripts/           generate-theme.js · test-navigation.mjs · e2e/e2e-phase{1b,2,3,4}.mjs
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
useAppStore: enterFocus(displayId, returnPose{ x, z, eye, yaw, pitch, fov }), exitFocus(), setFocusState(s),
             finishFocusExit(), cycleProduct(delta, count), showNotice(text, ms)
usePlayerStore.getState().issue({ type: 'teleport', waypointId })          // solo waypoint safeForTeleport
usePlayerStore.getState().issue({ type: 'goto', point: [x, z], faceAt? })
```

**Unione delle geometrie statiche** — `<MergeByMaterial enabled>{…mesh statiche…}</MergeByMaterial>`; ciò che si muove (es. `ActiveMarker`) va tenuto fuori.

**Comandi**
```bash
npm run dev | build | preview          # predev/prebuild rigenerano i token
npm run test:nav                       # logica di navigazione, 9 test
npx vite preview --port 4173 &         # poi, per ogni suite:
node scripts/e2e/e2e-phase4.mjs http://127.0.0.1:4173/ <cartella-output>
# CHROMIUM_PATH sovrascrive il Chromium di default (/opt/pw-browsers/chromium-1194/…)
```

**Parametri di debug** (attivi solo con `?debug=`): `?debug=top|front|<id inquadratura>|<id espositore>` (camera fissa), `&colliders=1` (collider + grafo), `&tier=low|medium|high`, `&fps=N`. Espone `window.__player`, `__nav`, `__camera`, `__stores`, `__scene`, `__gl`.

## 4. Lezioni apprese & edge case

**Rendering**
- `color` + `map` con lo stesso colore = colore al quadrato (pavimento nero, griglia invisibile). Con una mappa il colore va a bianco.
- Il dispose della cache GPU su unmount React rompe tutto in StrictMode (texture distrutte, materiali ancora referenziati). Il dispose va legato alla distruzione del contesto WebGL → **fase 6**.
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
- Mai istruzioni per comandi che non esistono: l'utente ha creduto rotto il touch. Feature flag + I15.
- L'onboarding deve scorrere: su un telefono in orizzontale (~390 px) "Entra" era irraggiungibile.
- Prompt fissi in percentuale e prompt nel flusso si sovrappongono: stessa colonna, impilati.
- Una barra a scorrimento con l'ultima voce tagliata sembra un difetto: griglia a colonne uguali, corpo `clamp()`, verificata a 320/360/390/430 px.
- Tasti premuti all'apertura del menu o alla perdita di focus: azzerarli, o il player cammina da solo.

**Test e processo**
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

- **Fase 5** — modale prodotto 2D: `<PlaceholderImage />` per i media, selettore taglie demo, prezzo fittizio, movimento sospeso e ripristinato in modo coerente; Lookbook / Brand Story da `lookbook` e `meta.brand`; attivare `features.productModal` (sblocca `poi-look-01` e la riga "Scheda completa…" del Focus).
- **Fase 6** — dispose GPU legato al teardown del contesto; HUD prestazioni e percorso di benchmark `?bench=1`; `docs/PERF.md` con misure su dispositivi reali (fatte dall'utente); verifiche responsive.
- **Fase 7** — verifica del deploy di produzione su `main` (l'URL pubblico lo verifica l'utente).
- **Aperti:** P1 logo vettoriale (oggi PNG 150×150 → wordmark tipografico di riserva) · P3 conferma tagline "We're just looking for somewhere" · dati prodotto reali.
- **In attesa di riscontro dall'utente:** checklist mobile della fase 4 (telefono in orizzontale, tap-avvicinamento-Focus, resa del nero) e sensibilità del trascinamento (`navigation.player.lookSensitivity.mobileDrag`).
