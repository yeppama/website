# Foto della demo

Le foto della demo sono **generate con l'IA** (scelta dell'utente, 2026-10-17): nessuna foto o capo di
altri marchi. Vanno dichiarate come tali al cliente (lo dice anche l'onboarding della demo).

## Come sono state fatte

- Servizio: Higgsfield, modello **Z Image** (0,15 crediti a foto). Il piano gratuito non permette i
  modelli migliori (GPT Image) e quelli realistici costano 1–1,5 crediti: con 8,5 crediti Z Image era
  l'unico modo di fare tutte le foto con margine per rifarne qualcuna.
- 18 foto: 12 dei capi (fronte, un retro, dettagli) e 5 della campagna, più 1 prova scartata.
- Scontorno per i capi 3D: i capi scuri si scontornano in locale (fondo chiaro uniforme); i capi chiari
  (Bone) no, quindi sono stati scontornati dal servizio (1 credito l'uno, 4 foto).
- Elenco nome → indirizzo dell'originale: `foto-sorgenti.tsv`.

## Stile fissato (vale per tutte le foto nuove)

- **Capi**: packshot da catalogo, manichino invisibile, vista frontale, capo intero con margine, fondo
  grigio caldo chiaro uniforme (il "mondo studio" del brand, `#dcdcd8`), luce morbida dall'alto a
  sinistra, ombra appena accennata. Nessun logo, testo o etichetta. Generate in 3:4, ritagliate in 4:5.
- **Dettagli**: macro del tessuto e delle finiture su fondo scuro, luce radente, poca profondità di campo.
- **Campagna**: Firenze di notte (Oltrarno, Arno, cortili), flash diretto, grana da pellicola 35 mm,
  palette scura con un solo accento Flame Orange, modelli senza volto riconoscibile.
- Colori: Black `#0d0d0d`, Bone `#e8e2d4`, accento Flame Orange `#F98E30` solo nei cordini o nei dettagli.

## Dalla foto al sito

```bash
# originali in media-sorgenti/demo/ (fuori da git); --fetch scarica quelli mancanti dall'elenco
npm run media:build -- demo --fetch docs/demo/foto-sorgenti.tsv
npm run test:content
```

`media:build` ritaglia ogni foto al suo rapporto, la pubblica in `public/media/demo/` in 400, 800 e
1400 px (WebP), prepara le texture scontornate dei capi 3D (512 px) e scrive in
`src/content/demo.media.json` il riquadro del capo in ogni foto. Serve Python 3 con Pillow e numpy.
Uno scontorno fatto altrove si usa mettendo accanto alla foto `<nome>-cutout.png`.

Le stesse istruzioni valgono per le foto vere del cliente (8c): cambia solo la cartella del contenuto.
