# Allestimento "cantiere" — piano

Proposto dall'utente il 2026-10-18 (prompt "construction site concept store"), analizzato insieme.
Si parte solo con `Approvato, procedi` e le scelte aperte qui sotto.

## Deciso

- **Affiancare**, non sostituire: il cantiere è un secondo allestimento, scelto come il contenuto
  (stessa navigazione, Focus, schede, carrello). Nulla di quanto fatto finora si perde.
- **Immagini**: le genera l'utente con Gemini dai prompt di `PROMPT-IMMAGINI.md`.
- **Capi in 3D (GLB)**: l'utente vuole vederli girare in questo ambiente.

## Dal prompt: cosa si prende

| Elemento | Verdetto |
|---|---|
| Stanza compatta ~10×8×4 m | sì |
| Cemento, tubi, catene, binari, linea arancione a terra, cono, cartello, blocchi di cemento | sì, forme da codice e istanze |
| 3 pannelli luminosi del Lookbook | sì, con le foto della campagna |
| Poster e adesivi | sì, immagini da Gemini su piani |
| Logo neon su rete | sì, con alone finto; Bloom vero da decidere |
| Capi GLB | sì, vedi prova sotto |
| OrbitControls con distanza limitata | no: si resta in prima persona, il limite lo danno muri e collisioni |
| AO precalcolata | no (serve Blender): ombre finte a terra |
| Numeri di luci del prompt | no: si tarano sulla scena vera |

## Prova di un capo in 3D (2026-10-18)

Felpa nera (`p001`) da **una sola foto** (la foto fronte della demo), Higgsfield SAM 3D, 1 credito.

| | originale | ridotto |
|---|---|---|
| peso | 1,6 MB | **120 KB** |
| triangoli | 25 740 | **3 860** |
| texture | PNG ~1 MB | WebP 1024 px |

Riduzione: `npx @gltf-transform/cli@4 simplify --ratio 0.15 --error 0.01`, poi `resize --width 1024
--height 1024`, poi `webp`. A occhio la versione ridotta è quasi identica (fronte, fianco, retro); resta un
puntino arancione sul retro, da una cucitura della texture. Il modello arriva senza normali: si calcolano
al caricamento. File in `media-sorgenti/cantiere/` (fuori da git).

Conti: 7 capi ≈ 0,85 MB e ≈ 27 000 triangoli, dentro il budget del tier basso (140 000; oggi la scena ne
disegna ~6 700). Da misurare sui telefoni.

Limite: con 1 credito a capo ne servono altri ~6; restano 0,8 crediti (piano gratuito). Alternative: un
piano Higgsfield a pagamento, oppure un altro servizio da foto a 3D (Meshy, Tripo, Hunyuan3D) usando le
foto fronte della demo, più le viste laterali e del retro di `PROMPT-IMMAGINI.md` §D. Il GLB che arriva
passa dalla stessa riduzione.

## Scelte dell'utente (2026-10-18)

1. Arancione del marchio `#F98E30`.
2. Bloom vero solo sui computer con scheda video dedicata; alone finto per tutti gli altri.
3. Modelli 3D con Higgsfield (piano basic, 70 crediti): fatti tutti e 7 i capi (SAM 3D, 1 credito l'uno;
   il cargo al secondo tentativo), ridotti con `scripts/cantiere/reduce-glb.sh` a 80–136 KB l'uno.
4. Primo passo: immagine di prova.
5. Pannelli del Lookbook orizzontali 16:9 (le foto di campagna sono arrivate orizzontali).

## Immagine di prova (2026-10-19)

Pagina separata `prova-cantiere.html` (src/prototype/cantiere/), nella stessa build del sito ma col suo
bundle: la pagina principale non scarica nulla in più (precarica solo React, come prima). Stanza 10×8×4,
texture di Gemini, neon con alone finto, rete metallica, 2 pareti di poster, adesivi, cartello, 3 pannelli
luminosi, tavolo di blocchi (istanze) con pile di capi piegati, rack di tubi con 5 capi GLB, 2 pantaloni GLB
appesi a catene (anelli in istanza), cono, tubi e binari a soffitto, 6 faretti. Camera che gira attorno
(OrbitControls) con 7 viste preimpostate: è una pagina per guardare, non il negozio.

Misurato in SwiftShader (non vale come misura di velocità): 44–91 draw call e 60–85 mila triangoli
secondo la vista, ombre comprese. Screenshot: `prova-cantiere.jpg`.

Imparato: un capo GLB sdraiato su un tavolo sembra gonfio (il modello nasce dal capo indossato): sul
tavolo pile di capi piegati. Le normali calcolate sul modello ridotto davano un capo a faccette (vertici
divisi sulle cuciture della texture): `toCreasedNormals` a 60° lo rende liscio.

## Fasi

1. Stanza 10×8 m e navigazione (muri, collisioni, punti di passaggio, minimappa, benchmark, Focus), come
   allestimento selezionabile; test adattati alle nuove coordinate.
2. Materiali e oggetti di scena.
3. Neon, poster, pannelli del Lookbook, capi GLB.
4. Luci, prestazioni, prova sui telefoni.
