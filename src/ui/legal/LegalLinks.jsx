import { useEffect } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import { useLegalStore } from '../../state/useLegalStore.js'
import { commerceActive } from '../../commerce/index.js'
import Button from '../primitives/Button.jsx'

/**
 * Pagine legali pubblicate dal venditore, lette dal fornitore al primo uso. Stato di
 * caricamento, errore con "Riprova", nessuna pagina, elenco. Usato dal menu del
 * negozio 3D e dalla modalità testo: senza 3D privacy e condizioni devono restare
 * raggiungibili (audit 2026-11-02, N1). Niente commercio, niente sezione.
 */
export default function LegalLinks({ id, testId, as: Heading = 'h3' }) {
  const legal = useLegalStore()
  const openDialog = useAppStore((s) => s.openDialog)
  const active = commerceActive()
  useEffect(() => { if (active) legal.load() }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!active) return null

  const copy = storeConfig.copy.legal
  const heading = storeConfig.copy.menu.sections.find((s) => s.id === 'sec-legal').label
  return (
    <section className="mt-10" aria-labelledby={id} data-testid={testId}>
      <Heading id={id} className="micro mb-3" style={{ color: 'var(--color-accent-flame)' }}>{heading}</Heading>
      {(legal.status === 'idle' || legal.status === 'loading') && <p className="micro">{copy.loading}</p>}
      {legal.status === 'error' && (
        <>
          <p className="micro" role="alert" style={{ color: 'var(--color-state-danger)' }}>{copy.unavailable}</p>
          <Button className="mt-3" onClick={legal.load}>{copy.retry}</Button>
        </>
      )}
      {legal.status === 'ready' && !legal.policies.length && <p className="micro">{copy.none}</p>}
      {legal.status === 'ready' && legal.policies.length > 0 && (
        <ul className="grid gap-px bg-line-subtle">
          {legal.policies.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => openDialog('legal', p.id)}
                      className="flex w-full items-center justify-between gap-3 bg-bg-raised px-3 py-3 text-left text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                      style={{ minHeight: 'var(--touch-min)', fontSize: 'var(--text-sm)' }}>
                {copy.policies[p.id]}
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
