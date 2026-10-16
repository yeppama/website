import { chromium } from 'playwright-core'
import { storeConfig } from '../../src/config/storeConfig.js'
import { tokens } from '../../src/config/designTokens.js'

const BASE = process.argv[2], OUT = process.argv[3]
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})
const results = []
const ok = (name, cond, note = '') => results.push([cond ? 'ok' : 'FAIL', name, note])
const consoleErrors = []
const consoleWarnings = []
const C = storeConfig.copy

// Conta i contesti WebGL creati e quelli ancora vivi: un contesto non rilasciato
// è memoria video persa, e oltre ~16 il browser inizia a ucciderne di vecchi.
const countContexts = () => {
  const orig = HTMLCanvasElement.prototype.getContext
  window.__contexts = []
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = orig.call(this, type, ...rest)
    if (ctx && /webgl/.test(type) && !window.__contexts.includes(ctx)) window.__contexts.push(ctx)
    return ctx
  }
}

async function open(name, { mobile, viewport, query = '?debug=x&tier=low', init, enter = true } = {}) {
  const ctx = await browser.newContext({
    viewport: viewport ?? (mobile ? { width: 390, height: 844 } : { width: 960, height: 600 }),
    isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1,
  })
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${name}] ${m.text()}`)
    if (m.type() === 'warning' && /context/i.test(m.text())) consoleWarnings.push(`[${name}] ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] ${e.message}`))
  await page.goto(BASE + query, { waitUntil: 'networkidle' })
  if (enter) {
    await page.getByRole('button', { name: /^entra$/i }).click({ timeout: 30000 })
    if (query.includes('debug')) await page.waitForFunction(() => window.__player && window.__gl, null, { timeout: 20000 })
  }
  return { ctx, page }
}
const waitUntil = (page, fn, arg, timeout = 20000) => page.waitForFunction(fn, arg, { timeout, polling: 50 }).then(() => true).catch(() => false)
const gpu = (page) => page.evaluate(() => {
  const ids = new Set()
  window.__scene.traverse((o) => { if (o.geometry) ids.add(o.geometry.uuid) })
  return { geometries: window.__gl.info.memory.geometries, textures: window.__gl.info.memory.textures, programs: window.__gl.info.programs.length, inScene: ids.size }
})
const frames = (page) => page.evaluate(() => window.__gl.info.render.frame)
const rendering = async (page) => { const a = await frames(page); return waitUntil(page, (a) => window.__gl.info.render.frame > a + 2, a, 20000) }
const same = (a, b) => a.geometries === b.geometries && a.textures === b.textures && a.programs === b.programs && a.inScene === b.inScene
const fmt = (m) => `geo ${m.geometries} · tex ${m.textures} · prog ${m.programs} · oggetti ${m.inScene}`

// Un giro d'uso realistico: spostamenti, Focus, scheda, teletrasporto.
async function useRound(page) {
  for (const point of [[-3, 12], [3, 12], [0, 6]]) {
    await page.evaluate((point) => window.__stores.player.getState().issue({ type: 'goto', point }), point)
    await waitUntil(page, () => !window.__stores.player.getState().route && window.__stores.player.getState().pose, null, 30000)
  }
  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'focus', displayId: 'disp-plinth-01' }))
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 30000)
  await page.evaluate(() => window.__stores.app.getState().openDialog('product', 'prod-002'))
  await page.waitForTimeout(200)
  await page.evaluate(() => { window.__stores.app.getState().closeDialogs(); window.__stores.app.getState().exitFocus() })
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 30000)
  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'teleport', waypointId: 'wp-entrance' }))
  await waitUntil(page, () => !window.__stores.player.getState().fading, null, 10000)
  await page.waitForTimeout(600)
}

// ============================ GPU: STABILITÀ NELLA SESSIONE ============================
{
  const { ctx, page } = await open('steady')
  await page.waitForTimeout(1000)
  // Riscaldamento: la GPU riceve un oggetto la prima volta che viene disegnato, e
  // a pochi fps un hotspot può comparire per la prima volta solo al secondo giro.
  // Tre giri: in rendering software un hotspot può essere disegnato la prima
  // volta anche al terzo. Una perdita vera cresce a ogni giro, non una volta.
  await useRound(page)
  await useRound(page)
  await useRound(page)
  const warm = await gpu(page)
  const series = []
  for (let i = 0; i < 4; i++) { await useRound(page); series.push(await gpu(page)) }
  ok('GPU: dopo il riscaldamento, quattro giri d\'uso non lasciano geometrie, texture, programmi né oggetti in più',
    series.every((m) => same(m, warm)), [warm, ...series].map(fmt).join(' → '))
  await ctx.close()
}

// ============================ GPU: RIMONTAGGI DEL CANVAS ============================
{
  const { ctx, page } = await open('remount', { init: countContexts })
  const cdp = await ctx.newCDPSession(page)
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); await page.waitForTimeout(200); await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576 }
  await rendering(page); await page.waitForTimeout(800)
  const fresh = await gpu(page)
  const cycles = 12
  let heapAt3 = null
  let renderedEvery = true
  let sameEvery = true
  const notes = []
  for (let i = 1; i <= cycles; i++) {
    await page.evaluate(() => { window.__oldGl = window.__gl })
    await page.evaluate(() => window.__remountScene())
    const swapped = await waitUntil(page, () => window.__gl && window.__gl !== window.__oldGl && window.__player, null, 20000)
    if (!swapped || !(await rendering(page))) renderedEvery = false
    await page.waitForTimeout(600)
    const m = await gpu(page)
    if (!same(m, fresh)) { sameEvery = false; notes.push(`ciclo ${i}: ${fmt(m)}`) }
    if (i === 3) heapAt3 = await heap()
  }
  const heapEnd = await heap()
  const alive = await page.evaluate(() => window.__contexts.filter((c) => !c.isContextLost()).length)
  const created = await page.evaluate(() => window.__contexts.length)
  ok(`GPU: ${cycles} rimontaggi del Canvas, la scena torna a rendere ogni volta`, renderedEvery)
  ok('GPU: ogni scena rimontata ha esattamente le risorse della prima', sameEvery, sameEvery ? fmt(fresh) : notes.join('; '))
  ok('GPU: un solo contesto WebGL vivo alla fine (gli altri rilasciati)', alive === 1, `${created} creati, ${alive} vivi`)
  ok('GPU: la memoria JS non cresce fra il 3° e il 12° rimontaggio (< 3 MB)', heapEnd - heapAt3 < 3, `${heapAt3.toFixed(1)} → ${heapEnd.toFixed(1)} MB`)
  ok('GPU: nessun avviso "troppi contesti WebGL"', !consoleWarnings.some((w) => /too many/i.test(w)), consoleWarnings.join(' | '))
  await ctx.close()
}

// ============================ CONTESTO PERSO ============================
{
  const { ctx, page } = await open('context-lost')
  await page.evaluate(() => { const p = window.__player; p.pos.x = -4; p.pos.z = 8; p.yaw = 1.1 })
  await page.waitForTimeout(800)
  const before = await page.evaluate(() => window.__stores.player.getState().pose)
  await page.evaluate(() => { window.__oldGl = window.__gl; window.__lose = window.__gl.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext() })
  const overlay = page.getByRole('alertdialog', { name: C.errors.contextLost.title })
  ok('contesto perso: compare la schermata di ripristino', await overlay.isVisible({ timeout: 5000 }).catch(() => false) || await waitUntil(page, () => !!document.querySelector('[role="alertdialog"]'), null, 5000))
  await page.screenshot({ path: `${OUT}/context-lost.png` })
  await overlay.getByRole('button', { name: C.errors.contextLost.retry }).click()
  const back = await waitUntil(page, () => window.__gl !== window.__oldGl && window.__player, null, 20000)
  const drew = back && await rendering(page)
  const after = await page.evaluate(() => ({ x: window.__player.pos.x, z: window.__player.pos.z, yaw: window.__player.yaw }))
  ok('contesto perso: "Riprova" ricrea la scena, che torna a rendere', drew && !(await overlay.isVisible()))
  ok('contesto perso: il player riparte dalla posa in cui era', Math.hypot(after.x - before.x, after.z - before.z) < 0.01 && Math.abs(after.yaw - before.yaw) < 0.01,
    `prima ${before.x.toFixed(2)},${before.z.toFixed(2)} · dopo ${after.x.toFixed(2)},${after.z.toFixed(2)}`)
  // Il browser restituisce il contesto da solo: la scena si rimonta senza click.
  await page.evaluate(() => { window.__oldGl = window.__gl; window.__lose = window.__gl.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext() })
  await waitUntil(page, () => !!document.querySelector('[role="alertdialog"]'), null, 5000)
  await page.evaluate(() => window.__lose.restoreContext())
  const auto = await waitUntil(page, () => window.__gl !== window.__oldGl && !document.querySelector('[role="alertdialog"]'), null, 20000)
  ok('contesto restituito dal browser: la scena si rimonta da sola', auto && await rendering(page))
  await ctx.close()
}

// ============================ RISCALDAMENTO GPU ============================
{
  const { ctx, page } = await open('warmup')
  const warmed = await waitUntil(page, () => window.__warmedUp === true, null, 20000)
  const m = await gpu(page)
  ok('riscaldamento: dietro l\'onboarding shader, geometrie e texture vengono preparati prima di muoversi', warmed && m.programs > 0, fmt(m))
  await ctx.close()
  const off = await open('warmup-off', { query: '?debug=x&tier=low&warm=0' })
  await off.page.waitForTimeout(3000)
  const m0 = await gpu(off.page)
  ok('riscaldamento: con &warm=0 non avviene (confronto sul dispositivo)', !(await off.page.evaluate(() => window.__warmedUp)) && m0.geometries < m.geometries,
    `con: ${fmt(m)} · senza: ${fmt(m0)}`)
  await off.ctx.close()
}

// ============================ NIENTE LAVORO AL PRIMO USO ============================
// Dopo il riscaldamento: cammini, un Focus col marcatore e l'uscita non devono
// compilare shader. Gli upload ammessi sono la geometria della linea del
// percorso (2 buffer a cammino) e l'anello del marcatore (4 buffer a Focus).
{
  const countGl = () => {
    window.__glCalls = { compileShader: 0, bufferData: 0 }
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      for (const fn of ['compileShader', 'bufferData']) {
        const orig = proto[fn]
        proto[fn] = function (...a) { window.__glCalls[fn]++; return orig.apply(this, a) }
      }
    }
  }
  const { ctx, page } = await open('first-use', { query: '?debug=x&tier=medium', init: countGl, viewport: { width: 640, height: 400 } })
  await waitUntil(page, () => window.__warmedUp === true, null, 20000)
  await page.waitForTimeout(800)
  await page.evaluate(() => { window.__glCalls.compileShader = 0; window.__glCalls.bufferData = 0 })
  const walk = async (point) => {
    await page.evaluate((point) => window.__stores.player.getState().issue({ type: 'goto', point }), point)
    await waitUntil(page, () => !!window.__stores.player.getState().route, null, 10000)
    await waitUntil(page, () => !window.__stores.player.getState().route, null, 60000)
  }
  await walk([-6.5, 9])
  await walk([6.5, 9])
  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'focus', displayId: 'disp-plinth-01' }))
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 30000)
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__stores.app.getState().exitFocus())
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'idle', null, 30000)
  await page.waitForTimeout(800)
  const calls = await page.evaluate(() => window.__glCalls)
  ok('primo uso: dopo il riscaldamento, due cammini e un Focus col marcatore non compilano nessuno shader', calls.compileShader === 0, `${calls.compileShader} compilazioni`)
  ok('primo uso: hotspot non ricreati, solo linea del percorso e marcatore caricano dati (≤ 8 buffer)', calls.bufferData <= 8, `${calls.bufferData} upload di buffer`)
  ok('nebbia: spenta di base (scelta dell\'utente)', await page.evaluate(() => window.__scene.fog === null))
  await ctx.close()
  const fogOn = await open('fog-on', { query: '?debug=x&tier=low&fog=1', viewport: { width: 640, height: 400 } })
  const fogInfo = await fogOn.page.evaluate(() => window.__scene.fog && { near: window.__scene.fog.near, far: window.__scene.fog.far })
  ok('nebbia: con ?fog=1 è agganciata alla scena coi valori del config', !!fogInfo && fogInfo.near === storeConfig.environment.fog.near && fogInfo.far === storeConfig.environment.fog.far, JSON.stringify(fogInfo))
  await fogOn.ctx.close()
}

// ============================ HUD PRESTAZIONI E LIMITE FPS ============================
{
  const { ctx, page } = await open('perf-off', { query: '?tier=low' })
  await page.waitForTimeout(1500)
  ok('HUD prestazioni: senza ?perf=1 non compare', (await page.getByTestId('perf-hud').count()) === 0)
  await ctx.close()
}
{
  const { ctx, page } = await open('perf-on', { query: '?perf=1&tier=low' })
  const hud = page.getByTestId('perf-hud')
  const filled = await waitUntil(page, () => {
    const v = document.querySelector('[data-perf="fps p50"]')?.textContent
    return v && Number.isFinite(parseFloat(v))
  }, null, 20000)
  const text = await hud.textContent()
  ok('HUD prestazioni: con ?perf=1 (anche in produzione) mostra fps, 1% low, draw call e memoria', filled && /1% low/.test(text) && /draw call/.test(text) && /tier low/.test(text))
  ok('HUD prestazioni: dichiara quando il rendering è software', text.includes(C.perf.softwareWarning))
  await page.screenshot({ path: `${OUT}/perf-hud.png` })
  await ctx.close()
}
{
  // Limite reale: con un tetto di 10 fps il p50 misurato non lo supera. Il tetto
  // è basso perché il rendering software di questo ambiente non arriva a 20.
  const { ctx, page } = await open('perf-cap', { query: '?debug=x&perf=1&tier=low&fps=10', viewport: { width: 480, height: 320 } })
  await page.waitForTimeout(6000)
  const fps = await page.evaluate(() => parseFloat(document.querySelector('[data-perf="fps p50"]').textContent))
  ok('limite fps: con tetto a 10 il p50 misurato non lo supera (8,5–10,5)', fps >= 8.5 && fps <= 10.5, `p50 ${fps}`)
  await ctx.close()
}

// ============================ BENCHMARK ============================
{
  const { ctx, page } = await open('bench', { query: '?bench=1&debug=x&tier=low', viewport: { width: 640, height: 400 } })
  const veil = await waitUntil(page, () => !!document.querySelector('[data-testid="bench-veil"]'), null, 15000)
  ok('benchmark: parte da solo dopo l\'ingresso e copre la scena con il velo', veil)
  // Durante un cammino, tastiera e tocchi non deviano la traiettoria.
  await waitUntil(page, () => window.__stores.player.getState().route, null, 30000)
  const routeId = await page.evaluate(() => window.__stores.player.getState().route.id)
  await page.mouse.click(320, 300)
  await page.keyboard.down('KeyS'); await page.waitForTimeout(500); await page.keyboard.up('KeyS')
  const stillSame = await page.evaluate((id) => window.__stores.player.getState().route?.id === id || window.__stores.player.getState().route === null, routeId)
  const noKeys = await page.evaluate(() => window.__player.keys.size === 0)
  ok('benchmark: click e tasti durante la misura non cambiano il percorso', stillSame && noKeys)
  const done = await waitUntil(page, () => !!window.__benchResult, null, 180000)
  const r = await page.evaluate(() => window.__benchResult)
  ok('benchmark: il run termina e misura ogni passo del percorso', done && r.segments.length === storeConfig.benchmark.steps.length && r.frames > 50,
    done ? `${(r.durationMs / 1000).toFixed(1)} s, ${r.frames} fotogrammi, p50 ${r.fpsP50.toFixed(1)} fps (software, non valido come misura)` : 'non terminato')
  ok('benchmark: durata vicina ai ~40 s previsti (30–60 s)', done && r.durationMs > 30000 && r.durationMs < 60000, done ? `${(r.durationMs / 1000).toFixed(1)} s` : '')
  const row = await page.getByTestId('bench-row').inputValue()
  const cols = row.split('|').slice(1, -1)
  ok('benchmark: riga pronta per PERF.md, 15 colonne, rendering software dichiarato', cols.length === 15 && row.includes(C.bench.realNo), row)
  const segLine = row.split('\n').find((l) => l.startsWith(C.bench.segments)) ?? ''
  const stutterLine = row.split('\n').find((l) => l.startsWith(C.bench.stutter)) ?? ''
  ok('benchmark: riga degli scatti (fotogramma max, oltre 50 ms, blocchi)', /max \d+ ms · \d+ > 50 ms · \d+ > 250 ms/.test(stutterLine), stutterLine)
  ok('benchmark: sotto la riga, il dettaglio per tratto del percorso', (segLine.match(/(?:: | ; )\d+ /g) ?? []).length === storeConfig.benchmark.steps.length, segLine)
  ok('benchmark: a misura finita l\'input torna all\'utente', await page.evaluate(() => !window.__stores.app.getState().benchRunning && !document.querySelector('[data-testid="bench-veil"]')))
  await page.screenshot({ path: `${OUT}/bench-results.png` })
  // Ripeti, poi interrompi: lo stato torna pulito.
  await page.getByRole('button', { name: C.bench.repeat }).click()
  await waitUntil(page, () => window.__stores.app.getState().focus.state === 'focused', null, 60000)
  await page.getByRole('button', { name: C.bench.abort }).click()
  const clean = await waitUntil(page, () => !window.__stores.app.getState().benchRunning && window.__stores.app.getState().focus.state === 'idle', null, 20000)
  ok('benchmark: "Interrompi" anche a metà Focus lascia uno stato pulito', clean && (await page.getByTestId('bench-results').textContent()).includes(C.bench.aborted))
  await ctx.close()
}

// ============================ RESPONSIVE ============================
const VIEWPORTS = [
  { name: '320×568', w: 320, h: 568, touch: true },
  { name: '360×740', w: 360, h: 740, touch: true },
  { name: '390×844', w: 390, h: 844, touch: true },
  { name: '430×932', w: 430, h: 932, touch: true },
  { name: '844×390 orizz.', w: 844, h: 390, touch: true },
  { name: '768×1024 tablet', w: 768, h: 1024, touch: true },
  { name: '1024×768', w: 1024, h: 768, touch: false },
  { name: '1440×900', w: 1440, h: 900, touch: false },
]
// Tutto ciò che è visibile e interattivo, o testo dell'interfaccia, deve stare
// nello schermo; su touch i bersagli devono essere grandi almeno touchTarget.min.
const audit = (page, { touch, scope }) => page.evaluate(({ touch, min, scope }) => {
  const vw = innerWidth, vh = innerHeight
  const root = scope ? document.querySelector(scope) : document.body
  const out = { offscreen: [], small: [] }
  const scrollers = [...document.querySelectorAll('*')].filter((el) => {
    const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight
  })
  for (const el of root.querySelectorAll('button, a, [role="radio"], p, h1, h2, h3, li')) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue
    // Dentro un contenitore che scorre in verticale, uscire in basso è normale.
    const inScroller = scrollers.some((s) => s.contains(el))
    if (r.left < -1 || r.right > vw + 1 || (!inScroller && (r.top < -1 || r.bottom > vh + 1))) {
      out.offscreen.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)}`)
    }
    if (touch && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'radio') && !el.closest('[aria-hidden="true"]') && el.tabIndex !== -1 && (r.height < min - 0.5 || r.width < min - 0.5)) {
      out.small.push(`"${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
  }
  return out
}, { touch, min: tokens.touchTarget.min, scope })

const responsiveIssues = []
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.touch, hasTouch: vp.touch, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => consoleErrors.push(`[resp ${vp.name}] ${e.message}`))
  await page.goto(BASE + '?debug=x&tier=low', { waitUntil: 'networkidle' })
  const check = async (state, scope) => {
    await page.waitForTimeout(250)
    const a = await audit(page, { touch: vp.touch, scope })
    if (a.offscreen.length) responsiveIssues.push(`${vp.name} · ${state}: fuori schermo ${a.offscreen.slice(0, 3).join('; ')}`)
    if (a.small.length) responsiveIssues.push(`${vp.name} · ${state}: bersagli piccoli ${a.small.slice(0, 3).join('; ')}`)
  }
  // Onboarding: "Entra" raggiungibile scorrendo.
  const enter = page.getByRole('button', { name: /^entra$/i })
  await enter.waitFor({ timeout: 30000 })
  await enter.scrollIntoViewIfNeeded()
  const eb = await enter.boundingBox()
  if (!eb || eb.y + eb.height > vp.h + 1) responsiveIssues.push(`${vp.name} · onboarding: "Entra" non raggiungibile`)
  await enter.click()
  await page.waitForFunction(() => window.__player && window.__stores, null, { timeout: 20000 })
  await page.waitForTimeout(500)
  await check('HUD')
  // Header e footer del HUD non si sovrappongono.
  const overlap = await page.evaluate(() => {
    const h = document.querySelector('header')?.getBoundingClientRect(), f = document.querySelector('footer')?.getBoundingClientRect()
    return h && f ? h.bottom > f.top : false
  })
  if (overlap) responsiveIssues.push(`${vp.name} · HUD: intestazione e piede si sovrappongono`)
  if (vp.name.startsWith('320') || vp.name.startsWith('844') || vp.name.startsWith('1440')) await page.screenshot({ path: `${OUT}/resp-${vp.w}x${vp.h}-hud.png` })
  await page.evaluate(() => window.__stores.app.getState().toggleMenu())
  await check('menu', '#menu-drawer')
  await page.evaluate(() => window.__stores.app.getState().closeMenu())
  await page.evaluate(() => window.__stores.player.getState().issue({ type: 'focus', displayId: 'disp-rack-01' }))
  await page.waitForFunction(() => window.__stores.app.getState().focus.state === 'focused', null, { timeout: 30000 })
  await check('pannello Focus')
  if (vp.name.startsWith('320') || vp.name.startsWith('844')) await page.screenshot({ path: `${OUT}/resp-${vp.w}x${vp.h}-focus.png` })
  await page.evaluate(() => window.__stores.app.getState().openDialog('product', 'prod-001'))
  await check('scheda prodotto', '[role="dialog"][data-dialog]')
  await page.evaluate(() => window.__stores.app.getState().openDialog('lookbook', 'lb-001'))
  await check('Lookbook', '[role="dialog"][data-dialog]')
  await ctx.close()
}
ok(`responsive: ${VIEWPORTS.length} formati × onboarding, HUD, menu, Focus, scheda, Lookbook — tutto nello schermo, bersagli touch ≥ 44 px`,
  responsiveIssues.length === 0, responsiveIssues.join('\n      '))

await browser.close()
for (const [s, n, note] of results) console.log(`${s === 'ok' ? '  ✓' : '  ✗'} ${n}${note ? ` — ${note}` : ''}`)
console.log(`\n${results.filter((r) => r[0] === 'ok').length} superati, ${results.filter((r) => r[0] === 'FAIL').length} falliti`)
console.log(consoleErrors.length ? 'ERRORI CONSOLE:\n' + consoleErrors.join('\n') : 'ERRORI CONSOLE: nessuno')
