# CONTEXT — INTO industries · negozio streetwear immersivo 3D

> Stato al 2026-10-16 · **Fasi 0–7 eseguite, 8a consegnata** · produzione su `main` con contenuti dimostrativi dichiarati e `noindex` (commercio spento: la 8a non è ancora in `main`).
> Questo file è caricato in ogni sessione: solo lo stato vigente. Il resto si legge quando serve:
> `PLAN.md` (indice → `docs/plan/`) · `docs/PLAN-8.md` (Fase 8, e-commerce) · `docs/LEZIONI.md` (edge case per area) · `docs/STORIA.md` (dettaglio Fasi 5–7) · `docs/PERF.md` (misure) · `docs/CONTENUTI.md` (cosa serve dal cliente).

## 1. Stato e prossimi passi

- Prototipo web 3D in prima persona del brand INTO industries (Florence), data-driven, pronto per un e-commerce reale. Vercel pubblica la produzione da `main` e una Preview per ogni push.
- **Fase 8 (e-commerce):** piano in `docs/PLAN-8.md` — Shopify headless, account Shopify del cliente a suo nome, vendita UE in EUR, carrello. Sotto-fasi 8a (carrello con fornitore finto) → 8b (negozio Shopify di sviluppo) → 8c (catalogo del cliente) → 8d (dati e pagine legali) → 8e (messa in vendita).
- **Fase 8a consegnata:** `src/commerce/` (contratto del fornitore in `index.js`, `mock.js`), `src/state/useCartStore.js`, `src/ui/cart/` (`CartSheet` = scheda `kind: 'cart'` della pila `dialogs`, `CartButton` in HUD e menu). `storeConfig.commerce` (provider `off` di default), `products[].commerce.handle`. Con commercio attivo prezzo, varianti e disponibilità vengono **solo** dal fornitore; se non risponde il capo è "non disponibile", mai col prezzo di storeConfig. Suite `e2e-phase8a.mjs` (32 verifiche).
- **Prossimo:** 8b, serve un negozio Shopify di sviluppo (comando esplicito). In parallelo: contenuti reali del cliente secondo `docs/CONTENUTI.md`, poi togliere `noindex` (`vercel.json` + meta in `index.html`) e collegare il dominio (acquistato, in arrivo).
- **Aperti:** logo vettoriale (oggi PNG 150×150 → wordmark tipografico) · conferma tagline "We're just looking for somewhere" (titolo della Brand Story) · dati prodotto reali · testi e immagini del Lookbook (segnaposto dichiarati).
- **In attesa di riscontro dall'utente:** misura su Android di fascia media (tier low, soglia p50 ≥ 40) · checklist mobile fasi 4 e 5 (verticale/orizzontale, tap-avvicinamento-Focus, nero, schede) · `navigation.player.lookSensitivity.mobileDrag`.
- Accettati dall'utente: Vivobook Iris Xe 57,1 / 39,2 contro soglia 58 / 45 · nero dei capi "un pelo grigio" su telefono · nebbia spenta (`?fog=1` per l'anteprima).

## 2. Decisioni vigenti

- **Stack:** Vite 8.3.4 · React 19.3.1 · three 0.186.1 · @react-three/fiber 9.8.2 · drei 10.7.9 (quasi inutilizzato) · Tailwind 4.3.3 (`@tailwindcss/vite`, niente CSS-in-JS) · Zustand 5.0.15 (letto a 60 Hz dal render loop) · `playwright-core` solo test.
- **Dati:** `src/config/storeConfig.js` unica fonte di verità (mappa, collider, luci, waypoint, espositori, POI, prodotti, lookbook, testi, `features`); relazioni per ID; nessun componente contiene coordinate, colori, prezzi o frasi. `validateStoreConfig.js`: invarianti I1–I24 (I23 handle unico, I24 regole del commercio), bloccanti solo in DEV. Token in `designTokens.js` → `scripts/generate-theme.js` → `theme.generated.css` (gitignored). Prezzi via `lib/format.js` con `meta.brand.locale`. Ciò che non esiste ancora si dichiara ("In arrivo nella Fase N").
- **Identità:** accento unico Flame Orange `#F98E30` (`accent.flame`); fondi `#060606` / `#dcdcd8`; testo `#f2f0ea`; `#c21025` solo per errori. Nome sempre `INTO` + `(industries*)`. Ellisse del logo (`brandMotif.oval.ratio = 2.9`) riusata per hotspot, ping, ombre blob, bottone, minimappa. Font in `public/fonts`.
- **Rendering:** `frameloop="demand"` + `FrameLimiter`; `StoreCanvas` con `lazy()` (JS iniziale 92 kB gzip, budget 380), **niente `manualChunks`**; geometrie statiche unite (`MergeByMaterial`), 31/40 draw call low/high. Ombre reali max 2 faretti (high/medium), blob su low. Grana CSS fuori da WebGL, fusione `alpha`. Tier `high` solo con GPU dedicata (`DISCRETE_GPU` in `deviceProfile.js`). Cache GPU in `lib/gpuCaches.js`, liberate all'ultimo Canvas smontato. Perdita del contesto: overlay + rimontaggio con `key`. Riscaldamento GPU (`userData.warmup`): niente compilazioni al primo uso. Prodotti in bianco caldo, colore solo su pareti; `toneMappingExposure: 0.85`. Dettaglio e motivi: `docs/STORIA.md`.
- **Navigazione:** collisioni solo cerchio-contro-box sui `colliders`; rotazione = `Object3D.rotation.y`. 16 waypoint, Dijkstra + string pulling. Desktop WASD/Shift, Pointer Lock solo su click esplicito. Mobile: tap = vai, trascinamento = guarda, "Vai a" solo verso `safeForTeleport`.
- **Interazione:** Focus Mode `idle → entering → focused → exiting → idle`, interrompibile. Schede in pila `dialogs` (`DialogHost`, z 45); con una scheda aperta `blocked()` è vero e l'input si azzera. `useFocusTrap`: pila globale, ESC in fase di cattura.

## 3. Codice di riferimento

```
src/config/  storeConfig.js · designTokens.js · validateStoreConfig.js
src/lib/     geometry · collision · navigator · materials · garments · canvasText · noise · deviceProfile · format · gpuCaches · perf · bench
src/commerce/ index (modo e contratto del fornitore) · mock (negozio di prova)
src/state/   useAppStore · usePlayerStore · usePerfStore · useCartStore
src/scene/   StoreCanvas · MergeByMaterial · environment/ lighting/ displays/ player/ debug/
src/ui/      onboarding/ hud/ menu/ focus/ dialog/ product/ lookbook/ cart/ perf/ bench/ primitives/ fx/ fallback/
scripts/     generate-theme.js · test-navigation.mjs · test-device.mjs · e2e/e2e-phase{1b,2,3,4,5,6,8a}.mjs
```

```js
// geometry.js — convenzione di three, verificata contro le sue matrici
// mondo → locale  lx = dx·cosθ − dz·sinθ   lz = dx·sinθ + dz·cosθ
toLocal · toWorld · pointInCollider(p, c, margin) · circleOverlapsCollider(p, c, r) · segmentHitsCollider(a, b, c, margin) · rayHitsCollider(o, dir, c) · zoneAt · inAnyArea · clampToAreas
moveWithCollisions(pos, dx, dz, { radius, colliders, walkableAreas, maxStep })
createNavigator(config) → { plan(from, to) → { ok, points } | { ok: false, reason }, isWalkable, clear, nodes }
// PlayerController: recupera il tempo a sotto-passi (maxCatchUp 0.25 s, maxStepDt), non taglia dt
getMaterial(id, spec, { repeat, grid })   // con una mappa, color = 0xffffff
useAppStore: openDialog('product' | 'lookbook' | 'cart', id) · backDialog · closeDialogs · enterFocus(displayId, returnPose) · exitFocus · cycleProduct · showNotice
usePlayerStore.getState().issue({ type: 'teleport' | 'goto' | 'place' | 'focus' | 'face', … })
```

**Comandi**
```bash
npm run dev | build | preview          # predev/prebuild rigenerano i token
npm run test:nav                       # 9 test  ·  npm run test:device  # 13 test
setsid npx vite preview --port 4173 &  # poi: node scripts/e2e/e2e-phase6.mjs http://127.0.0.1:4173/ <out>  (22 verifiche, ~10 min; fase 5: 34; 8a: 32)
pkill -f "port 4173"                   # mai `pkill -f "vite preview"`: uccide la shell stessa
```
Debug (solo con `?debug=`): `top|front|<inquadratura>|<espositore>`, `&colliders=1`, `&tier=`, `&fps=N`; espone `window.__player`, `__nav`, `__camera`, `__stores`, `__scene`, `__gl`, `__remountScene()`, `__benchResult`. Anche in produzione: `?perf=1`, `?bench=1` (`&tier=`, `&fx=0`, `&grain=overlay|alpha`, `&warm=0`), `?fog=1|0`, `?commerce=mock` negozio di prova (`&mockerror=1` fornitore in errore).
