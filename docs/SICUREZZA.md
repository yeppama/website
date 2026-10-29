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
