/**
 * Ombre calcolate una volta (fase 3 del cantiere, 2026-10-19). Nella scena nulla che proietti
 * ombra si muove (player, hotspot e indicatori non ne proiettano; il Focus cambia intensità e
 * colore dei faretti, non la loro posizione): ridisegnare le mappe d'ombra a ogni fotogramma
 * raddoppiava i triangoli sul tier medium (Pixel 10 nel cantiere: 124 711 contro 56 515 senza
 * ombre, 1% low 30,9). Si ridisegnano solo quando qualcosa cambia forma: chi cambia una sagoma
 * che proietta ombra (es. la foto scontornata di un capo che arriva) chiama `markShadowsDirty`.
 */
let dirty = true

export function markShadowsDirty() { dirty = true }

/** Vero una volta dopo ogni `markShadowsDirty`. */
export function takeShadowsDirty() {
  const d = dirty
  dirty = false
  return d
}
