# Lookbook, elementi comuni, misure e casi d'emergenza

Questo gruppo di file raccoglie quattro cose diverse. La scheda del Lookbook / Brand Story (il racconto della collezione con la sua galleria). I "mattoncini" comuni usati da molte parti dell'interfaccia: il bottone, il segnaposto grafico al posto delle foto e la trappola del focus delle finestre. Gli strumenti di misura delle prestazioni (il pannello `?perf=1` e il benchmark `?bench=1`). Infine le schermate d'emergenza che compaiono quando la grafica 3D non parte o si interrompe. Quasi tutti i testi visibili vengono da `storeConfig.copy` in `src/config/storeConfig.js`: per cambiare una frase si cambia lì, non in questi file. Le poche eccezioni scritte direttamente nel codice sono segnalate riga per riga.

## `src/ui/lookbook/LookbookSheet.jsx` (113 righe)

Disegna il contenuto della scheda "Brand Story": titolo della collezione, galleria di immagini sfogliabile, testo del racconto, dati del marchio (tagline, città, coordinate, credito) e i capi del look, che si aprono nella loro scheda prodotto. La usa `src/ui/dialog/DialogHost.jsx`, la finestra che ospita tutte le schede. Si può cambiare senza rischi tutto ciò che sta nella sezione `lookbook` di `storeConfig.js` (titolo, stagione, testi, immagini, capi collegati) e i testi in `storeConfig.copy.lookbook`; nel file si possono ritoccare classi grafiche e dimensioni. Non va toccato il calcolo della cornice fissa (righe 22–25 e 52–54): serve a non far "saltare" i bottoni quando le immagini hanno proporzioni diverse.

**r. 1** `import { useState } from 'react'` — Prende da React la funzione `useState`, che permette a un componente di ricordarsi un valore (qui: quale immagine della galleria è visibile). Un *componente React* è un pezzo di interfaccia scritto come funzione che restituisce ciò che va disegnato.

**r. 2** `import { storeConfig } from '../../config/storeConfig.js'` — Carica la configurazione del negozio, l'unica fonte di dati e testi del sito.

**r. 3** `import { formatPrice, pad2 } from '../../lib/format.js'` — Due aiuti di formattazione: `formatPrice` scrive un prezzo nella lingua del marchio (es. "189 €"), `pad2` aggiunge lo zero davanti ai numeri a una cifra ("3" diventa "03").

**r. 4** `import { useAppStore } from '../../state/useAppStore.js'` — Lo "stato" generale dell'app (Zustand): da qui si prende il comando che apre le schede.

**r. 5–6** `import PlaceholderImage … / import Button …` — I due mattoncini comuni usati qui: il segnaposto grafico al posto delle foto e il bottone (spiegati più sotto in questo documento).

**r. 7** *(riga vuota)* — Separa le importazioni dal resto.

**r. 8–13** `/** Lookbook / Brand Story. … */` — Commento descrittivo: i testi del racconto vengono da `lookbook`, i dati del marchio da `meta.brand`; è l'unico punto, oltre all'onboarding, dove compare il carattere gotico come titolo; la galleria si sfoglia con bottoni e frecce.

**r. 14** `export default function LookbookSheet({ entry, headingId })` — Inizio del componente. Riceve due *props* (i "parametri" che chi usa un componente gli passa): `entry`, la voce del lookbook da mostrare, e `headingId`, un identificativo che la finestra usa per dire agli screen reader qual è il titolo.

**r. 15** `const { brand } = storeConfig.meta` — Prende i dati del marchio (nome, origine, tagline, lingua) da `storeConfig.meta.brand`.

**r. 16** `const t = storeConfig.copy.lookbook` — Tutti i testi fissi di questa scheda ("Brand Story", "Immagine precedente", "Capi del look"…) vengono da `storeConfig.copy.lookbook`.

**r. 17** `const openDialog = useAppStore((s) => s.openDialog)` — Prende il comando che apre una scheda: servirà per aprire la scheda di un capo.

**r. 18** `const [index, setIndex] = useState(0)` — Il numero dell'immagine visibile, che parte da 0 (la prima). `setIndex` lo cambia e fa ridisegnare la scheda.

**r. 19–20** `const images = entry.images / const image = images[index]` — L'elenco delle immagini della voce e quella visibile in questo momento.

**r. 21** `const products = entry.productIds.map(…)` — Trasforma gli ID dei capi elencati nella voce del lookbook nei capi veri di `storeConfig.products`: le relazioni sono sempre per ID.

**r. 22** `const [fw, fh] = storeConfig.placeholders.galleryFrame` — Proporzioni della cornice fissa della galleria, da config (oggi 16:10).

**r. 23** `const [iw, ih] = storeConfig.placeholders.ratios[image.ratio]` — Proporzioni dell'immagine attuale ("16:9", "4:5", "1:1"), tradotte in numeri dalla tabella in config.

**r. 24–25** `const wide = iw / ih > fw / fh` — Decide se l'immagine è più "larga" della cornice: in quel caso la riempie in larghezza, altrimenti in altezza. Così non sfora mai. È una lezione appresa (vedi CONTEXT.md): non va semplificato.

**r. 26** `const go = (delta) => setIndex(…)` — Passa all'immagine successiva (+1) o precedente (−1), ricominciando da capo quando si arriva in fondo (e viceversa).

**r. 27** *(riga vuota)* — Separatore.

**r. 28–31** `const onGalleryKey = (e) => { … }` — Con il focus sulla galleria, le frecce destra e sinistra della tastiera sfogliano le immagini; `preventDefault` evita che la pagina scorra.

**r. 32** *(riga vuota)* — Separatore.

**r. 33–34** `return ( <div className="grid gap-8 short:gap-4">` — Inizia il disegno: una colonna di blocchi distanziati, meno distanziati su schermo basso (telefono in orizzontale, variante `short`).

**r. 35–36** `<header> <p className="micro">{t.eyebrow} · …` — Intestazione: una riga piccola con "Brand Story", la stagione e il nome del marchio.

**r. 37–41** `<h2 id={headingId} tabIndex={-1} …>{entry.title}` — Il titolo della collezione in carattere gotico. La dimensione si adatta allo schermo fra due misure dei token. `tabIndex={-1}` permette alla finestra di portarci il focus all'apertura, senza che sia raggiungibile col tasto Tab.

**r. 42–45** `<p className="mt-2 font-display …">{entry.subtitle}` — Il sottotitolo della collezione, maiuscolo e spaziato.

**r. 46** `</header>` — Fine dell'intestazione.

**r. 47** *(riga vuota)* — Separatore.

**r. 48** `<section aria-roledescription={t.galleryRole} …>` — Inizio della galleria. Le etichette per gli screen reader ("galleria", "Immagini della campagna") vengono da `copy.lookbook`; qui si aggancia anche la gestione delle frecce.

**r. 49–51** `{/* Il box non cambia altezza … */}` — Commenti: la cornice ha sempre la stessa altezza e su schermo basso si misura sull'altezza disponibile.

**r. 52–54** `<div className="flex … short:w-[calc(…)]" …>` — La cornice fissa: proporzioni prese dalla config, bordo sottile, immagine centrata. Su schermo basso la larghezza si calcola dall'altezza utile (`--sheet-frame-h`). `data-testid` serve solo ai test automatici.

**r. 55–62** `<PlaceholderImage key={image.id} … />` — L'immagine attuale, oggi un segnaposto grafico con etichetta. `key` cambia a ogni immagine, così il segnaposto ricomincia da capo; `seed` rende stabile il disegno di fondo; la classe sceglie se riempire in larghezza o in altezza (riga 25).

**r. 63** `</div>` — Fine della cornice.

**r. 64–70** `<div className="mt-3 flex …"> <Button …>←</Button> …` — Sotto la cornice: bottone "indietro", contatore "Immagine 02 / 05 · etichetta" e bottone "avanti". Le etichette dei bottoni per gli screen reader e la parola "Immagine" vengono da `copy.lookbook`; `aria-live` fa leggere il contatore quando cambia.

**r. 71** `</section>` — Fine della galleria.

**r. 72** *(riga vuota)* — Separatore.

**r. 73** `<section className="grid gap-4 md:grid-cols-[…]">` — Blocco del racconto: una colonna su telefono, due colonne (testo più largo, riquadro del marchio più stretto) da tablet in su.

**r. 74–76** `{entry.body.map((p) => <p key={p}>{p}</p>)}` — I paragrafi del racconto, uno per ogni elemento di `body` della voce del lookbook in config.

**r. 77–81** `<aside …> <p …>{brand.tagline}</p>` — Riquadro laterale con la tagline del marchio da `meta.brand.tagline` (oggi "We're just looking for somewhere", da confermare prima del lancio).

**r. 82** `<div className="rule my-4" />` — Una linea divisoria.

**r. 83–86** `<p className="micro">{t.origin}</p> …` — "Origine", poi città e paese, coordinate e credito del marchio, tutti da `meta.brand`.

**r. 87–88** `</aside> </section>` — Chiusura del riquadro e del blocco.

**r. 89** *(riga vuota)* — Separatore.

**r. 90** `{storeConfig.features.productModal.enabled && products.length > 0 && (` — La sezione dei capi compare solo se la scheda prodotto è attiva fra le funzioni (`features.productModal`) e se la voce ha almeno un capo collegato.

**r. 91–93** `<section> <h3 …>{t.products}</h3> <ul …>` — Titolo "Capi del look" in arancio e una griglia di due colonne (tre da schermi un po' più larghi).

**r. 94–97** `{products.map((p) => ( <li …> <button … onClick={…}>` — Per ogni capo, un bottone che apre la sua scheda prodotto (`openDialog('product', id)`).

**r. 98–99** `<PlaceholderImage ratio={p.media[0].ratio} … />` — L'immagine del capo: la prima voce di `media` del prodotto, con la categoria visibile.

**r. 100–103** `<span …>{p.name}</span>` — Il nome del capo, che diventa arancio al passaggio del mouse.

**r. 104** `<span className="micro …">{formatPrice(p.price, …)}</span>` — Il prezzo, preso da `storeConfig.products`. Attenzione: anche con il negozio Shopify attivo qui si legge ancora il prezzo della config (difetto noto, da sistemare nella Fase 8c).

**r. 105–110** `</button> </li> ))} </ul> </section> )}` — Chiusure dei capi, della griglia e della sezione.

**r. 111–113** `</div> ) }` — Fine del contenitore, del disegno e del componente.

## `src/ui/primitives/Button.jsx` (34 righe)

Il bottone usato in tutto il sito, in due versioni: `primary` (pieno arancio, con angoli a forma dell'ellisse del logo) e `ghost` (solo bordo, quella di default). Lo usano onboarding, menu, schede, carrello, benchmark e schermate d'errore. Si possono cambiare con calma colori, spaziature e caratteri delle due versioni; conviene non togliere `type="button"` (evita invii di moduli accidentali), l'altezza minima per il tocco e il passaggio di `ref`, che serve a spostarci il focus.

**r. 1** `import { brandMotif } from '../../config/designTokens.js'` — Prende dai token di design il "motivo del marchio", cioè le proporzioni dell'ellisse del logo.

**r. 2** *(riga vuota)* — Separatore.

**r. 3–6** `/** Bottone. La variante primary … */` — Commento: la versione principale usa l'ellisse del logo come bordo, così il motivo grafico si ripete nell'interfaccia.

**r. 7** `export default function Button({ variant = 'ghost', … })` — Il componente. Props: `variant` (di default `ghost`), `children` (ciò che sta dentro, es. il testo), `className` (classi in più), `ref` (un "aggancio" che permette ad altri di raggiungere il bottone vero, per esempio per dargli il focus) e tutto il resto (`...props`, es. `onClick`).

**r. 8–10** `const base = 'inline-flex … disabled:opacity-40 …'` — Stile comune a tutte le versioni: carattere del marchio in grassetto maiuscolo, cambio colore morbido; se il bottone è disabilitato diventa semitrasparente e non risponde ai click.

**r. 11** *(riga vuota)* — Separatore.

**r. 12–16** `const styles = { primary: { … borderRadius … } …` — Versione `primary`: fondo arancio (token `accent-flame`), testo scuro, osso al passaggio del mouse. Gli angoli arrotondati si calcolano dal rapporto dell'ellisse del logo (2,9), così il bottone ha la stessa forma del marchio.

**r. 17–20** `ghost: { className: … border border-line-strong …` — Versione `ghost`: senza fondo, con bordo; al passaggio del mouse il bordo si rinforza e il testo diventa arancio.

**r. 21** `}[variant]` — Sceglie la versione richiesta.

**r. 22** *(riga vuota)* — Separatore.

**r. 23–27** `return ( <button ref={ref} type="button" {...props}` — Disegna un vero bottone HTML, aggancia il `ref`, lo dichiara di tipo "button" e gli passa tutte le altre props ricevute.

**r. 28** `className={… styles.className … className …}` — Unisce le classi della versione con quelle aggiunte da chi lo usa.

**r. 29** `style={{ minHeight: 'var(--touch-min)', … }}` — Altezza minima adatta al dito (token `touch-min`), più lo stile della versione e quello eventualmente passato da fuori.

**r. 30–34** `> {children} </button> ) }` — Il contenuto del bottone e le chiusure.

## `src/ui/primitives/PlaceholderImage.jsx` (111 righe)

Disegna un riquadro grafico al posto di una foto che ancora non c'è: fondo, una trama a griglia o a diagonali, l'etichetta e la categoria. Ha tre stati distinti: segnaposto voluto, caricamento (animazione) ed errore (bordo rosso). Lo usano scheda prodotto, Lookbook, menu, Focus, carrello e altre parti. Colori, trame, proporzioni e tempi si cambiano in `storeConfig.placeholders`; alcune parole ("ERRORE", "PLH", "Segnaposto:", "Immagine in caricamento") sono scritte qui nel codice e non in `copy`. Quando arriveranno le foto vere questo componente andrà affiancato da uno che mostra immagini reali.

**r. 1** `import { useEffect, useRef, useState, useId } from 'react'` — Strumenti di React: `useEffect` (fare qualcosa quando il componente compare o cambia), `useRef` (una "scatola" che ricorda un valore senza ridisegnare), `useState` (valore ricordato che ridisegna), `useId` (un identificativo unico).

**r. 2** `import { storeConfig } from '../../config/storeConfig.js'` — La configurazione del negozio.

**r. 3** *(riga vuota)* — Separatore.

**r. 4–14** `/** Segnaposto grafico 2D. … */` — Commento che spiega i tre stati: `placeholder` (segnaposto intenzionale, nitido), `loading` (caricamento reale, animato, con un tempo massimo) ed `error` (bordo rosso). Il riquadro ha le proporzioni giuste fin da subito, così la pagina non "salta".

**r. 15–24** `export default function PlaceholderImage({ ratio = '1:1', … })` — Il componente e le sue props: proporzioni, etichetta, categoria, variante grafica (`product`, `editorial`, `studio`), stato, `seed` (testo che rende stabile la trama), `compact` per le miniature e classi in più.

**r. 25** `const cfg = storeConfig.placeholders` — Le impostazioni dei segnaposto in config.

**r. 26** `const spec = cfg.variants[variant] ?? cfg.variants.product` — Colori e trama della variante richiesta; se non esiste, usa `product`.

**r. 27** `const [w, h] = cfg.ratios[ratio] ?? cfg.ratios['1:1']` — Le proporzioni in numeri; se sconosciute, quadrato.

**r. 28** `const patternId = useId()` — Un nome unico per la trama di questo riquadro, così due segnaposto nella stessa pagina non si confondono.

**r. 29** *(riga vuota)* — Separatore.

**r. 30** `const [resolved, setResolved] = useState(state)` — Lo stato effettivo mostrato, che può diventare "errore" da solo (riga 38).

**r. 31** `const startedAt = useRef(Date.now())` — Memorizza quando è iniziato lo stato attuale. In questo file il valore viene aggiornato ma non letto da nessuna parte (la durata minima `minVisibleMs` della config qui non è applicata).

**r. 32** *(riga vuota)* — Separatore.

**r. 33–36** `useEffect(() => { startedAt.current = …; setResolved(state)` — Ogni volta che cambia lo stato richiesto, lo applica; se non è "caricamento" non c'è altro da fare.

**r. 37–40** `const timer = setTimeout(() => setResolved('error'), …)` — Se è in caricamento, dopo `skeleton.timeoutMs` (8 secondi in config) passa da solo a "errore": un'animazione di caricamento non deve girare all'infinito. Il timer si annulla se il riquadro sparisce o cambia stato.

**r. 41** *(riga vuota)* — Separatore.

**r. 42–43** `const offset = [...String(seed)].reduce(…) % 12` — Ricava dal `seed` un piccolo spostamento (0–11) della trama: ogni segnaposto ha un disegno leggermente diverso, ma sempre uguale per lo stesso capo.

**r. 44** *(riga vuota)* — Separatore.

**r. 45–46** `const isLoading = … / const isError = …` — Due scorciatoie per sapere in che stato si è.

**r. 47** *(riga vuota)* — Separatore.

**r. 48–55** `return ( <div className={…} style={{ aspectRatio … }}` — Il riquadro: proporzioni fisse, colore di fondo della variante, bordo sottile oppure rosso (token `state-danger`) in caso di errore.

**r. 56–59** `role="img" aria-label={…} data-state={resolved}` — Per gli screen reader il riquadro è un'immagine, descritta come "Segnaposto: …" o "Immagine in caricamento" (frasi scritte qui nel codice). `data-state` serve ai test.

**r. 60–61** `{!isLoading && spec.pattern !== 'none' && ( <svg …>` — Se non sta caricando e la variante prevede una trama, disegna un livello vettoriale (SVG) a tutto riquadro.

**r. 62–69** `<defs> <pattern id={patternId} …> … </defs>` — Definisce la trama ripetuta ogni 16 pixel, spostata di `offset`: una griglia leggera per `grid`, linee diagonali per l'altra trama, nel colore della variante e molto trasparente.

**r. 70–72** `<rect width="100%" height="100%" fill={…} /> </svg> )}` — Riempie tutto il riquadro con quella trama, poi chiude il livello.

**r. 73** *(riga vuota)* — Separatore.

**r. 74–84** `{isLoading && ( <div …> <div style={{ animation … }} />` — In caricamento, al posto della trama, una fascia luminosa che scorre (animazione `shimmer`, definita in `src/styles/index.css`, durata da `skeleton.shimmerMs`). Niente testo, per non confonderlo con un segnaposto.

**r. 85** *(riga vuota)* — Separatore.

**r. 86–87** `{/* Etichetta e categoria restano visibili … */}` — Commento: le scritte distinguono un segnaposto voluto da un caricamento bloccato.

**r. 88–89** `{!isLoading && ( <div className={…flex-col…}>` — Fuori dal caricamento, un livello con le scritte disposte in alto e in basso; margini più piccoli se `compact`.

**r. 90–93** `<span className="micro" …>{isError ? 'ERRORE' : ratio}` — In alto a sinistra: le proporzioni (es. "4:5") oppure "ERRORE".

**r. 94–97** `{spec.showCategory && category && ( … )} </div>` — In alto a destra la categoria del capo, solo se la variante lo prevede e la categoria è stata passata.

**r. 98–104** `<div className="flex items-end …"> <span …>{label}</span>` — In basso a sinistra l'etichetta grande (es. il nome dello scatto), più piccola nelle miniature.

**r. 105** `{!compact && <span …>PLH</span>}` — In basso a destra la sigla "PLH" (placeholder), tranne nelle miniature: dichiara che è un segnaposto.

**r. 106–111** `</div> </div> )} </div> ) }` — Chiusure dei livelli, del riquadro e del componente.

## `src/ui/primitives/useFocusTrap.js` (59 righe)

È la "trappola del focus": quando si apre una finestra (scheda o menu), il cursore della tastiera (il *focus*, cioè l'elemento che riceve i tasti) resta chiuso dentro di essa; Tab gira solo fra i suoi elementi, ESC la chiude e, alla chiusura, il focus torna al bottone che l'aveva aperta. Gestisce più finestre una sopra l'altra: risponde solo l'ultima aperta. La usano `DialogHost.jsx`, `MenuDrawer.jsx` e `ContextLostOverlay.jsx`. È un file delicato per l'accessibilità: meglio non modificarlo senza rifare i test e2e delle schede.

**r. 1** `import { useEffect, useRef } from 'react'` — Strumenti di React (vedi sopra).

**r. 2** *(riga vuota)* — Separatore.

**r. 3** `const FOCUSABLE = 'a[href], button:not([disabled]), …'` — L'elenco dei tipi di elementi che possono ricevere il focus: link, bottoni, campi non disabilitati ed elementi con un ordine di Tab esplicito.

**r. 4** *(riga vuota)* — Separatore.

**r. 5–7** `const traps = []` — La pila delle trappole attive, dalla più vecchia alla più nuova. Solo l'ultima risponde: con menu aperto e scheda sopra, ESC chiude la scheda e basta.

**r. 8** *(riga vuota)* — Separatore.

**r. 9** `const focusables = (root) => […].filter(…)` — Trova, dentro la finestra, gli elementi raggiungibili col Tab che sono davvero visibili sullo schermo.

**r. 10** *(riga vuota)* — Separatore.

**r. 11–19** `/** Trappola del focus per una finestra modale. … */` — Commento con le quattro regole: il focus entra nella finestra, Tab gira dentro, ESC chiama `onEscape` e non arriva ad altri, alla chiusura il focus torna a chi l'aveva aperta.

**r. 20** `export function useFocusTrap(ref, active, onEscape)` — La funzione (un *hook*, cioè un comportamento riutilizzabile che i componenti "agganciano"). Riceve la finestra (`ref`), se è attiva (`active`) e cosa fare con ESC (`onEscape`).

**r. 21–22** `const onEscapeRef = useRef(onEscape) …` — Tiene sempre aggiornata l'azione di ESC senza dover rimontare la trappola a ogni ridisegno.

**r. 23** *(riga vuota)* — Separatore.

**r. 24–25** `useEffect(() => { if (!active) return` — Il lavoro parte solo quando la finestra è attiva.

**r. 26–27** `const token = {}; traps.push(token)` — Crea un "gettone" per questa trappola e lo mette in cima alla pila.

**r. 28** `const opener = document.activeElement` — Ricorda quale elemento aveva il focus prima (di solito il bottone che ha aperto la finestra).

**r. 29** `ref.current?.focus({ preventScroll: true })` — Porta il focus dentro la finestra, senza far scorrere la pagina.

**r. 30** *(riga vuota)* — Separatore.

**r. 31–32** `const onKey = (e) => { if (traps[…] !== token …) return` — A ogni tasto premuto: se questa non è la trappola più recente, o la finestra non c'è più, non fa nulla.

**r. 33–38** `if (e.key === 'Escape') { … onEscapeRef.current?.() …` — Con ESC: blocca l'azione normale del browser, impedisce che il tasto arrivi ad altri ascoltatori (menu o Focus sotto) ed esegue l'azione di chiusura.

**r. 39** `if (e.key !== 'Tab') return` — Gli altri tasti, tranne Tab, passano normalmente.

**r. 40–41** `const items = focusables(ref.current) …` — Raccoglie gli elementi raggiungibili; se non ce n'è nessuno, Tab non fa nulla (resta nella finestra).

**r. 42–44** `const first = … const last = … const inside = …` — Il primo e l'ultimo elemento, e se il focus è già dentro la finestra.

**r. 45–46** `if (e.shiftKey && (…)) { e.preventDefault(); last.focus() }` — Shift+Tab sul primo elemento (o da fuori): salta all'ultimo, così il giro si chiude.

**r. 47–50** `} else if (!e.shiftKey && (…)) { … first.focus() }` — Tab sull'ultimo elemento (o da fuori): torna al primo.

**r. 51–52** `window.addEventListener('keydown', onKey, true)` — Ascolta i tasti sull'intera finestra del browser "in fase di cattura", cioè prima di chiunque altro: è ciò che permette di fermare ESC.

**r. 53–57** `return () => { … traps.splice(…); … opener.focus …` — Alla chiusura: smette di ascoltare, toglie il gettone dalla pila e, se il bottone d'apertura esiste ancora, gli restituisce il focus.

**r. 58–59** `}, [active, ref]) }` — Il comportamento si rimonta solo se cambia l'attivazione o la finestra; fine del file.

## `src/ui/perf/PerfHud.jsx` (49 righe)

È il piccolo pannello delle prestazioni che compare in alto a sinistra aggiungendo `?perf=1` all'indirizzo (anche sul sito pubblicato, per misurare sui telefoni veri). Mostra fotogrammi al secondo, tempi, numero di disegni, triangoli e memoria grafica. Lo usa `src/App.jsx` solo durante l'esplorazione. I numeri arrivano già calcolati da `usePerfStore` (alimentato da `src/lib/perf.js`); le etichette sono in `storeConfig.copy.perf`. Si può cambiare l'aspetto senza rischi; le formule non stanno qui.

**r. 1–2** `import { storeConfig } … / import { usePerfStore } …` — Configurazione e "contenitore" delle misure di prestazione.

**r. 3** *(riga vuota)* — Separatore.

**r. 4** `const f1 = (n) => (… n.toFixed(1) : '—')` — Scrive un numero con un decimale; se non c'è ancora un valore, una lineetta.

**r. 5** `const f0 = (n) => (… Math.round(n).toLocaleString(…) …)` — Scrive un numero intero con i separatori delle migliaia della lingua del marchio (es. "12.345").

**r. 6** *(riga vuota)* — Separatore.

**r. 7–11** `/** HUD prestazioni (?perf=1, …) */` — Commento: il pannello esiste anche in produzione e non intercetta tocchi o click (è solo testo sopra la scena).

**r. 12** `export default function PerfHud({ device })` — Il componente; riceve `device`, la descrizione del dispositivo (livello grafico e nome della scheda video).

**r. 13–15** `const stats = … const memory = … const dpr = …` — Legge le ultime misure: statistiche dei fotogrammi, oggetti in memoria grafica e densità di pixel dello schermo (`dpr`).

**r. 16** `const t = storeConfig.copy.perf` — Le etichette vengono da `storeConfig.copy.perf`.

**r. 17** `const software = /swiftshader|llvmpipe|software/i.test(…)` — Riconosce se la grafica è "simulata" dal processore invece che fatta dalla scheda video: in quel caso i numeri non valgono come misura reale.

**r. 18–25** `const rows = [ [t.fps, f1(stats?.fpsP50)], … ]` — Le righe della tabella: fps mediani (p50), 1% più lento, tempo del fotogramma al 95°, chiamate di disegno (media / massimo), triangoli, e geometrie / texture / programmi in memoria grafica.

**r. 26** *(riga vuota)* — Separatore.

**r. 27–33** `return ( <div className="pointer-events-none fixed …"` — Il riquadro: fisso in alto a sinistra, larghezza fissa (per non allargarsi con testi lunghi), semitrasparente, sopra la scena (livello `z-hud`), ignorato dai click e dagli screen reader.

**r. 34–36** `<p …>{t.title} · tier {device.tier} · dpr … · cap …` — Prima riga in arancio: titolo, livello grafico del dispositivo, densità di pixel e tetto di fps impostato in `performance.targetFps`. Le parole "tier", "dpr" e "cap" sono scritte nel codice.

**r. 37–44** `<dl …> {rows.map(([k, v]) => ( … ))} </dl>` — Disegna la tabella etichetta → valore, a due colonne.

**r. 45** `<p className="micro mt-1 truncate">{device.renderer}</p>` — Il nome della scheda video, tagliato se troppo lungo.

**r. 46** `{software && <p …>{t.softwareWarning}</p>}` — Se la grafica è simulata, l'avviso in rosso (testo da `copy.perf.softwareWarning`).

**r. 47–49** `</div> ) }` — Chiusure.

## `src/ui/bench/BenchPanel.jsx` (177 righe)

È il pannello del *benchmark* (`?bench=1`): una prova automatica e ripetibile che fa camminare il visitatore lungo un percorso fisso (circa 40 secondi), misura le prestazioni e alla fine mostra i risultati con una riga pronta da incollare in `docs/PERF.md`. Lo usa `src/App.jsx` durante l'esplorazione. Il percorso si cambia in `storeConfig.benchmark`, i testi in `storeConfig.copy.bench`; la logica della prova sta in `src/lib/bench.js`. Non va tolto il velo che blocca i tocchi durante la misura, né l'interruzione al momento dell'uscita dalla pagina.

**r. 1** `import { useCallback, useEffect, useMemo, useRef, useState } …` — Strumenti di React; `useCallback` e `useMemo` servono a non ricreare funzioni e dati a ogni ridisegno.

**r. 2** `import { storeConfig } …` — La configurazione.

**r. 3** `import { runBenchmark, aggregateRuns, perfRow, … } …` — Le funzioni del benchmark da `src/lib/bench.js`: eseguire un giro, riassumere più giri, comporre la riga del registro, riconoscere il browser, riassumere i tratti e gli scatti.

**r. 4–6** `import { useAppStore } … usePlayerStore … usePerfStore …` — Gli stati dell'app, del visitatore (posizione e comandi) e delle misure.

**r. 7** `import Button from '../primitives/Button.jsx'` — Il bottone comune.

**r. 8** `import { fxDisabled, grainBlend } from '../fx/…'` — Se la grana è spenta (`&fx=0`) e che tipo di grana è in uso: finiscono nella riga del registro.

**r. 9** *(riga vuota)* — Separatore.

**r. 10** `/* global __BUILD_COMMIT__ */` — Avvisa il controllo del codice che esiste la variabile `__BUILD_COMMIT__`, inserita al momento della build con il codice della versione pubblicata.

**r. 11** `const f1 = (n) => …` — Numero con un decimale, o lineetta.

**r. 12** *(riga vuota)* — Separatore.

**r. 13–18** `/** Benchmark (?bench=1). … */` — Commento: parte da solo dopo l'ingresso, segue il percorso di `storeConfig.benchmark`, "Ripeti" accumula i giri (il protocollo ne vuole 3), un velo blocca i tocchi durante la prova.

**r. 19** `export default function BenchPanel({ device, ready })` — Il componente; `ready` dice se la scena ha già disegnato il primo fotogramma.

**r. 20–21** `const t = storeConfig.copy.bench / const bench = …` — Testi da `storeConfig.copy.bench` e percorso da `storeConfig.benchmark`.

**r. 22** `const [status, setStatus] = useState('waiting')` — Lo stato del pannello: in attesa, in corso, finito, interrotto, fallito.

**r. 23–26** `const [progress …] … [runs …] … [error …] … [copied …]` — Avanzamento del giro, elenco dei giri completati, messaggio d'errore ed esito della copia negli appunti.

**r. 27–28** `const controller = useRef(null) / const started = …` — Il "telecomando" per interrompere il giro e un promemoria per avviare il primo giro una sola volta.

**r. 29** `const waypoints = useMemo(() => new Map(…), [])` — Una tabella dei punti di passaggio della mappa, ritrovabili per ID.

**r. 30** *(riga vuota)* — Separatore.

**r. 31–35** `const start = useCallback(async () => { … app.closeMenu() …` — Avvio di un giro: chiude menu, schede ed eventuale Focus, così si parte da una situazione pulita.

**r. 36–40** `controller.current = new AbortController() …` — Prepara il comando d'interruzione, segna "in corso", azzera errore e copia, e avvisa l'app che il benchmark gira (questo blocca i comandi del visitatore).

**r. 41–46** `try { const result = await runBenchmark({ … onProgress …` — Esegue il giro e attende la fine, passando percorso, punti, il segnale d'interruzione e la funzione che aggiorna l'avanzamento.

**r. 47–54** `api: { issue: …, exitFocus: …, focusState: … }` — I "comandi" che il benchmark può usare: dare ordini al visitatore, uscire dal Focus, leggere lo stato del Focus, sapere se c'è un percorso in corso e la posizione attuale.

**r. 55–57** `setRuns((r) => [...r, result]); setStatus('done') …` — A giro finito: aggiunge il risultato all'elenco e segna "completato". In modalità debug lo espone anche ai test (`window.__benchResult`).

**r. 58–61** `} catch (e) { setStatus(… 'aborted' : 'failed') …` — Se qualcosa va storto: "interrotto" se l'ha fermato l'utente, altrimenti "fallito" con il messaggio d'errore; esce dal Focus se era rimasto aperto.

**r. 62–66** `} finally { … benchRunning: false … }, [bench, waypoints])` — In ogni caso, alla fine, sblocca i comandi del visitatore e cancella l'avanzamento.

**r. 67** *(riga vuota)* — Separatore.

**r. 68–73** `useEffect(() => { if (!ready || started.current) return …` — Primo giro automatico appena la scena è pronta, una volta sola.

**r. 74** *(riga vuota)* — Separatore.

**r. 75** `useEffect(() => () => controller.current?.abort(), [])` — Se il pannello sparisce (es. si lascia la pagina), interrompe il giro in corso.

**r. 76** *(riga vuota)* — Separatore.

**r. 77–79** `const running = … const agg = … const software = …` — Se sta girando, il riassunto di tutti i giri (mediana dei p50, peggiore 1% low) e se la grafica è simulata.

**r. 80–90** `const row = agg && perfRow(agg, { date: …, device: …` — Compone la riga per `docs/PERF.md`: data di oggi, dispositivo "(da compilare)", scheda video, browser, versione del codice, livello grafico con tipo di grana, densità di pixel, dimensioni della finestra e se la misura è reale. Le parole vengono da `copy.bench`.

**r. 91–93** `const st = stutterSummary(runs) / const report = …` — Aggiunge sotto la riga il dettaglio per tratto del percorso e gli "scatti" (fotogramma più lungo, quanti oltre 50 ms e oltre 250 ms): si copiano insieme.

**r. 94** *(riga vuota)* — Separatore.

**r. 95–102** `const copy = async () => { … navigator.clipboard …` — Copia il resoconto negli appunti e scrive "Copiato"; se il browser non lo permette, chiede di selezionare il testo a mano.

**r. 103** *(riga vuota)* — Separatore.

**r. 104–107** `if (running) { const step = progress?.step; return ( <>` — Durante il giro si disegna una cosa diversa: il velo e la barra di stato.

**r. 108–109** `{/* Velo … */} <div className="fixed inset-0" …/>` — Un velo trasparente a tutto schermo sopra la scena: nessun tocco o click arriva alla scena durante la misura.

**r. 110–111** `<div className="fixed inset-x-0 top-4 …"> … role="status"` — Una barra in alto al centro, annunciata agli screen reader come stato che si aggiorna.

**r. 112–116** `{t.title} · {progress?.index >= 0 ? … : t.warmup}` — Il testo di avanzamento: "Benchmark · Passo 3/12 · nome del tratto", oppure il messaggio di riscaldamento prima dell'inizio.

**r. 117** `<Button onClick={() => controller.current?.abort()}>` — Il bottone "Interrompi".

**r. 118–122** `</div> </div> </> ) }` — Chiusure della vista "in corso".

**r. 123** *(riga vuota)* — Separatore.

**r. 124** `if (status === 'waiting') return null` — In attesa (o dopo "Chiudi") non si mostra nulla.

**r. 125** *(riga vuota)* — Separatore.

**r. 126–129** `return ( <div className="fixed inset-x-0 bottom-0 …">` — Il pannello dei risultati in basso, largo al massimo come un foglio, con scorrimento se è troppo alto.

**r. 130–135** `<div …> <p …>{t.title} · {status === 'done' ? …}</p> …` — Intestazione: "Benchmark · Completato / Interrotto / Passo non riuscito" in arancio e, a destra, livello grafico e versione del codice.

**r. 136** `{error && <p … color: … danger …>{error}</p>}` — Se c'è un errore, il messaggio in rosso.

**r. 137** *(riga vuota)* — Separatore.

**r. 138–140** `{runs.length > 0 && ( <div …> <table …>` — Se c'è almeno un giro, una tabella dei risultati (scorrevole in orizzontale sui telefoni).

**r. 141–147** `<thead> <tr> {[t.run, …].map((h) => ( <th …>` — Intestazioni delle colonne: Run, fps p50, p95 ms, 1% low, draw call, secondi (testi da `copy.bench` e `copy.perf`).

**r. 148–157** `<tbody> {runs.map((r, i) => ( <tr …> … ))} </tbody> </table>` — Una riga per ogni giro con i suoi numeri.

**r. 158–160** `{t.median}: {f1(agg.fpsP50Median)} · {t.worst}: …` — Il riassunto del protocollo: mediana dei p50 e peggiore 1% low.

**r. 161** `<p className="micro mt-1">{t.runsHint}</p>` — Promemoria del protocollo (3 giri per dispositivo).

**r. 162–164** `<textarea readOnly value={report} …/>` — Riquadro di testo non modificabile con la riga pronta; cliccandoci il testo si seleziona tutto.

**r. 165–166** `</div> )}` — Fine del blocco dei risultati.

**r. 167** *(riga vuota)* — Separatore.

**r. 168–169** `<div …> <Button variant="primary" onClick={start}>{t.repeat}` — I bottoni in fondo: "Ripeti" lancia un altro giro, che si somma ai precedenti.

**r. 170–171** `{row && <Button onClick={copy}>{t.copy}</Button>} …` — "Copia riga per PERF.md" (solo se c'è una riga) e l'esito della copia.

**r. 172** `<Button className="ml-auto" onClick={…}>{t.close}</Button>` — "Chiudi": nasconde il pannello (i giri restano in memoria finché non si ricarica la pagina).

**r. 173–177** `</div> </section> </div> ) }` — Chiusure.

## `src/ui/fallback/WebGLFallback.jsx` (26 righe)

Schermata mostrata al posto del negozio quando il dispositivo o il browser non supporta la grafica 3D richiesta (*WebGL2*, la tecnologia del browser che disegna il 3D con la scheda video), oppure dopo tre errori di fila della scena. La usa `src/App.jsx`. Titolo, testo e suggerimento vengono da `storeConfig.copy.errors.webgl` e si cambiano lì; la riga "renderer rilevato" è scritta nel codice.

**r. 1** `import { storeConfig } …` — La configurazione.

**r. 2** *(riga vuota)* — Separatore.

**r. 3** `/** Schermata per dispositivi senza WebGL2. … */` — Commento: tutti i testi vengono da `storeConfig.copy`.

**r. 4** `export default function WebGLFallback({ renderer })` — Il componente; riceve il nome della scheda video rilevata, se c'è.

**r. 5–6** `const copy = storeConfig.copy.errors.webgl` — Dati del marchio e testi della schermata.

**r. 7** *(riga vuota)* — Separatore.

**r. 8–12** `return ( <div className="fixed inset-0 …" …>` — Uno schermo pieno col fondo del sito, sopra tutto (livello `z-fallback`), contenuto centrato.

**r. 13–14** `<div className="w-full max-w-xl"> <p …>{brand.origin.city} · …` — Una colonna di larghezza contenuta; in alto città e coordinate del marchio.

**r. 15–18** `<h1 …>{copy.title}</h1>` — Il titolo ("WebGL non disponibile").

**r. 19** `<div className="rule my-6" />` — Linea divisoria.

**r. 20–21** `<p …>{copy.body}</p> <p …>{copy.hint}</p>` — Spiegazione e suggerimento (aggiornare il browser, accelerazione hardware).

**r. 22** `{renderer && <p …>renderer rilevato: {renderer}</p>}` — Se si conosce la scheda video, la mostra (utile per chi deve capire il problema).

**r. 23–26** `</div> </div> ) }` — Chiusure.

## `src/ui/fallback/ContextLostOverlay.jsx` (34 righe)

Finestra che compare se il *contesto WebGL* va perso, cioè se il browser interrompe di colpo la grafica 3D (la scheda video si resetta, la pagina resta a lungo in secondo piano). Se il browser restituisce la grafica da solo la scena si rimonta senza bisogno di nulla; altrimenti c'è "Riprova". La usa `src/App.jsx`, che le passa la funzione di ripristino; compare anche dopo un errore della scena (vedi `SceneErrorBoundary`). Testi in `storeConfig.copy.errors.contextLost`. Non va tolta la trappola del focus: impedisce che Tab ed ESC arrivino alle finestre nascoste sotto.

**r. 1–4** `import { useEffect, useRef } … Button … useFocusTrap …` — Strumenti di React, configurazione, bottone comune e trappola del focus.

**r. 5** *(riga vuota)* — Separatore.

**r. 6–12** `/** Il contesto WebGL è andato perso. … */` — Commento: ripristino automatico o con "Riprova"; il visitatore riparte dalla posizione in cui era; è l'ultima trappola del focus.

**r. 13** `export default function ContextLostOverlay({ onRetry })` — Il componente; `onRetry` è l'azione di "Riprova" (in `App.jsx`: rimontare la scena).

**r. 14** `const copy = storeConfig.copy.errors.contextLost` — I testi della finestra.

**r. 15–16** `const button = useRef(null) / const root = useRef(null)` — Agganci al bottone e alla finestra.

**r. 17** `useFocusTrap(root, true, null)` — Attiva la trappola del focus sulla finestra, sempre accesa e senza azione per ESC: ESC non chiude nulla, l'unica uscita è "Riprova".

**r. 18** `useEffect(() => { button.current?.focus(…) }, [])` — All'apertura mette subito il focus sul bottone "Riprova", così basta premere Invio.

**r. 19** *(riga vuota)* — Separatore.

**r. 20–23** `<div ref={root} tabIndex={-1} role="alertdialog" …>` — Il velo a tutto schermo, quasi opaco, sopra tutto; per gli screen reader è una finestra d'allarme che blocca il resto.

**r. 24** `<div className="w-full max-w-md border border-state-danger …">` — Il riquadro centrale con bordo rosso (colore di stato d'errore).

**r. 25–28** `<h2 id="ctx-lost-title" …>{copy.title}</h2>` — Il titolo ("Contesto grafico perso"), collegato alla finestra come sua etichetta.

**r. 29** `<p …>{copy.body}</p>` — La spiegazione di cosa è successo.

**r. 30** `<Button ref={button} variant="primary" … onClick={onRetry}>` — Il bottone principale "Riprova".

**r. 31–34** `</div> </div> ) }` — Chiusure.

## `src/ui/fallback/SceneErrorBoundary.jsx` (25 righe)

È una *error boundary* ("barriera d'errore"): un componente React speciale che si mette attorno a un altro e, se quello si rompe, impedisce che si rompa tutta la pagina. Qui avvolge la scena 3D in `src/App.jsx`: se la scena non parte (grafica che non si crea, file 3D che non si scarica), sparisce da sola e `App.jsx` mostra la finestra "Riprova" o, dopo tre errori di fila, la schermata "WebGL non disponibile". È piccolo e va lasciato così: è scritto nella forma "a classe" perché React permette le barriere d'errore solo in questa forma.

**r. 1** `import { Component } from 'react'` — Prende da React la base dei componenti "a classe", l'unica forma che può fare da barriera d'errore.

**r. 2** *(riga vuota)* — Separatore.

**r. 3–9** `/** Rete di sicurezza attorno alla scena 3D. … */` — Commento: senza la barriera un errore nella scena lascerebbe la pagina vuota; si azzera rimontando la scena con una nuova `key`.

**r. 10** `export default class SceneErrorBoundary extends Component {` — Inizio del componente a classe.

**r. 11** `state = { failed: false }` — Stato iniziale: nessun errore.

**r. 12** *(riga vuota)* — Separatore.

**r. 13–15** `static getDerivedStateFromError() { return { failed: true } }` — Quando React intercetta un errore nella scena, segna "fallito".

**r. 16** *(riga vuota)* — Separatore.

**r. 17–20** `componentDidCatch(error) { … onError?.(error) }` — Scrive l'errore nella console del browser ("scena 3D non disponibile") e avvisa `App.jsx`, che conta gli errori e decide quale schermata mostrare.

**r. 21** *(riga vuota)* — Separatore.

**r. 22–24** `return this.state.failed ? null : this.props.children` — Se è fallito non disegna nulla al posto della scena; altrimenti disegna la scena normalmente.

**r. 25** `}` — Fine della classe.
