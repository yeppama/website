# PIANO-INGLESE.md — come integrare la seconda lingua (Fase 8f)

Nota di progettazione, non un lavoro avviato. La Fase 8f è definita in
[`PLAN-8.md`](PLAN-8.md) §4 come "dopo il lancio"; qui c'è **come** si farebbe, cosa
costa e cosa va deciso prima di toccare una riga. Scritto il 2026-10-29 su richiesta
dell'utente.

## 1. Da dove si parte

Il sito è già più vicino al bilingue di quanto sembri, per come è stato costruito:

- **nessun testo nei componenti.** Le ~195 stringhe dell'interfaccia stanno tutte in
  `storeConfig.copy`; marchio, capi, Lookbook e i testi che cambiano col contenuto
  stanno in `src/content/into.js`. Questa è la condizione che di solito manca e che
  rende le traduzioni un incubo: qui c'è già.
- **il contenuto si sceglie alla pubblicazione**, con `VITE_CONTENT` (`into` o `demo`),
  e lo stesso vale per l'allestimento con `VITE_LAYOUT`. Esiste già il meccanismo "una
  base di codice, più versioni".
- **Shopify sa già rispondere in una lingua**: il provider accetta `language` e lo passa
  con `@inContext`. Oggi lo fa **solo per le pagine legali** (`shopify.js` r. 188).
- **i nomi delle opzioni sono già bilingui**: `optionNames: { size: ['Taglia','Size'],
  color: ['Colore','Color'] }`. Se Shopify rispondesse in inglese, taglie e colori
  continuerebbero a essere riconosciuti. Un problema in meno, già pagato.

## 2. Le quattro decisioni, in ordine di peso

### 2.1 Come si sceglie la lingua: URL o interruttore?

| | A · due indirizzi (`/` e `/en`) | B · un indirizzo, selettore |
|---|---|---|
| Google | indicizza **due** pagine, con `hreflang` che le collega | ne indicizza **una**: l'inglese non esiste nelle ricerche |
| Link condiviso | porta con sé la lingua | porta sempre la lingua predefinita |
| Cassa | `/en` → `@inContext(language: EN)` coerente | uguale |
| Costo | leggere `location.pathname` all'avvio; nessun router | un bottone e `localStorage` |

**Raccomandazione: A.** La ragione non è tecnica, è commerciale: se l'inglese serve a
farsi trovare da chi non cerca in italiano, la versione B non lo fa — esiste solo per
chi è già sul sito. Il costo è quasi lo stesso, perché non serve un router: una sola
build contiene entrambe le lingue (sono poche decine di KB di testo) e all'avvio si
legge il prefisso dell'indirizzo. Su Vercel serve un `rewrite` che mandi `/en` e `/en/*`
allo stesso `index.html`.

### 2.2 Dove vivono i testi

Tre forme possibili. Due costano molto, una quasi niente.

- ~~`copy.it.hud.menu` / `copy.en.hud.menu`~~ — tocca tutti i ~195 punti in cui il
  codice legge un testo.
- ~~ogni stringa diventa `{ it: '…', en: '…' }` con un `t()` che risolve~~ — idem, e in
  più obbliga a ricordarsi `t()` ogni volta: la prima dimenticanza stampa `[object Object]`.
- **due oggetti `copy` completi, se ne sceglie uno all'avvio** — `copy` mantiene
  esattamente la forma di oggi, e **nessun componente cambia**. È lo stesso meccanismo
  con cui `src/content/index.js` sceglie già fra `into` e `demo`.

**Raccomandazione: la terza.** Costo in codice vicino a zero; il lavoro vero diventa
scrivere le traduzioni, che è lavoro di contenuto e va fatto comunque.

### 2.3 Che cosa fa Shopify

Due cose, una nostra e una del venditore.

**Nostra:** `@inContext(language:)` oggi è solo sulle pagine legali. Va messo anche sui
prodotti e sul carrello, altrimenti nel sito inglese i titoli dei capi e i valori delle
opzioni tornano in italiano. Sono sei query da estendere, lavoro meccanico.

**Del venditore:** le traduzioni di capi e varianti si scrivono su Shopify con l'app
*Translate & Adapt*, e **l'inglese va pubblicato sul negozio solo quando il sito lo
supporta** — non prima, o i clienti vedrebbero una lingua a metà.

> **Trappola già documentata** (`LEZIONI.md`): Shopify, se la traduzione non c'è,
> risponde **nella lingua predefinita senza nessun errore**. Quindi un inglese potrebbe
> leggere le condizioni di vendita in italiano senza che niente lo segnali. Non è un
> caso di scuola: è esattamente cosa succederebbe pubblicando il sito inglese prima
> delle traduzioni. Serve una verifica che confronti le due lingue e dica quali testi
> sono tornati identici.

### 2.4 Prezzi, valuta e mercato

Con `en` i prezzi si formattano `€269.00` invece di `269,00 €`: lo fa `Intl` da solo
cambiando il locale. **La valuta resta EUR**, perché il mercato Shopify è l'Italia —
ed è corretto: un inglese che compra da un negozio italiano paga in euro.

Aprire un mercato UK o US è un'altra cosa: valuta, spedizioni, imposte e dazi, tutto da
configurare **dal venditore** su Shopify. Non è lavoro di sito, e non è obbligatorio per
avere il sito in inglese.

## 3. Quello che va aggiunto perché non si rompa in silenzio

Il rischio vero del bilingue non è sbagliare una traduzione: è che **una chiave esista in
una lingua e non nell'altra**, e che al suo posto compaia `undefined` in fondo a una
scheda che nessuno riapre. Serve una nuova invariante, nello spirito delle 30 che ci
sono già: *l'albero dei testi inglesi ha esattamente le stesse chiavi di quello
italiano, e nessun valore è vuoto*. Fallisce la build, non la visita.

Più una suite e2e del sito inglese, sul modello di quelle esistenti, che verifichi le
schermate principali e — soprattutto — che **nessun testo sia rimasto in italiano**.

## 4. Cosa costa

| Pezzo | Peso |
|---|---|
| Scelta della lingua dall'indirizzo + rewrite su Vercel | piccolo |
| Secondo oggetto `copy`, selezione all'avvio | piccolo (il codice; non la traduzione) |
| `@inContext(language:)` su prodotti e carrello | piccolo, meccanico |
| Selettore di lingua nell'interfaccia (menu) | piccolo |
| `lang`, `title`, `description`, `og:locale`, `hreflang` per lingua | piccolo |
| Invariante di parità delle chiavi | piccolo |
| Suite e2e del sito inglese | medio |
| **Le traduzioni** | **è qui che sta il lavoro, e non è codice** |

Il codice è lavoro di poche sessioni. Il collo di bottiglia sono i testi inglesi:
interfaccia, capi, Lookbook, Brand Story e le sette pagine legali — queste ultime
riscritte, non tradotte a macchina, perché sono documenti legali.

## 5. Prerequisiti, e perché non si parte adesso

1. **Il lancio in italiano.** L'inglese raddoppia la superficie da verificare: farlo
   prima significa lanciare più tardi e con più rischio. È la ragione per cui l'utente
   l'ha messo dopo il lancio il 2026-10-16, e resta valida.
2. **I testi del cliente in inglese**, chiesti insieme al catalogo (`CONTENUTI.md`).
3. **Le pagine legali in inglese** sul negozio Shopify, scritte dal venditore.

Finché manca il punto 2, si può scrivere il codice ma non lo si può verificare su
contenuto vero: resterebbe un meccanismo senza niente dentro.

**Si parte col comando `Approvato, procedi alla fase 8f`.**
