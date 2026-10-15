import { create } from 'zustand'

/**
 * Fotografia delle prestazioni per l'HUD, aggiornata poche volte al secondo
 * dalla scena (PerfProbe). I campioni grezzi stanno in lib/perf.js.
 */
export const usePerfStore = create(() => ({
  stats: null,     // ultima finestra: fps, frame time, draw call, triangoli
  memory: null,    // risorse vive sulla GPU: geometrie, texture, programmi
  dpr: null,
}))
