# PLAN §0–§1

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 0. Sommario esecutivo e tensioni del brief

Quattro tensioni andavano risolte prima di scrivere codice. **Tutte chiuse il 2026-10-15.**

| # | Tensione | Esito |
|---|----------|-------|
| **T1** | Faretti con ombre vs 60 fps mobile | **Chiusa → D3-A.** Max 2 ombre reali su tier high/medium, 0 su low con ombre "blob" a terra |
| **T2** | Ordine Fase 1 → Fase 2 | **Chiusa → D4-B.** La Fase 1 diventa **Fase 1b**: UI + blockout minimo, così è valutabile |
| **T3** | Tap-to-move con percorsi validi | **Chiusa.** Grafo waypoint + A* + sweep, modellato in `navigation.links` dalla Fase 0 |
| **T4** | Grana pesante vs budget mobile | **Chiusa → D6-B.** Velo in compositing, fuori dalla pipeline WebGL |

<details><summary>Analisi originale delle tensioni (conservata per tracciabilità)</summary>

| # | Tensione | Impatto se non decisa ora |
|---|----------|---------------------------|
| T1 | "Faretti SpotLight + ombre proiettate" vs "60 fps su mobile" | Ogni SpotLight con `castShadow` costa un render pass aggiuntivo della scena. 4 spot con ombre = 5 pass. Su GPU mobile integrate questo è il singolo costo dominante. Rifarlo in Fase 6 significa riscrivere `lighting` e i materiali. |
| T2 | Ordine Fase 1 (UI overlay) → Fase 2 (3D) | Il deliverable della Fase 1 è una UI che fluttua sul nulla: non è valutabile esteticamente né dimostra la promessa "impressionante dal primo prototipo". |
| T3 | "Tap su pavimento" + "percorsi validati che non attraversano i collider" | Implica pathfinding, non un semplice `lerp` verso il punto toccato. Serve un grafo di waypoint navigabile con A*, e la proiezione del tap sul nodo raggiungibile più vicino. Va modellato in `storeConfig.js` dall'inizio (campo `navigation.links`), non aggiunto in Fase 3. |
| T4 | Grana pesante (firma del brand) vs budget mobile | La grana è un passaggio a schermo intero dopo il rendering: stesso tipo di costo delle ombre. Senza grana il negozio non somiglia al brand; con grana "vera" si perde il margine su mobile. |

</details>

Le decisioni che le hanno chiuse sono in §7, con le opzioni scartate e il motivo.

---

## 1. Stack tecnico (con motivazione)

| Livello | Scelta | Perché questa e non l'alternativa |
|---|---|---|
| Build tool | **Vite 8** (8.3.4 verificata sul registry) | Dev server con HMR istantaneo, `build` Rollup con code-splitting. L'alternativa (Next.js) aggiunge SSR che per una scena WebGL è peso morto: la scena non è renderizzabile server-side e il routing è interno alla scena 3D. |
| UI framework | **React 19** | Richiesto dal brief ed è il prerequisito di React Three Fiber. Il modello dichiarativo paga nella UI overlay (modali, HUD, onboarding), dove lo stato è complesso. |
| Renderer 3D | **Three.js 0.186 via React Three Fiber 9.8** (verificate) | R3F non è un wrapper lento: è un reconciler che costruisce lo stesso scene graph di Three.js. Il vantaggio reale è che la scena diventa un albero di componenti alimentabile da `storeConfig.js` con un `.map()`, che è esattamente il requisito data-driven. Three.js puro imporrebbe un layer imperativo scritto a mano per fare la stessa cosa. |
| Helper 3D | **@react-three/drei** (selettivo) | Si importano solo i moduli usati (`<Html>`, `<useGLTF>`, `<AdaptiveDpr>`, `<Detailed>`, `<SoftShadows>`). È tree-shakeable: nessun import globale. |
| Styling | **Tailwind CSS 4.3** ✅ *(D1-A, confermata)* | L'estetica brutalist vive di spaziature rigide, bordi secchi, tipografia a scala fissa: un sistema di token a classi è più coerente e produce meno CSS runtime di styled-components, che inietta stili a ogni render. Con il canvas WebGL che compete per il main thread, zero CSS-in-JS runtime è un vantaggio misurabile. |
| Stato globale | **Zustand 5.0** ✅ *(D2-A, approvata)* | Lo stato condiviso (fase app, focus mode, modale aperta, device profile, posizione player) è letto sia dentro che fuori il canvas. Con Context di React ogni cambio di stato ri-renderizza i consumer: dentro un `useFrame` a 60 Hz è inaccettabile. Zustand permette sottoscrizioni selettive e letture non reattive (`getState()`) dal render loop. |
| Animazioni UI | **Framer Motion 12** | Transizioni di modali/onboarding. Usato **solo** nella UI 2D; le transizioni di camera sono fatte con interpolazione manuale in `useFrame` (nessun sistema di animazione esterno dentro il render loop). |
| Linting | ESLint 9 + plugin React Hooks | Le regole sugli hook intercettano gli errori più comuni in R3F (hook condizionali dentro componenti di scena). |
| Deploy | **Vercel via integrazione Git** (Fase 7, ma da attivare prima — vedi §10) | Build statica, preview per branch, header di cache configurabili per i `.glb`. Netlify è equivalente: la scelta non è vincolante. |

**Esplicitamente escluso in questa fase:** physics engine (Rapier/Cannon). Il brief impone collisioni
via bounding box semplificate: un risolutore AABB scritto a mano (~80 righe) copre il caso d'uso
"il player non attraversa i muri" senza aggiungere 500 kB di WASM e un passo di simulazione per frame.

---

