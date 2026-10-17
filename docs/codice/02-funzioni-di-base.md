# Funzioni di base (src/lib)

I file di `src/lib` sono la "cassetta degli attrezzi" del sito: piccole funzioni che non disegnano nulla da sole ma che gli altri pezzi chiamano di continuo. Qui ci sono i calcoli geometrici (dove sono i mobili, se il visitatore li tocca, che strada fare), l'inquadratura della camera, il ritmo dei fotogrammi, la scelta della qualità grafica in base al dispositivo, il formato dei prezzi, i materiali, le forme dei capi e le scritte disegnate nella scena 3D, la grana dello schermo, la misura delle prestazioni e la pulizia delle pagine legali che arrivano da Shopify. Quasi nessuno di questi file contiene contenuti del negozio: i valori veri (colori, misure, testi) arrivano da `src/config/storeConfig.js`, quindi di solito si cambia il config e non questi file.

## `src/lib/geometry.js` (130 righe)

È la geometria "vista dall'alto": il pavimento del negozio è un foglio con due coordinate, x (sinistra–destra) e z (avanti–indietro), e ogni ostacolo è un rettangolo, eventualmente ruotato, chiamato collider (lo trovi in `colliders` dentro storeConfig). Le funzioni rispondono a domande come "questo punto è dentro un mobile?", "questa linea passa attraverso un mobile?", "il dito ha toccato una colonna?". La usano il controllo del config (`validateStoreConfig.js`), le collisioni (`collision.js`), il navigatore (`navigator.js`), il controllore del visitatore (`PlayerController.jsx`) e i test. Non c'è niente da regolare qui: sono formule verificate da `npm run test:nav`; cambiarle romperebbe collisioni e percorsi.

**r. 1–6** `/** Geometria sul piano del pavimento (x, z)…` — Commento iniziale (le righe fra `/**` e `*/` sono note per chi legge, il computer le ignora). Spiega che qui c'è solo matematica, senza three.js (il motore 3D) né React (la libreria dell'interfaccia), e che i collider ruotano solo attorno all'asse verticale Y, cioè come un mobile che giri sul pavimento, mai inclinato.

**r. 7–13** `* CONVENZIONE — identica a quella di three…` — Le due formule per passare dalle coordinate del negozio a quelle "del mobile" e viceversa. La nota ricorda un errore storico: fino alla Fase 2 il segno era invertito e un mobile ruotato risultava specchiato rispetto a quello disegnato. Oggi un test confronta queste formule con quelle di three.

**r. 14–15** `export function toLocal([x, z], collider) {` — Inizia la funzione `toLocal`. Una funzione è una ricetta con un nome che altri file possono richiamare; `export` la rende disponibile fuori da questo file. Riceve un punto `[x, z]` e un collider. Immagina di guardare la pianta dall'alto, metterti al centro del mobile e ruotare il foglio finché il mobile è perfettamente dritto: `toLocal` dice dove si trova il punto in quella vista "raddrizzata".

**r. 16** `const t = collider.rotationY || 0` — Legge l'angolo di rotazione del mobile (in radianti: 3,14 = mezzo giro). `const` crea un valore con un nome che non cambierà più; `|| 0` significa "se l'angolo non è scritto, usa zero".

**r. 17–18** `const dx = x - collider.center[0]` — Distanza del punto dal centro del mobile, in x e in z. `center` è una terna [x, altezza, z]: per questo si usano le posizioni 0 e 2 (si conta da zero).

**r. 19–20** `const c = Math.cos(t)` — Coseno e seno dell'angolo: i due numeri che servono per ruotare un punto.

**r. 21** `return [dx * c - dz * s, dx * s + dz * c]` — Restituisce (`return`) il punto ruotato: le coordinate "dal punto di vista del mobile".

**r. 22** `}` — Fine della funzione.

**r. 23–24** `export function toWorld([lx, lz], collider) {` — La riga vuota separa; poi inizia `toWorld`, l'operazione inversa: da un punto descritto "dal punto di vista del mobile" torna alle coordinate del negozio.

**r. 25–27** `const t = collider.rotationY || 0` — Stesso angolo, coseno e seno di prima.

**r. 28** `return [collider.center[0] + lx * c + lz * s, …]` — Ruota all'indietro e aggiunge la posizione del centro del mobile: il punto torna sulla pianta del negozio.

**r. 29** `}` — Fine di `toWorld`.

**r. 30–32** `export function pointInCollider(point, collider, margin …` — Riga vuota, commento e inizio della funzione "il punto cade dentro il mobile, allargato di `margin`?". `margin = 0` è un valore predefinito: se chi chiama non lo dà, vale zero.

**r. 33** `const [lx, lz] = toLocal(point, collider)` — Porta il punto nella vista "raddrizzata" del mobile. La scrittura `const [lx, lz] = …` prende i due numeri della risposta e dà un nome a ciascuno.

**r. 34** `return Math.abs(lx) <= collider.size[0] / 2 + margin && …` — Nella vista raddrizzata il mobile è un rettangolo dritto: il punto è dentro se non è più lontano dal centro di mezza larghezza (`size[0]`) e mezza profondità (`size[2]`), più il margine. `&&` vuol dire "e anche". Allargando così si ottiene un rettangolo più grande ad angoli vivi: prudente, usato per i percorsi.

**r. 35** `}` — Fine della funzione.

**r. 36–41** `/** Un cerchio di raggio r compenetra il box?…` — Riga vuota e commento: la prossima funzione è il modello "esatto", in cui il visitatore è un cerchio e il rettangolo allargato ha gli angoli arrotondati; quello ad angoli vivi di sopra è più prudente.

**r. 42** `export function circleOverlapsCollider(point, collider …` — Il visitatore, visto dall'alto, è una moneta di raggio `radius` (in config `navigation.player.radius`, 0,35 m). La domanda: la moneta si sovrappone al mobile?

**r. 43** `const [lx, lz] = toLocal(point, collider)` — Centro della moneta nella vista raddrizzata.

**r. 44–45** `const qx = Math.min(Math.max(lx, -size/2), size/2)` — Trova il punto del rettangolo più vicino al centro della moneta: si "schiaccia" il centro dentro i bordi del rettangolo (se è già dentro resta dov'è).

**r. 46** `return (lx - qx) ** 2 + (lz - qz) ** 2 < radius * radius` — Se la distanza fra il centro della moneta e quel punto più vicino è minore del raggio, c'è sovrapposizione. Si confrontano i quadrati (`** 2` = elevato al quadrato) per evitare la radice quadrata, che è più lenta e non cambia il risultato.

**r. 47** `}` — Fine della funzione.

**r. 48–52** `/** Il segmento a→b attraversa il box…` — Riga vuota e commento: la prossima funzione controlla se una linea retta attraversa un mobile; con margine pari al raggio del visitatore risponde a "un corpo largo così passa di qui?".

**r. 53** `export function segmentHitsCollider(a, b, collider …` — Inizio: `a` e `b` sono i due estremi del tratto, ad esempio la posizione attuale e la destinazione.

**r. 54–55** `const p = toLocal(a, collider)` — Entrambi gli estremi nella vista raddrizzata del mobile.

**r. 56** `const half = [size[0] / 2 + margin, size[2] / 2 + margin]` — Mezza larghezza e mezza profondità del rettangolo allargato.

**r. 57–58** `let t0 = 0` — `let` crea un valore che può cambiare. `t0` e `t1` descrivono la parte del tratto ancora "sospetta": 0 è l'inizio, 1 la fine. All'inizio è sospetto tutto il tratto.

**r. 59** `for (let axis = 0; axis < 2; axis++) {` — Un ciclo `for` ripete il blocco più volte: qui due volte, una per l'asse x e una per l'asse z. È il "metodo delle strisce" (slab): il rettangolo è l'incrocio di una striscia verticale e di una orizzontale.

**r. 60** `const d = q[axis] - p[axis]` — Di quanto si sposta il tratto lungo quell'asse.

**r. 61–64** `if (Math.abs(d) < 1e-9) {` — Se il tratto è parallelo alla striscia (spostamento praticamente nullo, `1e-9` è un miliardesimo): se sta fuori dalla striscia non può toccare il mobile e la risposta è "no" (`return false`); altrimenti si passa all'asse successivo (`continue`).

**r. 65–66** `let tn = (-half[axis] - p[axis]) / d` — In quale punto del tratto (frazione fra 0 e 1) si entra nella striscia e in quale se ne esce.

**r. 67** `if (tn > tf) [tn, tf] = [tf, tn]` — Se il tratto va "al contrario", scambia entrata e uscita.

**r. 68–69** `t0 = Math.max(t0, tn)` — Restringe la parte sospetta: deve stare dentro tutte e due le strisce insieme.

**r. 70** `if (t0 > t1) return false` — Se la parte sospetta è sparita, il tratto non è mai dentro entrambe le strisce nello stesso momento: non tocca il mobile.

**r. 71–73** `return true` — Fine del ciclo; se si arriva qui, c'è un pezzo del tratto dentro il mobile: la risposta è "sì, lo attraversa". Chiude la funzione.

**r. 74–78** `/** Distanza lungo un raggio 3D fino al box…` — Riga vuota e commento: la prossima funzione serve al tocco sullo schermo. Se il dito "colpisce" una colonna o un muro prima del pavimento, il punto toccato non è valido.

**r. 79** `export function rayHitsCollider(origin, dir, collider) {` — Un raggio è una semiretta che parte dall'occhio (`origin`) e va nella direzione del dito (`dir`), qui in tre dimensioni (con l'altezza).

**r. 80** `const [ox, oz] = toLocal([origin[0], origin[2]], collider)` — Punto di partenza nella vista raddrizzata, sul piano.

**r. 81–85** `const dx = dir[0] * c - dir[2] * s` — Ruota anche la direzione del raggio, con la stessa formula ma senza spostare il centro (una direzione non ha posizione).

**r. 86–87** `const o = [ox, origin[1] - collider.center[1], oz]` — Partenza e direzione complete in 3D; l'altezza è misurata rispetto al centro del mobile.

**r. 88** `const half = [size[0] / 2, size[1] / 2, size[2] / 2]` — Mezze misure del mobile in larghezza, altezza e profondità. Qui conta anche l'altezza: un mobile basso non ferma un tocco che passa sopra.

**r. 89–90** `let t1 = Infinity` — Come prima, ma il raggio non ha una fine: la parte sospetta va da 0 all'infinito.

**r. 91–95** `for (let axis = 0; axis < 3; axis++) {` — Stesso metodo delle strisce, ma su tre assi. Se il raggio è parallelo a una striscia e sta fuori, il mobile non viene colpito (`return null`, "nessun risultato").

**r. 96–102** `let tn = (-half[axis] - o[axis]) / d[axis]` — Entrata e uscita dalla striscia, scambio se invertite, restringimento; se la parte sospetta sparisce, nessun colpo. Fine del ciclo.

**r. 103–104** `return t0` — Restituisce la distanza lungo il raggio a cui si tocca il mobile; chi chiama la confronta con la distanza del pavimento per sapere cosa viene colpito prima. Chiude la funzione.

**r. 105–106** `/** In quale zona cade un punto del pavimento? */` — Riga vuota e commento della funzione successiva.

**r. 107–111** `export function zoneAt([x, z], zones) {` — Cerca la zona del negozio (in config `environment.zones`, ognuna con due angoli opposti in `bounds`) che contiene il punto. `find` scorre la lista e restituisce il primo elemento che soddisfa la condizione; `?? null` vuol dire "se non lo trova, rispondi null". I `Math.min`/`Math.max` permettono di scrivere i due angoli in qualunque ordine. La usa il controllore del visitatore per sapere in che zona si trova.

**r. 112–113** `export function inAnyArea([x, z], areas) {` — Riga vuota e inizio di una funzione gemella: il punto cade in almeno una delle aree calpestabili (`navigation.walkableAreas`)?

**r. 114–117** `return areas.some(({ bounds: … }) =>` — `some` risponde "sì" se almeno un'area contiene il punto, con lo stesso controllo dei due angoli. Chiude la funzione.

**r. 118–120** `export function clampToAreas([x, z], areas) {` — Riga vuota, commento e inizio: se il visitatore esce dalle aree calpestabili, lo riporta al punto calpestabile più vicino (come un cane al guinzaglio che non può oltrepassare il recinto).

**r. 121–122** `let best = null` — Il miglior punto trovato finora (ancora nessuno) e la sua distanza (infinita, così qualsiasi punto sarà migliore).

**r. 123** `for (const { bounds: [[x0, z0], [x1, z1]] } of areas) {` — Scorre le aree una per una, prendendo subito i due angoli di ciascuna.

**r. 124–125** `const cx = Math.min(Math.max(x, …), …)` — Il punto dell'area più vicino a quello dato: lo si "schiaccia" dentro il rettangolo.

**r. 126** `const d = (cx - x) ** 2 + (cz - z) ** 2` — Quanto è lontano (al quadrato, che basta per confrontare).

**r. 127** `if (d < bestD) { bestD = d; best = [cx, cz] }` — Se è il più vicino finora, lo tiene.

**r. 128–130** `return best ?? [x, z]` — Fine del ciclo; restituisce il punto migliore, o quello originale se non ci sono aree. Chiude la funzione e il file.

## `src/lib/collision.js` (75 righe)

Fa sì che il visitatore non attraversi mobili e muri: lo tratta come una moneta che scivola sul pavimento e, se finisce dentro un rettangolo di `colliders`, la spinge fuori. È usato solo da `PlayerController.jsx` (a ogni fotogramma) e dai test di navigazione. Le collisioni si calcolano solo sui box del config, mai sulle forme 3D visibili (regola del progetto): per far "sbattere" il visitatore contro qualcosa si aggiunge un collider in storeConfig, non si tocca questo file. Le formule non vanno cambiate.

**r. 1** `import { toLocal, toWorld, clampToAreas } from …` — `import` prende in prestito funzioni da un altro file: qui le conversioni di coordinate e il "recinto" delle aree calpestabili da `geometry.js`.

**r. 2–13** `/** Collisioni del player: un cerchio di raggio r…` — Riga vuota e commento: il movimento è diviso in passi più corti del raggio, così a velocità alta o con un fotogramma lento non si "salta" oltre una colonna sottile; dopo ogni passo la moneta viene spinta fuori lungo la perpendicolare al bordo. Spingere solo in quella direzione conserva il movimento parallelo al muro: è per questo che si scivola lungo le pareti invece di fermarsi di colpo.

**r. 14–15** `const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)` — Riga vuota e una piccola funzione scritta in forma breve (`=>`, "funzione freccia"): tiene un numero fra un minimo e un massimo.

**r. 16–18** `export function resolvePenetration(pos, radius, colliders) {` — Riga vuota, commento e inizio della funzione che spinge il visitatore fuori da tutti i mobili. `pos` è un oggetto con `x` e `z` che viene modificato direttamente; la funzione risponde `true` se ha dovuto correggere qualcosa.

**r. 19** `let corrected = false` — Per ora nessuna correzione.

**r. 20** `for (let iter = 0; iter < 4; iter++) {` — Ripete il controllo fino a 4 volte: spingendo fuori da un mobile si può finire dentro un altro vicino (ad esempio in un angolo fra due espositori). Più giri = più precisione negli angoli stretti ma più calcolo; 4 basta per il negozio attuale.

**r. 21** `let moved = false` — In questo giro, per ora, nessuno spostamento.

**r. 22** `for (const c of colliders) {` — Controlla un mobile alla volta.

**r. 23** `const [lx, lz] = toLocal([pos.x, pos.z], c)` — Posizione del visitatore nella vista "raddrizzata" del mobile.

**r. 24–25** `const hx = c.size[0] / 2` — Mezza larghezza e mezza profondità del mobile.

**r. 26–27** `const qx = clamp(lx, -hx, hx)` — Il punto del mobile più vicino al visitatore.

**r. 28–30** `const nx = lx - qx` — La freccia che va da quel punto al centro del visitatore, e la sua lunghezza al quadrato.

**r. 31** `if (d2 >= radius * radius) continue` — Se la moneta non tocca il mobile, passa al prossimo.

**r. 32–34** `let px` — Riga vuota e due contenitori per la nuova posizione, che verranno riempiti sotto.

**r. 35–38** `if (d2 > 1e-12) {` — Caso normale: il centro del visitatore è fuori dal mobile ma troppo vicino. Lo si mette esattamente a distanza `radius` dal punto più vicino, lungo la stessa freccia: come una moneta spinta via dal bordo.

**r. 39–45** `} else { … // Centro dentro il box…` — Caso raro: il centro è proprio dentro il mobile (la freccia non ha direzione). Si misura quanto manca a ciascun lato (`ox`, `oz`) e si esce dal lato più vicino, a distanza di un raggio. `Math.sign` dà il verso (+1 o −1).

**r. 46–48** `const [wx, wz] = toWorld([px, pz], c)` — Riporta la nuova posizione nelle coordinate del negozio e la scrive nel visitatore.

**r. 49–51** `moved = true` — Segna che in questo giro c'è stata una correzione, e anche in generale. Fine del controllo sul singolo mobile.

**r. 52–53** `if (!moved) break` — Se in un giro intero nessuno è stato spostato, inutile continuare: `break` esce dal ciclo. Fine dei giri.

**r. 54–55** `return corrected` — Risponde se c'è stata almeno una correzione. Fine della funzione.

**r. 56–60** `/** Sposta pos di (dx, dz) rispettando collider…` — Riga vuota e commento della funzione principale: muove il visitatore e restituisce lo spostamento davvero avvenuto (può essere minore di quello chiesto, se c'era un ostacolo).

**r. 61** `export function moveWithCollisions(pos, dx, dz, { …` — Riceve la posizione, lo spostamento voluto e un pacchetto di opzioni. `PlayerController` passa come `maxStep` metà del raggio del visitatore (17,5 cm).

**r. 62–63** `const startX = pos.x` — Ricorda il punto di partenza.

**r. 64** `const dist = Math.hypot(dx, dz)` — Lunghezza dello spostamento (`hypot` è il teorema di Pitagora).

**r. 65** `const steps = Math.max(1, Math.ceil(dist / maxStep))` — In quanti passetti dividerlo: almeno uno, e ognuno non più lungo di `maxStep` (`ceil` arrotonda per eccesso).

**r. 66–68** `for (let i = 0; i < steps; i++) {` — Per ogni passetto avanza di una frazione dello spostamento.

**r. 69** `resolvePenetration(pos, radius, colliders)` — Dopo il passetto, spinge fuori dai mobili.

**r. 70–72** `const [cx, cz] = clampToAreas([pos.x, pos.z], walkableAreas)` — E lo tiene dentro le aree calpestabili.

**r. 73–75** `return { x: pos.x - startX, z: pos.z - startZ }` — Fine dei passetti; risponde con lo spostamento effettivo. Chiude la funzione e il file.

## `src/lib/navigator.js` (115 righe)

Calcola la strada quando il visitatore tocca un punto del pavimento o si avvicina a un espositore: prima prova la linea retta, altrimenti passa per i waypoint (i "punti di passaggio" in `navigation.waypoints`, collegati da `navigation.links`) e poi accorcia il percorso. Lo usano `PlayerController.jsx` e i test (`npm run test:nav`). Per cambiare dove si può passare si modificano waypoint, collegamenti, collider e aree in storeConfig (il validatore controlla che ogni collegamento sia libero); i numeri dei tentativi alle r. 76–77 si possono ritoccare, la logica no.

**r. 1** `import { pointInCollider, segmentHitsCollider …` — Prende da `geometry.js` le tre domande che servono: punto dentro un mobile, tratto che attraversa un mobile, punto in un'area calpestabile.

**r. 2–13** `/** Pianificazione dei percorsi automatici…` — Riga vuota e commento: la garanzia è che ogni tratto del percorso sia libero dai mobili con un margine pari al raggio del visitatore. I tre passi: linea retta se libera; altrimenti dal punto di partenza a un waypoint visibile, poi la strada più corta fra i waypoint, poi alla destinazione; infine "tirare il filo" saltando i waypoint inutili.

**r. 14** `export function createNavigator(config) {` — Una funzione che costruisce il navigatore una volta sola a partire dal config e restituisce i suoi strumenti (alla r. 114).

**r. 15–17** `const { waypoints, links, player, walkableAreas } = …` — Prende dal config waypoint, collegamenti, dati del visitatore, aree calpestabili e i collider; `r` è il raggio del visitatore (0,35 m), usato come margine di sicurezza: più grande = percorsi più lontani dai mobili, ma alcuni passaggi stretti diventano impossibili.

**r. 18–19** `const nodes = new Map(waypoints.map((w) => [w.id, …]))` — Riga vuota e un elenco "nome → posizione": una `Map` è come una rubrica in cui si cerca per nome. Per ogni waypoint si tengono solo x e z (l'altezza non serve).

**r. 20** `const adj = new Map(waypoints.map((w) => [w.id, []]))` — Per ogni waypoint, la lista dei vicini collegati (per ora vuota).

**r. 21** `const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])` — Distanza in linea d'aria fra due punti.

**r. 22–26** `for (const [a, b] of links) {` — Per ogni collegamento del config, registra il vicino in entrambe le direzioni con la sua lunghezza: si può andare da A a B e da B ad A.

**r. 27–28** `const clear = (a, b) => !colliders.some(…)` — Riga vuota e la domanda "il tratto da a a b è libero?": vero se nessun mobile (`!` = "non") lo attraversa, con il margine del raggio.

**r. 29** `const isWalkable = (p) => inAnyArea(…) && !colliders.some(…)` — "Ci si può stare?": il punto è in un'area calpestabile e non è dentro un mobile allargato del raggio.

**r. 30–32** `function dijkstra(startId) {` — Riga vuota, commento e inizio dell'algoritmo di Dijkstra, il classico metodo per le strade più corte: come calcolare, su una mappa della metropolitana, quanto dista ogni fermata da quella di partenza e da quale fermata conviene arrivarci.

**r. 33–35** `const cost = new Map([[startId, 0]])` — `cost` = distanza migliore trovata per ogni waypoint (la partenza vale 0); `prev` = da quale waypoint ci si arriva; `open` = waypoint ancora da esaminare (un `Set` è un elenco senza ripetizioni).

**r. 36–39** `while (open.size) {` — Finché restano waypoint da esaminare (`while` ripete finché la condizione è vera), prende quello con la distanza più piccola e lo toglie dall'elenco.

**r. 40–47** `for (const [next, w] of adj.get(cur)) {` — Per ogni vicino: se passando da qui ci si arriva con meno strada di quanta ne conoscevamo, aggiorna distanza e provenienza e rimette il vicino fra quelli da esaminare.

**r. 48–50** `return { cost, prev }` — Fine del ciclo; restituisce distanze e provenienze. Chiude la funzione.

**r. 51–52** `function pull(from, points) {` — Riga vuota e inizio del "tiro del filo": immagina un filo che passa per tutti i waypoint e di tirarlo finché si tende; dove il filo può andare dritto senza toccare mobili, i waypoint intermedi si saltano.

**r. 53–55** `const out = []` — Il percorso accorciato (vuoto), il punto in cui ci si trova (`cur`) e il primo punto ancora da raggiungere (`i`).

**r. 56–62** `while (i < points.length) {` — Partendo dall'ultimo punto, cerca all'indietro il punto più lontano raggiungibile in linea retta da dove si è; lo aggiunge al percorso, ci si sposta e si riparte da lì.

**r. 63–64** `return out` — Restituisce il percorso accorciato. Fine.

**r. 65–72** `/** Percorso da from a to. Se il player è appoggiato…` — Riga vuota e commento: se il visitatore è appoggiato a un mobile, il calcolo prudente (angoli vivi) considera bloccato ogni tratto che parte da lì; allora si riprova da un punto libero a pochi centimetri. La riga `@returns` descrive la risposta: o `ok: true` con i punti, o `ok: false` con il motivo (`blocked` = destinazione non raggiungibile in sé, `unreachable` = nessuna strada).

**r. 73** `function plan(from, to) {` — La funzione che il resto del sito chiama per avere un percorso.

**r. 74–75** `const direct = planFrom(from, to)` — Prima prova normale. Se riesce, o se la destinazione stessa è vietata (inutile riprovare), o se il punto di partenza è già libero, risponde subito.

**r. 76–80** `for (const step of [0.1, 0.2, 0.35]) {` — Altrimenti prova punti di partenza vicini: a 10, 20 e 35 cm, in 16 direzioni (una ogni 22,5 gradi, come le ore di un orologio più fitte). Salta quelli non calpestabili. Questi numeri si possono ritoccare: distanze più grandi aiutano a "staccarsi" da un mobile ma il primo passo diventa visibile.

**r. 81–82** `const res = planFrom(p, to)` — Calcola il percorso dal punto vicino; se riesce, aggiunge quel punto all'inizio (il visitatore lo raggiunge con il primo passo).

**r. 83–86** `return direct` — Fine dei tentativi: se nessuno è riuscito, restituisce la risposta della prima prova. Chiude `plan`.

**r. 87–88** `function planFrom(from, to) {` — Riga vuota e inizio del calcolo vero e proprio da un punto preciso.

**r. 89** `if (!isWalkable(to)) return { ok: false, reason: 'blocked' }` — Destinazione dentro un mobile o fuori dal pavimento: non si va.

**r. 90** `if (clear(from, to)) return { ok: true, points: [to] }` — Linea retta libera: il percorso è un solo tratto.

**r. 91–93** `// Tutti i nodi visibili, non solo i più vicini…` — Riga vuota e commento: si considerano tutti i waypoint visibili, perché fra le colonne quello più vicino è spesso proprio quello nascosto.

**r. 94–95** `const starts = [...nodes.entries()].filter(…)` — `starts` = waypoint raggiungibili in linea retta dalla partenza; `goals` = waypoint da cui si vede la destinazione. `filter` tiene solo gli elementi che soddisfano la condizione.

**r. 96–97** `let best = null` — Riga vuota e il miglior percorso trovato (ancora nessuno).

**r. 98–99** `for (const [sId, s] of starts) {` — Per ogni waypoint di partenza calcola le distanze verso tutti gli altri con Dijkstra.

**r. 100–101** `for (const [gId, gp] of goals) {` — Per ogni waypoint d'arrivo; se non è collegato a quello di partenza, lo salta.

**r. 102** `const total = dist(from, s) + cost.get(gId) + dist(gp, to)` — Lunghezza totale: dalla partenza al primo waypoint, fra i waypoint, dall'ultimo alla destinazione.

**r. 103–107** `if (!best || total < best.total) {` — Se è il più corto finora, ricostruisce l'elenco dei waypoint risalendo all'indietro con `prev` (`unshift` aggiunge in testa) e lo tiene.

**r. 108–109** `}` — Fine dei due cicli.

**r. 110** `if (!best) return { ok: false, reason: 'unreachable' }` — Nessuna combinazione funziona: destinazione irraggiungibile.

**r. 111** `return { ok: true, points: pull(from, […]) }` — Trasforma i nomi dei waypoint in posizioni, aggiunge la destinazione e accorcia il tutto col "tiro del filo".

**r. 112** `}` — Fine di `planFrom`.

**r. 113–115** `return { plan, isWalkable, clear, nodes }` — Riga vuota; il navigatore restituisce i suoi strumenti a chi lo ha creato. Chiude la funzione e il file.

## `src/lib/framing.js` (52 righe)

Decide quanto "grandangolo" usare per la camera e, in Focus Mode, come inquadrare il capo nella parte di schermo non coperta dal pannello. Lo usano `PlayerController.jsx` (camera del visitatore), `FocusCameraRig.jsx` (camera del Focus) e i test (`npm run test:framing`, `e2e-landscape.mjs`). I valori da regolare non sono qui ma in storeConfig: `navigation.player.fov` (oggi verticale 60, orizzontale minimo 50, verticale massimo 85) e `focus.minHorizontalFov` / `focus.maxVerticalFov` (34 e 72). Le formule non vanno toccate.

**r. 1–7** `/** Inquadratura della camera, condivisa da player e Focus…` — Commento iniziale. Il "fov" (field of view, campo visivo) è l'ampiezza dello sguardo della camera, in gradi; in three si misura in verticale. Su uno schermo stretto (telefono in verticale) lo sguardo diventerebbe troppo stretto ai lati, quindi lo si allarga quanto basta, senza superare un massimo.

**r. 8–9** `const rad = (d) => (d * Math.PI) / 180` — Due funzioni brevi per convertire gradi in radianti e viceversa (la matematica di JavaScript lavora in radianti).

**r. 10–12** `export function fovForAspect({ vertical, minHorizontal …` — Riga vuota, commento e inizio. Riceve le tre impostazioni del config e il rapporto larghezza/altezza dello schermo (`aspect`: 2 su un monitor largo, 0,46 su un telefono in verticale).

**r. 13** `const fromHorizontal = deg(2 * Math.atan(Math.tan(rad(mi …` — Immagina un cono di luce che parte dall'occhio: questa formula calcola quanto deve essere alto il cono perché sia largo almeno `minHorizontal` gradi su uno schermo con quelle proporzioni. Più lo schermo è stretto, più il cono si alza.

**r. 14** `return Math.min(maxVertical, Math.max(vertical …` — Usa il più grande fra il fov normale e quello necessario per la larghezza minima, ma mai oltre il massimo (oltre, l'immagine si deformerebbe come in uno spioncino). Alzando `minHorizontal` nel config si vede di più ai lati sui telefoni; alzando `maxVertical` si permette un grandangolo più spinto.

**r. 15** `}` — Fine della funzione.

**r. 16–22** `/** La parte di schermo che il pannello del Focus …` — Riga vuota e commento: fra le quattro strisce di schermo intorno al pannello del Focus (a sinistra, a destra, sopra, sotto) si sceglie la più grande. In verticale vince quella sopra, in orizzontale e su desktop quella a sinistra. Il pannello è descritto in pixel con i suoi quattro bordi.

**r. 23** `export function freeRegion(width, height, panel) {` — Inizio: riceve misure dello schermo e rettangolo del pannello.

**r. 24–25** `const full = { x: 0, y: 0, w: width, h: height }` — Tutto lo schermo; se non c'è pannello (`!panel`), è tutto libero.

**r. 26–31** `const candidates = [ … ].filter((r) => r.w > 0 && r.h > 0)` — I quattro rettangoli liberi intorno al pannello; si scartano quelli senza spazio (larghezza o altezza zero o negativa).

**r. 32** `if (!candidates.length) return full` — Se il pannello copre tutto, si usa lo schermo intero.

**r. 33–34** `return candidates.reduce((best, r) => …)` — `reduce` scorre la lista tenendo un "migliore finora": qui quello con l'area (larghezza × altezza) maggiore. Fine della funzione.

**r. 35–43** `/** Inquadratura del capo nella parte libera dello schermo…` — Riga vuota e commento: il capo deve apparire al centro della zona libera. La camera non si muove: si cambia solo dove cade l'immagine sullo schermo (`setViewOffset` di three), come spostare un proiettore senza spostare il soggetto. La risposta contiene il fov e di quanti pixel spostare l'immagine.

**r. 44** `export function focusFraming({ width, height, region …` — Inizio: riceve misure dello schermo, zona libera, fov della posa del Focus e i limiti del config.

**r. 45** `const inRegion = fovForAspect({ vertical: fov …` — Il fov adatto alla sola zona libera, con lo stesso campo orizzontale minimo; il massimo qui è quasi senza limite (179°), perché il limite vero si applica alla r. 48.

**r. 46** `const full = deg(2 * Math.atan(Math.tan(rad(inRegion) / …` — Converte quel fov in quello dell'intero schermo: se la zona libera è alta metà schermo, la camera deve "vedere" il doppio in altezza perché la zona ne mostri la parte giusta.

**r. 47–51** `return { fov: Math.min(maxVertical, full), offsetX: … …` — Restituisce il fov (non oltre `focus.maxVerticalFov`) e lo spostamento: la distanza fra il centro dello schermo e il centro della zona libera. Un valore positivo sposta l'immagine verso sinistra o verso l'alto.

**r. 52** `}` — Fine della funzione e del file.

## `src/lib/frameScheduler.js` (33 righe)

Decide a quale aggiornamento dello schermo disegnare un nuovo fotogramma, per non superare il tetto di fotogrammi al secondo (`performance.targetFps` in storeConfig, oggi 60) con un ritmo regolare su qualsiasi schermo. Lo usa il limitatore in `StoreCanvas.jsx` e lo prova `npm run test:framing`. Il tetto si cambia nel config; la soglia di pausa (100 ms), la finestra di 15 misure e la tolleranza 0,15 sono numeri tarati sulle misure dei telefoni veri e vanno toccati solo dopo una nuova misura.

**r. 1–6** `/** Quando rendere un fotogramma per non superare targetFps…` — Commento: lo schermo si aggiorna un certo numero di volte al secondo (60, 90, 120, 144 Hz…). Si disegna un fotogramma ogni k aggiornamenti, con k = frequenza ÷ obiettivo arrotondato per difetto. Esempi: 60 Hz → 60 fps, 90 Hz → 90, 120 Hz → 60, 144 Hz → 72.

**r. 7–15** `* Perché non "60 fps esatti" su ogni schermo…` — Il perché: a 90 Hz, per fare esattamente 60, si alternerebbero fotogrammi lunghi e corti e il movimento scatterebbe (misurato su un Pixel 7). La regola precedente dava invece solo 45 fps a 90 Hz. La frequenza dello schermo si stima dalla mediana degli ultimi intervalli; dopo una pausa lunga si disegna subito. La funzione restituisce un'altra funzione da chiamare a ogni aggiornamento: risponde `true` se bisogna disegnare.

**r. 16** `export function frameScheduler(targetFps, { window: …` — Riceve l'obiettivo di fps e, facoltativamente, quante misure ricordare (predefinito 15, chiamato `size` all'interno).

**r. 17–19** `const deltas = []` — `deltas` = ultimi intervalli fra un aggiornamento e l'altro; `prev` = momento dell'aggiornamento precedente; `since` = quanti aggiornamenti sono passati dall'ultimo disegno.

**r. 20** `return (now) => {` — Restituisce la funzione che verrà chiamata a ogni aggiornamento con l'ora attuale in millisecondi. Questa funzione "ricorda" i valori di sopra fra una chiamata e l'altra (in gergo, una chiusura).

**r. 21–22** `const delta = prev === null ? null : now - prev` — Tempo trascorso dall'aggiornamento precedente (nessuno alla prima chiamata). La forma `condizione ? A : B` vuol dire "se vero A, altrimenti B".

**r. 23** `if (delta === null || delta > 100) { since = 0; return …` — Alla prima chiamata, o dopo una pausa oltre 100 ms (scheda in background), disegna subito e riparte da zero.

**r. 24–25** `deltas.push(delta)` — Aggiunge la misura e, se sono più di 15, toglie la più vecchia.

**r. 26** `const vsync = [...deltas].sort((a, b) => a - …` — Stima la durata di un aggiornamento dello schermo come mediana delle misure (le ordina e prende quella di mezzo; `>> 1` divide per due arrotondando in basso). La mediana ignora le misure anomale.

**r. 27** `const k = Math.max(1, Math.floor((1000 / vsync) / …` — Ogni quanti aggiornamenti disegnare: frequenza (1000 ÷ durata) diviso obiettivo, arrotondato per difetto, mai meno di 1. Il `+ 0.15` assorbe l'imprecisione della stima: uno schermo a 120 Hz misurato a 118 dà comunque k = 2 (60 fps) e non 1.

**r. 28–29** `since += 1` — Conta un aggiornamento in più; se non ne sono passati ancora k, non disegna (`false`).

**r. 30–31** `since = 0` — Altrimenti azzera il conto e disegna.

**r. 32–33** `}` — Fine della funzione interna e di quella esterna.

## `src/lib/deviceProfile.js` (88 righe)

Capisce che dispositivo sta usando il visitatore (mouse o dito, scheda grafica, numero di processori, memoria) e sceglie il livello di qualità grafica, il "tier": `high`, `medium` o `low`. Cosa fa ciascun tier (ombre, risoluzione, grana) è scritto in `performance.tiers` di storeConfig; qui si decide solo quale tier assegnare. Lo usano `App.jsx` all'avvio e `npm run test:device`, che prova le regole con i nomi di schede grafiche di dispositivi misurati. Le due liste di schede grafiche (r. 33 e 38) e le soglie di processori e memoria in `pickTier` si possono aggiornare, ma solo dopo una misura reale e rilanciando `npm run test:device`.

**r. 1–6** `/** Rileva il profilo del dispositivo e sceglie il tier…` — Commento: il tier non è scritto nei componenti ma è una chiave di `performance.tiers`, così la politica di qualità resta nel config.

**r. 7–9** `export function detectPointer() {` — Riga vuota, commento e inizio: il puntatore è "grossolano" (un dito) o "fine" (un mouse)? Questo metodo è più affidabile che leggere il nome del browser.

**r. 10** `if (typeof window === 'undefined') return 'fine'` — Se non c'è una finestra del browser (succede nei test eseguiti fuori dal browser), risponde "mouse".

**r. 11–12** `const coarse = window.matchMedia?.('(pointer: …` — Chiede al browser se il puntatore principale è impreciso e se il dispositivo non sa "passare sopra" le cose (hover) senza cliccare. Il `?.` evita un errore se il browser non conosce `matchMedia`.

**r. 13–14** `return coarse || noHover ? 'coarse' : 'fine'` — Basta una delle due condizioni (`||` = "oppure") per considerarlo un dispositivo touch. Fine della funzione.

**r. 15–16** `export function detectWebGL2() {` — Riga vuota e inizio: il browser supporta WebGL2 (la tecnologia con cui si disegna il 3D) e con quale scheda grafica?

**r. 17** `try {` — `try` prova a eseguire il blocco; se qualcosa va storto, invece di bloccare il sito salta al `catch` della r. 26.

**r. 18–19** `const canvas = document.createElement('canvas')` — Crea al volo una tela invisibile e chiede un contesto WebGL2 (la "connessione" con la scheda grafica).

**r. 20** `if (!gl) return { supported: false, renderer: null }` — Se non lo ottiene, WebGL2 non è supportato.

**r. 21–22** `const info = gl.getExtension('WEBGL_debug_renderer_info')` — Prova a leggere il nome reale della scheda grafica (ad esempio "Adreno (TM) 619"); se il browser non lo concede, scrive "sconosciuto".

**r. 23** `const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)` — La dimensione massima delle immagini che la scheda accetta.

**r. 24** `gl.getExtension('WEBGL_lose_context')?.loseContext()` — Chiude subito questa connessione di prova, per non tenere occupata la scheda grafica.

**r. 25** `return { supported: true, renderer, maxTextureSize }` — Risponde con il risultato.

**r. 26–29** `} catch {` — In caso di errore risponde "non supportato". Fine della funzione.

**r. 30–33** `const DISCRETE_GPU = /nvidia|geforce|quadro|rtx|gtx|rade …` — Riga vuota, commento e una "espressione regolare": un modello di testo che riconosce i nomi delle schede grafiche dedicate (NVIDIA, Radeon RX/Pro, Apple M Pro/Max/Ultra). Solo queste vanno in `high`; le integrate (Intel Iris, Apple M base) restano in `medium`. Aggiungere un nome qui porta quei computer in `high`.

**r. 34–38** `const BUDGET_MOBILE_GPU = /adreno\s*\(tm\)\s*([1-5]\d\d| …` — Riga vuota, commento e il modello delle schede grafiche dei telefoni economici (Adreno sotto la serie 650, alcuni Mali, PowerVR GE/GM): vanno in `low` anche se il telefono ha molti processori. Nasce da una misura: un Honor con Adreno 619 in `medium` faceva 9,7 fps.

**r. 39–46** `export function pickTier({ pointer, cores, memory …` — Riga vuota, commento e inizio della scelta del tier. Il commento spiega la prudenza: un telefono non sale mai sopra `medium`, e su computer processori e memoria non bastano (un portatile con Iris Xe finiva in `high` e faceva 31 fps).

**r. 47–48** `const software = /swiftshader|llvmpipe|software/i.test(r …` — Se il 3D è disegnato dal processore invece che dalla scheda grafica (disegno "software", molto lento), tier `low`. `?? ''` usa un testo vuoto se il nome manca.

**r. 49–56** `if (pointer === 'coarse') {` — Per i dispositivi touch: gli iPhone (scheda "Apple GPU") vanno in `medium`, perché Safari nasconde la memoria e dichiara meno processori del vero (misurato: reggono `medium`); le schede economiche vanno in `low`; gli altri telefoni vanno in `medium` solo con almeno 6 processori e 4 GB di memoria, altrimenti `low`. Queste due soglie si possono cambiare, sapendo che abbassarle porta più telefoni in `medium`.

**r. 57** `if (DISCRETE_GPU.test(renderer ?? '') && cores >= 8 && …` — Computer: `high` solo con scheda dedicata, almeno 8 processori e 8 GB.

**r. 58–60** `if (cores >= 4) return 'medium'` — Altrimenti `medium` con almeno 4 processori, `low` sotto. Fine della funzione.

**r. 61–62** `export { zoneAt } from './geometry.js'` — Riga vuota e una "ri-esportazione": rende disponibile da questo file la funzione `zoneAt` di `geometry.js`. Oggi nessun file la prende da qui (chi la usa la importa direttamente da `geometry.js`): è un residuo innocuo.

**r. 63–64** `export function getDeviceProfile() {` — Riga vuota e inizio della funzione che raccoglie tutto il profilo; la chiama `App.jsx`.

**r. 65–66** `const pointer = detectPointer()` — Tipo di puntatore e informazioni su WebGL2.

**r. 67–68** `const cores = navigator.hardwareConcurrency ?? 4` — Numero di processori e memoria in GB dichiarati dal browser; se il browser non li dice, si suppone 4 e 4.

**r. 69** `const reducedMotion = window.matchMedia?.('(prefers-redu …` — Il visitatore ha chiesto al sistema di ridurre le animazioni (impostazione di accessibilità)?

**r. 70** `const params = new URLSearchParams(window.location.search)` — Legge i parametri dell'indirizzo (la parte dopo `?`).

**r. 71–73** `const forced = (params.get('debug') || …` — Il tier si può forzare con `&tier=` solo insieme a `?debug=`, `?perf=1` o `?bench=1`: serve per le verifiche e per misurare un tier preciso su un dispositivo vero.

**r. 74–76** `const tier = ['high', 'medium', 'low'].includes(forced) …` — Se il tier forzato è uno dei tre validi lo usa, altrimenti lo sceglie con le regole di sopra.

**r. 77–86** `return { pointer, isTouch: pointer === 'coarse', cores, … }` — Restituisce il profilo completo: puntatore, se è touch, processori, memoria, animazioni ridotte, tier, supporto WebGL2 e nome della scheda grafica.

**r. 87–88** `}` — Fine della funzione e riga vuota finale del file.

## `src/lib/format.js` (22 righe)

Scrive i prezzi e i numeri nel modo giusto per la lingua del sito (`meta.brand.locale` in storeConfig, oggi `it-IT`, quindi "189 €"). Lo usano scheda prodotto, carrello, menu, pannello del Focus e Lookbook, oltre a due test. Per cambiare il formato dei prezzi si cambia la lingua nel config; la regola "decimali solo se servono" è alla r. 14.

**r. 1–4** `/** Formattazione per l'interfaccia…` — Commento: nessun componente decide da sé come si scrive un prezzo, lo decide questo file con la lingua del config.

**r. 5** `const cache = new Map()` — Un deposito per riusare i "formattatori" già creati, che sono relativamente costosi da preparare.

**r. 6–7** `export function formatPrice({ amount, currency }, locale) {` — Riga vuota e inizio: riceve un importo con la valuta (ad esempio 189 e "EUR") e la lingua.

**r. 8** `const key = ...locale|currency|intero?` — Costruisce un'etichetta che identifica il formattatore: lingua, valuta e se l'importo è intero. È scritta come "template string", un testo con dei valori inseriti dentro.

**r. 9–17** `if (!cache.has(key)) { cache.set(key, new …` — Se non esiste ancora, crea un formattatore del browser (`Intl.NumberFormat`) in stile valuta. Con un importo intero non mostra decimali ("189 €" e non "189,00 €"), altrimenti ne mostra due. Per avere sempre i centesimi basterebbe mettere 2 al posto di 0 alla r. 14.

**r. 18–19** `return cache.get(key).format(amount)` — Usa il formattatore per scrivere l'importo. Fine della funzione.

**r. 20–22** `export const pad2 = (n) => String(n).padStart(2, '0')` — Riga vuota, commento e una piccola funzione che scrive i numeri sempre con due cifre (1 → "01"), come nei contatori del brand; la usa il Lookbook ("01 / 05").

## `src/lib/materials.js` (95 righe)

Crea i materiali (l'aspetto delle superfici: colore, ruvidità, lucentezza metallica, eventuale luce propria) e la texture a griglia del pavimento, disegnata al volo senza file d'immagine. I materiali sono condivisi: tutte le superfici con lo stesso `materialId` usano lo stesso materiale, il che risparmia memoria della scheda grafica. Lo usano pavimento, muri, parete del brand, lampade ed espositori. Colori e valori dei materiali si cambiano in `lighting.materials` di storeConfig, i parametri della griglia in `environment.floor.gridTexture`; in questo file restano solo valori di riserva e dettagli di disegno.

**r. 1–2** `import * as THREE from 'three'` — Prende la libreria three.js (il motore 3D) e la funzione per registrare le cache da liberare (vedi `gpuCaches.js`).

**r. 3–9** `/** Materiali PBR e texture generate proceduralmente…` — Riga vuota e commento: "PBR" è il modo realistico di descrivere i materiali; la griglia del pavimento è disegnata una sola volta su una tela (`<canvas>`) e condivisa.

**r. 10–12** `const textureCache = new Map()` — Riga vuota e due depositi: uno per le texture già disegnate, uno per i materiali già creati.

**r. 13–15** `export function getGridTexture({ cell = 1, lineWidth = …` — Riga vuota, commento e inizio della funzione che disegna una cella della griglia tecnica. I valori fra parentesi sono solo di riserva: quelli usati davvero arrivano dal config tramite `getMaterial`.

**r. 16–17** `const key = ...grid:cell:lineWidth:tint:base` — Etichetta con tutti i parametri; se una texture identica esiste già, la restituisce subito.

**r. 18–22** `const size = 512` — Riga vuota; la tela è un quadrato di 512 pixel (più grande = linee più nitide da vicino ma più memoria); si prepara il "pennello" (`ctx`) per disegnarci sopra.

**r. 23–25** `ctx.fillStyle = base` — Riga vuota; riempie tutta la cella col colore di fondo.

**r. 26–27** `const px = Math.max(1, Math.round(lineWidth * size))` — Riga vuota; spessore della linea in pixel: `lineWidth` è una frazione della cella (0,014 = 1,4%), mai sotto un pixel.

**r. 28–33** `ctx.strokeStyle = tint` — Disegna solo due linee, una sul bordo alto e una sul bordo sinistro della cella. Ripetendo la cella su tutto il pavimento, queste due linee formano la griglia completa (come una piastrella con due bordi dipinti).

**r. 34–36** `ctx.strokeStyle = 'rgba(255,255,255,0.045)'` — Riga vuota, commento e colore del "crocino di registro" al centro di ogni cella: bianco quasi trasparente (4,5%). Alzando 0.045 il crocino diventa più visibile.

**r. 37–39** `ctx.lineWidth = 1` — Linea sottile, centro della cella e lunghezza dei bracci (3,5% del lato).

**r. 40–43** `ctx.moveTo(c - r, c); ctx.lineTo(c + r, c)` — Disegna il crocino: un tratto orizzontale e uno verticale.

**r. 44–45** `const texture = new THREE.CanvasTexture(canvas)` — Riga vuota; trasforma la tela in una texture che three può applicare alle superfici.

**r. 46** `texture.wrapS = texture.wrapT = THREE.RepeatWrapping` — La texture si ripete in entrambe le direzioni, come piastrelle.

**r. 47** `texture.colorSpace = THREE.SRGBColorSpace` — Dice a three che i colori sono quelli "normali" dello schermo, così non vengono sbiaditi o scuriti.

**r. 48** `texture.anisotropy = 8` — Mantiene nitida la griglia vista di sbieco (il pavimento è sempre visto di sbieco). Valori più alti costano un po' di più alla scheda grafica.

**r. 49–51** `textureCache.set(key, texture)` — Mette la texture nel deposito e la restituisce. Fine della funzione.

**r. 52–57** `export function getMaterial(materialId, spec, { repeat …` — Riga vuota, commento e inizio: crea il materiale di una voce di `lighting.materials`. `spec` contiene colore e proprietà; `repeat` dice quante volte ripetere la griglia; `grid` porta i parametri della griglia dal config.

**r. 58–59** `const key = ...materialId:repeat` — Etichetta del materiale (nome più ripetizione); se esiste già, lo riusa.

**r. 60–65** `const params = { color: new THREE.Color(spec.color) …` — Riga vuota e proprietà di base: colore, ruvidità (0 = specchio, 1 = opaco; se il config non la dà, 0,8) e metallicità (0 = non metallo). Si regolano nel config, voce per voce.

**r. 66–69** `if (spec.emissive) {` — Se il config prevede una luce propria (`emissive`, la superficie sembra accesa), ne imposta colore e intensità (0,3 se non indicata).

**r. 70–74** `if (spec.grid) { … params.map = texture` — Se il materiale ha la griglia (oggi `mat-concrete-polished`, il pavimento), disegna la texture usando come fondo il colore del materiale, imposta quante volte ripeterla e la applica. Nota: la texture è condivisa fra materiali con gli stessi parametri di griglia, quindi la ripetizione impostata qui vale per tutti loro.

**r. 75–80** `// three moltiplica color per map…` — Commento e correzione importante: three moltiplica il colore del materiale per quello della texture; siccome la texture contiene già il colore, lasciarli entrambi lo "eleverebbe al quadrato" e il pavimento diventerebbe quasi nero. Quindi, con la texture, il colore del materiale va a bianco. Da non togliere.

**r. 81–85** `const material = new THREE.MeshStandardMaterial(params)` — Riga vuota; crea il materiale standard di three con queste proprietà, lo mette nel deposito e lo restituisce. Fine della funzione.

**r. 86–88** `export function disposeMaterialCache() {` — Riga vuota, commento e inizio della funzione che libera dalla memoria della scheda grafica tutti i materiali e le texture creati; la chiama `gpuCaches.js` quando la scena 3D viene chiusa.

**r. 89–93** `for (const material of materialCache.values()) …` — Libera ogni materiale e ogni texture (`dispose`) e svuota i depositi. Fine.

**r. 94–95** `registerGpuCache(disposeMaterialCache)` — Riga vuota; appena il file viene caricato, registra la funzione di pulizia presso `gpuCaches.js`.

## `src/lib/garments.js` (90 righe)

Costruisce le forme 3D provvisorie dei capi e del manichino, generate dal codice invece che caricate da modelli: una sagoma piatta di maglia o di pantalone con un po' di spessore, un busto da sartoria e il capo "indossato" sul busto. Ogni forma è creata una volta e riusata da tutti gli espositori. Lo usano `parts.jsx` (capi appesi) e `DisplayMannequin.jsx` (manichino). Le coordinate dei contorni sono in metri e si possono ritoccare per cambiare la sagoma; quando arriveranno modelli 3D veri dei capi, queste funzioni verranno sostituite.

**r. 1–2** `import * as THREE from 'three'` — Prende three.js e la registrazione delle cache da liberare.

**r. 3–10** `/** Geometrie segnaposto dei capi…` — Riga vuota e commento: una sagoma 2D (sopra: maglia, felpa, giacca; sotto: pantalone) "estrusa" di pochi centimetri, cioè resa spessa come un biscotto ritagliato. Si riconosce come capo a qualsiasi distanza e costa poche centinaia di triangoli.

**r. 11–13** `const cache = new Map()` — Riga vuota, deposito delle forme già create e registrazione della pulizia: quando la scena si chiude ogni forma viene liberata dalla memoria della scheda grafica e il deposito svuotato.

**r. 14–15** `function topShape() {` — Riga vuota e inizio della sagoma della parte di sopra. Non ha `export`: si usa solo dentro questo file.

**r. 16** `const s = new THREE.Shape()` — Una forma vuota, come un foglio su cui tracciare un contorno a matita senza staccarla.

**r. 17** `s.moveTo(-0.09, 0.34)` — Appoggia la matita sul bordo sinistro del collo: 9 cm a sinistra del centro, 34 cm sopra (la sagoma è centrata sullo zero).

**r. 18–28** `s.lineTo(-0.24, 0.31) … s.lineTo(0.09, 0.34)` — Traccia il contorno a segmenti: spalla sinistra, punta della manica (39 cm dal centro), sotto la manica, ascella, orlo in basso a 34 cm sotto il centro, poi lo stesso specchiato a destra fino al collo. Cambiando questi numeri si cambia la sagoma (ad esempio maniche più lunghe allargando i punti a ±0,39).

**r. 29** `s.quadraticCurveTo(0, 0.26, -0.09, 0.34)` — Chiude con lo scollo, una curva che scende fino a 26 cm al centro.

**r. 30–31** `return s` — Restituisce la sagoma. Fine.

**r. 32–34** `function bottomShape() {` — Riga vuota, inizio della sagoma del pantalone e nuova forma vuota.

**r. 35–42** `s.moveTo(-0.2, 0.5) … s.lineTo(-0.2, 0.5)` — Contorno del pantalone: vita larga 40 cm in alto, gambe che si allargano fino all'orlo a 50 cm sotto il centro, cavallo a 16 cm sopra il centro, e ritorno al punto di partenza.

**r. 43–44** `return s` — Restituisce la sagoma. Fine.

**r. 45–47** `export function getGarmentGeometry(kind) {` — Riga vuota, commento (la maglia è larga 0,78 m e alta 0,68; il pantalone 0,46 × 1,0) e inizio. `kind` vale `'top'` o `'bottom'`; quale usare per ogni categoria lo decide il config (`shapeByCategory`).

**r. 48–49** `const key = ...flat:kind` — Se la forma esiste già nel deposito, la riusa.

**r. 50** `const shape = kind === 'bottom' ? bottomShape() : topShape()` — Pantalone per `'bottom'`, maglia per tutto il resto.

**r. 51–53** `const g = new THREE.ExtrudeGeometry(shape, { depth: …` — Estrude la sagoma: spessore 3,5 cm, bordi leggermente smussati di 8 mm, curve divise in 6 tratti. Più spessore = capo più "imbottito"; più segmenti = curve più morbide ma più triangoli.

**r. 54** `g.translate(0, 0, -0.0175)` — Sposta indietro di metà spessore, così la sagoma è centrata sul suo piano (come un biscotto tagliato a metà spessore dal piano).

**r. 55** `g.computeVertexNormals()` — Calcola da che parte "guarda" ogni punto della superficie, necessario perché la luce la illumini correttamente.

**r. 56–58** `cache.set(key, g)` — La mette nel deposito e la restituisce. Fine.

**r. 59–64** `/** Profilo del busto da sartoria (raggio, altezza)…` — Riga vuota e commento: il busto è ottenuto "al tornio", facendo girare un profilo attorno all'asse verticale; poi viene schiacciato in profondità perché un busto è più largo che spesso (lo schiacciamento lo fa `DisplayMannequin.jsx`, con una scala di 0,62 in profondità).

**r. 65–68** `const TORSO_PROFILE = [ [0.0, 0.0], [0.17, 0.0], … …` — Il profilo: coppie raggio–altezza in metri dal basso verso l'alto (vita, fianchi, petto a 0,52–0,58 m, spalle, collo); il busto è alto 66 cm. Cambiando i raggi si cambiano le proporzioni del manichino; anche il capo indossato dipende da questi punti.

**r. 69–70** `export function getTorsoGeometry(scale = 1) {` — Riga vuota e inizio: `scale` allarga o stringe il busto (solo nei raggi, non in altezza).

**r. 71–72** `const key = ...torso:scale` — Se esiste già, la riusa.

**r. 73** `const pts = TORSO_PROFILE.map(([r, y]) => new …` — Trasforma ogni coppia del profilo in un punto, applicando la scala al raggio. `map` crea una nuova lista trasformando ogni elemento.

**r. 74** `const g = new THREE.LatheGeometry(pts, 28)` — Il "tornio": fa girare il profilo attorno all'asse verticale in 28 spicchi. Più spicchi = busto più rotondo ma più triangoli.

**r. 75–78** `g.computeVertexNormals()` — Calcola l'orientamento per la luce, mette nel deposito, restituisce. Fine.

**r. 79–81** `export function getWornShellGeometry() {` — Riga vuota, commento e inizio: il capo indossato è lo stesso profilo del busto, un po' più largo, aperto in alto e in basso.

**r. 82–83** `const key = 'shell:top'` — Se esiste già, la riusa.

**r. 84** `const pts = TORSO_PROFILE.slice(1, 8).map(([r, y]) => …` — Prende i punti del profilo dal secondo all'ottavo (salta il centro in basso e il collo, così il capo resta aperto) e li allarga del 7% più 6 mm, perché il tessuto stia sopra il busto senza compenetrarlo. Se il capo "sparisce" dentro il busto, va aumentato questo margine.

**r. 85** `pts.unshift(new THREE.Vector2(0.2, -0.06))` — Aggiunge in testa un punto 6 cm sotto la base del busto: l'orlo del capo scende un po' più giù.

**r. 86–90** `const g = new THREE.LatheGeometry(pts, 28)` — Tornio a 28 spicchi, orientamento per la luce, deposito, risultato. Fine della funzione e del file.

## `src/lib/canvasText.js` (184 righe)

Disegna su tele invisibili (`<canvas>`) le scritte e i simboli che poi diventano immagini nella scena 3D: l'insegna col marchio, il pannello del Lookbook, le scritte a terra delle zone, l'ombra sfumata sotto gli oggetti e gli hotspot (i punti toccabili). Lo usano `BrandWall.jsx`, `FloorLabels.jsx`, `GroundShadows.jsx`, `Hotspots.jsx` e `StoreCanvas.jsx`. Testi e colori arrivano da chi chiama (cioè dal config), le proporzioni dell'ellisse da `brandMotif` in `designTokens.js`; qui restano dimensioni in pixel e posizioni delle scritte, che si possono ritoccare. Attenzione: il pannello del Lookbook contiene ancora due testi fissi (r. 88 e r. 100), contro la regola del progetto che vuole i testi nel config.

**r. 1–3** `import * as THREE from 'three'` — Prende three.js, le proporzioni del motivo del marchio (l'ellisse) da `designTokens.js` e la registrazione delle cache da liberare.

**r. 4–11** `/** Texture tipografiche generate su canvas…` — Riga vuota e commento: le scritte usano i caratteri ospitati dal sito, quindi prima di disegnare bisogna aspettare che siano caricati. Una tela disegnata troppo presto userebbe il carattere di sistema e resterebbe sbagliata per sempre, perché non si ridisegna.

**r. 12–13** `const FONTS = ['900 120px "Archivo"', '700 60px …` — Riga vuota e l'elenco dei caratteri (con peso) da aspettare: Archivo nero e grassetto, JetBrains Mono normale e grassetto. Se si usa un nuovo carattere nelle scritte 3D, va aggiunto qui.

**r. 14** `let fontsReady = null` — La "promessa" di caricamento, creata la prima volta che serve.

**r. 15–18** `export function whenFontsReady() {` — Una promessa (`Promise`) è un "ti avviso quando è pronto". `??=` la crea solo se non esiste ancora; `Promise.all` aspetta tutti i caratteri; `.catch(() => null)` fa sì che, se un carattere non si carica, si disegni comunque invece di bloccarsi. Chi la usa scrive `whenFontsReady().then(…)`.

**r. 19–20** `function makeTexture(canvas) {` — Riga vuota e inizio di un aiuto interno che trasforma una tela in texture.

**r. 21–25** `const texture = new THREE.CanvasTexture(canvas)` — Texture con colori "normali" dello schermo e nitida anche di sbieco (anisotropia 8); la restituisce. Fine.

**r. 26–30** `/** Insegna: il wordmark dentro l'ellisse del marchio…` — Riga vuota e commento: è la versione tipografica di riserva del logo (aperto P1); quando arriverà il logo vettoriale, sostituirà questa funzione.

**r. 31** `export function makeWordmarkSign({ wordmark …` — Riceve la parola del marchio ("INTO"), il descrittore ("industries") e tre colori.

**r. 32–34** `const ratio = brandMotif.oval.ratio` — Proporzione dell'ellisse (2,9 volte più larga che alta, dal file dei token); la tela è alta 500 pixel e larga di conseguenza.

**r. 35–38** `const canvas = document.createElement('canvas')` — Crea la tela delle dimensioni calcolate e il pennello.

**r. 39–40** `const stroke = h * brandMotif.oval.strokeRatio * 1.6` — Riga vuota; spessore del contorno dell'ellisse: proporzione del marchio (0,055) per 1,6, cioè un po' più spesso che nel logo perché si legga da lontano.

**r. 41–45** `ctx.ellipse(w / 2, h / 2, w / 2 - stroke, h / 2 - …` — Disegna l'ellisse centrata, rientrata dello spessore per non uscire dai bordi.

**r. 46–51** `ctx.font = 900 (40% di h)px "Archivo"` — Riga vuota; scrive la parola del marchio centrata, alta il 40% della tela, poco sopra la metà (44% dall'alto).

**r. 52–56** `ctx.font = 700 (11,5% di h)px "JetBrains Mono"` — Riga vuota; scrive il descrittore tra parentesi con l'asterisco, "(industries*)", nel colore d'accento, più in basso (76%). Il commento ricorda che deve restare leggibile dall'ingresso, a circa 30 m: rimpicciolirlo lo renderebbe illeggibile.

**r. 57–59** `return { texture: makeTexture(canvas), aspect: w / h }` — Riga vuota; restituisce la texture e la proporzione, così chi la usa costruisce un pannello della forma giusta. Fine.

**r. 60–62** `export function makeLookbookPanel({ title, subtitle …` — Riga vuota, commento e inizio del pannello segnaposto del Lookbook sulla parete del brand: titolo, sottotitolo, colori; la tela è di 1280 × 400 pixel se non indicato.

**r. 63–66** `const canvas = document.createElement('canvas')` — Crea la tela e il pennello.

**r. 67–69** `ctx.fillStyle = bg` — Riga vuota; riempie col colore di fondo.

**r. 70–75** `for (let x = -height; x < width; x += 22) {` — Riga vuota; trama di righe diagonali bianche quasi invisibili (5%), una ogni 22 pixel. Cambiando 22 la trama si fa più fitta o più rada.

**r. 76–79** `ctx.strokeRect(14, 14, width - 28, height - 28)` — Riga vuota; una cornice sottile a 14 pixel dal bordo.

**r. 80–82** `ctx.fillRect(48, 64, 10, height - 128)` — Riga vuota; una barra verticale nel colore d'accento sul lato sinistro.

**r. 83–88** `ctx.fillText('LOOKBOOK · BRAND STORY', 84, 96)` — Riga vuota; piccola intestazione in alto a sinistra, color osso semitrasparente. Il testo è scritto qui e non nel config.

**r. 89–92** `ctx.font = '900 150px "Archivo"'` — Riga vuota; il titolo grande (150 pixel).

**r. 93–96** `ctx.fillText(subtitle.toUpperCase(), 84, 316)` — Riga vuota; il sottotitolo in maiuscolo sotto il titolo.

**r. 97–100** `ctx.fillText('PLH · IN ARRIVO FASE 5', width - 48 …` — Riga vuota; un'etichetta allineata a destra in basso, nel colore d'accento. Anche questo testo è scritto qui e parla di "Fase 5", ormai superata: va spostato nel config o tolto quando arriveranno le immagini vere.

**r. 101–103** `return makeTexture(canvas)` — Riga vuota; restituisce la texture. Fine.

**r. 104–106** `export function makeFloorLabel({ index, label, id …` — Riga vuota, commento e inizio della scritta tecnica a terra di ogni zona: numero, nome e identificativo.

**r. 107–112** `const width = 1024` — Tela di 1024 × 256 pixel e pennello.

**r. 113–118** `ctx.fillText(String(index).padStart(2, '0'), 24, 150)` — Riga vuota; il numero della zona a due cifre ("01") nel colore d'accento.

**r. 119–122** `ctx.fillText(label.toUpperCase(), 140, 156)` — Riga vuota; il nome della zona in maiuscolo, grande (104 pixel), a destra del numero. Un nome molto lungo può uscire dalla tela: in quel caso va ridotto il carattere qui o il nome nel config.

**r. 123–126** `ctx.fillText(id.toUpperCase(), 144, 208)` — Riga vuota; l'identificativo della zona, piccolo e semitrasparente, sotto il nome.

**r. 127–130** `ctx.fillRect(24, 226, width - 48, 3)` — Riga vuota; una linea sottile di sottolineatura (con lo stesso colore semitrasparente dell'identificativo), poi la texture viene restituita. Fine.

**r. 131–135** `let blobTexture = null` — Riga vuota, commento e inizio dell'ombra "blob": una macchia scura sfumata che si mette sotto gli oggetti quando il tier non disegna ombre vere (tier `low`). Esiste una sola copia: se c'è già, la restituisce.

**r. 136–139** `const size = 128` — Tela quadrata di 128 pixel (l'ombra è sfumata, non serve di più).

**r. 140–143** `g.addColorStop(0, 'rgba(0,0,0,1)')` — Sfumatura circolare: nera piena al centro, nera al 55% a metà strada (0,45), trasparente sul bordo. Cambiando 0.55 o 0.45 l'ombra si fa più densa o più morbida.

**r. 144–148** `ctx.fillStyle = g` — Riempie la tela con la sfumatura, la trasforma in texture, la ricorda e la restituisce. Fine.

**r. 149** `registerGpuCache(() => { blobTexture?.dispose(); …` — Registra la pulizia: quando la scena si chiude, l'ombra viene liberata dalla memoria della scheda grafica.

**r. 150–155** `export function makeHotspot({ label, color, textColor }) {` — Riga vuota, commento e inizio dell'hotspot, il simbolo toccabile sopra un punto d'interesse: l'ellisse del marchio con un punto al centro e sotto l'etichetta.

**r. 156–161** `const w = 512` — Tela di 512 × 256 pixel e pennello.

**r. 162–163** `const ovalH = 92` — Altezza dell'ellisse (92 pixel) e larghezza secondo la proporzione del marchio.

**r. 164–168** `ctx.ellipse(w / 2, 62, ovalW / 2 - 6, ovalH / 2 - 6, 0 …` — Disegna il contorno dell'ellisse (spesso 10 pixel) in alto al centro.

**r. 169–172** `ctx.arc(w / 2, 62, 11, 0, Math.PI * 2)` — Un punto pieno di raggio 11 pixel al centro dell'ellisse.

**r. 173–177** `const text = label.toUpperCase()` — Riga vuota; impostazioni del testo (centrato, JetBrains Mono grassetto 40 pixel) e l'etichetta in maiuscolo.

**r. 178–180** `const tw = ctx.measureText(text).width` — Misura quanto è larga la scritta e disegna dietro un rettangolo scuro semitrasparente un po' più largo, perché si legga su qualsiasi sfondo.

**r. 181–184** `ctx.fillText(text, w / 2, 183)` — Scrive l'etichetta e restituisce la texture. Fine della funzione e del file.

## `src/lib/noise.js` (40 righe)

Genera la "grana" (il rumore fotografico) che il sito stende sopra la scena 3D come un velo, alla maniera di una pellicola. La usa solo `GrainOverlay.jsx`. È separato da `materials.js` di proposito: quello si porta dietro tutto il motore 3D, mentre la grana deve caricarsi subito con la pagina. L'intensità della grana non si regola qui ma nel config (opacità per tier, `alphaOpacity`); qui si sceglie solo come sono fatti i granelli.

**r. 1–7** `/** Rumore procedurale per il velo di grana (D6-B)…` — Commento: spiega perché questo codice vive in un file a parte (non trascinare three nel primo caricamento).

**r. 8** `const cache = new Map()` — Deposito delle grane già generate.

**r. 9–16** `/** mode 'overlay' — rumore grigio pieno…` — Riga vuota e commento sui due modi. `overlay`: granelli grigi chiari e scuri, da fondere con un effetto del browser che costa molto (sulla grafica Iris Xe toglieva circa 22 fps). `alpha`: solo granelli scuri su fondo trasparente, che scuriscono le parti chiare e lasciano il nero com'è; costa molto meno ed è quello scelto.

**r. 17** `export function makeGrainDataUrl(size = 256, mode = …` — Riceve la dimensione della tessera di grana (256 pixel se non indicata; viene ripetuta su tutto lo schermo) e il modo.

**r. 18–19** `const key = ...size:mode` — Se questa grana esiste già, la riusa.

**r. 20–24** `const image = ctx.createImageData(size, size)` — Riga vuota; crea la tela e un foglio di pixel vuoto. Ogni pixel è descritto da quattro numeri da 0 a 255: rosso, verde, blu e opacità (RGBA).

**r. 25** `for (let i = 0; i < image.data.length; i += 4) {` — Scorre i pixel uno per uno, saltando di quattro numeri alla volta.

**r. 26** `const v = Math.random()` — Un numero a caso fra 0 e 1 per questo pixel.

**r. 27–29** `if (mode === 'alpha') {` — Modo `alpha`: il pixel è nero; la sua opacità è `1 − 2·v`, quindi circa metà dei pixel sono del tutto trasparenti e gli altri più o meno scuri. Cambiando il 2 si cambia quanti granelli compaiono.

**r. 30–33** `} else {` — Modo `overlay`: il pixel è grigio a caso (da nero a bianco) e completamente opaco.

**r. 34–35** `ctx.putImageData(image, 0, 0)` — Fine del ciclo; copia i pixel sulla tela.

**r. 36–40** `const url = canvas.toDataURL('image/png')` — Riga vuota; trasforma la tela in un'immagine PNG scritta come testo (un "data URL"), che il CSS può usare come sfondo. La ricorda e la restituisce. Fine.

## `src/lib/gpuCaches.js` (39 righe)

Coordina la pulizia della memoria della scheda grafica per tutte le cache condivise (materiali, texture, forme): si liberano solo quando l'ultima scena 3D viene davvero chiusa. Lo usano `StoreCanvas.jsx` (che "trattiene" e "rilascia") e i tre file che registrano le loro cache (`materials.js`, `garments.js`, `canvasText.js`). Non c'è nulla da regolare: modificare l'ordine o il ritardo ripresenterebbe il difetto della Fase 2 (texture distrutte mentre erano ancora in uso).

**r. 1–9** `/** Ciclo di vita delle cache condivise fra le mesh…` — Commento: la pulizia è legata alla scena 3D, non a un singolo componente, ed è rimandata di un istante. In sviluppo (StrictMode) e dopo una perdita del contesto grafico la scena viene chiusa e subito riaperta: in quel caso la riapertura annulla la pulizia, e nessun materiale resta senza texture.

**r. 10–12** `const disposers = new Set()` — L'elenco delle funzioni di pulizia registrate, quante scene stanno usando le cache (`holders`) e l'eventuale pulizia in attesa (`pending`).

**r. 13–17** `export function registerGpuCache(dispose) {` — Riga vuota, commento e la funzione con cui ogni file aggiunge la propria pulizia all'elenco.

**r. 18–21** `export function disposeGpuCaches() {` — Riga vuota e la funzione che esegue tutte le pulizie registrate.

**r. 22–28** `export function retainGpuCaches() {` — Riga vuota, commento e la funzione chiamata quando una scena si apre: aumenta il conto degli utilizzatori e annulla una pulizia in attesa (`clearTimeout`).

**r. 29–33** `export function releaseGpuCaches() {` — Riga vuota, commento e la funzione chiamata quando una scena si chiude: diminuisce il conto (mai sotto zero); se qualcun altro usa ancora le cache, non fa nulla.

**r. 34–39** `pending = setTimeout(() => { … }, 0)` — Altrimenti programma la pulizia "fra un istante" (`setTimeout` con 0 = appena il browser ha finito ciò che sta facendo). Quando scatta, pulisce solo se nel frattempo nessuno ha riaperto una scena. Fine.

## `src/lib/perf.js` (98 righe)

Misura le prestazioni mentre il sito gira: registra quanto tempo passa fra un fotogramma disegnato e il successivo e ne ricava le statistiche (fotogrammi al secondo tipici, scatti, numero di oggetti disegnati). Lo alimenta `PerfProbe.jsx` dentro la scena; lo leggono l'HUD prestazioni (`?perf=1`, tramite `usePerfStore.js`) e il benchmark (`bench.js`). Non contiene impostazioni del negozio; le due soglie modificabili sono `maxGapMs` (250 ms) e `keepMs` (10 s) alla r. 54, ma cambiarle rende le misure non confrontabili con quelle già scritte in `docs/PERF.md`.

**r. 1–7** `/** Misura delle prestazioni nel browser (PLAN §5.3)…` — Commento: si misura l'intervallo fra due disegni consecutivi; dato che il sito disegna solo quando serve, questi fps sono fotogrammi davvero prodotti.

**r. 8–15** `*   p50 fps — 1000 / mediana degli intervalli…` — Le tre misure principali: `p50` = l'esperienza tipica (fotogramma mediano); `p95` = quanto dura un fotogramma fra i più lenti (il 95° su 100); `1% low` = gli fps calcolati sul fotogramma 99° su 100, che rivela gli scatti nascosti dalla media. Gli intervalli oltre 250 ms sono pause (scheda in background), non fotogrammi lenti.

**r. 16–17** `const percentile = (sorted, p) => {` — Riga vuota e inizio di un aiuto che, da una lista già ordinata, prende il valore al percentile `p` (ad esempio 50 = quello di mezzo).

**r. 18** `if (!sorted.length) return NaN` — Lista vuota: risponde `NaN` ("non un numero"), che poi si mostra come "—".

**r. 19–21** `const i = Math.min(sorted.length - 1, Math.max(0 …` — Calcola la posizione nella lista, tenendola dentro i limiti, e restituisce quel valore. Fine.

**r. 22–29** `/** Statistiche da una lista di campioni { t, dt …` — Riga vuota e commento: ogni campione ha l'ora, la durata del fotogramma, il numero di "chiamate di disegno" e di triangoli. Oltre alle percentuali si riportano il fotogramma più lungo e quanti superano 50 ms; i blocchi lunghi a pagina visibile (`stall`) contano solo lì.

**r. 30** `export function summarize(all) {` — Inizio della funzione che riassume una lista di campioni.

**r. 31** `const samples = all.filter((s) => !s.stall)` — Toglie i blocchi lunghi dalle percentuali.

**r. 32** `const dts = samples.map((s) => s.dt).sort((a, b) => a - b)` — Le durate dei fotogrammi, ordinate dalla più breve alla più lunga.

**r. 33–35** `const calls = samples.map((s) => s.calls)` — Le liste delle chiamate di disegno e dei triangoli, e un aiuto per sommare.

**r. 36–40** `return { frames: samples.length, frameMsMax: …, over50: …` — Inizio del riassunto: numero di fotogrammi, fotogramma più lungo (blocchi compresi), quanti oltre 50 ms (un fotogramma da 50 ms è uno scatto percepibile) e quanti blocchi.

**r. 41–43** `fpsP50: 1000 / percentile(dts, 50)` — fps tipici, durata del fotogramma al 95° percentile e fps "1% low". Dividere 1000 per una durata in millisecondi dà i fotogrammi al secondo.

**r. 44–48** `callsAvg: calls.length ? sum(calls) / calls.length : NaN` — Media e massimo delle chiamate di disegno e massimo dei triangoli (quanto è "pesante" la scena). Fine della funzione.

**r. 49–54** `export function createSampler({ maxGapMs = 250, keepMs …` — Riga vuota, commento e inizio del "campionatore", condiviso fra la scena che registra e l'interfaccia che legge. È un semplice modulo e non uno stato di React apposta: così registrare un fotogramma non ridisegna l'interfaccia.

**r. 55–57** `let last = null` — Ora dell'ultimo fotogramma; `live` = finestra scorrevole per l'HUD; `recording` = campioni di una registrazione del benchmark (nessuna per ora).

**r. 58–63** `let hiddenSinceLast = false` — Commento e un segnale: se nel frattempo la pagina è stata nascosta (cambio di scheda), un intervallo lunghissimo è una pausa; se era visibile, è uno scatto vero. Il browser avvisa (`addEventListener`) ogni volta che la pagina viene nascosta o mostrata.

**r. 64–66** `return { frame(now, calls, tris) {` — Riga vuota; restituisce gli strumenti del campionatore. Il primo, `frame`, si chiama a ogni fotogramma con l'ora, le chiamate di disegno e i triangoli.

**r. 67–76** `if (last !== null) { const dt = now - last; … }` — Se c'era un fotogramma prima, calcola l'intervallo. Se è normale (fino a 250 ms) lo aggiunge alla finestra e all'eventuale registrazione; se è più lungo e la pagina era visibile, lo registra come blocco (`stall`) solo nella registrazione.

**r. 77–78** `hiddenSinceLast = false` — Azzera il segnale e ricorda l'ora di questo fotogramma.

**r. 79–81** `if (live.length > 2048) live = live.filter((s) => now - …` — Commento e pulizia della finestra solo ogni tanto (oltre 2048 campioni), tenendo gli ultimi 10 secondi: togliere un campione a ogni fotogramma costerebbe di più. Fine di `frame`.

**r. 82–85** `window(windowMs, now = performance.now()) {` — Statistiche degli ultimi `windowMs` millisecondi: le usa l'HUD.

**r. 86** `startRecording() { recording = [] },` — Avvia una registrazione vuota (benchmark).

**r. 87–92** `stopRecording() {` — Chiude la registrazione e restituisce i campioni (lista vuota se non ce n'era una).

**r. 93–94** `mark() { return recording ? recording.length : 0 },` — `mark` dice quanti campioni sono stati registrati finora (un segnalibro); `slice` restituisce i campioni fra due segnalibri. Il benchmark li usa per le statistiche di ogni tratto del percorso.

**r. 95–96** `}` — Fine degli strumenti e della funzione.

**r. 97–98** `export const sampler = createSampler()` — Riga vuota; crea l'unico campionatore usato da tutto il sito, con i valori predefiniti.

## `src/lib/bench.js` (144 righe)

Esegue il benchmark (`?bench=1`): fa percorrere al visitatore un tragitto sempre uguale (camminate, Focus, rotazioni) usando gli stessi comandi dell'interfaccia, misura le prestazioni e prepara la riga da incollare nella tabella di `docs/PERF.md`. Lo usa `BenchPanel.jsx`. Il percorso, i tempi di attesa e il limite per ogni passo stanno in `storeConfig.benchmark` (oggi 2,5 s di riscaldamento, 30 s di limite per passo): si cambiano lì. Qui l'unico valore tarato è la tolleranza di arrivo (45 cm, r. 37).

**r. 1** `import { sampler, summarize } from './perf.js'` — Prende il campionatore e la funzione di riassunto da `perf.js`.

**r. 2–9** `/** Percorso di benchmark riproducibile (PLAN §5.3)…` — Riga vuota e commento: il percorso guida il visitatore con i comandi veri, quindi misura il sito reale e non una scena di prova. `api` è l'insieme di comandi forniti da chi chiama (dare un ordine, uscire dal Focus, leggere lo stato del Focus, sapere se c'è un percorso in corso, leggere la posizione).

**r. 10–11** `const aborted = () => new DOMException('Benchmark …` — Riga vuota e un aiuto che crea l'errore "benchmark interrotto", usato quando il visitatore lo ferma.

**r. 12–13** `const sleep = (ms, signal) => new Promise((resolve …` — Riga vuota e inizio di "aspetta `ms` millisecondi", interrompibile tramite `signal` (il segnale di stop). Una `Promise` si conclude bene (`resolve`) o con un errore (`reject`).

**r. 14** `if (signal?.aborted) { reject(aborted()); return }` — Se lo stop è già arrivato, termina subito con errore.

**r. 15** `const timer = setTimeout(resolve, ms)` — Altrimenti fa partire il timer.

**r. 16–17** `signal?.addEventListener('abort', …, { once: true })` — Se arriva lo stop durante l'attesa, ferma il timer e termina con errore. Fine dell'aiuto.

**r. 18–19** `async function waitFor(condition, timeoutMs, signal, what) {` — Riga vuota e inizio di "aspetta finché una condizione è vera". `async` indica una funzione che può fermarsi ad aspettare (con `await`) senza bloccare la pagina.

**r. 20–25** `while (!condition()) {` — Ricontrolla la condizione ogni 50 ms; se passa più del tempo massimo, si ferma con un errore che dice cosa si stava aspettando (es. "timeout: cammino verso wp-…"). Fine.

**r. 26–27** `async function runStep(step, { api, waypoints …` — Riga vuota e inizio dell'esecuzione di un singolo passo del percorso.

**r. 28–30** `if (step.type === 'place') {` — Passo `place`: mette il visitatore all'istante su un waypoint e aspetta 100 ms.

**r. 31–32** `} else if (step.type === 'hold') {` — Passo `hold`: resta fermo per il tempo indicato.

**r. 33–38** `} else if (step.type === 'walk') {` — Passo `walk`: ordina di camminare fino al waypoint (eventualmente guardando un punto) e aspetta che il visitatore sia entro 45 cm dalla meta e non abbia più un percorso in corso. Il valore 0.45 si può cambiare: più piccolo pretende un arrivo più preciso.

**r. 39–44** `} else if (step.type === 'focus') {` — Passo `focus`: entra in Focus su un espositore, aspetta che sia completamente dentro, resta il tempo indicato, esce e aspetta che l'uscita sia finita.

**r. 45–47** `} else if (step.type === 'face') {` — Passo `face`: si gira verso un punto e aspetta.

**r. 48–51** `} else { throw new Error(...) }` — Un tipo di passo sconosciuto (ad esempio un errore di battitura nel config) ferma il benchmark con un errore chiaro (`throw` = "lancia un errore"). Fine.

**r. 52–57** `export async function runBenchmark({ benchmark …` — Riga vuota, commento e inizio di un'esecuzione completa: restituisce le statistiche totali e per passo; anche in caso di errore o interruzione la registrazione viene chiusa.

**r. 58** `const ctx = { api, waypoints, timeoutMs: …` — Prepara ciò che serve a ogni passo, col limite di tempo preso dal config.

**r. 59–61** `const first = benchmark.steps[0]` — Commento e partenza: se il primo passo è un `place`, lo esegue subito, così si parte sempre dalla stessa posizione.

**r. 62–63** `onProgress?.({ index: -1, step: null })` — Avvisa l'interfaccia che si è nella fase di riscaldamento e aspetta `warmupMs` (2,5 s), perché la scena si assesti prima di misurare.

**r. 64–68** `sampler.startRecording()` — Riga vuota; avvia la registrazione, annota l'ora d'inizio e prepara le liste dei tratti e dei campioni.

**r. 69–75** `try { for (const [index, step] of benchmark.steps.entrie …` — Per ogni passo: avvisa l'interfaccia, mette un segnalibro, esegue il passo e salva le statistiche di quel tratto col suo nome (o il tipo, se il nome manca).

**r. 76–78** `} finally { samples = sampler.stopRecording() }` — `finally` viene eseguito in ogni caso, anche dopo un errore: chiude sempre la registrazione.

**r. 79–80** `return { durationMs: performance.now() - t0 …` — Restituisce durata totale, statistiche complessive e dettaglio per tratto. Fine.

**r. 81–86** `const median = (xs) => {` — Riga vuota e un aiuto per la mediana: ordina i numeri e prende quello di mezzo (o la media dei due di mezzo se sono in numero pari).

**r. 87–89** `export function aggregateRuns(runs) {` — Riga vuota, commento e inizio dell'aggregato di più esecuzioni del benchmark, secondo il protocollo: mediana degli fps tipici, peggiore degli "1% low".

**r. 90–99** `return { runs: runs.length, fpsP50Median: median(…) …` — Numero di esecuzioni, mediana degli fps tipici, peggior 1% low, peggior durata al 95° percentile, mediana delle chiamate di disegno medie, massimo delle chiamate e dei triangoli. Fine.

**r. 100–105** `export function segmentSummary(runs) {` — Riga vuota, commento e inizio del riepilogo per tratto: dice dove il dispositivo rallenta (camminata, Focus, Lookbook), non solo quanto.

**r. 106** `if (!runs.length) return ''` — Nessuna esecuzione: testo vuoto.

**r. 107–112** `return runs[0].segments.map((s, i) => { … }).join(' ; ')` — Per ogni tratto raccoglie i dati di tutte le esecuzioni e scrive una voce del tipo "3 Focus 58.9/44.1 max 77ms 2>50" (fps tipici mediani / peggior 1% low, fotogramma più lungo, quanti oltre 50 ms); le voci sono separate da " ; ".

**r. 113** `}` — Fine della funzione.

**r. 114–117** `export function stutterSummary(runs) {` — Riga vuota, commento e inizio del riepilogo degli scatti sull'intero percorso, prendendo l'esecuzione peggiore; senza esecuzioni, testo vuoto.

**r. 118–123** `return { frameMsMax: …, over50: …, stalls: … }` — Fotogramma più lungo, numero massimo di fotogrammi oltre 50 ms e di blocchi oltre 250 ms. Fine.

**r. 124–126** `export function browserLabel(ua = navigator.userAgent) {` — Riga vuota, commento e inizio: ricava nome e versione del browser dalla sua "carta d'identità" testuale (lo user agent), quanto basta per il registro.

**r. 127** `const m = ua.match(/(Edg|OPR|Firefox|CriOS|FxiOS|Chrome) …` — Cerca nel testo il primo nome di browser noto seguito dal numero di versione; se non ne trova, cerca Safari. Attenzione: la ricerca prende il nome che compare per primo nel testo, e Edge e Opera scrivono anche "Chrome/" prima del proprio nome, quindi probabilmente vengono registrati come Chrome (non verificato su un dispositivo).

**r. 128** `if (!m) return 'sconosciuto'` — Nessuna corrispondenza.

**r. 129** `if (m.length === 2) return ...Safari m[1]` — Se ha trovato Safari (il secondo modello cattura un solo numero), scrive "Safari 26" e simili.

**r. 130–132** `const names = { Edg: 'Edge', OPR: 'Opera', CriOS: …` — Traduce le sigle in nomi leggibili e restituisce nome e versione. Fine.

**r. 133–135** `const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—')` — Riga vuota e due aiuti per scrivere i numeri con un decimale o senza; se il numero non è valido scrivono "—".

**r. 136–138** `export function perfRow(agg, meta) {` — Riga vuota, commento e inizio: costruisce una riga della tabella di `docs/PERF.md`, nello stesso ordine delle colonne. Se si aggiunge una colonna alla tabella, va aggiunta anche qui nella stessa posizione.

**r. 139–144** `return ... [meta.date, meta.device, …].join(' | ')` — Mette in fila data, dispositivo, scheda grafica, browser, versione del codice, tier, densità dello schermo, dimensioni della finestra, numero di esecuzioni, fps, durate, chiamate di disegno, triangoli e la nota sul dispositivo reale, separati da " | " come vuole il formato delle tabelle Markdown. Fine della funzione e del file.

## `src/lib/sanitizeHtml.js` (56 righe)

Ripulisce le pagine legali (condizioni di vendita, privacy, recesso…) che il venditore scrive su Shopify, prima di mostrarle nel sito: tiene solo testo e formattazione semplice ed elimina tutto ciò che potrebbe eseguire codice o caricare risorse esterne. È una protezione di sicurezza: un testo esterno non deve poter agire sul sito. Lo usa solo `LegalSheet.jsx`; la suite `e2e-phase8a.mjs` lo attacca apposta per verificarlo. Si può aggiungere un tag innocuo alla lista `KEEP` se una pagina legale ne ha bisogno; non vanno mai tolti elementi da `DROP` né aggiunti attributi o protocolli dei link senza una verifica di sicurezza.

**r. 1–10** `/** Ripulisce l'HTML che arriva da fuori…` — Commento: elenco dei tag ammessi; nessun attributo tranne l'indirizzo dei link sicuri; script, stili, immagini, riquadri esterni e moduli spariscono col loro contenuto; gli altri tag sconosciuti lasciano solo il testo; i titoli scendono di livello perché il titolo della scheda è già il titolo principale. L'HTML viene letto in un documento "inerte", dove nulla viene eseguito o scaricato.

**r. 11–12** `const KEEP = new Set(['P', 'BR', 'UL', 'OL', 'LI' …` — I tag ammessi: paragrafi, a capo, elenchi, grassetto, corsivo, sottolineato, link, citazioni, tabelle, testo piccolo, apici e pedici, linea orizzontale e due livelli di titolo (H3, H4).

**r. 13–15** `const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', …])` — I tag da eliminare insieme a tutto il loro contenuto: script (codice), stili, riquadri con altri siti, oggetti incorporati, grafica, moduli e campi, immagini, video, audio e intestazioni della pagina.

**r. 16** `const RENAME = { H1: 'H3', H2: 'H3', H3: 'H4', H4: …` — Come abbassare i titoli: i più grandi diventano H3, tutti gli altri H4, così non competono col titolo della scheda.

**r. 17** `const SAFE_PROTOCOLS = new Set(['http:', 'https:' …` — I soli tipi di link ammessi: pagine web, email e numeri di telefono. Un link "javascript:" (che eseguirebbe codice) viene scartato.

**r. 18–19** `function safeHref(raw) {` — Riga vuota e inizio del controllo dell'indirizzo di un link: restituisce l'indirizzo pulito o `null` se va scartato.

**r. 20** `if (!raw) return null` — Nessun indirizzo: niente link.

**r. 21–23** `const url = new URL(raw.trim(), 'relative://x/')` — Commento e lettura dell'indirizzo con una base finta: i link relativi (es. "/pagina") porterebbero al dominio del sito invece che a Shopify, e la base finta li fa riconoscere.

**r. 24** `return url.protocol !== 'relative:' && …` — Accetta l'indirizzo solo se è assoluto e di un tipo sicuro.

**r. 25–28** `} catch { return null }` — Un indirizzo che non si riesce nemmeno a leggere viene scartato. Fine.

**r. 29–30** `function clean(node, doc) {` — Riga vuota e inizio della pulizia di un elemento e di tutto ciò che contiene. È "ricorsiva": per pulire ciò che sta dentro richiama sé stessa, come aprire una matrioska dopo l'altra.

**r. 31** `for (const child of [...node.childNodes]) {` — Scorre i contenuti diretti dell'elemento (su una copia della lista, perché durante il giro la lista cambia).

**r. 32** `if (child.nodeType === 3) continue` — Il testo semplice resta com'è.

**r. 33** `if (child.nodeType !== 1) { child.remove(); continue }` — Tutto ciò che non è testo né un tag (commenti nascosti e simili) viene tolto.

**r. 34** `const tag = child.tagName.toUpperCase()` — Il nome del tag in maiuscolo, per confrontarlo con le liste.

**r. 35** `if (DROP.has(tag)) { child.remove(); continue }` — Tag pericoloso o inutile: via, col suo contenuto.

**r. 36** `clean(child, doc)` — Prima pulisce ciò che c'è dentro questo elemento.

**r. 37** `const target = RENAME[tag] ?? tag` — Il nome finale del tag (abbassato se è un titolo).

**r. 38** `if (!KEEP.has(target)) { child.replaceWith(...child.chil …` — Tag non ammesso ma innocuo (es. un `div`): toglie il "contenitore" e lascia il suo contenuto al suo posto.

**r. 39–40** `const el = doc.createElement(target.toLowerCase())` — Crea un elemento nuovo e pulito dello stesso tipo e ci sposta dentro il contenuto. Così tutti gli attributi dell'originale (stili, eventi, classi) vanno persi di proposito.

**r. 41–47** `if (target === 'A') { const href = safeHref(…); … }` — Per i link: se l'indirizzo non è sicuro, resta solo il testo del link; altrimenti si mettono l'indirizzo pulito, l'apertura in una nuova scheda e l'impostazione `noopener noreferrer`, che impedisce alla pagina aperta di agire su questa.

**r. 48–50** `child.replaceWith(el)` — Sostituisce l'elemento originale con quello pulito. Fine del giro e della funzione.

**r. 51–52** `export function sanitizeHtml(html) {` — Riga vuota e inizio della funzione che il resto del sito chiama: riceve l'HTML grezzo e restituisce quello pulito.

**r. 53** `const doc = new DOMParser().parseFromString(...<body>htm …` — Legge l'HTML in un documento separato e inerte (se manca, usa un testo vuoto).

**r. 54–56** `clean(doc.body, doc)` — Pulisce tutto il corpo del documento e ne restituisce il contenuto come testo HTML. Fine della funzione e del file.
