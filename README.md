# INTO industries — negozio immersivo 3D

Prototipo web del negozio streetwear INTO industries (Florence): si visita in prima persona, da
desktop e da telefono. Mappa, luci, espositori, capi, prezzi e testi stanno in `src/config/storeConfig.js`
e `src/content/`. **Prezzi, capi e testi sono dimostrativi.**

## Le due proposte per il cliente

| Proposta | Dove si vede | Stato |
|---|---|---|
| **A · Negozio attuale** | pagina principale dell'anteprima | completo e navigabile, foto e prezzi di prova |
| **B · Cantiere** | stessa anteprima, indirizzo + `/prova-cantiere.html` | immagine di prova: si guarda girando attorno, non si cammina |

L'anteprima è quella che Vercel crea a ogni push sul branch `sviluppo`; `main` è la produzione. Header e
cache in `vercel.json`. Dettagli: `CONTEXT.md` §3.

## Branch

- `main` — produzione.
- `sviluppo` — lavoro in corso e anteprime per il cliente.
- `archivio/docs-ristrutturati` — solo archivio.

## Comandi

```bash
npm ci
npm run dev        # sviluppo
npm run build      # build di produzione in dist/
npm run preview    # serve dist/ in locale
npm run test:nav   # logica di navigazione (elenco completo dei test in docs/RIFERIMENTO.md)
```

Contenuti: `src/content/` (`into` = INTO, `demo` = demo), scelti con `VITE_CONTENT`. La produzione rifiuta
il contenuto `demo` (`vite.config.js`).

## Documentazione

`CONTEXT.md` (stato) · `docs/DECISIONI.md` · `docs/RIFERIMENTO.md` · `docs/LEZIONI.md` · `docs/STORIA.md` ·
`PLAN.md` (piano e schema dati) · `docs/PLAN-8.md` (e-commerce) · `docs/PERF.md` (prestazioni) ·
`docs/CONTENUTI.md` (cosa serve dal cliente) · `docs/MANUALE.md` (come funziona, per l'utente).
`docs/codice/` spiega il codice riga per riga, ma è ferma a prima della demo.
