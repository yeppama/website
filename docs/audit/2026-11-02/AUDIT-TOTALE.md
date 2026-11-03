# Resoconto totale per l'editor: INTO industries

Audit del 30/10 – 2/11/2026 sul branch `sviluppo`, commit `f9f0ff6`.
Allestimenti verificati: **A · negozio** (senza parametri) e **B · cantiere** (`?allestimento=cantiere`).

**Come è stato verificato.** Ho letto il codice e poi ho navigato il sito dal vivo. La build locale era servita con gli stessi header di produzione, carrello finto (`?commerce=mock`) e Chromium con WebGL software. Ogni allestimento è stato provato su 3 schermi: computer 1366×768, telefono verticale 390×844, telefono orizzontale 844×390. Le prove fatte su ogni schermo:
- tastiera e touch;
- menu, «Vai a», Focus, scheda prodotto, aggiunta al carrello, carrello;
- tasto Indietro del browser e ricarica della pagina;
- `prefers-reduced-motion`;
- dispositivo senza WebGL;
- axe-core, regole WCAG 2.2 AA.

Per poter iniettare axe la CSP è stata **disattivata solo nel browser di prova**. Il sito non è stato modificato.

**Cosa non è stato verificato:**
- il negozio Shopify vero (non raggiungibile da qui);
- un lettore di schermo reale, perché ho controllato l'albero accessibile ma non NVDA o VoiceOver;
- telefoni fisici;
- le prestazioni. I tempi di questo resoconto sono misurati in rendering software e valgono solo **come confronto tra A e B**.

Legenda: 🔴 bloccante · 🟡 da correggere · 🟢 miglioramento. **[A+B]** vale per entrambi gli allestimenti, **[B]** solo per il cantiere.

---

## 0. Vincoli che non si toccano

- **Entrambi gli allestimenti devono restare raggiungibili.** Ogni correzione si verifica su A **e** B (`e2e-cantiere.mjs` più le suite del negozio).
- Non aggiungere chiavi in `localStorage` o cookie: farebbe fallire `e2e-phase8a`. Non aggiungere moduli che raccolgono dati personali. Non aggiungere host in `connect-src`.
- **I prezzi e i totali arrivano solo da Shopify.** Mai calcolare `prezzo × quantità` nel client.
- I testi vanno in `storeConfig.copy`, mai nei componenti (regola del `CLAUDE.md` del repo).
- Prima di ogni commit lancia `npm run build`, `npm run test:nav`, le suite e2e interessate e `npm run scan:secrets`, **e leggi l'esito**.
- `main` pubblica in automatico: **nessun lavoro va fatto su `main`**.

## 1. Le decisioni che spettano a persone e non all'editor

| # | Decisione | Chi | Blocca |
|---|---|---|---|
| D1 | **Il cliente rientra nell'esenzione per microimprese dell'European Accessibility Act?** L'esenzione vale con meno di 10 persone **e** al massimo 2 milioni di euro di fatturato o di bilancio annuo. Se non rientra, N1 diventa un obbligo di legge, e lo è dal 28/06/2025 (d.lgs. 82/2022). | cliente, con il suo consulente | priorità di N1 |
| D2 | Funzione di recesso online, art. 54-bis del Codice del consumo (obbligatoria dal 19/06/2026). Opzione A: delegarla a Shopify (consigliata). Opzione B: un modulo proprio sul sito. **2026-11-03:** l'admin del negozio del cliente propone l'attività nativa «Prepara il negozio per il diritto di recesso dell'UE»: è lo strumento dell'opzione A, da attivare col cliente (scrive le regole di reso a suo nome). | utente e cliente | 8e (T10) |
| D3 | Su Shopify, i prezzi sono «IVA inclusa»? C'è il ricalcolo dell'IVA per paese? **Verificato 2026-11-03 sul negozio del cliente:** «IVA inclusa» attivo, ma nessuna registrazione fiscale: Shopify presume aliquota 0% e la riga UE non riscuote. **Bloccato sul cliente:** serve la sua partita IVA (Impostazioni → Imposte e dazi → Unione europea → Italia) prima dei pagamenti veri. | cliente | 8c (T9, T22) |
| D4 | ✅ **Approvato dall'utente 2026-11-03.** I nuovi grigi e il nuovo rosso (N7) sono accettati come parte del marchio. Da far vedere al cliente. | — | — |
| D5 | ✅ **Chiuso 2026-11-03.** Nel negozio del cliente erano attivi 10 scope su 16, compresi leggi/modifica clienti. Tolti 6 (clienti ×2, tag prodotto, ritiro in negozio, piani di vendita, metaobject); restano i 4 del sito. Sondato col token pubblico: clienti e metaobject negati, prodotti/contenuto/carrello rispondono. Ritiro e piani di vendita non sondabili a catalogo vuoto: rilanciare `npm run check:scopes` alla 8c. Nessun account cliente nel negozio. | — | — |
| D6 | ✅ **Chiuso 2026-11-03.** Git Fork Protection attiva (le PR da fork aspettano autorizzazione), nessuna variabile d'ambiente nel progetto, Vercel Authentication spenta (anteprime pubbliche per scelta). `README.md` corretto. | — | — |

---

## 2. Priorità alta

### T1-bis: il pagamento si blocca in silenzio  🔴 latente, diventa bloccante alla 8c  [A+B]

Sono due difetti che sommati bloccano gli acquisti. Uno sta in `commerce/shopify.js`, l'altro in `ui/cart/CartSheet.jsx`.

1. `safeCheckoutUrl` accetta un solo host, `shopify.domain`, cioè il dominio myshopify usato per l'API. Con un dominio personalizzato Shopify restituisce il `checkoutUrl` sul dominio primario del negozio [Probabile, da verificare dal vivo alla 8c]. L'URL viene scartato e diventa `null`.
2. Con `checkoutUrl` a `null`, `CartSheet` mostra comunque «Vai al pagamento», e il clic esce con `return` senza fare nulla. Il commento in `shopify.js` e il documento `AUDIT-CARRELLO.md` dicono che «il bottone non compare»: è **falso**.

```js
// commerce/shopify.js
const checkoutHosts = shopify.checkoutHosts?.length ? shopify.checkoutHosts : [shopify.domain]
const safeCheckoutUrl = (raw) => {
  try {
    const url = new URL(String(raw))
    if (url.protocol === 'https:' && checkoutHosts.includes(url.hostname)) return url.href
    console.warn('shopify: checkoutUrl scartato', url.protocol, url.hostname)
    return null
  } catch {
    return null
  }
}
```

```jsx
// ui/cart/CartSheet.jsx
const canCheckout = mock || Boolean(cart?.checkoutUrl)
const checkout = () => {
  if (mock) { setCheckoutNote(t.mockCheckout); return }   // prima di tutto
  if (!cart?.checkoutUrl) return
  window.location.assign(cart.checkoutUrl)
}
// …
<Button variant="primary" className="mt-4 w-full" disabled={pending || !canCheckout} onClick={checkout}>{t.checkout}</Button>
{!canCheckout && !pending && <p className="micro mt-2" role="status">{t.checkoutUnavailable}</p>}
```
- Aggiungi `copy.cart.checkoutUnavailable`: «Il pagamento non è disponibile in questo momento. Riprova tra poco.»
- Aggiungi `commerce.shopify.checkoutHosts` nello **stesso commit** della 8c, insieme a dominio, token e CSP.
- In `e2e-phase8b`, aggiungi un'asserzione: il `checkoutUrl` del carrello creato **non è `null`**.

**Accettazione:**
- Test unitario: accetta gli host della lista. Rifiuta `http://`, `javascript:`, `https://evil.example`, `https://<host>.evil.example`, stringa vuota e `undefined`.
- Test del componente: con `checkoutUrl: null` il bottone è disabilitato e il messaggio è visibile.

### N1: senza WebGL il sito non mostra né catalogo, né carrello, né pagine legali  🔴 (vedi D1)  [A+B]

Verificato dal vivo con WebGL spento. `WebGLFallback` mostra un titolo e due frasi, senza **nessun bottone e nessun link**.

Questo contraddice l'etichetta della scena (`copy.hud.sceneLabel`), che promette «Lo stesso catalogo […] è raggiungibile dal menu senza entrare nella scena». Ma anche **con** WebGL quel percorso esiste solo dopo il caricamento 3D: «Entra» resta disabilitato finché la scena non è pronta, e il menu esiste solo in fase `exploring`.

Le conseguenze:
- un dispositivo vecchio, o chi ha l'accelerazione hardware spenta, non può comprare;
- non può leggere **privacy, condizioni e recesso** (vedi anche T10);
- un utente con lettore di schermo deve aspettare il caricamento della scena per arrivare a un indice testuale.

**Correzione: una «modalità testo» che riusa i componenti esistenti.** Non serve nessuna pagina nuova da mantenere a parte.
1. In `useAppStore` aggiungi `textMode: false` e `setTextMode`.
2. In `App.jsx`:
   - se `phase === UNSUPPORTED` **oppure** `textMode` è attivo, non montare `StoreCanvas`;
   - mostra un `<main>` con un `<h1>` e un bottone «Sfoglia il catalogo» che apre `MenuDrawer`;
   - monta `DialogHost`, così scheda prodotto, carrello e pagine legali funzionano senza scena.
3. Il `MenuDrawer` in modalità testo nasconde la sezione «Vai a», che senza scena non ha senso.
4. In `WebGLFallback` aggiungi il bottone «Sfoglia il catalogo».
5. In `OnboardingScreen` aggiungi un link sempre attivo, anche durante il caricamento: «Entra senza 3D». Va subito dopo il bottone «Entra».
6. Aggiorna `sceneLabel` in modo che dica la verità: «… oppure dal link "Entra senza 3D" nella schermata iniziale».

**Accettazione:**
- Con WebGL spento (`--disable-webgl --disable-3d-apis`): apri un capo, aggiungilo al carrello, apri il carrello e apri «Privacy». Tutto **solo da tastiera**. Su A e su B.
- Durante il caricamento, «Entra senza 3D» funziona.
- Gli e2e esistenti restano verdi.

---

## 3. Navigazione e accessibilità  [A+B salvo dove indicato]

Le prove dal vivo hanno dato lo **stesso comportamento su A e B**: menu, Focus, schede e carrello sono codice comune. Le differenze sono solo N3 e i tempi di caricamento (sezione 6).

### N2: il focus finisce sul `<body>` in 6 punti  🟡 (WCAG 2.4.3)

Ho misurato `document.activeElement` dopo ogni azione, sia su A sia su B.

| Dopo… | Dove finisce il focus | Correzione |
|---|---|---|
| «Entra» (l'onboarding si smonta) | `body`, e la vista di esplorazione **non ha nessun titolo** | Aggiungi all'HUD `<h1 className="sr-only" tabIndex={-1}>` con il nome del negozio e della zona, e dagli il focus all'ingresso |
| Uscita dal Focus (ESC o «Esci») | `body` | Salva `document.activeElement` all'ingresso in `FocusPanel` e restituiscilo all'uscita. Se non è più nel DOM, sposta il focus sul bottone Menu |
| «Aggiungi al carrello» | `body`, perché il bottone diventa `disabled` mentre aspetta | Usa `aria-disabled` durante l'attesa, non `disabled` (stessa soluzione di T4) |
| `+` / `−` nel carrello | `body` (confermato: **T4**) | T4.1 |
| «Rimuovi» | `body` (confermato) | T4.2 |
| Teletrasporto dal menu | bottone Menu ✅ | — |

`Button.jsx` (V5): l'attributo `aria-disabled` arriva al bottone, ma lo stile esiste solo per `disabled:`. Aggiungi alla classe base:
`aria-disabled:opacity-40 aria-disabled:cursor-not-allowed`.

### N3: due voci «Sei qui» insieme nel cantiere  🟡  [B]

Verificato dal vivo su telefono: il menu mostra «● Sei qui» **sia su Ingresso sia su Catene**, e la barra «Vai a» le evidenzia tutte e due. La causa: in `layouts/cantiere.js`, `qt-c-chains` ha `zoneId: 'zone-c-entrance'`, lo stesso di Ingresso, e `here` confronta solo la zona.

Correzione in `MenuDrawer.jsx` e `QuickTravelBar.jsx`: tra le destinazioni della zona corrente, segna solo quella più vicina al giocatore.

```js
// lib/navigator.js (o un helper condiviso)
export function currentQuickTravelId(quickTravel, waypoints, zoneId, pose) {
  const inZone = quickTravel.filter((q) => q.zoneId === zoneId)
  if (inZone.length <= 1) return inZone[0]?.id ?? null
  const pos = (q) => waypoints.find((w) => w.id === q.waypointId).position
  return inZone.reduce((best, q) => {
    const d = Math.hypot(pos(q)[0] - pose.x, pos(q)[2] - pose.z)
    return !best || d < best.d ? { id: q.id, d } : best
  }, null).id
}
// here = qt.id === currentQuickTravelId(quickTravel, storeConfig.navigation.waypoints, zoneId, pose)
```

**Accettazione:** in `e2e-cantiere.mjs` aggiungi un controllo dopo il teletrasporto su Catene: c'è esattamente **un** `aria-current="true"`. Sul negozio il comportamento non cambia.

### N4: nell'interfaccia compaiono id tecnici e dati di debug  🟡

- Il menu «Vai a» mostra `wp-new-01`, `wp-c-rack` e simili a destra di ogni voce. Il lettore di schermo legge «02 Nuovi Arrivi wp-new-01». In `MenuDrawer.jsx` riga 93 togli `qt.waypointId`: lascia vuoto, oppure scrivi l'etichetta della zona.
- L'HUD mostra «puntatore · tier low» oppure «touch · tier low». Sono informazioni di diagnosi, non per il cliente: mostrale solo con `?perf` o `?debug`.

### N5: il cambio di zona non viene annunciato  🟡 (WCAG 4.1.3)

Dopo un teletrasporto il lettore di schermo non dice nulla: l'etichetta della zona non sta in nessuna regione live (verificato). Non conviene rendere live l'etichetta, perché camminando cambia di continuo. Annuncia solo i teletrasporti: alla fine del teletrasporto in `PlayerController`, chiama `showNotice(\`${copy.hud.arrivedAt} ${label}\`)`. La chiave `copy.hud.arrivedAt` («Sei in») va aggiunta, perché oggi non esiste. `NoticeToast` è già `role="status"`.

### N6: il caricamento non ha semantica  🟡

Non c'è una `progressbar` e non ci sono regioni live (verificato). Chi usa un lettore di schermo sente solo «Caricamento ambiente, pulsante, disattivato».

```jsx
<div role="progressbar" aria-label={copy.loading} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shown * 100)} className="h-px w-full bg-line-subtle">…</div>
<p className="micro mt-2" role="status">{ready ? copy.ready : …}</p>
```

### N7: contrasto insufficiente in tutto il sito  🟡 (WCAG 1.4.3), vedi D4

> ✅ **Fatto 2026-11-03 (Fase 2).** `text.muted` → `#82827c`, `state.danger` → `#f04452`. axe `color-contrast` a 0 su onboarding, esplorazione, menu, Focus, scheda, carrello e fallback, su A e B, desktop/telefono/orizzontale (37 schermate). `scripts/generate-theme.js` ora ferma la build se un colore di testo scende sotto 4,5:1 su un fondo con testo. Restano, fuori da N7: `label-content-name-mismatch` (40), `region` (34), `heading-order` (12).

axe segnala da 2 a 17 elementi per schermata. Ho calcolato io i contrasti dai token di `config/designTokens.js`:

| Token | Su `bg.base` | Su `bg.raised` | Minimo richiesto | Dove si vede |
|---|---|---|---|---|
| `text.muted` `#5c5c58` | 3,02 | 2,91 | 4,5 | **tutto il `.micro`**: etichette, taglia e colore nel carrello, «ESC per chiudere», **«IVA inclusa…»**, intestazione delle pagine legali, SKU |
| `state.danger` `#c21025` | 3,28 | 3,16 | 4,5 | tutti i messaggi d'errore |

La nota «IVA inclusa» è un'informazione obbligatoria e oggi è stampata sotto la soglia di leggibilità.

**Correzione:** si cambiano due token e nessun componente.
```js
text:  { …, muted: '#82827c' },   // 5,06 su raised · 4,63 su surface-2
state: { danger: '#f04452', … },  // 5,26 su raised
```
Dopo la modifica rilancia axe: `color-contrast` deve arrivare a 0 su onboarding, menu, scheda e carrello, su A e su B. 🟢 Il bordo dei bottoni secondari (`line.strong`, 1,73:1) non blocca perché il testo identifica il bottone, ma va valutato con il cliente.

### N8: il tasto Indietro dopo una ricarica  🟡 (era T16, ora confermato dal vivo su A e B)

La prova: carrello aperto, ricarica, poi «Indietro». Il **primo Indietro resta sul sito** e non succede nulla; serve il secondo per uscire. Dopo la ricarica la voce corrente della cronologia è `{intoLayer: 1}`, ma `depth` riparte da 0.

⚠️ **Non usare la correzione candidata che avevo proposto prima.** Controllava `e.state` all'arrivo, ma all'arrivo lo stato è `null`, quindi non avrebbe funzionato. La correzione giusta va **all'installazione**:

```js
// state/backButton.js, in installBackButton(), prima di sync()
const orphan = history.state?.intoLayer
if (orphan) {
  ignore += 1                 // il popstate che segue è nostro
  history.go(-orphan)         // si torna alla voce della pagina; le voci orfane
}                             // spariscono al prossimo pushState
```

**Accettazione:** carrello aperto, ricarica, un solo Indietro: si esce dal sito. Su A e B. Ripeti la prova anche tornando dalla cassa di Shopify (8b).

### N9: le scorciatoie a tasto singolo funzionano anche con il focus su un bottone  🟡 (WCAG 2.1.4)

[Certo] Le frecce e i tasti W, A, S, D, E sono ascoltati su `window` senza guardare chi ha il focus: con il focus sul bottone Menu, la freccia muove il giocatore. [Probabile] Per chi naviga con tastiera o lettore di schermo, il giocatore si sposta senza volerlo.

```js
// PlayerController, all'inizio di `down`
const el = document.activeElement
if (el && el !== document.body && el.tagName !== 'CANVAS' && el.closest('button,a,input,select,textarea,[role=radio],[role=dialog]')) return
```

### N10: ARIA, correzioni minori  🟢

Sono tutti risultati di axe, uguali su A e B.

| Dove | Problema | Correzione |
|---|---|---|
| `CartButton.jsx` | `aria-label="Carrello, 0"`, mentre il testo visibile è «Carrello 0» (WCAG 2.5.3) | `aria-label={\`${t.open} ${count}\`}` |
| `MenuDrawer.jsx` | `<aside role="dialog">` non è un ruolo ammesso | usa `<div role="dialog">` |
| `FocusPanel.jsx` | i campioni colore sono `<ul>` con figli `<li role="img">` (lista non valida) | `<li><span role="img" aria-label=…/></li>` |
| `CartSheet.jsx` | il suo `<header>` crea un secondo landmark «banner» | usa `<div>` |
| `OnboardingScreen.jsx` | il contenuto sta fuori da qualsiasi landmark | radice `<section aria-label={copy.eyebrow}>` |

### N11: inquadratura in verticale  🟢  [A+B]

Sul telefono in verticale la metà superiore dello schermo è soffitto nero, perché la camera tiene lo stesso `fov` del computer. Valuta un `fov` verticale più ampio, o un'inclinazione verso il basso, quando `innerHeight > innerWidth`. Va giudicato su un telefono vero.

---

## 4. Carrello: punti ancora aperti dal brief precedente

| # | Cosa | Livello | Stato |
|---|---|---|---|
| T2 | Invariante di build: ogni id di `commerce.policies` ha un'etichetta in `copy.legal.policies`. Come difesa aggiuntiva, filtro con `Object.hasOwn` in `CartSheet` e `MenuDrawer` | 🟢 | ✅ fatto (Fase 7): filtro `Object.hasOwn` in CartSheet e LegalLinks; l'invariante c'era già (I25) |
| T3 | Quantità nel carrello: togli `aria-label` dallo `<span>`. Metti `<span className="sr-only">{t.quantity}:</span>` **fuori** dallo span con `data-testid`. Aggiungi una regione `role="status"` che annuncia «Felpa X: quantità 3» o «Felpa X rimossa» | 🟡 | ✅ fatto (Fase 7) |
| T4 | Focus nel carrello: `aria-disabled` per `+`, `−` e «Rimuovi» durante l'attesa. Dopo una rimozione, focus sul titolo della scheda, oppure su «Continua» se il carrello resta vuoto. `−` con quantità 1 è una rimozione (V4) | 🟡 | **confermato dal vivo** |
| T5 | Mostra il totale di riga di Shopify e sotto il prezzo unitario. Aggiungi `cost { totalAmount { amount currencyCode } }` a `CART_FIELDS`, poi `total: money(l.cost.totalAmount)` in `view()` e nel fornitore mock | 🟡 | ✅ fatto (Fase 7) |
| T6 | «Quantità massima» in un testo visibile collegato con `aria-describedby`, al posto di `title` | 🟡 | ✅ fatto (Fase 7) |
| T7 | Messaggio d'errore subito sopra «Vai al pagamento» | 🟡 | ✅ fatto (Fase 7) |
| T8 | Titolo della riga come `<p>` quando il capo non è nel config | 🟡 | ✅ fatto (Fase 7) |
| T9 | Testo «IVA inclusa…» | — | ✅ **chiuso**, resta solo D3 |
| T10 | Funzione di recesso: l'editor **non** la implementa. Apre un issue «Recesso art. 54-bis: decidere A/B prima della 8e» | 🔴 dalla 8e | D2 |
| T15 | `add` e `setQuantity`: rifiutare le quantità che non sono interi ≥ 0 (`Number.isInteger`) | 🟡 | da fare |
| T17 | `showNotice` con un contatore al posto di `Date.now()`. `cycleProduct` esce subito se `count` è 0. La coda `commands` si svuota quando `gpuLost` diventa vero | 🟢 | ✅ fatto (Fase 7) |
| T18 | `getProducts`: handle passati come variabili GraphQL (`$h0…`), non concatenati. Oggi la mappa §4 dice il contrario di ciò che fa il codice | 🟡 | da fare |
| T19 | `console.warn` per le varianti scartate perché taglia o colore non corrispondono. In `e2e-phase8b`: «nessuna variante scartata» | 🟡 | ✅ fatto (Fase 7), controllo in `e2e-phase8b` |
| T20 | Invariante: ogni `commerce.policies[].field` è un nome di campo GraphQL valido (`/^[a-zA-Z]+$/`) **ed è dichiarato nel config**. Non usare una lista scritta a mano: quella che avevo dato io non conteneva `contactInformation` | 🟢 | ✅ già coperto da I25 (elenco chiuso con `contactInformation`) |
| T21 | Rigenera `AUDIT-CARRELLO.md` **dopo** T1-bis. Oggi dice due volte che il bottone «non compare» | 🟡 | ✅ fatto 2026-11-03 (Fase 9): ora lo genera `npm run docs:carrello` dal codice |
| T22 | Paese fisso `IT`: prezzo mostrato e prezzo pagato possono non coincidere per chi spedisce fuori dall'Italia | 🟡 | D3, ordine di prova alla 8c |
| T23 | `formatPrice`: sempre 2 decimali | 🟢 | ✅ fatto (Fase 7) |
| T11–T13 | `testBanner()` chiamato una volta sola · stili inline in classi · «Rimosso · Annulla» per 5 secondi | 🟢 | facoltativo |

Il codice completo di T3–T8 e T15–T19 è nel brief precedente (`brief_cartsheet_audit.md`). Vale ancora, **tranne T16**: per quello usa N8 di questo documento.

---

## 4-bis. Sicurezza (audit completo con la skill `security-audit` di Cloudflare)

Il profilo è `standard`. Sono stati usati 24 agenti, il commit esaminato è `f9f0ff6` e il lavoro è stato fatto **solo sul codice, senza eseguirlo**. Il report completo è in `REPORT.md` e `NEEDS-VALIDATION.md`.

**Risultato: nessuna vulnerabilità confermata.**

Questi controlli reggono, e la storia git mostra che i fix passati non sono stati persi:
- sanitizzatore delle pagine legali;
- `safeCheckoutUrl`;
- chiusura in produzione degli interruttori di test;
- CSP e header;
- CI in sola lettura senza segreti.

Il `.env` rimasto nella storia conteneva solo `VITE_CONTENT=demo`, quindi non c'è niente da ruotare.

Ci sono 3 punti **da verificare**. Dipendono da impostazioni di Shopify e Vercel, e l'editor ne può correggere solo uno:

| # | Cosa | Chi | Azione |
|---|---|---|---|
| S1 | ✅ **Chiuso 2026-11-03 (D5).** Il token pubblico del negozio del cliente è in `docs/PLAN-8.md:129` (repo pubblico, dal 16/10), ma i suoi scope non sono ancora stati ridotti. Se gli scope *customers* sono rimasti attivi di default, chiunque può creare account e far partire email di recupero password da quel negozio. | proprietario Shopify (D5) | Spegnere gli scope inutili. Non serve ruotare il token: è pubblico per design. Toglierlo dal file non lo toglie dalla storia. |
| S2 | ✅ **Fatto (Fase 1).** `scripts/check-scopes.mjs:23` legge solo `storeConfig` e ignora `VITE_SHOPIFY_*`. Quindi può dichiarare puliti gli scope di un token diverso da quello pubblicato. | **editor** | Leggere dominio, token e versione da env con fallback su `storeConfig`, come in `scripts/catalog/check.mjs:26-28`. Stampare la fonte usata, **non il token**. Aggiungere un test con `fetch` finto. |
| S3 | ✅ **Chiuso 2026-11-03 (D6).** Repo pubblico più integrazione Git di Vercel: una PR da fork potrebbe essere compilata con le variabili di Preview e pubblicata senza login. | utente (D6) | Correggere `README.md:52`, che dice che le anteprime sono protette; i documenti più recenti dicono il contrario. Il resto si sistema nelle impostazioni Vercel, non nel repo: `vercel.json` lo modifica anche l'autore della PR. |

**Rafforzamenti che l'editor può fare subito**, in ordine di valore:

> ✅ **Fatti tutti e dieci il 2026-11-03 (Fase 8)**, più S2 (già nella Fase 1). Note: (1) `npm run test:sanitize` con jsdom, in CI; (6) Actions fissate a SHA con il tag accanto in commento, da aggiornare a mano o con Dependabot; (7) lo scan della storia trova solo il `.env` noto del 2026-10-17, messo in un elenco esplicito per commit e percorso. Nella stessa fase: axe a 0 violazioni su 37 schermate (A e B, tre formati), cioè anche `label-content-name-mismatch`, `region` e `heading-order`; tolta l'opacità 0,7 dagli avvisi «prezzi dimostrativi», che riportava il grigio sotto 4,5:1.

1. Test unitario di `sanitizeHtml` in `ci.yml`. Oggi è coperto solo dall'e2e, che non gira sui push di sola documentazione.
2. `restoreCart`: impostare `pending` durante il ripristino. Oggi un'aggiunta fatta in quel momento sovrascrive il carrello salvato.
3. `src/content/index.js`: usare `Object.hasOwn`, come in `layouts/index.js`.
4. `isProduction`: farlo fallire in modo chiuso, con gli override solo quando `VERCEL_ENV==='preview'` o in sviluppo.
5. `validate-config`: verificare che `connect-src` della CSP coincida con il dominio Shopify configurato.
6. Fissare le GitHub Actions a SHA. In `reduce-glb.sh` usare `npx --no-install`.
7. `scan-secrets`: aggiungere i prefissi `npm_`, `vercel_`, `AIza` e `.envrc`, confrontare il percorso esatto invece del suffisso e fare una scansione della storia.
8. Script dell'operatore: validare il nome in `media/build.mjs --fetch`, applicare `JSON.stringify` al nome del file in `catalog/import.mjs:39`, fare l'escape del Markdown in `resoconto.md`.
9. `LookbookSheet`: mostrare `priceNotice` come fanno le altre schede.
10. Aggiornare `docs/SICUREZZA.md`. Contiene ancora «nessun localStorage», «nessun `dangerouslySetInnerHTML`» e «drei rimossa», tutte affermazioni false.

Tutti i rafforzamenti sono elencati in `REPORT.md` §6.

---

> **Prova dal vivo dopo tutte le fasi (2026-11-03):** `e2e-phase8b` su GitHub Actions (`.github/workflows/e2e-shopify.yml`), negozio di sviluppo, **13 su 13**: catalogo, varianti (nessuna scartata), EUR, carrello creato/aggiornato/ritrovato/svuotato, cassa aperta col capo, la taglia e il prezzo giusti, pagine legali.

## 5. Cosa funziona già, da non rompere

Verificato dal vivo su A e B:
- ESC chiude un livello alla volta (prima la scheda, poi il menu).
- Il tasto Indietro chiude la scheda aperta.
- La trappola del focus funziona in menu e schede.
- All'ingresso nel Focus, il focus va su «Esci».
- La scheda prodotto apre con il focus sul titolo.
- Le taglie sono un gruppo radio con le frecce, e quelle esaurite sono annunciate.
- I bersagli sono di 44 px.
- L'invito di prossimità è un vero bottone, raggiungibile anche con il tasto E.
- Il teletrasporto funziona in tutti e due gli allestimenti.
- `prefers-reduced-motion` azzera dissolvenze, transizioni di camera e grana.
- `lang="it"` è impostato e il canvas ha un'etichetta.
- Header di sicurezza e CSP sono attivi in anteprima.
- Il carrello finto aggiunge, aggiorna e rimuove correttamente.
- Nessun errore JavaScript in nessuna delle 6 combinazioni.

---

## 6. Differenze tra A e B

| | A · negozio | B · cantiere |
|---|---|---|
| Tempo fino a «Entra» attivo (rendering software, **valido solo come confronto**) | ~3 s | ~11–12 s |
| «Sei qui» | corretto | doppio su Ingresso e Catene (N3) |
| Tutto il resto (N1–N11, carrello) | uguale | uguale |

Sullo stesso ambiente, B impiega 3–4 volte più di A per diventare utilizzabile. Rientra nella Fase 3 del cantiere, che è già aperta: le misure vanno fatte sui telefoni veri (`docs/PERF.md`). Non è un compito di questo resoconto.

---

## 7. Ordine di lavoro consigliato

1. **T1-bis**, poi T15, T18 e **S2**. Commit «sicurezza e cassa».
2. **N7**, solo due token (dopo D4).
3. **N2 + T4 + V5**, poi N10. Commit «focus e ARIA».
4. N3 [B], N4, N5, N6, N9.
5. **N8**, da provare a mano su Chrome desktop e Safari iOS.
6. **N1**, modalità testo. È il lavoro più grande: chiede un piano breve all'utente prima di partire.
7. T3, T5, T6, T7, T8, T19, poi T2, T17, T20, T23.
8. T21: rigenerare `AUDIT-CARRELLO.md`.

Dopo ogni passo: build, `test:nav`, `e2e-cantiere.mjs`, le suite del negozio e axe su A e B.

---

## 8. Chiusura (2026-11-03)

**L'audit è chiuso** per decisione dell'utente: tutto ciò che dipende dal codice è fatto e verificato; ciò che dipende dal cliente è raccolto qui sotto come ultimo modulo, da inserire quando arriva il suo materiale.

**Fatto e verificato** (branch `audit/correzioni-2026-11`, PR #2 verso `sviluppo`, da unire):

| Fase | Contenuto | Commit |
|---|---|---|
| 1 | Sicurezza e cassa: T1-bis, T15, T18, S2 | `8b99e04` |
| 2 | Contrasto N7 (D4 approvato), controllo in build | `886b615` |
| 3 | Focus e ARIA: N2, T4, V5, N10 | `2e6a19e` |
| 4 | Navigazione: N3, N4, N5, N6, N9 | `1b3c818` |
| 5 | Indietro dopo una ricarica: N8 | `52f2703` |
| 6 | Modalità testo senza 3D: N1 | `ed2b42c` |
| 7 | Carrello: T2, T3, T5–T8, T17, T19, T23; avviso in uscita | `97529b1` |
| 8 | Rafforzamenti 1–10; axe a zero violazioni (2.5.3, region, heading-order) | `4fe53c0`, `c6408c9` |
| 9 | `AUDIT-CARRELLO.md` generato dal codice: T21 | `628984f` |
| — | Exit code delle suite e2e (8 su 11 erano verdi anche fallendo) | `80e347b` |
| — | Prova dal vivo su GitHub Actions: 13/13 sul negozio di sviluppo | `d599863`, `be10a13` |
| — | D5 e D6 chiusi nelle impostazioni di Shopify e Vercel | `d4c1a2e`, `a13b067` |

Ultimo giro: lint e build puliti; suite Node tutte verdi; e2e 11/11 su A e B; axe 0 violazioni su 37 schermate; `e2e-phase8b` 13/13 dal vivo.

**Non eseguito, e dichiarato tale** (non dipende dal cliente, dipende da un telefono vero):
- Indietro del browser su Chrome Android e Safari iOS (N8).
- Avviso in uscita su telefono: su Safari iOS ci si aspetta che non compaia.
- Modalità testo su un telefono lento (N1).
- Lettore di schermo vero (VoiceOver o TalkBack) sul carrello e sulla scheda.
- N11, inquadratura in verticale: va giudicata guardandola, non è stata toccata.

**Modulo cliente** (ultimo da inserire; nessuna di queste voci si chiude senza di lui):

| # | Cosa serve dal cliente | Cosa sblocca |
|---|---|---|
| D1 | Numero di persone e fatturato: sotto 10 e 2 M€ è esente dall'EAA | il livello d'obbligo dell'accessibilità (il sito è già a WCAG 2.2 AA per quanto misurato da axe) |
| D2 → T10 | Ok ad attivare lo strumento Shopify «diritto di recesso dell'UE» (opzione A) | la funzione di recesso online, obbligatoria prima di vendere (8e) |
| D3 → T22 | Partita IVA, inserita su Shopify in Imposte e dazi → UE → Italia | IVA corretta al pagamento (oggi Shopify presume 0%) |
| D4 | Conferma dei due colori nuovi (`#82827c`, `#f04452`) come parte del marchio | niente: già applicati, approvati dall'utente |
| 8c | Catalogo, dominio, token del suo negozio | un commit solo (dominio + token + CSP + `checkoutHosts`), poi `e2e-shopify` e `npm run check:scopes` rilanciati sul suo negozio; `validate-config` ferma la build se CSP e dominio non coincidono |
| T11–T13 | — (facoltativi, nessuna decisione) | — |
