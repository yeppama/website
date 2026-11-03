import { storeConfig } from '../config/storeConfig.js'
import { useCartStore } from './useCartStore.js'

/**
 * Avviso prima di lasciare il sito (richiesta dell'utente, 2026-11-03).
 *
 * È la finestra del browser (`beforeunload`), non una nostra: il testo lo
 * sceglie il browser e non si può cambiare, Chrome la mostra solo dopo che la
 * persona ha toccato o cliccato la pagina, e Safari su iPhone in pratica la
 * ignora. Per questo non è l'unica protezione: il carrello è già salvato da
 * Shopify e si ritrova alla visita dopo.
 *
 * Quando scatta lo decide `features.leaveWarning.when`:
 *   'cart'   → solo con almeno un capo nel carrello (default: chi non ha
 *              comprato niente non perde niente, e un avviso a ogni chiusura
 *              di scheda insegna a ignorarlo);
 *   'always' → a ogni uscita.
 * Mai verso la cassa di Shopify: lì si sta andando a pagare (`allowLeave`).
 */
let allowed = false

/** Una sola navigazione voluta (la cassa) passa senza avviso. */
export function allowLeave() { allowed = true }

export function shouldWarn() {
  const f = storeConfig.features.leaveWarning
  if (!f?.enabled || allowed) return false
  if (f.when === 'always') return true
  return (useCartStore.getState().cart?.totalQuantity ?? 0) > 0
}

export function installLeaveGuard() {
  const onBeforeUnload = (e) => {
    if (!shouldWarn()) return
    e.preventDefault()
    // Chrome e Edge prima della 119 vogliono anche returnValue impostato.
    e.returnValue = ''
  }
  // Tornando con Indietro dalla cassa la pagina può riprendere dalla cache del
  // browser: il permesso dato per la cassa non deve restare acceso.
  const onPageShow = () => { allowed = false }
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('pageshow', onPageShow)
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('pageshow', onPageShow)
  }
}
