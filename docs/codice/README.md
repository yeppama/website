# Il codice riga per riga

Spiegazione in italiano di **ogni riga** dei file del sito (80 file, circa 7.500 righe), scritta il
2026-10-17 sul commit `ac1cb32`. Per sapere *quale* file aprire per una modifica parti da
[`docs/MANUALE.md`](../MANUALE.md); qui trovi *cosa fa* ogni riga.

Ogni voce ha la forma **r. 12–18** `estratto del codice` — spiegazione. I numeri di riga valgono per quella
versione: dopo una modifica possono spostarsi, ma l'estratto del codice ti fa ritrovare il punto.
Un controllo automatico ha verificato che per ogni file le voci coprano tutte le righe, dalla prima
all'ultima, senza buchi.

| Parte | Cosa contiene |
|---|---|
| [01 · Configurazione e avvio](01-configurazione-e-avvio.md) | `storeConfig.js` (tutti i dati del negozio), colori e caratteri, i 25 controlli del validatore, la pagina HTML, le regole di pubblicazione, `App.jsx` |
| [02 · Funzioni di base](02-funzioni-di-base.md) | Geometria, urti, percorsi, inquadratura, limitatore di fps, scelta del tier, materiali, sagome dei capi, misure, filtro HTML |
| [03 · Scena 3D](03-scena-3d.md) | Il Canvas, ambiente (pavimento, muri, colonne, parete del brand), luci, espositori |
| [04 · Movimento, Focus e stato](04-movimento-e-stato.md) | Il player, la camera del Focus, gli hotspot, le bacheche condivise (store) |
| [05 · Commercio e schede](05-commercio-e-schede.md) | Negozio finto e Shopify, scheda prodotto, carrello, pagine legali, contenitore delle schede |
| [06 · Interfaccia](06-interfaccia.md) | Ingresso, HUD, minimappa, "Vai a", menu, pannello del Focus, grana, stili e caratteri |
| [07 · Lookbook, strumenti, emergenze](07-lookbook-strumenti-emergenze.md) | Brand Story, bottoni e segnaposto, trappola del focus, misure delle prestazioni, schermate d'errore |

Non sono coperti test e strumenti (`scripts/`): non fanno parte del sito che vede il visitatore.
