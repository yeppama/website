# SICUREZZA.md — audit e scelte di hardening

Audit del 2026-10-28 su tutto il repository: codice, script, catena di build, dipendenze e storia
dei commit.

## Il quadro

Il sito è statico e autosufficiente: nessun backend, nessuna richiesta di rete in uscita, nessun
cookie, nessun `localStorage`, nessun analytics, nessun contenuto proveniente da utenti. Le classi
di vulnerabilità che normalmente dominano un'applicazione web — iniezione, autenticazione,
autorizzazione, CSRF, esposizione di segreti — qui non hanno superficie su cui esistere.

Verificato e **non** trovato:

- Nessun segreto, chiave o credenziale, né nei file né nella storia dei commit.
- Nessun sink XSS: niente `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`,
  `document.write`. I testi passano da React (escapato) o da `fillText` su canvas.
- Nessuna risorsa di terze parti: font, immagini e script sono tutti locali (L6 del piano).
- `npm audit`: 0 vulnerabilità note. Lockfile v3, tutte le voci con `integrity` e risolte da
  `registry.npmjs.org`. Nessuno script `install` o `postinstall` nel progetto.
- Nessuna source map pubblicata (`build.sourcemap` non attivo).
- `PLAN.md`, `CONTEXT.md` e `docs/` stanno fuori da `dist/`: non vengono serviti.

## Cosa è stato corretto

### 1. Content-Security-Policy e header (`vercel.json`)

Mancava una CSP. Non c'era un sink XSS da sfruttare, ma la CSP è la rete che resta se un giorno
una dipendenza npm viene compromessa o se entrano contenuti di terze parti: senza, codice iniettato
nel bundle potrebbe contattare qualunque host.

La policy è stretta perché il sito non ha niente di esterno da permettere:

    default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:; font-src 'self';
    connect-src 'self' https://<dominio del negozio>.myshopify.com blob:; media-src 'self';
    worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'none';
    form-action 'none'; frame-ancestors 'self'; upgrade-insecure-requests

- `'unsafe-inline'` è solo in `style-src`, per lo `<style>` di `index.html` che dipinge il fondo
  prima che arrivi il CSS (evita il lampo bianco). Gli script non ne hanno bisogno, e three.js
  compila gli shader via WebGL e non con `eval`: niente `'unsafe-eval'`.
- `'wasm-unsafe-eval'` (aggiunto il 2026-10-29) permette **solo** di compilare WebAssembly, non di
  valutare stringhe come codice: è la keyword nata apposta per separare i due casi. Serve a chi
  cade sul rendering software: con `--use-angle=swiftshader` Chrome istanzia un modulo WebAssembly
  dentro la pagina, e con `script-src 'self'` da solo la console si riempie di violazioni. Trovato
  da `e2e-cantiere` il giorno in cui la preview ha cominciato ad applicare davvero gli header (il
  merge di `main` ha portato `productionHeaders()` sul branch di lavoro): prima la suite girava
  senza CSP e non poteva vederlo. Il rendering software non è un caso di scuola qui —
  `getDeviceProfile()` riconosce SwiftShader e lo manda nel tier `low`.
- `connect-src` elenca l'host esatto del negozio Shopify, non un carattere jolly. **Col negozio
  del cliente va cambiato nello stesso commit del token nuovo**, o il carrello smette di
  funzionare mentre il sito continua a caricare.
- `blob:` in `worker-src` non indebolisce niente, perché un worker creato da blob eredita questa
  stessa policy. Serve se in futuro si caricano modelli con i loader di three (DRACO, KTX2).
- `frame-ancestors 'self'` resta allineato a `X-Frame-Options: SAMEORIGIN`, che era già la scelta
  del progetto. Se il sito non dovrà mai essere incorporato nemmeno dal proprio dominio, si
  stringe a `'none'` e `DENY`.

Aggiunti anche:

| Header | Valore | Perché |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000` | Niente `includeSubDomains` né `preload` finché il dominio definitivo non è attivo: il preload è difficile da revocare e vincolerebbe sottodomini che ancora non esistono. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola la finestra da aperture cross-origin. Il sito non usa popup: costo zero. |
| `Cross-Origin-Resource-Policy` | `same-origin` su `/assets` e `/fonts` | Gli asset del brand non vengono incorporati da altri siti. Non è sul documento, per non interferire con le anteprime social quando arriveranno le immagini reali. |
| `Permissions-Policy` | esteso | Erano negati camera, microfono, geolocalizzazione e pagamenti; ora anche usb, serial, midi, sensori di movimento, cattura schermo, xr e browsing-topics. `clipboard-write` resta permesso: lo usa il pannello benchmark. |

Gli stessi header sono applicati da `npm run preview`, che li rilegge da `vercel.json`
(`vite.config.js`): la CSP si verifica in locale sugli stessi valori della produzione, e le due
copie non possono divergere. Verificato nel browser: la pagina carica senza violazioni.

> `vercel.json` è validato in modo stretto da Vercel e non accetta chiavi fuori schema (per esempio
> un `comment` dentro un header): le motivazioni stanno qui, non nel file.

### 2. `?debug=constructor` rendeva la pagina nera (`src/scene/StoreCanvas.jsx`)

`config.camera.debugPoses?.[key]` accettava qualunque chiave, comprese quelle ereditate da
`Object.prototype`. Con `?debug=constructor` (o `__proto__`, `toString`, `valueOf`) l'accesso
restituiva un valore truthy e privo di `position`: la camera moriva su `new Vector3(...undefined)`
e — non essendoci un error boundary — React smontava l'intero albero. Pagina nera, nessun
messaggio.

Non è sfruttabile contro altri: è un denial of service che colpisce solo chi apre quel link. È
però un guasto reale raggiungibile da URL. Ora la chiave si cerca con `Object.hasOwn` e la posa
risolta viene comunque validata nella forma. Verificato nel browser: `?debug=constructor` carica
normalmente e `?debug=top` continua a dare la vista dall'alto.

Nella stessa riga di ragionamento, `?fps=Infinity` superava il controllo `Number(...) > 0` e
disattivava il limitatore di fotogrammi. Ora serve un numero finito.

### 3. Error boundary (`src/ui/fallback/ErrorBoundary.jsx`)

Non ce n'era nessuno. Qualunque errore lanciato nel render lasciava una pagina nera: il chunk di
three.js che non arriva su rete mobile, `new WebGLRenderer` che fallisce anche quando il probe
WebGL2 era passato, un campo mancante nei contenuti reali. Ora ce ne sono due — uno attorno alla
sola scena 3D (HUD e menu restano vivi, "Riprova" rimonta il Canvas) e uno attorno a tutta
l'applicazione — e dopo due tentativi falliti smettono di offrire "Riprova", che ripresenterebbe
soltanto lo stesso errore.

### 4. Catena di build (`vite.config.js`)

`execSync('git rev-parse --short HEAD')` passa da una shell, e su Windows `cmd.exe` cerca un
`git.bat` nella cartella corrente prima di quello nel PATH. Ora è `execFileSync` con argomenti
separati: nessuna shell di mezzo. Il rischio era remoto — serve buildare un repository non fidato —
e il costo del fix è nullo.

Rimossa la dipendenza `@react-three/drei`: non era importata da nessun file. Trascinava un albero
ampio di pacchetti transitivi, cioè superficie di supply chain per niente.

### 5. Suite e2e (`scripts/e2e/launchOptions.mjs`)

Le suite lanciavano Chromium con `--no-sandbox` sempre. Serve nei container, dove la sandbox
non si apre, ma in locale toglie una barriera fra la pagina sotto test e la macchina. Ora si
attiva solo con `CI=1` o `CHROMIUM_NO_SANDBOX=1`, e l'URL di base passato come argomento viene
validato: le suite girano solo contro un server locale, mai contro un indirizzo remoto. Lo stesso
modulo tiene il percorso dell'eseguibile, sovrascrivibile con `CHROMIUM_PATH`.

> **Completata il 2026-10-29.** Il 28 il modulo era stato applicato a sei script su quattordici:
> `e2e-cantiere`, `e2e-demo`, `e2e-landscape`, `e2e-navfix`, `e2e-phase8a`, `e2e-phase8b` e i due
> `shots-*` erano rimasti col blocco scritto a mano, cioè senza sandbox e senza controllo
> sull'indirizzo — fra questi le due suite che si eseguono più spesso. Ora li usano tutti, e
> `shots-cantiere` smette di ignorare `CHROMIUM_PATH`, che aveva il percorso del container scritto
> dentro. Rieseguite dopo il cambio, con la sandbox attiva: cantiere 47/47, demo 15/15,
> landscape 50/50, navfix 18/18, phase8a 50/50, phase8b 11/12 (la cassa vuole `STORE_PASSWORD`).

## Dipendenze (passata del 2026-10-29)

`npm audit` segnalava **2 vulnerabilità moderate**, tutte e due la stessa: `uuid < 11.1.1`,
["Missing buffer bounds check in v3/v5/v6 when buf is provided"](https://github.com/advisories/GHSA-w5hq-g745-h8pq),
tirato dentro da `exceljs`. L'esposizione reale era nulla — `exceljs` è una **devDependency** (serve a
`npm run catalog:template` e `catalog:import`, non finisce nel bundle del sito) e usa solo `v4`, che
l'avviso non tocca — ma un avviso che resta acceso smette di essere letto.

La correzione che npm proponeva era retrocedere `exceljs` alla 3.4.0, un cambio maggiore su una
libreria che legge i file del cliente. Al suo posto, un `overrides` in `package.json`:

    "overrides": { "uuid": "^11.1.1" }

`exceljs@4.4.0` continua a funzionare: oltre a `npm run test:catalog` (23/23), è stato provato un
giro completo di scrittura e rilettura di un `.xlsx` e la rigenerazione del modello del catalogo.
`npm audit`: 0 vulnerabilità.

Aggiornamenti dentro i vincoli già dichiarati (`package.json` non cambia, si muove solo il lock):
`vite` 8.3.4 → 8.3.5, `zustand` 5.0.15 → 5.0.16, `playwright-core` 1.57.0 → 1.64.1.

**ESLint 10 non è stato adottato, e non per pigrizia:** due dei tre plugin non lo dichiarano
ancora. `eslint-plugin-jsx-a11y@6.10.2` (l'ultima) accetta come peer fino a `^9`, e
`eslint-plugin-react@7.37.5` (l'ultima) fino a `^9.7`; solo `eslint-plugin-react-hooks@7.1.1` arriva
a `^10`. Installarlo lo stesso vuol dire `--legacy-peer-deps`, cioè far girare il linter su una
combinazione che i suoi plugin non garantiscono: lo stesso genere di deroga a un controllo che
questa passata ha tolto di mezzo (i sette `eslint-disable` senza ESLint installato). Si rivaluta
quando quei due plugin pubblicano il peer su `^10`.

## Checklist di lancio, 20 punti (2026-10-29)

Lista passata dall'utente, del tipo che gira per le app full-stack. **Dodici punti su venti
presuppongono una parte che questo progetto non ha**: non c'è un nostro server, né database, né
registrazione, né sessioni, né password, né caricamento di file. Il sito è statico e il pagamento
è di Shopify, che il visitatore raggiunge sul **suo** dominio. Dirli "fatti" sarebbe falso tanto
quanto dirli "mancanti": qui c'è cosa è stato guardato e cosa si è visto.

| # | Punto | Esito |
|---|---|---|
| 1 | Nascondere le chiavi API | **A posto.** L'unica credenziale nel codice è il token Storefront di Shopify, pubblico per costruzione (lo legge il browser di chiunque: `docs/PLAN-8.md`). Nessun token privato nel sorgente. Il token privato dell'amministrazione non è mai entrato. |
| 2 | Ripulire i segreti da git | **Verificato, niente da ripulire.** L'unico file sospetto mai committato è il `.env` del commit `6a206b1`: riletto dalla storia, conteneva `VITE_CONTENT=demo` e due righe di commento. Cercati in tutti i 103 commit i prefissi delle credenziali vere (Shopify privato, AWS, Stripe, GitHub, Slack, SendGrid, chiavi private): **nessuna occorrenza**. |
| 3 | Usare la chiave pubblica del database | **Equivalente già in uso.** Il ruolo del database qui lo fa Shopify, e il sito parla con la Storefront API, che è l'interfaccia pubblica. L'Admin API non viene mai toccata dal browser. |
| 4 | Attivare la RLS | **Verificato e sistemato il 2026-10-30.** Il permesso per riga qui sono gli *scope* del canale Headless. Dei 16 disponibili ne erano attivi **10**, e fra questi `unauthenticated_read_customers` e `unauthenticated_write_customers`, che il sito non usa: non ha login, registrazione né storico ordini. Il token è pubblico, quindi quei due permessi sono di chiunque legga il sorgente della pagina. Tutti e sei tolti il 2026-10-30 dall'amministrazione; restano i quattro che il sito usa. Verificato in tre modi, perché nessuno dei tre copre tutto: `npm run check:scopes` (interroga il token: i cinque sondabili spenti), l'amministrazione riletta a schermo (`write_customers` e `write_checkouts`, che una sonda non può toccare senza scrivere), ed `e2e-phase8b` dal vivo, 11/12 come prima della modifica — l'unica rossa resta la cassa, che vuole `STORE_PASSWORD`. In CI il giro completo delle dieci suite col browser è verde (13m10s). Alla 8c la stessa lista va rifatta sul negozio del cliente: `PLAN-8.md`. |
| 5 | Cifrare i dati sensibili | **Niente da cifrare.** Il sito non conserva dati di nessuno: niente database, niente cookie, e in `localStorage` solo l'id del carrello e il modo di controllo scelto da chi naviga. |
| 6 | Autenticazione lato server | **Non esiste un accesso.** Nessuna registrazione, nessun profilo. L'unica autenticazione è quella della cassa, che è di Shopify. |
| 7 | Bloccare l'accesso ai record | **Non ci sono record nostri, ma la frase precedente era troppo generosa.** Quello che il *sito* legge è catalogo, prezzi e pagine legali. Quello che il *token* poteva fare era di più: col `write_customers` attivo (trovato e tolto il 2026-10-30, vedi riga 4) chiunque avesse il token poteva creare account e far partire email di recupero password dal negozio. Leggere un cliente richiede comunque un `customerAccessToken`, cioè un accesso riuscito: non era una lista di clienti esposta. Resta superficie che il sito non usa. |
| 8 | Impedire la manomissione dei campi | **A posto, ed è il punto che conta di più qui.** Il prezzo non viene mai da `storeConfig`: col commercio attivo lo dà solo il fornitore, e se non risponde il capo è "non disponibile" (`useShownPrice`). La quantità è limitata da `commerce.maxQuantity` sia nell'interfaccia sia nello store. Il totale lo calcola Shopify. Il `checkoutUrl` è accettato solo se è `https:` **e** l'host è esattamente quello del negozio: un carrello manomesso non può diventare una navigazione altrove. |
| 9 | Cookie di sessione sicuri | **Non esistono cookie.** Verificato a ogni giro da `e2e-phase8a`: `document.cookie` vuoto e in `localStorage` solo le chiavi tecniche dichiarate. |
| 10 | Hash delle password | **Non esistono password.** |
| 11 | Limite di frequenza sull'accesso | **Non esiste un accesso.** Sulla Storefront API il limite lo applica Shopify. |
| 12 | Protezione dai bot | **Nessun modulo nostro da proteggere.** La cassa, cioè l'unico punto che vale la pena attaccare, è di Shopify e ha le sue difese. |
| 13 | Query parametrizzate | **A posto.** Nessun SQL. Le richieste GraphQL passano i valori in `variables`, mai concatenati nella stringa della query. |
| 14 | Validare ogni ingresso | **A posto.** Gli interruttori da query string sono cercati con `Object.hasOwn` (`constructor`, `__proto__` sono chiavi valide e truthy), i numeri con `Number.isFinite` (`?fps=Infinity` spegneva il limitatore), `checkoutUrl` è validato prima di diventare una navigazione, e 30 invarianti fermano la build su un config incoerente. |
| 15 | Ripulire il contenuto dell'utente | **A posto.** React escapa tutto; l'unico `dangerouslySetInnerHTML` è quello delle pagine legali, e il testo passa da `sanitizeHtml`, che ricostruisce ogni elemento da una lista di tag ammessi e scarta tutti gli attributi tranne `href` con protocollo verificato. |
| 16 | Limitare il caricamento di file | **Non si carica niente.** Non esiste un modulo di upload. |
| 17 | Sfoltire le risposte API | **A posto.** Le query GraphQL chiedono per nome i campi che servono (handle, titolo, varianti, prezzo, opzioni): non esiste un `SELECT *` da sfoltire. |
| 18 | Header di sicurezza | **Fatto il 2026-10-28**, vedi sopra: CSP, HSTS, COOP, CORP, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy, verificati sul dominio pubblico. |
| 19 | Forzare HTTPS | **Fatto.** Vercel serve solo in HTTPS e reindirizza; in più `Strict-Transport-Security` e `upgrade-insecure-requests` nella CSP. `includeSubDomains` resta fuori finché non c'è il dominio definitivo, di proposito. |
| 20 | Scansionare le dipendenze | **Fatto il 2026-10-29**, vedi "Dipendenze": `npm audit` a zero, e CI lo riesegue a ogni push fermandosi su alto e critico. |

**L'unica cosa che mancava davvero, ed è stata aggiunta:** niente impediva a un segreto di *entrare*
domani. `npm run scan:secrets` (`scripts/scan-secrets.mjs`) cerca nei file tracciati i prefissi delle
credenziali vere e i file di ambiente, gira in CI prima della build, e sa anche dire di no: provato
su un file con un finto token Shopify, una finta chiave AWS e una finta chiave privata, li trova
tutti e tre. Non cerca stringhe ad alta entropia di proposito — segnalerebbe il token Storefront a
ogni giro, e un controllo che grida sempre viene spento.

## Rimasto aperto, per scelta

- **I flag di debug restano attivi in produzione.** `?perf=1` e `?bench=1` servono a misurare
  dispositivi veri sul deploy (`docs/PERF.md`), e `?debug=` è il modo in cui le suite e2e girano
  contro una build di produzione. I globali che espongono — `window.__scene`, `__gl`, `__player`,
  `__stores` — sono già raggiungibili da DevTools su un bundle pubblico e non contengono dati
  sensibili: stato della scena, camera, posizione del player. Non è una vulnerabilità, è una
  superficie da conoscere. Se un giorno non servisse più, si spegne con
  `import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === '1'` e il codice sparisce dal
  bundle.
- **Dati del dispositivo.** `getDeviceProfile()` legge renderer GPU, core, memoria e tipo di
  puntatore per scegliere il tier. Niente esce dal browser: non esistono `fetch`, `sendBeacon`,
  cookie o storage. Se un giorno si aggiunge un analytics questa riga va rivista, perché il
  renderer GPU è un ottimo elemento di fingerprinting.
- **Nome ed email dell'autore** sono pubblici nei metadati dei commit, come in ogni repository
  pubblico. Non è un problema di sicurezza, ma vale saperlo.
