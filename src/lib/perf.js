/**
 * Misura delle prestazioni nel browser (PLAN §5.3).
 *
 * Si campiona l'intervallo fra due render consecutivi. Con `frameloop="demand"`
 * e il limitatore, un render è un fotogramma prodotto davvero: gli fps qui sono
 * fotogrammi disegnati al secondo, non giri di requestAnimationFrame.
 *
 *   p50 fps     — 1000 / mediana degli intervalli: l'esperienza tipica
 *   p95 ms      — 95° percentile della durata del fotogramma
 *   1% low fps  — 1000 / 99° percentile degli intervalli: rivela gli scatti
 *                 che la media nasconde
 *
 * Gli intervalli oltre `maxGapMs` (scheda in background, debugger) non sono
 * fotogrammi lenti, sono pause: si scartano.
 */

const percentile = (sorted, p) => {
  if (!sorted.length) return NaN
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[i]
}

/** Statistiche da una lista di campioni { t, dt, calls, tris }. */
export function summarize(samples) {
  const dts = samples.map((s) => s.dt).sort((a, b) => a - b)
  const calls = samples.map((s) => s.calls)
  const tris = samples.map((s) => s.tris)
  const sum = (a) => a.reduce((x, y) => x + y, 0)
  return {
    frames: samples.length,
    fpsP50: 1000 / percentile(dts, 50),
    frameMsP95: percentile(dts, 95),
    fps1Low: 1000 / percentile(dts, 99),
    callsAvg: calls.length ? sum(calls) / calls.length : NaN,
    callsMax: calls.length ? Math.max(...calls) : NaN,
    trisMax: tris.length ? Math.max(...tris) : NaN,
  }
}

/**
 * Campionatore condiviso fra la scena (che registra) e l'interfaccia (che
 * legge): un modulo, non uno stato React, per non ridisegnare nulla a ogni frame.
 */
export function createSampler({ maxGapMs = 250, keepMs = 10000 } = {}) {
  let last = null
  let live = []          // finestra scorrevole per l'HUD
  let recording = null   // campioni di una registrazione (benchmark)

  return {
    frame(now, calls, tris) {
      if (last !== null) {
        const dt = now - last
        if (dt > 0 && dt <= maxGapMs) {
          const s = { t: now, dt, calls, tris }
          live.push(s)
          recording?.push(s)
        }
      }
      last = now
      // Taglio della finestra solo ogni tanto: shift() a ogni frame costa.
      if (live.length > 2048) live = live.filter((s) => now - s.t <= keepMs)
    },
    /** Statistiche degli ultimi `windowMs` millisecondi. */
    window(windowMs, now = performance.now()) {
      return summarize(live.filter((s) => now - s.t <= windowMs))
    },
    startRecording() { recording = [] },
    /** Chiude la registrazione e restituisce i campioni. */
    stopRecording() {
      const out = recording ?? []
      recording = null
      return out
    },
    mark() { return recording ? recording.length : 0 },
    slice(from, to) { return recording ? recording.slice(from, to) : [] },
  }
}

export const sampler = createSampler()
