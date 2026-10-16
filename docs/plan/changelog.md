# PLAN — Changelog del piano

> Parte di `PLAN.md` (indice). Storia delle versioni del piano, dalla 0.2 alla 1.8.

**Fase 0 — Pianificazione, Architettura Dati e Stime**
Versione documento: **1.0** · Data: 2026-10-15 · Stato: **decisioni chiuse — in attesa del comando di avanzamento**
> Changelog 1.8 — **Fase 7 eseguita (2026-10-16), opzione A scelta dall'utente:** produzione su
> `main` con contenuti dimostrativi dichiarati, fuori dai motori di ricerca (`noindex`) finché non
> arrivano i contenuti reali del cliente (`docs/CONTENUTI.md`). Aggiunti `vercel.json` (header di
> sicurezza, cache), meta Open Graph, README. Tutte le suite verdi sulla build pubblicata.
> Changelog 1.7 — **Fase 6 chiusa dall'utente (2026-10-16)** con scostamento dichiarato: il
> portatile di riferimento (Iris Xe, 1920×911) misura 57,1 / 39,2 contro la soglia stimata 58 / 45.
> iPhone (Safari 26) e Pixel superano le soglie mobile. Dopo le misure reali: tier rivisto (GPU
> integrate e iPhone in medium), grana con fusione `alpha` (D6 rivista), riscaldamento della GPU e
> nessuna compilazione al primo uso. Nebbia corretta ma spenta. Android di fascia media non misurato.
> Changelog 1.6 — **Fase 6 consegnata.** Memoria GPU: cache condivise legate al ciclo di vita del
> Canvas (`lib/gpuCaches.js`), perdite per tap eliminate (linea del percorso e anello del ping),
> stabilità verificata dentro la sessione e su 12 rimontaggi. Perdita del contesto WebGL gestita
> (overlay, ripristino automatico, posa conservata). HUD prestazioni `?perf=1` e benchmark `?bench=1`
> attivi anche in produzione; `r3f-perf` non adottato (l'HUD legge `gl.info` direttamente, zero
> dipendenze). `docs/PERF.md` creato: protocollo, soglie, registro con la sola riga software
> marcata come non valida. Verifica responsive automatica su 8 formati: corretta la minimappa che in
> orizzontale spingeva fuori schermo la barra "Vai a".
> Changelog 1.5 — **Fase 5 consegnata.** Scheda prodotto 2D (galleria segnaposto, colori e taglie
> come gruppi radio da tastiera, prezzo formattato con `meta.brand.locale`, acquisto spento e
> dichiarato dalla feature `checkout`) e Lookbook / Brand Story da `lookbook` e `meta.brand`. Le
> finestre sono una pila (`dialogs`): dal Lookbook a un capo e ritorno. Trappola del focus comune a
> schede e menu. Invarianti estese a 22 (I21 Lookbook ↔ catalogo, I22 dati della scheda).
> Struttura reale: `ui/dialog/DialogHost.jsx`, `ui/product/ProductSheet.jsx` + `OptionGroup.jsx`,
> `ui/lookbook/LookbookSheet.jsx`, `ui/primitives/useFocusTrap.js`, `lib/format.js`.
> Changelog 1.4 — **Fase 4 consegnata.** Cinque espositori (manichino ×2, rack, plinto, parete),
> sette prodotti demo, Focus Mode come macchina a stati interrompibile. Invarianti estese a 20
> (I19 espositori, I20 forme dei capi). Illuminazione ritarata: i faretti dei prodotti sono bianco
> caldo, il colore d'atmosfera resta su pareti e accenti. Geometrie statiche unite per materiale e
> corpi illuminanti a istanze: sul tier low la zona più densa scende da 64 a 31 draw call.
> Changelog 1.3 — **Fase 3 consegnata.** Grafo di navigazione esteso con due corridoi laterali
> (16 waypoint, 21 collegamenti): il test sui percorsi ha trovato il 2% dei punti calpestabili
> invisibile da ogni nodo. Corretta la convenzione di rotazione dei collider, speculare rispetto a
> three fino alla Fase 2. Ogni destinazione rapida dichiara la sua `zoneId`; ogni POI il suo
> `approachWaypointId` e la funzione che richiede.
> Changelog 1.2 — **Fase 2 consegnata.** Invarianti estese a 18 (I15–I18, §3.11). Grafo di
> navigazione corretto: rimosse le diagonali verso `wp-hall-02`, una delle quali attraversava il
> plinto (rilevato da I16). P4 risolta per assunzione: logo come insegna sulla parete di fondo.
> Changelog 1.1 — accento primario sostituito: **Flame Orange, PANTONE 15-1157 TPG (#F98E30)**
> al posto dell'arancio-rosso `#ff5a1f`; token rinominato `ember` → `flame`. Nessun rosso di brand:
> `#c21025` sopravvive solo come colore di stato per gli errori.
> Changelog 1.0 — **tutte le decisioni chiuse** (D1-A, D2-A, D3-A, D4-B, D6-B, D7-A; brand:
> INTO Industries, logo fornito). Piano esecutivo: nessuna ambiguità residua.
> Changelog 0.4 — L1 (hosting) **risolta**: integrazione Vercel attiva e verificata. Aggiunti
> L12 e la decisione D7 (doppio hosting).
> Changelog 0.3 — aggiunta §10: capacità e limiti dell'ambiente, **verificati**, con piano di
> prevenzione per ciascuno. Versioni pacchetti allineate al registry reale.
> Changelog 0.2 — D5 risolta parzialmente (direzione visiva da reference; nome brand ancora aperto):
> palette riscritta, direzione artistica in §4.4, nuova decisione D6 (grana).

> Questo documento è l'unico output della Fase 0. Nessun progetto è stato inizializzato,
> nessuna dipendenza installata, nessun codice applicativo scritto.

---
