# INTO industries — negozio immersivo 3D

Prototipo web del negozio streetwear INTO industries (Florence): si visita in prima persona, da
desktop e da telefono. Tutti i contenuti (mappa, luci, espositori, capi, prezzi, testi) stanno in
`src/config/storeConfig.js`. **Prezzi, capi e testi sono dimostrativi; nessun acquisto è possibile.**

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

Suite e2e (Playwright), contro un server locale già avviato:

```bash
npm run preview
node scripts/e2e/e2e-phase3.mjs http://localhost:4173 /tmp/out
```

`CHROMIUM_PATH` indica l'eseguibile del browser; `CI=1` o `CHROMIUM_NO_SANDBOX=1` aggiungono
`--no-sandbox`, che serve solo nei container.

Deploy: integrazione Git di Vercel. Ogni push su un branch crea un'anteprima (protetta da login
Vercel); `main` è la produzione. Header e cache in `vercel.json`.

Ogni push fa girare lint, invarianti, build e le suite Node su GitHub Actions
(`.github/workflows/ci.yml`), più `npm audit` sulle dipendenze.

Documentazione: `PLAN.md` (piano, schema dati, decisioni), `CONTEXT.md` (stato e lezioni),
`docs/PERF.md` (misure di prestazioni, `?bench=1`), `docs/CONTENUTI.md` (contenuti reali da
ricevere), `docs/SICUREZZA.md` (audit di sicurezza e header).
