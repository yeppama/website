# Piano della demo "negozio finito" (vetrina)

Deciso con l'utente il 2026-10-17, da eseguire in una **sessione nuova** sul branch `demo/vetrina`
(creato dallo stato di `claude/cool-edison-2svzgj` al commit di questo file). `main` resta il sito
pubblico di INTO e non si tocca.

## Scopo
Mostrare al cliente il negozio come sarà finito, con contenuti di prova credibili, mentre prepara il
materiale vero. Strada scelta: **A (demo per INTO) preparando B (modello riusabile per altri clienti)**,
da confermare nel messaggio d'avvio della nuova sessione.

## Decisioni da prendere nel messaggio d'avvio
1. Scopo: A, oppure A preparando B.
2. Foto: generate con l'IA, stock con licenza, oppure dell'utente.
3. Capi 3D: livello leggero (foto applicata sulla sagoma) oppure nessun intervento.

Senza `Approvato, procedi con la demo` e queste scelte, non si parte (regola di processo in CLAUDE.md).

## Passi
1. **Branch**: lavorare su `demo/vetrina` (o su un branch di sessione creato da `demo/vetrina`, mai da `main`,
   che è fermo alla Fase 7). Anteprima Vercel automatica a ogni push. `noindex` già attivo.
2. **Catalogo finto ma credibile**: 7–10 capi compilati nel modello `docs/modello-catalogo-INTO.xlsx`,
   poi `npm run catalog:import`. Nomi e prezzi inventati, nessuna foto o capo di altri marchi.
3. **Commercio**: catalogo finto caricato sul negozio Shopify di **sviluppo** (`into-industries-dev`),
   così si vede anche la cassa vera con pagamento di prova. In alternativa `?commerce=mock`.
4. **Immagini**: 4:5 prodotto, 1:1 e 16:9 dettagli e campagna; uno stile fissato e applicato a tutte.
5. **Codice** (serve anche alla 8c, quindi resta):
   1. foto vere in scheda prodotto, menu, Lookbook, Focus, con caricamento leggero su telefono;
   2. capi 3D: foto applicata sulla sagoma (livello leggero), da rimisurare sui telefoni;
   3. contenuti separati dal codice (`content/demo.js`, `content/into.js`, scelto alla pubblicazione):
      è ciò che rende il sito un modello riusabile;
   4. pulizia: "In arrivo nella Fase…", "Prezzi dimostrativi", testi scritti nei componenti (elenco in
      CONTEXT.md §5) e prezzi di storeConfig mostrati col commercio attivo (difetto noto).
6. **Verifica come una fase**: build, test, suite e2e, benchmark su iPhone, Pixel e Honor (le foto pesano),
   prova completa da telefono. Report eseguito / non eseguito / bloccato.
7. **Presentazione**: link della demo + traccia di 2 minuti (ingresso → Nuovi Arrivi → capo → carrello →
   Brand Story) + modello Excel da compilare.
8. **Con il materiale vero**: import del catalogo vero, contenuto `into` al posto di `demo`, poi Fase 8c.
   Il codice dei passi 5.1–5.4 confluisce nel branch principale di lavoro.

## Repository
Stesso repository (`yeppama/website`), branch separato: il codice comune si scrive una volta.
Un repository a parte solo per la strada B, quando arriva un secondo cliente.
