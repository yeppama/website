# RIFERIMENTO — struttura del codice, funzioni e comandi

> Spostato parola per parola da `CONTEXT.md` §3 il 2026-10-19. Qui ci sono struttura delle cartelle, firme delle funzioni principali, comandi di test e parametri di debug.

## 3. Codice di riferimento

**Struttura**
```
src/config/        storeConfig.js · designTokens.js · validateStoreConfig.js
src/layouts/       index.js (sceglie con ?allestimento= o VITE_LAYOUT) · cantiere.js (secondo allestimento)
src/content/       index.js (sceglie con VITE_CONTENT) · into.js (INTO, segnaposto) · demo.js (demo) · demo.media.json (generato)
scripts/media/     build.mjs + process.py (foto → WebP in più larghezze e texture 3D; Python 3 + Pillow + numpy)
src/lib/           staticShadows.js (ombre calcolate una volta: markShadowsDirty) · focusItems.js (posa del Focus per capo) · sharedTextures.js (immagini condivise, in gpuCaches; sostituisce useTexture) · geometry.js · collision.js · navigator.js · materials.js · garments.js · canvasText.js · noise.js · deviceProfile.js · format.js · gpuCaches.js · perf.js · bench.js
src/commerce/      index.js (modo e contratto del fornitore) · mock.js (negozio di prova) · shopify.js (Storefront API)
src/lib/sanitizeHtml.js   filtro dell'HTML esterno (pagine legali del venditore)
src/state/         useAppStore.js · usePlayerStore.js · usePerfStore.js · useCartStore.js · useLegalStore.js
src/scene/         StoreCanvas.jsx · MergeByMaterial.jsx · environment/ (anche WallArt.jsx e Props.jsx, grafica e arredi del negozio A) · lighting/ (anche SelectiveBloom.jsx, Bloom del cantiere; AccentLights.jsx, punti luce arancioni da environment.accentLights) · displays/ · player/ · debug/
src/ui/            onboarding/ · hud/ · menu/ · focus/ · dialog/ · product/ · lookbook/ · cart/ · legal/ · perf/ · bench/ · primitives/ · fx/ · fallback/
scripts/           generate-theme.js · test-navigation.mjs · test-framing.mjs · test-catalog.mjs · export-shopify-csv.mjs · e2e/e2e-phase{1b,2,3,4,5,6,8a,8b}.mjs · e2e/e2e-landscape.mjs
scripts/catalog/   schema.mjs (colonne del modello) · make-template.mjs · importer.mjs · import.mjs · shopify-csv.mjs · check.mjs
docs/              PERF.md (registro delle misure) · CONTENUTI.md (cosa serve dal cliente) · modello-catalogo-INTO.xlsx (da compilare) · PLAN-8.md
docs/MANUALE.md    come funziona il sito e "voglio cambiare X → dove" (per l'utente)
docs/codice/       spiegazione riga per riga degli 80 file del sito al commit ac1cb32 (2026-10-17): archivio dichiarato, non si aggiorna — si legge per capire un meccanismo, mai per sapere com'è il codice oggi
docs/demo/         FOTO.md (stile e procedura) · PRESENTAZIONE.md (traccia di 2 minuti) · catalogo-demo.xlsx · foto-sorgenti.tsv
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
# e2e-cantiere.mjs: allestimento cantiere (capi GLB, collisioni, catene senza sacche, punti luce per tier, Focus con zoom per capo, Lookbook dai pannelli, Vai a, Indietro, Bloom per tier, ombre statiche, luci per tier, rimontaggi del Canvas), 47 verifiche
# e2e-demo.mjs (VITE_CONTENT=demo): foto, capi 3D, manichino senza foto sul retro, punti luce, grafica alle pareti, prezzi dal fornitore, 15 verifiche
# shots-cantiere.mjs <base> <out> <pose…>: screenshot a tier high; QUERY="&bloom=0" SUFFIX=-x per confronto
# e2e-navfix.mjs: Indietro del browser, solo mouse, avviso da dietro, click sul muro, margine, indicatore a terra (18 verifiche)
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
**Parametri anche in produzione:** `?allestimento=cantiere` (secondo allestimento), `?perf=1` (HUD prestazioni), `?bench=1` (benchmark); con entrambi `&tier=`, `&bloom=1|0` (cantiere), `&shadows=0` (niente ombre reali), `&accent=0` (niente luci arancioni vere), `&fx=0`, `&grain=overlay|alpha`, `&warm=0`. `?fog=1|0` anteprima della nebbia. `?commerce=mock` negozio di prova (`&mockerror=1` fornitore in errore). `?commerce=shopify` negozio Shopify di sviluppo.

