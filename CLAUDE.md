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
- **Branch di lavoro: `sviluppo`** (dal 2026-10-19; contiene tutto il lavoro dei branch precedenti).
  `main` è la produzione e non si tocca senza comando dell'utente.
- **Attenzione: questo branch è indietro.** `main` pubblica in produzione un prototipo fermo al
  2026-10-16, e i documenti che stai leggendo descrivono quello stato. `sviluppo` ha ~50 commit in
  più, fino al 2026-10-20, e la sua documentazione (ristrutturata in `docs/DECISIONI.md`,
  `docs/LEZIONI.md`, `docs/STORIA.md`, `docs/RIFERIMENTO.md`) è la fonte aggiornata. Prima di
  dedurre lo stato del progetto da `main`, leggi `sviluppo`.
