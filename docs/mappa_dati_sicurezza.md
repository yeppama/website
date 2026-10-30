# Mappa dei Dati, Privacy e Sicurezza — INTO industries

Compilata il 2026-10-30 sul codice, non a memoria: ogni affermazione qui sotto è
verificata leggendo il sorgente o eseguendo un controllo, e dove c'è un controllo
automatico che la tiene vera nel tempo è indicato.

> **Leggi prima questo.** Questo non è un sito full-stack: è un **sito statico** senza
> server proprietario, senza database, senza registrazione e senza login. Il negozio è
> **Shopify headless**: il catalogo arriva via API e il pagamento avviene **sul dominio
> di Shopify**, non sul nostro. Molte voci di un questionario privacy standard qui non
> sono "da completare": **non esistono**, e dirle altrimenti sarebbe falso.

## Stato 0 — Tre configurazioni diverse, non una

La risposta a quasi ogni domanda dipende da quale delle tre si parla.

| | **A · Produzione, oggi** | **B · Anteprima di lavoro** | **C · Al lancio (dalla 8c)** |
|---|---|---|---|
| Dove | dominio pubblico (`main`) | anteprima Vercel (`sviluppo`) | stesso dominio pubblico |
| Contenuto | `into`, segnaposto dichiarati | `demo`, foto e prezzi di prova | contenuto reale del cliente |
| Acquisti | **spenti** (`provider: 'off'`) | attivi sul negozio **di sviluppo** | attivi sul negozio **del cliente** |
| Richieste a terzi dal browser | **nessuna** | Shopify (negozio di sviluppo) | Shopify (negozio del cliente) |
| Indicizzazione | `noindex` (meta + header) | protetta da login Vercel | indicizzabile |

**Oggi la produzione non manda un solo byte a nessun terzo**: con gli acquisti spenti il
sito non interroga nemmeno Shopify. È una pagina statica che carica i propri file.

---

## 1. Tipologia di dati raccolti

### Dati di navigazione

- **Cookie: nessuno.** Il sito non ne scrive. Verificato a ogni giro di CI da
  `e2e-phase8a`, che controlla che `document.cookie` sia vuoto.
- **`localStorage`: tre chiavi, tutte tecniche**, e la verifica automatica fallisce se
  ne compare una quarta non dichiarata:
  - `into-cart-id` — l'identificativo del carrello su Shopify. Senza, il carrello si
    svuota a ogni ricaricamento. Non contiene dati personali: è un id opaco.
  - `into-control-mode` — se chi naviga ha scelto "tastiera e mouse" o "solo mouse".
    Una preferenza che ha espresso lui.
  - `into-mock-carts` — carrelli del fornitore finto, **solo in prova**. In produzione
    non esiste.
- **Indirizzi IP e log**: il sito non ne tiene. Li tratta **Vercel** come hosting, per
  log tecnici e protezione dagli abusi, come qualunque server web.
- **Analytics: nessuno**, oggi. *(Deciso di aggiungere Vercel Analytics, che non usa
  cookie — vedi §5.)*

### Dati anagrafici e di contatto

**Nessuno.** Il sito non ha registrazione, né profilo, né moduli di contatto. Nome,
email e indirizzo di spedizione vengono chiesti **da Shopify, sul dominio di Shopify**,
dopo che il visitatore ha lasciato il nostro sito premendo "Vai al pagamento". Il nostro
codice non li vede mai, nemmeno di passaggio.

### Dati finanziari e transazionali

**Nessuno transita dal nostro sito.** Non esiste un modulo di pagamento, non esiste un
campo carta, non c'è un token di pagamento da custodire. Quello che conserviamo è
l'identificativo del carrello, che serve a ritrovare lo stesso carrello su Shopify.

Il `checkoutUrl` che porta alla cassa è **validato prima di diventare una navigazione**:
accettato solo se è `https:` **e** l'host è esattamente quello del negozio configurato.
Un carrello manomesso non può dirottare chi compra su un dominio di terzi.

### Dati sensibili o generati dall'utente

**Nessuno.** Non si caricano file, non ci sono messaggi, non c'è contenuto scritto dai
visitatori. Non esistono categorie particolari di dati ai sensi dell'art. 9 GDPR.

### Dati tecnici del dispositivo — da dichiarare, anche se non escono

Per scegliere la qualità grafica il sito legge: **modello della GPU** (tramite
`WEBGL_debug_renderer_info`), numero di core, memoria dichiarata e tipo di puntatore
(touch o mouse).

**Nessuno di questi dati lascia il browser**: non esistono `fetch`, `sendBeacon`, cookie
o storage che li trasmettano — verificato cercando ogni chiamata di rete nel sorgente.
Vale però la pena saperlo: il modello della GPU è un elemento utile al *fingerprinting*,
e **se un giorno si aggiungesse un analytics questa riga andrebbe rivista**, perché da
quel momento quei dati potrebbero uscire.

---

## 2. Flussi di dati e servizi di terze parti

L'elenco è corto **e dimostrabile**: la CSP (`vercel.json`) vieta al browser di
contattare qualunque host non elencato. Non è una promessa, è un vincolo tecnico che il
browser applica.

    connect-src 'self' https://<negozio>.myshopify.com blob:

| Servizio | Ruolo | Cosa tratta | Dove |
|---|---|---|---|
| **Vercel** | Hosting del sito statico | Log tecnici di richiesta (IP, user agent). Nessun dato applicativo: non c'è un database | `[DA CONFERMARE: piano, team e regione del progetto]` |
| **Shopify** | Catalogo, carrello, cassa, pagine legali | **Tutto**: ordini, clienti, pagamenti, indirizzi. È qui che stanno i dati personali | Shopify decide la collocazione. Per un venditore UE il titolare contrattualizza Shopify International Ltd `[DA CONFERMARE sul contratto reale]` |

**Non ci sono altri terzi, e non per scelta narrativa:**

- **i caratteri sono auto-ospitati** (`public/fonts/`): il visitatore non fa nessuna
  richiesta a Google Fonts. Era una decisione presa apposta per questo motivo (L6 in
  `PLAN.md`)
- **nessun analytics, nessun pixel, nessun widget, nessuna CDN esterna**
- **nessun server proprietario**: non esiste un backend nostro da proteggere, perché non
  esiste
- **nessuna email inviata da noi**: le comunicazioni d'ordine partono da Shopify

---

## 3. Conformità legale e consensi

> **Il titolare del trattamento è il venditore, non chi ha scritto il sito.** Le voci qui
> sotto dicono cosa fa il sito; i testi e le procedure li definisce il venditore col suo
> consulente.

### Acquisizione del consenso

**Non serve un banner cookie, e non è una scorciatoia.** Il sito non scrive cookie, non
ha tracciamento e non ha script di terze parti. Quello che tiene in `localStorage` serve
a far funzionare ciò che il visitatore ha chiesto — il suo carrello, la sua scelta dei
comandi — e rientra nelle esenzioni tecniche.

**Una verifica automatica lo ricontrolla a ogni giro** (`e2e-phase8a`): se un giorno
comparisse un cookie o una chiave di storage non dichiarata, la CI diventa rossa. È il
modo di accorgersene prima di un reclamo, non dopo.

Non esistono moduli di registrazione né iscrizioni alla newsletter, quindi oggi non
esiste nessun consenso da raccogliere.

### Base giuridica

Per gli ordini: **esecuzione del contratto**. Per fatture e registri: **obbligo di
legge**. Il trattamento avviene su Shopify; il sito non è il luogo in cui si fonda.

### Gestione dei diritti dell'utente

Accesso, portabilità e cancellazione riguardano i dati su Shopify, che offre gli
strumenti per rispondervi. **Il sito non conserva niente da esportare o cancellare**: lo
dimostra il fatto che svuotare il `localStorage` del browser riporta tutto allo stato
iniziale senza perdere nulla che non sia già su Shopify.

### Pagine legali

Il sito legge le sette informative **dalla Storefront API** e le mostra nel menu e nel
carrello, ripulite prima di entrare nella pagina. Le scrive il venditore su Shopify →
Impostazioni → Informative. **Quelle non pubblicate non compaiono affatto**, non
lasciano una voce vuota. Elenco pronto da inoltrare: `docs/CONTENUTI.md` §5.

⚠️ **Trappola verificata:** se una traduzione manca, Shopify risponde **nella lingua
predefinita senza nessun errore**. Pubblicando una seconda lingua, un cliente potrebbe
leggere le condizioni di vendita nella lingua sbagliata senza che niente lo segnali.

---

## 4. Regole di sicurezza e autenticazione

### Autenticazione

**Non esiste.** Nessun account, nessuna password, nessuna sessione, nessun token JWT,
nessun cookie di sessione. Di conseguenza: niente hashing da verificare, niente scadenze
di token, niente refresh token. L'unica autenticazione dell'intero percorso d'acquisto è
quella della cassa, che è di Shopify.

### Crittografia

- **HTTPS obbligatorio**: Vercel serve solo in HTTPS, più `Strict-Transport-Security`
  (`max-age=31536000`) e `upgrade-insecure-requests` nella CSP.
  `includeSubDomains` è lasciato fuori **di proposito** finché il dominio definitivo non
  è attivo: è difficile da revocare e vincolerebbe sottodomini che non esistono ancora.
- **Dati a riposo: non ce ne sono.** Nessun database nostro, quindi nessuna cifratura da
  configurare. I dati cifrati a riposo sono quelli su Shopify, che se ne occupa.

### Credenziali nel codice

L'unica credenziale presente è il **token pubblico della Storefront API di Shopify**,
che è **pubblico per costruzione**: lo legge il browser di chiunque visiti il sito, ed è
progettato per questo. Il token privato dell'amministrazione non è mai entrato nel
repository.

- **Verificato su tutta la storia di git** (103 commit al 2026-10-29): nessun prefisso
  di credenziale vera (Shopify privato, AWS, Stripe, GitHub, Slack, SendGrid, chiavi
  private). L'unico file sospetto mai committato era un `.env` che conteneva
  `VITE_CONTENT=demo` e due righe di commento: niente da ruotare.
- **`npm run scan:secrets` gira in CI prima della build** e impedisce che ne entri uno
  domani.
- **`npm run check:scopes`** chiede al negozio cosa quel token può fare davvero, invece
  di fidarsi di quello che dovrebbe poter fare. Non sta in CI perché interroga Shopify
  dal vivo: si lancia a mano, e si rilancia alla 8c sul negozio del cliente.

**Permessi del token (scope del canale Headless) — verificati e corretti il 2026-10-30.**
Dei 16 scope della Storefront API ne erano attivi **10**, fra cui
`unauthenticated_read_customers` e `unauthenticated_write_customers`. Il sito non ha
login, registrazione né storico ordini: le sue chiamate sono catalogo, carrello e pagine
legali. Quei permessi erano superficie inutile su un token pubblico per costruzione.

Misurato, non gonfiato: **non era una lista di clienti esposta** — leggere un cliente
richiede comunque un `customerAccessToken`, cioè un accesso riuscito. Ma
`write_customers` permetteva di creare account e di far partire email di recupero
password dal negozio, verso indirizzi scelti da chi avesse il token.

I sei scope non usati sono stati **tolti**; restano i quattro che servono. Verificato due
volte: `npm run check:scopes` (chiede al negozio cosa il token può fare davvero) ed
`e2e-phase8b` dal vivo. **Alla 8c la stessa lista va rifatta sul negozio del cliente**,
dove i clienti ci saranno davvero.

### Autorizzazioni e accesso ai dati

Non esiste un'architettura multi-tenant perché non esistono utenti: non c'è un ID di un
altro utente da interrogare. Quello che il sito può leggere lo decide il token pubblico,
ed è catalogo, prezzi, giacenze e pagine legali.

### Validazione degli ingressi e difese applicative

| Difesa | Come |
|---|---|
| **XSS** | React escapa tutto. L'unico `dangerouslySetInnerHTML` è quello delle pagine legali, e il testo passa da `sanitizeHtml`, che **ricostruisce ogni elemento da una lista di tag ammessi** e scarta tutti gli attributi tranne `href` con protocollo verificato (`http`, `https`, `mailto`, `tel`) |
| **SQL Injection** | Non applicabile: non c'è SQL. Le richieste GraphQL passano i valori in `variables`, mai concatenati nella stringa della query |
| **Prototype pollution** | Le chiavi prese dalla query string si cercano con `Object.hasOwn`: `constructor` e `__proto__` sono chiavi valide e truthy, e una di queste anneriva la pagina |
| **Valori numerici** | `Number.isFinite` e non `> 0`: `?fps=Infinity` spegneva il limitatore di fotogrammi |
| **Redirect aperto** | Il `checkoutUrl` è accettato solo se `https:` e con l'host esatto del negozio |
| **Manomissione dei campi** | Il prezzo **non viene mai** dal config: col commercio attivo lo dà solo Shopify, e se non risponde il capo è "non disponibile". La quantità è limitata in due punti. Il totale lo calcola Shopify |
| **Coerenza dei dati** | 30 invarianti sul config fanno **fallire la build**, non la visita |

### Header di sicurezza

Tutti attivi e verificati sul dominio pubblico, non solo in locale: `Content-Security-Policy`,
`Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` sugli
asset, `Permissions-Policy` (camera, microfono, geolocalizzazione, pagamenti, usb,
serial, midi, sensori, cattura schermo, xr, browsing-topics tutti negati) e
`X-Robots-Tag`.

`npm run preview` rilegge gli stessi header da `vercel.json`: locale e produzione non
possono divergere.

---

## 5. Cosa cambierà, e quando

Perché un documento che descrive solo l'oggi invecchia male.

| Quando | Cosa cambia |
|---|---|
| **Installando Vercel Analytics** (deciso, non ancora fatto) | Compaiono statistiche d'uso. **Non usa cookie**, quindi il banner resta non necessario — ed è la ragione della scelta. Vanno aggiornate CSP, informativa privacy, e Vercel va fra i responsabili del trattamento |
| **Alla 8c** (negozio del cliente) | Cambiano dominio e token **nello stesso commit** della CSP. Da quel momento il sito parla col negozio che contiene ordini e clienti veri |
| **Alla 8e** (messa in vendita) | Si toglie il `noindex`, il sito diventa indicizzabile, e gli obblighi informativi diventano pienamente operativi |
| **Alla 8f** (inglese) | Attenzione alla trappola delle traduzioni mancanti descritta al §3 |

---

## 6. Cosa resta da confermare

Tre cose che non si deducono dal codice:

1. **Configurazione Vercel**: piano, team proprietario del progetto e regione.
2. **Identità del titolare del trattamento**: ragione sociale, sede, partita IVA del
   venditore. Serve anche per le pagine legali, ed è **obbligatoria** per vendere online
   in UE.
*(La terza voce di questo elenco — gli scope del canale Headless — è stata verificata e
corretta il 2026-10-30: vedi §4.)*

---

## 7. Come usare questo documento come criterio di giudizio

Se viene mostrato a questo progetto uno screenshot o del codice, questi sono gli
standard rispetto a cui va giudicato — **e la maggior parte delle segnalazioni
"standard" qui sarebbero sbagliate**:

- un modulo di registrazione **non deve esistere**: se appare, è una modifica
  all'architettura, non un dettaglio
- un controllo su un token JWT **non deve esserci**: non ci sono token di sessione
- un banner cookie **non serve**, finché resta vero che non ci sono cookie
- una query SQL **non può esistere**
- un prezzo letto dal config invece che dal fornitore **è un difetto**, anche se il
  numero mostrato è giusto
- un `dangerouslySetInnerHTML` che non passa da `sanitizeHtml` **è un difetto**
- una chiave in `localStorage` diversa dalle tre dichiarate **va spiegata**, perché fa
  anche fallire la CI
- una richiesta di rete verso un host non presente in `connect-src` **non può
  funzionare**: la CSP la blocca nel browser
