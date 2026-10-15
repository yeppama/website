import { useEffect, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import Button from '../primitives/Button.jsx'

/**
 * Schermata iniziale: identità del brand, progresso reale del caricamento e
 * istruzioni DIVERSE per desktop e mobile, scelte dal profilo del dispositivo.
 *
 * Il bottone d'ingresso resta disabilitato finché la scena non è pronta: è anche
 * il gesto esplicito che in Fase 3 servirà ad attivare il Pointer Lock.
 */
export default function OnboardingScreen({ device, ready, progress, onEnter }) {
  const { brand } = storeConfig.meta
  const copy = storeConfig.copy.onboarding
  const variant = device.isTouch ? copy.mobile : copy.desktop

  // Il progresso non torna mai indietro e non si blocca a metà all'occhio.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown((p) => Math.max(p, progress)))
    return () => cancelAnimationFrame(id)
  }, [progress])

  return (
    <div
      className="fixed inset-0 flex flex-col justify-between bg-bg-base px-6 py-8 sm:px-12 sm:py-12"
      style={{ zIndex: 'var(--z-onboarding)' }}
    >
      <header className="flex items-start justify-between gap-4">
        <p className="micro">{copy.eyebrow}</p>
        <p className="micro text-right">
          {brand.origin.city}, {brand.origin.country}<br />{brand.origin.coords}
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        {/* Marchio e descrittore hanno pesi diversi: INTO è il marchio,
            industries è il descrittore. Mai una parola sola. */}
        <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1 leading-none">
          <span
            className="font-display font-black uppercase text-text-primary"
            style={{ fontSize: 'clamp(3rem, 14vw, var(--text-3xl))', letterSpacing: 'var(--tracking-tight)' }}
          >
            {brand.wordmark}
          </span>
          <span
            className="font-mono lowercase text-accent-ember"
            style={{ fontSize: 'var(--text-lg)', letterSpacing: 'var(--tracking-wide)' }}
          >
            ({brand.descriptor}*)
          </span>
        </h1>

        <p className="mt-4 text-text-secondary" style={{ fontSize: 'var(--text-base)' }}>
          {brand.tagline}
        </p>

        <div className="rule my-8" />

        <h2 className="micro mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {variant.heading}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {variant.lines.map((line, i) => (
            <li key={line} className="flex items-baseline gap-3 text-text-primary"
                style={{ fontSize: 'var(--text-sm)' }}>
              <span className="micro" style={{ color: 'var(--color-accent-ember)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button variant="primary" disabled={!ready} onClick={onEnter}>
            {ready ? variant.cta : copy.loading}
          </Button>
          <div className="min-w-40 flex-1">
            <div className="h-px w-full bg-line-subtle">
              <div
                className="h-px bg-accent-ember transition-[width] duration-300"
                style={{ width: `${Math.round(shown * 100)}%` }}
              />
            </div>
            <p className="micro mt-2">
              {ready ? 'pronto' : `${copy.loading} · ${Math.round(shown * 100)}%`}
            </p>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-4">
        <p className="micro max-w-md">{copy.phaseNotice}</p>
        <p className="micro text-right">{brand.credit}</p>
      </footer>
    </div>
  )
}
