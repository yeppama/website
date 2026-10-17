# Commercio e schede

Questi file collegano il negozio 3D alla vendita vera e mostrano le "schede", cioè le finestre 2D che si aprono sopra la scena: scheda prodotto, carrello e pagine legali. La cartella `src/commerce/` parla con il **fornitore**, cioè il servizio che conosce prezzi, disponibilità e carrelli (oggi il negozio di prova finto oppure Shopify); la cartella `src/ui/` contiene le finestre che il visitatore vede. Regola generale: tutti i testi visibili vengono da `storeConfig.copy` (in `src/config/storeConfig.js`), mentre prezzi, varianti e disponibilità, quando il commercio è attivo, vengono **solo** dal fornitore.

## `src/commerce/index.js` (73 righe)

È il punto d'ingresso del commercio: decide quale fornitore usare (nessuno, quello di prova o Shopify) e lo crea una sola volta. Lo usano lo stato del carrello (`useCartStore.js`), lo stato delle pagine legali (`useLegalStore.js`) e le schede prodotto, carrello e legali. Si può cambiare in sicurezza il fornitore predefinito, ma lo si fa in `storeConfig.commerce.provider`, non qui; la logica di scelta e il "contratto" descritto nel commento vanno toccati solo insieme ai due fornitori.

**r. 1–3** `import { storeConfig } from '../config/storeConfig.js'` — Carica la configurazione del sito e le due funzioni che costruiscono i fornitori: quello finto (`mock.js`) e quello Shopify (`shopify.js`). "Importare" vuol dire prendere un pezzo di codice da un altro file per usarlo qui.

**r. 4–7** `/** Punto d'ingresso del commercio (Fase 8 ...` — Riga vuota e inizio del commento che spiega a cosa serve il file e rimanda al piano `docs/PLAN-8.md`. I commenti non vengono eseguiti: servono solo a chi legge.

**r. 8–15** `getProducts(handles) → [{ handle, title, variants ...` — Il "contratto": l'elenco delle funzioni che ogni fornitore deve offrire, con cosa ricevono e cosa restituiscono. `getProducts` dà il catalogo; ogni prodotto ha delle **varianti**, cioè le combinazioni concrete vendibili (es. "felpa, taglia M, nera"), ciascuna con prezzo e disponibilità. Poi le funzioni del **carrello** (l'elenco dei capi scelti dal visitatore, che vive presso il fornitore): crearlo, rileggerlo, aggiungere, cambiare quantità, togliere righe. Infine `getPolicies` per le pagine legali. "Asincrono" significa che la risposta arriva dopo un po' (passa dalla rete), non subito.

**r. 16–18** `cart = { id, lines: [{ id, variantId, quantity ...` — La forma di un carrello come la vede il sito: un identificativo, le righe (variante, quantità, nome, taglia, colore, prezzo), il numero totale di pezzi, il subtotale con valuta e l'indirizzo della cassa (`checkoutUrl`). Entrambi i fornitori devono restituire esattamente questa forma, così il resto del sito non deve sapere chi c'è dietro.

**r. 19–20** `const params = new URLSearchParams(...)` — Legge i parametri dell'indirizzo della pagina (la parte dopo `?`, ad esempio `?commerce=mock`). Il controllo su `window` evita errori quando il codice gira fuori dal browser (nei test). Segue una riga vuota.

**r. 21–26** `export function commerceMode() {` — Dice quale fornitore usare: `off` (nessuno), `mock` (prova) o `shopify`. Se nell'indirizzo c'è `?commerce=...` con uno di questi tre valori, vince quello (serve per le prove); altrimenti si usa `storeConfig.commerce.provider`, che oggi vale `off`.

**r. 27–32** `export function commerceCountry() {` — Il paese dell'acquirente, da cui dipendono prezzi e valuta su Shopify. Normalmente è `storeConfig.commerce.country` (oggi `IT`). Solo in modalità diagnosi (`?debug=...&country=US`) si può forzare un altro paese, e solo se è un codice di due lettere maiuscole.

**r. 33–35** `export const commerceLanguage = () => ...` — La lingua in cui chiedere i testi al fornitore (le pagine legali), ricavata dalla lingua del sito: da `it-IT` prende `IT`. Si cambia cambiando `meta.brand.locale` in storeConfig.

**r. 36–39** `let provider` — Una variabile che ricorda il fornitore già creato. All'inizio di `getProvider` si controlla: se esiste già (anche se vale "nessuno"), lo si restituisce subito, così il fornitore nasce una volta sola per tutta la visita.

**r. 40–41** `const mode = commerceMode()` — Decide la modalità e prende dalla configurazione la sezione `commerce` e l'elenco dei prodotti.

**r. 42–46** `if (mode === 'mock') {` — Modalità prova: crea il fornitore finto passandogli i prodotti, le impostazioni del negozio di prova, la quantità massima per riga, i titoli delle pagine legali (da `copy.legal.policies`). Con `&mockerror=1` nell'indirizzo il fornitore finto fallisce apposta, per provare i messaggi d'errore.

**r. 47–54** `} else if (mode === 'shopify') {` — Modalità Shopify: prende le impostazioni da `storeConfig.commerce.shopify`, ma dominio, token e versione dell'API possono essere sostituiti da variabili d'ambiente `VITE_SHOPIFY_*` (impostate su Vercel, senza modificare il codice). Il **token pubblico** è una "chiave di lettura" fornita da Shopify, pensata per stare nel sito: permette di leggere il catalogo e gestire carrelli, non di vedere ordini o clienti.

**r. 55–58** `provider = shopify.domain && shopify.storefrontToken` — Crea il fornitore Shopify solo se ci sono dominio e token; altrimenti niente fornitore (acquisti spenti) e un avviso nella console del browser (visibile solo agli sviluppatori).

**r. 59–61** `} else { provider = null }` — Qualsiasi altra modalità (cioè `off`): nessun fornitore. È lo stato attuale del sito in produzione.

**r. 62–64** `return provider` — Restituisce il fornitore scelto e chiude la funzione. Riga vuota.

**r. 65–66** `export const commerceActive = () => getProvider() !== null` — Risposta sì/no a "si può comprare?". La usa la scheda prodotto per decidere se mostrare il bottone vero d'acquisto. Riga vuota.

**r. 67–73** `export function testBanner() {` — Il testo dell'avviso "non si vende davvero" da mostrare in scheda e carrello: con il negozio di prova `copy.cart.mockBanner`, con un negozio Shopify segnato `testMode: true` `copy.cart.devStoreBanner`, altrimenti nessun avviso. Per toglierlo quando si vende davvero basta mettere `testMode: false` in config.

## `src/commerce/mock.js` (122 righe)

È il fornitore finto: imita Shopify ma tiene tutto nel browser, con un piccolo ritardo simulato, così carrello e interfaccia si provano senza account né pagamenti (`?commerce=mock`). Lo crea solo `commerce/index.js`. Si possono cambiare in config ritardo, chiave di salvataggio e testo segnaposto delle pagine legali (`storeConfig.commerce.mock`); la forma dei dati restituiti deve restare identica a quella del fornitore Shopify.

**r. 1–6** `/** Fornitore finto (Fase 8a): stesso contratto ...` — Commento: spiega che è un negozio simulato, salvato in memoria e nel `localStorage` (un piccolo archivio del browser che sopravvive al ricaricamento della pagina), e che prezzi e taglie sono quelli dimostrativi di storeConfig.

**r. 7–8** `const cents = (amount) => Math.round(amount * 100)` — Converte un prezzo in centesimi interi. Serve a sommare i prezzi senza gli errori di arrotondamento dei numeri decimali (es. 0,1 + 0,2). Riga vuota.

**r. 9** `export function createMockProvider({ products, mock, ...` — Inizio della funzione che costruisce il fornitore finto. Riceve i prodotti, le impostazioni del mock, la quantità massima, i titoli delle pagine legali e l'interruttore `fail` per simulare guasti.

**r. 10–11** `const catalog = new Map()` — Due "rubriche": `catalog` trova un prodotto dal suo handle (il nome-indirizzo del prodotto, es. `heavy-hoodie`), `variants` trova una variante dal suo identificativo.

**r. 12–13** `for (const p of products) {` — Scorre tutti i prodotti di storeConfig; salta quelli senza `commerce.handle` (non in vendita).

**r. 14–24** `const entry = { handle: p.commerce.handle, ...` — Costruisce la voce di catalogo: titolo = nome del prodotto, e una variante per ogni combinazione taglia × colore. L'identificativo è inventato (`mock:prodotto:taglia:colore`), il prezzo è quello di storeConfig e la disponibilità è quella della taglia (`sizes[].available`). Cambiando prezzi o taglie in config cambia anche il negozio di prova.

**r. 25–28** `catalog.set(entry.handle, entry)` — Mette la voce nella rubrica dei prodotti e ogni variante nella rubrica delle varianti (insieme a handle e titolo del prodotto). Fine del ciclo e riga vuota.

**r. 29–31** `let memory = {}` — Commento e variabile di riserva: i carrelli finti si salvano come quelli di Shopify; se il browser non permette di salvare (navigazione privata), restano solo in memoria finché la pagina è aperta.

**r. 32–34** `const load = () => {` — Legge tutti i carrelli salvati dal `localStorage` (sotto la chiave `mock.storageKey`); se non riesce, usa la copia in memoria.

**r. 35–38** `const save = (carts) => {` — Salva i carrelli: prima in memoria, poi nel `localStorage`; se il salvataggio fallisce non succede nulla di grave.

**r. 39** `const delay = () => new Promise(...)` — Attesa finta di `mock.latencyMs` millisecondi (oggi 250), per imitare il tempo di risposta di un server vero e vedere gli stati "in corso" dell'interfaccia.

**r. 40–41** `const guard = () => { if (fail) throw ... }` — Se è attiva la simulazione di guasto (`&mockerror=1`), ogni operazione fallisce con un errore. Riga vuota.

**r. 42–51** `const view = (cart) => {` — Trasforma un carrello salvato nella forma prevista dal contratto: per ogni riga recupera la variante e compila nome del prodotto, taglia, colore e prezzo.

**r. 52–53** `const currency = lines[0]?.merchandise.price.currency ...` — La valuta è quella della prima riga (o del primo prodotto, se il carrello è vuoto); il totale si calcola in centesimi moltiplicando prezzo per quantità.

**r. 54–62** `return { id: cart.id, lines, totalQuantity: ...` — Restituisce il carrello completo: righe, numero totale di pezzi, subtotale riportato in euro e l'indirizzo finto della cassa (`mock.checkoutUrl`). Riga vuota.

**r. 63–74** `const mutate = async (cartId, change) => {` — Schema comune a tutte le modifiche del carrello: attende, controlla il guasto simulato, carica i carrelli, trova quello giusto (errore se non esiste), applica la modifica, toglie le righe rimaste a quantità 0, salva e restituisce il carrello aggiornato. Riga vuota.

**r. 75–76** `return { name: 'mock',` — Inizio dell'oggetto "fornitore" restituito, con il suo nome.

**r. 77–81** `async getProducts(handles) {` — Catalogo: dopo l'attesa, restituisce solo i prodotti richiesti che esistono davvero.

**r. 82–87** `async getPolicies(policies) {` — Pagine legali finte: tutte quelle elencate in config, con il titolo preso da `copy.legal.policies` e lo stesso testo segnaposto (`mock.policyHtml`).

**r. 88–96** `async createCart() {` — Crea un carrello vuoto con un identificativo nuovo (numero progressivo più l'ora), lo salva e lo restituisce.

**r. 97–102** `async getCart(id) {` — Rilegge un carrello dal suo identificativo; se non esiste restituisce "nessuno" (`null`), come Shopify per un carrello scaduto.

**r. 103–111** `addLines: (cartId, lines) => mutate(cartId, (cart) => {` — Aggiunge capi: rifiuta varianti inesistenti o esaurite; se la variante è già nel carrello ne aumenta la quantità, altrimenti crea una riga nuova. In entrambi i casi la quantità non supera `maxQuantity` (oggi 10, in config).

**r. 112–117** `updateLines: (cartId, lines) => mutate(...` — Cambia la quantità di righe esistenti, tenendola fra 0 e il massimo. Una quantità 0 fa sparire la riga (grazie a `mutate`).

**r. 118–120** `removeLines: (cartId, lineIds) => mutate(...` — Toglie dal carrello le righe indicate.

**r. 121–122** `}` — Chiude l'oggetto fornitore e la funzione.

## `src/commerce/shopify.js` (183 righe)

È il fornitore vero: parla con la **Storefront API** di Shopify, cioè il "portone" pubblico con cui un sito esterno legge il catalogo e gestisce i carrelli di un negozio Shopify. Le richieste sono scritte in **GraphQL**, un linguaggio in cui si elenca esattamente quali dati si vogliono ricevere. Lo crea solo `commerce/index.js`; dominio, token e versione dell'API stanno in `storeConfig.commerce.shopify`. Da non toccare senza provarlo dal vivo (`e2e-phase8b.mjs`, `check:catalog`): i nomi dei campi devono corrispondere esattamente a quelli di Shopify; si possono invece aggiungere nomi di opzione in `optionNames` nel config.

**r. 1–11** `/** Fornitore Shopify (Fase 8b): Storefront API ...` — Commento: il sito usa il token pubblico del canale Headless (Shopify usato solo "dietro le quinte", con un sito proprio davanti); il pagamento avviene sulla cassa di Shopify, quindi nessun dato di carta passa dal sito. Spiega anche che taglie e colori di Shopify vengono riconosciuti confrontandoli con le etichette di storeConfig (`sizes[].label`, `colorways[].label`): in Shopify le opzioni devono chiamarsi come le etichette del config (es. taglia "M", colore "Black").

**r. 12–23** `const PRODUCT_FIELDS = ...` — Pezzo di richiesta GraphQL riusato: per ogni prodotto chiede handle, titolo e fino a 100 varianti con identificativo, disponibilità (`availableForSale`), prezzo con valuta e opzioni scelte (nome e valore, es. "Taglia: M"). Riga vuota.

**r. 24–43** `const CART_FIELDS = ...` — Pezzo di richiesta GraphQL per il carrello: identificativo, indirizzo della cassa, numero di pezzi, subtotale e fino a 100 righe, ognuna con quantità e dati della variante (prezzo, opzioni, handle e titolo del prodotto). Riga vuota.

**r. 44–45** `const money = (m) => ({ amount: Number(m.amount), ...` — Shopify manda gli importi come testo (es. "189.0"); questa funzione li trasforma in numero e rinomina la valuta nella forma usata dal sito. Riga vuota.

**r. 46** `export function createShopifyProvider({ products, shopify, ...` — Inizio della funzione che costruisce il fornitore. Riceve prodotti, impostazioni Shopify, paese, lingua; `fetchImpl` (il modo di fare richieste di rete) si può sostituire nei test; `timeoutMs` è il tempo massimo di attesa, 10 secondi.

**r. 47** `const endpoint = https://.../api/.../graphql.json` — L'indirizzo a cui si mandano tutte le richieste, composto da dominio del negozio e versione dell'API (oggi `2026-10`). La versione va aggiornata entro la sua scadenza (vedi config).

**r. 48** `const byHandle = new Map(products.filter(...` — Rubrica dei prodotti di storeConfig per handle, per ritrovare taglie e colori di un prodotto Shopify.

**r. 49–51** `const names = shopify.optionNames` — I nomi che in Shopify indicano taglia e colore (oggi `Taglia`/`Size` e `Colore`/`Color`, dal config) e una piccola funzione che confronta testi ignorando maiuscole e minuscole. Riga vuota.

**r. 52–54** `const optionsOf = (handle, selectedOptions) => {` — Commento e inizio della traduzione "variante Shopify → taglia e colore di storeConfig": prima trova il prodotto nel config.

**r. 55–57** `const pick = (accepted) => selectedOptions.find(...` — Fra le opzioni della variante Shopify prende il valore di quella che si chiama come una taglia e di quella che si chiama come un colore.

**r. 58** `const size = product?.sizes.find((s) => match(...` — Cerca nel config la taglia con la stessa etichetta e ne prende l'id; se non c'è, la taglia resta sconosciuta (`null`).

**r. 59–60** `const color = product?.colorways.find(...` — Stessa cosa per il colore. Eccezione: se il prodotto ha un solo colore e su Shopify non esiste un'opzione colore, si usa quell'unico colore.

**r. 61–63** `return { size, color }` — Restituisce taglia e colore tradotti; chiude la funzione. Riga vuota.

**r. 64–66** `async function request(query, variables = {}) {` — Funzione che manda una richiesta GraphQL. Prepara un "interruttore" che annulla la richiesta se dopo 10 secondi non è arrivata risposta.

**r. 67–76** `const res = await fetchImpl(endpoint, {` — Invia la richiesta (metodo POST) con il token pubblico nell'intestazione `X-Shopify-Storefront-Access-Token` e, nel corpo, la richiesta GraphQL e i suoi valori.

**r. 77** `if (!res.ok) throw new Error(shopify: HTTP ...)` — Se il server risponde con un errore (es. 401 token sbagliato, 404), la richiesta fallisce con un messaggio che riporta il codice.

**r. 78–80** `const json = await res.json()` — Legge la risposta; se Shopify segnala errori nella richiesta li raccoglie in un unico messaggio d'errore, altrimenti restituisce i dati.

**r. 81–85** `} finally { clearTimeout(timer) }` — In ogni caso, riuscita o no, spegne il conto alla rovescia dei 10 secondi. Chiude la funzione. Riga vuota.

**r. 86–90** `const view = (cart) => ({` — Converte un carrello Shopify nella forma del sito: identificativo, indirizzo della cassa, numero di pezzi e subtotale.

**r. 91–102** `lines: cart.lines.nodes.map((l) => {` — Converte ogni riga: handle e titolo del prodotto, taglia e colore tradotti con `optionsOf`, identificativo della variante, quantità e prezzo. Riga vuota.

**r. 103–106** `// Le mutazioni del carrello restituiscono userErrors ...` — Commento: una "mutazione" è una richiesta GraphQL che modifica qualcosa (qui il carrello). Shopify può rifiutarla (`userErrors`) oppure eseguirla solo in parte (`warnings`, es. merce esaurita aggiunta con quantità 0); in quel caso il sito non deve dire "aggiunto".

**r. 107–113** `const mutate = async (field, query, variables) => {` — Schema comune delle modifiche: manda la richiesta aggiungendo il paese, se ci sono `userErrors` fallisce con il loro messaggio, altrimenti restituisce il carrello convertito più l'elenco degli avvisi (`warnings`), che lo stato del carrello trasforma nel testo `copy.cart.stockWarning`. Riga vuota.

**r. 114–116** `return { name: 'shopify',` — Inizio dell'oggetto fornitore restituito, col suo nome. Riga vuota.

**r. 117–120** `async getProducts(handles) {` — Catalogo: se non si chiede nulla restituisce un elenco vuoto; altrimenti costruisce una richiesta con un "alias" per ogni handle (`p0`, `p1`, ...), così tutti i prodotti arrivano con una sola chiamata.

**r. 121–124** `const data = await request(query Products($country ...` — Richiesta GraphQL del catalogo: `@inContext(country)` chiede prezzi e disponibilità per il paese dell'acquirente; `localization` chiede in quali paesi il negozio vende.

**r. 125–131** `const countries = data.localization.availableCountries...` — Commento e controllo: se il negozio non vende nel paese configurato, Shopify risponderebbe con prezzi di un altro mercato e poi segnerebbe tutto esaurito al carrello. Meglio fallire subito: il sito mostrerà i capi come "non disponibili". Se succede, va attivato il mercato in Shopify (Impostazioni → Mercati).

**r. 132–143** `return handles.map((_, i) => data[p${i}]).filter(Boolean)...` — Prende i prodotti trovati (scarta gli handle che Shopify non conosce) e per ognuno elenca le varianti con taglia e colore tradotti, prezzo e disponibilità. Le varianti di cui non si riconosce taglia o colore vengono scartate: se in Shopify un'etichetta è scritta diversamente dal config, quella variante semplicemente non compare. Riga vuota.

**r. 144–148** `createCart: () => mutate('cartCreate', ...` — Crea un carrello vuoto su Shopify indicando il paese dell'acquirente (`buyerIdentity.countryCode`), così valuta e prezzi sono quelli giusti. Riga vuota.

**r. 149–153** `async getCart(id) {` — Rilegge un carrello esistente; se Shopify risponde "nessuno" (carrello scaduto o già pagato) restituisce `null`. Riga vuota.

**r. 154–158** `addLines: (cartId, lines) => mutate('cartLinesAdd', ...` — Aggiunge varianti al carrello. Traduce i nomi dei campi: per Shopify la variante si chiama `merchandiseId`. Riga vuota.

**r. 159–163** `updateLines: (cartId, lines) => mutate('cartLinesUpdate', ...` — Cambia la quantità di righe esistenti (per Shopify la riga si identifica con `id`). Riga vuota.

**r. 164–166** `// Pagine legali (preparazione della 8d): ...` — Commento: i testi legali li scrive il venditore su Shopify; si chiedono nella lingua del sito e, se mancano in quella lingua, Shopify risponde nella sua lingua predefinita.

**r. 167–171** `async getPolicies(policies) {` — Costruisce la richiesta chiedendo titolo e testo di ogni pagina elencata in `storeConfig.commerce.policies` (es. `privacyPolicy`), nel paese e nella lingua del sito.

**r. 172–177** `return policies .map(...) .filter((p) => p.body?.trim())` — Restituisce, nell'ordine del config, solo le pagine che hanno davvero un testo, con id del sito, titolo e testo (HTML, da ripulire prima di mostrarlo). Riga vuota.

**r. 178–181** `removeLines: (cartId, lineIds) => mutate(...` — Toglie righe dal carrello.

**r. 182–183** `}` — Chiude l'oggetto fornitore e la funzione.

## `src/ui/dialog/DialogHost.jsx` (87 righe)

È il contenitore unico di tutte le schede: mostra la scheda in cima alla "pila" delle finestre aperte (prodotto, Lookbook, carrello, pagina legale), con l'intestazione Indietro/Chiudi. È un **componente React**, cioè un pezzo di interfaccia scritto come funzione che restituisce l'HTML da disegnare e si ridisegna da solo quando i dati cambiano; viene montato una volta nell'interfaccia principale. Si possono cambiare in sicurezza i testi (in `copy.dialog`) e l'aspetto (classi); la pila, la trappola del focus e l'ordine dei contenuti vanno toccati con cautela perché garantiscono che ESC e Tab funzionino.

**r. 1–9** `import { useEffect, useId, useRef } from 'react'` — Carica gli strumenti di React, la configurazione, lo stato dell'app (`useAppStore`, un archivio di stato condiviso fatto con la libreria Zustand), la trappola del focus, il bottone comune e le quattro schede che può mostrare.

**r. 10–19** `/** Contenitore unico delle finestre della Fase 5 ...` — Commento: su telefono la finestra occupa tutto lo schermo, da tablet in su è un pannello centrato, su telefono in orizzontale torna a tutto schermo; mentre è aperta il movimento nel negozio è sospeso; ESC e "Indietro" tolgono un livello, "Chiudi" e il clic sul fondo li tolgono tutti.

**r. 20** `export default function DialogHost({ device }) {` — Inizio del componente. Riceve `device`, la descrizione del dispositivo (es. se è touch).

**r. 21–23** `const dialogs = useAppStore((s) => s.dialogs)` — Legge dallo stato la pila delle schede aperte e i comandi "torna indietro di uno" e "chiudi tutto".

**r. 24–28** `const panel = useRef(null)` — Riferimenti al pannello e all'area che scorre, un identificativo unico per il titolo (serve ai lettori di schermo), se c'è almeno una scheda aperta e quale è in cima.

**r. 29–30** `useFocusTrap(panel, open, backDialog)` — Riga vuota e attivazione della trappola del focus: con la finestra aperta, il tasto Tab gira solo fra i suoi elementi ed ESC chiama "Indietro".

**r. 31–38** `useEffect(() => {` — Quando cambia la scheda in cima (altro capo, Indietro), riporta lo scorrimento all'inizio e mette il focus sul titolo, così chi usa un lettore di schermo sente il nome della nuova scheda. `useEffect` è un "effetto": codice che React esegue dopo aver disegnato.

**r. 39–40** `if (!open) return null` — Riga vuota; se non c'è nessuna scheda aperta il componente non disegna nulla.

**r. 41–48** `const copy = storeConfig.copy` — Prende i testi del config, individua il prodotto o la voce del Lookbook da mostrare (per id) e sceglie la piccola scritta d'intestazione ("eyebrow"): `copy.product.eyebrow`, `copy.cart.title`, `copy.legal.eyebrow` o `copy.lookbook.eyebrow`. Riga vuota.

**r. 49–51** `return ( <div className="fixed inset-0 flex ...` — Riga vuota e inizio del disegno: un livello fisso che copre lo schermo, sopra menu e Focus (`--z-dialog`). Le scritte in `className` sono **classi Tailwind**: parole brevi che danno ciascuna uno stile (es. `fixed` = fermo sullo schermo, `md:p-6` = margine interno da tablet in su, `short:` = solo su schermo basso in orizzontale).

**r. 52–58** `<button type="button" className="absolute inset-0 ...` — Il fondo scuro e sfocato dietro la finestra: è un bottone invisibile che, se toccato, chiude tutte le schede. Il suo nome per i lettori di schermo è `copy.dialog.close`; è escluso dal giro del Tab.

**r. 59–67** `<div ref={panel} tabIndex={-1} role="dialog" ...` — Il pannello della finestra, dichiarato come finestra modale per l'accessibilità e collegato al titolo. Le classi lo fanno a tutto schermo su telefono, centrato con bordo e larghezza massima da tablet, di nuovo a tutto schermo su schermo basso.

**r. 68–72** `<div className="flex items-center justify-between ...` — Barra d'intestazione, lato sinistro: il bottone "← Indietro" (solo se ci sono almeno due schede impilate, testo `copy.dialog.back`) e la scritta d'intestazione.

**r. 73–77** `{!device.isTouch && <p className="micro hidden sm:block">...` — Lato destro: il suggerimento "ESC per chiudere" (`copy.dialog.closeHint`), solo su dispositivi non touch e schermi non piccoli, e il bottone "Chiudi". Chiude la barra.

**r. 78** `<div ref={scroller} className="min-h-0 flex-1 ...` — L'area del contenuto, che scorre in verticale se il contenuto è più alto dello schermo.

**r. 79–82** `{product && <ProductSheet key={product.id} ...` — Sceglie quale scheda mostrare secondo il tipo in cima alla pila: prodotto, Lookbook, carrello o pagina legale. A tutte passa l'identificativo del titolo. Per aggiungere un nuovo tipo di scheda andrebbe aggiunta qui una riga (e l'intestazione alle r. 45–48).

**r. 83–87** `</div>` — Chiude area del contenuto, pannello e livello esterno; fine del componente.

## `src/ui/product/ProductSheet.jsx` (206 righe)

È la scheda prodotto: immagini, nome, prezzo, colori, taglie, bottone d'acquisto, dettagli e collegamenti al Lookbook. La apre `DialogHost` quando in cima alla pila c'è un prodotto. Nome, descrizione, dettagli, taglie e colori vengono dal prodotto in storeConfig, i testi fissi da `copy.product` e `copy.cart`; con il commercio attivo prezzo e disponibilità vengono solo dal fornitore. Si cambiano in sicurezza testi e dati nel config e l'aspetto con le classi; la logica che sceglie prezzo e variante va toccata con attenzione. Difetto noto (CONTEXT.md): la nota `copy.legal.priceNotice` ("Nessun acquisto è possibile") compare anche col commercio attivo; è da sistemare nella Fase 8c.

**r. 1–9** `import { useEffect, useState } from 'react'` — Carica gli strumenti di React, la configurazione, la funzione che scrive i prezzi (`formatPrice`), lo stato dell'app e del carrello, le funzioni del commercio, l'immagine segnaposto, il bottone comune e il gruppo di opzioni.

**r. 10–16** `/** Scheda prodotto 2D. Senza commercio attivo ...` — Commento: senza commercio tutto viene da storeConfig e il bottone d'acquisto è spento e dice perché; con un fornitore, prezzo e varianti vengono solo da lui, e se non risponde il capo è "non disponibile", mai col prezzo del config.

**r. 17** `export default function ProductSheet({ product, headingId }) {` — Inizio del componente; riceve il prodotto (dal config) e l'identificativo da dare al titolo.

**r. 18–20** `const { copy, features, meta } = storeConfig` — Prende testi, interruttori delle funzioni e dati del brand; `t` è la scorciatoia per `copy.product`; `openDialog` serve ad aprire altre schede.

**r. 21–23** `const [mediaId, setMediaId] = useState(product.media[0].id)` — Tre "stati" della scheda (valori che, cambiando, ridisegnano la scheda): l'immagine mostrata (all'inizio la prima), il colore scelto (all'inizio il primo) e la taglia scelta (all'inizio nessuna).

**r. 24–27** `const media = product.media.find(...)` — Riga vuota; trova l'immagine scelta, le proporzioni della sua forma (es. 4:5, da `placeholders.ratios`) e quelle della cornice della scheda (`placeholders.productFrame`, oggi 4:5).

**r. 28–30** `const colorway = product.colorways.find(...)` — Trova il colore e la taglia scelti e le voci del Lookbook in cui compare il capo (`lookbookIds`).

**r. 31–32** `const checkout = features.checkout` — L'interruttore dell'acquisto nel config (usato quando il commercio è spento) e la scorciatoia `tc` per i testi del carrello.

**r. 33–41** `const active = commerceActive()` — Riga vuota e sezione commercio: si chiede se c'è un fornitore e si leggono dallo stato del carrello la voce di catalogo di questo capo (cercata per handle), lo stato del catalogo (in caricamento, pronto, in errore), se un'operazione è in corso, l'ultimo errore e i comandi "aggiungi" e "ricarica catalogo".

**r. 42–48** `useEffect(() => {` — All'apertura della scheda, con commercio attivo: cancella un eventuale errore rimasto da un altro capo e, se il catalogo era andato in errore, prova a ricaricarlo.

**r. 49** `const [added, setAdded] = useState(false)` — Ricorda se il capo è appena stato aggiunto, per mostrare la conferma.

**r. 50** `const unavailable = active && (catalogStatus === 'error' ...` — Il capo è "non disponibile" se il catalogo è in errore oppure è arrivato ma questo capo non c'è.

**r. 51** `const inStock = (sid, cid) => ...` — Controlla se esiste una variante disponibile per una certa taglia e un certo colore.

**r. 52** `const sizeOptions = active && entry ? ...` — L'elenco delle taglie da mostrare: col commercio attivo la disponibilità di ogni taglia viene dal fornitore, per il colore scelto; altrimenti si usa quella del config.

**r. 53** `const variant = entry?.variants.find(...` — La variante esatta corrispondente a taglia e colore scelti (se c'è).

**r. 54–55** `const shownPrice = !active ? product.price` — Il prezzo da mostrare: senza commercio quello del config; con commercio quello della variante scelta o, se la taglia non è ancora scelta, di una variante dello stesso colore; se il fornitore non l'ha dato, nessun prezzo.

**r. 56–62** `const chooseColor = (id) => {` — Riga vuota; cosa succede scegliendo un colore: lo si memorizza, si toglie la conferma "aggiunto" e, se la taglia scelta è esaurita nel nuovo colore, la si deseleziona.

**r. 63** `const chooseSize = (id) => { setSizeId(id); setAdded(false) }` — Scegliendo una taglia la si memorizza e si toglie la conferma.

**r. 64–67** `const addToCart = async () => {` — Aggiunta al carrello: solo se la variante esiste ed è disponibile; se il fornitore conferma, mostra "aggiunto".

**r. 68–74** `return ( ... <div className="grid gap-6 md:grid-cols-...` — Riga vuota, commento sulla disposizione e griglia principale: su telefono nome e prezzo stanno sopra le immagini; da tablet le immagini occupano la colonna sinistra; su telefono in orizzontale l'immagine resta ferma a sinistra e a destra vengono prima colori, taglie e acquisto.

**r. 75–77** `<div className="md:col-start-2 md:row-start-1 ...` — Blocco del titolo (colonna destra da tablet) e riga che, su schermo basso, mette etichette e codici sulla stessa linea.

**r. 78–84** `{product.badges.length > 0 && (` — Le etichette del capo (es. NEW, ARCHIVE, da `badges` nel config), bordate in arancio.

**r. 85–86** `<p className="micro">{product.category} · ...` — Categoria, collezione e codice (SKU) del capo, dal config; chiude il blocco delle etichette.

**r. 87–91** `<h2 id={headingId} tabIndex={-1}` — Il nome del capo come titolo grande; la dimensione si adatta allo schermo (`clamp`). Riceve il focus all'apertura della scheda.

**r. 92–95** `<p className="mt-3 font-mono ..." data-testid="product-price">` — Il prezzo, scritto con `formatPrice` nella lingua del sito (es. "189 €"); se non c'è prezzo mostra "—" quando il capo non è disponibile, "…" mentre si carica. `data-testid` è un'etichetta usata solo dai test automatici. Chiude il blocco.

**r. 96–99** `<section aria-label={t.media} data-testid="product-media"` — Riga vuota e inizio della sezione immagini, con la proporzione della cornice; su schermo basso resta ferma in alto e la sua larghezza si calcola dall'altezza disponibile (`--sheet-frame-h`).

**r. 100–109** `<PlaceholderImage ratio={media.ratio} ...` — L'immagine principale: oggi un segnaposto disegnato con forma, etichetta (immagine · colore) e categoria. Su schermo basso si adatta in altezza o in larghezza secondo le proporzioni. Quando arriveranno le foto vere questo sarà il punto da sostituire.

**r. 110–113** `{product.media.length > 1 && (` — Se il capo ha più di un'immagine, mostra una fila di miniature (4 colonne; su schermo basso quante ne stanno).

**r. 114–120** `<button type="button" aria-pressed={m.id === mediaId}` — Ogni miniatura è un bottone che mostra quell'immagine; quella scelta ha il bordo arancio.

**r. 121–127** `<PlaceholderImage ratio="1:1" variant={m.variant} ...` — La miniatura quadrata in versione compatta; chiude elenco e sezione immagini.

**r. 128–130** `<section className="flex flex-col gap-5 ...` — Riga vuota, inizio della sezione informazioni e descrizione del capo dal config.

**r. 131–143** `<OptionGroup label={...t.colorways...}` — Riga vuota e scelta del colore: etichetta "Colore · nome scelto", un bottone per colore con un quadratino del colore (`swatch` dal config) e il nome.

**r. 144–151** `<OptionGroup label={t.sizes} options={sizeOptions}` — Riga vuota e scelta della taglia; le taglie esaurite si vedono barrate e il lettore di schermo dice "Esaurito" (`t.soldOut`).

**r. 152–156** `<div className="border-t border-line-subtle pt-4">` — Riga vuota e riepilogo della scelta ("Selezione: colore · taglia" oppure l'invito a scegliere la taglia), annunciato ai lettori di schermo quando cambia.

**r. 157–162** `{active ? ( <> <Button variant="primary" ...` — Col commercio attivo: il bottone principale d'acquisto. È spento se il capo non è disponibile, se un'operazione è in corso o se la variante non è acquistabile; il suo testo cambia: "Aggiunta in corso", "Scegli una taglia", "Esaurito" o "Aggiungi al carrello" (tutti da `copy.cart`).

**r. 163–168** `{unavailable && (` — Se il capo non è disponibile: messaggio rosso `copy.cart.unavailable` e, se il catalogo è in errore, un bottone "Riprova".

**r. 169** `{cartError && !unavailable && <p ... role="alert"` — Mostra in rosso l'ultimo errore del carrello (testo da `copy.cart`, es. "Il carrello non ha risposto").

**r. 170–175** `{added && (` — Dopo un'aggiunta riuscita: "Aggiunto al carrello" e un bottone che apre il carrello.

**r. 176–177** `{testBanner() && <p className="micro mt-3" ...` — L'avviso di negozio di prova o di sviluppo, se c'è; chiude il ramo "commercio attivo".

**r. 178–182** `) : ( <Button ... disabled={!checkout.enabled}>` — Senza commercio: un bottone spento con scritto "In arrivo nella Fase N" (`copy.hints.comingInPhase` più `features.checkout.availableInPhase`).

**r. 183–184** `<p className="micro mt-3" style={{ opacity: 0.7 }}>` — La nota sui prezzi `copy.legal.priceNotice`, mostrata sempre (vedi difetto noto sopra). Chiude il blocco acquisto.

**r. 185–191** `<p className="micro mb-2">{t.details}</p>` — Riga vuota e i dettagli del capo dal config, uno per riga con un trattino.

**r. 192–202** `{features.lookbook.enabled && lookbooks.length > 0 && (` — Riga vuota; se il Lookbook è attivo e il capo compare in qualche voce, un bottone per ognuna che apre quella scheda del Lookbook.

**r. 203–206** `</section>` — Chiude sezione informazioni e griglia; fine del componente.

## `src/ui/product/OptionGroup.jsx` (58 righe)

È il gruppo di bottoni per una scelta esclusiva (una sola taglia, un solo colore), costruito per funzionare bene anche da tastiera e con i lettori di schermo. Lo usa `ProductSheet.jsx` due volte. Si possono cambiare in sicurezza le classi dell'aspetto; la gestione di frecce e Tab segue uno standard di accessibilità (WAI-ARIA) ed è meglio non toccarla.

**r. 1–8** `import { useId, useRef } from 'react'` — Carica gli strumenti di React e commento: un solo punto di Tab per tutto il gruppo, frecce per spostarsi e scegliere, opzioni non disponibili visibili ma saltate; all'inizio nessuna scelta è obbligatoria.

**r. 9** `export default function OptionGroup({ label, ...` — Inizio del componente; riceve etichetta, opzioni, valore scelto, cosa fare quando cambia, il testo per "non disponibile" e, facoltativo, un modo diverso di disegnare ogni opzione.

**r. 10–13** `const labelId = useId()` — Identificativo dell'etichetta, riferimenti ai bottoni, l'elenco delle sole opzioni disponibili e quale bottone riceve il Tab (quello scelto, o il primo disponibile).

**r. 14–23** `const onKeyDown = (e) => {` — Riga vuota e gestione delle frecce: destra/giù vanno avanti, sinistra/su indietro, girando in tondo fra le sole opzioni disponibili; l'opzione raggiunta viene scelta e riceve il focus.

**r. 24–28** `return ( <div> <p id={labelId} className="micro mb-2">` — Riga vuota, l'etichetta del gruppo e il contenitore dichiarato come gruppo di scelta (`radiogroup`), con i bottoni affiancati che vanno a capo se serve.

**r. 29–32** `{options.map((o) => {` — Per ogni opzione calcola se è non disponibile (`off`) e se è quella scelta.

**r. 33–43** `<button key={o.id} ... role="radio" aria-checked={checked}` — Il bottone dell'opzione: per i lettori di schermo è un "radio" scelto o no, segnato come disattivato se non disponibile (con nome "M, Esaurito"); riceve il Tab solo se è il punto d'ingresso del gruppo; al clic sceglie l'opzione solo se è disponibile.

**r. 44–49** `className={'inline-flex items-center justify-center ...` — Aspetto: bordo e testo arancio se scelta, bordo grigio altrimenti; barrata e sbiadita se non disponibile. Altezza e larghezza minime adatte al tocco (`--touch-min`).

**r. 50–58** `{renderOption ? renderOption(o) : o.label}` — Contenuto del bottone (il disegno speciale se fornito, altrimenti l'etichetta); poi chiude bottone, elenco, contenitori e componente.

## `src/ui/cart/CartSheet.jsx` (109 righe)

È la scheda del carrello: righe con quantità modificabili, subtotale, bottone per la cassa. La apre `DialogHost` (tipo `cart`), a cui si arriva da `CartButton` o dalla conferma "Apri il carrello" nella scheda prodotto. Righe, quantità, prezzi e totale vengono dal fornitore; da storeConfig solo i nomi leggibili di taglia e colore, l'immagine e i testi (`copy.cart`). Si cambiano in sicurezza testi e aspetto; la quantità massima si cambia in `storeConfig.commerce.maxQuantity`.

**r. 1–9** `import { useEffect, useState } from 'react'` — Carica React, la configurazione, `formatPrice`, le funzioni del commercio, lo stato dell'app e del carrello, l'immagine segnaposto e il bottone.

**r. 10–11** `const productByHandle = new Map(storeConfig.products...` — Rubrica dei prodotti del config per handle, per ritrovare dal carrello il capo corrispondente (nomi di taglia e colore, immagine). Riga vuota.

**r. 12–16** `/** Carrello (Fase 8a). È una scheda della pila ...` — Commento: il carrello è una scheda come le altre (blocca il movimento, trattiene il focus, ESC la chiude) e i suoi numeri vengono dal fornitore.

**r. 17–19** `export default function CartSheet({ headingId }) {` — Inizio del componente; all'apertura cancella un eventuale errore rimasto da una scheda prodotto.

**r. 20–22** `const t = storeConfig.copy.cart` — Testi del carrello, lingua del sito per i prezzi e quantità massima per riga.

**r. 23–29** `const cart = useCartStore((s) => s.cart)` — Legge dallo stato il carrello, se un'operazione è in corso, l'ultimo errore, i comandi "cambia quantità" e "rimuovi", e i comandi per aprire o chiudere schede.

**r. 30–32** `const [checkoutNote, setCheckoutNote] = useState(null)` — Un messaggio da mostrare sotto il bottone della cassa (solo nel negozio di prova), le righe del carrello (vuote se non c'è carrello) e se siamo nel negozio di prova.

**r. 33–39** `const checkout = () => {` — Riga vuota e azione "Vai al pagamento": se manca l'indirizzo della cassa non fa nulla; nel negozio di prova mostra `copy.cart.mockCheckout` invece di andare altrove; altrimenti porta il visitatore alla cassa di Shopify, dove paga.

**r. 40–50** `return ( <div className="mx-auto grid max-w-2xl gap-6" ...` — Riga vuota e inizio del disegno: colonna centrata, segnata come "occupata" durante le operazioni; in alto l'eventuale avviso di prova e il titolo `copy.cart.title`.

**r. 51–56** `{lines.length === 0 ? (` — Riga vuota; se il carrello è vuoto: il testo `copy.cart.empty` e un bottone "Continua a esplorare" che chiude le schede.

**r. 57–59** `) : ( <> <ul className="grid gap-px bg-line-subtle" ...` — Altrimenti, l'elenco delle righe separate da una linea sottile.

**r. 60–64** `{lines.map((line) => {` — Per ogni riga ritrova nel config il prodotto, la taglia e il colore corrispondenti.

**r. 65–67** `<li key={line.id} className="grid ...` — La riga: miniatura a sinistra, testo a destra e, da schermi non piccoli, i comandi a destra. La miniatura è il segnaposto della prima immagine del capo.

**r. 68–73** `<button type="button" onClick={() => product && openDialog(...` — Il nome del capo (dal fornitore) è un bottone che apre la sua scheda prodotto.

**r. 74–76** `{size?.label ?? line.merchandise.size}` — Taglia e colore con le etichette del config (se non trovate, l'id) e il prezzo unitario dal fornitore; chiude il blocco testo.

**r. 77–83** `<div className="col-span-2 flex items-center gap-2 ...` — Comandi della quantità: "−" (portando la quantità a 0 la riga si toglie), il numero, "+" (spento al massimo, con il suggerimento `copy.cart.maxReached`). Tutti spenti durante un'operazione; i nomi per i lettori di schermo includono il nome del capo.

**r. 84–90** `<Button className="ml-auto sm:ml-2" disabled={pending} ...` — Il bottone "Rimuovi" della riga; poi chiude comandi, riga ed elenco.

**r. 91–98** `<div className="border-t border-line-subtle pt-4">` — Riga vuota e blocco del totale: l'etichetta "Subtotale" e l'importo dato dal fornitore, scritto con `formatPrice`.

**r. 99–102** `<p className="micro mt-2">{t.taxNote}</p>` — La nota su IVA e spedizione (`copy.cart.taxNote`), il bottone "Vai al pagamento" (spento durante le operazioni) e l'eventuale messaggio del negozio di prova; chiude il blocco.

**r. 103–109** `{error && <p className="micro" role="alert" ...` — Chiude il ramo con le righe; mostra in rosso l'ultimo errore del carrello (testo da `copy.cart`); chiude il contenitore e il componente.

## `src/ui/cart/CartButton.jsx` (24 righe)

È il bottone "Carrello" con il numero di pezzi, mostrato nell'HUD (i comandi sopra la scena) e nel menu. Al clic apre la scheda del carrello. Si cambiano in sicurezza testo (`copy.cart.open`) e aspetto; la soglia dei 400 px decide quando la parola diventa un'icona.

**r. 1–4** `import { storeConfig } from '../../config/storeConfig.js'` — Carica configurazione, stato dell'app, stato del carrello e il bottone comune.

**r. 5–10** `/** Accesso al carrello dall'HUD e dal menu ...` — Riga vuota e commento: sotto i 400 px di larghezza la parola è sostituita da una piccola borsa disegnata, perché accanto a "Menu" su un telefono da 320 px usciva dallo schermo; il nome resta per i lettori di schermo.

**r. 11–14** `export default function CartButton({ className = '' }) {` — Inizio del componente: legge il numero totale di pezzi nel carrello (0 se non c'è carrello), il comando per aprire schede e i testi del carrello.

**r. 15–16** `onClick={() => openDialog('cart', 'cart')}` — Il bottone: al clic apre la scheda del carrello; il nome accessibile è "Carrello, N".

**r. 17–19** `<svg className="hidden h-4 w-4 ..." viewBox="0 0 16 16"` — L'icona della borsa, disegnata con due linee; visibile solo sotto i 400 px.

**r. 20–21** `<span className="...:hidden">{t.open}</span>` — La parola "Carrello" (nascosta sotto i 400 px) e il numero di pezzi, in arancio quando è maggiore di zero.

**r. 22–24** `</Button>` — Chiude il bottone e il componente.

## `src/ui/legal/LegalSheet.jsx` (42 righe)

È la scheda di una pagina legale (privacy, recesso, spedizioni...). Il testo non è scritto nel sito: è quello pubblicato dal venditore su Shopify, ripulito da `sanitizeHtml` prima di essere mostrato. La apre `DialogHost` (tipo `legal`) dal menu. Si cambiano in sicurezza i testi di contorno (`copy.legal`); i testi legali veri si cambiano su Shopify (Impostazioni → Informative), non qui; il filtro di pulizia non va mai tolto.

**r. 1–6** `import { useEffect, useMemo } from 'react'` — Carica React, la configurazione, lo stato delle pagine legali (`useLegalStore`), la modalità del commercio, il filtro `sanitizeHtml` e il bottone.

**r. 7–12** `/** Una pagina legale nella pila delle schede ...` — Riga vuota e commento: il testo è quello del venditore, ripulito prima di entrare nella pagina.

**r. 13–17** `export default function LegalSheet({ id, headingId }) {` — Inizio del componente; riceve l'id della pagina (es. `privacy`). Legge i testi `copy.legal`, lo stato del caricamento, la pagina richiesta fra quelle arrivate e il comando di caricamento.

**r. 18** `useEffect(() => { load() }, [load])` — All'apertura chiede le pagine legali al fornitore (se sono già arrivate non le richiede di nuovo).

**r. 19** `const html = useMemo(() => ... sanitizeHtml(policy.body)` — Ripulisce il testo HTML del venditore: tiene solo paragrafi, elenchi, titoletti, link sicuri e poco altro, togliendo script, immagini e moduli. Il calcolo si rifà solo se la pagina cambia.

**r. 20–27** `return ( <article className="mx-auto max-w-2xl">` — Riga vuota e inizio del disegno: colonna centrata con il titolo, che è quello dato da Shopify oppure, finché non arriva, quello di `copy.legal.policies`.

**r. 28–30** `{commerceMode() === 'mock' && (` — Nel negozio di prova, un avviso in arancio (`copy.legal.mockNotice`) che il testo è un segnaposto.

**r. 31** `{(status === 'idle' || status === 'loading') && ...` — Durante il caricamento mostra `copy.legal.loading` ("Caricamento").

**r. 32–37** `{status === 'error' && (` — Se il caricamento fallisce: messaggio rosso `copy.legal.unavailable` e un bottone "Riprova".

**r. 38** `{status === 'ready' && !policy && <p ...>{t.missing}</p>}` — Se le pagine sono arrivate ma questa non è pubblicata su Shopify, mostra il testo `copy.legal.missing`.

**r. 39** `<div className="legal-prose" dangerouslySetInnerHTML` — Inserisce nella pagina il testo legale già ripulito. Il nome "dangerously" ricorda che inserire HTML esterno è rischioso: per questo passa sempre prima da `sanitizeHtml`.

**r. 40–42** `</article>` — Chiude l'articolo e il componente.
