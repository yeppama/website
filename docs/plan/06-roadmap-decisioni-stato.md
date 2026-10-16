# PLAN §6–§9

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 6. Roadmap: dipendenze, complessità, rischi

```
F0 ──> F1b ──> F2 ──> F3 ──> F4 ──> F5 ──> F6 ──> F7 ──> (F8)
```
Con D4-B la Fase 1 assorbe un blockout minimo e diventa **F1b**: la catena torna lineare, e ogni
consegna è valutabile per conto suo. F2 approfondisce l'ambiente che F1b ha abbozzato.

| Fase | Oggetto | Complessità | Rischi principali | Definition of Done |
|---|---|---|---|---|
| **F0** | Piano e schema dati | **Bassa** | Schema incompleto → refactor a cascata nelle fasi 3-5. Mitigazione: invarianti I1-I14 definite ora. | `PLAN.md` approvato |
| **F1b** | Setup, design system, onboarding, HUD **+ blockout minimo** (pavimento, 4 muri, 2 faretti) | **Media** *(era Bassa-Media: il blockout aggiunge ~mezza giornata)* | Font display: il blackletter del brand è probabilmente proprietario (L7) → uso un open font e lo dichiaro. Logo in bassa risoluzione (§4.5) → segnaposto tipografico finché non arriva il vettoriale | Build ok, dev server ok, onboarding desktop/mobile, `<PlaceholderImage />` nei 3 ratio e 3 stati, **e i cartelli visibili dentro un ambiente**, quindi giudicabili |
| **F2** | Blockout + lighting | **Media** | **Il rischio estetico maggiore del progetto.** Luci e materiali decidono se l'esperienza impressiona. Secondo rischio: budget ombre (T1/D3). | Scena generata 100% da config, camera statica, 4 inquadrature screenshot, zero errori console |
| **F3** | Navigazione ibrida | **Alta** | Pointer Lock: perdita di focus, ESC, re-entry solo su gesto esplicito (bug sottili e specifici per browser). Tap vs drag: discriminare per soglia px + tempo. A* + sweep: percorsi che tagliano gli angoli dentro i collider. | Desktop WASD+look senza penetrazione muri; mobile tap-to-move e teletrasporto; hotspot con isteresi |
| **F4** | Modelli segnaposto + Focus Camera | **Media** | Focus Mode è una macchina a stati (free → entering → focused → exiting → free): gli input vanno congelati, le uscite devono essere sempre possibili, anche su perdita di focus. Ombre proiettate = ritorno di T1. | Focus in/out fluido su ogni display, nessuno stato bloccato, ombre entro il budget del tier |
| **F5** | Modali prodotto + Lookbook | **Media** | Movimento sospeso e ripristinato in modo coerente (il bug classico: chiusura modale con un tasto ancora premuto → il player parte da solo). Focus trap e accessibilità da tastiera. | Modali da `storeConfig`, movimento sospeso/ripristinato correttamente, lookbook navigabile |
| **F6** | Performance, responsive, fallback | **Media-Alta** | Disposal GPU: i leak si vedono solo dopo molti cicli di montaggio/smontaggio. Rischio dichiarativo: non poter testare su dispositivi reali da qui (§5.4). | HUD perf, cap 60 fps, disposal verificato, fallback WebGL, `docs/PERF.md` compilato con misure reali |
| **F7** | Build e deploy | **Bassa** | ~~Blocco di rete~~ **risolto**: integrazione Vercel attiva, Production e Preview verificate (§10.4). Da F1b in poi ogni push produce un URL pubblico | Dominio di produzione verificato da te sul tuo browser (io non raggiungo gli URL pubblicati, L12) |
| **F8** | E-commerce reale | **Alta** | Non eseguita. Solo su tuo comando esplicito futuro. | — |

**Percorso critico:** F2 (estetica) e F3 (navigazione). Sono le due fasi dove un errore è costoso da
correggere dopo. Suggerisco di dedicare a entrambe un giro di revisione in più.

---

## 7. Decisioni — TUTTE CHIUSE (2026-10-15)

| # | Decisione | Scelta | Opzioni scartate e perché |
|---|---|---|---|
| **D1** | Styling | **A — Tailwind 4.3** | *Styled-components:* costruisce gli stili nel browser dell'utente, sullo stesso thread già occupato dal canvas 3D. Con Tailwind gli stili esistono già prima che la pagina si apra |
| **D2** | Stato globale | **A — Zustand 5.0** | *Context di React:* a ogni cambio ri-renderizza tutti i consumer; con la posizione del player che cambia 60 volte al secondo è insostenibile. *Emitter a mano:* funziona, ma è codice mio in più senza vantaggi |
| **D3** | Ombre | **A — ibrida** | Max 2 ombre reali su tier high/medium, **0 su low** con ombre "blob" ellittiche a terra. *Tutte reali:* il tier low scende sotto i 30 fps. *Lightmap pre-cotte:* la resa migliore, ma invalidano il principio data-driven — spostare un espositore in config lascerebbe l'ombra dov'era |
| **D4** | Ordine fasi | **B — Fase 1b** | La Fase 1 include un blockout minimo (pavimento, 4 muri, 2 faretti), così la UI è giudicabile dentro un ambiente. *Ordine originale:* consegna cartelli nel vuoto, su cui non è possibile dare un giudizio |
| **D5** | Brand | **Chiusa: INTO Industries** | Nome, logo, origine (Florence, Italy), coordinate e credito in `meta.brand`. Palette e direzione in §4.4, lettura del logo in §4.5 |
| **D6** | Grana | **B — velo in compositing** | Texture di rumore sopra il canvas, `mix-blend-mode`, animata a ~12 Hz: la pipeline WebGL non la vede. *Post-processing reale:* resa perfetta ma costo a schermo intero proprio dove D3 sta risparmiando. Lo schema resta commutabile via `performance.postFx.grain.mode` · **Rivista il 2026-10-16:** fusione `alpha` (solo granelli scuri) al posto di `mix-blend-mode: overlay`, che su Iris Xe costava ~20 fps e alzava il nero (docs/PERF.md). Scelta dell'utente dopo confronto a vista e misure |
| **D7** | Doppio hosting | **A — solo Vercel** | Dichiarato sistemato da te. **Non verificabile da qui** (§10.4, punto 4) |

### 7.1 Punti ancora aperti (non bloccanti per la Fase 1b)

| | Cosa manca | Entro quando | Se non arriva |
|---|---|---|---|
| **P1** | **Logo vettoriale** (`.svg` / `.ai` / `.pdf`) o PNG trasparente ≥ 2000 px. Il file ricevuto è 150×150 px su fondo bianco | **Fase 2** (prima dell'insegna 3D) | Uso un segnaposto tipografico e lo dichiaro |
| **P2** | **Font del marchio**, se ne esiste uno proprietario con licenza | Fase 1b | Uso un open font vicino e dichiaro che non è identico (L7) |
| **P3** | **Conferma della tagline** `We're just looking for somewhere` — l'ho letta dal micro-testo del logo a bassa risoluzione, potrebbe essere incompleta | Fase 5 (Lookbook) | La marco come da verificare nel file di configurazione |
| ~~P4~~ | ~~Il logo deve comparire in 3D?~~ | **Fase 2: risolta per assunzione** | Insegna sulla parete di fondo (punto di fuga dell'ingresso) con wordmark nell'ellisse del marchio, pannello Lookbook sotto. Da confermare o correggere |

## 8. Verifiche della Fase 0

| Verifica | Stato | Nota |
|---|---|---|
| Stack tecnico motivato | **Eseguita** | §1, con alternative scartate e motivo |
| Schema `storeConfig.js` completo | **Eseguita** | §3, 11 sezioni + 14 invarianti |
| Design system placeholder 2D/3D | **Eseguita** | §4, API di `<PlaceholderImage />` e trattamento 3D |
| Dispositivi/browser e misurazione | **Eseguita** | §5, con soglie differenziate per tier |
| Roadmap, dipendenze, complessità, rischi | **Eseguita** | §6, con Definition of Done per fase |
| Architettura delle cartelle | **Eseguita** | §2 |
| Build di produzione | **Non applicabile** | Nessun progetto inizializzato: la Fase 0 produce solo documentazione |
| Avvio dev server | **Non applicabile** | Idem |
| Verifica UI nel browser | **Non applicabile** | Nessuna UI esistente |
| Misurazione fps reale | **Bloccata (ambiente)** | Container senza GPU, §5.4. Richiede i tuoi dispositivi fisici |
| Lettura della reference di brand | **Parziale** | instagram.com non raggiungibile dal container (`ENOTFOUND`): §4.4 deriva dal solo screenshot fornito |
| Lettura del logo | **Parziale** | File a 150×150 px: sufficiente per la direzione, insufficiente per l'uso (P1) |
| Hosting Vercel (Production + Preview) | **Eseguita** | §10.4, deployment `7098935169` e `7099073171`, entrambi `success` |
| Disattivazione di GitHub Pages | **Bloccata (ambiente)** | API negata dal proxy. Dichiarata da te, da confermare in F1b |
| Chiusura di tutte le decisioni | **Eseguita** | §7 |

---

## 9. Stato

**Fase 0 completata. Tutte le decisioni sono chiuse. Nessuna fase successiva è autorizzata.**

| | |
|---|---|
| Decisioni | D1-A · D2-A · D3-A · D4-B · D5 (INTO Industries) · D6-B · D7-A — **tutte chiuse** |
| Limiti | L1 risolta e verificata · L2, L3, L4, L12 permanenti e dichiarati · gli altri mitigati |
| Hosting | Vercel attivo, Production e Preview verificate |
| Aperti non bloccanti | P1 logo vettoriale · P2 font · P3 tagline · P4 logo in 3D (§7.1) |

Il piano è esecutivo: non resta nessuna ambiguità che mi impedisca di scrivere la prima riga di
codice. Manca solo il tuo comando esplicito:

> **`Approvato, procedi alla fase 1b`**

---

