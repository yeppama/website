# PER-L-UTENTE.md — cosa posso fare solo con te

Guida operativa, in ordine di quanto sblocca. Ogni voce dice **cosa fare**, **quanto
costa** e **cosa si sblocca**. Scritta il 2026-10-30.

Le prime quattro riguardano me: servono a farmi lavorare senza fermarmi a chiederti.
Le altre riguardano il sito e non le può fare nessun altro che tu (o il cliente).

---

## Parte 1 — Per rendermi autonomo

### 1.1 ~~Installare GitHub CLI~~ · **fatto**, verificato il 2026-10-30

`gh` 2.103.3, autenticato sull'account `yeppama`, ambiti `repo`, `workflow`, `gist`,
`read:org`. Da qui leggo l'esito della CI, i log del singolo passo fallito, i branch, i
tag e le protezioni, senza passare dal browser e senza chiedere a te.

Prima verifica utile, fatta subito: **`main` non ha branch protection** (nessun
controllo obbligatorio da rinominare), i branch remoti sono solo `main` e `sviluppo`, e
il tag `archivio-docs-ristrutturati` c'è. La nota in `CONTEXT.md` §2 — "il proxy del
container non permette di creare tag" — è superata.

Se un giorno `gh auth status` dicesse che non sei più autenticato: `gh auth login`,
poi `GitHub.com` → `HTTPS` → `Login with a web browser`.

### 1.2 ~~Preapprovare i comandi ripetitivi~~ · **fatto il 2026-10-30**

`outbound\.claude\settings.local.json` contiene 30 voci in `allow` e 8 in `deny`,
verificate come JSON valido. Le cinque voci di `order-planner.html` che c'erano prima
non sono state riportate: erano comandi esatti di un altro lavoro, e un permesso
scritto come comando esatto non si ripresenta mai.

Cosa c'e' dentro, in breve: `npm`, `node scripts/`, `vite preview`, il git di lettura
piu' `add`/`commit`/`branch`/`fetch`, e sei comandi `gh` di sola lettura. **`git push`
e' preapprovato solo verso `sviluppo`**: la produzione resta una decisione dell'utente
ogni volta, perche' `main` pubblica in automatico e unire significa pubblicare. In
`deny`: push forzato, push su `main`, `reset --hard`, `rm -rf`, le chiamate `gh api` in
scrittura, `gh repo delete` e `gh release`.

Due trappole pagate qui, da non ripagare:

1. **La sintassi.** La forma documentata per "qualunque argomento" e' `Bash(npm run:*)`
   con i due punti, non `Bash(npm run *)` con lo spazio — la prima stesura di questa
   sezione aveva la seconda. Un pattern che non combacia **non da' errore**: chiede il
   permesso come se non ci fosse, e sembra che il file non sia stato letto.
2. **Il file si sostituisce tutto, non si modifica in mezzo.** Un `settings.json`
   malformato non segnala niente: viene ignorato in blocco.

I permessi si leggono all'avvio, quindi dopo una modifica va riavviata la sessione.

Questo file non lo scrivo io: un agente che si allarga i permessi da solo e'
esattamente la cosa da non permettere, e il sistema me lo impedisce. Il contenuto lo
preparo, incolla l'utente.

### 1.3 La password del negozio di sviluppo · 1 minuto

**Quale dei due negozi:** quello di **sviluppo**, `into-industries-dev.myshopify.com` —
non quello del cliente. È il negozio che `e2e-phase8b` interroga, perché è l'host scritto
in `storeConfig.commerce.shopify.domain`.

E **non è la password del tuo account Shopify**: è quella della vetrina, il muro che
Shopify mette davanti a un negozio non ancora pubblico. Si trova in: **Canali di vendita
→ Negozio online → Preferenze → Protezione con password**.

Poi, prima di lanciare le suite:

```powershell
$env:STORE_PASSWORD = "la-password"
```

**Cosa si sblocca:** l'unica verifica rossa di `e2e-phase8b`, cioè la cassa. Oggi la
suite dichiara "protetta da password, non verificata" invece di fingere che vada bene —
ma resta non verificata.

### 1.4 Un token Vercel · 5 minuti

Su `vercel.com` → avatar → **Account Settings → Tokens → Create Token**. Tre campi:

- **Nome:** è solo un'etichetta, serve a te per riconoscerlo quando lo revocherai.
  Mettici dentro chi lo usa e quando è nato, per esempio `claude-code-2026-10`.
  Evita nomi generici come `token1`: fra sei mesi non saprai cosa revochi.
- **Ambito (Scope):** il team o l'account che possiede questo progetto. Se il sito sta
  in un team suo, scegli quello e non l'account personale: il token non potrà toccare
  nient'altro.
- **Scadenza:** mettine una. 30 giorni è ragionevole; si rinnova in un minuto.

⚠️ **Un token Vercel non è di sola lettura, e non esiste un'opzione per renderlo tale.**
Dentro il suo ambito può pubblicare, cambiare le variabili d'ambiente e cancellare
progetti. A me serve per leggere lo stato dei deploy e gli header del dominio vero, ma
il token che mi dai può fare molto di più: per questo vale l'ambito ristretto e la
scadenza breve. Se preferisci non darlo, l'alternativa è che continui a guardare tu
l'anteprima e a dirmi cosa vedi — è solo più lento, non è un blocco.

**Cosa si sblocca:** oggi non vedo né le anteprime né la produzione — `*.vercel.app`
non è raggiungibile da qui — e ogni volta ti chiedo di guardare tu. Col token leggo lo
stato dei deploy dopo un push, verifico gli header sul dominio vero (non solo in
locale) e ti do già pronto l'indirizzo dell'anteprima da mandare al cliente.

---

## Parte 2 — Il sito: cose che richiedono i tuoi account

### 2.1 Shopify: controllare gli scope del canale Headless · 5 minuti · **adesso**

**Sul negozio di sviluppo** (`into-industries-dev`): è quello il cui token pubblico sta
nel codice del sito oggi. Sul negozio del cliente si rifarà alla 8c, col suo token.

Amministrazione Shopify → **Impostazioni → App e canali di vendita → Headless** →
guarda i permessi della Storefront API.

Quello che cerchi: **non devono esserci** permessi che iniziano con
`unauthenticated_read_customers` o `unauthenticated_write_customers`. Il sito non ha
bisogno dei dati dei clienti, e un token pubblico che li può leggere è un token
pubblico che li espone — il token sta nel codice del sito, lo legge chiunque apra gli
strumenti del browser.

**Cosa serve davvero, ricavato dal codice** (`src/commerce/shopify.js`, 2026-10-30:
tutte le chiamate alla Storefront API stanno in quel file). Quattro permessi, non uno
di piu':

| Permesso | Perche' | Dove nel codice |
|---|---|---|
| `unauthenticated_read_product_listings` | catalogo: `product(handle:)`, varianti, prezzi, `availableForSale`, opzioni. Nello schema di Shopify questo permesso copre anche le collezioni, che il sito oggi non interroga | `PRODUCT_FIELDS`, `getProducts` |
| `unauthenticated_write_checkouts` | creare il carrello e modificarne le righe: `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove` | `createCart`, `addLines`, `updateLines`, `removeLines` |
| `unauthenticated_read_checkouts` | rileggere il carrello al rientro sul sito: `cart(id:)` | `getCart` |
| `unauthenticated_read_content` | le sette pagine legali, lette da `shop { ...Policy { title body } }` | `getPolicies`, campi in `storeConfig.commerce.policies` |

**Non devono esserci, e sono i tre che contano:**
`unauthenticated_read_customers`, `unauthenticated_write_customers`,
`unauthenticated_read_customer_tags`. Il sito non ha nessuna funzione di account: non
c'e' login, non c'e' registrazione, non c'e' storico ordini. Un token pubblico che puo'
leggere i clienti e' un token pubblico che li espone, e quel token sta nel codice del
sito: lo legge chiunque apra gli strumenti del browser.

**Non servono, e se ci sono si possono togliere:** `read_product_inventory` (il sito usa
`availableForSale`, che e' un si/no, non le quantita'), `read_product_tags`,
`read_product_pickup_locations`, `read_selling_plans`, `read_metaobjects`,
`read_bundles`, `read_shop_pay_installments_pricing`.

**Com'erano davvero, letti dalle schermate del 2026-10-30.** Attivi 10 su 16:

| Attivo | Giudizio |
|---|---|
| `read_product_listings` | **tenere** |
| `read_checkouts`, `write_checkouts` | **tenere** |
| `read_content` | **tenere** |
| `read_customers` | **togliere** |
| `write_customers` | **togliere, e' il piu' serio** |
| `read_product_tags` | togliere, non usato |
| `read_product_pickup_locations` | togliere, non usato |
| `read_selling_plans` | togliere, non usato |
| `read_metaobjects` | togliere, non usato |

Gia' spenti, e vanno lasciati cosi': `read_product_inventory`,
`read_customer_tags`, `read_bulk_operations`, `write_bulk_operations`,
`read_bundles`, `read_shop_pay_installments_pricing`.

**Quanto e' grave `write_customers`.** Non e' una lista di clienti esposta: per leggere
un cliente la Storefront API vuole comunque un `customerAccessToken`, cioe' un accesso
riuscito. Quello che permette e' creare account e far partire email di recupero
password dal negozio, a indirizzi scelti da chi ha il token — e il token e' nel sorgente
della pagina. Sul negozio di sviluppo non ci sono clienti veri, quindi oggi vale poco:
conta perche' alla 8c non deve essere ricopiato sul negozio del cliente.

Due avvertenze prima di toccare le caselle: l'avviso in cima alla pagina dice che **i
permessi valgono per tutte le vetrine virtuali del canale Headless**, quindi una casella
tolta le riguarda tutte; e nelle schermate le caselle sono in grigio, che di solito vuol
dire sola lettura — potrebbe servire un "Modifica" o il pannello del canale Headless.

Dopo la modifica si rilancia `node scripts/e2e/e2e-phase8b.mjs`: interroga il negozio
dal vivo, e se un permesso tolto servisse davvero, cade li'.

### 2.2 Vercel e Shopify: i DPA · 15 minuti

Sono i contratti che ti servono per trattare dati personali tramite loro. Entrambi li
offrono standard:

- Shopify: **Impostazioni → Legale** (o nel centro assistenza, "Data Processing Addendum")
- Vercel: **Account Settings → Legal → DPA**

Non è codice e non cambia niente nel sito, ma è il punto 09 della checklist legale e
serve prima di vendere.

### 2.3 Higgsfield: i termini per l'uso commerciale · 10 minuti

Le immagini delle pareti del negozio e del cantiere (`public/negozio/`,
`public/cantiere/`) sono generate con Higgsfield, col tuo account. Vale la pena
leggere cosa dicono i loro termini sull'uso commerciale e sulla proprietà di quello che
generano: finiscono su un sito che vende.

Se i termini non bastano, si rifanno con un servizio che dà diritti chiari, oppure con
foto vere del negozio quando ci sarà.

---

## Parte 3 — Le misure: servono dispositivi veri

Questo è l'unico blocco che **nessuno** può togliere al posto tuo: qui non ci sono
telefoni. Il protocollo completo è in [`PERF.md`](PERF.md), sezione "Fase 3 del
cantiere".

### 3.1 Come si misura, in breve

Apri l'anteprima sul dispositivo e aggiungi `?bench=1` all'indirizzo. Parte un giro
automatico; alla fine compare un pannello coi numeri. Me li mandi (o mi mandi lo
screenshot) e li confronto con le soglie.

Per il cantiere, stesso indirizzo con `?allestimento=cantiere&bench=1`.

### 3.2 Cosa manca, in ordine di importanza

| Dispositivo | Dove | Perché |
|---|---|---|
| **Android di fascia media** | negozio e cantiere | **Mai fatta.** È il tier `low`, quello che decide se il sito è usabile sui telefoni più diffusi. Soglia: p50 ≥ 40 |
| **iPhone** | negozio e cantiere | Mai fatto col contenuto con le foto |
| **Honor** | negozio A | Era in regressione (25,2), ho corretto ombre e caricamento della grafica: va rimisurato |
| **PC con scheda dedicata** | cantiere, anche con `&bloom=0` | È l'unico dispositivo dove il Bloom vero si accende. Mai visto su hardware reale |

### 3.3 Il giudizio a occhio

I numeri non dicono se è bello. Servono due impressioni, su un telefono vero:

- **i neri**: sono neri o grigi slavati? Il negozio è quasi tutto nero, è la cosa che si
  nota per prima
- **la luminosità**: si vede abbastanza senza che sembri una vetrina da centro
  commerciale?

### 3.4 Le due checklist mobile mai fatte

- **Fase 4**: telefono **in orizzontale**, tocca un espositore lontano, verifica che
  l'avvicinamento e il Focus funzionino, e guarda la resa del nero
- **Fase 5**: scheda prodotto e Lookbook su un telefono vero, **in verticale e in
  orizzontale**

Serve anche un tuo giudizio sulla sensibilità del trascinamento
(`navigation.player.lookSensitivity.mobileDrag`): troppo lenta, giusta, troppo nervosa?

---

## Parte 4 — Il materiale del cliente

Elenco completo e formati in [`CONTENUTI.md`](CONTENUTI.md). Qui solo cosa sblocca cosa.

| Cosa | Sblocca |
|---|---|
| **Logo vettoriale** (P1) | L'insegna 3D vera, il set di favicon, l'immagine di anteprima quando si condivide il link. Il caricatore c'è già: è un cambio di config, non di codice |
| **Catalogo compilato** (il modello Excel `modello-catalogo-INTO.xlsx`) + foto dei capi | **La Fase 8c**, cioè il negozio vero invece dei segnaposto |
| **Testi e immagini del Lookbook / Brand Story** | Il contenuto reale al posto dei segnaposto dichiarati |
| **Conferma della tagline** (P3) "We're just looking for somewhere" | Oggi è visibile come titolo: va confermata prima di pubblicare |
| **Indirizzo e dati del venditore** | **Obbligatorio per vendere in UE.** Ragione sociale, sede, partita IVA, contatto |
| **La scelta fra i due allestimenti** (A negozio / B cantiere) | Smette di servire mantenerli entrambi, e il lavoro si concentra su uno |
| **Prezzi definitivi e dominio** | Il lancio |

---

## Parte 5 — Quando si arriverà alla 8c

**Non adesso.** Si lavora su un negozio alla volta, e fino al prototipo completo quello
di riferimento è `into-industries-dev` (la regola sta in [`PLAN-8.md`](PLAN-8.md)
§4-bis). Il negozio del cliente oggi è vuoto e va lasciato vuoto: non si interroga, non
si popola, non ci si scrivono le informative.

Queste due voci sono qui perché non si perdano, non perché siano da fare:

- **I sette testi legali** sul negozio del cliente, scritti dal venditore col suo
  consulente. La consegna pronta da inoltrare è in [`CONTENUTI.md`](CONTENUTI.md) §5.
  Il meccanismo che li pubblica è già fatto e verificato — sul negozio di sviluppo, con
  informative di prova, che è tutto ciò che serve per sapere che funziona.
- **Il token pubblico della sua Storefront API**, da darmi **insieme al dominio**: li
  cambio in un commit solo con il `connect-src` della CSP. Se cambia il token ma non
  l'host, il carrello smette di funzionare in silenzio — il sito carica, i capi si
  vedono, "Aggiungi al carrello" non fa niente.

---

## Se devi fare una cosa sola oggi

**La 1.1** (installare `gh`). Cinque minuti, e cambia ogni giro di CI da qui in avanti.

Se ne fai due, la seconda è la **2.1** (gli scope su Shopify): è l'unica voce di
sicurezza di tutto l'elenco che non può controllare nessun altro, e si fa in cinque
minuti guardando una schermata.
