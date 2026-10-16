# CLAUDE.md

Stato del progetto, decisioni, codice di riferimento, lezioni apprese e prossimi passi:

@CONTEXT.md

Piano completo, schema dati e limiti dell'ambiente: `PLAN.md` (indice, testo in `docs/plan/`). Lezioni per area: `docs/LEZIONI.md`. Storia delle fasi: `docs/STORIA.md`.

## Regole non negoziabili

- Una fase alla volta. Si avanza solo col comando esplicito `Approvato, procedi alla fase X`.
- Nessun contenuto specifico nei componenti: tutto in `src/config/storeConfig.js`, relazioni per ID.
- Collisioni solo sui box di `colliders`, mai sulle mesh.
- Prima di ogni commit: `npm run build`, `npm run test:nav` e le suite `scripts/e2e/` interessate, **leggendo l'esito**.
- Report di fine fase: eseguito / non eseguito / bloccato, mai una verifica impossibile presentata come superata.
- Branch di lavoro: `claude/cool-edison-2svzgj` (dalla Fase 5; allineato a `claude/determined-thompson-yfnsdc`, che resta com'era a fine Fase 4).

## Uso del contesto

- **Output dei test:** mai riversare un log intero. Suite e2e e build si leggono dal riepilogo (`… > <out>/log.txt; tail -40 <out>/log.txt`, `grep -E 'FAIL|✗|Error'`). Le suite lunghe (e2e, benchmark) si affidano a un sotto-agente che riporta solo esito, verifiche fallite e percorsi degli screenshot.
- **Screenshot:** si aprono solo quando l'esito va verificato a occhio (resa, layout) e solo quelli pertinenti, mai tutta la cartella. Ma vanno guardati: test verdi non dicono che la resa è giusta.
- **Letture:** prima `grep -n` / la sezione indicata, poi il tratto di file che serve; `PLAN.md` è un indice, si apre solo il file della sezione.
- **Lezioni:** prima di toccare un'area, leggere la sua parte di `docs/LEZIONI.md` (Rendering, Navigazione, UX, Test e processo).
- **Le cinque da non dimenticare mai:** committare solo dopo aver letto l'esito (`… | tail && git commit` committa coi test rossi) · prima del commit leggere `git diff`, non fidarsi di `git add -A` · nei test aspettare condizioni, mai millisecondi (qui il desktop rende a 1–2 fps) · heredoc con `<<'EOF'` · i test leggono la taratura dal config, non la ricopiano.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA).
