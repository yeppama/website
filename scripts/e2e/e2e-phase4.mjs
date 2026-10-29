import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase } from './launchOptions.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'

const BASE = localBase(process.argv[2]), OUT = process.argv[3]
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: chromiumArgs(),
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const display = (id) => storeConfig.displays.find((d) => d.id === id)
const spotBase = (id) => storeConfig.lighting.spots.find((s) => s.id === id).intensity

async function open(name, { mobile, reducedMotion, tier } = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] ${e.message}`))
  await page.goto(BASE + '?debug=x' + (tier ? `&tier=${tier}` : ''), { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__player && window.__camera && window.__scene, null, { timeout: 15000 })
  await page.waitForTimeout(400)
  return { ctx, page }
}
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const focusState = (page) => page.evaluate(() => window.__stores.app.getState().focus)
const cam = (page) => page.evaluate(() => ({ x: window.__camera.position.x, y: window.__camera.position.y, z: window.__camera.position.z, fov: window.__camera.fov }))
const player = (page) => page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z, yaw: window.__player.yaw, pitch: window.__player.pitch }))
const place = (page, x, z, yaw = 0) => page.evaluate(([x, z, yaw]) => { const p = window.__player; p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = 0; p.vel.x = p.vel.z = 0; p.route = null; p.faceYaw = null; window.__stores.player.setState({ route: null }) }, [x, z, yaw])
// Aspetta che la camera abbia raggiunto il player: a pochi fps, dopo place()
// passa almeno un fotogramma prima che la scena rifletta la nuova posa.
const sync = (page) => waitUntil(page, () => {
  const c = window.__camera.position, p = window.__player.pos
  return Math.abs(c.x - p.x) < 0.01 && Math.abs(c.z - p.z) < 0.01 &&
    Math.abs(window.__camera.rotation.y - window.__player.yaw) < 0.01 && window.__stores.player.getState().pose
}, null, 20000)
const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz))
const lights = (page) => page.evaluate(() => { const out = []; window.__scene.traverse((o) => { if (o.isSpotLight) out.push({ x: +o.position.x.toFixed(2), z: +o.position.z.toFixed(2), i: o.intensity }) }); return out })
const spotAt = (ls, id) => { const s = storeConfig.lighting.spots.find((x) => x.id === id); return ls.find((l) => Math.abs(l.x - s.position[0]) < 0.01 && Math.abs(l.z - s.position[2]) < 0.01) }
const project = (page, [x, y, z]) => page.evaluate(([x, y, z]) => {
  const v = window.__camera.position.clone().set(x, y, z).project(window.__camera)
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { sx: r.left + (v.x + 1) / 2 * r.width, sy: r.top + (1 - v.y) / 2 * r.height }
}, [x, y, z])
const dist3 = (a, b) => Math.hypot(a.x - b[0], a.y - b[1], a.z - b[2])

// ============================ DESKTOP ============================
{
  const { ctx, page } = await open('desktop', { tier: 'high' })
  const d1 = display('disp-mannequin-01')

  // Davanti al manichino 01, mirino puntato sul busto.
  await place(page, -6.5, 9, yawTo(-6.5, 9, -7.7, 6.6))
  await sync(page); await page.waitForTimeout(400)
  await page.mouse.click(640, 300) // gesto esplicito → Pointer Lock
  await waitUntil(page, () => document.pointerLockElement?.tagName === 'CANVAS', null, 5000)
  const before = await player(page)
  await page.mouse.click(640, 360) // click a cursore catturato → Focus
  const entered = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 15000)
  const f = await focusState(page)
  ok('desktop: click col mirino sul manichino → Focus Mode sul suo espositore', entered && f.displayId === 'disp-mannequin-01', `stato ${f.state}, espositore ${f.displayId}`)
  ok('desktop: entrando nel Focus il cursore viene liberato', await page.evaluate(() => !document.pointerLockElement))
  await page.waitForTimeout(300)
  const c = await cam(page)
  ok('desktop: la camera raggiunge la posa di Focus configurata', dist3(c, d1.focusCamera.position) < 0.08 && Math.abs(c.fov - d1.focusCamera.fov) < 0.01, `scarto ${dist3(c, d1.focusCamera.position).toFixed(3)} m, fov ${c.fov.toFixed(1)}`)
  ok('desktop: il pannello mostra il prodotto dell\'espositore', await page.getByRole('heading', { name: 'Heavy Hoodie' }).isVisible())
  await page.screenshot({ path: `${OUT}/desktop-focus-mannequin.png` })

  // Luci: il faretto dell'espositore sale, gli altri scendono.
  await page.waitForTimeout(900)
  const lf = await lights(page)
  const sFocus = spotAt(lf, 'spot-hall-studio'), sOther = spotAt(lf, 'spot-hall-flame')
  // I fattori si leggono dal config: il test non deve ricopiare valori di taratura.
  const L = storeConfig.focus.lighting
  const near = (v, want) => Math.abs(v - want) <= want * 0.05
  ok('desktop: in Focus il faretto dell\'espositore sale e gli altri si abbassano, dei fattori configurati',
    near(sFocus.i, spotBase('spot-hall-studio') * L.spotBoost) && near(sOther.i, spotBase('spot-hall-flame') * L.othersDim),
    `faretto espositore ${sFocus.i.toFixed(0)} (base ${spotBase('spot-hall-studio')}), altro ${sOther.i.toFixed(0)} (base ${spotBase('spot-hall-flame')})`)

  // Input congelati.
  await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW')
  await page.mouse.move(900, 200, { steps: 4 }); await page.waitForTimeout(200)
  const frozen = await player(page)
  ok('desktop: in Focus tastiera e mouse non muovono il player', Math.hypot(frozen.x - before.x, frozen.z - before.z) < 0.001 && Math.abs(frozen.yaw - before.yaw) < 0.001)

  // Uscita con ESC: la camera torna esattamente alla posa del player.
  await page.keyboard.press('Escape')
  const exited = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000)
  await page.waitForTimeout(200)
  const back = await cam(page)
  const pAfter = await player(page)
  ok('desktop: ESC → uscita, camera esattamente dove il player l\'aveva lasciata',
    exited && dist3(back, [pAfter.x, storeConfig.navigation.player.eyeHeight, pAfter.z]) < 0.005 && Math.abs(pAfter.yaw - before.yaw) < 0.001,
    `scarto ${dist3(back, [pAfter.x, storeConfig.navigation.player.eyeHeight, pAfter.z]).toFixed(4)} m`)
  ok('desktop: uscendo dal Focus il Pointer Lock NON si riattiva da solo', await page.evaluate(() => !document.pointerLockElement))
  ok('desktop: uscendo il pannello sparisce', !(await page.getByRole('heading', { name: 'Heavy Hoodie' }).isVisible()))
  await page.waitForTimeout(1200)
  const lr = await lights(page)
  ok('desktop: dopo l\'uscita le luci tornano ai valori di partenza',
    Math.abs(spotAt(lr, 'spot-hall-studio').i - spotBase('spot-hall-studio')) < spotBase('spot-hall-studio') * 0.05 &&
    Math.abs(spotAt(lr, 'spot-hall-flame').i - spotBase('spot-hall-flame')) < spotBase('spot-hall-flame') * 0.05)
  await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.up('KeyW')
  const moved = await player(page)
  ok('desktop: dopo l\'uscita il player cammina di nuovo', Math.hypot(moved.x - pAfter.x, moved.z - pAfter.z) > 0.2)

  // Plinto: due prodotti, si scorrono.
  await place(page, 6.5, 9, yawTo(6.5, 9, 6.5, 7)); await sync(page); await page.waitForTimeout(400)
  await page.mouse.click(640, 300)
  await waitUntil(page, () => document.pointerLockElement?.tagName === 'CANVAS', null, 5000)
  await page.mouse.click(640, 360)
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 15000)
  const n1 = await page.getByRole('heading', { level: 2 }).textContent()
  await page.getByRole('button', { name: storeConfig.copy.focus.next }).click()
  await page.waitForTimeout(400)
  const n2 = await page.getByRole('heading', { level: 2 }).textContent()
  ok('desktop: sul plinto si scorrono i due prodotti', n1 === 'Cargo Pant' && n2 === 'Box Tee', `${n1} → ${n2}`)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/desktop-focus-plinth.png` })
  await page.getByRole('button', { name: storeConfig.copy.focus.exit }).click()
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000)
  await ctx.close()
}

// ============================ INTERRUZIONE ============================
// Contesto piccolo e tier low: fotogrammi abbastanza fitti da premere ESC
// davvero a metà della transizione d'ingresso (1,1 s).
{
  const ctx = await browser.newContext({ viewport: { width: 480, height: 320 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => consoleErrors.push(`[interrupt] ${e.message}`))
  await page.goto(BASE + '?debug=x&tier=low', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__player && window.__camera, null, { timeout: 15000 })
  await place(page, -6.5, 9, yawTo(-6.5, 9, -7.7, 6.6)); await sync(page)
  const p0 = await player(page)
  await page.evaluate(() => {
    const p = window.__player
    window.__stores.app.getState().enterFocus('disp-mannequin-01', { x: p.pos.x, z: p.pos.z, eye: 1.65, yaw: p.yaw, pitch: p.pitch, fov: window.__camera.fov })
  })
  await page.waitForTimeout(450)
  const mid = await focusState(page)
  const cMid = await cam(page)
  await page.keyboard.press('Escape')
  const back = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000)
  const cBack = await cam(page)
  const target = display('disp-mannequin-01').focusCamera.position
  ok('ESC a metà ingresso: interrompe dal punto in cui si trova e torna alla posa di partenza',
    mid.state === 'entering' && dist3(cMid, target) > 0.2 && back && dist3(cBack, [p0.x, storeConfig.navigation.player.eyeHeight, p0.z]) < 0.005,
    `stato a ESC: ${mid.state}, camera a ${dist3(cMid, target).toFixed(2)} m dalla posa di Focus`)
  await ctx.close()
}

// ============================ MOBILE ============================
{
  const { ctx, page } = await open('mobile', { mobile: true })
  // Dall'ingresso: tap sul busto del manichino 02, lontano → cammina, poi apre il Focus.
  await page.evaluate(([yaw]) => { window.__player.yaw = yaw }, [yawTo(0, 15.5, -5.3, 6.6)])
  await sync(page); await page.waitForTimeout(300)
  const t = await project(page, [-5.3, 1.25, 6.6])
  await page.touchscreen.tap(t.sx, t.sy)
  await page.waitForTimeout(300)
  const walking = await page.evaluate(() => !!window.__stores.player.getState().route)
  const focused = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 40000)
  const f = await focusState(page)
  const pp = await player(page)
  ok('mobile: tap su un espositore lontano → cammina fino all\'avvicinamento e apre il Focus',
    walking && focused && f.displayId === 'disp-mannequin-02' && Math.hypot(pp.x + 6.5, pp.z - 9) < 0.45,
    `percorso: ${walking}, espositore ${f.displayId}, player a ${pp.x.toFixed(2)},${pp.z.toFixed(2)}`)
  ok('mobile: in Focus barra di teletrasporto e menu spariscono', !(await page.getByRole('navigation', { name: /vai a/i }).isVisible()) && !(await page.getByRole('button', { name: /^menu$/i }).isVisible()))
  ok('mobile: il pannello mostra il prodotto', await page.getByRole('heading', { name: 'Work Jacket' }).isVisible())
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/mobile-focus-jacket.png` })
  await page.getByRole('button', { name: storeConfig.copy.focus.exit }).tap()
  const out = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000)
  const c = await cam(page)
  ok('mobile: "Esci" riporta la camera alla posa del player', out && dist3(c, [pp.x, storeConfig.navigation.player.eyeHeight, pp.z]) < 0.005)
  await ctx.close()
}

// ============================ RIDUCI ANIMAZIONI ============================
{
  const { ctx, page } = await open('reduced', { reducedMotion: true })
  await place(page, 6.5, 9, yawTo(6.5, 9, 6.5, 7)); await sync(page)
  // Campiona la camera a ogni fotogramma: con "riduci animazioni" non deve
  // esistere alcuna posizione intermedia fra la posa del player e quella di Focus.
  await page.evaluate(() => {
    window.__samples = []
    const loop = () => { const c = window.__camera.position; window.__samples.push([c.x, c.y, c.z]); window.__raf = requestAnimationFrame(loop) }
    loop()
    const p = window.__player
    window.__stores.app.getState().enterFocus('disp-plinth-01', { x: p.pos.x, z: p.pos.z, eye: 1.65, yaw: p.yaw, pitch: p.pitch, fov: window.__camera.fov })
  })
  const reached = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 20000)
  await page.waitForTimeout(300)
  const samples = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__samples })
  const start = samples[0]
  const goal = display('disp-plinth-01').focusCamera.position
  const between = samples.filter((p) => Math.hypot(p[0] - start[0], p[1] - start[1], p[2] - start[2]) > 0.01 && Math.hypot(p[0] - goal[0], p[1] - goal[1], p[2] - goal[2]) > 0.06)
  ok('riduci animazioni: il Focus è un taglio netto, senza viaggio di camera', reached && between.length === 0,
    `${samples.length} fotogrammi campionati, ${between.length} in posizione intermedia`)
  await ctx.close()
}

// ============================ OMBRE E COSTO ============================
for (const tier of ['low', 'high']) {
  const { ctx, page } = await open('shadows-' + tier, { tier })
  await place(page, -2.5, 10.5, yawTo(-2.5, 10.5, -7, 6.5))
  await sync(page); await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    let blobs = 0; let casters = 0
    window.__scene.traverse((o) => {
      if (o.isMesh && o.material.isMeshBasicMaterial && o.material.map && o.material.color.getHex() === 0) blobs++
      if (o.isMesh && o.castShadow) casters++
    })
    return { blobs, casters, calls: window.__gl.info.render.calls, tris: window.__gl.info.render.triangles, shadowMap: window.__gl.shadowMap.enabled }
  })
  const expectedBlobs = storeConfig.environment.architecture.columns.length + storeConfig.displays.filter((d) => d.groundShadow).length
  if (tier === 'low') ok('tier low: ombre blob sotto colonne ed espositori, nessuna shadow map', r.blobs === expectedBlobs && !r.shadowMap, `${r.blobs} blob su ${expectedBlobs} attesi`)
  else ok('tier high: shadow map attiva e nessuna ombra blob', r.blobs === 0 && r.shadowMap, `${r.casters} mesh proiettano ombra`)
  const budget = storeConfig.performance.budgets.drawCalls[tier]
  ok(`tier ${tier}: costo nella zona più densa entro il budget`, r.calls <= budget && r.tris <= storeConfig.performance.budgets.triangles[tier],
    `${r.calls} draw call (budget ${budget}), ${r.tris} triangoli`)
  if (tier === 'high') await page.screenshot({ path: `${OUT}/overview-new-high.png` })
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
