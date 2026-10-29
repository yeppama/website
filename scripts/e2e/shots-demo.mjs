/**
 * Screenshot della demo per il controllo a occhio (non è una suite di verifiche):
 * espositori in 3D dalle pose di debug, menu, scheda prodotto, Lookbook, carrello.
 *   node scripts/e2e/shots-demo.mjs <base> <cartella-output> [parametri extra, es. "&commerce=mock"]
 */
import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase } from './launchOptions.mjs'

const [RAW_BASE, OUT, EXTRA = ''] = process.argv.slice(2)
const BASE = localBase(RAW_BASE)
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: chromiumArgs(),
})
const errors = []
async function open(query, viewport = { width: 1280, height: 720 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(`${BASE}?${query}${EXTRA}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 60000 })
  await page.waitForFunction(() => window.__scene, null, { timeout: 30000 })
  // Le texture dei capi arrivano dopo il primo fotogramma: si aspetta che siano tutte sulla scena.
  await page.waitForFunction(() => {
    let pending = 0
    window.__scene.traverse((o) => { if (o.material?.userData?.photoUrl && !o.material.map?.image?.naturalWidth) pending++ })
    return pending === 0
  }, null, { timeout: 30000 }).catch(() => errors.push(`${query}: texture dei capi non arrivate`))
  await page.waitForTimeout(1500)
  return { ctx, page }
}

for (const pose of ['disp-mannequin-01', 'disp-mannequin-02', 'disp-rack-01', 'disp-plinth-01', 'disp-wall-01', 'front']) {
  const { ctx, page } = await open(`debug=${pose}&tier=high`)
  await page.screenshot({ path: `${OUT}/3d-${pose}.png` })
  await ctx.close()
}

{
  const { ctx, page } = await open('debug=x')
  await page.getByRole('button', { name: /menu/i }).first().click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/menu.png` })
  await page.locator('aside article button').first().click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/scheda.png` })
  await page.keyboard.press('Escape'); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /brand story/i }).first().click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/lookbook.png` })
  await ctx.close()
}
{
  const { ctx, page } = await open('debug=x', { width: 390, height: 844 }, true)
  await page.getByRole('button', { name: /menu/i }).first().click()
  await page.waitForTimeout(2000)
  await page.locator('aside article button').nth(1).click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/scheda-telefono.png` })
  await ctx.close()
}
console.log(errors.length ? `errori:\n${errors.join('\n')}` : 'nessun errore in console')
await browser.close()
