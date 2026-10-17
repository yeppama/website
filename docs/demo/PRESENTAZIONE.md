# Presentazione della demo al cliente

## Cosa mandare

1. **Link della demo**: l'anteprima Vercel di questo branch (la protezione delle anteprime Vercel va
   tolta o il cliente va invitato, altrimenti vede la pagina di accesso di Vercel).
2. **Il modello Excel compilato come esempio**: `docs/demo/catalogo-demo.xlsx` (i 7 capi della demo),
   accanto a quello vuoto da compilare, `docs/modello-catalogo-INTO.xlsx`.
3. Una riga che dichiari che capi, testi e foto sono di prova e le foto generate con l'IA.

## Prima di mandarlo

- **Cassa**: la demo usa il negozio Shopify di sviluppo. "Vai al pagamento" porta alla pagina con
  password dei negozi di sviluppo: o si dà la password al cliente, o si manda il link con
  `?commerce=mock` (carrello finto, nessuna cassa). Pagamento di prova: carta `1`.
- Provare il percorso qui sotto da un telefono vero.

## Traccia di 2 minuti

| Tempo | Dove | Cosa dire / fare |
|---|---|---|
| 0:00 | Onboarding → **Entra** | "È il vostro negozio, a Firenze, aperto 24 ore: ci si entra dal browser, niente app." |
| 0:15 | Ingresso → barra **Vai a** → **Nuovi Arrivi** | Tap sul pavimento per camminare, trascinare per guardarsi attorno. |
| 0:35 | Tap sul manichino → **Focus** | "Il capo si esamina come in negozio: la luce cambia, il resto si spegne." |
| 0:50 | **Scheda completa** | Foto, colori (la foto cambia col colore), taglie, prezzo letto da Shopify. |
| 1:05 | Taglia → **Aggiungi al carrello** → **Carrello** | Quantità, subtotale, "Vai al pagamento" = cassa vera di Shopify. |
| 1:25 | Menu → **Apri la Brand Story** | Racconto della collezione, foto di campagna, capi del look. |
| 1:45 | Chiusura | "Per arrivare a questo con i vostri capi serve il file Excel compilato e le foto." |

## Dopo

Con il materiale vero: `npm run catalog:import` del file del cliente, contenuto `into` al posto di
`demo` (src/content/), poi Fase 8c (piano: `docs/PIANO-DEMO.md`, passo 8).
