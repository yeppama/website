import { useEffect, useMemo } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useLegalStore } from '../../state/useLegalStore.js'
import { commerceMode } from '../../commerce/index.js'
import { sanitizeHtml } from '../../lib/sanitizeHtml.js'
import Button from '../primitives/Button.jsx'

/**
 * Una pagina legale nella pila delle schede. Il testo è quello che il venditore ha
 * pubblicato su Shopify, ripulito prima di entrare nella pagina: il sito non ne
 * scrive nessuno.
 */
export default function LegalSheet({ id, headingId }) {
  const t = storeConfig.copy.legal
  const status = useLegalStore((s) => s.status)
  const policy = useLegalStore((s) => s.policies.find((p) => p.id === id))
  const load = useLegalStore((s) => s.load)
  useEffect(() => { load() }, [load])
  const html = useMemo(() => (policy ? sanitizeHtml(policy.body) : ''), [policy])

  return (
    <article className="mx-auto max-w-2xl">
      <h2 id={headingId} tabIndex={-1}
          className="font-display font-black uppercase leading-none text-text-primary outline-none"
          style={{ fontSize: 'clamp(var(--text-lg), 6vw, var(--text-xl))', letterSpacing: 'var(--tracking-tight)' }}>
        {policy?.title ?? t.policies[id]}
      </h2>
      {commerceMode() === 'mock' && (
        <p className="micro mt-3" style={{ color: 'var(--color-accent-flame)' }}>{t.mockNotice}</p>
      )}
      {(status === 'idle' || status === 'loading') && <p className="micro mt-6" role="status">{t.loading}</p>}
      {status === 'error' && (
        <div className="mt-6">
          <p className="micro" role="alert" style={{ color: 'var(--color-state-danger)' }}>{t.unavailable}</p>
          <Button className="mt-3" onClick={load}>{t.retry}</Button>
        </div>
      )}
      {status === 'ready' && !policy && <p className="mt-6 text-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{t.missing}</p>}
      {policy && <div className="legal-prose mt-6" data-testid="legal-body" dangerouslySetInnerHTML={{ __html: html }} />}
    </article>
  )
}
