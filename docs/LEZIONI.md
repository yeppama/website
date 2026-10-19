# LEZIONI — lezioni apprese ed edge case

> Spostato parola per parola da `CONTEXT.md` §4 il 2026-10-19. Leggere la sezione pertinente prima di toccare rendering, navigazione, UX, foto o test.

## 4. Lezioni apprese & edge case

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
- Telefono in orizzontale (segnalato dall'utente il 2026-10-16): il pannello del Focus copriva il capo e la scheda mostrava solo un'immagine più alta dello schermo. Le verifiche della Fase 6 controllavano che i bottoni fossero nello schermo, non che il capo fosse visibile: ora `e2e-landscape.mjs` proietta il capo e controlla che non cada sotto il pannello. Ruotare il telefono durante il Focus lasciava il fov del vecchio orientamento anche dopo l'uscita: corretto.
- Telefono in orizzontale (844×390): la minimappa larga `sm:w-44` (alta 264 px) spingeva la barra "Vai a" fuori dallo schermo. Ora `[@media(max-height:520px)]:w-16`. Trovato dalla verifica responsive della Fase 6, non a occhio.
- Un testo lungo (l'avviso di rendering software) allargava l'HUD prestazioni su mezza scena: pannelli informativi a larghezza fissa.
- Prompt fissi in percentuale e prompt nel flusso si sovrappongono: stessa colonna, impilati.
- Una barra a scorrimento con l'ultima voce tagliata sembra un difetto: griglia a colonne uguali, corpo `clamp()`, verificata a 320/360/390/430 px.
- Tasti premuti all'apertura del menu o alla perdita di focus: azzerarli, o il player cammina da solo.

**Navigazione (correzioni del 2026-10-17)**
- Ciò che si disegna a terra (anello del tocco, linea del percorso, indicatori) a y ≈ 0,02 finiva **sotto le pedane** (alte 6 cm): i test dicevano "visibile" perché controllavano `visible`, non l'occlusione. Visto solo nello screenshot. Ora l'altezza viene da `floorHeightAt`.
- Contro un manichino il player scivola lungo il margine e passa fra i due manichini: un test di collisione va fatto su tutte le posizioni della camminata, col modello della fisica (`circleOverlapsCollider`, angoli arrotondati), non col box ad angoli vivi.

**Demo e foto (2026-10-17)**
- Higgsfield col piano gratuito: GPT Image bloccato ("Requires basic plan"), modelli realistici 1–1,5 crediti, Z Image 0,15; al massimo ~4 generazioni contemporanee (429) e 1 sola rimozione dello sfondo per volta (1 credito l'una).
- Le immagini generate stanno su `d8j0ntlcm91z4.cloudfront.net`: host aggiunto dall'utente agli host consentiti il 2026-10-17.
- Scontorno locale con soglia 40: le ombre morbide del fondo finivano nel capo (striscia grigia sulla felpa, ombra a terra sul pantalone). Con 100 sono fondo; guardare sempre le texture su un fondo colorato.
- Z Image non segue sempre il testo: il pantalone da tuta è uscito con bande arancioni invece che tono su tono. Si corregge il testo, non si rigenera.
- `ImageDraw.floodfill` non scrive su un'immagine nata da un array numpy (memoria condivisa): serve `.copy()`. Senza, lo scontorno restituiva il capo grande quanto la foto.
- Cantiere (2026-10-19): fra tavolo e catene della prova il corridoio era largo zero (I16 lo ha trovato): con margine e raggio del player un oggetto "a 1 m" può chiudere un passaggio. I GLB e le istanze vanno fuori da MergeByMaterial. Uno script e2e che legge storeConfig in Node deve usare lo stesso contenuto della build (`.env`), o i controlli sui capi passano a vuoto.
- Bloom del cantiere (2026-10-19): in React Three Fiber un `useFrame` con priorità > 0 prende il posto del render automatico (va chiamato `gl.render` a mano). Con più `gl.render` per fotogramma `gl.info` si azzera a ogni chiamata e l'HUD contava solo l'ultima: `autoReset = false` e azzeramento a mano a inizio fotogramma. Nella maschera i piani trasparenti senza profondità (aloni, hotspot, adesivi) in nero pieno diventerebbero rettangoli scuri nel bagliore: si nascondono. Un bagliore che attraversa la foto dei pannelli la sbiadisce: raggio basso (0,4).
- Proiettare la foto del fronte anche sul retro (specchiata) sembrava un risparmio; l'utente l'ha letto come un capo che ruota su se stesso. Un capo 3D deve avere un retro credibile, anche solo il colore della stoffa (2026-10-19). MergeByMaterial unisce per istanza di materiale: niente materiali multipli su una mesh, si divide in due mesh.
- Un espositore in mezzo alla stanza vicino a un muro crea una sacca dove il player resta chiuso: contro un muro, il varco collider–muro va tenuto più stretto del diametro del player (test in `e2e-cantiere.mjs`). Un test di cammino verso un punto vicino a un collider allargato può fallire per la meta, non per il percorso: le mete dei test vanno prese dai waypoint.
- Muri del negozio A spessi 0,2 m centrati sulla linea: la faccia interna è a ±11,9 / −17,9, non a ±12 / −18. Le barre LED messe a 11,94 erano dentro il muro e lo screenshot era identico a prima (2026-10-19).
- Una build fallita lascia `dist/` com'era: le misure fatte subito dopo (con `| grep` che nascondeva l'errore) erano sulla build vecchia. Leggere l'esito della build prima di ogni misura (2026-10-19, fase C).
- Un punto scelto a occhio su uno screenshot cade facilmente su un'etichetta dell'interfaccia: le misure di luminosità si fanno in una posa fissa (Focus), con l'interfaccia nascosta e il punto proiettato dalla scena (2026-10-19).
- Accorciando la stanza, il varco fra le colonne e il nuovo muro di fondo era di 30 cm: `test:nav` ha trovato le destinazioni irraggiungibili. Dopo ogni modifica della pianta, una griglia di destinazioni contro `plan()` dice subito dove (2026-10-19).
- `useTexture` di drei nel negozio A (grafica alle pareti): dopo un rimontaggio della scena il renderer contava texture in più (26/28 → 29; `e2e-phase6.mjs`, "ogni scena rimontata ha le risorse della prima"). Trovato togliendo la grafica (23 fisso) e intercettando `createTexture` con pila e misure: una 1×1 in più al primo disegno. Corretto con una cache propria registrata in `gpuCaches` (`lib/wallTextures.js`), come le foto dei capi, e materiali creati in `useMemo`: un materiale scritto in JSX allo smontaggio viene liberato da R3F insieme alla sua `map` condivisa. Il cantiere usa ancora `useTexture` (non coperto da quel test).
- Una scena rimontata, in rendering software, impiega secondi a ridisegnare tutto: un conteggio delle risorse preso dopo un tempo fisso dava "perdite" che sparivano aspettando (cantiere, 2026-10-19). Le verifiche dei rimontaggi aspettano che le risorse tornino a quelle della prima scena, con un tetto di tempo: una perdita vera non ci torna mai.
- Un tier con ombre ridisegnava ogni fotogramma le mappe d'ombra di una scena dove nulla si muove: sul Pixel 10 il cantiere raddoppiava i triangoli e falliva sugli scatti. Le ombre si calcolano una volta (`lib/staticShadows.js`); chi cambia una sagoma che proietta ombra lo segnala (2026-10-19).
- Nel container le immagini arrivano in millisecondi: un caricamento "a scena avviata" sembra gratis e sul telefono in rete mobile arriva a metà percorso. Le immagini visibili si aspettano prima di entrare (2026-10-19, Honor nel negozio A).
- Il test del limitatore (tetto 10 fps, p50 fra 8,5 e 10,5) dipende dalla velocità del container: il 2026-10-19 alle 14 passava, alle 15 dava 7,5 anche sul commit precedente. Prima di attribuirlo a una modifica, misurarlo sul commit di prima.
- Un elemento per voce (barra + alone) costava 2 draw call l'uno: 12 in più nel negozio con 7 barre. Unite in 2 mesh per tutto il negozio, +2 (2026-10-19).
- Cambiare la mappa di un materiale con un'altra non ricompila lo shader: i capi 3D nascono con una mappa trasparente 1×1 e prendono la foto all'arrivo, senza scatti dopo il riscaldamento.

**Test e processo**
- Le richieste dirette di Playwright (`ctx.request`) non passano dal proxy del container: le verifiche di rete si fanno dal browser (`page.goto`, `fetch` nella pagina).
- Una pagina che risponde 200 non è per forza quella attesa: la "cassa" Shopify era la pagina `/password`. Controllare l'indirizzo d'arrivo.
- Script Python che riscrivono file: `open(p,'w')` svuota il file prima di `write()`. Una virgola in coda ha reso il contenuto una tupla, `write()` è fallito e `storeConfig.js` è rimasto vuoto (ripristinato da git). Controllare la dimensione del file dopo ogni riscrittura.
- Un comando interrotto o rifiutato dall'utente può aver già applicato una parte delle modifiche: prima di ogni commit leggere `git diff`, non fidarsi di `git add -A`. In Fase 6 una riduzione d'intensità fermata dall'utente è finita nel commit `7945fa8` senza che venisse dichiarata.
- In questo container il desktop rende a 1–2 fps: i test aspettano **condizioni**, mai millisecondi fissi; dopo uno spostamento forzato aspettano che la camera abbia raggiunto il player.
- Il sistema di luci del Focus riporta le intensità al config ogni fotogramma: modificarle a mano dal test non ha effetto.
- I test devono leggere i valori di taratura dal config, non ricopiarli.
- Selettori per etichetta ambigui (stesso testo in menu e barra): restringere al contenitore.
- Heredoc bash non quotati espandono i `${…}` dei template JS: usare `<<'EOF'`.
- `vite preview` serve `dist/`: dopo un `git stash` + build di confronto e `stash pop`, `dist/` è quella vecchia. I primi screenshot del Bloom erano identici con e senza per questo (2026-10-19). Ricostruire prima di ogni verifica.
- **Committare solo dopo aver letto l'esito**: una catena `… | tail && git commit` committa anche con test rossi.
- Il Pointer Lock funziona nel Chromium headless di questo ambiente.
- Il `fetch` di Node ignora `HTTPS_PROXY`: senza `NODE_USE_ENV_PROXY=1` nel container fallisce (ENOTFOUND). `check.mjs` si rilancia da solo con la variabile se trova un proxy.
- Da quando il container raggiunge il negozio di sviluppo, il test "Shopify irraggiungibile" taglia la rete da sé (`page.route(...).abort`): un test che dipende dalla rete chiusa smette di provare qualcosa quando la rete si apre.
- Shopify con `@inContext(language: IT)` su un negozio senza italiano risponde nella lingua predefinita, senza errore (verificato).
- `pkill -f "port 4173"` uccide anche la shell che lo esegue (exit 144), perché la sua riga contiene la stessa stringa: è innocuo se è l'unico comando, ma poi va controllato con `curl` che il server sia davvero fermo.
- Un workflow con molti agenti può fermarsi per il limite di utilizzo della sessione: il primo controllo completo ha finito 2 agenti su 14. Dichiararlo, non presentare la parte fatta come completa.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, né l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA, non nome del branch).

