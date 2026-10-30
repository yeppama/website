# CONSEGNA — stato e cosa resta, al 2026-10-30

Scritto per una sessione nuova che riprende il lavoro da zero. Si legge dopo
`CONTEXT.md`, che resta la fonte dello stato corrente; qui c'è cosa è successo, cosa è
rimasto aperto e in che ordine conviene affrontarlo.

## 1. Dove sta tutto

| | |
|---|---|
| `main` | Produzione su Vercel, pubblica, `noindex`. Contenuto `into` (segnaposto dichiarati), acquisti spenti. Ferma a `7f87699` del 2026-10-28. **Non ha niente del lavoro del 29 e del 30.** |
| `sviluppo` | **Branch di lavoro.** Ultimo commit `f5abc2f`, già su GitHub. **73 commit davanti a `main`.** Ogni push crea un'anteprima Vercel e fa girare la CI. |
| tag `archivio-docs-ristrutturati` | Due commit di riordino documenti del 2026-10-16, mai uniti. Il branch è stato cancellato, il tag li tiene raggiungibili. |

GitHub Pages è spento dal 2026-10-28. La CI gira su GitHub Actions a ogni push:
lint, invarianti, build, suite Node e `npm audit` (`ci.yml`), e **le suite e2e** in un
workflow a parte (`e2e.yml`) che salta i push di soli documenti.

## 2. Le regole che non si deducono dal codice

Tre, e tutte e tre sono state imparate pagando:

1. **Una fase alla volta.** Si avanza solo col comando esplicito
   `Approvato, procedi alla fase X`. A fine fase: build, verifica nel browser, report che
   distingue eseguito / non eseguito / bloccato, poi stop.
2. **Un negozio alla volta** (`PLAN-8.md` §4-bis, scritta il 2026-10-30). Fino al
   prototipo completo il negozio di riferimento è `into-industries-dev`; quello del
   cliente è un'annotazione, non un lavoro aperto. Il passaggio è la 8c e vale **un
   commit solo**: dominio, token e `connect-src` della CSP insieme.
3. **Entrambi gli allestimenti restano accessibili** (requisito dell'utente): negozio A
   senza parametri, cantiere con `?allestimento=cantiere`. Ogni verifica si fa su tutti
   e due — è il motivo per cui il giro completo delle suite dura sedici minuti.

## 3. Cosa è cambiato il 2026-10-29 e il 2026-10-30

Diciotto commit. I quattro che cambiano come si lavora:

- **`ec69125` — `main` unito in `sviluppo`.** 13 file in conflitto, tutti della passata
  di sicurezza del 28. Adesso i due rami hanno gli stessi header, le stesse guardie e
  gli stessi controlli. Le invarianti di `main` (I23–I25) sono state rinumerate
  **I28–I30**: 30 in tutto.
- **`8d99ba9` — le suite e2e girano in CI**, e `npm run e2e` le esegue in locale in un
  comando solo (build col contenuto giusto, server sulla porta libera, suite,
  spegnimento). Fuori dalla CI resta `e2e-phase6`, che misura prestazioni: su una
  macchina condivisa direbbe più della macchina che del codice.
- **`265f031` — `npm run scan:secrets`**, in CI prima della build. Cerca i prefissi
  delle credenziali vere, non stringhe ad alta entropia: il token Storefront è pubblico
  per costruzione e un controllo che grida sempre viene spento.
- **`f5abc2f` — un negozio alla volta**, con la correzione del piano che era stato
  scritto correndo avanti di due fasi.

Il resto, in breve: il logo si carica da `url` col wordmark come riserva (`abbb71a`);
CSP corretta per il rendering software (`4a72877`); `npm audit` a zero con un override
su `uuid` invece di retrocedere `exceljs` (`3161939`); la sandbox del browser estesa da
sei a quattordici script (`795c843`); pagine legali raggiungibili dal carrello, che
chiude la 8d per la parte di codice (`f315b17`); nome accessibile per la scena 3D e
landmark `main` (`4a0f4a3`); pagina 404 del marchio (`4fb25aa`); licenze OFL accanto ai
caratteri (`567f991`).

## 4. Documenti nuovi, e quando servono

| Documento | Quando aprirlo |
|---|---|
| [`PER-L-UTENTE.md`](PER-L-UTENTE.md) | **Per primo, se c'è da chiedere qualcosa all'utente.** Guida passo passo di tutto quello che non si può fare senza di lui, con cosa sblocca ciascuna voce |
| [`LANCIO.md`](LANCIO.md) | Cosa manca prima di vendere: SEO, condivisione, legale. Due checklist verificate riga per riga |
| [`PIANO-INGLESE.md`](PIANO-INGLESE.md) | Se si parla della seconda lingua (Fase 8f). Quattro decisioni, con una raccomandazione ciascuna. Non è lavoro avviato |
| [`SICUREZZA.md`](SICUREZZA.md) | Header, CSP, dipendenze, e la checklist di sicurezza verificata punto per punto |

## 5. Lavoro tecnico possibile senza nessuno

La lista è corta, ed è corta perché è stata consumata.

- **`e2e-phase6` e `e2e-cantiere` sono sensibili alla macchina.** Il 29 la prima ha dato
  28/30 al primo giro e 30/30 ai due successivi; la seconda ha segnalato una texture in
  più al ciclo 3 dei rimontaggi, sparita alla ripetizione. Se tornasse stabile è una
  perdita vera; una volta sola no.
- **Peso del bundle**: il chunk della scena è 1,08 MB (293 kB gzip), sopra la soglia di
  Vite. Sconsigliato finché non ci sono misure su telefoni veri: si ottimizzerebbe alla
  cieca, e il progetto ha già pagato un `manualChunks` che annullava il lazy import.
- ~~**Un push di soli documenti fa girare 16 minuti di suite e2e.**~~ Fatto il
  2026-10-30: le suite col browser hanno il loro workflow
  (`.github/workflows/e2e.yml`) con `paths-ignore` su `**/*.md` e `docs/**`, perché
  GitHub filtra i percorsi per workflow e non per job. `ci.yml` continua a girare su
  tutto. Da verificare al primo push di solo codice: che il workflow `e2e` parta
  davvero.
- **ESLint 10**: bloccato dai plugin, non da noi (jsx-a11y arriva a `^9`, plugin-react a
  `^9.7`). Si rivaluta quando pubblicano il peer su `^10`.

## 6. Deciso, e da non rimettere in discussione

- **Repository pubblico e senza licenza**, scelta consapevole dell'utente (2026-10-29).
- **Niente token Vercel** (2026-10-30). Da Windows anteprime e produzione si aprono
  senza login e gli indirizzi dei deploy si leggono con `gh`: il token aggiungerebbe
  solo le cose interne a Vercel (variabili d'ambiente, impostazioni, domini, log,
  rilanciare un deploy), e non esiste in versione di sola lettura. Si rivaluta se
  servirà una di quelle, non prima.
- **Analytics: sì, Vercel Analytics**, perché non usa cookie e non impone il banner. Da
  installare col suo contorno: CSP, informativa, DPA. Non urgente, ma deciso.
- **Inglese dopo il lancio** (8f), con il piano già scritto.

## 7. Bloccato, e da chi

| Cosa | Chi | Sblocca |
|---|---|---|
| Catalogo compilato + foto dei capi | cliente | **8c**, il negozio vero |
| Logo vettoriale (P1) | cliente | Insegna 3D, favicon, immagine di anteprima |
| Testi e immagini del Lookbook, conferma tagline (P3) | cliente | Contenuto reale |
| **Scelta fra allestimento A e B** | cliente | Dimezza la superficie da verificare. In sospeso dal 2026-10-19 |
| Misure su iPhone, Honor, PC con GPU dedicata, **Android di fascia media** | utente | Fase 3 del cantiere. L'Android non è **mai** stato misurato ed è il tier che decide se il sito è usabile sui telefoni più diffusi |
| ~~Scope del canale Headless su `into-industries-dev`~~ | — | **Fatto il 2026-10-30**: i sei non usati tolti dall'amministrazione, `npm run check:scopes` verde, `e2e-phase8b` 11/12 come prima |
| Testi legali e indirizzo del venditore | venditore | Il lancio (8e), **non la 8d** |
| — | — | **La Parte 1 di `PER-L-UTENTE.md` è chiusa.** `gh` CLI, allowlist dei permessi e `STORE_PASSWORD` fatti il 2026-10-30; il token Vercel non si fa (§6) |

## 8. Trappole già pagate, da non ripagare

- **Il contenuto della build**: su `sviluppo` la build risolve `demo` dal nome del
  branch; `VITE_CONTENT` sovrascrive. Una suite eseguita contro la build dell'altro
  contenuto fallisce su valori che non c'entrano. `npm run e2e` ci pensa da sé.
- **La porta della preview**: se 4173 è occupata `vite preview` ne prende un'altra. Il
  codice colore che vite infila fra `localhost:` e le cifre contiene un numero: chi la
  legge con una regex ingenua apre `localhost:1`.
- **Test con coordinate scritte a mano**: smettono di provare quello che dicono quando
  la scena cambia, restando verdi o diventando rossi senza spiegare. Le distanze si
  leggono dal config.
- **Shopify non segnala le traduzioni mancanti**: risponde nella lingua predefinita
  senza errore. Vale per la 8f.
- **Su Windows**: il working tree è CRLF mentre git normalizza a LF, e gli heredoc della
  shell mangiano i backslash. Le patch con `\n` o `\t` vanno scritte in un file.
  `npm ci` può fallire su un binario nativo in uso: `npm install` riconcilia sul posto.
- **Il riquadro del browser dell'agente**: una scheda in secondo piano resta su
  "Caricamento ambiente" per sempre, perché la pagina non riceve fotogrammi. Per
  verificare davvero si usano le suite.
- **Che una verifica si possa fare non vuol dire che sia il momento di farla.** È il
  motivo per cui esiste la regola del negozio unico.

## 9. Come si verifica

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
npm run scan:secrets          # credenziali nei file tracciati
npm run e2e                   # tutte le suite col browser, dall'inizio alla fine
```

`npm run e2e` fa tutto da sé. Varianti: `-- --only cantiere`, `-- --content into`,
`-- --out e2e-out` per tenere gli screenshot.

Ultimo esito noto, 2026-10-30: **CI #14 verde**, job e2e compreso — tutte e dieci le
suite col browser su un runner GitHub, 16 minuti e 16 secondi. In locale, stesso
risultato: 10 suite su 10.

Fuori da quel giro, da eseguire a mano:

- `e2e-phase6` (prestazioni): `node scripts/e2e/e2e-phase6.mjs <indirizzo> <cartella>`
- `e2e-phase8b` (dal vivo su Shopify): **12 su 12 il 2026-10-30**, cassa compresa, con
  `STORE_PASSWORD` nell'ambiente. Senza quella variabile sono 11 su 12 e la suite
  dichiara la cassa non verificata invece di fingere.
- `npm run check:scopes` (dal vivo su Shopify): cosa può fare il token pubblico. Rosso
  il 2026-10-30 con cinque permessi attivi e non usati, `read_customers` compreso. Si
  rilancia dopo aver tolto le caselle, e di nuovo alla 8c sul negozio del cliente.
