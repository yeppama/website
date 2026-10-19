/**
 * Demo "negozio finito" (docs/PIANO-DEMO.md): foto, capi 3D con la foto, prezzi dal
 * fornitore fuori dalla scheda, niente testi di fase. Gira sulla build col contenuto
 * demo (VITE_CONTENT=demo anche per questo script, così legge lo stesso contenuto).
 *   VITE_CONTENT=demo node scripts/e2e/e2e-demo.mjs <base> <cartella-output>
 */
import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'

const [BASE, OUT] = process.argv.slice(2)
const C = storeConfig.copy
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const errors = []
const waitUntil = (page, fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true).catch(() => false)

async function open(query, viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${query}] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`[${query}] ${m.text()}`) })
  await page.goto(`${BASE}?debug=x&tier=low${query}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 60000 })
  await page.waitForFunction(() => window.__stores && window.__scene, null, { timeout: 30000 })
  return { ctx, page }
}
const openMenu = (page) => page.evaluate(() => window.__stores.app.setState({ menuOpen: true }))
const product = storeConfig.products[0]
const photoOf = (p) => p.media.find((m) => m.src)

ok('il contenuto della demo ha foto per tutti i capi', storeConfig.products.every(photoOf))

// ── Negozio di prova: foto, 3D, scheda ─────────────────────────────────────
{
  const { ctx, page } = await open('&commerce=mock')
  const loaded = await waitUntil(page, () => {
    let pending = 0, total = 0
    window.__scene.traverse((o) => { if (o.material?.userData?.photoUrl) { total++; if (!o.material.map?.image?.naturalWidth) pending++ } })
    return total > 0 && pending === 0
  })
  const meshes = await page.evaluate(() => { const s = new Set(); window.__scene.traverse((o) => { if (o.material?.userData?.photoUrl) s.add(o.material.userData.photoUrl) }); return [...s] })
  ok('capi 3D: tutte le foto arrivano sulle loro mesh', loaded, `${meshes.length} foto`)
  ok('capi 3D: una foto per ogni capo esposto', meshes.length >= storeConfig.products.length, meshes.join(', '))
  // Manichino: la foto solo sul davanti (z locale ≥ 0). Prima il retro la riceveva specchiata e
  // passando dietro si vedeva il fronte (segnalato dall'utente il 2026-10-19).
  const shells = await page.evaluate(() => {
    const out = []
    window.__scene.traverse((o) => {
      if (!o.isMesh || !o.material?.userData?.photoUrl || o.material.side === 2) return
      const g = o.geometry, pos = g.attributes.position
      if (!g.attributes.uv || !g.attributes.normal) return
      let back = 0
      for (let i = 0; i < pos.count; i++) if (g.attributes.normal.getZ(i) < -0.5) back++
      out.push({ name: o.material.userData.photoUrl.split('/').pop(), vertices: pos.count, back })
    })
    return out
  })
  const mannequinIds = storeConfig.displays.filter((d) => d.kind === 'mannequin').map((d) => d.id)
  const wornTops = storeConfig.products.filter((p) => mannequinIds.includes(p.displayId) && storeConfig.garments.shapeByCategory[p.category] === 'top' && p.model3d?.texture)
  // Punti luce arancioni del negozio (2026-10-19): barre in una sola mesh, nessuna luce vera sul tier low.
  const accent = await page.evaluate(() => {
    let lights = 0, bars = 0
    window.__scene.traverse((o) => {
      if (o.isPointLight) lights++
      if (o.isMesh && o.material?.isMeshBasicMaterial && !o.material.map && o.material.color.getHexString() === 'f98e30' && o.geometry.attributes.position.count >= 36 * 2) bars++
    })
    return { lights, bars }
  })
  ok('negozio: punti luce arancioni presenti, nessuna luce vera in più sul tier low', storeConfig.environment.accentLights.length > 0 && accent.bars >= 1 && accent.lights === 0, JSON.stringify(accent))
  // Fase C (2026-10-19): grafica alle pareti caricata, stampe della campagna comprese (contenuto demo).
  const urls = storeConfig.environment.wallArt.map((x) => x.url)
  const art = await page.evaluate((urls) => {
    const found = new Set()
    window.__scene.traverse((o) => { const src = o.material?.map?.image?.src; if (src && o.material.map.image.naturalWidth) for (const u of urls) if (src.endsWith(u)) found.add(u) })
    return [...found]
  }, urls)
  ok('negozio: grafica alle pareti caricata (manifesti, murale, stampe della campagna)', art.length === urls.length && storeConfig.environment.wallArt.some((x) => x.kind === 'print'), `${art.length}/${urls.length}`)
  ok('manichino: la foto del capo non è più sul retro', wornTops.length === 0 || (shells.length > 0 && shells.every((x) => x.back === 0)), JSON.stringify(shells))

  await page.evaluate((id) => window.__stores.app.getState().openDialog('product', id), product.id)
  const img = page.locator('[data-testid="product-media"] img').first()
  const imgOk = await waitUntil(page, () => { const i = document.querySelector('[data-testid="product-media"] img'); return i?.complete && i.naturalWidth > 0 })
  ok('scheda: la foto principale si carica, con più larghezze (srcset)', imgOk && (await img.getAttribute('srcset')).split(',').length === storeConfig.media.widths.length)
  const second = product.colorways[1]
  if (second && product.media.some((m) => m.colorwayId === second.id)) {
    const before = await img.getAttribute('src')
    await page.getByRole('radio', { name: new RegExp(second.label) }).first().click()
    const changed = await waitUntil(page, (b) => document.querySelector('[data-testid="product-media"] img')?.getAttribute('src') !== b, before, 5000)
    ok(`scheda: scegliendo ${second.label} la foto passa a quella del colore`, changed)
  }
  ok('commercio attivo: niente nota "prezzi dimostrativi" nella scheda', !(await page.getByText(C.legal.priceNotice).count()))
  await page.keyboard.press('Escape')

  await openMenu(page)
  const menuImgs = await waitUntil(page, (n) => [...document.querySelectorAll('aside article img')].filter((i) => i.complete && i.naturalWidth > 0).length >= n, Math.min(4, storeConfig.products.length))
  ok('menu: le foto dei capi si caricano (caricamento pigro)', menuImgs)
  ok('commercio attivo: niente nota "prezzi dimostrativi" nel menu', !(await page.getByText(C.legal.priceNotice).count()))
  const body = await page.evaluate(() => document.body.innerText)
  ok('nessun testo "Fase N" nell\'interfaccia', !/\bfase\s*\d/i.test(body), body.match(/.{0,30}\bfase\s*\d.{0,30}/i)?.[0] ?? '')
  await page.screenshot({ path: `${OUT}/menu-mock.png` })
  await ctx.close()
}

// ── Fornitore in errore: fuori dalla scheda mai il prezzo di storeConfig ────
{
  const { ctx, page } = await open('&commerce=mock&mockerror=1')
  await waitUntil(page, () => window.__cart.getState().catalogStatus === 'error')
  await openMenu(page)
  await page.waitForTimeout(500)
  const prices = await page.getByTestId('menu-price').allTextContents()
  ok('fornitore in errore: nel menu nessun prezzo, solo "—"', prices.length === storeConfig.products.length && prices.every((t) => t.trim().endsWith('—')), prices.join(' | '))
  await ctx.close()
}

// ── Commercio spento: prezzi dimostrativi dichiarati, acquisto chiuso ───────
{
  const { ctx, page } = await open('&commerce=off')
  await page.evaluate((id) => window.__stores.app.getState().openDialog('product', id), product.id)
  const buy = page.getByRole('button', { name: C.product.purchaseClosed })
  ok('commercio spento: "acquisti non ancora aperti", spento', await buy.isDisabled())
  ok('commercio spento: la nota dei prezzi dimostrativi resta', (await page.getByText(C.legal.priceNotice).count()) > 0)
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s.padEnd(4)} ${n}${note ? `  (${note})` : ''}`)
if (errors.length) console.log(`\nERRORI IN CONSOLE:\n${errors.join('\n')}`)
const failed = results.filter(([s]) => s === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} verifiche superate${errors.length ? `, ${errors.length} errori in console` : ''}`)
process.exit(failed || errors.length ? 1 : 0)
