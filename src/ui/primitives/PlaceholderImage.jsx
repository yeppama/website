import { useEffect, useRef, useState, useId } from 'react'
import { storeConfig } from '../../config/storeConfig.js'

/**
 * Segnaposto grafico 2D.
 *
 * Tre stati DISTINTI, mai confusi fra loro:
 *   placeholder — segnaposto intenzionale: pattern nitido, etichetta e categoria stabili
 *   loading     — caricamento reale: blocco animato senza testo, con durata minima e TIMEOUT
 *   error       — il caricamento non è riuscito: bordo danger, nessuna animazione
 *
 * Lo skeleton non è mai infinito: oltre `timeoutMs` passa da solo a `error`.
 * Il box è dimensionato con aspect-ratio prima di avere contenuto: zero layout shift.
 */
export default function PlaceholderImage({
  ratio = '1:1',
  label,
  category,
  variant = 'product',
  state = 'placeholder',
  seed = '',
  className = '',
}) {
  const cfg = storeConfig.placeholders
  const spec = cfg.variants[variant] ?? cfg.variants.product
  const [w, h] = cfg.ratios[ratio] ?? cfg.ratios['1:1']
  const patternId = useId()

  const [resolved, setResolved] = useState(state)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    startedAt.current = Date.now()
    setResolved(state)
    if (state !== 'loading') return
    // Timeout: nessuno skeleton può girare per sempre.
    const timer = setTimeout(() => setResolved('error'), cfg.skeleton.timeoutMs)
    return () => clearTimeout(timer)
  }, [state, cfg.skeleton.timeoutMs])

  // Il pattern dipende dal seed, quindi è stabile fra un render e l'altro.
  const offset = [...String(seed)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 12

  const isLoading = resolved === 'loading'
  const isError = resolved === 'error'

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: `${w} / ${h}`,
        background: spec.bg,
        border: `1px solid ${isError ? 'var(--color-state-danger)' : 'var(--color-line-subtle)'}`,
      }}
      role="img"
      aria-label={isLoading ? 'Immagine in caricamento' : `Segnaposto: ${label ?? 'senza etichetta'}`}
      data-state={resolved}
    >
      {!isLoading && spec.pattern !== 'none' && (
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${offset} ${offset})`}>
              {spec.pattern === 'grid'
                ? <path d="M16 0H0V16" fill="none" stroke={spec.fg} strokeOpacity="0.14" strokeWidth="1" />
                : <path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" fill="none" stroke={spec.fg} strokeOpacity="0.16" strokeWidth="1" />}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      )}

      {isLoading && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${spec.fg}1f, transparent)`,
              animation: `shimmer ${cfg.skeleton.shimmerMs}ms linear infinite`,
            }}
          />
        </div>
      )}

      {/* Etichetta e categoria restano visibili: è così che si distingue
          un segnaposto voluto da un caricamento che non finisce mai. */}
      {!isLoading && (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="micro" style={{ color: spec.fg }}>
              {isError ? 'ERRORE' : ratio}
            </span>
            {spec.showCategory && category && (
              <span className="micro" style={{ color: spec.fg }}>{category}</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2">
            <span
              className="font-display font-black uppercase leading-none"
              style={{ color: spec.fg, fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-tight)' }}
            >
              {label}
            </span>
            <span className="micro" style={{ color: spec.fg, opacity: 0.6 }}>PLH</span>
          </div>
        </div>
      )}
    </div>
  )
}
