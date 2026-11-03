# Audit di sicurezza: yeppama/website

## 1. Perimetro e metodo

| | |
|---|---|
| Skill | `security-audit` di Cloudflare (commit `c1c8a8c`), **modalità audit completo**, profilo **`standard`** |
| Codice esaminato | branch `sviluppo`, commit `f9f0ff6` (worktree pulito). Durante l'audit `origin/sviluppo` è avanzato a `38983f2`: **quei commit non sono stati esaminati**. |
| Ambito | tutto il repository: `src/`, `scripts/`, workflow CI, `vercel.json`, `vite.config.js`, dipendenze e storia git completa (125 commit). |
| Budget | nessun limite fissato. Agenti usati: **24** (4 di ricognizione, 11 cacciatori in 2 ondate, 3 critici di copertura, 3 verificatori di Fase 3, 3 verificatori di Fase 5). |
| Esecuzione | **solo lettura del codice.** Il codice del sito non è mai stato eseguito: mancava la sandbox richiesta dalla skill (rete isolata, montaggi in sola lettura, limiti di risorse, promozione sicura dei file). Nessuna chiamata a Shopify, Vercel o GitHub. |
| Run precedenti | nessuno. Non esisteva un registro di copertura precedente, quindi questo run non riprende lavoro altrui e non lo dà per coperto. |

## 2. Sintesi

**Nessuna vulnerabilità confermata.** I controlli principali reggono, letti nel codice e confrontati con la storia:
- il sanitizzatore dell'HTML delle pagine legali;
- il filtro sull'URL di pagamento;
- la chiusura in produzione degli interruttori di test;
- la CSP;
- la CI in sola lettura senza segreti.

I fix di sicurezza passati non sono stati persi nelle unioni dei branch.

Restano **3 punti da verificare**. Tutti e tre dipendono da impostazioni di Shopify o Vercel che il codice non mostra. Il più urgente riguarda il **token pubblico del negozio del cliente**: è scritto in `docs/PLAN-8.md` in un repository pubblico, prima che i suoi permessi siano stati ridotti.

## 3. Vulnerabilità confermate

| Gravità | Titolo | Confine | Risultato osservato |
|---|---|---|---|
| — | nessuna | — | — |

## 4. Dettaglio dei risultati confermati

Non ce ne sono.

## 5. DA VERIFICARE (senza gravità: non sono vulnerabilità confermate)

| # | Titolo | Traccia nel codice | Cosa manca | Prossimo passo nel codice | Controllo del proprietario |
|---|---|---|---|---|---|
| NV1 | Token Storefront del negozio del cliente pubblicato prima di ridurne i permessi | `docs/PLAN-8.md:129` (dal commit `cd996fc`, 16/10), `PLAN-8.md:101`, `PLAN-8.md:204`, `docs/SICUREZZA.md:168,171` | Gli scope del canale Headless del negozio `into-industries-ayehghmw` sono visibili solo nell'admin di Shopify | nessuno | Shopify admin → Canali di vendita → Headless → storefront del token che inizia con `752615` → permessi Storefront API: devono restare attivi **solo** `unauthenticated_read_product_listings`, `unauthenticated_read_checkouts`, `unauthenticated_write_checkouts`, `unauthenticated_read_content`. Se uno scope *customers* è attivo va spento subito. Controllare anche Clienti, cercando account non creati dall'agenzia dopo il 16/10. |
| NV2 | Lo script di controllo degli scope ignora `VITE_SHOPIFY_*` | `src/config/storeConfig.js:180` → `src/commerce/index.js:57-59` → `scripts/catalog/check.mjs:26-28` → `scripts/check-scopes.mjs:23` | Non si sa se Vercel imposta `VITE_SHOPIFY_STOREFRONT_TOKEN` o `VITE_SHOPIFY_DOMAIN` | In `check-scopes.mjs` leggere dominio, token e versione API da env con fallback su storeConfig, come fa `check.mjs`. Test con `fetch` finto: con `VITE_SHOPIFY_DOMAIN=example.invalid` lo script deve riportare quel dominio. | Vercel → Settings → Environment Variables (Production e Preview): verificare se queste variabili esistono. Se esistono, rilanciare `check:scopes` con gli stessi valori. |
| NV3 | Repository pubblico più integrazione Git di Vercel: le PR da fork potrebbero essere compilate e pubblicate | `README.md:52`, `vercel.json` (solo header), `package.json:10` (prebuild), `vite.config.js:61`, `docs/STORIA.md:7` | Non si sa se Vercel chiede autorizzazione per le PR da fork, quali variabili hanno gli scope Preview e Development, se l'OIDC è attivo, né lo stato della protezione delle anteprime | nessuno: ogni fatto decisivo è un'impostazione ospitata | Vercel, sola lettura: (1) Settings → Git: le PR da fork richiedono autorizzazione? (2) le variabili Preview/Development contengono solo valori pubblici `VITE_SHOPIFY_*`? (3) OIDC attivo e con un cloud che lo accetta? (4) Deployment Protection sulle anteprime. Se (1) è attivo, NV3 si chiude. |

Il dettaglio completo è in `NEEDS-VALIDATION.md`.

## 6. Note di rafforzamento (non sono vulnerabilità)

**Pagine legali e header**
- `sanitizeHtml` non ha un test unitario: è coperto solo dall'e2e `e2e-phase8a`, che non gira sui push di sola documentazione. Aggiungere un test con payload `javascript:`, `on*`, `svg`, `math` e `template` e un controllo di andata e ritorno (mXSS).
- Valutare `require-trusted-types-for 'script'` nella CSP.
- Aggiungere `includeSubDomains` a HSTS quando ci sarà un dominio proprio.
- `'wasm-unsafe-eval'` serve solo al rendering software dell'e2e: verificare se in produzione si può togliere.
- `connect-src` e `img-src` vanno allineati a `VITE_SHOPIFY_DOMAIN` e a un eventuale `cdn.shopify.com` (8c). Meglio controllarlo in `validate-config`.

**Pagamento e carrello**
- `safeCheckoutUrl` accetta un solo host (vedi T1-bis del resoconto UX): con un dominio personalizzato la cassa si chiude in modo sicuro ma silenzioso.
- Il limite `maxQuantity` è solo lato client. Se è un vincolo commerciale va imposto su Shopify.
- `restoreCart` non imposta `pending`: un'aggiunta fatta durante il ripristino può far perdere il carrello salvato.
- Mock: usare `Object.hasOwn` e la validazione della forma dei carrelli in `localStorage`. Mock e Shopify condividono la chiave `into-cart-id`.
- `LookbookSheet` mostra il prezzo dimostrativo senza l'avviso `priceNotice` che compare altrove.

**Build e configurazione**
- `isProduction` si basa solo sulle variabili Vercel: una build di `main` fatta fuori da Vercel compila gli interruttori di test.
- `VITE_CONTENT=constructor` supera il controllo: usare `Object.hasOwn`, come in `layouts/index.js`.
- `testBanner()` legge `testMode` dal config e non dal negozio effettivo.
- Gli interruttori `?debug`, `?perf` e `?bench` restano attivi in produzione, per scelta documentata. Toglierli riduce gli appigli per un'eventuale futura iniezione.

**CI e dipendenze**
- Fissare le action a SHA completi e `node-version` a una minor esatta.
- In `reduce-glb.sh` usare `npx --no-install gltf-transform`.
- Registrare un digest delle sorgenti dei GLB e WebP committati.

**Segreti**
- `scan-secrets` non controlla la storia git, i file xlsx/zip/pdf e i prefissi `npm_`, `vercel_`, `AIza`, `.envrc`; inoltre si esclude per suffisso del nome. Aggiungere una scansione della storia o un hook.
- **Verificato:** il `.env` nella storia (`6a206b1`) conteneva solo `VITE_CONTENT=demo`. Non c'è nulla da ruotare.

**Script dell'operatore**
- `media/build.mjs --fetch`: validare il nome (`/^[A-Za-z0-9._-]+$/`) e l'host, aggiungere un `sha256` per ogni sorgente.
- `catalog/import.mjs:39`: il nome del file entra in un commento JS, va fatto passare da `JSON.stringify`.
- `importer.mjs`: in `resoconto.md` fare l'escape del Markdown nelle risposte del cliente.

**Documentazione**
- `README.md:52` dice che le anteprime sono protette da login, mentre `STORIA.md` e `PER-L-UTENTE.md` dicono il contrario.
- `docs/SICUREZZA.md` contiene ancora affermazioni superate: «nessun localStorage», «nessun `dangerouslySetInnerHTML`», «drei rimossa».

**Schemi positivi trovati**
- Sanitizzatore a lista di elementi ammessi, che ricostruisce gli elementi da zero.
- `safeCheckoutUrl` che fallisce in modo chiuso.
- `Object.hasOwn` su tutte le ricerche fatte con dati dell'URL.
- Variabili GraphQL al posto della concatenazione per gli id del carrello.
- CSV difeso dall'iniezione di formule.
- CI con `contents: read`, senza segreti e senza `pull_request_target`.
- Lockfile con integrità `sha512` su 660 pacchetti, tutti dal registry npm.

## 7. Copertura

- **15 unità nel registro:** 13 `covered`, 2 `candidate` (da cui vengono NV1, NV2 e NV3), 0 `blocked`, 0 `deferred`, 0 `out_of_scope`.
- Un'unità (segreti e `.gitignore`) era bloccata perché la copia del repository non conteneva la storia completa. È stata riassegnata nella seconda ondata dopo aver scaricato la storia completa, ed è chiusa come `covered`.
- Due unità sono state aggiunte durante il run:
  - **build Vercel delle PR**: emersa da un cacciatore;
  - **regressioni nella storia dei fix di sicurezza**: proposta dal primo critico.
- **Critici:**
  - il critico post-ondata 1 ha chiesto un'unità nuova e una riassegnazione;
  - il critico post-ondata 2 non ha chiesto nulla;
  - il critico finale indipendente non ha chiesto nulla, quindi la copertura è chiusa per questo run.
- **Esclusi, con motivazione nel registro:** protocolli/RPC (non c'è un server proprio), esaurimento risorse (nessun servizio condiviso raggiungibile), isolamento dati (nessuno store multi-tenant proprio), AI/LLM, memoria/binari, desktop/mobile.
- **Limite del run:** è tutto sola lettura del codice. Ogni comportamento che richiede esecuzione o un'impostazione ospitata è finito in «da verificare», non in «coperto».
