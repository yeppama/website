/**
 * Telefono in orizzontale (e controllo in verticale e desktop): il capo inquadrato
 * dal Focus resta fuori dal pannello, la scheda mostra immagine, nome, prezzo,
 * colori e taglie nella prima schermata, le altre schede non escono dallo schermo,
 * ruotare durante il Focus reinquadra e l'uscita restituisce la camera del player.
 *
 *   node scripts/e2e/e2e-landscape.mjs <base> <cartella-output>
 */
import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'
import { tokens } from '../../src/config/designTokens.js'
import { fovForAspect } from '../../src/lib/framing.js'

const BASE = process.argv[2], OUT = process.argv[3]
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const C = storeConfig.copy
const DISPLAY = storeConfig.displays.find((d) => d.id === 'disp-mannequin-01')
const PRODUCT = storeConfig.products.find((p) => p.id === DISPLAY.productIds[0])
const SHORT = 520   // stessa soglia della variante `short` (src/styles/index.css)

const FORMATS = [
  { name: 'iPhone 16 orizzontale', vp: { width: 852, height: 393 }, mobile: true, rotateTo: { width: 393, height: 852 } },
  { name: 'iPhone 16 Safari con barre', vp: { width: 852, height: 330 }, mobile: true },
  { name: 'iPhone SE orizzontale', vp: { width: 667, height: 375 }, mobile: true },
  { name: 'telefono stretto orizzontale', vp: { width: 568, height: 320 }, mobile: true },
  { name: 'Android orizzontale', vp: { width: 800, height: 360 }, mobile: true },
  { name: 'iPhone 16 verticale', vp: { width: 393, height: 852 }, mobile: true, rotateTo: { width: 852, height: 393 } },
  { name: 'desktop', vp: { width: 1280, height: 720 }, mobile: false },
]

const wait = (page, fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true).catch(() => false)

// Il Focus si assesta con una breve rincorsa: si aspetta che lo spostamento del
// centro di proiezione smetta di cambiare.
async function settled(page) {
  let last = null
  for (let i = 0; i < 80; i++) {
    const v = await page.evaluate(() => { const c = window.__camera; return [c.view?.enabled ? c.view.offsetX : 0, c.view?.enabled ? c.view.offsetY : 0, c.fov] })
    if (last && Math.abs(v[0] - last[0]) < 0.3 && Math.abs(v[1] - last[1]) < 0.3 && Math.abs(v[2] - last[2]) < 0.05) return v
    last = v
    await page.waitForTimeout(250)
  }
  return last
}

// Nove punti del capo (bersaglio ± 0,3 m sugli assi della camera), proiettati in
// pixel; quanti cadono dentro lo schermo e quanti sotto il pannello.
const garmentOnScreen = (page) => page.evaluate((target) => {
  const cam = window.__camera
  cam.updateMatrixWorld()
  const right = cam.position.clone().set(1, 0, 0).applyQuaternion(cam.quaternion)
  const up = cam.position.clone().set(0, 1, 0).applyQuaternion(cam.quaternion)
  const panel = document.querySelector('[data-testid="focus-panel"]').getBoundingClientRect()
  const pts = []
  for (const dx of [-0.3, 0, 0.3]) for (const dy of [-0.3, 0, 0.3]) {
    const p = cam.position.clone().set(...target).addScaledVector(right, dx).addScaledVector(up, dy).project(cam)
    pts.push({ x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight })
  }
  const onScreen = pts.filter((p) => p.x >= 0 && p.x <= innerWidth && p.y >= 0 && p.y <= innerHeight).length
  const underPanel = pts.filter((p) => p.x >= panel.left && p.x <= panel.right && p.y >= panel.top && p.y <= panel.bottom).length
  const c = pts[4]
  return { onScreen, underPanel, center: `${Math.round(c.x)},${Math.round(c.y)}`, panel: `${Math.round(panel.left)},${Math.round(panel.top)} ${Math.round(panel.width)}×${Math.round(panel.height)}` }
}, DISPLAY.focusCamera.target)

// Elementi dentro lo schermo e cliccabili davvero (non coperti da altro).
const reachable = (page, locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return false
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  return el === hit || el.contains(hit)
})
const inFirstScreen = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1
})
const dialogOverflow = (page) => page.evaluate((min) => {
  const root = document.querySelector('[role="dialog"][data-dialog]')
  const sc = root.querySelector('.overflow-y-auto')
  const out = []
  if (sc.scrollWidth > sc.clientWidth) out.push(`scorre in orizzontale di ${sc.scrollWidth - sc.clientWidth}px`)
  const box = root.getBoundingClientRect()
  if (box.right > innerWidth + 1 || box.bottom > innerHeight + 1) out.push(`la finestra esce dallo schermo (${Math.round(box.right)}×${Math.round(box.bottom)})`)
  for (const b of root.querySelectorAll('button')) {
    const r = b.getBoundingClientRect()
    if (!r.width || b.tabIndex === -1) continue
    if (r.height < min - 0.5 || r.width < min - 0.5) out.push(`bottone "${b.textContent.trim().slice(0, 14) || b.getAttribute('aria-label')}" ${Math.round(r.width)}×${Math.round(r.height)}`)
    if (r.right > innerWidth + 1 || r.left < -1) out.push(`bottone "${b.textContent.trim().slice(0, 14)}" fuori schermo`)
  }
  return out
}, tokens.touchTarget.min)

for (const f of FORMATS) {
  const tag = f.name
  const short = f.vp.height <= SHORT && f.vp.width > f.vp.height
  const ctx = await browser.newContext({ viewport: f.vp, isMobile: f.mobile, hasTouch: f.mobile, deviceScaleFactor: f.mobile ? 2 : 1 })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${tag}] ${m.text()}`) })
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}] ${e.message}`))
  const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  await page.goto(BASE + '?debug=x&tier=low&commerce=mock', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__stores && window.__camera, null, { timeout: 30000 })

  // ── Focus ──
  await page.evaluate((id) => window.__stores.player.getState().issue({ type: 'focus', displayId: id }), DISPLAY.id)
  const focused = await wait(page, () => window.__stores.app.getState().focus.state === 'focused', null, 60000)
  await settled(page)
  const g = await garmentOnScreen(page)
  ok(`${tag} · Focus: il capo è inquadrato fuori dal pannello`, focused && g.onScreen === 9 && g.underPanel === 0,
    `centro ${g.center} · ${g.onScreen}/9 nello schermo · ${g.underPanel}/9 sotto il pannello · pannello ${g.panel}`)
  const panel = page.getByTestId('focus-panel')
  ok(`${tag} · Focus: pannello intero, "Scheda completa" ed "Esci" raggiungibili`,
    await inFirstScreen(panel) &&
    await reachable(page, panel.getByRole('button', { name: new RegExp(C.focus.details) })) &&
    await reachable(page, panel.getByRole('button', { name: C.focus.exit, exact: true })))
  await page.screenshot({ path: `${OUT}/${slug}-focus.png` })

  // ── Scheda prodotto sopra il Focus ──
  await panel.getByRole('button', { name: new RegExp(C.focus.details) }).click()
  const dlg = page.locator('[role="dialog"][data-dialog="product"]')
  await dlg.waitFor({ timeout: 15000 })
  await page.waitForTimeout(400)
  const first = {
    immagine: await inFirstScreen(page.getByTestId('product-media').locator('[role="img"]').first()),
    nome: await inFirstScreen(dlg.locator('h2')),
    prezzo: await inFirstScreen(page.getByTestId('product-price')),
    colori: await inFirstScreen(dlg.getByRole('radiogroup', { name: new RegExp(C.product.colorways) })),
    taglie: await inFirstScreen(dlg.getByRole('radiogroup', { name: C.product.sizes })),
  }
  const addVisible = await inFirstScreen(page.getByTestId('add-to-cart'))
  const missing = Object.entries(first).filter(([, v]) => !v).map(([k]) => k)
  const need = short ? Object.keys(first) : ['nome', 'prezzo']
  ok(`${tag} · Scheda: nella prima schermata ${need.join(', ')}`, need.every((k) => first[k]),
    `${missing.length ? `fuori: ${missing.join(', ')}` : 'tutto visibile'} · "Aggiungi" ${addVisible ? 'visibile' : 'sotto la piega'}`)
  const over = await dialogOverflow(page)
  ok(`${tag} · Scheda: niente scorrimento orizzontale, bottoni ≥ ${tokens.touchTarget.min} px dentro lo schermo`, over.length === 0, over.slice(0, 4).join('; '))
  await page.screenshot({ path: `${OUT}/${slug}-scheda.png` })
  // Scelta una taglia disponibile, scorrendo il pulsante d'acquisto si raggiunge
  // (spento, senza taglia, non riceve i tocchi: il controllo non avrebbe senso).
  const size = PRODUCT.sizes.find((x) => x.available)
  await dlg.getByRole('radiogroup', { name: C.product.sizes }).getByRole('radio', { name: size.label, exact: true }).click()
  await page.getByTestId('add-to-cart').scrollIntoViewIfNeeded()
  ok(`${tag} · Scheda: scorrendo, "Aggiungi al carrello" si raggiunge`, await reachable(page, page.getByTestId('add-to-cart')))
  await page.keyboard.press('Escape')
  await wait(page, () => window.__stores.app.getState().dialogs.length === 0, null, 10000)

  // ── Rotazione durante il Focus ──
  if (f.rotateTo) {
    await page.setViewportSize(f.rotateTo)
    await page.waitForTimeout(500)
    await settled(page)
    const r = await garmentOnScreen(page)
    ok(`${tag} · ruotando durante il Focus il capo si reinquadra fuori dal pannello`, r.onScreen === 9 && r.underPanel === 0,
      `${f.rotateTo.width}×${f.rotateTo.height}: centro ${r.center} · ${r.underPanel}/9 sotto il pannello · pannello ${r.panel}`)
    await page.screenshot({ path: `${OUT}/${slug}-ruotato.png` })
  }

  // ── Uscita: la camera torna quella del player, per lo schermo di adesso ──
  await page.evaluate(() => window.__stores.app.getState().exitFocus())
  const idle = await wait(page, () => window.__stores.app.getState().focus.state === 'idle', null, 60000)
  const vp = page.viewportSize()
  const cam = await page.evaluate(() => ({ view: Boolean(window.__camera.view?.enabled), fov: window.__camera.fov }))
  const expected = fovForAspect(storeConfig.navigation.player.fov, vp.width / vp.height)
  ok(`${tag} · uscita: niente spostamento residuo e fov del player per lo schermo attuale`,
    idle && !cam.view && Math.abs(cam.fov - expected) < 0.05, `fov ${cam.fov.toFixed(2)} (atteso ${expected.toFixed(2)}) · view offset ${cam.view ? 'ancora attivo' : 'tolto'}`)

  // ── Lookbook, carrello e pagine legali sullo stesso schermo ──
  if (short || f.rotateTo) {
    await page.setViewportSize(f.vp)
    await page.waitForTimeout(300)
    const issues = []
    for (const [kind, id] of [['lookbook', storeConfig.lookbook[0].id], ['cart', 'cart'], ['legal', 'privacy']]) {
      await page.evaluate(([k, i]) => window.__stores.app.getState().openDialog(k, i), [kind, id])
      await page.locator(`[role="dialog"][data-dialog="${kind}"]`).waitFor({ timeout: 15000 })
      await page.waitForTimeout(kind === 'legal' ? 1200 : 400)
      const o = await dialogOverflow(page)
      if (o.length) issues.push(`${kind}: ${o.slice(0, 2).join('; ')}`)
      if (kind === 'lookbook') {
        const frame = await page.getByTestId('lookbook-frame').evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height, w: r.width } })
        if (frame.h > vp.height - 40) issues.push(`lookbook: cornice alta ${Math.round(frame.h)}px su ${vp.height}`)
        const prev = page.getByRole('button', { name: C.lookbook.previous })
        await prev.scrollIntoViewIfNeeded()
        const both = await page.getByTestId('lookbook-frame').evaluate((el, h) => { const a = el.getBoundingClientRect(); return a.height <= h }, vp.height)
        if (!both) issues.push('lookbook: cornice più alta dello schermo')
        await page.screenshot({ path: `${OUT}/${slug}-lookbook.png` })
      }
      if (kind === 'legal') await page.screenshot({ path: `${OUT}/${slug}-legale.png` })
      await page.evaluate(() => window.__stores.app.getState().closeDialogs())
    }
    ok(`${tag} · Lookbook, carrello e pagine legali: dentro lo schermo, niente scorrimento orizzontale`, issues.length === 0, issues.join(' | '))
  }
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
