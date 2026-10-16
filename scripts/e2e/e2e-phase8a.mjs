import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'
import { tokens } from '../../src/config/designTokens.js'
import { formatPrice } from '../../src/lib/format.js'

const BASE = process.argv[2], OUT = process.argv[3]
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const C = storeConfig.copy
const T = C.cart
const locale = storeConfig.meta.brand.locale
const hoodie = storeConfig.products.find((p) => p.id === 'prod-001')
const price = (amount) => formatPrice({ amount, currency: hoodie.price.currency }, locale)

async function open(name, { query = '?debug=x&tier=low&commerce=mock', mobile, viewport, context } = {}) {
  const ctx = context ?? await browser.newContext({
    viewport: viewport ?? (mobile ? { width: 390, height: 844 } : { width: 1100, height: 700 }),
    isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1,
  })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] ${e.message}`))
  await page.goto(BASE + query, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__player && window.__stores, null, { timeout: 20000 })
  return { ctx, page }
}
const waitUntil = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const dialog = (page) => page.locator('[role="dialog"][data-dialog]')
const cartCount = (page) => page.evaluate(() => window.__cart?.getState().cart?.totalQuantity ?? 0)
const openProduct = (page, id) => page.evaluate((id) => window.__stores.app.getState().openDialog('product', id), id)
const notPending = (page) => waitUntil(page, () => !window.__cart.getState().pending)

// ============================ SENZA COMMERCIO (default) ============================
{
  const { ctx, page } = await open('off', { query: '?debug=x&tier=low' })
  ok('commercio spento di default: niente bottone carrello nell\'HUD', (await page.getByTestId('cart-button').count()) === 0)
  await openProduct(page, 'prod-001')
  const buy = dialog(page).getByRole('button', { name: new RegExp(`${C.hints.comingInPhase} ${storeConfig.features.checkout.availableInPhase}`) })
  ok('commercio spento: la scheda resta col bottone d\'acquisto spento e il prezzo dimostrativo',
    await buy.isDisabled() && (await page.getByTestId('product-price').textContent()).trim() === price(hoodie.price.amount))
  await ctx.close()
}

// ============================ DESKTOP, NEGOZIO DI PROVA ============================
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } })
  const { page } = await open('desktop', { context: ctx })
  await waitUntil(page, () => window.__cart.getState().catalogStatus === 'ready')
  ok('negozio di prova: catalogo caricato dal fornitore', await page.evaluate(() => Object.keys(window.__cart.getState().catalog).length) === storeConfig.products.length)
  const cartBtn = page.getByTestId('cart-button')
  ok('negozio di prova: bottone carrello nell\'HUD, a zero', await cartBtn.isVisible() && (await cartBtn.textContent()).includes('0'))

  await openProduct(page, 'prod-001')
  const addBtn = page.getByTestId('add-to-cart')
  ok('scheda: senza taglia non si aggiunge ("Scegli una taglia")', await addBtn.isDisabled() && (await addBtn.textContent()).includes(T.chooseSize))
  ok('scheda: il prezzo viene dal fornitore', (await page.getByTestId('product-price').textContent()).trim() === price(hoodie.price.amount))
  ok('scheda: avviso "negozio di prova" visibile', await dialog(page).getByText(T.mockBanner).isVisible())
  const sizes = dialog(page).getByRole('radiogroup', { name: C.product.sizes })
  const soldOut = hoodie.sizes.find((s) => !s.available)
  ok('scheda: le taglie esaurite dal fornitore non si selezionano', await sizes.getByRole('radio', { name: new RegExp(`^${soldOut.label},`) }).getAttribute('aria-disabled') === 'true')
  const [m, l] = hoodie.sizes.filter((s) => s.available).slice(1, 3)
  await sizes.getByRole('radio', { name: m.label, exact: true }).click()
  await addBtn.click()
  await notPending(page)
  ok('aggiunta: il carrello passa a 1 e la scheda conferma', await cartCount(page) === 1 && await dialog(page).getByText(T.added).isVisible())
  await addBtn.click(); await notPending(page)
  ok('aggiunta della stessa variante: una riga, quantità 2', await cartCount(page) === 2 && await page.evaluate(() => window.__cart.getState().cart.lines.length) === 1)
  await sizes.getByRole('radio', { name: l.label, exact: true }).click()
  await dialog(page).getByRole('radio', { name: hoodie.colorways[1].label }).click()
  await addBtn.click(); await notPending(page)
  ok('altra taglia e colore: seconda riga, 3 pezzi', await cartCount(page) === 3 && await page.evaluate(() => window.__cart.getState().cart.lines.length) === 2)

  await dialog(page).getByRole('button', { name: new RegExp(T.openCart) }).click()
  ok('carrello: si apre sopra la scheda, con "Indietro"', await dialog(page).getAttribute('data-dialog') === 'cart' &&
    await dialog(page).getByRole('button', { name: new RegExp(C.dialog.back) }).isVisible())
  ok('carrello: subtotale = prezzo × 3', (await page.getByTestId('cart-subtotal').textContent()).trim() === price(hoodie.price.amount * 3))
  ok('carrello: righe con taglia e colore leggibili', (await page.getByTestId('cart-line').count()) === 2 &&
    await dialog(page).getByText(`${m.label} · ${hoodie.colorways[0].label}`).isVisible())
  await page.screenshot({ path: `${OUT}/desktop-cart.png` })

  // Movimento sospeso e trappola del focus, come per le altre schede.
  const p0 = await page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z }))
  await page.keyboard.down('KeyW'); await page.waitForTimeout(600); await page.keyboard.up('KeyW')
  const p1 = await page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z }))
  ok('carrello aperto: il player non si muove', Math.hypot(p1.x - p0.x, p1.z - p0.z) < 0.001)
  let escaped = 0
  for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => document.querySelector('[role="dialog"][data-dialog]')?.contains(document.activeElement)))) escaped++ }
  ok('carrello: Tab resta dentro la finestra', escaped === 0, `${escaped} uscite`)

  // Quantità: +, −, massimo, rimozione.
  const first = page.getByTestId('cart-line').first()
  await first.getByRole('button', { name: new RegExp(`^${T.increase}`) }).click(); await notPending(page)
  ok('carrello: + aumenta quantità e totale', await cartCount(page) === 4 && (await page.getByTestId('cart-subtotal').textContent()).trim() === price(hoodie.price.amount * 4))
  await first.getByRole('button', { name: new RegExp(`^${T.decrease}`) }).click(); await notPending(page)
  ok('carrello: − diminuisce', await cartCount(page) === 3)
  const lineId = await page.evaluate(() => window.__cart.getState().cart.lines[0].id)
  await page.evaluate((id) => window.__cart.getState().setQuantity(id, 999), lineId); await notPending(page)
  const maxQ = await page.evaluate(() => window.__cart.getState().cart.lines[0].quantity)
  ok('carrello: la quantità non supera il massimo del config', maxQ === storeConfig.commerce.maxQuantity, `quantità ${maxQ}`)
  ok('carrello: al massimo il + è spento', await first.getByRole('button', { name: new RegExp(`^${T.increase}`) }).isDisabled())
  await first.getByRole('button', { name: new RegExp(`^${T.remove}`) }).click(); await notPending(page)
  ok('carrello: "Rimuovi" toglie la riga', (await page.getByTestId('cart-line').count()) === 1)

  // Cassa di prova: nessuna navigazione, solo l'avviso.
  const url0 = page.url()
  await dialog(page).getByRole('button', { name: T.checkout }).click()
  await page.waitForTimeout(300)
  ok('cassa di prova: niente navigazione, avviso esplicito', page.url() === url0 && await dialog(page).getByText(T.mockCheckout).isVisible())

  // ESC: torna alla scheda prodotto (pila), poi chiude.
  await page.keyboard.press('Escape')
  ok('ESC dal carrello aperto dalla scheda: si torna alla scheda', await dialog(page).getAttribute('data-dialog') === 'product')
  await page.keyboard.press('Escape')
  ok('ESC di nuovo: nessuna finestra aperta', (await page.evaluate(() => window.__stores.app.getState().dialogs.length)) === 0)

  // Persistenza: lo stesso browser, una pagina nuova, ritrova il carrello.
  const before = await cartCount(page)
  await page.close()
  const again = await open('desktop-reload', { context: ctx })
  await waitUntil(again.page, (n) => (window.__cart.getState().cart?.totalQuantity ?? 0) === n, before)
  ok('ricaricando la pagina il carrello resta', await cartCount(again.page) === before && before > 0, `${before} pezzi`)
  ok('HUD: il numero di pezzi è visibile', (await again.page.getByTestId('cart-button').textContent()).includes(String(before)))

  // Carrello vuoto.
  const ids = await again.page.evaluate(() => window.__cart.getState().cart.lines.map((l) => l.id))
  for (const id of ids) { await again.page.evaluate((id) => window.__cart.getState().remove(id), id); await notPending(again.page) }
  await again.page.getByTestId('cart-button').click()
  ok('carrello vuoto: messaggio e "Continua a esplorare"', await dialog(again.page).getByText(T.empty).isVisible() &&
    await dialog(again.page).getByRole('button', { name: T.continue }).isVisible())
  await dialog(again.page).getByRole('button', { name: T.continue }).click()
  ok('"Continua a esplorare" chiude', (await again.page.evaluate(() => window.__stores.app.getState().dialogs.length)) === 0)
  await ctx.close()
}

// ============================ FORNITORE IN ERRORE ============================
{
  const { ctx, page } = await open('error', { query: '?debug=x&tier=low&commerce=mock&mockerror=1' })
  await waitUntil(page, () => window.__cart.getState().catalogStatus === 'error')
  await openProduct(page, 'prod-001')
  ok('fornitore in errore: nessun prezzo inventato, avviso e acquisto spento',
    (await page.getByTestId('product-price').textContent()).trim() === '—' &&
    await dialog(page).getByText(T.unavailable).isVisible() && await page.getByTestId('add-to-cart').isDisabled())
  await ctx.close()
}

// ============================ SHOPIFY IRRAGGIUNGIBILE ============================
// Il fornitore Shopify vero, senza rete verso Shopify (come in questo container):
// nessun prezzo inventato, avviso, acquisto spento, avviso "negozio di sviluppo".
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + '?debug=x&tier=low&commerce=shopify', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__stores && window.__cart, null, { timeout: 20000 })
  const settled = await waitUntil(page, () => window.__cart.getState().catalogStatus === 'error', null, 30000)
  await openProduct(page, 'prod-001')
  ok('Shopify irraggiungibile: catalogo in errore, prezzo "—", avviso, acquisto spento, nessuna eccezione',
    settled && (await page.getByTestId('product-price').textContent()).trim() === '—' &&
    await dialog(page).getByText(T.unavailable).isVisible() && await page.getByTestId('add-to-cart').isDisabled() && errors.length === 0,
    errors.join(' | '))
  ok('negozio di sviluppo: la scheda lo dichiara', await dialog(page).getByText(T.devStoreBanner).isVisible())
  await ctx.close()
}

// ============================ MOBILE ============================
{
  const { ctx, page } = await open('mobile', { mobile: true })
  await waitUntil(page, () => window.__cart.getState().catalogStatus === 'ready')
  const variant = await page.evaluate(() => window.__cart.getState().catalog['work-jacket'].variants.find((v) => v.available).id)
  await page.evaluate((v) => window.__cart.getState().add(v), variant); await notPending(page)
  await page.getByTestId('cart-button').tap()
  const box = await dialog(page).boundingBox()
  ok('mobile: il carrello occupa lo schermo', Math.abs(box.width - 390) < 1 && Math.abs(box.height - 844) < 1)
  const issues = []
  for (const w of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(150)
    const a = await page.evaluate((min) => {
      const out = []
      const root = document.querySelector('[role="dialog"][data-dialog]')
      const sc = root.querySelector('.overflow-y-auto')
      if (sc.scrollWidth > sc.clientWidth) out.push(`scorre in orizzontale di ${sc.scrollWidth - sc.clientWidth}px`)
      for (const b of root.querySelectorAll('button')) {
        const r = b.getBoundingClientRect()
        if (r.width && (r.height < min - 0.5 || r.width < min - 0.5) && b.tabIndex !== -1) out.push(`bottone "${b.textContent.trim().slice(0, 12)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
        if (r.right > innerWidth + 1) out.push(`bottone "${b.textContent.trim().slice(0, 12)}" fuori schermo`)
      }
      return out
    }, tokens.touchTarget.min)
    if (a.length) issues.push(`${w}px: ${a.slice(0, 3).join('; ')}`)
  }
  ok('mobile: carrello senza scorrimento orizzontale, bottoni ≥ 44 px, a 320/360/390/430', issues.length === 0, issues.join(' | '))
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/mobile-cart.png` })
  await page.keyboard.press('Escape')
  // HUD a 320 px: carrello e menu stanno nello schermo senza sovrapporsi al marchio.
  await page.setViewportSize({ width: 320, height: 640 }); await page.waitForTimeout(300)
  const hud = await page.evaluate(() => {
    const cart = document.querySelector('[data-testid="cart-button"]').getBoundingClientRect()
    const word = document.querySelector('header p').getBoundingClientRect()
    return { cartLeft: cart.left, wordRight: word.right, right: Math.max(...[...document.querySelectorAll('header button')].map((b) => b.getBoundingClientRect().right)) }
  })
  ok('HUD a 320 px: carrello e menu entrano e non coprono il marchio', hud.right <= 320 && hud.cartLeft > hud.wordRight, JSON.stringify(hud))
  await page.screenshot({ path: `${OUT}/mobile-hud-320.png` })
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
