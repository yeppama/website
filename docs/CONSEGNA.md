# CONSEGNA — stato e cosa resta, al 2026-10-29

Scritto per una sessione nuova che riprende il lavoro da zero. Si legge dopo
`CONTEXT.md`, che resta la fonte dello stato corrente; qui c'è cosa è successo il
2026-10-28, cosa è rimasto aperto e in che ordine conviene affrontarlo.

## 1. Dove sta tutto

| | |
|---|---|
| `main` | Produzione su Vercel, pubblica, `noindex`. Contenuto `into` (segnaposto dichiarati), acquisti spenti. Ultimo commit `7f87699`. |
| `sviluppo` | **Branch di lavoro.** Fase 8a/8b, demo con foto, allestimento cantiere. Ultimo commit `dffb138`. Ogni push crea un'anteprima Vercel. |
| tag `archivio-docs-ristrutturati` | Due commit di riordino documenti del 2026-10-16, mai uniti. Il branch è stato cancellato, il tag li tiene raggiungibili. |

GitHub Pages è **spento** dal 2026-10-28 (sorgente su None). Pubblicava una copia
rotta del sito, senza nessuno degli header di sicurezza. Il workflow
`pages build and deployment` non parte più: verificato su un push vero.

## 2. Cosa è cambiato il 2026-10-28

**Su `main`** (passata di sicurezza, PR #1, poi due commit): CSP e header completi
in `vercel.json` (HSTS, COOP, CORP sugli asset, Permissions-Policy estesa),
riletti da `npm run preview`; `?debug=<chiave di Object.prototype>` non annerisce
più la pagina; due error boundary; `execFileSync` al posto di `execSync`;
`@react-three/drei` rimossa perché inutilizzata; `--no-sandbox` solo in CI e
bersaglio delle suite e2e validato come locale; ESLint con regole sugli hook e
accessibilità; invarianti di config come passo di `prebuild` (I23–I25); CI su
GitHub Actions. Dettaglio e motivazioni: `docs/SICUREZZA.md` (su `main`).

**Su `sviluppo`** (audit dell'e-commerce, quattro commit):

- `73f106d` — `.env` tolto dal tracking. Conteneva `VITE_CONTENT=demo`, nessun
  segreto, ma era in un repository pubblico. Resta nella storia al commit
  `6a206b1`: la rimozione non annulla l'esposizione.
- `6a23399` — il contenuto `demo` ora si accende dal branch (`vite.config.js`)
  invece che dal `.env` sparito, altrimenti le anteprime tornavano ai segnaposto.
- `344ebb4` — correzioni dell'audit: CSP portata su questo branch con
  `connect-src` allargato all'host esatto del negozio; gli interruttori da query
  string (`?commerce=`, `?debug&country=`, `?mockerror=`) spenti nelle build di
  produzione; `checkoutUrl` validato prima di diventare una navigazione;
  `Object.hasOwn` negli allestimenti; formule neutralizzate nel CSV del catalogo.
- `dffb138` + `3301916` — due test resi affidabili.

**Esito dell'audit e-commerce:** nessun problema critico né alto. Il sanitizzatore
delle pagine legali (`src/lib/sanitizeHtml.js`) regge: ricostruisce ogni elemento
da una lista di tag ammessi e scarta tutti gli attributi tranne `href`. Il token
Storefront in `storeConfig.js` è pubblico per costruzione e resta dov'è.

## 3. Il blocco principale: il cliente

**Niente di quanto segue si sblocca senza il materiale del cliente**, chiesto il
2026-10-16 con il modello Excel `docs/modello-catalogo-INTO.xlsx` e l'import
`npm run catalog:import`. Servono: logo vettoriale (P1), conferma della tagline
(P3), dati e foto dei capi, testi e immagini del Lookbook, la scelta fra i due
allestimenti (A negozio / B cantiere), e le decisioni su prezzi definitivi e
dominio. Da questo dipendono la Fase 8c, la rimozione del `noindex` e il lancio.

## 4. Lavoro tecnico possibile senza il cliente, in ordine

### 4.1 Unire `main` dentro `sviluppo` — il primo da fare

I due rami non si uniscono più da soli: **11 file in conflitto**, tutti toccati
dalla passata di sicurezza del 28 su `main`.

```
.gitignore · CLAUDE.md · CONTEXT.md · README.md · package.json · package-lock.json
src/App.jsx · src/config/validateStoreConfig.js · src/scene/player/PlayerController.jsx
src/ui/fallback/ContextLostOverlay.jsx · src/ui/hud/Minimap.jsx
```

Cosa c'è sui due lati, per orientarsi:

- `src/App.jsx` — su `main` l'error boundary attorno alla scena (fuori dal
  contenitore del canvas, che ha uno z-index e creerebbe un contesto di
  impilamento) e l'azzeramento di `fading`/`commands` al rimontaggio.
- `src/config/validateStoreConfig.js` — **attenzione alla numerazione**: `main`
  ha aggiunto I23 (asset con `url` senza loader), I24 (campi dei prodotti) e I25
  (campi del lookbook); `sviluppo` ha già una I24 sua, per il commercio. Vanno
  rinumerate, non sovrascritte.
- `src/scene/player/PlayerController.jsx` — su `main` il gesto touch che restava
  appeso, `gpuLost` in `blocked()`, un solo proprietario del fov durante il
  Focus, attivazione del POI col tasto `E`.
- `package.json` — su `main` ESLint e gli script `lint` / `validate:config`;
  su `sviluppo` gli script del catalogo e del commercio. Servono entrambi.
- `.gitignore`, `CLAUDE.md`, `CONTEXT.md`, `README.md` — testi, da fondere a mano.

**Direzione: `main` → `sviluppo`, non il contrario.** Non pubblica niente, lascia
la produzione stabile, e rende il merge finale verso `main` una formalità quando
arriveranno i contenuti. Ogni giorno che passa i conflitti crescono.

### 4.2 Caricatore del logo in `BrandWall`

Oggi `src/scene/environment/BrandWall.jsx` usa il wordmark tipografico solo
quando `logo.url` è `null`; valorizzando `url` l'insegna **sparirebbe in
silenzio**, perché nessuno carica texture da url. L'invariante I23 (su `main`)
fa fallire la build invece di far sparire la parete, ma è una guardia, non una
soluzione. Implementando il caricamento ora, quando arriva il vettoriale è un
cambio di config e non un lavoro di sviluppo.

### 4.3 Debito di documentazione e piccole incongruenze

`CONTEXT.md` dichiara `docs/codice/` superato, e `docs/STORIA.md` tiene l'elenco
delle piccole incongruenze trovate scrivendolo. Entrambi si chiudono senza
dipendere da nessuno.

## 5. Cosa può fare solo l'utente

- **Admin Shopify:** verificare che il canale Headless non abbia scope sui
  clienti (`unauthenticated_*_customers`). Per la 8c serve un token nuovo del
  negozio del cliente, e la CSP va aggiornata col suo dominio **nello stesso
  commit**, altrimenti il carrello smette di funzionare in silenzio.
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
  contenuto** che assumono, o i confronti falliscono su valori dell'altro
  catalogo (`e2e-cantiere.mjs` ora dichiara in prima riga quale usa).
- **Test che leggono al volo**: `e2e-phase8a` falliva a intermittenza perché
  leggeva lo stato mentre il catalogo ritentava dopo un errore. Si aspettano
  condizioni, mai istanti — vale ovunque, non solo lì.
- **Lo switch dell'alias Vercel**: subito dopo un deploy c'è una finestra di
  pochi secondi in cui l'HTML nuovo chiede un chunk che non è ancora servito.
  L'import dinamico fallisce e l'error boundary mostra "Riprova". È transitorio,
  non è un guasto del build: ricaricare.
- **Su Windows**: il working tree è CRLF (`core.autocrlf`) mentre git normalizza
  a LF, e gli heredoc della shell mangiano i backslash delle regex. Le patch con
  `\n` o `\t` vanno scritte in un file, non in un heredoc.

## 7. Come si verifica

```bash
npm ci
npm run build                 # prebuild: tokens + invarianti
npm run test:nav              # 10/10
npm run test:device           # 18/18
npm run test:content
npm run test:commerce         # 11/11, senza rete
npm run test:catalog          # 23/23
npm run preview               # poi le suite e2e contro http://localhost:4173
```

Le suite e2e vogliono `CHROMIUM_PATH` (su Windows va bene Chrome di sistema) e
un server già avviato. Quelle del carrello presuppongono il contenuto `into`
(acquisti spenti di default): `VITE_CONTENT=into npm run build` prima.

Ultimo esito noto, 2026-10-28, Chrome vero contro una preview locale:
`e2e-phase8a` 45/45 (tre volte), `e2e-cantiere` 47/47 (due volte).
