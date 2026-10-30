import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase, outDir } from './launchOptions.mjs'
const BASE = localBase(process.argv[2]), OUT = outDir(process.argv[3])
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: chromiumArgs(),
})
const problems = [], stats = []
const SHOTS = ['Ingresso', 'Nuovi Arrivi', 'Archivio', 'Brand Wall', 'Uscita']

async function run(name, url, { viewport, mobile }) {
  const ctx = await browser.newContext({ viewport, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1 })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`[${name}] pageerror ${e.message}`))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  const cta = page.getByRole('button', { name: /^entra$/i })
  await cta.waitFor({ timeout: 30000 })
  await cta.click()
  await page.waitForTimeout(800)
  return { ctx, page }
}

// 1+2 — Le cinque inquadrature fisse della Fase 2, ora pose di verifica (?debug=<id>).
const SHOT_IDS = ['shot-entrance', 'shot-new', 'shot-archive', 'shot-lookbook', 'shot-portal']
for (const [tag, extra] of [['low', ''], ['high', '&tier=high']]) {
  for (const [i, id] of SHOT_IDS.entries()) {
    const { ctx, page } = await run(`shot-${tag}`, `?debug=${id}${extra}`, { viewport: { width: 1440, height: 900 } })
    await page.waitForTimeout(2600)
    if (tag === 'high') {
      const info = await page.evaluate(() => ({ calls: window.__gl.info.render.calls, tris: window.__gl.info.render.triangles, tex: window.__gl.info.memory.textures, geo: window.__gl.info.memory.geometries }))
      stats.push({ shot: SHOTS[i], ...info })
    }
    await page.screenshot({ path: `${OUT}/${tag}-${i + 1}-${SHOTS[i].replace(/\s+/g, '-').toLowerCase()}.png` })
    await ctx.close()
  }
}

// 3 — Tier low: draw call senza ombre (il budget più stretto).
{
  const { ctx, page } = await run('low-stats', '?debug=x&tier=low', { viewport: { width: 1440, height: 900 } })
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => ({ calls: window.__gl.info.render.calls, tris: window.__gl.info.render.triangles }))
  stats.push({ shot: 'Ingresso (tier low)', ...info })
  await ctx.close()
}

// 4 — Pianta con collider e grafo di navigazione.
{
  const { ctx, page } = await run('top', '?debug=top&colliders=1', { viewport: { width: 1200, height: 900 } })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/debug-colliders-top.png` })
  await ctx.close()
}

// 5 — Mobile: cambio inquadratura dal menu.
{
  const { ctx, page } = await run('mobile', '', { viewport: { width: 390, height: 844 }, mobile: true })
  await page.screenshot({ path: `${OUT}/mobile-1-ingresso.png` })
  await page.getByRole('button', { name: /^menu$/i }).tap()
  await page.screenshot({ path: `${OUT}/mobile-2-menu.png` })
  await page.getByRole('dialog').getByRole('button', { name: /lookbook/i }).tap()
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${OUT}/mobile-3-lookbook.png` })
  await ctx.close()
}

await browser.close()
console.log('STATISTICHE (tier high salvo indicazione):')
for (const s of stats) console.log(`  ${s.shot.padEnd(22)} draw call ${String(s.calls).padStart(4)} | triangoli ${String(s.tris).padStart(7)}${s.tex !== undefined ? ` | texture ${s.tex} | geometrie ${s.geo}` : ''}`)
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'PROBLEMI: nessuno')
