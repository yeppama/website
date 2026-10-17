# Manuale del sito INTO industries

Scritto il 2026-10-17 sul codice del commit `ac1cb32`. Spiega **come funziona il sito e dove mettere le
mani** per cambiarlo. La spiegazione riga per riga di ogni file è in [`docs/codice/`](codice/README.md):
questo manuale ti dice quale file aprire, quella ti dice cosa fa ogni riga.

Le righe citate (es. `storeConfig.js` r. 481) valgono per questa versione: dopo una modifica possono
spostarsi di qualche riga. I nomi dei campi (`products`, `copy.cart.add`…) invece restano: cerca quelli.

---

## 0. Le tre regole da sapere prima di toccare qualcosa

1. **Quasi tutto si cambia in un solo file: `src/config/storeConfig.js`.** Testi, prezzi dimostrativi,
   capi, posizioni degli espositori, luci, colori dei materiali, destinazioni "Vai a", funzioni accese o
   spente. I componenti (le cartelle `src/ui` e `src/scene`) leggono da lì e **non contengono contenuti**:
   se un testo o un numero è scritto dentro un componente, è un errore da correggere.
2. **Le cose si collegano per `id`.** Un capo dice in quale espositore sta (`displayId`), l'espositore
   elenca i suoi capi (`productIds`), un muro dice quale collider lo rende solido (`colliderId`). Se cambi
   un `id` da una parte, va cambiato anche dall'altra. Il **validatore** (`validateStoreConfig.js`,
   25 controlli chiamati I1–I25) se ne accorge e, in sviluppo, ferma il sito con un messaggio che dice
   cosa non torna.
3. **Dopo ogni modifica si verifica** (sezione 5). Un sito 3D può "funzionare" e intanto rendere a 20 fps
   su un telefono, o lasciarti camminare dentro un muro.

---

## 1. Il sito in una pagina: cosa succede quando un visitatore entra

| Momento | Cosa vede | Dove sta il codice |
|---|---|---|
| 1. Apertura | Pagina nera, schermata d'ingresso con marchio e istruzioni | `index.html` → `src/main.jsx` → `src/App.jsx` → `src/ui/onboarding/OnboardingScreen.jsx` |
| 2. Controllo del dispositivo | Niente: il sito decide quanto "pesante" può essere la grafica (tier `high`, `medium`, `low`) | `src/lib/deviceProfile.js` (regole), `storeConfig.performance.tiers` (cosa cambia per ogni tier) |
| 3. Caricamento 3D | Barra di avanzamento; il motore 3D si scarica a parte, dopo la pagina | `App.jsx` (`lazy`), `src/scene/StoreCanvas.jsx` |
| 4. "Entra" | Il negozio 3D: pavimento, muri, colonne, luci, espositori coi capi, parete del brand | `src/scene/environment/*`, `src/scene/lighting/*`, `src/scene/displays/*`; dati in `storeConfig.environment`, `lighting`, `displays` |
| 5. Movimento | Desktop: WASD e mouse. Telefono: tocco per andare, trascinamento per guardare, barra "Vai a" | `src/scene/player/PlayerController.jsx`; percorsi `src/lib/navigator.js`; urti `src/lib/collision.js`; dati `storeConfig.navigation`, `colliders` |
| 6. HUD | Marchio, zona in cui sei, minimappa, Menu, carrello | `src/ui/hud/*`, `src/ui/menu/MenuDrawer.jsx` |
| 7. Avvicinarsi a un capo | Compare un'ellisse luminosa (hotspot) sull'espositore | `src/scene/player/Hotspots.jsx`; dati `storeConfig.pois` |
| 8. Focus | La camera va sul capo, luce "studio", pannello con nome e prezzo | `src/scene/player/FocusCameraRig.jsx`, `src/ui/focus/FocusPanel.jsx`, `src/lib/framing.js`; dati `displays[].focusCamera`, `storeConfig.focus` |
| 9. Scheda completa | Foto, colori, taglie, descrizione, "Aggiungi al carrello" | `src/ui/dialog/DialogHost.jsx`, `src/ui/product/ProductSheet.jsx` |
| 10. Brand Story | Racconto della collezione con galleria | `src/ui/lookbook/LookbookSheet.jsx`; dati `storeConfig.lookbook`, `meta.brand` |
| 11. Carrello | Righe, quantità, totale, "Vai al pagamento" | `src/ui/cart/*`, `src/state/useCartStore.js`, `src/commerce/*` |
| 12. Pagamento | Si passa alla cassa di Shopify (fuori dal sito) | `src/commerce/shopify.js` (`checkoutUrl`) |
| 13. Pagine legali | Dal menu: condizioni, recesso, privacy… lette da Shopify | `src/ui/legal/LegalSheet.jsx`, `src/state/useLegalStore.js`, `src/lib/sanitizeHtml.js` |

**Chi parla con chi.** I pezzi non si chiamano a vicenda direttamente: si scambiano informazioni
attraverso tre "bacheche" condivise (gli *store*, in `src/state/`):
- `useAppStore` — in che fase è il sito, menu aperto, Focus, schede aperte, perdita della grafica;
- `usePlayerStore` — dove sei, comandi per il movimento (teletrasporto, "vai a"), dissolvenze;
- `useCartStore` / `useLegalStore` — catalogo, carrello, pagine legali.

Esempio: tocchi "Scheda completa" → il pannello del Focus scrive "apri la scheda del capo X" in
`useAppStore` → `DialogHost` lo legge e mostra `ProductSheet` → il player legge che c'è una scheda aperta
e smette di muoversi.

**Commercio.** Il sito può funzionare in tre modi, scelti in `storeConfig.commerce.provider`:
- `off` (oggi in produzione): niente acquisti, il bottone dice "In arrivo nella Fase 8";
- `mock`: negozio finto per le prove, senza pagamenti (in un link: `?commerce=mock`);
- `shopify`: prezzi, taglie disponibili e carrello veri da Shopify (in un link: `?commerce=shopify`).
Con il commercio attivo **prezzi e disponibilità vengono solo da Shopify**: quelli scritti in
`storeConfig` non contano più (sono dimostrativi).

---

## 2. Come è organizzato il codice

```
index.html            la pagina vuota che il browser apre; contiene il titolo e il "noindex"
vercel.json           regole del sito pubblicato (sicurezza, cache, "noindex")
src/main.jsx          accende React e monta App
src/App.jsx           il regista: decide cosa mostrare (ingresso, scena, HUD, menu, schede, emergenze)
src/config/           I DATI: storeConfig.js (tutto il negozio), designTokens.js (colori, caratteri), validatore
src/lib/              funzioni di calcolo senza grafica: geometria, urti, percorsi, inquadratura, tier, prezzi…
src/state/            le bacheche condivise (store)
src/scene/            tutto ciò che è 3D: ambiente, luci, espositori, player, camera del Focus
src/ui/               tutto ciò che è 2D sopra il 3D: ingresso, HUD, menu, Focus, schede, carrello, emergenze
src/commerce/         il collegamento al negozio: finto (mock.js) o Shopify (shopify.js)
src/styles/           CSS generale, caratteri, colori generati dai token
public/fonts/         i file dei caratteri
scripts/              test automatici, importatore del catalogo, strumenti
docs/                 piano, misure, contenuti richiesti, questo manuale, spiegazione riga per riga
```

| Cartella / file | Cosa fa | Toccare? |
|---|---|---|
| `src/config/storeConfig.js` | Tutto il negozio come dati | **Sì**, è fatto per questo |
| `src/config/designTokens.js` | Colori, caratteri, spaziature, livelli di sovrapposizione | Sì, con cautela (vale per tutto il sito) |
| `src/config/validateStoreConfig.js` | I 25 controlli di coerenza | Solo per aggiungere controlli |
| `src/lib/*` | Matematica e regole | No, salvo bug: ogni file ha test |
| `src/state/*` | Bacheche condivise | No, salvo nuove funzioni |
| `src/scene/*` | Disegno 3D | Raramente: forme nuove di espositori, effetti |
| `src/ui/*` | Interfaccia 2D | Per cambiare **impaginazione**, non testi |
| `src/commerce/*` | Collegamento al negozio | Solo per cambiare fornitore o funzioni di vendita |
| `scripts/*` | Test e strumenti | Da aggiornare quando cambia il comportamento |

---

## 3. "Voglio cambiare X → dove"

Tutti i percorsi sono relativi alla cartella del progetto. "Config" = `src/config/storeConfig.js`.

### Testi e contenuti

| Voglio cambiare… | Dove | Note e rischi |
|---|---|---|
| Un testo dell'interfaccia (bottoni, avvisi, menu) | Config → `copy` (r. ~601 in poi), sezione per area: `onboarding`, `focus`, `product`, `cart`, `legal`… | Solo il testo fra apici. Gli apici dentro il testo vanno scritti `\'` |
| Le istruzioni della schermata d'ingresso | Config → `copy.onboarding.desktop.lines` / `mobile.lines` | Ogni riga ha `requires`: se la funzione è spenta compare "in arrivo" (controllo I15) |
| Tagline, città, coordinate, credito | Contenuto → `brand` (`src/content/into.js`; nella demo lo stesso) | La tagline compare nel menu, nell'ingresso e nella Brand Story |
| Nome, descrizione, dettagli di un capo | Contenuto → `products[]` (`src/content/into.js`, nella demo `demo.js`) | Con Shopify attivo il nome mostrato nel carrello viene da Shopify |
| Prezzo di un capo | Commercio spento: Contenuto → `products[].price.amount`. Commercio attivo: **su Shopify** | Con Shopify il prezzo di storeConfig è ignorato, di proposito |
| Taglie e colori di un capo | Contenuto → `products[].sizes` / `colorways` | Con Shopify, i nomi devono coincidere con le opzioni "Taglia" e "Colore" su Shopify (`npm run check:catalog` lo verifica) |
| Etichetta NEW / ARCHIVE | Contenuto → `products[].badges` | |
| Testi e immagini della Brand Story | Contenuto → `lookbook[]` | `productIds` del lookbook e `lookbookIds` del capo devono citarsi a vicenda (I21) |
| Pagine legali | **Su Shopify**: Impostazioni → Informative | Il sito le legge da lì; nel codice non ci sono testi legali |
| Catalogo completo dal cliente | Modello `docs/modello-catalogo-INTO.xlsx` → `npm run catalog:import -- file.xlsx` | Produce CSV per Shopify e una bozza per Config; la posizione 3D dei capi va decisa a mano |
| Quale contenuto pubblica il sito (INTO o demo) | Variabile `VITE_CONTENT` (`into` se manca; il branch della demo ha `.env` con `demo`) | Il contenuto porta marchio, capi, Lookbook, posizione dei capi (`products[].displayId`), fornitore del commercio e i testi che cambiano (`copy`) |
| Foto di un capo o della campagna | Contenuto → `media[].src` / `images[].src`, poi `npm run media:build -- <contenuto>` | Originali in `media-sorgenti/` (fuori da git); istruzioni e stile in `docs/demo/FOTO.md`. Una foto legata a un colore ha `colorwayId` |
| Foto sul capo 3D | Contenuto → `products[].model3d` | Texture scontornata preparata da `media:build`; senza, resta la sagoma nel colore |

### Aspetto

| Voglio cambiare… | Dove | Note e rischi |
|---|---|---|
| Colori dell'interfaccia (accento arancio, fondi, testo) | `src/config/designTokens.js` → `color` | Si rigenerano da soli a ogni `npm run dev`/`build` (`scripts/generate-theme.js`). Il rosso è solo per gli errori |
| Colori e finiture delle superfici 3D (pavimento, muri, metallo) | Config → `lighting.materials` (r. ~340) | `color`, `roughness` (opaco ↔ lucido), `metalness`. Con una texture il colore va lasciato bianco (lezione in CONTEXT §4) |
| Caratteri | File in `public/fonts/`, dichiarazioni in `src/styles/fonts.css`, nomi in `designTokens.type.family` | Servono file con licenza web |
| Logo sulla parete di fondo | Config → `assets.registry['asset-logo-primary'].url` | Oggi `null`: compare il wordmark tipografico di riserva |
| Luci (intensità, colore, direzione) | Config → `lighting.spots` (r. ~302) | Faretti sui capi in bianco caldo, colore solo su pareti e accenti (decisione di progetto). Solo i primi 2 per `priority` fanno ombre vere |
| Luminosità generale | Config → `performance.toneMappingExposure` | Alzandola il nero dei capi diventa grigio |
| Grana | Config → `performance.postFx.grain` | `alphaOpacity` per tier; in `low` è 0 per scelta (telefoni economici) |
| Vignettatura | Config → `performance.postFx.vignette` e `focus.vignetteStrength` | |
| Nebbia | Config → `environment.fog.enabled` | Spenta per scelta dell'utente; anteprima con `?fog=1` |
| Segnaposto delle immagini | Config → `placeholders` | Spariscono quando ci saranno le foto vere (lavoro della Fase 8c) |

### Negozio 3D

| Voglio cambiare… | Dove | Note e rischi |
|---|---|---|
| Spostare un espositore | Config → `displays[]`: `position`, `rotationY` **e** il suo collider in `colliders` **e** `focusCamera` **e** l'`anchor` e il `floorMarker` del suo POI in `pois` **e** il `targetPosition` del suo faretto | Muovere solo `position` lascia il "muro invisibile" nel posto vecchio. I controlli I16 e I19 segnalano molti errori, non tutti: guardare `?debug=top&colliders=1` |
| Mettere un capo su un altro espositore | Contenuto → `products[].displayId` | L'elenco dei capi dell'espositore si ricava da lì |
| Aggiungere un capo | Config → nuovo oggetto in `products` con `id` nuovo, `commerce.handle` unico, `displayId`, e l'`id` aggiunto ai `productIds` di un espositore | La categoria deve avere una sagoma in `garments.shapeByCategory` (I20) |
| Margine invisibile attorno agli espositori | Config → `DISPLAY_CLEARANCE` (in cima al file, oggi 0,2 m) | Più grande = il visitatore si ferma più lontano; i controlli I9, I16 e I19 dicono se un punto di passaggio o una camera finiscono dentro |
| Indicatore a terra davanti a un espositore | Config → `pois[].floorMarker` (posizione), `navigation.hotspot.floor` (misure, pulsazione) | Il controllo I27 lo vuole sul pavimento libero |
| Comandi da computer (tastiera e mouse / solo mouse) | Si scelgono all'ingresso; testi in `copy.onboarding.desktop.modes` e `mouseLines`, sensibilità in `navigation.player.lookSensitivity.mouseDrag` | La scelta resta nel browser del visitatore |
| Muri, colonne, pedane | Config → `environment.walls`, `architecture` | Ogni muro solido ha un collider in `colliders`: il disegno e l'urto sono separati di proposito |
| Zone (Ingresso, Nuovi Arrivi…) | Config → `environment.zones` | Servono a HUD e minimappa |
| Destinazioni della barra "Vai a" | Config → `navigation.quickTravel` | Solo verso punti `safeForTeleport: true` |
| Velocità di camminata, corsa | Config → `navigation.player.walkSpeed`, `sprintMultiplier` | |
| Sensibilità del trascinamento su telefono | Config → `navigation.player.lookSensitivity.mobileDrag` | |
| Inquadratura del Focus su un capo | Config → `displays[].focusCamera` (`position`, `target`, `fov`) | Su telefono e in orizzontale il sito sposta da solo il capo nella parte libera dello schermo |
| Durata delle transizioni del Focus | Config → `displays[].focusCamera.enterMs` / `exitMs` | |
| Luce "studio" del Focus | Config → `focus.lighting` | |

### Funzionamento e vendita

| Voglio… | Dove | Note e rischi |
|---|---|---|
| Accendere o spegnere una funzione | Config → `features` | Spenta = l'interfaccia dice "In arrivo nella Fase N" |
| Attivare la vendita | Config → `commerce.provider: 'shopify'`, `commerce.shopify.domain` e `storefrontToken` del negozio del cliente, `testMode: false` | **Solo nella Fase 8e**, dopo pagine legali e prova di pagamento. Il token è quello **pubblico**, mai il privato |
| Cambiare paese o lingua di vendita | Config → `commerce.country`, `meta.brand.locale` | Il negozio Shopify deve vendere in quel paese, o i capi risultano "non disponibili" |
| Massimo pezzi per riga del carrello | Config → `commerce.maxQuantity` | |
| Limite di fotogrammi al secondo | Config → `performance.targetFps` | Il limitatore tiene un ritmo regolare (90 Hz → 90, 120 Hz → 60) |
| Cosa cambia fra telefoni potenti ed economici | Config → `performance.tiers`; regole in `src/lib/deviceProfile.js` | Le regole sono provate da `npm run test:device` con i telefoni misurati |
| Far comparire il sito su Google | Togliere `noindex` da `index.html` (r. 12) e `X-Robots-Tag` da `vercel.json` | Solo coi contenuti reali (Fase 8e) |

---

## 4. Cose da NON fare (e perché)

- **Scrivere un testo, un colore o un numero dentro un componente.** Funziona, ma la prossima persona lo
  cerca in `storeConfig.js` e non lo trova. È una regola del progetto.
- **Spostare un oggetto 3D senza il suo collider.** Il collider è un rettangolo invisibile che blocca il
  passaggio: il disegno e l'urto sono separati, quindi vanno mossi insieme.
- **Mettere il token privato di Shopify nel codice.** Il sito usa solo quello pubblico, pensato per stare
  nel browser. Quello privato dà accesso a ordini e clienti.
- **Pubblicare su `main` senza i test.** `main` è il sito pubblico.
- **Cambiare `id` senza cercarlo in tutto il file.** Gli `id` sono i fili che tengono insieme il negozio.
- **Alzare luci o esposizione per "vedere meglio" il nero.** Il nero dei capi diventa grigio: la luce
  studio nasce dal contrasto (gli altri faretti scendono), non da più luce.

---

## 5. Come verificare una modifica

```bash
npm install            # la prima volta
npm run dev            # sito in locale su http://localhost:5173 (con il validatore attivo)
npm run build          # costruisce la versione pubblicabile: deve dire "built in …" senza errori
npm run test:nav       # percorsi e urti
npm run test:device    # scelta del tier per i dispositivi misurati
npm run test:framing   # inquadratura del Focus e limitatore di fps
npm run test:commerce  # collegamento a Shopify, senza rete
npm run test:catalog   # importatore del catalogo
```

**Cosa leggere nell'esito:** ogni suite termina con "N/N test superati". Un solo ✗ va capito prima di
pubblicare. In sviluppo, se il validatore trova un errore nel config, la pagina si ferma e la console del
browser elenca i problemi (es. `I19 espositore disp-rack-01: …`).

**Prove nel browser** (i link valgono anche sulle anteprime di Vercel):
- `?debug=top&colliders=1` — vista dall'alto con i collider e il grafo dei percorsi: serve dopo aver spostato qualcosa;
- `?perf=1` — riquadro con fps e costo della scena; `?bench=1` — benchmark di 40 s da registrare in `docs/PERF.md`;
- `?commerce=mock` — negozio di prova; `?commerce=shopify` — negozio Shopify di sviluppo.

**Test completi nel browser** (lenti, li lancia chi sviluppa): `scripts/e2e/e2e-*.mjs`, istruzioni in
`CONTEXT.md` §3. Ogni push sul branch di lavoro produce un'anteprima su Vercel; il sito pubblico è `main`.

---

## 6. Dove sono le altre informazioni

| Documento | Cosa contiene |
|---|---|
| [`docs/codice/`](codice/README.md) | Spiegazione **riga per riga** di ogni file del sito |
| `CONTEXT.md` | Stato del progetto, decisioni, lezioni apprese, comandi |
| `PLAN.md` | Piano completo e schema dei dati |
| `docs/PLAN-8.md` | E-commerce: decisioni, sotto-fasi, negozi Shopify |
| `docs/PERF.md` | Misure di prestazione sui dispositivi veri |
| `docs/CONTENUTI.md` | Cosa serve dal cliente |

---

## 7. Glossario

- **Componente** — un pezzo di interfaccia o di scena scritto in React (un file `.jsx`); riceve dati e li disegna.
- **Store** — bacheca condivisa (libreria Zustand): un pezzo scrive, gli altri leggono.
- **Collider** — rettangolo invisibile che blocca il passaggio del visitatore.
- **Waypoint** — punto noto del negozio usato per calcolare i percorsi e per "Vai a".
- **POI / hotspot** — punto d'interesse su un espositore; l'ellisse che compare avvicinandosi.
- **Focus** — la modalità in cui la camera va su un capo.
- **Tier** — livello di grafica scelto per il dispositivo: `high`, `medium`, `low`.
- **Fov** — ampiezza dell'inquadratura della camera (in gradi, misurata in verticale).
- **Draw call** — un ordine di disegno alla scheda grafica; meno sono, più il sito è leggero.
- **Token di design** — i valori di base dello stile (colori, caratteri), definiti una volta sola.
- **Provider / fornitore** — chi fornisce prezzi e carrello: nessuno, il negozio finto o Shopify.
- **Handle** — il nome-indirizzo di un prodotto su Shopify (es. `heavy-hoodie`); collega il capo 3D al prodotto Shopify.
- **Storefront API** — il canale con cui il sito chiede a Shopify catalogo, carrello e pagine legali.
- **Anteprima (Preview)** — versione del sito pubblicata da Vercel per ogni modifica, protetta da login.
