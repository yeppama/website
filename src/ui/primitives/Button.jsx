import { brandMotif } from '../../config/designTokens.js'

/**
 * Bottone. La variante `primary` usa l'ellisse del marchio come bordo:
 * il motivo del logo si ripete nella meccanica dell'interfaccia.
 *
 * `aria-disabled` invece di `disabled` quando il bottone ha il focus e torna
 * attivo da solo (operazione in corso): un bottone `disabled` cede il focus al
 * <body>, fuori dalla trappola della finestra, e chi usa la tastiera perde il
 * punto (audit 2026-11-02, N2/T4). Con `aria-disabled` il focus resta, il bottone
 * appare spento e il clic non fa niente.
 */
export default function Button({ variant = 'ghost', children, className = '', ref, onClick, ...props }) {
  const ariaDisabled = props['aria-disabled'] === true || props['aria-disabled'] === 'true'
  const base =
    'inline-flex items-center justify-center gap-2 font-display font-bold uppercase ' +
    'transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none ' +
    'aria-disabled:opacity-40 aria-disabled:cursor-not-allowed'

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
      ref={ref}
      type="button"
      {...props}
      onClick={ariaDisabled ? (e) => e.preventDefault() : onClick}
      className={`${styles.className} ${className}`}
      style={{ minHeight: 'var(--touch-min)', ...styles.style, ...props.style }}
    >
      {children}
    </button>
  )
}
