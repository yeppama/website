import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Trappole attive, dalla più vecchia alla più recente. Solo l'ultima risponde ai
// tasti: con il menu aperto e una scheda sopra, ESC chiude la scheda e basta.
const traps = []

const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

/**
 * Trappola del focus per una finestra modale.
 *
 * - All'apertura il focus entra nella finestra (sul contenitore, che ha tabIndex -1).
 * - Tab e Shift+Tab girano solo fra gli elementi della finestra.
 * - ESC chiama `onEscape` e non arriva a nessun altro ascoltatore: il menu sotto
 *   la scheda, o il Focus Mode sotto il menu, non si chiudono insieme a lei.
 * - Alla chiusura il focus torna all'elemento che l'aveva aperta.
 */
export function useFocusTrap(ref, active, onEscape) {
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const token = {}
    traps.push(token)
    const opener = document.activeElement
    ref.current?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (traps[traps.length - 1] !== token || !ref.current) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onEscapeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables(ref.current)
      if (!items.length) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const inside = ref.current.contains(document.activeElement)
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault(); first.focus()
      }
    }
    // Fase di cattura sulla finestra: arriva prima di qualunque altro ascoltatore.
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      traps.splice(traps.indexOf(token), 1)
      if (opener?.isConnected) opener.focus?.({ preventScroll: true })
    }
  }, [active, ref])
}
