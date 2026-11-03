/**
 * Rigenera docs/AUDIT-CARRELLO.md: il carrello per intero, per un revisore esterno.
 *
 * Perché esiste: il documento del 2026-10-30 era scritto a mano copiando il codice,
 * ed è invecchiato senza segnali (diceva che il bottone della cassa "non compare",
 * dopo che il codice era cambiato: audit 2026-11-02, T21). Qui il codice si legge
 * dai file al momento della generazione; a mano restano solo le spiegazioni.
 *
 *   npm run docs:carrello
 *
 * Si rifiuta di partire se i file copiati hanno modifiche non committate: il
 * documento dichiara un commit, e il codice dentro deve essere quello.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()
const read = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n')

const FILES = ['src/ui/cart/CartSheet.jsx', 'src/state/useCartStore.js', 'src/state/useLegalStore.js', 'src/state/useAppStore.js',
  'src/state/leaveGuard.js', 'src/commerce/index.js', 'src/commerce/shopify.js', 'src/lib/format.js', 'src/config/storeConfig.js']
const dirty = git('status', '--porcelain', '--', ...FILES)
if (dirty) { console.error(`file del carrello con modifiche non committate:\n${dirty}\nCommitta prima: il documento dichiara un commit.`); process.exit(1) }

const commit = git('rev-parse', '--short', 'HEAD')
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
const today = new Date().toISOString().slice(0, 10)

const fence = (f) => (f.endsWith('.jsx') ? 'jsx' : 'js')
const whole = (f, note) => `### \`${f}\`\n\n> ${note}\n\n\`\`\`${fence(f)}\n${read(f).trimEnd()}\n\`\`\`\n`

// Un estratto da una riga d'inizio alla chiusura allo stesso rientro, o a una riga di fine.
function excerpt(f, startRe, note, endRe = null) {
  const lines = read(f).split('\n')
  const a = lines.findIndex((l) => startRe.test(l))
  if (a < 0) throw new Error(`${f}: inizio ${startRe} non trovato`)
  const indent = lines[a].match(/^\s*/)[0]
  let b = a + 1
  while (b < lines.length && !(endRe ? endRe.test(lines[b]) : lines[b] === `${indent}},`)) b++
  if (b >= lines.length) throw new Error(`${f}: fine dell'estratto non trovata`)
  return `### \`${f}\` (righe ${a + 1}-${b + 1})\n\n> ${note}\n\n\`\`\`js\n${lines.slice(a, b + 1).join('\n')}\n\`\`\`\n`
}

// Quanti file usano ciascuna primitiva: contato, non scritto a mano.
const tracked = git('ls-files', 'src').split('\n').filter((f) => /\.(jsx?|mjs)$/.test(f))
const users = (name) => tracked.filter((f) => !f.endsWith(`${name}.jsx`) && new RegExp(`/${name}\\.jsx['"]`).test(read(f))).length
const linesOf = (f) => read(f).trimEnd().split('\n').length
const primitives = ['Button', 'MediaImage', 'PlaceholderImage'].map((n) => `| \`src/ui/primitives/${n}.jsx\` | ${linesOf(`src/ui/primitives/${n}.jsx`)} | ${users(n)} |`)

const doc = `# Il carrello di INTO industries — codice per audit esterno

Negozio streetwear navigabile in 3D, con carrello Shopify headless.
Generato il ${today} dal commit \`${commit}\`, branch \`${branch}\`, con \`npm run docs:carrello\`.
Il codice è letto dai file in quel momento, non riscritto.

> **È una fotografia.** Appena qualcuno tocca uno di quei file, questo documento
> invecchia. Si legge per spiegare il carrello a qualcuno da fuori, mai per sapere
> com'è il codice oggi. Per mandarlo di nuovo a un revisore si rigenera
> (\`npm run docs:carrello\`), non si aggiorna a mano.
>
> Sostituisce la versione del 2026-10-30 (\`f9f0ff6\`), scritta a mano, che dopo le
> correzioni dell'audit del 2026-11-02 diceva cose non più vere.

## Cosa fa, in due righe

Chi naviga il negozio 3D (o la versione senza 3D) apre un capo, sceglie taglia e colore
e lo aggiunge al carrello. Il carrello vive su Shopify: il sito non ha database, non
conserva dati di chi compra e non vede mai i dati di pagamento. Il pagamento avviene
sulla cassa di Shopify, sul dominio di Shopify.

## I quattro strati, e cosa c'è in ciascuno

| Strato | File | Responsabilità |
|---|---|---|
| Interfaccia | \`ui/cart/CartSheet.jsx\` | mostra righe, totali di riga, subtotale; annuncia i cambi; manda alla cassa |
| Stato | \`state/useCartStore.js\`, \`state/useLegalStore.js\`, \`state/leaveGuard.js\` | quando chiamare, riprova, limiti, errori; avviso in uscita |
| Contratto | \`commerce/index.js\` | cosa deve offrire un fornitore, e quale usare |
| Adapter | \`commerce/shopify.js\` | le chiamate vere alla Storefront API |

Dove guardare per primi, se il tempo è poco: \`safeCheckoutUrl\` in \`commerce/shopify.js\`
(sezione 4), la funzione \`run\` in \`useCartStore.js\` (sezione 2) e \`checkout\` /
\`canCheckout\` in \`CartSheet.jsx\` (sezione 1).

---

## 1. Interfaccia

${whole('src/ui/cart/CartSheet.jsx', "L'ultima schermata del sito prima della cassa di Shopify. Non calcola niente: righe, quantità, totali di riga e subtotale arrivano dallo stato; da `storeConfig` prende solo i nomi leggibili di taglia e colore, l'immagine e i testi. Senza un `checkoutUrl` valido il bottone del pagamento è spento e lo dice.")}

---

## 2. Stato

${whole('src/state/useCartStore.js', "Decide *quando* chiamare il fornitore: crea il carrello se manca, riprova una volta su un carrello nuovo se quello salvato è scaduto, accetta solo quantità intere, limita al massimo del config, distingue errori e avvisi, resta occupato mentre ripristina il carrello salvato. Contiene anche `useShownPrice`, la regola per cui un prezzo di configurazione non può mai sostituire quello del fornitore.")}
${whole('src/state/useLegalStore.js', 'Le informative pubblicate dal venditore su Shopify, caricate alla prima richiesta. Nessun testo legale sta nel codice.')}
${whole('src/state/leaveGuard.js', "Avviso del browser prima di lasciare il sito con capi nel carrello. Si spegne prima della navigazione verso la cassa (`allowLeave` in `CartSheet`).")}
${excerpt('src/state/useAppStore.js', /^\s*openDialog: \(kind, id\)/, 'La pila delle schede. `CartSheet` usa solo `openDialog` e `closeDialogs`; il resto dello store non lo tocca.', /^\s*closeDialogs:/)}

---

## 3. Contratto del commercio

${whole('src/commerce/index.js', 'Definisce cosa deve offrire un fornitore e sceglie quale usare: finto, Shopify, o nessuno. Gli interruttori da query string valgono solo nelle build di prova; la build decide che cosa è produzione e fallisce chiusa (`vite.config.js`, `isProduction`).')}

---

## 4. Adapter Shopify

${whole('src/commerce/shopify.js', "L'unico file che parla con la Storefront API. Query del catalogo (handle come variabili GraphQL) e delle pagine legali, cinque operazioni sul carrello, traduzione delle varianti Shopify negli id di taglia e colore del progetto (con avviso per quelle scartate), totale di riga da Shopify, e `safeCheckoutUrl`.")}

---

## 5. Utility e configurazione

${whole('src/lib/format.js', '`formatPrice` formatta importo e valuta che arrivano dal fornitore, sempre con due decimali come la cassa. Nessun componente decide come si scrive un prezzo.')}
${excerpt('src/config/storeConfig.js', /^ {2}commerce: \{/, "Estratto: il blocco `commerce`. Lo `storefrontToken` è il token **pubblico** del canale Headless, fatto per stare nel codice del sito: non è una credenziale trapelata, e il repository è pubblico per scelta. I suoi permessi sono ridotti ai quattro che il sito usa (verificato sul negozio di sviluppo il 2026-10-30, su quello del cliente il 2026-11-03). Il token privato dell'amministrazione non entra mai nel sorgente.")}
${excerpt('src/config/storeConfig.js', /^ {4}cart: \{/, 'Estratto: tutte le stringhe che il carrello mostra. Nessun testo è scritto nei componenti.')}

---

## 6. Sottocomponenti usati dal carrello

**Nessuno esclusivo.** \`CartSheet\` compone tre primitive condivise con il resto
dell'interfaccia, che per questo non sono riportate:

| File | Righe | File che lo usano |
|---|---|---|
${primitives.join('\n')}

Sono presentazionali: nessuna tocca prezzi, quantità o l'URL di pagamento.

---

## 7. Note per chi legge

**L'URL della cassa.** È l'unico valore che arriva dalla rete e diventa una
navigazione (\`window.location.assign\`). \`safeCheckoutUrl\` lo accetta solo se è
\`https:\` **e** l'host è esattamente il dominio del negozio o uno di
\`commerce.shopify.checkoutHosts\` (i domini propri del negozio, in minuscolo,
controllati all'avvio). Altrimenti il carrello resta senza cassa: il bottone «Vai al
pagamento» è **spento e spiega perché** (\`checkoutUnavailable\`), e in console resta
il motivo dello scarto. Fallisce chiuso, ma non in silenzio.

**I prezzi non vengono dalla configurazione.** Col commercio attivo importo, valuta,
totale di riga e subtotale arrivano solo dal fornitore; \`useShownPrice\` mostra \`—\`
se non risponde, mai il prezzo di \`storeConfig\`. Il totale di riga lo calcola Shopify
(sconti compresi), non il sito.

**La quantità è limitata due volte**, nell'interfaccia (il \`+\` è spento a
\`maxQuantity\`, con «Quantità massima raggiunta» visibile) e nello store, che accetta
solo interi e taglia a \`maxQuantity\` prima di chiamare il fornitore.

**Gli avvisi non vengono ingoiati.** Le mutazioni distinguono \`userErrors\` (operazione
rifiutata, diventa un'eccezione) da \`warnings\` (eseguita solo in parte, es. merce
esaurita: il carrello torna com'è davvero, con l'avviso). Chi chiama non conferma mai
un'aggiunta che non c'è stata.

**Ogni richiesta ha un timeout** di 10 secondi, e un controllo sui mercati fa fallire
subito il caricamento se il negozio non vende nel paese configurato.

**Accessibilità.** I bottoni restano col focus mentre il fornitore risponde
(\`aria-disabled\`, non \`disabled\`); dopo una rimozione il focus va al titolo o a
«Continua»; ogni cambio riuscito si annuncia in una regione \`role="status"\`; l'errore
compare sopra il bottone del pagamento.

**La rete.** La CSP (\`vercel.json\`) permette chiamate solo al dominio del negozio;
la build si ferma se \`connect-src\` e il dominio configurato non coincidono.

**Cosa il carrello non fa:** non conserva dati di chi compra (in \`localStorage\` solo
l'id del carrello, chiave \`${read('src/config/storeConfig.js').match(/cartStorageKey: '([^']+)'/)?.[1]}\`), non tocca dati di pagamento, non chiama
direttamente nessuna API: passa sempre dal fornitore.

**Stato della verifica.** \`e2e-phase8a\` (fornitore finto e Shopify simulato) e
\`test:commerce\` (contratto, senza rete) girano a ogni modifica. La prova dal vivo sul
negozio Shopify di sviluppo è \`e2e-phase8b\`: 12 su 12 il 2026-10-30, cassa compresa.
Non è stata rilanciata dopo le correzioni del 2026-11-03, perché l'ambiente di lavoro
non raggiungeva Shopify: va rifatta prima di unire.
`

writeFileSync(join(root, 'docs/AUDIT-CARRELLO.md'), doc)
console.log(`docs/AUDIT-CARRELLO.md: ${doc.split('\n').length} righe, commit ${commit}`)
