# INTO industries — negozio immersivo 3D

Prototipo web del negozio streetwear INTO industries (Florence): si visita in prima persona, da
desktop e da telefono. Mappa, luci, espositori, capi, prezzi e testi stanno in `src/config/storeConfig.js`
e `src/content/`. **Prezzi, capi e testi sono dimostrativi.**

## Le due proposte per il cliente

| Proposta | Dove si vede | Stato |
|---|---|---|
| **A · Negozio attuale** | pagina principale dell'anteprima | completo e navigabile, foto e prezzi di prova |
| **B · Cantiere** | stesso indirizzo + `?allestimento=cantiere` | navigabile come il negozio; Bloom e misure sui telefoni da fare |

L'anteprima è quella che Vercel crea a ogni push sul branch `sviluppo`; `main` è la produzione. Header e
cache in `vercel.json`. Dettagli: `CONTEXT.md` §3.

## Branch

- `main` — produzione.
- `sviluppo` — lavoro in corso e anteprime per il cliente.
- `archivio/docs-ristrutturati` — solo archivio.

## Comandi

```bash
npm ci
npm run dev             # sviluppo
npm run lint            # ESLint: regole sugli hook e accessibilità
npm run validate:config # invarianti di storeConfig (gira anche prima della build)
npm run build           # build di produzione in dist/
npm run preview         # serve dist/ in locale, con gli header di vercel.json
npm run test:nav        # logica di navigazione
npm run test:device     # scelta del tier per dispositivo
```

Elenco completo dei test e dei parametri di debug: `docs/RIFERIMENTO.md`.

Suite e2e (Playwright), contro un server locale già avviato:

```bash
npm run preview
node scripts/e2e/e2e-phase3.mjs http://localhost:4173 /tmp/out
```

`CHROMIUM_PATH` indica l'eseguibile del browser; `CI=1` o `CHROMIUM_NO_SANDBOX=1` aggiungono
`--no-sandbox`, che serve solo nei container.

Contenuti: `src/content/` (`into` = INTO, `demo` = demo), scelti con `VITE_CONTENT`; su `sviluppo`
la build risolve `demo` dal nome del branch. La produzione rifiuta il contenuto `demo`
(`vite.config.js`).

Deploy: integrazione Git di Vercel. Ogni push su un branch crea un'anteprima (protetta da login
Vercel); `main` è la produzione. Header e cache in `vercel.json`.

Ogni push fa girare lint, invarianti, build e le suite Node su GitHub Actions
(`.github/workflows/ci.yml`), più `npm audit` sulle dipendenze.

## Documentazione

`docs/CONSEGNA.md` (da dove ripartire) · `CONTEXT.md` (stato) · `docs/DECISIONI.md` ·
`docs/RIFERIMENTO.md` · `docs/LEZIONI.md` · `docs/STORIA.md` · `PLAN.md` (piano e schema dati) ·
`docs/PLAN-8.md` (e-commerce) · `docs/PERF.md` (prestazioni) · `docs/LANCIO.md` (cosa manca prima di
vendere) · `docs/SICUREZZA.md` (audit, header,
CSP) · `docs/CONTENUTI.md` (cosa serve dal cliente) · `docs/MANUALE.md` (come funziona, per
l'utente).
