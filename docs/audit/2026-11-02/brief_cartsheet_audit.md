# Brief per l'editor — Correzioni da audit di `CartSheet.jsx`

Audit del 2026-10-30. Questo documento dice **cosa cambiare, dove e come verificarlo**.
Non è una lista da applicare alla cieca: la Fase 0 serve a confermare o chiudere due
problemi che dipendono da file non ancora letti.

## Vincoli che non si toccano (da `mappa_dati_sicurezza.md` §7)

- **Nessuna nuova chiave** in `localStorage` e nessun cookie (`e2e-phase8a` fallisce).
- **Nessun modulo** che raccolga dati personali sul nostro dominio.
- **Prezzi e totali vengono solo da Shopify.** Non calcolare `prezzo × quantità` nel
  client e non leggere prezzi da `storeConfig`.
- **Nessun nuovo host** di rete: `connect-src` in `vercel.json` resta invariato.
- I testi nuovi vanno in `storeConfig.copy.cart` (o `copy.legal`). Se le 30 invarianti
  del config controllano le chiavi della copy, vanno aggiornate nello stesso commit.
- Dopo ogni modifica: `npm run scan:secrets`, build, e2e. La CI deve restare verde.

---

## Fase 0 — Verifiche prima di scrivere codice

Rispondi a queste domande leggendo il sorgente e riporta il risultato nel messaggio di commit o nella PR.

| # | Da verificare | Dove | Esito che cambia il lavoro |
|---|---|---|---|
| V1 | Il `checkoutUrl` viene già validato (`https:` + host esatto) prima di arrivare al componente? | `state/useCartStore.js`, adapter Shopify in `commerce/` | Se **no** → T1 diventa urgente (redirect aperto). Se **sì** → T1 resta come difesa nel punto di navigazione |
| V2 | Contro quale host si confronta? Solo `*.myshopify.com`? | stesso punto di V1 | Con un dominio personalizzato Shopify restituisce il `checkoutUrl` sul **dominio primario del negozio**: un confronto solo con myshopify bloccherebbe la cassa alla 8c |
| V3 | L'adapter espone il totale di riga di Shopify (`cost.totalAmount`)? | adapter Shopify + fornitore mock | Se no, va aggiunto alla query GraphQL e al mock (T5) |
| V4 | `setQuantity(id, 0)` rimuove la riga? | `useCartStore.js` | Se sì, il − a quantità 1 è una rimozione e T4 si applica anche lì |
| V5 | Il primitivo `Button` inoltra `aria-disabled` e ha uno stile per quello stato? | `components/primitives/Button.jsx` | Se no, va aggiunto prima di T4 |
| V6 | Lo store espone un modo per impostare un errore (`setError`)? | `useCartStore.js` | Serve a T1 |
| V7 | Testo attuale di `copy.cart.taxNote` | `config/storeConfig.js` | Vedi T9 |

### Esiti dopo la lettura degli store (2026-10-30)

| # | Esito | Conseguenza |
|---|---|---|
| V1 | **Aperta.** Gli store non validano il `checkoutUrl`: la validazione dichiarata dalla mappa, se c'è, sta nell'adapter Shopify in `commerce/` | Leggere l'adapter. Se non c'è nemmeno lì, la mappa §1 dice il falso e T1 è 🔴 confermato |
| V2 | Aperta, dipende da V1 | — |
| V3 | Aperta (adapter) | — |
| V4 | **Confermata:** `setQuantity(id, q <= 0)` chiama `removeLines` | T4.2 vale anche per il − a quantità 1 |
| V6 | **Non esiste** un `setError` | Aggiungerlo in `useCartStore`: `setError: (error) => set({ error })` |
| — | Le policy arrivano già filtrate e ordinate secondo `commerce.policies` del config | T2 scende a 🟢. La correzione giusta è un'invariante di build (vedi T2) |

### Esiti dopo la lettura dell'adapter `commerce/shopify.js`

| # | Esito |
|---|---|
| V1 | **Chiusa.** L'adapter valida il `checkoutUrl` (`https:` + `hostname === shopify.domain`) dentro `view()`. Se l'URL non convince, `checkoutUrl` diventa `null`. La mappa §1 è vera |
| V2 | **Rischio confermato nel codice.** L'host accettato è uno solo, `shopify.domain`, cioè il dominio myshopify usato per l'API. Vedi T1-bis |
| V3 | **No.** `CART_FIELDS` non chiede il costo della riga. Vedi T5 |
| T14 | **Chiusa.** `money()` converte `amount` con `Number()`: il confronto è numerico |

---

## Priorità alta

### T1-bis — Cassa irraggiungibile in silenzio  🔴 latente, diventa bloccante alla 8c

Sono due difetti che sommati bloccano gli acquisti:

1. **`shopify.js`** accetta un solo host di cassa, `shopify.domain` (il myshopify).
   Con un dominio personalizzato Shopify restituisce il `checkoutUrl` sul **dominio
   primario del negozio** (verificarlo dal vivo alla 8c). L'URL viene scartato e
   `checkoutUrl` diventa `null`.
2. **`CartSheet.jsx`** mostra comunque «Vai al pagamento», e il clic fa `return` senza
   dire niente. Il commento in `shopify.js` («il bottone non compare») è **falso**: il
   bottone compare e non fa niente.

Risultato alla 8c: nessuno riesce a pagare, e nessun errore lo segnala.

**Correzione in `shopify.js`:** lista esplicita di host, con il myshopify come valore
predefinito.
```js
const checkoutHosts = shopify.checkoutHosts?.length ? shopify.checkoutHosts : [shopify.domain]
const safeCheckoutUrl = (raw) => {
  try {
    const url = new URL(String(raw))
    return url.protocol === 'https:' && checkoutHosts.includes(url.hostname) ? url.href : null
  } catch {
    return null
  }
}
```
Se in `safeCheckoutUrl` l'URL viene scartato, aggiungi
`console.warn('shopify: checkoutUrl scartato', url.hostname)`. Senza questo il problema
alla 8c non si vede.

**Correzione in `CartSheet.jsx`:**
```jsx
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
Aggiungi `checkoutUnavailable` alla copy, per esempio «Il pagamento non è
disponibile in questo momento. Riprova tra poco.»

**Checklist 8c:** aggiungi a `e2e-phase8b`, sul negozio del cliente, un'asserzione
che il `checkoutUrl` del carrello creato **non sia `null`**. Aggiungi
`shopify.checkoutHosts` allo stesso commit di dominio, token e CSP.

**Accettazione:** test unitario di `safeCheckoutUrl`: accetta gli host in lista;
rifiuta `http://`, `javascript:`, `https://evil.example`, `https://<host>.evil.example`,
vuoto, `undefined`. Test del componente: con `checkoutUrl: null` il bottone è
disabilitato e il messaggio è visibile.

### T1 (originale) — SUPERATA da T1-bis: non applicare il codice qui sotto

La validazione esiste già nell'adapter, quindi `src/lib/checkout.js` non serve. Dal
testo seguente resta valido solo lo spostamento del controllo `mock`, già incluso
in T1-bis.

**File:** nuovo `src/lib/checkout.js`, `CartSheet.jsx`, `storeConfig` (commerce).

Il componente oggi fa `window.location.assign(cart.checkoutUrl)` senza controlli. La
difesa va messa dove avviene la navigazione, anche se lo store valida già.

```js
// src/lib/checkout.js
export function safeCheckoutUrl(raw, allowedHosts) {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && allowedHosts.includes(u.hostname) ? u.href : null
  } catch {
    return null
  }
}
```

```jsx
// CartSheet.jsx
const checkout = () => {
  if (mock) { setCheckoutNote(t.mockCheckout); return }   // prima del controllo URL
  const url = safeCheckoutUrl(cart?.checkoutUrl, storeConfig.commerce.checkoutHosts)
  if (!url) { setError(t.checkoutUnavailable); return }   // mai un clic che non fa niente
  window.location.assign(url)
}
```

- `checkoutHosts`: lista esplicita, che oggi contiene il negozio di sviluppo. Alla 8c va
  aggiornata **nello stesso commit** di dominio, token e CSP, aggiungendo il dominio primario.
- Aggiungi `checkoutUnavailable` alla copy.
- Il controllo `mock` va spostato **prima**: oggi, se il carrello finto non ha
  `checkoutUrl`, la nota di prova non compare mai.

**Accettazione**
- Test unitario: accetta `https://<host ammesso>/…`. Rifiuta `http://`, `javascript:`,
  `https://evil.example`, `https://<host>.evil.example`, stringa vuota, `undefined`.
- e2e: un carrello con `checkoutUrl` manomesso non provoca navigazione e mostra l'errore.

### T2 — Etichette legali: filtrare gli id non mappati  🟢 (declassata: le policy arrivano già filtrate dal config)

**Prima scelta:** aggiungere alle invarianti del config una regola: «ogni id in
`commerce.policies` ha un'etichetta in `copy.legal.policies`». Così l'errore fa fallire
la build, non la visita. Il filtro qui sotto resta come difesa aggiuntiva.

**File:** `CartSheet.jsx` (e qualunque altro punto che usa
`copy.legal.policies[p.id]`, per esempio il menu: cercalo).

Un id restituito da Shopify e non presente nella copy produce un pulsante **senza testo
e senza nome accessibile**. Usa lo stesso schema già adottato per la query string (§4).

```jsx
const labels = storeConfig.copy.legal.policies
const visible = policies.filter((p) => Object.hasOwn(labels, p.id))
// usare `visible` al posto di `policies` sia nella condizione di lunghezza sia nel map
```

**Accettazione:** con una policy dall'id sconosciuto (mock), il carrello non mostra
nessun pulsante vuoto.

---

## Accessibilità (WCAG 2.2 AA)

### T3 — Quantità leggibile e annunciata  🟡 (WCAG 1.3.1, 4.1.3)

L'`aria-label` su uno `<span>` senza ruolo non è valido: alcuni lettori di schermo lo
ignorano, altri leggono «Quantità» senza il numero.

```jsx
<span className="sr-only">{t.quantity}:</span>
<span className="min-w-[2ch] text-center font-mono text-text-primary" data-testid="cart-qty">
  {line.quantity}
</span>
```

- Togli l'`aria-label` dallo span. Il testo nascosto sta **fuori** dallo span con
  `data-testid`, così gli e2e che leggono il numero non cambiano.
- Una sola regione di annuncio nel componente:
  `<p className="sr-only" role="status">{announcement}</p>`.
  Aggiornala dopo ogni cambio riuscito, per esempio «Felpa X: quantità 3» o «Felpa X rimossa».
  Le stringhe vanno nella copy.

### T4 — Il focus non si deve perdere  🟡 (WCAG 2.4.3) — dipende da V4, V5

1. **Pulsanti +, − e Rimuovi durante il caricamento.** Usa `aria-disabled` invece di
   `disabled`: un pulsante che diventa `disabled` mentre ha il focus lo cede al `body`,
   fuori dalla trappola della scheda.
   ```jsx
   <Button aria-disabled={pending || undefined}
           onClick={() => { if (!pending) setQuantity(line.id, line.quantity + 1) }}>+</Button>
   ```
   Il pulsante «Vai al pagamento» può restare `disabled`.
2. **Dopo una rimozione** (con «Rimuovi», o con − a quantità 1 se V4 lo conferma),
   sposta il focus sul titolo della scheda. Ha già `tabIndex={-1}`:
   ```jsx
   const removeLine = async (id) => {
     await remove(id)
     document.getElementById(headingId)?.focus()
   }
   ```
   Se il carrello resta vuoto, il focus va al pulsante «Continua» dello stato vuoto.

**Accettazione (e2e da tastiera):** premere + due volte di seguito lascia il focus sul +.
Dopo «Rimuovi», `document.activeElement` è il titolo, non il `body`.

### T5 — Totale di riga invece del prezzo unitario  🟡 — dipende da V3

Con quantità 2 la riga mostra il prezzo unitario e l'utente deve fare il conto da solo.
Mostra il totale di riga **fornito da Shopify** e, sotto, il prezzo unitario:

```
Felpa X                         100,00 €
M · Nero                    50,00 € cad.
```

L'adapter **non** lo espone (V3). Correzioni in `commerce/shopify.js`:
```js
// CART_FIELDS, dentro lines.nodes, accanto a quantity:
cost { totalAmount { amount currencyCode } }

// view(), nell'oggetto di ogni riga:
total: money(l.cost.totalAmount),
```
Fai lo stesso nel fornitore mock, così il contratto resta identico. **Non calcolarlo
nel client.**

### T6 — Messaggio «quantità massima» visibile  🟡

`title` non si vede su touch né da tastiera, e su un pulsante disabilitato non compare
nemmeno al passaggio del mouse.

```jsx
{line.quantity >= maxQuantity && (
  <p id={`max-${line.id}`} className="micro col-span-2 sm:col-span-3">{t.maxReached}</p>
)}
// sul pulsante +: aria-describedby={`max-${line.id}`}, togliere `title`
```

### T7 — Errore vicino all'azione  🟡

Sposta il blocco `{error && …role="alert"…}` subito **sopra** il pulsante «Vai al
pagamento», sotto il subtotale. Oggi sta in fondo, dopo i collegamenti legali: su mobile
non si vede.

### T8 — Titolo prodotto inerte  🟡

Se `product` è assente, rendi il titolo come `<p>` con lo stesso stile, non come
`<button>` che non fa niente.

---

## Legale

### T9 — Nota prezzi: IVA inclusa  🔴 (condizionato a V7)

Per i consumatori in Italia e in Olanda il prezzo mostrato deve includere l'IVA. Se
`copy.cart.taxNote` fa capire che le tasse si aggiungono dopo, sostituiscilo con:

> **IVA inclusa. Spese di spedizione calcolate al pagamento.**

⚠️ Il testo da solo non basta: sul negozio Shopify deve essere attivo «Includi le
imposte nei prezzi». Lo verifica una persona, non il codice. Segnalalo nella PR.

### T10 — Funzione di recesso online  🔴 di sito, bloccante dalla 8e — **NON implementare: serve una decisione**

Dal 19/06/2026 (art. 54-bis Codice del consumo, D.Lgs. 209/2025) un e-commerce B2C deve
offrire una funzione di recesso online visibile per tutto il periodo di recesso. Oggi
non è una violazione, perché gli acquisti sono spenti.

Non va nel carrello: va nel menu o nel piè di pagina. Le opzioni sono due e **la scelta
non spetta all'editor**:

- **A (consigliata, mantiene vera la mappa):** delegare a Shopify (account cliente o
  un'app di recesso). Il sito mostra solo un link verso il dominio Shopify, come per la
  cassa. Etichetta: «Recedi dal contratto qui».
- **B:** un modulo proprio. Cambia l'architettura: CSP, informativa e mappa dati vanno
  rivisti.

Azione per l'editor: **nessuna**, a parte aprire un issue «Funzione di recesso
(art. 54-bis) — decidere A/B prima della 8e».

---

## Nuovi problemi trovati negli store

### T14 — ✅ CHIUSA: `money()` nell'adapter converte già in numero. Nessuna azione. Testo originale per riferimento:

**File:** `state/useCartStore.js`, funzione `useShownPrice`.

`v.price.amount < min.amount`: nella Storefront API `MoneyV2.amount` è una **stringa**
(`"25.0"`). Se l'adapter non la converte, il confronto diventa alfabetico:
`"100.0" < "25.0"` è `true`, e il prezzo «a partire da» mostrato al cliente è sbagliato.

```js
const price = variants.reduce(
  (min, v) => (!min || Number(v.price.amount) < Number(min.amount) ? v.price : min),
  null,
)
```

**Accettazione:** test unitario con varianti a `"100.0"` e `"25.0"` (stringhe): il
risultato è `25.0`. La correzione è innocua anche se l'adapter converte già.

### T15 — Quantità non numeriche verso il fornitore  🟡

**File:** `state/useCartStore.js`, `add` e `setQuantity`.

`Math.min(NaN, room)` vale `NaN`, e `Math.min(-5, room)` vale `-5`: arrivano a Shopify,
che li rifiuta, e l'utente vede un errore generico. È lo stesso caso di
`?fps=Infinity` già corretto (§4): si risolve con `Number.isInteger`.

```js
const validQty = (q) => Number.isInteger(q) && q >= 0
add: (variantId, quantity = 1) => {
  if (!validQty(quantity) || quantity === 0) return Promise.resolve(false)
  // …resto invariato
},
setQuantity: (lineId, quantity) => {
  if (!validQty(quantity)) return Promise.resolve(false)
  return get().run(/* …invariato… */)
},
```

### T16 — Indietro del browser dopo ricarica o ritorno dalla cassa  🟡 (verificare a mano)

**File:** `state/backButton.js`.

Ogni livello aperto aggiunge una voce alla cronologia. Se la pagina viene **ricaricata**
con un livello aperto, o si torna dalla cassa Shopify senza bfcache, al nuovo
caricamento `depth` riparte da 0 ma le voci restano. Risultato: i primi «Indietro» non
fanno niente oppure ricaricano la scena 3D, invece di uscire dal sito.

**Prova manuale (Chrome desktop, Safari iOS):**
1. Apri il carrello, ricarica la pagina, premi Indietro una volta.
2. Apri il carrello, «Vai al pagamento», torna indietro da Shopify, premi Indietro.
Atteso: un solo Indietro ti porta alla pagina precedente al sito.

**Correzione candidata, da validare con la prova:** in `onPop`, se non c'è nessun
livello da chiudere e la voce di arrivo è una delle nostre, saltala.

```js
const onPop = (e) => {
  if (ignore) { ignore -= 1; return }
  depth = Math.max(0, depth - 1)
  const s = useAppStore.getState()
  if (s.dialogs.length) s.backDialog()
  else if (s.menuOpen) s.closeMenu()
  else if (s.focus.state === 'entering' || s.focus.state === 'focused') s.exitFocus()
  else if (e.state?.intoLayer) history.back()   // voce orfana: si salta
}
```

### T17 — Piccoli difetti di robustezza  🟢

- `showNotice`: `id = Date.now()` può ripetersi nello stesso millisecondo. Usa un
  contatore incrementale.
- `cycleProduct` con `count === 0` produce `NaN`. Aggiungi `if (!count) return`.
- `usePlayerStore.commands` cresce senza limite se il controller non consuma (contesto
  WebGL perso) e alla ripresa riesegue comandi vecchi. Svuota la coda quando
  `gpuLost` diventa `true`.

## Problemi trovati nell'adapter `commerce/shopify.js`

### T18 — Handle concatenati nella query, contro quanto dichiara la mappa  🟡

`getProducts` scrive `product(handle: ${JSON.stringify(h)})` dentro la stringa della
query. Oggi **non è sfruttabile**: gli handle vengono da `storeConfig`, scritto da noi, e
`JSON.stringify` produce una stringa GraphQL valida. Ma la mappa §4 dice «mai
concatenati nella stringa della query», e questo la contraddice. Va sistemato il
codice, non il documento.

```js
async getProducts(handles) {
  if (!handles.length) return []
  const decl = handles.map((_, i) => `$h${i}: String!`).join(', ')
  const fields = handles.map((_, i) => `p${i}: product(handle: $h${i}) { ${PRODUCT_FIELDS} }`).join('\n')
  const vars = Object.fromEntries(handles.map((h, i) => [`h${i}`, h]))
  const data = await request(`query Products($country: CountryCode, ${decl}) @inContext(country: $country) {
    localization { availableCountries { isoCode } }
    ${fields}
  }`, { country, ...vars })
  // …resto invariato
}
```

**Accettazione:** `grep -n 'JSON.stringify(h)' src/commerce` non restituisce niente. Gli
e2e con il catalogo restano verdi.

### T19 — Varianti scartate senza avviso  🟡 (diventa importante alla 8c)

`getProducts` scarta con `.filter((v) => v.size && v.color)` ogni variante la cui
etichetta su Shopify non coincide con `sizes[].label` o `colorways[].label`. Basta che il
cliente scriva «Medium» invece di «M» perché un capo risulti non disponibile, senza
nessun segnale.

```js
const mapped = p.variants.nodes.map((v) => ({ id: v.id, ...optionsOf(p.handle, v.selectedOptions),
  price: money(v.price), available: v.availableForSale }))
const dropped = mapped.filter((v) => !v.size || !v.color)
if (dropped.length) console.warn(`shopify: ${dropped.length} varianti di ${p.handle} senza taglia/colore corrispondenti`, dropped.map((v) => v.id))
// variants: mapped.filter((v) => v.size && v.color)
```
Alla 8c aggiungi a `e2e-phase8b` un controllo: **nessuna variante scartata** sul negozio
del cliente.

⚠️ **Nota per la 8f:** le opzioni si confrontano con le etichette in una sola lingua. Se
alle query dei prodotti si aggiunge `language`, Shopify restituisce valori tradotti e il
confronto si rompe.

### T20 — Campi delle policy interpolati dal config  🟢

`getPolicies` scrive `${p.field}` nella query. I nomi di campo non possono andare nelle
variabili, quindi è corretto così. Aggiungi però un'invariante di build: `field` deve
appartenere all'elenco chiuso dei campi policy dello `shop`
(`privacyPolicy`, `refundPolicy`, `shippingPolicy`, `termsOfService`,
`subscriptionPolicy`, `legalNotice`, `termsOfSale`, da verificare sulla versione API
in uso).

## Ottimizzazioni (facoltative)

- **T11** Chiamare `testBanner()` una sola volta e salvare il risultato in una costante.
- **T12** Raccogliere gli stili inline ripetuti (`fontSize`, `letterSpacing`) in classi
  di utilità.
- **T13** Annullamento della rimozione: «Rimosso · Annulla» per 5 secondi.

## Fuori dal codice, da far fare a una persona

- Valori dei token `--color-accent-flame`, `--color-text-secondary`, `.micro` e
  `--color-bg-raised`, per verificare il contrasto (minimo 4.5:1 per il testo normale).
- Impostazione IVA su Shopify (T9).
- Decisione A/B sul recesso (T10).

## Ordine consigliato dei commit

1. Fase 0, poi T1 e T2 (sicurezza)
2. T3, T4, T6, T7, T8 (accessibilità, un commit)
3. T5 (tocca adapter e mock)
4. T9 (copy)
5. T11 e T12 se c'è tempo

**Ordine aggiornato dopo la lettura dell'adapter:** T1-bis → T18 → T15 → accessibilità
(T3, T4, T6, T7, T8) → T5 → T19 → T9 → T16 (dopo la prova manuale) → T2, T17, T20.
