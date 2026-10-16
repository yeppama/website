# PLAN-8.md — Fase 8: e-commerce reale

Versione 0.2 · 2026-10-16 · Stato: **8a consegnata**; **8b scritta**, prova dal vivo in sospeso (proxy del container chiuso verso Shopify; la fa l'utente sull'anteprima con `?commerce=shopify`)

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

8a non dipende da nessuno. Per partire: **`Approvato, procedi alla fase 8a`**.
In parallelo, se puoi: crea un negozio di sviluppo Shopify (account Partner, gratuito) e passami
dominio `*.myshopify.com` e token Storefront API; serve in 8b.

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
