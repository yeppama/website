/**
 * Modalità testo (audit 2026-11-02, N1): il negozio senza 3D.
 *   1. senza WebGL: dal fallback al catalogo, poi scheda, aggiunta, carrello e
 *      Privacy, tutto da tastiera (focus + Invio), senza canvas;
 *   2. con WebGL, su entrambi gli allestimenti: "Entra senza 3D" funziona anche
 *      durante il caricamento, smonta la scena e si torna al 3D;
 *   3. Indietro del browser chiude la scheda e resta sul sito.
 *   node scripts/e2e/e2e-textmode.mjs <base> <cartella-output>
 */
import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase, outDir } from './launchOptions.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'

const [RAW_BASE, RAW_OUT] = process.argv.slice(2)
const OUT = outDir(RAW_OUT)
const BASE = localBase(RAW_BASE)
const C = storeConfig.copy
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const errors = []
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const dialog = (page) => page.locator('[role="dialog"][data-dialog]')
const watch = (page, name) => {
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`) })
}
// Attivazione da tastiera: focus sull'elemento e Invio, come farebbe chi non usa il mouse.
const press = async (page, locator, key = 'Enter') => { await locator.focus(); await page.keyboard.press(key) }

// ── 1. Senza WebGL ────────────────────────────────────────────────────────
{
  const noGl = await chromium.launch({ executablePath: chromiumPath(), args: [...chromiumArgs().filter((a) => !a.includes('angle') && !a.includes('swiftshader')), '--disable-webgl', '--disable-3d-apis'] })
  const ctx = await noGl.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  watch(page, 'senza-webgl')
  await page.goto(`${BASE}?debug=x&commerce=mock`, { waitUntil: 'networkidle' })
  const browse = page.getByTestId('fallback-browse')
  ok('senza WebGL: il fallback offre il catalogo invece di un vicolo cieco', await browse.isVisible().catch(() => false))
  await press(page, browse)
  await page.getByTestId('text-mode').waitFor({ timeout: 10000 })
  ok('modalità testo: il focus va sul titolo della pagina', await page.evaluate(() => document.activeElement?.tagName === 'H1'))
  ok('modalità testo: nessun canvas, il 3D non si carica', (await page.locator('canvas').count()) === 0)
  ok('modalità testo: il testo dice che il 3D qui non c\'è, e non offre di tornarci', await page.getByText(C.textMode.unsupported).isVisible() && (await page.getByTestId('text-mode-3d').count()) === 0)
  const cards = page.locator('[data-testid="text-mode"] article button')
  ok('modalità testo: tutti i capi del config sono in elenco', (await cards.count()) === storeConfig.products.length, `${await cards.count()} su ${storeConfig.products.length}`)
  await page.screenshot({ path: `${OUT}/senza-webgl-catalogo.png`, fullPage: true })

  // Scheda, taglia, aggiunta: solo focus + tasti.
  await press(page, cards.first())
  await dialog(page).waitFor({ timeout: 10000 })
  const sizes = dialog(page).locator('[role="radiogroup"]').last().getByRole('radio')
  let picked = false
  for (let i = 0; i < await sizes.count() && !picked; i++) {
    const r = sizes.nth(i)
    if ((await r.getAttribute('aria-disabled')) !== 'true') { await press(page, r, ' '); picked = true }
  }
  const add = page.getByTestId('add-to-cart')
  await waitUntil(page, () => !document.querySelector('[data-testid="add-to-cart"]')?.disabled, null, 10000)
  await press(page, add)
  const added = await waitUntil(page, () => (window.__cart?.getState().cart?.totalQuantity ?? 0) === 1, null, 10000)
  ok('modalità testo: scheda aperta e capo aggiunto da tastiera', picked && added)
  await page.keyboard.press('Escape')
  await waitUntil(page, () => !document.querySelector('[role="dialog"][data-dialog]'))
  ok('modalità testo: ESC chiude la scheda e il focus torna al capo', await page.evaluate(() => document.activeElement?.closest('article') !== null))

  // Carrello.
  await press(page, page.getByTestId('cart-button'))
  await dialog(page).waitFor({ timeout: 10000 })
  ok('modalità testo: il carrello si apre e mostra la riga', (await page.getByTestId('cart-line').count()) === 1)
  await page.keyboard.press('Escape')
  await waitUntil(page, () => !document.querySelector('[role="dialog"][data-dialog]'))

  // Pagine legali.
  const legal = page.getByTestId('text-legal')
  const privacy = legal.getByRole('button', { name: new RegExp(C.legal.policies.privacy) })
  await privacy.waitFor({ timeout: 10000 })
  await press(page, privacy)
  await dialog(page).waitFor({ timeout: 10000 })
  ok('modalità testo: la Privacy si apre senza 3D', await page.getByTestId('legal-body').isVisible().catch(() => false))

  // Indietro del browser.
  const url = page.url()
  await page.goBack()
  ok('modalità testo: Indietro chiude la scheda e resta sul sito',
    await waitUntil(page, () => !document.querySelector('[role="dialog"][data-dialog]'), null, 5000) && page.url() === url, page.url())
  await page.screenshot({ path: `${OUT}/senza-webgl-fine.png` })
  await ctx.close()
  await noGl.close()
}

// ── 2. Con WebGL: "Entra senza 3D" dall'onboarding, su entrambi gli allestimenti ──
const browser = await chromium.launch({ executablePath: chromiumPath(), args: chromiumArgs() })
for (const [nome, query] of [['negozio', ''], ['cantiere', 'allestimento=cantiere&']]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  watch(page, `onboarding-${nome}`)
  await page.goto(`${BASE}?${query}debug=x&tier=low&commerce=mock`)
  const enterText = page.getByTestId('enter-text-mode')
  await enterText.waitFor({ timeout: 20000 })
  ok(`${nome}: "Entra senza 3D" è attivo anche durante il caricamento`, !(await enterText.isDisabled()))
  await enterText.click()
  await page.getByTestId('text-mode').waitFor({ timeout: 10000 })
  ok(`${nome}: in modalità testo la scena è smontata`, await waitUntil(page, () => document.querySelectorAll('canvas').length === 0, null, 10000))
  ok(`${nome}: con WebGL si offre di tornare al 3D`, await page.getByTestId('text-mode-3d').isVisible())
  await page.getByTestId('text-mode-3d').click()
  const back = await page.getByRole('button', { name: /^entra$/i }).waitFor({ timeout: 90000 }).then(() => true).catch(() => false)
  ok(`${nome}: dal testo si torna al 3D (onboarding, scena caricata)`, back && (await page.locator('canvas').count()) > 0)
  await ctx.close()
}
await browser.close()

for (const [s, n, note] of results) console.log(`${s.padEnd(4)} ${n}${note ? `  (${note})` : ''}`)
for (const e of errors) console.log(`  errore: ${e}`)
const failed = results.filter(([s]) => s === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} verifiche superate${errors.length ? `, ${errors.length} errori in console` : ''}`)
process.exit(failed || errors.length ? 1 : 0)
