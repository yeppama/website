# CONTENUTI.md — Cosa serve per la Fase 7 (opzione B)

**Aggiornamento 2026-10-16:** l'utente ha poi scelto di andare in produzione subito (opzione A). Il sito è pubblico
con i segnaposto, ma escluso dai motori di ricerca. Quando arrivano i contenuti reali: inserirli, poi
togliere `X-Robots-Tag` da `vercel.json` e il meta `robots` da `index.html`.

Decisione precedente (2026-10-16): **prima i contenuti reali, poi la produzione.** I punti 1–4 sono stati
inoltrati al cliente il 2026-10-16. La Fase 7 non
parte finché questo elenco non è completo o finché l'utente non dichiara cosa resta segnaposto.

**Dal 2026-10-16 il modo consigliato è il modello Excel `docs/modello-catalogo-INTO.xlsx`**: contiene tutte le
sezioni di questo elenco (capi, colori, lookbook, brand, domande aperte) con menu a tendina e istruzioni. Il
cliente lo compila e lo rimanda con la cartella "foto"; `npm run catalog:import` lo controlla e lo trasforma.

Si può mandare tutto in chat: testi incollati, file allegati. Una cartella condivisa va bene uguale.

**Lingua inglese (fase 8f, dopo il lancio, decisa il 2026-10-16):** chiedere fin da ora al cliente ogni testo
anche in inglese (descrizioni e dettagli dei capi, nomi dei colori se cambiano, lookbook, brand story, pagine
legali). Il lancio è in italiano; i testi inglesi raccolti insieme al catalogo evitano un secondo giro col cliente.

## 1. Brand identity e logo (in arrivo dall'utente)

| Cosa | Formato | Perché |
|---|---|---|
| Logo | `.svg`, oppure `.ai` / `.pdf` vettoriale. In subordine PNG trasparente ≥ 2000 px | Insegna 3D sulla parete di fondo e titoli. La scena carica una texture (PNG o WebP trasparente): un vettoriale va rasterizzato alla larghezza dell'insegna. Oggi c'è un wordmark tipografico di riserva (P1) |
| Versione del logo per fondo scuro | come sopra | Il negozio è nero: se esiste una versione chiara ufficiale, si usa quella invece di invertire i colori |
| Colori del brand | codici esatti (HEX, o Pantone + HEX) | Oggi: Flame Orange #F98E30, nero #060606, osso #f2f0ea, ricavati da screenshot |
| Font del brand | nome, e file con licenza web se proprietario | Oggi: Archivo, JetBrains Mono, UnifrakturCook (open, vicini ma non identici, P2) |
| Tagline | testo esatto, con maiuscole e punteggiatura | Oggi "We're just looking for somewhere", letta dal logo a bassa risoluzione e **non confermata** (P3). Compare come titolo nella Brand Story |
| Dati del marchio | città, coordinate, credito | Oggi: Florence, Italy · 43°46'N 11°15'E · Curated and produced by Tommaso Inturrisi. Confermare o correggere |
| Regole d'uso, se esistono | PDF del manuale | Spazi di rispetto, usi vietati, abbinamenti colore |

## 2. Capi

Uno per ogni capo da mostrare. Oggi ce ne sono 7 segnaposto su 5 espositori: se i capi reali sono
di più o di meno, si cambia la disposizione degli espositori (dimmi quanti).

| Campo | Esempio | Note |
|---|---|---|
| Nome | Heavy Hoodie | |
| Codice (SKU) | INT-001 | se esiste |
| Categoria | Hoodie / Jacket / T-Shirt / Pants / … | serve anche per la sagoma 3D segnaposto |
| Collezione | DROP 01 | |
| Prezzo | 189 € | se i prezzi non sono definitivi, dirlo: resta la nota "dimostrativi" |
| Taglie | XS S M L XL | indicare quali sono **non disponibili** |
| Colori | Black, Bone | nome + codice colore o una foto del tessuto |
| Descrizione | 2–3 righe | |
| Dettagli | 2–4 punti | materiale, vestibilità, produzione |
| Badge | NEW / ARCHIVE / nessuno | |
| Foto | fronte e retro, **4:5** (es. 1600×2000 px), più eventuali dettagli **1:1** o **16:9** | JPG o PNG, fondo uniforme. Senza foto resta il segnaposto grafico |
| In quale lookbook compare | DROP 01 | |

## 3. Lookbook / Brand Story

| Campo | Note |
|---|---|
| Titolo e sottotitolo | il titolo usa il carattere gotico |
| Stagione | es. FW26 |
| Testo | 2 paragrafi brevi |
| Immagini | 3 o più: una 16:9, una 4:5, una 1:1 (o dimmi i formati che hai) |
| Capi del look | quali capi della sezione 2 |

## 4. Da decidere prima di andare in produzione

- **Acquisto:** il bottone resta spento ("in arrivo") finché non si fa la Fase 8 (e-commerce reale).
  Va bene così al lancio?
- **Prezzi:** reali o ancora indicativi? Se indicativi, la nota "dimostrativi" resta visibile.
- **Dominio:** acquistato dal cliente, verrà comunicato a materiale pronto. Servirà configurarlo su Vercel (Settings → Domains) e nei DNS del registrar: istruzioni al momento.
- **Misura su Android di fascia media:** mai fatta. Se non è possibile, resta come rischio dichiarato.
