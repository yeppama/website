import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase } from './launchOptions.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'
import { formatPrice } from '../../src/lib/format.js'

const BASE = localBase(process.argv[2]), OUT = process.argv[3]
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: chromiumArgs(),
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const C = storeConfig.copy
const product = (id) => storeConfig.products.find((p) => p.id === id)
const lookbook = storeConfig.lookbook[0]

async function open(name, { mobile, viewport } = {}) {
  const ctx = await browser.newContext({
    viewport: viewport ?? (mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 }),
    isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1,
  })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] ${e.message}`))
  await page.goto(BASE + '?debug=x&tier=low', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__player && window.__camera && window.__scene, null, { timeout: 15000 })
  await page.waitForTimeout(400)
  return { ctx, page }
}
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const player = (page) => page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z, yaw: window.__player.yaw }))
const place = (page, x, z, yaw = 0) => page.evaluate(([x, z, yaw]) => { const p = window.__player; p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = 0; p.vel.x = p.vel.z = 0; p.route = null; p.faceYaw = null; window.__stores.player.setState({ route: null }) }, [x, z, yaw])
const sync = (page) => waitUntil(page, () => {
  const c = window.__camera.position, p = window.__player.pos
  return Math.abs(c.x - p.x) < 0.01 && Math.abs(c.z - p.z) < 0.01 && Math.abs(window.__camera.rotation.y - window.__player.yaw) < 0.01
}, null, 20000)
const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz))
const project = (page, [x, y, z]) => page.evaluate(([x, y, z]) => {
  const v = window.__camera.position.clone().set(x, y, z).project(window.__camera)
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { sx: r.left + (v.x + 1) / 2 * r.width, sy: r.top + (1 - v.y) / 2 * r.height }
}, [x, y, z])
const dialogs = (page) => page.evaluate(() => window.__stores.app.getState().dialogs)
const dialog = (page) => page.locator('[role="dialog"][data-dialog]')
const focusInDialog = (page) => page.evaluate(() => document.querySelector('[role="dialog"][data-dialog]')?.contains(document.activeElement) ?? false)
const enterFocus = (page, displayId) => page.evaluate((id) => {
  const p = window.__player
  window.__stores.app.getState().enterFocus(id, { x: p.pos.x, z: p.pos.z, eye: 1.65, yaw: p.yaw, pitch: p.pitch, fov: window.__camera.fov })
}, displayId)

// ============================ DESKTOP ============================
{
  const { ctx, page } = await open('desktop')
  const p1 = product('prod-001')

  // Focus → "Scheda completa" → scheda sopra il Focus.
  await place(page, -6.5, 9, yawTo(-6.5, 9, -7.7, 6.6)); await sync(page)
  await enterFocus(page, 'disp-mannequin-01')
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 15000)
  const opener = page.getByRole('button', { name: new RegExp(C.focus.details) })
  await opener.click()
  const sheet = dialog(page)
  ok('desktop: "Scheda completa" dal Focus apre la scheda del prodotto inquadrato',
    await sheet.isVisible() && await sheet.getByRole('heading', { level: 2, name: p1.name }).isVisible())
  const price = (await page.getByTestId('product-price').textContent()).trim()
  ok('desktop: prezzo formattato con la locale del brand', price === formatPrice(p1.price, storeConfig.meta.brand.locale), `"${price}"`)
  ok('desktop: il titolo della scheda riceve il focus', await page.evaluate(() => document.activeElement?.tagName === 'H2'))

  // Trappola del focus: 30 Tab e 30 Shift+Tab non escono mai dalla finestra.
  let escaped = 0
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); if (!(await focusInDialog(page))) escaped++ }
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Shift+Tab'); if (!(await focusInDialog(page))) escaped++ }
  ok('desktop: Tab e Shift+Tab restano dentro la scheda', escaped === 0, `${escaped} uscite su 60 pressioni`)

  // Taglie: frecce saltano le esaurite, la taglia esaurita non si seleziona.
  const sizes = sheet.getByRole('radiogroup', { name: C.product.sizes })
  const soldOut = p1.sizes.find((s) => !s.available)
  await sizes.getByRole('radio', { name: new RegExp(`^${soldOut.label},`) }).click({ force: true })
  ok('desktop: una taglia esaurita non si seleziona', (await sizes.locator('[aria-checked="true"]').count()) === 0)
  const avail = p1.sizes.filter((s) => s.available)
  await sizes.getByRole('radio', { name: avail[0].label, exact: true }).click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  const checked = await sizes.locator('[aria-checked="true"]').textContent()
  const sel = await page.getByTestId('product-selection').textContent()
  ok('desktop: le frecce scorrono le taglie disponibili e aggiornano la selezione',
    checked === avail[2 % avail.length].label && sel.includes(avail[2 % avail.length].label), `scelta ${checked}, riga "${sel}"`)
  await sheet.getByRole('radio', { name: p1.colorways[1].label }).click()
  ok('desktop: il colore cambia la selezione e l\'immagine', (await page.getByTestId('product-selection').textContent()).includes(p1.colorways[1].label) &&
    await sheet.getByRole('img', { name: new RegExp(p1.colorways[1].label) }).first().isVisible())
  const buy = sheet.getByRole('button', { name: C.product.purchaseClosed })
  ok('desktop: il bottone d\'acquisto c\'è ma è spento e lo dichiara', await buy.isDisabled())
  await page.screenshot({ path: `${OUT}/desktop-product-sheet.png` })

  // ESC chiude solo la scheda: il Focus resta e il focus torna sul bottone.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const fState = await page.evaluate(() => window.__stores.app.getState().focus.state)
  ok('desktop: ESC chiude la scheda e lascia il Focus Mode attivo', !(await sheet.isVisible()) && fState === 'focused', `focus ${fState}`)
  ok('desktop: chiusa la scheda il focus torna su "Scheda completa"', await opener.evaluate((el) => el === document.activeElement))
  await page.keyboard.press('Escape')
  ok('desktop: un secondo ESC esce dal Focus', await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000))

  // Movimento sospeso: W premuto prima dell'apertura e mai rilasciato.
  await page.waitForTimeout(300)
  await place(page, 0, 4, 0); await sync(page)
  await page.keyboard.down('KeyW')
  await waitUntil(page, () => window.__player.pos.z < 3.6, null, 15000)
  await page.evaluate(() => window.__stores.app.getState().openDialog('lookbook', 'lb-001'))
  await page.waitForTimeout(150)
  const a = await player(page)
  await page.waitForTimeout(900)
  const b = await player(page)
  ok('desktop: a scheda aperta il player si ferma anche con W ancora premuto', Math.hypot(b.x - a.x, b.z - a.z) < 0.01, `spostamento ${Math.hypot(b.x - a.x, b.z - a.z).toFixed(3)} m`)
  await page.keyboard.press('Escape')
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0, null, 5000)
  const c0 = await player(page)
  await page.waitForTimeout(900)
  const c1 = await player(page)
  ok('desktop: chiusa la scheda il player NON riparte da solo', Math.hypot(c1.x - c0.x, c1.z - c0.z) < 0.01, `spostamento ${Math.hypot(c1.x - c0.x, c1.z - c0.z).toFixed(3)} m`)
  await page.keyboard.up('KeyW')
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW')
  const c2 = await player(page)
  ok('desktop: con un nuovo tasto il player cammina di nuovo', Math.hypot(c2.x - c1.x, c2.z - c1.z) > 0.2)

  // Menu → capo: la scheda si apre sopra il menu e ci torna.
  await page.getByRole('button', { name: new RegExp(`^${C.hud.menu}$`, 'i') }).click()
  const card = page.locator('#menu-drawer').getByRole('button', { name: new RegExp(product('prod-005').name) })
  await card.click()
  ok('desktop: dal menu un capo apre la sua scheda', await dialog(page).getByRole('heading', { level: 2, name: product('prod-005').name }).isVisible())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  ok('desktop: ESC chiude la scheda e il menu resta aperto, col focus sul capo',
    !(await dialog(page).isVisible()) && await page.locator('#menu-drawer').isVisible() && await card.evaluate((el) => el === document.activeElement))
  let menuEscaped = 0
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => document.getElementById('menu-drawer')?.contains(document.activeElement)))) menuEscaped++ }
  ok('desktop: anche il menu trattiene il focus', menuEscaped === 0, `${menuEscaped} uscite su 20`)

  // Menu → Brand Story → capo del look → Indietro → di nuovo il capo → "DROP 01" torna al lookbook.
  await page.locator('#menu-drawer').getByRole('button', { name: new RegExp(C.lookbook.open) }).click()
  const lb = dialog(page)
  ok('desktop: dal menu si apre la Brand Story', await lb.getByRole('heading', { level: 2, name: lookbook.title }).isVisible())
  ok('desktop: la Brand Story mostra i dati del marchio da meta.brand',
    await lb.getByText(storeConfig.meta.brand.tagline).isVisible() && await lb.getByText(storeConfig.meta.brand.origin.coords).isVisible() && await lb.getByText(storeConfig.meta.brand.credit).isVisible())
  const counter = () => page.getByTestId('lookbook-counter').textContent()
  const c1t = await counter()
  await lb.getByRole('button', { name: C.lookbook.next }).click()
  const c2t = await counter()
  await page.keyboard.press('ArrowRight')
  const c3t = await counter()
  await page.keyboard.press('ArrowRight')
  const c4t = await counter()
  ok('desktop: la galleria si scorre con i bottoni e con le frecce, e ricomincia in fondo',
    c1t.includes('01 /') && c2t.includes('02 /') && c3t.includes('03 /') && c4t.includes('01 /'), `${c1t} → ${c2t} → ${c3t} → ${c4t}`)
  await page.screenshot({ path: `${OUT}/desktop-lookbook.png` })
  const lookProduct = product(lookbook.productIds[1])
  await lb.getByRole('button', { name: new RegExp(lookProduct.name) }).click()
  ok('desktop: un capo del look apre la sua scheda, con "Indietro"',
    await dialog(page).getByRole('heading', { level: 2, name: lookProduct.name }).isVisible() && await dialog(page).getByRole('button', { name: new RegExp(C.dialog.back) }).isVisible())
  await dialog(page).getByRole('button', { name: new RegExp(C.dialog.back) }).click()
  ok('desktop: "Indietro" torna alla Brand Story', await dialog(page).getByRole('heading', { level: 2, name: lookbook.title }).isVisible())
  await lb.getByRole('button', { name: new RegExp(lookProduct.name) }).click()
  await dialog(page).getByRole('button', { name: new RegExp(`${lookbook.title} →`) }).click()
  const stack = await dialogs(page)
  ok('desktop: dalla scheda, il link al lookbook già aperto torna lì senza accumulare livelli', stack.length === 1 && stack[0].kind === 'lookbook', JSON.stringify(stack))
  await dialog(page).getByRole('button', { name: new RegExp(`^${C.dialog.close}$`) }).click()
  await page.keyboard.press('Escape')
  ok('desktop: "Chiudi" svuota la pila, ESC chiude poi il menu', (await dialogs(page)).length === 0 && !(await page.locator('#menu-drawer').isVisible()))

  // Click col mirino sul pannello della parete del brand → Lookbook, cursore liberato.
  // Fuori dal raggio d'attivazione dell'hotspot: a decidere è il pannello, non il POI.
  // A ~7 m dal pannello (dal config: la parete di fondo si è spostata nella fase C).
  const [, py, pz] = storeConfig.environment.brandWall.panel.center
  const standZ = pz + 7
  await place(page, 0, standZ, 0); await sync(page); await page.waitForTimeout(300)
  await page.mouse.click(640, 360)
  await waitUntil(page, () => document.pointerLockElement?.tagName === 'CANVAS', null, 5000)
  await page.evaluate(([eye, py, pz, sz]) => { window.__player.pitch = -Math.atan2(eye - py, sz - pz) }, [storeConfig.navigation.player.eyeHeight, py, pz, standZ])
  await sync(page); await page.waitForTimeout(300)
  const poiActive = await page.evaluate(() => window.__stores.player.getState().activePoiId)
  await page.mouse.click(640, 360)
  const viaPanel = await waitUntil(page, () => window.__stores.app.getState().dialogs[0]?.kind === 'lookbook', null, 10000)
  ok('desktop: click col mirino sul pannello Brand Story apre il Lookbook', viaPanel && !poiActive, `POI attivo: ${poiActive}`)
  ok('desktop: aprendo il Lookbook il cursore viene liberato', await page.evaluate(() => !document.pointerLockElement))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  ok('desktop: chiuso il Lookbook il Pointer Lock NON si riattiva da solo', await page.evaluate(() => !document.pointerLockElement) && (await dialogs(page)).length === 0)
  await ctx.close()
}

// ============================ MOBILE ============================
{
  const { ctx, page } = await open('mobile', { mobile: true })
  // Tap sul pannello Brand Story da lontano: cammina e lo apre all'arrivo.
  await place(page, 0, -4, 0); await sync(page); await page.waitForTimeout(300)
  const [cx, cy, cz] = storeConfig.environment.brandWall.panel.center
  const t = await project(page, [cx, cy, cz])
  await page.touchscreen.tap(t.sx, t.sy)
  await page.waitForTimeout(300)
  const walking = await page.evaluate(() => !!window.__stores.player.getState().route)
  const opened = await waitUntil(page, () => window.__stores.app.getState().dialogs[0]?.kind === 'lookbook', null, 40000)
  ok('mobile: tap sul pannello Brand Story lontano → cammina e apre il Lookbook all\'arrivo', walking && opened, `percorso ${walking}`)
  const box = await dialog(page).boundingBox()
  const vp = page.viewportSize()
  ok('mobile: la scheda occupa tutto lo schermo', Math.abs(box.width - vp.width) < 1 && Math.abs(box.height - vp.height) < 1, `${box.width}×${box.height}`)
  const scroll = await page.evaluate(() => { const el = document.querySelector('[role="dialog"][data-dialog] .overflow-y-auto'); return { sh: el.scrollHeight, ch: el.clientHeight } })
  ok('mobile: il contenuto lungo scorre dentro la scheda', scroll.sh > scroll.ch, `${scroll.sh} > ${scroll.ch}`)
  await page.screenshot({ path: `${OUT}/mobile-lookbook.png` })
  await dialog(page).getByRole('button', { name: new RegExp(`^${C.dialog.close}$`) }).tap()
  ok('mobile: "Chiudi" chiude il Lookbook', (await dialogs(page)).length === 0)

  // Focus → scheda: niente scorrimento orizzontale alle larghezze dei telefoni.
  await enterFocus(page, 'disp-plinth-01')
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 15000)
  await page.getByRole('button', { name: new RegExp(C.focus.details) }).tap()
  const overflow = []
  for (const w of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: w, height: 800 })
    await page.waitForTimeout(150)
    const o = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"][data-dialog] .overflow-y-auto')
      return el.scrollWidth - el.clientWidth
    })
    if (o > 0) overflow.push(`${w}px: ${o}px`)
  }
  ok('mobile: la scheda prodotto non scorre in orizzontale a 320/360/390/430 px', overflow.length === 0, overflow.join(', '))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/mobile-product-sheet.png` })
  // Telefono in orizzontale: "Chiudi" resta raggiungibile senza scorrere.
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(200)
  const close = dialog(page).getByRole('button', { name: new RegExp(`^${C.dialog.close}$`) })
  const cb = await close.boundingBox()
  ok('mobile in orizzontale: "Chiudi" è dentro lo schermo', cb && cb.y >= 0 && cb.y + cb.height <= 390, cb ? `y ${cb.y.toFixed(0)}` : 'non trovato')
  await page.screenshot({ path: `${OUT}/mobile-landscape-product-sheet.png` })
  await close.tap()
  ok('mobile: chiusa la scheda si torna al pannello del Focus', (await dialogs(page)).length === 0 &&
    await page.evaluate(() => window.__stores.app.getState().focus.state === 'focused'))
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
