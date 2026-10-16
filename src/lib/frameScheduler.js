/**
 * Quando rendere un fotogramma per stare a `targetFps` su uno schermo qualsiasi
 * (60, 75, 90, 120, 144 Hz…). Restituisce una funzione da chiamare a ogni
 * requestAnimationFrame con il suo timestamp: true = rendi adesso.
 * Scadenze a intervallo esatto; si rende al primo vsync entro mezzo vsync dalla
 * scadenza. Se si resta indietro (fotogrammi lenti), la scadenza riparte da adesso.
 */
export function frameScheduler(targetFps) {
  const interval = 1000 / targetFps
  let next = null
  let prev = null
  return (now) => {
    const vsync = prev === null ? interval : Math.max(1, now - prev)
    prev = now
    if (next === null) { next = now + interval; return true }
    if (now < next - vsync / 2) return false
    next += interval
    if (next < now) next = now + interval
    return true
  }
}
