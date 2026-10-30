# PER-L-UTENTE.md — cosa posso fare solo con te

Guida operativa, in ordine di quanto sblocca. Ogni voce dice **cosa fare**, **quanto
costa** e **cosa si sblocca**. Scritta il 2026-10-30.

Le prime quattro riguardano me: servono a farmi lavorare senza fermarmi a chiederti.
Le altre riguardano il sito e non le può fare nessun altro che tu (o il cliente).

---

## Parte 1 — Per rendermi autonomo

### 1.1 Installare GitHub CLI · 5 minuti · **il più utile di tutti**

In PowerShell:

```powershell
winget install GitHub.cli
```

Chiudi e riapri il terminale, poi:

```powershell
gh auth login
```

Scegli: `GitHub.com` → `HTTPS` → `Login with a web browser`. Copia il codice che
stampa, premi Invio, incollalo nel browser.

Verifica: `gh auth status` deve dire che sei autenticato.

**Cosa si sblocca:** oggi per controllare la CI apro un browser e aspetto a blocchi di
dieci secondi, e i log dei singoli passi non li leggo proprio — GitHub chiede il login
e io non ce l'ho. Con `gh` leggo l'esito, i log di un passo fallito e lo stato dei
controlli direttamente. Quando un giro di CI va rosso, la differenza è fra "ti dico che
è rosso" e "ti dico quale riga ha fallito e perché".

### 1.2 Preapprovare i comandi ripetitivi · 2 minuti

Apri `C:\Users\stefa\Desktop\outbound\.claude\settings.local.json`.

Ho provato a scrivertelo io e **il sistema me l'ha impedito, giustamente**: un agente
che si allarga i permessi da solo è esattamente la cosa da non permettere. Quindi
incolli tu.

**Sostituisci tutto il contenuto del file** con quello qui sotto, invece di aggiungere
righe in mezzo: una virgola di troppo o di meno rende il file illeggibile, e un
settings.json malformato non dà errore — viene semplicemente ignorato in blocco, e te
ne accorgi solo perché i permessi non funzionano.

Le cinque voci che c'erano prima non sono riportate **di proposito**: erano comandi
esatti di una sessione su `order-planner.html`, un altro lavoro. Un permesso scritto
come comando esatto vale per quell'unica riga e non si ripresenterà mai più.

```json
"Bash(npm run *)", "Bash(npm ci)", "Bash(npm install *)",
"Bash(npm audit *)", "Bash(npm outdated)", "Bash(npm ls *)", "Bash(npm view *)",
"Bash(npx vite preview *)", "Bash(node scripts/*)",
"Bash(git status *)", "Bash(git log *)", "Bash(git diff *)", "Bash(git show *)",
"Bash(git add *)", "Bash(git commit *)", "Bash(git branch *)", "Bash(git fetch *)",
"Bash(git merge-base *)", "Bash(git ls-files *)", "Bash(git rev-list *)",
"Bash(git rev-parse *)", "Bash(git worktree *)", "Bash(git push origin sviluppo)",
"Bash(netstat *)"
```

E, **accanto** ad `"allow"` (non dentro), una rete di sicurezza:

```json
"deny": [
  "Bash(git push --force *)", "Bash(git push -f *)", "Bash(git push origin main*)",
  "Bash(git reset --hard *)", "Bash(rm -rf *)"
]
```

Poi riavvia la sessione: i permessi si leggono all'avvio.

**Nota su cosa NON c'è dentro:** `git push` è preapprovato **solo verso `sviluppo`**.
La produzione resta una decisione tua ogni volta, ed è giusto così: `main` pubblica in
automatico, quindi unire significa pubblicare.

**Cosa si sblocca:** oggi ogni build, ogni suite, ogni commit si ferma a chiederti il
permesso. Sono decine di interruzioni per sessione.

### 1.3 La password del negozio di sviluppo · 1 minuto

**Quale dei due negozi:** quello di **sviluppo**, `into-industries-dev.myshopify.com` —
non quello del cliente. È il negozio che `e2e-phase8b` interroga, perché è l'host scritto
in `storeConfig.commerce.shopify.domain`.

E **non è la password del tuo account Shopify**: è quella della vetrina, il muro che
Shopify mette davanti a un negozio non ancora pubblico. Si trova in: **Canali di vendita
→ Negozio online → Preferenze → Protezione con password**.

Poi, prima di lanciare le suite:

```powershell
$env:STORE_PASSWORD = "la-password"
```

**Cosa si sblocca:** l'unica verifica rossa di `e2e-phase8b`, cioè la cassa. Oggi la
suite dichiara "protetta da password, non verificata" invece di fingere che vada bene —
ma resta non verificata.

### 1.4 Un token Vercel · 5 minuti

Su `vercel.com` → avatar → **Account Settings → Tokens → Create Token**. Tre campi:

- **Nome:** è solo un'etichetta, serve a te per riconoscerlo quando lo revocherai.
  Mettici dentro chi lo usa e quando è nato, per esempio `claude-code-2026-10`.
  Evita nomi generici come `token1`: fra sei mesi non saprai cosa revochi.
- **Ambito (Scope):** il team o l'account che possiede questo progetto. Se il sito sta
  in un team suo, scegli quello e non l'account personale: il token non potrà toccare
  nient'altro.
- **Scadenza:** mettine una. 30 giorni è ragionevole; si rinnova in un minuto.

⚠️ **Un token Vercel non è di sola lettura, e non esiste un'opzione per renderlo tale.**
Dentro il suo ambito può pubblicare, cambiare le variabili d'ambiente e cancellare
progetti. A me serve per leggere lo stato dei deploy e gli header del dominio vero, ma
il token che mi dai può fare molto di più: per questo vale l'ambito ristretto e la
scadenza breve. Se preferisci non darlo, l'alternativa è che continui a guardare tu
l'anteprima e a dirmi cosa vedi — è solo più lento, non è un blocco.

**Cosa si sblocca:** oggi non vedo né le anteprime né la produzione — `*.vercel.app`
non è raggiungibile da qui — e ogni volta ti chiedo di guardare tu. Col token leggo lo
stato dei deploy dopo un push, verifico gli header sul dominio vero (non solo in
locale) e ti do già pronto l'indirizzo dell'anteprima da mandare al cliente.

---

## Parte 2 — Il sito: cose che richiedono i tuoi account

### 2.1 Shopify: controllare gli scope del canale Headless · 5 minuti · **da fare prima della 8c**

Amministrazione Shopify → **Impostazioni → App e canali di vendita → Headless** →
guarda i permessi della Storefront API.

Quello che cerchi: **non devono esserci** permessi che iniziano con
`unauthenticated_read_customers` o `unauthenticated_write_customers`. Il sito non ha
bisogno dei dati dei clienti, e un token pubblico che li può leggere è un token
pubblico che li espone — il token sta nel codice del sito, lo legge chiunque apra gli
strumenti del browser.

Servono solo: prodotti, collezioni, carrello, checkout, pagine legali.

### 2.2 Shopify: i sette testi legali · dipende dal cliente · **blocca la 8d**

**Impostazioni → Informative.** Oggi c'è **una pagina su sette**, ed è il modello che
Shopify genera da solo, in inglese.

L'elenco completo con il nome tecnico di ogni campo è in
[`CONTENUTI.md`](CONTENUTI.md) §5. Da inoltrare al cliente così com'è.

**Non li scrivo io, e non è pigrizia:** sono obblighi del venditore e li definisce col
suo consulente. Il sito pubblica i testi che riceve.

Quando ne pubblica uno, lo vedi subito:

```powershell
npm run check:catalog -- --domain into-industries-ayehghmw.myshopify.com --token 75261516e790b43df1e21a01c0000dae
```

### 2.3 Shopify: token nuovo del negozio del cliente · 2 minuti · **blocca la 8c**

Quando il negozio del cliente sarà quello definitivo, serve il token pubblico della sua
Storefront API.

⚠️ **Dammelo insieme al dominio, e lo cambio in un commit solo.** La CSP in
`vercel.json` elenca l'host esatto del negozio: se cambia il token ma non l'host, il
carrello smette di funzionare **in silenzio** — il sito carica, i capi si vedono, e
"Aggiungi al carrello" non fa niente.

### 2.4 Vercel e Shopify: i DPA · 15 minuti

Sono i contratti che ti servono per trattare dati personali tramite loro. Entrambi li
offrono standard:

- Shopify: **Impostazioni → Legale** (o nel centro assistenza, "Data Processing Addendum")
- Vercel: **Account Settings → Legal → DPA**

Non è codice e non cambia niente nel sito, ma è il punto 09 della checklist legale e
serve prima di vendere.

### 2.5 Higgsfield: i termini per l'uso commerciale · 10 minuti

Le immagini delle pareti del negozio e del cantiere (`public/negozio/`,
`public/cantiere/`) sono generate con Higgsfield, col tuo account. Vale la pena
leggere cosa dicono i loro termini sull'uso commerciale e sulla proprietà di quello che
generano: finiscono su un sito che vende.

Se i termini non bastano, si rifanno con un servizio che dà diritti chiari, oppure con
foto vere del negozio quando ci sarà.

---

## Parte 3 — Le misure: servono dispositivi veri

Questo è l'unico blocco che **nessuno** può togliere al posto tuo: qui non ci sono
telefoni. Il protocollo completo è in [`PERF.md`](PERF.md), sezione "Fase 3 del
cantiere".

### 3.1 Come si misura, in breve

Apri l'anteprima sul dispositivo e aggiungi `?bench=1` all'indirizzo. Parte un giro
automatico; alla fine compare un pannello coi numeri. Me li mandi (o mi mandi lo
screenshot) e li confronto con le soglie.

Per il cantiere, stesso indirizzo con `?allestimento=cantiere&bench=1`.

### 3.2 Cosa manca, in ordine di importanza

| Dispositivo | Dove | Perché |
|---|---|---|
| **Android di fascia media** | negozio e cantiere | **Mai fatta.** È il tier `low`, quello che decide se il sito è usabile sui telefoni più diffusi. Soglia: p50 ≥ 40 |
| **iPhone** | negozio e cantiere | Mai fatto col contenuto con le foto |
| **Honor** | negozio A | Era in regressione (25,2), ho corretto ombre e caricamento della grafica: va rimisurato |
| **PC con scheda dedicata** | cantiere, anche con `&bloom=0` | È l'unico dispositivo dove il Bloom vero si accende. Mai visto su hardware reale |

### 3.3 Il giudizio a occhio

I numeri non dicono se è bello. Servono due impressioni, su un telefono vero:

- **i neri**: sono neri o grigi slavati? Il negozio è quasi tutto nero, è la cosa che si
  nota per prima
- **la luminosità**: si vede abbastanza senza che sembri una vetrina da centro
  commerciale?

### 3.4 Le due checklist mobile mai fatte

- **Fase 4**: telefono **in orizzontale**, tocca un espositore lontano, verifica che
  l'avvicinamento e il Focus funzionino, e guarda la resa del nero
- **Fase 5**: scheda prodotto e Lookbook su un telefono vero, **in verticale e in
  orizzontale**

Serve anche un tuo giudizio sulla sensibilità del trascinamento
(`navigation.player.lookSensitivity.mobileDrag`): troppo lenta, giusta, troppo nervosa?

---

## Parte 4 — Il materiale del cliente

Elenco completo e formati in [`CONTENUTI.md`](CONTENUTI.md). Qui solo cosa sblocca cosa.

| Cosa | Sblocca |
|---|---|
| **Logo vettoriale** (P1) | L'insegna 3D vera, il set di favicon, l'immagine di anteprima quando si condivide il link. Il caricatore c'è già: è un cambio di config, non di codice |
| **Catalogo compilato** (il modello Excel `modello-catalogo-INTO.xlsx`) + foto dei capi | **La Fase 8c**, cioè il negozio vero invece dei segnaposto |
| **Testi e immagini del Lookbook / Brand Story** | Il contenuto reale al posto dei segnaposto dichiarati |
| **Conferma della tagline** (P3) "We're just looking for somewhere" | Oggi è visibile come titolo: va confermata prima di pubblicare |
| **Indirizzo e dati del venditore** | **Obbligatorio per vendere in UE.** Ragione sociale, sede, partita IVA, contatto |
| **La scelta fra i due allestimenti** (A negozio / B cantiere) | Smette di servire mantenerli entrambi, e il lavoro si concentra su uno |
| **Prezzi definitivi e dominio** | Il lancio |

---

## Se devi fare una cosa sola oggi

**La 1.1** (installare `gh`). Cinque minuti, e cambia ogni giro di CI da qui in avanti.

Se ne fai due, la seconda è la **2.1** (gli scope su Shopify): è l'unica voce di
sicurezza di tutto l'elenco che non può controllare nessun altro, e si fa in cinque
minuti guardando una schermata.
