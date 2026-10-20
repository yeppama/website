/**
 * Allestimento "cantiere" (docs/cantiere/PIANO.md, fasi 1 e 2), aperto con ?allestimento=cantiere:
 * stanza e capi 3D caricati, camminata e collisioni, Focus su rack, catena e tavolo, scheda
 * del capo, Lookbook dai pannelli luminosi, "Vai a", minimappa, Indietro del browser,
 * indicatore a terra; Bloom vero solo sul tier high (fase 2); zoom per capo sul rack e catene
 * contro la parete sud senza sacche (2026-10-19). Il negozio senza parametro resta quello di prima (le altre suite).
 *   node scripts/e2e/e2e-cantiere.mjs <base> <cartella-output>
 */
import { chromium } from 'playwright-core'

// Il config letto qui deve essere quello della pagina: allestimento del cantiere e contenuto
// della build (VITE_CONTENT da .env, come fa Vite).
import { readFileSync, existsSync } from 'node:fs'
process.env.VITE_LAYOUT = 'cantiere'
const envFile = new URL('../../.env', import.meta.url)
const fromEnv = existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^VITE_CONTENT=(\w+)/m)?.[1] : null
if (fromEnv) process.env.VITE_CONTENT ??= fromEnv
const { storeConfig } = await import('../../src/config/storeConfig.js')
const { circleOverlapsCollider } = await import('../../src/lib/geometry.js')
const { focusItemPose } = await import('../../src/lib/focusItems.js')

const [BASE, OUT] = process.argv.slice(2)
const C = storeConfig.copy
const R = storeConfig.navigation.player.radius
const wp = (id) => storeConfig.navigation.waypoints.find((w) => w.id === id).position
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
const app = (page) => page.evaluate(() => {
  const s = window.__stores.app.getState()
  return { dialogs: s.dialogs.map((d) => `${d.kind}:${d.id}`), focus: s.focus.state, displayId: s.focus.displayId, index: s.focus.productIndex }
})
const focusOn = async (page, displayId) => {
  await page.evaluate((id) => window.__stores.player.getState().issue({ type: 'focus', displayId: id }), displayId)
  return waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 90000)
}
const exitFocus = async (page) => {
  await page.evaluate(() => window.__stores.app.getState().exitFocus())
  return waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 60000)
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(`${BASE}?allestimento=cantiere&debug=x&tier=low&commerce=off`, { waitUntil: 'networkidle' })
await page.getByRole('radio', { name: new RegExp(C.onboarding.desktop.modes.mouse.title) }).click()
await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 90000 })
await page.waitForFunction(() => window.__player && window.__camera && window.__stores && window.__warmedUp, null, { timeout: 90000 })

// ── Stanza e capi ──────────────────────────────────────────────────────────
const scene = await page.evaluate(() => {
  let glb = 0, textured = 0
  window.__scene.traverse((o) => {
    if (o.isMesh && o.userData.prepared) glb++
    if (o.isMesh && o.material?.map?.image?.width > 64) textured++
  })
  return { glb, textured }
})
// Capi appesi col GLB (rack e catene); sul tavolo sono pile piegate.
const hanging = new Set(storeConfig.displays.filter((d) => d.kind !== 'blockTable').map((d) => d.id))
const glbProducts = storeConfig.products.filter((p) => hanging.has(p.displayId) && p.model3d?.glb).length
ok('capi 3D caricati su rack e catene (uno per capo col GLB)', scene.glb === glbProducts, `${scene.glb} mesh GLB, ${glbProducts} capi col GLB (contenuto ${process.env.VITE_CONTENT ?? 'into'})`)
ok('stanza con le texture (pareti, pavimento, poster, pannelli)', scene.textured >= 10, `${scene.textured} mesh con texture`)
// Fase B (2026-10-19): niente catena a terra, catene lungo la parete sud, punti luce arancioni.
{
  const env = storeConfig.environment
  const lights = await page.evaluate(() => { let n = 0; window.__scene.traverse((o) => { if (o.isPointLight) n++ }); return n })
  const links = await page.evaluate(() => { let n = 0; window.__scene.traverse((o) => { if (o.isInstancedMesh && o.geometry.type === 'TorusGeometry') n += o.count }); return n })
  const south = env.cantiere.chains.filter((c) => c.from[2] > env.floor.size[1] / 2 - 0.3).length
  ok('catene: nessuna a terra, almeno 4 di contorno lungo la parete sud', !env.cantiere.floorChain && south >= 4, `${south} sulla parete sud, ${links} anelli in scena`)
  ok('tier low: punti luce arancioni senza luci vere in più (solo il neon)', env.accentLights.length > 0 && lights === 1, `${env.accentLights.length} barre, ${lights} luci puntiformi`)
}
const spawn = await page.evaluate(() => [window.__player.pos.x, window.__player.pos.z])
const entrance = wp(storeConfig.environment.entrance.waypointId)
ok('si entra dall\'ingresso del cantiere', Math.hypot(spawn[0] - entrance[0], spawn[1] - entrance[2]) < 0.3, spawn.map((v) => v.toFixed(2)).join(', '))
await sync(page)
await page.screenshot({ path: `${OUT}/cantiere-ingresso.png` })

// ── Minimappa ──────────────────────────────────────────────────────────────
const [W, D] = storeConfig.environment.floor.size
ok('minimappa della stanza 10 × 8', await page.getByText(new RegExp(`${W}×${D} m`)).count() > 0)

// ── Camminata e collisioni ─────────────────────────────────────────────────
{
  const target = wp('wp-c-rack')
  await page.evaluate(([x, z]) => window.__stores.player.getState().issue({ type: 'goto', point: [x, z] }), [target[0], target[2]])
  // A 1–2 fps il comando viene preso al fotogramma dopo: prima di guardare se il percorso è finito,
  // aspettare che sia partito (condizione, non millisecondi: docs/LEZIONI.md, "Test e processo").
  await waitUntil(page, () => Boolean(window.__player.route), null, 30000)
  const samples = []
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const s = await page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z, route: Boolean(window.__player.route) }))
    samples.push([s.x, s.z])
    if (!s.route && samples.length > 3) break
    await page.waitForTimeout(100)
  }
  const end = samples.at(-1)
  const hits = samples.filter((p) => storeConfig.colliders.some((c) => circleOverlapsCollider(p, c, R - 0.02)))
  ok('percorso automatico fino al rack', Math.hypot(end[0] - target[0], end[1] - target[2]) < 0.5, end.map((v) => v.toFixed(2)).join(', '))
  ok('lungo il percorso il player non entra mai in un collider', hits.length === 0, `${samples.length} posizioni, ${hits.length} dentro`)
}
{
  // Contro il muro nord, camminando in avanti: ci si ferma al muro.
  await place(page, 2.2, -3.0, 0, 0); await sync(page)
  await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w')
  await page.waitForTimeout(300)
  const z = await page.evaluate(() => window.__player.pos.z)
  const wallFace = -storeConfig.environment.floor.size[1] / 2
  ok('contro il muro nord il player si ferma', z >= wallFace + R - 0.02, `z = ${z.toFixed(2)} (muro a ${wallFace})`)
}
{
  // Dentro il tavolo non si entra.
  await place(page, 0, 2.2, 0, 0); await sync(page)
  await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w')
  await page.waitForTimeout(300)
  const p = await page.evaluate(() => [window.__player.pos.x, window.__player.pos.z])
  const table = storeConfig.colliders.find((c) => c.id === 'col-c-table')
  ok('contro il tavolo di blocchi il player si ferma', !circleOverlapsCollider(p, table, R - 0.02), p.map((v) => v.toFixed(2)).join(', '))
}

// ── Catene contro la parete sud: nessuna sacca fra capo e muro ───────────────
{
  // Il player non deve poter entrare fra una catena e il muro (prima restava chiuso lì):
  // il varco fra il collider della catena e il muro sud è più stretto del player.
  const wallFace = storeConfig.environment.floor.size[1] / 2
  for (const d of storeConfig.displays.filter((x) => x.kind === 'chain')) {
    const c = storeConfig.colliders.find((x) => x.id === d.colliderId)
    const behind = [d.position[0], (c.center[2] + wallFace) / 2 + 0.2]
    const free = []
    for (let z = c.center[2]; z <= wallFace - R + 0.001; z += 0.02) {
      const p = [d.position[0], z]
      if (!storeConfig.colliders.some((k) => circleOverlapsCollider(p, k, R))) free.push(z.toFixed(2))
    }
    ok(`${d.label}: contro la parete sud, nessun punto libero fra catena e muro`, free.length === 0, free.length ? `liberi a z = ${free.join(', ')}` : `catena a z = ${d.position[2]}, ${behind[1].toFixed(2)} occupato`)
  }
  // E il tocco "dietro la catena" porta comunque in un punto da cui si riparte.
  const d = storeConfig.displays.find((x) => x.kind === 'chain')
  await place(page, wp('wp-c-chains')[0], wp('wp-c-chains')[2], 0, 0); await sync(page)
  await page.evaluate(([x, z]) => window.__stores.player.getState().issue({ type: 'goto', point: [x, z] }), [d.position[0], 3.95])
  // A 1–2 fps il comando parte al fotogramma dopo: prima aspettare che parta, poi che finisca.
  await waitUntil(page, () => Boolean(window.__player.route), null, 10000)
  await waitUntil(page, () => !window.__player.route, null, 30000)
  const before = await page.evaluate(() => [window.__player.pos.x, window.__player.pos.z])
  const look = wp('wp-c-look')
  await page.evaluate(([x, z]) => window.__stores.player.getState().issue({ type: 'goto', point: [x, z] }), [look[0], look[2]])
  const back = await waitUntil(page, ([x, z]) => Math.hypot(window.__player.pos.x - x, window.__player.pos.z - z) < 0.5, [look[0], look[2]], 90000)
  ok('dopo un tocco dietro le catene il player riparte (fino al Lookbook)', back, `fermo a ${before.map((v) => v.toFixed(2)).join(', ')} dopo il tocco`)
  await place(page, -2.4, 0.6, Math.PI, 0); await sync(page)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/catene-parete-sud.png` })
}

// ── Focus, scheda del capo ─────────────────────────────────────────────────
for (const d of storeConfig.displays) {
  const focused = await focusOn(page, d.id)
  const s = await app(page)
  ok(`Focus su ${d.label}`, focused && s.displayId === d.id, JSON.stringify(s))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/focus-${d.id}.png` })
  // Focus per capo (perItem): la camera arriva davanti al capo selezionato e lo segue.
  const camAt = (eye) => waitUntil(page, ([x, y, z]) => window.__camera.position.distanceTo({ x, y, z }) < 0.08, eye, 30000)
  if (d.focusCamera.perItem) ok(`${d.label}: zoom sul primo capo`, await camAt(focusItemPose(d, 0).eye))
  if (d.productIds.length > 1) {
    await page.getByRole('button', { name: C.focus.next }).click()
    const moved = await waitUntil(page, () => window.__stores.app.getState().focus.productIndex === 1, null, 5000)
    ok(`${d.label}: si passa al capo successivo`, moved)
    if (d.focusCamera.perItem) {
      ok(`${d.label}: la camera scivola sul secondo capo`, await camAt(focusItemPose(d, 1).eye))
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/focus-${d.id}-capo-2.png` })
    }
  }
  const index = (await app(page)).index
  await page.getByRole('button', { name: new RegExp(C.focus.details) }).click()
  const opened = await waitUntil(page, (id) => window.__stores.app.getState().dialogs.at(-1)?.id === id, d.productIds[index], 10000)
  ok(`${d.label}: "${C.focus.details}" apre la scheda del capo esposto`, opened, JSON.stringify(await app(page)))
  if (d.id === 'disp-c-rack') await page.screenshot({ path: `${OUT}/scheda-dal-rack.png` })
  // Indietro del browser: chiude la scheda, poi il Focus.
  await page.goBack()
  ok(`${d.label}: Indietro chiude la scheda`, await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0, null, 5000))
  await page.goBack()
  ok(`${d.label}: Indietro chiude il Focus`, await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 60000))
}

// ── Lookbook dai pannelli luminosi ─────────────────────────────────────────
{
  const look = wp('wp-c-look')
  const panel = storeConfig.environment.brandWall.panel
  await place(page, look[0], look[2], yawTo(look[0], look[2], panel.center[0], panel.center[2]), 0); await sync(page)
  const at = await project(page, panel.center)
  await page.mouse.click(at.x, at.y)
  const opened = await waitUntil(page, (id) => window.__stores.app.getState().dialogs.at(-1)?.id === id, panel.lookbookId, 10000)
  ok('click su un pannello luminoso apre il Lookbook', opened, JSON.stringify(await app(page)))
  await page.screenshot({ path: `${OUT}/lookbook-dal-pannello.png` })
  await page.goBack()
  await waitUntil(page, () => window.__stores.app.getState().dialogs.length === 0, null, 5000)
}

// ── Indicatore a terra ─────────────────────────────────────────────────────
{
  const poi = storeConfig.pois.find((p) => p.id === 'poi-c-table')
  const e = wp('wp-c-entrance')
  await place(page, e[0] + 1.2, e[2], yawTo(e[0] + 1.2, e[2], poi.floorMarker[0], poi.floorMarker[1]), -0.6); await sync(page)
  await page.waitForTimeout(600)
  const at = await project(page, [poi.floorMarker[0], 0.01, poi.floorMarker[1]])
  await page.mouse.click(at.x, at.y)
  const started = await waitUntil(page, () => window.__stores.app.getState().focus.state !== 'idle' || Boolean(window.__player.route), null, 8000)
  ok('click sull\'indicatore a terra del tavolo: avvicinamento o Focus', started, JSON.stringify(await app(page)))
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 90000)
  await exitFocus(page)
}

// ── Vai a (telefono: la barra c'è solo col touch) ─────────────────────────
{
  const qt = storeConfig.navigation.quickTravel.find((q) => q.waypointId === 'wp-c-chains')
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const tel = await phone.newPage()
  tel.on('pageerror', (e) => errors.push(`[telefono] ${e.message}`))
  tel.on('console', (m) => { if (m.type() === 'error') errors.push(`[telefono] ${m.text()}`) })
  await tel.goto(`${BASE}?allestimento=cantiere&debug=x&tier=low&commerce=off`, { waitUntil: 'networkidle' })
  await tel.getByRole('button', { name: /^entra$/i }).click({ timeout: 90000 })
  await tel.waitForFunction(() => window.__player && window.__warmedUp, null, { timeout: 90000 })
  const bar = tel.getByRole('navigation', { name: C.hud.quickTravel })
  ok('barra "Vai a" con le mete del cantiere', (await bar.getByRole('button').count()) === storeConfig.navigation.quickTravel.length)
  await bar.getByRole('button', { name: qt.label, exact: true }).click()
  const target = wp(qt.waypointId)
  const arrived = await waitUntil(tel, ([x, z]) => Math.hypot(window.__player.pos.x - x, window.__player.pos.z - z) < 0.3, [target[0], target[2]], 15000)
  ok(`"Vai a" ${qt.label}: si arriva al punto`, arrived)
  await sync(tel)
  await tel.waitForTimeout(500)
  await tel.screenshot({ path: `${OUT}/telefono-vai-a-catene.png` })
  await phone.close()
}

// ── Bloom (fase 2): vero solo sul tier della GPU dedicata, alone finto per gli altri ──
{
  const bloomState = (pg) => pg.evaluate(() => {
    let layer = 0, halos = 0, halosShown = 0
    window.__scene.traverse((o) => {
      if (o.isMesh && o.layers.isEnabled(1)) layer++
      if (o.isMesh && o.material?.blending === 2 && o.material.map && !o.layers.isEnabled(1)) {
        halos++; if (o.visible) halosShown++
      }
    })
    return { layer, halos, halosShown, calls: window.__gl.info.render.calls }
  })
  const spec = storeConfig.environment.cantiere.bloom
  // Neon, i bordi dei pannelli (una mesh unica dalla fase 3) e la mesh unica delle barre LED d'accento.
  const expected = 1 + 1 + (storeConfig.environment.accentLights?.length ? 1 : 0)
  const low = await bloomState(page)
  ok(`tier low: niente Bloom, alone finto (Bloom solo su ${spec.tiers.join(', ')})`, low.layer === 0 && low.halosShown === low.halos && low.halos > 0, JSON.stringify(low))

  const enter = async (query) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const pg = await c.newPage()
    pg.on('pageerror', (e) => errors.push(`[bloom] ${e.message}`))
    pg.on('console', (m) => { if (m.type() === 'error') errors.push(`[bloom] ${m.text()}`) })
    await pg.goto(`${BASE}?allestimento=cantiere&debug=x&commerce=off${query}`, { waitUntil: 'networkidle' })
    await pg.getByRole('radio', { name: new RegExp(C.onboarding.desktop.modes.mouse.title) }).click()
    await pg.getByRole('button', { name: /^entra$/i }).click({ timeout: 90000 })
    await pg.waitForFunction(() => window.__player && window.__warmedUp, null, { timeout: 90000 })
    return [c, pg]
  }
  const [hc, high] = await enter('&tier=high')
  await place(high, 0, 2.6, 0, 0.05); await sync(high)
  await waitUntil(high, () => window.__gl.info.render.calls > 0)
  const h = await bloomState(high)
  ok('tier high (GPU dedicata): Bloom vero su neon e bordi dei pannelli, alone finto spento', h.layer === expected && h.halosShown === 0, JSON.stringify(h))
  const accentLit = Math.min(storeConfig.performance.tiers.high.maxAccentLights, storeConfig.environment.accentLights.filter((x) => x.light).length)
  const highLights = await high.evaluate(() => { let n = 0; window.__scene.traverse((o) => { if (o.isPointLight) n++ }); return n })
  ok('tier high: luci arancioni vere accese fino al limite del tier', highLights === 1 + accentLit, `${highLights} luci puntiformi (neon + ${accentLit})`)
  // Ombre statiche (fase 3): le mappe non si ridisegnano a ogni fotogramma, ma ci sono.
  const sh = await high.evaluate(() => {
    let maps = 0
    window.__scene.traverse((o) => { if (o.isSpotLight && o.castShadow && o.shadow.map) maps++ })
    return { autoUpdate: window.__gl.shadowMap.autoUpdate, maps }
  })
  ok('tier high: ombre calcolate una volta (non a ogni fotogramma) e presenti', sh.autoUpdate === false && sh.maps > 0, JSON.stringify(sh))
  // Il Focus sposta l'inquadratura con setViewOffset: il Bloom deve seguirlo senza errori.
  const rack = storeConfig.displays.find((d) => d.kind === 'pipeRack')
  ok('tier high: Focus sul rack col Bloom attivo', await focusOn(high, rack.id))
  await high.screenshot({ path: `${OUT}/bloom-focus-rack.png` })
  ok('tier high: uscita dal Focus col Bloom attivo', await exitFocus(high))
  await place(high, 0, 2.6, 0, 0.05); await sync(high)
  await high.waitForTimeout(500)
  await high.screenshot({ path: `${OUT}/bloom-neon.png` })
  await hc.close()

  // Tier medium del cantiere: niente luci arancioni vere (costo misurato sul Pixel 10, docs/PERF.md).
  const [mc, med] = await enter('&tier=medium')
  const medLights = await med.evaluate(() => { let n = 0; window.__scene.traverse((o) => { if (o.isPointLight) n++ }); return n })
  ok('tier medium: luci arancioni vere spente nel cantiere (resta il neon), barre e aloni accesi',
    storeConfig.performance.tiers.medium.maxAccentLights === 0 && medLights === 1, `${medLights} luci puntiformi`)
  await mc.close()

  const [oc, off] = await enter('&tier=high&bloom=0')
  await place(off, 0, 2.6, 0, 0.05); await sync(off)
  await waitUntil(off, () => window.__gl.info.render.calls > 0)
  const o = await bloomState(off)
  ok('tier high con &bloom=0: alone finto, come gli altri tier', o.layer === 0 && o.halosShown === o.halos, JSON.stringify(o))
  ok('costo del Bloom misurato (draw call stessa vista, con e senza)', h.calls > o.calls, `${o.calls} → ${h.calls} draw call (SwiftShader, non è velocità)`)
  await off.screenshot({ path: `${OUT}/bloom-spento-neon.png` })
  await oc.close()
}

// ── Rimontaggi del Canvas (fase 3): le risorse GPU restano quelle della prima scena ──
{
  // Come e2e-phase6 per il negozio: nel negozio A `useTexture` lasciava texture in più dopo un
  // rimontaggio (docs/LEZIONI.md). Qui si controlla il cantiere, che le sue immagini le carica così.
  const c = await browser.newContext({ viewport: { width: 960, height: 600 } })
  const pg = await c.newPage()
  pg.on('pageerror', (e) => errors.push(`[rimontaggi] ${e.message}`))
  await pg.goto(`${BASE}?allestimento=cantiere&debug=x&tier=low&commerce=off`, { waitUntil: 'networkidle' })
  await pg.getByRole('button', { name: /^entra$/i }).click({ timeout: 90000 })
  await pg.waitForFunction(() => window.__player && window.__warmedUp, null, { timeout: 90000 })
  const gpu = () => pg.evaluate(() => {
    const ids = new Set(); window.__scene.traverse((o) => { if (o.geometry) ids.add(o.geometry.uuid) })
    const m = window.__gl.info.memory
    return `geo ${m.geometries} · tex ${m.textures} · prog ${window.__gl.info.programs.length} · oggetti ${ids.size}`
  })
  const frames = () => pg.evaluate(() => window.__gl.info.render.frame)
  // La prima scena: si aspetta che le risorse smettano di crescere.
  let fresh = await gpu()
  for (let t = 0; t < 30; t++) { await pg.waitForTimeout(1000); const m = await gpu(); if (m === fresh) break; fresh = m }
  const notes = []
  for (let i = 1; i <= 4; i++) {
    await pg.evaluate(() => { window.__oldGl = window.__gl; window.__remountScene() })
    await waitUntil(pg, () => window.__gl && window.__gl !== window.__oldGl && window.__player, null, 30000)
    const f0 = await frames()
    await waitUntil(pg, (a) => window.__gl.info.render.frame > a + 2, f0, 30000)
    // In rendering software la scena rimontata impiega secondi a disegnare tutto: si aspetta una
    // condizione (le risorse tornano quelle della prima), non un tempo. Una perdita non ci torna mai.
    let m = await gpu()
    for (let t = 0; t < 30 && m !== fresh; t++) { await pg.waitForTimeout(1000); m = await gpu() }
    if (m !== fresh) notes.push(`ciclo ${i}: ${m}`)
  }
  ok('rimontaggi del Canvas: ogni scena ha le risorse GPU della prima', notes.length === 0, notes.length ? `prima: ${fresh}; ${notes.join('; ')}` : fresh)
  await c.close()
}

const unexpected = [...new Set(errors)]
ok('nessun errore in console', unexpected.length === 0, unexpected.slice(0, 5).join(' | '))
await ctx.close()
await browser.close()

for (const [s, n, note] of results) console.log(`${s.padEnd(4)} ${n}${note ? `  — ${note}` : ''}`)
const failed = results.filter((r) => r[0] !== 'ok').length
console.log(`\n${results.length - failed}/${results.length} verifiche superate`)
process.exit(failed ? 1 : 0)
