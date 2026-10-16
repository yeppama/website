# LEZIONI — lezioni apprese ed edge case

> Spostate da `CONTEXT.md` §4 il 2026-10-16. Leggere la sezione pertinente prima di toccare rendering, navigazione, UX o i test.

**Rendering**
- `color` + `map` con lo stesso colore = colore al quadrato (pavimento nero, griglia invisibile). Con una mappa il colore va a bianco.
- Il dispose della cache GPU su unmount React rompe tutto in StrictMode (texture distrutte, materiali ancora referenziati). Risolto in Fase 6 legandolo al Canvas con rilascio differito (`gpuCaches.js`).
- `<primitive object>` non viene liberato da R3F: la linea del percorso lasciava geometria e materiale a ogni tap. E un `<Ping key={id}>` rimontato a ogni tap lasciava l'anello vecchio in scena (causa interna a R3F non isolata): ora un solo anello riusato. Misurato: 33 → 81 geometrie in 24 spostamenti prima, stabile dopo.
- `gl.info.memory` cresce legittimamente la prima volta che un oggetto viene disegnato: i test di perdita vanno fatti dopo un riscaldamento, e a pochi fps un hotspot può comparire solo al secondo giro.
- Ripristino del contesto: smontare il Canvas vecchio forza un'altra perdita di contesto, che arriva dopo il rimontaggio. Va ignorata (canvas ritirati).
- In SwiftShader il p50 reale è ~10–14 fps: il test del limitatore usa un tetto di 10, non 20.
- `manualChunks` su three lo metteva fra i `modulepreload`, annullando il lazy import. E un componente del bundle iniziale che importa `materials.js` trascina dentro tutto three: le utilità 2D stanno in `noise.js`.
- Senza `frameloop="demand"`, `invalidate()` non fa nulla: il "limitatore" girava a 120 fps su schermi a 120 Hz.
- Con oggetti vicino alle luci, i valori tarati per pareti vuote sovraespongono: un nero (albedo 0.004) diventa mezzotono o caramello. Si misura sulla scena vera (felpa ≤ ~51/255, pedana ~229/255).
- Faretti di colore saturo sui prodotti ne falsano il colore. Prodotti in bianco caldo, colore sulle pareti.
- Il fov in three è **verticale**: in verticale su telefono va allargato (regola `minHorizontal`), sia per il player sia per il Focus.
- Gli eventi di input possono arrivare fra due fotogrammi: `camera.updateMatrixWorld()` prima di ogni raycast.

**Navigazione**
- La convenzione di rotazione dei collider era speculare rispetto a three (corretta in fase 3). Va testata contro le matrici di three, non a ragionamento.
- Grafo troppo rado: il 2% del pavimento era invisibile da ogni nodo → corridoi laterali. Considerare tutti i nodi visibili, non i 3 più vicini.
- Tagliare `dt` a frame lenti porta la simulazione al rallentatore: si recupera il tempo a sotto-passi.
- L'invariante I16 ha trovato un collegamento che attraversava il plinto: ogni nuovo collider va validato contro i collegamenti del grafo.
- Uscendo dal Focus dopo un avvicinamento, la rotazione verso l'espositore va applicata prima di salvare la posa di ritorno.

**UX**
- Test verdi non dicono che la resa è giusta: in Fase 5 la galleria del Lookbook tagliava l'immagine 16:9 e le miniature troncavano l'etichetta, con 34/34. Guardare sempre gli screenshot.
- Immagini di ratio diversi in una cornice fissa: `h-full` + `aspect-ratio` sfora se l'immagine è più larga della cornice; scegliere in JS fra `w-full` e `h-full` confrontando i ratio.
- Su telefono nome e prezzo vanno sopra la galleria, o un 4:5 a tutta larghezza li spinge sotto la piega.
- Mai istruzioni per comandi che non esistono: l'utente ha creduto rotto il touch. Feature flag + I15.
- L'onboarding deve scorrere: su un telefono in orizzontale (~390 px) "Entra" era irraggiungibile.
- Telefono in orizzontale (844×390): la minimappa larga `sm:w-44` (alta 264 px) spingeva la barra "Vai a" fuori dallo schermo. Ora `[@media(max-height:520px)]:w-16`. Trovato dalla verifica responsive della Fase 6, non a occhio.
- Un testo lungo (l'avviso di rendering software) allargava l'HUD prestazioni su mezza scena: pannelli informativi a larghezza fissa.
- Prompt fissi in percentuale e prompt nel flusso si sovrappongono: stessa colonna, impilati.
- Una barra a scorrimento con l'ultima voce tagliata sembra un difetto: griglia a colonne uguali, corpo `clamp()`, verificata a 320/360/390/430 px.
- Tasti premuti all'apertura del menu o alla perdita di focus: azzerarli, o il player cammina da solo.

**Test e processo**
- Script Python che riscrivono file: `open(p,'w')` svuota il file prima di `write()`. Una virgola in coda ha reso il contenuto una tupla, `write()` è fallito e `storeConfig.js` è rimasto vuoto (ripristinato da git). Controllare la dimensione del file dopo ogni riscrittura.
- Un comando interrotto o rifiutato dall'utente può aver già applicato una parte delle modifiche: prima di ogni commit leggere `git diff`, non fidarsi di `git add -A`. In Fase 6 una riduzione d'intensità fermata dall'utente è finita nel commit `7945fa8` senza che venisse dichiarata.
- In questo container il desktop rende a 1–2 fps: i test aspettano **condizioni**, mai millisecondi fissi; dopo uno spostamento forzato aspettano che la camera abbia raggiunto il player.
- Il sistema di luci del Focus riporta le intensità al config ogni fotogramma: modificarle a mano dal test non ha effetto.
- I test devono leggere i valori di taratura dal config, non ricopiarli.
- Selettori per etichetta ambigui (stesso testo in menu e barra): restringere al contenitore.
- Heredoc bash non quotati espandono i `${…}` dei template JS: usare `<<'EOF'`.
- **Committare solo dopo aver letto l'esito**: una catena `… | tail && git commit` committa anche con test rossi.
- Il Pointer Lock funziona nel Chromium headless di questo ambiente.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, né l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA, non nome del branch).

