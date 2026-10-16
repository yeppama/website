import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'

/**
 * Fase 8b — prova DAL VIVO sul negozio Shopify di sviluppo (?commerce=shopify).
 * Richiede rete verso il dominio del negozio. Crea carrelli veri sul negozio di
 * sviluppo (innocui) e apre la cassa senza pagare: il pagamento di prova lo fa
 * l'utente. Se Shopify non è raggiungibile, lo dice e non finge.
 */
const BASE = process.argv[2], OUT = process.argv[3]
// argv[4] forza il paese (diagnosi, es. US finché il negozio non vende in IT).
const COUNTRY = process.argv[4] ?? null
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const T = storeConfig.copy.cart
const shop = storeConfig.commerce.shopify

const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => consoleErrors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
let apiVersion = null
page.on('response', (r) => { if (r.url().includes('/graphql.json')) apiVersion ??= r.headers()['x-shopify-api-version'] })
const waitUntil = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true).catch(() => false)
const dialog = page.locator('[role="dialog"][data-dialog]')

const QUERY = `?debug=x&tier=low&commerce=shopify${COUNTRY ? `&country=${COUNTRY}` : ''}`
await page.goto(BASE + QUERY, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
await page.waitForFunction(() => window.__cart, null, { timeout: 20000 })
await waitUntil(() => ['ready', 'error'].includes(window.__cart.getState().catalogStatus))
const status = await page.evaluate(() => window.__cart.getState().catalogStatus)

// Mercati del negozio, letti direttamente: distingue "negozio non configurato"
// da "rete chiusa" o "token sbagliato".
const markets = await page.evaluate(async ({ domain, token, version }) => {
  try {
    const r = await fetch(`https://${domain}/api/${version}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: '{ localization { availableCountries { isoCode currency { isoCode } } } }' }) })
    const j = await r.json()
    return j.data.localization.availableCountries.map((c) => `${c.isoCode}/${c.currency.isoCode}`)
  } catch (e) { return null }
}, { domain: shop.domain, token: shop.storefrontToken, version: shop.apiVersion })
const country = COUNTRY ?? storeConfig.commerce.country
const sellsHere = markets?.some((m) => m.startsWith(`${country}/`))
ok(`negozio ${shop.domain} raggiungibile col token pubblico`, markets !== null)
ok(`il negozio vende in ${country} (configurazione Shopify → Mercati)`, !!sellsHere, `mercati attivi: ${markets?.join(', ')}`)

if (status !== 'ready') {
  await page.evaluate((id) => window.__stores.app.getState().openDialog('product', id), 'prod-001')
  ok('negozio non pronto per questo paese: il sito mostra "non disponibile", nessun prezzo in altra valuta',
    (await page.getByTestId('product-price').textContent()).trim() === '—' && await page.getByTestId('add-to-cart').isDisabled())
  ok('prova completa del carrello', false, 'non eseguita: serve il negozio configurato per questo paese')
} else {
  const cat = await page.evaluate(() => window.__cart.getState().catalog)
  const expected = storeConfig.products.map((p) => p.commerce.handle)
  const missing = expected.filter((h) => !cat[h])
  ok('catalogo dal vivo: ogni capo del negozio 3D esiste su Shopify', missing.length === 0, missing.length ? `mancano: ${missing.join(', ')}` : `${expected.length} capi`)
  ok(`versione API servita da Shopify = ${shop.apiVersion}`, apiVersion === shop.apiVersion, `header: ${apiVersion}`)
  // Varianti: ogni combinazione taglia × colore di storeConfig ha una variante Shopify.
  const gaps = []
  for (const p of storeConfig.products) {
    for (const s of p.sizes) for (const c of p.colorways) {
      const v = cat[p.commerce.handle]?.variants.find((x) => x.size === s.id && x.color === c.id)
      if (!v) gaps.push(`${p.commerce.handle} ${s.label}/${c.label}`)
      else if (v.available !== s.available) gaps.push(`${p.commerce.handle} ${s.label}/${c.label}: disponibile ${v.available} su Shopify, ${s.available} nel 3D`)
    }
  }
  ok('varianti dal vivo: taglie e colori del 3D tutti presenti, disponibilità coerente', gaps.length === 0, gaps.slice(0, 4).join('; '))
  const currencies = [...new Set(Object.values(cat).flatMap((p) => p.variants.map((v) => v.price.currency)))]
  ok(`valuta dei prezzi = EUR (vendita UE)${COUNTRY ? ` — paese forzato ${COUNTRY}` : ''}`, currencies.length === 1 && currencies[0] === 'EUR', `Shopify restituisce: ${currencies.join(', ')}`)

  // Carrello vero sul negozio di sviluppo.
  const variant = cat['heavy-hoodie'].variants.find((v) => v.available)
  await page.evaluate((id) => window.__stores.app.getState().openDialog('product', id), 'prod-001')
  const size = storeConfig.products[0].sizes.find((s) => s.id === variant.size)
  const color = storeConfig.products[0].colorways.find((c) => c.id === variant.color)
  await dialog.getByRole('radio', { name: color.label }).click()
  await dialog.getByRole('radiogroup', { name: storeConfig.copy.product.sizes }).getByRole('radio', { name: size.label, exact: true }).click()
  await page.getByTestId('add-to-cart').click()
  const added = await waitUntil(() => window.__cart.getState().cart?.totalQuantity === 1)
  const cart = await page.evaluate(() => window.__cart.getState().cart)
  ok('carrello dal vivo: creato su Shopify con la variante scelta', added && cart.id.startsWith('gid://shopify/Cart/') && cart.lines[0].variantId === variant.id, cart?.id)
  await page.evaluate(() => window.__cart.getState().setQuantity(window.__cart.getState().cart.lines[0].id, 3))
  const three = await waitUntil(() => window.__cart.getState().cart?.totalQuantity === 3)
  const sub = await page.evaluate(() => window.__cart.getState().cart.subtotal)
  ok('carrello dal vivo: quantità aggiornata e subtotale calcolato da Shopify', three && Math.abs(sub.amount - variant.price.amount * 3) < 0.01, `${sub.amount} ${sub.currency}`)
  // Persistenza: una pagina nuova ritrova lo stesso carrello su Shopify.
  const id = cart.id
  const p2 = await ctx.newPage()
  await p2.goto(BASE + QUERY, { waitUntil: 'networkidle' })
  await p2.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  const restored = await p2.waitForFunction((id) => window.__cart?.getState().cart?.id === id && window.__cart.getState().cart.totalQuantity === 3, id, { timeout: 30000 }).then(() => true).catch(() => false)
  ok('carrello dal vivo: ricaricando la pagina si ritrova lo stesso carrello Shopify', restored)
  await p2.close()
  // Cassa: l'indirizzo esiste e risponde, senza pagare.
  // Dal browser (passa dal proxy, a differenza delle richieste dirette di Playwright).
  const checkoutUrl = await page.evaluate(() => window.__cart.getState().cart.checkoutUrl)
  const co = await ctx.newPage()
  const resp = await co.goto(checkoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => e)
  const code = resp?.status?.() ?? String(resp)
  await co.screenshot({ path: `${OUT}/shopify-checkout.png` }).catch(() => {})
  // I negozi di sviluppo chiedono la password del negozio prima della cassa. Se
  // arriva da STORE_PASSWORD (variabile d'ambiente, mai scritta in un file) la si
  // inserisce; altrimenti la cassa resta non verificata e lo si dice.
  if (new URL(co.url()).pathname.startsWith('/password') && process.env.STORE_PASSWORD) {
    await co.locator('input[type="password"]').fill(process.env.STORE_PASSWORD)
    await Promise.all([co.waitForLoadState('domcontentloaded'), co.locator('button[type="submit"], input[type="submit"]').first().click()])
    await co.waitForTimeout(1500)
    await co.goto(checkoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await co.waitForTimeout(6000)
  }
  const landed = new URL(co.url()).pathname
  const body = (await co.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
  const qty = await page.evaluate(() => window.__cart.getState().cart.lines[0])
  const sizeLabel = storeConfig.products[0].sizes.find((s) => s.id === qty.merchandise.size).label
  await co.screenshot({ path: `${OUT}/shopify-checkout.png` }).catch(() => {})
  ok('cassa dal vivo: si apre la cassa Shopify col capo, la taglia e il prezzo del carrello, in EUR',
    landed.includes('/checkouts/') && body.includes(qty.merchandise.title) && body.includes(sizeLabel) && /€\s?567[.,]00|567[.,]00\s?€/.test(body),
    landed.startsWith('/password') ? 'protetta da password: impostare STORE_PASSWORD per verificarla' : `${landed.split('/').slice(0, 3).join('/')}/… · ${qty.merchandise.title} ${sizeLabel}`)
  await co.close()
  // Pulizia: il carrello torna vuoto.
  await page.evaluate(() => window.__cart.getState().remove(window.__cart.getState().cart.lines[0].id))
  ok('carrello dal vivo: rimozione su Shopify', await waitUntil(() => window.__cart.getState().cart?.totalQuantity === 0))
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
