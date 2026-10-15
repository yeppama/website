import { chromium } from 'playwright-core'

const BASE = process.argv[2]
const OUT = process.argv[3]
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const browser = await chromium.launch({
  executablePath: EXEC,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

const problems = []
const results = []

async function session(name, { viewport, isMobile, init }, steps) {
  const ctx = await browser.newContext({
    viewport, isMobile, hasTouch: isMobile,
    deviceScaleFactor: isMobile ? 2 : 1,
  })
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${name}] console.error: ${m.text()}`) })
  page.on('pageerror', (e) => problems.push(`[${name}] pageerror: ${e.message}`))
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await steps(page, name)
  await ctx.close()
}

async function shoot(page, file) {
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${file}.png` })
  results.push(file)
}

// 1 — Desktop: onboarding, poi ingresso, poi menu
await session('desktop', { viewport: { width: 1440, height: 900 } }, async (page) => {
  await page.waitForSelector('text=INTO', { timeout: 15000 })
  const heading = await page.textContent('h2')
  if (!/desktop/i.test(heading)) problems.push(`[desktop] istruzioni sbagliate: "${heading}"`)
  await shoot(page, '01-desktop-onboarding')

  const cta = page.getByRole('button', { name: /entra|caricamento/i })
  await cta.waitFor({ state: 'visible' })
  for (let i = 0; i < 40 && await cta.isDisabled(); i++) await page.waitForTimeout(250)
  if (await cta.isDisabled()) problems.push('[desktop] il bottone Entra non si è mai abilitato')
  // Proprietà vera: una riga è "in arrivo" SE E SOLO SE la sua funzione è spenta.
  const lines = await page.locator('li[data-active]').evaluateAll((els) => els.map((e) => ({ text: e.textContent, active: e.dataset.active === 'true' })))
  const cfg = (await import(new URL('../../src/config/storeConfig.js', import.meta.url))).storeConfig
  for (const line of cfg.copy.onboarding.desktop.lines) {
    const shown = lines.find((l) => l.text.includes(line.text))
    const shouldBeActive = !line.requires || cfg.features[line.requires].enabled
    if (!shown || shown.active !== shouldBeActive) problems.push(`[desktop] riga "${line.text}": attiva=${shown?.active}, attesa=${shouldBeActive}`)
  }
  await cta.click()
  await page.waitForTimeout(600)
  await page.keyboard.press('KeyW')
  if ((await page.getByRole('status').first().textContent()).includes('arriva nella Fase 3')) problems.push('[desktop] la navigazione è attiva ma compare ancora l\'avviso "Fase 3"')
  await shoot(page, '02-desktop-hud')

  await page.getByRole('button', { name: /^menu$/i }).click()
  await page.waitForSelector('#menu-drawer')
  await shoot(page, '03-desktop-menu')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  if (await page.locator('#menu-drawer').count()) problems.push('[desktop] Esc non chiude il menu')
})

// 2 — Mobile: le istruzioni devono essere DIVERSE
await session('mobile', { viewport: { width: 390, height: 844 }, isMobile: true }, async (page) => {
  await page.waitForSelector('text=INTO', { timeout: 15000 })
  const heading = await page.textContent('h2')
  if (!/mobile/i.test(heading)) problems.push(`[mobile] istruzioni sbagliate: "${heading}"`)
  await shoot(page, '04-mobile-onboarding')

  const cta = page.getByRole('button', { name: /entra|caricamento/i })
  for (let i = 0; i < 40 && await cta.isDisabled(); i++) await page.waitForTimeout(250)
  await cta.click()
  await page.waitForTimeout(600)
  await page.touchscreen.tap(200, 520)
  await page.waitForTimeout(300)
  if ((await page.getByRole('status').first().textContent()).includes('arriva nella Fase 3')) problems.push('[mobile] la navigazione è attiva ma compare ancora l\'avviso "Fase 3"')
  await shoot(page, '05-mobile-hud')
})

// 3 — Fallback: WebGL2 negato
await session('fallback', {
  viewport: { width: 1280, height: 800 },
  init: () => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === 'webgl2') return null
      return orig.call(this, type, ...rest)
    }
  },
}, async (page) => {
  await page.waitForSelector('text=WebGL', { timeout: 10000 }).catch(() =>
    problems.push('[fallback] la schermata di fallback non è comparsa'))
  await shoot(page, '06-fallback-no-webgl')
})

for (const fps of [30, 60]) {
  await session('fps' + fps, { viewport: { width: 320, height: 200 } }, async (page) => {
    await page.goto(BASE + '?debug=front&fps=' + fps, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__gl, null, { timeout: 15000 })
    await page.waitForTimeout(1000)
    const a = await page.evaluate(() => window.__gl.info.render.frame)
    await page.waitForTimeout(3000)
    const b = await page.evaluate(() => window.__gl.info.render.frame)
    const rate = (b - a) / 3
    results.push('fps' + fps + '=' + rate.toFixed(1))
    if (rate > fps * 1.1) problems.push('[fps] limite ' + fps + ' superato: ' + rate.toFixed(1) + ' render/s')
  })
}

await browser.close()
console.log('SCREENSHOT:', results.join(', '))
console.log(problems.length ? 'PROBLEMI:\n' + problems.join('\n') : 'PROBLEMI: nessuno')
process.exit(problems.length ? 1 : 0)
