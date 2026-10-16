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
- Branch: ogni sessione lavora sul branch che le è assegnato, creato a partire dal branch più avanzato, **non da `main`**. Il più avanzato al 2026-10-16 è `claude/adoring-brown-08ebsm` (Fasi 0–8a + documenti ristrutturati). `main` = produzione, ferma alla Fase 7. `claude/cool-edison-2svzgj` (fino alla 8a) e `claude/determined-thompson-yfnsdc` (fine Fase 4) sono storici: non ci si lavora più.

## Avvio di una nuova sessione

1. `CLAUDE.md` e `CONTEXT.md` sono già in contesto: non rileggerli.
2. Verificare di partire dalla base giusta: `git log --oneline -3` deve contenere il commit di ristrutturazione dei documenti e la Fase 8a; `git log --oneline origin/main..HEAD` mostra cosa non è ancora in produzione. Se manca qualcosa, fermarsi e dirlo all'utente.
3. Il container è nuovo: `npm ci` prima di build e test (senza, `npm run build` esce con 127).
4. Per il compito: leggere solo la sezione pertinente di `docs/plan/`, `docs/PLAN-8.md` e `docs/LEZIONI.md`.
5. A fine lavoro aggiornare `CONTEXT.md` (solo stato vigente, sotto ~8 KB) e spostare i dettagli conclusi in `docs/STORIA.md`.

## Uso del contesto

- **Output dei test:** mai riversare un log intero. Suite e2e e build si leggono dal riepilogo (`… > <out>/log.txt; tail -40 <out>/log.txt`, `grep -E 'FAIL|✗|Error'`). Le suite lunghe (e2e, benchmark) si affidano a un sotto-agente che riporta solo esito, verifiche fallite e percorsi degli screenshot.
- **Screenshot:** si aprono solo quando l'esito va verificato a occhio (resa, layout) e solo quelli pertinenti, mai tutta la cartella. Ma vanno guardati: test verdi non dicono che la resa è giusta.
- **Letture:** prima `grep -n` / la sezione indicata, poi il tratto di file che serve; `PLAN.md` è un indice, si apre solo il file della sezione.
- **Lezioni:** prima di toccare un'area, leggere la sua parte di `docs/LEZIONI.md` (Rendering, Navigazione, UX, Test e processo).
- **Le cinque da non dimenticare mai:** committare solo dopo aver letto l'esito (`… | tail && git commit` committa coi test rossi) · prima del commit leggere `git diff`, non fidarsi di `git add -A` · nei test aspettare condizioni, mai millisecondi (qui il desktop rende a 1–2 fps) · heredoc con `<<'EOF'` · i test leggono la taratura dal config, non la ricopiano.
- Dal container non sono raggiungibili `*.vercel.app`, `vercel.com`, Instagram, l'API GitHub `/pages`: lo stato dei deploy si legge dai Deployment di GitHub (`ref` = SHA).
