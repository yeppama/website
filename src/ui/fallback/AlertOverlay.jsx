import { useRef } from 'react'
import Button from '../primitives/Button.jsx'
import { useFocusTrap } from '../primitives/useFocusTrap.js'

/**
 * Avviso modale a tutto schermo: contesto grafico perso, errore non gestito.
 *
 * È presentazionale: i testi arrivano da chi lo apre, cioè da
 * storeConfig.copy.errors. La trappola del focus serve anche qui — con la scena
 * rotta dietro, Tab non deve portare su HUD e bottoni che non rispondono più —
 * e non ha un `onEscape`: un avviso di guasto non si chiude da solo, e così ESC
 * non arriva nemmeno agli ascoltatori sotto.
 */
export default function AlertOverlay({ id, title, body, hint, retryLabel, onRetry }) {
  const panel = useRef(null)
  useFocusTrap(panel, true)

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`}
         className="fixed inset-0 flex items-center justify-center bg-bg-base/90 px-6"
         style={{ zIndex: 'var(--z-fallback)' }}>
      <div ref={panel} tabIndex={-1} className="w-full max-w-md border border-state-danger bg-bg-raised p-6">
        <h2 id={`${id}-title`} className="font-display font-black uppercase leading-none text-text-primary"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {title}
        </h2>
        <p className="mt-4 text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{body}</p>
        {hint && <p className="mt-3 text-text-muted" style={{ fontSize: 'var(--text-sm)' }}>{hint}</p>}
        {onRetry && <Button variant="primary" className="mt-6" onClick={onRetry}>{retryLabel}</Button>}
      </div>
    </div>
  )
}
