# PLAN-8.md — Fase 8: e-commerce reale

Versione 0.2 · 2026-10-16 · Stato: **8a consegnata**; **8b chiusa**: dal vivo con l'Italia (catalogo, carrello, cassa in EUR: 11/11) e ordine di prova #1001 pagato col gateway di test (fatto a mano dall'utente: i campi carta sono bloccati dal proxy del container). Prossima: 8c, serve il negozio del cliente

Livello di certezza: **[Certo]** verificato nel codice o deciso dall'utente · **[Probabile]** conoscenza
consolidata, da riverificare al momento dell'implementazione · **[Ipotesi]** da confermare.
Su Shopify valgono le versioni e le regole in vigore quando si implementa: questo piano non le dà per fisse.

## 0. Decisioni dell'utente (2026-10-16)

| # | Decisione | Scelta |
|---|---|---|
| D8-1 | Piattaforma | **Shopify headless**: il negozio 3D resta com'è; prodotti, magazzino, prezzi, IVA, pagamenti e ordini stanno su Shopify; si paga sulla cassa di Shopify |
| D8-2 | Proprietario dell'account | **Il cliente, a suo nome.** Incassi, fatture e responsabilità del venditore sono del brand; all'agenzia un accesso da collaboratore |
| D8-3 | Mercati | **Unione Europea**, prezzi in EUR |
| D8-4 | Esperienza d'acquisto | **Carrello**: si aggiungono capi mentre si gira il negozio, si paga una volta sola |

## 1. Cosa blocca oggi, e cosa no

| Serve | Da chi | Blocca |
|---|---|---|
| Un negozio Shopify di sviluppo (gratuito, account Partner) con un token Storefront API | **agenzia (tu)** | 8b. Permette di costruire e provare tutto prima che il cliente apra il suo |
| Il negozio Shopify del cliente, col canale "Headless" e un token Storefront API | cliente | 8c |
| Catalogo reale caricato su Shopify (capi, varianti taglia × colore, prezzi, foto, giacenze) | cliente (`docs/CONTENUTI.md`) | 8c |
| Dati del venditore e testi legali: ragione sociale, P.IVA, sede, condizioni di vendita, recesso, privacy, spedizioni e resi | cliente, con il suo consulente | 8d e la messa in vendita |
| Configurazione fiscale UE (IVA per paese di destinazione, regime OSS se superate le soglie) | commercialista del cliente | la messa in vendita |
| Il dominio | cliente | il lancio |

**Si può fare subito, senza nessuno di questi: 8a** (carrello e interfaccia con un fornitore finto).

## 2. Architettura

```
storeConfig.products[i]                Shopify (fonte di verità del commercio)
  id, displayId, categoria 3D   ─┐
  commerce.handle ───────────────┼──►  product(handle) → varianti, prezzi, disponibilità, foto
                                 │
src/commerce/                    │
  provider.js      interfaccia: getProducts(handles), createCart, addLines, updateLines,
                   removeLines, getCart(id) → { lines, totale, checkoutUrl }
  shopify.js       implementazione: Storefront API (GraphQL) dal browser
  mock.js          implementazione finta, in memoria: test e sviluppo senza rete
  useCartStore.js  Zustand: cartId (persistito), righe, stato, errori
```

- **[Probabile] Nessun server.** La Storefront API si chiama dal browser con un token *pubblico*
  (pensato per stare nel codice del sito: legge il catalogo e gestisce carrelli, non ordini né clienti).
  Il pagamento avviene sulla cassa di Shopify (`checkoutUrl` del carrello): carte, Apple/Google Pay,
  3-D Secure, conferme d'ordine e fatture restano a Shopify. Nessun dato di pagamento passa dal sito.
- **Fonte di verità.** Prezzi, disponibilità, varianti e foto dei capi vengono da Shopify. `storeConfig`
  tiene solo ciò che Shopify non sa: dove sta il capo nel negozio 3D, la sagoma, il lookbook.
  Se Shopify non risponde, la scheda mostra "non disponibile", **mai un prezzo vecchio**.
- **[Probabile] Prezzi UE:** Shopify Markets + direttiva `@inContext(country:)` per il prezzo del paese
  del visitatore, IVA inclusa (vendita a consumatori).
- **Carrello:** id del carrello in `localStorage` (dato tecnico, [Probabile] non richiede consenso);
  se il carrello è scaduto se ne crea uno nuovo. Il carrello è una nuova voce della pila `dialogs`
  (`kind: 'cart'`), quindi sospende il movimento e ha già trappola del focus ed ESC.
- **Configurazione:** `VITE_SHOPIFY_DOMAIN`, `VITE_SHOPIFY_STOREFRONT_TOKEN`, `VITE_SHOPIFY_API_VERSION`
  come variabili d'ambiente su Vercel (anteprima e produzione separate). Senza variabili il sito usa
  il fornitore finto solo in sviluppo; in produzione `features.checkout` resta spento.

## 3. Interfaccia

| Dove | Cosa cambia |
|---|---|
| Scheda prodotto | Prezzo e disponibilità da Shopify; taglia obbligatoria; taglie esaurite dalle giacenze reali; "Aggiungi al carrello" al posto del bottone spento |
| HUD | Bottone carrello con numero di pezzi accanto a "Menu" |
| Carrello (scheda) | righe con immagine, taglia, colore, quantità ±, rimuovi; totale; "Vai al pagamento" → cassa Shopify nella stessa scheda del browser |
| Menu | voce "Carrello"; in fondo i link legali (condizioni, privacy, resi, spedizioni) e i dati del venditore |
| Ritorno dalla cassa | pagina/stato "Ordine ricevuto" o carrello intatto se il pagamento è annullato |

La nota "Prezzi dimostrativi" sparisce solo quando i prezzi vengono davvero da Shopify.

## 4. Sotto-fasi

| Fase | Oggetto | Serve | Definition of Done |
|---|---|---|---|
| **8a** | Interfaccia `provider`, fornitore finto, store del carrello, UI carrello e "Aggiungi al carrello", invarianti nuove (ogni prodotto in vendita ha `commerce.handle`), suite `e2e-phase8a` | niente | Carrello completo col fornitore finto: aggiungi, quantità, rimuovi, persistenza al ricaricamento, ESC/focus, movimento sospeso, telefono e desktop |
| **8b** | Fornitore Shopify su negozio di sviluppo; prezzi e giacenze reali; `checkoutUrl` | negozio di sviluppo + token | Ordine di prova fino alla cassa con il gateway di test di Shopify; errori di rete gestiti |
| **8c** | Catalogo del cliente: `commerce.handle` per ogni capo, varianti taglia × colore, foto reali al posto dei segnaposto | negozio del cliente + catalogo | Ogni capo del negozio 3D corrisponde a un prodotto Shopify, verificato da un controllo automatico |
| **8d** | Dati del venditore e pagine legali (link alle policy di Shopify o pagine proprie), banner cookie solo se servono | testi del cliente | Pagine raggiungibili da menu e cassa; nessun cookie non tecnico senza consenso |
| **8e** | Messa in vendita: tolto `noindex`, dominio, ordine reale di piccolo importo + rimborso | tutto quanto sopra | Un ordine vero completato e rimborsato, ricevuto nel pannello del cliente |
| **8f** | **Lingua inglese, dopo il lancio** (deciso dall'utente il 2026-10-16): testi del sito in due lingue in `storeConfig`, selettore di lingua, prezzi formattati per lingua, `@inContext(language:)` verso Shopify; su Shopify traduzioni di capi e varianti (app "Translate & Adapt") e inglese pubblicato solo quando il sito lo supporta | testi inglesi dal cliente (capi, lookbook, brand story, pagine legali), chiesti insieme al catalogo | Sito e cassa coerenti in italiano e in inglese; nessun testo che resta in una lingua sola |

## 5. Rischi

| Rischio | Mitigazione |
|---|---|
| Il negozio 3D e Shopify divergono (capo esposto ma tolto da Shopify) | Controllo automatico in 8c + a runtime il capo si mostra "non disponibile" |
| Prezzo diverso fra scheda e cassa | Il prezzo si legge solo da Shopify, mai da `storeConfig` |
| Giacenza esaurita fra aggiunta e pagamento | La cassa di Shopify riverifica; il carrello rilegge le disponibilità all'apertura |
| Obblighi legali e fiscali UE | Non sono codice: li definisce il cliente col suo consulente/commercialista. Il sito pubblica i testi che riceve, non li scrive |
| Nessuna rete verso Shopify dal container di sviluppo | [Ipotesi] da verificare in 8b; i test automatici usano il fornitore finto, le prove reali le fai tu sull'anteprima |
| Costi | Abbonamento Shopify e commissioni sono del cliente: da far valutare a lui prima di 8c |

## 6. Prossimo passo

8a e 8b chiuse. Negozio da trasferire al cliente creato dall'utente (Appendice B): `into-industries-ayehghmw.myshopify.com`
(suffisso assegnato da Shopify, permanente; sparisce dalla vista dei clienti col dominio vero), token pubblico
`75261516e790b43df1e21a01c0000dae`. Verificato in sola lettura il 2026-10-16: valuta EUR, paese IT, mercato solo Italia,
lingua predefinita e unica pubblicata italiano, carrello creabile in IT senza avvisi, catalogo vuoto.
Non verificabili col token pubblico: spedizione, gateway di prova, Shopify Payments spento, imposte.
Rete del container: l'host è stato aggiunto dall'utente agli Allowed domains.

**Preparazione eseguita il 2026-10-16** (approvata come "passo 1 e 2"):
- 8c: modello `docs/modello-catalogo-INTO.xlsx` da far compilare al cliente; `npm run catalog:import` lo trasforma
  in CSV per Shopify, bozza dei capi per storeConfig e testi inglesi; `npm run check:catalog` è il controllo
  automatico della Definition of Done (oggi: negozio di sviluppo allineato, negozio del cliente vuoto).
- 8d: pagine legali lette da Shopify (sette campi della Storefront API, I25), menu e scheda, HTML del venditore
  ripulito. Il venditore le scrive su Shopify → Impostazioni → Informative; oggi c'è solo la privacy generata
  da Shopify, in inglese. `check:catalog -- --launch` le pretende tutte prima della vendita.

**8d eseguita il 2026-10-29, per la parte che è codice.** Le pagine legali si raggiungono dal menu e dal
carrello (`CartSheet`, sotto "Vai al pagamento": la scheda si apre sopra il carrello e Indietro ci riporta,
merce dentro); alla cassa ci pensa Shopify. Sulla seconda metà della Definition of Done la risposta è che
**non serve un banner cookie**: il sito non ne scrive nessuno, non ha analytics né script di terze parti (la
CSP non li permetterebbe) e in `localStorage` tiene solo l'id del carrello, il modo di controllo scelto da
chi naviga e i carrelli del fornitore finto. `e2e-phase8a` (50 verifiche) lo ricontrolla a ogni giro, e
segnala qualunque chiave nuova.

**Quello che chiude la 8d non è codice:** i testi li scrive il venditore su Shopify → Impostazioni →
Informative. Al 2026-10-29 ce n'è **una su sette**, la privacy generata da Shopify. L'elenco da passare al
cliente, con il nome tecnico di ogni campo e come appare nel sito, è in `docs/CONTENUTI.md` §5.

8c parte con il catalogo del cliente e il comando **`Approvato, procedi alla fase 8c`**.

## Appendice — Negozio di sviluppo per la 8b (passaggi dati all'utente il 2026-10-16)

1. Account Shopify Partner (gratuito, a nome dell'agenzia) → **Stores → Add store → Create development store**,
   uso "Create a store to test and build", dati vuoti. Nel Dev Dashboard il percorso è **Dev stores → Add dev store**.
   Il nome diventa l'indirizzo `….myshopify.com` e non si può cambiare.
2. Nel negozio: **Prodotti → Importa** `docs/shopify-prodotti-di-prova.csv` (generato da
   `scripts/export-shopify-csv.mjs`: stessi handle del negozio 3D, varianti Taglia × Colore, taglie
   esaurite a giacenza 0).
3. Installare il canale **Headless** dallo Shopify App Store → **Create storefront** → copiare il
   **token pubblico** (mai quello privato) → in Storefront API permissions abilitare la lettura di
   prodotti, inventario e la gestione del carrello.
4. Pubblicare i prodotti sul canale Headless (nella scheda di ogni prodotto o in blocco).
5. Mandare: indirizzo `….myshopify.com` + token pubblico.

Il negozio di sviluppo non accetta pagamenti reali: si prova con il gateway di test di Shopify.

## Appendice B — Negozio da trasferire al cliente (8c, passaggi dati all'utente il 2026-10-16)

Fonte: documentazione Shopify "Client transfer stores" (shopify.dev, letta il 2026-10-16). Il negozio di sviluppo
`into-industries-dev` resta il banco di prova e **non** si trasferisce (i dev store non sono trasferibili).

1. **Dev Dashboard → Stores → Create store → Client transfer store.** Nome definitivo approvato dal cliente
   (diventa `….myshopify.com`, non modificabile), paese Italia, Shopify Plus no. Questionario: solo "Sell online".
   Nessun piano, nessuna carta, nessun dato di prova generato.
2. **Impostazioni:** valuta del negozio EUR, fuso Europe/Rome, indirizzo del cliente; Markets con Italia
   (poi UE in EUR, D8-3); spedizione con zona Italia/UE; pagamenti **solo** gateway di prova.
   **Mai Shopify Payments, nemmeno in modalità test**: blocca il trasferimento.
3. **Catalogo reale** (non i prodotti di prova): handle concordati, opzioni `Taglia` e `Colore` con le
   etichette di storeConfig, foto, giacenze. Pubblicato sul canale Headless.
4. **Canale Headless** → Create storefront → permessi su prodotti, inventario, carrello → token **pubblico**.
   Si passano dominio e token pubblico (mai quello privato).
5. **Trasferimento** (dopo 8c/8d): Stores, filtro "Type is Client transfer" → ⋯ → Transfer store → email del
   cliente. Il cliente ha 7 giorni per accettare, sceglie il piano (niente prove gratuite né promozioni dopo
   il trasferimento), attiva Shopify Payments con i suoi dati. L'agenzia resta collaboratore.

Limiti finché il negozio è dell'agenzia: niente transazioni reali (ordini di prova illimitati), pagina
password non rimovibile, solo app gratuite o partner-friendly.
