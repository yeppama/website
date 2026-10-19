/**
 * Contenuti (src/content/): ogni contenuto passa le invarianti di storeConfig in ogni
 * allestimento (src/layouts/), ogni capo 3D dichiarato esiste e ogni
 * foto dichiarata esiste davvero in tutte le larghezze, con la sua texture 3D.
 *   npm run test:content
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { contents } = await import('../src/content/index.js')
const { layouts } = await import('../src/layouts/index.js')
const { storeConfig } = await import('../src/config/storeConfig.js')
let failed = 0
const check = (name, cond, detail = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ` — ${detail}`}`); if (!cond) failed++ }

for (const [id, content] of Object.entries(contents)) {
  // Le invarianti si controllano caricando storeConfig col contenuto e l'allestimento scelti,
  // in un processo a parte: storeConfig li legge una volta sola.
  for (const layout of Object.keys(layouts)) {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', `
      const { storeConfig } = await import('./src/config/storeConfig.js')
      const { validateStoreConfig } = await import('./src/config/validateStoreConfig.js')
      const v = validateStoreConfig(storeConfig)
      if (v.length) { console.log(v.join('\\n')); process.exit(1) }
    `], { cwd: root, env: { ...process.env, VITE_CONTENT: id, VITE_LAYOUT: layout }, encoding: 'utf8' })
    check(`${id} · ${layout}: invarianti di storeConfig`, r.status === 0, (r.stdout + r.stderr).trim())
  }

  // Capi in 3D (GLB) dichiarati dal contenuto: il file esiste.
  const glbs = content.products.map((p) => p.model3d?.glb).filter(Boolean)
  const noGlb = glbs.filter((g) => !existsSync(join(root, 'public', g)))
  check(`${id}: ${glbs.length} capi in 3D (GLB)`, !noGlb.length, `mancano ${noGlb.join(', ')}`)

  const srcs = [
    ...content.products.flatMap((p) => p.media.map((m) => m.src)),
    ...content.lookbook.flatMap((l) => l.images.map((i) => i.src)),
  ].filter(Boolean)
  const files = srcs.flatMap((s) => storeConfig.media.widths.map((w) => `${s}-${w}.webp`))
  const missing = files.filter((f) => !existsSync(join(root, 'public', f)))
  check(`${id}: ${srcs.length} foto in ${storeConfig.media.widths.length} larghezze`, !missing.length, `mancano ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`)

  const garments = content.products.flatMap((p) => [p.model3d, ...Object.values(p.model3d?.byColorway ?? {})]).filter((g) => g?.name)
  const noTex = garments.filter((g) => !g.texture || !existsSync(join(root, 'public', g.texture)))
  check(`${id}: ${garments.length} texture dei capi 3D`, !noTex.length, `senza texture: ${noTex.map((g) => g.name).join(', ')} (npm run media:build -- ${id})`)
  const badBox = garments.filter((g) => g.bbox && !(g.bbox[0] < g.bbox[2] && g.bbox[1] < g.bbox[3] && g.bbox.every((v) => v >= 0 && v <= 1)))
  check(`${id}: riquadri dei capi validi`, !badBox.length, badBox.map((g) => g.name).join(', '))
}
console.log(failed ? `\n${failed} controlli falliti` : '\ntutti i controlli superati')
process.exit(failed ? 1 : 0)
