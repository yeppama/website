# Immagini per l'allestimento "cantiere" — prompt per Gemini

Allestimento alternativo del negozio (stanza compatta ~10×8 m, cemento, oggetti da cantiere), accanto a
quello attuale. Le immagini le genera l'utente con Gemini; qui ci sono i prompt, già in inglese.

## Come consegnarle

- Un file per immagine, **col nome indicato** (PNG o JPG, la risoluzione più alta che Gemini dà).
- Mettile in una cartella di Google Drive e mandami il link, oppure allegale in chat.
- Se un'immagine contiene scritte storpiate, loghi di altri marchi o volti riconoscibili, rigenerala: non
  le posso usare.
- Gemini a volte ignora il rapporto richiesto: va bene lo stesso se il soggetto è centrato con margine,
  ritaglio io.

## Stile comune (incollalo in fondo a ogni prompt se Gemini perde coerenza)

> Gritty industrial construction-site aesthetic, raw grey concrete, black steel, a single accent colour
> flame orange #F98E30, white. Muted, desaturated, high contrast, slight film grain. No other brand logos,
> no watermarks, no extra text unless asked.

L'arancione è quello del marchio, `#F98E30` (non `#FF5500` del prompt originale), finché il cliente non
dice altro.

---

## A. Texture (ripetibili, viste dall'alto e frontali, senza prospettiva)

**A1 · `cemento-parete.png` · 1:1**
> Seamless tileable texture of rough dark poured concrete wall, colour around #1A1A1A to #2A2A2A, visible
> formwork panel seams, small air holes, subtle water stains, flat even lighting, orthographic front view,
> no perspective, no shadows, no objects, edges must tile perfectly in all directions.

**A2 · `cemento-pavimento.png` · 1:1**
> Seamless tileable texture of a worn industrial concrete floor, mid grey around #5A5A5A to #7A7A7A,
> polished in places, fine cracks, faint tyre marks and dust, flat even lighting, top-down orthographic
> view, no perspective, no objects, edges must tile perfectly in all directions.

**A3 · `rete-metallica.png` · 1:1, fondo nero**
> Seamless tileable texture of black steel welded wire mesh with square holes, slight rust at the welds,
> on a pure black background, flat front view, no perspective, edges must tile perfectly.

## B. Grafiche da attaccare (verranno messe su piani nella scena)

**B1 · `poster-01.png` … `poster-06.png` · 2:3 · sei prompt, uno per poster**
Usa questo schema cambiando la riga finale per ognuno:
> Wheatpaste street poster, slightly wrinkled paper with torn edges and glue marks, printed in black and
> white with flame orange #F98E30 accents, bold brutalist typography, flat front view filling the whole
> frame, no wall visible. Theme: …

Temi: 01 "a large bold word INTO and a small oval logo shape" · 02 "a black and white photo of a concrete
staircase with an orange stripe" · 03 "abstract halftone grid with an orange circle" · 04 "a grainy photo of
a chain-link fence at night" · 05 "large numbers 01 and coordinates 43°46'N 11°15'E in a technical font" ·
06 "a hazard stripe pattern with the words WORK IN PROGRESS".

**B2 · `adesivi.png` · 1:1, fondo trasparente o bianco piatto**
> A sheet of 9 assorted street stickers, die-cut, slightly worn: orange oval with the word INTO, black
> and white hazard stripes, a small arrow, a barcode, a warning triangle, flat front view, evenly spaced on
> a plain white background.

**B3 · `cartello-cantiere.png` · 3:2**
> Front view of a weathered rectangular metal construction site sign, white enamel with rust spots and
> scratches, bold black text "LAVORI IN CORSO" and below in flame orange #F98E30 "INTO — DROP 01", a thin
> black border, flat lighting, the sign fills the frame, no background.

## C. Campagna per i pannelli luminosi del Lookbook (3 verticali)

Stesso stile delle foto della demo: notte, flash diretto, grana da pellicola, nessun volto riconoscibile.

**C1 · `cantiere-look-01.png` · 2:3**
> Editorial fashion photo at night on an urban construction site in Florence, a model seen from behind
> wearing an oversized black hoodie and wide black cargo pants, standing between stacked cinder blocks and
> an orange traffic cone, scaffolding behind, direct on-camera flash, 35mm film grain, muted dark palette
> with flame orange accents, face not visible, no logos, no readable text.

**C2 · `cantiere-look-02.png` · 2:3**
> Editorial fashion photo at night, a model sitting on a pile of concrete blocks under a single work lamp,
> wearing an off-white canvas work jacket and black track pants with orange side stripes, head turned
> away, hanging steel chains in the foreground out of focus, direct flash, 35mm film grain, face not
> recognisable, no logos, no readable text.

**C3 · `cantiere-look-03.png` · 2:3**
> Detail shot at night on a construction site: hands in an off-white long sleeve t-shirt holding a rusty
> steel chain, a black hoodie with orange drawcords in the background, hard direct flash, deep shadows,
> 35mm film grain, no faces, no logos, no readable text.

## D. Foto per i modelli 3D dei capi (solo se si sceglie di farli con un altro servizio)

I servizi che trasformano una foto in un modello 3D vogliono **un capo solo, intero, fondo uniforme,
più viste dello stesso capo**. Le foto fronte della demo vanno già bene come vista frontale; servono le
altre viste, **uguali nel capo** (stesso colore, stessi dettagli). Gemini fatica a tenere identico un
capo fra più immagini: allegagli la foto fronte della demo come riferimento.

Per ogni capo (`p001` felpa nera, `p004` giacca, `p007` pantalone da tuta, eventualmente gli altri):

**D1 · `<capo>-lato.png` · 3:4**
> Using the attached product photo as the exact reference (same garment, same colour, same details),
> generate a professional e-commerce packshot of the same garment on an invisible ghost mannequin seen
> from the left side, 90 degrees, whole garment visible with margin, plain seamless light grey background,
> soft even studio light, no logos, no text.

**D2 · `<capo>-retro.png` · 3:4**
> Same as before but seen from the back, 180 degrees, same garment exactly as in the reference photo.
