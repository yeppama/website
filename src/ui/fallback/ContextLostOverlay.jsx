import { useEffect, useRef } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import Button from '../primitives/Button.jsx'
import { useFocusTrap } from '../primitives/useFocusTrap.js'

/**
 * Il contesto WebGL è andato perso. Se il browser lo restituisce da solo la
 * scena si rimonta senza intervento; altrimenti "Riprova" ne chiede uno nuovo.
 * In entrambi i casi il player riparte dalla posa in cui era.
 * È l'ultima trappola del focus: Tab ed ESC non arrivano alla scheda o al menu
 * che restano sotto, invisibili.
 */
export default function ContextLostOverlay({ onRetry }) {
  const copy = storeConfig.copy.errors.contextLost
  const button = useRef(null)
  const root = useRef(null)
  useFocusTrap(root, true, null)
  useEffect(() => { button.current?.focus({ preventScroll: true }) }, [])

  return (
    <div ref={root} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="ctx-lost-title"
         className="fixed inset-0 flex items-center justify-center bg-bg-base/90 px-6"
         style={{ zIndex: 'var(--z-fallback)' }}>
      <div className="w-full max-w-md border border-state-danger bg-bg-raised p-6">
        <h2 id="ctx-lost-title" className="font-display font-black uppercase leading-none text-text-primary"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {copy.title}
        </h2>
        <p className="mt-4 text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{copy.body}</p>
        <Button ref={button} variant="primary" className="mt-6" onClick={onRetry}>{copy.retry}</Button>
      </div>
    </div>
  )
}
