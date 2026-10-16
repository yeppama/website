# INTO industries — negozio immersivo 3D

Prototipo web del negozio streetwear INTO industries (Florence): si visita in prima persona, da
desktop e da telefono. Tutti i contenuti (mappa, luci, espositori, capi, prezzi, testi) stanno in
`src/config/storeConfig.js`. **Prezzi, capi e testi sono dimostrativi; nessun acquisto è possibile.**

```bash
npm ci
npm run dev        # sviluppo
npm run build      # build di produzione in dist/
npm run preview    # serve dist/ in locale
npm run test:nav   # logica di navigazione
npm run test:device
```

Deploy: integrazione Git di Vercel. Ogni push su un branch crea un'anteprima (protetta da login
Vercel); `main` è la produzione. Header e cache in `vercel.json`.

Documentazione: `PLAN.md` (piano, schema dati, decisioni), `CONTEXT.md` (stato e lezioni),
`docs/PERF.md` (misure di prestazioni, `?bench=1`), `docs/CONTENUTI.md` (contenuti reali da ricevere).
