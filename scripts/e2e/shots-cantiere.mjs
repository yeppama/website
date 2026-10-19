import { chromium } from 'playwright-core'
const [BASE, OUT, ...poses] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const errors = []
for (const pose of poses) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()) })
  await page.goto(`${BASE}?allestimento=cantiere&debug=${pose}&tier=high`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 90000 })
  await page.waitForFunction(() => window.__warmedUp, null, { timeout: 90000 }).catch(() => errors.push('no warmup'))
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${pose}.png` })
  const info = await page.evaluate(() => { const i = window.__gl.info; return { calls: i.render.calls, tri: i.render.triangles, tex: i.memory.textures } })
  console.log(pose, JSON.stringify(info))
  await ctx.close()
}
console.log(errors.length ? `errori:\n${[...new Set(errors)].join('\n')}` : 'nessun errore')
await browser.close()
