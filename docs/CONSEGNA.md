# CONSEGNA — stato e cosa resta, al 2026-11-05

Scritto per una sessione nuova che riprende il lavoro da zero. Si legge dopo
`CONTEXT.md`, che resta la fonte dello stato corrente; qui c'è cosa è successo, cosa è
rimasto aperto e in che ordine conviene affrontarlo.

## 1. Dove sta tutto

| | |
|---|---|
| `main` | Produzione su Vercel, pubblica, `noindex`. Contenuto `into` (segnaposto dichiarati), acquisti spenti. Ferma a `7f87699` del 2026-10-28. **Non ha niente del lavoro del 29 e del 30, né dell'audit del 3 novembre.** |
| `sviluppo` | **Branch di lavoro**, tutto su GitHub. **Oltre cento commit davanti a `main`** (115 il 2026-11-05) — il numero esatto è `git rev-list --count main..sviluppo`, e invecchia a ogni push. Ogni push crea un'anteprima Vercel e fa girare la CI. |
| tag `archivio-docs-ristrutturati` | Due commit di riordino documenti del 2026-10-16, mai uniti. Il branch è stato cancellato, il tag li tiene raggiungibili. |

GitHub Pages è spento dal 2026-10-28. La CI gira su GitHub Actions a ogni push:
lint, invarianti, build, suite Node e `npm audit` (`ci.yml`), e **le suite e2e** in un
workflow a parte (`e2e.yml`) che salta i push di soli documenti. Dal 2026-11-03 c'è un
terzo workflow, `e2e-shopify.yml`: la prova dal vivo del carrello, che ha bisogno della
rete verso Shopify. Parte a mano, su ogni PR verso `main` e sui push che toccano il
carrello.

Su GitHub c'è ancora `audit/correzioni-2026-11`, il branch della PR #2. Verificato il
2026-11-05: non ha nessun commit fuori da `sviluppo`, quindi è un residuo e si può
cancellare (`git push origin --delete audit/correzioni-2026-11`). Non ci si lavora.

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

## 3-quater. Il 2026-11-03 — l'audit del 2 novembre, chiuso

Nove fasi di correzioni al codice, nate dall'audit di UI/UX, legale e sicurezza del 2
novembre: lavorate sul branch `audit/correzioni-2026-11` e unite in `sviluppo` con la
PR #2 (merge `e91ad35`). **Questo paragrafo supera il "da dove ripartire" di §3-ter,**
scritto il giorno prima, che diceva che il prossimo passo non era tecnico.

- **Fasi 1–9:** sicurezza e cassa (`8b99e04`), contrasto dei testi (`886b615`), focus e
  ARIA (`2e6a19e`), navigazione (`1b3c818`), indietro dopo una ricarica (`52f2703`),
  modalità testo senza 3D (`ed2b42c`), carrello e avviso in uscita col carrello pieno
  (`97529b1`), rafforzamenti di sicurezza e axe a zero violazioni (`4fe53c0`,
  `c6408c9`), `AUDIT-CARRELLO.md` generato dal codice (`628984f`).
- **`80e347b` — gli exit code delle suite e2e.** Otto su undici restavano verdi anche
  fallendo: è il difetto più grave trovato dall'audit, perché rendeva bugiardo ogni
  esito letto prima di quella data.
- **`d599863`, `be10a13` — `e2e-shopify.yml`**: la prova dal vivo del carrello su un
  runner GitHub, che ha la rete verso Shopify. **13 su 13** sul negozio di sviluppo,
  cassa compresa, con la password della vetrina da segreto.
- **Ultimo giro:** lint e build puliti, suite Node tutte verdi, e2e **11/11** su A e su
  B, axe **0 violazioni** su 37 schermate, `e2e-shopify` 13/13 dal vivo. Dopo il merge
  in `sviluppo`, `CI`, `e2e` ed `e2e-shopify` di nuovo verdi.
- **Non eseguito, e dichiarato tale:** tutto quello che ha bisogno di un telefono vero —
  indietro del browser su Chrome Android e Safari iOS, avviso in uscita su telefono,
  modalità testo su un telefono lento, un lettore di schermo vero (VoiceOver o
  TalkBack), e N11, l'inquadratura in verticale, che va giudicata guardandola.
- **Il modulo cliente è l'ultimo da inserire,** e nessuna di quelle voci si chiude senza
  di lui: EAA (D1), recesso UE su Shopify (D2), **partita IVA (D3) — oggi Shopify
  presume IVA 0%**, conferma dei colori (D4, già applicati), e la 8c. Tabella in
  `docs/audit/2026-11-02/AUDIT-TOTALE.md` §8.

**Da dove ripartire (al 2026-11-05):** niente è a metà, l'albero è pulito, tutto è su
`origin/sviluppo`. Il lavoro tecnico possibile da soli è quasi esaurito (§5), e le due
voci più grosse — peso del bundle e fase 3 del cantiere — aspettano proprio le misure su
telefoni veri, con l'Android di fascia media che non è **mai** stato misurato. Le due
cose che sbloccano tutto il resto non sono codice: mandare `MESSAGGIO-AL-CLIENTE.md`
(manca solo allegare il modello Excel), e una sessione col telefono in mano, che chiude
insieme la fase 3 del cantiere e le cinque prove dichiarate non eseguite qui sopra.

## 3-ter. Il 2026-11-02

Nessuna modifica al codice. Tre cose:

- **L'anteprima e' stata guardata davvero**, non solo interrogata: aperta in un browser
  su `https://website-git-sviluppo-yeppama.vercel.app`, i due allestimenti entrano
  entrambi nella scena 3D e tutti gli asset rispondono 200 — font, le foto dei 7 capi,
  grafica alle pareti, e per il cantiere i `.glb` dei capi. Un solo errore in console,
  ed e' voluto (lo script di feedback di Vercel bloccato dalla CSP: `SICUREZZA.md`).
- **`docs/MESSAGGIO-AL-CLIENTE.md`**: il testo pronto da mandare al cliente, scritto da
  `CONTENUTI.md`, con l'indirizzo stabile gia' dentro. Prima di spedirlo resta solo da
  allegare il modello Excel.
- **`docs/AUDIT-CARRELLO.md`** del 30 ottobre e' il carrello per intero per un revisore
  esterno. Fotografia dichiarata, si rigenera invece di aggiornarla.

**Da dove ripartire, come si leggeva allora:** niente e' a meta', l'albero e' pulito,
tutto e' su `origin/sviluppo`, l'ultimo giro completo delle dieci suite col browser e'
verde (15m53s), e il prossimo passo non e' tecnico. **Superato il giorno dopo** (§3-quater):
l'audit ha prodotto nove fasi di correzioni al codice, e le suite sono diventate undici.

## 3-bis. Il pomeriggio del 2026-10-30 (17 commit)

Giornata di verifiche, non di funzionalità nuove: quasi tutto quello che c'era
scritto come "da controllare" è stato controllato, e due cose non erano come dicevano
i documenti.

- **`75135a3` — le suite col browser hanno un workflow loro**, `e2e.yml`, con
  `paths-ignore` sui documenti: GitHub filtra i percorsi per workflow, non per job.
  **Verificato in entrambe le direzioni:** un push di soli documenti fa partire solo
  `CI` (ventina di secondi), e il primo push che tocca del codice ha fatto partire
  `e2e`, chiuso verde in 15m53s con tutte e dieci le suite.
- **`b1ac600` … `b04ff5c` — gli scope del canale Headless non erano a posto.** Dei 16
  ne erano attivi 10, fra cui `read_customers` e `write_customers`, che il sito non
  usa. Tolti tutti e sei i non necessari. Dettaglio e gravità reale in `SICUREZZA.md`
  righe 4 e 7; la lista dei quattro che servono è in `PER-L-UTENTE.md` §2.1 e, per la
  8c, in `PLAN-8.md`.
- **`28a85c0` — `npm run check:scopes`**: un comando che chiede al negozio cosa può
  fare il token, invece di fidarsi di una lettura a mano. Fuori dalla CI, come
  `check:catalog`. Alla 8c si rilancia sul negozio del cliente.
- **`7143e67` — la cassa è verificata.** Con `STORE_PASSWORD` dato dall'utente,
  `e2e-phase8b` passa da 11/12 a **12/12**: è la prima volta che il percorso d'acquisto
  completo, dal capo nella scena alla cassa di Shopify, viene verificato in automatico.
- **`c2736bd` — niente più cartella `undefined`.** `outDir` in `launchOptions.mjs`
  manda gli screenshot in `e2e-out/` quando non si passa il terzo argomento.
- **`38983f2` — `docs/AUDIT-CARRELLO.md`**, il carrello per intero per un revisore
  esterno. È una fotografia, lo dichiara in testa.
- **`e32e7f8`, `a7f7714`, `3c23491`** — `docs/mappa_dati_sicurezza.md`, scritto da una
  sessione parallela che lavorava nella stessa cartella.

Due note di processo: la **Parte 1 di `PER-L-UTENTE.md` è chiusa** (`gh`, permessi,
`STORE_PASSWORD` fatti; token Vercel escluso, §6), e due documenti dicevano cose non
più vere — che da qui Vercel non si raggiunge, e che il token Vercel serviva a vedere
le anteprime. Corretti.

## 3. Cosa è cambiato il 2026-10-29 e il 2026-10-30 (mattina)

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
- ~~**Un push di soli documenti fa girare 16 minuti di suite e2e.**~~ Fatto e
  verificato il 2026-10-30 (vedi §3-bis): niente più da controllare qui.
- **ESLint 10**: bloccato dai plugin, non da noi (jsx-a11y arriva a `^9`, plugin-react a
  `^9.7`). Si rivaluta quando pubblicano il peer su `^10`.
- ~~**Audit di UI/UX, legale e sicurezza.**~~ Fatto: nove fasi unite il 2026-11-03
  (§3-quater). Quel che resta di quell'audit o vuole un telefono vero (§7) o vuole il
  cliente (`AUDIT-TOTALE.md` §8).
- **Vercel Analytics**, deciso in §6 e non installato. Vuole il suo contorno: CSP,
  informativa, DPA. È l'unica voce di questa lista che si può chiudere da soli senza
  prima misurare niente.

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
| **Modulo cliente dell'audit:** EAA (D1), recesso UE (D2), partita IVA (D3) | cliente | Il livello d'obbligo dell'accessibilità, il recesso online e l'IVA corretta al pagamento — tutti e tre prima di vendere (8e). Tabella in `docs/audit/2026-11-02/AUDIT-TOTALE.md` §8 |
| Misure su iPhone, Honor, PC con GPU dedicata, **Android di fascia media** | utente | Fase 3 del cantiere. L'Android non è **mai** stato misurato ed è il tier che decide se il sito è usabile sui telefoni più diffusi |
| **Le cinque prove dell'audit che vogliono un telefono vero** | utente | Indietro del browser su Chrome Android e Safari iOS, avviso in uscita, modalità testo su un telefono lento, lettore di schermo vero, N11 in verticale. Si fanno nello stesso giro delle misure |
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

Le suite col browser sono **undici** da quando l'audit ha aggiunto `e2e-textmode`: dieci
girano col contenuto `into` (negozio A e cantiere), una con `demo`.

Ultimo esito noto, 2026-11-03: dopo il merge della PR #2 in `sviluppo`, **`CI`, `e2e` ed
`e2e-shopify` tutti verdi** — e2e 11/11 su A e su B, axe 0 violazioni su 37 schermate,
`e2e-shopify` 13/13 dal vivo. Da allora su `sviluppo` ci sono solo documenti.

Attenzione a un dettaglio imparato il 2026-11-03: fino a `80e347b` **otto suite su undici
restavano verdi anche fallendo**. Un esito e2e letto prima di quella data non vale.

Fuori da quel giro, da eseguire a mano:

- `e2e-phase6` (prestazioni): `node scripts/e2e/e2e-phase6.mjs <indirizzo> <cartella>`
- `e2e-phase8b` (dal vivo su Shopify): **13 su 13 il 2026-11-03**, cassa compresa. Non
  si lancia più da qui a mano: gira sul runner GitHub (`e2e-shopify.yml`, Actions → Run
  workflow), che ha la rete verso Shopify e legge la password della vetrina dal segreto
  `STORE_PASSWORD`. Senza quella password la suite dichiara la cassa non verificata
  invece di fingere.
- `npm run check:scopes` (dal vivo su Shopify): cosa può fare il token pubblico. Rosso
  il 2026-10-30 con cinque permessi attivi e non usati, `read_customers` compreso. Si
  rilancia dopo aver tolto le caselle, e di nuovo alla 8c sul negozio del cliente.
