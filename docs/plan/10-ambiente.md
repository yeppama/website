# PLAN §10

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 10. Capacità e limiti dell'ambiente di lavoro (verificati)

Tutte le righe seguenti sono state **misurate** in questa sessione il 2026-10-15, non stimate.

### 10.1 Cosa funziona

| Capacità | Esito verificato | Conseguenza per il piano |
|---|---|---|
| CPU / RAM / disco | 4 core, 16 GB RAM, 31 GB liberi | Ampiamente sufficienti. Non è un collo di bottiglia |
| Node / npm | v22.22.0 / 10.9.4 | OK |
| Registry npm | `HTTP 200`; `three@0.186.1`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `vite@8.3.4`, `react@19.3.1`, `tailwindcss@4.3.3`, `zustand@5.0.15` tutti risolvibili | Installazione dipendenze: nessun ostacolo |
| Chromium headless | Presente in `/opt/pw-browsers` (1194) | Posso aprire le pagine, catturare screenshot, leggere errori di console |
| **WebGL2** | **Attivo**: `ANGLE (Google, Vulkan 1.3.0 SwiftShader)`, `MAX_TEXTURE_SIZE 8192`, `OES_texture_float_linear` ✓, `EXT_texture_filter_anisotropic` ✓ | **Posso renderizzare e verificare visivamente la scena 3D** in tutte le fasi 2-6. In software, quindi lento, ma corretto |
| Google Fonts | `css2` API `HTTP 200`, `fonts.gstatic.com` raggiungibile | Posso scaricare i font e **auto-ospitarli** |
| GitHub | `api.github.com HTTP 200`, push verificato | Commit e push funzionano |

### 10.2 Limiti, gravità e prevenzione

| # | Limite | Gravità | Prevenzione |
|---|---|---|---|
| **L1** | ~~Vercel e Netlify irraggiungibili dal container~~ → **RISOLTA il 2026-10-15** con l'integrazione Git | ~~Bloccante~~ → **chiusa per la produzione** | Integrazione Vercel ↔ GitHub attiva e **verificata** (§10.4). Il container resta fuori dal percorso di deploy: il 403 del proxy è irrilevante. Resta da confermare che i branch di lavoro producano una **Preview** (vedi §10.4, punto 3) |
| **L2** | **Nessuna GPU.** Rendering software (SwiftShader) | **Bloccante per le misure di prestazioni** | Non eliminabile. Io consegno l'HUD prestazioni, il percorso di benchmark scriptato (`?bench=1`) e il modulo `docs/PERF.md`; **le misure le esegui tu** sui dispositivi di §5.1. Nessun fps di questo ambiente verrà mai riportato come reale |
| **L3** | **Nessun dispositivo touch reale.** Safari iOS non è emulabile (motore e gesti di sistema diversi) | **Alta su F3 e F6** | Io testo con eventi touch emulati in Chromium (copre la logica: tap vs drag, soglie, pathfinding). Il comportamento reale di Pointer Events, gesti di sistema e bounce di Safari li verifichi tu su device — **e per farlo ti serve L1 risolta** |
| **L4** | **Giudizio estetico.** Lo screenshot software è corretto nei contenuti, ma non è il tuo monitor | **Media su F2 e F4** | Gli screenshot li uso come controllo di correttezza ("c'è tutto, è nel posto giusto, nessun errore"), mai come verdetto estetico. Quello resta tuo, ed è il motivo per cui la Fase 2 ha bisogno di un tuo giro di revisione |
| **L5** | **CDN bloccati** (`cdn.jsdelivr.net`, `unpkg.com`) | Nulla | Nessun `<script src>` esterno nel progetto: tutto passa da npm e finisce nel bundle. È anche la scelta corretta a prescindere |
| **L6** | **Google Fonts a runtime** = l'utente finale scarica da Google (latenza + implicazioni privacy/GDPR) | Bassa, ma reale | **Auto-ospitare**: scarico i `.woff2` in `public/fonts/` e li servo dal nostro dominio. Più veloce e senza terze parti. Lo faccio in Fase 1 |
| **L7** | **Font blackletter della reference**: quasi certamente proprietario o custom | Media su F1 | Uso un open font vicino (`UnifrakturCook`, `Pirata One`) e **dichiaro che non è identico**. Se hai la licenza del font reale, mandamelo e lo sostituisco: è un campo in `type.family` |
| **L8** | **Librerie di modelli 3D bloccate** (`sketchfab.com`, `poly.pizza`). **Blender non installato** | Bassa fino a F4 | Il piano usa già primitive e `assets.registry.fallback`, quindi F2-F3 non ne risentono. Per F4: genero i `.glb` proceduralmente da codice (esportatore glTF in Node), oppure me li fornisci tu |
| **L9** | **Instagram irraggiungibile** | Bassa | §4.4 è derivata dal tuo screenshot. Se serve più materiale, mandami altri screenshot |
| **L10** | **Container effimero**: a fine sessione tutto ciò che non è committato è perso, e `node_modules` va reinstallato a ogni sessione | Media, attrito ricorrente su 8 fasi | Committo e pusho alla fine di **ogni** fase (già nella procedura). Aggiungo in F1 un hook `SessionStart` che esegue `npm ci` all'avvio di ogni nuova sessione, così non perdo tempo a ogni ripresa |
| **L11** | **Rendering software lento**: un frame complesso può richiedere secondi | Bassa | Gli screenshot di verifica si fanno con attese esplicite sul frame, non con timeout a caso. Allunga le mie verifiche, non il tuo prodotto |
| **L12** | **Gli URL pubblicati sono irraggiungibili dal container**: `*.vercel.app` e `*.github.io` danno lo stesso 403 del proxy | Media, permanente | Posso confermare **che** un deploy è riuscito leggendo i Deployment di GitHub (stato, URL, commit), ma **non posso vedere cosa renderizza la pagina pubblicata**. La verifica visiva dell'URL live è tua. La mia verifica visiva resta sul dev server locale, che controllo per intero |

### 10.4 Stato dell'hosting — verificato il 2026-10-15

Letto dai Deployment di GitHub (unica fonte accessibile dal container, vedi L12).

1. **Vercel è collegato e funziona.**
   `vercel[bot]` · deployment `7098935169` · environment `Production` · stato **`success`**
   URL: `https://website-86fz9ag8q-yeppama.vercel.app`
   Commit servito: `08dedcb` (*Initial commit*, branch `main`).

2. **Quel deploy non contiene nulla di utile, ed è normale.** `main` contiene il solo `README.md`:
   nessun `package.json`, nessun `index.html`. Alla Fase 0 non esiste ancora un'applicazione.
   Non c'è niente da riparare. Dalla Fase 1, Vercel rileva da sé il preset Vite dal `package.json`
   (`npm run build` → `dist/`): nessuna configurazione manuale prevista.

3. **Le Preview sui branch di lavoro funzionano — verificato.**
   I primi push del branch (16:27, 16:34, 16:41 UTC) precedevano il collegamento di Vercel
   (16:56 UTC) e Vercel non recupera i push passati: l'assenza iniziale di Preview non era un
   problema di configurazione. Il push `ad66912` (17:02 UTC) ha prodotto in pochi secondi il
   deployment `7099073171` · environment `Preview` · stato **`success`**
   · URL `https://website-6ba3qxais-yeppama.vercel.app`.
   **Conseguenza operativa: da ogni fase in poi, ogni push sul branch di lavoro ti dà un URL
   pubblico da aprire sul telefono**, senza passare da `main`. Il requisito della Fase 3 (provare
   la navigazione mobile su un dispositivo vero) è coperto con tre fasi di anticipo.

   Nota per le verifiche future: Vercel registra il Deployment con `ref` = **SHA del commit**, non
   il nome del branch. Filtrare i Deployment per `?ref=<branch>` restituisce sempre una lista vuota
   e **non** significa che le preview manchino: va letta la lista completa.

4. **GitHub Pages: disattivato secondo quanto dichiarato — non verificabile da qui.**
   Era attivo (deployment `7098059202`, `success`, `https://yeppama.github.io/website/` su `main`).
   D7 è stata chiusa su "A — solo Vercel" e tu l'hai dichiarato sistemato.
   **Non posso confermarlo:** gli endpoint `/pages` e `/environments` dell'API GitHub sono negati
   dal proxy di questa sessione (`403 — Access to this GitHub API path is not permitted`), e il
   Deployment storico resta comunque in elenco anche dopo la disattivazione, quindi non è una prova.
   **Test reale, in Fase 1b:** dopo il primo push con l'applicazione, se `yeppama.github.io/website/`
   serve ancora qualcosa, Pages è rimasto acceso. Lo verifichi tu dal browser (L12).

### 10.3 Cosa mi serve da te, e quando

| Quando | Cosa | Perché |
|---|---|---|
| ~~Ora~~ | ~~Decisioni D1-D7~~ | **Tutte chiuse** (§7) |
| ~~Ora o in F1~~ | ~~Nome del brand~~ | **Fatto: INTO Industries** |

| ~~Entro F2~~ | ~~Collegamento Vercel ↔ GitHub~~ | **Fatto e verificato** (§10.4) |
| **Entro F2** | **Logo vettoriale** (P1) | Il PNG 150×150 su fondo bianco non è usabile per un'insegna 3D |
| **Entro F2** | Risposta a P4: il logo va messo in 3D o solo nella UI? | Cambia dove costruisco muri e faretti |
| **In F1b** | Conferma visiva su `yeppama.github.io/website/` (D7, §10.4) | Io non raggiungo gli URL pubblicati |
| **Da F2 in poi** | Il tuo giudizio estetico su screenshot | Io non posso darmelo da solo (L4) |
| **Da F3 in poi** | Prove sul tuo telefono | L3 non è aggirabile |
| **In F6** | Misure fps sui dispositivi di §5.1 | L2 non è aggirabile |
| **Opzionale, F1/F4** | Font proprietario, `.glb` tuoi | Sostituzioni dirette, nessun refactor |
