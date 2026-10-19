"""
Immagini dell'allestimento "cantiere": da media-sorgenti/cantiere/ (originali da Gemini, fuori da git)
a public/cantiere/ (WebP pronti per la scena). Rilanciarlo quando arrivano file a risoluzione più alta.

    python3 scripts/cantiere/prepare.py

Texture ripetibili a 1024 px; rete metallica con il nero reso trasparente; adesivi ritagliati uno per
uno dal foglio (coordinate sul foglio da 1024 px; la stella è esclusa perché ricorda un logo noto).
Richiede Pillow e numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'media-sorgenti' / 'cantiere'
OUT = ROOT / 'public' / 'cantiere'
OUT.mkdir(parents=True, exist_ok=True)
Q = 80


def first(*names):
    for n in names:
        if (SRC / n).exists():
            return Image.open(SRC / n)
    raise SystemExit(f'manca uno fra: {", ".join(names)}')


def save(img, name, size=None):
    if size:
        img = img.resize(size, Image.LANCZOS)
    img.save(OUT / f'{name}.webp', 'WEBP', quality=Q, method=6)


save(first('cemento-parete.jpg', 'cemento-parete.png').convert('RGB'), 'cemento-parete', (1024, 1024))
save(first('cemento-pavimento.webp', 'cemento-pavimento.png').convert('RGB'), 'cemento-pavimento', (1024, 1024))

# Rete: i fili sono chiari sul nero, il nero diventa trasparente.
mesh = first('rete-metallica.webp', 'rete-metallica.png').convert('RGB').resize((512, 512), Image.LANCZOS)
a = np.asarray(mesh).astype(float)
alpha = np.clip((a.max(axis=2) - 18) * 6, 0, 255).astype(np.uint8)
Image.fromarray(np.dstack([np.asarray(mesh), alpha])).save(OUT / 'rete-metallica.webp', 'WEBP', quality=Q, method=6)

for name in ['poster-collage-01', 'poster-collage-02', 'cartello-cantiere',
             'cantiere-look-01', 'cantiere-look-02', 'cantiere-look-03']:
    save(first(f'{name}.webp', f'{name}.png', f'{name}.jpg').convert('RGB'), name)

# Adesivi: (nome, riquadro sul foglio da 1024, forma del ritaglio).
sheet = first('adesivi.webp', 'adesivi.png').convert('RGB').resize((1024, 1024), Image.LANCZOS)
STICKERS = [
    ('into', (62, 82, 384, 304), 'oval'),
    ('strisce', (410, 93, 724, 290), 'rect'),
    ('freccia', (762, 96, 952, 284), 'rect'),
    ('codice', (66, 386, 364, 577), 'rect'),
    ('pericolo', (386, 356, 684, 622), 'triangle'),
    ('zero-uno', (66, 643, 340, 962), 'rect'),
    ('lavori', (370, 706, 680, 927), 'rect'),
    ('attenzione', (710, 688, 960, 954), 'rect'),
]
for name, box, shape in STICKERS:
    crop = sheet.crop(box)
    w, h = crop.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    if shape == 'oval':
        d.ellipse((2, 2, w - 3, h - 3), fill=255)
    elif shape == 'triangle':
        d.polygon([(w / 2, 2), (w - 3, h - 3), (2, h - 3)], fill=255)
    else:
        d.rounded_rectangle((2, 2, w - 3, h - 3), radius=10, fill=255)
    crop.putalpha(mask)
    crop.save(OUT / f'adesivo-{name}.webp', 'WEBP', quality=Q, method=6)

print('immagini del cantiere in', OUT.relative_to(ROOT))
