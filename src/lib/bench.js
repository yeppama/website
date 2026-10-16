import { sampler, summarize } from './perf.js'

/**
 * Percorso di benchmark riproducibile (PLAN §5.3). Guida il player con gli
 * stessi comandi dell'interfaccia, quindi misura il codice vero, non una scena
 * di prova. La traiettoria viene da storeConfig.benchmark.
 *
 * `api` isola il percorso dagli store: { issue, exitFocus, focusState, hasRoute, pose }.
 */

const aborted = () => new DOMException('Benchmark interrotto', 'AbortError')

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(aborted()); return }
  const timer = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(aborted()) }, { once: true })
})

async function waitFor(condition, timeoutMs, signal, what) {
  const start = performance.now()
  while (!condition()) {
    if (performance.now() - start > timeoutMs) throw new Error(`timeout: ${what}`)
    await sleep(50, signal)
  }
}

async function runStep(step, { api, waypoints, timeoutMs, signal }) {
  if (step.type === 'place') {
    api.issue({ type: 'place', waypointId: step.waypointId })
    await sleep(100, signal)
  } else if (step.type === 'hold') {
    await sleep(step.ms, signal)
  } else if (step.type === 'walk') {
    const w = waypoints.get(step.waypointId)
    const [x, , z] = w.position
    api.issue({ type: 'goto', point: [x, z], faceAt: step.faceAt ?? null })
    const near = () => { const p = api.pose(); return Math.hypot(p.x - x, p.z - z) < 0.45 }
    await waitFor(() => near() && !api.hasRoute(), timeoutMs, signal, `cammino verso ${step.waypointId}`)
  } else if (step.type === 'focus') {
    api.issue({ type: 'focus', displayId: step.displayId })
    await waitFor(() => api.focusState() === 'focused', timeoutMs, signal, `Focus su ${step.displayId}`)
    await sleep(step.holdMs, signal)
    api.exitFocus()
    await waitFor(() => api.focusState() === 'idle', timeoutMs, signal, `uscita dal Focus su ${step.displayId}`)
  } else if (step.type === 'face') {
    api.issue({ type: 'face', point: step.point })
    await sleep(step.ms, signal)
  } else {
    throw new Error(`passo sconosciuto: ${step.type}`)
  }
}

/**
 * Esegue un run. Restituisce statistiche complessive e per passo; in caso di
 * errore o interruzione la registrazione si chiude comunque.
 */
export async function runBenchmark({ benchmark, waypoints, api, onProgress, signal }) {
  const ctx = { api, waypoints, timeoutMs: benchmark.stepTimeoutMs, signal }
  // Si parte sempre dalla stessa posa, poi si lascia assestare la scena.
  const first = benchmark.steps[0]
  if (first?.type === 'place') await runStep(first, ctx)
  onProgress?.({ index: -1, step: null })
  await sleep(benchmark.warmupMs, signal)

  sampler.startRecording()
  const t0 = performance.now()
  const segments = []
  let samples = []
  try {
    for (const [index, step] of benchmark.steps.entries()) {
      onProgress?.({ index, step })
      const from = sampler.mark()
      await runStep(step, ctx)
      segments.push({ label: step.label ?? step.type, ...summarize(sampler.slice(from)) })
    }
  } finally {
    samples = sampler.stopRecording()
  }
  return { durationMs: performance.now() - t0, ...summarize(samples), segments }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Aggregato del protocollo: mediana dei p50, peggiore degli 1% low. */
export function aggregateRuns(runs) {
  return {
    runs: runs.length,
    fpsP50Median: median(runs.map((r) => r.fpsP50)),
    fps1LowWorst: Math.min(...runs.map((r) => r.fps1Low)),
    frameMsP95Worst: Math.max(...runs.map((r) => r.frameMsP95)),
    callsAvg: median(runs.map((r) => r.callsAvg)),
    callsMax: Math.max(...runs.map((r) => r.callsMax)),
    trisMax: Math.max(...runs.map((r) => r.trisMax)),
  }
}

/**
 * Dettaglio per tratto del percorso, su tutti i run: p50 mediano / 1% low peggiore.
 * Dice DOVE il dispositivo rallenta (camminata, Focus, lookbook), non solo quanto.
 */
export function segmentSummary(runs) {
  if (!runs.length) return ''
  return runs[0].segments.map((s, i) => {
    const seg = runs.map((r) => r.segments[i]).filter(Boolean)
    const worst = Math.max(...seg.map((x) => x.frameMsMax))
    const over = Math.max(...seg.map((x) => x.over50))
    return `${i + 1} ${s.label} ${f1(median(seg.map((x) => x.fpsP50)))}/${f1(Math.min(...seg.map((x) => x.fps1Low)))} max ${f0(worst)}ms ${over}>50`
  }).join(' ; ')
}

/** Scatti sull'intero percorso, peggior run: fotogramma più lungo, oltre 50 ms, blocchi > 250 ms. */
export function stutterSummary(runs) {
  if (!runs.length) return ''
  return {
    frameMsMax: Math.max(...runs.map((r) => r.frameMsMax)),
    over50: Math.max(...runs.map((r) => r.over50)),
    stalls: Math.max(...runs.map((r) => r.stalls)),
  }
}

/** Nome e versione del browser dallo user agent, quanto basta per il registro. */
export function browserLabel(ua = navigator.userAgent) {
  const m = ua.match(/(Edg|OPR|Firefox|CriOS|FxiOS|Chrome)\/(\d+)/) ?? ua.match(/Version\/(\d+)(?:\.\d+)*.*Safari/)
  if (!m) return 'sconosciuto'
  if (m.length === 2) return `Safari ${m[1]}`
  const names = { Edg: 'Edge', OPR: 'Opera', CriOS: 'Chrome iOS', FxiOS: 'Firefox iOS' }
  return `${names[m[1]] ?? m[1]} ${m[2]}`
}

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—')
const f0 = (n) => (Number.isFinite(n) ? Math.round(n).toString() : '—')

/** Una riga della tabella di docs/PERF.md, nello stesso ordine delle colonne. */
export function perfRow(agg, meta) {
  return `| ${[
    meta.date, meta.device, meta.gpu, meta.browser, meta.commit, meta.tier, f1(meta.dpr),
    meta.viewport, agg.runs, f1(agg.fpsP50Median), f1(agg.frameMsP95Worst), f1(agg.fps1LowWorst),
    `${f0(agg.callsAvg)} / ${f0(agg.callsMax)}`, f0(agg.trisMax), meta.real,
  ].join(' | ')} |`
}
