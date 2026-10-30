import { chromium } from 'playwright-core'
import { chromiumArgs, chromiumPath, localBase, outDir } from './launchOptions.mjs'
import { storeConfig } from '../../src/config/storeConfig.js'
import { circleOverlapsCollider, pointInCollider } from '../../src/lib/geometry.js'

const BASE = localBase(process.argv[2]), OUT = outDir(process.argv[3])
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: chromiumArgs(),
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const R = storeConfig.navigation.player.radius
const overlap = (p) => storeConfig.colliders.find((c) => circleOverlapsCollider([p.x, p.z], c, R - 1e-3))

async function open(name, { mobile }) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1,
  })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] ${e.message}`))
  await page.goto(BASE + '?debug=x', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
  await page.waitForFunction(() => window.__player && window.__camera, null, { timeout: 15000 })
  await page.waitForTimeout(500)
  return { ctx, page }
}
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 100 }).then(() => true).catch(() => false)
const routeDone = (page, timeout) => waitUntil(page, () => !window.__stores.player.getState().route && !window.__player.teleport, null, timeout)
const settled = (page, timeout = 20000) => page.evaluate(async (timeout) => {
  const t0 = performance.now(); let last = { ...window.__player.pos }; let still = 0
  while (performance.now() - t0 < timeout) {
    await new Promise((r) => setTimeout(r, 250))
    const p = window.__player.pos
    still = Math.hypot(p.x - last.x, p.z - last.z) < 0.003 ? still + 250 : 0
    last = { ...p }
    if (still >= 1000) return true
  }
  return false
}, timeout)
const pos = (page) => page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z, yaw: window.__player.yaw }))
const startTrace = (page) => page.evaluate(() => { window.__trace = []; window.__traceId = setInterval(() => window.__trace.push({ x: window.__player.pos.x, z: window.__player.pos.z }), 40) })
const stopTrace = async (page) => page.evaluate(() => { clearInterval(window.__traceId); return window.__trace })
const place = (page, x, z, yaw = 0) => page.evaluate(([x, z, yaw]) => { const p = window.__player; p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = 0; p.vel.x = p.vel.z = 0; p.route = null; p.faceYaw = null; window.__stores.player.setState({ route: null }) }, [x, z, yaw])
const project = (page, [x, y, z]) => page.evaluate(([x, y, z]) => {
  const v = window.__camera.position.clone().set(x, y, z).project(window.__camera)
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { sx: r.left + (v.x + 1) / 2 * r.width, sy: r.top + (1 - v.y) / 2 * r.height, front: v.z < 1 }
}, [x, y, z])

// ============================ DESKTOP ============================
{
  const { ctx, page } = await open('desktop', {})
  const p0 = await pos(page)
  ok('desktop: spawn all\'ingresso, rivolto verso l\'interno', Math.abs(p0.x) < 0.05 && Math.abs(p0.z - 15.5) < 0.05 && Math.abs(p0.yaw) < 0.01, JSON.stringify(p0))
  ok('desktop: invito al click visibile senza Pointer Lock', await page.getByText(storeConfig.copy.hud.lockPrompt).isVisible())

  await page.keyboard.down('KeyW')
  const walked = await waitUntil(page, (z0) => z0 - window.__player.pos.z > 2, p0.z, 20000)
  await page.keyboard.up('KeyW'); await settled(page)
  const p1 = await pos(page)
  ok('desktop: W fa avanzare dritto verso l\'interno', walked && Math.abs(p1.x) < 0.2, `Δz = ${(p0.z - p1.z).toFixed(2)} m, deriva laterale ${Math.abs(p1.x).toFixed(3)} m`)

  // Il fondo del negozio dal config (fase C, 2026-10-19: era z = −17, ora −5): limite dell'area calpestabile.
  const backZ = storeConfig.navigation.walkableAreas[0].bounds[0][1]
  await place(page, 0, backZ + 3)
  await startTrace(page)
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW')
  await waitUntil(page, (z) => window.__player.pos.z < z + 0.1, backZ, 30000)
  await page.waitForTimeout(3000)
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft')
  const traceWall = await stopTrace(page)
  const pw = await pos(page)
  ok('desktop: correndo contro il muro nord e insistendo, non si entra mai nel muro', !traceWall.find(overlap) && pw.z >= backZ - 0.001 && pw.z < backZ + 0.1, `${traceWall.length} campioni, z finale ${pw.z.toFixed(3)}`)

  await place(page, -9, 7, 0)
  await startTrace(page)
  await page.keyboard.down('KeyW')
  await waitUntil(page, () => window.__player.pos.z < 4.8, null, 30000)
  await page.waitForTimeout(2000)
  await page.keyboard.up('KeyW')
  const traceCol = await stopTrace(page)
  const pc = await pos(page)
  ok('desktop: camminando dritto contro una colonna ci si ferma davanti', !traceCol.find(overlap) && pc.z > 4.65 && pc.z < 4.8, `z finale ${pc.z.toFixed(3)} (faccia colonna + raggio = 4.70)`)

  await place(page, 0, 10, 0)
  await page.keyboard.down('KeyW'); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^menu$/i }).click()
  const pm1 = await pos(page); await page.waitForTimeout(700); const pm2 = await pos(page)
  ok('desktop: con il menu aperto il player è fermo, anche con W ancora premuto', Math.hypot(pm2.x - pm1.x, pm2.z - pm1.z) < 0.01)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const pe1 = await pos(page); await page.waitForTimeout(1500); const pe2 = await pos(page)
  ok('desktop: chiuso il menu, il player NON riparte da solo', Math.hypot(pe2.x - pe1.x, pe2.z - pe1.z) < 0.01, `deriva ${Math.hypot(pe2.x - pe1.x, pe2.z - pe1.z).toFixed(3)} m`)
  await page.keyboard.up('KeyW')

  // Perdita di focus: i tasti si azzerano e il player si ferma (con la sua frenata), non cammina da solo.
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const keysAfterBlur = await page.evaluate(() => window.__player.keys.size)
  const stopped = await settled(page, 8000)
  const pb1 = await pos(page); await page.waitForTimeout(1500); const pb2 = await pos(page)
  ok('desktop: perdendo il focus i tasti vengono rilasciati e il player si ferma', keysAfterBlur === 0 && stopped && Math.hypot(pb2.x - pb1.x, pb2.z - pb1.z) < 0.005, `tasti attivi dopo il blur: ${keysAfterBlur}`)
  await page.keyboard.up('KeyD')

  await page.mouse.click(720, 300)
  await page.waitForTimeout(500)
  const locked = await page.evaluate(() => document.pointerLockElement?.tagName ?? null)
  if (locked === 'CANVAS') {
    const y0 = (await pos(page)).yaw
    await page.mouse.move(820, 300, { steps: 5 }); await page.waitForTimeout(300)
    const y1 = (await pos(page)).yaw
    ok('desktop: click → Pointer Lock attivo, il mouse ruota la visuale', Math.abs(y1 - y0) > 0.01, `Δyaw ${(y1 - y0).toFixed(3)} rad`)
    ok('desktop: a cursore catturato compare il mirino e sparisce l\'invito', !(await page.getByText(storeConfig.copy.hud.lockPrompt).isVisible()))
    await page.screenshot({ path: `${OUT}/desktop-locked.png` })
    await page.getByRole('button', { name: /^menu$/i }).evaluate((b) => b.click())
    await page.waitForTimeout(300)
    ok('desktop: aprendo il menu il Pointer Lock viene rilasciato', await page.evaluate(() => !document.pointerLockElement))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    ok('desktop: chiuso il menu, il Pointer Lock NON si riattiva da solo', await page.evaluate(() => !document.pointerLockElement))
  } else {
    results.push(['skip', 'desktop: Pointer Lock — non concesso dal Chromium headless di questo ambiente', `pointerLockElement = ${locked}`])
  }

  await page.evaluate(() => { window.__fadeSeen = false; window.__stores.player.subscribe((s) => { if (s.fading) window.__fadeSeen = true }) })
  await page.getByRole('button', { name: /^menu$/i }).click()
  await page.getByRole('button', { name: /^(\d+\s*)?Nuovi Arrivi/i }).click()
  await waitUntil(page, () => Math.hypot(window.__player.pos.x + 6.5, window.__player.pos.z - 9) < 0.05 && !window.__stores.player.getState().fading, null, 20000)
  await page.waitForTimeout(1200)
  const pt = await pos(page)
  const fadeSeen = await page.evaluate(() => window.__fadeSeen)
  ok('desktop: "Vai a → Nuovi Arrivi" teletrasporta al waypoint, con dissolvenza', Math.hypot(pt.x + 6.5, pt.z - 9) < 0.05 && fadeSeen, `dissolvenza osservata: ${fadeSeen}`)
  const st = await page.evaluate(() => window.__stores.player.getState())
  ok('desktop: vicino all\'espositore l\'hotspot diventa attivo', st.activePoiId === 'poi-new-01', `activePoiId = ${st.activePoiId}`)
  // Dalla Fase 4 l'esame esiste: il prompt mostra il comando, non più "in arrivo".
  ok('desktop: il prompt dell\'hotspot attivo mostra il comando per esaminare', await page.getByText('Click per esaminare').first().isVisible() && !(await page.getByText(/In arrivo nella Fase 4/i).first().isVisible().catch(() => false)))
  ok('desktop: la zona nell\'HUD segue il player', (await page.getByTestId('zone-label').textContent()) === 'Nuovi Arrivi')
  await page.screenshot({ path: `${OUT}/desktop-proximity.png` })
  await ctx.close()
}

// ============================ MOBILE ============================
{
  const { ctx, page } = await open('mobile', { mobile: true })
  ok('mobile: barra di teletrasporto visibile', await page.getByRole('navigation', { name: /vai a/i }).isVisible())
  ok('mobile: nessun invito al Pointer Lock su touch', !(await page.getByText(storeConfig.copy.hud.lockPrompt).isVisible()))
  await page.screenshot({ path: `${OUT}/mobile-start.png` })

  const target = await project(page, [1.5, 0, 9])
  await startTrace(page)
  await page.touchscreen.tap(target.sx, target.sy)
  await page.waitForTimeout(300)
  const route = await page.evaluate(() => window.__stores.player.getState().route)
  await page.screenshot({ path: `${OUT}/mobile-route.png` })
  await routeDone(page, 30000); await settled(page)
  const tr = await stopTrace(page)
  const pa = await pos(page)
  ok('mobile: tap sul pavimento → percorso e arrivo sul punto toccato', !!route && Math.hypot(pa.x - 1.5, pa.z - 9) < 0.45, `arrivo a ${pa.x.toFixed(2)},${pa.z.toFixed(2)}`)
  ok('mobile: durante il tragitto mai dentro un collider', !tr.find(overlap), `${tr.length} campioni`)

  await place(page, 0, 14, 0); await page.waitForTimeout(300)
  const fps = await page.evaluate(async () => { const a = window.__gl?.info.render.frame ?? 0; const t = performance.now(); await new Promise((r) => setTimeout(r, 1000)); return ((window.__gl?.info.render.frame ?? 0) - a) / ((performance.now() - t) / 1000) })
  const t0 = await page.evaluate(() => [performance.now(), window.__player.pos.z])
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2000); await page.keyboard.up('KeyW')
  const t1 = await page.evaluate(() => [performance.now(), window.__player.pos.z])
  const speed = (t0[1] - t1[1]) / ((t1[0] - t0[0]) / 1000)
  ok('mobile: a pochi fps la camminata resta in tempo reale (non al rallentatore)', speed > storeConfig.navigation.player.walkSpeed * 0.8,
    `${speed.toFixed(2)} m/s misurati su ${storeConfig.navigation.player.walkSpeed} attesi, a ${fps ? fps.toFixed(1) : '?'} fps`)
  await settled(page)

  const before = await pos(page)
  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const ev = (type, x) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: 400, bubbles: true, isPrimary: true }))
    ev('pointerdown', 100); for (let x = 110; x <= 260; x += 10) ev('pointermove', x); ev('pointerup', 260)
  })
  await page.waitForTimeout(500)
  const after = await pos(page)
  const routeAfterDrag = await page.evaluate(() => window.__stores.player.getState().route)
  ok('mobile: trascinare ruota la visuale e non avvia spostamenti', Math.abs(after.yaw - before.yaw) > 0.3 && Math.hypot(after.x - before.x, after.z - before.z) < 0.02 && !routeAfterDrag,
    `Δyaw ${(after.yaw - before.yaw).toFixed(2)} rad, spostamento ${Math.hypot(after.x - before.x, after.z - before.z).toFixed(3)} m`)

  await place(page, -9, 8.5, 0); await page.waitForTimeout(400)
  const col = await project(page, [-9, 1.5, 4.36])
  await page.touchscreen.tap(col.sx, col.sy); await page.waitForTimeout(300)
  const s1 = await page.evaluate(() => window.__stores.player.getState())
  // Dal 2026-10-17 (richiesta dell'utente) un tocco su un muro o una colonna porta al
  // punto libero più vicino lì davanti, invece di rifiutarlo.
  const colEnd = s1.route?.points.at(-1)
  ok('mobile: tap su una colonna → si va davanti alla colonna, fuori dal suo collider',
    Boolean(colEnd) && s1.ping?.ok === true && !storeConfig.colliders.some((c) => pointInCollider(colEnd, c, storeConfig.navigation.player.radius)),
    colEnd ? `arrivo ${colEnd.map((v) => v.toFixed(2))}` : 'nessun percorso')

  await place(page, -9, 7, 0); await page.waitForTimeout(300)
  await startTrace(page)
  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'goto', point: [-9, 1] }))
  await page.waitForTimeout(300)
  const detour = await page.evaluate(() => window.__stores.player.getState().route?.points)
  await page.screenshot({ path: `${OUT}/mobile-detour.png` })
  await routeDone(page, 40000); await settled(page)
  const td = await stopTrace(page)
  const pd = await pos(page)
  ok('mobile: destinazione dietro una colonna → la aggira, non la attraversa',
    Math.hypot(pd.x + 9, pd.z - 1) < 0.45 && !td.find(overlap) && detour && detour.length > 2,
    `${detour ? detour.length - 1 : 0} tappe, arrivo ${pd.x.toFixed(2)},${pd.z.toFixed(2)}`)

  // Dalla Fase 4 il tap sull'hotspot di un espositore porta davanti e apre il Focus Mode.
  await place(page, -2.5, 10.5, 1.0); await page.waitForTimeout(500)
  const poi = storeConfig.pois.find((p) => p.id === 'poi-new-01')
  const hs = await project(page, poi.anchor)
  await page.touchscreen.tap(hs.sx, hs.sy)
  await page.waitForTimeout(300)
  const inFocus = await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 40000)
  const ph = await pos(page)
  const fdisp = await page.evaluate(() => window.__stores.app.getState().focus.displayId)
  const wantYaw = Math.atan2(-(poi.anchor[0] - ph.x), -(poi.anchor[2] - ph.z))
  ok('mobile: tap sull\'hotspot → raggiunge l\'avvicinamento, apre il Focus, e la posa di ritorno guarda l\'espositore',
    inFocus && fdisp === poi.targetDisplayId && Math.hypot(ph.x + 6.5, ph.z - 9) < 0.45 &&
    Math.abs(Math.atan2(Math.sin(ph.yaw - wantYaw), Math.cos(ph.yaw - wantYaw))) < 0.15,
    `espositore ${fdisp}, arrivo ${ph.x.toFixed(2)},${ph.z.toFixed(2)}`)
  await page.screenshot({ path: `${OUT}/mobile-hotspot.png` })
  await page.getByRole('button', { name: storeConfig.copy.focus.exit }).tap()
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 15000)
  const yAfter = (await pos(page)).yaw
  await page.waitForTimeout(800)
  const yLater = (await pos(page)).yaw
  ok('mobile: uscito dal Focus la camera resta ferma (nessuna rotazione residua)', Math.abs(yLater - yAfter) < 0.002, `Δyaw ${(yLater - yAfter).toFixed(4)} rad`)

  // Waypoint del Lookbook dal config (fase C, 2026-10-19: era a z = −9).
  const lookWp = storeConfig.navigation.waypoints.find((w) => w.id === 'wp-look-01').position
  await page.getByRole('navigation', { name: /vai a/i }).getByRole('button', { name: /lookbook/i }).tap()
  await waitUntil(page, ([x, z]) => Math.hypot(window.__player.pos.x - x, window.__player.pos.z - z) < 0.05 && !window.__player.teleport, [lookWp[0], lookWp[2]], 15000)
  await page.waitForTimeout(1200)
  const pl = await pos(page)
  ok('mobile: barra "Lookbook" → teletrasporto al waypoint sicuro', Math.hypot(pl.x - lookWp[0], pl.z - lookWp[2]) < 0.05, `${pl.x.toFixed(2)}, ${pl.z.toFixed(2)}`)
  await page.screenshot({ path: `${OUT}/mobile-lookbook.png` })
  await ctx.close()
}

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : s === 'skip' ? '  –' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti, ${results.filter((r) => r[0] === 'skip').length} non verificabili qui`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
