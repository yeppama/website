/**
 * Foto del sito: da `media-sorgenti/<contenuto>/` (originali, fuori da git) a
 * `public/media/<contenuto>/` (WebP pubblicati) più `src/content/<contenuto>.media.json`
 * (proporzione e riquadro del capo per le texture 3D).
 *
 *   npm run media:build -- <contenuto> [--fetch <elenco.tsv>]
 *
 * Quali foto, con che rapporto e quali servono al 3D lo dice il contenuto
 * (`media[].src`, `images[].src`, `model3d`), le larghezze `storeConfig.media`.
 * Con --fetch scarica prima gli originali mancanti da un elenco "nome<TAB>url".
 * L'elaborazione la fa scripts/media/process.py (Python 3 con Pillow e numpy).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  // Il fetch di Node ignora il proxy senza questa variabile (CONTEXT §4).
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } })
  process.exit(r.status ?? 1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const fetchAt = args.indexOf('--fetch')
const list = fetchAt >= 0 ? args[fetchAt + 1] : null
const id = args.find((a, i) => !a.startsWith('--') && (fetchAt < 0 || i !== fetchAt + 1))
const { contents } = await import('../../src/content/index.js')
const { storeConfig } = await import('../../src/config/storeConfig.js')
const content = contents[id]
if (!content) {
  console.error(`uso: npm run media:build -- <${Object.keys(contents).join('|')}> [--fetch <elenco.tsv>]`)
  process.exit(1)
}

const { widths, quality, productRatio, texture, cutoutThreshold } = storeConfig.media
const ratios = storeConfig.placeholders.ratios
const nameOf = (src) => src.split('/').pop()
const srcDir = join(root, 'media-sorgenti', id)
const outDir = join(root, 'public', 'media', id)
mkdirSync(srcDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

// Foto da pubblicare: una voce per nome, col rapporto del primo uso.
const photos = new Map()
for (const p of content.products) {
  for (const m of p.media) if (m.src) photos.set(nameOf(m.src), { ratio: m.variant === 'product' ? productRatio : m.ratio })
  for (const g of [p.model3d, ...Object.values(p.model3d?.byColorway ?? {})]) {
    if (g?.name) photos.set(g.name, { ...(photos.get(g.name) ?? { ratio: productRatio }), texture: true })
  }
}
for (const l of content.lookbook) for (const img of l.images) if (img.src) photos.set(nameOf(img.src), { ratio: img.ratio })

if (list) {
  for (const line of readFileSync(list, 'utf8').split('\n').filter(Boolean)) {
    const [name, url] = line.split('\t')
    const file = join(srcDir, `${name}.png`)
    if (existsSync(file)) continue
    const res = await fetch(url)
    if (!res.ok) { console.error(`${name}: ${res.status} da ${url}`); process.exit(1) }
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    console.log(`scaricata ${name}`)
  }
}

const jobs = []
const missing = []
for (const [name, { ratio, texture: tex }] of photos) {
  const source = ['png', 'jpg', 'jpeg', 'webp'].map((e) => join(srcDir, `${name}.${e}`)).find(existsSync)
  if (!source) { missing.push(name); continue }
  const cutout = join(srcDir, `${name}-cutout.png`)
  jobs.push({
    name, source, out: join(outDir, name), ratio: ratios[ratio], widths, quality,
    ...(tex ? { texture: texture.width, threshold: cutoutThreshold, cutout: existsSync(cutout) ? cutout : null } : {}),
  })
}
if (missing.length) {
  console.error(`originali mancanti in media-sorgenti/${id}/: ${missing.join(', ')}`)
  process.exit(1)
}

const r = spawnSync('python3', [join(root, 'scripts', 'media', 'process.py')], { input: JSON.stringify({ jobs }), encoding: 'utf8', maxBuffer: 1 << 24 })
if (r.status !== 0) { console.error(r.stderr || r.error?.message); process.exit(1) }
const meta = JSON.parse(r.stdout)
writeFileSync(join(root, 'src', 'content', `${id}.media.json`), `${JSON.stringify(meta, null, 2)}\n`)
console.log(`${jobs.length} foto in public/media/${id}/, ${Object.keys(meta).length} texture 3D (src/content/${id}.media.json)`)
