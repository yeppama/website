import { useEffect, useState } from 'react'
import { storeConfig } from '../../config/storeConfig.js'
import { useAppStore } from '../../state/useAppStore.js'
import Button from '../primitives/Button.jsx'

/**
 * Schermata iniziale: identità del brand, progresso del caricamento per stadi
 * reali e istruzioni DIVERSE per desktop e mobile.
 *
 * Ogni istruzione dichiara la funzione che richiede. Se quella funzione non è
 * ancora attiva (storeConfig.features), la riga viene mostrata come "in arrivo"
 * e non come un comando: l'interfaccia non promette ciò che non esiste.
 *
 * Il bottone d'ingresso resta disabilitato finché la scena non è pronta: è anche
 * il gesto esplicito che in Fase 3 servirà ad attivare il Pointer Lock.
 */
export default function OnboardingScreen({ device, ready, progress, stageLabel, onEnter }) {
  const { brand } = storeConfig.meta
  const copy = storeConfig.copy.onboarding
  const variant = device.isTouch ? copy.mobile : copy.desktop
  const features = storeConfig.features
  // Da computer si sceglie come muoversi: tastiera e mouse, o solo mouse (come su telefono).
  const controlMode = useAppStore((s) => s.controlMode)
  const setControlMode = useAppStore((s) => s.setControlMode)
  const lines = !device.isTouch && controlMode === 'mouse' ? variant.mouseLines : variant.lines

  // Il progresso non torna mai indietro e non si blocca a metà all'occhio.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown((p) => Math.max(p, progress)))
    return () => cancelAnimationFrame(id)
  }, [progress])

  return (
    // Scorre se lo schermo è basso: un telefono in orizzontale è alto ~390 px e
    // senza scorrimento il pulsante "Entra" finiva fuori schermo, irraggiungibile.
    <div
      className="fixed inset-0 overflow-y-auto overscroll-contain bg-bg-base"
      style={{ zIndex: 'var(--z-onboarding)' }}
    >
      <div className="flex min-h-full flex-col justify-between gap-10 px-6 py-8 sm:px-12 sm:py-12">
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
            className="font-mono lowercase text-accent-flame"
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
        {!device.isTouch && (
          <div role="radiogroup" aria-label={variant.modes.label} className="mb-6 grid gap-2 sm:grid-cols-2" data-testid="control-mode">
            {['keyboard', 'mouse'].map((mode) => {
              const on = controlMode === mode
              return (
                <button key={mode} type="button" role="radio" aria-checked={on} onClick={() => setControlMode(mode)}
                        className={`border px-4 py-3 text-left transition-colors ${on ? 'border-accent-flame' : 'border-line-strong hover:border-text-secondary'}`}
                        style={{ minHeight: 'var(--touch-min)' }}>
                  <span className={`block font-display font-bold uppercase ${on ? 'text-accent-flame' : 'text-text-primary'}`}
                        style={{ fontSize: 'var(--text-sm)', letterSpacing: 'var(--tracking-wide)' }}>
                    {variant.modes[mode].title}
                  </span>
                  <span className="micro mt-1 block">{variant.modes[mode].hint}</span>
                </button>
              )
            })}
          </div>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {lines.map((line, i) => {
            const feature = line.requires ? features[line.requires] : null
            const active = !feature || feature.enabled
            return (
              <li key={line.text}
                  className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${active ? 'text-text-primary' : 'text-text-muted'}`}
                  style={{ fontSize: 'var(--text-sm)' }}
                  data-active={active}>
                <span className="micro" style={{ color: active ? 'var(--color-accent-flame)' : undefined }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={active ? '' : 'line-through decoration-line-strong'}>{line.text}</span>
                {!active && (
                  <span className="micro border border-line-strong px-1.5 py-0.5">
                    {copy.comingSoon}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button variant="primary" disabled={!ready} onClick={onEnter}>
            {ready ? variant.cta : copy.loading}
          </Button>
          <div className="min-w-40 flex-1">
            <div className="h-px w-full bg-line-subtle">
              <div
                className="h-px bg-accent-flame transition-[width] duration-300"
                style={{ width: `${Math.round(shown * 100)}%` }}
              />
            </div>
            <p className="micro mt-2">
              {ready ? copy.ready : `${stageLabel ?? copy.loading} · ${Math.round(shown * 100)}%`}
            </p>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-4">
        <p className="micro max-w-md">{copy.phaseNotice}</p>
        <p className="micro text-right">{brand.credit}</p>
      </footer>
      </div>
    </div>
  )
}
