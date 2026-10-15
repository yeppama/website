import { brandMotif } from '../../config/designTokens.js'

/**
 * Bottone. La variante `primary` usa l'ellisse del marchio come bordo:
 * il motivo del logo si ripete nella meccanica dell'interfaccia.
 */
export default function Button({ variant = 'ghost', children, className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 font-display font-bold uppercase ' +
    'transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none'

  const styles = {
    primary: {
      className: `${base} px-8 py-3 text-text-inverse bg-accent-flame hover:bg-accent-bone`,
      style: { borderRadius: `${50 / brandMotif.oval.ratio}% / 50%`, letterSpacing: 'var(--tracking-brutal)' },
    },
    ghost: {
      className: `${base} px-4 py-2 text-text-primary border border-line-strong hover:border-line-hard hover:text-accent-flame`,
      style: { letterSpacing: 'var(--tracking-wide)' },
    },
  }[variant]

  return (
    <button
      type="button"
      {...props}
      className={`${styles.className} ${className}`}
      style={{ minHeight: 'var(--touch-min)', ...styles.style, ...props.style }}
    >
      {children}
    </button>
  )
}
