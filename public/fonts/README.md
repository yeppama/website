# Caratteri del sito

Auto-ospitati, non caricati da Google a runtime: il visitatore non fa nessuna richiesta a
terzi per leggere la pagina (decisione L6 in `PLAN.md`, e un punto in meno nell'informativa
privacy). I sottoinsiemi `latin` e `latin-ext` vengono dai file pubblicati su Google Fonts.

| Famiglia | Pesi | Dove si usa | Licenza |
|---|---|---|---|
| Archivo | 400, 700, 900 | titoli e testo dell'interfaccia | [SIL OFL 1.1](OFL-Archivo.txt) |
| JetBrains Mono | 400, 700 | micro-testo tecnico, etichette, numeri | [SIL OFL 1.1](OFL-JetBrainsMono.txt) |
| UnifrakturCook | 700 | titolo gotico del Lookbook | [SIL OFL 1.1](OFL-UnifrakturCook.txt) |

## Perché i file di licenza stanno qui

La SIL Open Font License chiede che il testo della licenza sia distribuito **insieme** al
font, non solo citato: un `.woff2` servito da solo non è conforme. I tre file sono copiati
senza modifiche dal repository di Google Fonts (`google/fonts/ofl/<famiglia>/OFL.txt`), con
la riga di copyright di ciascun autore. Vengono serviti dallo stesso dominio dei font.

Aggiungendo un peso o una famiglia: scaricare anche il suo `OFL.txt` e aggiungere la riga
alla tabella. Un carattere proprietario (per esempio se il cliente ne fornisce uno col suo
marchio) ha regole diverse, e la sua licenza va letta prima di metterlo qui.
