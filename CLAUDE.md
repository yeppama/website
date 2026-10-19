# CLAUDE.md

Stato del progetto, branch, le due proposte per il cliente e dove leggere il resto:

@CONTEXT.md

Decisioni tecniche: `docs/DECISIONI.md` · riferimento del codice e comandi: `docs/RIFERIMENTO.md` · lezioni apprese: `docs/LEZIONI.md` · storia: `docs/STORIA.md` · piano completo e schema dati: `PLAN.md`.

## Regole non negoziabili

- Una fase alla volta. Si avanza solo col comando esplicito `Approvato, procedi alla fase X`.
- Nessun contenuto specifico nei componenti: tutto in `src/config/storeConfig.js`, relazioni per ID.
- Collisioni solo sui box di `colliders`, mai sulle mesh.
- Prima di ogni commit: `npm run build`, `npm run test:nav` e le suite `scripts/e2e/` interessate, **leggendo l'esito**.
- Report di fine fase: eseguito / non eseguito / bloccato, mai una verifica impossibile presentata come superata.
- Branch di lavoro: `sviluppo` (dal 2026-10-19; contiene tutto il lavoro dei branch precedenti). `main` è la produzione e non si tocca senza comando dell'utente.
- Prima di toccare un'area, leggere la sezione pertinente di `docs/LEZIONI.md`.
