# CONTEXT — INTO industries · negozio streetwear immersivo 3D

> Stato al 2026-10-19 · branch di lavoro **`sviluppo`** · `main` = produzione, ferma alla Fase 7.
> Questo file si carica a ogni sessione: contiene solo lo stato vigente. Il resto si legge quando serve (tabella in fondo).

## 1. Cos'è

Prototipo web 3D navigabile in prima persona del negozio streetwear INTO industries (Florence), data-driven, con carrello Shopify headless. Il lavoro è per un cliente dell'utente: l'utente fa da tramite per contenuti e decisioni.

## 2. Branch e pubblicazione

| Branch | Ruolo |
|---|---|
| `main` | Produzione su Vercel. Fase 7, contenuto `into` (segnaposto dichiarati), `noindex`. Non si tocca senza comando dell'utente. |
| `sviluppo` | **Branch di lavoro.** Tutto il lavoro dal 2026-10-17 in poi: Fase 8a/8b, demo con foto, prova del cantiere. Ha `.env` con `VITE_CONTENT=demo`. Ogni push crea un'anteprima Vercel. |
| `archivio/docs-ristrutturati` | Archivio: riordino dei documenti del 2026-10-16 mai unito. Non ci si lavora. |

- Il contenuto `demo` non può finire in produzione: con `VERCEL_ENV=production` o da `main` la build si ferma (`vite.config.js`, `guardProductionContent`). Unendo `sviluppo` in `main` va tolto `.env`.
- Branch vecchi (`claude/*`, `demo/vetrina`, `ccr-91a33afa-mmw7de`, compreso il suo ultimo commit `13eddb1` sul cantiere, unito il 2026-10-19) verificati il 2026-10-19: tutti i loro commit sono in `sviluppo` (tranne `adoring-brown`, copiato in `archivio/docs-ristrutturati`). Si cancellano da GitHub; il proxy del container non permette di cancellare branch né di creare tag.

## 3. Le due proposte per il cliente

Il cliente sceglie fra due allestimenti dello stesso negozio. Navigazione, Focus, schede e carrello sono codice comune.

| | A · Negozio attuale | B · Cantiere |
|---|---|---|
| Dove | indirizzo dell'anteprima, senza parametri | stesso indirizzo + `?allestimento=cantiere` (anche in produzione; nella build `VITE_LAYOUT=cantiere`) |
| Codice | `src/config/storeConfig.js` | `src/layouts/cantiere.js`, `scene/environment/CantiereRoom.jsx`, espositori `pipeRack`/`chain`/`blockTable`; immagini in `public/cantiere/` |
| Stato | completo e navigabile, contenuto demo con foto, prezzi da Shopify; retro del manichino corretto, punti luce arancioni (2026-10-19) | fasi 1–2 fatte + zoom per capo, catene e grafica streetwear sulla parete sud, punti luce arancioni (2026-10-19). Bloom vero solo su GPU dedicata. Da fare: luci e misure sui telefoni (fase 3) |
| Documenti | `docs/PIANO-DEMO.md`, `docs/demo/` | `docs/cantiere/PIANO.md`, `docs/cantiere/PROMPT-IMMAGINI.md` |

- **Requisito dell'utente: entrambe le versioni devono restare accessibili** dallo stesso link. Nessuna modifica può rompere o nascondere una delle due; ogni verifica si fa su tutte e due (`e2e-cantiere.mjs` per B, le suite del negozio per A).
- Le fasi successive del cantiere partono solo con `Approvato, procedi alla fase X`.

## 4. Stato

- **Fasi 0–7** chiuse; produzione su `main` (opzione A, segnaposto dichiarati, `noindex`).
- **Fase 8:** 8a (carrello, fornitore finto) e 8b (Shopify di sviluppo, ordine di prova #1001 pagato) chiuse; preparazione 8c/8d fatta (modello Excel del catalogo, import, controllo dal vivo, pagine legali). **8c in attesa del catalogo del cliente.** Piano: `docs/PLAN-8.md`.
- **Demo "negozio finito":** fatta (contenuti in `src/content/`, foto, capi 3D con la foto, prezzi dal fornitore). Non eseguito: benchmark su iPhone, Pixel e Honor con le foto, prova completa da telefono, aggiornamento di `docs/codice/` (oggi superato).
- **Cantiere:** fasi 1–2 fatte (2026-10-19). Fase 2: Bloom vero sul tier high, alone finto altrove; non misurato su una GPU dedicata vera (costo in SwiftShader 84 → 153 draw call sulla vista del neon). Prossimo: fase 3 su comando, serve l'utente coi telefoni (`docs/cantiere/PIANO.md`).
- **Correzioni richieste il 2026-10-19:** fasi A (manichino, zoom rack, catene) e B (catene e grafica del cantiere, punti luce arancioni nei due negozi) fatte. In coda, su comando: **C** negozio A più piccolo e più pieno ("riduciamo un po' e riempiamo"), con la sua grafica streetwear.

## 5. Regole di processo (dall'utente)

Una fase alla volta; si avanza solo col comando esplicito `Approvato, procedi alla fase X`; a fine fase build, dev server, verifica nel browser, report che distingue eseguito / non eseguito / bloccato, poi stop. Fase 8 (e-commerce reale) solo su comando futuro.

## 6. Aperti e in attesa

- **Aperti:** P1 logo vettoriale (oggi PNG 150×150 → wordmark tipografico di riserva) · P3 conferma tagline "We're just looking for somewhere" (ora visibile come titolo nella Brand Story: va confermata prima di un lancio) · dati prodotto reali · testi e immagini reali del Lookbook (oggi segnaposto dichiarati).
- **In attesa di riscontro dall'utente:** misura su un Android di fascia media (tier low, soglia p50 ≥ 40), mai fatta · checklist mobile della fase 5 (scheda prodotto e Lookbook su un telefono vero, in verticale e in orizzontale) · checklist mobile della fase 4 (telefono in orizzontale, tap-avvicinamento-Focus, resa del nero) e sensibilità del trascinamento (`navigation.player.lookSensitivity.mobileDrag`).
- Piccole incongruenze del codice ancora aperte: elenco in `docs/STORIA.md` (voce "Piccole incongruenze trovate scrivendo `docs/codice/`").

## 7. Dove leggere cosa

| Prima di… | Leggere |
|---|---|
| toccare architettura, stile, rendering, navigazione | `docs/DECISIONI.md` |
| cercare un file, una funzione, un comando di test, un parametro di debug | `docs/RIFERIMENTO.md` |
| toccare rendering, navigazione, UX, foto o test | `docs/LEZIONI.md` (edge case già pagati) |
| capire perché una cosa è com'è, o cosa ha deciso l'utente e quando | `docs/STORIA.md` |
| lavorare su e-commerce / Shopify | `docs/PLAN-8.md` |
| misure di prestazioni | `docs/PERF.md` |
| contenuti da ricevere dal cliente | `docs/CONTENUTI.md` |
| spiegare il sito all'utente | `docs/MANUALE.md` |
| schema dati completo e roadmap originale | `PLAN.md` |
