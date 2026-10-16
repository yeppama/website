# PERF.md — Registro delle prestazioni

Protocollo: `PLAN.md` §5.3. Dispositivi e soglie: `PLAN.md` §5.1.

**Regola:** una misura vale solo se viene da **hardware reale**. Il container di sviluppo rende in
software (SwiftShader, senza GPU): i suoi numeri servono a verificare che gli strumenti funzionino,
mai come prestazione. Il benchmark lo dichiara da solo nell'ultima colonna.

## Come misurare (5 minuti per dispositivo)

1. Apri l'URL pubblicato aggiungendo `?bench=1` (es. `https://<preview>.vercel.app/?bench=1`).
   Per forzare un tier: `?bench=1&tier=medium`.
2. Tocca **Entra** e non toccare lo schermo: il percorso parte da solo, dura ~40 s
   (ingresso → nuovi arrivi → Focus sul manichino → archivio → Focus sul plinto → lookbook → ritorno).
3. A fine run premi **Ripeti** due volte: il protocollo vuole **3 run**. Il pannello calcola da solo
   la mediana dei p50 e il peggiore degli 1% low.
4. **Copia riga per PERF.md** e incollala nella tabella qui sotto (se la copia non riesce, il testo
   è nel riquadro: selezionalo). Sostituisci `(da compilare)` col nome del dispositivo e
   `(da confermare)` con `sì` se era il telefono/computer vero, non un emulatore.
5. Telefono: luminosità automatica spenta, batteria > 50 %, nessuna app in
   background, modalità risparmio energetico **spenta** (dimezza la GPU su iOS e Android).

Durante la navigazione normale, `?perf=1` mostra lo stesso HUD senza il percorso guidato.

## Cosa significano le colonne

| Colonna | Significato |
|---|---|
| p50 fps | Fotogrammi al secondo tipici: 1000 / mediana degli intervalli fra due render. Mediana dei 3 run |
| p95 ms | Durata del fotogramma al 95° percentile. Il peggiore dei 3 run |
| 1% low fps | 1000 / 99° percentile degli intervalli: misura gli scatti, che la media nasconde. Il peggiore dei 3 run |
| Draw call | Media / massimo per fotogramma |
| Triangoli | Massimo per fotogramma |
| Run | Quanti run ha aggregato il pannello |

Il frame rate ha un tetto a `performance.targetFps` (60): su uno schermo a 120 Hz il valore atteso è
60, non 120. Gli intervalli oltre 250 ms (pagina in background) sono pause, non fotogrammi, e si scartano.

## Soglie di accettazione (PLAN §5.1)

| Tier | Riferimento | p50 | 1% low |
|---|---|---|---|
| high | Desktop con GPU dedicata | 60 stabili | ≥ 50 |
| medium | Laptop GPU integrata | ≥ 58 | ≥ 45 |
| medium | iPhone 12 / SE 3ª gen | ≥ 55 | ≥ 40 |
| low | Android medio (Pixel 6a / Galaxy A54) | ≥ 40 | nessun crash |

## Registro

| Data | Dispositivo | GPU rilevata | Browser | Commit | Tier | DPR | Viewport | Run | p50 fps | p95 ms | 1% low fps | Draw call med / max | Triangoli max | Hardware reale? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-15 | Container di sviluppo (verifica strumenti) | ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) | Chrome 141 headless | fase 6 | low | 1.0 | 640×400 | 1 | 10.5 | 174.4 | 4.6 | 21 / 44 | 7764 | NO · rendering software |

| 2026-10-15 | Pixel | ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2) | Chrome 155 | 5d3d750 | medium | 1.5 | 411×801 | 3 | 60.2 | 17.5 | 49.8 | 31 / 42 | 12910 | sì |
| 2026-10-15 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 5d3d750 | high | 1.0 | 1920×911 | 3 | 31.6 | 36.5 | 14.9 | 34 / 52 | 13240 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 5125abb | medium | 1.0 | 1920×911 | 3 | 37.2 | 33.6 | 16.5 | 34 / 52 | 13240 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 5125abb | medium (grana off) | 1.0 | 1920×911 | 3 | 59.5 | 20.9 | 36.9 | 34 / 52 | 13240 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 5125abb | low | 1.0 | 1920×911 | 3 | 45.5 | 25.3 | 26.4 | 23 / 45 | 7766 | sì |
| 2026-10-16 | iPhone (modello da indicare; viewport 393 px) | Apple GPU | Safari 26 | 7945fa8 | low · grana overlay | 1.0 | 393×695 | 3 | 58.8 | 17.0 | 55.6 | 18 / 30 | 7432 | sì |
| 2026-10-16 | iPhone (modello da indicare) | Apple GPU | Safari 26 | 7945fa8 | low · grana alpha | 1.0 | 393×695 | 3 | 58.8 | 17.0 | 55.6 | 18 / 30 | 7432 | sì |
| 2026-10-16 | iPhone (modello da indicare) | Apple GPU | Safari 26 | 7945fa8 | medium (forzato) · grana overlay | 1.5 | 393×695 | 3 | 58.8 | 17.0 | 55.6 | 31 / 42 | 12910 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 394c315 | medium · grana overlay | 1.0 | 1920×911 | 3 | 39.5 | 31.9 | 23.2 | 34 / 52 | 13240 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 394c315 | medium (grana off) | 1.0 | 1920×911 | 3 | 59.9 | 18.6 | 39.7 | 34 / 52 | 13240 | sì |
| 2026-10-16 | Vivobook | ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11) | Chrome 155 | 394c315 | medium · grana alpha | 1.0 | 1920×911 | 3 | 56.2 | 23.7 | 36.8 | 34 / 52 | 13240 | sì |
| 2026-10-16 | iPhone (modello da indicare) | Apple GPU | Safari 26 | 394c315 | medium (automatico) · grana overlay | 1.5 | 393×695 | 3 | 58.8 | 17.0 | 55.6 | 31 / 42 | 12910 | sì |
| 2026-10-16 | iPhone (modello da indicare) | Apple GPU | Safari 26 | 394c315 | medium (automatico) · grana alpha | 1.5 | 393×695 | 3 | 58.8 | 17.0 | 52.6 | 31 / 42 | 12910 | sì |

<!-- Incolla qui sotto le righe copiate dal benchmark. -->

### Note alle misure

- **Pixel, 2026-10-15** — modello non indicato. La GPU PowerVR D-Series DXT è quella dei Pixel
  di fascia alta più recenti, non del Pixel 6a di riferimento per il tier low: vale come misura
  del tier **medium** su un telefono di punta. Esito contro la soglia mobile medium (p50 ≥ 55,
  1% low ≥ 40): **superata** (60,2 / 49,8). p50 a 60,2 con tetto a 60 è lo scarto del limitatore
  (soglia al 90% dell'intervallo), non un superamento del tetto.
- **Vivobook (Iris Xe), 2026-10-15** — **soglia NON superata**: p50 31,6 contro ≥ 58, 1% low 14,9
  contro ≥ 45. È il dispositivo di riferimento del target desktop primario (PLAN §5.1). Due cause:
  1. *Certa:* il tier era sbagliato. `pickTier` guardava solo core e memoria (8 e 8 → high); Iris Xe
     è il riferimento del tier medium. Corretto: high solo con GPU dedicata (`npm run test:device`).
  2. *Da misurare:* medium differisce da high solo per ombre a 512 px e env map: a DPR 1 i pixel sono
     gli stessi, quindi il tier corretto da solo probabilmente non basta. Ipotesi in ordine di peso:
     nove faretti calcolati per ogni pixel di 1920×911 con antialias; le due ombre reali; la grana in
     `mix-blend-mode` sopra il canvas. Le misure diagnostiche sotto separano le tre.

- **iPhone (Safari 26), 2026-10-16** — fluido (58,8 / 55,6) ma **nel tier sbagliato**: `low`, cioè
  DPR 1 su uno schermo a densità 3, niente ombre reali, niente antialias. Safari non espone la memoria
  e dichiara meno core di quelli reali, quindi la regola mobile (≥ 6 core e ≥ 4 GB → medium) lo
  declassa. Il piano lo vuole in `medium`. Manca la prova `?bench=1&tier=medium` sullo stesso iPhone.
  Dettaglio per tratto: p50 fermo a 58,8 ovunque, scatti isolati al primo passaggio in zone nuove
  (Nuovi Arrivi 23,8, Ingresso 29,4): ipotesi compilazione degli shader / caricamento delle texture
  alla prima vista, da anticipare durante il caricamento.
  Prova `tier=medium`: identica (58,8 / 55,6) con DPR 1,5 e ombre reali → l'iPhone regge medium.
  Corretto: su touch, `Apple GPU` → medium. Scatti alla prima visita presenti in tutte e tre le prove
  (Nuovi Arrivi 28–30, Focus plinto 30): dal commit successivo a eb4b31e la GPU viene riscaldata
  durante il caricamento (`&warm=0` per confronto).

### Diagnosi in corso — Vivobook (3 run ciascuna, stesso URL dell'anteprima)

| # | Parametri | Cosa isola |
|---|---|---|
| A | `?bench=1` | Il tier ora scelto da solo (atteso: medium). Effetto della sola correzione del tier |
| B | `?bench=1&tier=medium&fx=0` | A meno grana e vignettatura: costo del compositore |
| C | `?bench=1&tier=low` | Niente ombre reali, niente antialias, DPR fino a 0,75: costo di ombre e pixel |

| # | Data | Commit | Tier | p50 fps | p95 ms | 1% low fps | Draw call med / max | Esito |
|---|---|---|---|---|---|---|---|---|
| A | 2026-10-16 | 5125abb | medium (scelto da solo) | 37.2 | 33.6 | 16.5 | 34 / 52 | +5,6 fps rispetto a high: la correzione del tier funziona ma non basta |
| B | 2026-10-16 | 5125abb | medium, grana off | 59.5 | 20.9 | 36.9 | 34 / 52 | **+22 fps**: la grana overlay è il costo principale. 1% low ancora sotto 45 |
| C | 2026-10-16 | 5125abb | low (grana overlay attiva) | 45.5 | 25.3 | 26.4 | 23 / 45 | +8 fps: ombre, antialias e risoluzione pesano molto meno della grana |

**Esito della diagnosi:** il costo dominante è la fusione `mix-blend-mode: overlay` della grana
sopra il canvas (compositore del browser), non la scena 3D. Resta un secondo problema minore: anche
senza grana l'1% low è 36,9 contro ≥ 45 (scatti brevi da localizzare col dettaglio per tratto).
Decisione aperta (dell'utente): grana `alpha` (solo granelli scuri, fusione normale, provabile con
`&grain=alpha`), grana spenta sulle GPU integrate, o grana attuale sotto soglia. In ambiente software
la grana overlay alza anche le zone scure (luminanza media 20,4 → 23,7): possibile concausa del
"nero un pelo grigio" segnalato sul telefono.

### Riscaldamento e scelta della grana — commit 394c315

Dettaglio per tratto (p50 / 1% low):

| Tratto | Vivobook overlay | Vivobook senza grana | Vivobook alpha | iPhone overlay | iPhone alpha |
|---|---|---|---|---|---|
| 1 Ingresso (posa) | — | 61,0 / 51,0 | 52,4 / 42,2 | 58,8 / 55,6 | 58,8 / 30,3 |
| 2 Ingresso (fermo) | — | 60,2 / 31,3 | 55,9 / 37,9 | 58,8 / 58,8 | 58,8 / 40,0 |
| 3 Nuovi Arrivi (primo cammino) | 36,4 / 20,8 | 59,9 / 21,7 | 52,9 / **10,1** | 58,8 / 29,4 | 58,8 / 30,3 |
| 4 Focus manichino (primo Focus) | 39,7 / 30,0 | 59,9 / 33,6 | 55,9 / 40,3 | 58,8 / 30,3 | 58,8 / 32,3 |
| 5 Archivio | 38,9 / 17,6 | 59,9 / 39,2 | 56,2 / 40,3 | 58,8 / 55,6 | 58,8 / 29,4 |
| 6 Focus plinto | 38,8 / 24,4 | 59,9 / 40,7 | 54,1 / 30,1 | 58,8 / 47,6 | 58,8 / 55,6 |
| 7–10 Lookbook, ritorno | 40,2–40,3 / 18,6–31,3 | 59,9 / 53,5–56,5 | 56,5–58,1 / 34,7–39,7 | 58,8 / 55,6–58,8 | 58,8 / 55,6–58,8 |

- **Grana:** sul Vivobook l'overlay costa ~20 fps (39,5), l'alpha ~4 (56,2 contro 59,9 senza grana).
  Sull'iPhone nessuna differenza misurabile. **Scelta dell'utente: alpha**, intensità `alphaOpacity`
  0,2 / 0,18 / 0,15 (high / medium / low), giudicata a vista sul Vivobook.
- **Soglia desktop medium (p50 ≥ 58, 1% low ≥ 45):** con alpha il Vivobook è a 56,2 / 36,8, cioè
  ancora sotto su entrambi. Gli scatti non dipendono dalla grana: anche senza grana il 1% low è 39,7.
- **Riscaldamento:** il 1% low migliora (overlay 16,5 → 23,2; senza grana 36,9 → 39,7) ma gli scatti
  restano concentrati nel primo cammino e nel primo Focus su entrambi i dispositivi: c'è ancora lavoro
  fatto al primo uso. Indagine in corso.

Lettura di A: il 1% low a 16,5 fps vuol dire fotogrammi da ~60 ms, cioè scatti visibili, non solo
una scena "lenta". Dal commit successivo a 5125abb il benchmark riporta anche il dettaglio per tratto
(ingresso, camminata, Focus, lookbook): dice dove nascono gli scatti.

Se C arriva a 58 e A no, il costo sta in ombre/antialias/risoluzione e si interviene sul tier medium
desktop. Se nemmeno C ci arriva, il costo sta nei nove faretti per pixel e serve una scelta estetica
(meno faretti calcolati, o luce cotta per le pareti): quella decisione è tua.

## Peso del caricamento (misurato sulla build, non dipende dal dispositivo)

| Data | Commit | JS iniziale (gzip) | Chunk 3D differito (gzip) | CSS (gzip) | Budget JS iniziale |
|---|---|---|---|---|---|
| 2026-10-15 | fase 6 | 92 kB | 258 kB | 6 kB | 380 kB |

## Memoria della GPU (verificata in `scripts/e2e/e2e-phase6.mjs`)

Queste verifiche non dipendono dalla velocità della GPU, quindi valgono anche in software.

- **Dentro una sessione:** dopo un primo giro d'uso (spostamenti, Focus, scheda, teletrasporto),
  tre giri successivi non lasciano geometrie, texture, programmi o oggetti in più.
  Prima della Fase 6 ogni tap lasciava un anello e una linea sulla GPU (33 → 81 geometrie in 24 spostamenti).
- **Rimontaggio del Canvas** (perdita del contesto): 12 rimontaggi, ognuno con esattamente le risorse
  del primo, un solo contesto WebGL vivo alla fine. Memoria JS fra il 3° e il 12° rimontaggio:
  9,3 → 11,5 MB (~0,25 MB a rimontaggio, sotto la soglia di 3 MB; un rimontaggio avviene solo dopo
  una perdita di contesto, quindi è un evento raro).
