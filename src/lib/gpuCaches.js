/**
 * Ciclo di vita delle cache condivise fra le mesh (materiali, texture, geometrie).
 *
 * Le cache sono legate al Canvas, non a un componente React: si liberano quando
 * l'ultimo Canvas si smonta davvero. Lo smontaggio è differito di un turno
 * perché StrictMode (e il rimontaggio dopo una perdita di contesto) smonta e
 * rimonta subito: in quel caso il rimontaggio annulla il rilascio, e nessun
 * materiale ancora in uso resta senza texture — il bug della Fase 2.
 */
const disposers = new Set()
let holders = 0
let pending = null

/** Ogni modulo con una cache registra qui la funzione che la svuota. */
export function registerGpuCache(dispose) {
  disposers.add(dispose)
}

export function disposeGpuCaches() {
  for (const dispose of disposers) dispose()
}

/** Chiamato al montaggio del Canvas. */
export function retainGpuCaches() {
  holders += 1
  clearTimeout(pending)
  pending = null
}

/** Chiamato allo smontaggio del Canvas. */
export function releaseGpuCaches() {
  holders = Math.max(0, holders - 1)
  if (holders > 0) return
  clearTimeout(pending)
  pending = setTimeout(() => {
    pending = null
    if (holders === 0) disposeGpuCaches()
  }, 0)
}
