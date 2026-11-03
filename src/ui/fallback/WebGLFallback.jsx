import { storeConfig } from '../../config/storeConfig.js'
import Button from '../primitives/Button.jsx'

/**
 * Schermata per dispositivi senza WebGL2. Tutti i testi vengono da storeConfig.copy.
 * Non è più un vicolo cieco: porta alla modalità testo, con catalogo, carrello e
 * pagine legali (audit 2026-11-02, N1).
 */
export default function WebGLFallback({ renderer, onBrowse }) {
  const { brand } = storeConfig.meta
  const copy = storeConfig.copy.errors.webgl

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-bg-base px-6"
      style={{ zIndex: 'var(--z-fallback)' }}
    >
      <div className="w-full max-w-xl">
        <p className="micro mb-6">{brand.origin.city} · {brand.origin.coords}</p>
        <h1 className="font-display font-black uppercase leading-none text-text-primary"
            style={{ fontSize: 'var(--text-xl)', letterSpacing: 'var(--tracking-tight)' }}>
          {copy.title}
        </h1>
        <div className="rule my-6" />
        <p className="text-text-secondary" style={{ fontSize: 'var(--text-base)' }}>{copy.body}</p>
        <p className="mt-3 text-text-muted" style={{ fontSize: 'var(--text-sm)' }}>{copy.hint}</p>
        {onBrowse && <Button variant="primary" className="mt-8" onClick={onBrowse} data-testid="fallback-browse">{copy.browse}</Button>}
        {renderer && <p className="micro mt-8">{copy.renderer}: {renderer}</p>}
      </div>
    </div>
  )
}
