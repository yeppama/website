# LANCIO.md — cosa manca davvero prima di vendere

Verifica del 2026-10-29 su due checklist passate dall'utente: una sul sito pubblico
("20 cose che mancano a un sito vibe-coded"), una legale ("come non farsi causa").
La terza, quella di sicurezza, sta in [`SICUREZZA.md`](SICUREZZA.md).

Qui non c'è "fatto / non fatto" a sentimento: ogni riga dice cosa è stato guardato.
Dove la risposta è "lo decide il venditore" è perché lo decide davvero il venditore —
il sito pubblica i testi che riceve, non li scrive ([`PLAN-8.md`](PLAN-8.md) §5).

## 1. Il sito pubblico

| # | Punto | Esito |
|---|---|---|
| 1 | Pagina 404 su misura | **Fatta il 2026-10-29.** `public/404.html`: autonoma, senza bundle e senza JavaScript, con i colori e i caratteri del marchio. Se il sito fosse rotto al punto da non caricare, questa funzionerebbe lo stesso. |
| 2 | Invito all'azione sopra la piega | **A posto.** "Entra" è nella prima schermata; su telefono in orizzontale l'onboarding scorre, correzione già pagata nella Fase 6. |
| 3 | Titolo per pagina | **A posto**, per quel che vale: il sito è una pagina sola. |
| 4 | Descrizione per pagina | **A posto** (`index.html`). Da riscrivere coi contenuti reali: oggi dice "prototipo con contenuti dimostrativi", ed è vero. |
| 5 | Immagine Open Graph | **Manca.** Ci sono `og:type`, `og:title`, `og:description` e `twitter:card`, ma nessuna immagine: condiviso su WhatsApp o Instagram il link esce senza anteprima. Serve un'immagine reale (1200×630): **materiale del cliente**. |
| 6 | Set di favicon | **Parziale.** C'è `favicon.svg`. Mancano `apple-touch-icon` (180×180) e un PNG di riserva, che vogliono il logo: **P1, materiale del cliente**. |
| 7 | `robots.txt` | **Manca, e non va aggiunto adesso.** Oggi il sito è fuori dai motori con `noindex` in due punti (meta e header). Un terzo posto da ricordare al lancio è un modo in più di sbagliare: va messo **nello stesso commit** che toglie il `noindex`. |
| 8 | `sitemap.xml` | **Manca.** Una sola URL, quindi vale poco; stessa regola del punto 7. |
| 9 | Testo alternativo su ogni immagine | **Verificato, a posto.** Nessuna immagine senza `alt`, su onboarding, scena, menu e scheda prodotto. |
| 10 | Punti di rottura su mobile | **Verificato.** Suite a 320, 360, 390, 430 px e in orizzontale: nessuno scorrimento laterale, bersagli ≥ 44 px. |
| 11 | Invito all'azione fisso su mobile | **A posto.** Carrello e menu restano in alto sempre, e il carrello porta il numero dei capi. |
| 12 | Stati di caricamento | **A posto.** Barra dell'onboarding per stadi reali, scheletro delle immagini, "…" sui prezzi finché il fornitore non risponde. |
| 13 | Stati d'errore dei moduli | **Non ci sono moduli.** Gli errori che esistono — carrello, fornitore irraggiungibile, testi legali non caricati — hanno il loro stato e un "Riprova". |
| 14 | Pagina di ringraziamento | **È di Shopify**, che possiede la cassa e il dopo-ordine. |
| 15 | Pagina privacy | **Raggiungibile**, dal menu e dal carrello. Il testo c'è ma è il modello generato da Shopify: va riscritto. |
| 16 | Pagina termini | **Manca il testo** (venditore). Il posto dove comparirà esiste già. |
| 17 | Banner dei cookie | **Non serve, ed è verificato a ogni giro.** Il sito non scrive cookie e non ha analytics né script di terze parti. Vedi `SICUREZZA.md`. |
| 18 | Analytics | **Deciso il 2026-10-29: Vercel Analytics, da installare.** Senza cookie, quindi **il banner di consenso resta non necessario** — che è la ragione della scelta. Da fare in un commit solo: lo script, `script-src` e `connect-src` allargati nella CSP al dominio di Vercel, una riga nell'informativa privacy, e Vercel fra i responsabili del trattamento (il DPA serve comunque, perché ospita il sito). Finché non è installato, la verifica di `e2e-phase8a` sui cookie resta verde e va tenuta: dopo l'installazione dovrà restare verde lo stesso, ed è esattamente il controllo che lo dimostra. |
| 19 | Indirizzo di contatto reale | **Manca, ed è obbligatorio** per vendere online in UE: ragione sociale, sede, partita IVA, contatto. Va nella pagina "Contatti" e nelle "Note legali" su Shopify. **Venditore.** |
| 20 | *(coperto dall'interfaccia nello screenshot)* | Da chiarire con l'utente. |

## 2. Legale

Premessa che vale per quasi tutte le righe: il titolare del trattamento è il
**venditore**, non chi ha scritto il sito. Qui si dice cosa il sito fa e cosa serve
a chi vende; i testi e le procedure li scrive lui col suo consulente.

| # | Punto | Esito |
|---|---|---|
| 01 | Privacy policy | Pubblicata su Shopify ma è il **modello generato automaticamente**, in inglese. Da riscrivere sul trattamento reale. |
| 02 | Termini e condizioni | **Da scrivere.** Elenco dei sette riquadri in [`CONTENUTI.md`](CONTENUTI.md) §5. |
| 03 | GDPR | **Si applica**: si vende a consumatori in Italia. Il sito raccoglie pochissimo (vedi 04 e 11); il grosso del trattamento avviene su Shopify, dove stanno ordini e clienti. |
| 04 | Consenso ai cookie | **Non necessario oggi**, perché non ci sono cookie né tracciamento. In `localStorage` restano l'id del carrello e il modo di controllo scelto da chi naviga: tecnici, esenti. Se un giorno entra un analytics, il consenso diventa obbligatorio. |
| 05 | Base giuridica | **Del venditore.** Per gli ordini di norma è il contratto; per fatture e registri, l'obbligo di legge. |
| 06 | Consenso al marketing | **Non applicabile oggi**: non esiste newsletter né raccolta di indirizzi. Se arriverà, serve un consenso separato e revocabile, non una casella pre-spuntata. |
| 07 | Cancellazione dei dati | **Del venditore**, sui dati in Shopify. Il sito non ha niente da cancellare: non conserva dati di nessuno. |
| 08 | Conservazione dei dati | **Del venditore.** Stessa ragione. |
| 09 | Accordi col responsabile (DPA) | **Da firmare**, con **Shopify** e **Vercel**: sono i due fornitori che trattano dati per conto del venditore. Entrambi li offrono standard. |
| 10 | Informativa sui terzi | **Inventario verificato, ed è corto.** A runtime il sito parla con due soli host: Shopify (catalogo, carrello, pagine legali) e Vercel (che lo serve). Niente font esterni, niente analytics, niente widget: i caratteri sono auto-ospitati e la CSP vieta il resto, quindi non è una promessa ma un vincolo tecnico. |
| 11 | Sicurezza dei dati | **Fatto**, nei limiti di quello che c'è: HTTPS obbligatorio, CSP stretta, header completi, nessun dato personale sul sito. Dettaglio in `SICUREZZA.md`. |
| 12 | Procedura in caso di violazione | **Del venditore.** Una violazione riguarderebbe i dati su Shopify, non il sito. |
| 13 | Proprietà intellettuale | **Due cose concrete.** (a) Il repository è **pubblico e senza licenza**: nessuno può riusarlo legalmente, ma il codice, la struttura del catalogo e il dominio del negozio di sviluppo si leggono. **Deciso il 2026-10-29: resta com'è.** Da sapere, non da correggere: chiunque può leggere il codice e l'indirizzo del negozio di sviluppo, e nome ed email dell'autore stanno nei metadati dei commit. (b) Le immagini di ambiente sono **generate con Higgsfield**: i termini di quel servizio vanno verificati per l'uso commerciale. |
| 14 | Licenze open source | **Verificato pacchetto per pacchetto.** 66 dipendenze di produzione, tutte permissive: 56 MIT, 5 Apache-2.0, 3 ISC, 1 BSD-3-Clause, e `webgl-constants`, che non dichiara la licenza nel manifesto ma distribuisce un file MIT. **Nessuna copyleft.** I caratteri auto-ospitati sono **tre** famiglie, non due (Archivo, JetBrains Mono, UnifrakturCook), tutte sotto **SIL Open Font License 1.1**, che chiede di distribuire il testo della licenza insieme al font. Mancava: **aggiunto il 2026-10-29**, i tre `OFL-*.txt` copiati senza modifiche da `google/fonts` stanno in `public/fonts/` accanto ai `.woff2`, con un `README.md` che spiega la regola a chi aggiungerà un peso. |
| 15 | Pagamenti e abbonamenti | **Di Shopify**, che gestisce prezzi, imposte, spedizione e rimborsi. Il carrello dichiara "IVA inclusa, spedizione calcolata al pagamento" e non mostra mai un prezzo che non venga dal fornitore. Nessun abbonamento: solo acquisti singoli. |

## 3. Deciso il 2026-10-29

- **Il repository resta pubblico e senza licenza.** Scelta dell'utente, consapevole.
- **Analytics: sì, Vercel Analytics**, perché non usa cookie e non impone il banner. Da
  installare insieme alle modifiche che porta con sé (CSP, informativa, DPA): vedi il punto 18.

## 4. Ancora aperto

1. **Installare Vercel Analytics**, col suo contorno. Non è urgente, ma è deciso.
2. **Al lancio, nello stesso commit:** togliere `noindex` (meta + header), aggiungere `robots.txt`
   e `sitemap.xml`, mettere `og:image` e il set di favicon.
3. **Dal venditore:** i sette testi legali, l'indirizzo reale, i DPA con Shopify e Vercel.
