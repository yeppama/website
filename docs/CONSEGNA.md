# CONSEGNA — stato e cosa resta, al 2026-10-29

Scritto per una sessione nuova che riprende il lavoro da zero. Si legge dopo
`CONTEXT.md`, che resta la fonte dello stato corrente; qui c'è cosa è successo,
cosa è rimasto aperto e in che ordine conviene affrontarlo.

## 1. Dove sta tutto

| | |
|---|---|
| `main` | Produzione su Vercel, pubblica, `noindex`. Contenuto `into` (segnaposto dichiarati), acquisti spenti. Ultimo commit `7f87699`. **Non ha il lavoro del 29.** |
| `sviluppo` | **Branch di lavoro.** Fase 8a/8b, demo con foto, allestimento cantiere, e dal 2026-10-29 anche tutta la passata di sicurezza di `main`. Ultimo commit `4a72877`. Ogni push crea un'anteprima Vercel. |
| tag `archivio-docs-ristrutturati` | Due commit di riordino documenti del 2026-10-16, mai uniti. Il branch è stato cancellato, il tag li tiene raggiungibili. |

GitHub Pages è **spento** dal 2026-10-28 (sorgente su None). Pubblicava una copia
rotta del sito, senza nessuno degli header di sicurezza.

## 2. Cosa è cambiato il 2026-10-29

Tre commit su `sviluppo`, tutti lavoro tecnico che non dipendeva dal cliente.

**`ec69125` — `main` unito in `sviluppo`.** I due rami non si univano più da
soli: 13 file in conflitto, tutti toccati dalla passata di sicurezza del 28.
Adesso `sviluppo` ha gli stessi header, le stesse guardie e gli stessi controlli
di `main`, e il merge finale verso `main` è una formalità. Le scelte di merge
sono nel messaggio del commit; quelle che pesano:

- `src/App.jsx` usa l'`ErrorBoundary` di `main`, fuori dal contenitore del
  canvas (quel div ha uno z-index, quindi crea un contesto di impilamento:
  l'avviso renderizzato dentro finirebbe sotto l'onboarding). `SceneErrorBoundary`,
  che esisteva solo qui, è stato rimosso: faceva la stessa cosa mostrando meno.
- le tre invarianti arrivate da `main` si chiamavano I23–I25, numeri già usati
  qui dal commercio: sono **I28, I29, I30**. In tutto 30.
- `vercel.json` ha la CSP di questo branch, con `connect-src` sull'host del
  negozio: quella di `main` ha `connect-src 'self'` e fermerebbe il carrello.

Due cose che il merge ha rotto e che sono state corrette nello stesso commit:
`@react-three/drei` (rimossa su `main` perché lì non la importava nessuno, qui
serve a `useGLTF` per i capi in GLB) e l'attivazione del POI col tasto `E`, che
leggeva una chiave di `copy` non più esistente su questo branch.

**`abbb71a` — il logo si carica da `url`.** `BrandWall` legge
`assets.registry['asset-logo-primary'].url` dalla cache condivisa delle texture;
il wordmark tipografico resta la riserva per `url: null`, file mancante o server
che non risponde. Quando arriverà il vettoriale è un cambio di config, non un
lavoro di sviluppo. L'invariante I28 non vieta più `url`: controlla che
l'indirizzo abbia la forma di un percorso dentro `public/`.

**`4a72877` — CSP, incongruenze e un test che non provava più niente.**
`script-src 'self'` da solo blocca WebAssembly, e Chrome in rendering software
ne istanzia uno dentro la pagina: aggiunta `'wasm-unsafe-eval'` (permette solo
WebAssembly, non `eval`). Chiuse tutte le piccole incongruenze aperte dal
2026-10-17 (elenco in `docs/STORIA.md`). `docs/codice/` è dichiarato archivio
del 2026-10-17 nel suo README e dove viene citato.

## 3. Il blocco principale: il cliente

**Niente di quanto segue si sblocca senza il materiale del cliente**, chiesto il
2026-10-16 con il modello Excel `docs/modello-catalogo-INTO.xlsx` e l'import
`npm run catalog:import`. Servono: logo (P1), conferma della tagline (P3), dati
e foto dei capi, testi e immagini del Lookbook, la scelta fra i due allestimenti
(A negozio / B cantiere), e le decisioni su prezzi definitivi e dominio. Da
questo dipendono la Fase 8c, la rimozione del `noindex` e il lancio.

## 4. Lavoro tecnico possibile senza il cliente

Le tre voci che c'erano qui il 28 (merge, caricatore del logo, debito di
documentazione) sono fatte. Resta poco, e niente di urgente:

- **`e2e-phase6` e `e2e-cantiere` sono sensibili alla macchina.** Il 29 la prima
  ha dato 28/30 al primo giro e 30/30 ai due successivi; la seconda ha segnalato
  una texture in più al ciclo 3 dei rimontaggi, sparita alla ripetizione. In
  rendering software le risorse tornano a posto in tempi variabili e il budget
  di attesa è 30 s per ciclo. Se tornasse a comparire in modo stabile, è una
  perdita vera e va cercata; una volta sola no.
- **Prima di unire `sviluppo` in `main`:** `main` pubblica in automatico, quindi
  unire significa pubblicare. Col negozio del cliente, `connect-src` e il token
  nuovo vanno cambiati **nello stesso commit**.
- Il resto è contenuto, non codice.

## 5. Cosa può fare solo l'utente

- **Admin Shopify:** verificare che il canale Headless non abbia scope sui
  clienti (`unauthenticated_*_customers`). Per la 8c serve un token nuovo del
  negozio del cliente.
- **Misure mancanti:** iPhone, PC con scheda dedicata, Honor da rimisurare nel
  negozio A, Android di fascia media (tier low, mai fatto), e il giudizio su
  luminosità e neri. Protocollo in `docs/PERF.md`.
- **Checklist mobile** delle fasi 4 e 5 su un telefono vero.
- **Dominio definitivo:** quando sarà attivo, rivalutare `includeSubDomains`
  sull'HSTS, oggi lasciato fuori di proposito.

## 6. Trappole già pagate, da non ripagare

- **Il contenuto della build**: non esiste più un `.env` tracciato. Su
  `sviluppo` la build risolve `demo` dal nome del branch; `VITE_CONTENT`
  sovrascrive. Le suite e2e vanno eseguite contro una build **dello stesso
  contenuto** che assumono: cantiere e negozio con `demo`, carrello (`e2e-phase8a`)
  e `e2e-phase5` con `into`.
- **Test che leggono al volo**: si aspettano condizioni, mai istanti.
- **Test con coordinate scritte a mano**: smettono di provare quello che dicono
  quando la scena cambia. Le distanze si leggono dal config.
- **Lo switch dell'alias Vercel**: subito dopo un deploy c'è una finestra di
  pochi secondi in cui l'HTML nuovo chiede un chunk non ancora servito. L'error
  boundary mostra "Riprova": è transitorio, si ricarica.
- **Su Windows**: il working tree è CRLF (`core.autocrlf`) mentre git normalizza
  a LF, e gli heredoc della shell mangiano i backslash. Le patch con `\n` o `\t`
  vanno scritte in un file, non in un heredoc.
- **Il riquadro del browser dell'agente**: una scheda lasciata aperta e in
  secondo piano resta su "Caricamento ambiente" per sempre, perché la pagina in
  background non riceve fotogrammi. Non è un guasto del sito: per guardarlo si
  apre una scheda nuova in primo piano, e per verificare davvero si usano le
  suite e2e.

## 7. Come si verifica

```bash
npm ci
npm run lint                  # ESLint: zero problemi
npm run build                 # prebuild: tokens + 30 invarianti
npm run test:nav              # 10/10
npm run test:device           # 18/18
npm run test:commerce         # 11/11, senza rete
npm run test:catalog          # 23/23
npm run test:framing          # 9/9
npm run test:content          # invarianti su into e demo, negozio e cantiere
npm run preview               # poi le suite e2e contro l'indirizzo che stampa
```

Le suite e2e vogliono `CHROMIUM_PATH` (su Windows va bene Chrome di sistema) e
un server già avviato. **Attenzione al numero di porta**: se 4173 è occupata,
`vite preview` ne sceglie un'altra e lo dice; passare alla suite quella giusta.

Ultimo esito noto, 2026-10-29, Chrome di sistema contro una preview locale:

| Suite | Contenuto | Esito |
|---|---|---|
| `e2e-cantiere` | demo | 47/47 |
| `e2e-phase3` | demo | 27/27 |
| `e2e-phase4` | demo | 22/22 |
| `e2e-navfix` | demo | 18/18 |
| `e2e-landscape` | demo | 50/50 |
| `e2e-demo` | demo | 15/15 |
| `e2e-phase6` | demo | 30/30 (28/30 al primo giro) |
| `e2e-phase1b`, `e2e-phase2` | into | nessun problema |
| `e2e-phase8a` | into | 45/45 |
| `e2e-phase5` | into | 34/34 |

`e2e-phase8b` non è stata eseguita: parla col negozio Shopify di sviluppo.
