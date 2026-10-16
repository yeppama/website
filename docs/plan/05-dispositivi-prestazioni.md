# PLAN §5

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 5. Dispositivi, browser e misurazione delle prestazioni

### 5.1 Dispositivi di riferimento

| Tier | Dispositivo | Risoluzione / DPR | Soglia di accettazione |
|---|---|---|---|
| **high** | Desktop con GPU dedicata (classe GTX 1650 / M2 o superiore) | 1920×1080 @1 | 60 fps stabili, p1% ≥ 50 |
| **medium** (target primario desktop) | Laptop con GPU integrata (Iris Xe / Apple M1) | 1920×1080 @1–2 | p50 ≥ 58 fps, p1% ≥ 45 |
| **medium** (target primario mobile) | iPhone 12 / SE 3ª gen | 390×844 @2 (DPR capped 1.5) | p50 ≥ 55 fps, p1% ≥ 40 |
| **low** (pavimento) | Android mid-range (Pixel 6a / Galaxy A54) | 412×915 @1 | p50 ≥ 40 fps, nessun crash, interazioni reattive |

**Il target "60 fps" è un obiettivo di tier medium/high. Sul tier low l'obiettivo dichiarato è 40 fps
con qualità ridotta** (zero ombre dinamiche, DPR 0.75–1, env map 64). Promettere 60 fps su un
Android mid-range con faretti e ombre sarebbe una dichiarazione che non potrei onorare.

### 5.2 Browser

Supportati: Chrome/Edge ≥ 120, Firefox ≥ 121, Safari ≥ 16.4 (desktop e iOS).
Requisito tecnico: **WebGL2**. Senza WebGL2 → schermata di fallback (Fase 6), non un downgrade.
Pointer Lock non esiste su iOS/Android: è la ragione tecnica per cui il percorso mobile è
Tap-to-Move e non WASD + look, non una semplificazione di comodo.

### 5.3 Protocollo di misurazione

1. **Strumentazione in-app:** `lib/perf.js` campiona il delta di frame in `useFrame` e calcola
   p50, p95 e **p1% low** (il valore che rivela gli stutter, che la media nasconde) su finestre di 5 s.
   HUD attivabile con `?debug=1`. In Fase 6 si aggiunge `r3f-perf` per drawcall/triangoli/programmi.
2. **Percorso di benchmark riproducibile:** un tour scriptato di ~40 s (`?bench=1`) che attraversa
   ingresso → nuovi arrivi → archivio → lookbook → focus su due prodotti. Stessa traiettoria a ogni
   run, 3 run per dispositivo, si riporta la **mediana** dei p50 e il **peggiore** dei p1%.
3. **Strumenti esterni:** Chrome DevTools Performance (long task, GC), `WEBGL_debug_renderer_info`
   per registrare la GPU reale, Lighthouse mobile per il caricamento (LCP, TBT, peso bundle).
4. **Registro:** ogni misurazione va in `docs/PERF.md` con data, dispositivo, GPU rilevata, browser,
   build commit, tier attivo, p50/p95/p1%, drawcall, triangoli e **se la misura è su hardware reale
   o in emulazione**.

### 5.4 Limite dichiarato dell'ambiente di lavoro (sintesi — dettaglio verificato in §10)

Questa sessione gira in un container cloud Linux senza GPU e senza display: posso eseguire la build
di produzione, avviare il dev server, aprire le pagine con Chromium headless (Playwright è
preinstallato) e catturare screenshot ed errori di console, con rendering **software (SwiftShader)**.
Di conseguenza:

- **Eseguibile qui:** build, dev server, errori runtime di console, screenshot di layout, verifica
  che la scena WebGL si inizializzi, peso del bundle, validazione di `storeConfig`.
- **NON eseguibile qui:** qualsiasi numero di fps rappresentativo, test su hardware reale,
  test touch su dispositivo fisico, resa di ombre/tone mapping come su GPU reale.

Gli fps misurati in questo ambiente non verranno **mai** riportati come se fossero prestazioni reali.
Le misurazioni di §5.3 su dispositivi fisici vanno eseguite da te, sui dispositivi di §5.1; io
fornirò l'HUD, il percorso di benchmark e il modulo di `docs/PERF.md` da compilare.

---

