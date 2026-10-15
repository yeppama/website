# CLAUDE.md

Stato del progetto, decisioni, codice di riferimento, lezioni apprese e prossimi passi:

@CONTEXT.md

Piano completo, schema dati e limiti dell'ambiente: `PLAN.md`.

## Regole non negoziabili

- Una fase alla volta. Si avanza solo col comando esplicito `Approvato, procedi alla fase X`.
- Nessun contenuto specifico nei componenti: tutto in `src/config/storeConfig.js`, relazioni per ID.
- Collisioni solo sui box di `colliders`, mai sulle mesh.
- Prima di ogni commit: `npm run build`, `npm run test:nav` e le suite `scripts/e2e/` interessate, **leggendo l'esito**.
- Report di fine fase: eseguito / non eseguito / bloccato, mai una verifica impossibile presentata come superata.
- Branch di lavoro: `claude/determined-thompson-yfnsdc`.
