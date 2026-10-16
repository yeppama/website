# PLAN §4

> Parte di `PLAN.md` (indice). Numerazione delle sezioni invariata.

## 4. Design system

### 4.1 Token (`src/config/designTokens.js`)

```js
export const tokens = {
  // Palette derivata dalla reference fornita (screenshot griglia Instagram, vedi §4.4).
  // Sistema a DUE fondi: nero editoriale (negozio) e osso/studio (prodotto in Focus Mode).
  color: {
    bg:      { base: '#060606', raised: '#0c0c0d', overlay: 'rgba(6,6,6,0.86)',
               studio: '#dcdcd8' },                       // fondo seamless dei product shot
    surface: { 1: '#101011', 2: '#17171a', 3: '#202024' },
    border:  { subtle: '#232326', strong: '#3a3a40', hard: '#f2f0ea' },
    text:    { primary: '#f2f0ea',   // bianco osso, non bianco puro
               secondary: '#9b9b96', muted: '#5c5c58', inverse: '#060606' },
    accent:  { flame: '#f98e30',     // PANTONE 15-1157 TPG Flame Orange — accento UNICO (v1.1)
               bone:  '#f2f0ea' },   // il "terzo colore" è l'assenza di colore
    state:   { danger: '#c21025', ok: '#9b9b96' },        // unico rosso ammesso: stato d'errore
  },
  type: {
    // Due famiglie, non più: una condensata bold per i titoli, una mono per i dati.
    // Tre registri, come nella reference: gotico per i titoli d'impatto, grottesca
    // stretta per le etichette, mono per i micro-dati tecnici.
    family: { gothic:  '"UnifrakturCook", "Pirata One", serif',   // usare con parsimonia
              display: '"Archivo Expanded", "Arial Black", system-ui, sans-serif',
              mono:    '"JetBrains Mono", ui-monospace, monospace' },
    scale: { xs: '0.6875rem', sm: '0.8125rem', base: '0.9375rem',
             lg: '1.25rem', xl: '2rem', '2xl': '3.25rem', '3xl': '5rem' },
    tracking: { tight: '-0.02em', normal: '0', wide: '0.08em', brutal: '0.18em' },
    weight: { regular: 400, bold: 700, black: 900 },
  },
  space: { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  radius: { none: '0', sm: '2px' },          // spigoli vivi, nessuna eccezione
  border: { hairline: '1px', thick: '2px' },
  shadow: { none: 'none', hard: '4px 4px 0 #000' },
  motion: { fast: 140, base: 240, slow: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  z: { canvas: 0, hotspot: 10, hud: 20, quickTravel: 25, modal: 40, onboarding: 50, fallback: 60 },
  breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1440 },
  touchTarget: { min: 44 },                  // px, requisito di accessibilità mobile
};
```

Direzione estetica: vedi §4.4. In sintesi — fondo quasi nero, bianco osso come testo, **arancione
brace come unico accento vivo**, rosso tecnico in dosi minime, zero border-radius, bordi hairline,
grana su tutto. Il 3D fornisce il calore (i faretti ember); la UI resta monocroma e tecnica.

### 4.2 `<PlaceholderImage />` — contratto API

```jsx
<PlaceholderImage
  ratio="4:5"                 // '1:1' | '16:9' | '4:5' — obbligatorio
  label="Front"               // etichetta SEMPRE visibile (segnaposto intenzionale)
  category="Hoodie"           // mostrata se variants[variant].showCategory
  variant="product"           // 'product' | 'editorial'
  state="placeholder"         // 'placeholder' | 'loading' | 'error'  ← stati distinti
  seed="prod-001"             // determina il pattern procedurale (stabile tra i render)
  className=""
/>
```

Comportamento richiesto:
- `ratio` applicato con `aspect-ratio` CSS: **nessun layout shift**, il box è dimensionato prima del contenuto.
- `state="loading"` → skeleton con shimmer, durata minima `skeleton.minVisibleMs` per evitare il flash,
  e **timeout**: oltre 8 s passa a `state="error"`. Nessuno skeleton infinito, mai.
- `state="placeholder"` → pattern procedurale (griglia o diagonali, da `variant`) + etichetta +
  categoria **stabilmente visibili**. È il caso di default in tutte le fasi 1-7.
- `state="error"` → bordo `state.danger`, etichetta, nessun shimmer.
- Il segnaposto intenzionale è visivamente distinto dal caricamento: il primo ha pattern e testo
  nitidi, il secondo è un blocco animato senza testo.

### 4.3 Placeholder 3D

| Elemento | Primitiva | Trattamento |
|---|---|---|
| Manichino | capsule + box base, o `.glb` low-poly (< 2k tri) | `mat-mannequin`, roughness media, un faretto dedicato |
| Plinto espositivo | box smussato | `mat-steel-brushed`, metalness alta per catturare il faretto |
| Rack | cilindri + box | `mat-steel-brushed` |
| Pannello a muro | plane | materiale emissivo tenue + `<Html>` con `<PlaceholderImage />` |
| Pavimento | plane | texture a griglia generata su `<canvas>` (nessun file, nessuna richiesta di rete) |

Le texture a griglia sono generate proceduralmente in `lib/materials.js` e messe in cache per ID
materiale: un solo `CanvasTexture` condiviso, non una per mesh.

### 4.4 Direzione artistica (derivata dalla reference)

**Fonte:** screenshot della griglia Instagram di `@into_industries` fornito il 2026-10-15.
**Limite dichiarato:** instagram.com non è raggiungibile da questo container (`ENOTFOUND`): la lettura
è basata esclusivamente sullo screenshot, non sul profilo. Se la griglia non è rappresentativa del
brand, questa sezione va rivista.

**Cosa ho letto nella reference**

| Elemento | Osservazione | Traduzione nel progetto |
|---|---|---|
| Due mondi visivi | Product shot su fondo grigio-osso seamless, luce morbida e frontale **vs** poster editoriali nero profondo, grana pesante, contrasto estremo | **Mappa direttamente sulla nostra architettura:** il negozio è il mondo nero; il Focus Mode su un prodotto alza una pozza di luce chiara che cita il fondo studio. La transizione di Focus (Fase 4) diventa un passaggio editoriale→studio, non solo un movimento di camera |
| Accento | Arancione brace: cordino sui pantaloni, auto in fiamme, iride. Usato in dosi piccolissime su grandi campiture nere | `accent.ember` `#ff5a1f`. Nella scena 3D è la temperatura dei faretti d'atmosfera, non una vernice sugli oggetti |
| Accento secondario | Rosso tecnico `#c21025` su fondo chiaro (poster "STAR USURPER", "DESTINY Paths") | `accent.crimson`, riservato a stati e micro-dati. Mai insieme all'ember nello stesso blocco |
| Bianco | Osso, mai puro | `#f2f0ea` per tutto il testo primario |
| Grana | Su tutte le immagini editoriali, pesante, è la firma | `performance.postFx.grain` — vedi **D6** |
| Tipografia | Tre registri: gotico/blackletter per l'impatto, grottesca stretta per le etichette, mono micro per i dati tecnici (crocini di registro, codici, numeri di serie) | `type.family` a tre voci. Il gotico va dosato: uno per schermata, mai nella UI funzionale |
| Densità | Micro-testo tecnico ovunque, crocini, mirini, codici | Vale come **texture**, non come informazione. Nel 3D diventa decalcomania sui pannelli; nella UI diventa l'etichetta mono di `<PlaceholderImage />` |

**Regole operative che ne derivano**

1. **Il nero è il protagonista, non il fondo.** Niente grigi medi: si passa da `#060606` a `#dcdcd8`, poco in mezzo.
2. **Un solo accento acceso per inquadratura.** Ember *oppure* crimson, mai entrambi.
3. **La luce calda sostituisce la vernice calda.** Gli oggetti restano desaturati; il colore lo mette il faretto. Questo tiene i materiali economici e coerenti.
4. **Tutto ha grana.** Il 3D pulito è fuori brand. La grana è anche l'alleato tecnico che maschera shadow map a bassa risoluzione e banding — vedi D3.
5. **Il gotico non entra mai in un bottone.** Solo titoli di schermata, loader e lookbook.

**Correzione alla v0.2 di questo documento.** Avevo trattato `into_industries` come una reference
esterna da non usare. È invece **il brand del progetto**: nome e logo sono stati forniti il
2026-10-15. Quella nota cautelativa è annullata. Assumo che tu abbia il mandato per usare marchio
e logo; se non fosse così, dimmelo e li sostituisco con segnaposto.

### 4.5 Il logo e cosa ne ricavo

**Letto dal file fornito** (150×150 px, PNG — vedi nota sul formato più sotto):

| Elemento | Osservazione | Uso nel progetto |
|---|---|---|
| **Ovale di contenimento** | Il marchio `INTO` è racchiuso in un'ellisse nera dal tratto spesso, stile targhetta industriale/automotive | **Questo è il regalo più grande del logo.** L'ellisse diventa il motivo geometrico ricorrente: la forma dell'**ombra a terra** (che D3-A ci impone comunque di disegnare), la sagoma degli **hotspot** di prossimità, il bordo dei bottoni primari. Il brand si ripete nella meccanica, non solo nei cartelli |
| **Fondo chiaro** | Il logo vive su bianco/osso, non su nero | Conferma il sistema a due fondi di §4.4: il mondo "studio" non è un vezzo, è identità. Serve una variante invertita per il negozio scuro (`logo.onDark`) |
| **Accento caldo dentro il marchio** | Elemento arancione/rosso all'interno dell'ovale | Conferma `accent.ember` come primario |
| **Micro-testo denso attorno** | `WE'RE JUST LOOKING FOR … SOMEWHERE`, `FLORENCE©ITALY`, coordinate `43°46'N 11°15'E`, `CURATED AND PRODUCED BY TOMMASO INTURRISI`, `®` | Conferma la regola "densità tecnica come texture". Questi dati non sono decorazione: diventano **contenuto reale** del Lookbook / Brand Story (Fase 5) e vivono in `meta.brand`, non scritti a mano nei componenti |
| **`( industries*)`** | Descrittore in minuscolo sotto il marchio, separato | Gerarchia: `INTO` è il marchio, `industries` è il descrittore. Nell'insegna 3D e nei titoli vanno trattati con pesi diversi, mai come una parola sola |

**Problema pratico, da risolvere prima della Fase 2:** il file ricevuto è un **PNG 150×150 px su
fondo bianco**. È sufficiente per leggere la direzione, **non** per usarlo: a quella risoluzione
un'insegna 3D o un titolo a schermo intero risultano sgranati, e il fondo bianco opaco non si
scontorna su scena scura. **Mi serve l'originale vettoriale (`.svg`, `.ai` o `.pdf`)**, o in
subordine un PNG a fondo trasparente ≥ 2000 px. Fino ad allora uso un segnaposto tipografico e lo
dichiaro: `assets.registry['asset-logo-primary'].fallback`.

---

