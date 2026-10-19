/**
 * Correzioni della navigazione chieste dall'utente il 2026-10-17:
 *   1. Indietro del browser chiude scheda, menu e Focus invece di lasciare il sito
 *   2. "Solo mouse" da computer: trascina per guardare, click per andare
 *   3. l'avviso del capo vicino si tocca anche da dietro l'espositore
 *   4. click su un muro → si va al punto libero più vicino
 *   5. margine invisibile attorno agli espositori
 *   6. indicatore a terra davanti agli espositori, che si tocca
 *   node scripts/e2e/e2e-navfix.mjs <base> <cartella-output>
 */
import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'
import { circleOverlapsCollider } from '../../src/lib/geometry.js'

const [BASE, OUT] = process.argv.slice(2)
const C = storeConfig.copy
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const errors = []
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz))
const place = (page, x, z, yaw = 0, pitch = 0) => page.evaluate(([x, z, yaw, pitch]) => {
  const p = window.__player; p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = pitch; p.vel.x = p.vel.z = 0; p.route = null; p.faceYaw = null
  window.__stores.player.setState({ route: null })
}, [x, z, yaw, pitch])
const sync = (page) => waitUntil(page, () => {
  const c = window.__camera.position, p = window.__player.pos
  return Math.abs(c.x - p.x) < 0.01 && Math.abs(c.z - p.z) < 0.01 && Math.abs(window.__camera.rotation.y - window.__player.yaw) < 0.01
})
const project = (page, [x, y, z]) => page.evaluate(([x, y, z]) => {
  const v = window.__camera.position.clone().set(x, y, z).project(window.__camera)
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, front: v.z < 1 }
}, [x, y, z])
const app = (page) => page.evaluate(() => { const s = window.__stores.app.getState(); return { dialogs: s.dialogs.length, menu: s.menuOpen, focus: s.focus.state } })

async function open(tag, { mode = null, viewport = { width: 1280, height: 720 }, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`) })
  await page.goto(`${BASE}?debug=x&tier=low&commerce=off`, { waitUntil: 'networkidle' })
  if (mode) await page.getByRole('radio', { name: new RegExp(C.onboarding.desktop.modes[mode].title) }).click()
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 60000 })
  await page.waitForFunction(() => window.__player && window.__camera && window.__stores, null, { timeout: 30000 })
  return { ctx, page }
}

// ── 1. Indietro del browser ────────────────────────────────────────────────
{
  const { ctx, page } = await open('indietro')
  const url = page.url()
  await page.evaluate(() => window.__stores.app.getState().openDialog('product', 'prod-001'))
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 1)
  await page.goBack()
  const closed = await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0, null, 5000)
  ok('Indietro con una scheda aperta: si chiude la scheda e si resta sul sito', closed && page.url() === url, page.url())

  await page.evaluate((lb) => { const s = window.__stores.app.getState(); s.openDialog('lookbook', lb); s.openDialog('product', 'prod-001') }, storeConfig.lookbook[0].id)
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 2)
  await page.goBack()
  const one = await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 1, null, 5000)
  ok('Indietro con due schede (Lookbook → capo): torna al Lookbook', one, JSON.stringify(await app(page)))
  await page.goBack()
  ok('Indietro ancora: si chiude anche il Lookbook', await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0, null, 5000))

  await page.evaluate(() => window.__stores.app.setState({ menuOpen: true }))
  await page.waitForTimeout(300)
  await page.goBack()
  ok('Indietro col menu aperto: si chiude il menu', await waitUntil(page, () => !window.__stores.app.getState().menuOpen, null, 5000))

  // Chiusura coi bottoni del sito: la voce di cronologia se ne va con la scheda.
  await page.evaluate(() => window.__stores.app.getState().openDialog('product', 'prod-002'))
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 1)
  await page.locator('[role="dialog"][data-dialog]').getByRole('button', { name: C.dialog.close, exact: true }).click()
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0)
  await page.waitForTimeout(400)
  ok('chiusa la scheda con "Chiudi", la cronologia non ha voci in più', await page.evaluate(() => !history.state?.intoLayer))

  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'focus', displayId: 'disp-mannequin-01' }))
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 60000)
  await page.goBack()
  ok('Indietro durante il Focus: si esce dal Focus', await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 30000))
  ok('dopo tutti gli Indietro si è ancora sul sito', page.url() === url)
  await ctx.close()
}

// ── 2. Solo mouse ──────────────────────────────────────────────────────────
{
  const { ctx, page } = await open('solo-mouse', { mode: 'mouse' })
  ok('solo mouse: scelta ricordata nello stato', await page.evaluate(() => window.__stores.app.getState().controlMode === 'mouse'))
  ok('solo mouse: nessun invito a catturare il cursore', !(await page.getByText(C.hud.lockPrompt).count()))
  await place(page, 0, 12, 0, -0.35); await sync(page)
  const before = await page.evaluate(() => ({ yaw: window.__player.yaw }))
  await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(820, 400, { steps: 6 }); await page.mouse.up()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => ({ yaw: window.__player.yaw, locked: Boolean(document.pointerLockElement) }))
  ok('solo mouse: trascinare gira la visuale, senza catturare il cursore', Math.abs(after.yaw - before.yaw) > 0.1 && !after.locked,
    `yaw ${before.yaw.toFixed(2)} → ${after.yaw.toFixed(2)}`)
  await place(page, 0, 12, 0, -0.35); await sync(page)
  const target = await project(page, [0, 0, 9.5])
  await page.mouse.click(target.x, target.y)
  const routed = await waitUntil(page, () => Boolean(window.__stores.player.getState().route), null, 5000)
  ok('solo mouse: click sul pavimento → il player ci va', routed)
  await page.screenshot({ path: `${OUT}/solo-mouse.png` })

  // ── 4. Muro ──
  await place(page, 0, 12, 0, 0); await sync(page)
  await page.evaluate(() => window.__stores.app.setState({ notice: null }))
  // Muro di fondo dal config (fase C: da z = −18 a −6), lontano dal pannello del Lookbook.
  const northWall = storeConfig.colliders.find((c) => c.id === 'col-wall-n')
  const wallFace = northWall.center[2] + northWall.size[2] / 2
  const wall = await project(page, [8, 1.2, wallFace + 0.02])
  await page.mouse.click(wall.x, wall.y)
  const toWall = await waitUntil(page, () => Boolean(window.__stores.player.getState().route), null, 5000)
  const end = await page.evaluate(() => window.__stores.player.getState().route?.points.at(-1))
  const notice = await page.evaluate(() => window.__stores.app.getState().notice?.text ?? null)
  ok('click su un muro: si va al punto libero più vicino lì davanti, senza "c\'è un muro"',
    toWall && end && end[1] < wallFace + 2.8 && notice !== C.hints.wall, `arrivo ${end?.map((v) => v.toFixed(2))} · avviso ${notice}`)
  await ctx.close()
}

// ── 3 e 6. Avviso del capo da dietro, indicatore a terra ───────────────────
{
  const { ctx, page } = await open('dietro', { mode: 'mouse' })
  const poi = storeConfig.pois.find((p) => p.id === 'poi-new-01')
  // Dietro il manichino (z minore), dentro il raggio di attivazione, voltati altrove.
  await place(page, -7.7, 5.1, yawTo(-7.7, 5.1, -7.7, 2)); await sync(page)
  const active = await waitUntil(page, (id) => window.__stores.player.getState().activePoiId === id, poi.id, 10000)
  const prompt = page.getByTestId('proximity-prompt')
  ok('da dietro il manichino compare l\'avviso del capo, ed è un bottone', active && await prompt.isVisible() && await prompt.isEnabled())
  await prompt.click()
  const focused = await waitUntil(page, () => window.__stores.app.getState().focus.state !== 'idle', null, 10000)
  const f = await page.evaluate(() => window.__stores.app.getState().focus.displayId)
  ok('toccando l\'avviso da dietro si apre il Focus del capo', focused && f === poi.targetDisplayId, f)
  await page.evaluate(() => window.__stores.app.getState().exitFocus())
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 30000)

  // Indicatore a terra: dall'ingresso del corridoio, guardando in basso.
  await place(page, -6.5, 10.5, yawTo(-6.5, 10.5, -7.3, 7.4), -0.75); await sync(page)
  await waitUntil(page, (id) => window.__stores.player.getState().poiStates[id] !== 'hidden', poi.id, 10000)
  await page.waitForTimeout(500)
  const visible = await page.evaluate(([x, z]) => {
    let found = false
    window.__scene.traverse((o) => { if (o.isMesh && o.geometry?.type === 'RingGeometry' && Math.abs(o.getWorldPosition(o.position.clone()).x - x) < 0.05 && Math.abs(o.getWorldPosition(o.position.clone()).z - z) < 0.05 && o.parent.visible) found = true })
    return found
  }, poi.floorMarker)
  ok('indicatore a terra davanti al manichino, visibile', visible)
  await page.screenshot({ path: `${OUT}/indicatore-terra.png` })
  const m = await project(page, [poi.floorMarker[0], 0, poi.floorMarker[1]])
  await page.mouse.click(m.x, m.y)
  const went = await waitUntil(page, () => window.__stores.app.getState().focus.state !== 'idle' || Boolean(window.__stores.player.getState().route), null, 8000)
  ok('click sull\'indicatore a terra: ci si avvicina o si apre il Focus', went)
  await ctx.close()
}

// ── 5. Margine attorno agli espositori ──────────────────────────────────────
{
  const { ctx, page } = await open('margine')
  const col = storeConfig.colliders.find((c) => c.id === 'col-disp-mann-01')
  // Il collider del manichino è più largo del mobile disegnato (0,9 m) di 0,2 m per lato.
  ok('collider degli espositori allargati del margine', Math.abs(col.size[0] - 1.3) < 1e-6, `lato ${col.size[0]} m`)
  // Si cammina dritti contro il manichino: si scivola lungo il margine, mai dentro.
  await place(page, -7.7, 8.2, yawTo(-7.7, 8.2, -7.7, 6.6)); await sync(page)
  const r = storeConfig.navigation.player.radius
  const samples = []
  await page.keyboard.down('KeyW')
  for (let i = 0; i < 30; i++) {
    samples.push(await page.evaluate(() => [window.__player.pos.x, window.__player.pos.z]))
    await page.waitForTimeout(80)
  }
  await page.keyboard.up('KeyW')
  // Stesso modello della fisica: cerchio del player contro il box ad angoli arrotondati.
  const inside = samples.filter((q) => circleOverlapsCollider(q, col, r - 0.02))
  const nearest = Math.min(...samples.map((q) => Math.hypot(q[0] - col.center[0], q[1] - col.center[2])))
  ok('camminando contro il manichino si resta sempre fuori dal margine', samples.length === 30 && !inside.length,
    `${samples.length} posizioni, ${inside.length} dentro · minima distanza dal centro ${nearest.toFixed(2)} m`)
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s.padEnd(4)} ${n}${note ? `  (${note})` : ''}`)
if (errors.length) console.log(`\nERRORI IN CONSOLE:\n${errors.join('\n')}`)
const failed = results.filter(([s]) => s === 'FAIL').length
console.log(`\n${results.length - failed}/${results.length} verifiche superate${errors.length ? `, ${errors.length} errori in console` : ''}`)
process.exit(failed || errors.length ? 1 : 0)
