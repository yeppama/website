import { useId, useRef } from 'react'

/**
 * Gruppo di scelta esclusiva (taglie, colori) secondo il modello radio di WAI-ARIA:
 * un solo punto di Tab per il gruppo, frecce per spostarsi e scegliere, opzioni
 * non disponibili visibili ma saltate. Nessuna selezione obbligatoria all'inizio:
 * `value` può essere null, e allora il Tab entra sulla prima opzione disponibile.
 */
export default function OptionGroup({ label, options, value, onChange, unavailableLabel, renderOption }) {
  const labelId = useId()
  const refs = useRef({})
  const available = options.filter((o) => o.available !== false)
  const tabStop = value && available.some((o) => o.id === value) ? value : available[0]?.id

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step || !available.length) return
    e.preventDefault()
    const from = available.findIndex((o) => o.id === (document.activeElement?.dataset.option ?? tabStop))
    const next = available[(from + step + available.length) % available.length]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <div>
      <p id={labelId} className="micro mb-2">{label}</p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {options.map((o) => {
          const off = o.available === false
          const checked = o.id === value
          return (
            <button
              key={o.id}
              ref={(el) => { refs.current[o.id] = el }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={off || undefined}
              aria-label={off ? `${o.label}, ${unavailableLabel}` : o.label}
              data-option={o.id}
              tabIndex={o.id === tabStop ? 0 : -1}
              onClick={() => { if (!off) onChange(o.id) }}
              className={
                'inline-flex items-center justify-center gap-2 border px-3 font-mono uppercase transition-colors ' +
                (checked ? 'border-accent-flame text-accent-flame ' : 'border-line-strong text-text-primary hover:border-line-hard ') +
                (off ? 'cursor-not-allowed line-through opacity-40' : '')
              }
              style={{ minHeight: 'var(--touch-min)', minWidth: 'var(--touch-min)', fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}
            >
              {renderOption ? renderOption(o) : o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
