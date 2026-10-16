/**
 * Quando rendere un fotogramma per non superare `targetFps` su uno schermo
 * qualsiasi (60, 75, 90, 120, 144 Hz…), con un RITMO REGOLARE: si rende un
 * aggiornamento dello schermo ogni k, con k = frequenza ÷ target arrotondato per
 * difetto (mai sotto il target). 60 Hz → 60, 90 Hz → 90, 120 Hz → 60, 144 Hz → 72.
 *
 * Perché non "60 fps esatti" su ogni schermo: a 90 Hz si otterrebbero alternando
 * fotogrammi da 1 e 2 vsync (11 e 22 ms), media 60 ma movimento a scatti regolari
 * (misurato sul Pixel 7, 2026-10-16: mediana fra 50 e 88, 1% low fermo a 44).
 * E non "tempo dall'ultimo ≥ 90% dell'intervallo": a 90 Hz dava 45, a 75 Hz 37,5.
 *
 * La frequenza si stima dalla mediana degli ultimi intervalli fra
 * requestAnimationFrame; dopo una pausa lunga (scheda in background) si rende subito.
 * Restituisce una funzione da chiamare a ogni rAF col suo timestamp: true = rendi.
 */
export function frameScheduler(targetFps, { window: size = 15 } = {}) {
  const deltas = []
  let prev = null
  let since = 0
  return (now) => {
    const delta = prev === null ? null : now - prev
    prev = now
    if (delta === null || delta > 100) { since = 0; return true }
    deltas.push(delta)
    if (deltas.length > size) deltas.shift()
    const vsync = [...deltas].sort((a, b) => a - b)[deltas.length >> 1]
    const k = Math.max(1, Math.floor((1000 / vsync) / targetFps + 0.15))
    since += 1
    if (since < k) return false
    since = 0
    return true
  }
}
