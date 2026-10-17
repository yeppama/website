# Interfaccia: ingresso, HUD, menu, Focus, effetti, stili

Questi file disegnano tutto ciò che sta "sopra" la scena 3D: la schermata d'ingresso, le scritte e i bottoni fissi mentre si cammina (HUD), la minimappa, la barra "Vai a" del telefono, i messaggi brevi, il menu a tendina, il pannello del Focus Mode sul capo, la grana e la dissolvenza a nero, e infine i fogli di stile generali e i caratteri tipografici. Nessuno di questi file contiene testi o colori propri: le frasi arrivano da `storeConfig.copy` (in `src/config/storeConfig.js`) e i colori, i caratteri e le dimensioni dai token di `src/config/designTokens.js`, trasformati in variabili CSS dal file generato `theme.generated.css`. Per cambiare una parola o un colore si interviene quasi sempre lì, non qui.

## `src/ui/onboarding/OnboardingScreen.jsx` (119 righe)

È la schermata iniziale che si vede prima di entrare nel negozio: marchio, tagline, istruzioni diverse per computer e telefono, barra di caricamento e bottone "Entra". La usa `src/App.jsx`, che la mostra finché il visitatore non entra. Si possono cambiare senza rischi i testi (in `storeConfig.copy.onboarding` e `storeConfig.meta.brand`) e, con un po' di attenzione, le classi di impaginazione; non va tolta la regola che tiene il bottone disabilitato finché la scena non è pronta, né lo scorrimento verticale che serve sui telefoni in orizzontale.

**r. 1** `import { useEffect, useState } from 'react'` — Carica da React due "hook", cioè funzioni di servizio: `useState` per ricordare un valore fra un disegno e l'altro, `useEffect` per eseguire codice dopo che la schermata è stata disegnata. Un componente React è una funzione che restituisce un pezzo di interfaccia.

**r. 2** `import { storeConfig } from '../../config/storeConfig.js'` — Carica la configurazione centrale del sito, da cui arrivano tutti i testi e i dati del brand.

**r. 3** `import Button from '../primitives/Button.jsx'` — Carica il bottone comune del sito (stile "primario" a ellisse arancione o "ghost" con bordo sottile).

**r. 4** `(riga vuota)` — Separa gli import dal resto.

**r. 5–15** `/** Schermata iniziale: identità del brand ...` — Commento che spiega le scelte: istruzioni diverse per desktop e mobile, righe segnate "in arrivo" se la funzione non è ancora attiva, bottone disabilitato finché la scena non è pronta. Non viene eseguito.

**r. 16** `export default function OnboardingScreen({ device, ready, ...` — Inizio del componente. Riceve da `App.jsx`: `device` (tipo di dispositivo), `ready` (scena pronta sì/no), `progress` (avanzamento da 0 a 1), `stageLabel` (nome della fase di caricamento) e `onEnter` (cosa fare al click su "Entra").

**r. 17** `const { brand } = storeConfig.meta` — Prende i dati del marchio (nome, città, coordinate, tagline, crediti) dalla configurazione.

**r. 18** `const copy = storeConfig.copy.onboarding` — Prende i testi di questa schermata da `storeConfig.copy.onboarding`: è lì che si cambiano le parole.

**r. 19** `const variant = device.isTouch ? copy.mobile : copy.desktop` — Sceglie la serie di istruzioni: quella per telefono se lo schermo è touch, altrimenti quella per computer.

**r. 20** `const features = storeConfig.features` — Prende l'elenco delle funzioni attive o spente (i "feature flag"), per sapere quali istruzioni sono già utilizzabili.

**r. 21** `(riga vuota)` — Separazione.

**r. 22–23** `const [shown, setShown] = useState(0)` — Il commento spiega lo scopo; `shown` è la percentuale mostrata a schermo, che parte da 0.

**r. 24–27** `useEffect(() => { ... requestAnimationFrame ...` — Ogni volta che arriva un nuovo `progress`, al prossimo fotogramma aggiorna la percentuale mostrata tenendo il valore più alto: la barra non torna mai indietro. La riga 26 annulla l'aggiornamento se nel frattempo la schermata sparisce.

**r. 28** `(riga vuota)` — Separazione.

**r. 29–31** `return ( // Scorre se lo schermo è basso ...` — Inizio di ciò che il componente disegna (scritto in JSX, una sintassi simile all'HTML dentro JavaScript). Il commento ricorda che la schermata deve poter scorrere, o su un telefono in orizzontale "Entra" resterebbe fuori schermo.

**r. 32–35** `<div className="fixed inset-0 overflow-y-auto ...` — Contenitore a tutto schermo con sfondo nero del brand (`bg-bg-base`). Le parole in `className` sono classi Tailwind, piccole regole di stile già pronte: `fixed inset-0` = incollato ai quattro bordi dello schermo, `overflow-y-auto` = scorre in verticale se serve. Lo `zIndex` dice quale strato sta sopra quale (numero più alto = più in alto): qui usa la variabile CSS `--z-onboarding` (valore 50, dai token), così la schermata copre tutto il resto.

**r. 36** `<div className="flex min-h-full flex-col justify-between ...` — Colonna interna alta almeno quanto lo schermo, con intestazione in alto, contenuto al centro e piè di pagina in basso. `sm:px-12 sm:py-12`: il prefisso `sm:` applica la regola solo da 640 px di larghezza in su (margini più ampi su schermi grandi).

**r. 37** `<header className="flex items-start justify-between gap-4">` — Intestazione: due testi ai due lati.

**r. 38** `<p className="micro">{copy.eyebrow}</p>` — Piccola scritta tecnica in alto a sinistra, testo da `copy.onboarding.eyebrow`. La classe `micro` (definita in `index.css`) dà il carattere monospaziato maiuscolo e grigio.

**r. 39–41** `<p className="micro text-right"> {brand.origin.city} ...` — In alto a destra città, paese e coordinate del brand, da `storeConfig.meta.brand.origin`.

**r. 42** `</header>` — Fine intestazione.

**r. 43** `(riga vuota)` — Separazione.

**r. 44** `<div className="mx-auto w-full max-w-3xl">` — Blocco centrale, centrato e largo al massimo circa 768 px.

**r. 45–46** `{/* Marchio e descrittore hanno pesi diversi ...` — Commento: "INTO" e "(industries*)" vanno sempre insieme ma con pesi diversi.

**r. 47** `<h1 className="flex flex-wrap items-baseline gap-x-4 ...` — Titolo principale della pagina; le due parti stanno sulla stessa riga allineate alla base delle lettere e vanno a capo se manca spazio.

**r. 48–53** `<span className="font-display font-black uppercase ...` — Il wordmark (`brand.wordmark`, cioè "INTO") nel carattere Archivo nerissimo. La dimensione `clamp(3rem, 14vw, var(--text-3xl))` vuol dire: cresce con la larghezza dello schermo, ma mai sotto 3rem né sopra la taglia `3xl` dei token. La spaziatura fra lettere viene dalla variabile `--tracking-tight`.

**r. 54–59** `<span className="font-mono lowercase text-accent-flame" ...` — Il descrittore `(industries*)` in monospaziato minuscolo, colore arancione Flame (`text-accent-flame`, dai token). Parentesi e asterisco sono aggiunti qui attorno a `brand.descriptor`.

**r. 60** `</h1>` — Fine titolo.

**r. 61** `(riga vuota)` — Separazione.

**r. 62–64** `<p className="mt-4 text-text-secondary" ...{brand.tagline}` — La tagline del brand, in grigio secondario, da `storeConfig.meta.brand.tagline`.

**r. 65** `(riga vuota)` — Separazione.

**r. 66** `<div className="rule my-8" />` — Linea orizzontale sottile (classe `rule` di `index.css`) con spazio sopra e sotto.

**r. 67** `(riga vuota)` — Separazione.

**r. 68–70** `<h2 className="micro mb-4" ... {variant.heading}` — Titoletto delle istruzioni (diverso per computer e telefono), colore dalla variabile `--color-text-secondary`.

**r. 71** `<ul className="grid gap-2 sm:grid-cols-2">` — Elenco delle istruzioni: una colonna su telefono, due colonne da 640 px in su.

**r. 72–74** `{variant.lines.map((line, i) => { ...` — Per ogni istruzione configurata controlla se richiede una funzione (`line.requires`) e se quella funzione è attiva; senza requisito è sempre attiva.

**r. 75–79** `return ( <li key={line.text} ...` — Disegna la riga: testo chiaro se attiva, grigio spento se no. `key` serve a React per riconoscere ogni riga; `data-active` è un'etichetta usata dai test automatici.

**r. 80–82** `<span className="micro" ... padStart(2, '0')` — Numero progressivo a due cifre (01, 02, ...), arancione se la riga è attiva.

**r. 83** `<span className={active ? '' : 'line-through ...` — Il testo dell'istruzione; se la funzione non è attiva viene barrato.

**r. 84–88** `{!active && ( <span ... {copy.comingSoon} ...` — Solo per le righe non attive: etichetta riquadrata "in arrivo nella Fase N", con testo da `copy.onboarding.comingSoon` e numero di fase da `features`.

**r. 89–91** `</li> ) })}` — Chiusura della riga e del ciclo.

**r. 92** `</ul>` — Fine elenco.

**r. 93** `(riga vuota)` — Separazione.

**r. 94** `<div className="mt-10 flex flex-wrap items-center gap-6">` — Riga con bottone e barra di caricamento affiancati (vanno a capo su schermi stretti).

**r. 95–97** `<Button variant="primary" disabled={!ready} onClick={onEnter}>` — Bottone d'ingresso a ellisse arancione. È disabilitato finché la scena non è pronta; il testo è `variant.cta` quando pronto, altrimenti `copy.loading`. Il click chiama `onEnter` di `App.jsx`, che è anche il gesto che permette poi il Pointer Lock.

**r. 98** `<div className="min-w-40 flex-1">` — Contenitore della barra, largo almeno 160 px e che prende lo spazio rimasto.

**r. 99** `<div className="h-px w-full bg-line-subtle">` — Il binario della barra: linea di 1 pixel color grigio linea.

**r. 100–103** `<div className="h-px bg-accent-flame transition-[width] ...` — La parte riempita, arancione; la larghezza è la percentuale `shown` e cambia con un'animazione di 300 ms.

**r. 104** `</div>` — Fine binario.

**r. 105–107** `<p className="micro mt-2"> {ready ? copy.ready : ...` — Scritta sotto la barra: a scena pronta il testo `copy.ready`, altrimenti il nome della fase di caricamento (o "caricamento") e la percentuale.

**r. 108–110** `</div> </div> </div>` — Chiusura del contenitore della barra, della riga bottone e del blocco centrale.

**r. 111** `(riga vuota)` — Separazione.

**r. 112–115** `<footer className="flex flex-wrap items-end ...` — Piè di pagina: a sinistra l'avviso sulla fase del progetto (`copy.phaseNotice`), a destra i crediti (`brand.credit`).

**r. 116–119** `</div> </div> ) }` — Chiusura della colonna interna, del contenitore a tutto schermo e del componente.

## `src/ui/hud/Hud.jsx` (114 righe)

È l'HUD, cioè lo strato di scritte e comandi fisso sopra la scena mentre si esplora: marchio e nome della zona in alto, bottone Menu (e carrello se il commercio è attivo), mirino, inviti a interagire, minimappa e barra "Vai a" su telefono. Lo usa `App.jsx` dopo l'ingresso. I testi si cambiano in `storeConfig.copy.hud` e nei POI di storeConfig; da non toccare la regola `pointer-events-none` sul contenitore, che lascia lo schermo libero per il mouse e il touch sulla scena. Unica eccezione alla regola "niente testi nei componenti": le parole `touch` e `puntatore` alla riga 105 sono scritte qui.

**r. 1** `import { storeConfig } from '../../config/storeConfig.js'` — Configurazione centrale (testi, zone, POI).

**r. 2** `import { brandMotif } from '../../config/designTokens.js'` — Le proporzioni dell'ellisse del logo, usate per disegnare il mirino.

**r. 3** `import { useAppStore } from '../../state/useAppStore.js'` — Lo "stato" dell'applicazione (menu aperto, Focus in corso...). Uno store Zustand è un contenitore di dati condiviso fra componenti: quando un dato cambia, chi lo legge si ridisegna.

**r. 4** `import { usePlayerStore } from '../../state/usePlayerStore.js'` — Lo stato del visitatore: zona attuale, Pointer Lock attivo, punto d'interesse vicino.

**r. 5–6** `import Minimap ... import QuickTravelBar ...` — I due componenti descritti più avanti in questo documento.

**r. 7** `import Button from '../primitives/Button.jsx'` — Bottone comune.

**r. 8** `import CartButton from '../cart/CartButton.jsx'` — Bottone del carrello.

**r. 9** `import { commerceActive } from '../../commerce/index.js'` — Funzione che dice se il negozio vero (o di prova) è acceso.

**r. 10** `(riga vuota)` — Separazione.

**r. 11–15** `/** Interfaccia sovrapposta alla scena ...` — Commento: il contenitore ignora clic e tocchi, solo i bottoni li ricevono.

**r. 16–17** `function Crosshair() { const w = 18` — Piccolo componente del mirino centrale, largo 18 pixel.

**r. 18–19** `return ( <div className="pointer-events-none fixed left-1/2 ...` — Lo posiziona esattamente al centro dello schermo; `aria-hidden` lo nasconde ai lettori di schermo perché è solo decorativo.

**r. 20–23** `<div style={{ width: w, height: w / brandMotif.oval.ratio ...` — Disegna un'ellisse con bordo color osso (`--color-text-primary`), proporzionata sull'ellisse del logo, leggermente trasparente.

**r. 24–26** `</div> ) }` — Chiusura del mirino.

**r. 27** `(riga vuota)` — Separazione.

**r. 28–29** `function LockPrompt() { const copy = storeConfig.copy.hud` — Componente dell'invito "clicca per guardarti intorno" (solo computer, quando il mouse non è ancora catturato).

**r. 30–32** `<div className="pointer-events-none flex justify-center">` — Riquadro centrato, sfondo nero al 75% (`bg-bg-base/75`: il numero dopo la barra è l'opacità) con sfocatura dietro (`backdrop-blur-sm`).

**r. 33–36** `<p className="font-display font-bold uppercase ...` — Testo principale dell'invito, da `copy.hud.lockPrompt`.

**r. 37** `<p className="micro mt-1">{copy.lockPromptSub}</p>` — Riga secondaria dell'invito, da `copy.hud.lockPromptSub`.

**r. 38–41** `</div> </div> ) }` — Chiusura.

**r. 42** `(riga vuota)` — Separazione.

**r. 43–46** `function ProximityPrompt({ poi, isTouch }) { ...` — Componente dell'invito che compare vicino a un punto d'interesse (POI). Controlla se il POI richiede una funzione non ancora attiva (`locked`).

**r. 47–49** `<div ... role="status" aria-live="polite">` — Riquadro centrato; `role="status"` e `aria-live` fanno leggere il cambiamento ai lettori di schermo senza interrompere.

**r. 50** `<span className="micro" ...>●</span>` — Pallino arancione decorativo.

**r. 51–54** `<span className="font-display font-bold uppercase ...{poi.label}` — Nome del punto d'interesse, dal POI in storeConfig.

**r. 55–57** `{locked ? ... : (isTouch ? poi.prompt.mobile : ...` — Istruzione: se la funzione è spenta scrive "in arrivo nella Fase N" (`copy.hints.comingInPhase`), altrimenti l'istruzione del POI per telefono o per computer.

**r. 58–61** `</div> </div> ) }` — Chiusura.

**r. 62** `(riga vuota)` — Separazione.

**r. 63–65** `export default function Hud({ device }) { ...` — Inizio dell'HUD vero e proprio; prende i dati del brand e i testi `copy.hud`.

**r. 66–71** `const menuOpen = useAppStore((s) => s.menuOpen) ...` — Legge dagli store: menu aperto, funzione per aprirlo/chiuderlo, zona attuale, mouse catturato, POI vicino, Focus in corso (qualunque stato diverso da `idle`).

**r. 72** `(riga vuota)` — Separazione.

**r. 73–74** `const zone = storeConfig.environment.zones.find(...)` — Cerca in storeConfig la zona e il POI corrispondenti agli id letti dallo stato.

**r. 75** `(riga vuota)` — Separazione.

**r. 76–77** `return ( <>` — Inizio del disegno; `<>` è un contenitore invisibile che raggruppa più elementi.

**r. 78** `{!device.isTouch && locked && !inFocus && <Crosshair />}` — Il mirino compare solo su computer, a mouse catturato e fuori dal Focus.

**r. 79** `(riga vuota)` — Separazione.

**r. 80** `<div className="pointer-events-none fixed inset-0 flex ...` — Contenitore a tutto schermo che ignora clic e tocchi, con intestazione in alto e piè di pagina in basso; strato `--z-hud` (20).

**r. 81** `<header className="flex items-start justify-between gap-4">` — Barra superiore.

**r. 82–86** `<div> <p className="font-display font-black uppercase ...` — Il wordmark del brand in alto a sinistra, spaziatura `--tracking-brutal`.

**r. 87** `<p className="micro mt-1" data-testid="zone-label">...` — Sotto il marchio il nome della zona in cui si trova il visitatore, oppure `copy.hud.noZone`.

**r. 88** `</div>` — Fine blocco sinistro.

**r. 89** `<div className={... pointer-events-auto flex gap-2 ...}>` — Blocco dei bottoni a destra, che invece riceve i clic; durante il Focus diventa invisibile (resta al suo posto ma non si vede).

**r. 90** `{commerceActive() && <CartButton />}` — Bottone del carrello, solo se il commercio è attivo.

**r. 91–93** `<Button onClick={toggleMenu} aria-expanded={menuOpen} ...` — Bottone Menu/Chiudi (testi `copy.hud.menu` e `copy.hud.close`); gli attributi `aria-` dicono ai lettori di schermo che apre il pannello `menu-drawer`.

**r. 94–95** `</div> </header>` — Chiusura barra superiore.

**r. 96** `(riga vuota)` — Separazione.

**r. 97** `<footer className={... flex flex-col gap-3 ...}>` — Parte inferiore, in colonna; invisibile durante il Focus.

**r. 98–99** `{/* Prompt impilati nella stessa colonna ...` — Commento: gli inviti sono uno sopra l'altro così non si sovrappongono mai.

**r. 100** `{poi && <ProximityPrompt poi={poi} isTouch={device.isTouch} />}` — Invito del punto d'interesse, se ce n'è uno vicino.

**r. 101** `{!device.isTouch && !locked && !menuOpen && <LockPrompt />}` — Invito a cliccare, solo su computer, a mouse libero e menu chiuso.

**r. 102** `<div className="flex items-end justify-between gap-4">` — Riga con minimappa a sinistra e informazioni tecniche a destra.

**r. 103** `<Minimap />` — La minimappa.

**r. 104–107** `<div className="text-right"> <p className="micro">...` — In basso a destra tipo di input ("touch" o "puntatore", parole scritte qui nel codice) e livello grafico (`tier`), poi le coordinate del brand.

**r. 108** `</div>` — Fine riga.

**r. 109** `{device.isTouch && <QuickTravelBar />}` — Barra "Vai a", solo su schermi touch.

**r. 110–114** `</footer> </div> </> ) }` — Chiusura del piè di pagina, del contenitore e del componente.

## `src/ui/hud/Minimap.jsx` (90 righe)

Disegna la piantina del negozio in basso a sinistra: zone, muri, pedane, colonne, punti di sosta e la posizione e direzione del visitatore. Tutto viene calcolato da storeConfig, quindi se si sposta un muro o una zona nella configurazione la minimappa si aggiorna da sola. La usa `Hud.jsx`. Si possono cambiare dimensioni e colori (questi ultimi però sono variabili dei token); non conviene toccare la funzione `project`, che converte i metri in posizioni sulla piantina.

**r. 1** `import { useMemo } from 'react'` — `useMemo` ricorda un calcolo e lo rifà solo se cambiano i suoi ingredienti.

**r. 2–3** `import { storeConfig } ... import { usePlayerStore } ...` — Configurazione e stato del visitatore.

**r. 4** `(riga vuota)` — Separazione.

**r. 5–11** `/** Minimappa disegnata interamente da storeConfig ...` — Commento: nessuna coordinata scritta a mano; la nota sulla Fase 1b/3 è storica (oggi l'indicatore segue già il visitatore).

**r. 12–13** `export default function Minimap() { ...` — Inizio del componente; prende ambiente e navigazione dalla configurazione.

**r. 14–15** `const pose = usePlayerStore((s) => s.pose)` — Legge posizione e direzione del visitatore e la zona attiva.

**r. 16** `const [w, d] = environment.floor.size` — Larghezza e profondità del pavimento in metri.

**r. 17** `const pad = 2` — Variabile dichiarata ma non usata nel resto del file.

**r. 18** `(riga vuota)` — Separazione.

**r. 19–22** `const project = useMemo( () => (x, z) => [...` — Funzione che trasforma un punto del negozio (in metri, con lo zero al centro) in una posizione da 0 a 100 sulla piantina.

**r. 23** `(riga vuota)` — Separazione.

**r. 24** `const [cx, cz] = project(pose.x, pose.z)` — Posizione del visitatore sulla piantina.

**r. 25–26** `// Direzione di vista ... const [vx, vz] = project(...)` — Calcola un punto 3 metri davanti al visitatore, per tracciare la lineetta che indica dove guarda.

**r. 27** `(riga vuota)` — Separazione.

**r. 28–31** `return ( // Su schermi bassi ...` — Inizio del disegno; il commento spiega perché su schermo basso la piantina resta piccola.

**r. 32** `<div className="w-20 sm:w-44 [@media(max-height:520px)]:w-16">` — Larghezza: 80 px su telefono, 176 px da 640 px in su, 64 px se lo schermo è alto meno di 520 px. La parte fra parentesi quadre è una regola Tailwind scritta "a mano" per una condizione sull'altezza.

**r. 33** `<p className="micro mb-2 hidden sm:block ...` — Titoletto "minimappa" (testo `copy.hud.minimap`), visibile solo su schermi larghi e non bassi.

**r. 34–37** `<div className="relative border border-line-subtle ...` — Riquadro della piantina con bordo sottile, sfondo `surface-1` e proporzioni uguali a quelle del pavimento.

**r. 38** `<svg viewBox={'0 0 100 100'} preserveAspectRatio="none"` — Inizio del disegno vettoriale (SVG), con un sistema di coordinate da 0 a 100 stirato sul riquadro.

**r. 39–43** `{environment.zones.map((zone) => { ...` — Per ogni zona prende i due angoli, li converte e controlla se è la zona attuale.

**r. 44–54** `return ( <rect key={zone.id} ... />` — Rettangolo della zona: arancione semitrasparente se ci si trova dentro, grigio altrimenti. `vectorEffect` tiene il bordo sottile anche se il disegno è stirato.

**r. 55** `})}` — Fine ciclo delle zone.

**r. 56–63** `{environment.walls.map((wall) => { ...` — Ogni muro diventa una linea grigia più spessa fra i suoi due estremi.

**r. 64–68** `{environment.architecture.platforms.map((p) => { ...` — Ogni pedana diventa un rettangolo chiaro molto trasparente (colore `bg-studio`).

**r. 69–73** `{environment.architecture.columns.map((c) => { ...` — Ogni colonna diventa un rettangolo grigio pieno.

**r. 74–77** `{navigation.waypoints.filter((wp) => wp.label).map(...` — I punti di sosta che hanno un nome diventano pallini grigi.

**r. 78** `<line x1={cx} y1={cz} x2={vx} y2={vz} stroke=...` — Lineetta arancione dalla posizione del visitatore verso dove guarda.

**r. 79–81** `{/* "Sei qui" ... */} <ellipse cx={cx} cy={cz} ...` — Ellisse arancione attorno al visitatore: richiama l'ellisse del logo.

**r. 82** `<circle cx={cx} cy={cz} r="1.4" fill=...` — Punto arancione pieno al centro dell'ellisse.

**r. 83–84** `</svg> </div>` — Fine disegno e riquadro.

**r. 85–87** `<p className="micro mt-2 hidden sm:block"> {w}×{d} m ...` — Sotto la piantina, solo su schermi larghi: dimensioni del negozio e numero di zone. La parola "zone" è scritta qui nel codice.

**r. 88–90** `</div> ) }` — Chiusura del componente.

## `src/ui/hud/QuickTravelBar.jsx` (39 righe)

È la barra "Vai a" in fondo allo schermo del telefono: un bottone per ogni destinazione rapida, che teletrasporta il visitatore. La usa `Hud.jsx` solo su schermi touch. Le destinazioni e i nomi si cambiano in `storeConfig.navigation.quickTravel` (e devono puntare a waypoint segnati `safeForTeleport`); non conviene rimettere una barra a scorrimento al posto delle colonne uguali.

**r. 1–2** `import { storeConfig } ... import { usePlayerStore } ...` — Configurazione e stato del visitatore.

**r. 3** `(riga vuota)` — Separazione.

**r. 4–8** `/** Barra di teletrasporto (mobile) ...` — Commento: solo destinazioni sicure, verificate sia dalla configurazione (invariante I8) sia dal controllo del movimento.

**r. 9–12** `export default function QuickTravelBar() { ...` — Inizio del componente: prende il comando `issue` (per dare ordini al visitatore), la zona attuale e l'elenco delle destinazioni.

**r. 13** `(riga vuota)` — Separazione.

**r. 14–16** `return ( // Colonne uguali ...` — Inizio del disegno; il commento spiega le colonne uguali.

**r. 17** `<nav aria-label={storeConfig.copy.hud.quickTravel} ...` — Blocco di navigazione, con nome per i lettori di schermo da `copy.hud.quickTravel`; riceve i tocchi.

**r. 18** `<ul className="grid gap-px bg-line-subtle" style=...` — Griglia con tante colonne uguali quante sono le destinazioni; il fondo grigio che traspare dallo spazio di 1 px fa da separatore.

**r. 19–21** `{quickTravel.map((qt) => { const here = ...` — Per ogni destinazione controlla se è la zona in cui si trova già il visitatore.

**r. 22–26** `<li key={qt.id} className="flex"> <button ...` — Bottone che, toccato, ordina un teletrasporto al waypoint della destinazione; testo arancione se si è già lì, osso altrimenti.

**r. 27–29** `// Il corpo scala con la larghezza ... style={{ ...` — Altezza minima da dito (`--touch-min`, 44 px dai token) e dimensione del testo che si adatta alla larghezza dello schermo, mai sotto 9 px.

**r. 30–32** `> {qt.label} </button>` — Il nome della destinazione, da storeConfig.

**r. 33–39** `</li> ) })} </ul> </nav> ) }` — Chiusura del ciclo, della lista e del componente.

## `src/ui/hud/NoticeToast.jsx` (25 righe)

Mostra un messaggio breve al centro dello schermo (per esempio un avviso dopo un'azione), che sparisce da solo. Il messaggio lo imposta `useAppStore.showNotice(testo, durata)` da altre parti del sito; questo file si limita a disegnarlo. Lo usa `App.jsx`. Si possono cambiare posizione e aspetto; il testo arriva da chi chiama `showNotice`, quasi sempre da `storeConfig.copy`.

**r. 1** `import { useAppStore } from '../../state/useAppStore.js'` — Stato dell'applicazione, dove sta il messaggio corrente.

**r. 2** `(riga vuota)` — Separazione.

**r. 3** `/** Messaggio breve sopra la scena ...` — Commento: letto dai lettori di schermo, non blocca mai.

**r. 4–5** `export default function NoticeToast() { ...` — Inizio del componente; legge il messaggio (`notice`), che è vuoto quando non c'è niente da dire.

**r. 6** `(riga vuota)` — Separazione.

**r. 7–13** `return ( <div className="pointer-events-none fixed ...` — Fascia orizzontale al 42% dell'altezza dello schermo, che ignora i tocchi, nello strato dell'HUD, annunciata ai lettori di schermo.

**r. 14–19** `{notice && ( <p key={notice.id} ...` — Se c'è un messaggio, un riquadro nero semitrasparente con testo monospaziato maiuscolo. `key={notice.id}` fa ridisegnare il riquadro da capo a ogni messaggio nuovo.

**r. 20** `<span className="text-accent-flame">●</span> {notice.text}` — Pallino arancione seguito dal testo del messaggio.

**r. 21–25** `</p> )} </div> ) }` — Chiusura.

## `src/ui/menu/MenuDrawer.jsx` (180 righe)

È il menu che scorre da destra: destinazioni del negozio, griglia dei capi, sezione del brand con il Lookbook e, se il commercio è attivo, le pagine legali del venditore. Lo usa `App.jsx`; si apre dal bottone Menu dell'HUD. Contenuti e testi vengono tutti da storeConfig (`copy.menu`, `products`, `navigation.quickTravel`, `meta.brand`, `copy.legal`); non va tolta la "trappola del focus" (riga 29), che tiene la tastiera dentro il menu e lo chiude con Esc. Nota: come registrato in CONTEXT.md, con il commercio attivo il menu mostra ancora i prezzi di storeConfig (da sistemare in 8c).

**r. 1** `import { useEffect, useRef } from 'react'` — `useRef` tiene un riferimento a un elemento della pagina (qui il pannello).

**r. 2** `import { storeConfig } from '../../config/storeConfig.js'` — Configurazione centrale.

**r. 3** `import { formatPrice } from '../../lib/format.js'` — Funzione che scrive i prezzi nel formato della lingua del sito (per esempio "189 €").

**r. 4–6** `import { useAppStore } ... usePlayerStore ... useLegalStore` — Gli stati di applicazione, visitatore e pagine legali.

**r. 7** `import { useFocusTrap } from '../primitives/useFocusTrap.js'` — La trappola del focus: tiene il tasto Tab dentro il pannello e gestisce Esc.

**r. 8–9** `import CartButton ... import { commerceActive } ...` — Bottone del carrello e controllo "commercio attivo".

**r. 10** `import PlaceholderImage from '../primitives/PlaceholderImage.jsx'` — Immagine segnaposto dei capi (finché non ci sono foto vere).

**r. 11** `import Button from '../primitives/Button.jsx'` — Bottone comune.

**r. 12** `(riga vuota)` — Separazione.

**r. 13–19** `/** Menu a tendina ...` — Commento che riassume contenuti, chiusura con Esc e pagine legali.

**r. 20–25** `export default function MenuDrawer() { const open = ...` — Inizio del componente; legge: menu aperto, funzione di chiusura, comando al visitatore, zona attuale, funzione per aprire le schede.

**r. 26** `const panel = useRef(null)` — Riferimento al pannello, usato dalla trappola del focus.

**r. 27** `const legal = useLegalStore()` — Stato delle pagine legali (in caricamento, pronte, errore, elenco).

**r. 28** `(riga vuota)` — Separazione.

**r. 29** `useFocusTrap(panel, open, close)` — Attiva la trappola del focus quando il menu è aperto; Esc chiama `close`.

**r. 30** `useEffect(() => { if (open && commerceActive()) legal.load() ...` — All'apertura, se il commercio è attivo, chiede al fornitore (Shopify) le pagine legali; il caricamento avviene una volta sola e viene ritentato solo dopo un errore.

**r. 31** `(riga vuota)` — Separazione.

**r. 32** `if (!open) return null` — Menu chiuso: non disegna nulla.

**r. 33** `(riga vuota)` — Separazione.

**r. 34–38** `const { brand } = storeConfig.meta ...` — Prende dalla configurazione brand, zone (non usate più avanti), destinazioni, testi del menu e funzioni attive.

**r. 39** `const lookbook = storeConfig.lookbook.find(...)` — Cerca il Lookbook collegato al pannello della parete del brand (relazione per id).

**r. 40** `(riga vuota)` — Separazione.

**r. 41–42** `return ( <div className="fixed inset-0" ...` — Contenitore a tutto schermo nello strato `--z-modal` (40), sopra HUD e barra.

**r. 43–48** `<button className="absolute inset-0 bg-bg-base/80 ...` — Il fondo scuro e sfocato dietro al pannello: è un bottone, così toccarlo chiude il menu. Nome per i lettori di schermo da `copy.menu.closeLabel`; escluso dal tasto Tab.

**r. 49–57** `<aside id="menu-drawer" ref={panel} ... role="dialog"` — Il pannello vero: incollato a destra, alto quanto lo schermo, largo al massimo 448 px, scorre se il contenuto è lungo. È dichiarato come finestra di dialogo modale col titolo `copy.menu.title`.

**r. 58–59** `<div className="flex items-start ...> <p className="micro">...` — Intestazione del pannello con il titolo del menu.

**r. 60–61** `{/* Il bottone del HUD resta sotto il pannello ...` — Commento: serve un bottone Chiudi dentro il pannello, perché quello dell'HUD resta coperto.

**r. 62–66** `<div className="flex gap-2"> {commerceActive() && ...` — Bottone del carrello (se il commercio è attivo) e bottone Chiudi (testo `copy.hud.close`).

**r. 67** `(riga vuota)` — Separazione.

**r. 68–71** `<section className="mt-8"> <h3 ... {menu.sections[0].label}` — Prima sezione (destinazioni), titolo arancione dalla prima voce di `copy.menu.sections`.

**r. 72–73** `{/* Teletrasporto ... */} <ul className="grid gap-px ...` — Elenco delle destinazioni separate da linee sottili.

**r. 74–76** `{quickTravel.map((qt, i) => { const here = ...` — Per ogni destinazione controlla se è la zona attuale.

**r. 77–84** `<li key={qt.id}> <button ... onClick=...teleport ...` — Bottone che teletrasporta il visitatore e chiude il menu; `aria-current` segnala la zona attuale; sfondo un po' più chiaro al passaggio del mouse; altezza minima da dito.

**r. 85–88** `<span className="flex items-baseline gap-3"> ...padStart` — Numero progressivo a due cifre, arancione se si è già lì.

**r. 89–93** `<span className={... font-display font-bold ...}>{qt.label}` — Nome della destinazione, arancione se attuale.

**r. 94** `<span className="micro">{here ? '● youAreHere' : ...` — A destra "● sei qui" (testo `copy.hud.youAreHere`) oppure l'id tecnico del waypoint.

**r. 95–100** `</button> </li> ) })} </ul> </section>` — Chiusura della prima sezione.

**r. 101** `(riga vuota)` — Separazione.

**r. 102–105** `<section className="mt-10"> <h3 ...{menu.sections[1].label}` — Seconda sezione (capi), titolo dalla seconda voce di `copy.menu.sections`.

**r. 106–108** `<div className="grid grid-cols-2 gap-3"> {storeConfig.products.map(` — Griglia a due colonne con un riquadro per ogni prodotto di storeConfig.

**r. 109–111** `<button type="button" className="group block w-full ...` — Ogni capo è un bottone che apre la scheda prodotto; disabilitato se la funzione `productModal` è spenta.

**r. 112–118** `<PlaceholderImage ratio={product.media[0].ratio} ...` — Immagine segnaposto del capo, costruita coi dati della prima immagine del prodotto.

**r. 119–122** `<span className="mt-2 block font-display ...{product.name}` — Nome del capo, che diventa arancione al passaggio del mouse sul riquadro (`group-hover`).

**r. 123–125** `<span className="micro mt-0.5 block"> {product.sku} · ...` — Codice articolo e prezzo, formattato nella lingua del brand. È il prezzo scritto in storeConfig, anche col commercio attivo.

**r. 126–129** `</button> </article> ))} </div>` — Chiusura della griglia dei capi.

**r. 130** `<p className="micro mt-4">{storeConfig.copy.legal.priceNotice}</p>` — Nota sotto la griglia sui prezzi (testo `copy.legal.priceNotice`).

**r. 131** `</section>` — Fine seconda sezione.

**r. 132** `(riga vuota)` — Separazione.

**r. 133–136** `<section className="mt-10"> <h3 ...{menu.sections[2].label}` — Terza sezione (brand), titolo dalla terza voce di `copy.menu.sections`.

**r. 137** `<p className="text-text-secondary" ...{brand.tagline}` — Tagline del brand.

**r. 138** `<div className="rule my-4" />` — Linea sottile di separazione.

**r. 139–140** `<p className="micro">{brand.origin.city}, ...` — Città, paese, coordinate e crediti del brand.

**r. 141–145** `{features.lookbook.enabled && lookbook && ( <Button ...` — Se il Lookbook è attivo e trovato, bottone che lo apre (testo `copy.lookbook.open` più una freccia).

**r. 146** `</section>` — Fine terza sezione.

**r. 147** `(riga vuota)` — Separazione.

**r. 148–149** `{commerceActive() && ( <section ... data-testid="menu-legal">` — Sezione delle pagine legali, solo col commercio attivo.

**r. 150–152** `<h3 id="menu-legal" ... s.id === 'sec-legal'` — Titolo della sezione, preso dalla voce con id `sec-legal` in `copy.menu.sections`.

**r. 153** `{(legal.status === 'idle' || ...loading') && <p ...` — Durante il caricamento la scritta `copy.legal.loading`.

**r. 154–159** `{legal.status === 'error' && ( <> <p ... role="alert"` — Se il caricamento fallisce: messaggio in rosso d'errore (`--color-state-danger`, testo `copy.legal.unavailable`) e bottone "Riprova" (`copy.legal.retry`) che ricarica.

**r. 160** `{legal.status === 'ready' && !legal.policies.length && ...` — Caricate ma nessuna pagina pubblicata: scritta `copy.legal.none`.

**r. 161–162** `{legal.status === 'ready' && legal.policies.length > 0 && (` — Se ci sono pagine, un elenco.

**r. 163–165** `{legal.policies.map((p) => ( <li key={p.id}> <button ...` — Per ogni pagina pubblicata un bottone che apre la scheda legale (`openDialog('legal', id)`).

**r. 166–167** `className="flex w-full items-center ...` — Aspetto della voce: testo grigio che schiarisce al passaggio del mouse, altezza minima da dito.

**r. 168–169** `{storeConfig.copy.legal.policies[p.id]} <span ...>→</span>` — Nome della pagina in italiano, preso da `copy.legal.policies` (non dal venditore), e freccia decorativa.

**r. 170–180** `</button> </li> ))} </ul> )} </section> )} </aside> ...` — Chiusura dell'elenco, della sezione legale, del pannello, del contenitore e del componente.

## `src/ui/focus/FocusPanel.jsx` (116 righe)

È il riquadro informativo che compare quando ci si avvicina a un capo (Focus Mode): espositore, nome, categoria, prezzo, colori, bottone "Scheda completa", frecce per cambiare capo e bottone "Esci". Lo usa `App.jsx`. Comunica allo stato la propria posizione sullo schermo, così la camera inquadra il capo nella parte rimasta libera: non va tolto quel meccanismo (righe 27–38), né il fatto che il pannello compaia già durante l'ingresso. I testi sono in `storeConfig.copy.focus`; il prezzo mostrato è quello di storeConfig (anche col commercio attivo, difetto noto per la 8c).

**r. 1** `import { useEffect, useLayoutEffect, useRef } from 'react'` — `useLayoutEffect` è come `useEffect` ma gira subito dopo che il pannello è stato posizionato, prima che lo schermo si aggiorni: serve per misurarlo.

**r. 2–5** `import { storeConfig } ... formatPrice ... Button` — Configurazione, stato dell'applicazione, formattazione dei prezzi, bottone comune.

**r. 6** `(riga vuota)` — Separazione.

**r. 7–16** `/** Pannello del Focus Mode ...` — Commento: "Esci" disponibile subito, scheda completa sopra il Focus, pannello che dichiara dove sta, versione compatta su schermi bassi.

**r. 17–22** `export default function FocusPanel({ device }) { ...` — Inizio del componente; legge dallo stato: dati del Focus (espositore, capo, fase), uscita, cambio capo, apertura schede e la funzione che registra il rettangolo del pannello.

**r. 23–24** `const exitButton = useRef(null) ...` — Riferimenti al bottone "Esci" e al pannello.

**r. 25** `const visible = focus.state === 'entering' || ...` — Il pannello si vede mentre si entra nel Focus e mentre si è dentro, non durante l'uscita.

**r. 26** `(riga vuota)` — Separazione.

**r. 27–33** `useLayoutEffect(() => { ... const measure = () => {` — Quando il pannello è visibile, ne misura i bordi sullo schermo e li salva nello stato (`focusPanelRect`), dove la camera del Focus li legge.

**r. 34–36** `const ro = new ResizeObserver(measure) ...` — Rimisura se il pannello cambia dimensione (altro capo, testo più lungo) o se la finestra cambia (telefono ruotato).

**r. 37–38** `return () => { ro.disconnect(); ... setPanelRect(null) }` — Quando il pannello sparisce smette di misurare e cancella il rettangolo, così la camera torna a usare tutto lo schermo.

**r. 39** `(riga vuota)` — Separazione.

**r. 40–46** `useEffect(() => { ... if (e.key === 'Escape') exitFocus()` — Quando il pannello è visibile: il tasto Esc fa uscire dal Focus, e il cursore della tastiera viene messo sul bottone "Esci" senza far scorrere la pagina. Alla chiusura il tasto smette di essere ascoltato.

**r. 47** `(riga vuota)` — Separazione.

**r. 48** `if (!visible) return null` — Fuori dal Focus non disegna nulla.

**r. 49** `(riga vuota)` — Separazione.

**r. 50–52** `const display = storeConfig.displays.find(...)` — Trova l'espositore in Focus, i prodotti che contiene (relazione per id) e quello mostrato ora.

**r. 53–55** `const copy = storeConfig.copy.focus ...` — Testi del Focus, se l'espositore ha più capi (`multi`) e lo stato della funzione scheda prodotto.

**r. 56** `(riga vuota)` — Separazione.

**r. 57–61** `return ( <div className="pointer-events-none fixed ...` — Fascia in basso a tutto schermo, nello strato `--z-modal`. Su telefono in verticale il pannello è centrato; da 640 px in su (`sm:`) e su schermo basso (`short:`) va a destra. `short:` è una variante definita in `index.css`: vale quando lo schermo è alto meno di 520 px ed è in orizzontale (telefono girato).

**r. 62–68** `<section ref={panel} aria-label={product.name} ...` — Il pannello: largo al massimo 384 px (320 px su schermo basso), sfondo nero semitrasparente sfocato. Su schermo basso non supera l'altezza dello schermo e scorre al suo interno. `data-testid` serve ai test automatici.

**r. 69–72** `<div className="flex ..."> <p className="micro">{display.label}` — Riga superiore: nome dell'espositore e, se ci sono più capi, "2 di 3" (la parola "di" è `copy.focus.of`).

**r. 73** `(riga vuota)` — Separazione.

**r. 74–77** `<h2 className="mt-3 font-display font-black uppercase ...` — Nome del capo in grande; la dimensione segue l'altezza dello schermo (`6.5vh`) entro le taglie `lg` e `xl` dei token.

**r. 78** `<p className="micro mt-2">{product.category} · ...` — Categoria, collezione e codice articolo.

**r. 79** `(riga vuota)` — Separazione.

**r. 80–83** `<div className="mt-4 flex ..."> <p className="font-mono ...` — Riga con il prezzo (da storeConfig, formattato nella lingua del brand).

**r. 84–89** `<ul className="flex gap-2" aria-label={copy.colorways}>` — Accanto, un quadratino per ogni variante di colore, riempito col colore `swatch` di storeConfig e con il nome del colore per i lettori di schermo.

**r. 90** `</div>` — Fine riga prezzo/colori.

**r. 91** `(riga vuota)` — Separazione.

**r. 92–98** `<div className="mt-4 border-t ..."> {sheet.enabled ? ...` — Sotto una linea: se la scheda prodotto è attiva, bottone a tutta larghezza "Scheda completa" (`copy.focus.details`) che la apre; altrimenti la scritta "in arrivo nella Fase N".

**r. 99** `(riga vuota)` — Separazione.

**r. 100–106** `<div className="mt-4 flex ..."> {multi && ( <> <Button ...` — Riga dei comandi: se ci sono più capi, frecce indietro e avanti (nomi per lettori di schermo `copy.focus.previous` e `next`).

**r. 107–110** `<Button ref={exitButton} variant="primary" ...` — Bottone "Esci" (`copy.focus.exit`), primario, spinto a destra.

**r. 111** `{!device.isTouch && <p className="micro ...{copy.exitHint}` — Solo su computer, suggerimento sotto i bottoni (per esempio "Esc per uscire").

**r. 112** `<p className="micro mt-2 ...">{...legal.priceNotice}</p>` — Nota sui prezzi, un po' trasparente.

**r. 113–116** `</section> </div> ) }` — Chiusura.

## `src/ui/fx/GrainOverlay.jsx` (68 righe)

Disegna la grana della pellicola (puntini scuri che si muovono a scatti) e la vignettatura (bordi scuri) sopra la scena, come strato separato del browser invece che dentro il motore 3D. Lo usa `App.jsx`; due sue variabili sono lette anche dal pannello del benchmark. Intensità, tipo di fusione e vignettatura si regolano in `storeConfig.performance.postFx` e `storeConfig.focus.vignetteStrength`, non qui: la grana costa prestazioni, e i valori attuali (niente grana sul tier low) sono decisioni dell'utente misurate.

**r. 1** `import { useMemo } from 'react'` — Per ricordare l'immagine della grana senza ricrearla a ogni disegno.

**r. 2** `import { makeGrainDataUrl } from '../../lib/noise.js'` — Funzione che genera la tessera di rumore (256×256 punti casuali) come immagine.

**r. 3–4** `import { storeConfig } ... import { useAppStore } ...` — Configurazione e stato (per sapere se si è in Focus).

**r. 5** `(riga vuota)` — Separazione.

**r. 6–12** `/** D6-B — la grana del brand come velo ...` — Commento sulla scelta: la grana la gestisce il browser sopra la scena, la vignettatura è un gradiente CSS a costo quasi nullo.

**r. 13–14** `// Diagnosi delle prestazioni: ...` — Commento sui parametri di prova nell'indirizzo.

**r. 15** `const params = new URLSearchParams(window.location.search)` — Legge i parametri dopo il "?" nell'indirizzo della pagina.

**r. 16** `const diagnostic = Boolean(params.get('perf') || ...` — Modalità diagnosi attiva se c'è `?perf=`, `?bench=` o `?debug=`.

**r. 17** `export const fxDisabled = diagnostic && params.get('fx') === '0'` — Con `&fx=0` in diagnosi, grana e vignettatura vengono tolte (per misurarne il costo). È esportata: la legge anche il benchmark.

**r. 18–19** `const forcedBlend = diagnostic && ['overlay', 'alpha'] ...` — Con `&grain=overlay` o `&grain=alpha` in diagnosi si forza il tipo di grana.

**r. 20** `export const grainBlend = forcedBlend ?? storeConfig...blend` — Tipo di grana effettivo: quello forzato, altrimenti quello di storeConfig (oggi `alpha`).

**r. 21** `(riga vuota)` — Separazione.

**r. 22–24** `export default function GrainOverlay({ tier, reducedMotion }) {` — Inizio del componente; riceve il livello grafico del dispositivo e se l'utente ha chiesto meno animazioni. Legge le impostazioni e se il Focus è in corso.

**r. 25** `const vignette = inFocus ? ...vignetteStrength : ...` — Intensità della vignettatura: più forte in Focus (0,55 oggi), normale altrimenti (0,38).

**r. 26–27** `const overlay = grainBlend === 'overlay' ...` — Genera (una volta sola) l'immagine della grana del tipo scelto: "alpha" = solo puntini scuri, "overlay" = puntini chiari e scuri fusi con la scena.

**r. 28–29** `const levels = overlay ? fx.grain.opacity : ...` — Prende l'opacità della grana per il tier del dispositivo (con riserva sul valore `medium`).

**r. 30** `if (fxDisabled) return null` — In diagnosi con `fx=0` non disegna nulla.

**r. 31** `const grainOn = opacity > 0` — Grana accesa solo se l'opacità è maggiore di zero (sul tier low è 0: resta solo la vignettatura).

**r. 32–35** `// Un granello = un pixel fisico ... const tileCss = ...` — Divide la tessera per la densità di pixel dello schermo, così su un telefono ad alta risoluzione i granelli non sembrano tre volte più grossi.

**r. 36** `const stepMs = Math.round(1000 / fx.grain.animateHz) * 10` — Durata di un giro completo dell'animazione: 10 scatti alla frequenza configurata (12 al secondo).

**r. 37** `(riga vuota)` — Separazione.

**r. 38–39** `return ( <div className="pointer-events-none fixed inset-0" ...` — Velo a tutto schermo che ignora i tocchi, nello strato dell'HUD, nascosto ai lettori di schermo.

**r. 40–43** `{grainOn && <div className="absolute" data-testid="grain"` — Se la grana è accesa, lo strato della grana.

**r. 44–45** `// Più grande del viewport ... inset: '-10%'` — Lo strato sborda del 10% su ogni lato, così spostandosi non scopre mai i bordi.

**r. 46–49** `backgroundImage: url(${noise}), backgroundRepeat ...` — La tessera ripetuta su tutta la superficie, alla dimensione calcolata, senza sfumare i punti.

**r. 50–51** `opacity, mixBlendMode: overlay ? 'overlay' : 'normal',` — Opacità del tier e modo di fusione con la scena.

**r. 52** `animation: reducedMotion ? 'none' : grain-shift ...` — Animazione `grain-shift` (definita in `index.css`) che sposta la grana a scatti; ferma se il dispositivo chiede meno movimento.

**r. 53–55** `willChange: 'transform', }} />}` — Avvisa il browser che lo strato si muoverà, così lo prepara a parte; fine dello strato.

**r. 56–65** `{fx.vignette.enabled && ( <div ... radial-gradient ...` — Se attiva, la vignettatura: un gradiente trasparente al centro che diventa nero verso i bordi, con l'intensità calcolata sopra e un passaggio morbido di 700 ms entrando e uscendo dal Focus.

**r. 66–68** `</div> ) }` — Chiusura.

## `src/ui/fx/FadeOverlay.jsx` (18 righe)

Copre lo schermo di nero per un attimo durante il teletrasporto, così il cambio di posto non è un salto secco. Lo usa `App.jsx`; lo stato `fading` lo accende e spegne il controllo del visitatore. La durata si cambia in `storeConfig.navigation.teleport.fadeMs` (oggi 220 ms).

**r. 1–2** `import { storeConfig } ... import { usePlayerStore } ...` — Configurazione e stato del visitatore.

**r. 3** `(riga vuota)` — Separazione.

**r. 4** `/** Dissolvenza a nero del teletrasporto ...` — Commento sullo scopo.

**r. 5–6** `export default function FadeOverlay() { const fading = ...` — Inizio del componente; legge se è in corso una dissolvenza.

**r. 7–9** `return ( <div className="pointer-events-none fixed inset-0 ...` — Velo a tutto schermo del nero del brand, che ignora i tocchi.

**r. 10–14** `style={{ zIndex: 'var(--z-quickTravel)', opacity: ...` — Strato `--z-quickTravel` (25, sopra l'HUD); opaco durante la dissolvenza, trasparente altrimenti, con passaggio della durata configurata.

**r. 15–18** `aria-hidden="true" /> ) }` — Nascosto ai lettori di schermo; chiusura.

## `src/styles/index.css` (108 righe)

È il foglio di stile generale del sito, caricato da `src/main.jsx`: attiva Tailwind, i token generati e i caratteri, definisce la variante `short:` per gli schermi bassi, gli stili di base, le classi comuni (`micro`, `rule`, `legal-prose`) e le animazioni. Le variabili `var(--...)` che usa arrivano da `theme.generated.css`, creato a ogni avvio da `designTokens.js`: i colori si cambiano lì. Si possono ritoccare con prudenza le classi comuni (cambiano aspetto ovunque); non vanno tolti gli import iniziali, `overflow: hidden` sul body né la variante `short`.

**r. 1** `@import "tailwindcss";` — Attiva Tailwind, la libreria delle classi di stile pronte.

**r. 2** `@import "./theme.generated.css";` — Carica i token del brand trasformati in variabili CSS (colori, caratteri, taglie, strati). Una variabile CSS è un nome (per esempio `--color-accent-flame`) che contiene un valore riutilizzabile ovunque con `var(...)`.

**r. 3** `@import "./fonts.css";` — Carica la dichiarazione dei caratteri tipografici.

**r. 4** `(riga vuota)` — Separazione.

**r. 5–7** `/* Schermo basso: telefono in orizzontale ...` — Commento: conta l'altezza, non la larghezza.

**r. 8** `@custom-variant short (@media (max-height: 520px) and ...` — Crea il prefisso Tailwind `short:`: una classe come `short:p-3` vale solo se lo schermo è alto al massimo 520 px ed è in orizzontale.

**r. 9** `(riga vuota)` — Separazione.

**r. 10** `@layer base {` — Inizio degli stili di base (i più "deboli", che le classi possono sovrascrivere).

**r. 11** `*, *::before, *::after { box-sizing: border-box; }` — Le dimensioni di ogni elemento includono bordo e margine interno: calcoli più prevedibili.

**r. 12** `(riga vuota)` — Separazione.

**r. 13** `html, body, #root { height: 100%; }` — Pagina, corpo e contenitore dell'app alti quanto lo schermo.

**r. 14** `(riga vuota)` — Separazione.

**r. 15–25** `body { margin: 0; background: var(--color-bg-base); ...` — Corpo della pagina: niente margini, sfondo nero del brand, testo osso, carattere Archivo alla taglia base, lettere smussate su Mac, niente "rimbalzo" dello scorrimento e nessuno scorrimento della pagina (il 3D occupa tutto).

**r. 26** `(riga vuota)` — Separazione.

**r. 27–32** `:focus-visible { outline: var(--color-accent-flame) ...` — Quando si naviga con la tastiera, l'elemento selezionato ha un contorno arancione di 2 px, staccato di 2 px.

**r. 33** `(riga vuota)` — Separazione.

**r. 34** `::selection { background: var(--color-accent-flame); ...` — Il testo selezionato col mouse diventa nero su arancione.

**r. 35** `(riga vuota)` — Separazione.

**r. 36–38** `:root { --sheet-frame-h: calc(100dvh - 9.5rem); }` — Variabile con l'altezza della cornice delle immagini nelle schede su schermo basso: altezza dello schermo meno 9,5 rem per intestazione, margini e miniature.

**r. 39** `}` — Fine stili di base.

**r. 40** `(riga vuota)` — Separazione.

**r. 41** `@layer components {` — Inizio delle classi comuni riutilizzabili.

**r. 42–49** `.micro { font-family: var(--font-mono); ...` — La classe `micro`, il piccolo testo tecnico usato ovunque: monospaziato, taglia xs, lettere spaziate, maiuscolo, grigio spento. Cambiarla cambia tutte quelle scritte.

**r. 50** `(riga vuota)` — Separazione.

**r. 51** `.rule { height: 1px; background: var(--color-line-subtle); }` — La classe `rule`: linea orizzontale di 1 px color linea sottile.

**r. 52** `(riga vuota)` — Separazione.

**r. 53–54** `/* Testi lunghi che arrivano da fuori ...` — Commento: stili per le pagine legali del venditore, già ripulite.

**r. 55–60** `.legal-prose { color: var(--color-text-secondary); ...` — Testo delle pagine legali: grigio secondario, taglia sm, righe ariose, parole lunghe spezzate per non uscire dallo schermo.

**r. 61** `.legal-prose > * + * { margin-top: 0.9em; }` — Spazio fra un paragrafo (o blocco) e il successivo.

**r. 62–68** `.legal-prose h3, .legal-prose h4 { margin-top: 1.8em; ...` — Titoletti delle pagine legali: più spazio sopra, color osso, grassetto, maiuscolo, lettere spaziate.

**r. 69–70** `.legal-prose h3 { font-size: var(--text-base); } ...` — Taglia dei titoletti: base per h3, sm per h4.

**r. 71–72** `.legal-prose ul { list-style: disc; ...` — Elenchi puntati e numerati con rientro (Tailwind li azzera di suo).

**r. 73** `.legal-prose li + li { margin-top: 0.35em; }` — Piccolo spazio fra le voci di un elenco.

**r. 74** `.legal-prose strong, .legal-prose b { color: ... }` — Il grassetto è anche più chiaro.

**r. 75** `.legal-prose a { color: var(--color-accent-flame); ...` — I collegamenti sono arancioni e sottolineati.

**r. 76** `.legal-prose blockquote { border-left: 2px solid ...` — Le citazioni hanno una linea a sinistra e un rientro.

**r. 77** `.legal-prose hr { border: 0; height: 1px; ...` — Le linee di separazione diventano sottili e grigie.

**r. 78–79** `.legal-prose table { width: 100%; ...` — Tabelle a tutta larghezza con celle bordate, testo piccolo, allineato in alto a sinistra.

**r. 80** `}` — Fine classi comuni.

**r. 81** `(riga vuota)` — Separazione.

**r. 82–85** `@keyframes shimmer { 0% { transform: translateX(-100%); } ...` — Animazione `shimmer`: un riflesso che scorre da sinistra a destra, usata dalle immagini segnaposto mentre caricano.

**r. 86** `(riga vuota)` — Separazione.

**r. 87–88** `/* Il velo di grana (D6-B) si muove a scatti ...` — Commento sull'animazione della grana. Dice "12 passi", ma le tappe definite sotto sono 10 (da 0% a 90%).

**r. 89–100** `@keyframes grain-shift { 0%, 100% { transform: ... } ...` — Animazione `grain-shift`: sposta la grana di pochi punti percentuali in posizioni diverse; usata con `steps(1, end)` in `GrainOverlay.jsx`, quindi salta da una posizione all'altra senza scorrere.

**r. 101** `(riga vuota)` — Separazione.

**r. 102–108** `@media (prefers-reduced-motion: reduce) { ...` — Se il dispositivo è impostato per "ridurre il movimento", tutte le animazioni e transizioni diventano istantanee.

## `src/styles/fonts.css` (106 righe)

Dichiara i caratteri tipografici del sito, salvati nella cartella `public/fonts` e quindi serviti dal sito stesso (nessuna richiesta a Google). Lo carica `index.css`. Ogni blocco `@font-face` collega un nome di carattere e un peso a un file; ogni carattere è diviso in due file, uno per l'alfabeto latino base e uno per le lettere accentate estese, e il browser scarica solo quello che serve. Per cambiare carattere bisogna aggiungere i file in `public/fonts`, i blocchi qui e il nome in `designTokens.js` (`type.family`). In ogni blocco `font-display: swap` compare due volte: è una ripetizione innocua.

**r. 1** `/* Font auto-ospitati (L6) ...` — Commento: i caratteri sono sul sito, non su Google.

**r. 2–11** `@font-face { ... 'Archivo'; ... font-weight: 400; ...` — Archivo normale (peso 400), parte "latin-ext": lettere latine estese (per esempio dell'Europa dell'est). `font-display: swap` mostra subito il testo con un carattere di riserva e lo sostituisce appena il file è arrivato; `unicode-range` elenca i caratteri contenuti nel file.

**r. 12–21** `@font-face { ... 'Archivo'; ... 400 ... Archivo-400-latin` — Archivo normale, parte "latin": alfabeto base, accenti italiani, simbolo dell'euro.

**r. 22–31** `@font-face { ... 'Archivo'; ... font-weight: 700; ...` — Archivo grassetto (700), parte latin-ext.

**r. 32–41** `@font-face { ... Archivo-700-latin.woff2 ...` — Archivo grassetto, parte latin.

**r. 42–51** `@font-face { ... 'Archivo'; ... font-weight: 900; ...` — Archivo nerissimo (900), usato per il wordmark e i titoli, parte latin-ext.

**r. 52–61** `@font-face { ... Archivo-900-latin.woff2 ...` — Archivo nerissimo, parte latin.

**r. 62–70** `@font-face { ... 'JetBrains Mono'; ... 400 ... latin-ext` — Carattere monospaziato JetBrains Mono normale, parte latin-ext (usato dalla classe `micro` e dai prezzi).

**r. 71–79** `@font-face { ... JetBrainsMono-400-latin.woff2 ...` — JetBrains Mono normale, parte latin.

**r. 80–88** `@font-face { ... 'JetBrains Mono'; ... 700 ... latin-ext` — JetBrains Mono grassetto, parte latin-ext.

**r. 89–97** `@font-face { ... JetBrainsMono-700-latin.woff2 ...` — JetBrains Mono grassetto, parte latin.

**r. 98–106** `@font-face { ... 'UnifrakturCook'; ... 700 ...` — Il carattere gotico UnifrakturCook (solo parte latin), riservato dai token ai titoli di schermata.
