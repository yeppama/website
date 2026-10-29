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
  const buy = dialog(page).getByRole('button', { name: C.product.purchaseClosed })
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

  // Fase 8d: dal carrello si leggono le pagine legali senza perderlo. È l'ultima
  // schermata nostra prima della cassa di Shopify, quindi l'ultimo punto in cui
  // chi compra può aprire condizioni, recesso e spedizioni.
  const cartLegal = page.getByTestId('cart-legal').getByRole('button')
  ok('carrello: le pagine legali pubblicate, nell\'ordine del config',
    (await cartLegal.allTextContents()).map((s) => s.trim()).join(' | ') ===
    storeConfig.commerce.policies.map((p) => C.legal.policies[p.id]).join(' | '))
  await cartLegal.filter({ hasText: C.legal.policies.refund }).click()
  ok('carrello: il link apre la scheda legale sopra il carrello',
    await dialog(page).getAttribute('data-dialog') === 'legal' &&
    (await page.evaluate(() => window.__stores.app.getState().dialogs.length)) === 3)
  await page.keyboard.press('Escape')
  ok('carrello: chiusa la scheda legale si torna al carrello, con la merce dentro',
    await dialog(page).getAttribute('data-dialog') === 'cart' && (await page.getByTestId('cart-line').count()) === 1)

  // Fase 8d, seconda metà della Definition of Done: "nessun cookie non tecnico
  // senza consenso". Il sito non ne scrive nessuno — niente analytics, niente
  // script di terze parti (la CSP non li permetterebbe) — e in localStorage
  // tiene solo quello che serve a far funzionare quello che l'utente ha chiesto:
  // l'id del carrello, il modo di controllo che ha scelto lui, e i carrelli del
  // fornitore finto, che in produzione non esiste. Niente di tutto questo
  // richiede un banner; se un giorno comparisse altro, questa verifica lo dice.
  const storage = await page.evaluate(() => ({ cookie: document.cookie, keys: Object.keys(localStorage).sort() }))
  // Si controlla che non ci sia niente FUORI dall'elenco, non che ci sia tutto:
  // `into-control-mode` lo scrive solo chi sceglie il modo di controllo.
  const allowed = new Set([storeConfig.commerce.cartStorageKey, storeConfig.commerce.mock.storageKey, 'into-control-mode'])
  const unexpected = storage.keys.filter((k) => !allowed.has(k))
  ok('nessun cookie scritto dal sito', storage.cookie === '', storage.cookie || 'document.cookie vuoto')
  ok('in localStorage solo le chiavi tecniche dichiarate', unexpected.length === 0,
    unexpected.length ? `fuori elenco: ${unexpected.join(', ')}` : storage.keys.join(', '))

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
  // Aprendo la scheda il catalogo in errore si riprova: si aspetta che il nuovo tentativo finisca.
  await waitUntil(page, () => window.__cart.getState().catalogStatus === 'error')
  ok('fornitore in errore: nessun prezzo inventato, avviso, "Riprova" e acquisto spento',
    (await page.getByTestId('product-price').textContent()).trim() === '—' &&
    await dialog(page).getByText(T.unavailable).isVisible() && await page.getByTestId('add-to-cart').isDisabled() &&
    await dialog(page).getByRole('button', { name: T.retry }).isVisible())
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
  // Rete verso Shopify tagliata dal test: il container ora raggiunge il negozio di sviluppo.
  await page.route('**/api/*/graphql.json', (route) => route.abort('connectionrefused'))
  await page.goto(BASE + '?debug=x&tier=low&commerce=shopify', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__stores && window.__cart, null, { timeout: 20000 })
  const settled = await waitUntil(page, () => window.__cart.getState().catalogStatus === 'error', null, 30000)
  await openProduct(page, 'prod-001')
  // Dopo l'errore il catalogo viene ritentato: lo stato fa error → loading → error,
  // e l'avviso sparisce finché il tentativo è in volo. Leggere `isVisible()` in quella
  // finestra faceva fallire il test con tutto a posto (visto: 3 esecuzioni identiche,
  // due passate e una no). Si aspetta la condizione, non si legge al volo.
  const avvisato = await waitUntil(page,
    (t) => document.querySelector('[role="dialog"][data-dialog]')?.textContent?.includes(t) ?? false, T.unavailable)
  ok('Shopify irraggiungibile: catalogo in errore, prezzo "—", avviso, acquisto spento, nessuna eccezione',
    settled && (await page.getByTestId('product-price').textContent()).trim() === '—' &&
    avvisato && await page.getByTestId('add-to-cart').isDisabled() && errors.length === 0,
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

// ============================ PAGINE LEGALI (preparazione 8d) ============================
const L = C.legal
const legalButtons = (page) => page.getByTestId('menu-legal').getByRole('button')
{
  const { ctx, page } = await open('legal')
  await page.getByRole('button', { name: C.hud.menu, exact: true }).click()
  const ready = await waitUntil(page, (n) => document.querySelectorAll('[data-testid="menu-legal"] li button').length === n, storeConfig.commerce.policies.length)
  const labels = await legalButtons(page).allTextContents()
  ok('menu: le pagine legali del fornitore, nell\'ordine del config',
    ready && labels.map((t) => t.replace('→', '').trim()).join('|') === storeConfig.commerce.policies.map((p) => L.policies[p.id]).join('|'), labels.join(' | '))
  const opener = legalButtons(page).filter({ hasText: L.policies.privacy })
  await opener.click()
  const body = page.getByTestId('legal-body')
  await body.waitFor({ timeout: 10000 })
  ok('scheda legale: titolo, avviso "negozio di prova", testo formattato',
    await dialog(page).getAttribute('data-dialog') === 'legal' &&
    (await dialog(page).locator('h2').textContent()).trim() === L.policies.privacy &&
    await dialog(page).getByText(L.mockNotice).isVisible() &&
    await body.locator('h3').count() === 1 && await body.locator('li').count() === 2)
  const mail = body.locator('a')
  ok('scheda legale: link mailto conservato, aperto a parte', await mail.getAttribute('href') === 'mailto:info@example.com' && await mail.getAttribute('rel') === 'noopener noreferrer')
  ok('scheda legale: il player è sospeso', await page.evaluate(() => window.__stores.app.getState().dialogs.length === 1))
  await page.keyboard.press('Escape')
  ok('ESC: chiude la scheda e torna al menu, focus sulla voce che l\'ha aperta',
    await dialog(page).count() === 0 && await page.evaluate(() => window.__stores.app.getState().menuOpen) &&
    await page.evaluate(() => document.activeElement?.textContent?.includes('Privacy') ?? false))
  await page.screenshot({ path: `${OUT}/legal-menu.png` })
  await ctx.close()
}

// Pagina scritta apposta per attaccare il filtro: niente deve eseguirsi né restare.
{
  const evil = '<h1>Titolo</h1><p onclick="window.__pwned=\'click\'" style="color:red">Testo sicuro</p>' +
    '<script>window.__pwned=\'script\'</script><img src="x" onerror="window.__pwned=\'img\'">' +
    '<a href="javascript:window.__pwned=\'link\'">link js</a> <a href="/policies/x">relativo</a> ' +
    '<a href="https://example.com/ok" onclick="window.__pwned=\'a\'">buono</a>' +
    '<iframe src="https://example.com"></iframe><style>body{display:none}</style><form><input name="a"><button>invia</button></form>' +
    '<svg><script>window.__pwned=\'svg\'</script></svg><table><tr><td>cella</td></tr></table>'
  let fail = true
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => consoleErrors.push(`[legal-evil] ${e.message}`))
  await page.route('**/api/*/graphql.json', (route) => {
    const q = route.request().postDataJSON()?.query ?? ''
    if (!q.includes('query Policies')) return route.fulfill({ json: { data: { localization: { availableCountries: [{ isoCode: 'IT' }] } } } })
    if (fail) return route.fulfill({ status: 503, json: {} })
    return route.fulfill({ json: { data: { shop: { privacyPolicy: { title: 'Privacy di prova', body: evil } } } } })
  })
  await page.goto(BASE + '?debug=x&tier=low&commerce=shopify', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__stores, null, { timeout: 20000 })
  await page.getByRole('button', { name: C.hud.menu, exact: true }).click()
  const legal = page.getByTestId('menu-legal')
  ok('Shopify in errore: il menu dice "non raggiungibili" e offre di riprovare',
    await legal.getByText(L.unavailable).waitFor({ timeout: 10000 }).then(() => true).catch(() => false))
  fail = false
  await legal.getByRole('button', { name: L.retry }).click()
  await legal.getByRole('button', { name: new RegExp(L.policies.privacy) }).click({ timeout: 10000 })
  const body = page.getByTestId('legal-body')
  await body.waitFor({ timeout: 10000 })
  await body.getByText('Testo sicuro').click()
  await body.getByText('link js').click()
  const html = await body.innerHTML()
  const bad = ['<script', '<img', '<iframe', '<style', '<form', '<input', '<button', '<svg', 'onclick', 'onerror', 'style=', 'javascript:']
    .filter((x) => html.toLowerCase().includes(x))
  ok('filtro HTML: niente script, immagini, iframe, stili, moduli, attributi on* o link javascript', bad.length === 0, bad.join(', '))
  ok('filtro HTML: nessun codice eseguito, nemmeno cliccando', await page.evaluate(() => window.__pwned === undefined))
  ok('filtro HTML: link relativo e javascript senza href, link https conservato; h1 → h3; testo e tabella restano',
    await body.getByText('relativo').evaluate((n) => n.tagName !== 'A') &&
    await body.getByText('link js').evaluate((n) => n.tagName !== 'A') &&
    await body.getByRole('link', { name: 'buono' }).getAttribute('href') === 'https://example.com/ok' &&
    await body.locator('h3').textContent() === 'Titolo' && await body.locator('h1, h2').count() === 0 &&
    await body.getByText('cella').isVisible(), html.slice(0, 300))
  ok('scheda legale: titolo dal venditore', (await dialog(page).locator('h2').textContent()).trim() === 'Privacy di prova')
  await ctx.close()
}

// Telefono: scheda legale senza scorrimento orizzontale.
{
  const { ctx, page } = await open('legal-mobile', { mobile: true })
  await page.evaluate(() => window.__stores.app.getState().openDialog('legal', 'privacy'))
  await page.getByTestId('legal-body').waitFor({ timeout: 10000 })
  const wide = []
  for (const w of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(150)
    const over = await page.evaluate(() => { const sc = document.querySelector('[role="dialog"][data-dialog] .overflow-y-auto'); return sc.scrollWidth - sc.clientWidth })
    if (over > 0) wide.push(`${w}px: +${over}px`)
  }
  ok('mobile: scheda legale senza scorrimento orizzontale a 320/360/390/430', wide.length === 0, wide.join(' | '))
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200)
  await page.screenshot({ path: `${OUT}/mobile-legal.png` })
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
