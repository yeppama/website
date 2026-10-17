"""
Elaborazione delle foto per il sito (chiamato da scripts/media/build.mjs, non a mano).

Legge da stdin un JSON { "jobs": [...] } e per ogni foto:
  - la ritaglia al rapporto voluto (al centro) e la salva in WebP in più larghezze,
    mai oltre la larghezza del file di partenza;
  - se serve al 3D, ne fa la texture scontornata (WebP con trasparenza) e restituisce
    il riquadro del capo nella foto.
Scontorno: se accanto alla foto c'è `<nome>-cutout.png` (scontorno fatto altrove) si usa
la sua trasparenza; altrimenti si toglie il fondo uniforme partendo dai bordi, che va
bene per capi scuri su fondo chiaro e NON per capi chiari: per quelli serve il file.
Scrive su stdout un JSON { nome: { aspect, bbox } }. Richiede Pillow e numpy.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def crop_to_ratio(img, rw, rh):
    w, h = img.size
    if w / h > rw / rh:
        nw = round(h * rw / rh)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = round(w * rh / rw)
    y = (h - nh) // 2
    return img.crop((0, y, w, y + nh))


def local_alpha(rgb, threshold):
    a = np.asarray(rgb, dtype=np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.abs(a - bg).max(axis=2)
    # copy(): un'immagine nata da un array numpy condivide la memoria e floodfill non la scrive.
    near = Image.fromarray(np.where(dist < threshold, 255, 0).astype(np.uint8)).copy()
    # Fondo = ciò che è vicino al colore del fondo E collegato ai bordi.
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if near.getpixel((x, y)) == 255:
                ImageDraw.floodfill(near, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if near.getpixel((x, y)) == 255:
                ImageDraw.floodfill(near, (x, y), 128)
    alpha = np.where(np.asarray(near) == 128, 0, 255).astype(np.uint8)
    return Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2))


def main():
    spec = json.load(sys.stdin)
    meta = {}
    for job in spec["jobs"]:
        src = Image.open(job["source"]).convert("RGB")
        rw, rh = job["ratio"]
        img = crop_to_ratio(src, rw, rh)
        for width in job["widths"]:
            wpx = min(width, img.width)
            out = img.resize((wpx, round(wpx * rh / rw)), Image.LANCZOS)
            out.save(f'{job["out"]}-{width}.webp', "WEBP", quality=job["quality"], method=6)
        if not job.get("texture"):
            continue
        if job.get("cutout"):
            cut = Image.open(job["cutout"]).convert("RGBA")
            if cut.size != src.size:
                cut = cut.resize(src.size, Image.LANCZOS)
            alpha = crop_to_ratio(cut, rw, rh).getchannel("A")
        else:
            alpha = local_alpha(img, job["threshold"])
        tw = job["texture"]
        th = round(tw * rh / rw)
        rgb = img.resize((tw, th), Image.LANCZOS)
        a = alpha.resize((tw, th), Image.LANCZOS)
        arr = np.asarray(rgb).copy()
        am = np.asarray(a)
        solid = am > 128
        if not solid.any():
            raise SystemExit(f'{job["name"]}: nessun capo trovato nella foto')
        # Sotto la parte trasparente il colore medio del capo: le mipmap e il filtro
        # lineare non portano un alone del fondo sui bordi.
        arr[~solid] = arr[solid].mean(axis=0).astype(np.uint8)
        Image.fromarray(np.dstack([arr, am])).save(f'{job["out"]}-tex.webp', "WEBP", quality=job["quality"], method=6)
        ys, xs = np.nonzero(solid)
        meta[job["name"]] = {
            "aspect": round(rw / rh, 4),
            "bbox": [round(xs.min() / tw, 4), round(ys.min() / th, 4), round((xs.max() + 1) / tw, 4), round((ys.max() + 1) / th, 4)],
        }
    json.dump(meta, sys.stdout)


main()
